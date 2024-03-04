import { BytesLike, HexString, toHex } from './bytes';
import { MultiProof, processProof, processMultiProof } from './core';
import { MerkleTreeData, MerkleTreeImpl } from './merkletree';
import { MerkleTreeOptions } from './options';
import { standardLeafHash } from './hashes';
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
  ) {
    super(tree, values, leaf => standardLeafHash(leafEncoding, leaf));
  }

  static of<T extends any[]>(
    values: T[],
    leafEncoding: string[],
    options: MerkleTreeOptions = {},
  ): StandardMerkleTree<T> {
    // use default nodeHash (standardNodeHash)
    const [tree, indexedValues] = MerkleTreeImpl.prepare(values, options, leaf => standardLeafHash(leafEncoding, leaf));
    return new StandardMerkleTree(tree, indexedValues, leafEncoding);
  }

  static load<T extends any[]>(data: StandardMerkleTreeData<T>): StandardMerkleTree<T> {
    validateArgument(data.format === 'standard-v1', `Unknown format '${data.format}'`);
    validateArgument(data.leafEncoding !== undefined, 'Expected leaf encoding');

    const tree = new StandardMerkleTree(data.tree, data.values, data.leafEncoding);
    tree.validate();
    return tree;
  }

  static verify<T extends any[]>(root: BytesLike, leafEncoding: string[], leaf: T, proof: BytesLike[]): boolean {
    // use default nodeHash (standardNodeHash) for processProof
    return toHex(root) === processProof(standardLeafHash(leafEncoding, leaf), proof);
  }

  static verifyMultiProof<T extends any[]>(
    root: BytesLike,
    leafEncoding: string[],
    multiproof: MultiProof<BytesLike, T>,
  ): boolean {
    // use default nodeHash (standardNodeHash) for processMultiProof
    return (
      toHex(root) ===
      processMultiProof({
        leaves: multiproof.leaves.map(leaf => standardLeafHash(leafEncoding, leaf)),
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
