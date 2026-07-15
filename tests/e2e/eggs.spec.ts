import { test, expect } from '@playwright/test';

test('typing grain toggles darkroom mode', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.type('grain');
  await expect(page.locator('html')).toHaveAttribute('data-grain', 'on');
  // accent flips to safelight red
  const accent = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
  expect(accent.toLowerCase()).toBe('#e6533d');
  await page.keyboard.type('grain');
  await expect(page.locator('html')).not.toHaveAttribute('data-grain', 'on');
});
test('direct navigation never leaves portfolio content hidden', async ({ page }) => {
  await page.goto('/#about');
  await expect(page.locator('#about h2')).toBeVisible();
  await page.goto('/#photos');
  await expect(page.locator('#photos .sheet-frame').first()).toBeVisible();
});
