import fc from 'fast-check';
import { equalsBytes, hexToBytes } from 'ethereum-cryptography/utils';
import { makeMerkleTree, getProof, processProof } from './core';
import { hex } from './bytes';

const leaf = fc.uint8Array({ minLength: 32, maxLength: 32 }).map(x => PrettyBytes.from(x));
const leaves = fc.array(leaf, { minLength: 1 });
const leavesAndIndex = leaves.chain(xs => fc.tuple(fc.constant(xs), fc.nat({ max: xs.length - 1 })));

fc.configureGlobal({ numRuns: 10000 });

describe('properties', () => {
  it('each leaf of a tree is provable', () => {
    fc.assert(
      fc.property(leavesAndIndex, ([leaves, leafIndex]) => {
        const tree = makeMerkleTree(leaves);
        const root = tree[0];
        if (root === undefined) return false;
        const treeIndex = tree.length - leafIndex - 1;
        const proof = getProof(tree, treeIndex);
        const leaf = leaves[leafIndex]!;
        const impliedRoot = processProof(leaf, proof);
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
