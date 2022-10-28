import { StandardMerkleTree } from './standard';

const t = StandardMerkleTree.of(
  'abcdef'.split('').map(c => [c]),
  ['string'],
);

t.print();

t.validate();
t.getProof(0);
t.getMultiProof([0, 1]);
