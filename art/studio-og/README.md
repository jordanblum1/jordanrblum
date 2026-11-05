# Blum Studios social preview

A three-second Remotion building animation. The original BLUM letter shapes become an architectural studio: blueprint outlines rise into solid letter-buildings, then code and vector-design windows light up. Large Studios lettering anchors the frame. The brand fills the1200×630artwork; there are no small device screenshots, product collages or extra service copy. Frame0/89match, and the JPEG fallback matches the first decoded video frame.

## Sources and rights

- `src/assets/identity/blum-mark.svg`: owned studio identity. `logo-paths.json` preserves its four path definitions exactly; only the projection/extrusion changes.
- `src/assets/fonts/chillax-600.woff2`: existing licensed local studio font.
- Building projection, blueprint, windows and code/design symbols: original SVG/Remotion artwork in `index.jsx`.

No generation credits, new fonts, npm/site dependency, tracking, form behavior or hosting service. Published v3 files stay available for cached previews; only v4 is advertised by the new metadata. This is share-preview media, separate from the homepage background and freelance ad.

## Reproduce

`index.jsx` and `logo-paths.json` are the complete deterministic Remotion composition. Reuse the isolated pinned Remotion4.0.463/React19.2.6 runtime at `/Users/jordan/projects/output/blum-studios-ads-2026-11-05/runtime/`; it is build-time tooling, not a site dependency. The tested workspace is ignored `output/studio-og/`, with `node_modules` linked to that runtime and both source files copied into `src/`. Copy Chillax into its `public/`. Do not add Remotion to Astro or download latest.

The letter roofs use one affine projection. An SVG vertical dilation and offset extrude continuous walls without a stepped silhouette. A mask excludes the roofs from five window panels. Staggered Remotion springs raise the letters; the final portion returns smoothly to the blueprint before the loop rebuilds. Code/design artwork is confined to the two broad studio windows.

From the workspace run the installed CLI with explicit absolute public/output paths (a nested render folder otherwise discovers the ancestor Astro package's public folder):

```
./node_modules/.bin/remotion render src/index.jsx StudioOG ABSOLUTE/render.mp4 \
  --public-dir=ABSOLUTE/public --codec=h264 --pixel-format=yuv420p \
  --color-space=bt709 --concurrency=1 \
  --browser-executable='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
```

Losslessly remux video with ffmpeg (`-map 0:v:0 -c:v copy -an -movflags +faststart`) into `public/assets/blum-studios/studio-og-v4.mp4`. Decode the first frame into JPEG (`-frames:v 1 -q:v 2`) at `studio-og-v4.jpg`. Validate1200×630,90frames/30fps,3seconds,H264/yuv420p/bt709,no audio,faststart and full decode. Inspect blueprint readability, smooth wall edges, code/design windows, large-card scale and the loop seam. `media.json` owns source/output hashes and actual format. `studio-og.test.ts` guards logo-path fidelity and asset/source hashes. Published filenames remain immutable.

## Metadata and limits

Only the studio homepage declares `og:video` with a direct absolute HTTPSMP4 URL, MIME and actual dimensions. Studio layouts retain a matching JPEG large-image fallback/alt. Tags are static and consistent for mobile/desktop; normal visits do not embed/preload either OG asset.

[Apple TN3156](https://developer.apple.com/documentation/technotes/tn3156-create-rich-previews-for-messages), checked via Savvy Firecrawl November5,2026, documents direct playable/downloadable video metadata, server-rendered tags, image fallbacks and a10MB associated-resource guideline. Its imagery guidance favors minimal raster text; this card carries only studio identity and graphical work symbols, with descriptive accessible metadata. Recipient apps control support, autoplay, reduced-motion preferences and cached-link refresh. X remains `summary_large_image`. Browser/source/native-metadata verification does not prove every client animates or an old Messages thread refreshes.
