import { expect, test } from '@playwright/test';

test.describe('no JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('all essential homepage content remains visible and linked', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('[data-hero-field]')).toBeVisible();
    await expect(page.locator('#work .experience-list > li')).toHaveCount(3);
    await expect(page.locator('#work .project-item')).toHaveCount(3);
    await expect(page.locator('#work .project-item').first()).toBeVisible();
    await expect(page.locator('.more-section .archive-table tbody tr')).toHaveCount(7);
    await expect(page.getByRole('link', { name: /Read the longer version/ })).toHaveAttribute('href', '/about');
    await expect(page.locator('.personal-note img.personal-note-image')).toBeVisible();
    await expect(page.locator('.personal-note img.note-logo')).toBeVisible();
    await expect(page.locator('footer .social a')).toHaveCount(4);
    await expect(page.getByRole('contentinfo').getByRole('link', { name: 'Email me' })).toHaveAttribute(
      'href',
      'mailto:jordanblum16@gmail.com',
    );
    await expect(page.locator('[data-chat-widget]')).toBeHidden();
    await expect(page.locator('[data-footer-chat-cta]')).toBeHidden();
    await expect(page.locator('html')).not.toHaveClass(/\bjs\b/);
    for (const revealTarget of await page.locator('[data-page-reveal]').all()) {
      await expect(revealTarget).toBeVisible();
      await expect(revealTarget).toHaveCSS('animation-name', 'none');
    }
  });

  test('resume and public archive remain readable without JavaScript', async ({ page }) => {
    await page.goto('/about');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('.experience-item')).toHaveCount(3);
    await expect(page.locator('.experience-item').first()).toBeVisible();
    const mediaRegion = page.locator('#roam [data-roam-samples]');
    const disclosures = mediaRegion.locator('details[data-roam-track]');
    await expect(disclosures).toHaveCount(3);
    await expect(mediaRegion.locator('.work-samples')).toHaveCount(3);
    await expect(mediaRegion.locator('.media-shot')).toHaveCount(6);
    await expect(mediaRegion.locator('img')).toHaveCount(6);
    await expect(mediaRegion).not.toContainText('2 screens');
    for (const disclosure of await disclosures.all()) {
      await expect(disclosure).not.toHaveAttribute('open', '');
      await expect(disclosure.locator('.media-shot')).toHaveCount(2);
      await expect(disclosure.locator('summary')).toBeVisible();
      await expect(disclosure.locator('.experience-track-detail')).not.toBeVisible();
      await expect(disclosure.locator('.media-shot').first()).not.toBeVisible();
    }
    await disclosures.nth(0).locator('summary').evaluate((element) => (element as HTMLElement).click());
    await disclosures.nth(1).locator('summary').evaluate((element) => (element as HTMLElement).click());
    await expect(disclosures.nth(0)).toHaveAttribute('open', '');
    await expect(disclosures.nth(1)).toHaveAttribute('open', '');
    await expect(disclosures.nth(0).locator('.media-shot').first()).toBeVisible();
    await expect(disclosures.nth(1).locator('.media-shot').first()).toBeVisible();
    await disclosures.nth(0).locator('summary').evaluate((element) => (element as HTMLElement).click());
    await expect(disclosures.nth(0)).not.toHaveAttribute('open', '');
    await expect(disclosures.nth(1)).toHaveAttribute('open', '');
    await expect(page.locator('#projects .archive-table tbody tr')).toHaveCount(7);
    await expect(page.locator('html')).not.toHaveClass(/\bjs\b/);
    for (const revealTarget of await page.locator('[data-page-reveal]').all()) {
      await expect(revealTarget).toBeVisible();
      await expect(revealTarget).toHaveCSS('animation-name', 'none');
    }
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('navigation remains static while the page scrolls', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);

    const nav = page.locator('[data-nav-pill]');
    const mark = nav.locator('[data-nav-mark]');
    const restingWidth = (await nav.boundingBox())?.width;
    if (!restingWidth) throw new Error('Navigation was not laid out');
    const restingWind = await mark.evaluate((element) => (element as HTMLElement).style.getPropertyValue('--mark-wind'));

    await page.mouse.wheel(0, 1_200);
    await page.waitForTimeout(350);

    await expect(nav).not.toHaveAttribute('data-scrolling', '');
    await expect(mark).not.toHaveAttribute('data-releasing', '');
    expect(await mark.evaluate((element) => (element as HTMLElement).style.getPropertyValue('--mark-wind'))).toBe(restingWind);
    await expect(mark).toHaveCSS('transform', 'none');
    expect((await nav.boundingBox())?.width).toBeCloseTo(restingWidth, 1);
  });

  test('hero stays static and does not advertise pointer motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);

    const field = page.locator('[data-hero-field]');
    const bounds = await field.boundingBox();
    if (!bounds) throw new Error('Hero field was not laid out');

    await page.mouse.move(bounds.x + bounds.width * 0.8, bounds.y + bounds.height * 0.25);
    await page.waitForTimeout(50);

    await expect(field.locator('.field-prompt')).toHaveCount(0);
    await expect(field.locator('#Layer_1')).toHaveCSS('animation-name', 'none');
    expect(await field.evaluate((element) => (element as HTMLElement).style.getPropertyValue('--field-x'))).toBe('');
    expect(await field.evaluate((element) => (element as HTMLElement).style.getPropertyValue('--mark-x'))).toBe('');

    const portrait = page.locator('[data-portrait-panel]');
    const portraitBounds = await portrait.boundingBox();
    if (!portraitBounds) throw new Error('Portrait panel was not laid out');
    await page.mouse.move(
      portraitBounds.x + portraitBounds.width * 0.75,
      portraitBounds.y + portraitBounds.height * 0.35,
    );
    await page.waitForTimeout(50);
    await expect(portrait).not.toHaveClass(/is-portrait-reacting/);
    expect(await portrait.evaluate((element) => (element as HTMLElement).style.getPropertyValue('--portrait-x'))).toBe('');
    await expect(portrait.locator('.portrait-ripple')).toHaveCSS('animation-name', 'none');

    for (const reaction of [
      { href: 'https://alivestill.app', selector: '.alive-device-image' },
      { href: 'https://chicksofnyc.com', selector: '.chicks-image' },
      { href: 'https://citibikewrapped.com', selector: '.citibike-image' },
    ]) {
      const card = page.locator(`#work a[href="${reaction.href}"]`);
      await card.hover();
      await expect(card.locator(reaction.selector)).toHaveCSS('animation-name', 'none');
    }
  });

  test('page entry uses a short opacity-only reveal', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    const intro = page.locator('.intro-panel');
    await expect(intro).toHaveCSS('animation-name', 'page-fade-in');
    await expect(intro).toHaveCSS('animation-duration', '0.12s');
    await expect(intro).toHaveCSS('animation-delay', '0s');
    await expect(intro).toHaveCSS('filter', 'none');

    await page.goto('/about');
    const aboutHeading = page.getByRole('heading', { level: 1 });
    await expect(aboutHeading).toHaveCSS('animation-name', 'page-fade-in');
    await expect(aboutHeading).toHaveCSS('animation-duration', '0.12s');
    await expect(aboutHeading).toHaveCSS('filter', 'none');
  });
});

