# SimReady Website Integration Preview

Route: `/labs/simready`. The route is unlisted, `noindex, nofollow`, and absent from the production navigation. It adds no analytics, backend, chat widget, secrets, or API. The production homepage is unchanged.

## Purpose

This preview compares three realistic placements for one relevant SimReady object inside the existing jordanblum.com visual system. It is not a standalone 3D product or generic scene lab. The options reuse real site copy and assets—portrait, BLUM mark, field texture, collage, and brand tokens—so the trade-off is visible in context.

The [DESIGN.md](../../DESIGN.md) records the lab-only composition and reference principles. The [brand book](../brand.md), generated tokens, global styles, and production routes remain unchanged. Lab-only styles are isolated in `src/styles/simready.css`.

## Concepts

1. **Workbench — recommended.** Replaces the stacked intro/full-width field with a desktop hero: the real Jordan headline, support, and profile facts on the left; the textured BLUM workbench, can, and “See the work” link on the right. The can is server-rendered in this initial composition before the remote module or asset loads. The portrait remains in Hero Accent. At 390px, compact copy stacks above the workbench without removing any homepage text.
2. **Hero Accent.** Adds the can as a small foreground detail in the current split hero. Jordan’s portrait remains the primary image; the can is a smaller foreground accent.
3. **About Signature.** Adds the can to the existing personal collage beside the real About copy. This is the quietest, lowest-risk placement and connects directly to Jordan’s studio-art background.

