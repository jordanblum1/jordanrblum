# jordanrblum.com

Personal site — Astro 5 + Tailwind 4 + Motion. Design spec: `docs/superpowers/specs/2026-07-14-jordanrblum-redesign-design.md`.

- `pnpm dev` — local dev
- `pnpm build` / `pnpm preview` — static build to `dist/`
- `pnpm test:unit` / `pnpm test:e2e` — Vitest + Playwright
- Deploys to S3 (+ optional CloudFront invalidation) on push to `master` via GitHub Actions.
- Try typing `grain` on the site.
