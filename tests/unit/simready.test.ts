import { existsSync, readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const route = 'src/pages/labs/simready.astro';

test('the unlisted SimReady Concept Lab route exists', () => {
  expect(existsSync(route), 'Expected /labs/simready to exist').toBe(true);
  expect(readFileSync(route, 'utf8')).toContain('SimReady Concept Lab');
});

const read = (path: string) => existsSync(path) ? readFileSync(path, 'utf8') : '';

test('exactly three authored concepts use the required pinned assets', async () => {
  const { concepts, assetUrl } = await import('../../src/data/simready');
  expect(concepts.map(({ number, title }) => `${number} ${title}`)).toEqual(['01 Dispatch', '02 Working Set', '03 Counter Study']);
  expect(concepts.map(({ asset }) => assetUrl(asset))).toEqual([
    'https://huggingface.co/datasets/nvidia/simready-assets/resolve/524747d9b5e1f21b5b18b56041788c01d745f1a1/conveyor_belt_a02/simready_usd/sm_conveyor_belt_a02_01.usd',
    'https://huggingface.co/datasets/nvidia/simready-assets/resolve/524747d9b5e1f21b5b18b56041788c01d745f1a1/chair_office_amf_black_a01/simready_usd/sm_chair_office_amf_black_a01_01.usd',
    'https://huggingface.co/datasets/nvidia/simready-assets/resolve/524747d9b5e1f21b5b18b56041788c01d745f1a1/food_beverage_coffeeCup_a01/simready_usd/sm_food_beverage_coffeeCup_a01_01.usd',
  ]);
});

test('the lab is unlisted and contains accessible tabs, status and attribution', () => {
  const page = read(route);
  for (const content of ['noindex, nofollow', 'role="tablist"', 'role="tab"', 'role="tabpanel"', 'aria-controls=', 'aria-labelledby=', 'aria-selected=', 'role="status"', 'aria-live="polite"', 'Visual preview, not physics simulation', 'NVIDIA SimReady', 'Hugging Face', 'CC-BY-4.0']) expect(page).toContain(content);
  for (const path of ['src/components/Nav.astro', 'src/components/Footer.astro', 'src/data/site.ts', 'src/pages/index.astro', 'public/llms.txt']) expect(read(path)).not.toContain('/labs/simready');
  expect(page).not.toMatch(/ChatWidget|analytics|fetch\(/);
});

test('the viewer is bounded and fallback illustrations have distinct controls', () => {
  const stage = read('src/scripts/simready-stage.ts');
  for (const limit of ['maxTextureSize: 1024', 'maxTriangles: 1_000_000', 'maxInstances: 10_000', "textures: 'preview'"]) expect(stage).toContain(limit);
  const page = read(route);
  for (const control of ['data-route', 'data-explode', 'data-light', 'data-motion', 'data-reset']) expect(page).toContain(control);
  const art = read('src/components/simready/Illustration.astro');
  for (const id of ['dispatch', 'working-set', 'counter-study']) expect(art).toContain(`concept === '${id}'`);
  expect(read('src/styles/simready.css')).toContain('prefers-reduced-motion:reduce');
});
