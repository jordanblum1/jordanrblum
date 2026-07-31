import { expect, test } from '@playwright/test';

test('typing grain toggles the film-grain accent without changing the light palette', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.type('grain');
  await expect(page.locator('html')).toHaveAttribute('data-grain', 'on');

  const accent = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
  expect(accent.toLowerCase()).toBe('#e6533d');
  const paper = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--paper').trim());
  expect(paper.toLowerCase()).toBe('#f7f3ed');

  await page.keyboard.type('grain');
  await expect(page.locator('html')).not.toHaveAttribute('data-grain', 'on');
});

// Real clicks (not element.click() in page JS) so these fail if any layer
// covers the controls — the footer content block once swallowed every tap.
test('the spray can arms paint mode with a real click and Escape disarms it', async ({ page }) => {
  await page.goto('/');
  const arm = page.getByRole('button', { name: 'Spray paint on the wall' });
  await arm.scrollIntoViewIfNeeded();
  await arm.click();
  await expect(page.locator('.spray-wall')).toHaveClass(/is-armed/);

  await page.keyboard.press('Escape');
  await expect(page.locator('.spray-wall')).not.toHaveClass(/is-armed/);
});

test('the spray can and toolbar are tappable on a phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const arm = page.getByRole('button', { name: 'Spray paint on the wall' });
  await arm.scrollIntoViewIfNeeded();
  await arm.click();
  await expect(page.locator('.spray-wall')).toHaveClass(/is-armed/);

  await page.getByRole('button', { name: 'Fat cap' }).click();
  await expect(page.locator('[data-spray-nozzle="fat"]')).toHaveClass(/is-selected/);

  await page.getByRole('button', { name: 'Stop spraying' }).click();
  await expect(page.locator('.spray-wall')).not.toHaveClass(/is-armed/);
});

test('direct hash navigation never leaves portfolio content hidden', async ({ page }) => {
  await page.goto('/#work');
  await expect(page.locator('#work').getByRole('heading', { level: 2 })).toBeVisible();
  await expect(page.locator('#work .experience-list > li').first()).toBeVisible();

  await page.goto('/about#roam');
  await expect(page.locator('#roam')).toBeVisible();
  await expect(page.locator('#roam')).toContainText('Product Engineer');
});
