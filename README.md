# `@openzeppelin/merkle-tree`

**A JavaScript library to generate merkle trees.** Well suited for airdrops and similar mechanisms, in combination with OpenZeppelin Contracts [`MerkleProof`] utilities.

[`MerkleProof`]: https://docs.openzeppelin.com/contracts/4.x/api/utils#MerkleProof

## Quick Start

```
npm install @openzeppelin/merkle-tree
```

Place the values for the merkle tree in `values.json`.

```json
[
  ["0x1111111111111111111111111111111111111111", "5000000000000000000"],
  ["0x2222222222222222222222222222222222222222", "2500000000000000000"]
]
```

Write a script to build the merkle tree. Print the merkle root, which can be published on chain, and write a file describing the tree to distribute to users. Note the value encoding is `address, uint256` in sync with the values in the file.

```js
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import fs from "fs";

const values = JSON.parse(fs.readFileSync("values.json"));
const tree = StandardMerkleTree.of(values, ["address", "uint256"]);

console.log('Merkle Root:', tree.root);
fs.writeFileSync("tree.json", JSON.stringify(tree.dump()));
```

## API & Examples

### `StandardMerkleTree`

```ts
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
```

A "standard" merkle tree has a few characteristics that make it good for on-chain verification.

- The tree is shaped as a [complete binary tree](https://xlinux.nist.gov/dads/HTML/completeBinaryTree.html).
- The leaves are sorted.
- The leaves are the result of ABI encoding a series of values.
- The leaves are double-hashed to prevent attacks.

The last two points imply that the hash of a leaf in the tree, with example values `addr, amount`, can be computed in Solidity as follows:

```solidity
bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(addr, amount))));
```

### `StandardMerkleTree.of`

```ts
const tree = StandardMerkleTree.of([[alice, '100'], [bob, '200']], ['address', 'uint']);
```

Creates a standard merkle tree out of an array of the elements in the tree, along with their types for ABI encoding.

> **Note**
> Consider reading the array of elements from a CSV file for easy interoperability with spreadsheets or other data processing pipelines.

### `tree.root`

```ts
console.log(tree.root);
```

The root of the tree is a commitment on the values of the tree. It can be published (e.g., in a smart contract) to later prove that its values are part of the tree.

### `tree.dump`

```ts
fs.writeFileSync('tree.json', JSON.stringify(tree.dump()));
```

Returns a description of the merkle tree for distribution. It contains all the necessary information to reproduce the tree, find the relevant leaves, and generate proofs. You should distribute this to users in a web application or command line interface so they can generate proofs for their leaves of interest.

### `StandardMerkleTree.load`

```ts
StandardMerkleTree.load(JSON.parse(fs.readFileSync('tree.json')));
```

Loads the tree from a description previously returned by `dump`.

### `tree.getProof`

```ts
const proof = tree.getProof(i);
```

Returns a proof for the `i`th value in the tree. Indices refer to the position of the values in the array from which the tree was constructed.

### `tree.getMultiProof`

```ts
const { proof, proofFlags, leaves } = tree.getMultiProof([i0, i1, ...]);
```

Returns a multiproof for the values at indices `i0, i1, ...`. Indices refer to the position of the values in the array from which the tree was constructed.

The multiproof returned contains an array with the leaves that are being proven. This array may be in a different order than that given by `i0, i1, ...`! The order returned is significant, as it is that in which the leaves must be submitted for verification (e.g., in a smart contract).

### `tree.entries`

```ts
for (const [i, v] of tree.entries()) {
  console.log('value:', v);
  console.log('proof:', tree.getProof(i));
}
```

Lists the values in the tree along with their indices, which can be used to obtain proofs.

### `tree.render`

```ts
console.log(tree.render());
```

Returns a visual representation of the tree that can be useful for debugging.
