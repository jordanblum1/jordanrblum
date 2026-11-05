# Blum Studios canvas-to-3D ident

A fresh three-second illustration of making a logo on a creative canvas. The cursor snaps the M into the flat BLUM mark, then grabs the grouped selection and lifts every letter into a solid terracotta shape. All four letters reach full depth at frame47 and remain complete through frame89: a 43-frame/1.43-second hold. No Build button, service subtitle or architectural windows.

## Why this source changed

The earlier generated motion left the M looking unfinished. This version constructs real extruded geometry from all four original `src/assets/identity/blum-mark.svg` paths. The M's complete outline and depth are controlled directly, with one shared lift value for every letter. `motion.js` owns placement/lift timing; regression checks guard the complete-result hold and exact path inputs. Beveled edges, matte grain, warm material and soft shadows retain the sculptural style.

[Figma’s visual-language case study](https://www.figma.com/blog/figma-on-figma-evolving-our-visual-language/) and [Figma Motion](https://www.figma.com/motion/) informed the selection/manipulation story. Both first-party pages were read through Savvy Firecrawl on November5,2026. This is an original studio identity illustration, not a Figma recording, integration or copied interface.

## Sources and runtime

- Owned SVG paths and the existing licensed Chillax font. `logo-paths.json` is an exact extraction of the four source paths, verified against the SVG.
- Existing Three.js0.185.1, Remotion4.0.463 and React19.2.6. No new package, website dependency, model generation, upload, subscription or credit spend was needed.
- `logo-scene.js` creates the geometry, lighting, projection and pointer targets. Mirroring happens in the SVG transform before extrusion, preserving cap winding. The installed SVGLoader's `path.toShapes()` avoids its deprecated wrapper.
- `index.jsx` renders the local WebGL canvas and vector editing overlay; none of this runtime ships to the website. Public visitors receive only the final MP4 or JPEG when a share client requests it.

`media.json` pins current source/output hashes and actual media properties. Published v3/v7 files remain unchanged for cached links. `seedance-logo-source.mp4` remains the earlier published v7 source; the new composition does not read or sample it. Historical generation provenance remains in Git and the prior task receipt.

## Reproduce

Use the isolated pinned runtime at `/Users/jordan/projects/output/blum-studios-ads-2026-11-05/runtime/`. The ignored workspace `output/studio-og/` links its node_modules to that runtime; the existing repo installation supplies Three.js0.185.1. Copy index.jsx, logo-scene.js, motion.js and logo-paths.json into its src folder, and Chillax into its public folder. No latest/download step is required.

```
./node_modules/.bin/remotion render src/index.jsx StudioOG ABSOLUTE/render.mp4 \
  --public-dir=ABSOLUTE/public --codec=h264 --pixel-format=yuv420p \
  --color-space=bt709 --concurrency=1 --gl=angle \
  --browser-executable='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
```

Use absolute output/public paths to avoid ancestor Astro discovery. WebGL runs only while rendering locally. Losslessly remux using ffmpeg `-map 0:v:0 -c:v copy -an -movflags +faststart` into `public/assets/blum-studios/studio-og-v8.mp4`. Decode frame72 (`-vf 'select=eq(n\,72)' -frames:v 1 -q:v 2`) to studio-og-v8.jpg. The poster intentionally shows the complete result, rather than the flat opening draft.

Validate 1200×630,90frames/30fps,three seconds,H264/yuv420p/bt709,no audio,faststart and full decode. Inspect the actual M placement, pointer-to-handle attachment, 3D lift, complete held result and compact playback. The loop holds the finished mark, then cuts back to the editing draft on replay; it does not blend away an unfinished M or claim a seamless geometry loop. Failed renders must not promote a prior output file: inspect the successful current render before replacing exports.

## Delivery limits

Only the studio homepage declares server-rendered direct HTTPS MP4 og:video with actual MIME/dimensions. A matching JPEG result poster and accessible alt remain available; normal page visits do not preload/embed OG artwork. Homepage body, contact flow and app pages are unchanged.

[Apple TN3156](https://developer.apple.com/documentation/technotes/tn3156-create-rich-previews-for-messages), read via Savvy Firecrawl November5, documents direct video metadata and image fallbacks. Recipient apps control support, autoplay, reduced-motion behavior and cached-card refresh. X stays summary_large_image. Browser/native-metadata checks do not prove a personal Messages share or every recipient's settings.
