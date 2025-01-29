type Bytes = Uint8Array;
type BytesLike = readonly number[] | Uint8Array | string;
type HexString = string;

import { hexToBytes, bytesToHex, concatBytes } from 'ethereum-cryptography/utils';

function toBytes(value: BytesLike): Bytes {
  if (value instanceof Uint8Array) {
    return value;
  } else if (typeof value === 'string') {
    return hexToBytes(value);
  } else {
    return new Uint8Array(value);
  }
}

function toHex(value: BytesLike): HexString {
  if (typeof value === 'string') {
    hexToBytes(value); // assert hex string
    return value.replace(/^(0x)?/, '0x');
  } else if (value instanceof Uint8Array) {
    return '0x' + bytesToHex(value);
  } else {
    return '0x' + bytesToHex(new Uint8Array(value));
  }
}

function concat(values: BytesLike[]): Bytes {
  return concatBytes(...values.map(toBytes));
}

function compare(a: BytesLike, b: BytesLike): number {
  const diff = BigInt(toHex(a)) - BigInt(toHex(b));
  return diff > 0 ? 1 : diff < 0 ? -1 : 0;
}

export type { HexString, BytesLike, Bytes };
export { toBytes, toHex, concat, compare };
