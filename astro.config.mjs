import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://blumjordan.com',
  vite: { plugins: [tailwindcss()] },
  // Inline the single bundled stylesheet directly into the page <head> instead of
  // a render-blocking <link>. Lighthouse's render-blocking-requests audit flagged
  // the 21KB global.css bundle as costing ~1s of FCP/LCP under simulated mobile
  // network conditions (an extra connection + download round-trip before any paint
  // can happen) — with only one page and one CSS bundle, inlining removes that
  // network hop entirely at negligible HTML-size cost.
  build: { inlineStylesheets: 'always' },
});
