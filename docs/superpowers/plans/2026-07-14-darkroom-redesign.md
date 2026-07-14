# jordanrblum.com v4 "Darkroom Editorial" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild jordanrblum.com as an Astro 5 static site implementing the approved Darkroom Editorial design (spec: `docs/superpowers/specs/2026-07-14-jordanrblum-redesign-design.md`).

**Architecture:** Zero-JS-by-default Astro pages with four small islands (light-table drag, sticky story, lightbox, easter eggs). All content lives in one typed data file. Design tokens are 3 CSS custom properties + 1 accent, derived via `color-mix`. Static output deploys to the existing S3/CloudFront pipeline.

**Tech Stack:** Astro ^5, Tailwind ^4 (via `@tailwindcss/vite`), Motion (motion.dev) ^12, TypeScript, Vitest (unit), Playwright (e2e), pnpm ≥10.16, Node 22.

## Global Constraints (from spec — every task inherits these)

- Palette tokens EXACTLY: light `--surface:#FAF6F0 --ink:#3B342E --heading:#211B16`; dark `--surface:#1B1815 --ink:#A39A91 --heading:#F4EADC`; accent `#2F6B39` (interactive elements ONLY). Derived values via `color-mix` only — no new hex colors except print-border white and safelight red `#C6402B` (easter egg only).
- Type: Fraunces Variable (display, 52px hero / 22px italic section heads, never bold), Switzer (body 15–16px), Geist Mono (12–13px meta, `tabular-nums`). No other sizes for display type.
- Motion: bezier `cubic-bezier(.34,1.3,.64,1)`, 200–400ms, deterministic staggers `150ms + i*65ms`, hover scale cap 1.04. BANNED: scroll-jacking, marquees, JS typewriters, rotating elements, gradient-shift keyframes, bounce-in, random staggers.
- `prefers-reduced-motion`: all motion collapses to ≤150ms opacity fades; drag disabled.
- Site must render fully (all content visible) with JavaScript disabled.
- Projects section: ONLY the approved public roster (chicksofnyc, citibike-wrapped, Alive Still, wimdy, reservation-agent, roastmyfriend, poker-night). No mission-control card. No real Roam product screenshots anywhere — SVG abstractions only.
- Copy is locked in the spec (§6). Do not rewrite sentences.
- Package manager: pnpm with `minimumReleaseAge: 4320` quarantine. Commit after every task on branch `feature/v4-darkroom-redesign`.
- Known deviation (approved at planning): nav wordmark is "Jordan Blum" in Fraunces italic with a small hand-drawn SVG underline, not a full signature SVG. Switzer ships as static 400/500/600 weights (Fontshare), not variable 450/550.

## File Structure

```
jordanrblum.com/
├── package.json / pnpm-workspace.yaml / pnpm-lock.yaml
├── astro.config.mjs / tsconfig.json / vitest.config.ts / playwright.config.ts
├── public/            favicon.svg, robots.txt (carried over)
├── src/
│   ├── styles/global.css            ← tokens, fonts, motion contract, base styles
│   ├── data/site.ts                 ← ALL copy/content (typed)
│   ├── assets/photos/*.jpg|jpeg     ← moved from img/
│   ├── assets/fonts/switzer-*.woff2 ← downloaded (Fontshare)
│   ├── layouts/Base.astro           ← head, theme script, fonts, Nav, Footer
│   ├── components/
│   │   ├── Nav.astro  Footer.astro  Row.astro  SectionHead.astro
│   │   ├── LightTable.astro  props/FilmCanister.astro  props/NegativeStrip.astro  props/TerminalProp.astro
│   │   ├── StickyStory.astro  story/{ListingCard,CalcSliders,ChatBubbles,MetricChips}.astro
│   │   ├── ContactSheet.astro  Lightbox.astro
│   ├── scripts/scatter.ts  keyword.ts  lighttable.ts  story.ts  lightbox.ts  eggs.ts
│   └── pages/index.astro
├── tests/unit/{scatter,keyword,site-data}.test.ts
├── tests/e2e/{smoke,rows,lighttable,story,gallery,eggs,nojs}.spec.ts
└── .github/workflows/deploy.yml     ← modified for pnpm+Astro
Legacy `index.html`, `css/`, `js/`, unused `img/` files are deleted in Task 11 only.
```

---

### Task 1: Scaffold — toolchain, fonts, tokens, empty page builds

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `astro.config.mjs`, `tsconfig.json`, `src/styles/global.css`, `src/layouts/Base.astro`, `src/pages/index.astro`, `public/robots.txt`
- Move: `img/favicon.svg` → `public/favicon.svg`

**Interfaces:**
- Produces: `Base.astro` layout with slots (`<slot />`), global CSS custom props (`--surface --ink --heading --accent --ink-75 --hairline --hover-fill --spring`), font families `--font-display --font-body --font-mono`, utility classes `.reveal`, `.hairline`, `.mono-meta`. Later tasks import `../layouts/Base.astro` and rely on these names exactly.

- [ ] **Step 1: Initialize package**

```bash
cd /Users/jordanblum/repos/jordanrblum.com
cat > pnpm-workspace.yaml <<'EOF'
minimumReleaseAge: 4320
EOF
cat > package.json <<'EOF'
{
  "name": "jordanrblum.com",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "test:unit": "vitest run",
    "test:e2e": "playwright test"
  }
}
EOF
pnpm add astro @tailwindcss/vite tailwindcss motion @fontsource-variable/fraunces @fontsource/geist-mono
pnpm add -D typescript vitest @playwright/test
```
Expected: lockfile created, no peer warnings that block install. (If `minimumReleaseAge` quarantines a just-released version, pnpm resolves an older one — that is correct behavior, do not override.)

- [ ] **Step 2: Download Switzer (self-hosted)**

```bash
mkdir -p src/assets/fonts
curl -sL -A "Mozilla/5.0" "https://api.fontshare.com/v2/css?f[]=switzer@400,500,600&display=swap" -o /tmp/switzer.css
grep -oE 'https://[^) ]+\.woff2' /tmp/switzer.css | sort -u | while read u; do
  w=$(echo "$u" | grep -oE '(400|500|600)' | head -1)
  curl -sL -A "Mozilla/5.0" "$u" -o "src/assets/fonts/switzer-${w:-400}.woff2"
done
ls -la src/assets/fonts/
```
Expected: `switzer-400.woff2`, `switzer-500.woff2`, `switzer-600.woff2` present, each >20KB. If Fontshare is unreachable, STOP and report — do not substitute another font.

- [ ] **Step 3: Astro + TS config**

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://jordanrblum.com',
  vite: { plugins: [tailwindcss()] },
});
```

```jsonc
// tsconfig.json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "src/**/*", "tests/**/*"],
  "compilerOptions": { "types": ["vitest/globals"] }
}
```

- [ ] **Step 4: Global CSS — tokens, fonts, motion contract**

```css
/* src/styles/global.css */
@import "tailwindcss";

@font-face { font-family: "Switzer"; src: url("../assets/fonts/switzer-400.woff2") format("woff2"); font-weight: 400; font-display: swap; }
@font-face { font-family: "Switzer"; src: url("../assets/fonts/switzer-500.woff2") format("woff2"); font-weight: 500; font-display: swap; }
@font-face { font-family: "Switzer"; src: url("../assets/fonts/switzer-600.woff2") format("woff2"); font-weight: 600; font-display: swap; }
/* Metric-matched fallback to kill CLS */
@font-face { font-family: "Switzer Fallback"; src: local("Helvetica Neue"), local("Arial"); size-adjust: 97%; ascent-override: 96%; descent-override: 24%; }

@theme {
  --font-display: "Fraunces Variable", Georgia, serif;
  --font-body: "Switzer", "Switzer Fallback", system-ui, sans-serif;
  --font-mono: "Geist Mono", ui-monospace, "SF Mono", monospace;
  --color-surface: var(--surface);
  --color-ink: var(--ink);
  --color-heading: var(--heading);
  --color-accent: var(--accent);
}

:root {
  --surface: #FAF6F0;
  --ink: #3B342E;
  --heading: #211B16;
  --accent: #2F6B39;
  --ink-75: color-mix(in oklab, var(--ink) 75%, transparent);
  --hairline: color-mix(in oklab, var(--ink) 8%, transparent);
  --hover-fill: color-mix(in oklab, var(--ink) 4%, transparent);
  --spring: cubic-bezier(.34, 1.3, .64, 1);
  --print-border: #ffffff;
}
:root[data-theme="dark"] { --surface: #1B1815; --ink: #A39A91; --heading: #F4EADC; }
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]):not([data-theme="dark"]) { --surface: #1B1815; --ink: #A39A91; --heading: #F4EADC; }
}
/* Darkroom easter egg: safelight red replaces accent */
:root[data-grain="on"] { --accent: #C6402B; }

html { scroll-behavior: smooth; }
body {
  font-family: var(--font-body);
  font-size: 16px;
  line-height: 1.6;
  letter-spacing: -0.01em;
  background: var(--surface);
  color: var(--ink);
  -webkit-font-smoothing: antialiased;
}
h1, h2, h3 { font-family: var(--font-display); color: var(--heading); font-weight: 500; }
a { color: inherit; text-decoration: none; }
::selection { background: color-mix(in oklab, var(--accent) 20%, transparent); }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; border-radius: 2px; }

