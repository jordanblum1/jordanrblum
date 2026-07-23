# Font assets and licensing

Only fonts with verified web-use rights belong in this directory. An approved
design-system candidate is not automatically approved for bundling or deployment.

## Shipped fonts

| Asset | Family | Source and permission record |
| --- | --- | --- |
| `super-bouncer-400.woff2` | Super Bouncer Regular | [DaFont source](https://www.dafont.com/super-bouncer.font), by fsuarez913. The author's July 14, 2026 note says, “Free for personal use & commercial use.” Downloaded July 23, 2026 and converted from the supplied TTF to WOFF2 without subsetting or changing outlines. SHA-256: `0b55346d44cabd625bcd4905859d02cc137fe6d065e87fbceb1984c20f5b13a7`. |

The existing Switzer files predate this registry. Their source and implementation
history are documented in `docs/superpowers/plans/2026-07-14-darkroom-redesign.md`.

## Active remote webfonts

| Family | Loading and permission record |
| --- | --- |
| Chillax Semibold | [Fontshare source](https://www.fontshare.com/fonts/chillax/), by Indian Type Foundry under the [ITF Free Font License](https://www.fontshare.com/licenses/itf-ffl). Activated July 23, 2026 through Fontshare's hosted CSS API: `https://api.fontshare.com/v2/css?f[]=chillax@600&display=swap`. Used only through `--font-personality`. |

## Saved candidates

| Family | Intended use | Licensing gate |
| --- | --- | --- |
| [Lemon Milk](https://www.dafont.com/lemon-milk.font) | Geometric heading | Donationware: record commercial/web permission before bundling. |
| [Creamy Chicken](https://www.dafont.com/creamy-chicken.font) | Graffiti accent | Personal use only: buy and record commercial/promotional web rights. |
| [Boring Time](https://www.dafont.com/boring-time.font) | Legible semi-graffiti display | Personal use only: buy and record commercial/promotional web rights. |
| [Akira Expanded](https://www.dafont.com/akira-expanded.font) | Expanded heading | DaFont download is a personal-use demo: buy and record full commercial/web rights. |
| [Coolvetica](https://www.dafont.com/coolvetica.font) | Retro display sans | Free desktop license does not cover live web embedding: buy and record a webfont license. |

## Fontshare alternatives

These web-ready alternatives are approved for later use:

| Original direction | Alternative | Preferred weight |
| --- | --- | --- |
| Lemon Milk | [Clash Display](https://www.fontshare.com/fonts/clash-display/) | 600–700 |
| Creamy Chicken | [Sharpie](https://www.fontshare.com/fonts/sharpie/) | 700–900 |
| Boring Time | [Pally](https://www.fontshare.com/fonts/pally/) | 700 |
| Akira Expanded | [Panchang](https://www.fontshare.com/fonts/panchang/) | 700–800 |
| Coolvetica | [Chillax](https://www.fontshare.com/fonts/chillax/) | 600; active as `--font-personality` |

These families use Fontshare's ITF Free Font License. Activate them with
Fontshare's hosted CSS API, which is the license's intended web-serving path. Do
not copy the proprietary downloads into this repository. Keep the exact API URL
and activation date in this file when a family begins shipping.

When a gated font is licensed, keep its proof of license outside the public
repository, add only the licensed webfont files here, record their hashes and
terms in this file, then expose the family through a semantic token in
`src/styles/tokens.css`.
