import { keccak256 } from 'ethereum-cryptography/keccak';
import { equalsBytes, hexToBytes } from 'ethereum-cryptography/utils';
import { defaultAbiCoder } from '@ethersproject/abi';
import { Bytes, compareBytes, hex } from './bytes';
import { getProof, isValidMerkleTree, makeMerkleTree, processProof, printMerkleTree, MultiProof, getMultiProof, processMultiProof } from './core';
import { checkBounds } from './utils/check-bounds';

function standardLeafHash<T extends any[]>(value: T, types: string[]): Bytes {
  return keccak256(keccak256(hexToBytes(defaultAbiCoder.encode(types, value))));
}

interface StandardMerkleTreeData<T extends any[]> {
  tree: string[];
  values: {
    value: T;
    hash: Bytes;
    treeIndex: number;
  }[];
  leafEncoding: string[];
}

export class StandardMerkleTree<T extends any[]> {
  static of<T extends any[]>(values: T[], leafEncoding: string[]) {
    const hashedValues = values.map((value, valueIndex) => ({
      value,
      hash: standardLeafHash(value, leafEncoding),
      treeIndex: 2 * values.length - valueIndex - 2,
    }));

    // Merkle tree of the hashed leaves
    const tree = makeMerkleTree(hashedValues.map(v => v.hash));

    return new StandardMerkleTree(tree, hashedValues, leafEncoding);
  }

  static load<T extends any[]>(data: StandardMerkleTreeData<T>): StandardMerkleTree<T> {
    return new StandardMerkleTree(data.tree.map(hexToBytes), data.values, data.leafEncoding);
  }

  private constructor(
    private readonly tree: Bytes[],
    private readonly values: { value: T, treeIndex: number, hash: Bytes }[],
    private readonly leafEncoding: string[],
  ) {}

  dump(): StandardMerkleTreeData<T> {
    const tree = this.tree.map(hex);
    const { values, leafEncoding } = this;
    return { tree, values, leafEncoding };
  }

  print() {
    printMerkleTree(this.tree);
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

  leafLookup(leaf: T): number {
    const hash = standardLeafHash(leaf, this.leafEncoding);
    const index = this.values.findIndex(value => equalsBytes(value.hash, hash));
    if (index == -1) {
      throw new Error('Leaf is not in tree');
    }
    return index;
  }

  getProof(leaf: number | T): string[] {
    const valueIndex = typeof(leaf) === 'number' ? leaf : this.leafLookup(leaf);
    this.validateValue(valueIndex);
    const { treeIndex } = this.values[valueIndex]!;
    const proof = getProof(this.tree, treeIndex);
    const hash = this.tree[treeIndex]!;
    const impliedRoot = processProof(hash, proof);
    if (!equalsBytes(impliedRoot, this.tree[0]!)) {
      throw new Error('Unable to prove value');
    }
    return proof.map(hex);
  }

  getMultiProof(leaves: (number | T)[]): MultiProof<string> {
    const valueIndices = leaves.map(leaf => typeof(leaf) === 'number' ? leaf : this.leafLookup(leaf));
    for (const valueIndex of valueIndices) this.validateValue(valueIndex);
    const treeIndices = valueIndices.map(i => this.values[i]!.treeIndex);
    const { proofFlags, proof } = getMultiProof(this.tree, treeIndices);
    const hashes = treeIndices.map(i => this.tree[i]!);
    const impliedRoot = processMultiProof(hashes, { proofFlags, proof });
    if (!equalsBytes(impliedRoot, this.tree[0]!)) {
      throw new Error('Unable to prove values');
    }
    return {
      proofFlags,
      proof: proof.map(hex),
    }
  }

  private validateValue(valueIndex: number) {
    checkBounds(this.values, valueIndex);
    const { value, treeIndex } = this.values[valueIndex]!;
    checkBounds(this.tree, treeIndex);
    const leaf = standardLeafHash(value, this.leafEncoding);
    if (!equalsBytes(leaf, this.tree[treeIndex]!)) {
      throw new Error('Merkle tree does not contain the expected value');
    }
  }
}
