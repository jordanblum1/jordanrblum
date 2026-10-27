import { expect, test } from '@playwright/test';

const routes = ['/apps', '/apps/stamp-shift', '/apps/stamp-shift/support', '/apps/stamp-shift/privacy'];

for (const width of [1280, 390]) {
  test(`app docs stay static and readable at ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    const scripts: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('request', (request) => { if (request.resourceType() === 'script') scripts.push(request.url()); });
    await page.setViewportSize({ width, height: 900 });

    for (const route of routes) {
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://jordanblum.com${route}`);
      await expect(page.locator('[data-chat-widget], [data-chat-trigger]')).toHaveCount(0);
      await expect(page.locator('script')).toHaveCount(route === '/apps/stamp-shift' ? 1 : 0);
      await expect(page.locator('body')).not.toContainText('UNCONFIGURED');
      const dimensions = await page.evaluate(() => ({ width: innerWidth, document: document.documentElement.scrollWidth }));
      expect(dimensions.document).toBeLessThanOrEqual(dimensions.width + 1);
    }
    expect(errors).toEqual([]);
    expect(scripts.every(url => url.includes('/_astro/'))).toBe(true);
  });
}

test('a player can find restore help, privacy and the support email without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto('/apps');
  await page.getByRole('link', { name: 'Stamp Shift', exact: true }).click();
  await page.getByRole('link', { name: 'Get help with Stamp Shift' }).click();
  const restore = page.getByText('How do I restore Extra Routes?', { exact: true });
  await restore.focus();
  await page.keyboard.press('Space');
  await expect(page.getByText(/In The post shop, choose Restore purchases/)).toBeVisible();
  await expect(page.getByRole('main').getByRole('link', { name: 'jordanblum16@gmail.com' })).toHaveAttribute('href', 'mailto:jordanblum16@gmail.com?subject=Stamp%20Shift%20support');
  await page.getByRole('navigation', { name: 'Stamp Shift documentation' }).getByRole('link', { name: 'Privacy' }).click();
  await expect(page.getByRole('heading', { name: 'Privacy at the desk.' })).toBeVisible();
  await expect(page.getByRole('main')).toContainText('No puzzle report is sent to me automatically.');
  await expect(page.getByRole('main')).toContainText('do not load the personal site\'s chat assistant');
  await page.getByRole('link', { name: 'All app docs' }).click();
  await expect(page).toHaveURL(/\/apps\/?$/);
  await context.close();
});

test('documentation supports keyboard entry and the portfolio links to the hub', async ({ page }) => {
  await page.goto('/apps/stamp-shift/privacy');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  await page.goto('/');
  await expect(page.getByRole('contentinfo').getByRole('link', { name: 'App docs', exact: true })).toHaveAttribute('href', '/apps');
});
