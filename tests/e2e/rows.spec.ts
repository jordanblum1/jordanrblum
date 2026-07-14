import { test, expect } from '@playwright/test';

test('experience and project rows render with dates and hairlines', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.row')).toHaveCount(11); // 4 experience + 7 projects
  await expect(page.locator('.row', { hasText: 'Procore' })).toContainText('2021–2025');
  const chicks = page.locator('a.row[href="https://chicksofnyc.com"]');
  await expect(chicks).toHaveCount(1);
});
test('project thumbs hidden until hover', async ({ page }) => {
  await page.goto('/');
  await page.mouse.move(10, 10); // trigger pointer-moved gate
  const row = page.locator('.row', { hasText: 'chicksofnyc' });
  const thumb = row.locator('.thumb');
  await expect(thumb).toHaveCSS('opacity', '0');
  await row.hover();
  await expect(thumb).not.toHaveCSS('opacity', '0');
});
