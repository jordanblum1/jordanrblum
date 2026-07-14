import { createKeywordDetector } from '../../src/scripts/keyword';

test('fires on exact sequence', () => {
  let hits = 0;
  const feed = createKeywordDetector('grain', () => hits++);
  for (const k of 'xxgrain') feed(k);
  expect(hits).toBe(1);
});
test('case-insensitive and resets after match', () => {
  let hits = 0;
  const feed = createKeywordDetector('grain', () => hits++);
  for (const k of 'GRAINgrain') feed(k);
  expect(hits).toBe(2);
});
test('interleaved noise prevents match', () => {
  let hits = 0;
  const feed = createKeywordDetector('grain', () => hits++);
  for (const k of 'g r a i n'.split('')) feed(k);
  expect(hits).toBe(0);
});
