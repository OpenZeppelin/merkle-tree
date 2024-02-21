import assert from "assert/strict";
import { sha256 } from "ethereum-cryptography/sha256.js";
import { keccak256 } from "ethereum-cryptography/keccak.js";
import { hex } from "./bytes";
import { MerkleTreeOptions } from "./options";
import { StandardMerkleTree } from "./standard";

const zeroBytes = new Uint8Array(32);
const zero = hex(zeroBytes);

const makeTree = (s: string, opts: MerkleTreeOptions = {}) => {
  const l = s.split("").map((c) => [c]);
  const t = StandardMerkleTree.of(l, ["string"], opts);
  return { l, t };
};

describe("standard merkle tree", () => {
  for (const [name, hashFn] of Object.entries({
    keccak256,
    sha256,
  })) {
    describe(`using ${name} as the hash function`, () => {
      for (const optsWithoutHash of [
        {},
        { sortLeaves: true },
        { sortLeaves: false },
      ]) {
        const opts = { ...optsWithoutHash, hashFn };
        describe(`with options '${JSON.stringify(opts)}'`, () => {
          const { l: leaves, t: tree } = makeTree("abcdef", opts);
          const { t: otherTree } = makeTree("abc", opts);

          it("generates a valid tree", () => {
            tree.validate();
          });

          it("generates valid single proofs for all leaves", () => {
            for (const [id, leaf] of tree.entries()) {
              const proof1 = tree.getProof(id);
              const proof2 = tree.getProof(leaf);

              assert.deepEqual(proof1, proof2);

              assert(tree.verify(id, proof1));
              assert(tree.verify(leaf, proof1));
              assert(
                StandardMerkleTree.verify(
                  tree.root,
                  ["string"],
                  leaf,
                  proof1,
                  hashFn
                )
              );
            }
          });

          it("rejects invalid proofs", () => {
            const leaf = ["a"];
            const invalidProof = otherTree.getProof(leaf);

            assert(!tree.verify(leaf, invalidProof));
            assert(
              !StandardMerkleTree.verify(
                tree.root,
                ["string"],
                leaf,
                invalidProof
              )
            );
          });

          it("generates valid multiproofs", () => {
            for (const ids of [
              [],
              [0, 1],
              [0, 1, 5],
              [1, 3, 4, 5],
              [0, 2, 4, 5],
              [0, 1, 2, 3, 4, 5],
              [4, 1, 5, 0, 2],
            ]) {
              const proof1 = tree.getMultiProof(ids);
              const proof2 = tree.getMultiProof(ids.map((i) => leaves[i]!));

              assert.deepEqual(proof1, proof2);

              assert(tree.verifyMultiProof(proof1));
              assert(
                StandardMerkleTree.verifyMultiProof(
                  tree.root,
                  ["string"],
                  proof1,
                  hashFn
                )
              );
            }
          });

          it("rejects invalid multiproofs", () => {
            const multiProof = otherTree.getMultiProof([["a"], ["b"], ["c"]]);

            assert(!tree.verifyMultiProof(multiProof));
            assert(
              !StandardMerkleTree.verifyMultiProof(
                tree.root,
                ["string"],
                multiProof
              )
            );
          });

          it("renders tree representation", () => {
            const trees: Record<typeof name, string> = {
              keccak256:
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
              sha256:
                opts.sortLeaves == false
                  ? [
                      "0) 64abc0328f56ee3e6740935b8fabd5cfc5f8f349280c507ebec0c3b2aaf0263e",
                      "├─ 1) 03f6ca6a0d90f9898aa8837b8c2c39d1d4ae103af7beb3ef05dca81e1ddb10dd",
                      "│  ├─ 3) 9447096bf50a26f0630f925d54f7df3905d3e8a5e335758b9dde66ec974ff0eb",
                      "│  │  ├─ 7) 3de5d9a36614e3159b197e6a4c334e0997b5037acb406e7d58b2ebc156a01b40",
                      "│  │  └─ 8) ee8476cf31e3608c6ef618451476c5513ceef7f6d9f4af12df9fd4e4501210c3",
                      "│  └─ 4) 002e780c6030fe13117d4a110401277d849dfff49312ecd0063cc0f96560a703",
                      "│     ├─ 9) 9a81c362fd809d46eb23f6920461ce343f9384bae29e11d005990fd2fbfb78c2",
                      "│     └─ 10) b9e9db137d987ce376feabe4acc5ee8b23a2d460699cc8bd7e1fe001cbd99df0",
                      "└─ 2) 7d3e71cf65adc8d233787103152eabe439b15329b01c1d887c227236cad02ee5",
                      "   ├─ 5) 0b623bf3b3a650a8072bc8b3001b2b74d7e63b43bf81beb332e536207b4a58e7",
                      "   └─ 6) ef53964d3736e523a79fe02137c6dba7d2b151fea57aa43c6f637514f2303f72",
                    ].join("\n")
                  : [
                      "0) bf7fd7dd7e7fc203067d67694317b8d3f64aed57435c34af38e6248dc546a18f",
                      "├─ 1) ae76a8316586158bc19b336389bf7e7a819268ed30f9b8bb64d131584c21d210",
                      "│  ├─ 3) 002e780c6030fe13117d4a110401277d849dfff49312ecd0063cc0f96560a703",
                      "│  │  ├─ 7) b9e9db137d987ce376feabe4acc5ee8b23a2d460699cc8bd7e1fe001cbd99df0",
                      "│  │  └─ 8) 9a81c362fd809d46eb23f6920461ce343f9384bae29e11d005990fd2fbfb78c2",
                      "│  └─ 4) f9ac9bf8f03ff8ed7a0934b5916a482c005d06cf9c8131c6c1981d64b0a8c641",
                      "│     ├─ 9) 3de5d9a36614e3159b197e6a4c334e0997b5037acb406e7d58b2ebc156a01b40",
                      "│     └─ 10) 0b623bf3b3a650a8072bc8b3001b2b74d7e63b43bf81beb332e536207b4a58e7",
                      "└─ 2) 7c083306bbcf9c8c9e5d2a4151dc2fc059eb4ebc462fb907826a71cdcb2fae0c",
                      "   ├─ 5) ef53964d3736e523a79fe02137c6dba7d2b151fea57aa43c6f637514f2303f72",
                      "   └─ 6) ee8476cf31e3608c6ef618451476c5513ceef7f6d9f4af12df9fd4e4501210c3",
                    ].join("\n"),
            };
            assert.equal(tree.render(), trees[name]);
          });

          it("dump and load", () => {
            const recoveredTree = StandardMerkleTree.load(tree.dump(), hashFn);

            recoveredTree.validate();
            assert.deepEqual(tree, recoveredTree);
          });

          it("reject out of bounds value index", () => {
            assert.throws(
              () => tree.getProof(leaves.length),
              /^Error: Index out of bounds$/
            );
          });

          it("reject unrecognized tree dump", () => {
            assert.throws(
              () => StandardMerkleTree.load({ format: "nonstandard" } as any),
              /^Error: Unknown format 'nonstandard'$/
            );
          });

          it("reject malformed tree dump", () => {
            const loadedTree1 = StandardMerkleTree.load({
              format: "standard-v1",
              tree: [zero],
              values: [{ value: ["0"], treeIndex: 0 }],
              leafEncoding: ["uint256"],
            });
            assert.throws(
              () => loadedTree1.getProof(0),
              /^Error: Merkle tree does not contain the expected value$/
            );

            const loadedTree2 = StandardMerkleTree.load({
              format: "standard-v1",
              tree: [zero, zero, hex(keccak256(keccak256(zeroBytes)))],
              values: [{ value: ["0"], treeIndex: 2 }],
              leafEncoding: ["uint256"],
            });
            assert.throws(
              () => loadedTree2.getProof(0),
              /^Error: Unable to prove value$/
            );
          });
        });
      }
    });
  }
});
