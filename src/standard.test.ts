import { test, testProp, fc } from '@fast-check/ava';
import { HashZero as zero } from '@ethersproject/constants';
import { keccak256 } from '@ethersproject/keccak256';
import { StandardMerkleTree } from './standard';
import { InvalidArgumentError, InvariantError } from './utils/errors';

const leafEncoding = ['uint256', 'string[]'];
const leaf = fc.tuple(fc.bigUintN(256), fc.array(fc.string()));
const leaves = fc.array(leaf, { minLength: 1 });
const options = fc.record({ sortLeaves: fc.oneof(fc.constant(undefined), fc.boolean()) });

const tree = fc.tuple(leaves, options).map(([leaves, options]) => StandardMerkleTree.of(leaves, leafEncoding, options));
const treeAndLeaf = tree.chain(tree =>
  fc.tuple(
    fc.constant(tree),
    fc.nat({ max: tree.length - 1 }).map(index => ({ value: tree.at(index)!, index })),
  ),
);
const treeAndLeaves = tree.chain(tree =>
  fc.tuple(
    fc.constant(tree),
    fc
      .uniqueArray(fc.nat({ max: tree.length - 1 }))
      .map(indices => indices.map(index => ({ value: tree.at(index)!, index }))),
  ),
);

fc.configureGlobal({ numRuns: process.env.CI ? 10000 : 100 });

testProp('generates a valid tree', [tree], (t, tree) => {
  t.notThrows(() => tree.validate());
});

testProp('generates valid single proofs for all leaves', [treeAndLeaf], (t, [tree, { value: leaf, index }]) => {
  const proof1 = tree.getProof(index);
  const proof2 = tree.getProof(leaf);

  t.deepEqual(proof1, proof2);
  t.true(tree.verify(index, proof1));
  t.true(tree.verify(leaf, proof1));
  t.true(StandardMerkleTree.verify(tree.root, leafEncoding, leaf, proof1));
});

testProp('rejects invalid proofs', [treeAndLeaf, tree], (t, [tree, { value: leaf }], otherTree) => {
  const proof = tree.getProof(leaf);
  t.false(otherTree.verify(leaf, proof));
  t.false(StandardMerkleTree.verify(otherTree.root, leafEncoding, leaf, proof));
});

testProp('generates valid multiproofs', [treeAndLeaves], (t, [tree, indices]) => {
  const proof1 = tree.getMultiProof(indices.map(e => e.index));
  const proof2 = tree.getMultiProof(indices.map(e => e.value));

  t.deepEqual(proof1, proof2);
  t.true(tree.verifyMultiProof(proof1));
  t.true(StandardMerkleTree.verifyMultiProof(tree.root, leafEncoding, proof1));
});

testProp('rejects invalid multiproofs', [treeAndLeaves, tree], (t, [tree, indices], otherTree) => {
  const multiProof = tree.getMultiProof(indices.map(e => e.index));

  t.false(otherTree.verifyMultiProof(multiProof));
  t.false(StandardMerkleTree.verifyMultiProof(otherTree.root, leafEncoding, multiProof));
});

testProp(
  'renders tree representation',
  [leaves],
  (t, leaves) => {
    t.snapshot(StandardMerkleTree.of(leaves, leafEncoding, { sortLeaves: true }).render());
    t.snapshot(StandardMerkleTree.of(leaves, leafEncoding, { sortLeaves: false }).render());
  },
  { numRuns: 1, seed: 0 },
);

testProp(
  'dump',
  [leaves],
  (t, leaves) => {
    t.snapshot(StandardMerkleTree.of(leaves, leafEncoding, { sortLeaves: true }).dump());
    t.snapshot(StandardMerkleTree.of(leaves, leafEncoding, { sortLeaves: false }).dump());
  },
  { numRuns: 1, seed: 0 },
);

testProp('dump and load', [tree], (t, tree) => {
  const recoveredTree = StandardMerkleTree.load(tree.dump());
  recoveredTree.validate();

  t.is(tree.root, recoveredTree.root);
  t.is(tree.render(), recoveredTree.render());
  t.deepEqual(tree.entries(), recoveredTree.entries());
  t.deepEqual(tree.dump(), recoveredTree.dump());
});

testProp('reject out of bounds value index', [tree], (t, tree) => {
  t.throws(() => tree.getProof(-1), new InvalidArgumentError('Index out of bounds'));
});

test('reject unrecognized tree dump', t => {
  t.throws(
    () => StandardMerkleTree.load({ format: 'nonstandard' } as any),
    new InvalidArgumentError("Unknown format 'nonstandard'"),
  );

  t.throws(
    () => StandardMerkleTree.load({ format: 'simple-v1' } as any),
    new InvalidArgumentError("Unknown format 'simple-v1'"),
  );
});

test('reject malformed tree dump', t => {
  const loadedTree1 = StandardMerkleTree.load({
    format: 'standard-v1',
    tree: [zero],
    values: [{ value: ['0'], treeIndex: 0 }],
    leafEncoding: ['uint256'],
  });
  t.throws(() => loadedTree1.getProof(0), new InvariantError('Merkle tree does not contain the expected value'));

  const loadedTree2 = StandardMerkleTree.load({
    format: 'standard-v1',
    tree: [zero, zero, keccak256(keccak256(zero))],
    values: [{ value: ['0'], treeIndex: 2 }],
    leafEncoding: ['uint256'],
  });
  t.throws(() => loadedTree2.getProof(0), new InvariantError('Unable to prove value'));
});
