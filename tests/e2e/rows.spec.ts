import { test, expect } from '@playwright/test';

test('experience and project indexes render with dates and real links', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.row')).toHaveCount(3);
  await expect(page.locator('.project-row')).toHaveCount(7);
  await expect(page.locator('.row', { hasText: 'Procore' })).toContainText('2021—2025');
  const chicks = page.locator('a.project-row[href="https://chicksofnyc.com"]');
  await expect(chicks).toHaveCount(1);
});

test('each side project has a distinct artifact and plainspoken description', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.project-artifact')).toHaveCount(7);
  await expect(page.locator('.project-row', { hasText: 'Alive Still' })).toContainText('daily safety check-in');
  await expect(page.locator('.project-row', { hasText: 'Chicks of NYC' })).toContainText('chicken wings we actually ate');
});
