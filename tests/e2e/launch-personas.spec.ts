import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const fixtureURL = 'http://127.0.0.1:4334';
const endpoint = `${fixtureURL}/api/studio/waitlist`;
const evidenceRoot = process.env.LAUNCH_QA_EVIDENCE_DIR ?? join('output', 'launch-qa');
const mutatingMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const mutations = new WeakMap<Page, string[]>();

type FixtureState = {
  requests: number;
  verifiedRequests: number;
  subscriptions: number;
  sources: string[];
};

async function fixtureState(request: APIRequestContext): Promise<FixtureState> {
  const response = await request.get(`${fixtureURL}/_fixture`);
  expect(response.ok()).toBe(true);
  return response.json() as Promise<FixtureState>;
}

async function evidence(page: Page, persona: string, state: 'before' | 'after'): Promise<void> {
  const directory = join(evidenceRoot, persona);
  await mkdir(directory, { recursive: true });
  await page.screenshot({ path: join(directory, `${state}.png`), fullPage: true });
}

async function guardMutations(page: Page): Promise<void> {
  const observed: string[] = [];
  mutations.set(page, observed);
  await page.route('**/*', async (route) => {
    const request = route.request();
    if (!mutatingMethods.has(request.method())) return route.continue();
    observed.push(request.url());
    if (request.url() !== endpoint) return route.abort('blockedbyclient');
    return route.continue();
  });
}

function expectOnlySyntheticMutations(page: Page): void {
  expect(mutations.get(page)?.every((url) => url === endpoint)).toBe(true);
}

async function openLanding(page: Page): Promise<void> {
  await guardMutations(page);
  const response = await page.goto('/apps/stamp-shift');
  expect(response?.status()).toBe(200);
  await expect(page.locator('form[data-waitlist]')).toHaveAttribute('data-endpoint', endpoint);
}

async function signUp(page: Page, email: string): Promise<void> {
  await page.getByRole('textbox', { name: 'Email address' }).fill(email);
  await page.getByRole('button', { name: 'Notify me', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('You’re on the Stamp Shift launch list.');
  await expect(page.getByRole('button', { name: 'Saved', exact: true })).toBeDisabled();
}

test('impatient visitor reaches the first action and succeeds', async ({ page, request }) => {
  const before = await fixtureState(request);
  await openLanding(page);
  await evidence(page, 'impatient', 'before');

  await page.getByRole('link', { name: 'Notify me', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Email address' })).toBeFocused();
  await signUp(page, 'launch-impatient@example.test');

  expect((await fixtureState(request)).verifiedRequests).toBe(before.verifiedRequests + 1);
  expectOnlySyntheticMutations(page);
  await evidence(page, 'impatient', 'after');
});

test('skeptical visitor can verify ownership and privacy before signup', async ({ page, request }) => {
  const before = await fixtureState(request);
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
  await expect(page.getByRole('main')).toContainText('Optional launch notifications');
  await page.getByRole('navigation', { name: 'Stamp Shift documentation' }).getByRole('link', { name: 'Overview' }).click();
  await signUp(page, 'launch-skeptic@example.test');

  expect((await fixtureState(request)).verifiedRequests).toBe(before.verifiedRequests + 1);
  expectOnlySyntheticMutations(page);
  await evidence(page, 'skeptic', 'after');
});

test('mobile visitor completes signup without horizontal overflow', async ({ browser, baseURL, request }) => {
  test.setTimeout(45_000);
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 375, height: 812 },
    isMobile: true,
    hasTouch: true,
  });
  try {
    const page = await context.newPage();
    page.setDefaultTimeout(15_000);
    page.setDefaultNavigationTimeout(30_000);
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 400,
      downloadThroughput: 50_000,
      uploadThroughput: 50_000,
      connectionType: 'cellular3g',
    });
    const before = await fixtureState(request);

    await openLanding(page);
    await evidence(page, 'mobile', 'before');
    await page.getByRole('link', { name: 'Notify me', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Email address' })).toBeFocused();
    await signUp(page, 'launch-mobile@example.test');

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    expect((await fixtureState(request)).verifiedRequests).toBe(before.verifiedRequests + 1);
    expectOnlySyntheticMutations(page);
    await evidence(page, 'mobile', 'after');
  } finally {
    await context.close();
  }
});

test('literal reader can follow labels without guessing', async ({ page, request }) => {
  const before = await fixtureState(request);
  await openLanding(page);
  await evidence(page, 'literal', 'before');

  const action = page.getByRole('link', { name: 'Notify me', exact: true });
  await expect(action).toHaveAttribute('href', '#launch');
  await action.click();
  await expect(page).toHaveURL(/#launch$/);
  await expect(page.getByRole('heading', { name: 'Notify me when it’s available.' })).toBeVisible();
  await expect(page.locator('#waitlist-email')).toBeFocused();
  await signUp(page, 'launch-literal@example.test');

  expect((await fixtureState(request)).verifiedRequests).toBe(before.verifiedRequests + 1);
  expectOnlySyntheticMutations(page);
  await evidence(page, 'literal', 'after');
});

test('breaker gets validation, duplicate-submit safety and a usable retry', async ({ page, request }) => {
  const posts: string[] = [];
  page.on('request', (browserRequest) => {
    if (browserRequest.method() === 'POST') posts.push(browserRequest.url());
  });
  await openLanding(page);
  await evidence(page, 'breaker', 'before');
  const email = page.getByRole('textbox', { name: 'Email address' });
  const button = page.getByRole('button', { name: 'Notify me', exact: true });

  const invalidBefore = await fixtureState(request);
  await email.fill('not-an-email');
  await button.click();
  expect(await email.evaluate((input) => input instanceof HTMLInputElement && input.validity.typeMismatch)).toBe(true);
  expect((await fixtureState(request)).requests).toBe(invalidBefore.requests);

  await email.fill('launch-breaker-double@example.test');
  await button.evaluate((element) => {
    if (element instanceof HTMLButtonElement) {
      element.click();
      element.click();
    }
  });
  await expect(page.getByRole('status')).toContainText('You’re on the Stamp Shift launch list.');
  const doubleAfter = await fixtureState(request);
  expect(doubleAfter.verifiedRequests).toBe(invalidBefore.verifiedRequests + 1);

  await page.reload();
  const retryEmail = `failure-launch-breaker-${Date.now()}@example.test`;
  await email.fill(retryEmail);
  await button.click();
  await expect(page.getByRole('status')).toContainText('Your signup could not be saved.');
  await expect(email).toHaveValue(retryEmail);
  await expect(button).toBeEnabled();
  await button.click();
  await expect(page.getByRole('status')).toContainText('You’re on the Stamp Shift launch list.');

  expect(posts.length).toBe(3);
  expect(posts.every((url) => url === endpoint)).toBe(true);
  expectOnlySyntheticMutations(page);
  await evidence(page, 'breaker', 'after');
});
