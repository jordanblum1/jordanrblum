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

  // The BLUM mark is the only visible header identity; hidden text keeps the
  // heading available to assistive technology.
  await expect(panel.locator('#chat-panel-title')).toHaveText('Jordy');
  await expect(panel.locator('.chat-tagline')).toHaveCount(0);
  await expect(panel).toHaveAttribute('aria-label', 'Chat with Jordy, Jordan’s assistant');
  const intro = page.locator('[data-chat-intro]');
  await expect(intro).toBeVisible();
  await expect(intro).toContainText('Hey — I’m Jordy, Jordan’s assistant.');
  await expect(intro).toContainText('I can give you the quick version of his work, side projects, and background.');
  await expect(intro).toContainText('Pick a question below, or ask your own.');

  // No persistent mailto in the panel — the email only surfaces inside
  // error/limit notices.
  await expect(panel.locator('.chat-footer')).toHaveCount(0);
  await expect(panel.locator('a[href^="mailto:"]')).toHaveCount(0);
});

test('the BLUM mark animates in without shifting the header layout', async ({ page }) => {
  await page.locator('nav[aria-label="Primary"] button[data-nav-chat]').click();
  const panel = page.locator('[data-chat-panel]');
  await expect(panel).toBeVisible();
  // Let the 240ms open transition settle before measuring geometry.
  await page.waitForTimeout(500);

  const logo = panel.locator('.chat-header [data-chat-logo]');
  await expect(logo).toBeVisible();
  await expect(logo).toHaveAttribute('aria-hidden', 'true');
  await expect(logo.locator('svg .logo-piece')).toHaveCount(4);
  await expect(panel.locator('.chat-doodle')).toHaveCount(0);
  await expect(panel.locator('#chat-panel-title')).toHaveText('Jordy');

  // The pieces animate inside a fixed-size mark, so the header does not move.
  const title = panel.locator('#chat-panel-title');
  const titleBefore = await title.boundingBox();
  const logoBefore = await logo.boundingBox();
  await page.waitForTimeout(800);
  expect(await title.boundingBox()).toEqual(titleBefore);
  expect(await logo.boundingBox()).toEqual(logoBefore);
});

test('the panel unfolds from the composer corner and reverses before hiding', async ({ page }) => {
  const navChat = page.locator('nav[aria-label="Primary"] button[data-nav-chat]');
  const panel = page.locator('[data-chat-panel]');

  await navChat.click();
  await expect(panel).toBeVisible();

  const motion = await panel.evaluate((element) => {
    const panelStyle = getComputedStyle(element);
    const bounds = element.getBoundingClientRect();
    const [originX, originY] = panelStyle.transformOrigin.split(' ').map(Number.parseFloat);
    const delay = (selector: string) => getComputedStyle(element.querySelector(selector)!).transitionDelay;
    return {
      transitionProperty: panelStyle.transitionProperty,
      transitionDuration: panelStyle.transitionDuration,
      originX,
      originY,
      width: bounds.width,
      height: bounds.height,
      headerDelay: delay('.chat-header'),
      bodyDelay: delay('.chat-body'),
      formDelay: delay('.chat-form'),
    };
  });

  expect(motion.transitionProperty).toContain('transform');
  expect(motion.transitionProperty).toContain('box-shadow');
  expect(motion.transitionDuration).toContain('0.48s');
  expect(motion.originX).toBeGreaterThan(motion.width / 2);
  expect(motion.originY).toBeGreaterThan(motion.height / 2);
  expect(motion.headerDelay).toBe('0.04s');
  expect(motion.bodyDelay).toBe('0.08s');
  expect(motion.formDelay).toBe('0.12s');

  await page.locator('[data-chat-close]').click();
  await expect(panel).not.toHaveClass(/is-open/);
  await expect(panel).not.toHaveAttribute('hidden', '');
  await expect(panel).toBeHidden();
  await expect(navChat).toBeFocused();
});

