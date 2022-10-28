import { StandardMerkleTree } from './standard';

const t = StandardMerkleTree.of(
  'abcdef'.split('').map(c => [c]),
  ['string'],
);

t.print();

t.validate();
t.getProof(0);
t.getMultiProof([0, 1]);
t.getMultiProof([0, 1, 5]);
t.getMultiProof([1, 3, 4, 5]);
t.getMultiProof([0, 2, 4, 5]);
t.getMultiProof([0, 1, 2, 3, 4, 5]);
