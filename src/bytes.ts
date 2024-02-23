import type { BytesLike, Hexable } from "@ethersproject/bytes";

type Hex = BytesLike | Hexable | number | bigint;
type HexString = string;

import {
  isBytesLike,
  arrayify as toBytes,
  hexlify as toHex,
  concat,
  isBytes,
} from "@ethersproject/bytes";

function compare(a: Hex, b: Hex): number {
  const diff = BigInt(toHex(a)) - BigInt(toHex(b));
  return diff > 0 ? 1 : diff < 0 ? -1 : 0;
}

export type { Hex, HexString, BytesLike };
export { isBytesLike, toBytes, toHex, concat, compare, isBytes };
