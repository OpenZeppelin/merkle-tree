import { StandardMerkleTree } from './standard';

const l = 'abcdef'.split('').map(c => [c]);
const t = StandardMerkleTree.of(l, ['string']);

t.print();
t.validate();

// proof all leafs individually
for (const [id, leaf] of l.entries()) {
  t.getProof(id);
  t.getProof(leaf);
}

// proof sets of leaves
for (const ids of [[], [0, 1], [0, 1, 5], [1, 3, 4, 5], [0, 2, 4, 5], [0, 1, 2, 3, 4, 5]]) {
  t.getMultiProof(ids);
  t.getMultiProof(ids.map(i => l[i]!));
}
