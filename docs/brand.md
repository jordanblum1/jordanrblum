---
date: 2026-07-22
kind: brand-book
project: jordanrblum.com
status: active
---

# jordanrblum.com brand book

> The canonical source is `Design/brands/jordanrblum.md` in Jordan's Obsidian vault. This repo copy exists so the brand is easy to find while building. Design tokens are generated into `src/styles/tokens.css`; change the book first, then sync the implementation.

## The brand in one sentence

A quiet, warm portfolio with one lively workbench moment: specific, calm, curious, a little odd, and never self-important.

## North star

The site should feel like a useful personal page made by a product engineer who cares about how things work and how they feel. Product work, developer tools, AI-agent systems, and side projects are the center of gravity. Photography is supporting texture, not a separate identity.

Three principles govern the system:

1. **Quiet shell, expressive artifacts.** Navigation, typography, and layout stay composed so the work can carry the color and personality.
2. **Evidence over pitch.** Show the interface, tool, flow, or failure mode. Let specific work prove competence.
3. **Play in short bursts.** Motion and odd details reward attention, but never delay reading or compete with the content.

## Identity system

### Marks

| Mark | Role | Source | Default treatment |
| --- | --- | --- | --- |
| BLUM wordmark | Primary expressive mark | `src/assets/identity/blum-mark.svg` | Oxblood on paper; large in the workbench and compact in the footer/chat |
| JRB monogram, red | Primary navigation mark | `src/assets/identity/jrb-logo-red.png` | Warm-paper navigation and light surfaces |
| JRB monogram, blue | Interactive alternate | `src/assets/identity/jrb-logo-blue.png` | Motion/state layer in the navigation; not a second brand color |
| JRB monogram, white | Inverse utility mark | `src/assets/identity/jrb-logo-white.png` | Only when a dark photographic or colored field requires it |
| BLUM tag | Personal-project accent | `src/assets/identity/blum-tag-logo.png` | Use with the collage or blumblumblum references, not as the main site signature |

Usage rules:

- Preserve each mark's aspect ratio and internal spacing.
- Use oxblood for the BLUM wordmark by default. Do not introduce gradients, bevels, or extra outlines.
- Keep the monogram in the navigation and compact identity contexts. Keep the BLUM wordmark for expressive moments.
- One identity mark per local surface is enough. Do not stack the monogram and wordmark as a lockup.
- Logo motion is a one-shot reveal or direct interaction response. It never loops decoratively.
- Marks that repeat accessible text are decorative (`aria-hidden`); the surrounding control supplies the accessible name.

## Visual direction

- Warm paper and dark ink create the base layer.
- The shell stays light-only, calm, and editorial.
- The hero is the primary workbench: movable, tactile, and more expressive than the rest of the page.
- Project screenshots, device frames, product artifacts, and Jordan-shot photography supply most of the secondary color.
- Asymmetry belongs in art direction and composition, not in basic reading order or control placement.
- Avoid dashboard chrome, border-heavy card grids, glassmorphism, generic gradients, and ornamental texture without a content role.

## Color

| Role | Hex | CSS token | Use |
| --- | --- | --- | --- |
| Paper | `#F7F3ED` | `--paper` | Page background and primary canvas |
| Raised paper | `#FCFAF6` | `--paper-raised` | Navigation, chat, and lifted surfaces |
| Ink | `#2B2521` | `--ink` | Body copy and headings |
| Muted ink | `#746960` | `--ink-muted` | Secondary copy, metadata, and quiet controls |
| Hairline | `#DDD5CB` | `--hairline` | Dividers and non-text boundaries |
| Oxblood | `#9C4037` | `--accent` | Links, focus, calls to action, and identity marks |
| Accent contrast | `#FCFAF6` | `--accent-contrast` | Text and icons on oxblood |
| Success | `#52735B` | `--success` | Positive system feedback only |
| Warning | `#A86E32` | `--warning` | Cautionary system feedback only |
| Error | `#A3453C` | `--error` | Error feedback only |
| Safelight | `#E6533D` | `--safelight` | Hidden grain/safelight easter egg, never a routine accent |

### Approved text pairings

| Pairing | Contrast | Guidance |
| --- | ---: | --- |
| Ink on paper | 13.67:1 | Default text pairing |
| Muted ink on paper | 4.83:1 | Body-sized secondary text and metadata |
| Oxblood on paper | 5.93:1 | Links, controls, and emphasis |
| Raised paper on oxblood | 6.29:1 | Filled buttons and active controls |

Hairline on paper is intentionally low contrast at 1.31:1 and must never carry meaning or render text by itself.

Color mode is light only. Do not add dark token branches, persisted theme overrides, or `prefers-color-scheme: dark` styling.

