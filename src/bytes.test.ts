import test from 'ava';

import * as bytes from './bytes';

test('toBytes', t => {
  const empty = Uint8Array.of();
  t.deepEqual(bytes.toBytes('0x'), empty);
  t.deepEqual(bytes.toBytes([]), empty);

  const onetwothree = Uint8Array.of(1, 2, 3);
  t.deepEqual(bytes.toBytes('0x010203'), onetwothree);
  t.deepEqual(bytes.toBytes('010203'), onetwothree);
  t.deepEqual(bytes.toBytes([1, 2, 3]), onetwothree);
  t.deepEqual(bytes.toBytes(Uint8Array.of(1, 2, 3)), onetwothree);
});

test('toHex', t => {
  t.is(bytes.toHex('0x'), '0x');
  t.is(bytes.toHex([]), '0x');

  t.is(bytes.toHex('0x010203'), '0x010203');
  t.is(bytes.toHex('010203'), '0x010203');
  t.is(bytes.toHex([1, 2, 3]), '0x010203');
  t.is(bytes.toHex(Uint8Array.of(1, 2, 3)), '0x010203');
});
