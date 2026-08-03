# Rendition lab — comparing three.js scene variants

How to run a "which looks better?" round for the site's three.js scenes. The
generic workflow lives in the `rendition-lab` vault skill (`/rendition-lab`);
this doc is the project-specific half.

## The scenes and their variant params

| Scene | File | Query param | Variants (first = default) |
| --- | --- | --- | --- |
| Hero blum mark | `src/scripts/three/blum-mark-scene.ts` | `?mark=` | `clay`, `paper`, `sketch` |
| Hero portrait | `src/scripts/three/portrait-squish-scene.ts` | `?squish=` | `cloth`, `jelly`, `bulge` |
| 404 toy | `src/scripts/three/notfound-scene.ts` | — | single rendition |

`variantFrom(param, options)` in `src/scripts/three/support.ts` reads the
param; the first option is the default. The portrait shader branches through
the fixed `SHADER_VARIANT` map — when reordering defaults, never switch that
to array indexing.

## Spin up

1. Add the new variant to the scene's `VARIANTS` tuple and material/shader
   switch (see `buildMaterials` in the mark scene for the pattern).
2. Copy the lab page template from the vault skill
   (`Skills/rendition-lab/references/lab-page-template.astro`) to
   `src/pages/lab.astro`, fill the `tabs` array (`scroll: 'field' | 'portrait'`
   works out of the box), and add `Disallow: /lab` to `public/robots.txt`.
3. `pnpm dev` and compare at `http://localhost:4321/lab` (Astro's dev server
   daemonizes; stop it with `astro dev stop`).
4. Keep `lab.astro` and the robots line **uncommitted** — they never ship.

## Spin down

Delete `src/pages/lab.astro`, restore `robots.txt`, commit only the real
scene changes.

## House rules for any new rendition

- Colors come from the brand tokens at runtime (`tokenColor('--accent')` etc.
  in `support.ts`) — never hard-coded hex. See `docs/brand.md`.
- No decorative idle loops (`docs/brand.md`): entrance plays once, motion only
  while the cursor drives it, render loops sleep at rest, canvases repaint on
  resize because of that sleep.
- Scenes boot only after first user input (`whenNearViewportIdle`) — that is
  what keeps the three.js chunk out of the Lighthouse CI budget
  (`.lighthouserc.json`). Before pushing scene changes, run
  `pnpm dlx @lhci/cli@0.15.x autorun` plus build and both test suites.
- Every scene keeps its flat fallback (reduced motion / no WebGL / context
  loss) — check the `is-3d` / `is-squish` class flips still work.
