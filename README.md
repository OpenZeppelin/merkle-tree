# `@openzeppelin/merkle-tree`

This is a JavaScript library to generate merkle trees for use with OpenZeppelin's `MerkleProof` smart contract library.

```
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
```

A "standard" merkle tree has a few characteristics that make it good for on-chain verification.

- The tree is shaped as a [complete binary tree](https://xlinux.nist.gov/dads/HTML/completeBinaryTree.html).
- The leaves are sorted.
- The leaves are the result of ABI encoding a series of values.
- The leaves are double-hashed to prevent attacks.

The last two points imply that the leaf values of the tree are of the form `keccak256(abi.encodePacked(keccak256(abi.encode(a, b, c))))`.

Create a standard merkle tree out of an array of the elements in the tree, along with their types for ABI encoding.

```
const tree = StandardMerkleTree.of([[alice, '100'], [bob, '200']], ['address', 'uint'])
```

> **Note**
> Consider reading the array of elements from a CSV file for easy interoperability with spreadsheets or other data processing pipelines.

The root of the tree is a commitment on the values of the tree, and it can be published in a smart contract to later prove the values.

```
console.log(tree.root);
```

Store the merkle tree in a file for distribution. This file will contain all the necessary information to reproduce the tree, find the relevant leaves, and generate proofs. You will distribute this file to users in a web application or command line interface so they can generate proofs for their leaves of interest.

```
fs.writeFileSync('tree.json', JSON.stringify(tree.dump()))
```

Load the tree from this JSON file.

```
StandardMerkleTree.load(fs.readFileSync('tree.json'))
```
