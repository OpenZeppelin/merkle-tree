import { HexString } from "./bytes";
import { MultiProof } from "./core";

export type MerkleTreeData<T> = {
  format: string;
  tree: HexString[];
  values: { value: T; treeIndex: number; }[];
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
  verifyMultiProof(multiproof: MultiProof<T>): boolean;
}