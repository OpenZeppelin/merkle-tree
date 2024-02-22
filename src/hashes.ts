import { keccak256 } from '@ethersproject/keccak256';
import { BytesLike, HexString, concat, compare } from './bytes';

export type HashPairFn = (a: BytesLike, b: BytesLike) => HexString;

export function keccak256SortedPair(a: BytesLike, b: BytesLike): HexString {
    return keccak256(concat([a, b].sort(compare)));
}