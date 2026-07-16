// src/scripts/eggs.ts
import { createKeywordDetector } from './keyword';

// A quiet film-grain nod that leaves the light-only palette intact.
const feed = createKeywordDetector('grain', () => {
  const root = document.documentElement;
  if (root.dataset.grain === 'on') delete root.dataset.grain;
  else root.dataset.grain = 'on';
});
addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
  feed(e.key);
});

console.log('%cthere is still a little film grain down here — try typing "grain"', 'font-family: monospace; color: #9C4037;');
console.log('%cjordanblum16@gmail.com', 'font-family: monospace; color: #888;');
