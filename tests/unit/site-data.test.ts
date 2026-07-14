// NOTE: site.ts imports images via Astro's pipeline, which Vitest can't resolve.
// Assert the invariants against the SOURCE TEXT instead — keeps the rule enforced without an Astro test harness.
import { readFileSync } from 'node:fs';
const src = readFileSync('src/data/site.ts', 'utf8');

import { test, expect } from 'vitest';

test('every project row has an https href (public-link rule)', () => {
  const projectsBlock = src.slice(src.indexOf('export const projects'), src.indexOf('export const contactSheet'));
  const rows = projectsBlock.match(/\{ title:/g) ?? [];
  const hrefs = projectsBlock.match(/href: 'https:\/\//g) ?? [];
  expect(rows.length).toBe(7);
  expect(hrefs.length).toBe(rows.length);
});

test('banned projects are absent', () => {
  for (const banned of ['mission-control', 'trackthatpoop', 'jordans-jams', 'ShipSwift', 'dondachi', 'spotify']) {
    expect(src).not.toContain(banned);
  }
});

test('alt text everywhere a photo appears', () => {
  const altCount = (src.match(/alt: '/g) ?? []).length;
  expect(altCount).toBeGreaterThanOrEqual(15);
});
