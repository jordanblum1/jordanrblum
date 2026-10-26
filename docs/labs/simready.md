# SimReady Website Integration Preview

Route: `/labs/simready`. The route is unlisted, `noindex, nofollow`, and absent from the production navigation. It adds no analytics, backend, chat widget, secrets, or API. The production homepage is unchanged.

## Purpose

This preview compares three realistic placements for one relevant SimReady object inside the existing jordanblum.com visual system. It is not a standalone 3D product or generic scene lab. The options reuse real site copy and assets—portrait, BLUM mark, field texture, collage, and brand tokens—so the trade-off is visible in context.

The [DESIGN.md](../../DESIGN.md) records the lab-only composition and reference principles. The [brand book](../brand.md), generated tokens, global styles, and production routes remain unchanged. Lab-only styles are isolated in `src/styles/simready.css`.

## Concepts

1. **Workbench — recommended.** Replaces the stacked intro/full-width field with a desktop hero: the real Jordan headline, support, and profile facts on the left; the textured BLUM workbench, can, and “See the work” link on the right. The can is server-rendered in this initial composition before the remote module or asset loads. The portrait remains in Hero Accent. At 390px, compact copy stacks above the workbench without removing any homepage text.
2. **Hero Accent.** Adds the can as a small foreground detail in the current split hero. Jordan’s portrait remains the primary image; the can is a smaller foreground accent.
3. **About Signature.** Adds the can to the existing personal collage beside the real About copy. This is the quietest, lowest-risk placement and connects directly to Jordan’s studio-art background.

All three show an original, inline SVG can with bold MTN + 94 lettering, a cream body, oxblood print, and ochre cap/band. This is **MTN-inspired concept styling**, without external brand artwork or affiliation. The illustration is the immediate default and stays visible until drawable geometry has the 3D paint treatment attached; textures may finish afterward. Failures and no JavaScript retain the illustration.

The live model uses `MeshStandardMaterial` paint on its existing meshes, with a shared 400×1120 sRGB `CanvasTexture`. Its cream body, oxblood MTN + 94 lettering, fine print and ochre cap/band use the fallback’s CSS colors and normalized artwork positions. The vertex shader projects the artwork using each mesh’s initial transform (including shear and instances), so lighting, depth and curvature come from the actual can surface. Moving the mesh carries the print with it. This is a frontal projection; hidden-side artwork is approximate.

`DecalGeometry` is unsuitable for reliable post-load projection with this viewer: `@huggingface/usd-web-viewer` 0.2.0 streams meshes before `load()` resolves and its `createGeometry()` upload callback releases CPU vertex arrays. The shader uses the GPU vertices and cached bounds instead. Replacing the surface material creates no competing geometry, so standard depth testing/writing avoids z-fighting without polygon offsets. Original materials are restored before viewer disposal; replacement materials and the shared texture are explicitly disposed on tab switch or failure. No extra geometry needs disposal, and streamed source textures cannot overwrite the independent paint materials.

A fixed frontal camera and constant 200:340 stage aspect ratio preserve the composition as the viewport changes; the complete object is gently tilted with CSS. Pointer/orbit/pan/zoom controls stay disabled and the canvas stays outside the tab order. The model is ambient, with no idle animation. There is no HTML/SVG label over the live canvas.

The underlying asset remains the same NVIDIA SimReady spray can in all three placements:

`paint_container_spraycan_a01/simready_usd/sm_paint_container_spraycan_a01_01.usd`

The Hugging Face URL is pinned to dataset revision `524747d9b5e1f21b5b18b56041788c01d745f1a1`.

## Behavior

Tabs use manual activation: ArrowLeft/ArrowRight/Home/End move focus; Enter/Space or click selects. Selection persists in `#workbench`, `#hero-accent`, or `#about-signature`; browser Back/Forward and direct links restore it.

Only the active concept initializes a viewer. Tab changes abort pending work and dispose the previous renderer and resources. The viewer uses preview textures up to 1024px, at most 1,000,000 triangles, at most 10,000 instances, four concurrent requests, 128MiB layers, 64MiB textures, 128 layers, and a 45-second timeout.

Loading progress and errors stay visually quiet beneath the composition. Network errors, rejected texture completion, empty geometry, timeouts, or graphics-context failures restore the authored spray-can illustration. Partial texture failures can retain a simplified live model with an explicit status. The page remains understandable without JavaScript. Reduced motion disables damping and decorative transitions; direct orbit remains disabled for all preferences.

The result is a visual preview, not a physics simulation. MDL materials and exact Omniverse rendering may be simplified. NVIDIA SimReady, Hugging Face, CC-BY-4.0, source asset, and modification attribution appear on the route.

## Verification — October 26, 2026 3D material correction

1. **RED:** the first focused run failed exactly two new assertions: no 3D treatment was attached and the DOM overlay still existed (13 existing assertions passed). After inspecting the viewer’s GPU-only geometry lifecycle, the attachment regression was refined to require a real `MeshStandardMaterial`/`CanvasTexture` on the scene mesh with released CPU positions. A separate RED run exposed an unhandled texture rejection when canvas artwork failed; the completion handler now consumes that rejection while retaining fallback status.
2. **GREEN:** focused SimReady unit tests passed **24/24**; the full unit suite passed **115/115** across seven files. Coverage includes fixed camera/accessibility, projected material/transform behavior, shared texture disposal, original material restoration, timeout/context/texture failures, artwork failure and unchanged active-only tabs/loading. `pnpm exec tsc --noEmit` passed.
3. **Build and review:** `pnpm build` passed for all **eight** routes; the existing lazy viewer chunk warning above 500kB remains. `git diff --check` passed. The final ponytail review traced the tab/load/dispose callers, projection/material ownership and error paths. The source composition audit found no added decorative copy, controls or generic design elements. Google-format `DESIGN.md` front matter and existing token references are preserved; the optional design.md CLI is not installed, so CLI lint was not run.
4. **Browser limitation:** `pnpm test:e2e tests/e2e/simready.spec.ts` was attempted but blocked before test execution: the sandbox denies the preview server’s socket bind (`listen EPERM ::1:4321`). A direct Chromium probe was also denied by macOS process permissions. The updated suite has six tests, adding a self-contained cylindrical USD fixture that checks loaded canvas print pixels, shader/page errors, active-only canvases and desktop/mobile placements without relying on the remote asset. These browser assertions and the live pinned asset’s visual handoff remain unverified in this session; the parent will visually verify the remote asset.

No dependency was added. No commit, push or deployment was performed.

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
