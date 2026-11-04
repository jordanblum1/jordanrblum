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

Blum Studios is Jordan Blum’s independent umbrella for apps, design and art. The homepage is a **Decide/Learn** surface: compact centered identity, a one-line statement and vertical Contact, Links and Portfolio actions. Contact expands from its own button into an in-place native dialog. Background illustration and motion are owned separately by CityBackdrop.

The owned BLUM mark, warm paper, oxblood, Switzer and Chillax remain authoritative. The requested [Daniel D. reference](https://www.danield.design/) informed quiet type, soft pills and an expressive ambient background. The requested [shape-morph study](https://x.com/twoclipping/status/2103273003555402193), read through Firecrawl, informed continuity of shape, radius and color with a separate short content reveal. These principles are adapted into an original site; reference grids, video staging, effects and content are not copied.

This contract applies to the isolated `studio` build at `https://buildwithblum.com`. App support routes retain their existing contracts. Sources: [studio.css](styles/studio.css), [CityBackdrop.astro](components/CityBackdrop.astro), [index.astro](pages/index.astro), [contact-dialog.ts](scripts/contact-dialog.ts), [ContactForm.astro](components/ContactForm.astro) and [contact.ts](scripts/contact.ts).

## Colors

Existing `--studio-*` tokens define paper, ink, muted ink, the divider and oxblood. Oxblood carries identity, the primary action and keyboard focus. The morph starts with the button’s actual computed color and becomes the warm paper form surface. Background art must leave the foreground readable. Privacy/help surfaces use ink over paper when needed. Base contrasts remain ink/paper 13.67:1, muted/paper 4.83:1 and oxblood/paper 5.93:1. Status is expressed through text, not color alone.

## Typography

Use local Switzer 400/500 for interface text and Chillax 600 for Studios and Contact. Preserve the original BLUM SVG proportions and accessible name. The homepage mark occupies about 320px; Studios caps at 3.12rem. The statement is 1.125rem, actions and labels .875rem, and necessary email help .8125rem. The dialog heading is 2rem. No eyebrow labels, extra headings or name subcopy.

## Layout

The home fills at least 100svh and centers a compact composition within the open sky above the bridge. A shrinking flex spacer below the composition provides up to128px of wide-layout art clearance and24px on phones. It collapses before enlarged browser text can move above the viewport; no negative content transform is used. Its three actions form a vertical stack, switching to a compact row only on short landscape screens. Contact opens on the same page; Links goes to `https://blumblumblum.com`; Portfolio goes to `https://jordanblum.com`. There is no Resume action, showcase, app promotion, footer or policy copy.

The modal panel is at most 32rem wide with 32px desktop and 24px mobile content padding. Its form retains a two-field name/email row and full-width message. The panel is centered inside the actual visual viewport, including keyboard resize/scroll; excess content scrolls within its height and fits 375px without horizontal overflow. The closed homepage remains in place behind the native modal’s inert background. No custom focus-trap implementation is used.

Opening sets `#contact`; incoming `/#contact` opens the same dialog. `/contact` is a compatibility redirect to `/#contact`, with a no-JavaScript email fallback. The homepage also exposes its no-JavaScript Contact email only inside `noscript`, while its enhanced button is revealed after initialization. Closing restores focus to the trigger. Browser Back, Escape, close button and backdrop dismissal close the dialog.

## Elevation & Depth

The foreground is flat. The form is a warm rounded surface with a fine divider-colored stroke and a light warm scrim, without a decorative shadow, glow, gradient, glass effect or bounce. Background composition is independent of the foreground and has its own accessible motion control.

## Shapes

Actions are fully rounded pills with at least 44px targets. The form surface has a 28px radius. Field boundaries are visible flat hairlines. The morph preserves one surface from the actual Contact button rectangle to the form rectangle; text never scales with that surface.

## Components

Contact includes a small envelope SVG; its flap lifts on hover. Native CSS hover/press feedback uses restrained 160ms transitions and is suppressed for reduced motion.

The native dialog supplies top-layer placement, inert background and keyboard containment. Opening first expands the empty shape for 360ms, then reveals content with a 140ms opacity/6px movement/2px blur transition. Closing removes content in 90ms before reversing the surface to the trigger in 280ms. Web Animations drives the FLIP transform, radius and color without a dependency. Reduced motion opens and closes immediately; interruption by Escape leaves no stuck overlay or inert content.

ContactForm retains visible name/email/message labels, required/email/length checks, a ten-code-point message minimum and server validation. A hidden honeypot is excluded from keyboard navigation. The live status region announces pending, error and success. Submission locks the fields before asynchronous signing, blocks duplicates, times out after 15 seconds and restores fields. Failures retain draft and idempotency key; changed drafts get a new UUID. JSON bodies are limited to 8KiB. The form posts to `https://jordanblum.com/api/studio/contact`, including the exact serialized body’s lowercase-hex SHA-256 in `x-amz-content-sha256` for the existing CloudFront/Lambda contract.

Closing and reopening preserves the draft and status. The form’s email help remains available for server failure. No marketing signup, privacy checkbox or explanatory footer copy is added. The standalone privacy route remains available.

The page retains accurate metadata, skip link and focusable main landmark. Keyboard focus uses clear oxblood outlines. CityBackdrop owns decorative imagery, reduced-motion handling and its accessible motion toggle independently. Photo-referenced flat2D illustrations distinguish Williamsburg’s grey lattice suspension towers, Wells Street’s burgundy double-deck bascule truss and Golden Gate’s orange portal towers. Pre-rendered direct structural transformations carry separately composited train/car passes in alternating directions; the previous map-flight study is not the final design. Separate landscape/portrait compositions keep the center quiet. Phone exports extend the quiet sky above the unchanged portrait composition to720×1600, retaining both bridge towers on tall screens without distorting the art. On viewports wider than16:9, media anchors at the top so cover-cropping does not raise the bridge into the controls. Poster and video use the same framing.

## Do's and Don'ts

Keep the homepage centered, brief and useful. Preserve the reviewed contact protocol, pending locks and idempotency behavior. Do not add app/project links, Resume, social copy, cards, promotional text, emojis, decorative labels, modal-routing frameworks, generic template effects or invented claims. Preserve independent app support/privacy layouts and keep studio styles isolated.
