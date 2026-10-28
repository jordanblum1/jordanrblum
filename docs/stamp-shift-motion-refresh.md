# Stamp Shift web motion refresh — October28,2026

Status: implemented and locally verified; publication requires the website PR gate. The public App Store state and Instagram appeal were not checked.

Surface: Decide/Learn. Preserve the established sage, ivory, yellow and locally bundled Baloo2 family. Existing-product reference strategy uses the original Two Dots/Figma principles documented in [the scoped DESIGN contract](stamp-shift-landing-DESIGN.md): quiet chrome, genuine gameplay, consistent characters and one primary action. Anti-slop review:0/10; no new feature cards, eyebrows, decorative headings, claims or dependencies. The three existing mechanics remain concise action illustrations.

## Changes

The real native tutorial excerpt now shows the stamp flight and delivered celebration from postal-motion verification. It is a development simulator capture, not a phone/TestFlight or approved-public-build recording. The original39.0–46.4-second segment plays at1x with0.6seconds held ending. Fit the entire750x1334 source uniformly at532px wide atx26/y90 in584x1200, below the sourced phone island; preserve original UI and sage padding. The licensed Webmobilefirst PNG is flattened into the completed video/poster; raw vendor art is excluded. Full sources, hashes and frame license remain in [the media manifest](stamp-shift-landing-media.json).

Reuse native two-second delivered and collection APNGs from Stamp Shift's celebration dataset exports, composited onto the corresponding sage/ivory page surfaces and encoded as silent H.264 loops. Posters work without motion. These reuse the previously generated Seedance assets; new credits spent:0. Decorative character animation never substitutes for playable UI.

The form title explicitly requests availability notification. An email plus actual valid Notify me submission sends consent:true for Stamp Shift only, using the existing launch-v1 notification scope. No separate checkbox, typing-triggered signup, new database or API change. Privacy wording matches the submit action. Endpoint validation, honeypot, no-cookie fetch, timeout, disabled pending/saved states, duplicate behavior and failure retry remain intact. No confirmation email or launch email delivery is implemented by this change.

No visible pause control. Visible videos loop silently by default; offscreen/hidden media pauses to save resources. Reduced Motion and Save-Data retain static posters. Autoplay refusal or media error is isolated to that video and leaves its poster, without repeated retries. Source loading remains lazy.

## Verification

Local100unit cases, TypeScript, all77normal browser journeys (including8focused app-docs journeys) and3isolated synthetic signup journeys pass. Desktop1280 and mobile320/361/390 fit, default visible playback, no pause control, keyboard access, reduced-motion fallback and console are verified. Fixture success/failure/duplicate/invalid/no-JS journeys hit a synthetic server which enforces app-specific consent/version; they do not write to production. Full normal browser suite:77passed. Independent review found a lifecycle play-promise cancellation defect; expected cancellation/offscreen rejections are now ignored and two deferred-promise regressions pass. Security review found no additional issue.

Public media remains under1MB. Each MP4 was fully decoded with ffmpeg; manifest hashes match disk. Latest website media shows development improvements and must be reconciled with the chosen public candidate before changing Coming soon to Download. Native source, submissions, purchase entitlements and the launch approval queue are unchanged.
