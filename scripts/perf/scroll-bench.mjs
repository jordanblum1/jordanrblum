// Scroll smoothness benchmark: drives a real (compositor-path) scroll gesture
// via CDP and measures rAF frame times through the whole page. Usage:
//   node scripts/perf/scroll-bench.mjs [url]
import { chromium } from '@playwright/test';

const url = process.argv[2] ?? 'http://localhost:4322/';
// HEADED=1 uses the real GPU — headless falls back to SwiftShader software
// rasterization, which wildly overstates compositing costs. Prefer HEADED=1
// for representative numbers; headless is for CI trend lines only.
const browser = await chromium.launch({
  headless: !process.env.HEADED,
  args: ['--force-device-scale-factor=2'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

const client = await page.context().newCDPSession(page);
const height = await page.evaluate(() => document.body.scrollHeight - innerHeight);

await page.evaluate(() => {
  window.__frames = [];
  window.__run = true;
  const tick = (t) => {
    window.__frames.push(t);
    if (window.__run) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

// Scroll to the bottom and back in smooth synthesized gestures.
for (const distance of [-height, height]) {
  await client.send('Input.synthesizeScrollGesture', {
    x: 720, y: 450,
    yDistance: distance,
    speed: 1400,
    gestureSourceType: 'mouse',
  });
  await page.waitForTimeout(150);
}

const frames = await page.evaluate(() => { window.__run = false; return window.__frames; });
await browser.close();

const deltas = frames.slice(1).map((t, i) => t - frames[i]).filter((d) => d > 0);
const total = deltas.reduce((a, b) => a + b, 0);
const avgFps = (deltas.length / total) * 1000;
const sorted = [...deltas].sort((a, b) => a - b);
const p95 = sorted[Math.floor(sorted.length * 0.95)];
const worst = sorted[sorted.length - 1];
const janky = deltas.filter((d) => d > 26).length;

console.log(JSON.stringify({
  url,
  frames: deltas.length,
  avgFps: Number(avgFps.toFixed(1)),
  p95FrameMs: Number(p95.toFixed(1)),
  worstFrameMs: Number(worst.toFixed(1)),
  framesOver26ms: janky,
  jankPercent: Number(((janky / deltas.length) * 100).toFixed(1)),
}, null, 2));
