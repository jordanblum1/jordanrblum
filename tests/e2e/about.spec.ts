import { expect, test } from '@playwright/test';

test('about page carries the broader story, experience, and education', async ({ page }) => {
  await page.goto('/about');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('I like making things. I like making them look good, too.');
  await expect(page.getByText('I studied computer science and studio art so I could do both.')).toBeVisible();
  await expect(page.locator('.about-hero .lifestyle-panel img')).toHaveAttribute('alt', /Jordan biking, traveling/);
  const desktopCollage = await page.locator('.about-hero .lifestyle-panel').boundingBox();
  expect(desktopCollage).not.toBeNull();
  expect(desktopCollage!.width).toBeGreaterThan(450);
  await expect(page.locator('main > .portrait')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Capabilities' })).toHaveCount(0);
  await expect(page.locator('.about-hero > .eyebrow, .section-intro > .section-kicker')).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Experience/ })).toHaveAttribute('href', '#work');

  const experienceTitleBox = await page.getByRole('heading', { level: 2, name: 'Experience' }).boundingBox();
  const experienceListBox = await page.locator('.experience-list').boundingBox();
  const archiveTitleBox = await page.getByRole('heading', { level: 2, name: 'Public project archive' }).boundingBox();
  const archiveListBox = await page.locator('#projects .archive-table').boundingBox();
  expect(experienceTitleBox).not.toBeNull();
  expect(experienceListBox).not.toBeNull();
  expect(archiveTitleBox).not.toBeNull();
  expect(archiveListBox).not.toBeNull();
  expect(Math.abs(experienceTitleBox!.x - experienceListBox!.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(archiveTitleBox!.x - archiveListBox!.x)).toBeLessThanOrEqual(1);

  const roles = page.locator('.experience-item');
  await expect(roles).toHaveCount(3);
  await expect(page.locator('#roam')).toContainText('the third engineer on a four-person engineering team');
  await expect(page.locator('#roam')).toContainText('Fifth Wall co-founder Brendan Wallace');
  await expect(page.locator('#roam .experience-track')).toHaveCount(2);
  await expect(page.locator('#roam')).toContainText('Roam marketplace');
  await expect(page.locator('#roam')).toContainText('Reed, the AI realtor');
  await expect(page.locator('#roam')).toContainText('01 · Product engineering');
  await expect(page.locator('#roam')).toContainText('02 · AI product & systems');
  await expect(page.locator('#roam')).toContainText('one of two lead engineers building Reed');
  await expect(page.locator('#roam')).toContainText('internal agent harness our team uses to plan, dispatch, and supervise parallel coding agents');
  const mediaDisclosure = page.locator('#roam [data-roam-samples]');
  const mediaSummary = mediaDisclosure.locator('summary');
  await expect(mediaDisclosure).toContainText('Selected work from Roam');
  await expect(mediaDisclosure).toContainText('View 6 screens');
  await expect(mediaDisclosure).not.toHaveAttribute('open', '');
  await expect(page.locator('#roam .experience-media .media-card')).toHaveCount(3);
  await expect(page.locator('#roam .experience-media .media-shot')).toHaveCount(6);
  await expect(page.locator('#roam .experience-media img')).toHaveCount(6);
  await expect(page.locator('#roam .experience-media a')).toHaveCount(0);
  await expect(page.locator('#roam .experience-media')).toContainText('synthetic demo data');
  await expect(page.locator('#roam .experience-media .media-card').first()).not.toBeVisible();
  await mediaSummary.focus();
  await page.keyboard.press('Enter');
  await expect(mediaDisclosure).toHaveAttribute('open', '');
  await expect(mediaDisclosure.locator('.experience-media-panel')).toHaveCSS('opacity', '1');
  await page.waitForTimeout(300);
  const desktopMediaCards = page.locator('#roam .experience-media .media-card');
  const marketplaceMediaBox = await desktopMediaCards.nth(0).boundingBox();
  const reedMediaBox = await desktopMediaCards.nth(1).boundingBox();
  const harnessMediaBox = await desktopMediaCards.nth(2).boundingBox();
  expect(marketplaceMediaBox).not.toBeNull();
  expect(reedMediaBox).not.toBeNull();
  expect(harnessMediaBox).not.toBeNull();
  expect(Math.abs(reedMediaBox!.x - marketplaceMediaBox!.x)).toBeLessThanOrEqual(1);
  expect(reedMediaBox!.y).toBeGreaterThan(marketplaceMediaBox!.y);
  expect(harnessMediaBox!.y).toBeGreaterThan(reedMediaBox!.y);

  for (const mediaCard of await desktopMediaCards.all()) {
    const shots = mediaCard.locator('.media-shot');
    const firstShotBox = await shots.nth(0).boundingBox();
    const secondShotBox = await shots.nth(1).boundingBox();
    expect(firstShotBox).not.toBeNull();
    expect(secondShotBox).not.toBeNull();
    expect(secondShotBox!.x).toBeGreaterThan(firstShotBox!.x + firstShotBox!.width);
  }

  const mediaImages = page.locator('#roam .experience-media img');
  for (const image of await mediaImages.all()) {
    const metrics = await image.evaluate((element) => {
      const img = element as HTMLImageElement;
      return {
        displayedRatio: img.clientWidth / img.clientHeight,
        naturalRatio: img.naturalWidth / img.naturalHeight,
        sameOrigin: new URL(img.currentSrc).origin === window.location.origin,
      };
    });
    expect(metrics.displayedRatio).toBeCloseTo(metrics.naturalRatio, 2);
    expect(metrics.sameOrigin).toBe(true);
  }
  await mediaSummary.click();
  await expect(mediaDisclosure).not.toHaveAttribute('open', '');
  await expect(desktopMediaCards.first()).not.toBeVisible();
  await expect(page.locator('#procore')).toContainText('600+ person engineering organization');
  await expect(page.locator('#workday')).toContainText('Associate DevOps / Release Engineer → Senior Associate Developer');
  await expect(page.locator('.resume-notes')).toContainText('BS Computer Science · Studio Art minor (Graphic Design)');
  await expect(page.locator('.education-note')).toContainText('Student Ambassador (campus tour guide)');
  await expect(page.locator('.education-note')).toContainText('IT Technician');
  await expect(page.locator('.education-note')).toContainText('Sophomore—senior year');
  await expect(page.locator('.education-note .scu-link')).toHaveAttribute('href', 'https://www.scu.edu');
  await expect(page.locator('.education-note .scu-link')).toContainText('Santa Clara University');
  await expect(page.locator('.education-note .scu-emblem img')).toHaveAttribute('src', '/company/scu-broncos.svg');
  const educationLine = page.locator('.education-degree');
  const educationLink = educationLine.locator('.scu-link');
  const educationDetails = educationLine.locator('.education-details');
  const educationLinkBox = await educationLink.boundingBox();
  expect(educationLinkBox).not.toBeNull();
  await expect(educationDetails).toBeVisible();
  await expect(educationLine.locator(':scope > .scu-link')).toHaveCount(1);
  expect(educationLinkBox!.height).toBeGreaterThanOrEqual(44);

  for (const [company, href] of [
    ['roam', 'https://www.withroam.com'],
    ['procore', 'https://www.procore.com'],
    ['workday', 'https://www.workday.com'],
  ]) {
    const companyLink = page.locator(`#${company} .company-link`);
    await expect(companyLink).toHaveAttribute('href', href);
    await expect(companyLink).toHaveAttribute('aria-label', new RegExp(`Visit ${company}`, 'i'));
    await expect(companyLink.locator('.company-logo img')).toHaveAttribute('src', `/company/${company}.svg`);
    await expect(companyLink.locator('.company-arrow')).toHaveText('↗');
    await expect(companyLink.locator('h3')).toHaveCount(0);
    await expect(companyLink.locator('.company-title')).toHaveCount(0);
    await expect(page.locator(`#${company} > .experience-heading > h3.role`)).toBeVisible();
    const companyLinkBox = await companyLink.boundingBox();
    expect(companyLinkBox).not.toBeNull();
    expect(companyLinkBox!.height).toBeGreaterThanOrEqual(44);
  }
});

