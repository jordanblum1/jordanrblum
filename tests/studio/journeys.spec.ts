import { expect, test, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';

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
      await expect(page.locator('[data-chat-widget], [data-chat-trigger]')).toHaveCount(0);
      await expect(page.locator('form')).toHaveCount(path === '/' ? 1 : 0);
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
  await expect(page.locator('[data-city-video]')).not.toHaveAttribute('src');
  expect(await page.locator('[data-city-video]').evaluate(element => element instanceof HTMLVideoElement && element.paused)).toBe(true);
  const inquiry = page.locator('a[href^="mailto:"]');
  expect(await inquiry.count()).toBeGreaterThan(0);
  const contact = new URL((await inquiry.first().getAttribute('href'))!);
  expect(contact.pathname).toBe('hi@jordanblum.com');
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

const contactEndpoint = 'https://jordanblum.com/api/studio/contact';
async function fillContact(page: Page) {
  await page.getByLabel('Name', { exact: true }).fill('Jordan Visitor');
  await page.getByLabel('Email', { exact: true }).fill('visitor@example.com');
  await page.getByLabel('Message', { exact: true }).fill('Hello, I have a project in mind.');
}

async function openContact(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Contact', exact: true }).click();
  await expect(page.getByLabel('Name', { exact: true })).toBeFocused();
}

test('minimal homepage keeps vertical destinations and morphs contact in place', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Links', exact: true })).toHaveAttribute('href', 'https://blumblumblum.com');
  await expect(page.getByRole('link', { name: 'Work', exact: true })).toHaveAttribute('href', '/work');
  await expect(page.locator('a[href^="/apps"], a[href$="resume.pdf"], a[href="/privacy"]')).toHaveCount(0);
  const actions = await page.locator('.studio-home-actions > button, .studio-home-actions > a').evaluateAll(elements => elements.map(element => { const bounds = element.getBoundingClientRect(); return { top: bounds.top, left: bounds.left }; }));
  expect(actions).toHaveLength(3);
  expect(actions[0].top).toBeLessThan(actions[1].top);
  expect(actions[1].top).toBeLessThan(actions[2].top);
  expect(new Set(actions.map(action => action.left)).size).toBe(1);
  await page.getByRole('button', { name: 'Contact', exact: true }).click();
  await expect(page).toHaveURL(/\/#contact$/);
  await expect(page.getByRole('dialog', { name: 'Contact', exact: true })).toBeVisible();
  await expect(page.getByLabel('Name', { exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByLabel('Name', { exact: true })).toBeFocused();
  await page.getByLabel('Name', { exact: true }).fill('Visitor');
  await page.getByLabel('Email', { exact: true }).fill('invalid-email');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByLabel('Email', { exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Close contact form' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Contact', exact: true })).toBeFocused();
});

test('home actions fit a rotated phone without page scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 375 });
  await page.goto('/');
  for (const label of ['Contact', 'Links', 'Work']) {
    await expect(page.getByRole(label === 'Contact' ? 'button' : 'link', { name: label, exact: true })).toBeInViewport();
  }
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
});

test('enlarged browser fonts keep the wordmark and actions reachable', async ({ playwright, baseURL }) => {
  if (!baseURL) throw new Error('Studio test base URL is required');
  for (const [fontSize, height] of [[24, 700], [32, 900]]) {
    const browser = await playwright.chromium.launch({ args: [`--blink-settings=defaultFontSize=${fontSize}`] });
    try {
      const page = await browser.newPage({ viewport: { width: 1440, height } });
      await page.goto(baseURL);
      await expect(page.getByRole('heading', { level: 1 })).toBeInViewport({ ratio: 1 });
      for (const label of ['Contact', 'Links', 'Work']) {
        await expect(page.getByRole(label === 'Contact' ? 'button' : 'link', { name: label, exact: true })).toBeInViewport({ ratio: 1 });
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    } finally {
      await browser.close();
    }
  }
});

test('contact prevents duplicate sends and shows success', async ({ page }) => {
  let sends = 0;
  let release: () => void = () => {};
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route(contactEndpoint, async route => {
    sends += 1;
    expect(route.request().postDataJSON()).toEqual({ name: 'Jordan Visitor', email: 'visitor@example.com', message: 'Hello, I have a project in mind.', website: '' });
    expect(route.request().headers()['idempotency-key']).toMatch(/^[0-9a-f-]{36}$/);
    expect(route.request().headers()['x-amz-content-sha256']).toBe(createHash('sha256').update(route.request().postData() ?? '').digest('hex'));
    await held;
    await route.fulfill({ status: 201, json: { success: true }, headers: { 'Access-Control-Allow-Origin': '*' } });
  });
  await openContact(page);
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
  await openContact(page);
  await fillContact(page);
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByRole('status')).toContainText('temporarily unavailable');
  await page.getByRole('button', { name: 'Close contact form' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.getByRole('button', { name: 'Contact', exact: true }).click();
  await expect(page.getByLabel('Name', { exact: true })).toBeFocused();
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

test('reduced motion leaves the city poster without downloading video', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => { if (request.url().endsWith('.mp4')) requests.push(request.url()); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('[data-city-background]')).toHaveAttribute('data-video-state', 'poster');
  await expect(page.locator('[data-city-video]')).not.toHaveAttribute('src');
  await expect(page.locator('[data-city-motion-toggle]')).toHaveCount(0);
  expect(requests).toEqual([]);
});

test('city video autoplays the responsive film and preserves progress on portrait swap', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => { if (request.url().endsWith('.mp4')) requests.push(request.url()); });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const video = page.locator('[data-city-video]');
  await expect(page.locator('[data-city-motion-toggle]')).toHaveCount(0);
  await expect(video).toHaveAttribute('src', '/assets/blum-studios/journey-landscape.mp4');
  expect(requests.every(url => url.endsWith('journey-landscape.mp4'))).toBe(true);
  expect(await video.evaluate(element => element instanceof HTMLVideoElement && element.muted && element.loop && element.playsInline)).toBe(true);
  const started = await video.evaluate(element => element instanceof HTMLVideoElement ? element.currentTime : 0);
  await expect.poll(() => video.evaluate(element => element instanceof HTMLVideoElement ? element.currentTime : 0)).toBeGreaterThan(started);
  const progress = await video.evaluate(element => element instanceof HTMLVideoElement ? element.currentTime / element.duration : 0);
  await page.setViewportSize({ width: 375, height: 900 });
  await expect(video).toHaveAttribute('src', '/assets/blum-studios/journey-portrait.mp4');
  await expect.poll(() => video.evaluate(element => element instanceof HTMLVideoElement ? element.duration : 0)).toBe(30);
  await expect.poll(() => video.evaluate(element => element instanceof HTMLVideoElement && !element.paused)).toBe(true);
  expect(await video.evaluate(element => element instanceof HTMLVideoElement ? element.currentTime / element.duration : 0)).toBeCloseTo(progress, 1);
  await expect(page.locator('[data-city-background]')).toHaveAttribute('data-video-state', 'playing');
});

test('dialog pauses city motion and resumes when motion is allowed', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openContact(page);
  const video = page.locator('[data-city-video]');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect.poll(() => video.evaluate(element => element instanceof HTMLVideoElement && element.readyState >= 3)).toBe(true);
  expect(await video.evaluate(element => element instanceof HTMLVideoElement && element.paused)).toBe(true);
  await page.getByRole('button', { name: 'Close contact form' }).click();
  await expect.poll(() => video.evaluate(element => element instanceof HTMLVideoElement && !element.paused)).toBe(true);
  await page.getByRole('button', { name: 'Contact', exact: true }).click();
  await expect(page.getByLabel('Name', { exact: true })).toBeFocused();
  expect(await video.evaluate(element => element instanceof HTMLVideoElement && element.paused)).toBe(true);
  await page.getByRole('button', { name: 'Close contact form' }).click();
  await expect.poll(() => video.evaluate(element => element instanceof HTMLVideoElement && !element.paused)).toBe(true);
});

test('contact hashes and the compatibility route open the same native dialog', async ({ page }) => {
  for (const path of ['/#contact', '/contact']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/#contact$/);
    await expect(page.getByRole('dialog', { name: 'Contact', exact: true })).toBeVisible();
    await expect(page.getByLabel('Name', { exact: true })).toBeFocused();
  }
});

test('dialog traps keyboard focus, closes with Escape, and follows browser Back', async ({ page }) => {
  await openContact(page);
  expect(await page.locator('dialog').evaluate(dialog => dialog.matches(':modal'))).toBe(true);
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Close contact form' })).toBeFocused();
  await page.locator('a[href="/work"]').evaluate(link => { if (link instanceof HTMLElement) link.focus(); });
  await expect(page.getByRole('button', { name: 'Close contact form' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Name', { exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Contact', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Contact', exact: true }).click();
  await expect(page.getByLabel('Name', { exact: true })).toBeFocused();
  await page.goBack();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Contact', exact: true })).toBeFocused();
});

test('Forward during the closing morph restores the contact dialog', async ({ page }) => {
  await openContact(page);
  await page.evaluate(() => history.back());
  await expect(page).not.toHaveURL(/#contact$/);
  await page.waitForTimeout(100);
  await page.evaluate(() => history.forward());
  await expect(page).toHaveURL(/#contact$/);
  await expect(page.getByLabel('Name', { exact: true })).toBeFocused();
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('reduced motion opens immediately and small keyboard-sized viewports stay within bounds', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 375, height: 420 });
  await openContact(page);
  expect(await page.locator('dialog').evaluate(dialog => dialog.getAnimations({ subtree: true }).length)).toBe(0);
  const bounds = await page.locator('dialog').boundingBox();
  expect(bounds).not.toBeNull();
  if (!bounds) throw new Error('missing dialog bounds');
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(375);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(420);
  expect(await page.locator('dialog').evaluate(dialog => dialog.scrollWidth <= dialog.clientWidth)).toBe(true);
  await page.getByLabel('Message', { exact: true }).fill('A message in a keyboard-sized viewport.');
  await page.getByRole('button', { name: 'Send message' }).scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: 'Send message' })).toBeInViewport();
  await page.getByRole('button', { name: 'Close contact form' }).scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: 'Close contact form' })).toBeInViewport();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('short Unicode messages are rejected before sending', async ({ page }) => {
  let sends = 0;
  await page.route(contactEndpoint, async route => { sends += 1; await route.fulfill({ status: 201, json: { success: true } }); });
  await openContact(page);
  await fillContact(page);
  await page.getByLabel('Message', { exact: true }).fill('Hello \u{1F44B}\u{1F44B}');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByRole('status')).toContainText('at least 10 characters');
  expect(sends).toBe(0);
});


