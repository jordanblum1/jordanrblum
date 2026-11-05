import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {expect, test} from 'vitest';
import media from '../../art/studio-og/media.json';
import paths from '../../art/studio-og/logo-paths.json';
import {choreography} from '../../art/studio-og/motion';

test('studio preview source and output assets match the shipped manifest', () => {
  for (const asset of [...media.sources, ...media.outputs]) {
    const bytes = readFileSync(asset.path);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(asset.sha256);
    if ('bytes' in asset) expect(bytes.length).toBe(asset.bytes);
  }
});

test('canvas geometry uses every original logo path, including the complete M', () => {
  const original = [...readFileSync('src/assets/identity/blum-mark.svg','utf8').matchAll(/ d="([^"]+)"/g)].map(match=>match[1]);
  expect(paths).toEqual(original);
  expect(paths).toHaveLength(4);
});

test('all letters finish lifting and hold, after the M has snapped into place', () => {
  expect(choreography(0)).toEqual({mX:32,mZ:34,depth:.025});
  expect(choreography(22)).toEqual({mX:0,mZ:0,depth:.025});
  expect(choreography(28).depth).toBe(.025);
  expect(choreography(38).depth).toBeGreaterThan(.025);
  expect(choreography(38).depth).toBeLessThan(1);
  for(let frame=47;frame<90;frame++) expect(choreography(frame)).toEqual({mX:0,mZ:0,depth:1});
});
