import assert from 'assert/strict';
import { keccak256 } from 'ethereum-cryptography/keccak';
import { hex } from './bytes';
import { StandardMerkleTree } from './standard';

const zeroBytes = new Uint8Array(32);
const zero = hex(zeroBytes);

const characters = (s: string) => {
  const l = s.split('').map(c => [c]);
  const t = StandardMerkleTree.of(l, ['string']);
  return { l, t };
}

describe('standard merkle tree', () => {
  it('generates valid single proofs for all leaves', () => {
    const { t } = characters('abcdef');
    t.validate();
  });

  it('generates valid single proofs for all leaves', () => {
    const { t } = characters('abcdef');

    for (const [id, leaf] of t.entries()) {
      const proof1 = t.getProof(id);
      const proof2 = t.getProof(leaf);

      assert.deepEqual(proof1, proof2);

      assert(t.verify(id, proof1));
      assert(t.verify(leaf, proof1));
    }
  });

  it('generates valid single proofs for all leaves from root and encoding', () => {
    const { t } = characters('abcdef');

    for (const [, leaf] of t.entries()) {
      const proof = t.getProof(leaf);

      assert(StandardMerkleTree.verify(t.root, ['string'], leaf, proof));
    }
  });

  it('rejects invalid proof using static verify method', () => {
    const { t } = characters('abcdef');
    const { t: fakeTree } = characters('xyz');

    const testLeaf = ['x'];
    const proof = fakeTree.getProof(testLeaf);

    assert(!StandardMerkleTree.verify(t.root, ['string'], testLeaf, proof));
  });

  it('generates valid multiproofs', () => {
    const { t, l } = characters('abcdef');

    for (const ids of [[], [0, 1], [0, 1, 5], [1, 3, 4, 5], [0, 2, 4, 5], [0, 1, 2, 3, 4, 5]]) {
      const proof1 = t.getMultiProof(ids);
      const proof2 = t.getMultiProof(ids.map(i => l[i]!));

      assert.deepEqual(proof1, proof2);

      assert(t.verifyMultiProof(proof1));
    }
  });

  it("generates valid multi-proofs for all leaves from root and encoding", () => {
    const { t } = characters("abcdef");
    const leaves = Array.from(t.entries()).map(([_, leaf]) => leaf);

    const multiproof = t.getMultiProof(leaves);

    assert(StandardMerkleTree.verifyMultiProof(t.root, ["string"], multiproof));
  });

  it("rejects invalid multi-proof using static verifyMultiProof method", () => {
    const { t } = characters("abcdef");
    const { t: fakeTree } = characters("xyz");

    const fakeLeaves = Array.from(fakeTree.entries()).map(([_, leaf]) => leaf);
    const fakeMultiProof = fakeTree.getMultiProof(fakeLeaves);

    assert(!StandardMerkleTree.verifyMultiProof(t.root, ["string"], fakeMultiProof));
  });

  it("verifies partial multi-proof using static verifyMultiProof method", () => {
    const { t } = characters("abcdef");

    const leaves = Array.from(t.entries())
      .filter(([index]) => index % 2 === 0)
      .map(([_, leaf]) => leaf);

    const multiproof = t.getMultiProof(leaves);

    assert(StandardMerkleTree.verifyMultiProof(t.root, ["string"], multiproof));
  });

  it('renders tree representation', () => {
    const { t } = characters('abc');

    const expected = `\
0) f2129b5a697531ef818f644564a6552b35c549722385bc52aa7fe46c0b5f46b1
├─ 1) fa914d99a18dc32d9725b3ef1c50426deb40ec8d0885dac8edcc5bfd6d030016
│  ├─ 3) 9c15a6a0eaeed500fd9eed4cbeab71f797cefcc67bfd46683e4d2e6ff7f06d1c
│  └─ 4) 19ba6c6333e0e9a15bf67523e0676e2f23eb8e574092552d5e888c64a4bb3681
└─ 2) 9cf5a63718145ba968a01c1d557020181c5b252f665cf7386d370eddb176517b`;

    assert.equal(t.render(), expected);
  });

  it('dump and load', () => {
    const { t } = characters('abcdef');
    const t2 = StandardMerkleTree.load(t.dump());

    t2.validate();
    assert.deepEqual(t2, t);
  });

  it('reject out of bounds value index', () => {
    const { t } = characters('a');
    assert.throws(
      () => t.getProof(1),
      /^Error: Index out of bounds$/,
    );
  });

  it('reject unrecognized tree dump', () => {
    assert.throws(
      () => StandardMerkleTree.load({ format: 'nonstandard' } as any),
      /^Error: Unknown format 'nonstandard'$/,
    );
  });

  it('reject malformed tree dump', () => {
    const t1 = StandardMerkleTree.load({
      format: 'standard-v1',
      tree: [zero],
      values: [{ value: ['0'], treeIndex: 0 }],
      leafEncoding: ['uint256'],
    });
    assert.throws(
      () => t1.getProof(0),
      /^Error: Merkle tree does not contain the expected value$/,
    );

    const t2 = StandardMerkleTree.load({
      format: 'standard-v1',
      tree: [zero, zero, hex(keccak256(keccak256(zeroBytes)))],
      values: [{ value: ['0'], treeIndex: 2 }],
      leafEncoding: ['uint256'],
    });
    assert.throws(
      () => t2.getProof(0),
      /^Error: Unable to prove value$/,
    );
  });
});
