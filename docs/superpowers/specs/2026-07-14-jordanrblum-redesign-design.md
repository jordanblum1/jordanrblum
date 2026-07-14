# jordanrblum.com v4 — "Darkroom Editorial" redesign

**Date:** 2026-07-14 · **Status:** Approved by Jordan (direction, system, and content sign-off in session)

## 1. Goal

Replace the vibe-coded v3 (typewriter hero, marquee, bouncing pills, emerald-everywhere) with a minimal-but-fun site at Airbnb-level polish, informed by danield.design, jackiehu.design, ja.mt, and pool.day. Two jobs:

1. A redesigned site on a new stack (Astro 5 + Tailwind v4 + Motion), photography-led, with one concentrated playful moment and disciplined micro-interactions.
2. An expanded Roam story (pre-AI full-stack → post-AI agentic engineering) whose copy doubles as the LinkedIn Roam entry.

## 2. Constraints

- **Projects rule (hard):** only projects with a public link or public GitHub repo get project rows. Verified live 2026-07-14: chicksofnyc.com, citibikewrapped.vercel.app, wimdy.io, reservation-agent.vercel.app, roastmyfriend.vercel.app, poker-night-eight.vercel.app, blumblumblum-gallery.vercel.app, Alive Still (App Store). Excluded: trackthatpoop.com / jordans-jams / spotify.cher.gg / dondachi (dead links), ShipSwift (third-party clone), mission-control (private — appears in the Roam story narrative only, no project card).
- **No real Roam product screenshots.** Story visuals are stylized SVG abstractions.
- Deploy target stays S3 + CloudFront via GitHub Actions (workflow updated to build Astro).
- `prefers-reduced-motion` must collapse all motion to opacity fades. Site must be fully usable with JS disabled (drag/easter eggs degrade silently).

## 3. Design tokens

Three base tokens per theme + one accent; everything else derived via alpha/`color-mix`.

| Token | Light | Dark |
|---|---|---|
| `--surface` | `#FAF6F0` warm paper | `#1B1815` warm near-black |
| `--ink` | `#3B342E` | `#A39A91` |
| `--heading` | `#211B16` | `#F4EADC` |
| `--accent` | `#2F6B39` emerald (both themes; interactive elements ONLY) | same |

Derived: secondary text = ink@75%, hairlines = ink@8%, hover fill = ink@4%, selection = accent@20%. Dark mode via `prefers-color-scheme` + synchronous `data-theme` script and dual `theme-color` metas. Shadows: layered low-alpha stacks (7–19% black max), never a single blurry box-shadow. Print (photo) borders: pure white regardless of theme.

## 4. Typography

| Face | Role | Sizes | Notes |
|---|---|---|---|
| **Fraunces** (variable, self-hosted) | Display serif | 52px hero statement (lh 1.05, ls −0.02em, wght ~500); 22px *italic* lowercase section heads | Never bolded; the only two display sizes on the site |
| **Switzer** (Fontshare, self-hosted) | Body/UI | 15–16px body (lh 1.6, ls −0.01em), weights 450/550 | Metric-matched fallback via size-adjust to avoid CLS |
| **Geist Mono** (self-hosted) | Meta/labels | 12–13px, tabular-nums | Dates, row labels, terminal prop, footer colophon |

No intermediate sizes. Hierarchy = the 3× scale jump + weight + ink/heading color. Footer colophon credits all three faces.

## 5. Layout

- Single centered column, 660px measure for prose/rows; light table and contact sheet break out to ~1050px.
- Section padding 140–180px vertical. Hairline dividers (1px, ink@8%) with gradient-faded ends.
- Nav: signature wordmark left (hand-drawn-style SVG of "Jordan Blum", build-time asset), three lowercase links right (`work · photos · about`). Not sticky. A white fade-gradient under it instead of a border.
- Footer as destination: contact block ("Let's build something." in Fraunces), social links as rows with ↗, "Made in New York", colophon, © year.

## 6. Sections (top → bottom)

