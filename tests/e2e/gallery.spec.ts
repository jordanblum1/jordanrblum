import { test, expect } from '@playwright/test';

test('contact sheet renders 8 frames and opens lightbox with keyboard nav', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.sheet-frame')).toHaveCount(8);
  await page.locator('.sheet-frame').first().click();
  const dialog = page.locator('dialog#lightbox');
  await expect(dialog).toHaveAttribute('open', '');
  const firstSrc = await dialog.locator('img').getAttribute('src');
  await page.keyboard.press('ArrowRight');
  expect(await dialog.locator('img').getAttribute('src')).not.toBe(firstSrc);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toHaveAttribute('open', '');
});
test('full gallery link present', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('a[href="https://blumblumblum-gallery.vercel.app/"]').first()).toContainText('full gallery');
});
