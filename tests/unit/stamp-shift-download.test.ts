import { expect, test } from 'vitest';
import { getStampShiftDownloadUrl, stampShiftAppStoreUrl } from '../../src/data/stamp-shift-download';

test.each([
  ['route20-a', 'ss_meta_r20_a_202611'],
  ['route20-b', 'ss_meta_r20_b_202611'],
])('maps the allowlisted %s campaign to its exact Apple URL', (campaign, token) => {
  expect(getStampShiftDownloadUrl(`?ss_campaign=${campaign}`)).toBe(`https://apps.apple.com/app/apple-store/id6824269145?pt=127568836&ct=${token}&mt=8`);
});

test.each([
  '',
  '?ss_campaign=',
  '?ss_campaign=unknown',
  '?ss_campaign=ROUTE20-A',
  '?ss_campaign=route20-a%20',
  '?ss_campaign=route20-a&ss_campaign=route20-a',
  '?ss_campaign=route20-a&ss_campaign=route20-b',
  '?ss_campaign=route20-a&ss%5Fcampaign=route20-b',
  '?ss_campaign=route20-a&ss_campaign=',
  '?ss_campaign=%',
  '?ss_campaign=%C0%AF',
  '?ss_campaign=route20-a&other=%GG',
  '?ss_campaign=https%3A%2F%2Fexample.test',
  '?pt=anything&ct=anything&fbclid=anything',
])('keeps the original destination for absent, ambiguous or malformed input: %s', (search) => {
  expect(getStampShiftDownloadUrl(search)).toBe(stampShiftAppStoreUrl);
});

test('never forwards unrelated query values to Apple', () => {
  expect(getStampShiftDownloadUrl('?ss_campaign=route20-a&pt=evil&ct=evil&url=https%3A%2F%2Fexample.test&fbclid=private')).toBe('https://apps.apple.com/app/apple-store/id6824269145?pt=127568836&ct=ss_meta_r20_a_202611&mt=8');
});
