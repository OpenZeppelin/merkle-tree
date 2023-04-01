# `@openzeppelin/merkle-tree`


**A JavaScript library to generate merkle trees and merkle proofs.**

Well suited for airdrops and similar mechanisms in combination with OpenZeppelin Contracts [`MerkleProof`] utilities.

[`MerkleProof`]: https://docs.openzeppelin.com/contracts/4.x/api/utils#MerkleProof

[![NPM Package](https://img.shields.io/npm/v/@openzeppelin/merkle-tree.svg)](https://www.npmjs.org/package/@openzeppelin/merkle-tree)
[![Coverage](https://codecov.io/github/OpenZeppelin/merkle-tree/branch/master/graph/badge.svg?token=1JMTIEYRZK)](https://codecov.io/github/OpenZeppelin/merkle-tree)

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

### Validating a Proof in Solidity

Once the proof has been generated, it can be validated in Solidity using [`MerkleProof`] as in the following example:

```solidity
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract Verifier {
    bytes32 private root;

    constructor(bytes32 _root) {
        // (1)
        root = _root;
    }

    function verify(
        bytes32[] memory proof,
        address addr,
        uint256 amount
    ) public {
        // (2)
        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(addr, amount))));
        // (3)
        require(MerkleProof.verify(proof, root, leaf), "Invalid proof");
        // (4)
        // ...
    }
}
```

1. Store the tree root in your contract.
2. Compute the [leaf hash](#leaf-hash) for the provided `addr` and `amount` ABI encoded values.
3. Verify it using [`MerkleProof`]'s `verify` function.
4. Use the verification to make further operations on the contract. (Consider you may want to add a mechanism to prevent reuse of a leaf).

## Standard Merkle Trees

This library works on "standard" merkle trees designed for Ethereum smart contracts. We have defined them with a few characteristics that make them secure and good for on-chain verification.

- The tree is shaped as a [complete binary tree](https://xlinux.nist.gov/dads/HTML/completeBinaryTree.html).
- The leaves are sorted.
- The leaves are the result of ABI encoding a series of values.
- The hash used is Keccak256.
- The leaves are double-hashed to prevent [second preimage attacks].

[second preimage attacks]: https://flawed.net.nz/2018/02/21/attacking-merkle-trees-with-a-second-preimage-attack/

### Leaf Hash

From the last three points we get that the hash of a leaf in the tree with value `[addr, amount]` can be computed in Solidity as follows:

```solidity
bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(addr, amount))));
```

This is an opinionated design that we believe will offer the best out of the box experience for most users. We may introduce options for customization in the future based on user requests.

## API & Examples

### `StandardMerkleTree`

```typescript
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
```

### `StandardMerkleTree.of`

```typescript
const tree = StandardMerkleTree.of([[alice, '100'], [bob, '200']], ['address', 'uint']);
```

Creates a standard merkle tree out of an array of the elements in the tree, along with their types for ABI encoding. For documentation on the syntax of the types, including how to encode structs, refer to the documentation for Ethers.js's [`AbiCoder`](https://docs.ethers.org/v5/api/utils/abi/coder/#AbiCoder-encode).

> **Note**
> Consider reading the array of elements from a CSV file for easy interoperability with spreadsheets or other data processing pipelines.

### `StandardMerkleTree.verify`

```typescript
const verified = StandardMerkleTree.verify(root, ['address', 'uint'], [alice, '100'], proof);
```

Returns a boolean that is `true` when the proof verifies that the value is contained in the tree given only the proof, merkle root, and encoding.

### `StandardMerkleTree.verifyMultiProof`

```typescript
const isValid = StandardMerkleTree.verifyMultiProof(root, leafEncoding, multiproof);
```

Returns a boolean that is `true` when the multiproof verifies that all the values are contained in the tree given only the multiproof, merkle root, and leaf encoding.

### `StandardMerkleTree.load`

```typescript
StandardMerkleTree.load(JSON.parse(fs.readFileSync('tree.json')));
```

Loads the tree from a description previously returned by `tree.dump`.

### `tree.root`

```typescript
console.log(tree.root);
```

The root of the tree is a commitment on the values of the tree. It can be published (e.g., in a smart contract) to later prove that its values are part of the tree.

### `tree.dump`

```typescript
fs.writeFileSync('tree.json', JSON.stringify(tree.dump()));
```

Returns a description of the merkle tree for distribution. It contains all the necessary information to reproduce the tree, find the relevant leaves, and generate proofs. You should distribute this to users in a web application or command line interface so they can generate proofs for their leaves of interest.

### `tree.getProof`

```typescript
const proof = tree.getProof(i);
```

Returns a proof for the `i`th value in the tree. Indices refer to the position of the values in the array from which the tree was constructed.

Also accepts a value instead of an index, but this will be less efficient. It will fail if the value is not found in the tree.

```typescript
const proof = tree.getProof([alice, '100']);
```

### `tree.getMultiProof`

```typescript
const { proof, proofFlags, leaves } = tree.getMultiProof([i0, i1, ...]);
```

Returns a multiproof for the values at indices `i0, i1, ...`. Indices refer to the position of the values in the array from which the tree was constructed.

The multiproof returned contains an array with the leaves that are being proven. This array may be in a different order than that given by `i0, i1, ...`! The order returned is significant, as it is that in which the leaves must be submitted for verification (e.g., in a smart contract).

Also accepts values instead of indices, but this will be less efficient. It will fail if any of the values is not found in the tree.

```typescript
const proof = tree.getProof([[alice, '100'], [bob, '200']]);
```

### `tree.verify`

```typescript
tree.verify(i, proof);
tree.verify([alice, '100'], proof);
```

Returns a boolean that is `true` when the proof verifies that the value is contained in the tree.

### `tree.verifyMultiProof`

```typescript
tree.verifyMultiProof({ proof, proofFlags, leaves });
```

Returns a boolean that is `true` when the multi-proof verifies that the values are contained in the tree.

### `tree.entries`

```typescript
for (const [i, v] of tree.entries()) {
  console.log('value:', v);
  console.log('proof:', tree.getProof(i));
}
```

Lists the values in the tree along with their indices, which can be used to obtain proofs.

### `tree.render`

```typescript
console.log(tree.render());
```

Returns a visual representation of the tree that can be useful for debugging.

### `tree.leafHash`

```typescript
const leaf = tree.leafHash([alice, '100']);
```

Returns the leaf hash of the value, as defined in [Standard Merkle Trees](#standard-merkle-trees).

Corresponds to the following expression in Solidity:

```solidity
bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(alice, 100))));
```
