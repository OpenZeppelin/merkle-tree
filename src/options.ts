// SimpleMerkleTree building options
export type SimpleMerkleTreeOptions = Partial<{
  /** Enable or disable sorted leaves. Sorting is strongly recommended for multiproofs. */
  sortLeaves: boolean;
}>;

// StandardMerkleTree building options
export type StandardMerkleTreeOptions = SimpleMerkleTreeOptions & {
  /** ABI Encoding for leaf values. */
  leafEncoding: string[];
};

// Recommended (default) SimpleMerkleTree options.
// - leaves are sorted by default to facilitate onchain verification of multiproofs.
export const defaultOptions: Required<SimpleMerkleTreeOptions> = {
  sortLeaves: true,
};
