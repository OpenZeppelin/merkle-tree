import assert from 'assert/strict';
import { HashZero as zero } from '@ethersproject/constants';
import { keccak256 } from '@ethersproject/keccak256';
import { SimpleMerkleTree } from './simple';

describe('simple merkle tree', () => {
  for (const opts of [
    {},
    { sortLeaves: true },
    { sortLeaves: false },
  ]) {
    describe(`with options '${JSON.stringify(opts)}'`, () => {
      const leaves      = 'abcdef'.split('').map(c => keccak256(new TextEncoder().encode(c)));
      const otherLeaves = 'abc'.split('').map(c => keccak256(new TextEncoder().encode(c)));
      const tree        = SimpleMerkleTree.of(leaves, opts);
      const otherTree   = SimpleMerkleTree.of(otherLeaves, opts);

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
          assert(SimpleMerkleTree.verify(tree.root, leaf, proof1));
        }
      });

      it('rejects invalid proofs', () => {
        const leaf = leaves[0]!;
        const invalidProof = otherTree.getProof(leaf);

        assert(!tree.verify(leaf, invalidProof));
        assert(!SimpleMerkleTree.verify(tree.root, leaf, invalidProof));
      });

      it('generates valid multiproofs', () => {
        for (const ids of [[], [0, 1], [0, 1, 5], [1, 3, 4, 5], [0, 2, 4, 5], [0, 1, 2, 3, 4, 5], [4, 1, 5, 0, 2]]) {
          const proof1 = tree.getMultiProof(ids);
          const proof2 = tree.getMultiProof(ids.map(i => leaves[i]!));

          assert.deepEqual(proof1, proof2);

          assert(tree.verifyMultiProof(proof1));
          assert(SimpleMerkleTree.verifyMultiProof(tree.root, proof1));
        }
      });

      it('rejects invalid multiproofs', () => {
        const multiProof = otherTree.getMultiProof(leaves.slice(0, 3));

        assert(!tree.verifyMultiProof(multiProof));
        assert(!SimpleMerkleTree.verifyMultiProof(tree.root, multiProof));
      });

      it('renders tree representation', () => {
        assert.equal(
          tree.render(),
          opts.sortLeaves == false
            ? [
                "0) 0x9012f1e18a87790d2e01faace75aaaca38e53df437cdce2c0552464dda4af49c",
                "├─ 1) 0x68203f90e9d07dc5859259d7536e87a6ba9d345f2552b5b9de2999ddce9ce1bf",
                "│  ├─ 3) 0xd253a52d4cb00de2895e85f2529e2976e6aaaa5c18106b68ab66813e14415669",
                "│  │  ├─ 7) 0xf1918e8562236eb17adc8502332f4c9c82bc14e19bfc0aa10ab674ff75b3d2f3",
                "│  │  └─ 8) 0x0b42b6393c1f53060fe3ddbfcd7aadcca894465a5a438f69c87d790b2299b9b2",
                "│  └─ 4) 0x805b21d846b189efaeb0377d6bb0d201b3872a363e607c25088f025b0c6ae1f8",
                "│     ├─ 9) 0xb5553de315e0edf504d9150af82dafa5c4667fa618ed0a6f19c69b41166c5510",
                "│     └─ 10) 0x3ac225168df54212a25c1c01fd35bebfea408fdac2e31ddd6f80a4bbf9a5f1cb",
                "└─ 2) 0xf0b49bb4b0d9396e0315755ceafaa280707b32e75e6c9053f5cdf2679dcd5c6a",
                "   ├─ 5) 0xd1e8aeb79500496ef3dc2e57ba746a8315d048b7a664a2bf948db4fa91960483",
                "   └─ 6) 0xa8982c89d80987fb9a510e25981ee9170206be21af3c8e0eb312ef1d3382e761",
              ].join("\n")
            : [
                "0) 0x1b404f199ea828ec5771fb30139c222d8417a82175fefad5cd42bc3a189bd8d5",
                "├─ 1) 0xec554bdfb01d31fa838d0830339b0e6e8a70e0d55a8f172ffa8bebbf8e8d5ba0",
                "│  ├─ 3) 0x434d51cfeb80272378f4c3a8fd2824561c2cad9fce556ea600d46f20550976a6",
                "│  │  ├─ 7) 0xb5553de315e0edf504d9150af82dafa5c4667fa618ed0a6f19c69b41166c5510",
                "│  │  └─ 8) 0xa8982c89d80987fb9a510e25981ee9170206be21af3c8e0eb312ef1d3382e761",
                "│  └─ 4) 0x7dea550f679f3caab547cbbc5ee1a4c978c8c039b572ba00af1baa6481b88360",
                "│     ├─ 9) 0x3ac225168df54212a25c1c01fd35bebfea408fdac2e31ddd6f80a4bbf9a5f1cb",
                "│     └─ 10) 0x0b42b6393c1f53060fe3ddbfcd7aadcca894465a5a438f69c87d790b2299b9b2",
                "└─ 2) 0xaf46af0745b433e1d5bed9a04b1fdf4002f67a733c20db2fca5b2af6120d9bcb",
                "   ├─ 5) 0xf1918e8562236eb17adc8502332f4c9c82bc14e19bfc0aa10ab674ff75b3d2f3",
                "   └─ 6) 0xd1e8aeb79500496ef3dc2e57ba746a8315d048b7a664a2bf948db4fa91960483",
              ].join("\n"),
        );
      });

      it('dump and load', () => {
        const recoveredTree = SimpleMerkleTree.load(tree.dump());

        recoveredTree.validate();
        assert.deepEqual(tree, recoveredTree);
      });

      it('reject out of bounds value index', () => {
        assert.throws(
          () => tree.getProof(leaves.length),
          /^Error: Index out of bounds$/,
        );
      });
    });
  }

  describe('tree dumps', () => {
    it('reject unrecognized tree dump', () => {
      assert.throws(
        () => SimpleMerkleTree.load({ format: 'nonstandard' } as any),
        /^Error: Unknown format 'nonstandard'$/,
      );
    });

    it('reject malformed tree dump', () => {
      const loadedTree1 = SimpleMerkleTree.load({
        format: 'standard-v1',
        tree: [zero],
        values: [{ value: '0x0000000000000000000000000000000000000000000000000000000000000001', treeIndex: 0 }],
      });
      assert.throws(
        () => loadedTree1.getProof(0),
        /^Error: Merkle tree does not contain the expected value$/,
      );

      const loadedTree2 = SimpleMerkleTree.load({
        format: 'standard-v1',
        tree: [zero, zero, zero],
        values: [{ value: zero, treeIndex: 2 }],
      });
      assert.throws(
        () => loadedTree2.getProof(0),
        /^Error: Unable to prove value$/,
      );
    });
  });
});
