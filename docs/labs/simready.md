# SimReady Website Integration Preview

Route: `/labs/simready`. The route is unlisted, `noindex, nofollow`, and absent from the production navigation. It adds no analytics, backend, chat widget, secrets, or API. The production homepage is unchanged.

## Purpose

This preview compares three realistic placements for one relevant SimReady object inside the existing jordanblum.com visual system. It is not a standalone 3D product or generic scene lab. Each option uses the real homepage copy, portrait, BLUM mark, field texture, collage, and brand tokens so the trade-off is visible in context.

The existing [DESIGN.md](../../DESIGN.md), [brand book](../brand.md), generated tokens, global styles, and production routes remain unchanged. Lab-only styles are isolated in `src/styles/simready.css`.

## Concepts

1. **Workbench — recommended.** Adds the spray can to the current full-width BLUM workbench. The object reads as the physical tool behind the mark while the current headline, portrait, and “See the work” path remain intact.
2. **Hero Accent.** Adds the can as a small foreground detail in the current split hero. Jordan’s portrait remains the primary image, making this the most visible but also the most competitive placement.
3. **About Signature.** Adds the can to the existing personal collage beside the real About copy. This is the quietest, lowest-risk placement and connects directly to Jordan’s studio-art background.

All three use the same NVIDIA SimReady spray can rather than unrelated industrial assets:

`paint_container_spraycan_a01/simready_usd/sm_paint_container_spraycan_a01_01.usd`

The Hugging Face URL is pinned to dataset revision `524747d9b5e1f21b5b18b56041788c01d745f1a1`.

## Behavior

Tabs use manual activation: ArrowLeft/ArrowRight/Home/End move focus; Enter/Space or click selects. Selection persists in `#workbench`, `#hero-accent`, or `#about-signature`; browser Back/Forward and direct links restore it.

Only the active concept initializes a viewer. Tab changes abort pending work and dispose the previous renderer and resources. The viewer uses preview textures up to 1024px, at most 1,000,000 triangles, at most 10,000 instances, four concurrent requests, 128MiB layers, 64MiB textures, 128 layers, and a 45-second timeout.

Loading progress and errors stay visually quiet beneath the composition. Network, texture, empty-geometry, timeout, or graphics-context failures preserve an authored spray-can illustration. The page remains understandable without JavaScript. Reduced motion disables orbit damping and decorative transitions.

The result is a visual preview, not a physics simulation. MDL materials and exact Omniverse rendering may be simplified. NVIDIA SimReady, Hugging Face, CC-BY-4.0, source asset, and modification attribution appear on the route.

## Verification — October 26, 2026

- A focused TDD check for concept-specific placement explanations failed first with three missing descriptions, then passed after the descriptions were added.
- Focused SimReady unit tests passed 15/15.
- Full unit tests passed 106/106.
- `pnpm build` produced all eight static routes, including `/labs/simready`.
- The SimReady Playwright suite passed 4/4 tests. It covers keyboard tabs, hashes/history, active-only loading, disposal/fallback, real homepage content, 390px layout, reduced motion, no-JavaScript fallback, and absence of analytics/chat requests.
- A real browser loaded the pinned spray can successfully in all three placements with exactly one canvas. Desktop Workbench, Hero Accent, and About Signature were visually inspected. A 390px mobile check retained the live model with `scrollWidth === innerWidth`.
- `git diff --check` passed.

Vite reports one chunk above 500kB because the USD viewer’s WASM/runtime is lazy-loaded only by this unlisted route.

## Files

- `src/pages/labs/simready.astro`
- `src/data/simready.ts`
- `src/components/simready/HomepagePreview.astro`
- `src/components/simready/SprayCan.astro`
- `src/styles/simready.css`
- `src/scripts/simready.ts`
- `src/scripts/simready-stage.ts`
- `tests/unit/simready.test.ts`
- `tests/unit/simready-tabs.test.ts`
- `tests/unit/simready-stage.test.ts`
- `tests/e2e/simready.spec.ts`
