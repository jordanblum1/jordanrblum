import { expect, test, type Page } from '@playwright/test';

const STORAGE_KEY = 'jrb-spray-wall-v1';
const SEED_FLAG = 'spray-wall-restore-race-seeded';
const RELEASE_RESTORE_EVENT = 'spray-wall-test-release-restore';
const wall = (page: Page) => page.locator('[data-spray-wall]');
const canvas = (page: Page) => page.locator('[data-spray-canvas]');

async function gateSavedRestore(page: Page, corrupt = false) {
  await page.addInitScript(
    ({ storageKey, seedFlag, releaseEvent, corrupt }) => {
      if (sessionStorage.getItem(seedFlag) !== 'true') {
        if (corrupt) {
          localStorage.setItem(storageKey, 'data:image/png;base64,not-valid');
        } else {
          const seed = document.createElement('canvas');
          seed.width = 400;
          seed.height = 240;
          const context = seed.getContext('2d')!;
          context.fillStyle = '#9c4037';
          context.fillRect(20, 48, 100, 100);
          localStorage.setItem(storageKey, seed.toDataURL('image/png'));
        }
        sessionStorage.setItem(seedFlag, 'true');
      }

      const NativeImage = window.Image;
      const nativeSrc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src')!;
      const pending: Array<() => void> = [];
      window.addEventListener(releaseEvent, () => pending.splice(0).forEach((release) => release()));
      const DelayedImage = function (width?: number, height?: number) {
        const image = new NativeImage(width, height);
        Object.defineProperty(image, 'src', {
          configurable: true,
          get: () => nativeSrc.get!.call(image),
          set: (value: string) => pending.push(() => nativeSrc.set!.call(image, value)),
        });
        return image;
      };
      Object.defineProperty(window, 'Image', { configurable: true, writable: true, value: DelayedImage });
    },
    { storageKey: STORAGE_KEY, seedFlag: SEED_FLAG, releaseEvent: RELEASE_RESTORE_EVENT, corrupt },
  );
}

async function releaseSavedRestore(page: Page) {
  await page.evaluate((eventName) => window.dispatchEvent(new Event(eventName)), RELEASE_RESTORE_EVENT);
}

async function openWall(page: Page) {
  await page.goto('/');
  const arm = page.getByRole('button', { name: 'Spray paint on the wall' });
  await arm.scrollIntoViewIfNeeded();
  await arm.click();
  await expect(wall(page)).toHaveClass(/is-armed/);

  await page.getByRole('button', { name: 'Fat cap' }).click();
  await expect(page.locator('[data-spray-nozzle="fat"]')).toHaveClass(/is-selected/);
}

async function safePaintPoint(page: Page) {
  const paint = canvas(page);
  await paint.scrollIntoViewIfNeeded();
  const box = await paint.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();

  const visibleLeft = Math.max(0, box!.x);
  const visibleRight = Math.min(viewport!.width, box!.x + box!.width);
  const visibleTop = Math.max(0, box!.y);
  const visibleBottom = Math.min(viewport!.height, box!.y + box!.height);
  expect(visibleRight - visibleLeft).toBeGreaterThan(160);
  expect(visibleBottom - visibleTop).toBeGreaterThan(120);

  // Upper-right stays clear of the bottom-left tool shelf on desktop and on
  // the taller mobile footer.
  return {
    x: visibleRight - Math.min(80, (visibleRight - visibleLeft) * 0.18),
    y: visibleTop + (visibleBottom - visibleTop) * 0.32,
  };
}

async function paintStroke(page: Page, holdMs = 0) {
  const point = await safePaintPoint(page);
  await page.mouse.move(point.x - 72, point.y + 10);
  await page.mouse.down();
  await page.mouse.move(point.x, point.y, { steps: 12 });
  if (holdMs) await page.waitForTimeout(holdMs);
  await page.mouse.up();
}

async function alphaPixels(page: Page) {
  return canvas(page).evaluate((element) => {
    if (!(element instanceof HTMLCanvasElement)) throw new Error('Spray canvas is not a canvas element');
    const context = element.getContext('2d')!;
    const pixels = context.getImageData(0, 0, element.width, element.height).data;
    let count = 0;
    for (let index = 3; index < pixels.length; index += 4) {
      if (pixels[index] > 0) count += 1;
    }
    return count;
  });
}

