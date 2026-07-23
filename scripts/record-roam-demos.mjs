import { chromium } from '@playwright/test';
import { access, mkdir, readdir, stat } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const VIEWPORT = { width: 1280, height: 800 };
const OUTPUT_DIR = path.resolve('public/media');
const RAW_DIR = path.join(tmpdir(), 'jordanrblum-roam-recordings');
const STORAGE_STATE = process.env.ROAM_STORAGE_STATE;
const LISTING_URL =
  'https://www.withroam.com/listing/2811-W-FRESCO-DR-AUSTIN-TX-78731/463486';
const SEARCH_URL = 'https://www.withroam.com/cities/58251/Austin-TX';

async function findFfmpeg() {
  if (process.env.ROAM_FFMPEG) return process.env.ROAM_FFMPEG;

  if (process.platform === 'darwin') {
    const cacheRoot = path.join(homedir(), 'Library/Caches/ms-playwright');

    try {
      const entries = (await readdir(cacheRoot))
        .filter((entry) => entry.startsWith('ffmpeg-'))
        .sort()
        .reverse();

      for (const entry of entries) {
        const candidate = path.join(cacheRoot, entry, 'ffmpeg-mac');
        try {
          await access(candidate);
          return candidate;
        } catch {
          // Try the next installed Playwright ffmpeg build.
        }
      }
    } catch {
      // Fall through to the system ffmpeg.
    }
  }

  return 'ffmpeg';
}

