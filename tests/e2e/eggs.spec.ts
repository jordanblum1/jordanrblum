import { expect, test } from '@playwright/test';

test('typing grain toggles the film-grain accent without changing the light palette', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.type('grain');
  await expect(page.locator('html')).toHaveAttribute('data-grain', 'on');

  const accent = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
  expect(accent.toLowerCase()).toBe('#e6533d');
  const paper = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--paper').trim());
  expect(paper.toLowerCase()).toBe('#f7f3ed');

  await page.keyboard.type('grain');
  await expect(page.locator('html')).not.toHaveAttribute('data-grain', 'on');
});

// Real clicks (not element.click() in page JS) so these fail if any layer
// covers the controls — the footer content block once swallowed every tap.
test('the spray can arms paint mode with a real click and Escape disarms it', async ({ page }) => {
  await page.goto('/');
  const arm = page.getByRole('button', { name: 'Spray paint on the wall' });
  await arm.scrollIntoViewIfNeeded();
  await arm.click();
  await expect(page.locator('.spray-wall')).toHaveClass(/is-armed/);

  await page.keyboard.press('Escape');
  await expect(page.locator('.spray-wall')).not.toHaveClass(/is-armed/);
});

test('the spray can and toolbar are tappable on a phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const arm = page.getByRole('button', { name: 'Spray paint on the wall' });
  await arm.scrollIntoViewIfNeeded();
  await arm.click();
  await expect(page.locator('.spray-wall')).toHaveClass(/is-armed/);

  await page.getByRole('button', { name: 'Fat cap' }).click();
  await expect(page.locator('[data-spray-nozzle="fat"]')).toHaveClass(/is-selected/);

  await page.getByRole('button', { name: 'Stop spraying' }).click();
  await expect(page.locator('.spray-wall')).not.toHaveClass(/is-armed/);
});

test('direct hash navigation never leaves portfolio content hidden', async ({ page }) => {
  await page.goto('/#work');
  await expect(page.locator('#work').getByRole('heading', { level: 2 })).toBeVisible();
  await expect(page.locator('#work .experience-list > li').first()).toBeVisible();

  await page.goto('/about#roam');
  await expect(page.locator('#roam')).toBeVisible();
  await expect(page.locator('#roam')).toContainText('Product Engineer');
});

test('typing develop hangs a darkroom print of real page text; Escape and click-away put it away', async ({ page }) => {
  await page.goto('/');
  const statement = (await page.locator('#hero-title').textContent())!.trim();

  await page.keyboard.type('develop');
  const print = page.getByRole('dialog', { name: 'Darkroom print' });
  await expect(print).toBeVisible();
  // Real DOM text, not a picture of it: findable, selectable, and in the a11y tree.
  await expect(print.getByText(statement)).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(print).toHaveCount(0);

  await page.keyboard.type('develop');
  await expect(print).toBeVisible();
  await page.mouse.click(8, 8);
  await expect(print).toHaveCount(0);
});

// Chromium ships HTML-in-Canvas behind a flag until the origin trial ends,
// so this test launches its own flagged browser to cover the canvas path.
test('with HTML-in-Canvas, the print develops on a WebGL canvas that still holds the real text', async ({ playwright, baseURL }) => {
  const browser = await playwright.chromium.launch({ args: ['--enable-blink-features=CanvasDrawElement'] });
  const page = await browser.newPage({ baseURL });
  await page.goto('/');
  test.skip(!(await page.evaluate(() => 'onpaint' in HTMLCanvasElement.prototype)), 'this Chromium has no HTML-in-Canvas');
  const statement = (await page.locator('#hero-title').textContent())!.trim();

  await page.keyboard.type('develop');
  const plate = page.getByRole('dialog', { name: 'Darkroom print' }).locator('canvas');
  await expect(plate.getByText(statement)).toBeAttached();

  // Once developed, the canvas pixels carry the text: not blank paper.
  const { default: sharp } = await import('sharp');
  await expect.poll(async () => {
    const { channels } = await sharp(await plate.screenshot()).stats();
    return channels[0].stdev;
  }, { timeout: 6000 }).toBeGreaterThan(20);
  await browser.close();
});
