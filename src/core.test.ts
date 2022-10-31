import fc from 'fast-check';
import { equalsBytes } from 'ethereum-cryptography/utils';
import { makeMerkleTree, getProof, processProof, getMultiProof, processMultiProof } from './core';
import { hex } from './bytes';

const leaf = fc.uint8Array({ minLength: 32, maxLength: 32 }).map(x => PrettyBytes.from(x));
const leaves = fc.array(leaf, { minLength: 1 });
const leavesAndIndex = leaves.chain(xs => fc.tuple(fc.constant(xs), fc.nat({ max: xs.length - 1 })));
const leavesAndIndices = leaves.chain(xs => fc.tuple(fc.constant(xs), fc.uniqueArray(fc.nat({ max: xs.length - 1 }))));

fc.configureGlobal({ numRuns: process.env.CI ? 10000 : 100 });

describe('core properties', () => {
  it('a leaf of a tree is provable', () => {
    fc.assert(
      fc.property(leavesAndIndex, ([leaves, leafIndex]) => {
        const tree = makeMerkleTree(leaves);
        const root = tree[0];
        if (root === undefined) return false;
        const treeIndex = tree.length - 1 - leafIndex;
        const proof = getProof(tree, treeIndex);
        const leaf = leaves[leafIndex]!;
        const impliedRoot = processProof(leaf, proof);
        return equalsBytes(root, impliedRoot);
      }),
    );
  });

  it('a subset of leaves of a tree are provable', () => {
    fc.assert(
      fc.property(leavesAndIndices, ([leaves, leafIndices]) => {
        const tree = makeMerkleTree(leaves);
        const root = tree[0];
        if (root === undefined) return false;
        const treeIndices = leafIndices.map(i => tree.length - 1 - i);
        const proof = getMultiProof(tree, treeIndices);
        if (leafIndices.length !== proof.leaves.length) return false;
        if (leafIndices.some(i => !proof.leaves.includes(leaves[i]!))) return false;
        const impliedRoot = processMultiProof(proof);
        return equalsBytes(root, impliedRoot);
      }),
    );
  });
});

class PrettyBytes extends Uint8Array {
  [fc.toStringMethod]() {
    return hex(this);
  }
}
