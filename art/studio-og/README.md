# Blum Studios social preview

A three-second hybrid ident for freelance software and design: a tactile terracotta BLUM logo lowers and rebuilds while a restrained design cursor selects the artwork. Studios and Software & design remain crisp and fixed. No literal building windows, pasted symbols on letters, tiny dashboards or AI-generated caption text.

## Sources and rights

- Owned `src/assets/identity/blum-mark.svg` and the original vector architectural concept guided the artwork. The result is a reference-led interpretation, not a pixel-exact SVG reproduction.
- Existing licensed `src/assets/fonts/chillax-600.woff2` supplies the native brand/service lettering.
- Higgsfield GPT Image2.5 high2K refined one still (job329bd006-0f72-4110-a59c-16ebf0ed16c0), preserving the logo identity and replacing graphic icons with real inset glass windows, material texture and warm lighting.
- Seedance2.5 used that completed still as both endpoint references for one4-second720p silent construction loop (job4eb70cab-b41b-4c08-82d8-c104b63f7463). A targeted Seedance2.5 video edit then removed the architectural windows while preserving the motion (job8565ad91-c870-4a2e-984a-a9061f5626d0). The current raw97-frame/24fps clip is `seedance-logo-source.mp4`, outside the website's public assets.

The original still/video cost30.75credits. This targeted edit cost31credits (341.20→310.20), for61.75credits total across the two versions, matching observed balances. Prompt/quote/reference/job records and the accepted high-resolution still remain in the external task source archive at `~/.local/share/agent-workflows/studio-building-og-20261105/`. `media.json` pins committed source/output hashes and generation provenance. [Provider output-use guidance](https://higgsfield.ai/creator-hub/help-center/account/who-owns-my-generations-and-can-i-use-them-commercially), checked November5,2026, permits commercial output use. Inputs are first-party; no separate commercial license, project, subscription or account was created.

## Reproduce

`index.jsx` is the complete deterministic Remotion composition. Reuse the isolated pinned Remotion4.0.463/React19.2.6 runtime at `/Users/jordan/projects/output/blum-studios-ads-2026-11-05/runtime/`; it is build-time tooling, not a website dependency. The tested workspace is ignored `output/studio-og/`, with its `node_modules` linked to that runtime and a source copy at `src/index.jsx`. Copy the committed raw clip to `public/source-video.mp4` and Chillax to that `public/` folder. Do not download latest or add Remotion to Astro.

The four-second source plays at4/3speed into a90-frame/30fps/1200×630composition. A final0.2-second blend to a frame-zero Freeze gives the loop its stable opening pose. Video uniformly covers the card. A brief blue vector-selection/cursor gesture frames the art; native Studios and Software & design lettering share the bottom margin. The original architectural windows and pasted letter icons are retired.

```
./node_modules/.bin/remotion render src/index.jsx StudioOG ABSOLUTE/render.mp4 \
  --public-dir=ABSOLUTE/public --codec=h264 --pixel-format=yuv420p \
  --color-space=bt709 --concurrency=1 \
  --browser-executable='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
```

Pass absolute public/output paths so the nested renderer does not discover Astro's public folder. Losslessly remux video with ffmpeg (`-map 0:v:0 -c:v copy -an -movflags +faststart`) into `public/assets/blum-studios/studio-og-v6.mp4`. Decode its first frame into JPEG (`-frames:v 1 -q:v 2`) at `studio-og-v6.jpg`. Validate1200×630,90frames/30fps,3seconds,H264/yuv420p/bt709,no audio,faststart and full decode. Inspect all letter shapes, selection/cursor states, native text, whole-card scale and loop seam. The unit guard verifies source/output hashes. Published v3 remains for cached links; the unshipped v4 icon and v5 window drafts are superseded. Published filenames stay immutable.

## Metadata and limits

Only the studio homepage declares a direct HTTPSMP4 `og:video` with actual MIME/dimensions. Layouts retain a matching JPEG large-image fallback/alt. Tags are server-rendered and consistent across devices; normal visits do not preload/embed either OG asset. The raw generation is not shipped as a public website source.

[Apple TN3156](https://developer.apple.com/documentation/technotes/tn3156-create-rich-previews-for-messages), checked via Savvy Firecrawl November5,2026, documents direct downloadable video metadata, static tags, fallback imagery and a10MB associated-resource guideline. Recipient apps control support, autoplay, reduced-motion preferences and cached-card refresh. X stays `summary_large_image`. Source/browser/native-metadata checks do not prove an actual personal Messages share or every recipient's settings.
