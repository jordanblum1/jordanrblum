import { expect, test } from '@playwright/test';

test('employment and independent projects use clearly different treatments', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('#places-heading')).toHaveClass(/visually-hidden/);
  await expect(page.locator('#projects-heading')).toHaveClass(/visually-hidden/);
  await expect(page.locator('#work .experience-list > li')).toHaveCount(3);
  await expect(page.locator('#work .project-item')).toHaveCount(3);
  await expect(page.locator('#work .work-visual[aria-hidden="true"]')).toHaveCount(3);
  await expect(page.locator('#work .work-meta, #work .study-label, #work .asset-note')).toHaveCount(0);

  for (const title of ['Roam', 'Procore', 'Workday', 'Alive Still', 'Chicks of NYC', 'Citi Bike Wrapped']) {
    await expect(page.locator('#work').getByRole('heading', { level: 4, name: new RegExp(title) })).toBeVisible();
  }

  for (const experience of [
    { href: '/about#roam', focus: 'Product engineering', date: '2025—now' },
    { href: '/about#procore', focus: 'Developer platform', date: '2021—2025' },
    { href: '/about#workday', focus: 'Release tools', date: '2018—2021' },
  ]) {
    const row = page.locator(`#work a[href="${experience.href}"]`);
    await expect(row).toContainText(experience.focus);
    await expect(row).toContainText(experience.date);
  }

  await expect(page.locator('#work a[href="/about#roam"]')).toHaveCount(1);
  await expect(page.locator('#work a[href="/about#procore"]')).toHaveCount(1);
  await expect(page.locator('#work a[href="/about#workday"]')).toHaveCount(1);
  await expect(page.locator('#work a[href="https://alivestill.app"]')).toHaveAttribute('target', '_blank');
  await expect(page.locator('#work a[href="https://chicksofnyc.com"]')).toHaveAttribute('target', '_blank');
  await expect(page.locator('#work a[href="https://citibikewrapped.com"]')).toHaveAttribute('target', '_blank');
  await expect(page.locator('#work a[href="https://citibikewrapped.com"]')).toContainText('About three weeks after I posted mine on Reddit');
});

test('homepage archive includes the featured projects and omits weaker retired entries', async ({ page }) => {
  await page.goto('/');

  const rows = page.locator('.more-section .archive-table tbody tr');
  await expect(rows).toHaveCount(7);
  await expect(rows.nth(0)).toContainText('Alive Still');
  await expect(rows.nth(1)).toContainText('Chicks of NYC');
  await expect(rows.nth(2)).toContainText('Citi Bike Wrapped');
  await expect(rows.nth(2)).toContainText('A personal year in review for your Citi Bike rides');
  await expect(rows.nth(3).locator('.archive-date')).toHaveText('2024');
  await expect(rows.nth(4).locator('.archive-date')).toHaveText('2024');
  await expect(rows.nth(5)).toContainText('My hand-rolled version of Linktree, Beacons, and lnk.bio.');
  await expect(rows.nth(6).locator('.archive-date')).toHaveText('2021 - ongoing');
  await expect(page.locator('.more-section thead')).toHaveCount(0);
  await expect(page.locator('.more-section .section-kicker')).toHaveCount(0);
  await expect(page.locator('.more-section')).not.toContainText('Flâneur');
  await expect(page.locator('.more-section')).not.toContainText('Poker Night');
});

test('project artwork gets one-shot card reactions and a continuous fountain', async ({ page }) => {
  await page.goto('/');

  const aliveCard = page.locator('#work a[href="https://alivestill.app"]');
  const aliveScreens = aliveCard.locator('.alive-screen-image');
  await expect(aliveCard.locator('.alive-phone')).toHaveCount(3);
  await expect(aliveScreens).toHaveCount(3);
  const aliveSources = await aliveScreens.evaluateAll((screens) => screens.map((screen) => screen.getAttribute('src')));
  expect(new Set(aliveSources).size).toBe(3);

  for (const reaction of [
    { href: 'https://alivestill.app', selector: '.alive-phone-center', animation: 'alive-phone-center' },
    { href: 'https://chicksofnyc.com', selector: '.chicks-image', animation: 'chicks-hop' },
    { href: 'https://citibikewrapped.com', selector: '.citibike-scene', animation: 'citibike-coast' },
  ]) {
    const card = page.locator(`#work a[href="${reaction.href}"]`);
    const visual = card.locator(reaction.selector);
    await card.hover();
    await expect(visual).toHaveCSS('animation-name', reaction.animation);
    await expect(visual).toHaveCSS('animation-iteration-count', '1');
  }

  const citibikeCard = page.locator('#work a[href="https://citibikewrapped.com"]');
  const fountainOverlay = citibikeCard.locator('.citibike-fountain');
  await expect(fountainOverlay).toHaveAttribute('viewBox', '0 0 2400 1792');
  await expect(fountainOverlay).toHaveAttribute('preserveAspectRatio', 'xMidYMid slice');
  await expect(citibikeCard.locator('.fountain-jet')).toHaveCount(3);
  await expect(citibikeCard.locator('.fountain-stream-near')).toHaveCount(2);
  await expect(citibikeCard.locator('.fountain-stream-emerge')).toHaveCount(2);
  await expect(citibikeCard.locator('.fountain-stream-left')).toHaveAttribute(
    'd',
    /^M1538 555.*930 645$/,
  );
  const fountain = citibikeCard.locator('.fountain-stream-center').first();
  await citibikeCard.hover();
  await expect(fountain).toHaveCSS('animation-name', 'fountain-spout');
  await expect(fountain).toHaveCSS('animation-duration', '5.6s');
  await expect(fountain).toHaveCSS('animation-timing-function', 'linear');
  await expect(fountain).toHaveCSS('animation-iteration-count', 'infinite');
});

test('professional cards route to the corresponding experience entry', async ({ page }) => {
  await page.goto('/about#procore');
  await expect(page.locator('#procore')).toBeVisible();
  await expect(page.locator('#procore')).toContainText('600+ person engineering organization');

  await page.goto('/about#workday');
  await expect(page.locator('#workday')).toBeVisible();
  await expect(page.locator('#workday')).toContainText('about three hours a week');
});
