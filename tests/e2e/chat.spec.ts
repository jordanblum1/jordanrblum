import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { expect, test } from '@playwright/test';

function sseBody(events: Array<Record<string, unknown>>): string {
  return events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('');
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('there is no floating launcher; the nav trigger opens the panel with the Jordy intro', async ({ page }) => {
  await expect(page.locator('[data-chat-launcher]')).toHaveCount(0);

  const navChat = page.locator('nav[aria-label="Primary"] button[data-nav-chat]');
  await expect(navChat).toBeVisible();
  await expect(navChat).toContainText('Chat');
  await expect(navChat).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('nav[aria-label="Primary"] a[href^="mailto:"]')).toBeHidden();
  await expect(page.locator('[data-chat-panel]')).toBeHidden();

  await navChat.click();

  const panel = page.locator('[data-chat-panel]');
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute('aria-modal', 'true');
  await expect(navChat).toHaveAttribute('aria-expanded', 'true');

  // Header identity + empty-state intro copy.
  await expect(panel.locator('#chat-panel-title')).toHaveText('Jordy');
  await expect(panel.locator('.chat-tagline')).toHaveText('Jordan’s assistant');
  const intro = page.locator('[data-chat-intro]');
  await expect(intro).toBeVisible();
  await expect(intro).toContainText('Hi, I’m Jordy — Jordan’s assistant.');
  await expect(intro).toContainText('Ask me about his work, his projects, or his background.');
});

test('the empty state shows four starter chips with the suggested questions', async ({ page }) => {
  await page.locator('nav[aria-label="Primary"] button[data-nav-chat]').click();

  const chips = page.locator('[data-chat-intro] .chat-chip');
  await expect(chips).toHaveCount(4);
  await expect(chips.nth(0)).toHaveText('What does Jordan do at Roam?');
  await expect(chips.nth(1)).toHaveText('Tell me about his side projects');
  await expect(chips.nth(2)).toHaveText("What's his tech stack?");
  await expect(chips.nth(3)).toHaveText('How can I get in touch?');
});

test('clicking a starter chip sends it as a user message and follow-up chips appear after the reply', async ({ page }) => {
  await page.route('**/api/chat', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: sseBody([
        { type: 'delta', text: 'He builds distributed workplace software at Roam.' },
        { type: 'done' },
      ]),
    });
  });

  await page.locator('nav[aria-label="Primary"] button[data-nav-chat]').click();
  await page.locator('[data-chat-intro] .chat-chip').first().click();

  await expect(page.locator('[data-chat-log] .chat-bubble.role-user').last()).toHaveText(
    'What does Jordan do at Roam?',
  );
  await expect(page.locator('[data-chat-intro]')).toBeHidden();
  await expect(page.locator('[data-chat-log] .chat-bubble.role-assistant').last()).toContainText(
    'workplace software at Roam',
  );

  const followUps = page.locator('[data-chat-log] .chat-followups .chat-chip');
  await expect(followUps.first()).toBeVisible();
  const count = await followUps.count();
  expect(count).toBeGreaterThanOrEqual(2);
  expect(count).toBeLessThanOrEqual(3);

  // A follow-up chip sends itself as the next user message.
  const label = (await followUps.first().textContent())?.trim() ?? '';
  await followUps.first().click();
  await expect(page.locator('[data-chat-log] .chat-bubble.role-user').last()).toHaveText(label);
});

test('the footer CTA opens the same widget panel and both triggers mirror the state', async ({ page }) => {
  const cta = page.locator('[data-footer-chat-cta]');
  await expect(cta).toBeVisible();
  await expect(cta).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('contentinfo').getByRole('link', { name: 'Email me' })).toHaveAttribute(
    'href',
    'mailto:jordanblum16@gmail.com',
  );

  await cta.click();

  await expect(page.locator('[data-chat-panel]')).toBeVisible();
  await expect(cta).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('nav[aria-label="Primary"] button[data-nav-chat]')).toHaveAttribute(
    'aria-expanded',
    'true',
  );
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

  await page.locator('nav[aria-label="Primary"] button[data-nav-chat]').click();
  await page.locator('[data-chat-input]').fill('What does Jordan do?');
  await page.locator('[data-chat-send]').click();

  await expect(page.locator('[data-chat-log] .chat-bubble.role-user').last()).toHaveText('What does Jordan do?');
  await expect(page.locator('[data-chat-log] .chat-bubble.role-assistant').last()).toHaveText('Hi there, I can help.');
});

test('markdown in the reply renders as real elements, never raw HTML', async ({ page }) => {
  await page.route('**/api/chat', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: sseBody([
        { type: 'delta', text: 'Jordan is **a full-stack' },
        { type: 'delta', text: ' engineer** who likes `TypeScript`.' },
        { type: 'delta', text: '\n\n- Roam\n- Side projects <img src=x onerror=alert(1)>' },
        { type: 'done' },
      ]),
    });
  });

  await page.locator('nav[aria-label="Primary"] button[data-nav-chat]').click();
  await page.locator('[data-chat-input]').fill('Who is Jordan?');
  await page.locator('[data-chat-send]').click();

  const reply = page.locator('[data-chat-log] .chat-bubble.role-assistant').last();
  await expect(reply.locator('strong')).toHaveText('a full-stack engineer');
  await expect(reply.locator('code')).toHaveText('TypeScript');
  await expect(reply.locator('ul li')).toHaveCount(2);
  // Injected markup stays literal text — no element is ever created from it.
  await expect(reply.locator('img')).toHaveCount(0);
  await expect(reply).toContainText('<img src=x onerror=alert(1)>');
});

