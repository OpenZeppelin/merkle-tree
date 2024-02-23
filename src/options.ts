// MerkleTree building options
export type MerkleTreeOptions = Partial<{
  /** Enable or disable sorted leaves. Sorting is strongly recommended for multiproofs. */
  sortLeaves: boolean;
}>;

// Recommended (default) MerkleTree options.
// - leaves are sorted by default to facilitate onchain verification of multiproofs.
export const defaultOptions: Required<MerkleTreeOptions> = {
  sortLeaves: true,
};
