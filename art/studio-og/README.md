# Blum Studios cursor-to-build ident

A three-second story about making digital things. The cursor grabs a logo handle and flattens the terracotta BLUM mark into a draft. It then clicks **Build**: the letters rise in sequence as the button fills, confirms completion and clears to **Studios**. The cursor causes the animation; it is not an idle decorative pointer. No service subtitle, architectural windows, pasted letter symbols or tiny dashboards.

## Direction and sources

[How Figma evolved its visual language](https://www.figma.com/blog/figma-on-figma-evolving-our-visual-language/) describes actions such as selection, activation, manipulation and revealing underlying structure. [Figma Motion](https://www.figma.com/motion/) describes controlled keyframes and reusable motion. Both first-party pages were read through Savvy Firecrawl on November 5, 2026. The causal drag → build → result sequence is our design interpretation, not a copied Figma asset or measured conversion claim.

Owned `src/assets/identity/blum-mark.svg` and the original vector concept guided the generated source. Existing licensed `src/assets/fonts/chillax-600.woff2` supplies native type. No third-party graphics or people are generation inputs. The sculptural interpretation is not a pixel-exact SVG projection.

1. Higgsfield GPT Image2.5 high 2K refined one still: `329bd006-0f72-4110-a59c-16ebf0ed16c0`, quoted 2.75 credits.
2. Seedance2.5 used it as both endpoints for a four-second silent 720p assembly: `4eb70cab-b41b-4c08-82d8-c104b63f7463`, quoted 28 credits.
3. A targeted Seedance2.5 video edit removed literal windows and retained motion: `8565ad91-c870-4a2e-984a-a9061f5626d0`, quoted 31 credits. The current 97-frame/24fps/4.041667-second source is `seedance-logo-source.mp4`, outside public assets.

The observed balances 371.95 → 341.20 → 310.20 match the 61.75-credit total across the two generated versions. This cursor-driven iteration reuses that source and spends no additional generation credits. Exact prompts, quotes, IDs and accepted still remain in `~/.local/share/agent-workflows/studio-building-og-20261105/`. `media.json` pins composition/source/output hashes and provenance. [Provider output-use guidance](https://higgsfield.ai/creator-hub/help-center/account/who-owns-my-generations-and-can-i-use-them-commercially), checked November 5, permits commercial outputs. No new project, subscription or account was created.

## Reproduce

`index.jsx` is the deterministic Remotion composition. Reuse the pinned Remotion4.0.463/React19.2.6 runtime at `/Users/jordan/projects/output/blum-studios-ads-2026-11-05/runtime/`; it is build-time tooling, not a website dependency. The ignored render workspace is `output/studio-og/`, with its `node_modules` linked to that runtime and the source copied to `src/index.jsx`. Copy the committed raw clip to `public/source-video.mp4` and Chillax to the same public folder. Do not install latest or add Remotion to Astro.

A frame-driven Freeze controls source sampling in composition-time units (30fps), not the input's 24fps frame numbers. Dragging advances source time 0 → 1.5 seconds; the button press at composition frame32 releases the 1.5 → 4-second rise. The final 0.2-second blend to source time zero stabilizes the loop. Cursor/handle/progress coordinates are derived from the same composition frame. The button and Studios text have non-overlapping visibility windows.

```
./node_modules/.bin/remotion render src/index.jsx StudioOG ABSOLUTE/render.mp4 \
  --public-dir=ABSOLUTE/public --codec=h264 --pixel-format=yuv420p \
  --color-space=bt709 --concurrency=1 \
  --browser-executable='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
```

Pass absolute public/output paths so the nested renderer does not discover Astro's public folder. Losslessly remux video using ffmpeg `-map 0:v:0 -c:v copy -an -movflags +faststart` into `public/assets/blum-studios/studio-og-v7.mp4`. Decode its first frame into `studio-og-v7.jpg` using `-frames:v 1 -q:v 2`. Validate 1200×630, 90 frames/30fps, three seconds, H264/yuv420p/bt709, no audio, faststart and full decode. Inspect actual drag/press/build/completion states, cursor targets, type, loop seam and compact playback. The unit guard verifies all source/output hashes. Published v3 files remain immutable; unshipped drafts v4–v6 are superseded.

## Metadata and limits

Only the studio homepage declares a direct HTTPS MP4 `og:video` with actual MIME/dimensions. Layouts retain a matching JPEG large-image fallback and alt. Tags are server-rendered and consistent across devices; normal visits do not preload/embed OG assets. The source clip is not a public website asset.

[Apple TN3156](https://developer.apple.com/documentation/technotes/tn3156-create-rich-previews-for-messages), checked via Savvy Firecrawl November 5, documents direct downloadable video metadata, static tags, fallback imagery and a 10MB associated-resource guideline. Recipient apps control support, autoplay, reduced-motion behavior and cached-card refresh. X stays `summary_large_image`. Source/browser/native-metadata checks do not prove a personal Messages share or every recipient's settings.