test('about hero and education stay compact on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/about');

  const mediaDisclosure = page.locator('#roam [data-roam-samples]');
  await mediaDisclosure.locator('summary').click();
  await expect(mediaDisclosure).toHaveAttribute('open', '');
  await expect(mediaDisclosure.locator('.experience-media-panel')).toHaveCSS('opacity', '1');
  await page.waitForTimeout(300);

  const collage = page.locator('.about-hero .lifestyle-panel');
  await expect(collage).toBeVisible();
  const collageBox = await collage.boundingBox();
  expect(collageBox).not.toBeNull();
  expect(collageBox!.x).toBeGreaterThanOrEqual(0);
  expect(collageBox!.x + collageBox!.width).toBeLessThanOrEqual(390);

  const roamTracks = page.locator('#roam .experience-track');
  await expect(roamTracks).toHaveCount(2);
  const firstTrackBox = await roamTracks.nth(0).boundingBox();
  const secondTrackBox = await roamTracks.nth(1).boundingBox();
  expect(firstTrackBox).not.toBeNull();
  expect(secondTrackBox).not.toBeNull();
  expect(secondTrackBox!.y).toBeGreaterThan(firstTrackBox!.y);

  const mediaCards = page.locator('#roam .experience-media .media-card');
  await expect(mediaCards).toHaveCount(3);
  const firstMediaBox = await mediaCards.nth(0).boundingBox();
  const secondMediaBox = await mediaCards.nth(1).boundingBox();
  const thirdMediaBox = await mediaCards.nth(2).boundingBox();
  expect(firstMediaBox).not.toBeNull();
  expect(secondMediaBox).not.toBeNull();
  expect(thirdMediaBox).not.toBeNull();
  expect(secondMediaBox!.y).toBeGreaterThan(firstMediaBox!.y);
  expect(thirdMediaBox!.y).toBeGreaterThan(secondMediaBox!.y);

  for (const mediaCard of await mediaCards.all()) {
    const shots = mediaCard.locator('.media-shot');
    const firstShotBox = await shots.nth(0).boundingBox();
    const secondShotBox = await shots.nth(1).boundingBox();
    expect(firstShotBox).not.toBeNull();
    expect(secondShotBox).not.toBeNull();
    expect(secondShotBox!.y).toBeGreaterThan(firstShotBox!.y + firstShotBox!.height);
  }

  const emblem = page.locator('.education-note .scu-emblem');
  await emblem.scrollIntoViewIfNeeded();
  const emblemBox = await emblem.boundingBox();
  expect(emblemBox).not.toBeNull();
  expect(emblemBox!.width).toBeLessThan(emblemBox!.height);
  expect(emblemBox!.height).toBe(32);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