async function run(command, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

async function commandSupportsEncoder(command, encoder) {
  return new Promise((resolve) => {
    const child = spawn(command, ['-hide_banner', '-encoders']);
    let output = '';

    child.stdout.on('data', (chunk) => {
      output += chunk;
    });
    child.stderr.on('data', (chunk) => {
      output += chunk;
    });
    child.once('error', () => resolve(false));
    child.once('exit', () => resolve(output.includes(encoder)));
  });
}

async function capturePoster(page, name, cwebp) {
  const rawPosterPath = path.join(RAW_DIR, `${name}-poster.jpg`);
  const outputPath = path.join(OUTPUT_DIR, `${name}-poster.webp`);

  await page.screenshot({
    path: rawPosterPath,
    type: 'jpeg',
    quality: 90,
  });
  await run(cwebp, [
    '-quiet',
    '-q',
    '82',
    '-m',
    '6',
    '-sharp_yuv',
    rawPosterPath,
    '-o',
    outputPath,
  ]);
}

async function installDemoCursor(page) {
  await page.evaluate(() => {
    const cursor = document.createElement('div');
    cursor.id = 'demo-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    cursor.style.cssText = `
      position: fixed;
      z-index: 2147483647;
      width: 18px;
      height: 18px;
      border: 2px solid rgba(35, 45, 72, 0.92);
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.76);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
      pointer-events: none;
      transform: translate(-50%, -50%);
      transition: width 120ms ease, height 120ms ease, background-color 120ms ease;
      left: -40px;
      top: -40px;
    `;
    document.body.append(cursor);

    document.addEventListener('mousemove', (event) => {
      cursor.style.left = `${event.clientX}px`;
      cursor.style.top = `${event.clientY}px`;
    });
    document.addEventListener('mousedown', () => {
      cursor.style.width = '28px';
      cursor.style.height = '28px';
      cursor.style.background = 'rgba(74, 116, 198, 0.24)';
    });
    document.addEventListener('mouseup', () => {
      cursor.style.width = '18px';
      cursor.style.height = '18px';
      cursor.style.background = 'rgba(255, 255, 255, 0.76)';
    });
  });
}

async function moveTo(page, locator, options = {}) {
  const box = await locator.boundingBox();
  if (!box) throw new Error(`Could not locate ${options.label ?? 'demo target'}`);

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {
    steps: options.steps ?? 12,
  });
}

async function recordDemo(browser, { name, prepare, perform, storageState }) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    storageState,
    recordVideo: {
      dir: RAW_DIR,
      size: VIEWPORT,
    },
  });
  const pageCreatedAt = Date.now();
  const page = await context.newPage();
  const video = page.video();

  await prepare(page);
  await installDemoCursor(page);

  const startedAt = Date.now();
  await perform(page);
  const finishedAt = Date.now();

  await context.close();
  if (!video) throw new Error(`Playwright did not create a video for ${name}`);

  const rawPath = path.join(RAW_DIR, `${name}-raw.webm`);
  await video.saveAs(rawPath);

  return {
    rawPath,
    start: Math.max(0, (startedAt - pageCreatedAt) / 1000 - 0.2),
    duration: (finishedAt - startedAt) / 1000 + 0.4,
  };
}

async function main() {
  if (!STORAGE_STATE) {
    throw new Error(
      'ROAM_STORAGE_STATE is required so both demos show the authenticated product experience. Point it to a deliberately exported Playwright storage-state file.',
    );
  }

  await mkdir(OUTPUT_DIR, { recursive: true });
  await mkdir(RAW_DIR, { recursive: true });

  const ffmpeg = await findFfmpeg();
  const cwebp = process.env.ROAM_CWEBP ?? 'cwebp';
  const canEncodeMp4 = await commandSupportsEncoder(ffmpeg, 'libx264');
  const browser = await chromium.launch({ headless: true });

  try {
    const search = await recordDemo(browser, {
      name: 'roam-search',
      storageState: STORAGE_STATE,
      prepare: async (page) => {
        await page.goto(SEARCH_URL, { waitUntil: 'domcontentloaded' });
        await page.locator('.mapboxgl-canvas').waitFor({ state: 'visible' });
        await page.locator('a[href^="/listing/"]').first().waitFor({ state: 'visible' });
        await page.waitForTimeout(1_500);
        await capturePoster(page, 'roam-search', cwebp);
      },
      perform: async (page) => {
        const initialCount = await page.locator('h1').innerText();
        const rate = page.getByRole('button', { name: 'Rate', exact: true });
        await page.waitForTimeout(650);
        await moveTo(page, rate, { label: 'Rate filter' });
        await rate.click();
        await page.waitForTimeout(550);

        const maximum = page.getByRole('textbox', { name: 'Maximum', exact: true });
        await moveTo(page, maximum, { label: 'maximum-rate field' });
        await maximum.click();
        await page.keyboard.type('3.5', { delay: 120 });
        await page.waitForTimeout(450);

        const update = page.getByRole('button', { name: 'Update', exact: true });
        await moveTo(page, update, { label: 'rate-filter update button' });
        await update.click();
        await page.waitForFunction((previousCount) => {
          const heading = document.querySelector('h1');
          return heading?.textContent && heading.textContent.trim() !== previousCount;
        }, initialCount);
        await page.waitForTimeout(1_600);
      },
    });

    const listing = await recordDemo(browser, {
      name: 'roam-calculator',
      storageState: STORAGE_STATE,
      prepare: async (page) => {
        await page.goto(LISTING_URL, { waitUntil: 'domcontentloaded' });
        await page.getByText('Your payment', { exact: true }).waitFor({ state: 'visible' });

        const sellerPrompt = page.locator('button.dismis-seller-cta');
        if (await sellerPrompt.isVisible().catch(() => false)) await sellerPrompt.click();

        const paymentHeading = page.getByText('Your payment', { exact: true });
        await paymentHeading.scrollIntoViewIfNeeded();
        await page.evaluate(() => window.scrollBy({ top: 240, behavior: 'instant' }));
        await page.waitForTimeout(700);
        await capturePoster(page, 'roam-calculator', cwebp);
      },
      perform: async (page) => {
        await page.waitForTimeout(650);

        const downPayment = page.locator('input[name="slider[down_payment_pct]"]');
        if ((await downPayment.count()) === 1) {
          const slider = await downPayment.boundingBox();
          if (!slider) throw new Error('Could not locate the down-payment slider');

          const startX = slider.x + slider.width * 0.785;
          const endX = slider.x + slider.width * 0.58;
          const sliderY = slider.y + slider.height / 2;
          await page.mouse.move(startX, sliderY, { steps: 12 });
          await page.mouse.down();
          await page.mouse.move(endX, sliderY, { steps: 20 });
          await page.mouse.up();
          await page.waitForTimeout(1_000);
        } else {
          await page.waitForTimeout(700);
        }

        const detailsHeading = page.getByText('Payment details', { exact: true });
        await detailsHeading.scrollIntoViewIfNeeded();
        await page.evaluate(() => window.scrollBy({ top: 150, behavior: 'instant' }));
        await page.waitForTimeout(550);

        const principal = page.getByRole('button', { name: /Principal\/interest/ });
        await moveTo(page, principal, { label: 'principal-and-interest details' });
        await principal.click();
        await page.waitForTimeout(900);

        const propertyTax = page.getByRole('button', { name: /Property tax/ });
        await moveTo(page, propertyTax, { label: 'property-tax details' });
        await propertyTax.click();
        await page.waitForTimeout(900);

        const insurance = page.getByRole('button', { name: /Home insurance/ });
        await moveTo(page, insurance, { label: 'home-insurance details' });
        await insurance.click();
        await page.waitForTimeout(1_200);
      },
    });

    const demos = [search, listing];

    for (const demo of demos) {
      const outputPath = path.join(
        OUTPUT_DIR,
        `${path.basename(demo.rawPath, '-raw.webm')}.webm`,
      );
      await run(ffmpeg, [
        '-y',
        '-hide_banner',
        '-loglevel',
        'error',
        '-ss',
        demo.start.toFixed(3),
        '-i',
        demo.rawPath,
        '-t',
        demo.duration.toFixed(3),
        '-r',
        '15',
        '-c:v',
        'libvpx',
        '-deadline',
        'good',
        '-cpu-used',
        '2',
        '-crf',
        '34',
        '-b:v',
        '0',
        '-an',
        outputPath,
      ]);

      const { size } = await stat(outputPath);
      console.log(`${path.basename(outputPath)}: ${(size / 1024 / 1024).toFixed(2)} MB`);

      if (canEncodeMp4) {
        const mp4Path = outputPath.replace(/\.webm$/, '.mp4');
        await run(ffmpeg, [
          '-y',
          '-hide_banner',
          '-loglevel',
          'error',
          '-ss',
          demo.start.toFixed(3),
          '-i',
          demo.rawPath,
          '-t',
          demo.duration.toFixed(3),
          '-r',
          '15',
          '-c:v',
          'libx264',
          '-preset',
          'slow',
          '-crf',
          '24',
          '-pix_fmt',
          'yuv420p',
          '-movflags',
          '+faststart',
          '-an',
          mp4Path,
        ]);

        const { size: mp4Size } = await stat(mp4Path);
        console.log(`${path.basename(mp4Path)}: ${(mp4Size / 1024 / 1024).toFixed(2)} MB`);
      } else {
        console.log(
          'Skipped MP4 fallback encoding because this ffmpeg build does not include libx264. Set ROAM_FFMPEG to a full ffmpeg binary to regenerate it.',
        );
      }
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
