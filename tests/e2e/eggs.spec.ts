import { expect, test } from '@playwright/test';

test('typing grain toggles darkroom mode', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.type('grain');
  await expect(page.locator('html')).toHaveAttribute('data-grain', 'on');

  const accent = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
  expect(accent.toLowerCase()).toBe('#e6533d');

  await page.keyboard.type('grain');
  await expect(page.locator('html')).not.toHaveAttribute('data-grain', 'on');
});

test('direct hash navigation never leaves portfolio content hidden', async ({ page }) => {
  await page.goto('/#work');
  await expect(page.locator('#work').getByRole('heading', { level: 2 })).toBeVisible();
  await expect(page.locator('#work .experience-list > li').first()).toBeVisible();

  await page.goto('/about#roam');
  await expect(page.locator('#roam')).toBeVisible();
  await expect(page.locator('#roam')).toContainText('Product Engineer');
});
