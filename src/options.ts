// MerkleTree building options
export type MerkleTreeOptions = Partial<{
  sortLeaves: boolean;
}>;

// For backward compatibility reasons, leaves are sorted by default.
// This can be disabled for usecases where leaves ordering needs to be preserved
export const defaultOptions: Required<MerkleTreeOptions> = {
  sortLeaves: true,
};
