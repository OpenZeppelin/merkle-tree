import { keccak256 } from 'ethereum-cryptography/keccak';
import { concatBytes, hexToBytes } from 'ethereum-cryptography/utils';
import { defaultAbiCoder } from '@ethersproject/abi';
import { Bytes, HashFn, compareBytes } from '../bytes';

export function standardHash(value: Bytes): Bytes {
  return keccak256(value);
}

export function leafHash<T extends any[]>(value: T, types: string[], hashFn: HashFn): Bytes {
  return hashFn(hashFn(hexToBytes(defaultAbiCoder.encode(types, value))));
}

export function hashPair(a: Bytes, b: Bytes, hashFn: HashFn): Bytes {
  return hashFn(concatBytes(...[a, b].sort(compareBytes)))
}
