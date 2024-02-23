import { defaultAbiCoder } from "@ethersproject/abi";
import { BytesLike, HexString, isBytesLike, toHex, compare } from "./bytes";

import {
  MultiProof,
  makeMerkleTree,
  isValidMerkleTree,
  getProof,
  getMultiProof,
  processProof,
  processMultiProof,
  renderMerkleTree,
} from "./core";

import { SimpleMerkleTreeOptions, defaultOptions } from "./options";
import { checkBounds } from "./utils/check-bounds";
import { throwError } from "./utils/throw-error";

export type SimpleMerkleTreeValue = {
  value: BytesLike[];
  treeIndex: number;
};

export type SimpleMerkleTreeData = {
  format: string;
  tree: HexString[];
  values: SimpleMerkleTreeValue[];
};

/// @notice Not an actual hash function, just a placeholder
export function simpleLeafHash(value: BytesLike[]): HexString {
  return defaultAbiCoder.encode(["bytes32"], value);
}

export interface MerkleTree<T extends BytesLike[] = BytesLike[]> {
  root: HexString;
  dump(): SimpleMerkleTreeData;
  render(): string;
  entries(): Iterable<[number, T]>;
  validate(): void;
  leafLookup(leaf: T): number;
  getProof(leaf: number | T): HexString[];
  getMultiProof(leaves: (number | T)[]): MultiProof;
  verify(leaf: number | T, proof: HexString[]): boolean;
  verifyMultiProof(multiproof: MultiProof): boolean;
}

export class SimpleMerkleTree implements MerkleTree {
  private readonly hashLookup: { [hash: HexString]: number };

  protected constructor(
    protected readonly tree: HexString[],
    protected readonly values: SimpleMerkleTreeValue[],
    protected readonly options: SimpleMerkleTreeOptions = {}
  ) {
    this.options = Object.assign(options, defaultOptions);
    this.hashLookup = Object.fromEntries(
      values.map(({ value }, valueIndex) => [this.leafHash(value), valueIndex])
    );
  }

  protected static parameters(
    values: BytesLike[][],
    options: SimpleMerkleTreeOptions = {},
    leafHash: (value: BytesLike[]) => HexString = simpleLeafHash
  ): [HexString[], indexedValues: SimpleMerkleTreeValue[]] {
    const { sortLeaves } = { ...defaultOptions, ...options };

    const hashedValues = values.map((value, valueIndex) => ({
      value,
      valueIndex,
      hash: leafHash(value),
    }));

    if (sortLeaves) {
      hashedValues.sort((a, b) => compare(a.hash, b.hash));
    }

    const tree = makeMerkleTree(hashedValues.map((v) => v.hash));

    const indexedValues = values.map((value) => ({
      value,
      treeIndex: 0,
    }));
    for (const [leafIndex, { valueIndex }] of hashedValues.entries()) {
      indexedValues[valueIndex]!.treeIndex = tree.length - leafIndex - 1;
    }

    return [tree, indexedValues];
  }

  static of<O extends SimpleMerkleTreeOptions>(
    values: BytesLike[][],
    options: O
  ): SimpleMerkleTree {
    return new this(...this.parameters(values, options));
  }

  static load<D extends SimpleMerkleTreeData>(data: D): SimpleMerkleTree {
    if (data.format !== "simple-v1") {
      throwError(`Unknown format '${data.format}'`);
    }

    return new this(
      data.tree,
      data.values.map(({ value, treeIndex }) => ({
        value: value.map((v) => toHex(v)),
        treeIndex,
      }))
    );
  }

  static verify<T extends BytesLike[]>(
    root: BytesLike,
    leaf: T,
    proof: BytesLike[],
    _?: SimpleMerkleTreeOptions
  ): boolean {
    return toHex(root) === processProof(simpleLeafHash(leaf), proof);
  }

  static verifyMultiProof(
    root: BytesLike,
    multiproof: MultiProof,
    _?: SimpleMerkleTreeOptions
  ): boolean {
    return (
      toHex(root) ===
      processMultiProof({
        leaves: multiproof.leaves,
        proof: multiproof.proof,
        proofFlags: multiproof.proofFlags,
      })
    );
  }

  get root(): HexString {
    return this.tree[0]!;
  }

  dump(): SimpleMerkleTreeData {
    return {
      format: "simple-v1",
      tree: this.tree,
      values: this.values,
    };
  }

  render() {
    return renderMerkleTree(this.tree);
  }

  *entries(): Iterable<[number, BytesLike[]]> {
    for (const [i, { value }] of this.values.entries()) {
      yield [i, value];
    }
  }

  validate() {
    for (let i = 0; i < this.values.length; i++) {
      this.validateValue(i);
    }
    if (!isValidMerkleTree(this.tree)) {
      throwError("Merkle tree is invalid");
    }
  }

  leafLookup(leaf: BytesLike[]): number {
    return (
      this.hashLookup[toHex(this.leafHash(leaf))] ??
      throwError("Leaf is not in tree")
    );
  }

  getProof(leaf: number | BytesLike[]): HexString[] {
    // input validity
    const valueIndex = typeof leaf === "number" ? leaf : this.leafLookup(leaf);
    this.validateValue(valueIndex);

    // rebuild tree index and generate proof
    const { treeIndex } = this.values[valueIndex]!;
    const proof = getProof(this.tree, treeIndex);

    // sanity check proof
    if (!this._verify(this.tree[treeIndex]!, proof)) {
      throwError("Unable to prove value");
    }

    // return proof in hex format
    return proof;
  }

  getMultiProof(leaves: (number | BytesLike[])[]): MultiProof {
    // input validity
    const valueIndices = leaves.map((leaf) =>
      typeof leaf === "number" ? leaf : this.leafLookup(leaf)
    );
    for (const valueIndex of valueIndices) this.validateValue(valueIndex);

    // rebuild tree indices and generate proof
    const indices = valueIndices.map((i) => this.values[i]!.treeIndex);
    const proof = getMultiProof(this.tree, indices);

    // sanity check proof
    if (!this._verifyMultiProof(proof)) {
      throwError("Unable to prove values");
    }

    // return multiproof in hex format
    return {
      leaves: proof.leaves,
      proof: proof.proof,
      proofFlags: proof.proofFlags,
    };
  }

  verify(leaf: number | BytesLike[], proof: HexString[]): boolean {
    return this._verify(this.leafHash(leaf), proof);
  }

  verifyMultiProof(multiproof: MultiProof): boolean {
    return this._verifyMultiProof({
      leaves: multiproof.leaves,
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
      throwError("Merkle tree does not contain the expected value");
    }
    return hashedLeaf;
  }

  protected leafHash(leaf: number | BytesLike[]): HexString {
    if (Array.isArray(leaf)) {
      return simpleLeafHash(leaf);
    } else {
      return this.validateValue(leaf);
    }
  }

  private _verify(leafHash: HexString, proof: HexString[]): boolean {
    return this.root === processProof(leafHash, proof);
  }

  private _verifyMultiProof(multiproof: MultiProof): boolean {
    return this.root === processMultiProof(multiproof);
  }
}
