---
version: alpha
name: Blum Studios
description: A quiet creative studio with centered lettering, soft pill actions and an in-place contact morph.
colors:
  primary: "#9C4037"
  secondary: "#746960"
  neutral: "#F7F3ED"
  text: "#2B2521"
  border: "#DDD5CB"
  project-sage: "#DFE6DB"
  work-stamp: "#E9E5DA"
  work-alive: "#E8E5ED"
  work-birthday: "#E3E9DF"
  work-caption: "#625950"
typography:
  h1:
    fontFamily: Chillax
    fontSize: 3.12rem
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.065em"
  h2:
    fontFamily: Chillax
    fontSize: 4rem
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.055em"
  body-md:
    fontFamily: Switzer
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: 99px
  device: 26px
  panel: 28px
  showcase: 26px
spacing:
  sm: 8px
  md: 16px
  lg: 24px
  section: 96px
components:
  body:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.text}"
  secondary-text:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.secondary}"
  contact-link:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.sm}"
  contact-link-hover:
    backgroundColor: "{colors.text}"
    textColor: "{colors.neutral}"
---

## Overview

Blum Studios is Jordan Blum’s independent umbrella for apps, design and art. The homepage is a **Decide/Learn** surface: compact centered identity, a one-line statement and vertical Contact, Links and Work actions. Contact expands from its own button into an in-place native dialog. Background illustration and motion are owned separately by CityBackdrop.

