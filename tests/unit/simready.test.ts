import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { concepts, assetUrl } from '../../src/data/simready';

const read = (path: string) => readFileSync(path, 'utf8');
const route = 'src/pages/labs/simready.astro';

test('exactly three homepage placements share the required revision-pinned spray can', () => {
  expect(concepts.map(({ id, title }) => [id, title])).toEqual([
    ['workbench', 'Workbench'], ['hero-accent', 'Hero Accent'], ['about-signature', 'About Signature'],
  ]);
  expect(concepts.map(({ description }) => description)).toEqual([
    'Adds an interactive spray can to the existing BLUM workbench.',
    'Adds the can as a small foreground detail while Jordan’s portrait stays primary.',
    'Adds the can to the existing collage as a quiet studio signature.',
  ]);
  expect(concepts.map(({ asset }) => assetUrl(asset))).toEqual(Array(3).fill(
    'https://huggingface.co/datasets/nvidia/simready-assets/resolve/524747d9b5e1f21b5b18b56041788c01d745f1a1/paint_container_spraycan_a01/simready_usd/sm_paint_container_spraycan_a01_01.usd',
  ));
});

test('the comparison is unlisted, has accessible tabs/status and keeps production discovery unchanged', () => {
  const page = read(route);
  for (const content of ['noindex, nofollow', 'role="tablist"', 'role="tab"', 'role="tabpanel"', 'aria-controls=', 'aria-labelledby=', 'aria-selected=', 'role="status"', 'aria-live="polite"', 'Visual preview, not physics simulation', 'NVIDIA SimReady', 'Hugging Face', 'CC-BY-4.0']) expect(page).toContain(content);
  for (const path of ['src/components/Nav.astro', 'src/components/Footer.astro', 'src/data/site.ts', 'src/pages/index.astro', 'public/llms.txt']) expect(read(path)).not.toContain('/labs/simready');
  expect(page).not.toMatch(/ChatWidget|analytics|fetch\(/);
});

test('homepage prototypes consume actual copy, portrait, field, collage and identity assets', () => {
  const preview = read('src/components/simready/HomepagePreview.astro');
  for (const content of ['hero.statement', 'hero.support', 'about.title', 'about.paragraphs[0]', 'about.paragraphs[2]', 'jordan-portrait-blue.png', 'blum-mark.svg', 'field-wash.webp', 'blum-collage.png', 'blum-tag-logo.png']) expect(preview).toContain(content);
  expect(read(route)).toContain('jrb-logo-red.png');
  expect(read(route)).toContain('Recommended');
});

test('only the spray-can fallback and direct manipulation survive the technical lab', () => {
  const page = read(route) + read('src/styles/simready.css') + read('src/scripts/simready-stage.ts');
  expect(page).not.toMatch(/data-route|data-explode|data-light|data-motion|data-reset|data-warnings/);
  expect(read('src/components/simready/SprayCan.astro')).toContain('Spray can illustration');
  expect(read('src/styles/simready.css')).toContain('prefers-reduced-motion: reduce');
});
