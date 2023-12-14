import { keccak256 } from 'ethereum-cryptography/keccak';
import { hexToBytes } from 'ethereum-cryptography/utils';
import { defaultAbiCoder } from '@ethersproject/abi';
import { Bytes } from '../bytes';

export function standardLeafHash<T extends any[]>(value: T, types: string[]): Bytes {
  return keccak256(keccak256(hexToBytes(defaultAbiCoder.encode(types, value))));
}
