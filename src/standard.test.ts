import assert from 'assert';
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
      t.getProof(id);
      t.getProof(leaf);
    }
  });

  it('generates valid multiproofs', () => {
    const { t, l } = characters('abcdef');

    for (const ids of [[], [0, 1], [0, 1, 5], [1, 3, 4, 5], [0, 2, 4, 5], [0, 1, 2, 3, 4, 5]]) {
      t.getMultiProof(ids);
      t.getMultiProof(ids.map(i => l[i]!));
    }
  });

  it('prints tree representation');

  it('dump and load', () => {
    const { t } = characters('abcdef');
    const t2 = StandardMerkleTree.load(t.dump());

    t2.validate();
    assert.deepStrictEqual(t, t2);
  })
});
