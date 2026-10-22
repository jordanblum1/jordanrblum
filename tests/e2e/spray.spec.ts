import { expect, test, type Page } from '@playwright/test';

// Chromium ships the HTML-in-Canvas API behind this flag. With it, the tag
// stencil is real DOM text drawn into the canvas; the last test runs a plain
// browser to cover the fillText fallback.
test.use({ launchOptions: { args: ['--enable-blink-features=CanvasDrawElement'] } });

const wall = (page: Page) => page.locator('[data-spray-wall]');
const canvas = '[data-spray-canvas]';

async function armWall(page: Page) {
  await page.goto('/');
  const arm = page.getByRole('button', { name: 'Spray paint on the wall' });
  await arm.scrollIntoViewIfNeeded();
  await arm.click();
  await expect(wall(page)).toHaveClass(/is-armed/);
}

// Synthetic pointer strokes dispatched in one task: deterministic, and they
// prove paint follows pointermove itself rather than a sampling timer.
async function strokes(page: Page, paths: [number, number][][]) {
  await page.evaluate(
    ({ paths, selector }) => {
      const el = document.querySelector<HTMLCanvasElement>(selector)!;
      const box = el.getBoundingClientRect();
      const fire = (type: string, [x, y]: [number, number]) =>
        el.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 1, isPrimary: true, clientX: box.left + x, clientY: box.top + y }));
      for (const path of paths) {
        fire('pointerdown', path[0]);
        path.slice(1).forEach((point) => fire('pointermove', point));
        fire('pointerup', path[path.length - 1]);
      }
    },
    { paths, selector: canvas },
  );
}

const squiggle = (x: number, y: number): [number, number][] => Array.from({ length: 12 }, (_, i) => [x + i * 6, y + (i % 2) * 6]);

// Fill the stencil row by row, only where its own pixels are: a careful trace.
async function traceStencil(page: Page) {
  await expect(page.locator('[data-spray-stencil]')).toHaveAttribute('data-mode', /element|text/);
  const rows = await page.evaluate(() => {
    const stencil = document.querySelector<HTMLCanvasElement>('[data-spray-stencil]')!;
    const scale = stencil.width / stencil.getBoundingClientRect().width;
    const { data, width, height } = stencil.getContext('2d')!.getImageData(0, 0, stencil.width, stencil.height);
    const paths: [number, number][][] = [];
    for (let y = 0; y < height; y += Math.round(12 * scale)) {
      let start = -1;
      for (let x = 0; x <= width; x += 1) {
        const on = x < width && data[(y * width + x) * 4 + 3] > 40;
        if (on && start < 0) start = x;
        if (!on && start >= 0) {
          const [a, b] = [start / scale + 5, (x - 1) / scale - 5];
          if (b > a) paths.push(Array.from({ length: Math.ceil((b - a) / 4) + 1 }, (_, i) => [Math.min(a + i * 4, b), y / scale] as [number, number]));
          start = -1;
        }
      }
    }
    return paths;
  });
  expect(rows.length).toBeGreaterThan(10);
  await strokes(page, rows);
}

test('logs the browser and HTML-in-Canvas support', async ({ page, browser }) => {
  await page.goto('/');
  const supported = await page.evaluate(() => 'drawElementImage' in CanvasRenderingContext2D.prototype);
  console.log(`Chromium ${browser.version()}, drawElementImage: ${supported}`);
  test.info().annotations.push({ type: 'html-in-canvas', description: `${browser.version()} ${supported}` });
});

test('spraying once fades in the BLUM stencil, drawn from real DOM text', async ({ page }) => {
  await armWall(page);
  await expect(wall(page)).toHaveAttribute('data-tag', 'off');
  await strokes(page, [squiggle(40, 40)]);
  await expect(wall(page)).toHaveAttribute('data-tag', 'ready');
  await expect(page.locator('[data-spray-stencil]')).toHaveAttribute('data-mode', 'element');
  await expect(page.locator('[data-spray-stencil-word]')).toHaveText('BLUM');
  await expect(page.getByRole('status')).toContainText('10');
  const inked = await page.evaluate(() => {
    const c = document.querySelector<HTMLCanvasElement>('[data-spray-stencil]')!;
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 40) n += 1;
    return n / (c.width * c.height);
  });
  expect(inked).toBeGreaterThan(0.01);
});