test('fine-pointer movement updates and then resets the hero field', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');

  const field = page.locator('[data-hero-field]');
  await field.scrollIntoViewIfNeeded();
  const bounds = await field.boundingBox();
  if (!bounds) throw new Error('Hero field was not laid out');

  await page.mouse.move(bounds.x + bounds.width * 0.8, bounds.y + bounds.height * 0.25);
  await expect.poll(() => field.evaluate((element) => (element as HTMLElement).style.getPropertyValue('--field-x'))).not.toBe('');
  await expect.poll(() => field.evaluate((element) => (element as HTMLElement).style.getPropertyValue('--mark-x'))).not.toBe('');

  await page.mouse.move(0, 0);
  await expect.poll(() => field.evaluate((element) => (element as HTMLElement).style.getPropertyValue('--field-x'))).toBe('');
});

test('portrait gives one springy one-shot pointer reaction', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');

  const panel = page.locator('[data-portrait-panel]');
  const bounds = await panel.boundingBox();
  if (!bounds) throw new Error('Portrait panel was not laid out');

  await page.mouse.move(bounds.x + bounds.width * 0.78, bounds.y + bounds.height * 0.3);
  await expect(panel).toHaveClass(/is-portrait-reacting/);
  await expect.poll(() => panel.evaluate((element) => (element as HTMLElement).style.getPropertyValue('--portrait-x'))).not.toBe('');
  await expect(panel.locator('.portrait-ripple')).toHaveCSS('animation-name', 'portrait-ripple');
  await expect(panel.locator('.portrait-ripple')).toHaveCSS('animation-iteration-count', '1');
  await expect(panel.locator('.portrait-glint')).toHaveCSS('animation-name', 'portrait-glint');
  await expect(panel.locator('.portrait-glint')).toHaveCSS('animation-iteration-count', '1');

  await page.mouse.move(0, 0);
  await expect(panel).not.toHaveClass(/is-portrait-reacting/);
  await expect.poll(() => panel.evaluate((element) => (element as HTMLElement).style.getPropertyValue('--portrait-x'))).toBe('');
});

for (const route of ['/', '/about']) {
  test(`${route} has no horizontal overflow at a 390px viewport`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route);

    const dimensions = await page.evaluate(() => ({
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
    }));

    expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport + 1);
    expect(dimensions.body).toBeLessThanOrEqual(dimensions.viewport + 1);
    await expect(page.locator('nav[aria-label="Primary"]')).toBeVisible();
  });
}

test('independent project cards collapse to one readable column on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const first = await page.locator('#work .project-item').nth(0).boundingBox();
  const second = await page.locator('#work .project-item').nth(1).boundingBox();
  if (!first || !second) throw new Error('Selected-work cards were not laid out');

  expect(Math.abs(first.x - second.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(first.width - second.width)).toBeLessThanOrEqual(1);
  expect(second.y).toBeGreaterThan(first.y + first.height);
});
