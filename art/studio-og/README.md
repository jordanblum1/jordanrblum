# Blum Studios social preview

A six-second silent studio postcard: original BLUM mark and concise service promise, genuine Work product composites, slow object motion and an illustrated New York backdrop. The first and last frame have matching geometry. This is link-preview media, separate from the homepage background and the freelance ad.

## Sources and rights

- `src/assets/identity/blum-mark.svg`: owned studio identity; recolored to the existing oxblood.
- `src/assets/fonts/{switzer-400,chillax-600}.woff2`: existing licensed local studio fonts.
- `src/assets/studio-work/{stamp-shift,alive-still,birthday}-iphone.webp`: existing first-party captures with the licensed Webmobilefirst iPhone frame flattened into the image. The complete capture and authentic device are contained uniformly; no standalone vendor frame is distributed. See [Work media](../../docs/studio-work.md).
- `src/assets/projects/peek-citibike.webp`: owned publicly presented Citi Bike Wrapped project.
- `public/assets/blum-studios/journey-poster-landscape.webp`: existing illustrated Williamsburg Bridge; source generation/reference rights in the external media ledger and [home media manifest](../../docs/studio-home-media.json).

No new image generation, fonts, npm dependency, tracking, form behavior or hosting service was introduced. The video cycles actual app composites rather than generating or redrawing UI.

## Reproduce

`index.jsx` is the complete deterministic Remotion composition. Reuse the isolated pinned Remotion4.0.463/React19.2.6 runtime at `/Users/jordan/projects/output/blum-studios-ads-2026-11-05/runtime/`; it is build-time tooling, not a site dependency. Do not download latest or add Remotion to Astro. The tested workspace is ignored `output/studio-og/`, with `node_modules` linked to that runtime, a source copy and the sources above copied into `public/` as `blum.svg`, `city.webp`, `web.webp`, `phone.webp`, `phone-alive.webp`, `phone-birthday.webp` and the original font filenames. The SVG adds only `fill="#9C4037"` on the root.

From that workspace run the installed CLI with explicit absolute `--public-dir` and output paths (Remotion otherwise discovers the ancestor Astro package and serves the wrong public folder):

```
./node_modules/.bin/remotion render src/index.jsx StudioOG ABSOLUTE/render.mp4 \
  --public-dir=ABSOLUTE/public --codec=h264 --pixel-format=yuv420p \
  --color-space=bt709 --concurrency=1 \
  --browser-executable='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
```

Losslessly remux video only using installed ffmpeg (`-map 0:v:0 -c:v copy -an -movflags +faststart`) into `public/assets/blum-studios/studio-og-v2.mp4`. Decode its first frame into JPEG (`-frames:v 1 -q:v 2`) at `studio-og-v2.jpg`. Validate dimensions1200×630,180frames/30fps,6seconds,H264/yuv420p/bt709,no audio,faststart and full decode; inspect the three app states and the loop seam. `media.json` owns source/output hashes and final format evidence. Keep `v2` assets immutable; a later art change needs new filenames because receiving apps cache previews.

## Metadata and limits

Only the studio homepage declares `og:video` with a direct absolute HTTPSMP4 URL, MIME type and actual dimensions. All studio layouts retain a JPEG large-image fallback and alt text, with server-rendered tags and consistent mobile/desktop output. No OG file is embedded/preloaded by a normal page visit, so this change adds no homepage media download.

[Apple TN3156](https://developer.apple.com/documentation/technotes/tn3156-create-rich-previews-for-messages), read through Savvy Firecrawl on November5,2026, documents direct playable/downloadable video metadata, server-rendered tags, an image fallback and a10MB associated-resource guideline. New video+poster remain well below that budget. Its guidance favors graphical imagery and minimal raster text; the card keeps only studio identity and the short service promise, with accessible text metadata. Playback, looping, reduced-motion preferences and refresh caches are controlled by the receiving app. A local/browser pass is not proof that every social network will animate, or that an existing cached Messages thread will refresh. X remains `summary_large_image`; no unsupported universal-video claim is made.
