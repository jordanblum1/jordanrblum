import { expect, test } from '@playwright/test';

const GREETING = "Hi, I'm Jordan's assistant — I can answer any questions about him. What would you like to know?";

function sseBody(events: Array<Record<string, unknown>>): string {
  return events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('');
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('launcher is visible and opens the panel with the fixed greeting', async ({ page }) => {
  const launcher = page.locator('[data-chat-launcher]');
  await expect(launcher).toBeVisible();
  await expect(page.locator('[data-chat-panel]')).toBeHidden();

  await launcher.click();

  const panel = page.locator('[data-chat-panel]');
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute('aria-modal', 'true');
  await expect(launcher).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('[data-chat-log] .chat-bubble.role-assistant')).toHaveText(GREETING);
});

test('the footer CTA opens the same widget panel', async ({ page }) => {
  await expect(page.locator('[data-footer-chat-cta]')).toBeVisible();
  await expect(page.getByRole('contentinfo').getByRole('link', { name: 'Email me' })).toHaveAttribute(
    'href',
    'mailto:jordanblum16@gmail.com',
  );

  await page.locator('[data-footer-chat-cta]').click();

  await expect(page.locator('[data-chat-panel]')).toBeVisible();
});

test('the nav chat trigger opens the same widget panel', async ({ page }) => {
  const navChat = page.locator('nav[aria-label="Primary"] button[data-nav-chat]');
  await expect(navChat).toBeVisible();
  await expect(navChat).toContainText('Chat');
  await expect(page.locator('nav[aria-label="Primary"] a[href^="mailto:"]')).toBeHidden();

  await navChat.click();

  await expect(page.locator('[data-chat-panel]')).toBeVisible();
  await expect(page.locator('[data-chat-launcher]')).toHaveAttribute('aria-expanded', 'true');
});

test('sends a message and streams a mocked assistant reply', async ({ page }) => {
  await page.route('**/api/chat', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: sseBody([
        { type: 'delta', text: 'Hi there' },
        { type: 'delta', text: ', I can help.' },
        { type: 'done' },
      ]),
    });
  });

  await page.locator('[data-chat-launcher]').click();
  await page.locator('[data-chat-input]').fill('What does Jordan do?');
  await page.locator('[data-chat-send]').click();

  await expect(page.locator('[data-chat-log] .chat-bubble.role-user').last()).toHaveText('What does Jordan do?');
  await expect(page.locator('[data-chat-log] .chat-bubble.role-assistant').last()).toHaveText('Hi there, I can help.');
});

test('shows the rate-limit notice when the backend streams an error event', async ({ page }) => {
  await page.route('**/api/chat', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: sseBody([{ type: 'error', code: 'rate_limited' }]),
    });
  });

  await page.locator('[data-chat-launcher]').click();
  await page.locator('[data-chat-input]').fill('Hello');
  await page.locator('[data-chat-send]').click();

  const errorBubble = page.locator('[data-chat-log] .chat-bubble.role-system').last();
  await expect(errorBubble).toContainText('getting a lot of messages');
});

test('Escape closes the panel and returns focus to the launcher', async ({ page }) => {
  const launcher = page.locator('[data-chat-launcher]');
  await launcher.click();
  await expect(page.locator('[data-chat-panel]')).toBeVisible();

  await page.keyboard.press('Escape');

  await expect(page.locator('[data-chat-panel]')).toBeHidden();
  await expect(launcher).toHaveAttribute('aria-expanded', 'false');
  await expect(launcher).toBeFocused();
});
