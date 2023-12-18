import {
  BytesLike,
  HexString,
  toHex,
  compare,
} from './bytes';

import {
  MerkleTreeData,
} from './format';

import {
  MultiProof,
  makeMerkleTree,
  isValidMerkleTree,
  getProof,
  getMultiProof,
  processProof,
  processMultiProof,
  renderMerkleTree
} from './core';

import { defaultAbiCoder } from '@ethersproject/abi';
import { keccak256 } from '@ethersproject/keccak256';

import { MerkleTreeOptions, defaultOptions} from './options';
import { checkBounds } from './utils/check-bounds';
import { throwError } from './utils/throw-error';

export type StandardMerkleTreeData<T> = MerkleTreeData<T> & { leafEncoding: string[] };

export function standardLeafHash<T extends any[]>(value: T, types: string[]) : HexString {
  return keccak256(keccak256(defaultAbiCoder.encode(types, value)));
}

export class StandardMerkleTree<T extends any[]> {
  private readonly hashLookup: { [hash: HexString]: number };

  private constructor(
    private readonly tree: HexString[],
    private readonly values: { value: T, treeIndex: number }[],
    private readonly leafEncoding: string[],
  ) {
    this.hashLookup =
      Object.fromEntries(values.map(({ value }, valueIndex) => [
        toHex(standardLeafHash(value, leafEncoding)),
        valueIndex,
      ]));
  }

  static of<T extends any[]>(values: T[], leafEncoding: string[], options: MerkleTreeOptions = {}) {
    const { sortLeaves } = { ...defaultOptions, ...options };

    const hashedValues = values.map((value, valueIndex) => ({ value, valueIndex, hash: standardLeafHash(value, leafEncoding) }));

    if (sortLeaves) {
      hashedValues.sort((a, b) => compare(a.hash, b.hash));
    }

    const tree = makeMerkleTree(hashedValues.map(v => v.hash));

    const indexedValues = values.map(value => ({ value, treeIndex: 0 }));
    for (const [leafIndex, { valueIndex }] of hashedValues.entries()) {
      indexedValues[valueIndex]!.treeIndex = tree.length - leafIndex - 1;
    }

    return new StandardMerkleTree(tree, indexedValues, leafEncoding);
  }

  static load<T extends any[]>(data: StandardMerkleTreeData<T>): StandardMerkleTree<T> {
    if (data.format !== 'standard-v1') {
      throwError(`Unknown format '${data.format}'`);
    }
    return new StandardMerkleTree(
      data.tree,
      data.values,
      data.leafEncoding,
    );
  }

  static verify<T extends any[]>(root: BytesLike, leafEncoding: string[], leaf: T, proof: BytesLike[]): boolean {
    return toHex(root) === processProof(standardLeafHash(leaf, leafEncoding), proof);
  }

  static verifyMultiProof<T extends any[]>(root: BytesLike, leafEncoding: string[], multiproof: MultiProof<BytesLike, T>): boolean {
    return toHex(root) === processMultiProof({
      leaves: multiproof.leaves.map(leaf => standardLeafHash(leaf, leafEncoding)),
      proof: multiproof.proof,
      proofFlags: multiproof.proofFlags,
    });
  }

  dump(): StandardMerkleTreeData<T> {
    return {
      format:      'standard-v1',
      tree:         this.tree,
      values:       this.values,
      leafEncoding: this.leafEncoding,
    };
  }

  render() {
    return renderMerkleTree(this.tree);
  }

  get root(): HexString {
    return this.tree[0]!;
  }

  *entries(): Iterable<[number, T]> {
    for (const [i, { value }] of this.values.entries()) {
      yield [i, value];
    }
  }

  validate() {
    for (let i = 0; i < this.values.length; i++) {
      this.validateValue(i);
    }
    if (!isValidMerkleTree(this.tree)) {
      throwError('Merkle tree is invalid');
    }
  }

  leafHash(leaf: T): HexString {
    return standardLeafHash(leaf, this.leafEncoding);
  }

  leafLookup(leaf: T): number {
    return this.hashLookup[this.leafHash(leaf)] ?? throwError('Leaf is not in tree');
  }

  getProof(leaf: number | T): HexString[] {
    // input validity
    const valueIndex = typeof leaf === 'number' ? leaf : this.leafLookup(leaf);
    this.validateValue(valueIndex);

    // rebuild tree index and generate proof
    const { treeIndex } = this.values[valueIndex]!;
    const proof = getProof(this.tree, treeIndex);

    // sanity check proof
    if (!this._verify(this.tree[treeIndex]!, proof)) {
      throwError('Unable to prove value');
    }

    // return proof in hex format
    return proof;
  }

  getMultiProof(leaves: (number | T)[]): MultiProof<HexString, T> {
    // input validity
    const valueIndices = leaves.map(leaf => typeof leaf === 'number' ? leaf : this.leafLookup(leaf));
    for (const valueIndex of valueIndices) this.validateValue(valueIndex);

    // rebuild tree indices and generate proof
    const indices = valueIndices.map(i => this.values[i]!.treeIndex);
    const proof = getMultiProof(this.tree, indices);

    // sanity check proof
    if (!this._verifyMultiProof(proof)) {
      throwError('Unable to prove values');
    }

    // return multiproof in hex format
    return {
      leaves:     proof.leaves.map(hash => this.values[this.hashLookup[hash]!]!.value),
      proof:      proof.proof,
      proofFlags: proof.proofFlags,
    }
  }

  verify(leaf: number | T, proof: BytesLike[]): boolean {
    return this._verify(this.getLeafHash(leaf), proof);
  }

  private _verify(leafHash: BytesLike, proof: BytesLike[]): boolean {
    return this.root === processProof(leafHash, proof);
  }

  verifyMultiProof(multiproof: MultiProof<BytesLike, number | T>): boolean {
    return this._verifyMultiProof({
      leaves: multiproof.leaves.map(l => this.getLeafHash(l)),
      proof: multiproof.proof,
      proofFlags: multiproof.proofFlags,
    });
  }

  private _verifyMultiProof(multiproof: MultiProof<BytesLike, BytesLike>): boolean {
    return this.root === processMultiProof(multiproof);
  }

  private validateValue(valueIndex: number): HexString {
    checkBounds(this.values, valueIndex);
    const { value, treeIndex } = this.values[valueIndex]!;
    checkBounds(this.tree, treeIndex);
    const leaf = standardLeafHash(value, this.leafEncoding);
    if (leaf !== this.tree[treeIndex]!) {
      throwError('Merkle tree does not contain the expected value');
    }
    return leaf;
  }

  private getLeafHash(leaf: number | T): HexString {
    if (typeof leaf === 'number') {
      return this.validateValue(leaf);
    } else {
      return standardLeafHash(leaf, this.leafEncoding);
    }
  }
}
