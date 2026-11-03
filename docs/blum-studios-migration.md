# Blum Studios migration

## Scope and source of truth

Jordan requested Blum Studios (plural), a shared home for apps/design/art at buildwithblum.com and freelance inquiries. This is a public brand, not legal company formation or a change to Apple's seller identity. The studio design contract is [studio/DESIGN.md](../studio/DESIGN.md); shared identity/contact is [src/data/studio.ts](../src/data/studio.ts).

The default Astro build still serves the personal jordanblum.com site. The independent `astro.studio.config.mjs` selects the studio source, origin and output. Shared public game/studio art is linked into studio/public/assets; it does not duplicate media or publish personal chat/transcript features. Existing Alive Still and Birthday domains keep their working service/support/privacy contracts; the directory links to them. Stamp Shift's overview/support/privacy source is reused directly. No app binary changes.

## Local verification and deployment

1. `pnpm typecheck && pnpm test:unit`
2. `pnpm test:studio` builds and tests desktop/mobile, keyboard/no-JavaScript contact, support/privacy, Apple campaign tokens and 404 recovery. Existing `pnpm test:e2e` and `pnpm test:launch-qa` protect the personal/game journeys and isolated waitlist fixtures.
3. `pnpm build:studio && pnpm prepare:studio-deploy` prepares only generated static assets using Vercel's Build Output API. `vercel deploy --prebuilt --prod --yes --project blum-studios --scope jordanblum1s-projects` publishes reviewed prebuilt output without a hosted source build.

Hosting target is project blum-studios / prj_cr9QF1iCQSIbYjEIGtKdnEVuOo2x in the existing active Pro account jordanblum1s-projects (account email matches jordanblum19). No new hosting subscription. The project has no Git integration/automatic Vercel build. The existing GitHub workflow verifies both sites on the trusted self-hosted Mac; studio publishing is gated by BLUM_STUDIOS_PROJECT_ID and existing local Vercel CLI authentication. Fork code never runs on that Mac. The legacy S3 deployment remains separate.

[Official prebuilt specification](https://vercel.com/docs/build-output-api) and [routing configuration](https://vercel.com/docs/build-output-api/configuration) checked November 3, 2026. The installed Vercel CLI is 59.11.7. Vercel's [Hobby commercial-use restriction](https://vercel.com/docs/limits/fair-use-guidelines) is why the existing Pro account is used.

## Domain and email cutover

buildwithblum.com currently has Google Domains nameservers and no published A/MX answer. Registrar ownership/login is not yet verified; the connected Squarespace login is pending. Preserve DNS nameservers and any existing mail/TXT records. Add only provider-returned website records after confirming this exact domain/account. Verify HTTPS, apex and www behavior, correct canonical tags and clean routes on the real domain before moving public profile links.

Use hello@buildwithblum.com for inquiries and support@buildwithblum.com for app feedback, forwarding to the current verified support inbox unless Jordan changes it. Do not publish these aliases or change Apple support contacts until a separate sender's test is received successfully at each. The code intentionally keeps the working existing Gmail address for now. If this is a Squarespace-managed domain, [included email forwarding](https://support.squarespace.com/hc/en-us/articles/19000909092237-Email-forwarding-with-a-Squarespace-domain) supports inbound aliases without a mailbox subscription. Forwarding does not provide outbound sending as the custom address; do not claim otherwise or buy Workspace. Use the existing provider instead if existing mail service is present.

After TLS/mail verification, update the shared contacts and public studio profile links, then update app marketing/support metadata where access allows. Do not rename legal/billing entities. Do not inspect App Review status. Updating a native support email or URL is deferred to the next separately authorized binary; the app remains frozen.

## Compatibility and rollback

Keep jordanblum.com/apps/stamp-shift and its support/privacy paths working. Existing approved Meta ad destinations remain unchanged during the pilot; both ss_campaign allowlisted values still resolve to their exact genuine Apple pt/ct tokens on either host. Do not edit ads or add pixels as part of migration. Only switch old canonical/redirect behavior after the new domain passes its real-host checks; preserve query strings in any eventual redirect and rerun campaign-link checks. A DNS rollback restores only the changed website records; it does not erase mail or replace nameservers. Retain the existing S3 deployment while verifying the new site.

Operational receipt and current remaining gates: ~/.local/share/agent-workflows/blum-studios-migration/TASKS.md. Local tests prove page behavior, not domain ownership, email delivery or App Store/Meta approval.
