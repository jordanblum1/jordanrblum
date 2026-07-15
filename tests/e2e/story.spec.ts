import { test, expect } from '@playwright/test';

test('story renders 4 beats and advances on scroll', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#work .beat-sentence')).toHaveCount(4);
  await expect(page.locator('#work .beat-sentence[data-beat="0"]')).toHaveClass(/active/);
  // scroll to ~75% through the story track (instant: override CSS scroll-behavior at the call site)
  await page.evaluate(() => {
    const el = document.querySelector('#work .story-track')!;
    const r = el.getBoundingClientRect();
    scrollTo({ top: scrollY + r.top + (el as HTMLElement).offsetHeight * 0.75, behavior: 'instant' });
  });
  await page.waitForTimeout(300);
  const active = page.locator('#work .beat-sentence.active');
  await expect(active).toHaveCount(1);
  expect(Number(await active.getAttribute('data-beat'))).toBeGreaterThanOrEqual(2);
});
test('story initializes after resizing across the 720px breakpoint', async ({ page }) => {
  // Loading ≤720px must not permanently strand the story: resizing up to desktop later
  // (a real path — rotating a tablet, or a dev-tools/OS window resize) must still bring
  // the scroll-scrub alive rather than leaving every beat un-.active forever.
  await page.setViewportSize({ width: 600, height: 900 });
  await page.goto('/');
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.evaluate(() => {
    const el = document.querySelector('#work .story-track')!;
    const r = el.getBoundingClientRect();
    scrollTo({ top: scrollY + r.top + (el as HTMLElement).offsetHeight * 0.5, behavior: 'instant' });
  });
  await page.waitForTimeout(300);
  await expect(page.locator('#work .beat-sentence.active')).toHaveCount(1);
});

test('story names concrete AI product work without unverified brag metrics', async ({ page }) => {
  await page.goto('/');
  const story = page.locator('#work');
  for (const phrase of ['AI realtor', 'chat and tool UI', 'polygon home search', 'evals and conversation analytics']) {
    await expect(story).toContainText(phrase);
  }
  for (const phrase of ['419 PRs', 'merge velocity', '13× completion', 'eval positivity']) {
    await expect(story).not.toContainText(phrase);
  }
});

test('mobile story keeps each sentence paired with its visual', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('#work .story-beat')).toHaveCount(4);
  for (const beat of await page.locator('#work .story-beat').all()) {
    await expect(beat.locator('.beat-sentence')).toBeVisible();
    await expect(beat.locator('.beat-visual')).toBeVisible();
  }
});