test('about archive exposes seven public projects with real links', async ({ page }) => {
  await page.goto('/about');

  const rows = page.locator('#projects .archive-table tbody tr');
  await expect(rows).toHaveCount(7);
  await expect(page.locator('#projects a[href="https://alivestill.app"]')).toContainText('Alive Still');
  await expect(page.locator('#projects a[href="https://chicksofnyc.com"]')).toContainText('Chicks of NYC');
  await expect(page.locator('#projects a[href="https://wimdy.io"]')).toContainText('wimdy');
  await expect(page.locator('#projects a[href="https://blumblumblum.com"]')).toContainText('blumblumblum');
  await expect(page.locator('#projects thead')).toHaveCount(0);
});

test('about metadata is route-specific', async ({ page }) => {
  await page.goto('/about');

  await expect(page).toHaveTitle('About & Experience — Jordan Blum');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://blumjordan.com/about');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /consumer products, developer platforms, AI tools/);
});

test('company wordmarks and screenshots stay unchanged under a dark system preference', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/about');

  const mediaDisclosure = page.locator('#roam [data-roam-samples]');
  await mediaDisclosure.locator('summary').click();
  await expect(mediaDisclosure).toHaveAttribute('open', '');

  await expect(page.locator('#roam .company-logo img')).toHaveCSS('filter', 'none');
  await expect(page.locator('#procore .company-logo img')).toHaveCSS('filter', 'none');
  for (const image of await page.locator('#roam .experience-media img').all()) {
    await expect(image).toHaveCSS('filter', 'none');
  }
});
