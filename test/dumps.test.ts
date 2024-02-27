import assert from 'assert/strict';
import fs from 'fs';
import path from 'path';
import { StandardMerkleTree, SimpleMerkleTree } from '../src';

const DUMPS_DIR = 'test/dumps/';

describe('load dumped trees', () => {
  for (const file of fs.readdirSync(DUMPS_DIR).map(filename => path.join(DUMPS_DIR, filename))) {
    it(file, function () {
      const dump = JSON.parse(fs.readFileSync(file, 'utf-8'));

      switch (dump.format) {
        case 'standard-v1':
          StandardMerkleTree.load(dump).validate();
          break;
        case 'simple-v1':
          SimpleMerkleTree.load(dump).validate();
          break;
        default:
          assert.fail(`Unknown format '${dump.format}'`);
      }
    });
  }
});
