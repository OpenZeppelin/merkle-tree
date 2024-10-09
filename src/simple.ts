import { encode } from '@metamask/abi-utils';
import { BytesLike, HexString, toHex } from './bytes';
import { MultiProof, processProof, processMultiProof } from './core';
import { MerkleTreeData, MerkleTreeImpl } from './merkletree';
import { MerkleTreeOptions } from './options';
import { NodeHash } from './hashes';
import { validateArgument } from './utils/errors';

export interface SimpleMerkleTreeData extends MerkleTreeData<HexString> {
  format: 'simple-v1';
  hash?: 'custom';
}

export interface SimpleMerkleTreeOptions extends MerkleTreeOptions {
  nodeHash?: NodeHash;
}

export function formatLeaf(value: BytesLike): HexString {
  return toHex(encode(['bytes32'], [value]));
}

export class SimpleMerkleTree extends MerkleTreeImpl<BytesLike> {
  static of(values: BytesLike[], options: SimpleMerkleTreeOptions = {}): SimpleMerkleTree {
    const [tree, indexedValues] = MerkleTreeImpl.prepare(values, options, formatLeaf, options.nodeHash);
    return new SimpleMerkleTree(tree, indexedValues, formatLeaf, options.nodeHash);
  }

  static load(data: SimpleMerkleTreeData, nodeHash?: NodeHash): SimpleMerkleTree {
    validateArgument(data.format === 'simple-v1', `Unknown format '${data.format}'`);
    validateArgument(
      (nodeHash == undefined) !== (data.hash == 'custom'),
      nodeHash ? 'Data does not expect a custom node hashing function' : 'Data expects a custom node hashing function',
    );

    const tree = new SimpleMerkleTree(data.tree, data.values, formatLeaf, nodeHash);
    tree.validate();
    return tree;
  }

  static verify(root: BytesLike, leaf: BytesLike, proof: BytesLike[], nodeHash?: NodeHash): boolean {
    return toHex(root) === processProof(formatLeaf(leaf), proof, nodeHash);
  }

  static verifyMultiProof(root: BytesLike, multiproof: MultiProof<BytesLike, BytesLike>, nodeHash?: NodeHash): boolean {
    return toHex(root) === processMultiProof(multiproof, nodeHash);
  }

  dump(): SimpleMerkleTreeData {
    return {
      format: 'simple-v1',
      tree: this.tree,
      values: this.values.map(({ value, treeIndex }) => ({ value: toHex(value), treeIndex })),
      ...(this.nodeHash ? { hash: 'custom' } : {}),
    };
  }
}
