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
  can-black: "#151515"
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
  can-artwork:
    backgroundColor: "{colors.can-black}"
    textColor: "{colors.surface}"
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

Text links use the existing oxblood underline and a visible focus outline. Current documentation sections pair text with `aria-current`. FAQs use native `details`/`summary`; contact links use native `mailto:`. No forms, client-side JavaScript or dependencies are added. Global tokens, font faces and primitives come from `global.css`; page styles are scoped beneath `.app-docs`.

## Do's and Don'ts

Keep rules, privacy language and purchase information specific and verifiable. Do not invent store URLs, prices, popularity claims or policies for apps not yet documented. Do not animate reading text or couple documentation to the personal site's chat widget, transcript storage, reveal scripts or easter eggs. Preserve the portfolio's other surfaces.

## App documentation contract

`src/layouts/AppDocs.astro` deliberately does not import `Base`, `Nav`, `Footer` or `ChatWidget`, because those components load scripts and assistant behavior. It reuses global CSS and local fonts through a static shell. Tests assert zero script elements, no chat controls, stable canonical URLs, working keyboard disclosures/navigation, and narrow-screen layout.

The public directory registry is `src/data/apps.ts`, with email derived from the existing site contact. To add an app, add one registry entry and create its overview, support and bespoke privacy pages under `src/pages/apps/{slug}/`, using the shared layout. Only list apps after those routes exist. Never inherit another app's data practices by generating a generic policy from its registry entry. Keep the `/apps/{slug}/support` and `/apps/{slug}/privacy` addresses stable for app-store review and existing users. Publishing remains an owner action; these files alone do not deploy the site.

## SimReady homepage preview contract

`/labs/simready` is an unlisted **Compare** surface showing three homepage hero/placement options. Workbench uses a **Decide/Learn** composition inside that comparison: real Jordan headline/support left, the existing textured BLUM workbench and an immediately visible art can right. Desktop keeps the whole object in the initial 900px viewport; 390px screens stack compact copy above the field. The production homepage and shared tokens remain untouched.

Reference strategy: **existing product system**, sharpened with the warm editorial principles in [`popular-web-designs/templates/claude.md`](https://github.com/VoltAgent/awesome-design-md). This installed reference is a third-party analysis, not an official brand system. Borrowed principles: warm paper/ink contrast; a restrained terracotta/oxblood accent; typography and spacing as hierarchy; original illustration as the focal evidence. Preserve Jordan's own Chillax/Switzer fonts, navigation, texture and BLUM artwork rather than copying a reference layout.

The can is an **Explore** interaction within the comparison. Its original BLUM studio identity borrows only the visual grammar in the user-supplied research from the official Montana BLACK 400ml product page: matte black, oversized vertical white type, dense cream utility type and a small color ring. No Montana logo, official artwork or product specifications are reproduced. The existing site composition remains the reference for everything outside the can.

The fallback and live paint use only lab-scoped `--can-black` (`#151515`), `--accent` (`#9C4037`) and `--paper-raised` (`#FCFAF6`). The cap/body are charcoal, the exact four paths from `src/assets/identity/blum-mark.svg` are oxblood, and vertical STUDIO/utility details are cream. Never use the global warning/ochre token in can artwork. Utility text describes Jordan and the visual study; do not invent volume, pressure, paint chemistry or performance claims.

The server-rendered SVG appears during loading, on failure and without JavaScript. The live paint uses an opaque Three.js material and shared 1200×1120 sRGB CanvasTexture. An object-relative cylindrical shader projection wraps the print around existing mesh geometry, with fragment-space angular coordinates to avoid interpolation across the rear seam. The print follows the surface at every camera angle; never add a floating DOM label. Top/bottom surfaces share the black treatment, with radially projected details rather than separately authored cap artwork.

Start in the authored frontal pose. Only after drawable, treated geometry arrives, enable pointer/touch orbit, wheel/pinch zoom, focus and keyboard controls. Disable panning, constrain zoom distance to 0.65–2× the authored distance, and keep auto-rotation off. Arrow keys rotate, +/− zoom; Home or double-click resets. Show concise drag/zoom/reset guidance in the existing status line. Reduced motion disables damping and decorative transitions, preserving direct input. Keep exactly three tabs, focus/history behavior, attribution, 44px controls and active-only resource lifecycle. No extra headings, badges, marketing copy, dependencies or production CSS changes.
