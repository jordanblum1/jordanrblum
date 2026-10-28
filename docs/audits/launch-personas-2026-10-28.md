# Stamp Shift launch QA — October28,2026

Scope: the updated game landing, signup, directory, Support and Privacy, plus a separate native surface/source review. The website is a Decide/Learn surface with an Operate form. Preserve its existing sage/ivory/yellow, Baloo2, real gameplay and postal characters. Use the [existing design contract](../stamp-shift-landing-DESIGN.md); do not rebuild the layout to imitate a social post.

## Source and method

Read Ayush Soni's [original post](https://x.com/ayushsoni_io/status/2115322579187867898) in a real browser: decorative tags, italic words, Instrument Serif/negative kerning, excessive detail/dividers/shades, bordered containers, detailed diagrams, code breadcrumbs and section numbering are listed as design-slop indicators. The three visible replies repeat the list, mention microtrends and add overused monospace. The rest is hidden behind X login; no claim that the inaccessible replies were read. Firecrawl reported insufficient credits; browser retrieval succeeded for the accessible content. No research credits were purchased.

These are subjective warning signs, not universal usability rules. Keep game borders that identify selectable stamps/tools and numbers that identify real piles/routes; preserve legal/accessibility/teaching/error information. No arbitrary removal of meaningful state, focus indicators or controls.

Five independent agent personas used isolated real headless Chromium profiles, not personal browsing sessions. They are simulated reviewers, not human participants, and persona frequency is not a population estimate. Each starts from the landing page, follows real links/buttons and reaches the first web success (synthetic notification signup). Synthetic fixtures enforce the real app-specific request shape but do not prove production delivery/storage. Email is not actually sent. No live customer records, purchases, social posting or Apple status checks.

The 375px mobile run uses a fresh touch context and CDP slow3G:400kbps download/upload (50,000bytes/sec) and400ms latency. This is Chromium emulation, not physical Safari or a real keyboard/radio.

The native game cannot be installed from this prelaunch landing. Parent reviewed archived genuine QA captures of home, Drawer-ready, Flip-selected, settings, help, shop, restart and album, and current source for splash/tutorial/routes/board/help/shop/settings/rewards/completion. This is screenshot/source evidence, not five newly executed native journeys. Public landing→App Store installation→first delivery remains gated by an approved, released candidate. Native saves/simulators were not modified; no new native runtime behavior was warranted by this pass.

## Evidence locations

Local per-persona scripts, reports, raw logs and screenshots: `output/launch-qa-2026-10-28/{impatient,skeptic,mobile,literal,breaker}/` in this website worktree (ignored). Before/after runs must be preserved separately. Parent native review montage and exact archived sources: `/Users/jordan/projects/stamp-shift/build/evidence/launch-qa-2026-10-28/{native-review-sheet.png,native-review-sources.json}`. These are local evidence, not publicly hosted assets.

## Design decisions

No repeated badges, eyebrow labels, code breadcrumbs, gratuitous numbered marketing sections, decorative diagrams, generic indigo/serif/monospace restyling or feature-card grid were introduced. The short Stash/Flip/Send strip teaches actual actions. The bordered notification group is the one action boundary; game controls retain tactile outlines. Native tutorial/route numbering conveys progression. Existing legal text stays in Support/Privacy rather than added to the hero. Findings below focus on concrete failures and uncertainty, not deleting every visual treatment named in a tweet.

## Combined findings, ranked by observed persona frequency

| Rank | Finding | Personas observing it | Severity | One-pass repair / evidence |
| --- | --- | --- | --- | --- |
| 1 | Public purchase FAQ omitted Evening Post/Priority Post and overlap/no-credit terms present in native Help. | Skeptic:1/5 | Medium | Mirror native route ranges, permanence, inclusion and no-credit facts; retain localized price in app. [Before](../evidence/launch-qa/support-before.png), [after](../evidence/launch-qa/support-after.png). |
| 2 | Support hardcoded analytics disabled even though native Help uses build-specific status. | Skeptic:1/5 | Low | Direct visitors to the actual build's Help & privacy status and conditional policy. Same support evidence. |
| 3 | Hero Notify me scrolled to the form but left BODY focused. | Literal reader:1/5 | Low | After native anchor navigation, focus the email with preventScroll. [Before](../evidence/launch-qa/focus-before.png), [after](../evidence/launch-qa/focus-after.png). Browser DOM assertion verifies the focus change. |

All three tie on frequency; severity breaks the tie. The other roles did not independently report these issues; do not relabel1/5 as5/5 just because the fix is shared. All five reached web signup on both passes. No first-pass functional blocker, layout overflow or uncaught script failure was found in these assigned journeys.

## Fixed-build rerun

| Persona | Actual rerun | Result / limit |
| --- | --- | --- |
| Impatient | Fresh isolated browser; first meaningful CTA→focused email→synthetic Saved. | Pass;0console/page/request failures. Existing synthetic email also verifies duplicate safety. |
| Skeptic | Landing→Support FAQs→Privacy→directory→landing→Saved. | Pass; both original copy findings visibly resolved;0console/page/request failures. |
| Mobile | Cold375x812 touch browser,400kbps each direction/400ms latency; CTA→focus→Saved. | Pass;4701.60ms script journey,531ms DOMContentLoaded; email/button visible,375px document width. Physical keyboard/Safari not established. |
| Literal reader | Follow labels; assert #launch and INPUT#waitlist-email active, then Saved. | Pass; original focus finding resolved,0console/page errors. |
| Breaker | Invalid input corpus, double submit, Back mid-flow,503 retry and10s timeout retry. | Pass; invalid values sent0POSTs, double click sent1POST, fresh503→200 and timeout→200 retries passed. Only expected local503/abort noise;0page errors. |

These reruns demonstrate the scoped website fixes. They do not prove arbitrary user behavior, production email/storage, paid conversion, physical-device purchases or a fresh native full-app journey. Expected fixture503/timeout noise is distinct from uncaught page errors. Sparse or absent findings do not prove the entire product is defect-free.

## Native audit outcome

No new native runtime change is justified from this screenshot/source pass. Current Help/Shop already disclose the mini/full overlap and conditional analytics; the website was the stale side. The eight-view montage shows a consistent sage canvas, stamp/postal art, tactile targets and concise labels. Tutorial hints, restart loss warning, ownership/Restore and legal disclosures support real actions and are retained. Archived help/album/shop captures predate build13's celebration-only polish; they are not evidence of a new live run. Core board/save/purchase contracts and existing native release evidence remain unchanged.

## Review and publication

Correctness review traces the shared form setup, unchanged native-anchor fallback and focused desktop/mobile assertions. Security review separately confirms no backend/DB/key/permission/price change, no increased data scope, and synthetic-only audit writes. Local100unit cases, TypeScript,78normal browser journeys and3synthetic signup journeys pass. The signup suite asserts automatic focus at1280/390px; a support journey asserts current pack/analytics copy. Final diff Ponytail review found no remaining concrete correctness or security issue. CI status is recorded in the website PR. This batch adds no dependencies, animation spend, ads, tracking SDK or public availability claim. The unmerged website PR retains its required review gate; no approval bypass is inferred from this QA request.
