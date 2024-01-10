# Changelog

## Unreleased

- Added an option to disable leaf sorting.
- Added `SimpleMerkleTree` class that supports `bytes32` leaves with no extra hashing.

## 1.0.5

- Make `processMultiProof` more robust by validating invariants.

## 1.0.4

- Added `StandardMerkleTree.verifyMultiProof` static method.

## 1.0.3

- Added `StandardMerkleTree.verify` static method for verification of a proof for given root, leaf, and leaf encoding.

## 1.0.2

- Added `StandardMerkleTree` methods `verify` and `verifyMultiProof`.
