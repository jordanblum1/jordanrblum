// src/scripts/eggs.ts
import { createKeywordDetector } from './keyword';

// A quiet nod to the old darkroom version of the site.
const feed = createKeywordDetector('grain', () => {
  const root = document.documentElement;
  if (root.dataset.grain === 'on') delete root.dataset.grain;
  else root.dataset.grain = 'on';
});
addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
  feed(e.key);
});

console.log('%cthe darkroom is still down here — try typing "grain"', 'font-family: monospace; color: #9C4037;');
console.log('%cjordanblum16@gmail.com', 'font-family: monospace; color: #888;');
