import { expect, test } from '@playwright/test';

test('the unlisted lab exposes exactly three linked, keyboard-accessible studies', async ({page}) => {
  await page.route('https://huggingface.co/**', route => route.abort());
  await page.goto('/labs/simready');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  const tabs = page.getByRole('tab');
  await expect(tabs).toHaveText(['01Dispatch', '02Working Set', '03Counter Study']);
  await expect(tabs).toHaveCount(3);
  await expect(page.getByRole('tabpanel')).toHaveCount(1);
  await tabs.nth(0).focus();
  await page.keyboard.press('ArrowLeft');
  await expect(tabs.nth(2)).toBeFocused();
  await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Home');
  await expect(tabs.nth(0)).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#working-set$/);
  await expect(page.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'tab-working-set');
  await page.keyboard.press('End');
  await page.keyboard.press('Space');
  await expect(page).toHaveURL(/#counter-study$/);
  await expect(tabs.nth(2)).toHaveAttribute('aria-selected', 'true');
  await page.goBack();
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('Visual preview, not physics simulation.', {exact:false})).toBeVisible();
  await expect(page.getByRole('link', {name:'CC-BY-4.0'})).toBeVisible();
});

test('only the active pinned package is requested and a failed load retains an interactive fallback', async ({page}) => {
  test.setTimeout(70_000);
  const requests: string[] = [];
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://huggingface.co/**', route => { requests.push(route.request().url()); return route.abort(); });
  await page.goto('/labs/simready#working-set');
  await expect(page.locator('#working-set [data-status]')).toContainText('Showing the authored illustration.', {timeout:60_000});
  const slider = page.getByRole('slider', {name:'Pull apart'});
  await slider.fill('80');
  await expect(page.locator('#working-set output')).toHaveText('80%');
  await expect(page.locator('#working-set svg')).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(requests.length).toBeGreaterThan(0);
  for (const url of requests) {
    expect(url).toContain('524747d9b5e1f21b5b18b56041788c01d745f1a1');
    expect(url).toContain('chair_office_amf_black_a01');
  }
  await page.getByRole('tab', {name:'03 Counter Study'}).click();
  await expect(page.locator('#counter-study [data-status]')).toContainText('Showing the authored illustration.', {timeout:60_000});
  await page.getByLabel('Light', {exact:true}).selectOption('late');
  await expect(page.locator('#counter-study [data-stage]')).toHaveAttribute('data-light','late');
  await page.locator('#counter-study [data-stage]').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#counter-study [data-stage]')).toHaveCSS('--cup-x','10px');
  await page.getByRole('button', {name:'Reset composition'}).click();
  await expect(page.locator('#counter-study [data-stage]')).toHaveCSS('--cup-x','0px');
  expect(errors).toEqual([]);
});

test('390px layout and reduced motion keep all three studies usable', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.route('https://huggingface.co/**', route => route.abort());
  await page.goto('/labs/simready');
  for (const name of ['01 Dispatch', '02 Working Set', '03 Counter Study']) {
    await page.getByRole('tab', {name}).click();
    await expect(page.getByRole('tabpanel')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.getByRole('tab', {name:'01 Dispatch'}).click();
  await expect(page.locator('#dispatch [data-stage]')).toHaveAttribute('data-moving','false');
  await expect(page.getByRole('button', {name:'Resume movement'})).toBeDisabled();
  await page.getByLabel('Route', {exact:true}).selectOption('b');
  await expect(page.locator('#dispatch [data-stage]')).toHaveAttribute('data-route','b');
});
