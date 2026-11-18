import { expect, test } from '@playwright/test';

for (const path of ['/#contact', '/contact']) {
  test(`incoming ${path} shows the homepage before opening`, async ({ page }) => {
    await page.clock.install();
    await page.clock.pauseAt(new Date(Date.now() + 1000));
    await page.goto(path);
    await expect(page).toHaveURL(/#contact$/);
    await expect(page.getByRole('button', { name: 'Contact', exact: true })).toBeVisible();
    await page.clock.runFor(100);
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.clock.runFor(600);
    await expect(page.getByRole('dialog')).toBeHidden();
    await page.clock.runFor(600);
    await expect(page.getByLabel('Name', { exact: true })).toBeFocused();
  });
}

test('an explicit click bypasses and cancels the arrival delay', async ({ page }) => {
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.goto('/#contact');
  await page.getByRole('button', { name: 'Contact', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.clock.runFor(550);
  await page.getByRole('button', { name: 'Close contact form' }).click();
  await page.clock.runFor(1000);
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page).not.toHaveURL(/#contact$/);
});

test('leaving the contact hash during arrival cancels the pending open', async ({ page }) => {
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.goto('/#contact');
  await expect(page.getByRole('button', { name: 'Contact', exact: true })).toBeVisible();
  await page.evaluate(() => { location.hash = ''; });
  await page.clock.runFor(1500);
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.evaluate(() => { location.hash = 'contact'; });
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('Contact from Work skips the outside-arrival delay', async ({ page }) => {
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.goto('/work');
  await page.getByRole('navigation', { name: 'Studio' }).getByRole('link', { name: 'Contact', exact: true }).click();
  await expect(page).toHaveURL(/#contact$/);
  // The morph starts immediately, before advancing the paused arrival clock.
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.clock.runFor(550);
  await expect(page.getByLabel('Name', { exact: true })).toBeFocused();
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 375, height: 812 }, { width: 375, height: 420 }]) {
  test(`autofill viewport coordinates stay aligned in ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.getByRole('button', { name: 'Contact', exact: true }).click();
    await expect(page.getByLabel('Name', { exact: true })).toBeFocused();
    const alignment = await page.locator('dialog').evaluate(dialog => {
      const field = dialog.querySelector('input[name="name"]')!.getBoundingClientRect();
      // Emulate only the extension's viewport-fixed positioning, never vault contents.
      const probe = document.createElement('div');
      probe.style.cssText = `position:fixed;left:${field.right - 24}px;top:${field.top}px;width:24px;height:24px`;
      dialog.append(probe);
      const actual = probe.getBoundingClientRect();
      probe.remove();
      return { x: actual.x - (field.right - 24), y: actual.y - field.top };
    });
    expect(Math.abs(alignment.x)).toBeLessThan(1);
    expect(Math.abs(alignment.y)).toBeLessThan(1);
  });
}
