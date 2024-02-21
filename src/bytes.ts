import { bytesToHex } from "ethereum-cryptography/utils";

export type Bytes = Uint8Array;

export type HashFn = (data: Bytes) => Bytes;
export type HashPair = (a: Bytes, b: Bytes) => Bytes;

export function compareBytes(a: Bytes, b: Bytes): number {
  const n = Math.min(a.length, b.length);

  for (let i = 0; i < n; i++) {
    if (a[i] !== b[i]) {
      return a[i]! - b[i]!;
    }
  }

  return a.length - b.length;
}

export function hex(b: Bytes): string {
  return '0x' + bytesToHex(b);
}
