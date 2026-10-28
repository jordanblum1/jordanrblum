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
      await expect(page.locator('script')).toHaveCount(route === '/apps/stamp-shift' ? 2 : 0);
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
  await page.getByRole('link', { name: 'Support', exact: true }).click();
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

test('the Stamp Shift game page has its own identity and respects reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/apps/stamp-shift');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Three piles.One perfect order.');
  await expect(page.getByRole('banner')).toContainText('Stamp Shift');
  await expect(page.getByRole('banner')).not.toContainText('Jordan');
  await expect(page.getByRole('navigation', { name: 'Stamp Shift documentation' })).toHaveCount(0);
  await expect(page.getByRole('contentinfo')).toContainText('Blum Studio');
  await expect(page.getByRole('link', { name: 'Notify me', exact: true })).toHaveAttribute('href', '#launch');
  await expect(page.locator('[data-gameplay]')).toHaveAttribute('poster', /\S+/);
  await expect(page.locator('[data-motion-toggle]')).toHaveCount(0);
  expect(await page.locator('[data-landing-motion]').evaluateAll(videos => videos.every(video => video instanceof HTMLVideoElement && video.paused && !video.getAttribute('src')))).toBe(true);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
});

for (const width of [320, 361, 390]) {
test(`the ${width}px phone layout stays readable and visible motion plays by default`, async ({ page }) => {
  await page.setViewportSize({ width, height:740 });
  await page.goto('/apps/stamp-shift');
  const mark = page.getByRole('link', { name:'Stamp Shift home' });
  await expect(mark).toBeVisible();
  await expect(page.locator('[data-motion-toggle]')).toHaveCount(0);
  await expect.poll(() => page.locator('[data-landing-motion]').evaluateAll(videos => videos.some(video => {
    if (!(video instanceof HTMLVideoElement)) return false;
    const bounds = video.getBoundingClientRect();
    const visible = bounds.bottom > 0 && bounds.top < innerHeight && bounds.right > 0 && bounds.left < innerWidth;
    return visible && Boolean(video.getAttribute('src')) && !video.paused && video.muted && video.loop;
  }))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
}
