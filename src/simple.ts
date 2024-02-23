import { defaultAbiCoder } from "@ethersproject/abi";
import { BytesLike, HexString, toHex } from "./bytes";
import { MultiProof, processProof, processMultiProof } from "./core";
import { MerkleTreeData, MerkleTreeImpl } from "./merkletree";
import { MerkleTreeOptions } from "./options";
import { throwError } from "./utils/throw-error";

export function formatLeaf(value: BytesLike): HexString {
  return defaultAbiCoder.encode(["bytes32"], [ value ]);
}

export class SimpleMerkleTree extends MerkleTreeImpl<BytesLike> {
  static of = (
    values: BytesLike[],
    options: MerkleTreeOptions = {},
  ): SimpleMerkleTree => {
    const [ tree, indexedValues ] = MerkleTreeImpl.prepare(values, options, formatLeaf);
    return new SimpleMerkleTree(tree, indexedValues, formatLeaf);
  }

  static load(
    data: MerkleTreeData<BytesLike>,
  ): SimpleMerkleTree {
    if (data.format !== "simple-v1") {
      throwError(`Unknown format '${data.format}'`);
    }
    return new SimpleMerkleTree(data.tree, data.values, formatLeaf);
  }

  static verify(
    root: BytesLike,
    leaf: BytesLike,
    proof: BytesLike[],
  ): boolean {
    return toHex(root) === processProof(formatLeaf(leaf), proof);
  }

  static verifyMultiProof(
    root: BytesLike,
    multiproof: MultiProof<BytesLike>,
  ): boolean {
    return toHex(root) === processMultiProof(multiproof);
  }
}