import { equalsBytes } from 'ethereum-cryptography/utils';
import { keccak256 } from 'ethereum-cryptography/keccak';
import { defaultAbiCoder } from '@ethersproject/abi';
import { Bytes, BytesLike, compareBytes, toHex, toBytes } from './bytes';
import { MultiProof, makeMerkleTree, isValidMerkleTree, getProof, getMultiProof, processProof, processMultiProof,renderMerkleTree } from './core';
import { checkBounds } from './utils/check-bounds';
import { throwError } from './utils/throw-error';

// Types
export type LeafLike = any[] | BytesLike
export type Encoding<T extends LeafLike> = T extends any[] ? string[] : undefined;

// Hashing
function standardLeafHash<T extends LeafLike>(value: T, types: Encoding<T>): Bytes {
  if (Array.isArray(value)) {
    return keccak256(keccak256(toBytes(defaultAbiCoder.encode(types as Encoding<any[]>, value))));
  } else {
    const result = toBytes(value);
    if (result.length !== 32) throwError('Invalid leaf length');
    return result;
  }
}

// MerkleTree building options
export type StandardMerkleTreeOptions = Partial<{
  sortLeaves: boolean;
}>;

// For backward compatibility reasons, leaves are sorted by default.
// This can be disabled for usecases where leaves ordering needs to be preserved
const defaultOptions: Required<StandardMerkleTreeOptions> = {
  sortLeaves: true,
};

// Dump/Load format
interface StandardMerkleTreeData<T extends any[] | BytesLike> {
  format: 'standard-v1';
  tree: string[];
  values: {
    value: T;
    treeIndex: number;
  }[];
  leafEncoding: Encoding<T>;
}

export class StandardMerkleTree<T extends any[] | BytesLike> {
  private readonly hashLookup: { [hash: string]: number };

  private constructor(
    private readonly tree: Bytes[],
    private readonly values: { value: T, treeIndex: number }[],
    private readonly leafEncoding: Encoding<T>,
  ) {
    this.hashLookup =
      Object.fromEntries(values.map(({ value }, valueIndex) => [
        toHex(standardLeafHash(value, leafEncoding)),
        valueIndex,
      ]));
  }

  static of<T extends any[] | BytesLike>(values: T[], leafEncoding: Encoding<T>, options: StandardMerkleTreeOptions = {}) {
    const { sortLeaves } = { ...defaultOptions, ...options };

    const hashedValues = values.map((value, valueIndex) => ({ value, valueIndex, hash: standardLeafHash(value, leafEncoding) }));

    if (sortLeaves) {
      hashedValues.sort((a, b) => compareBytes(a.hash, b.hash));
    }

    const tree = makeMerkleTree(hashedValues.map(v => v.hash));

    const indexedValues = values.map(value => ({ value, treeIndex: 0 }));
    for (const [leafIndex, { valueIndex }] of hashedValues.entries()) {
      indexedValues[valueIndex]!.treeIndex = tree.length - leafIndex - 1;
    }

    return new StandardMerkleTree(tree, indexedValues, leafEncoding);
  }

  static load<T extends any[] | BytesLike>(data: StandardMerkleTreeData<T>): StandardMerkleTree<T> {
    if (data.format !== 'standard-v1') {
      throw new Error(`Unknown format '${data.format}'`);
    }
    return new StandardMerkleTree(
      data.tree.map(toBytes),
      data.values,
      data.leafEncoding,
    );
  }

  static verify<T extends any[] | BytesLike>(root: string, leafEncoding: Encoding<T>, leaf: T, proof: string[]): boolean {
    const impliedRoot = processProof(standardLeafHash(leaf, leafEncoding), proof.map(toBytes));
    return equalsBytes(impliedRoot, toBytes(root));
  }

  static verifyMultiProof<T extends any[] | BytesLike>(root: string, leafEncoding: Encoding<T>, multiproof: MultiProof<string, T>): boolean {
    const leafHashes = multiproof.leaves.map(leaf => standardLeafHash(leaf, leafEncoding));
    const proofBytes = multiproof.proof.map(toBytes);

    const impliedRoot = processMultiProof({
      leaves: leafHashes,
      proof: proofBytes,
      proofFlags: multiproof.proofFlags,
    });

    return equalsBytes(impliedRoot, toBytes(root));
  }

  dump(): StandardMerkleTreeData<T> {
    return {
      format:      'standard-v1',
      tree:         this.tree.map(toHex),
      values:       this.values,
      leafEncoding: this.leafEncoding,
    };
  }

  render() {
    return renderMerkleTree(this.tree);
  }

  get root(): string {
    return toHex(this.tree[0]!);
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
    return toHex(standardLeafHash(leaf, this.leafEncoding));
  }

  leafLookup(leaf:T): number {
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
    return proof.map(toHex);
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
      leaves:     proof.leaves.map(hash => this.values[this.hashLookup[toHex(hash)]!]!.value),
      proof:      proof.proof.map(toHex),
      proofFlags: proof.proofFlags,
    }
  }

  verify(leaf: number | T, proof: string[]): boolean {
    return this._verify(this.getLeafHash(leaf), proof.map(toBytes));
  }

  private _verify(leafHash: Bytes, proof: Bytes[]): boolean {
    const impliedRoot = processProof(leafHash, proof);
    return equalsBytes(impliedRoot, this.tree[0]!);
  }

  verifyMultiProof(multiproof: MultiProof<string, number | T>): boolean {
    return this._verifyMultiProof({
      leaves: multiproof.leaves.map(l => this.getLeafHash(l)),
      proof: multiproof.proof.map(toBytes),
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
