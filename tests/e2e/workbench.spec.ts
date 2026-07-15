import { expect, test } from '@playwright/test';

test('workbench concentrates the site personality in six Jordan-specific artifacts', async ({ page }) => {
  await page.goto('/');

  const artifacts = page.locator('[data-workbench] [data-draggable]');
  await expect(artifacts).toHaveCount(6);
  await expect(page.locator('[data-workbench]')).toContainText('REED / SAMPLE TRACE');
  await expect(page.locator('[data-workbench]')).toContainText('SIDE QUESTS');
  await expect(page.locator('[data-workbench]')).toContainText('CHICKS OF NYC');
  await expect(page.locator('[data-workbench]')).toContainText('CITI BIKE / RIDE LOG');
  await expect(page.locator('[data-workbench] img')).toHaveAttribute('alt', /Deadvlei, Namibia/);
});

test('a desk artifact can be rearranged on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');

  const artifact = page.locator('[data-workbench] .trace');
  await artifact.scrollIntoViewIfNeeded();
  const before = await artifact.boundingBox();
  if (!before) throw new Error('Trace artifact was not laid out');

  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
  await page.mouse.down();
  await page.mouse.move(before.x + before.width / 2 + 90, before.y + before.height / 2 + 35, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(450);

  const after = await artifact.boundingBox();
  if (!after) throw new Error('Trace artifact disappeared after drag');
  expect(Math.abs(after.x - before.x)).toBeGreaterThan(45);
});

test('workbench becomes a readable static grid on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const workbench = page.locator('[data-workbench]');
  await expect(workbench).toBeVisible();
  await expect(workbench.locator('[data-draggable]')).toHaveCount(6);
  await expect(page.locator('.static-hint')).toBeVisible();
  await expect(page.locator('.drag-hint')).toBeHidden();
});
