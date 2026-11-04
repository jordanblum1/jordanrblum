import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test, type Page, type TestInfo } from '@playwright/test';

const storeURL = 'https://apps.apple.com/us/app/stamp-shift/id6824269145';
const evidenceRoot = process.env.LAUNCH_QA_EVIDENCE_DIR ?? join('output', 'launch-qa');
const mutatingMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const mutations = new WeakMap<Page, string[]>();
const runtimeErrors = new WeakMap<Page, string[]>();

async function evidence(page: Page, testInfo: TestInfo, persona: string, state: 'before' | 'after'): Promise<void> {
  const surface = testInfo.project.name || 'legacy-fixture';
  const directory = join(evidenceRoot, surface, persona);
  await mkdir(directory, { recursive: true });
  await page.screenshot({ path: join(directory, `${state}.png`), fullPage: true });
}

async function openLanding(page: Page, path = '/apps/stamp-shift'): Promise<void> {
  const observed: string[] = [];
  const errors: string[] = [];
  mutations.set(page, observed);
  runtimeErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.route('**/*', async (route) => {
    const request = route.request();
    if (!mutatingMethods.has(request.method())) return route.continue();
    observed.push(request.url());
    return route.abort('blockedbyclient');
  });
  const response = await page.goto(path);
  expect(response?.status()).toBe(200);
  await expect(page.locator('form[data-waitlist]')).toHaveCount(0);
  await expect(page.getByRole('main')).not.toContainText(/Coming soon|Notify me/);
}

async function reachStore(page: Page, keyboard = false): Promise<void> {
  const action = page.getByRole('link', { name: 'Download on the App Store', exact: true });
  await expect(action).toBeVisible();
  await expect(action).toHaveAttribute('href', storeURL);
  const bounds = await action.boundingBox();
  expect(bounds?.height).toBeGreaterThanOrEqual(44);
  await action.focus();
  // The exact destination is exercised locally without contacting Apple's storefront.
  await page.route(storeURL, (route) => route.fulfill({ contentType: 'text/html', body: '<title>App Store destination fixture</title><main><h1>App Store destination fixture</h1></main>' }));
  if (keyboard) await page.keyboard.press('Enter');
  else await action.click();
  await expect(page).toHaveURL(storeURL);
  await expect(page).toHaveTitle('App Store destination fixture');
  await expect(page.getByRole('heading', { name: 'App Store destination fixture' })).toBeVisible();
}

async function download(page: Page, testInfo: TestInfo, persona: string, keyboard = false): Promise<void> {
  await reachStore(page, keyboard);
  await evidence(page, testInfo, persona, 'after');
  expect(mutations.get(page)).toEqual([]);
  expect(runtimeErrors.get(page)).toEqual([]);
}

test('impatient visitor reaches the App Store from the first action', async ({ page }, testInfo) => {
  await openLanding(page);
  await evidence(page, testInfo, 'impatient', 'before');
  await download(page, testInfo, 'impatient');
});

test('skeptical visitor can verify ownership and privacy before download', async ({ page }, testInfo) => {
  await openLanding(page);
  await evidence(page, testInfo, 'skeptic', 'before');
  await page.getByRole('link', { name: 'Support', exact: true }).click();
  await page.getByText('What does Extra Routes include?', { exact: true }).click();
  await expect(page.getByText(/All purchases are permanent, with no subscription/)).toBeVisible();
  await expect(page.getByText(/earlier purchases are not credited toward its price/)).toBeVisible();
  await page.getByText('Can I play without an account?', { exact: true }).click();
  await expect(page.getByText(/whether purchase analytics are enabled in your build/)).toBeVisible();
  await page.getByRole('navigation', { name: 'Stamp Shift documentation' }).getByRole('link', { name: 'Privacy' }).click();
  await expect(page.getByRole('main')).toContainText('Progress stays on this device.');
  await expect(page.getByRole('main')).toContainText('Previous launch notifications');
  await expect(page.getByRole('main')).toContainText('no longer accepts launch-list signups');
  await page.getByRole('navigation', { name: 'Stamp Shift documentation' }).getByRole('link', { name: 'Overview' }).click();
  await download(page, testInfo, 'skeptic');
});

test('mobile visitor can download without horizontal overflow', async ({ browser, baseURL }, testInfo) => {
  test.setTimeout(45_000);
  const context = await browser.newContext({ baseURL, viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  try {
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 400, downloadThroughput: 50_000, uploadThroughput: 50_000, connectionType: 'cellular3g' });
    await openLanding(page);
    await evidence(page, testInfo, 'mobile', 'before');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await download(page, testInfo, 'mobile');
  } finally {
    await context.close();
  }
});

test('literal reader can follow the visible download label using the keyboard', async ({ page }, testInfo) => {
  await openLanding(page);
  await evidence(page, testInfo, 'literal', 'before');
  await download(page, testInfo, 'literal', true);
});

test('breaker can recover through history and repeat the download from a junk query', async ({ page }, testInfo) => {
  await openLanding(page, '/apps/stamp-shift/?ss_campaign=route20-a&ss_campaign=route20-b&source=%GG#launch');
  const landingURL = page.url();
  await evidence(page, testInfo, 'breaker', 'before');
  await reachStore(page);
  await page.goBack();
  await expect(page).toHaveURL(landingURL);
  await page.goForward();
  await expect(page).toHaveTitle('App Store destination fixture');
  await page.goBack();
  await expect(page).toHaveURL(landingURL);
  await download(page, testInfo, 'breaker');
});
