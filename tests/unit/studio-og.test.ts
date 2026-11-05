import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {expect, test} from 'vitest';
import profiles from '../../art/studio-og/logo-paths.json';
import media from '../../art/studio-og/media.json';

test('studio building roofs preserve the original logo paths', () => {
  const svg = readFileSync('src/assets/identity/blum-mark.svg', 'utf8');
  const original = [...svg.matchAll(/<path\b[^>]*\sd="([^"]+)"/g)].map(match => {
    if (!match[1]) throw new Error('A logo path has no geometry');
    return match[1];
  });
  expect(original).toHaveLength(4);
  expect(profiles).toEqual(original);
});

test('studio preview source and output assets match the shipped manifest', () => {
  for (const asset of [...media.sources, ...media.outputs]) {
    const bytes = readFileSync(asset.path);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(asset.sha256);
    if ('bytes' in asset) expect(bytes.length).toBe(asset.bytes);
  }
});
