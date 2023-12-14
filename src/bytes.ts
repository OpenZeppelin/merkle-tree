import { bytesToHex, hexToBytes } from 'ethereum-cryptography/utils';

export type Bytes = Uint8Array;
export type BytesLike = Bytes | string;

export function compareBytes(a: Bytes, b: Bytes): number {
  const n = Math.min(a.length, b.length);

  for (let i = 0; i < n; i++) {
    if (a[i] !== b[i]) {
      return a[i]! - b[i]!;
    }
  }

  return a.length - b.length;
}

export function toBytes(b: BytesLike) : Bytes {
  return typeof b == 'string' ? hexToBytes(b) : b;
}

export function hex(b: Bytes): string {
  return '0x' + bytesToHex(b);
}
