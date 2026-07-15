# jordanrblum.com

Jordan Blum's personal site, built with Astro 7, Tailwind 4, and Motion.

The current system is an editorial portfolio with one expressive workbench, a two-era Roam story, artifact-led side projects, and a small photo coda. Content lives in `src/data/site.ts`; the four photos used by the site are Jordan's confirmed gallery images.

The visual tokens in `src/styles/tokens.css` are generated from the canonical Obsidian brand book at `Design/brands/jordanrblum.md`. Older design specs under `docs/superpowers/` are implementation history, not the current source of truth.

## Commands

- `pnpm dev` — local development
- `pnpm build` / `pnpm preview` — static production build
- `pnpm test:unit` — content and utility invariants
- `pnpm test:e2e` — desktop, mobile, no-JS, reduced-motion, and interaction coverage

The site deploys to S3, with optional CloudFront invalidation, on pushes to `master`. Try typing `grain` on the finished site.
