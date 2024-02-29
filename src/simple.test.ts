import { test, testProp, fc } from '@fast-check/ava';
import { HashZero as zero } from '@ethersproject/constants';
import { SimpleMerkleTree } from './simple';
import { toHex } from './bytes';
import { InvalidArgumentError, InvariantError } from './utils/errors';

const leaf = fc.uint8Array({ minLength: 32, maxLength: 32 });
const leaves = fc.array(leaf, { minLength: 1 });
const options = fc.record({ sortLeaves: fc.oneof(fc.constant(undefined), fc.boolean()) });

const tree = fc.tuple(leaves, options).map(([leaves, options]) => SimpleMerkleTree.of(leaves, options));
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

  // check leaves enumeration
  for (const [ index, value ] of tree.entries()) {
    t.is(value, tree.at(index)!);
  }
  t.is(tree.at(tree.length), undefined);
});

testProp('generates valid single proofs for all leaves', [treeAndLeaf], (t, [tree, { value: leaf, index }]) => {
  const proof1 = tree.getProof(index);
  const proof2 = tree.getProof(leaf);

  t.deepEqual(proof1, proof2);
  t.true(tree.verify(index, proof1));
  t.true(tree.verify(leaf, proof1));
  t.true(SimpleMerkleTree.verify(tree.root, leaf, proof1));
});

testProp('rejects invalid proofs', [treeAndLeaf, tree], (t, [tree, { value: leaf }], otherTree) => {
  const proof = tree.getProof(leaf);
  t.false(otherTree.verify(leaf, proof));
  t.false(SimpleMerkleTree.verify(otherTree.root, leaf, proof));
});

testProp('generates valid multiproofs', [treeAndLeaves], (t, [tree, indices]) => {
  const proof1 = tree.getMultiProof(indices.map(e => e.index));
  const proof2 = tree.getMultiProof(indices.map(e => e.value));

  t.deepEqual(proof1, proof2);
  t.true(tree.verifyMultiProof(proof1));
  t.true(SimpleMerkleTree.verifyMultiProof(tree.root, proof1));
});

testProp('rejects invalid multiproofs', [treeAndLeaves, tree], (t, [tree, indices], otherTree) => {
  const multiProof = tree.getMultiProof(indices.map(e => e.index));

  t.false(otherTree.verifyMultiProof(multiProof));
  t.false(SimpleMerkleTree.verifyMultiProof(otherTree.root, multiProof));
});

testProp(
  'renders tree representation',
  [leaves],
  (t, leaves) => {
    t.snapshot(SimpleMerkleTree.of(leaves, { sortLeaves: true }).render());
    t.snapshot(SimpleMerkleTree.of(leaves, { sortLeaves: false }).render());
  },
  { numRuns: 1, seed: 0 },
);

testProp(
  'dump',
  [leaves],
  (t, leaves) => {
    t.snapshot(SimpleMerkleTree.of(leaves, { sortLeaves: true }).dump());
    t.snapshot(SimpleMerkleTree.of(leaves, { sortLeaves: false }).dump());
  },
  { numRuns: 1, seed: 0 },
);

testProp('dump and load', [tree], (t, tree) => {
  const dump = tree.dump();
  const recoveredTree = SimpleMerkleTree.load(dump);
  recoveredTree.validate();

  // check dump & reconstructed tree
  t.is(dump.format, 'simple-v1');
  t.true(dump.values.every(({ value }, index) => value === toHex(tree.at(index)!)));
  t.true(dump.values.every(({ value }, index) => value === toHex(recoveredTree.at(index)!)));
  t.is(tree.root, recoveredTree.root);
  t.is(tree.length, recoveredTree.length);
  t.is(tree.render(), recoveredTree.render());
  t.deepEqual(tree.dump(), recoveredTree.dump());
});

testProp('reject out of bounds value index', [tree], (t, tree) => {
  t.throws(() => tree.getProof(-1), new InvalidArgumentError('Index out of bounds'));
});

test('reject invalid leaf size', t => {
  const invalidLeaf = '0x000000000000000000000000000000000000000000000000000000000000000000';
  t.throws(() => SimpleMerkleTree.of([invalidLeaf]), {
    message: `incorrect data length (argument=null, value="${invalidLeaf}", code=INVALID_ARGUMENT, version=abi/5.7.0)`,
  });
});

test('reject unrecognized tree dump', t => {
  t.throws(
    () => SimpleMerkleTree.load({ format: 'nonstandard' } as any),
    new InvalidArgumentError("Unknown format 'nonstandard'"),
  );

  t.throws(
    () => SimpleMerkleTree.load({ format: 'standard-v1' } as any),
    new InvalidArgumentError("Unknown format 'standard-v1'"),
  );
});

test('reject malformed tree dump', t => {
  const loadedTree1 = SimpleMerkleTree.load({
    format: 'simple-v1',
    tree: [zero],
    values: [
      {
        value: '0x0000000000000000000000000000000000000000000000000000000000000001',
        treeIndex: 0,
      },
    ],
  });
  t.throws(() => loadedTree1.getProof(0), new InvariantError('Merkle tree does not contain the expected value'));

  const loadedTree2 = SimpleMerkleTree.load({
    format: 'simple-v1',
    tree: [zero, zero, zero],
    values: [{ value: zero, treeIndex: 2 }],
  });
  t.throws(() => loadedTree2.getProof(0), new InvariantError('Unable to prove value'));
});
