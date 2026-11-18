import { expect, test } from '@playwright/test';

test('homepage and About share the current app collection', async ({ page }) => {
  for (const path of ['/', '/about']) {
    await page.goto(path);
    const row = page.getByRole('row').filter({ has: page.getByRole('link', { name: 'iOS apps (opens in a new tab)', exact: true }) });
    await expect(row).toContainText('Stamp Shift, Alive Still, and Birthday.');
    await expect(row.getByRole('link')).toHaveAttribute('href', 'https://buildwithblum.com/work');
  }
});

test('personal app directory includes every app without inventing local policy routes', async ({ page }) => {
  await page.goto('/apps');
  const directory = page.getByRole('list', { name: 'Apps with documentation' });
  await expect(directory.getByRole('heading')).toHaveText(['Stamp Shift', 'Alive Still', 'Birthday']);
  await expect(directory.getByRole('link', { name: 'Stamp Shift', exact: true })).toHaveAttribute('href', '/apps/stamp-shift');
  await expect(directory.getByRole('link', { name: 'Birthday', exact: true })).toHaveAttribute('href', 'https://buildwithblum.com/apps/birthday');
  await expect(directory.getByRole('link', { name: 'Alive Still privacy policy' })).toHaveAttribute('href', 'https://alivestill.app/privacy');
  await expect(directory.getByRole('link', { name: 'Support for Birthday' })).toHaveAttribute('href', /^mailto:support@buildwithblum\.com\?/);
  await expect(page.locator('script')).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Site' }).getByRole('link', { name: 'Email support' })).toHaveAttribute('href', 'mailto:support@buildwithblum.com');
});