test('a careful trace goes up with a crew name and saves the best score', async ({ page }) => {
  await page.clock.install();
  await armWall(page);
  await strokes(page, [squiggle(40, 40)]);
  await expect(wall(page)).toHaveAttribute('data-tag', 'ready');
  await traceStencil(page);
  await page.clock.runFor(10_500);
  await expect(wall(page)).toHaveAttribute('data-tag', 'up');
  await expect(page.getByRole('status')).toContainText(/went up/i);
  await expect(page.getByRole('status')).toContainText(/[A-Z]{3,} [A-Z]{3,}/);
  const best = await page.evaluate(() => Number(localStorage.getItem('jrb-spray-best')));
  expect(best).toBeGreaterThanOrEqual(60);
});

test('a sloppy trace gets buffed after ten seconds and can retry', async ({ page }) => {
  await page.clock.install();
  await armWall(page);
  await strokes(page, [squiggle(40, 40)]);
  await expect(wall(page)).toHaveAttribute('data-tag', 'ready');
  const box = (await page.locator(canvas).boundingBox())!;
  await strokes(page, [squiggle(box.width - 120, box.height - 30)]);
  await expect(wall(page)).toHaveAttribute('data-tag', 'live');
  await page.clock.runFor(10_500);
  await expect(wall(page)).toHaveAttribute('data-tag', 'buffed');
  await expect(page.getByRole('status')).toContainText(/buffed/i);
  await page.getByRole('button', { name: 'Go again' }).click();
  await expect(wall(page)).toHaveAttribute('data-tag', 'ready');
});

test('Escape exits and puts the stencil away', async ({ page }) => {
  await armWall(page);
  await strokes(page, [squiggle(40, 40)]);
  await expect(wall(page)).toHaveAttribute('data-tag', 'ready');
  await page.keyboard.press('Escape');
  await expect(wall(page)).not.toHaveClass(/is-armed/);
  await expect(wall(page)).toHaveAttribute('data-tag', 'off');
  await expect(page.locator('[data-spray-stencil]')).toHaveCSS('opacity', '0');
});

test('touch spraying on a phone shows the stencil', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 664 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto('/');
  const arm = page.getByRole('button', { name: 'Spray paint on the wall' });
  await arm.scrollIntoViewIfNeeded();
  await arm.tap();
  const box = (await page.locator(canvas).boundingBox())!;
  const cdp = await context.newCDPSession(page);
  const points = Array.from({ length: 12 }, (_, i) => ({ x: box.x + 60 + i * 8, y: box.y + box.height * 0.6 }));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [points[0]] });
  for (const point of points) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(wall(page)).toHaveAttribute('data-tag', 'ready');
  await context.close();
});

// --- Regression checks for the Part 1 fixes -------------------------------

test('a fast stroke paints its whole path, not just the timer samples', async ({ page }) => {
  await armWall(page);
  await strokes(page, [Array.from({ length: 9 }, (_, i) => [100 + i * 50, 120] as [number, number])]);
  const alphaAt = await page.evaluate(() => {
    const c = document.querySelector<HTMLCanvasElement>('[data-spray-canvas]')!;
    const s = c.width / c.getBoundingClientRect().width;
    return c.getContext('2d')!.getImageData(Math.round(300 * s), Math.round(120 * s), 1, 1).data[3];
  });
  expect(alphaAt).toBeGreaterThan(40);
});

test('arming hands keyboard focus to a visible tool', async ({ page }) => {
  await armWall(page);
  const focused = page.locator(':focus');
  await expect(focused).toHaveAttribute('aria-label', 'terracotta paint');
  await expect(focused).toBeVisible();
});

test('footer text steps fully aside so it never shows through the toolbar', async ({ page }) => {
  await armWall(page);
  await expect(page.locator('.footer-inner')).toHaveCSS('opacity', '0');
  await expect(page.locator('.footer-inner')).toHaveAttribute('inert', '');
  await page.keyboard.press('Escape');
  await expect(page.locator('.footer-inner')).not.toHaveAttribute('inert', '');
});

test('without HTML-in-Canvas, the fillText stencil still scores a trace', async ({ playwright }) => {
  const plain = await playwright.chromium.launch({ args: [] });
  const page = await plain.newPage({ baseURL: test.info().project.use.baseURL });
  await page.clock.install();
  await armWall(page);
  await strokes(page, [squiggle(40, 40)]);
  await expect(page.locator('[data-spray-stencil]')).toHaveAttribute('data-mode', 'text');
  await traceStencil(page);
  await page.clock.runFor(10_500);
  await expect(wall(page)).toHaveAttribute('data-tag', 'up');
  await plain.close();
});