test('Escape during expansion leaves the trigger ready to reopen', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Contact', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Contact', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Contact', exact: true }).click();
  await expect(page.getByLabel('Name', { exact: true })).toBeFocused();
});


test('work rail browses real products, design and photos and reaches contact', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/');
  await page.getByRole('link', { name: 'Work', exact: true }).click();
  await expect(page).toHaveURL(/\/work\/?$/);
  const collection = page.locator('[data-work-collection]:visible');
  await expect(collection).toHaveCount(1);
  await expect(collection.getByRole('heading')).toHaveText(['Stamp Shift', 'Alive Still', 'Birthday', 'Chicks of NYC', 'Citi Bike Wrapped']);
  await expect(page.getByRole('button', { name: 'Previous project' })).toBeDisabled();
  const rail = page.getByRole('group', { name: 'Products gallery', exact: true });
  await rail.focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => rail.evaluate(element => element.scrollLeft)).toBeGreaterThan(200);
  await page.keyboard.press('End');
  await expect(page.getByRole('button', { name: 'Next project' })).toBeDisabled();
  await page.getByRole('button', { name: 'Previous project' }).click();
  await expect(page.getByRole('button', { name: 'Next project' })).toBeEnabled();
  for (const [category, title] of [['Design', 'Blum'], ['Photos', 'Cape Town'], ['Products', 'Stamp Shift']]) {
    await page.getByRole('button', { name: category, exact: true }).click();
    await expect(page.getByRole('button', { name: category, exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(collection.getByRole('heading').first()).toHaveText(title);
    await expect.poll(() => collection.locator('img').first().evaluate(image => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0)).toBe(true);
    await expect(page.getByRole('button', { name: 'Previous project' })).toBeDisabled();
  }
  await expect(page.getByRole('link', { name: 'Full portfolio' })).toHaveAttribute('href', 'https://jordanblum.com');
  await expect(page.getByRole('link', { name: 'Procore', exact: true })).toHaveAttribute('href', 'https://jordanblum.com/about#procore');
  await expect(page.getByRole('link', { name: 'Workday', exact: true })).toHaveAttribute('href', 'https://jordanblum.com/about#workday');
  await expect(page.locator('main')).not.toContainText(/Roam|harness|testimonial|↗/i);
  await page.getByRole('link', { name: 'Contact', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Contact', exact: true })).toBeVisible();
  await expect(page.getByLabel('Name', { exact: true })).toBeFocused();
  expect(errors).toEqual([]);
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 320, height: 812 }, { width: 375, height: 844 }, { width: 844, height: 375 }]) {
  test(`work rail fits ${viewport.width}px with usable controls and adjacent card peek`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/work');
    await expect(page.locator('.studio-work-pill svg')).toHaveCount(0);
    if (viewport.width === 1440) await expect(page.getByRole('link', { name: 'Explore Stamp Shift', exact: true })).toBeInViewport({ ratio: 1 });
    const cards = page.locator('[data-work-collection="products"] [data-work-example]');
    const first = await cards.nth(0).boundingBox();
    const second = await cards.nth(1).boundingBox();
    expect(first?.x).toBeGreaterThanOrEqual(16);
    expect(second?.x).toBeLessThan(viewport.width);
    expect((first?.width ?? 0) + (first?.x ?? 0)).toBeLessThan(viewport.width);
    await page.getByRole('button', { name: 'Photos', exact: true }).click();
    await page.getByRole('button', { name: 'Next project' }).click();
    const rail = page.locator('[data-work-collection="photos"] [data-work-rail]');
    await expect.poll(() => rail.evaluate(element => element.scrollLeft)).toBeGreaterThan(100);
    await expect(page.locator('[data-work-collection="photos"] [data-work-example] h2')).toHaveText(['Cape Town', 'Deadvlei', 'Rome']);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const name of ['Photos', 'Previous project', 'Next project']) {
      const bounds = await page.getByRole('button', { name, exact: true }).boundingBox();
      expect(bounds?.height).toBeGreaterThanOrEqual(44);
      expect(bounds?.width).toBeGreaterThanOrEqual(44);
    }
    await page.getByRole('link', { name: 'Back to Blum Studios' }).click();
    await expect(page.getByRole('link', { name: 'Work', exact: true })).toBeVisible();
  });
}

