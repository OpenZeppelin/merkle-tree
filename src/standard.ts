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
    treeIndex: number;
  }[];
  leafEncoding: string[];
}

export class StandardMerkleTree<T extends any[]> {
  private constructor(
    private readonly tree: Bytes[],
    private readonly values: { value: T, treeIndex: number }[],
    private readonly leafEncoding: string[],
  ) {}

  static of<T extends any[]>(values: T[], leafEncoding: string[]) {
    const orderedHashedValues = values
      .map(value => ({
        value,
        hash: standardLeafHash(value, leafEncoding),
      }))
      .sort((a, b) => compareBytes(a.hash, b.hash));

    const orderedIndexedValues = orderedHashedValues
      .map(({ value }, valueIndex) => ({
        value,
        treeIndex: 2 * values.length - valueIndex - 2,
      }));

    // Merkle tree of the hashed leaves
    const tree = makeMerkleTree(orderedHashedValues.map(v => v.hash));

    return new StandardMerkleTree(tree, orderedIndexedValues, leafEncoding);
  }

  static load<T extends any[]>(data: StandardMerkleTreeData<T>): StandardMerkleTree<T> {
    return new StandardMerkleTree(
      data.tree.map(hexToBytes),
      data.values,
      data.leafEncoding,
    );
  }

  dump(): StandardMerkleTreeData<T> {
    return {
      tree:         this.tree.map(hex),
      values:       this.values,
      leafEncoding: this.leafEncoding,
    };
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

  leafHash(leaf: T): string {
    return hex(standardLeafHash(leaf, this.leafEncoding));
  }

  leafLookup(leaf: T): number {
    const hash = standardLeafHash(leaf, this.leafEncoding);
    const treeIndex = this.tree.findIndex(node => equalsBytes(node, hash));
    if (treeIndex == -1) {
      throw new Error('Leaf is not in tree');
    }
    return this.tree.length - treeIndex - 1;
  }

  getProof(leaf: number | T): string[] {
    // input validity
    const valueIndex = typeof(leaf) === 'number' ? leaf : this.leafLookup(leaf);
    this.validateValue(valueIndex);

    // rebuilt tree index and generate proof
    const { treeIndex } = this.values[valueIndex]!;
    const proof = getProof(this.tree, treeIndex);

    // check proof
    const hash = this.tree[treeIndex]!;
    const impliedRoot = processProof(hash, proof);
    if (!equalsBytes(impliedRoot, this.tree[0]!)) {
      throw new Error('Unable to prove value');
    }

    // return proof in hex format
    return proof.map(hex);
  }

  getMultiProof(leaves: (number | T)[]): MultiProof<string, T> {
    // input validity
    const valueIndices = leaves.map(leaf => typeof(leaf) === 'number' ? leaf : this.leafLookup(leaf));
    for (const valueIndex of valueIndices) this.validateValue(valueIndex);

    // rebuilt tree indexes and generate proof
    const indexes = valueIndices.map(i => this.values[i]!.treeIndex);
    const proof = getMultiProof(this.tree, indexes);

    // check proof
    const impliedRoot = processMultiProof(proof);
    if (!equalsBytes(impliedRoot, this.tree[0]!)) {
      throw new Error('Unable to prove values');
    }

    // recover ordered leaves values
    const hashes         = indexes.map(i => this.tree[i]!);
    const orderedIndexes = proof.leaves.map(leave => hashes.findIndex(hash => equalsBytes(hash, leave))!);
    const orderedValues  = orderedIndexes.map(i => this.values[i]!.value);

    // return multiproof in hex format
    return {
      leaves:     orderedValues,
      proof:      proof.proof.map(hex),
      proofFlags: proof.proofFlags,
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
