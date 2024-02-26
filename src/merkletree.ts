import { BytesLike, HexString, compare } from './bytes';

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
import { validateArgument, invariant } from './utils/errors';

export type MerkleTreeData<T> = {
  format: string;
  tree: HexString[];
  values: { value: T; treeIndex: number }[];
};

export interface MerkleTree<T> {
  root: HexString;
  render(): string;
  entries(): Iterable<[number, T]>;
  validate(): void;
  leafHash(leaf: T): HexString;
  leafLookup(leaf: T): number;
  getProof(leaf: number | T): HexString[];
  getMultiProof(leaves: (number | T)[]): MultiProof<HexString, T>;
  verify(leaf: number | T, proof: HexString[]): boolean;
  verifyMultiProof(multiproof: MultiProof<BytesLike, number | T>): boolean;
  dump(): MerkleTreeData<T>;
}

export abstract class MerkleTreeImpl<T> implements MerkleTree<T> {
  private readonly hashLookup: { [hash: HexString]: number };

  protected constructor(
    protected readonly tree: HexString[],
    protected readonly values: MerkleTreeData<T>['values'],
    public readonly leafHash: MerkleTree<T>['leafHash']
  ) {
    this.hashLookup = Object.fromEntries(values.map(({ treeIndex }, valueIndex) => [tree.at(treeIndex), valueIndex]));
  }

  protected static prepare<T>(
    values: T[],
    options: MerkleTreeOptions = {},
    leafHash: MerkleTree<T>['leafHash'],
  ): [tree: HexString[], indexedValues: MerkleTreeData<T>['values']] {
    const sortLeaves = options.sortLeaves ?? defaultOptions.sortLeaves;
    const hashedValues = values.map((value, valueIndex) => ({ value, valueIndex, hash: leafHash(value) }));

    if (sortLeaves) {
      hashedValues.sort((a, b) => compare(a.hash, b.hash));
    }

    const tree = makeMerkleTree(hashedValues.map(v => v.hash));

    const indexedValues = values.map(value => ({ value, treeIndex: 0 }));
    for (const [leafIndex, { valueIndex }] of hashedValues.entries()) {
      indexedValues[valueIndex]!.treeIndex = tree.length - leafIndex - 1;
    }

    return [tree, indexedValues];
  }

  get root(): HexString {
    return this.tree[0]!;
  }

  abstract dump(): MerkleTreeData<T>;

  render() {
    return renderMerkleTree(this.tree);
  }

  *entries(): Iterable<[number, T]> {
    for (const [i, { value }] of this.values.entries()) {
      yield [i, value];
    }
  }

  validate(): void {
    this.values.forEach((_, i) => this._validateValueAt(i));
    invariant(isValidMerkleTree(this.tree), 'Merkle tree is invalid');
  }

  leafLookup(leaf: T): number {
    const lookup = this.hashLookup[this.leafHash(leaf)];
    validateArgument(typeof lookup !== 'undefined', 'Leaf is not in tree');
    return lookup;
  }

  getProof(leaf: number | T): HexString[] {
    // input validity
    const valueIndex = typeof leaf === 'number' ? leaf : this.leafLookup(leaf);
    this._validateValueAt(valueIndex);

    // rebuild tree index and generate proof
    const { treeIndex } = this.values[valueIndex]!;
    const proof = getProof(this.tree, treeIndex);

    // sanity check proof
    invariant(this._verify(this.tree[treeIndex]!, proof), 'Unable to prove value');

    // return proof in hex format
    return proof;
  }

  getMultiProof(leaves: (number | T)[]): MultiProof<HexString, T> {
    // input validity
    const valueIndices = leaves.map(leaf => (typeof leaf === 'number' ? leaf : this.leafLookup(leaf)));
    for (const valueIndex of valueIndices) this._validateValueAt(valueIndex);

    // rebuild tree indices and generate proof
    const indices = valueIndices.map(i => this.values[i]!.treeIndex);
    const proof = getMultiProof(this.tree, indices);

    // sanity check proof
    invariant(this._verifyMultiProof(proof), 'Unable to prove values');

    // return multiproof in hex format
    return {
      leaves: proof.leaves.map(hash => this.values[this.hashLookup[hash]!]!.value),
      proof: proof.proof,
      proofFlags: proof.proofFlags,
    };
  }

  verify(leaf: number | T, proof: HexString[]): boolean {
    return this._verify(this._leafHash(leaf), proof);
  }

  verifyMultiProof(multiproof: MultiProof<BytesLike, number | T>): boolean {
    return this._verifyMultiProof({
      leaves: multiproof.leaves.map(l => this._leafHash(l)),
      proof: multiproof.proof,
      proofFlags: multiproof.proofFlags,
    });
  }

  private _validateValueAt(index: number): void {
    validateArgument(this.values.at(index) !== undefined, 'Index out of bounds');
    const { value, treeIndex } = this.values[index]!;
    invariant(this.tree.at(treeIndex) === this.leafHash(value), 'Merkle tree does not contain the expected value');
  }

  private _leafHash(leaf: number | T): HexString {
    if (typeof leaf === 'number') {
      validateArgument(this.values.at(leaf) !== undefined, 'Index out of bounds');
      leaf = this.values[leaf]?.value;
    }
    return this.leafHash(leaf);
  }

  private _verify(leafHash: BytesLike, proof: BytesLike[]): boolean {
    return this.root === processProof(leafHash, proof);
  }

  private _verifyMultiProof(multiproof: MultiProof<BytesLike>): boolean {
    return this.root === processMultiProof(multiproof);
  }
}
