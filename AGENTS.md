# Website working instructions

For portfolio footer edits, use the [footer verification map](README.md#portfolio-footer-verification). The resting footer and the return from spray mode are distinct QA states.

## Stamp Shift website scope

For wholly Stamp Shift-scoped website pull requests, follow the canonical [review and merge contract](https://github.com/jordanblum1/stamp-shift/blob/main/docs/review-and-merge.md). The website is a shared repository: mixed or unrelated website changes require their own scope and permissions. The contract does not grant permission for spending, new terms or data practices, native release actions, or App Review submission.

## Blum Studios migration scope

Jordan authorized related Blum Studios brand/domain/app-site merges on November 3, 2026. After shared `auto-review` and required self-hosted checks pass for the exact base/head, continue those merges. When human review is the sole remaining branch-policy blocker, the authorized migration scope permits an admin merge; keep all other protections intact. This authority does not cover new spending, terms, credentials/access grants or native App Review submissions. Use [the migration runbook](docs/blum-studios-migration.md) for current domain/contact and legacy ad-link constraints.

## Build with Blum frontend ownership

The live `buildwithblum.com` frontend now belongs to the private [build-with-blum repository](https://github.com/jordanblum1/build-with-blum), checked out at `/Users/jordan/projects/build-with-blum`. Its README owns current build, browser QA, Vercel Analytics and self-hosted publishing instructions. Make new Studio frontend edits there. This repo’s `studio/` tree is a retained migration snapshot; its old Vercel deploy job is gated off by removing `BLUM_STUDIOS_PROJECT_ID` after verified cutover. Do not re-enable both publishers.

This repo still owns the personal S3 site, legacy Stamp Shift routes/campaign tokens, shared personal assets and the contact API at `https://jordanblum.com/api/studio/contact`. Preserve those services and both Studio CORS origins. Do not remove retained files merely because the Studio frontend has moved.
