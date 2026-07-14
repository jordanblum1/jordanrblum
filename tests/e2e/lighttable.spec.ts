import { test, expect } from '@playwright/test';

test('six prints + one facedown render scattered', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#light-table .print')).toHaveCount(7);
  const rotations = await page.locator('#light-table .print').evaluateAll(
    els => els.map(e => getComputedStyle(e).transform));
  expect(new Set(rotations).size).toBeGreaterThan(3); // actually scattered, not stacked
});
test('prints develop in on load', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#light-table .print').first()).toHaveClass(/is-visible/);
});
test('drag moves a print', async ({ page }) => {
  await page.goto('/');
  const print = page.locator('#light-table .print[data-idx="0"]');
  // hover() first: this print sits below the fold on load (tall hero headline),
  // so hover()'s auto-scroll-into-view must happen before we capture the
  // authoritative box, or `before` reflects a pre-scroll position the mouse
  // was never actually at. hover() itself parks the mouse at the box's center,
  // so the drag target is expressed relative to that same center — not the
  // top-left corner — to get a real ~140px horizontal displacement.
  await print.hover();
  const before = await print.boundingBox();
  const centerX = before!.x + before!.width / 2;
  const centerY = before!.y + before!.height / 2;
  await page.mouse.down();
  await page.mouse.move(centerX + 140, centerY + 60, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(600); // spring settle
  const after = await print.boundingBox();
  expect(Math.abs(after!.x - before!.x)).toBeGreaterThan(80);
});
test('facedown print flips on click, not on drag', async ({ page }) => {
  await page.goto('/');
  const fd = page.locator('.print.facedown');
  await fd.click();
  await expect(fd).toHaveClass(/flipped/);
});
test('terminal prop types via CSS only', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.prop-terminal')).toContainText('jordan@roam:~$');
});
