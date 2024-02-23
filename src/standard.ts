import { BytesLike, HexString, toHex, isBytes, isBytesLike } from "./bytes";

import { MultiProof, processProof, processMultiProof } from "./core";

import {
  SimpleMerkleTree,
  SimpleMerkleTreeData,
  SimpleMerkleTreeValue,
} from "./simple";

import { defaultAbiCoder } from "@ethersproject/abi";
import { keccak256 } from "@ethersproject/keccak256";

import { StandardMerkleTreeOptions } from "./options";
import { throwError } from "./utils/throw-error";

export type StandardMerkleTreeValue = SimpleMerkleTreeValue;

export type StandardMerkleTreeData = SimpleMerkleTreeData & {
  leafEncoding?: string[];
};

export function standardLeafHash<T extends BytesLike[] = BytesLike[]>(
  value: T,
  types: string[]
): HexString {
  return keccak256(keccak256(defaultAbiCoder.encode(types, value)));
}

export class StandardMerkleTree extends SimpleMerkleTree {
  protected constructor(
    protected readonly tree: HexString[],
    protected readonly values: SimpleMerkleTreeValue[],
    protected readonly options: StandardMerkleTreeOptions
  ) {
    super(tree, values, options);
  }

  protected static parameters(
    values: BytesLike[][],
    options: StandardMerkleTreeOptions
  ): [HexString[], indexedValues: SimpleMerkleTreeValue[]] {
    return super.parameters(values, options, (value) =>
      standardLeafHash(value, options.leafEncoding)
    );
  }

  static of(
    values: BytesLike[][],
    options: StandardMerkleTreeOptions
  ): StandardMerkleTree;
  static of(
    values: BytesLike[][],
    leafEncoding: StandardMerkleTreeOptions["leafEncoding"]
  ): StandardMerkleTree;
  static of(
    values: BytesLike[][],
    optionsOrLeafEncoding:
      | StandardMerkleTreeOptions
      | StandardMerkleTreeOptions["leafEncoding"]
  ): StandardMerkleTree {
    if (Array.isArray(optionsOrLeafEncoding)) {
      optionsOrLeafEncoding = { leafEncoding: optionsOrLeafEncoding };
    }

    const options = Object.assign({}, optionsOrLeafEncoding);

    return new StandardMerkleTree(...this.parameters(values, options), options);
  }

  static load<D extends StandardMerkleTreeData>(data: D): StandardMerkleTree {
    if (data.leafEncoding === undefined) {
      throwError("Expected leaf encoding");
    }

    if (data.format !== "standard-v1") {
      throw new Error(`Unknown format '${data.format}'`);
    }

    const leafEncoding = data.leafEncoding;

    return new StandardMerkleTree(data.tree, data.values, { leafEncoding });
  }

  static verify(
    root: BytesLike,
    leaf: BytesLike[],
    proof: BytesLike[],
    options: StandardMerkleTreeOptions
  ): boolean;
  static verify(
    root: BytesLike,
    leafEncoding: StandardMerkleTreeOptions["leafEncoding"],
    leaf: BytesLike[],
    proof: BytesLike[]
  ): boolean;
  static verify(
    root: BytesLike,
    leafOrLeafEncoding: BytesLike[] | StandardMerkleTreeOptions["leafEncoding"],
    proofOrLeaf: BytesLike[] | BytesLike[],
    optionsOrProof: StandardMerkleTreeOptions | BytesLike[]
  ): boolean {
    let leaf: BytesLike[];
    let proof: BytesLike[];
    let options: StandardMerkleTreeOptions;

    if ("leafEncoding" in optionsOrProof) {
      leaf = leafOrLeafEncoding;
      proof = proofOrLeaf;
      options = optionsOrProof;
    } else if (leafOrLeafEncoding.some((v) => !isBytesLike(v))) {
      leaf = proofOrLeaf;
      proof = optionsOrProof;

      options = {
        leafEncoding:
          leafOrLeafEncoding as StandardMerkleTreeOptions["leafEncoding"],
      };
    } else {
      throwError("Invalid arguments");
    }

    return (
      toHex(root) ===
      processProof(standardLeafHash(leaf, options.leafEncoding), proof)
    );
  }

  static verifyMultiProof(
    root: BytesLike,
    leafEncoding: string[],
    multiproof: MultiProof
  ): boolean;
  static verifyMultiProof(
    root: BytesLike,
    multiproof: MultiProof,
    options?: StandardMerkleTreeOptions
  ): boolean;
  static verifyMultiProof(
    root: BytesLike,
    leafEncodingOrMultiproof: string[] | MultiProof,
    multiProofOrOptions?: MultiProof | StandardMerkleTreeOptions
  ): boolean {
    let leafEncoding: string[];
    let multiproof: MultiProof;
    let options: StandardMerkleTreeOptions;

    if (
      "proof" in leafEncodingOrMultiproof &&
      Array.isArray(multiProofOrOptions)
    ) {
      leafEncoding = multiProofOrOptions;
      multiproof = leafEncodingOrMultiproof;
      options = { leafEncoding };
    } else if (Array.isArray(leafEncodingOrMultiproof)) {
      if (
        multiProofOrOptions === undefined ||
        "leafEncoding" in multiProofOrOptions
      ) {
        throwError("Invalid arguments");
      }

      leafEncoding = leafEncodingOrMultiproof;
      multiproof = multiProofOrOptions;
      options = { leafEncoding };
    } else {
      throwError("Invalid arguments");
    }

    return (
      toHex(root) ===
      processMultiProof({
        leaves: multiproof.leaves,
        proof: multiproof.proof,
        proofFlags: multiproof.proofFlags,
      })
    );
  }

  dump(): StandardMerkleTreeData {
    return {
      format: "standard-v1",
      tree: this.tree,
      values: this.values,
      leafEncoding: this.options.leafEncoding,
    };
  }

  protected leafHash(leaf: number | BytesLike[]): HexString {
    if (Array.isArray(leaf)) {
      return standardLeafHash(leaf, this.options.leafEncoding);
    } else {
      return this.validateValue(leaf);
    }
  }
}
