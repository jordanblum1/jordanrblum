import { expect, test } from '@playwright/test';
import { iosApps } from '../../src/data/ios-apps';

for (const width of [1440, 375]) {
  test(`directory and older overview pages share current artwork and navigation at ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/apps');
    await expect(page.getByRole('list', { name: 'Apps' }).getByRole('heading')).toHaveText(iosApps.map(app => app.title));
    await expect(page.getByRole('link', { name: 'Contact', exact: true })).toHaveAttribute('href', '/#contact');
    await expect(page.getByRole('link', { name: 'About Jordan' })).toHaveAttribute('href', 'https://jordanblum.com/about');
    for (const app of iosApps.filter(app => app.id !== 'stamp-shift')) {
      await page.goto('/apps');
      await page.getByRole('link', { name: app.title, exact: true }).click();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(app.title);
      await expect(page.locator('.overview-description')).toHaveText(app.description);
      const download = page.getByRole('link', { name: 'Download on the App Store', exact: true });
      await expect(download).toHaveAttribute('href', app.storeUrl);
      await expect(download).toHaveCSS('border-radius', '99px');
      const downloadBounds = await download.boundingBox();
      const websiteBounds = await page.getByRole('link', { name: 'Visit the official website', exact: true }).boundingBox();
      expect(websiteBounds!.y).toBeGreaterThanOrEqual(downloadBounds!.y + downloadBounds!.height);
      await expect(page.getByRole('link', { name: 'Back to Blum Studios' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Privacy policy', exact: true })).toHaveAttribute('href', app.privacyUrl);
      const image = page.locator('.overview-artwork img');
      await expect.poll(() => image.evaluate(element => element instanceof HTMLImageElement && element.complete && element.naturalWidth > 0)).toBe(true);
      const bounds = await image.boundingBox();
      expect(bounds!.width / bounds!.height).toBeCloseTo(778 / 1600, 2);
      expect(await image.evaluate(element => {
        const image = element.getBoundingClientRect();
        const frame = element.parentElement!.getBoundingClientRect();
        return image.top >= frame.top && image.bottom <= frame.bottom && image.left >= frame.left && image.right <= frame.right;
      })).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    expect(errors).toEqual([]);
  });
}