async function alphaPixelsBySide(page: Page) {
  return canvas(page).evaluate((element) => {
    if (!(element instanceof HTMLCanvasElement)) throw new Error('Spray canvas is not a canvas element');
    const { data, width, height } = element.getContext('2d')!.getImageData(0, 0, element.width, element.height);
    let left = 0;
    let right = 0;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (data[(y * width + x) * 4 + 3] === 0) continue;
        if (x < width * 0.4) left += 1;
        if (x > width * 0.6) right += 1;
      }
    }
    return { left, right };
  });
}

async function expectPaint(page: Page) {
  await expect.poll(() => alphaPixels(page), { timeout: 5000 }).toBeGreaterThan(100);
}

async function expectEmpty(page: Page) {
  await expect.poll(() => alphaPixels(page), { timeout: 5000 }).toBe(0);
}

test('paint remains visible after Stop, reloads before arming, and survives a viewport resize', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 800 });
  const imageLeaks: string[] = [];
  page.on('request', (request) => {
    const transfer = `${request.url()}\n${request.postData() ?? ''}`;
    if (/data:image\/(?:avif|jpeg|png|webp)|jrb-spray-wall-v1/i.test(transfer)) {
      imageLeaks.push(`${request.method()} ${request.url()}`);
    }
  });

  await openWall(page);
  await paintStroke(page);
  await expectPaint(page);
  await page.getByRole('button', { name: 'Stop spraying' }).click();
  await expect(wall(page)).not.toHaveClass(/is-armed/);
  await expectPaint(page);
  expect(await page.evaluate((key) => localStorage.getItem(key)?.length ?? 0, STORAGE_KEY)).toBeGreaterThan(100);

  await page.reload();
  await expect(wall(page)).not.toHaveClass(/is-armed/);
  await expectPaint(page);
  const originalSize = await canvas(page).evaluate((element) => {
    if (!(element instanceof HTMLCanvasElement)) throw new Error('Spray canvas is not a canvas element');
    return `${element.width}x${element.height}`;
  });

  await page.setViewportSize({ width: 840, height: 720 });
  await expect
    .poll(() =>
      canvas(page).evaluate((element) => {
        if (!(element instanceof HTMLCanvasElement)) throw new Error('Spray canvas is not a canvas element');
        return `${element.width}x${element.height}`;
      }),
    )
    .not.toBe(originalSize);
  await expectPaint(page);
  expect(imageLeaks).toEqual([]);
});

test('tools wait for saved paint to decode across reload, then preserve it through paint and Undo', async ({ page }) => {
  await gateSavedRestore(page);
  await page.goto('/');
  const arm = page.getByRole('button', { name: 'Spray paint on the wall' });
  await expect(arm).toBeDisabled();
  await expectEmpty(page);
  const originalSavedWall = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
  expect(originalSavedWall).toMatch(/^data:image\/png;base64,/);

  await page.reload();
  await expect(arm).toBeDisabled();
  await expectEmpty(page);
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe(originalSavedWall);

  await releaseSavedRestore(page);
  await expect(arm).toBeEnabled();
  await expect.poll(async () => (await alphaPixelsBySide(page)).left).toBeGreaterThan(100);
  await expect.poll(async () => (await alphaPixelsBySide(page)).right).toBe(0);

  await arm.scrollIntoViewIfNeeded();
  await arm.click();
  await page.getByRole('button', { name: 'Fat cap' }).click();
  await paintStroke(page);
  await expect.poll(async () => (await alphaPixelsBySide(page)).left).toBeGreaterThan(100);
  await expect.poll(async () => (await alphaPixelsBySide(page)).right).toBeGreaterThan(100);

  await page.getByRole('button', { name: 'Undo last stroke' }).click();
  await expect.poll(async () => (await alphaPixelsBySide(page)).left).toBeGreaterThan(100);
  await expect.poll(async () => (await alphaPixelsBySide(page)).right).toBe(0);

  await page.reload();
  await expect(arm).toBeDisabled();
  await releaseSavedRestore(page);
  await expect(arm).toBeEnabled();
  await expect.poll(async () => (await alphaPixelsBySide(page)).left).toBeGreaterThan(100);
  await expect.poll(async () => (await alphaPixelsBySide(page)).right).toBe(0);
});

