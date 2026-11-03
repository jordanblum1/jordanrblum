import { expect, test } from '@playwright/test';

for (const width of [1440, 375]) {
  test(`studio and app journeys fit ${width}px without runtime errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/', '/apps', '/apps/alive-still', '/apps/birthday', '/apps/stamp-shift', '/apps/stamp-shift/support', '/apps/stamp-shift/privacy']) {
      expect((await page.goto(path))?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const canonical = path === '/' ? '/' : path;
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://buildwithblum.com${canonical}`);
      await expect(page.locator('[data-chat-widget], [data-chat-trigger], form')).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect.poll(() => page.locator('img').evaluateAll(images => images.every(image => {
        const bounds = image.getBoundingClientRect();
        return bounds.top >= innerHeight || bounds.bottom <= 0 || (image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0);
      }))).toBe(true);
    }
    expect(errors).toEqual([]);
  });
}

test('a first visitor can find the game, restore instructions and host-specific privacy', async ({ page }) => {
  await page.goto('/apps');
  await page.getByRole('link', { name: 'Stamp Shift ↗', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Download on the App Store', exact: true })).toHaveAttribute('href', 'https://apps.apple.com/us/app/stamp-shift/id6824269145');
  await page.getByRole('link', { name: 'Support', exact: true }).click();
  await page.getByText('How do I restore Extra Routes?', { exact: true }).click();
  await expect(page.getByText(/In The post shop, choose Restore purchases/)).toBeVisible();
  await page.getByRole('navigation', { name: 'Stamp Shift documentation' }).getByRole('link', { name: 'Privacy' }).click();
  await expect(page.getByText('These pages are delivered using Vercel.', { exact: false })).toBeVisible();
  await expect(page.getByRole('banner').getByRole('link', { name: 'Blum Studios' })).toHaveAttribute('href', '/');
});

test('campaign links preserve the approved Apple tokens on the new host', async ({ page }) => {
  for (const [key, token] of [['route20-a', 'ss_meta_r20_a_202611'], ['route20-b', 'ss_meta_r20_b_202611']]) {
    await page.goto(`/apps/stamp-shift?ss_campaign=${key}&fbclid=discard-me`);
    await expect(page.locator('[data-stamp-shift-download]')).toHaveAttribute('href', `https://apps.apple.com/app/apple-store/id6824269145?pt=127568836&ct=${token}&mt=8`);
  }
});

test('contact and help work with JavaScript disabled and keyboard navigation', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL, viewport: { width: 375, height: 812 } });
  const page = await context.newPage();
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  const inquiry = page.locator('a[href^="mailto:"]');
  expect(await inquiry.count()).toBeGreaterThan(0);
  const contact = new URL((await inquiry.first().getAttribute('href'))!);
  expect(contact.pathname).toBe('hello@buildwithblum.com');
  expect(contact.searchParams.get('subject')).toContain('Project inquiry');
  await page.goto('/apps/stamp-shift/support');
  await page.getByText('What does Extra Routes include?', { exact: true }).focus();
  await page.keyboard.press('Space');
  await expect(page.getByText(/All purchases are permanent, with no subscription/)).toBeVisible();
  await context.close();
});

test('a missing studio page offers recovery with a real 404', async ({ page }) => {
  expect((await page.goto('/missing-page'))?.status()).toBe(404);
  await page.getByRole('link', { name: 'Back to Blum Studios' }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('every app has a central overview with its verified store and service destinations', async ({ page }) => {
  for (const [route, store, website, privacy] of [
    ['/apps/alive-still', 'https://apps.apple.com/us/app/alive-still/id6757885591', 'https://alivestill.app', 'https://alivestill.app/privacy'],
    ['/apps/birthday', 'https://apps.apple.com/us/app/id6809536251', 'https://trybirthday.com', 'https://trybirthday.com/privacy.html'],
  ]) {
    await page.goto('/apps');
    await page.locator(`a[href="${route}"]`).click();
    await expect(page.getByRole('link', { name: 'Download on the App Store' })).toHaveAttribute('href', store);
    await expect(page.getByRole('link', { name: 'Visit the official website' })).toHaveAttribute('href', website);
    await expect(page.getByRole('link', { name: 'Email support' })).toHaveAttribute('href', /^mailto:support@buildwithblum\.com\?subject=/);
    await expect(page.getByRole('link', { name: 'Privacy policy' })).toHaveAttribute('href', privacy);
  }
});
