import { defaultAbiCoder } from '@ethersproject/abi';
import { BytesLike, HexString, toHex } from './bytes';
import { MultiProof, processProof, processMultiProof } from './core';
import { MerkleTreeData, MerkleTreeImpl } from './merkletree';
import { MerkleTreeOptions } from './options';
import { Encoder, standardLeafHash } from './hashes';
import { validateArgument } from './utils/errors';

export interface StandardMerkleTreeData<T extends any[]> extends MerkleTreeData<T> {
  format: 'standard-v1';
  leafEncoding: string[];
}

export class StandardMerkleTree<T extends any[]> extends MerkleTreeImpl<T> {
  protected constructor(
    protected readonly tree: HexString[],
    protected readonly values: StandardMerkleTreeData<T>['values'],
    protected readonly leafEncoding: string[],
    protected readonly encoder: Encoder = defaultAbiCoder,
  ) {
    super(tree, values, leaf => standardLeafHash(leafEncoding, leaf, encoder));
  }

  static of<T extends any[]>(
    values: T[],
    leafEncoding: string[],
    options: MerkleTreeOptions = {},
    encoder: Encoder = defaultAbiCoder,
  ): StandardMerkleTree<T> {
    // use default nodeHash (standardNodeHash)
    const [tree, indexedValues] = MerkleTreeImpl.prepare(values, options, leaf =>
      standardLeafHash(leafEncoding, leaf, encoder),
    );
    return new StandardMerkleTree(tree, indexedValues, leafEncoding, encoder);
  }

  static load<T extends any[]>(
    data: StandardMerkleTreeData<T>,
    encoder: Encoder = defaultAbiCoder,
  ): StandardMerkleTree<T> {
    validateArgument(data.format === 'standard-v1', `Unknown format '${data.format}'`);
    validateArgument(data.leafEncoding !== undefined, 'Expected leaf encoding');

    const tree = new StandardMerkleTree(data.tree, data.values, data.leafEncoding, encoder);
    tree.validate();
    return tree;
  }

  static verify<T extends any[]>(
    root: BytesLike,
    leafEncoding: string[],
    leaf: T,
    proof: BytesLike[],
    encoder: Encoder = defaultAbiCoder,
  ): boolean {
    // use default nodeHash (standardNodeHash) for processProof
    return toHex(root) === processProof(standardLeafHash(leafEncoding, leaf, encoder), proof);
  }

  static verifyMultiProof<T extends any[]>(
    root: BytesLike,
    leafEncoding: string[],
    multiproof: MultiProof<BytesLike, T>,
    encoder: Encoder = defaultAbiCoder,
  ): boolean {
    // use default nodeHash (standardNodeHash) for processMultiProof
    return (
      toHex(root) ===
      processMultiProof({
        leaves: multiproof.leaves.map(leaf => standardLeafHash(leafEncoding, leaf, encoder)),
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
