import { expect, test } from '@playwright/test';

test('homepage shell renders the new navigation, generalist hero, and footer', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('nav[aria-label="Primary"] a[href="#work"]')).toHaveText('Work');
  await expect(page.locator('nav[aria-label="Primary"] a[href="/about"]')).toHaveText('About');
  await expect(page.locator('nav[aria-label="Primary"] button[data-nav-chat]')).toContainText('Chat');
  await expect(page.locator('nav[aria-label="Primary"] a[href="mailto:jordanblum16@gmail.com"]')).toBeHidden();
  const home = page.getByRole('link', { name: 'Jordan Blum — home' });
  await expect(home).toBeVisible();
  await expect(home.locator('.mark-red')).toHaveCSS('opacity', '1');
  await home.hover();
  await expect(home.locator('.mark-blue')).toHaveCSS('opacity', '1');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('product engineer in New York');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('AI agents');
  await expect(page.locator('.profile-facts > li')).toHaveCount(2);
  await expect(page.locator('.profile-facts')).toContainText('New York');
  await expect(page.locator('.profile-facts')).not.toContainText('Consumer products · AI agents');
  await expect(page.locator('.profile-facts a[href="https://www.withroam.com"] img')).toHaveAttribute('alt', 'Roam');
  await expect(page.locator('.status')).toHaveCount(0);
  await expect(page.getByRole('contentinfo')).toContainText('Want to chat?');
  await expect(page.getByRole('contentinfo')).toContainText('New York');
  await expect(page.locator('footer .social a')).toHaveCount(3);
  await expect(page.getByRole('contentinfo').locator('a[href^="mailto:"]')).toHaveCount(0);
  await expect(page.locator('.off-clock, .footer-kicker')).toHaveCount(0);
  await expect(page.locator('.personal-note .note-logo')).toBeVisible();
  await expect(page.locator('.personal-note .note-caption')).toHaveCount(0);
  await expect(page.locator('.personal-note')).not.toContainText('music · bikes · photos · links');
  await expect(page.locator('.personal-note')).not.toContainText('old internet corner');
});

test('portfolio display headings share the Chillax personality face', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('#hero-title')).toHaveCSS('font-family', /Chillax/);
  await expect(page.locator('#work-heading')).toHaveCSS('font-family', /Chillax/);
  await expect(page.locator('#more-heading')).toHaveCSS('font-family', /Chillax/);
  await expect(page.locator('#about-preview-heading')).toHaveCSS('font-family', /Chillax/);
  await expect(page.locator('.footer-title')).toHaveCSS('font-family', /Chillax/);

  await page.goto('/about');
  await expect(page.locator('.about-hero h1')).toHaveCSS('font-family', /Chillax/);
  await expect(page.locator('#experience-heading')).toHaveCSS('font-family', /Chillax/);
  await expect(page.locator('#archive-heading')).toHaveCSS('font-family', /Chillax/);
});

test('home and About heroes develop in without double-animating the work field', async ({ page }) => {
  await page.goto('/');

  const intro = page.locator('.intro-panel');
  const portrait = page.locator('.portrait-panel');
  await expect(intro).toHaveAttribute('data-page-reveal', '1');
  await expect(intro).toHaveCSS('animation-name', 'page-develop-in');
  await expect(intro).toHaveCSS('animation-duration', '0.48s');
  await expect(portrait).toHaveCSS('animation-delay', '0.07s');
  await expect(page.locator('.field-panel')).toHaveCSS('animation-name', 'none');
  const firstBlumPiece = page.locator('.field-art #Layer_1');
  await expect(firstBlumPiece).toHaveCSS('animation-name', 'blum-assemble');
  await expect(firstBlumPiece.locator('path')).toHaveCSS('animation-name', 'blum-ink');
  await expect(firstBlumPiece.locator('path')).toHaveAttribute('pathLength', '1');

  await page.goto('/about');
  await expect(page.locator('[data-page-reveal]')).toHaveCount(4);
  await expect(page.getByRole('heading', { level: 1 })).toHaveAttribute('data-page-reveal', '1');
  await expect(page.locator('.lifestyle-panel')).toHaveAttribute('data-page-reveal', '2');
  await expect(page.locator('.jump-link')).toHaveAttribute('data-page-reveal', '3');
  await expect(page.locator('.hero-prose')).toHaveAttribute('data-page-reveal', '3');
  await expect(page.locator('.hero-prose')).toHaveCSS('animation-delay', '0.14s');
});

