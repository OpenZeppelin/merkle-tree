import type { BytesLike } from '@ethersproject/bytes';
type HexString = string;

import { isBytesLike, arrayify as toBytes, hexlify as toHex, concat, isBytes } from '@ethersproject/bytes';

function compare(a: BytesLike, b: BytesLike): number {
  const diff = BigInt(toHex(a)) - BigInt(toHex(b));
  return diff > 0 ? 1 : diff < 0 ? -1 : 0;
}

export type { HexString, BytesLike };
export { isBytesLike, toBytes, toHex, concat, compare, isBytes };
