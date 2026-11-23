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

## Portfolio footer verification

| Journey | Implementation | Visible success |
| --- | --- | --- |
| Work with me | `Footer.astro` → `studio.origin/#contact` | A readable action reaches the studio Contact form. |
| Chat with my assistant | `Footer.astro` → `scripts/chat.ts` | The chat panel opens; closing returns focus to its trigger. |
| Spray → return to footer | `SprayWall.astro` / `scripts/spray-wall.ts` | Footer actions return with their surfaces, keyboard access and destinations intact. |

Use `pnpm test:footer` for the affected layout, contrast, input and spray states. When chat behavior changes, also run the existing chat suite. Footer controls share the container's action rule so adding an anchor does not silently create an unstyled action.

Inspect the **resting footer over the actual mural**, hover/focus/press, and the return from spray mode on desktop and compact screens. A visible or clickable link is not proof of readable contrast or design consistency. `footer-actions.spec.ts` captures 1280/768/375px views and checks opaque surfaces, text contrast, target sizes, matching geometry, motion and no-JS navigation. Its destination fixture proves navigation only; check the live studio form without submitting an inquiry before claiming the cross-site journey works.

## Assistant chat

The chat widget (`src/components/ChatWidget.astro` + `src/scripts/chat.ts`), opened from the nav “Chat” button and the footer CTA, is a static-site island, mounted site-wide from `src/layouts/Base.astro`, that talks to a streaming AWS Lambda backend in `server/` — see [`server/README.md`](server/README.md) for the architecture, the `reveal_email` gate, transcript storage, and how to switch models. Without JavaScript, the nav email remains the fallback and the footer's Work action still reaches the studio's Contact email fallback.

The widget POSTs to a relative `/api/chat` by default, which only works in production because CloudFront proxies that path to the Lambda Function URL (AWS_IAM + OAC — not reachable directly). For local development against a real backend, set `PUBLIC_CHAT_ENDPOINT` to the deployed endpoint in a `.env` file (Astro loads `PUBLIC_*` env vars into the client bundle automatically):

```
PUBLIC_CHAT_ENDPOINT=https://jordanblum.com/api/chat
```

Provisioning and backend deploys run entirely through `.github/workflows/chat-backend.yml` and require two repo secrets beyond the existing AWS ones: `OPENROUTER_API_KEY` and `CONTACT_EMAIL`. Chat messages pass through OpenRouter to the configured model provider; the backend data path and cutover privacy gates are documented in [`server/README.md`](server/README.md#model-data-path).

## Shared app support and privacy

`https://buildwithblum.com/apps` is the shared app hub; existing personal-host app routes remain compatible. Stamp Shift has `/apps/stamp-shift`, `/support` and `/privacy` pages. The verified contact address lives in `src/data/studio.ts`. These reading pages use the existing typography/tokens through `AppDocs.astro` and intentionally load no client scripts, portfolio chat or transcript service.

The product catalogue in `src/data/ios-apps.ts` supplies descriptions, download/support/privacy links and the grouped archive summary; image imports stay in `src/data/ios-app-art.ts` so the text catalogue is also safe for the chat build. Both directories list the complete catalogue. Personal-host overviews and policy URLs remain unchanged; apps without personal-host documentation link to their established studio overview and original policies.

For new personal-host documentation, add its registry entry in `src/data/apps.ts` and its own overview/support/privacy pages under `src/pages/apps/{slug}/`. Write its privacy policy from its actual data handling; Stamp Shift's policy does not apply automatically. The existing S3 workflow publishes nested clean routes. `tests/e2e/app-docs.spec.ts` verifies desktop/mobile, no-JS navigation, contact links and restore help. `DESIGN.md` mirrors the existing brand contract without replacing the vault source.

## Blum Studios

`pnpm build:studio` builds the independent buildwithblum.com site without changing the personal homepage. `pnpm test:studio` verifies its browser journeys. See [the migration runbook](docs/blum-studios-migration.md) for prebuilt self-hosted publishing, domain/email gates and preserving current app/ad links.
