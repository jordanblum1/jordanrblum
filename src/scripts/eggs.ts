// src/scripts/eggs.ts
import { createKeywordDetector } from './keyword';

// A quiet film-grain nod that leaves the light-only palette intact.
const feed = createKeywordDetector('grain', () => {
  const root = document.documentElement;
  if (root.dataset.grain === 'on') delete root.dataset.grain;
  else root.dataset.grain = 'on';
});
// A darkroom print of the page's own words; the module loads only on demand.
const develop = createKeywordDetector('develop', () => {
  void import('./darkroom').then((m) => m.toggleDarkroom());
});
addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
  feed(e.key);
  develop(e.key);
});

// Five fast hits on the hero portrait arm a game of whack-a-Jordan.
const portrait = document.querySelector<HTMLElement>('[data-portrait-panel]');
let hits: number[] = [];
portrait?.addEventListener('click', (e) => {
  hits = [...hits, e.timeStamp].filter((t) => e.timeStamp - t < 1500);
  if (hits.length < 5) return;
  hits = [];
  void import('./portrait-whack').then((m) => m.armWhack(portrait));
});

console.log('%cthere is still a little film grain down here — try typing "grain", or "develop"', 'font-family: monospace; color: #9C4037;');
console.log('%cjordanblum16@gmail.com', 'font-family: monospace; color: #888;');
