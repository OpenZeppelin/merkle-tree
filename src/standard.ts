import { keccak256 } from 'ethereum-cryptography/keccak';
import { equalsBytes, hexToBytes } from 'ethereum-cryptography/utils';
import { defaultAbiCoder } from '@ethersproject/abi';
import { Bytes, compareBytes, hex } from './bytes';
import { getProof, isValidMerkleTree, makeMerkleTree, processProof, renderMerkleTree, MultiProof, getMultiProof, processMultiProof } from './core';
import { checkBounds } from './utils/check-bounds';
import { throwError } from './utils/throw-error';

function standardLeafHash<T extends any[]>(value: T, types: string[]): Bytes {
  return keccak256(keccak256(hexToBytes(defaultAbiCoder.encode(types, value))));
}

interface StandardMerkleTreeData<T extends any[]> {
  format: 'standard-v1';
  tree: string[];
  values: {
    value: T;
    treeIndex: number;
  }[];
  leafEncoding: string[];
}

export class StandardMerkleTree<T extends any[]> {
  private readonly hashLookup: { [hash: string]: number };

  private constructor(
    private readonly tree: Bytes[],
    private readonly values: { value: T, treeIndex: number }[],
    private readonly leafEncoding: string[],
  ) {
    this.hashLookup = 
      Object.fromEntries(values.map(({ value }, valueIndex) => [
        hex(standardLeafHash(value, leafEncoding)),
        valueIndex,
      ]));
  }

  static of<T extends any[]>(values: T[], leafEncoding: string[]) {
    const hashedValues = values
      .map((value, valueIndex) => ({ value, valueIndex, hash: standardLeafHash(value, leafEncoding) }))
      .sort((a, b) => compareBytes(a.hash, b.hash));

    const tree = makeMerkleTree(hashedValues.map(v => v.hash));

    const indexedValues = values.map(value => ({ value, treeIndex: 0 }));
    for (const [leafIndex, { valueIndex }] of hashedValues.entries()) {
      indexedValues[valueIndex]!.treeIndex = tree.length - leafIndex - 1;
    }

    return new StandardMerkleTree(tree, indexedValues, leafEncoding);
  }

  static load<T extends any[]>(data: StandardMerkleTreeData<T>): StandardMerkleTree<T> {
    if (data.format !== 'standard-v1') {
      throw new Error(`Unknown format '${data.format}'`);
    }
    return new StandardMerkleTree(
      data.tree.map(hexToBytes),
      data.values,
      data.leafEncoding,
    );
  }

  dump(): StandardMerkleTreeData<T> {
    return {
      format:      'standard-v1',
      tree:         this.tree.map(hex),
      values:       this.values,
      leafEncoding: this.leafEncoding,
    };
  }

  render() {
    return renderMerkleTree(this.tree);
  }

  get root(): string {
    return hex(this.tree[0]!);
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
      throw new Error('Merkle tree is invalid');
    }
  }

  leafHash(leaf: T): string {
    return hex(standardLeafHash(leaf, this.leafEncoding));
  }

  leafLookup(leaf: T): number {
    return this.hashLookup[this.leafHash(leaf)] ?? throwError('Leaf is not in tree');
  }

  getProof(leaf: number | T): string[] {
    // input validity
    const valueIndex = typeof leaf === 'number' ? leaf : this.leafLookup(leaf);
    this.validateValue(valueIndex);

    // rebuild tree index and generate proof
    const { treeIndex } = this.values[valueIndex]!;
    const proof = getProof(this.tree, treeIndex);

    // sanity check proof
    if (!this._verify(this.tree[treeIndex]!, proof)) {
      throw new Error('Unable to prove value');
    }

    // return proof in hex format
    return proof.map(hex);
  }

  getMultiProof(leaves: (number | T)[]): MultiProof<string, T> {
    // input validity
    const valueIndices = leaves.map(leaf => typeof leaf === 'number' ? leaf : this.leafLookup(leaf));
    for (const valueIndex of valueIndices) this.validateValue(valueIndex);

    // rebuild tree indices and generate proof
    const indices = valueIndices.map(i => this.values[i]!.treeIndex);
    const proof = getMultiProof(this.tree, indices);

    // sanity check proof
    if (!this._verifyMultiProof(proof)) {
      throw new Error('Unable to prove values');
    }

    // return multiproof in hex format
    return {
      leaves:     proof.leaves.map(hash => this.values[this.hashLookup[hex(hash)]!]!.value),
      proof:      proof.proof.map(hex),
      proofFlags: proof.proofFlags,
    }
  }

  verify(leaf: number | T, proof: string[]): boolean {
    return this._verify(this.getLeafHash(leaf), proof.map(hexToBytes));
  }

  private _verify(leafHash: Bytes, proof: Bytes[]): boolean {
    const impliedRoot = processProof(leafHash, proof);
    return equalsBytes(impliedRoot, this.tree[0]!);
  }

  verifyMultiProof(multiproof: MultiProof<string, number | T>): boolean {
    return this._verifyMultiProof({
      leaves: multiproof.leaves.map(l => this.getLeafHash(l)),
      proof: multiproof.proof.map(hexToBytes),
      proofFlags: multiproof.proofFlags,
    });
  }

  private _verifyMultiProof(multiproof: MultiProof<Bytes, Bytes>): boolean {
    const impliedRoot = processMultiProof(multiproof);
    return equalsBytes(impliedRoot, this.tree[0]!);
  }

  private validateValue(valueIndex: number): Bytes {
    checkBounds(this.values, valueIndex);
    const { value, treeIndex } = this.values[valueIndex]!;
    checkBounds(this.tree, treeIndex);
    const leaf = standardLeafHash(value, this.leafEncoding);
    if (!equalsBytes(leaf, this.tree[treeIndex]!)) {
      throw new Error('Merkle tree does not contain the expected value');
    }
    return leaf;
  }

  private getLeafHash(leaf: number | T): Bytes {
    if (typeof leaf === 'number') {
      return this.validateValue(leaf);
    } else {
      return standardLeafHash(leaf, this.leafEncoding);
    }
  }
}