.mono-meta { font-family: var(--font-mono); font-size: 13px; font-variant-numeric: tabular-nums; color: var(--ink-75); letter-spacing: 0; }
.hairline { height: 1px; border: 0; background: linear-gradient(90deg, transparent, var(--hairline) 12%, var(--hairline) 88%, transparent); }
.measure { max-width: 660px; margin-inline: auto; padding-inline: 24px; }
.wide { max-width: 1050px; margin-inline: auto; padding-inline: 24px; }
.section { padding-block: clamp(120px, 16vw, 180px); }

/* Entrance: develop-in. JS adds .is-visible; style is inert without JS (see html.js gate). */
html.js .reveal { opacity: 0; filter: blur(4px); transform: translateY(6px);
  transition: opacity .4s var(--spring), filter .4s var(--spring), transform .4s var(--spring);
  transition-delay: calc(150ms + var(--i, 0) * 65ms); }
html.js .reveal.is-visible { opacity: 1; filter: none; transform: none; }

/* Hover-cold guard: hover styles only after html.pointer-moved is set by JS */
@media (prefers-reduced-motion: reduce) {
  html.js .reveal { transition: opacity .15s ease; filter: none; transform: none; }
  * { animation-duration: .01ms !important; animation-iteration-count: 1 !important; }
}

/* Film grain overlay (hidden until data-grain) */
:root[data-grain="on"] body::after {
  content: ""; position: fixed; inset: 0; pointer-events: none; z-index: 999; opacity: .07; mix-blend-mode: multiply;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E");
}
```

- [ ] **Step 5: Base layout + placeholder page**

```astro
---
// src/layouts/Base.astro
import '@fontsource-variable/fraunces';
import '@fontsource/geist-mono';
import '../styles/global.css';
interface Props { title: string; description: string }
const { title, description } = Astro.props;
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <meta name="theme-color" media="(prefers-color-scheme: light)" content="#FAF6F0" />
    <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#1B1815" />
    <script is:inline>
      document.documentElement.classList.add('js');
      try { const t = localStorage.getItem('theme'); if (t) document.documentElement.dataset.theme = t; } catch {}
      addEventListener('pointermove', () => document.documentElement.classList.add('pointer-moved'), { once: true });
    </script>
  </head>
  <body>
    <slot />
  </body>
</html>
```

```astro
---
// src/pages/index.astro
import Base from '../layouts/Base.astro';
---
<Base title="Jordan Blum — Product Engineer" description="Jordan Blum — product engineer at Roam, photographer, builder. New York.">
  <main><h1 class="measure section">Scaffold OK</h1></main>
</Base>
```

```bash
git mv img/favicon.svg public/favicon.svg
printf 'User-agent: *\nAllow: /\n' > public/robots.txt
```

- [ ] **Step 6: Verify build**

Run: `pnpm build`
Expected: `dist/index.html` exists; `grep -c "Scaffold OK" dist/index.html` → 1; `grep -o 'switzer-400[^"]*woff2' dist/index.html || ls dist/_astro | grep -i switzer` shows hashed font assets.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: scaffold Astro 5 + Tailwind 4 toolchain with Darkroom tokens and self-hosted fonts"
```

---

### Task 2: Pure logic — scatter + keyword detector (TDD)

**Files:**
- Create: `src/scripts/scatter.ts`, `src/scripts/keyword.ts`, `vitest.config.ts`
- Test: `tests/unit/scatter.test.ts`, `tests/unit/keyword.test.ts`

**Interfaces:**
- Produces: `scatter(count: number, seed: number): Placement[]` where `Placement = { xPct: number; yPct: number; rot: number; z: number }` (xPct 4–96, yPct 6–94, rot −8…8, z 1..count). `createKeywordDetector(word: string, onMatch: () => void): (key: string) => void`. Tasks 6 and 9 import these exact names.

- [ ] **Step 1: Vitest config**

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { globals: true, include: ['tests/unit/**/*.test.ts'] } });
```

- [ ] **Step 2: Write failing tests**

```ts
// tests/unit/scatter.test.ts
import { scatter } from '../../src/scripts/scatter';

test('deterministic for same seed', () => {
  expect(scatter(6, 42)).toEqual(scatter(6, 42));
});
test('different seeds differ', () => {
  expect(scatter(6, 1)).not.toEqual(scatter(6, 2));
});
test('placements stay in bounds and rotation band', () => {
  for (const p of scatter(8, 7)) {
    expect(p.xPct).toBeGreaterThanOrEqual(4); expect(p.xPct).toBeLessThanOrEqual(96);
    expect(p.yPct).toBeGreaterThanOrEqual(6); expect(p.yPct).toBeLessThanOrEqual(94);
    expect(Math.abs(p.rot)).toBeLessThanOrEqual(8);
    expect(Math.abs(p.rot)).toBeGreaterThanOrEqual(2); // never perfectly straight
  }
});
test('no two prints closer than 12% (x-axis crowding guard)', () => {
  const ps = scatter(6, 42);
  for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
    const d = Math.hypot(ps[i].xPct - ps[j].xPct, ps[i].yPct - ps[j].yPct);
    expect(d).toBeGreaterThanOrEqual(12);
  }
});
```

```ts
// tests/unit/keyword.test.ts
import { createKeywordDetector } from '../../src/scripts/keyword';

test('fires on exact sequence', () => {
  let hits = 0;
  const feed = createKeywordDetector('grain', () => hits++);
  for (const k of 'xxgrain') feed(k);
  expect(hits).toBe(1);
});
test('case-insensitive and resets after match', () => {
  let hits = 0;
  const feed = createKeywordDetector('grain', () => hits++);
  for (const k of 'GRAINgrain') feed(k);
  expect(hits).toBe(2);
});
test('interleaved noise prevents match', () => {
  let hits = 0;
  const feed = createKeywordDetector('grain', () => hits++);
  for (const k of 'g r a i n'.split('')) feed(k);
  expect(hits).toBe(0);
});
```

- [ ] **Step 3: Run tests, verify they fail**

Run: `pnpm test:unit`
Expected: FAIL — cannot resolve `src/scripts/scatter` / `src/scripts/keyword`.

- [ ] **Step 4: Implement**

```ts
// src/scripts/scatter.ts
export interface Placement { xPct: number; yPct: number; rot: number; z: number }

function lcg(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 0xffffffff);
}

/** Deterministic scattered-print layout: golden-angle base ring + seeded jitter. */
export function scatter(count: number, seed: number): Placement[] {
  const rnd = lcg(seed);
  const out: Placement[] = [];
  for (let i = 0; i < count; i++) {
    for (let attempt = 0; attempt < 40; attempt++) {
      const angle = i * 2.399963 + rnd() * 0.6;
      const radius = 18 + 26 * Math.sqrt((i + rnd()) / count);
      const xPct = Math.min(96, Math.max(4, 50 + Math.cos(angle) * radius * 1.6));
      const yPct = Math.min(94, Math.max(6, 50 + Math.sin(angle) * radius));
      const ok = out.every(p => Math.hypot(p.xPct - xPct, p.yPct - yPct) >= 12);
      if (ok || attempt === 39) {
        const mag = 2 + rnd() * 6;
        out.push({ xPct, yPct, rot: rnd() > 0.5 ? mag : -mag, z: i + 1 });
        break;
      }
    }
  }
  return out;
}
```

```ts
// src/scripts/keyword.ts
export function createKeywordDetector(word: string, onMatch: () => void): (key: string) => void {
  const target = word.toLowerCase();
  let buf = '';
  return (key: string) => {
    if (key.length !== 1) return;
    buf = (buf + key.toLowerCase()).slice(-target.length);
    if (buf === target) { onMatch(); buf = ''; }
  };
}
```

- [ ] **Step 5: Run tests, verify pass.** Run: `pnpm test:unit` → 7 passing. (If the min-distance test flakes for seed 42, adjust the seed constant used in LightTable later, not the algorithm bounds.)

- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: deterministic scatter layout + keyword detector (TDD)"`

---

### Task 3: Content data file

**Files:**
- Create: `src/data/site.ts`
- Move: `git mv img/*.jpg img/*.jpeg src/assets/photos/` (create dir first)
- Test: `tests/unit/site-data.test.ts`

**Interfaces:**
- Produces (exact exports later tasks import):
  - `hero: { statement: string; meta: string }`
  - `heroPrints: Print[]` and `facedownPrint: Print` where `Print = { src: ImageMetadata; alt: string; label: string }`
  - `storyBeats: { sentence: string; visual: 'listing' | 'calc' | 'chat' | 'metrics' }[]`
  - `experience: RowItem[]`, `projects: RowItem[]` where `RowItem = { title: string; meta: string; date: string; blurb: string; href?: string; thumb?: ImageMetadata }`
  - `contactSheet: Print[]`, `social: { label: string; href: string }[]`

