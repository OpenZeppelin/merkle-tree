import { keccak256 } from 'ethereum-cryptography/keccak';
import { concatBytes, bytesToHex, equalsBytes } from 'ethereum-cryptography/utils';
import { Bytes, compareBytes } from './bytes';
import { throwError } from './utils/throw-error';

const hashPair = (a: Bytes, b: Bytes) => keccak256(concatBytes(...[a, b].sort(compareBytes)));

const leftChildIndex  = (i: number) => 2 * i + 1;
const rightChildIndex = (i: number) => 2 * i + 2;
const parentIndex     = (i: number) => i > 0 ? Math.floor((i - 1) / 2) : throwError('Root has no parent');
const siblingIndex    = (i: number) => i > 0 ? i - (-1) ** (i % 2)     : throwError('Root has no siblings');

const isTreeNode        = (tree: unknown[], i: number) => i >= 0 && i < tree.length;
const isInternalNode    = (tree: unknown[], i: number) => isTreeNode(tree, leftChildIndex(i));
const isLeafNode        = (tree: unknown[], i: number) => isTreeNode(tree, i) && !isInternalNode(tree, i);
const isValidMerkleNode = (node: Bytes) => node instanceof Uint8Array && node.length === 32;

const checkTreeNode        = (tree: unknown[], i: number) => void (isTreeNode(tree, i)     || throwError('Index is not in tree'));
const checkInternalNode    = (tree: unknown[], i: number) => void (isInternalNode(tree, i) || throwError('Index is not an internal tree node'));
const checkLeafNode        = (tree: unknown[], i: number) => void (isLeafNode(tree, i)     || throwError('Index is not a leaf'));
const checkValidMerkleNode = (node: Bytes)                => void (isValidMerkleNode(node) || throwError('Merkle tree nodes must be Uint8Array of length 32'));

export function makeMerkleTree(leaves: Bytes[]): Bytes[] {
  if (leaves.length === 0) {
    throw new Error('Expected non-zero number of leaves');
  }

  const tree = new Array<Bytes>(2 * leaves.length - 1);

  for (const [i, leaf] of leaves.entries()) {
    checkValidMerkleNode(leaf);
    tree[tree.length - 1 - i] = leaf;
  }

  for (let i = tree.length - 1 - leaves.length; i >= 0; i--) {
    const l = tree[leftChildIndex(i)]!;
    const r = tree[rightChildIndex(i)]!;
    tree[i] = hashPair(l, r);
  }

  return tree;
}

export function getProof(tree: Bytes[], index: number): Bytes[] {
  checkLeafNode(tree, index);

  const proof = [];

  for (let j = index; j > 0; j = parentIndex(j)) {
    proof.push(tree[siblingIndex(j)]!);
  }

  return proof;
}

export function processProof(leaf: Bytes, proof: Bytes[]): Bytes {
  checkValidMerkleNode(leaf);
  let result = leaf;
  for (const sibling of proof) {
    checkValidMerkleNode(sibling);
    result = hashPair(sibling, result);
  }
  return result;
}

export interface MultiProof<T> {
  leaves: T[];
  proof: T[];
  proofFlags: boolean[];
}

export function getMultiProof(tree: Bytes[], indices: number[]): MultiProof<Bytes> {
  if (indices.length === 0) {
    return { leaves: [], proof: tree.slice(0, 1), proofFlags: [] };
  }

  for (const i of indices) {
    checkLeafNode(tree, i);
  }

  // order indices
  indices.sort((a, b) => b - a);

  const stack = indices.concat(); // copy
  const proof = [];
  const proofFlags = [];

  while (stack.length > 0 && stack[0]! > 0) {
    const j = stack.shift()!; // take from the beginning
    const s = siblingIndex(j);
    const p = parentIndex(j);

    if (s === stack[0]) {
      proofFlags.push(true);
      stack.shift(); // consume from the stack
    } else {
      proofFlags.push(false);
      proof.push(tree[s]!);
    }
    stack.push(p);
  }

  return {
    leaves: indices.map(i => tree[i]!),
    proof,
    proofFlags,
  };
}

export function processMultiProof(multiproof: MultiProof<Bytes>): Bytes {
  for (const leaf of multiproof.leaves) {
    checkValidMerkleNode(leaf);
  }
  for (const sibling of multiproof.proof) {
    checkValidMerkleNode(sibling);
  }

  if (multiproof.proof.length < multiproof.proofFlags.filter(b => !b).length) {
    throw new Error('Invalid multiproof format');
  }

  if (multiproof.leaves.length + multiproof.proof.length !== multiproof.proofFlags.length + 1) {
    throw new Error('Provided leaves and multiproof are not compatible');
  }

  const stack = multiproof.leaves.concat(); // copy
  const proof = multiproof.proof.concat(); // copy

  for (const flag of multiproof.proofFlags) {
    const a = stack.shift()!;
    const b = flag ? stack.shift()! : proof.shift()!;
    stack.push(hashPair(a, b));
  }

  return stack.pop() ?? proof.shift()!;
}

export function isValidMerkleTree(tree: Bytes[]): boolean {
  for (const [i, node] of tree.entries()) {
    if (!isValidMerkleNode(node)) {
      return false;
    }

    const l = leftChildIndex(i);
    const r = rightChildIndex(i);

    if (r >= tree.length) {
      if (l < tree.length) {
        return false;
      }
    } else if (!equalsBytes(node, hashPair(tree[l]!, tree[r]!))) {
      return false;
    }
  }

  return tree.length > 0;
}

export function printMerkleTree(tree: Bytes[]) {
  if (tree.length === 0) {
    throw new Error('Expected non-zero number of nodes');
  }

  const stack: [number, number[]][] = [[0, []]];

  while (stack.length > 0) {
    const [i, path] = stack.pop()!;

    console.log(
      path.slice(0, -1).map(p => ['   ', '│  '][p]).join('') +
      path.slice(-1).map(p => ['└─ ', '├─ '][p]).join('') +
      i + ') ' +
      bytesToHex(tree[i]!)
    );

    if (rightChildIndex(i) < tree.length) {
      stack.push([rightChildIndex(i), path.concat(0)]);
      stack.push([leftChildIndex(i), path.concat(1)]);
    }
  }
}