## Typography

| Role | Family | Weight | Use |
| --- | --- | ---: | --- |
| Heading and body | Switzer | 400, 500, 600 | All primary reading and interface copy |
| Editorial accent | Fraunces Variable | 450 | Section cues, small asides, and rare expressive emphasis |
| Metadata | Geist Mono | 500 | Dates, traces, labels, counters, and tiny interface artifacts |
| Assistant accent | Baloo 2 | 400 | Jordy suggestion chips only; never body copy or headings |

Fallback stacks:

- Sans: `Switzer, "Switzer Fallback", system-ui, sans-serif`
- Serif: `"Fraunces Variable", Georgia, serif`
- Mono: `"Geist Mono", ui-monospace, "SFMono-Regular", monospace`
- Assistant accent: `"Baloo 2", "Trebuchet MS", "Comic Sans MS", sans-serif`

### Type ramp

| Style | Size | Weight | Line height | Tracking |
| --- | --- | ---: | ---: | ---: |
| Hero | `clamp(2.75rem, 6vw, 4.5rem)` | 500 | 0.98 | -0.045em |
| H2 | `clamp(2rem, 4vw, 3rem)` | 500 | 1.05 | -0.03em |
| H3 | `1.25rem` | 500 | 1.25 | default |
| Body large | `1.125rem` | 400 | 1.65 | -0.012em |
| Body | `1rem` | 400 | 1.65 | -0.012em |
| Small | `0.875rem` | 400 | 1.5 | default |
| Mono | `0.75rem` | 500 | 1.45 | 0.01em |

Keep reading measures bounded. Use `42rem` for prose and `72rem` for wide compositions.

## Spacing, shape, and elevation

