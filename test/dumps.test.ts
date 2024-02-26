import assert from 'assert/strict';
import fs from 'fs';
import path from 'path';
import { StandardMerkleTree } from '../src/standard';

const DUMPS_DIR = 'test/dumps/';

describe('load dumped trees', () => {
  for (const file of fs.readdirSync(DUMPS_DIR).map(filename => path.join(DUMPS_DIR, filename))) {
    it(file, function () {
      const dump = JSON.parse(fs.readFileSync(file, 'utf-8'));
      const tree = StandardMerkleTree.load(dump);
      tree.validate();
    });
  }
});
