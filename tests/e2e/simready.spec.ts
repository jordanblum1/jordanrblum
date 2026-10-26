import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { CylinderGeometry } from 'three';
import sharp from 'sharp';
import { hero, about } from '../../src/data/site';

const titles = ['Workbench Recommended', 'Hero Accent', 'About Signature'];
const ids = ['workbench', 'hero-accent', 'about-signature'];

async function imageDelta(a: Buffer, b: Buffer) {
  const [left, right] = await Promise.all([sharp(a).removeAlpha().raw().toBuffer(), sharp(b).removeAlpha().raw().toBuffer()]);
  let delta = 0;
  for (let i = 0; i < left.length; i++) delta += Math.abs(left[i] - right[i]);
  return delta / (left.length * 255);
}

test('homepage previews have manual keyboard tabs, deep links and browser history', async ({page}) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://huggingface.co/**', route => route.abort());
  await page.goto('/labs/simready');
  await expect(page.locator('[data-can-decal], .can-decal')).toHaveCount(0);
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
    await expect(page.getByRole('img', {name:'BLUM studio spray can illustration'})).toBeVisible();
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
  await expect(page.getByRole('img', {name:'BLUM studio spray can illustration'})).toBeVisible();
  await expect(page.getByRole('link', {name:'Source spray can'})).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  await context.close();
});

