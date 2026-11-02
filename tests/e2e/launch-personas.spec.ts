import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const storeURL = 'https://apps.apple.com/us/app/stamp-shift/id6824269145';
const evidenceRoot = process.env.LAUNCH_QA_EVIDENCE_DIR ?? join('output', 'launch-qa');
const mutatingMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const mutations = new WeakMap<Page, string[]>();

async function evidence(page: Page, persona: string, state: 'before' | 'after'): Promise<void> {
  const directory = join(evidenceRoot, persona);
  await mkdir(directory, { recursive: true });
  await page.screenshot({ path: join(directory, `${state}.png`), fullPage: true });
}

async function openLanding(page: Page, path = '/apps/stamp-shift'): Promise<void> {
  const observed: string[] = [];
  mutations.set(page, observed);
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

async function download(page: Page, persona: string, keyboard = false): Promise<void> {
  const action = page.getByRole('link', { name: 'Download on the App Store', exact: true });
  await expect(action).toBeVisible();
  await expect(action).toHaveAttribute('href', storeURL);
  const bounds = await action.boundingBox();
  expect(bounds?.height).toBeGreaterThanOrEqual(44);
  await action.focus();
  await evidence(page, persona, 'after');
  // The exact destination is exercised locally without contacting Apple's storefront.
  await page.route(storeURL, (route) => route.fulfill({ contentType: 'text/html', body: '<title>App Store destination fixture</title>' }));
  if (keyboard) await page.keyboard.press('Enter');
  else await action.click();
  await expect(page).toHaveURL(storeURL);
  expect(mutations.get(page)).toEqual([]);
}

test('impatient visitor reaches the App Store from the first action', async ({ page }) => {
  await openLanding(page);
  await evidence(page, 'impatient', 'before');
  await download(page, 'impatient');
});

test('skeptical visitor can verify ownership and privacy before download', async ({ page }) => {
  await openLanding(page);
  await evidence(page, 'skeptic', 'before');
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
  await download(page, 'skeptic');
});

test('mobile visitor can download without horizontal overflow', async ({ browser, baseURL }) => {
  test.setTimeout(45_000);
  const context = await browser.newContext({ baseURL, viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  try {
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 400, downloadThroughput: 50_000, uploadThroughput: 50_000, connectionType: 'cellular3g' });
    await openLanding(page);
    await evidence(page, 'mobile', 'before');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await download(page, 'mobile');
  } finally {
    await context.close();
  }
});

test('literal reader can follow the visible download label using the keyboard', async ({ page }) => {
  await openLanding(page);
  await evidence(page, 'literal', 'before');
  await download(page, 'literal', true);
});

test('old campaign links still offer download without collecting an email', async ({ page }) => {
  await openLanding(page, '/apps/stamp-shift/?source=meta-drawer#launch');
  await evidence(page, 'breaker', 'before');
  await expect(page.getByRole('textbox')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Notify me' })).toHaveCount(0);
  await download(page, 'breaker');
});
