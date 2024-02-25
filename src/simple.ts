import { defaultAbiCoder } from '@ethersproject/abi';
import { BytesLike, HexString, toHex } from './bytes';
import { MultiProof, processProof, processMultiProof } from './core';
import { MerkleTreeData, MerkleTreeImpl } from './merkletree';
import { MerkleTreeOptions } from './options';
import { validateArgument } from './utils/errors';

export type StandardMerkleTreeData<T> = MerkleTreeData<T> & {
  format: 'simple-v1';
};

export function formatLeaf(value: BytesLike): HexString {
  return defaultAbiCoder.encode(['bytes32'], [value]);
}

export class SimpleMerkleTree extends MerkleTreeImpl<BytesLike> {
  static of(values: BytesLike[], options: MerkleTreeOptions = {}): SimpleMerkleTree {
    const [tree, indexedValues] = MerkleTreeImpl.prepare(values, options, formatLeaf);
    return new SimpleMerkleTree(tree, indexedValues, formatLeaf);
  }

  static load(data: StandardMerkleTreeData<BytesLike>): SimpleMerkleTree {
    validateArgument(data.format === 'simple-v1', `Unknown format '${data.format}'`);
    return new SimpleMerkleTree(data.tree, data.values, formatLeaf);
  }

  static verify(root: BytesLike, leaf: BytesLike, proof: BytesLike[]): boolean {
    return toHex(root) === processProof(formatLeaf(leaf), proof);
  }

  static verifyMultiProof(root: BytesLike, multiproof: MultiProof<BytesLike, BytesLike>): boolean {
    return toHex(root) === processMultiProof(multiproof);
  }

  dump(): StandardMerkleTreeData<BytesLike> {
    return {
      format: 'simple-v1',
      tree: this.tree,
      values: this.values,
    };
  }
}
