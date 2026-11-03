---
version: alpha
name: Blum Studios
description: A warm editorial creative studio with expressive lettering and real product evidence.
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
    fontSize: 9.5rem
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
  sm: 0px
  device: 26px
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
    padding: 16px
    rounded: "{rounded.sm}"
  contact-link-hover:
    backgroundColor: "{colors.text}"
    textColor: "{colors.neutral}"
---

## Overview

Blum Studios is Jordan Blum’s independent umbrella for apps, design and art, with a direct route for freelance inquiries. The homepage is an **Explore** surface with contact as the secondary job. The design uses the existing owned product system: the expressive BLUM wordmark, warm paper, oxblood, local Switzer and Chillax. Source context: the root [brand book](../docs/brand.md), [design contract](../DESIGN.md), and the owned `blumblumblum` local site. No external reference, new font, generated artwork or dependency was introduced.

This contract applies only to the isolated `studio` build at `https://buildwithblum.com`. It does not change the personal portfolio or Stamp Shift’s own game identity. Source of truth: [studio.css](styles/studio.css), [StudioLayout.astro](layouts/StudioLayout.astro) and [index.astro](pages/index.astro).

## Colors

Map tokens to the corresponding `--studio-*` properties. Paper is the light-only canvas; ink is the default text; muted ink is secondary copy; oxblood is identity, contact and keyboard focus. Hairlines divide editorial sections and never carry information alone. Project sage belongs only behind the actual Alive Still screenshot. Stamp Shift’s art supplies its own colors without becoming the studio chrome.

Approved contrasts inherited from the established palette: ink/paper 13.67:1, muted/paper 4.83:1, oxblood/paper 5.93:1. Contact text uses paper on oxblood. There are no synthetic status colors because this page has no status UI.

## Typography

Use local Switzer 400/500 for text and navigation; local Chillax 600 for short destination/project titles and the Studios half of the identity. The original BLUM SVG remains a mark, with its aspect ratio intact. It is decorative beside the accessible text name. No second monogram appears.

Desktop identity type scales with viewport width to a 9.5rem cap; at 540px and below the mark stacks above Studios, preserving a legible full name. Contact heading scales from 2.2rem to 4rem. Body text is 1rem/1.5; small footer/navigation text is at least .875rem. No all-caps eyebrow labels or ornamental captions.

## Layout

A 77rem maximum canvas uses 40px desktop side gutters, 24px tablet gutters and 20px mobile gutters. The introductory identity is followed by a two-column statement/contact arrangement. Selected projects form a 1.5:1 offset composition, with Alive Still starting 112px below Stamp Shift. Images have distinct proportions; they are work evidence rather than feature cards. Birthday is an editorial row.

At 800px the introduction and contact section stack; at 540px projects become a single column and the wordmark stacks. DOM order remains reading order. Content must fit 375px without horizontal overflow. App directory pages may reuse the static layout while using their own scoped editorial styles.

## Elevation & Depth

The shell is flat. A modest device shadow belongs only to actual app screenshots. No raised navigation island, glass, gradients, floating widgets, artificial badges or extra texture overlays. Product artwork carries the visual variety.

## Shapes

Project art frames are rectangular. Screenshot corners (16–26px) suggest physical devices; they are not a general card radius. The contact action is a straightforward rectangular button-like link.

## Components

All navigation and contact controls are native links with at least 44px hit targets. The primary contact link uses the verified `studio.contactEmail` with the subject `Blum Studios — Project inquiry`. There is no form, signup, chat, analytics or JavaScript behavior. Footer links open Jordan’s portfolio and the studio’s Instagram in the current tab.

The layout supplies a visible-on-focus skip link to a focusable main landmark, canonical and Open Graph/Twitter metadata for the studio domain, a studio favicon, and a local social-preview PNG derived from the existing wordmark. Pages supply accurate title, description and optional canonical path.

Keyboard focus has a 3px oxblood outline with generous offset. Hover changes link color or the contact fill. Screenshot hover rotations are 220ms and apply only with a hover-capable pointer and `prefers-reduced-motion: no-preference`; reduced motion has no transforms added by interaction. No looping, scroll or entrance animations.

## Do's and Don'ts

Keep apps, design and art visible in the studio identity; do not narrow it to an app publisher. Use actual product images and verified routes. Preserve each app’s separate support and policy pages. Keep copy specific and short, with no invented services, team, testimonials, metrics or claims. Do not add a generic feature grid or decorative text to fill space. Keep studio CSS isolated from personal and game layouts.
