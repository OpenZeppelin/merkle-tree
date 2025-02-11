# Changelog

## 1.0.8

- Remove dependencies with advisories.

## 1.0.7

- Added `SimpleMerkleTree` class that supports `bytes32` leaves with no extra hashing.
- Support custom hashing function for computing internal nodes. Available in the core and in `SimpleMerkleTree`.
- Add `length` and `at()` (leaf getter) to `StandardMerkleTree` and `SimpleMerkleTree`.

## 1.0.6

- Added an option to disable leaf sorting.

## 1.0.5

- Make `processMultiProof` more robust by validating invariants.

## 1.0.4

- Added `StandardMerkleTree.verifyMultiProof` static method.

## 1.0.3

- Added `StandardMerkleTree.verify` static method for verification of a proof for given root, leaf, and leaf encoding.

## 1.0.2

- Added `StandardMerkleTree` methods `verify` and `verifyMultiProof`.
