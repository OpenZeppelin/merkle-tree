import { test, testProp, fc } from '@fast-check/ava';
import { StandardMerkleTree } from './standard';
import { HexString } from './bytes';
import { keccak256 } from './hashes';
import { InvalidArgumentError, InvariantError } from './utils/errors';

const zero: HexString = '0x0000000000000000000000000000000000000000000000000000000000000000';

fc.configureGlobal({ numRuns: process.env.CI ? 5000 : 100 });

const leafEncoding = ['uint256', 'string[]'];
const leaf = fc.tuple(fc.bigUintN(256), fc.array(fc.string()));
const leaves = fc.array(leaf, { minLength: 1, maxLength: 1000 });
const options = fc.record({ sortLeaves: fc.oneof(fc.constant(undefined), fc.boolean()) });

const tree = fc
  .tuple(leaves, options)
  .chain(([leaves, options]) =>
    fc.tuple(fc.constant(StandardMerkleTree.of(leaves, leafEncoding, options)), fc.constant(options)),
  );
const treeAndLeaf = tree.chain(([tree, options]) =>
  fc.tuple(
    fc.constant(tree),
    fc.constant(options),
    fc.nat({ max: tree.length - 1 }).map(index => ({ value: tree.at(index)!, index })),
  ),
);
const treeAndLeaves = tree.chain(([tree, options]) =>
  fc.tuple(
    fc.constant(tree),
    fc.constant(options),
    fc
      .uniqueArray(fc.nat({ max: tree.length - 1 }))
      .map(indices => indices.map(index => ({ value: tree.at(index)!, index }))),
  ),
);

testProp('generates a valid tree', [tree], (t, [tree]) => {
  t.notThrows(() => tree.validate());

  // check leaves enumeration
  for (const [index, value] of tree.entries()) {
    t.is(value, tree.at(index)!);
  }
  t.is(tree.at(tree.length), undefined);
});

testProp('generates valid single proofs for all leaves', [treeAndLeaf], (t, [tree, , { value: leaf, index }]) => {
  const proof1 = tree.getProof(index);
  const proof2 = tree.getProof(leaf);

  t.deepEqual(proof1, proof2);
  t.true(tree.verify(index, proof1));
  t.true(tree.verify(leaf, proof1));
  t.true(StandardMerkleTree.verify(tree.root, leafEncoding, leaf, proof1));
});

testProp('rejects invalid proofs', [treeAndLeaf, tree], (t, [tree, , { value: leaf }], [otherTree]) => {
  const proof = tree.getProof(leaf);
  t.false(otherTree.verify(leaf, proof));
  t.false(StandardMerkleTree.verify(otherTree.root, leafEncoding, leaf, proof));
});

testProp('generates valid multiproofs', [treeAndLeaves], (t, [tree, , indices]) => {
  const proof1 = tree.getMultiProof(indices.map(e => e.index));
  const proof2 = tree.getMultiProof(indices.map(e => e.value));

  t.deepEqual(proof1, proof2);
  t.true(tree.verifyMultiProof(proof1));
  t.true(StandardMerkleTree.verifyMultiProof(tree.root, leafEncoding, proof1));
});

testProp('rejects invalid multiproofs', [treeAndLeaves, tree], (t, [tree, , indices], [otherTree]) => {
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

testProp('dump and load', [tree], (t, [tree]) => {
  const dump = tree.dump();
  const recoveredTree = StandardMerkleTree.load(dump);
  recoveredTree.validate(); // already done in load

  // check dump & reconstructed tree
  t.is(dump.format, 'standard-v1');
  t.true(dump.values.every(({ value }, index) => value === tree.at(index)!));
  t.true(dump.values.every(({ value }, index) => value === recoveredTree.at(index)!));
  t.is(tree.root, recoveredTree.root);
  t.is(tree.length, recoveredTree.length);
  t.is(tree.render(), recoveredTree.render());
  t.deepEqual(tree.dump(), recoveredTree.dump());
});

testProp('reject out of bounds value index', [tree], (t, [tree]) => {
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
  t.throws(
    () =>
      StandardMerkleTree.load({
        format: 'standard-v1',
        tree: [zero],
        values: [{ value: ['0'], treeIndex: 0 }],
        leafEncoding: ['uint256'],
      }),
    new InvariantError('Merkle tree does not contain the expected value'),
  );

  t.throws(
    () =>
      StandardMerkleTree.load({
        format: 'standard-v1',
        tree: [zero, zero, keccak256(keccak256(zero))],
        values: [{ value: ['0'], treeIndex: 2 }],
        leafEncoding: ['uint256'],
      }),
    new InvariantError('Merkle tree is invalid'),
  );
});
