import { test, expect } from '@playwright/test';

test('shell renders with nav, sections, footer', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('nav a[href="#work"]')).toHaveText('work');
  await expect(page.locator('nav a[href="#projects"]')).toHaveText('things');
  await expect(page.locator('nav a[href="#about"]')).toHaveText('about');
  await expect(page.locator('nav[aria-label="Primary"] a[href="mailto:jordanblum16@gmail.com"]')).toHaveText('email ↗');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('I work on Reed at Roam');
  await expect(page.getByRole('contentinfo')).toContainText('Made in New York');
  await expect(page.getByRole('contentinfo')).toContainText('Fraunces');
});

test('document metadata and keyboard skip link are present', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Jordan Blum — Product Engineer in New York');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://jordanrblum.com/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'https://jordanrblum.com/og-image.png');

  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
});

test('no banned v3 patterns in DOM', async ({ page }) => {
  await page.goto('/');
  expect(await page.locator('.marquee, .typed-text, .timeline-dot').count()).toBe(0);
});

test('custom 404 keeps the site voice and a route home', async ({ page }) => {
  const response = await page.goto('/definitely-missing');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('This one wandered off.');
  await expect(page.getByRole('link', { name: /Back home/ })).toHaveAttribute('href', '/');
});
