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
  await expect(page.locator('#roam')).toContainText('the third engineer on a four-person team');
  await expect(page.locator('#roam')).toContainText('Fifth Wall co-founder Brendan Wallace');
  await expect(page.locator('#roam .experience-track')).toHaveCount(3);
  await expect(page.locator('#roam')).toContainText('Roam marketplace');
  await expect(page.locator('#roam')).toContainText('Reed, the AI realtor');
  await expect(page.locator('#roam')).toContainText('01 · Product engineering');
  await expect(page.locator('#roam')).toContainText('02 · AI product');
  await expect(page.locator('#roam')).toContainText('03 · Agent systems');
  await expect(page.locator('#roam')).toContainText('one of two lead engineers building Reed');
  await expect(page.locator('#roam')).toContainText('internal agent harness our team uses to plan, dispatch, and supervise parallel coding agents');
  const mediaRegion = page.locator('#roam [data-roam-samples]');
  const disclosures = mediaRegion.locator('details[data-roam-track]');
  await expect(disclosures).toHaveCount(3);
  await expect(mediaRegion.locator('.work-samples')).toHaveCount(3);
  await expect(mediaRegion.locator('.media-shot')).toHaveCount(10);
  await expect(mediaRegion.locator('img')).toHaveCount(4);
  await expect(mediaRegion.locator('video')).toHaveCount(6);
  await expect(mediaRegion.locator('[data-product-video]')).toHaveCount(6);
  await expect(mediaRegion.locator('.work-samples a')).toHaveCount(0);
  await expect(mediaRegion).toContainText('synthetic demo data');
  await expect(mediaRegion).not.toContainText('2 screens');

  const trackContracts = [
    ['roam-marketplace', 'Roam marketplace', 'Search, offers, onboarding, and the tools behind them.'],
    ['reed', 'Reed, the AI realtor', 'Buyer conversations, home research, pricing, and evals.'],
    ['agent-harness', 'Agent harness', 'Parallel coding agents with review, recovery, and approval gates.'],
  ] as const;

  for (const [index, [id, title, glance]] of trackContracts.entries()) {
    const disclosure = disclosures.nth(index);
    await expect(disclosure).toHaveAttribute('data-roam-track', id);
    await expect(disclosure).not.toHaveAttribute('open', '');
    await expect(disclosure.locator('summary')).toContainText(title);
    await expect(disclosure.locator('summary')).toContainText(glance);
    await expect(disclosure.locator('.track-action')).toHaveText('');
    await expect(disclosure.locator('.experience-track-detail')).not.toBeVisible();
    await expect(disclosure.locator('.media-shot').first()).not.toBeVisible();
    const summaryBox = await disclosure.locator('summary').boundingBox();
    expect(summaryBox).not.toBeNull();
    expect(summaryBox!.height).toBeGreaterThanOrEqual(80);
    expect(summaryBox!.height).toBeLessThan(150);
    await expect(disclosure.locator(`[data-roam-sample="${id}"] .media-shot`)).toHaveCount(
      id === 'roam-marketplace' ? 6 : 2,
    );
  }

  const roamBox = await page.locator('#roam').boundingBox();
  const procoreBox = await page.locator('#procore').boundingBox();
  expect(roamBox).not.toBeNull();
  expect(procoreBox).not.toBeNull();
  expect(procoreBox!.y - roamBox!.y).toBeLessThan(900);

  const marketplaceDisclosure = disclosures.nth(0);
  const reedDisclosure = disclosures.nth(1);
  const harnessDisclosure = disclosures.nth(2);
  const marketplaceSummary = marketplaceDisclosure.locator('summary');
  await marketplaceSummary.focus();
  await page.keyboard.press('Enter');
  await expect(marketplaceDisclosure).toHaveAttribute('open', '');
  await expect(marketplaceDisclosure).toHaveAttribute('data-track-motion', 'opening');
  await expect(marketplaceDisclosure.locator('.experience-track-detail')).toBeVisible();
  await expect(marketplaceDisclosure.locator('.media-shot').first()).toBeVisible();
  await expect(marketplaceDisclosure).not.toHaveAttribute('data-track-motion', 'opening');

  const searchTab = marketplaceDisclosure.getByRole('tab', { name: 'Search' });
  const paymentsTab = marketplaceDisclosure.getByRole('tab', { name: 'Payments' });
  const tourTab = marketplaceDisclosure.getByRole('tab', { name: 'Tour' });
  const searchPanel = marketplaceDisclosure.locator('[data-product-panel="search"]');
  const paymentsPanel = marketplaceDisclosure.locator('[data-product-panel="payments"]');
  const tourPanel = marketplaceDisclosure.locator('[data-product-panel="tour"]');
  await expect(searchTab).toHaveAttribute('aria-selected', 'true');
  await expect(paymentsTab).toHaveAttribute('aria-selected', 'false');
  await expect(tourTab).toHaveAttribute('aria-selected', 'false');
  await expect(searchPanel).toBeVisible();
  await expect(paymentsPanel).toBeHidden();
  await expect(tourPanel).toBeHidden();

  const desktopSearchDemo = searchPanel.locator('[data-product-video]').first();
  const desktopSearchVideo = desktopSearchDemo.locator('video');
  await desktopSearchDemo.hover();
  await expect(desktopSearchDemo).toHaveAttribute('aria-pressed', 'true');
  await expect
    .poll(() => desktopSearchVideo.evaluate((video) => (video as HTMLVideoElement).currentTime))
    .toBeGreaterThan(0.1);
  const desktopSearchDimensions = await desktopSearchVideo.evaluate((video) => ({
    width: (video as HTMLVideoElement).videoWidth,
    height: (video as HTMLVideoElement).videoHeight,
  }));
  expect(desktopSearchDimensions).toEqual({ width: 1280, height: 800 });
  await page.mouse.move(8, 8);
  await expect(desktopSearchDemo).toHaveAttribute('aria-pressed', 'false');

  const mobileSearchDemo = searchPanel.locator('.media-shot--phone [data-product-video]');
  const mobileSearchVideo = mobileSearchDemo.locator('video');
  await mobileSearchDemo.hover();
  await expect(mobileSearchDemo).toHaveAttribute('aria-pressed', 'true');
  await expect
    .poll(() => mobileSearchVideo.evaluate((video) => (video as HTMLVideoElement).currentTime))
    .toBeGreaterThan(0.1);
  const videoDimensions = await mobileSearchVideo.evaluate((video) => ({
    width: (video as HTMLVideoElement).videoWidth,
    height: (video as HTMLVideoElement).videoHeight,
  }));
  expect(videoDimensions).toEqual({ width: 390, height: 844 });
  await expect(mobileSearchDemo.locator('[data-phone-frame]')).toHaveCount(1);
  await page.mouse.move(8, 8);
  await expect(mobileSearchDemo).toHaveAttribute('aria-pressed', 'false');
  await expect
    .poll(() => mobileSearchVideo.evaluate((video) => (video as HTMLVideoElement).currentTime))
    .toBeLessThan(0.1);

  await paymentsTab.focus();
  await page.keyboard.press('Enter');
  await expect(paymentsTab).toHaveAttribute('aria-selected', 'true');
  await expect(searchTab).toHaveAttribute('aria-selected', 'false');
  await expect(searchPanel).toBeHidden();
  await expect(paymentsPanel).toBeVisible();
  await expect(desktopSearchDemo).toHaveAttribute('aria-pressed', 'false');

  const desktopCalculatorDemo = paymentsPanel.locator('[data-product-video]').first();
  const desktopCalculatorVideo = desktopCalculatorDemo.locator('video');
  await desktopCalculatorDemo.hover();
  await expect(desktopCalculatorDemo).toHaveAttribute('aria-pressed', 'true');
  await expect
    .poll(() => desktopCalculatorVideo.evaluate((video) => (video as HTMLVideoElement).currentTime))
    .toBeGreaterThan(0.1);
  const desktopCalculatorDimensions = await desktopCalculatorVideo.evaluate((video) => ({
    width: (video as HTMLVideoElement).videoWidth,
    height: (video as HTMLVideoElement).videoHeight,
  }));
  expect(desktopCalculatorDimensions).toEqual({ width: 1280, height: 800 });
  await page.mouse.move(8, 8);

  const mobileCalculatorDemo = paymentsPanel.locator('.media-shot--phone [data-product-video]');
  const mobileCalculatorVideo = mobileCalculatorDemo.locator('video');
  const mobileCalculatorDimensions = await mobileCalculatorVideo.evaluate((video) => ({
    width: (video as HTMLVideoElement).videoWidth,
    height: (video as HTMLVideoElement).videoHeight,
  }));
  expect(mobileCalculatorDimensions).toEqual({ width: 390, height: 844 });
  await expect(mobileCalculatorDemo.locator('[data-phone-frame]')).toHaveCount(1);

  await tourTab.click();
  await expect(tourTab).toHaveAttribute('aria-selected', 'true');
  await expect(paymentsPanel).toBeHidden();
  await expect(tourPanel).toBeVisible();
  const desktopTourVideo = tourPanel.locator('[data-product-video] video').first();
  const mobileTourVideo = tourPanel.locator('.media-shot--phone video');
  expect(
    await desktopTourVideo.evaluate((video) => ({
      width: (video as HTMLVideoElement).videoWidth,
      height: (video as HTMLVideoElement).videoHeight,
    })),
  ).toEqual({ width: 1280, height: 800 });
  expect(
    await mobileTourVideo.evaluate((video) => ({
      width: (video as HTMLVideoElement).videoWidth,
      height: (video as HTMLVideoElement).videoHeight,
    })),
  ).toEqual({ width: 390, height: 844 });

  await paymentsTab.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(searchTab).toHaveAttribute('aria-selected', 'true');
  await expect(searchTab).toBeFocused();
  await expect(searchPanel).toBeVisible();
  await expect(paymentsPanel).toBeHidden();

  const reedSummary = reedDisclosure.locator('summary');
  await reedSummary.focus();
  await page.keyboard.press('Space');
  await expect(reedDisclosure).toHaveAttribute('open', '');
  await expect(marketplaceDisclosure).toHaveAttribute('open', '');
  await expect(harnessDisclosure).not.toHaveAttribute('open', '');

  await harnessDisclosure.locator('summary').click();
  await expect(harnessDisclosure).toHaveAttribute('open', '');
  await expect(page.locator('#roam details[data-track-motion]')).toHaveCount(0);

  for (const disclosure of await disclosures.all()) {
    const shots = disclosure.locator('.media-shot');
    const firstShotBox = await shots.nth(0).boundingBox();
    const secondShotBox = await shots.nth(1).boundingBox();
    expect(firstShotBox).not.toBeNull();
    expect(secondShotBox).not.toBeNull();
    expect(secondShotBox!.x).toBeGreaterThan(firstShotBox!.x + firstShotBox!.width);
  }

  const mediaImages = mediaRegion.locator('img');
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
  await marketplaceSummary.focus();
  await page.keyboard.press('Enter');
  await expect(marketplaceDisclosure).toHaveAttribute('data-track-motion', 'closing');
  await expect(marketplaceDisclosure).toHaveAttribute('open', '');
  await expect(marketplaceDisclosure).not.toHaveAttribute('open', '', { timeout: 1_500 });
  await expect(marketplaceDisclosure.locator('.media-shot').first()).not.toBeVisible();
  await expect(reedDisclosure).toHaveAttribute('open', '');
  await expect(harnessDisclosure).toHaveAttribute('open', '');
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

  const collage = page.locator('.about-hero .lifestyle-panel');
  await expect(collage).toBeVisible();
  const collageBox = await collage.boundingBox();
  expect(collageBox).not.toBeNull();
  expect(collageBox!.x).toBeGreaterThanOrEqual(0);
  expect(collageBox!.x + collageBox!.width).toBeLessThanOrEqual(390);

  const roamTracks = page.locator('#roam details[data-roam-track]');
  await expect(roamTracks).toHaveCount(3);
  const firstTrackBox = await roamTracks.nth(0).boundingBox();
  const secondTrackBox = await roamTracks.nth(1).boundingBox();
  const thirdTrackBox = await roamTracks.nth(2).boundingBox();
  expect(firstTrackBox).not.toBeNull();
  expect(secondTrackBox).not.toBeNull();
  expect(thirdTrackBox).not.toBeNull();
  expect(secondTrackBox!.y).toBeGreaterThan(firstTrackBox!.y);
  expect(thirdTrackBox!.y).toBeGreaterThan(secondTrackBox!.y);
  expect(thirdTrackBox!.y + thirdTrackBox!.height - firstTrackBox!.y).toBeLessThan(520);

  for (const disclosure of await roamTracks.all()) {
    await expect(disclosure).not.toHaveAttribute('open', '');
    const summaryBox = await disclosure.locator('summary').boundingBox();
    expect(summaryBox).not.toBeNull();
    expect(summaryBox!.height).toBeGreaterThanOrEqual(80);
    expect(summaryBox!.height).toBeLessThan(180);
    await expect(disclosure.locator('.experience-track-detail')).not.toBeVisible();
  }

  const marketplaceTrack = roamTracks.nth(0);
  const marketplaceCollapsedHeight = (await marketplaceTrack.boundingBox())!.height;
  await marketplaceTrack.locator('summary').click();
  await expect(marketplaceTrack).toHaveAttribute('open', '');
  await expect(marketplaceTrack.locator('.experience-track-detail')).toBeVisible();
  await expect(marketplaceTrack.locator('.media-shot')).toHaveCount(6);
  await expect(marketplaceTrack).not.toHaveAttribute('data-track-motion', 'opening');
  const marketplaceExpandedHeight = (await marketplaceTrack.boundingBox())!.height;
  expect(marketplaceExpandedHeight).toBeGreaterThan(marketplaceCollapsedHeight + 200);
  const mediaRail = marketplaceTrack.locator('[data-product-panel="search"]');
  expect(await mediaRail.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(false);
  const firstShotBox = await mediaRail.locator('.media-shot').nth(0).boundingBox();
  const secondShotBox = await mediaRail.locator('.media-shot').nth(1).boundingBox();
  expect(firstShotBox).not.toBeNull();
  expect(secondShotBox).not.toBeNull();
  expect(secondShotBox!.x).toBeGreaterThan(firstShotBox!.x + firstShotBox!.width);
  expect(secondShotBox!.y).toBeLessThan(firstShotBox!.y);
  expect(secondShotBox!.y + secondShotBox!.height).toBeGreaterThan(firstShotBox!.y + firstShotBox!.height);

  const reedTrack = roamTracks.nth(1);
  await reedTrack.locator('summary').click();
  await expect(reedTrack).toHaveAttribute('open', '');
  await expect(marketplaceTrack).toHaveAttribute('open', '');
  await marketplaceTrack.locator('summary').click();
  await expect(marketplaceTrack).toHaveAttribute('data-track-motion', 'closing');
  await expect(marketplaceTrack).toHaveAttribute('open', '');
  await expect(marketplaceTrack).not.toHaveAttribute('open', '', { timeout: 1_500 });
  await expect(reedTrack).toHaveAttribute('open', '');
  expect((await marketplaceTrack.boundingBox())!.height).toBeCloseTo(marketplaceCollapsedHeight, 0);

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

  const disclosures = page.locator('#roam details[data-roam-track]');
  for (const disclosure of await disclosures.all()) {
    await disclosure.locator('summary').click();
    await expect(disclosure).toHaveAttribute('open', '');
  }

  await expect(page.locator('#roam .company-logo img')).toHaveCSS('filter', 'none');
  await expect(page.locator('#procore .company-logo img')).toHaveCSS('filter', 'none');
  for (const image of await page.locator('#roam .work-samples img').all()) {
    await expect(image).toHaveCSS('filter', 'none');
  }
});