- Base unit: `4px`.
- Scale: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128px`.
- Content measure: `42rem`.
- Wide measure: `72rem`.
- Radius scale: `2, 8, 16, 24, 32px`, plus a full pill.
- Border: `1px` hairline.
- Small shadow: `0 1px 2px rgb(43 37 33 / 0.08)`.
- Lifted shadow: `0 18px 50px rgb(43 37 33 / 0.14)`.

Shape rules:

- Major visual and interactive surfaces use the restrained `32px` radius.
- Nested cards use `24px`.
- Compact controls and device chrome use `16px` or less.
- Full pills are reserved for controls whose proportions are genuinely pill-like.
- Mobile layouts keep the same proportions; they do not turn every panel into a capsule.
- Use hierarchy, space, and type before adding another border or card.

## Component language

### Navigation

- A raised-paper island with the JRB monogram and three plain-language destinations.
- The shell floats; it does not become a dense application bar.
- Interaction may reveal the blue monogram layer, but red remains the default identity.

### Links and buttons

- Text links use a quiet oxblood underline with a generous offset.
- Primary actions use oxblood with raised-paper text.
- Secondary actions use paper, a hairline edge, and ink.
- Motion is a small translation, color shift, or one-shot icon response—never a continuous pulse.

### Cards and project artifacts

- Use one strong surface per project, then let its real interface or imagery carry the detail.
- Avoid nested card stacks unless they represent a real product hierarchy.
- Keep captions and dates in the mono layer; keep explanations in Switzer.

### Jordy assistant

- The BLUM wordmark is the sole visible header identity.
- Intro voice is warm, direct, and useful: “Hey — I’m Jordy, Jordan’s assistant. I can give you the quick version of his work, side projects, and background. Pick a question below, or ask your own.”
- Suggestion chips may use Baloo 2; messages stay in Switzer.
- The panel is raised paper with one hairline boundary and one lifted shadow.
- The panel unfolds once from the composer corner; header, conversation, and composer settle in at `40ms` intervals, then reverse cleanly on close.
- The composer stays visually quiet. Internal scrolling remains available without a visible scrollbar.

## Imagery and art direction

- Favor product evidence: real screens, interface fragments, deployment artifacts, diagrams, and working prototypes.
- Use Jordan-shot photography as lived texture and punctuation.
- Crop decisively. Prefer one legible focal point to a mosaic of tiny screenshots.
- Preserve the warm paper around imagery so color feels intentional rather than full-bleed by default.
- Use the illustrated portrait as a characterful anchor, not a repeated avatar.
- Avoid generic stock photography, AI-generated lifestyle scenes, fake device mockups, and decorative imagery that implies work not shown.

## Motion

| Token | Value | Use |
| --- | --- | --- |
| Default easing | `cubic-bezier(0.2, 0.8, 0.2, 1)` | Standard interface motion |
| Fast | `140ms` | Micro-feedback |
| Default | `220ms` | Hover and state changes |
| Slow | `480ms` | Reveals and composed transitions |
| Stagger | `40ms` | Short sequencing between related interface planes |
| Drag settle | Spring, stiffness 320, damping 24 | Direct-manipulation settling |
| Hover translation cap | `4px` | Maximum hover travel |
| Scale cap | `1.02` | Maximum interface scaling |

Motion rules:

- Motion explains state, rewards direct interaction, or introduces an expressive artifact once.
- No scroll-jacking, marquees, typewriters, auto-advancing carousels, or decorative looping motion.
- Do not animate reading text while someone is trying to read it.
- Reduced motion becomes opacity-only at `120ms`; dragging and decorative assembly are disabled.

## Accessibility contract

- Default body copy uses ink on paper; muted ink is not used below body-readable sizes unless the content is supplementary.
- Focus uses a `2px` oxblood outline with a `4px` offset.
- Hairlines are decorative support, not the only indicator of state or grouping.
- Interactive targets remain comfortably touchable; compact visuals may sit inside larger hit areas.
- Reading order and keyboard order remain conventional even when the composition is asymmetric.
- Every meaningful image gets useful alt text. Decorative marks and repeated screenshots use empty alt text or `aria-hidden`.
- The site works without JavaScript for core navigation and reading.
- Light-only styling is declared to browser chrome and native controls.

## Voice

Voice traits: candid, concrete, curious, self-aware, and lightly funny.

Short sentences and contractions are welcome. Explain what a thing does before naming a category. Let the work prove the competence.

| Do | Don't |
| --- | --- |
| Name the interface, tool, flow, or failure mode | Stack vague identities or disciplines |
| Explain the useful outcome in plain language | Say “AI-native,” “bleeding edge,” or “game-changing” |
| Admit when a project is oddly specific | Say “fleet of agents” or “ships fast” |
| Use a small, honest detail to add personality | Lead with commit counts or unexplained conversion statistics |
| Keep photography in the mix without making it the identity | Make every sentence sound like a pitch deck |

Example:

- Prefer: “A personal year in review for your Citi Bike rides.”
- Avoid: “An innovative, data-driven mobility insights platform.”

## Taste dials

| Dial | Setting | Meaning |
| --- | ---: | --- |
| DESIGN_VARIANCE | 7/10 | Expressive compositions and artifacts inside a stable reading system |
| MOTION_INTENSITY | 4/10 | Noticeable but brief, mostly tied to direct interaction |
| VISUAL_DENSITY | 4/10 | Spacious editorial shell with denser evidence only where useful |

## Implementation map

| Concern | Source |
| --- | --- |
| Canonical brand book | Obsidian: `Design/brands/jordanrblum.md` |
| Repo-readable mirror | `docs/brand.md` |
| Generated design tokens | `src/styles/tokens.css` |
| Global typography and primitives | `src/styles/global.css` |
| Identity assets | `src/assets/identity/` |
| Content and project metadata | `src/data/site.ts` |
| Workbench hero | `src/components/HeroShowcase.astro` |
| Navigation identity | `src/components/Nav.astro` |
| Jordy assistant | `src/components/ChatWidget.astro` |

## Machine-readable tokens

```yaml
project: jordanrblum
mode: light-only
palette:
  paper: '#F7F3ED'
  paperRaised: '#FCFAF6'
  ink: '#2B2521'
  inkMuted: '#746960'
  hairline: '#DDD5CB'
  accent: '#9C4037'
  accentContrast: '#FCFAF6'
  success: '#52735B'
  warning: '#A86E32'
  error: '#A3453C'
  safelight: '#E6533D'
type:
  sans: 'Switzer, Switzer Fallback, system-ui, sans-serif'
  serif: 'Fraunces Variable, Georgia, serif'
  mono: 'Geist Mono, ui-monospace, SFMono-Regular, monospace'
  uiAccent: 'Baloo 2, Trebuchet MS, Comic Sans MS, sans-serif'
  weights: [400, 450, 500, 600]
spacing:
  base: 4
  scale: [4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128]
measure:
  content: 672
  wide: 1152
radius: [2, 8, 16, 24, 32, 999]
border:
  width: 1
  color: '#DDD5CB'
shadow:
  small: '0 1px 2px rgb(43 37 33 / 0.08)'
  lifted: '0 18px 50px rgb(43 37 33 / 0.14)'
motion:
  ease: 'cubic-bezier(0.2, 0.8, 0.2, 1)'
  fast: 140ms
  default: 220ms
  slow: 480ms
  stagger: 40ms
  reduced: 120ms
  hoverTranslateMax: 4
  scaleMax: 1.02
dials:
  designVariance: 7
  motionIntensity: 4
  visualDensity: 4
```
