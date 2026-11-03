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
  await expect(page.getByRole('link', { name: 'Download on the App Store', exact: true })).toHaveAttribute('href', 'https://apps.apple.com/us/app/stamp-shift/id6824269145');
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
  await expect(page.getByRole('contentinfo')).toContainText('Blum Studios');
  await expect(page.getByRole('link', { name: 'Download on the App Store', exact: true })).toHaveAttribute('href', 'https://apps.apple.com/us/app/stamp-shift/id6824269145');
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

test('support explains current pack ownership and build-specific analytics', async ({ page }) => {
  await page.goto('/apps/stamp-shift/support');
  await page.getByText('What does Extra Routes include?', { exact:true }).click();
  await expect(page.getByText(/Evening Post unlocks routes 31–60/)).toBeVisible();
  await expect(page.getByText(/earlier purchases are not credited/)).toBeVisible();
  await page.getByText('Can I play without an account?', { exact:true }).click();
  await expect(page.getByText(/whether purchase analytics are enabled in your build/)).toBeVisible();
  await expect(page.getByText('The current launch build has purchase analytics disabled.')).toHaveCount(0);
});

test('production builds exclude the synthetic waitlist page', async ({ page }) => {
  const response = await page.goto('/qa-fixtures/waitlist');
  expect(response?.status()).toBe(404);
});

for (const width of [1280, 390]) {
  for (const [campaign, token] of [['route20-a', 'ss_meta_r20_a_202611'], ['route20-b', 'ss_meta_r20_b_202611']]) {
    test(`the ${campaign} campaign reaches its exact Apple destination at ${width}px`, async ({ page }) => {
      const destination = `https://apps.apple.com/app/apple-store/id6824269145?pt=127568836&ct=${token}&mt=8`;
      const errors: string[] = [];
      const appleRequests: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      await page.route('https://apps.apple.com/**', route => {
        appleRequests.push(route.request().url());
        return route.fulfill({ contentType: 'text/html', body: '<title>App Store destination fixture</title>' });
      });
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/apps/stamp-shift?ss_campaign=${campaign}&fbclid=ignored&pt=ignored&ct=ignored`);
      const action = page.getByRole('link', { name: 'Download on the App Store', exact: true });
      await expect(action).toHaveAttribute('href', destination);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await action.focus();
      await expect(action).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(destination);
      expect(appleRequests).toEqual([destination]);
      expect(errors).toEqual([]);
    });
  }
}

test('unknown, duplicate and malformed campaigns retain the original download destination', async ({ page }) => {
  for (const query of ['ss_campaign=unknown', 'ss_campaign=route20-a&ss_campaign=route20-b', 'ss_campaign=route20-a&other=%GG']) {
    await page.goto(`/apps/stamp-shift?${query}`);
    await expect(page.getByRole('link', { name: 'Download on the App Store', exact: true })).toHaveAttribute('href', 'https://apps.apple.com/us/app/stamp-shift/id6824269145');
  }
});

test('a campaign still downloads from the original link without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  try {
    const page = await context.newPage();
    const destination = 'https://apps.apple.com/us/app/stamp-shift/id6824269145';
    await page.route('https://apps.apple.com/**', route => route.fulfill({ contentType: 'text/html', body: '<title>App Store destination fixture</title>' }));
    await page.goto('/apps/stamp-shift?ss_campaign=route20-a');
    const action = page.getByRole('link', { name: 'Download on the App Store', exact: true });
    await expect(action).toHaveAttribute('href', destination);
    await action.click();
    await expect(page).toHaveURL(destination);
  } finally {
    await context.close();
  }
});
