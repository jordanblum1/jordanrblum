import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {expect, test} from 'vitest';
import media from '../../art/studio-og/media.json';

test('studio preview source and output assets match the shipped manifest', () => {
  for (const asset of [...media.sources, ...media.outputs]) {
    const bytes = readFileSync(asset.path);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(asset.sha256);
    if ('bytes' in asset) expect(bytes.length).toBe(asset.bytes);
  }
});
