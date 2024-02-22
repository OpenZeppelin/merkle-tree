import {
  BytesLike,
  HexString,
  isBytesLike,
  toHex,
  toBytes,
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

import { MerkleTreeOptions, defaultOptions} from './options';
import { checkBounds } from './utils/check-bounds';
import { throwError } from './utils/throw-error';

export class SimpleMerkleTree {
  private readonly hashLookup: { [hash: HexString]: number };

  private constructor(
    private readonly tree: HexString[],
    private readonly values: { value: HexString, treeIndex: number }[],
  ) {
    this.hashLookup =
      Object.fromEntries(values.map(({ value }, valueIndex) => [
        toHex(value),
        valueIndex,
      ]));
  }

  static of(values: BytesLike[], options: MerkleTreeOptions = {}) {
    const { sortLeaves } = { ...defaultOptions, ...options };

    values.forEach((value, i) => {
      if (toBytes(value).length !== 32) {
        throwError(`${toHex(value)} is not a valid 32 bytes object (pos: ${i})`);
      }
    });

    const hashedValues = values.map((value, valueIndex) => ({ value, valueIndex, hash: toHex(value) }));

    if (sortLeaves) {
      hashedValues.sort((a, b) => compare(a.hash, b.hash));
    }

    const tree = makeMerkleTree(hashedValues.map(v => v.hash));

    const indexedValues = values.map(value => ({ value: toHex(value), treeIndex: 0 }));
    for (const [leafIndex, { valueIndex }] of hashedValues.entries()) {
      indexedValues[valueIndex]!.treeIndex = tree.length - leafIndex - 1;
    }

    return new SimpleMerkleTree(tree, indexedValues);
  }

  static load(data: MerkleTreeData<BytesLike>): SimpleMerkleTree {
    if (data.format !== 'simple-v1') {
      throwError(`Unknown format '${data.format}'`);
    }
    return new SimpleMerkleTree(
      data.tree,
      data.values.map(({ value, treeIndex }) => ({ value: toHex(value), treeIndex })),
    );
  }

  static verify(root: BytesLike, leaf: BytesLike, proof: BytesLike[]): boolean {
    return toHex(root) === processProof(leaf, proof);
  }

  static verifyMultiProof(root: BytesLike, multiproof: MultiProof<BytesLike, BytesLike>): boolean {
    return toHex(root) === processMultiProof({
      leaves: multiproof.leaves,
      proof: multiproof.proof,
      proofFlags: multiproof.proofFlags,
    });
  }

  dump(): MerkleTreeData<BytesLike> {
    return {
      format: 'simple-v1',
      tree:    this.tree,
      values:  this.values,
    };
  }

  render() {
    return renderMerkleTree(this.tree);
  }

  get root(): HexString {
    return this.tree[0]!;
  }

  *entries(): Iterable<[number, HexString]> {
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

  leafLookup(leaf: BytesLike): number {
    return this.hashLookup[toHex(leaf)] ?? throwError('Leaf is not in tree');
  }

  getProof(leaf: number | BytesLike): HexString[] {
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

  getMultiProof(leaves: (number | BytesLike)[]): MultiProof<HexString, HexString> {
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
      leaves:     proof.leaves,
      proof:      proof.proof,
      proofFlags: proof.proofFlags,
    }
  }

  verify(leaf: number | BytesLike, proof: BytesLike[]): boolean {
    return this._verify(this.getLeafHash(leaf), proof);
  }

  private _verify(leafHash: BytesLike, proof: BytesLike[]): boolean {
    return this.root === processProof(leafHash, proof);
  }

  verifyMultiProof(multiproof: MultiProof<BytesLike, number | BytesLike>): boolean {
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
    const { value: leaf, treeIndex } = this.values[valueIndex]!;
    checkBounds(this.tree, treeIndex);
    if (leaf !== this.tree[treeIndex]!) {
      throwError('Merkle tree does not contain the expected value');
    }
    return leaf;
  }

  private getLeafHash(leaf: number | BytesLike): HexString {
    if (isBytesLike(leaf)) {
      return toHex(leaf);
    } else {
      return this.validateValue(leaf);
    }
  }
}
