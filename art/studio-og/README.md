# Blum Studios social preview

A three-second silent full-card brand animation. The existing BLUM mark fills the artwork; four original letter groups gently press into warm paper while an original blue drafting pencil draws an underline. Large Studios lettering completes the identity. Every frame is readable, and frame0/89have matching geometry. There are no small phone screenshots, product collages, subtitles or personal contact details. This is link-preview media, separate from the homepage background and freelance ad.

## Sources and rights

- `src/assets/identity/blum-mark.svg`: owned studio identity, split into its four existing letter groups and recolored to the existing oxblood. Geometry is preserved.
- `src/assets/fonts/chillax-600.woff2`: existing licensed local studio font.
- Pencil paths: original vector artwork inside `index.jsx`; no external stock, vendor device art or generated image.

No new generation credits, fonts, npm/site dependency, tracking, form behavior or hosting service. The earlier small product-card concept was rejected; only the large v3 assets are shipped by this PR.

## Reproduce

`index.jsx` is the complete deterministic Remotion composition. Reuse the isolated pinned Remotion4.0.463/React19.2.6 runtime at `/Users/jordan/projects/output/blum-studios-ads-2026-11-05/runtime/`; it is build-time tooling, not a site dependency. Do not add Remotion to Astro or download latest. The tested workspace is ignored `output/studio-og/`, with `node_modules` linked to that runtime and a source copy at `src/index.jsx`.

Copy Chillax into its `public/`. Extract the four `<g>...</g>` blocks from the source logo in order; wrap each in `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576.87 290" fill="#9C4037">` and save as `public/letter-0.svg` through `letter-3.svg`. No geometry transformation is needed.

From that workspace run the installed CLI with explicit absolute public/output paths (a nested render folder otherwise discovers the ancestor Astro package's public folder):

```
./node_modules/.bin/remotion render src/index.jsx StudioOG ABSOLUTE/render.mp4 \
  --public-dir=ABSOLUTE/public --codec=h264 --pixel-format=yuv420p \
  --color-space=bt709 --concurrency=1 \
  --browser-executable='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
```

Losslessly remux only video with installed ffmpeg (`-map 0:v:0 -c:v copy -an -movflags +faststart`) into `public/assets/blum-studios/studio-og-v3.mp4`. Decode the first frame into JPEG (`-frames:v 1 -q:v 2`) at `studio-og-v3.jpg`. Validate1200×630,90frames/30fps,3seconds,H264/yuv420p/bt709,no audio,faststart and full decode; inspect the pencil path, whole-card scale and loop seam. `media.json` owns source/output hashes and final format. Keep published filenames immutable; subsequent art needs a new version because receiving apps cache previews.

## Metadata and limits

Only the studio homepage declares `og:video` with a direct absolute HTTPSMP4 URL, MIME and actual dimensions. Studio layouts retain the matching JPEG large-image fallback/alt text. Tags are static and consistent for mobile/desktop; normal site visits do not embed/preload either OG asset.

[Apple TN3156](https://developer.apple.com/documentation/technotes/tn3156-create-rich-previews-for-messages), read via Savvy Firecrawl November5,2026, documents direct playable/downloadable video metadata, server-rendered tags, image fallbacks and a10MB associated-resource guideline. Its imagery guidance favors minimal raster text; this card carries only the identity, with an accessible descriptive title/alt. New video+poster remain well below the budget. Recipient apps control support, autoplay, reduced-motion preferences and cached-link refresh. X remains `summary_large_image`. Browser/source QA does not prove every social network animates or an old Messages thread refreshes.
