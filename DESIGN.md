---
version: alpha
name: Jordan Blum Editorial
description: Warm paper, dark ink and clear editorial reading surfaces.
colors:
  primary: "#9C4037"
  secondary: "#746960"
  neutral: "#F7F3ED"
  surface: "#FCFAF6"
  text: "#2B2521"
  border: "#DDD5CB"
  success: "#52735B"
  warning: "#A86E32"
  error: "#A3453C"
typography:
  h1:
    fontFamily: Chillax
    fontSize: 4rem
    fontWeight: 600
    lineHeight: 1.06
  body-md:
    fontFamily: Switzer
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.65
rounded:
  sm: 8px
  md: 16px
  lg: 32px
spacing:
  sm: 8px
  md: 16px
  lg: 24px
components:
  body:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.text}"
  secondary-text:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.secondary}"
  text-link:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
---

## Overview

This is a machine-readable companion to the existing [brand book](docs/brand.md) and [generated tokens](src/styles/tokens.css). The vault brand book remains canonical; this file documents the current implementation and does not replace or regenerate it.

The portfolio is a quiet editorial shell with expressive product evidence. The app-documentation surface is **Decide/Learn**: find the right app, understand its rules, restore a purchase, contact its maker, and read the app's own privacy policy. Reference strategy: **existing product system**. Preserve the site's paper/ink palette, readable Switzer prose, Chillax destination headings, generous spacing and plain text links. No new microsite identity or external layout is introduced.

## Colors

Map primary to `--accent`, secondary to `--ink-muted`, neutral to `--paper`, surface to `--paper-raised`, text to `--ink`, and border to `--hairline`. Use ink on paper for normal text and oxblood for links/focus. Decorative hairlines never carry meaning alone. Keep light-only browser/native-control styling. Do not modify generated tokens without following the brand-book workflow.

## Typography

Switzer handles prose and interface text; Chillax 600 handles major destination headings. Font files are the existing local assets. The rest of the portfolio retains its established Fraunces, Geist Mono and expressive font roles from the brand book. App docs need no additional fonts. Limit reading columns to `--measure` (42rem); `--wide` is 72rem. On app-docs pages, h1 scales from 2.5rem to 4rem; h2 is 1.5rem, body is 1rem/1.65 and lead text is 1.125rem.

## Layout

Use the existing 4px spacing scale. A simple header links home, app docs and email. App pages have a narrow overview/support/privacy navigation beside one reading column, collapsing above the text on mobile. The directory uses editorial rows rather than cards. Footer links stay visible without scripting. Links and disclosures retain 44px targets, conventional reading order and a skip link to a focusable main landmark.

## Elevation & Depth

App documentation is flat: paper, typography and quiet dividers. The portfolio's existing texture and elevation rules remain unchanged. No gradient, glass, decorative shadows or added artwork is needed for reading/support pages.

## Shapes

Retain the brand's 8/16/24/32px radius vocabulary where needed; reading pages do not require rounded containers. Do not introduce Stamp Shift's character art or bright puzzle palette as shared-site chrome.

## Components

Text links use the existing oxblood underline and a visible focus outline. Current documentation sections pair text with `aria-current`. FAQs use native `details`/`summary`; contact links use native `mailto:`. Only the Stamp Shift overview may load the optional waitlist form script. Support, privacy and the directory remain static. Use a visible email label, explicit unchecked per-app consent, 44px controls, pending/disabled/error/success states and a live status region. No new dependencies. Global tokens, font faces and primitives come from `global.css`; page styles are scoped beneath `.app-docs`.

## Do's and Don'ts

Keep rules, privacy language and purchase information specific and verifiable. Do not invent store URLs, prices, popularity claims or policies for apps not yet documented. Do not animate reading text or couple documentation to the personal site's chat widget, transcript storage, reveal scripts or easter eggs. Preserve the portfolio's other surfaces.

## App documentation contract

`src/layouts/AppDocs.astro` deliberately does not import `Base`, `Nav`, `Footer` or `ChatWidget`, because those components load scripts and assistant behavior. It reuses global CSS and local fonts through a static shell. Tests assert zero script elements on support, privacy and directory, no chat controls, stable canonical URLs, working keyboard disclosures/navigation, and narrow-screen layout.

The public directory registry is `src/data/apps.ts`, with email derived from the existing site contact. To add an app, add one registry entry and create its overview, support and bespoke privacy pages under `src/pages/apps/{slug}/`, using the shared layout. Only list apps after those routes exist. Never inherit another app's data practices by generating a generic policy from its registry entry. Keep the `/apps/{slug}/support` and `/apps/{slug}/privacy` addresses stable for app-store review and existing users. The overview is a Decide/Learn prelaunch surface: Coming soon and Notify me must not imply availability. When the explicit API build variable is absent, show the existing support email instead of an enabled form. Reference provenance: the installed popular-web-designs Figma template informed only restrained chrome with colorful product evidence; retain existing fonts, layout and tokens, never clone its composition.

Publishing remains an owner action; these files alone do not deploy the site.
