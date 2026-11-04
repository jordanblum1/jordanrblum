# Work media and verification

`/work` is an isolated studio Explore page. The homepage still uses the reviewed bridge composition and Contact morph. Work borrows product scale, solid fields, rail peeks, short headings and clear pill actions and circular browsing controls from [Apple Store](https://www.apple.com/store), checked November 3, 2026, and its installed community analysis. See [the design contract](../studio/DESIGN.md).

The products are Stamp Shift, Alive Still, Birthday, Chicks of NYC and Citi Bike Wrapped, in that order. Design uses owned BLUM and Chicks art. Photos uses `photo0020.jpg` (Cape Town), `photo0030.jpg` (Deadvlei) and `photo0040.jpg` (Rome), each with a visible Jordan Blum Photography watermark. The full images are contained, preserving the watermark. `sunset-beach.jpeg` was rejected because its XMP copyright identifies Michael L. Baird; `chicago-skyline-night.jpg` was excluded because ownership was unverified. No personal contacts or private employer screens are published.

## Phone source contract

Only flattened screen-plus-device WebPs belong in `src/assets/studio-work`. The actual transparent Webmobilefirst iPhone 17 Pro frame stays outside Git at the Stamp Shift vendor path. Its license permits these modified commercial composites and prohibits standalone raw redistribution. Source and license URLs, exact paths, original/output hashes and geometry are recorded in `~/.local/share/agent-workflows/blum-studios-migration/work-media/iphone-composites.json`; the repeatable renderer is `render-iphones.mjs` in that folder.

| Composite | Native screen | Treatment |
| --- | --- | --- |
| Stamp Shift | Route20 board-start from the real 1.0.2b1 native recording, 368×800 | Complete capture, uniformly contained |
| Alive Still | Existing tracked `alive-home.png`, 1206×2622 | Complete capture, uniformly contained |
| Birthday | `output/app-store-carousel/sources/01-birthdays.png`, 1206×2622 | Fictional-contact fixture, uniformly contained |

The frame hash is `4d7b36e5495dfc853ea92f8c9b623eedff7daa7d77c01fa7171807c26616ace6`. Original frame size is389×800; measured screen opening is x17/y14/w355/h772, radius50. Rendering runs at2× and places the full screen beneath the actual frame. There is no UI crop, invented screen, aspect-ratio distortion or procedural hardware shell. Fine frame detail remains limited by the389px licensed original. The renderer uses the existing installed Sharp version; no dependency install, generation or spending was needed.

## Interaction and checks

Categories show one collection with JavaScript; all collections remain browsable without JavaScript. Rails use native touch/trackpad scrolling and scroll snap. The named focusable group supports Left/Right and Home/End. Circular44px controls navigate without wrapping. Project pills open the app overview or actual public website. Contact opens the existing home dialog, and Full portfolio/Procore/Workday retain their public destinations.

Run `pnpm test:studio` for the shared studio and app regressions, including rail boundaries, filters, no-JavaScript navigation, actual composite aspect ratio, reduced motion, contact reachability, desktop/mobile/rotation and320/375px layouts at32px browser fonts. `pnpm typecheck` checks source and tests. `pnpm build:studio` updates the existing preview at `http://127.0.0.1:4338/work` without stopping the warm server.

Visual captures and WebKit touch results live in the external work-media folder. An anti-slop audit after the first composition scored0/10: no gradient/default tech hue, feature tiles, accent rails, blur, fake metrics, icon toppers, center-stack composition, replacement fonts or wrong-surface hero. Redundancy audit retained only the Work heading, category state, project identification/description/action, position controls, published experience and portfolio/contact actions. No testimonials or invented metrics are shown.

Browser checks prove the local rendering and navigation. They do not prove App Store approval, live contact delivery or external destination availability. Publishing remains owned by the migration workflow.

Verified November 3, 2026: shared suite31/31; final Work-focused rerun11/11; TypeScript and whitespace checks pass. Desktop1440×900 keeps the first project action fully visible. Chromium captures cover1440,375,320 and844px rotated layouts; WebKit touch covers375px navigation, Photos and Contact. No page overflow or console/runtime errors were observed. The design YAML parses, all9 token references resolve and card-caption contrasts are5.43:1 or higher. The official designmd CLI is not installed, so validation used the already installed YAML parser and direct contrast/reference assertions without downloading tooling. Fixed-name external captures are overwritten, keeping evidence bounded.