test('a corrupt saved image unlocks the tools on error so paint and Clear still work', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await gateSavedRestore(page, true);
  await page.goto('/');
  const arm = page.getByRole('button', { name: 'Spray paint on the wall' });
  await expect(arm).toBeDisabled();

  await releaseSavedRestore(page);
  await expect(arm).toBeEnabled();
  await expectEmpty(page);

  await arm.scrollIntoViewIfNeeded();
  await arm.click();
  await page.getByRole('button', { name: 'Fat cap' }).click();
  await paintStroke(page);
  await expectPaint(page);
  await page.getByRole('button', { name: 'Clear wall' }).click();
  await expectEmpty(page);
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull();
});

test('Clear wall animates, removes persisted paint, and cannot resurrect it on reload', async ({ page }, testInfo) => {
  await openWall(page);
  await paintStroke(page);
  await expectPaint(page);
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).not.toBeNull();

  const startedAt = Date.now();
  await page.getByRole('button', { name: 'Clear wall' }).click();
  await expect(wall(page)).toHaveAttribute('data-spray-clearing', 'true');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: testInfo.outputPath('clear-wall.png') });
  await expect(wall(page)).toHaveAttribute('data-spray-clearing', 'true');
  await expect(wall(page)).not.toHaveAttribute('data-spray-clearing', 'true', { timeout: 4000 });
  expect(Date.now() - startedAt).toBeGreaterThan(1200);

  await expectEmpty(page);
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull();
  await page.reload();
  await expectEmpty(page);
});

test('reloading during Clear cannot restore the paint being removed', async ({ page }) => {
  await openWall(page);
  await paintStroke(page);
  await expectPaint(page);
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).not.toBeNull();

  await page.getByRole('button', { name: 'Clear wall' }).click();
  await expect(wall(page)).toHaveAttribute('data-spray-clearing', 'true');
  await page.reload();

  await expect(wall(page)).not.toHaveClass(/is-armed/);
  await expectEmpty(page);
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull();
});

test('Escape finishes Clear, restores footer access, and permits fresh paint', async ({ page, browserName }) => {
  await openWall(page);
  await paintStroke(page);
  await expectPaint(page);

  await page.getByRole('button', { name: 'Clear wall' }).click();
  await expect(wall(page)).toHaveAttribute('data-spray-clearing', 'true');
  await page.keyboard.press('Escape');

  await expect(wall(page)).not.toHaveClass(/is-armed/);
  await expect(wall(page)).not.toHaveAttribute('data-spray-clearing', 'true');
  await expectEmpty(page);
  const footer = page.locator('.footer-inner');
  const footerLink = page.getByRole('link', { name: 'Want to work with me?' });
  await expect(footer).not.toHaveAttribute('inert', '');
  await expect(footerLink).toBeVisible();
  await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
  await expect(footerLink).toBeFocused();

  await page.getByRole('button', { name: 'Spray paint on the wall' }).click();
  await expect(wall(page)).toHaveClass(/is-armed/);
  await page.getByRole('button', { name: 'Fat cap' }).click();
  await paintStroke(page);
  await expectPaint(page);
});

test('reduced motion clears immediately and announces the result', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openWall(page);
  await paintStroke(page);
  await expectPaint(page);

  await page.getByRole('button', { name: 'Clear wall' }).click();
  await expect(wall(page)).not.toHaveAttribute('data-spray-clearing', 'true');
  await expectEmpty(page);
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull();
  await expect(page.getByRole('status').filter({ hasText: /clear/i })).toBeAttached();
});

test('painting and clearing still work when browser storage is denied', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    for (const method of ['getItem', 'setItem', 'removeItem'] as const) {
      Object.defineProperty(Storage.prototype, method, {
        configurable: true,
        value: () => {
          throw new DOMException('Storage denied by test', 'SecurityError');
        },
      });
    }
  });

  await openWall(page);
  await paintStroke(page);
  await expectPaint(page);
  await page.getByRole('button', { name: 'Clear wall' }).click();
  await expect(wall(page)).not.toHaveAttribute('data-spray-clearing', 'true', { timeout: 4000 });
  await expectEmpty(page);
});

test('undo cancels live drips so they cannot repaint the restored snapshot', async ({ page }) => {
  await openWall(page);
  // A held fat cap builds enough paint to start a drip before pointerup.
  await paintStroke(page, 2200);
  await expectPaint(page);

  await page.getByRole('button', { name: 'Undo last stroke' }).click();
  await expectEmpty(page);
  await page.waitForTimeout(750);
  expect(await alphaPixels(page)).toBe(0);
});
