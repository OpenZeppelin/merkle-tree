import { keccak256 } from '@ethersproject/keccak256';
import { defaultAbiCoder } from '@ethersproject/abi';
import { BytesLike, HexString, toHex } from './bytes';
import { MultiProof, processProof, processMultiProof } from './core';
import { MerkleTreeData, MerkleTreeImpl } from './merkletree';
import { MerkleTreeOptions } from './options';
import { throwError } from './utils/throw-error';

export type StandardMerkleTreeData<T extends any[]> = MerkleTreeData<T> & {
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
    super(tree, values, standardLeafHasher.bind(null, leafEncoding));
  }

  static of<T extends any[]>(
    values: T[],
    leafEncoding: string[],
    options: MerkleTreeOptions = {},
  ): StandardMerkleTree<T> {
    const [tree, indexedValues] = MerkleTreeImpl.prepare(values, options, standardLeafHasher.bind(null, leafEncoding));
    return new StandardMerkleTree(tree, indexedValues, leafEncoding);
  }

  static load<T extends any[]>(data: StandardMerkleTreeData<T>): StandardMerkleTree<T> {
    if (data.format !== 'standard-v1') {
      throw new Error(`Unknown format '${data.format}'`);
    }
    if (data.leafEncoding === undefined) {
      throwError('Expected leaf encoding');
    }
    return new StandardMerkleTree(data.tree, data.values, data.leafEncoding);
  }

  static verify<T extends any[]>(root: BytesLike, leafEncoding: string[], leaf: T, proof: BytesLike[]): boolean {
    return toHex(root) === processProof(standardLeafHasher(leafEncoding, leaf), proof);
  }

  static verifyMultiProof<T extends any[]>(
    root: BytesLike,
    leafEncoding: string[],
    multiproof: MultiProof<T>,
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
      tree: this.tree,
      values: this.values,
      leafEncoding: this.leafEncoding,
    };
  }
}
