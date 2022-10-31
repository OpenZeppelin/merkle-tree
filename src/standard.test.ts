import assert from 'assert/strict';
import { StandardMerkleTree } from './standard';

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
      // getProof internally validates the proof
      const proof1 = t.getProof(id);
      const proof2 = t.getProof(leaf);
      assert.deepStrictEqual(proof1, proof2);
    }
  });

  it('generates valid multiproofs', () => {
    const { t, l } = characters('abcdef');

    for (const ids of [[], [0, 1], [0, 1, 5], [1, 3, 4, 5], [0, 2, 4, 5], [0, 1, 2, 3, 4, 5]]) {
      // getMultiProof internally validates the proof
      const proof1 = t.getMultiProof(ids);
      const proof2 = t.getMultiProof(ids.map(i => l[i]!));
      assert.deepStrictEqual(proof1, proof2);
    }
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
  })
});