test('stop generating aborts the stream and keeps the partial reply', async ({ page }) => {
  // Playwright's route.fulfill can only deliver a complete body, so a real
  // local SSE server streams one delta and then stays open until the client
  // aborts — exactly the state the stop button exists for.
  const responses = new Set<import('node:http').ServerResponse>();
  const server: Server = createServer((request, response) => {
    responses.add(response);
    response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
    response.write('data: {"type":"delta","text":"Jordan is a **full-stack** engineer"}\n\n');
    request.on('close', () => responses.delete(response));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;

  try {
    await page.route('**/api/chat', (route) => route.continue({ url: `http://127.0.0.1:${port}/api/chat` }));

    await page.locator('nav[aria-label="Primary"] button[data-nav-chat]').click();
    await page.locator('[data-chat-input]').fill('Tell me everything about Jordan');
    await page.locator('[data-chat-send]').click();

    const stop = page.locator('[data-chat-stop]');
    await expect(stop).toBeVisible();
    const reply = page.locator('[data-chat-log] .chat-bubble.role-assistant').last();
    await expect(reply).toContainText('full-stack');

    await stop.click();

    await expect(stop).toBeHidden();
    // Partial text is kept (rendered markdown included) and quietly marked.
    await expect(reply.locator('strong')).toHaveText('full-stack');
    await expect(reply.locator('.chat-stopped-note')).toHaveText('— stopped');
    await expect(page.locator('[data-chat-input]')).toBeEnabled();
  } finally {
    for (const response of responses) response.destroy();
    await new Promise((resolve) => server.close(resolve));
  }
});

test('shows the rate-limit notice when the backend streams an error event', async ({ page }) => {
  await page.route('**/api/chat', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: sseBody([{ type: 'error', code: 'rate_limited' }]),
    });
  });

  await page.locator('[data-footer-chat-cta]').click();
  await page.locator('[data-chat-input]').fill('Hello');
  await page.locator('[data-chat-send]').click();

  const errorBubble = page.locator('[data-chat-log] .chat-bubble.role-system').last();
  await expect(errorBubble).toContainText('getting a lot of messages');
});

test('Escape closes the panel and returns focus to the nav trigger that opened it', async ({ page }) => {
  const navChat = page.locator('nav[aria-label="Primary"] button[data-nav-chat]');
  await navChat.click();
  await expect(page.locator('[data-chat-panel]')).toBeVisible();

  await page.keyboard.press('Escape');

  await expect(page.locator('[data-chat-panel]')).toBeHidden();
  await expect(navChat).toHaveAttribute('aria-expanded', 'false');
  await expect(navChat).toBeFocused();
});

test('the close button returns focus to the footer CTA when it opened the panel', async ({ page }) => {
  const cta = page.locator('[data-footer-chat-cta]');
  await cta.click();
  await expect(page.locator('[data-chat-panel]')).toBeVisible();

  await page.locator('[data-chat-close]').click();

  await expect(page.locator('[data-chat-panel]')).toBeHidden();
  await expect(cta).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('nav[aria-label="Primary"] button[data-nav-chat]')).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  await expect(cta).toBeFocused();
});

test('the transcript is not a live region; exactly one announcement per completed reply', async ({ page }) => {
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

  await page.locator('nav[aria-label="Primary"] button[data-nav-chat]').click();

  // The visual log must carry no live semantics (role="log" implies aria-live).
  const log = page.locator('[data-chat-log]');
  expect(await log.getAttribute('aria-live')).toBeNull();
  expect(await log.getAttribute('role')).toBeNull();

  // Record every non-empty text the hidden announcer ever receives.
  await page.evaluate(() => {
    const announcer = document.querySelector('[data-chat-announce]')!;
    const seen: string[] = [];
    (window as unknown as { __announced: string[] }).__announced = seen;
    new MutationObserver(() => {
      const text = announcer.textContent ?? '';
      if (text) seen.push(text);
    }).observe(announcer, { childList: true, characterData: true, subtree: true });
  });

  await page.locator('[data-chat-input]').fill('What does Jordan do?');
  await page.locator('[data-chat-send]').click();

  await expect(page.locator('[data-chat-announce]')).toHaveText('Hi there, I can help.');
  // Exactly one announcement: the completed reply — never the user's message,
  // never per-delta partials.
  expect(await page.evaluate(() => (window as unknown as { __announced: string[] }).__announced)).toEqual([
    'Hi there, I can help.',
  ]);

  // Reopening the panel re-renders history but must not re-announce it.
  await page.keyboard.press('Escape');
  await page.locator('nav[aria-label="Primary"] button[data-nav-chat]').click();
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => (window as unknown as { __announced: string[] }).__announced)).toEqual([
    'Hi there, I can help.',
  ]);
});