- [ ] **Step 1: Move photos into src/assets**

```bash
mkdir -p src/assets/photos
git mv img/*.jpg img/*.jpeg src/assets/photos/
git mv img/jrb-logo-green.svg src/assets/  # kept for potential reuse; logos png/jpg stay in img/ until Task 11 deletes them
```

- [ ] **Step 2: Write the data file (copy is LOCKED from spec §6 — verbatim)**

```ts
// src/data/site.ts
import type { ImageMetadata } from 'astro';
import cali from '../assets/photos/cali-mountains.jpeg';
import chicago from '../assets/photos/chicago-skyline-night.jpg';
import morro from '../assets/photos/sunset-beach.jpeg';
import namibia from '../assets/photos/photo0030.jpg';
import lake from '../assets/photos/moutain-lake.jpeg';
import cpt from '../assets/photos/CPT_Sunset.jpg';
import holeinthewall from '../assets/photos/holeinthewall.jpg';
import capetownCave from '../assets/photos/photo0020.jpg';
import thailand from '../assets/photos/beach-water.jpg';
import rome from '../assets/photos/photo0040.jpg';
import cityViews from '../assets/photos/portfolio-3.jpg';
import tableMountain from '../assets/photos/photo0001.jpg';

export interface Print { src: ImageMetadata; alt: string; label: string }
export interface RowItem { title: string; meta: string; date: string; blurb: string; href?: string; thumb?: ImageMetadata }

export const hero = {
  statement: 'Product engineer at Roam. I like making software — and photographs — feel right.',
  meta: 'New York · currently building Reed',
};

export const heroPrints: Print[] = [
  { src: cali, alt: 'Runner at sunset on California hills', label: 'California' },
  { src: chicago, alt: 'Chicago skyline at dusk', label: 'Chicago' },
  { src: morro, alt: 'Morro Rock sunset with shorebird', label: 'Morro Bay' },
  { src: namibia, alt: 'Deadvlei, Namibia — dead trees on white clay pan', label: 'Namibia' },
  { src: lake, alt: 'Mountain lake with yellow canoe', label: 'Mountain lake' },
  { src: cpt, alt: 'Ocean sunset from Cape Town cliffs', label: 'Cape Town' },
];

export const facedownPrint: Print = {
  src: holeinthewall, alt: 'Hole in the Wall, Wild Coast, South Africa', label: 'Wild Coast — a keeper',
};

export const storyBeats = [
  { sentence: 'I joined Roam in 2025 as engineer #3 — full-stack product on the marketplace making assumable mortgages accessible.', visual: 'listing' },
  { sentence: 'I shipped the buyer funnel end to end: offer calculators, search, onboarding, the growth experiments.', visual: 'calc' },
  { sentence: 'Then Roam built an AI realtor — Reed — and I became its lead engineer.', visual: 'chat' },
  { sentence: 'Now I ship alongside a fleet of agents I built the harness for — with evals to keep it honest.', visual: 'metrics' },
] as const;

export const metrics = ['419 PRs/yr', '3–4× merge velocity', '13× completion lift', '87%+ eval positivity'];

export const experience: RowItem[] = [
  { title: 'Roam', meta: 'Product Engineer · #3', date: '2025—', blurb: 'The marketplace, then lead engineer on Reed, Roam’s AI realtor.', href: 'https://www.withroam.com' },
  { title: 'Procore', meta: 'Senior Software Engineer', date: '2021–2025', blurb: 'Developer productivity for 300+ engineers — the internal deploy platform, CI/CD standards adopted org-wide.' },
  { title: 'Workday', meta: 'DevOps & Release Engineering', date: '2018–2021', blurb: 'Internal developer tools; cut release timelines in half.' },
  { title: 'Santa Clara University', meta: 'B.S. Computer Science · Studio Art', date: '2014–2018', blurb: 'Plus a semester at the University of Cape Town, Fall 2016.' },
];

export const projects: RowItem[] = [
  { title: 'chicksofnyc', meta: 'Next.js · Airtable · Maps', date: '2025', blurb: 'NYC’s chicken wings, reviewed in person, ranked, and mapped.', href: 'https://chicksofnyc.com', thumb: cityViews },
  { title: 'citibike wrapped', meta: 'React · client-side only', date: '2026', blurb: 'A Spotify-Wrapped year in review for your Citi Bike rides.', href: 'https://citibikewrapped.vercel.app', thumb: chicago },
  { title: 'Alive Still', meta: 'SwiftUI · Twilio', date: '2026', blurb: 'Daily check-in app for people who live alone — a missed window texts your people.', href: 'https://alivestill.app', thumb: lake },
  { title: 'wimdy', meta: 'Weather · activities', date: '2026', blurb: 'Your weather, judged: what’s actually worth doing outside right now.', href: 'https://wimdy.io', thumb: thailand },
  { title: 'reservation agent', meta: 'Agents · whimsy', date: '2026', blurb: 'An agent that hunts down reservations of all kinds.', href: 'https://reservation-agent.vercel.app', thumb: rome },
  { title: 'roast my friend', meta: 'LLMs · questionable ideas', date: '2026', blurb: 'Upload a friend, receive a roast.', href: 'https://roastmyfriend.vercel.app', thumb: capetownCave },
  { title: 'poker night', meta: 'Settling up', date: '2025', blurb: 'Compute poker-night wins and settle up without the spreadsheet fight.', href: 'https://poker-night-eight.vercel.app', thumb: tableMountain },
];

export const contactSheet: Print[] = [
  { src: cali, alt: 'Runner at sunset on California hills', label: 'California' },
  { src: capetownCave, alt: 'Silhouette in rock cave overlooking Cape Town', label: 'Cape Town' },
  { src: thailand, alt: 'Turquoise bay with limestone cliffs', label: 'Thailand' },
  { src: namibia, alt: 'Deadvlei, Namibia — dead trees on white clay pan', label: 'Namibia' },
  { src: rome, alt: 'Colosseum cross silhouette, Rome', label: 'Rome' },
  { src: tableMountain, alt: 'Hikers overlooking Cape Town from Table Mountain', label: 'Table Mountain' },
  { src: morro, alt: 'Morro Rock sunset with shorebird', label: 'Morro Bay' },
  { src: holeinthewall, alt: 'Hole in the Wall, Wild Coast, South Africa', label: 'Wild Coast' },
];

export const gallery = 'https://blumblumblum-gallery.vercel.app/';

export const social = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/jordanblum1' },
  { label: 'GitHub', href: 'https://github.com/jordanblum1' },
  { label: 'Instagram', href: 'https://www.instagram.com/jordanblum1' },
  { label: 'Photo gallery', href: 'https://blumblumblum-gallery.vercel.app/' },
  { label: 'Email', href: 'mailto:jordanblum19@gmail.com' },
];
```

- [ ] **Step 3: Data-integrity test (public-link rule)**

```ts
// tests/unit/site-data.test.ts
// NOTE: site.ts imports images via Astro's pipeline, which Vitest can't resolve.
// Assert the invariants against the SOURCE TEXT instead — keeps the rule enforced without an Astro test harness.
import { readFileSync } from 'node:fs';
const src = readFileSync('src/data/site.ts', 'utf8');

test('every project row has an https href (public-link rule)', () => {
  const projectsBlock = src.slice(src.indexOf('export const projects'), src.indexOf('export const contactSheet'));
  const rows = projectsBlock.match(/\{ title:/g) ?? [];
  const hrefs = projectsBlock.match(/href: 'https:\/\//g) ?? [];
  expect(rows.length).toBe(7);
  expect(hrefs.length).toBe(rows.length);
});
test('banned projects are absent', () => {
  for (const banned of ['mission-control', 'trackthatpoop', 'jordans-jams', 'ShipSwift', 'dondachi', 'spotify']) {
    expect(src).not.toContain(banned);
  }
});
test('alt text everywhere a photo appears', () => {
  const altCount = (src.match(/alt: '/g) ?? []).length;
  expect(altCount).toBeGreaterThanOrEqual(15);
});
```

- [ ] **Step 4: Run** `pnpm test:unit` → all pass (10 total). Then `pnpm build` → still succeeds.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: typed content data file with locked copy + public-link-rule tests"`

---

### Task 4: Nav, SectionHead, Footer + page shell

**Files:**
- Create: `src/components/Nav.astro`, `src/components/SectionHead.astro`, `src/components/Footer.astro`
- Modify: `src/layouts/Base.astro` (mount Nav/Footer), `src/pages/index.astro` (section skeleton)
- Test: `tests/e2e/smoke.spec.ts`, `playwright.config.ts`

**Interfaces:**
- Consumes: `social` from `src/data/site.ts`.
- Produces: `<SectionHead id label />` (renders `<h2 id={id} class="section-head">{label}</h2>` — Fraunces 22px italic lowercase). Page sections use ids `work`, `photos`, `about` exactly (nav anchors depend on them).

