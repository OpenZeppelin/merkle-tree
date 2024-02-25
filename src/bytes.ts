import type { BytesLike } from '@ethersproject/bytes';
type HexString = string;

import { arrayify as toBytes, hexlify as toHex, concat } from '@ethersproject/bytes';

function compare(a: BytesLike, b: BytesLike): number {
  const diff = BigInt(toHex(a)) - BigInt(toHex(b));
  return diff > 0 ? 1 : diff < 0 ? -1 : 0;
}

export type { HexString, BytesLike };
export { toBytes, toHex, concat, compare };
