import { encode } from '@metamask/abi-utils';
import { keccak256 as _keccak256 } from 'ethereum-cryptography/keccak';
import { BytesLike, HexString, toHex, toBytes, concat, compare } from './bytes';

export type LeafHash<T> = (leaf: T) => HexString;
export type NodeHash = (left: BytesLike, right: BytesLike) => HexString;

export function keccak256(input: BytesLike): HexString {
  return toHex(_keccak256(toBytes(input)));
}

export function standardLeafHash<T extends any[]>(types: string[], value: T): HexString {
  return keccak256(keccak256(encode(types, value)));
}

export function standardNodeHash(a: BytesLike, b: BytesLike): HexString {
  return keccak256(concat([a, b].sort(compare)));
}
