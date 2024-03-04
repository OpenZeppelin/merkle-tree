import { defaultAbiCoder } from '@ethersproject/abi';
import { keccak256 } from '@ethersproject/keccak256';
import { BytesLike, HexString, concat, compare } from './bytes';

export type LeafHash<T> = (leaf: T) => HexString;
export type NodeHash = (left: BytesLike, right: BytesLike) => HexString;

export function standardLeafHash<T extends any[]>(types: string[], value: T): HexString {
  return keccak256(keccak256(defaultAbiCoder.encode(types, value)));
}

export function standardNodeHash(a: BytesLike, b: BytesLike): HexString {
  return keccak256(concat([a, b].sort(compare)));
}
