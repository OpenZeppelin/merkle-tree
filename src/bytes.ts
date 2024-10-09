import type { BytesLike } from '@metamask/utils';
type HexString = `0x${string}`;

import { createBytes as toBytes, createHex as toHex, concatBytes as concat } from '@metamask/utils';

function compare(a: BytesLike, b: BytesLike): number {
  const diff = BigInt(toHex(a)) - BigInt(toHex(b));
  return diff > 0 ? 1 : diff < 0 ? -1 : 0;
}

export type { HexString, BytesLike };
export { toBytes, toHex, concat, compare };
