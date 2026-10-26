# SimReady Website Integration Preview

Route: `/labs/simready`. The route is unlisted, `noindex, nofollow`, and absent from the production navigation. It adds no analytics, backend, chat widget, secrets, or API. The production homepage is unchanged.

## Purpose

This preview compares three realistic placements for one relevant SimReady object inside the existing jordanblum.com visual system. It is not a standalone 3D product or generic scene lab. The options reuse real site copy and assets—portrait, BLUM mark, field texture, collage, and brand tokens—so the trade-off is visible in context.

The [DESIGN.md](../../DESIGN.md) records the lab-only composition and reference principles. The [brand book](../brand.md), generated tokens, global styles, and production routes remain unchanged. Lab-only styles are isolated in `src/styles/simready.css`.

## Concepts

1. **Workbench — recommended.** Replaces the stacked intro/full-width field with a desktop hero: the real Jordan headline, support, and profile facts on the left; the textured BLUM workbench, can, and “See the work” link on the right. The can is server-rendered in this initial composition before the remote module or asset loads. The portrait remains in Hero Accent. At 390px, compact copy stacks above the workbench without removing any homepage text.
2. **Hero Accent.** Adds the can as a small foreground detail in the current split hero. Jordan’s portrait remains the primary image; the can is a smaller foreground accent.
3. **About Signature.** Adds the can to the existing personal collage beside the real About copy. This is the quietest, lowest-risk placement and connects directly to Jordan’s studio-art background.

All three show an original, inline SVG can with bold MTN + 94 lettering, a cream body, oxblood print, and ochre cap/band. This is **MTN-inspired concept styling**, without external brand artwork or affiliation. The illustration is the immediate default and stays visible until drawable geometry is ready; textures may finish afterward. Failures and no JavaScript retain the illustration.

The live model gets an inline SVG decal projected onto its frontal body bounds. A fixed frontal camera and constant 200:340 stage aspect ratio keep the label aligned as the viewport changes; the complete object is gently tilted with CSS. Pointer/orbit/pan/zoom controls are disabled, the canvas is removed from the tab order, and “Drag to orbit” instructions are removed. The model is ambient, with no idle animation. The decal is shown only with loaded geometry and hidden again on fallback/disposal.

The underlying asset remains the same NVIDIA SimReady spray can in all three placements:

`paint_container_spraycan_a01/simready_usd/sm_paint_container_spraycan_a01_01.usd`

The Hugging Face URL is pinned to dataset revision `524747d9b5e1f21b5b18b56041788c01d745f1a1`.

## Behavior

Tabs use manual activation: ArrowLeft/ArrowRight/Home/End move focus; Enter/Space or click selects. Selection persists in `#workbench`, `#hero-accent`, or `#about-signature`; browser Back/Forward and direct links restore it.

Only the active concept initializes a viewer. Tab changes abort pending work and dispose the previous renderer and resources. The viewer uses preview textures up to 1024px, at most 1,000,000 triangles, at most 10,000 instances, four concurrent requests, 128MiB layers, 64MiB textures, 128 layers, and a 45-second timeout.

Loading progress and errors stay visually quiet beneath the composition. Network errors, rejected texture completion, empty geometry, timeouts, or graphics-context failures restore the authored spray-can illustration. Partial texture failures can retain a simplified live model with an explicit status. The page remains understandable without JavaScript. Reduced motion disables damping and decorative transitions; direct orbit remains disabled for all preferences.

The result is a visual preview, not a physics simulation. MDL materials and exact Omniverse rendering may be simplified. NVIDIA SimReady, Hugging Face, CC-BY-4.0, source asset, and modification attribution appear on the route.

## Verification — October 26, 2026 correction

1. **RED:** updated focused tests failed before implementation for the missing MTN/94 treatment, still-enabled controls, full-width second-row Workbench field, and missing frontal decal framing. The original 14 applicable checks passed while the first three new expectations failed; subsequent targeted runs separately confirmed layout/framing failures.
2. **GREEN:** `pnpm test:unit tests/unit/simready.test.ts tests/unit/simready-stage.test.ts tests/unit/simready-tabs.test.ts` passed **19/19** across three files. `pnpm test:unit` passed **110/110** across seven files. `pnpm exec tsc --noEmit` exited **0**.
3. **Build:** `pnpm build` exited **0**, producing all **eight** static routes including `/labs/simready`. `git diff --check` exited **0**. The existing Vite warning for a chunk above 500kB remains; the USD viewer runtime is still lazy-loaded only by this unlisted route.
4. **Browser:** `pnpm test:e2e tests/e2e/simready.spec.ts` passed **5/5**. Coverage includes keyboard/hash/history behavior, active-only loading and failure fallback, 390px/reduced-motion behavior, no-JavaScript support, and an intercepted-remote-request check proving the MTN illustration and real headline are visible before the asset arrives. A real browser then loaded the pinned model successfully: the MTN decal remained aligned at desktop, 768px tablet, and 390px mobile widths; the tablet can stayed fully contained in its workbench; exactly one canvas remained active; the status reached `Spray can ready.`; and mobile had no horizontal overflow.
5. **Review:** final `ponytail-review` traced the unchanged tab/load/dispose callers and checked the changed can, layout, and tests. Reused the geometry bounds instead of calculating them twice, then reran focused tests. The `claude-design` composition audit scored **0/10** for the listed generic-design tells in source; no decorative copy or extra controls were added. `DESIGN.md` preserves its existing Google-format front matter and token references, with a lab-only contract appended; the optional design.md CLI is not installed, so CLI lint was not run.

No dependency was added. The production homepage remains unchanged.

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
