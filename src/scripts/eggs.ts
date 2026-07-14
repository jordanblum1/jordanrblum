// src/scripts/eggs.ts
import { createKeywordDetector } from './keyword';

// Egg 1: darkroom mode
const feed = createKeywordDetector('grain', () => {
  const root = document.documentElement;
  if (root.dataset.grain === 'on') delete root.dataset.grain;
  else root.dataset.grain = 'on';
});
addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
  feed(e.key);
});

// Egg 3: console note (Egg 2, the facedown print, lives in lighttable.ts)
console.log('%cdeveloped in the darkroom — try typing "grain"', 'font-family: monospace; color: #2F6B39;');
console.log('%cjordanblum19@gmail.com', 'font-family: monospace; color: #888;');

// Global reveal observer for .reveal outside the light table
const io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
}, { rootMargin: '0px 0px -60px 0px', threshold: 0.1 });
document.querySelectorAll('.reveal:not(.print)').forEach((el) => io.observe(el));