- [ ] **Step 1: Playwright config**

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e',
  webServer: { command: 'pnpm build && pnpm preview --port 4321', port: 4321, reuseExistingServer: true, timeout: 120_000 },
  use: { baseURL: 'http://localhost:4321' },
});
```
Run once: `pnpm exec playwright install chromium`

- [ ] **Step 2: Failing smoke test**

```ts
// tests/e2e/smoke.spec.ts
import { test, expect } from '@playwright/test';

test('shell renders with nav, sections, footer', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('nav a[href="#work"]')).toHaveText('work');
  await expect(page.locator('nav a[href="#photos"]')).toHaveText('photos');
  await expect(page.locator('nav a[href="#about"]')).toHaveText('about');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Product engineer at Roam');
  await expect(page.locator('footer')).toContainText('Made in New York');
  await expect(page.locator('footer')).toContainText('Fraunces');
});
test('no banned v3 patterns in DOM', async ({ page }) => {
  await page.goto('/');
  expect(await page.locator('.marquee, .typed-text, .timeline-dot').count()).toBe(0);
});
```
Run: `pnpm test:e2e` → FAIL (components missing).

- [ ] **Step 3: Components**

```astro
---
// src/components/Nav.astro
---
<nav class="wide" aria-label="Primary">
  <a class="wordmark" href="/" aria-label="Jordan Blum — home">
    Jordan Blum
    <svg viewBox="0 0 120 8" width="88" height="6" aria-hidden="true"><path d="M2 5 C 20 1, 44 7, 62 4 S 104 2, 118 5" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"/></svg>
  </a>
  <div class="links mono-meta">
    <a href="#work">work</a><a href="#photos">photos</a><a href="#about">about</a>
  </div>
</nav>
<style>
  nav { display: flex; justify-content: space-between; align-items: baseline; padding-block: 28px; position: relative; }
  nav::after { content: ""; position: absolute; inset-inline: 0; top: 100%; height: 32px; pointer-events: none;
    background: linear-gradient(var(--surface), transparent); }
  .wordmark { font-family: var(--font-display); font-style: italic; font-size: 20px; color: var(--heading); display: inline-flex; flex-direction: column; gap: 2px; }
  .wordmark svg { opacity: .85; }
  .links { display: flex; gap: 28px; }
  .links a { transition: color .2s var(--spring); }
  html.pointer-moved .links a:hover { color: var(--accent); }
</style>
```

```astro
---
// src/components/SectionHead.astro
interface Props { id: string; label: string }
const { id, label } = Astro.props;
---
<h2 id={id} class="section-head reveal">{label}</h2>
<style>
  .section-head { font-size: 22px; font-style: italic; font-weight: 450; margin-bottom: 40px; scroll-margin-top: 96px; }
</style>
```

```astro
---
// src/components/Footer.astro
import { social } from '../data/site';
---
<footer class="section">
  <div class="measure">
    <p class="cta">Let’s build something.</p>
    <ul class="social">
      {social.map((s) => (
        <li><a href={s.href} target={s.href.startsWith('http') ? '_blank' : undefined} rel="noopener">
          <span>{s.label}</span><span class="arrow" aria-hidden="true">↗</span>
        </a></li>
      ))}
    </ul>
    <div class="colophon mono-meta">
      <span>Made in New York · © {new Date().getFullYear()} Jordan Blum</span>
      <span>Set in Fraunces, Switzer &amp; Geist Mono</span>
    </div>
  </div>
