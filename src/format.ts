import type { HexString } from "./bytes";

// Dump/Load format
export type MerkleTreeData<T> = {
  format: 'standard-v1';
  tree: HexString[];
  values: {
    value: T;
    treeIndex: number;
  }[];
}