test('work remains browsable without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL, viewport: { width: 375, height: 844 } });
  try {
    const page = await context.newPage();
    await page.goto('/work');
    await expect(page.locator('[data-work-collection]:visible')).toHaveCount(3);
    await expect(page.getByRole('heading', { name: 'Birthday', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Deadvlei', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next project' })).toBeHidden();
    await page.getByRole('link', { name: 'Explore Birthday', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Birthday');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally { await context.close(); }
});

for (const width of [320, 375]) {
  test(`work filters and actions reflow at ${width}px with 32px browser fonts`, async ({ playwright, baseURL }) => {
    if (!baseURL) throw new Error('Studio test base URL is required');
    const browser = await playwright.chromium.launch({ args: ['--blink-settings=defaultFontSize=32'] });
    try {
      const page = await browser.newPage({ viewport: { width, height: 844 } });
      await page.goto(`${baseURL}/work`);
      for (const name of ['Products', 'Design', 'Photos']) {
        await page.getByRole('button', { name, exact: true }).click();
        await expect(page.getByRole('button', { name, exact: true })).toBeInViewport({ ratio: 1 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      }
      const action = page.locator('[data-work-collection]:visible .studio-work-project-action').first();
      expect(await action.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
      await page.getByRole('link', { name: 'Back to Blum Studios' }).click();
      await expect(page.getByRole('link', { name: 'Work', exact: true })).toBeVisible();
    } finally { await browser.close(); }
  });
}

test('product phone images keep the full composite aspect ratio and route to real overviews', async ({ page }) => {
  await page.goto('/work');
  const cards = page.locator('[data-work-collection="products"] [data-treatment="phone"]');
  await expect(cards).toHaveCount(3);
  for (const [index, path] of ['/apps/stamp-shift', '/apps/alive-still', '/apps/birthday'].entries()) {
    const card = cards.nth(index);
    const image = card.locator('img');
    await expect.poll(() => image.evaluate(element => element instanceof HTMLImageElement && element.complete && element.naturalWidth > 0)).toBe(true);
    const dimensions = await image.evaluate(element => {
      if (!(element instanceof HTMLImageElement)) throw new Error('Missing phone image');
      const bounds = element.getBoundingClientRect();
      return { rendered: bounds.width / bounds.height, native: element.naturalWidth / element.naturalHeight, fit: getComputedStyle(element).objectFit };
    });
    expect(dimensions.native).toBeCloseTo(778 / 1600, 2);
    expect(dimensions.rendered).toBeCloseTo(dimensions.native, 2);
    expect(dimensions.fit).toBe('contain');
    await expect(card.getByRole('link')).toHaveAttribute('href', path);
  }
});

test('reduced motion rail supports keyboard boundaries and focus follows visible links', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/work');
  const rail = page.locator('[data-work-collection="products"] [data-work-rail]');
  await rail.focus();
  await page.keyboard.press('End');
  await expect(page.getByRole('button', { name: 'Next project' })).toBeDisabled();
  await expect(page.locator('[data-work-position]')).toContainText('of 5');
  await page.keyboard.press('Home');
  await expect(page.getByRole('button', { name: 'Previous project' })).toBeDisabled();
  await expect(page.locator('[data-work-position]')).toContainText('Products · 1');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Explore Stamp Shift', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Explore Alive Still', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Design', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Explore Alive Still', exact: true })).toBeHidden();
  expect(await page.locator('[data-work-gallery]').evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0);
});
