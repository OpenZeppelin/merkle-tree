import { defaultAbiCoder } from '@ethersproject/abi';
import { keccak256 } from '@ethersproject/keccak256';
import { BytesLike, HexString, concat, compare } from './bytes';

export type LeafHash<T> = (leaf: T) => HexString;
export type NodeHash = (left: BytesLike, right: BytesLike) => HexString;
export type Encoder = {
  encode: (types: string[], values: any[]) => string;
};

export function standardLeafHash<T extends any[]>(
  types: string[],
  value: T,
  encoder: Encoder = defaultAbiCoder,
): HexString {
  return keccak256(keccak256(encoder.encode(types, value)));
}

export function standardNodeHash(a: BytesLike, b: BytesLike): HexString {
  return keccak256(concat([a, b].sort(compare)));
}
