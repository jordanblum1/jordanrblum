import { expect, test, type Locator } from '@playwright/test';

async function appearance(control: Locator) {
  return control.evaluate((element) => {
    const s = getComputedStyle(element);
    const rgb = (color: string) => color.match(/[\d.]+/g)!.map(Number);
    const text = rgb(s.color);
    const background = rgb(s.backgroundColor);
    const luminance = (channels: number[]) => channels.slice(0, 3).map((value) => {
      const normalized = value / 255;
      return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
    }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
    const light = Math.max(luminance(text), luminance(background));
    const dark = Math.min(luminance(text), luminance(background));
    const box = element.getBoundingClientRect();
    return {
      backgroundAlpha: background[3] ?? 1,
      opacity: Number(s.opacity),
      background: s.backgroundColor,
      contrast: (light + 0.05) / (dark + 0.05),
      radius: s.borderRadius,
      padding: s.padding,
      font: s.font,
      height: box.height,
      left: box.left,
      right: box.right,
      viewport: innerWidth,
    };
  });
}

for (const width of [1280, 768, 375]) {
  test(`footer actions remain coherent and readable over the mural at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const footer = page.getByRole('contentinfo');
    const work = footer.getByRole('link', { name: /work with me/i });
    const chat = footer.getByRole('button', { name: 'Chat with my assistant' });
    await footer.scrollIntoViewIfNeeded();
    await expect(footer.locator('.footer-inner')).toHaveCSS('opacity', '1');
    const [linkStyle, buttonStyle] = await Promise.all([appearance(work), appearance(chat)]);
    for (const style of [linkStyle, buttonStyle]) {
      expect(style.backgroundAlpha, 'Footer actions need an opaque surface over the mural').toBe(1);
      expect(style.opacity).toBe(1);
      expect(style.contrast, 'Action text must meet 4.5:1 contrast against its own surface').toBeGreaterThanOrEqual(4.5);
      expect(style.height).toBeGreaterThanOrEqual(44);
      expect(style.left).toBeGreaterThanOrEqual(0);
      expect(style.right).toBeLessThanOrEqual(style.viewport);
    }
    expect(linkStyle.radius).toBe(buttonStyle.radius);
    expect(linkStyle.background, 'Work and Chat retain distinct secondary/primary treatments').not.toBe(buttonStyle.background);
    expect(linkStyle.padding).toBe(buttonStyle.padding);
    expect(linkStyle.font).toBe(buttonStyle.font);
    expect(Math.abs(linkStyle.height - buttonStyle.height)).toBeLessThan(1);
    await footer.screenshot({ path: testInfo.outputPath('footer-idle.png') });
  });
}

test('both footer actions have hover, press and keyboard feedback', async ({ page, browserName }) => {
  await page.goto('/');
  const footer = page.getByRole('contentinfo');
  const work = footer.getByRole('link', { name: /work with me/i });
  const chat = footer.getByRole('button', { name: 'Chat with my assistant' });
  await footer.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  for (const control of [work, chat]) {
    await control.hover();
    await expect.poll(() => control.evaluate((el) => getComputedStyle(el).translate)).not.toBe('none');
    await page.mouse.down();
    await expect.poll(() => control.evaluate((el) => getComputedStyle(el).scale)).not.toBe('none');
    // Release outside: verify feedback without following the link/opening chat.
    await page.mouse.move(0, 0);
    await page.mouse.up();
  }
  await work.focus();
  await page.keyboard.press(browserName === 'webkit' ? 'Alt+Shift+Tab' : 'Shift+Tab');
  await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
  await expect(work).toBeFocused();
  await expect(work).toHaveCSS('outline-style', 'solid');
  await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
  await expect(chat).toBeFocused();
  await expect(chat).toHaveCSS('outline-style', 'solid');
});

test('reduced motion keeps the same readable actions without hover or press travel', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const footer = page.getByRole('contentinfo');
  await footer.scrollIntoViewIfNeeded();
  for (const control of [footer.getByRole('link', { name: /work with me/i }), footer.getByRole('button', { name: 'Chat with my assistant' })]) {
    await control.hover();
    await page.mouse.down();
    await expect(control).toHaveCSS('translate', 'none');
    await expect(control).toHaveCSS('scale', 'none');
    await page.mouse.move(0, 0);
    await page.mouse.up();
  }
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('the styled work action still navigates to studio contact', async ({ page }) => {
    await page.route('https://buildwithblum.com/**', (route) => route.fulfill({ contentType: 'text/html', body: '<h1>Contact route fixture</h1>' }));
    await page.goto('/');
    const work = page.getByRole('contentinfo').getByRole('link', { name: /work with me/i });
    expect((await appearance(work)).backgroundAlpha).toBe(1);
    await work.click();
    await expect(page).toHaveURL('https://buildwithblum.com/#contact');
    await expect(page.getByRole('heading', { name: 'Contact route fixture' })).toBeVisible();
  });
});
