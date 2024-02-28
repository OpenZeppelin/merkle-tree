import { BytesLike, HexString, toHex, toBytes, compare } from './bytes';
import { NodeHash, standardNodeHash } from './hashes';
import { invariant, throwError, validateArgument } from './utils/errors';

const leftChildIndex = (i: number) => 2 * i + 1;
const rightChildIndex = (i: number) => 2 * i + 2;
const parentIndex = (i: number) => (i > 0 ? Math.floor((i - 1) / 2) : throwError('Root has no parent'));
const siblingIndex = (i: number) => (i > 0 ? i - (-1) ** (i % 2) : throwError('Root has no siblings'));

const isTreeNode = (tree: unknown[], i: number) => i >= 0 && i < tree.length;
const isInternalNode = (tree: unknown[], i: number) => isTreeNode(tree, leftChildIndex(i));
const isLeafNode = (tree: unknown[], i: number) => isTreeNode(tree, i) && !isInternalNode(tree, i);
const isValidMerkleNode = (node: BytesLike) => toBytes(node).length === 32;

const checkLeafNode = (tree: unknown[], i: number) => void (isLeafNode(tree, i) || throwError('Index is not a leaf'));
const checkValidMerkleNode = (node: BytesLike) =>
  void (isValidMerkleNode(node) || throwError('Merkle tree nodes must be Uint8Array of length 32'));

export function makeMerkleTree(leaves: BytesLike[], nodeHash: NodeHash = standardNodeHash): HexString[] {
  leaves.forEach(checkValidMerkleNode);

  validateArgument(leaves.length !== 0, 'Expected non-zero number of leaves');

  const tree = new Array<HexString>(2 * leaves.length - 1);

  for (const [i, leaf] of leaves.entries()) {
    tree[tree.length - 1 - i] = toHex(leaf);
  }
  for (let i = tree.length - 1 - leaves.length; i >= 0; i--) {
    tree[i] = nodeHash(tree[leftChildIndex(i)]!, tree[rightChildIndex(i)]!);
  }

  return tree;
}

export function getProof(tree: BytesLike[], index: number): HexString[] {
  checkLeafNode(tree, index);

  const proof = [];
  while (index > 0) {
    proof.push(toHex(tree[siblingIndex(index)]!));
    index = parentIndex(index);
  }
  return proof;
}

export function processProof(leaf: BytesLike, proof: BytesLike[], nodeHash: NodeHash = standardNodeHash): HexString {
  checkValidMerkleNode(leaf);
  proof.forEach(checkValidMerkleNode);

  return toHex(proof.reduce(nodeHash, leaf));
}

export interface MultiProof<T, L = T> {
  leaves: L[];
  proof: T[];
  proofFlags: boolean[];
}

export function getMultiProof(tree: BytesLike[], indices: number[]): MultiProof<HexString> {
  indices.forEach(i => checkLeafNode(tree, i));
  indices.sort((a, b) => b - a);

  validateArgument(
    indices.slice(1).every((i, p) => i !== indices[p]),
    'Cannot prove duplicated index',
  );

  const stack = Array.from(indices); // copy
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
      proof.push(toHex(tree[s]!));
    }
    stack.push(p);
  }

  if (indices.length === 0) {
    proof.push(toHex(tree[0]!));
  }

  return {
    leaves: indices.map(i => toHex(tree[i]!)),
    proof,
    proofFlags,
  };
}

export function processMultiProof(multiproof: MultiProof<BytesLike>, nodeHash: NodeHash = standardNodeHash): HexString {
  multiproof.leaves.forEach(checkValidMerkleNode);
  multiproof.proof.forEach(checkValidMerkleNode);

  validateArgument(
    multiproof.proof.length >= multiproof.proofFlags.filter(b => !b).length,
    'Invalid multiproof format',
  );
  validateArgument(
    multiproof.leaves.length + multiproof.proof.length === multiproof.proofFlags.length + 1,
    'Provided leaves and multiproof are not compatible',
  );

  const stack = Array.from(multiproof.leaves); // copy
  const proof = Array.from(multiproof.proof); // copy

  for (const flag of multiproof.proofFlags) {
    const a = stack.shift();
    const b = flag ? stack.shift() : proof.shift();
    invariant(a !== undefined && b !== undefined);
    stack.push(nodeHash(a, b));
  }

  invariant(stack.length + proof.length === 1);

  return toHex(stack.pop() ?? proof.shift()!);
}

export function isValidMerkleTree(tree: BytesLike[], nodeHash: NodeHash = standardNodeHash): boolean {
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
    } else if (compare(node, nodeHash(tree[l]!, tree[r]!))) {
      return false;
    }
  }

  return tree.length > 0;
}

export function renderMerkleTree(tree: BytesLike[]): HexString {
  validateArgument(tree.length !== 0, 'Expected non-zero number of nodes');

  const stack: [number, number[]][] = [[0, []]];

  const lines = [];

  while (stack.length > 0) {
    const [i, path] = stack.pop()!;

    lines.push(
      path
        .slice(0, -1)
        .map(p => ['   ', '│  '][p])
        .join('') +
        path
          .slice(-1)
          .map(p => ['└─ ', '├─ '][p])
          .join('') +
        i +
        ') ' +
        toHex(tree[i]!),
    );

    if (rightChildIndex(i) < tree.length) {
      stack.push([rightChildIndex(i), path.concat(0)]);
      stack.push([leftChildIndex(i), path.concat(1)]);
    }
  }

  return lines.join('\n');
}
