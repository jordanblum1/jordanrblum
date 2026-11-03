# Blum Studios migration

## Scope and source of truth

Jordan requested Blum Studios (plural), a shared home for apps/design/art at buildwithblum.com and freelance inquiries. This is a public brand, not legal company formation or a change to Apple's seller identity. The studio design contract is [studio/DESIGN.md](../studio/DESIGN.md); shared identity/contact is [src/data/studio.ts](../src/data/studio.ts).

The default Astro build still serves the personal jordanblum.com site. App canonicals and the personal footer app-directory link now prefer buildwithblum.com; old app paths remain working compatibility pages for existing store/ad links. The independent `astro.studio.config.mjs` selects the studio source, origin and output. Shared public game/studio art is linked into studio/public/assets; it does not duplicate media or publish personal chat/transcript features. Alive Still and Birthday now have central overview pages under /apps/alive-still and /apps/birthday. Their existing domains keep the app services and original privacy policies; the new overviews link to verified App Store destinations, those sites and the common studio support alias. Stamp Shift's overview/support/privacy source is reused directly. No app binary changes.

## Local verification and deployment

1. `pnpm typecheck && pnpm test:unit`
2. `pnpm test:studio` builds and tests desktop/mobile, keyboard/no-JavaScript contact, support/privacy, Apple campaign tokens and 404 recovery. Existing `pnpm test:e2e` and `pnpm test:launch-qa` protect the personal/game journeys and isolated waitlist fixtures.
3. `pnpm build:studio && pnpm prepare:studio-deploy` prepares only generated static assets using Vercel's Build Output API. `vercel deploy --prebuilt --prod --yes --project blum-studios --scope jordanblum1s-projects` publishes reviewed prebuilt output without a hosted source build.

Hosting target is project blum-studios / prj_cr9QF1iCQSIbYjEIGtKdnEVuOo2x in the existing active Pro account jordanblum1s-projects (account email matches jordanblum19). No new hosting subscription. The project has no Git integration/automatic Vercel build. The existing GitHub workflow verifies both sites on the trusted self-hosted Mac; studio publishing is gated by BLUM_STUDIOS_PROJECT_ID and existing local Vercel CLI authentication. Fork code never runs on that Mac. The legacy S3 deployment remains separate.

[Official prebuilt specification](https://vercel.com/docs/build-output-api) and [routing configuration](https://vercel.com/docs/build-output-api/configuration) checked November 3, 2026. The installed Vercel CLI is 59.11.7. Vercel's [Hobby commercial-use restriction](https://vercel.com/docs/limits/fair-use-guidelines) is why the existing Pro account is used.

## Domain and email cutover

buildwithblum.com is verified in Jordan's Squarespace account using Google sign-in jordanblum16. The existing nameservers, Google verification CNAME, Domain Connect and registration protections are preserved. Apex A76.76.21.21 resolves and the real HTTPS site passes page/404 checks; Vercel accepts this address but lists newer optional IPs. www uses the provider-returned project CNAME7aef60af729729d6.vercel-dns-016.com and a native Vercel308 redirect to apex; record its actual final TLS/redirect checks in the operational receipt.

hello@buildwithblum.com handles inquiries and support@buildwithblum.com handles app feedback. Both free Squarespace forwarding rules point to the existing jordanblum16 Gmail. Separate messages sent from Jordan's other Gmail arrived at each alias in the destination account and passed SPF/DKIM/DMARC checks. Initial tests were classified as Spam; only those two known test messages were moved to Inbox. No global spam bypass/filter was added, so future inbox placement is not guaranteed. Public code now uses the tested aliases. [Included forwarding](https://support.squarespace.com/hc/en-us/articles/19000909092237-Email-forwarding-with-a-Squarespace-domain) is inbound only; replies still use the existing Gmail identity. No Workspace or other mailbox subscription was purchased.

Update public studio profile links and app marketing/support metadata where existing authentication allows. The shared website contacts are already on the tested aliases. Do not rename legal/billing entities. Do not inspect App Review status. Updating a native support email or URL is deferred to the next separately authorized binary; the app remains frozen.

## Compatibility and rollback

Keep jordanblum.com/apps/stamp-shift and its support/privacy paths working. Existing approved Meta ad destinations remain unchanged during the pilot; both ss_campaign allowlisted values still resolve to their exact genuine Apple pt/ct tokens on either host. Do not edit ads or add pixels as part of migration. Old canonicals now prefer the verified studio host, while compatibility routes stay200; any later redirect change must preserve query strings in any eventual redirect and rerun campaign-link checks. A DNS rollback restores only the changed website records; it does not erase mail or replace nameservers. Retain the existing S3 deployment while verifying the new site.

Operational receipt and current remaining gates: ~/.local/share/agent-workflows/blum-studios-migration/TASKS.md. Local tests prove page behavior, not domain ownership, email delivery or App Store/Meta approval.

Public app reference checks (November 3): [Alive Still](https://alivestill.app) supplied its store link and daily-check-in purpose; [Birthday](https://trybirthday.com) supplied its store/privacy/contact links, and its [App Store listing](https://apps.apple.com/us/app/id6809536251) confirms birthdays, wishes and gifts. The initial targeted landing query did not surface Alive Still’s policy; an independent review subsequently verified the official homepage’s /privacy link, its successful page response and Apple listing destination, so the overview links to https://alivestill.app/privacy.
