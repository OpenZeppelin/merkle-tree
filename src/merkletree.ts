import { BytesLike, HexString, toHex, compare } from './bytes';

import {
  MultiProof,
  makeMerkleTree,
  isValidMerkleTree,
  getProof,
  getMultiProof,
  processProof,
  processMultiProof,
  renderMerkleTree,
} from './core';

import { MerkleTreeOptions, defaultOptions } from './options';
import { checkBounds } from './utils/check-bounds';
import { throwError } from './utils/throw-error';

export type MerkleTreeData<T> = {
  format: string;
  tree: HexString[];
  values: { value: T; treeIndex: number }[];
};

export interface MerkleTree<T extends any> {
  root: HexString;
  dump(): MerkleTreeData<T>;
  render(): string;
  entries(): Iterable<[number, T]>;
  validate(): void;
  leafLookup(leaf: T): number;
  getProof(leaf: number | T): HexString[];
  getMultiProof(leaves: (number | T)[]): MultiProof<T>;
  verify(leaf: number | T, proof: HexString[]): boolean;
  verifyMultiProof(multiproof: MultiProof<number | T>): boolean;
}

export class MerkleTreeImpl<T> implements MerkleTree<T> {
  private readonly hashLookup: { [hash: HexString]: number };

  protected constructor(
    protected readonly tree: HexString[],
    protected readonly values: MerkleTreeData<T>['values'],
    protected readonly leafHasher: (leaf: T) => HexString,
  ) {
    this.hashLookup = Object.fromEntries(values.map(({ treeIndex }, valueIndex) => [tree.at(treeIndex), valueIndex]));
  }

  protected static prepare<T>(
    values: T[],
    options: MerkleTreeOptions = {},
    leafHasher: (value: T) => HexString,
  ): [tree: HexString[], indexedValues: MerkleTreeData<T>['values']] {
    const sortLeaves = options.sortLeaves ?? defaultOptions.sortLeaves;

    const hashedValues = values.map((value, valueIndex) => ({
      value,
      valueIndex,
      hash: leafHasher(value),
    }));

    if (sortLeaves) {
      hashedValues.sort((a, b) => compare(a.hash, b.hash));
    }

    const tree = makeMerkleTree(hashedValues.map(v => v.hash));

    const indexedValues = values.map(value => ({
      value,
      treeIndex: 0,
    }));
    for (const [leafIndex, { valueIndex }] of hashedValues.entries()) {
      indexedValues[valueIndex]!.treeIndex = tree.length - leafIndex - 1;
    }

    return [tree, indexedValues];
  }

  get root(): HexString {
    return this.tree[0]!;
  }

  dump(): MerkleTreeData<T> {
    return {
      format: 'simple-v1',
      tree: this.tree,
      values: this.values,
    };
  }

  render() {
    return renderMerkleTree(this.tree);
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

  leafLookup(leaf: T): number {
    return this.hashLookup[toHex(this.leafHash(leaf))] ?? throwError('Leaf is not in tree');
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

  getMultiProof(leaves: (number | T)[]): MultiProof<T> {
    // input validity
    const valueIndices = leaves.map(leaf => (typeof leaf === 'number' ? leaf : this.leafLookup(leaf)));
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
      leaves: proof.leaves.map(hash => this.values[this.hashLookup[hash]!]!.value),
      proof: proof.proof,
      proofFlags: proof.proofFlags,
    };
  }

  verify(leaf: number | T, proof: HexString[]): boolean {
    return this._verify(this.leafHash(leaf), proof);
  }

  verifyMultiProof(multiproof: MultiProof<number | T>): boolean {
    return this._verifyMultiProof({
      leaves: multiproof.leaves.map(l => this.leafHash(l)),
      proof: multiproof.proof,
      proofFlags: multiproof.proofFlags,
    });
  }

  protected validateValue(valueIndex: number): HexString {
    checkBounds(this.values, valueIndex);
    const { value: leaf, treeIndex } = this.values[valueIndex]!;
    checkBounds(this.tree, treeIndex);
    const hashedLeaf = this.leafHash(leaf);
    if (hashedLeaf !== this.tree[treeIndex]!) {
      throwError('Merkle tree does not contain the expected value');
    }
    return hashedLeaf;
  }

  protected leafHash(leaf: number | T): HexString {
    if (typeof leaf === 'number') {
      return this.validateValue(leaf);
    } else {
      return this.leafHasher(leaf);
    }
  }

  private _verify(leafHash: BytesLike, proof: BytesLike[]): boolean {
    return this.root === processProof(leafHash, proof);
  }

  private _verifyMultiProof(multiproof: MultiProof<BytesLike>): boolean {
    return this.root === processMultiProof(multiproof);
  }
}
