// site.ts imports images through Astro's pipeline, which plain Vitest cannot resolve.
// Assert content invariants against source text instead.
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const src = readFileSync('src/data/site.ts', 'utf8');
const projectsBlock = src.slice(src.indexOf('export const projects'), src.indexOf('export const about'));
const photosBlock = src.slice(src.indexOf('export const contactSheet'), src.indexOf('export const gallery'));

test('all seven projects have a public link and an artifact', () => {
  expect((projectsBlock.match(/title:/g) ?? []).length).toBe(7);
  expect((projectsBlock.match(/href: 'https:\/\//g) ?? []).length).toBe(7);
  expect((projectsBlock.match(/artifact: '/g) ?? []).length).toBe(7);
});

test('banned and stale projects are absent', () => {
  for (const banned of ['mission-control', 'trackthatpoop', 'jordans-jams', 'ShipSwift', 'dondachi', 'spotify']) {
    expect(src).not.toContain(banned);
  }
});

test('the site only imports the four confirmed gallery photos', () => {
  const photoImports = src.match(/assets\/photos\/[^']+/g) ?? [];
  expect(photoImports).toEqual([
    'assets/photos/photo0001.jpg',
    'assets/photos/photo0020.jpg',
    'assets/photos/photo0030.jpg',
    'assets/photos/photo0040.jpg',
  ]);
  expect((photosBlock.match(/alt: '/g) ?? []).length).toBe(4);
  for (const stock of ['sunset-beach', 'portfolio-3', 'cali-mountains', 'chicago-skyline']) {
    expect(src).not.toContain(stock);
  }
});

test('copy avoids the previous tech-bro claims', () => {
  for (const phrase of ['AI-native', 'fleet of agents', 'unreasonable rigor', 'merge velocity', '419 PRs']) {
    expect(src).not.toContain(phrase);
  }
});

test('public resume facts stay aligned with the canonical resume', () => {
  expect(src).toContain('Studio Art minor');
  expect(src).not.toContain('two majors');
  expect(src).toContain('mailto:jordanblum16@gmail.com');
});
