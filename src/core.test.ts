import { test, testProp, fc } from '@fast-check/ava';
import {
  makeMerkleTree,
  getProof,
  processProof,
  getMultiProof,
  processMultiProof,
  isValidMerkleTree,
  renderMerkleTree,
} from './core';
import { HexString, toHex } from './bytes';
import { InvalidArgumentError, InvariantError } from './utils/errors';

const zero: HexString = '0x0000000000000000000000000000000000000000000000000000000000000000';

const leaf = fc.uint8Array({ minLength: 32, maxLength: 32 });
const leaves = fc.array(leaf, { minLength: 1 });
const leavesAndIndex = leaves.chain(xs => fc.tuple(fc.constant(xs), fc.nat({ max: xs.length - 1 })));
const leavesAndIndices = leaves.chain(xs => fc.tuple(fc.constant(xs), fc.uniqueArray(fc.nat({ max: xs.length - 1 }))));

fc.configureGlobal({ numRuns: process.env.CI ? 10000 : 100 });

testProp('a leaf of a tree is provable', [leavesAndIndex], (t, [leaves, leafIndex]) => {
  const tree = makeMerkleTree(leaves);
  const root = tree[0];
  t.not(root, undefined);
  const treeIndex = tree.length - 1 - leafIndex;
  const proof = getProof(tree, treeIndex);
  const leaf = leaves[leafIndex]!;
  t.is(root, processProof(leaf, proof));
});

testProp('a subset of leaves of a tree are provable', [leavesAndIndices], (t, [leaves, leafIndices]) => {
  const tree = makeMerkleTree(leaves);
  const root = tree[0];
  t.not(root, undefined);
  const treeIndices = leafIndices.map(i => tree.length - 1 - i);
  const proof = getMultiProof(tree, treeIndices);
  t.is(leafIndices.length, proof.leaves.length);
  t.true(leafIndices.every(i => proof.leaves.includes(toHex(leaves[i]!))));
  t.is(root, processMultiProof(proof));
});

test('zero leaves', t => {
  t.throws(() => makeMerkleTree([]), new InvalidArgumentError('Expected non-zero number of leaves'));
});

test('invalid leaf format', t => {
  t.throws(() => makeMerkleTree(['0x00']), { message: 'Merkle tree nodes must be Uint8Array of length 32' });
});

test('multiproof duplicate index', t => {
  const tree = makeMerkleTree(Array.from({ length: 2 }, () => zero));
  t.throws(() => getMultiProof(tree, [1, 1]), new InvalidArgumentError('Cannot prove duplicated index'));
});

test('tree validity', t => {
  t.false(isValidMerkleTree([]), 'empty tree');
  t.false(isValidMerkleTree(['0x00']), 'invalid node');
  t.false(isValidMerkleTree([zero, zero]), 'even number of nodes');
  t.false(isValidMerkleTree([zero, zero, zero]), 'inner node not hash of children');
  t.throws(() => renderMerkleTree([]), new InvalidArgumentError('Expected non-zero number of nodes'));
});

test('multiproof invariants', t => {
  const badMultiProof = {
    leaves: [zero, zero],
    proof: [zero, zero],
    proofFlags: [true, true, false],
  };
  t.throws(() => processMultiProof(badMultiProof), new InvariantError());
});

test('getProof for internal node', t => {
  const tree = makeMerkleTree([zero, zero]);
  t.throws(() => getProof(tree, 0), { message: 'Index is not a leaf' });
});
