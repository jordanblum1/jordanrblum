import { expect, test } from '@playwright/test';

for (const width of [1440, 375]) {
  test(`studio and app journeys fit ${width}px without runtime errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/', '/contact', '/apps', '/apps/alive-still', '/apps/birthday', '/apps/stamp-shift', '/apps/stamp-shift/support', '/apps/stamp-shift/privacy']) {
      expect((await page.goto(path))?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const canonical = path === '/' ? '/' : path;
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://buildwithblum.com${canonical}`);
      await expect(page.locator('[data-chat-widget], [data-chat-trigger]')).toHaveCount(0);
      await expect(page.locator('form')).toHaveCount(path === '/contact' ? 1 : 0);
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
  expect(await page.locator('[data-city-background]').evaluate(element => element.getAnimations({ subtree: true }).some(animation => animation.playState === 'running'))).toBe(false);
  await page.getByRole('link', { name: 'Contact', exact: true }).click();
  await expect(page).toHaveURL(/\/contact$/);
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

const contactEndpoint = 'https://www.chicksofnyc.com/api/studio/contact';
async function fillContact(page: import('@playwright/test').Page) {
  await page.getByLabel('Name', { exact: true }).fill('Jordan Visitor');
  await page.getByLabel('Email', { exact: true }).fill('visitor@example.com');
  await page.getByLabel('Message', { exact: true }).fill('Hello, I have a project in mind.');
}

test('minimal homepage opens a dedicated contact page', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Links', exact: true })).toHaveAttribute('href', 'https://blumblumblum.com');
  await expect(page.getByRole('link', { name: 'Resume', exact: true })).toHaveAttribute('href', '/assets/blum-studios/resume.pdf');
  await expect(page.locator('a[href^="/apps"], form, a[href^="mailto:"], a[href="/privacy"]')).toHaveCount(0);
  await page.getByRole('link', { name: 'Contact', exact: true }).click();
  await expect(page).toHaveURL(/\/contact$/);
  await expect(page.getByRole('heading', { name: 'Contact', exact: true })).toBeVisible();
  await expect(page.locator('input[type="checkbox"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByLabel('Name', { exact: true })).toBeFocused();
  await page.getByLabel('Name', { exact: true }).fill('Visitor');
  await page.getByLabel('Email', { exact: true }).fill('invalid-email');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByLabel('Email', { exact: true })).toBeFocused();
  await page.getByRole('link', { name: 'Back', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('contact prevents duplicate sends and shows success', async ({ page }) => {
  let sends = 0;
  let release: () => void = () => {};
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route(contactEndpoint, async route => {
    sends += 1;
    expect(route.request().postDataJSON()).toEqual({ name: 'Jordan Visitor', email: 'visitor@example.com', message: 'Hello, I have a project in mind.', website: '' });
    expect(route.request().headers()['idempotency-key']).toMatch(/^[0-9a-f-]{36}$/);
    await held;
    await route.fulfill({ status: 201, json: { success: true }, headers: { 'Access-Control-Allow-Origin': '*' } });
  });
  await page.goto('/contact');
  await fillContact(page);
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByRole('button', { name: 'Send message' })).toBeDisabled();
  for (const label of ['Name', 'Email', 'Message']) await expect(page.getByLabel(label, { exact: true })).toBeDisabled();
  await page.getByLabel('Message', { exact: true }).focus();
  await page.keyboard.type('Unsent revision');
  await expect(page.getByLabel('Message', { exact: true })).toHaveValue('Hello, I have a project in mind.');
  await page.locator('form').evaluate(form => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
  release();
  await expect(page.getByRole('status')).toHaveText('Message sent. Thank you.');
  for (const label of ['Name', 'Email', 'Message']) await expect(page.getByLabel(label, { exact: true })).toBeEnabled();
  await expect(page.getByLabel('Message', { exact: true })).toHaveValue('Hello, I have a project in mind.');
  expect(sends).toBe(1);
});

test('contact preserves a failed draft and retry key; edits get a new key', async ({ page }) => {
  const keys: string[] = [];
  await page.route(contactEndpoint, async route => {
    keys.push(route.request().headers()['idempotency-key']);
    await route.fulfill({ status: keys.length === 1 ? 503 : 200, json: keys.length === 1 ? { error: 'unavailable' } : { success: true }, headers: { 'Access-Control-Allow-Origin': '*' } });
  });
  await page.goto('/contact');
  await fillContact(page);
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByRole('status')).toContainText('temporarily unavailable');
  await expect(page.getByLabel('Message', { exact: true })).toHaveValue('Hello, I have a project in mind.');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByRole('status')).toContainText('Message sent');
  expect(keys[1]).toBe(keys[0]);
  await page.getByLabel('Message', { exact: true }).fill('A changed project inquiry for the studio.');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByRole('status')).toContainText('Message sent');
  expect(keys[2]).not.toBe(keys[0]);
});

test('city scenes stay static for reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('[data-city-background]')).toBeVisible();
  await expect(page.locator('video')).toHaveCount(0);
  await expect(page.locator('[data-city-motion-toggle]')).toBeHidden();
  for (const city of ['chicago', 'san-francisco', 'new-york']) await expect(page.locator(`[data-city-scene="${city}"]`)).toHaveCount(1);
  const animations = await page.locator('[data-city-background]').evaluate(element => element.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length);
  expect(animations).toBe(0);
});

test('city motion can be paused and resumed by keyboard on both pages', async ({ page }) => {
  for (const path of ['/', '/contact']) {
    await page.goto(path);
    const background = page.locator('[data-city-background]');
    const pause = page.getByRole('button', { name: 'Pause city animation' });
    await expect(pause).toBeVisible();
    await expect.poll(() => background.evaluate(element => element.getAnimations({ subtree: true }).some(animation => animation.playState === 'running'))).toBe(true);
    await pause.focus();
    await page.keyboard.press('Space');
    const play = page.getByRole('button', { name: 'Play city animation' });
    await expect(play).toBeFocused();
    await expect.poll(() => background.evaluate(element => element.getAnimations({ subtree: true }).every(animation => animation.playState !== 'running'))).toBe(true);
    await page.keyboard.press('Enter');
    await expect(pause).toBeVisible();
    await expect.poll(() => background.evaluate(element => element.getAnimations({ subtree: true }).some(animation => animation.playState === 'running'))).toBe(true);
    await pause.click();
    await expect(play).toBeVisible();
  }
});

test('old contact hashes recover to the dedicated page', async ({ page }) => {
  await page.goto('/#contact');
  await expect(page).toHaveURL(/\/contact$/);
  await expect(page.getByRole('heading', { name: 'Contact', exact: true })).toBeVisible();
});

test('short Unicode messages are rejected before sending', async ({ page }) => {
  let sends = 0;
  await page.route(contactEndpoint, async route => { sends += 1; await route.fulfill({ status: 201, json: { success: true } }); });
  await page.goto('/contact');
  await fillContact(page);
  await page.getByLabel('Message', { exact: true }).fill('Hello \u{1F44B}\u{1F44B}');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByRole('status')).toContainText('at least 10 characters');
  expect(sends).toBe(0);
});
