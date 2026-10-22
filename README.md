# jordanblum.com

Jordan Blum's personal site, built with Astro 7, Tailwind 4, and Motion.

The current system is an editorial portfolio with one expressive workbench, a two-era Roam story, artifact-led side projects, and a small photo coda. Content lives in `src/data/site.ts`; the four photos used by the site are Jordan's confirmed gallery images.

The visual tokens in `src/styles/tokens.css` are generated from the canonical Obsidian brand book at `Design/brands/jordanrblum.md`. A readable repo mirror lives at [`docs/brand.md`](docs/brand.md). Older design specs under `docs/superpowers/` are implementation history, not the current source of truth.

## Design contract

- The color system is intentionally light-only. Do not add dark token branches, persisted `data-theme` overrides, or `prefers-color-scheme: dark` styling.
- Major visual and interactive surfaces use `--radius-xl`: a restrained 32px Apple-like corner that stays proportional at mobile breakpoints.
- Nested cards use `--radius-lg` (24px); compact controls and device chrome use tighter radii. Reserve `--radius-pill` for UI that is actually pill-shaped, and keep true circles fully round.

## Commands

- `pnpm dev` — local development
- `pnpm build` / `pnpm preview` — static production build
- `pnpm test:unit` — content and utility invariants
- `pnpm test:e2e` — desktop, mobile, no-JS, reduced-motion, and interaction coverage

The site deploys to S3, with optional CloudFront invalidation, on pushes to `master`, gated by a CI job that runs the unit, e2e, and `server/` test suites. Try typing `grain` or `develop` on the finished site.

`develop` hangs a darkroom print of the page's own words. In Chrome with HTML-in-Canvas, the real DOM develops through a WebGL shader and stays selectable; other browsers get the same print with a CSS develop. To turn the API on for visitors, register for the [HTML-in-Canvas origin trial](https://developer.chrome.com/origintrials/#/view_trial/3478467762190286849) and set `PUBLIC_HTML_IN_CANVAS_OT_TOKEN` at build time; `Base.astro` adds the `origin-trial` meta tag only when it's set.

## Assistant chat

The chat widget (`src/components/ChatWidget.astro` + `src/scripts/chat.ts`), opened from the nav “Chat” button and the footer CTA, is a static-site island, mounted site-wide from `src/layouts/Base.astro`, that talks to a streaming AWS Lambda backend in `server/` — see [`server/README.md`](server/README.md) for the architecture, the `reveal_email` gate, transcript storage, and how to switch models. The `mailto:` link stays as a visible fallback everywhere it already appeared (footer, nav).

The widget POSTs to a relative `/api/chat` by default, which only works in production because CloudFront proxies that path to the Lambda Function URL (AWS_IAM + OAC — not reachable directly). For local development against a real backend, set `PUBLIC_CHAT_ENDPOINT` to the deployed endpoint in a `.env` file (Astro loads `PUBLIC_*` env vars into the client bundle automatically):

```
PUBLIC_CHAT_ENDPOINT=https://jordanblum.com/api/chat
```

Provisioning and backend deploys run entirely through `.github/workflows/chat-backend.yml` and require two repo secrets beyond the existing AWS ones: `ANTHROPIC_API_KEY` and `CONTACT_EMAIL`.

## Shared app support and privacy

`/apps` is the shared documentation hub for Jordan's apps. Stamp Shift has `/apps/stamp-shift`, `/support` and `/privacy` pages. The contact address derives from the existing public Email entry in `src/data/site.ts`. These reading pages use the existing typography/tokens through `AppDocs.astro` and intentionally load no client scripts, portfolio chat or transcript service.

For another app, add its registry entry in `src/data/apps.ts` and its own overview/support/privacy pages under `src/pages/apps/{slug}/`. Write its privacy policy from its actual data handling; Stamp Shift's local-only policy does not apply automatically. The existing S3 workflow publishes nested clean routes. `tests/e2e/app-docs.spec.ts` verifies desktop/mobile, no-JS navigation, contact links and restore help. `DESIGN.md` mirrors the existing brand contract without replacing the vault source.