All three show an original inline BLUM studio can: matte charcoal body/cap, the exact four BLUM logo paths in site oxblood, oversized vertical cream STUDIO lettering, compact cream utility details, and small red rings. Both renderers import `src/assets/identity/blum-mark.svg?raw`; neither typesets an imitation logo. Colors are exclusively `--can-black` (#151515), `--accent` (#9C4037), and `--paper-raised` (#FCFAF6). No orange/ochre, Montana logos or official artwork appears on the can. The visual grammar comes from user-supplied research on the official Montana BLACK 400ml page; this is an original concept with no affiliation or borrowed product claims.

The illustration stays visible until drawable geometry has the 3D treatment attached; source textures may finish afterward. Failures and no JavaScript retain the illustration. The live model uses matte `MeshStandardMaterial` paint on existing meshes with one shared 1200×1120 sRGB `CanvasTexture`. Its front identity and utility details match the fallback; side/rear panels carry additional cream utility type. No DOM decal overlays the live model.

The vertex shader transforms each GPU vertex into the can's initial normalized frame (including shear and instances). The fragment shader uses cylindrical angular/height coordinates to wrap the artwork around the surface, avoiding interpolation across the rear seam. Moving a mesh carries its print with it, and orbiting the camera reveals attached side/rear print. Caps remain charcoal; their radial projection is approximate rather than separately authored cap UV artwork.

`DecalGeometry` is unsuitable for reliable post-load projection with this viewer: `@huggingface/usd-web-viewer` 0.2.0 streams meshes before `load()` resolves and its `createGeometry()` upload callback releases CPU vertex arrays. The shader uses the GPU vertices and cached bounds instead. Replacing the surface material creates no competing geometry, so standard depth testing/writing avoids z-fighting without polygon offsets. Original materials are restored before viewer disposal; replacement materials and the shared texture are explicitly disposed on tab switch or failure. No extra geometry needs disposal, and streamed source textures cannot overwrite the independent paint materials.

An authored frontal camera and constant 200:340 stage aspect ratio preserve the initial composition; CSS gently tilts the complete object. After geometry/treatment handoff, the canvas becomes focusable and pointer-enabled: drag/one-finger orbit, wheel/two-finger pinch zoom, Arrow keys rotate, +/− zoom, and Home/double-click resets the authored pose. Panning is disabled and orbit zoom is bounded to 0.65–2× the initial camera distance. Custom keyboard zoom uses the same distance bounds. Visible status guidance explains drag, zoom and reset; the canvas accessible name also explains keyboard controls. No idle/automatic rotation occurs. Before load and after failure, only the noninteractive illustration remains.

The underlying asset remains the same NVIDIA SimReady spray can in all three placements:

`paint_container_spraycan_a01/simready_usd/sm_paint_container_spraycan_a01_01.usd`

The Hugging Face URL is pinned to dataset revision `524747d9b5e1f21b5b18b56041788c01d745f1a1`.

## Behavior

Tabs use manual activation: ArrowLeft/ArrowRight/Home/End move focus; Enter/Space or click selects. Selection persists in `#workbench`, `#hero-accent`, or `#about-signature`; browser Back/Forward and direct links restore it.

Only the active concept initializes a viewer. Tab changes abort pending work and dispose the previous renderer and resources. The viewer uses preview textures up to 1024px, at most 1,000,000 triangles, at most 10,000 instances, four concurrent requests, 128MiB layers, 64MiB textures, 128 layers, and a 45-second timeout.

Loading progress and errors stay visually quiet beneath the composition. Network errors, rejected texture completion, empty geometry, timeouts, or graphics-context failures restore the authored spray-can illustration. Partial texture failures can retain a simplified live model with an explicit status. The page remains understandable without JavaScript. Reduced motion disables damping and decorative transitions; direct pointer/touch/keyboard interaction remains available. Reset clears residual damping before restoring the saved pose. The viewer owns its pointer/touch/zoom listeners; lab keyboard/reset listeners use the stage lifetime AbortSignal. Disposal disables controls and removes the canvas.

The result is a visual preview, not a physics simulation. MDL materials and exact Omniverse rendering may be simplified. NVIDIA SimReady, Hugging Face, CC-BY-4.0, source asset, and modification attribution appear on the route.

## Verification — October 26, 2026 interaction and BLUM artwork

1. **TDD RED:** before implementation, focused stage/route tests failed **6/21**, with **15 passing**. Failures covered disabled interaction, missing exact logo paths/black palette, missing cylindrical projection, old fallback identity and old concept copy. A second RED run caught reset listeners remaining active on detached canvases in **3/15** stage tests (context, texture and timeout fallback); listener abort is now shared by fallback and disposal. The delegated coding sandbox could not launch Playwright, so browser verification was repeated from the unrestricted parent environment.
2. **GREEN:** `pnpm test:unit tests/unit/simready-stage.test.ts tests/unit/simready.test.ts tests/unit/simready-tabs.test.ts` passed **25/25**. `pnpm test:unit` passed **116/116** across seven files. `pnpm exec tsc --noEmit` passed. Coverage retains active-only loading, transport budgets, timeout/context/texture/artwork failures, late-load disposal, material restoration and texture disposal, and adds load-gated accessible input/reset, exact four-path Canvas drawing, black/red/cream palette and cylindrical shader projection.
3. **Build/review:** `pnpm build` passed all **eight** routes; the existing lazy viewer chunk warning above 500kB remains. `git diff --check` passed. Final ponytail review traced tab/load/dispose callers, controls/listener ownership and shader/material lifecycle. Source composition audit: **0/10** slop tells; no extra UI beyond required guidance. The authored fallback was rasterized from the built route and visually inspected (`test-results/simready-fallback-art.png`, ignored QA output). Google-format tokens map to the actual lab CSS; the optional design.md CLI is not installed, so CLI lint was not run.
4. **Browser verification:** `pnpm test:e2e tests/e2e/simready.spec.ts` passed **6/6** in the unrestricted local environment. The suite uses a local cylindrical USD response fixture, verifies loaded black/red/cream pixels, exact fallback paths, keyboard/drag/wheel/touch/pinch/reset behavior with reduced motion, one active canvas across all three placements, and desktop/tablet/mobile containment. The exact source-color unit test proves orange/ochre is absent; browser pixels are not classified for ochre because lighting and antialiasing shift edge colors. The pinned real USD model was separately inspected after loading on desktop and 390px mobile with no overflow, one canvas, no DOM decal, focusable controls, and the wrapped BLUM treatment visible.

Committed and pushed as `2deaaf2e0ccfa597b1024740ba5b61bb9ddac810`; deployed at `https://jordanrblum-simready-lab.vercel.app/labs/simready`. The production homepage remains unchanged. See [DESIGN.md](../../DESIGN.md) for the rendering and interaction contract.

## Files

- `src/pages/labs/simready.astro`
- `src/data/simready.ts`
- `src/components/simready/HomepagePreview.astro`
- `src/components/simready/SprayCan.astro`
- `src/styles/simready.css`
- `src/scripts/simready.ts`
- `src/scripts/simready-stage.ts`
- `src/scripts/simready-can.ts`
- `tests/unit/simready.test.ts`
- `tests/unit/simready-tabs.test.ts`
- `tests/unit/simready-stage.test.ts`
- `tests/e2e/simready.spec.ts`