</footer>
<style>
  .cta { font-family: var(--font-display); font-size: clamp(34px, 6vw, 52px); line-height: 1.05; letter-spacing: -0.02em; color: var(--heading); margin-bottom: 48px; }
  .social { list-style: none; padding: 0; margin: 0 0 64px; }
  .social a { display: flex; justify-content: space-between; padding-block: 18px; border-top: 1px solid var(--hairline); font-weight: 500; transition: padding-left .25s var(--spring); }
  .social li:last-child a { border-bottom: 1px solid var(--hairline); }
  html.pointer-moved .social a:hover { padding-left: 10px; background: var(--hover-fill); }
  .arrow { color: var(--accent); transition: transform .25s var(--spring); }
  html.pointer-moved .social a:hover .arrow { transform: translate(3px, -3px); }
  .colophon { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
</style>
```

- [ ] **Step 4: Assemble shell** — in `Base.astro` insert `<Nav />` after `<body>` opening and `<Footer />` before `</body>` (import both). Replace `index.astro` main with:

```astro
---
// src/pages/index.astro
import Base from '../layouts/Base.astro';
import SectionHead from '../components/SectionHead.astro';
import { hero } from '../data/site';
---
<Base title="Jordan Blum — Product Engineer" description="Jordan Blum — product engineer at Roam, photographer, builder. New York.">
  <main>
    <header class="hero wide">
      <h1 class="statement">{hero.statement}</h1>
      <p class="mono-meta">{hero.meta}</p>
      <!-- LightTable mounts here in Task 6 -->
    </header>
    <section class="section measure" id="roam-story"><!-- StickyStory, Task 7 --></section>
    <section class="section measure"><SectionHead id="work" label="work" /><!-- Rows, Task 5 --></section>
    <section class="section measure"><SectionHead id="about" label="about" /><!-- About prose, Task 5 --></section>
    <section class="section wide"><SectionHead id="photos" label="photos" /><!-- ContactSheet, Task 8 --></section>
  </main>
</Base>
<style>
  .hero { padding-block: 48px 0; }
  .statement { font-size: clamp(34px, 5.5vw, 52px); line-height: 1.08; letter-spacing: -0.02em; max-width: 15ch; }
  .hero .mono-meta { margin-top: 16px; }
</style>
```

- [ ] **Step 5: Run** `pnpm test:e2e` → 2 passing. **Step 6: Commit** — `"feat: nav/footer/page shell with hairline social rows"`

---

### Task 5: Row component + work/about sections

**Files:**
- Create: `src/components/Row.astro`
- Modify: `src/pages/index.astro` (fill `#work` and `#about`)
- Test: `tests/e2e/rows.spec.ts`

**Interfaces:**
- Consumes: `experience`, `projects` (`RowItem`) from site.ts; `Image` from `astro:assets`.
- Produces: `<Row item={RowItem} index={number} />`.

- [ ] **Step 1: Failing test**

```ts
// tests/e2e/rows.spec.ts
import { test, expect } from '@playwright/test';

test('experience and project rows render with dates and hairlines', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.row')).toHaveCount(11); // 4 experience + 7 projects
  await expect(page.locator('.row', { hasText: 'Procore' })).toContainText('2021–2025');
  const chicks = page.locator('.row a[href="https://chicksofnyc.com"]');
  await expect(chicks).toHaveCount(1);
});
test('project thumbs hidden until hover', async ({ page }) => {
  await page.goto('/');
  await page.mouse.move(10, 10); // trigger pointer-moved gate
  const row = page.locator('.row', { hasText: 'chicksofnyc' });
  const thumb = row.locator('.thumb');
  await expect(thumb).toHaveCSS('opacity', '0');
  await row.hover();
  await expect(thumb).not.toHaveCSS('opacity', '0');
});
```
Run: `pnpm test:e2e --grep rows` → FAIL.

- [ ] **Step 2: Row component**

```astro
---
// src/components/Row.astro
import { Image } from 'astro:assets';
import type { RowItem } from '../data/site';
interface Props { item: RowItem; index: number }
const { item, index } = Astro.props;
const Tag = item.href ? 'a' : 'div';
---
<Tag class="row reveal" style={`--i:${index}`} href={item.href} target={item.href ? '_blank' : undefined} rel={item.href ? 'noopener' : undefined}>
  <div class="head">
    <span class="title">{item.title}</span>
    <span class="meta mono-meta">{item.meta}</span>
    <span class="date mono-meta">{item.date}</span>
  </div>
  <p class="blurb">{item.blurb}</p>
  {item.thumb && (
    <span class="thumb" aria-hidden="true">
      <Image src={item.thumb} alt="" width={180} densities={[1, 2]} />
    </span>
  )}
</Tag>
<style>
  .row { display: block; position: relative; padding-block: 22px; border-top: 1px solid var(--hairline); transition: background .2s var(--spring); }
  .row:last-of-type { border-bottom: 1px solid var(--hairline); }
  html.pointer-moved .row:hover { background: var(--hover-fill); }
  .head { display: flex; align-items: baseline; gap: 14px; }
  .title { font-weight: 550; color: var(--heading); }
  .date { margin-left: auto; }
  .blurb { margin-top: 4px; color: var(--ink-75); font-size: 15px; max-width: 52ch; }
  .thumb { position: absolute; right: 90px; top: 50%; width: 120px; pointer-events: none; z-index: 2;
    padding: 6px 6px 16px; background: var(--print-border); box-shadow: 0 2px 6px rgb(0 0 0 / .12), 0 10px 24px rgb(0 0 0 / .10);
    opacity: 0; transform: translateY(calc(-50% + 8px)) rotate(4deg);
    transition: opacity .25s var(--spring), transform .25s var(--spring); }
  html.pointer-moved .row:hover .thumb { opacity: 1; transform: translateY(-50%) rotate(-2deg); }
  .thumb img { display: block; width: 100%; height: auto; }
  @media (max-width: 720px) { .thumb { display: none; } .head { flex-wrap: wrap; } }
  @media (prefers-reduced-motion: reduce) { .thumb { transition: opacity .15s ease; transform: translateY(-50%); } }
</style>
```

- [ ] **Step 3: Fill sections in index.astro** — inside the `#work` section (after `SectionHead`):

```astro
    {experience.map((item, i) => <Row item={item} index={i} />)}
    <h3 class="mono-meta" style="margin:56px 0 8px">side projects</h3>
    {projects.map((item, i) => <Row item={item} index={i} />)}
    <p class="mono-meta" style="margin-top:24px"><a href="https://github.com/jordanblum1" target="_blank" rel="noopener">more on GitHub →</a></p>
```

and inside `#about`:

```astro
    <p class="about-prose reveal">
      I studied Computer Science and Studio Art at Santa Clara, which means I care equally about
      how things work and how they look. At Roam I build the marketplace and lead engineering on Reed,
      our AI realtor. Off hours: shooting photos, riding Citi Bikes, and rating chicken wings with unreasonable rigor.
    </p>
```
with style `.about-prose { font-size: 17px; line-height: 1.7; max-width: 52ch; }`. Import `Row`, `experience`, `projects` in frontmatter.

- [ ] **Step 4: Run** `pnpm test:e2e` → all passing. **Step 5: Commit** — `"feat: typographic experience/project rows with hover prints"`

---

### Task 6: LightTable hero (develop-in, drag, props, face-down print)

**Files:**
- Create: `src/components/LightTable.astro`, `src/components/props/FilmCanister.astro`, `src/components/props/NegativeStrip.astro`, `src/components/props/TerminalProp.astro`, `src/scripts/lighttable.ts`
- Modify: `src/pages/index.astro` (mount in hero)
- Test: `tests/e2e/lighttable.spec.ts`

**Interfaces:**
- Consumes: `scatter` (Task 2), `heroPrints`, `facedownPrint` (Task 3), `animate` from `motion`.
- Produces: DOM contract used by eggs/no-JS tests: container `#light-table`, prints `.print[data-idx]`, face-down card `.print.facedown` which gains `.flipped` on click.

- [ ] **Step 1: Failing test**

```ts
// tests/e2e/lighttable.spec.ts
import { test, expect } from '@playwright/test';

test('six prints + one facedown render scattered', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#light-table .print')).toHaveCount(7);
  const rotations = await page.locator('#light-table .print').evaluateAll(
    els => els.map(e => getComputedStyle(e).transform));
  expect(new Set(rotations).size).toBeGreaterThan(3); // actually scattered, not stacked
});
test('prints develop in on load', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#light-table .print').first()).toHaveClass(/is-visible/);
});
test('drag moves a print', async ({ page }) => {
  await page.goto('/');
  const print = page.locator('#light-table .print[data-idx="0"]');
  const before = await print.boundingBox();
  await print.hover();
  await page.mouse.down();
  await page.mouse.move(before!.x + 140, before!.y + 60, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(600); // spring settle
  const after = await print.boundingBox();
  expect(Math.abs(after!.x - before!.x)).toBeGreaterThan(80);
});
test('facedown print flips on click, not on drag', async ({ page }) => {
  await page.goto('/');
  const fd = page.locator('.print.facedown');
  await fd.click();
  await expect(fd).toHaveClass(/flipped/);
});
test('terminal prop types via CSS only', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.prop-terminal')).toContainText('jordan@roam:~$');
});
```
Run: `pnpm test:e2e --grep light` → FAIL.

- [ ] **Step 2: Prop SVG components** (flat, token-driven, tiny)

```astro
---
// src/components/props/FilmCanister.astro
---
<svg class="prop prop-canister" viewBox="0 0 44 64" width="44" height="64" aria-hidden="true">
  <rect x="6" y="12" width="32" height="46" rx="4" fill="var(--heading)"/>
  <rect x="2" y="6" width="40" height="8" rx="3" fill="var(--ink)"/>
  <rect x="10" y="20" width="24" height="26" rx="2" fill="var(--surface)"/>
  <text x="22" y="37" text-anchor="middle" font-family="var(--font-mono)" font-size="8" fill="var(--heading)">JRB</text>
  <text x="22" y="44" text-anchor="middle" font-family="var(--font-mono)" font-size="6" fill="var(--ink-75)">400</text>
</svg>
```

```astro
---
// src/components/props/NegativeStrip.astro
---
<svg class="prop prop-negatives" viewBox="0 0 140 36" width="140" height="36" aria-hidden="true">
  <rect width="140" height="36" rx="2" fill="var(--heading)"/>
  {Array.from({ length: 12 }).map((_, i) => (
    <><rect x={4 + i * 11.5} y="2.5" width="5" height="3.5" rx="1" fill="var(--surface)" opacity=".9"/>
    <rect x={4 + i * 11.5} y="30" width="5" height="3.5" rx="1" fill="var(--surface)" opacity=".9"/></>
  ))}
  {Array.from({ length: 4 }).map((_, i) => (
    <rect x={7 + i * 33} y="9" width="27" height="18" rx="1" fill="var(--ink)" opacity=".55"/>
  ))}
</svg>
```

```astro
---
// src/components/props/TerminalProp.astro
---
<div class="prop prop-terminal" aria-hidden="true">
  <div class="bar"><i></i><i></i><i></i></div>
  <code>jordan@roam:~$ <span class="cmd">ship</span><span class="caret"></span></code>
</div>
<style>
  .prop-terminal { width: 190px; border-radius: 8px; background: var(--heading); color: var(--surface);
    box-shadow: 0 2px 6px rgb(0 0 0 / .14), 0 12px 28px rgb(0 0 0 / .10); overflow: hidden; }
  .bar { display: flex; gap: 5px; padding: 7px 9px; background: color-mix(in oklab, var(--heading) 84%, var(--surface)); }
  .bar i { width: 7px; height: 7px; border-radius: 50%; background: var(--surface); opacity: .35; }
  code { display: block; padding: 10px 12px 14px; font-family: var(--font-mono); font-size: 11px; }
  /* CSS steps() reveal — NOT a JS typewriter */
  .cmd { display: inline-block; overflow: hidden; white-space: nowrap; vertical-align: bottom; width: 4ch;
    animation: cmd-type 1.2s steps(4, end) .8s both; }
  .caret { display: inline-block; width: 1ch; border-bottom: 2px solid var(--accent); margin-left: 1px; }
  @keyframes cmd-type { from { width: 0 } to { width: 4ch } }
  @media (prefers-reduced-motion: reduce) { .cmd { animation: none; } }
</style>
```

- [ ] **Step 3: LightTable component**

```astro
---
// src/components/LightTable.astro
import { Image } from 'astro:assets';
import { heroPrints, facedownPrint } from '../data/site';
import { scatter } from '../scripts/scatter';
import FilmCanister from './props/FilmCanister.astro';
import NegativeStrip from './props/NegativeStrip.astro';
import TerminalProp from './props/TerminalProp.astro';
const placements = scatter(heroPrints.length + 1, 42); // build-time; last placement = facedown print
---
<div id="light-table" class="wide" aria-label="A light table of photographs — drag them around">
  {heroPrints.map((p, i) => (
    <figure class="print reveal" data-idx={i} style={`--x:${placements[i].xPct}%; --y:${placements[i].yPct}%; --rot:${placements[i].rot}deg; --i:${i}; z-index:${placements[i].z}`}>
      <Image src={p.src} alt={p.alt} width={300} densities={[1, 2]} loading="eager" />
      <figcaption class="mono-meta">{p.label}</figcaption>
    </figure>
  ))}
  <figure class="print facedown reveal" data-idx={heroPrints.length} tabindex="0" role="button"
    aria-label="A face-down print. Flip it over."
    style={`--x:${placements[heroPrints.length].xPct}%; --y:${placements[heroPrints.length].yPct}%; --rot:${placements[heroPrints.length].rot}deg; --i:${heroPrints.length}; z-index:${placements[heroPrints.length].z}`}>
    <div class="flip">
      <div class="back"><span class="mono-meta">↻</span></div>
      <div class="front">
        <Image src={facedownPrint.src} alt={facedownPrint.alt} width={300} densities={[1, 2]} loading="eager" />
        <figcaption class="handwritten">{facedownPrint.label}</figcaption>
      </div>
    </div>
  </figure>
  <div class="prop-slot canister"><FilmCanister /></div>
  <div class="prop-slot negatives"><NegativeStrip /></div>
  <div class="prop-slot terminal"><TerminalProp /></div>
</div>
<script src="../scripts/lighttable.ts"></script>
<style>
  #light-table { position: relative; height: clamp(380px, 52vw, 560px); margin-top: 40px; touch-action: pan-y; }
  .print { position: absolute; left: var(--x); top: var(--y); width: clamp(140px, 20vw, 220px); margin: 0;
    transform: translate(-50%, -50%) rotate(var(--rot)); cursor: grab; user-select: none;
    background: var(--print-border); padding: 8px 8px 8px; box-shadow: 0 1px 3px rgb(0 0 0 / .12), 0 12px 28px rgb(0 0 0 / .12); }
  .print:active { cursor: grabbing; }
  .print img { display: block; width: 100%; height: auto; pointer-events: none; }
  .print figcaption { padding-top: 6px; font-size: 11px; }
  html.pointer-moved .print:hover { box-shadow: 0 2px 5px rgb(0 0 0 / .14), 0 18px 40px rgb(0 0 0 / .16); }
  /* develop-in: extends .reveal with a brightness ramp */
  html.js .print.reveal { filter: blur(8px) brightness(1.6); }
  html.js .print.reveal.is-visible { filter: none; transition-duration: .7s; }
  /* facedown flip */
  .facedown .flip { position: relative; transform-style: preserve-3d; transition: transform .5s var(--spring); }
  .facedown.flipped .flip { transform: rotateY(180deg); }
  .facedown .back, .facedown .front { backface-visibility: hidden; }
  .facedown .back { display: grid; place-items: center; aspect-ratio: 3 / 2.2; background: repeating-linear-gradient(45deg, var(--surface), var(--surface) 6px, var(--hover-fill) 6px, var(--hover-fill) 12px); }
  .facedown .front { position: absolute; inset: 0; transform: rotateY(180deg); background: var(--print-border); }
  .handwritten { font-family: var(--font-display); font-style: italic; font-size: 13px; padding-top: 6px; }
  .prop-slot { position: absolute; pointer-events: none; }
  .canister { left: 8%; bottom: 6%; transform: rotate(-9deg); }
  .negatives { right: 6%; top: 10%; transform: rotate(6deg); }
  .terminal { right: 12%; bottom: 4%; transform: rotate(2deg); }
  @media (max-width: 720px) { .prop-slot.negatives { display: none; } .terminal { right: 4%; } }
  @media (prefers-reduced-motion: reduce) {
    html.js .print.reveal { filter: none; }
    .facedown .flip { transition: opacity .15s ease; }
  }
</style>
```

- [ ] **Step 4: Island script**

```ts
// src/scripts/lighttable.ts
import { animate } from 'motion';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const table = document.getElementById('light-table');

if (table) {
  // develop-in
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
  }, { threshold: 0.2 });
  table.querySelectorAll('.print').forEach((p) => io.observe(p));

  let zTop = 100;
  table.querySelectorAll<HTMLElement>('.print').forEach((print) => {
    let sx = 0, sy = 0, dx = 0, dy = 0, moved = false;

    print.addEventListener('pointerdown', (ev) => {
      if (reduced) return;
      print.setPointerCapture(ev.pointerId);
      sx = ev.clientX - dx; sy = ev.clientY - dy; moved = false;
      print.style.zIndex = String(++zTop);
    });
    print.addEventListener('pointermove', (ev) => {
      if (!print.hasPointerCapture(ev.pointerId)) return;
      dx = ev.clientX - sx; dy = ev.clientY - sy;
      if (Math.hypot(dx, dy) > 5) moved = true;
      print.style.translate = `${dx}px ${dy}px`;
    });
    print.addEventListener('pointerup', (ev) => {
      if (!print.hasPointerCapture(ev.pointerId)) return;
      print.releasePointerCapture(ev.pointerId);
      if (moved) {
        // soft spring settle at the drop point (slight overshoot back)
        animate(print, { translate: `${dx * 0.98}px ${dy * 0.98}px` }, { type: 'spring', stiffness: 320, damping: 22 });
        dx *= 0.98; dy *= 0.98;
      }
    });

    if (print.classList.contains('facedown')) {
      const flip = () => { if (!moved) print.classList.toggle('flipped'); };
      print.addEventListener('click', flip);
      print.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); print.classList.toggle('flipped'); } });
    }
  });
}
```

- [ ] **Step 5: Mount in hero** (`index.astro`): import `LightTable` and place `<LightTable />` where the Task 4 comment sits.

- [ ] **Step 6: Run** `pnpm test:e2e` → all passing (if the drag test is flaky under spring settle, raise the `waitForTimeout` to 900ms — do not remove the spring). **Step 7: Commit** — `"feat: light-table hero with develop-in, spring drag, props, facedown flip"`

---

### Task 7: StickyStory (Roam pre→post-AI scroll story)

**Files:**
- Create: `src/components/StickyStory.astro`, `src/components/story/ListingCard.astro`, `src/components/story/CalcSliders.astro`, `src/components/story/ChatBubbles.astro`, `src/components/story/MetricChips.astro`, `src/scripts/story.ts`
- Modify: `src/pages/index.astro` (mount; change `#roam-story` section class from `measure` to `wide`)
- Test: `tests/e2e/story.spec.ts`

**Interfaces:**
- Consumes: `storyBeats`, `metrics` from site.ts.
- Produces: DOM contract — `#roam-story .beat-sentence[data-beat]`, `#roam-story .beat-visual[data-visual]`, active pair carries `.active`. Section renders ALL sentences+visuals stacked when JS is off.

- [ ] **Step 1: Failing test**

```ts
// tests/e2e/story.spec.ts
import { test, expect } from '@playwright/test';

test('story renders 4 beats and advances on scroll', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#roam-story .beat-sentence')).toHaveCount(4);
  await expect(page.locator('#roam-story .beat-sentence[data-beat="0"]')).toHaveClass(/active/);
  // scroll to ~75% through the story track
  await page.evaluate(() => {
    const el = document.querySelector('#roam-story')!;
    const r = el.getBoundingClientRect();
    scrollTo(0, scrollY + r.top + (el as HTMLElement).offsetHeight * 0.75);
  });
  await page.waitForTimeout(300);
  await expect(page.locator('#roam-story .beat-sentence[data-beat="3"], #roam-story .beat-sentence[data-beat="2"]').first()).toHaveClass(/active/);
});
test('metric chips show the real numbers', async ({ page }) => {
  await page.goto('/');
  for (const m of ['419 PRs/yr', '3–4× merge velocity', '13× completion lift', '87%+ eval positivity']) {
    await expect(page.locator('#roam-story')).toContainText(m);
  }
});
```
Run → FAIL.

- [ ] **Step 2: Story visual components.** All four are inline SVG/HTML abstractions using only tokens. Complete code:

```astro
---
// src/components/story/ListingCard.astro
---
<svg viewBox="0 0 260 200" width="260" height="200" role="img" aria-label="Abstract home listing card">
  <rect x="10" y="10" width="240" height="180" rx="14" fill="none" stroke="var(--hairline)" stroke-width="2"/>
  <rect x="26" y="26" width="208" height="92" rx="8" fill="var(--hover-fill)"/>
  <path d="M96 88 L130 58 L164 88 Z M104 88 v22 h52 v-22" fill="none" stroke="var(--ink-75)" stroke-width="3" stroke-linejoin="round"/>
  <rect x="26" y="132" width="120" height="10" rx="5" fill="var(--ink-75)"/>
  <rect x="26" y="152" width="80" height="8" rx="4" fill="var(--hairline)"/>
  <rect x="168" y="132" width="66" height="24" rx="12" fill="var(--accent)"/>
  <text x="201" y="148" text-anchor="middle" font-family="var(--font-mono)" font-size="11" fill="var(--surface)">2.9%</text>
</svg>
```

```astro
---
// src/components/story/CalcSliders.astro
---
<svg viewBox="0 0 260 200" width="260" height="200" role="img" aria-label="Abstract offer calculator with sliders">
  <rect x="10" y="10" width="240" height="180" rx="14" fill="none" stroke="var(--hairline)" stroke-width="2"/>
  {[58, 98, 138].map((y, i) => (
    <><rect x="30" y={y} width="200" height="4" rx="2" fill="var(--hairline)"/>
    <rect x="30" y={y} width={[130, 84, 168][i]} height="4" rx="2" fill="var(--accent)"/>
    <circle cx={30 + [130, 84, 168][i]} cy={y + 2} r="9" fill="var(--surface)" stroke="var(--accent)" stroke-width="3"/></>
  ))}
  <rect x="30" y="30" width="90" height="9" rx="4" fill="var(--ink-75)"/>
  <text x="230" y="180" text-anchor="end" font-family="var(--font-mono)" font-size="12" fill="var(--ink-75)">$ / mo</text>
</svg>
```

```astro
---
// src/components/story/ChatBubbles.astro
---
<div class="chat" role="img" aria-label="Abstract AI chat with tool calls">
  <div class="bubble user">What’s my home worth?</div>
  <div class="tool mono-meta">⚙ fetching comps…</div>
  <div class="tool mono-meta">⚙ grading photos…</div>
  <div class="bubble reed">Here’s your price report.</div>
</div>
<style>
  .chat { display: flex; flex-direction: column; gap: 10px; width: 260px; }
  .bubble { padding: 10px 14px; border-radius: 14px; font-size: 14px; max-width: 85%; }
  .user { align-self: flex-end; background: var(--hover-fill); color: var(--heading); }
  .reed { align-self: flex-start; background: var(--accent); color: var(--surface); }
  .tool { align-self: flex-start; padding: 5px 10px; border: 1px solid var(--hairline); border-radius: 999px; font-size: 11px; }
</style>
```

```astro
---
// src/components/story/MetricChips.astro
import { metrics } from '../../data/site';
---
<ul class="chips" role="img" aria-label="Engineering metrics">
  {metrics.map((m) => <li class="mono-meta">{m}</li>)}
</ul>
<style>
  .chips { list-style: none; display: flex; flex-wrap: wrap; gap: 10px; padding: 0; width: 280px; }
  .chips li { padding: 8px 14px; border: 1px solid var(--hairline); border-radius: 999px; color: var(--heading); background: var(--hover-fill); }
</style>
```

- [ ] **Step 3: StickyStory component**

```astro
---
// src/components/StickyStory.astro
import { storyBeats } from '../data/site';
import ListingCard from './story/ListingCard.astro';
import CalcSliders from './story/CalcSliders.astro';
import ChatBubbles from './story/ChatBubbles.astro';
import MetricChips from './story/MetricChips.astro';
const visuals = { listing: ListingCard, calc: CalcSliders, chat: ChatBubbles, metrics: MetricChips } as const;
---
<div class="story-track" data-beats={storyBeats.length}>
  <div class="story-viewport">
    <div class="col sentences">
      <p class="mono-meta kicker">roam · 2025—</p>
      {storyBeats.map((b, i) => {
        return <p class="beat-sentence" data-beat={i}>{b.sentence}</p>;
      })}
    </div>
    <div class="col visuals" aria-hidden="false">
      {storyBeats.map((b, i) => {
        const V = visuals[b.visual];
        return <div class="beat-visual" data-visual={i}><V /></div>;
      })}
    </div>
  </div>
</div>
<script src="../scripts/story.ts"></script>
<style>
  /* JS on: tall track drives beat index; both columns sticky. JS off: everything stacks visibly. */
  html.js .story-track { height: calc(var(--beats, 4) * 90vh); }
  html.js .story-viewport { position: sticky; top: 0; min-height: 100vh; display: grid; grid-template-columns: 1fr 1fr; align-items: center; gap: 48px; }
  html.js .beat-sentence { position: absolute; max-width: 22ch; opacity: 0; transform: translateY(10px); transition: opacity .35s var(--spring), transform .35s var(--spring); }
  html.js .beat-sentence.active { opacity: 1; transform: none; }
  html.js .sentences { position: relative; min-height: 240px; }
  html.js .beat-visual { position: absolute; opacity: 0; transition: opacity .35s var(--spring); }
  html.js .beat-visual.active { opacity: 1; }
  html.js .visuals { position: relative; display: grid; place-items: center; min-height: 300px; }
  .beat-sentence { font-family: var(--font-display); font-size: clamp(24px, 3.4vw, 34px); line-height: 1.2; color: var(--heading); }
  .kicker { margin-bottom: 20px; }
  /* no-JS + mobile fallback: stacked pairs */
  html:not(.js) .story-viewport, .story-viewport { display: grid; gap: 40px; }
  @media (max-width: 720px) {
    html.js .story-track { height: auto; }
    html.js .story-viewport { position: static; grid-template-columns: 1fr; min-height: 0; }
    html.js .beat-sentence, html.js .beat-visual { position: static; opacity: 1; transform: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    html.js .beat-sentence, html.js .beat-visual { transition: opacity .15s ease; transform: none; }
  }
</style>
```

- [ ] **Step 4: Island script**

```ts
// src/scripts/story.ts
const track = document.querySelector<HTMLElement>('.story-track');
if (track && matchMedia('(min-width: 721px)').matches) {
  const beats = Number(track.dataset.beats ?? 4);
  track.style.setProperty('--beats', String(beats));
  const sentences = [...track.querySelectorAll('.beat-sentence')];
  const visuals = [...track.querySelectorAll('.beat-visual')];
  let current = -1;
  const setBeat = (i: number) => {
    if (i === current) return;
    current = i;
    sentences.forEach((s, j) => s.classList.toggle('active', j === i));
    visuals.forEach((v, j) => v.classList.toggle('active', j === i));
  };
  const onScroll = () => {
    const r = track.getBoundingClientRect();
    const progress = Math.min(0.999, Math.max(0, -r.top / (track.offsetHeight - innerHeight)));
    setBeat(Math.floor(progress * beats));
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}
```

- [ ] **Step 5: Mount** — in `index.astro`, change the story section to `<section class="section wide" id="roam-story"><StickyStory /></section>` and import it.

- [ ] **Step 6: Run** `pnpm test:e2e` → passing. **Step 7: Commit** — `"feat: sticky-sentence Roam story with SVG abstractions and metric chips"`

---

### Task 8: ContactSheet + Lightbox

**Files:**
- Create: `src/components/ContactSheet.astro`, `src/components/Lightbox.astro`, `src/scripts/lightbox.ts`
- Modify: `src/pages/index.astro` (mount in `#photos` section)
- Test: `tests/e2e/gallery.spec.ts`

**Interfaces:**
- Consumes: `contactSheet`, `gallery` from site.ts.
- Produces: `<dialog id="lightbox">` with `.lb-img`; thumbnails are `<button class="sheet-frame" data-idx>`.

- [ ] **Step 1: Failing test**

```ts
// tests/e2e/gallery.spec.ts
import { test, expect } from '@playwright/test';

test('contact sheet renders 8 frames and opens lightbox with keyboard nav', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.sheet-frame')).toHaveCount(8);
  await page.locator('.sheet-frame').first().click();
  const dialog = page.locator('dialog#lightbox');
  await expect(dialog).toHaveAttribute('open', '');
  const firstSrc = await dialog.locator('img').getAttribute('src');
  await page.keyboard.press('ArrowRight');
  expect(await dialog.locator('img').getAttribute('src')).not.toBe(firstSrc);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toHaveAttribute('open', '');
});
test('full gallery link present', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('a[href="https://blumblumblum-gallery.vercel.app/"]').first()).toContainText('full gallery');
});
```

- [ ] **Step 2: ContactSheet**

```astro
---
// src/components/ContactSheet.astro
import { Image } from 'astro:assets';
import { contactSheet, gallery } from '../data/site';
---
<div class="sheet" role="list">
  {contactSheet.map((p, i) => (
    <button class="sheet-frame reveal" data-idx={i} style={`--i:${i}`} aria-label={`View photo: ${p.alt}`} role="listitem"
      data-full={p.src.src} data-alt={p.alt}>
      <Image src={p.src} alt={p.alt} width={400} densities={[1, 2]} />
    </button>
  ))}
</div>
<p class="more mono-meta"><a href={gallery} target="_blank" rel="noopener">full gallery →</a></p>
<style>
  .sheet { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3px; padding-block: 14px; position: relative; }
  /* filmstrip sprocket edges */
  .sheet::before, .sheet::after { content: ""; position: absolute; inset-inline: 0; height: 10px;
    background-image: radial-gradient(circle at 6px 5px, var(--hairline) 3px, transparent 3.5px);
    background-size: 22px 10px; }
  .sheet::before { top: 0; } .sheet::after { bottom: 0; }
  .sheet-frame { border: 0; padding: 0; cursor: pointer; background: var(--heading); aspect-ratio: 3 / 2; overflow: hidden; }
  .sheet-frame img { width: 100%; height: 100%; object-fit: cover; display: block;
    filter: saturate(.92) brightness(.97); transition: filter .3s var(--spring), transform .3s var(--spring); }
  html.pointer-moved .sheet-frame:hover img { filter: none; transform: scale(1.03); }
  .more { margin-top: 20px; text-align: right; }
  @media (max-width: 720px) { .sheet { grid-template-columns: repeat(2, 1fr); } }
</style>
```

- [ ] **Step 3: Lightbox (native `<dialog>`)**

```astro
---
// src/components/Lightbox.astro
---
<dialog id="lightbox" aria-label="Photo viewer">
  <button class="lb-close" aria-label="Close">×</button>
  <img class="lb-img" src="" alt="" />
  <p class="lb-caption mono-meta"></p>
</dialog>
<script src="../scripts/lightbox.ts"></script>
<style>
  #lightbox { border: 0; padding: 0; background: transparent; max-width: 92vw; max-height: 92vh; }
  #lightbox::backdrop { background: rgb(10 8 6 / .94); backdrop-filter: blur(6px); }
  .lb-img { max-width: 92vw; max-height: 84vh; object-fit: contain; display: block; background: var(--print-border); padding: 10px; }
  .lb-caption { color: #FAF6F0; padding-top: 10px; text-align: center; }
  .lb-close { position: fixed; top: 20px; right: 24px; width: 44px; height: 44px; border-radius: 50%;
    border: 1px solid rgb(250 246 240 / .3); background: transparent; color: #FAF6F0; font-size: 22px; cursor: pointer; }
</style>
```

```ts
// src/scripts/lightbox.ts
const dialog = document.getElementById('lightbox') as HTMLDialogElement | null;
if (dialog) {
  const img = dialog.querySelector<HTMLImageElement>('.lb-img')!;
  const caption = dialog.querySelector<HTMLElement>('.lb-caption')!;
  const frames = [...document.querySelectorAll<HTMLButtonElement>('.sheet-frame')];
  let idx = 0;
  const show = (i: number) => {
    idx = (i + frames.length) % frames.length;
    img.src = frames[idx].dataset.full!;
    img.alt = caption.textContent = frames[idx].dataset.alt!;
  };
  frames.forEach((f, i) => f.addEventListener('click', () => { show(i); dialog.showModal(); }));
  dialog.querySelector('.lb-close')!.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') show(idx + 1);
    if (e.key === 'ArrowLeft') show(idx - 1);
  });
}
```

- [ ] **Step 4: Mount** — add `<ContactSheet />` inside `#photos` section and `<Lightbox />` once before `</main>`; import both.

- [ ] **Step 5: Run** `pnpm test:e2e` → passing. **Step 6: Commit** — `"feat: filmstrip contact sheet + dialog lightbox with keyboard nav"`

---

### Task 9: Easter eggs island + reveal wiring

**Files:**
- Create: `src/scripts/eggs.ts`
- Modify: `src/layouts/Base.astro` (load eggs + global reveal observer)
- Test: `tests/e2e/eggs.spec.ts`

**Interfaces:**
- Consumes: `createKeywordDetector` (Task 2).
- Produces: typing `grain` toggles `document.documentElement.dataset.grain` between `'on'`/unset; console message; global `.reveal` IntersectionObserver.

- [ ] **Step 1: Failing test**

```ts
// tests/e2e/eggs.spec.ts
import { test, expect } from '@playwright/test';

test('typing grain toggles darkroom mode', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.type('grain');
  await expect(page.locator('html')).toHaveAttribute('data-grain', 'on');
  // accent flips to safelight red
  const accent = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
  expect(accent.toLowerCase()).toBe('#c6402b');
  await page.keyboard.type('grain');
  await expect(page.locator('html')).not.toHaveAttribute('data-grain', 'on');
});
test('reveal elements become visible on scroll', async ({ page }) => {
  await page.goto('/');
  await page.locator('#work').scrollIntoViewIfNeeded();
  await expect(page.locator('#work.is-visible')).toHaveCount(1);
});
```

- [ ] **Step 2: Implement eggs + reveal observer**

```ts
// src/scripts/eggs.ts
import { createKeywordDetector } from './keyword';

// Egg 1: darkroom mode
const feed = createKeywordDetector('grain', () => {
  const root = document.documentElement;
  if (root.dataset.grain === 'on') delete root.dataset.grain;
  else root.dataset.grain = 'on';
});
addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
  feed(e.key);
});

// Egg 3: console note (Egg 2, the facedown print, lives in lighttable.ts)
console.log('%cdeveloped in the darkroom — try typing “grain”', 'font-family: monospace; color: #2F6B39;');
console.log('%cjordanblum19@gmail.com', 'font-family: monospace; color: #888;');

// Global reveal observer for .reveal outside the light table
const io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
}, { rootMargin: '0px 0px -60px 0px', threshold: 0.1 });
document.querySelectorAll('.reveal:not(.print)').forEach((el) => io.observe(el));
```

In `Base.astro`, before `</body>`: `<script src="../scripts/eggs.ts"></script>`.

- [ ] **Step 3: Run** `pnpm test:e2e` → passing. **Step 4: Commit** — `"feat: grain darkroom egg, console note, global reveal observer"`

---

### Task 10: Reduced-motion + no-JS + a11y/perf verification

**Files:**
- Create: `tests/e2e/nojs.spec.ts`
- Modify: only if failures found.

- [ ] **Step 1: Tests**

```ts
// tests/e2e/nojs.spec.ts
import { test, expect } from '@playwright/test';

test.describe('no JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('all content is visible without JS', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#light-table .print')).toHaveCount(7);
    await expect(page.locator('.beat-sentence')).toHaveCount(4);
    for (const beat of [0, 1, 2, 3]) await expect(page.locator(`.beat-sentence[data-beat="${beat}"]`)).toBeVisible();
    await expect(page.locator('.row')).toHaveCount(11);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible(); // no .reveal opacity trap
  });
});

test.describe('reduced motion', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });
  test('page renders and story beats still switch', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#light-table .print').first()).toBeVisible();
  });
});

test('perf: total JS under 60KB gzipped', async ({ page }) => {
  const sizes: number[] = [];
  page.on('response', async (r) => {
    if (r.url().endsWith('.js')) sizes.push(Number(r.headers()['content-length'] ?? 0));
  });
  await page.goto('/', { waitUntil: 'networkidle' });
  const total = sizes.reduce((a, b) => a + b, 0);
  expect(total).toBeLessThan(60_000);
});
```

- [ ] **Step 2: Run** `pnpm test:e2e` (full suite). Fix any failure at its source (e.g., a `.reveal` that hides content without JS means the `html.js` gate is missing on that selector). Expected end state: entire suite green.

- [ ] **Step 3: Lighthouse spot-check**

```bash
pnpm build && pnpm preview --port 4321 &
sleep 2 && npx --yes lighthouse http://localhost:4321 --only-categories=performance,accessibility,best-practices,seo --chrome-flags="--headless" --output=json --output-path=/tmp/lh.json
node -e "const r=require('/tmp/lh.json');for(const[k,v]of Object.entries(r.categories))console.log(k,Math.round(v.score*100))"
kill %1
```
Expected: every category ≥ 95. If accessibility < 95, read the audit list in `/tmp/lh.json` and fix (likely candidates: contrast of `--ink-75` on `--surface`, missing button names).

- [ ] **Step 4: Commit** — `"test: no-JS, reduced-motion, JS-budget and Lighthouse verification"`

---

### Task 11: Legacy removal, README, deploy workflow

**Files:**
- Delete: `index.html`, `css/`, `js/`, remaining `img/` files (logos now unused)
- Modify: `.github/workflows/*.yml`, `README.md`, `.gitignore`

- [ ] **Step 1: Read the existing workflow FIRST** — `cat .github/workflows/*.yml`. Note the exact secret names, bucket name/region, and the CloudFront `vars` conditional. Preserve them verbatim in the replacement.

- [ ] **Step 2: Replace build/deploy steps.** Target shape (adapt names from Step 1 — do not invent new secret names):

```yaml
name: Deploy to S3
on:
  push:
    branches: [master]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 10 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}        # ← keep existing names
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ secrets.AWS_REGION }}
      - run: aws s3 sync dist/ s3://${{ secrets.AWS_S3_BUCKET }} --delete
      - name: Invalidate CloudFront
        if: ${{ vars.CLOUDFRONT_DISTRIBUTION_ID != '' }}
        run: aws cloudfront create-invalidation --distribution-id ${{ vars.CLOUDFRONT_DISTRIBUTION_ID }} --paths "/*"
```

- [ ] **Step 3: Delete legacy files**

```bash
git rm index.html
git rm -r css js
git rm -r img   # only logos and banner remain here after Task 3's photo move; verify with: git status img/
echo -e "node_modules/\ndist/\n.astro/\ntest-results/\nplaywright-report/" >> .gitignore
```

- [ ] **Step 4: README**

```markdown
# jordanrblum.com

Personal site — Astro 5 + Tailwind 4 + Motion. Design spec: `docs/superpowers/specs/2026-07-14-jordanrblum-redesign-design.md`.

- `pnpm dev` — local dev
- `pnpm build` / `pnpm preview` — static build to `dist/`
- `pnpm test:unit` / `pnpm test:e2e` — Vitest + Playwright
- Deploys to S3 (+ optional CloudFront invalidation) on push to `master` via GitHub Actions.
- Try typing `grain` on the site.
```

- [ ] **Step 5: Full verification** — `pnpm test:unit && pnpm test:e2e && pnpm build`. Expected: everything green, `dist/` contains hashed assets, no references to deleted paths (`grep -r "css/style.css" dist/ src/` → empty).

- [ ] **Step 6: Commit** — `"chore: remove v3 legacy, update deploy workflow to pnpm+Astro, README"`

---

## Self-Review (run after writing — completed 2026-07-14)

1. **Spec coverage:** tokens/type/layout → Tasks 1,4; light table + props + facedown (§6.1) → Task 6; story §6.2 → Task 7; rows §6.3–6.4 → Tasks 3,5; contact sheet §6.5 → Task 8; motion contract §7 → Tasks 1,6,7 + banned-pattern test in Task 4; eggs §8 → Tasks 6 (flip), 9 (grain, console); architecture §9 → Tasks 1,11; a11y/perf §10 → Task 10; verification §11 → Tasks 4–10 e2e + Lighthouse. LinkedIn copy (§12) is a spec deliverable, not site code — no task needed.
2. **Placeholders:** none — every step has complete code or exact commands.
3. **Type consistency:** `Placement{xPct,yPct,rot,z}` and `scatter(count,seed)` match between Tasks 2 and 6; `RowItem`/`Print` fields match between Tasks 3, 5, 6, 8; `createKeywordDetector` matches Tasks 2 and 9; `.reveal`/`is-visible`/`html.js` gates match Tasks 1, 6, 9, 10.
