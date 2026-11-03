---
version: alpha
name: Blum Studios
description: A quiet creative studio with centered lettering, soft pill actions and animated flat city scenes.
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

Blum Studios is Jordan Blum’s independent umbrella for apps, design and art. The homepage is a **Decide/Learn** surface with one primary action: Contact. Its compact identity, one-line description and three pill links sit in the quiet center of an animated flat city illustration. The contact form lives on its own `/contact` route.

The established owned system supplies the BLUM mark, warm paper, oxblood, Switzer and Chillax. The requested reference, [Daniel D.’s portfolio](https://www.danield.design/), informed three general principles: quiet centered type, soft pill controls and expressive ambient imagery. It was inspected through Firecrawl and a screenshot during this task. The layout, illustration and identity are original; no reference case-study grids or content are copied.

This contract applies only to the isolated studio build at `https://buildwithblum.com`. The personal portfolio and app support routes retain their own contracts. Sources of truth are [studio.css](styles/studio.css), [CityBackdrop.astro](components/CityBackdrop.astro), [city.css](styles/city.css), [index.astro](pages/index.astro) and [contact.astro](pages/contact.astro).

## Colors

Map studio tokens to the existing `--studio-*` properties. Paper is the canvas, ink is content, muted ink is secondary help, and oxblood is identity, the primary action and focus. City art may use restrained pastel fills, while the center stays quiet enough for the existing content contrasts: ink/paper 13.67:1, muted/paper 4.83:1 and oxblood/paper 5.93:1. Contact feedback uses explicit readable text rather than color alone. Privacy and fallback help use ink over the muted illustration to preserve contrast. App-specific imagery does not alter studio chrome.

## Typography

Use local Switzer 400/500 for interface copy and Chillax 600 for the Studios half of the identity and Contact heading. Preserve the original BLUM SVG ratio. Its accessible text name remains Blum Studios, without a second monogram. The homepage mark occupies about 320px and its Studios lettering caps at 3.12rem. The one-line statement is 1.125rem; pills and labels are .875rem; necessary privacy and email help are .8125rem. The Contact heading is 2.5rem. No decorative captions or eyebrow labels.

## Layout

The home main landmark fills at least 100svh and centers one compact composition with a small upward optical adjustment. A flat city backdrop fills the entire viewport; Chicago, San Francisco and New York scenes live around the edges and lower field. The foreground contains only the wordmark, `Apps, design & art.` and Contact, Links and Resume actions. There is no showcase, footer, policy copy or contact form on this route.

The Contact action opens a real `/contact` page with the same backdrop. Its content is centered at 28rem maximum width with a Contact heading and simple Back link above the form. Form labels and entered text remain left-aligned for scanning. Name and email share a row; message spans the width. Necessary privacy and email fallback belong only here. Contact must fit 375px without horizontal overflow and scroll naturally on short screens. Native navigation supplies history and focus behavior; the legacy `/#contact` link replaces its location with `/contact` when JavaScript is available. App directory and overview layouts preserve their scoped editorial styles.

## Elevation & Depth

The shell is flat and the illustration stays 2D. No opaque content card, realistic globe, video frame, glass, decorative shadows or glossy gradients. Depth comes from overlapping illustrated city layers. A quiet center protects readable contrast, especially behind contact fields.

## Shapes

Navigation and the Send message button use fully rounded pills. Inputs use flat, visible hairlines and square corners. Avoid turning content groups into large rounded panels. All interactive targets are at least 44px in both dimensions.

## Components

Contact is the single filled homepage action, with a small envelope SVG whose flap lifts on hover. Links opens `https://blumblumblum.com`; Resume uses the existing local PDF. Pills lift gently on hover and compress on press with 160ms transitions, only when reduced motion is not requested. No new dependency is introduced.

The contact form preserves name, email and message fields, visible labels, native required/email/length validation, a ten-code-point message minimum and server validation. A hidden honeypot is excluded from keyboard navigation. Pending, failure and success appear in a live status region. Sending locks submitted fields and disables Send message; a 15-second timeout restores retry. Failures retain the draft and idempotency key; changed drafts get a new key. JSON bodies are limited to 8KiB. The existing endpoint is `https://www.chicksofnyc.com/api/studio/contact`.

Contact details are used to reply, with a direct /privacy link and no marketing signup. The form appears only when its handler is ready; the email fallback works without JavaScript. The homepage Contact link also works without JavaScript.

The CityBackdrop root is `[data-city-background]` and has three `[data-city-scene]` layers: `chicago`, `san-francisco` and `new-york`. Decorative artwork is hidden from assistive technology. A minimal 44px pause/play control outside the hidden art supports keyboard users. Reduced motion stops all illustration animation. No motion delays content or interaction.

The layout retains a visible-on-focus skip link and focusable main landmark. Focus uses an oxblood outline with clear offset. Hover and disabled states preserve contrast. Each page has accurate studio metadata.

## Do's and Don'ts

Keep the homepage centered, brief and useful. Let the city art carry visual expression. Preserve the actual brand and reviewed contact handling. Do not add projects, app links, social links, cards, promotional copy, emojis, decorative labels, realistic media or invented claims. Preserve app support/privacy routes and isolate studio CSS from personal and game layouts.
