import { HashFn } from "./bytes";
import { standardHash } from "./utils/standard-hash";

// MerkleTree building options
export type MerkleTreeOptions = Partial<{
  /** Enable or disable sorted leaves. Sorting is strongly recommended for multiproofs. */
  sortLeaves: boolean;
  /** Hashing function. Defaults to a sorted keccak256. */
  hashFn: HashFn;
}>;

// Recommended (default) options.
// - leaves are sorted by default to facilitate onchain verification of multiproofs.
// - keccak256 is used by default for hashing.
export const defaultOptions: Required<MerkleTreeOptions> = {
  sortLeaves: true,
  hashFn: standardHash,
};
