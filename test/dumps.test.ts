import test from 'ava';
import fs from 'fs';
import path from 'path';
import { StandardMerkleTree, SimpleMerkleTree } from '../src';

const DUMPS_DIR = 'test/dumps/';

for (const file of fs.readdirSync(DUMPS_DIR).map(filename => path.join(DUMPS_DIR, filename))) {
  test(file, t => {
    const dump = JSON.parse(fs.readFileSync(file, 'utf-8'));

    switch (dump.format) {
      case 'standard-v1':
        StandardMerkleTree.load(dump).validate();
        t.pass();
        break;
      case 'simple-v1':
        SimpleMerkleTree.load(dump).validate();
        t.pass();
        break;
      default:
        t.fail(`Unknown format '${dump.format}'`);
    }
  });
}
