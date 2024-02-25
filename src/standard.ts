import { keccak256 } from '@ethersproject/keccak256';
import { defaultAbiCoder } from '@ethersproject/abi';
import { BytesLike, HexString, toHex } from './bytes';
import { MultiProof, processProof, processMultiProof } from './core';
import { MerkleTreeData, MerkleTreeImpl } from './merkletree';
import { MerkleTreeOptions } from './options';
import { validateArgument } from './utils/errors';

export type StandardMerkleTreeData<T extends any[]> = MerkleTreeData<T> & {
  format: 'standard-v1';
  leafEncoding: string[];
};

export function standardLeafHasher<T extends any[]>(types: string[], value: T): HexString {
  return keccak256(keccak256(defaultAbiCoder.encode(types, value)));
}

export class StandardMerkleTree<T extends any[]> extends MerkleTreeImpl<T> {
  protected constructor(
    protected readonly tree: HexString[],
    protected readonly values: StandardMerkleTreeData<T>['values'],
    protected readonly leafEncoding: string[],
  ) {
    super(tree, values, leaf => standardLeafHasher(leafEncoding, leaf));
  }

  static of<T extends any[]>(
    values: T[],
    leafEncoding: string[],
    options: MerkleTreeOptions = {},
  ): StandardMerkleTree<T> {
    const [tree, indexedValues] = MerkleTreeImpl.prepare(values, options, leaf =>
      standardLeafHasher(leafEncoding, leaf),
    );
    return new StandardMerkleTree(tree, indexedValues, leafEncoding);
  }

  static load<T extends any[]>(data: StandardMerkleTreeData<T>): StandardMerkleTree<T> {
    validateArgument(data.format === 'standard-v1', `Unknown format '${data.format}'`);
    validateArgument(data.leafEncoding !== undefined, 'Expected leaf encoding');
    return new StandardMerkleTree(data.tree, data.values, data.leafEncoding);
  }

  static verify<T extends any[]>(root: BytesLike, leafEncoding: string[], leaf: T, proof: BytesLike[]): boolean {
    return toHex(root) === processProof(standardLeafHasher(leafEncoding, leaf), proof);
  }

  static verifyMultiProof<T extends any[]>(
    root: BytesLike,
    leafEncoding: string[],
    multiproof: MultiProof<BytesLike, T>,
  ): boolean {
    return (
      toHex(root) ===
      processMultiProof({
        leaves: multiproof.leaves.map(leaf => standardLeafHasher(leafEncoding, leaf)),
        proof: multiproof.proof,
        proofFlags: multiproof.proofFlags,
      })
    );
  }

  dump(): StandardMerkleTreeData<T> {
    return {
      format: 'standard-v1',
      leafEncoding: this.leafEncoding,
      tree: this.tree,
      values: this.values,
    };
  }
}
