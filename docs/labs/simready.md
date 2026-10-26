# SimReady Concept Lab

Route: `/labs/simready`. Unlisted, `noindex, nofollow`, and absent from production navigation and public content registries. No analytics, backend, chat widget, secrets, or API was added. No commit or push was made.

## Design contract

Surface: **Explore**. One stage, three authored object studies, quiet controls. The existing Google-format [DESIGN.md](../../DESIGN.md) remains byte-for-byte unchanged, as do [global tokens](../../src/styles/tokens.css), global styles, and existing production pages.

Reference strategy: existing Jordan editorial system. The `popular-web-designs` Notion reference informed only warm neutral space, thin dividers, and restrained hierarchy; no Notion colors, fonts, or proprietary layout were copied. The implementation uses existing `--paper` (#F7F3ED), `--ink` (#2B2521), `--accent` (#9C4037), Switzer, Chillax, and Geist Mono. Local styles are isolated under the lab page and its components. The composition audit found none of the ten `claude-design` template tells; redundant headings and a decorative subtitle were removed.

## Behavior and ownership

- **01 Dispatch:** conveyor asset, subtle rotation with pause, and A/B route orientation. The illustration supplies route notation while loading or after failure.
- **02 Working Set:** office chair, pull-apart slider, and input / attention / revision annotations. Mesh translation offsets preserve the USD loader's authored matrices, including shear; these offsets are editorial, not a mechanical teardown.
- **03 Counter Study:** coffee cup, morning / window / late light, orbit/pan/zoom, and reset. Its fallback supports pointer dragging and left/right arrow composition adjustments.

Tabs use manual activation: ArrowLeft/ArrowRight/Home/End move focus; Enter/Space or click select. Selection persists in `#dispatch`, `#working-set`, or `#counter-study`; browser Back/Forward and direct links restore it. Page hide releases the active scene; a restored browser-cache page remounts it. The viewer module is imported lazily, and only the active concept calls `viewer.load`. Every tab change aborts pending work and disposes its renderer, GPU resources, controls, observers, and event handlers. Late module resolutions cannot start an inactive scene.

Limits: preview textures ≤1024px, ≤1,000,000 triangles, ≤10,000 instances, four concurrent requests, 128MiB layers, 64MiB textures, 128 layers, and a 45-second timeout. The page displays progress, loader warnings, and explicit failure status. Empty geometry, unsupported format/network failures, timeouts, or lost graphics contexts return to the scene-specific SVG illustration. Invisible loading canvases are excluded from keyboard focus. Reduced motion disables automatic animation and orbit damping; Dispatch also pauses while the document is hidden.

NVIDIA SimReady assets are loaded from Hugging Face at revision `524747d9b5e1f21b5b18b56041788c01d745f1a1`. All three source URLs are linked in their panels, with NVIDIA/SimReady/Hugging Face and CC-BY-4.0 attribution and the visual-preview/not-physics disclosure. Viewer API and bundler behavior follow the [official documentation](https://huggingface.co/docs/huggingface.js/usd-web-viewer/README) and the cached 0.2.0 package types/source.

## Actual verification — October 26, 2026

1. **RED before implementation:** `pnpm test:unit tests/unit/simready.test.ts` exited 1, with one expected failure: `Expected /labs/simready to exist: expected false to be true`.
2. **GREEN:** the focused unit suite passed 14/14 tests. Tests cover the three concepts, pinned URLs, unlisted content, attribution, ARIA, keyboard/deep-link selection, stale loads, resource cleanup, limits, progress/warnings, loading failure, timeout, authored-matrix explosion, reduced motion, and context loss.
3. **Full unit/build:** a network-enabled `pnpm install --frozen-lockfile` succeeded. `pnpm test:unit` passed 105/105 tests, `pnpm build` produced all eight static routes including `/labs/simready`, and `git diff --check` passed. Vite reports one chunk above 500 kB because the USD viewer ships its WASM/runtime only for this lazy-loaded lab route.
4. **Automated browser QA:** `pnpm test:e2e tests/e2e/simready.spec.ts` passed all three Playwright tests after two accessible-name bugs were found and fixed. The suite verifies keyboard tabs and browser history, active-package-only requests, fallback controls, no page errors, the 390×844 layout, reduced-motion behavior, and no horizontal overflow.
5. **Real rendering QA:** a browser loaded all three pinned Hugging Face assets successfully: the conveyor, office chair, and coffee cup each reached `OpenUSD asset loaded. Preview ready.` with zero viewer warnings. The active tab retained exactly one canvas while prior scene resources were disposed. Desktop and 390×844 mobile layouts were visually inspected; the mobile document width matched the viewport and the captured error list was empty.

A Codex high-reasoning review was run against the uncommitted implementation before publishing. Remote deployment and browser verification are recorded separately when the preview URL exists.

## Exact changed files

Config:

- `astro.config.mjs`
- `package.json`
- `pnpm-lock.yaml`

Lab:

- `src/pages/labs/simready.astro`
- `src/data/simready.ts`
- `src/components/simready/Illustration.astro`
- `src/styles/simready.css`

Runtime:

- `src/scripts/simready.ts`
- `src/scripts/simready-stage.ts`

Tests and documentation:

- `tests/unit/simready.test.ts`
- `tests/unit/simready-tabs.test.ts`
- `tests/unit/simready-stage.test.ts`
- `tests/e2e/simready.spec.ts`
- `docs/labs/simready.md`

To finish acceptance in a network-enabled local terminal: run `pnpm install --frozen-lockfile`, then `pnpm test:unit`, `pnpm build`, and `pnpm test:e2e tests/e2e/simready.spec.ts`. Open `/labs/simready` in a local dev server to inspect the three remote assets at desktop and 390px widths.
