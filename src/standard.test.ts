import assert from 'assert/strict';
import { keccak256 } from 'ethereum-cryptography/keccak';
import { hex } from './bytes';
import { MerkleTreeOptions } from './options';
import { StandardMerkleTree } from './standard';

const zeroBytes = new Uint8Array(32);
const zero = hex(zeroBytes);

const makeTree = (s: string, opts: MerkleTreeOptions = {}) => {
  const l = s.split('').map(c => [c]);
  const t = StandardMerkleTree.of(l, ['string'], opts);
  return { l, t };
}

describe('standard merkle tree', () => {
  for (const opts of [
    {},
    { sortLeaves: true },
    { sortLeaves: false },
  ]) {
    describe(`with options '${JSON.stringify(opts)}'`, () => {
      const { l: leaves, t: tree } = makeTree('abcdef', opts);
      const { l: otherLeaves, t: otherTree } = makeTree('abc', opts);

      it('generates valid single proofs for all leaves', () => {
        tree.validate();
      });

      it('generates valid single proofs for all leaves', () => {
        for (const [id, leaf] of tree.entries()) {
          const proof1 = tree.getProof(id);
          const proof2 = tree.getProof(leaf);

          assert.deepEqual(proof1, proof2);

          assert(tree.verify(id, proof1));
          assert(tree.verify(leaf, proof1));
          assert(StandardMerkleTree.verify(tree.root, ['string'], leaf, proof1));
        }
      });

      it('rejects invalid proofs', () => {
        const leaf = ['a'];
        const invalidProof = otherTree.getProof(leaf);

        assert(!tree.verify(leaf, invalidProof));
        assert(!StandardMerkleTree.verify(tree.root, ['string'], leaf, invalidProof));
      });

      it('generates valid multiproofs', () => {
        for (const ids of [[], [0, 1], [0, 1, 5], [1, 3, 4, 5], [0, 2, 4, 5], [0, 1, 2, 3, 4, 5], [4, 1, 5, 0, 2]]) {
          const proof1 = tree.getMultiProof(ids);
          const proof2 = tree.getMultiProof(ids.map(i => leaves[i]!));

          assert.deepEqual(proof1, proof2);

          assert(tree.verifyMultiProof(proof1));
          assert(StandardMerkleTree.verifyMultiProof(tree.root, ['string'], proof1));
        }
      });

      it('rejects invalid multiproofs', () => {
        const multiProof = otherTree.getMultiProof([['a'], ['b'], ['c']]);

        assert(!tree.verifyMultiProof(multiProof));
        assert(!StandardMerkleTree.verifyMultiProof(tree.root, ['string'], multiProof));
      });

      it('renders tree representation', () => {
        assert.equal(
          tree.render(),
          opts.sortLeaves == false
            ? [
                "0) 23be0977360f08bb0bd7f709a7d543d2cd779c79c66d74e0441919871647de2b",
                "├─ 1) 8f7234e8cfe39c08ca84a3a3e3274f574af26fd15165fe29e09cbab742daccd9",
                "│  ├─ 3) 03707d7802a71ca56a8ad8028da98c4f1dbec55b31b4a25d536b5309cc20eda9",
                "│  │  ├─ 7) eba909cf4bb90c6922771d7f126ad0fd11dfde93f3937a196274e1ac20fd2f5b",
                "│  │  └─ 8) 9cf5a63718145ba968a01c1d557020181c5b252f665cf7386d370eddb176517b",
                "│  └─ 4) fa914d99a18dc32d9725b3ef1c50426deb40ec8d0885dac8edcc5bfd6d030016",
                "│     ├─ 9) 19ba6c6333e0e9a15bf67523e0676e2f23eb8e574092552d5e888c64a4bb3681",
                "│     └─ 10) 9c15a6a0eaeed500fd9eed4cbeab71f797cefcc67bfd46683e4d2e6ff7f06d1c",
                "└─ 2) 7b0c6cd04b82bfc0e250030a5d2690c52585e0cc6a4f3bc7909d7723b0236ece",
                "   ├─ 5) c62a8cfa41edc0ef6f6ae27a2985b7d39c7fea770787d7e104696c6e81f64848",
                "   └─ 6) 9a4f64e953595df82d1b4f570d34c4f4f0cfaf729a61e9d60e83e579e1aa283e",
              ].join("\n")
            : [
                "0) 6deb52b5da8fd108f79fab00341f38d2587896634c646ee52e49f845680a70c8",
                "├─ 1) 52426e0f1f65ff7e209a13b8c29cffe82e3acaf3dad0a9b9088f3b9a61a929c3",
                "│  ├─ 3) 8076923e76cf01a7c048400a2304c9a9c23bbbdac3a98ea3946340fdafbba34f",
                "│  │  ├─ 7) 9cf5a63718145ba968a01c1d557020181c5b252f665cf7386d370eddb176517b",
                "│  │  └─ 8) 9c15a6a0eaeed500fd9eed4cbeab71f797cefcc67bfd46683e4d2e6ff7f06d1c",
                "│  └─ 4) 965b92c6cf08303cc4feb7f3e0819c436c2cec17c6f0688a6af139c9a368707c",
                "│     ├─ 9) 9a4f64e953595df82d1b4f570d34c4f4f0cfaf729a61e9d60e83e579e1aa283e",
                "│     └─ 10) 19ba6c6333e0e9a15bf67523e0676e2f23eb8e574092552d5e888c64a4bb3681",
                "└─ 2) fd3cf45654e88d1cc5d663578c82c76f4b5e3826bacaa1216441443504538f51",
                "   ├─ 5) eba909cf4bb90c6922771d7f126ad0fd11dfde93f3937a196274e1ac20fd2f5b",
                "   └─ 6) c62a8cfa41edc0ef6f6ae27a2985b7d39c7fea770787d7e104696c6e81f64848",
              ].join("\n"),
        );
      });

      it('dump and load', () => {
        const recoveredTree = StandardMerkleTree.load(tree.dump());

        recoveredTree.validate();
        assert.deepEqual(tree, recoveredTree);
      });

      it('reject out of bounds value index', () => {
        assert.throws(
          () => tree.getProof(leaves.length),
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
        const loadedTree1 = StandardMerkleTree.load({
          format: 'standard-v1',
          tree: [zero],
          values: [{ value: ['0'], treeIndex: 0 }],
          leafEncoding: ['uint256'],
        });
        assert.throws(
          () => loadedTree1.getProof(0),
          /^Error: Merkle tree does not contain the expected value$/,
        );

        const loadedTree2 = StandardMerkleTree.load({
          format: 'standard-v1',
          tree: [zero, zero, hex(keccak256(keccak256(zeroBytes)))],
          values: [{ value: ['0'], treeIndex: 2 }],
          leafEncoding: ['uint256'],
        });
        assert.throws(
          () => loadedTree2.getProof(0),
          /^Error: Unable to prove value$/,
        );
      });
    });
  }
});
