type Bytes = Uint8Array;
type BytesLike = ArrayLike<number> | string;
type HexString = string;

import { createBytes, createHex, concatBytes, type BytesLike as StrictBytesLike } from '@metamask/utils';

function toBytes(value: BytesLike): Bytes {
  if (Array.isArray(value)) {
    return createBytes(new Uint8Array(value));
  } else {
    return createBytes(value as StrictBytesLike);
  }
}

function toHex(value: BytesLike): `0x${string}` {
  if (Array.isArray(value)) {
    return createHex(new Uint8Array(value));
  } else {
    return createHex(value as StrictBytesLike);
  }
}

function concat(values: BytesLike[]): Bytes {
  return concatBytes(values.map(toBytes));
}

function compare(a: BytesLike, b: BytesLike): number {
  const diff = BigInt(toHex(a)) - BigInt(toHex(b));
  return diff > 0 ? 1 : diff < 0 ? -1 : 0;
}

export type { HexString, BytesLike, Bytes };
export { toBytes, toHex, concat, compare };
