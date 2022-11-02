# `@openzeppelin/merkle-tree`


**A JavaScript library to generate merkle trees and merkle proofs.**

Well suited for airdrops and similar mechanisms in combination with OpenZeppelin Contracts [`MerkleProof`] utilities.

[`MerkleProof`]: https://docs.openzeppelin.com/contracts/4.x/api/utils#MerkleProof

[![NPM Package](https://img.shields.io/npm/v/@openzeppelin/merkle-tree.svg)](https://www.npmjs.org/package/@openzeppelin/merkle-tree)


## Quick Start

```
npm install @openzeppelin/merkle-tree
```

### Building a Tree

```js
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import fs from "fs";

// (1)
const values = [
  ["0x1111111111111111111111111111111111111111", "5000000000000000000"],
  ["0x2222222222222222222222222222222222222222", "2500000000000000000"]
];

// (2)
const tree = StandardMerkleTree.of(values, ["address", "uint256"]);

// (3)
console.log('Merkle Root:', tree.root);

// (4)
fs.writeFileSync("tree.json", JSON.stringify(tree.dump()));
```

1. Get the values to include in the tree. (Note: Consider reading them from a file.)
2. Build the merkle tree. Set the encoding to match the values.
3. Print the merkle root. You will probably publish this value on chain in a smart contract.
4. Write a file that describes the tree. You will distribute this to users so they can generate proofs for values in the tree.

### Obtaining a Proof

Assume we're looking to generate a proof for the entry that corresponds to address `0x11...11`.

```js
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import fs from "fs";

// (1)
const tree = StandardMerkleTree.load(JSON.parse(fs.readFileSync("tree.json")));

// (2)
for (const [i, v] of tree.entries()) {
  if (v[0] === '0x1111111111111111111111111111111111111111') {
    // (3)
    const proof = tree.getProof(i);
    console.log('Value:', v);
    console.log('Proof:', proof);
  }
}
```

1. Load the tree from the description that was generated previously.
2. Loop through the entries to find the one you're interested in.
3. Generate the proof using the index of the entry.

In practice this might be done in a frontend application prior to submitting the proof on-chain, with the address looked up being that of the connected wallet.

See [`MerkleProof`] for documentation on how to validate the proof in Solidity.

## Standard Merkle Trees

This library works on "standard" merkle trees designed for Ethereum smart contracts. We have defined them with a few characteristics that make them secure and good for on-chain verification.

- The tree is shaped as a [complete binary tree](https://xlinux.nist.gov/dads/HTML/completeBinaryTree.html).
- The leaves are sorted.
- The leaves are the result of ABI encoding a series of values.
- The hash used is Keccak256.
- The leaves are double-hashed to prevent [second preimage attacks].

[second preimage attacks]: https://flawed.net.nz/2018/02/21/attacking-merkle-trees-with-a-second-preimage-attack/

From the last three points we get that the hash of a leaf in the tree with value `[addr, amount]` can be computed in Solidity as follows:

```solidity
bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(addr, amount))));
```

This is an opinionated design that we believe will offer the best out of the box experience for most users. We may introduce options for customization in the future based on user requests.

## API & Examples

### `StandardMerkleTree`

```ts
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
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

Also accepts a value instead of an index, but this will be less efficient. It will fail if the value is not found in the tree.

```ts
const proof = tree.getProof([alice, '100']);
```

### `tree.getMultiProof`

```ts
const { proof, proofFlags, leaves } = tree.getMultiProof([i0, i1, ...]);
```

Returns a multiproof for the values at indices `i0, i1, ...`. Indices refer to the position of the values in the array from which the tree was constructed.

The multiproof returned contains an array with the leaves that are being proven. This array may be in a different order than that given by `i0, i1, ...`! The order returned is significant, as it is that in which the leaves must be submitted for verification (e.g., in a smart contract).

Also accepts values instead of indices, but this will be less efficient. It will fail if any of the values is not found in the tree.

```ts
const proof = tree.getProof([[alice, '100'], [bob, '200']]);
```

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

### `tree.leafHash`

```ts
const leaf = tree.leafHash([alice, '100']);
```

Returns the hash of the value according to the specified encoding.

Corresponds to the following expression in Solidity:

```solidity
bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(alice, 100))));
```