test('the empty state shows four starter chips with the suggested questions', async ({ page }) => {
  await page.locator('nav[aria-label="Primary"] button[data-nav-chat]').click();

  const chips = page.locator('[data-chat-intro] .chat-chip');
  await expect(chips).toHaveCount(4);
  await expect(chips.nth(0)).toHaveText("What's his recent work experience?");
  await expect(chips.nth(1)).toHaveText('What has he built?');
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
    "What's his recent work experience?",
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
  // The chat CTA is the footer's single contact CTA — no mailto fallback.
  await expect(page.getByRole('contentinfo').locator('a[href^="mailto:"]')).toHaveCount(0);

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

test('a typing indicator shows while the reply generates and the full reply reveals at once', async ({ page }) => {
  // Playwright's route.fulfill can only deliver a complete body, so a real
  // local SSE server streams one delta immediately and holds the stream open —
  // long enough to observe the buffering state: the indicator is up and
  // nothing has painted yet, even though a delta already arrived.
  const responses = new Set<import('node:http').ServerResponse>();
  const server: Server = createServer((request, response) => {
    responses.add(response);
    response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
    response.write('data: {"type":"delta","text":"Jordan is a **full-stack** engineer"}\n\n');
    const finish = setTimeout(() => {
      response.write('data: {"type":"delta","text":" at Roam."}\n\ndata: {"type":"done"}\n\n');
      response.end();
    }, 700);
    request.on('close', () => {
      clearTimeout(finish);
      responses.delete(response);
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;

  try {
    await page.route('**/api/chat', (route) => route.continue({ url: `http://127.0.0.1:${port}/api/chat` }));

    await page.locator('nav[aria-label="Primary"] button[data-nav-chat]').click();
    await page.locator('[data-chat-input]').fill('Tell me everything about Jordan');
    await page.locator('[data-chat-send]').click();

    // The indicator appears immediately on send: three decorative dots in an
    // assistant bubble, hidden from assistive tech (the announcer covers it).
    const typing = page.locator('[data-chat-log] .chat-typing');
    await expect(typing).toBeVisible();
    await expect(typing.locator('.chat-typing-dot')).toHaveCount(3);
    await expect(typing).toHaveAttribute('aria-hidden', 'true');

    // No progressive paint: deltas buffer silently behind the indicator, and
    // there is no stop affordance in any state.
    const painted = page.locator('[data-chat-log] .chat-bubble.role-assistant:not(.chat-typing)');
    await expect(painted).toHaveCount(0);
    await expect(page.locator('[data-chat-stop]')).toHaveCount(0);

    // On completion the indicator is gone and the whole reply is revealed,
    // markdown rendered.
    await expect(painted).toHaveCount(1);
    await expect(typing).toHaveCount(0);
    await expect(painted.first().locator('strong')).toHaveText('full-stack');
    await expect(painted.first()).toContainText('Jordan is a full-stack engineer at Roam.');
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
  // The rate-limit notice keeps the email reachable inline.
  const mailto = errorBubble.locator('a[href="mailto:jordanblum16@gmail.com"]');
  await expect(mailto).toBeVisible();
  await expect(mailto).toHaveText('email Jordan directly');
});

test('an unreachable backend shows an error bubble with a working mailto escape hatch', async ({ page }) => {
  await page.route('**/api/chat', async (route) => {
    await route.fulfill({ status: 502, contentType: 'text/plain', body: 'Bad Gateway' });
  });

  await page.locator('nav[aria-label="Primary"] button[data-nav-chat]').click();
  await page.locator('[data-chat-input]').fill('Hello?');
  await page.locator('[data-chat-send]').click();

  const errorBubble = page.locator('[data-chat-log] .chat-bubble.role-system').last();
  await expect(errorBubble).toContainText('Something went wrong reaching Jordy.');

  // The inline mailto is the only remaining email surface when the backend is
  // down — it must be a real, visible anchor with the site's contact address.
  const mailto = errorBubble.locator('a[href="mailto:jordanblum16@gmail.com"]');
  await expect(mailto).toBeVisible();
  await expect(mailto).toHaveText('email Jordan directly');
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

test('the question anchors near the top of the log on the second exchange', async ({ page }) => {
  const reply =
    'Jordan is a full-stack engineer at Roam. He works across the product, from realtime ' +
    'infrastructure to interface polish, and keeps a stable of side projects going on the weekends. ' +
    'Ask about any of them and I can go deeper.';
  await page.route('**/api/chat', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: sseBody([
        { type: 'delta', text: reply.slice(0, 60) },
        { type: 'delta', text: reply.slice(60) },
        { type: 'done' },
      ]),
    });
  });

  await page.locator('nav[aria-label="Primary"] button[data-nav-chat]').click();
  const userBubbles = page.locator('[data-chat-log] .chat-bubble.role-user');
  const input = page.locator('[data-chat-input]');

  await input.fill('First question about Jordan?');
  await page.locator('[data-chat-send]').click();
  await expect(page.locator('[data-chat-log] .chat-followups .chat-chip').first()).toBeVisible();

  await input.fill('Second question about Roam?');
  await page.locator('[data-chat-send]').click();
  await expect(userBubbles).toHaveCount(2);
  await expect(page.locator('[data-chat-log] .chat-bubble.role-assistant')).toHaveCount(2);
  await expect(page.locator('[data-chat-log] .chat-followups .chat-chip').first()).toBeVisible();

  // Measured anchor: after the exchange settles, the scroller really sits at
  // the second question's top-anchor position (offsetTop - 12), not clamped
  // to the old bottom.
  const measured = await page.evaluate(() => {
    const scroller = document.querySelector<HTMLElement>('[data-chat-scroll]')!;
    const bubbles = document.querySelectorAll<HTMLElement>('[data-chat-log] .chat-bubble.role-user');
    const last = bubbles[bubbles.length - 1];
    return {
      scrollTop: scroller.scrollTop,
      target: Math.max(0, last.offsetTop - 12),
      spacer: document.querySelector('[data-chat-log] .chat-spacer') !== null,
    };
  });
  expect(measured.target).toBeGreaterThan(0);
  expect(Math.abs(measured.scrollTop - measured.target)).toBeLessThanOrEqual(2);
  expect(measured.spacer).toBe(true);
});

test('a quiet character counter appears once the input nears the 2000-char cap', async ({ page }) => {
  await page.locator('nav[aria-label="Primary"] button[data-nav-chat]').click();
  const input = page.locator('[data-chat-input]');
  const counter = page.locator('[data-chat-count]');

  await input.fill('x'.repeat(1699));
  await expect(counter).toBeHidden();

  await input.fill('x'.repeat(1700));
  await expect(counter).toBeVisible();
  await expect(counter).toHaveText('1,700 / 2,000');

  await input.fill('x'.repeat(1840));
  await expect(counter).toHaveText('1,840 / 2,000');

  // Clearing the field puts the counter away again.
  await input.fill('short again');
  await expect(counter).toBeHidden();
});

test.describe('mobile sheet', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('opening the sheet locks the page scroll behind it and closing restores it', async ({ page }) => {
    const cta = page.locator('[data-footer-chat-cta]');
    await cta.scrollIntoViewIfNeeded();
    const scrollBefore = await page.evaluate(() => Math.round(window.scrollY));
    expect(scrollBefore).toBeGreaterThan(0);

    await cta.click();
    await expect(page.locator('[data-chat-panel]')).toBeVisible();

    // position:fixed body lock, preserving the scroll offset. Freezing the
    // page is what keeps the iOS toolbar (and therefore 100dvh) stable.
    const lock = await page.evaluate(() => ({
      position: document.body.style.position,
      top: document.body.style.top,
      overflow: document.body.style.overflow,
      overscroll: document.body.style.overscrollBehavior,
    }));
    expect(lock.position).toBe('fixed');
    expect(lock.top).toBe(`-${scrollBefore}px`);
    expect(lock.overflow).toBe('hidden');
    expect(lock.overscroll).toBe('none');

    // The sheet fills the viewport edge-to-edge — pure CSS dvh geometry, with
    // no JS writing top/height inline styles.
    // (Polling: the 240ms enter transition translates the sheet up into place.)
    const sheet = page.locator('[data-chat-panel]');
    await expect.poll(async () => Math.round((await sheet.boundingBox())!.y)).toBe(0);
    const box = (await sheet.boundingBox())!;
    expect(Math.round(box.x)).toBe(0);
    expect(Math.round(box.width)).toBe(390);
    expect(Math.round(box.height)).toBe(844);
    const inline = await page.evaluate(() => {
      const panel = document.querySelector<HTMLElement>('[data-chat-panel]')!;
      return { top: panel.style.top, height: panel.style.height };
    });
    expect(inline.top).toBe('');
    expect(inline.height).toBe('');

    // Wheeling over the open sheet must not scroll the page behind it.
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(100);
    expect(await page.evaluate(() => document.body.style.position)).toBe('fixed');
    expect(await page.evaluate(() => document.body.style.top)).toBe(`-${scrollBefore}px`);

    await page.keyboard.press('Escape');
    await expect(page.locator('[data-chat-panel]')).toBeHidden();
    expect(await page.evaluate(() => document.body.style.position)).toBe('');
    expect(await page.evaluate(() => Math.round(window.scrollY))).toBe(scrollBefore);
  });

  test('the composer stays visible when the viewport shrinks like a software keyboard', async ({ page }) => {
    const cta = page.locator('[data-footer-chat-cta]');
    await cta.scrollIntoViewIfNeeded();
    await cta.click();
    await expect(page.locator('[data-chat-panel]')).toBeVisible();

    // ≥16px input font so iOS Safari does not zoom on focus.
    const fontSize = await page
      .locator('[data-chat-input]')
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(fontSize).toBeGreaterThanOrEqual(16);

    await page.locator('[data-chat-input]').click();
    await page.setViewportSize({ width: 390, height: 500 });

    await expect(page.locator('[data-chat-form]')).toBeInViewport();
    await expect(page.locator('[data-chat-input]')).toBeInViewport();
    await expect(page.locator('[data-chat-send]')).toBeInViewport();
  });
});
