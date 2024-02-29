import test from 'ava';
import { SimpleMerkleTree, StandardMerkleTree } from '.';

test('classes are exported', t => {
  t.not(SimpleMerkleTree, undefined);
  t.not(StandardMerkleTree, undefined);
});
