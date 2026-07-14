import { test, expect } from '@playwright/test';

test('shell renders with nav, sections, footer', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('nav a[href="#work"]')).toHaveText('work');
  await expect(page.locator('nav a[href="#photos"]')).toHaveText('photos');
  await expect(page.locator('nav a[href="#about"]')).toHaveText('about');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Product engineer at Roam');
  await expect(page.locator('footer')).toContainText('Made in New York');
  await expect(page.locator('footer')).toContainText('Fraunces');
});
test('no banned v3 patterns in DOM', async ({ page }) => {
  await page.goto('/');
  expect(await page.locator('.marquee, .typed-text, .timeline-dot').count()).toBe(0);
});