### 6.1 Hero — the light table (the ONE playful moment)
- Quiet intro: signature wordmark, then the serif statement: **"Product engineer at Roam. I like making software — and photographs — feel right."** plus a mono meta-line (`New York · currently building Reed`).
- Below: 6 actual prints scattered like physical objects — white borders, ±3–8° rotations, stacked-photo shadows. Picks (existing `img/` assets): `cali-mountains.jpeg`, `chicago-skyline-night.jpg`, `sunset-beach.jpeg` (Morro Bay), `photo0030.jpg` (Namibia), `moutain-lake.jpeg`, `CPT_Sunset.jpg`; the face-down easter-egg print reveals `holeinthewall.jpg`.
- Behavior: prints **develop in on load** (blur 8px→0 + brightness ramp, stagger 150ms + 65ms·i); draggable via pointer events with soft spring settle; slight fan-out of neighbors on hover. Touch: drag works; no hover states.
- Props (exactly three, generated SVG, theme-aware): film canister, strip of negatives, tiny terminal window that types `jordan@roam:~$ ship` once (CSS steps animation, not JS typewriter).
- One print is face-down (easter egg §8).
- No-JS/reduced-motion: prints render in settled scatter positions, static.

### 6.2 Roam story — sticky-sentence scroll (pool.day pattern)
Left sticky column, one Fraunces sentence per beat; right panel swaps an SVG abstraction per beat via IntersectionObserver (crossfade only). Native scroll; no pinning libraries; mobile stacks vertically (sentence above visual).

| Beat | Sentence | Visual |
|---|---|---|
| 1 | "I joined Roam in 2025 as engineer #3 — full-stack product on the marketplace making assumable mortgages accessible." | Abstract listing card + rate badge |
| 2 | "I shipped the buyer funnel end to end: offer calculators, search, onboarding, the growth experiments." | Slider/calculator abstraction |
| 3 | "Then Roam built an AI realtor — Reed — and I became its lead engineer." | Chat bubbles + tool-call chips ("fetching comps…") |
| 4 | "Now I ship alongside a fleet of agents I built the harness for — with evals to keep it honest." | Metric chips: 419 PRs/yr · 3–4× merge velocity · 13× completion lift · 87%+ eval positivity |

### 6.3 Experience — typographic rows
Row = title + one-line outcome + mono date right-aligned (tabular nums), hairline between. Content:
- **Roam · 2025—** "Product engineer #3. The marketplace, then lead engineer on Reed, Roam's AI realtor."
- **Procore · 2021–2025** "Developer productivity for 300+ engineers — the internal deploy platform, CI/CD standards adopted org-wide."
- **Workday · 2018–2021** "DevOps & release engineering; cut release timelines in half."
- **Santa Clara University · 2014–2018** "B.S. Computer Science + Studio Art. (Fall 2016: University of Cape Town.)"

### 6.4 Projects — typographic rows + hover prints
Same row component; a small tilted photo-print thumbnail fades/rises in on hover (tap = flip on mobile). Roster (order): chicksofnyc · citibike-wrapped · Alive Still · wimdy · reservation-agent · roastmyfriend · poker-night. One-line outcome each + mono stack label (`Next.js · Airtable`, `SwiftUI · Twilio`, …). "More on GitHub →" caps the list.

### 6.5 Photos — contact sheet
One filmstrip-framed row of 6–8 images (sprocket-hole SVG edges), each opening the existing lightbox (keyboard nav preserved). "Full gallery →" links to blumblumblum-gallery.vercel.app.

## 7. Motion contract (site-wide)

- Bezier: `cubic-bezier(.34,1.3,.64,1)`; durations 200–400ms.
- Entrances: opacity + 4px blur clear, deterministic stagger (150ms + 65ms·i). **No random staggers.**
- Hover: "hover-cold" guard (no hover styles until pointer moves); scale caps at 1.04.
- Scroll: IntersectionObserver reveals + position:sticky only. **Banned: scroll-jacking, marquees, JS typewriters, rotating elements, gradient-shift keyframes, bounceIn.**
- `prefers-reduced-motion`: everything becomes ≤150ms opacity fades; drag disabled.

