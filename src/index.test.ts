import assert from 'assert/strict';
import { SimpleMerkleTree, StandardMerkleTree } from '.';

describe('index properties', () => {
  it('classes are exported', () => {
    assert.notEqual(SimpleMerkleTree, undefined);
    assert.notEqual(StandardMerkleTree, undefined);
  });
});
