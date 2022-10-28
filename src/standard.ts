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
  static of<T extends any[]>(values: T[], leafEncoding: string[]) {
    const hashedValues = values
      .map((value, valueIndex) => ({ value, valueIndex, hash: standardLeafHash(value, leafEncoding) }))
      .sort((a, b) => compareBytes(a.hash, b.hash));
    const indexedValues = values.map(value => ({ value, treeIndex: 0 }));
    const tree = makeMerkleTree(hashedValues.map(v => v.hash));
    for (const [leafIndex, { valueIndex }] of hashedValues.entries()) {
      indexedValues[valueIndex]!.treeIndex = tree.length - 1 - leafIndex;
    }
    return new StandardMerkleTree(tree, indexedValues, leafEncoding);
  }

  static load<T extends any[]>(data: StandardMerkleTreeData<T>): StandardMerkleTree<T> {
    return new StandardMerkleTree(data.tree.map(hexToBytes), data.values, data.leafEncoding);
  }

  private constructor(
    private readonly tree: Bytes[],
    private readonly values: { value: T, treeIndex: number }[],
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

  validate() {
    for (let i = 0; i < this.values.length; i++) {
      this.validateValue(i);
    }
    if (!isValidMerkleTree(this.tree)) {
      throw new Error('Merkle tree is invalid');
    }
  }

  getProof(valueIndex: number): string[] {
    this.validateValue(valueIndex);
    const { treeIndex } = this.values[valueIndex]!;
    const proof = getProof(this.tree, treeIndex);
    const leaf = this.tree[treeIndex]!;
    const impliedRoot = processProof(leaf, proof);
    if (!equalsBytes(impliedRoot, this.tree[0]!)) {
      throw new Error('Unable to prove value');
    }
    return proof.map(hex);
  }

  getMultiProof(valueIndices: number[]): MultiProof<string> {
    for (const valueIndex of valueIndices) this.validateValue(valueIndex);
    const treeIndices = valueIndices.map(i => this.values[i]!.treeIndex);
    const { proofFlags, proof }= getMultiProof(this.tree, treeIndices);
    const leaves = treeIndices.map(i => this.tree[i]!);
    const impliedRoot = processMultiProof(leaves, { proofFlags, proof });
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
