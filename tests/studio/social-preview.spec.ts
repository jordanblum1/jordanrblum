import {expect, test} from '@playwright/test';

test('studio shares a downloadable video with a matching image fallback without loading either on the homepage', async ({page, request}) => {
  const socialDownloads: string[] = [];
  page.on('request', outgoing => {
    if (/studio-og-v2\.(jpg|mp4)/.test(outgoing.url())) socialDownloads.push(outgoing.url());
  });
  const response = await page.goto('/');
  if (!response) throw new Error('Studio homepage returned no navigation response');
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain('property="og:video"');
  const image = 'https://buildwithblum.com/assets/blum-studios/studio-og-v2.jpg';
  const video = 'https://buildwithblum.com/assets/blum-studios/studio-og-v2.mp4';
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', image);
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute('content', image);
  await expect(page.locator('meta[property="og:video"]')).toHaveAttribute('content', video);
  await expect(page.locator('meta[property="og:video:secure_url"]')).toHaveAttribute('content', video);
  await expect(page.locator('meta[property="og:video:width"]')).toHaveAttribute('content', '1200');
  await expect(page.locator('meta[property="og:video:height"]')).toHaveAttribute('content', '630');
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
  expect(socialDownloads).toEqual([]);
  for (const [url, type, magic] of [[image, 'image/jpeg', 'ffd8ff'], [video, 'video/mp4', '66747970']] as const) {
    const asset = await request.get(new URL(url).pathname);
    expect(asset.status()).toBe(200);
    expect(asset.headers()['content-type']).toContain(type);
    const body = await asset.body();
    expect(body.length).toBeGreaterThan(1000);
    expect(body.length).toBeLessThan(8_000_000);
    expect(body.subarray(type === 'video/mp4' ? 4 : 0, type === 'video/mp4' ? 8 : 3).toString('hex')).toBe(magic);
  }
  for (const path of ['/work', '/privacy']) {
    const other = await request.get(path);
    expect(other.status()).toBe(200);
    expect(await other.text()).not.toContain('property="og:video"');
  }
});