test('centered nav keeps winding past one full turn and preserves direction through release', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 760 });
  await page.goto('/');

  const nav = page.locator('[data-nav-pill]');
  const box = await nav.boundingBox();
  if (!box) throw new Error('Navigation was not laid out');
  expect(Math.abs(box.x + box.width / 2 - 640)).toBeLessThanOrEqual(2);
  const restingWidth = box.width;

  for (let pulse = 0; pulse < 12; pulse += 1) {
    await page.mouse.wheel(0, 180);
    await page.waitForTimeout(55);
  }
  await expect.poll(() => nav.evaluate((element, resting) => {
    const label = element.querySelector('.nav-label');
    const icon = element.querySelector('.nav-icon');
    const mark = element.querySelector<HTMLElement>('[data-nav-mark]');
    return element.hasAttribute('data-scrolling')
      && element.getBoundingClientRect().width < resting * 0.55
      && Number.parseFloat(getComputedStyle(label!).opacity) < 0.5
      && Number.parseFloat(getComputedStyle(icon!).opacity) > 0.5
      && Math.abs(Number.parseFloat(mark?.style.getPropertyValue('--mark-wind') ?? '0')) > 600;
  }, restingWidth)).toBe(true);
  await expect.poll(() => nav.getAttribute('data-scrolling')).toBeNull();
  const mark = nav.locator('[data-nav-mark]');
  await expect.poll(() => mark.getAttribute('data-releasing')).toBe('');
  await page.evaluate(() => window.dispatchEvent(new Event('scroll')));
  await page.waitForTimeout(50);
  await expect(mark).toHaveAttribute('data-releasing', '');
  const releaseStart = await mark.evaluate((element) => Number.parseFloat((element as HTMLElement).style.getPropertyValue('--mark-wind')));
  await page.waitForTimeout(100);
  const releaseLater = await mark.evaluate((element) => Number.parseFloat((element as HTMLElement).style.getPropertyValue('--mark-wind')));
  expect(releaseLater).toBeGreaterThan(releaseStart + 25);
  await expect.poll(async () => (await nav.boundingBox())?.width ?? 0).toBeGreaterThan(restingWidth * 0.95);
  await expect.poll(() => mark.getAttribute('data-releasing')).toBeNull();
  await expect(mark).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
  await expect(nav).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
});

test('reversing upward cancels release without a snap and takes counter-clockwise control', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 760 });
  await page.goto('/');

  const nav = page.locator('[data-nav-pill]');
  const mark = nav.locator('[data-nav-mark]');
  const readAngle = () => mark.evaluate((element) => Number.parseFloat((element as HTMLElement).style.getPropertyValue('--mark-wind') || '0'));

  for (let pulse = 0; pulse < 6; pulse += 1) {
    await page.mouse.wheel(0, 180);
    await page.waitForTimeout(55);
  }

  await expect.poll(readAngle).toBeGreaterThan(300);
  await expect.poll(() => mark.getAttribute('data-releasing')).toBe('');
  await expect.poll(readAngle).toBeGreaterThan(500);
  const beforeReverse = await readAngle();

  await page.mouse.wheel(0, -220);
  await expect.poll(() => mark.getAttribute('data-releasing')).toBeNull();
  await expect.poll(() => nav.getAttribute('data-scrolling')).toBe('');

  await page.waitForTimeout(34);
  const firstUpFrame = await readAngle();
  await page.waitForTimeout(34);
  const secondUpFrame = await readAngle();

  expect(Math.abs(firstUpFrame - beforeReverse)).toBeLessThan(90);
  expect(secondUpFrame).toBeLessThan(firstUpFrame - 1);

  await expect.poll(() => mark.getAttribute('data-releasing')).toBe('');
  const upwardReleaseStart = await readAngle();
  await page.waitForTimeout(100);
  expect(await readAngle()).toBeLessThan(upwardReleaseStart - 25);
  await expect.poll(() => mark.getAttribute('data-releasing')).toBeNull();
  await expect(mark).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
});

test('document metadata, structured data, and keyboard skip link are present', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle('Jordan Blum — Product Engineer in New York');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /consumer products, developer platforms, AI tools/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://blumjordan.com/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'https://blumjordan.com/og-image.png');
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/favicon.png');
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', '/apple-touch-icon.png');

  const schema = await page.locator('script[type="application/ld+json"]').textContent();
  expect(JSON.parse(schema ?? '{}')).toMatchObject({ '@type': 'Person', name: 'Jordan Blum', jobTitle: 'Product Engineer' });

  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
});

test('the site stays light when the operating system prefers dark mode', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
  await page.goto('/');

  const root = page.locator('html');
  await expect(root).not.toHaveAttribute('data-theme');

  const palette = await root.evaluate((element) => {
    const styles = getComputedStyle(element);
    return {
      colorScheme: styles.colorScheme,
      paper: styles.getPropertyValue('--paper').trim(),
      ink: styles.getPropertyValue('--ink').trim(),
    };
  });
  expect(palette.colorScheme).toContain('light');
  expect(palette.colorScheme).not.toContain('dark');
  expect(palette.paper.toLowerCase()).toBe('#f7f3ed');
  expect(palette.ink.toLowerCase()).toBe('#2b2521');

  const home = page.getByRole('link', { name: 'Jordan Blum — home' });
  await expect(home.locator('.mark-red')).toHaveCSS('opacity', '1');
  await expect(home.locator('.mark-blue')).toHaveCSS('opacity', '0');
  await expect(home.locator('.mark-white')).toHaveCount(0);
  await expect(page.locator('.roam-fact img')).toHaveCSS('filter', 'none');
  await expect(page.locator('.personal-note .note-logo')).toHaveCSS('filter', 'none');

  const themeColors = page.locator('meta[name="theme-color"]');
  await expect(themeColors).toHaveCount(1);
  await expect(themeColors).toHaveAttribute('content', '#F7F3ED');
  await expect(themeColors).not.toHaveAttribute('media');
  await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute('content', 'light');
});

test('retired v3 portfolio structures are absent', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-workbench], .story-track, .sheet-frame, .project-artifact')).toHaveCount(0);
});

test('custom 404 keeps the site voice and a route home', async ({ page }) => {
  const response = await page.goto('/definitely-missing');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('This one wandered off.');
  await expect(page.getByRole('link', { name: /Back home/ })).toHaveAttribute('href', '/');
});