test('default Workbench shows the BLUM can beside the real headline before remote assets arrive', async ({page}) => {
  await page.setViewportSize({width:1440, height:900});
  await page.route('https://huggingface.co/**', () => {});
  await page.goto('/labs/simready', {waitUntil:'domcontentloaded'});
  const panel = page.locator('#workbench');
  await expect(panel.locator('[data-stage]')).toBeInViewport({ratio:1});
  const can = panel.getByRole('img', {name:'BLUM studio spray can illustration'});
  await expect(can).toBeVisible();
  await expect(can).toBeInViewport({ratio:1});
  await expect(panel.locator('[data-stage]')).toHaveAttribute('data-loaded', 'false');
  await expect(panel.locator('.spray-fallback')).toContainText('STUDIO');
  const logo = [...readFileSync('src/assets/identity/blum-mark.svg', 'utf8').matchAll(/ d="([^"]+)"/g)].map(match => match[1]);
  expect(await panel.locator('[data-can-logo] path').evaluateAll(paths => paths.map(path => path.getAttribute('d')))).toEqual(logo);
  expect(await panel.locator('[data-stage]').evaluate(element => getComputedStyle(element).pointerEvents)).toBe('none');
  const headline = await panel.getByRole('heading', {name:hero.statement}).boundingBox();
  const object = await can.boundingBox();
  expect(object!.x).toBeGreaterThan(headline!.x + headline!.width);
  expect(object!.y).toBeLessThan(headline!.y + headline!.height);
  await expect(panel.getByRole('link', {name:'See the work'})).toHaveAttribute('href', '/#work');
  await expect(page.getByText('Original BLUM can', {exact:false})).toBeVisible();
  await page.setViewportSize({width:768, height:900});
  const tabletField = await panel.locator('.workbench-field').boundingBox();
  const tabletCan = await panel.locator('[data-stage]').boundingBox();
  expect(tabletCan!.y).toBeGreaterThanOrEqual(tabletField!.y);
  expect(tabletCan!.y + tabletCan!.height).toBeLessThanOrEqual(tabletField!.y + tabletField!.height);
  await page.setViewportSize({width:390, height:844});
  await expect(can).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('the loaded canvas itself carries the can print across placements and responsive sizes', async ({page}) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  const touch = await page.context().newCDPSession(page);
  await touch.send('Emulation.setTouchEmulationEnabled', {enabled:true, maxTouchPoints:2});
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const geometry = new CylinderGeometry(.5, .5, 2.8, 48);
  const positions = geometry.getAttribute('position');
  const indices = geometry.getIndex()!;
  const points = Array.from({length:positions.count}, (_, i) => `(${positions.getX(i)}, ${positions.getY(i)}, ${positions.getZ(i)})`);
  const fixture = `#usda 1.0
(upAxis = "Y")
def Mesh "Can" {
  point3f[] points = [${points.join(',')}]
  int[] faceVertexCounts = [${Array(indices.count / 3).fill(3).join(',')}]
  int[] faceVertexIndices = [${Array.from(indices.array).join(',')}]
  uniform token subdivisionScheme = "none"
}`;
  geometry.dispose();
  await page.route('https://huggingface.co/**', route => route.fulfill({
    body:fixture, contentType:'application/octet-stream', headers:{'access-control-allow-origin':'*'},
  }));
  await page.goto('/labs/simready');
  for (const [index, id] of ids.entries()) {
    await page.setViewportSize({width:index === 1 ? 390 : 1440, height:1000});
    await page.locator(`#tab-${id}`).click();
    const panel = page.locator(`#${id}`);
    await expect(panel.locator('[data-stage]')).toHaveAttribute('data-loaded', 'true');
    await expect(panel.locator('[data-status]')).toContainText('Spray can ready');
    await expect(panel.locator('.spray-fallback')).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('[data-can-decal], .can-decal')).toHaveCount(0);
    await expect(page.locator('canvas')).toHaveCount(1);
    const canvas = panel.locator('canvas');
    await expect(canvas).toHaveAttribute('tabindex', '0');
    // Isolate canvas pixels from the oxblood BLUM artwork behind the transparent stage.
    await canvas.evaluate(element => { element.style.background = 'white'; });
    const {data, info} = await sharp(await canvas.screenshot()).removeAlpha().raw().toBuffer({resolveWithObject:true});
    let oxblood = 0;
    let charcoal = 0;
    let cream = 0;
    for (let i = 0; i < data.length; i += info.channels) {
      const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
      if (r > g * 1.4 && r > b * 1.4 && r < 220) oxblood++;
      if (Math.max(r, g, b) < 85 && Math.max(r, g, b) - Math.min(r, g, b) < 15) charcoal++;
      if (r > 160 && g > 160 && b > 150 && Math.max(r, g, b) - Math.min(r, g, b) < 25 && Math.min(r, g, b) < 250) cream++;
    }
    expect(oxblood).toBeGreaterThan(5);
    expect(charcoal).toBeGreaterThan(100);
    expect(cream).toBeGreaterThan(5);
    await expect(panel.locator('[data-status]')).toContainText('drag to rotate · scroll to zoom');
    expect(await panel.locator('[data-stage]').evaluate(element => getComputedStyle(element).pointerEvents)).toBe('auto');
    await canvas.focus();
    await expect(canvas).toBeFocused();
    // The keyboard-only focus ring is tested by focus state; exclude it from render deltas.
    await canvas.evaluate(element => { element.style.outline = 'none'; });
    const front = await canvas.screenshot();
    await page.keyboard.press('ArrowRight');
    expect(await imageDelta(await canvas.screenshot(), front)).toBeGreaterThan(.001);
    await page.keyboard.press('Home');
    await page.waitForTimeout(50);
    const reset = await canvas.screenshot();
    expect(await imageDelta(reset, front)).toBeLessThan(.01);
    await page.keyboard.press('+');
    expect(await imageDelta(await canvas.screenshot(), reset)).toBeGreaterThan(.001);
    await page.keyboard.press('Home');
    await page.waitForTimeout(50);
    const box = (await canvas.boundingBox())!;
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + box.width * .35, y, {steps:12});
    await page.mouse.up();
    const rotated = await canvas.screenshot();
    expect(await imageDelta(rotated, reset)).toBeGreaterThan(.001);
    await page.mouse.move(x, y);
    await page.mouse.wheel(0, -150);
    const zoomed = await canvas.screenshot();
    expect(await imageDelta(zoomed, rotated)).toBeGreaterThan(.001);
    await canvas.dblclick();
    await page.waitForTimeout(50);
    expect(await imageDelta(await canvas.screenshot(), reset)).toBeLessThan(.01);
    await touch.send('Input.dispatchTouchEvent', {type:'touchStart', touchPoints:[{x,y,id:1}]});
    await touch.send('Input.dispatchTouchEvent', {type:'touchMove', touchPoints:[{x:x + box.width * .25,y,id:1}]});
    await touch.send('Input.dispatchTouchEvent', {type:'touchEnd', touchPoints:[]});
    const touched = await canvas.screenshot();
    expect(await imageDelta(touched, reset)).toBeGreaterThan(.001);
    await touch.send('Input.dispatchTouchEvent', {type:'touchStart', touchPoints:[{x:x - 10,y,id:1}, {x:x + 10,y,id:2}]});
    await touch.send('Input.dispatchTouchEvent', {type:'touchMove', touchPoints:[{x:x - 20,y,id:1}, {x:x + 20,y,id:2}]});
    await touch.send('Input.dispatchTouchEvent', {type:'touchEnd', touchPoints:[]});
    expect(await imageDelta(await canvas.screenshot(), touched)).toBeGreaterThan(.001);
    await page.keyboard.press('Home');
    await page.screenshot({path:`test-results/simready-loaded-${id}.png`, fullPage:true});
  }
  expect(errors).toEqual([]);
});
