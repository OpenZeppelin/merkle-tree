import type { HexString, BytesLike } from 'ethers/lib.commonjs/utils/data';
type Bytes = Uint8Array;

import {
  isBytesLike,
  getBytes as toBytes,
  hexlify as toHex,
  concat,
  toBigInt,
} from 'ethers';

function compare(a: BytesLike, b: BytesLike): number {
  const diff = toBigInt(a) - toBigInt(b);
  return diff > 0 ? 1 : diff < 0 ? -1 : 0;
}

export type { HexString, Bytes, BytesLike };
export { isBytesLike, toBytes, toHex, concat, compare };