The owned BLUM mark, warm paper, oxblood, Switzer and Chillax remain authoritative. The requested [Daniel D. reference](https://www.danield.design/) informed quiet type, soft pills and an expressive ambient background. The requested [shape-morph study](https://x.com/twoclipping/status/2103273003555402193), read through Firecrawl, informed continuity of shape, radius and color with a separate short content reveal. These principles are adapted into an original site; reference grids, video staging, effects and content are not copied.

This contract applies to the isolated `studio` build at `https://buildwithblum.com`. App support routes retain their existing contracts. Sources: [studio.css](styles/studio.css), [CityBackdrop.astro](components/CityBackdrop.astro), [index.astro](pages/index.astro), [contact-dialog.ts](scripts/contact-dialog.ts), [ContactForm.astro](components/ContactForm.astro) and [contact.ts](scripts/contact.ts).

## Colors

Existing `--studio-*` tokens define paper, ink, muted ink, the divider and oxblood. Oxblood carries identity, the primary action and keyboard focus. The morph starts with the button’s actual computed color and becomes the warm paper form surface. Background art must leave the foreground readable. Privacy/help surfaces use ink over paper when needed. Base contrasts remain ink/paper 13.67:1, muted/paper 4.83:1 and oxblood/paper 5.93:1. Status is expressed through text, not color alone.

## Typography

Use local Switzer 400/500 for interface text and Chillax 600 for Studios and Contact. Preserve the original BLUM SVG proportions and accessible name. The homepage mark occupies about 320px; Studios caps at 3.12rem. The statement is 1.125rem, actions and labels .875rem, and necessary email help .8125rem. The dialog heading is 2rem. No eyebrow labels, extra headings or name subcopy.

## Layout

The home fills at least 100svh and centers a compact composition within the open sky above the bridge. A shrinking flex spacer below the composition provides up to128px of wide-layout art clearance and24px on phones. It collapses before enlarged browser text can move above the viewport; no negative content transform is used. Its three actions form a vertical stack, switching to a compact row only on short landscape screens. Contact opens on the same page; Links goes to `https://blumblumblum.com`; Work opens `/work`. Full portfolio remains available inside Work at `https://jordanblum.com`. There is no Resume action, showcase, app promotion, footer or policy copy on the homepage.

The modal panel is at most 32rem wide with 32px desktop and 24px mobile content padding. Its form retains a two-field name/email row and full-width message. The panel is centered inside the actual visual viewport, including keyboard resize/scroll; excess content scrolls within its height and fits 375px without horizontal overflow. The closed homepage remains in place behind the native modal’s inert background. No custom focus-trap implementation is used.

Opening sets `#contact`; incoming `/#contact` opens the same dialog. `/contact` is a compatibility redirect to `/#contact`, with a no-JavaScript email fallback. The homepage also exposes its no-JavaScript Contact email only inside `noscript`, while its enhanced button is revealed after initialization. Closing restores focus to the trigger. Browser Back, Escape, close button and backdrop dismissal close the dialog.

## Elevation & Depth

The foreground is flat. The form is a warm rounded surface with a fine divider-colored stroke and a light warm scrim, without a decorative shadow, glow, gradient, glass effect or bounce. Background composition is independent of the foreground and follows the visitor’s reduced-motion preference without adding visible playback chrome.

## Shapes

Actions are fully rounded pills with at least 44px targets. The form surface has a 28px radius. Field boundaries are visible flat hairlines. The morph preserves one surface from the actual Contact button rectangle to the form rectangle; text never scales with that surface.

## Components

Contact includes a small envelope SVG; its flap lifts on hover. Native CSS hover/press feedback uses restrained 160ms transitions and is suppressed for reduced motion.

The native dialog supplies top-layer placement, inert background and keyboard containment. Opening first expands the empty shape for 360ms, then reveals content with a 140ms opacity/6px movement/2px blur transition. Closing removes content in 90ms before reversing the surface to the trigger in 280ms. Web Animations drives the FLIP transform, radius and color without a dependency. Reduced motion opens and closes immediately; interruption by Escape leaves no stuck overlay or inert content.

ContactForm retains visible name/email/message labels, required/email/length checks, a ten-code-point message minimum and server validation. A hidden honeypot is excluded from keyboard navigation. The live status region announces pending, error and success. Submission locks the fields before asynchronous signing, blocks duplicates, times out after 20 seconds and restores fields. Failures retain draft and idempotency key; changed drafts get a new UUID. JSON bodies are limited to 8KiB. The form posts to `https://jordanblum.com/api/studio/contact`, including the exact serialized body’s lowercase-hex SHA-256 in `x-amz-content-sha256` for the existing CloudFront/Lambda contract.

Closing and reopening preserves the draft and status. The form’s email help remains available for server failure. No marketing signup, privacy checkbox or explanatory footer copy is added. The standalone privacy route remains available.

The page retains accurate metadata, skip link and focusable main landmark. Keyboard focus uses clear oxblood outlines. CityBackdrop owns decorative imagery and reduced-motion handling independently; no play/pause control is shown. Desktop keeps the existing photo-referenced flat2D Williamsburg, Wells Street and Golden Gate bridge transformations with alternating train/car passes. Portrait viewports instead use a dedicated720×1600 hand-drawn skyline film in the same ink-and-paper language: New York, Chicago and San Francisco hold for four seconds apiece and structurally redraw into the next city over six seconds, forming a closed30-second loop. Licensed skyline photographs supplied geometry references only and do not appear in the website media. Empire State Building, Willis Tower and Transamerica Pyramid remain identifiable; no bridge photography or bridge plate appears in the portrait film. A320px quiet-paper extension above the artwork protects the centered foreground without distorting building proportions. The portrait poster matches the first illustrated New York state. Reduced-motion and no-JavaScript visitors keep that static poster and download no video. On viewports wider than16:9, landscape media anchors at the top so cover-cropping does not raise the bridge into the controls.

Portrait media follows four principles adapted from the installed community [Apple design analysis](~/.agents/skills/popular-web-designs/templates/apple.md), checked November4,2026: let imagery carry the story, preserve the subject rather than crop a wide composition into mobile, keep interface chrome out of the cinematic field, and use generous negative space around the identity. This is community analysis, not Apple’s official specification; Blum’s paper, oxblood, Switzer, Chillax and original artwork remain authoritative. Photo rights, source hashes, transform notes and output hashes are recorded in [the studio home media manifest](../docs/studio-home-media.json).

Work is an **Explore** surface: browse a horizontal product showcase, switch collections, and open a specific project. It uses an open editorial page with the existing small BLUM/Studios home link and Contact pill, a single Work heading, category pills, and a scroll rail. There is no outer modal panel or decorative backdrop. The homepage bridge scene and Contact morph remain independent and unchanged.

The rail uses generous solid-color product fields, left-aligned titles and one useful description. The first three product cards are 440px wide on desktop, with 376px-high actual iPhone composites; web projects use 560px cards and Photos uses 740px cards. Phone cards are viewport width minus62px on narrow screens, leaving an adjacent-card peek. All media is contained at its native aspect ratio. No UI crops, synthetic device shells, photo crops, altered watermarks or placeholder screens are permitted. Quiet pastels distinguish projects; card captions use #625950 for contrast. Project links are plain oxblood pills; circular previous/next controls alone use chevron SVGs. No arrows on link pills or underlined link collections.

Products, Design and Photos are pressed-state filter buttons with44px minimum targets and wrapping labels. JavaScript shows one collection, resets its rail on category change and synchronizes navigation with actual scroll position. Native horizontal scrolling, mandatory scroll snap and adjacent-card peeks support touch/trackpads; a focusable rail adds ArrowLeft/ArrowRight, Home and End. Previous/next circular44px SVG controls stop at boundaries. A polite position status reflects the active collection. Focused project links naturally scroll into view. Reduced motion uses immediate programmatic scrolling and suppresses transitions. Without JavaScript, all three collections remain accessible in ordinary horizontal rails. Narrow320px, rotated phone and32px browser-font layouts must retain page bounds and usable controls.

Reference provenance: [Apple Store](https://www.apple.com/store), checked November3,2026, and the installed community analysis at `~/.agents/skills/popular-web-designs/templates/apple.md` informed five borrowed principles: product imagery carries the story; short left-aligned headings establish hierarchy; solid fields keep product silhouettes readable; horizontal rails expose the next item; simple pills and circular chevrons make actions clear. The template is a community analysis, not Apple's official specification. Blum's paper, oxblood, Switzer and Chillax remain authoritative; no Apple branding, proprietary type or product images are copied.

Work content uses publicly presented products, owned identity assets and three visibly watermarked Jordan Blum photographs: photo0020.jpg (Cape Town), photo0030.jpg (Deadvlei), photo0040.jpg (Rome). The full image and watermark are preserved. sunset-beach.jpeg is excluded because its embedded copyright identifies Michael L. Baird; chicago-skyline-night.jpg is excluded because ownership was not confirmed. Published Procore/Workday role descriptions are quiet footer pills. Roam, harness work, confidential work, invented testimonials and metrics are excluded. Products appear in this order: Stamp Shift, Alive Still, Birthday, Chicks of NYC, Citi Bike Wrapped.

The three phone images flatten genuine native captures under the existing licensed Webmobilefirst iPhone17Pro transparent frame. Source hash, frame geometry, license URLs, exact screen inputs and output hashes live in the external work-media provenance manifest. The raw389×800 vendor frame never enters Git. The full native screen is uniformly contained in the355×772 opening, masked at50px corner radius, then overlaid with the authentic frame. Outputs are778×1600; this doubles the low-resolution frame without claiming higher-resolution hardware photography. Birthday uses a fictional-contact fixture. See [Work media and verification](../docs/studio-work.md).

## Do's and Don'ts

Keep the homepage centered, brief and useful. Preserve the reviewed contact protocol, pending locks and idempotency behavior. Keep project examples inside Work; do not add them to the homepage. Do not add Resume, social copy, promotional cards, emojis, decorative labels, modal-routing frameworks, generic template effects or invented claims/testimonials. Preserve independent app support/privacy layouts and keep studio styles isolated.
