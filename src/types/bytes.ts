export type { HexString, BytesLike } from 'ethers/lib.commonjs/utils/data';
export type Bytes = Uint8Array;

export {
    isBytesLike,
    getBytes as toBytes,
    hexlify as toHex,
    concat,
} from 'ethers';