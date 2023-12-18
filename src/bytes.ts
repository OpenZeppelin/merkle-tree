import type { Bytes, BytesLike } from '@ethersproject/bytes';
type HexString = string;

import {
  isBytesLike,
  arrayify as toBytes,
  hexlify as toHex,
  concat,
} from '@ethersproject/bytes';

import { BigNumber } from '@ethersproject/bignumber';

function compare(a: BytesLike, b: BytesLike): number {
  const diff = BigNumber.from(a).sub(b);
  return diff.isZero() ? 0 : diff.isNegative() ? -1 : 1;
}

export type { HexString, Bytes, BytesLike };
export { isBytesLike, toBytes, toHex, concat, compare };
