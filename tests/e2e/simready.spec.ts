import { expect, test } from '@playwright/test';
import { hero, about } from '../../src/data/site';

const titles = ['Workbench Recommended', 'Hero Accent', 'About Signature'];
const ids = ['workbench', 'hero-accent', 'about-signature'];

test('homepage previews have manual keyboard tabs, deep links and browser history', async ({page}) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://huggingface.co/**', route => route.abort());
  await page.goto('/labs/simready');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  await expect(page.getByRole('navigation', {name:'Primary'})).toBeVisible();
  await expect(page.getByRole('link', {name:'Jordan Blum — home'})).toBeVisible();
  const tabs = page.getByRole('tab');
  await expect(tabs).toHaveText(titles);
  await expect(tabs).toHaveCount(3);
  await expect(page.getByRole('tabpanel')).toHaveCount(1);
  await expect(page.getByRole('heading', {name:hero.statement})).toBeVisible();
  await tabs.nth(0).focus();
  await page.keyboard.press('ArrowLeft');
  await expect(tabs.nth(2)).toBeFocused();
  await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Home');
  await expect(tabs.nth(0)).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#hero-accent$/);
  const heroPanel = page.getByRole('tabpanel');
  await expect(heroPanel).toHaveAttribute('aria-labelledby', 'tab-hero-accent');
  await expect(heroPanel.getByRole('img', {name:'Illustrated portrait of Jordan Blum'})).toBeVisible();
  await expect(heroPanel.getByText(hero.support, {exact:true})).toBeVisible();
  await page.keyboard.press('End');
  await page.keyboard.press('Space');
  await expect(page).toHaveURL(/#about-signature$/);
  await expect(page.getByRole('heading', {name:about.title})).toBeVisible();
  await expect(page.getByText(about.paragraphs[0], {exact:true})).toBeVisible();
  await expect(page.getByText(about.paragraphs[2], {exact:true})).toBeVisible();
  await page.goBack();
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
  await page.reload();
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('Visual preview, not physics simulation.', {exact:false})).toBeVisible();
  await expect(page.getByRole('link', {name:'CC-BY-4.0'})).toBeVisible();
  expect(errors).toEqual([]);
});

test('only the active pinned spray can loads; failure leaves the authored can in every placement', async ({page}) => {
  test.setTimeout(90_000);
  const requests: string[] = [];
  const forbidden: string[] = [];
  page.on('request', request => { if (/analytics|google-analytics|\/api\/chat|transcript/i.test(request.url())) forbidden.push(request.url()); });
  await page.route('https://huggingface.co/**', route => { requests.push(route.request().url()); return route.abort(); });
  await page.goto('/labs/simready#hero-accent');
  for (const id of ['hero-accent', 'workbench', 'about-signature']) {
    await page.locator(`#tab-${id}`).click();
    await expect(page.locator(`#${id} [data-status]`)).toContainText('Showing the authored illustration.', {timeout:60_000});
    await expect(page.getByRole('img', {name:'MTN-inspired 94 spray can illustration'})).toBeVisible();
    await expect(page.locator('canvas')).toHaveCount(0);
    await expect(page.locator('[data-viewer]')).toHaveCount(3);
  }
  expect(requests.length).toBeGreaterThanOrEqual(3);
  for (const url of requests) {
    expect(url).toContain('524747d9b5e1f21b5b18b56041788c01d745f1a1');
    expect(url).toContain('paint_container_spraycan_a01');
  }
  expect(forbidden).toEqual([]);
  await expect(page.getByRole('combobox')).toHaveCount(0);
  await expect(page.getByRole('slider')).toHaveCount(0);
});

test('desktop and 390px reduced-motion layouts preserve the portrait and usable controls', async ({page}) => {
  await page.route('https://huggingface.co/**', route => route.abort());
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/labs/simready');
  for (const width of [1440, 390]) {
    await page.setViewportSize({width,height:1000});
    for (const id of ids) {
      await page.locator(`#tab-${id}`).click();
      await expect(page.getByRole('tabpanel')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const tab = await page.locator(`#tab-${id}`).boundingBox();
      expect(tab!.height).toBeGreaterThanOrEqual(44);
      const stage = page.locator(`#${id} [data-stage]`);
      await expect(stage).toBeVisible();
      if (id === 'hero-accent') {
        const face = await page.getByRole('img', {name:'Illustrated portrait of Jordan Blum'}).boundingBox();
        const can = await stage.boundingBox();
        expect(can!.width).toBeLessThan(face!.width);
        expect(can!.y).toBeGreaterThan(face!.y + face!.height * .65);
      }
      await page.screenshot({path:`test-results/simready-${id}-${width}.png`,fullPage:true});
    }
  }
});

test('without JavaScript the recommended homepage placement and source disclosure remain', async ({browser}) => {
  const context = await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
  const page = await context.newPage();
  await page.goto('/labs/simready');
  await expect(page.getByRole('heading', {name:hero.statement})).toBeVisible();
  await expect(page.getByRole('img', {name:'MTN-inspired 94 spray can illustration'})).toBeVisible();
  await expect(page.getByRole('link', {name:'Source spray can'})).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  await context.close();
});

test('default Workbench shows the MTN can beside the real headline before remote assets arrive', async ({page}) => {
  await page.setViewportSize({width:1440, height:900});
  await page.route('https://huggingface.co/**', () => {});
  await page.goto('/labs/simready', {waitUntil:'domcontentloaded'});
  const panel = page.locator('#workbench');
  await expect(panel.locator('[data-stage]')).toBeInViewport({ratio:1});
  const can = panel.getByRole('img', {name:'MTN-inspired 94 spray can illustration'});
  await expect(can).toBeVisible();
  await expect(can).toBeInViewport({ratio:1});
  await expect(panel.locator('[data-stage]')).toHaveAttribute('data-loaded', 'false');
  await expect(panel.locator('.spray-fallback')).toContainText('MTN');
  await expect(panel.locator('.spray-fallback')).toContainText('94');
  const headline = await panel.getByRole('heading', {name:hero.statement}).boundingBox();
  const object = await can.boundingBox();
  expect(object!.x).toBeGreaterThan(headline!.x + headline!.width);
  expect(object!.y).toBeLessThan(headline!.y + headline!.height);
  await expect(panel.getByRole('link', {name:'See the work'})).toHaveAttribute('href', '/#work');
  await expect(page.getByText('MTN-inspired concept styling', {exact:false})).toBeVisible();
  await page.setViewportSize({width:768, height:900});
  const tabletField = await panel.locator('.workbench-field').boundingBox();
  const tabletCan = await panel.locator('[data-stage]').boundingBox();
  expect(tabletCan!.y).toBeGreaterThanOrEqual(tabletField!.y);
  expect(tabletCan!.y + tabletCan!.height).toBeLessThanOrEqual(tabletField!.y + tabletField!.height);
  await page.setViewportSize({width:390, height:844});
  await expect(can).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
