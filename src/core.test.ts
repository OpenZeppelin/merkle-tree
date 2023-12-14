import fc from 'fast-check';
import assert from 'assert/strict';
import { equalsBytes } from 'ethereum-cryptography/utils';
import { makeMerkleTree, getProof, processProof, getMultiProof, processMultiProof, isValidMerkleTree, renderMerkleTree } from './core';
import { compareBytes, toHex } from './bytes';
import { keccak256 } from 'ethereum-cryptography/keccak';

const zero = new Uint8Array(32);

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

describe('core error conditions', () => {
  it('zero leaves', () => {
    assert.throws(
      () => makeMerkleTree([]),
      /^Error: Expected non-zero number of leaves$/,
    );
  });

  it('multiproof duplicate index', () => {
    const tree = makeMerkleTree(new Array(2).fill(zero));
    assert.throws(
      () => getMultiProof(tree, [1, 1]),
      /^Error: Cannot prove duplicated index$/,
    );
  });

  it('tree validity', () => {
    assert(!isValidMerkleTree([]), 'empty tree');
    assert(!isValidMerkleTree([zero, zero]), 'even number of nodes');
    assert(!isValidMerkleTree([zero, zero, zero]), 'inner node not hash of children');

    assert.throws(
      () => renderMerkleTree([]),
      /^Error: Expected non-zero number of nodes$/,
    );
  });

  it('multiproof invariants', () => {
    const leaf = keccak256(Uint8Array.of(42));
    const tree = makeMerkleTree([leaf, zero]);

    const badMultiProof = {
      leaves: [128, 129].map(n => keccak256(Uint8Array.of(n))).sort(compareBytes),
      proof: [leaf, leaf],
      proofFlags: [true, true, false],
    };

    assert.throws(
      () => processMultiProof(badMultiProof),
      /^Error: Broken invariant$/,
    );
  });

});

class PrettyBytes extends Uint8Array {
  [fc.toStringMethod]() {
    return toHex(this);
  }
}