## 8. Easter eggs (exactly three)

1. Typing `grain` toggles darkroom mode: film-grain overlay + interactive states switch emerald→safelight red (`#C6402B`), 5-key keydown accumulator.
2. The face-down print on the light table flips on click to a bonus photo with a handwritten caption.
3. Emerald selection color + console message (kept from v3, restyled).

## 9. Architecture

- **Astro 5** static output; **Tailwind v4** (tokens as CSS vars in `@theme`); **Motion** (motion.dev) for springs/drag — only where CSS can't.
- Self-hosted fonts (woff2, preloaded, subset); metric-matched fallbacks.
- `astro:assets`/Sharp for responsive images of all photos.
- All copy/data in `src/data/site.ts` (experience, projects, story beats, photo manifest).
- Components: `Nav`, `LightTable`, `StickyStory`, `Row`, `ContactSheet`, `Lightbox`, `Footer`, `EasterEggs` (island).
- Minimal JS islands: LightTable drag, StickyStory observer, Lightbox, EasterEggs. Everything else zero-JS.
- Deploy: update `.github/workflows` to `pnpm install --frozen-lockfile && pnpm build`, sync `dist/` to S3, keep CloudFront invalidation. Package manager is pnpm throughout, with `minimumReleaseAge` quarantine per secure-deps practice.

## 10. Accessibility & performance budgets

- WCAG AA contrast on all derived token combos (verify ink@75% on paper).
- Full keyboard path: lightbox, nav, rows; focus-visible = accent ring.
- Alt text for every photo (reuse v3's good alt text).
- Budgets: LCP < 1.8s on Fast 3G-ish, CLS ≈ 0 (font fallback metrics), total JS < 60KB gz, hero images AVIF/WebP with width-capped srcset.

## 11. Verification

- Playwright pass: desktop + 390px mobile screenshots per section; reduced-motion run; no-JS run; keyboard-only lightbox run.
- Lighthouse ≥ 95 across categories on the built output.
- Cross-theme check (light/dark + darkroom egg).

## 12. Part 2 deliverable — LinkedIn Roam entry (approved draft)

> **Product Engineer · Roam** — May 2025–Present · New York
> Engineer #3 at the fintech making assumable mortgages accessible. I own product end-to-end — and since early 2026 I'm the lead engineer on **Reed** (withreed.com), Roam's AI realtor.
> - Built Reed's agentic core: streaming chat UI, buyer home-search orchestrator (polygon geo-search, in-chat listing carousel), VLM photo grading with a 5-model eval (13× cost reduction), Perplexity/Zestimate pricing tools.
> - Built the AI analytics pipeline (daily Claude routines → Slack): surfaced a 13× completion lift, same-day fixed a dead-end killing 73% of sessions, drove seller funnel conversion 25%→51%.
> - Pre-Reed: shipped the buyer funnel — offer calculator, search filters, onboarding rework, growth experiments — plus LaunchDarkly rollout and the Aurora Postgres migration (Elixir/Phoenix LiveView, PostgreSQL).
> - Built the team's agentic dev infrastructure: Agent Mission Control (dashboard for driving Claude Code/Codex fleets, with LLM-judge evals and a Linear-driven pipeline), Roam Shelf, and company agent automations. 419 PRs in 12 months; ~3–4× merge velocity after adopting agent workflows; #1 committer (2,189 commits).

Site copy derives from this (story beats §6.2); the full research corpus is captured in Jordan's Vault → Personal/Inbox.md (2026-07-14).

## 13. Out of scope

- Migrating the external photo gallery.
- A blog/case-study subpages (possible later; Astro makes it cheap).
- Rebuilding the resume PDF (handled by the tailor-resume skill separately).
- LinkedIn *profile automation* — copy is delivered as text; Jordan pastes it himself.
