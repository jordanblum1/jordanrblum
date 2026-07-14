import { test, expect } from '@playwright/test';

test('story renders 4 beats and advances on scroll', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#roam-story .beat-sentence')).toHaveCount(4);
  await expect(page.locator('#roam-story .beat-sentence[data-beat="0"]')).toHaveClass(/active/);
  // scroll to ~75% through the story track (instant: override CSS scroll-behavior at the call site)
  await page.evaluate(() => {
    const el = document.querySelector('#roam-story')!;
    const r = el.getBoundingClientRect();
    scrollTo({ top: scrollY + r.top + (el as HTMLElement).offsetHeight * 0.75, behavior: 'instant' });
  });
  await page.waitForTimeout(300);
  const active = page.locator('#roam-story .beat-sentence.active');
  await expect(active).toHaveCount(1);
  expect(Number(await active.getAttribute('data-beat'))).toBeGreaterThanOrEqual(2);
});
test('metric chips show the real numbers', async ({ page }) => {
  await page.goto('/');
  for (const m of ['419 PRs/yr', '3–4× merge velocity', '13× completion lift', '87%+ eval positivity']) {
    await expect(page.locator('#roam-story')).toContainText(m);
  }
});
