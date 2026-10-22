import { expect, test, type Page } from '@playwright/test';

const portrait = (page: Page) => page.locator('[data-portrait-panel]');
const faceCenter = async (page: Page) => {
  const box = (await portrait(page).locator('.portrait').boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

/** Five fast hits arm it; then keep going for the face until it's caught. */
async function whack(page: Page, hit: (x: number, y: number) => Promise<void>) {
  await portrait(page).scrollIntoViewIfNeeded();
  const start = await faceCenter(page);
  for (let i = 0; i < 5; i++) await hit(start.x, start.y);
  await expect(portrait(page).getByText(/catch me/i)).toBeVisible();

  const fact = portrait(page).getByRole('status').filter({ hasText: /fun fact/i });
  let dodged = false;
  for (let i = 0; i < 8 && !(await fact.isVisible()); i++) {
    const { x, y } = await faceCenter(page);
    dodged ||= x !== start.x || y !== start.y;
    await hit(x, y);
  }
  expect(dodged, 'the face dodges before it gets caught').toBe(true);
  return fact;
}

test('five fast clicks arm the portrait; catching it shows a real-text fun fact and Escape resets', async ({ page }) => {
  await page.goto('/');
  const fact = await whack(page, (x, y) => page.mouse.click(x, y));
  await expect(fact).toBeVisible();
  await expect(fact.getByText(/\w{4,}/).last()).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(fact).toHaveCount(0);
  await expect(portrait(page)).not.toHaveClass(/is-whack/);
});

test.describe('on a touch phone', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

  test('tapping works the same way', async ({ page }) => {
    await page.goto('/');
    const fact = await whack(page, (x, y) => page.touchscreen.tap(x, y));
    await expect(fact).toBeVisible();
  });
});

test('with HTML-in-Canvas, the fun fact develops on the portrait as real DOM', async ({ playwright, baseURL }) => {
  const browser = await playwright.chromium.launch({ args: ['--enable-blink-features=CanvasDrawElement'] });
  const page = await browser.newPage({ baseURL });
  await page.goto('/');
  test.skip(!(await page.evaluate(() => 'onpaint' in HTMLCanvasElement.prototype)), 'this Chromium has no HTML-in-Canvas');
  const fact = await whack(page, (x, y) => page.mouse.click(x, y));
  await expect(fact.locator('canvas').getByText(/fun fact/i)).toBeAttached();
  await browser.close();
});

test('typing "play a game" in chat runs a 3-question project quiz with no backend call', async ({ page }) => {
  const chatCalls: string[] = [];
  await page.route('**/api/chat', (route) => {
    chatCalls.push(route.request().url());
    return route.abort();
  });
  await page.goto('/');
  await page.locator('nav[aria-label="Primary"] button[data-nav-chat]').click();
  const panel = page.locator('[data-chat-panel]');
  const input = panel.locator('textarea');
  const log = panel.locator('[data-chat-log]');

  await input.fill("Let's PLAY a game!");
  await input.press('Enter');
  await expect(log.getByText(/guess which project jordan built/i)).toBeVisible();

  for (let round = 1; round <= 3; round++) {
    const choices = log.locator('.chat-followups button');
    await expect(choices).toHaveCount(3);
    await choices.first().click();
  }
  await expect(log.getByText(/you got [0-3] of 3/i)).toBeVisible();
  expect(chatCalls).toHaveLength(0);

  // Any other text goes back to the normal assistant.
  await input.fill('What are you working on?');
  await input.press('Enter');
  await expect.poll(() => chatCalls.length).toBe(1);
});
