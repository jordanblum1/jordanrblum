# Visitor spray wall

The portfolio footer keeps a visitor's paint in `localStorage` under
`jrb-spray-wall-v1`, as a downscaled transparent WebP (PNG fallback). It restores
on page load, stays visible after putting the can away, and scales with the
footer. No paint is uploaded, shared with other visitors, or sent to analytics.
Storage is specific to this browser/profile and site origin; clearing site data
removes it. If storage is blocked or full, painting still works for the current
page but may not survive a reload.

When saved paint exists, the can becomes available after that image finishes
decoding. A decode error releases the can too. This prevents a quick new stroke
or reload from overwriting a partially restored wall.

Clear wall removes the saved paint immediately, cancels drips and the current
stencil round, and wipes the visitor layer while a painter crosses the wall.
The original mural is a separate image and stays intact. Leaving, resizing,
putting the can away, or enabling Reduce Motion finishes cleanup immediately.
Undo cancels outstanding drips before restoring its single-stroke snapshot.

`src/assets/spray/mural-painter.svg` is a reusable transparent illustration
generated with Higgsfield GPT Image 2.6 for this interaction (job
`f6988d4b-a658-44ce-a568-1fba4e9322c8`; quoted cost 1.5 credits). Its vector
art is loaded as an image, with no external resources or scripts. The cleanup
motion uses browser animation APIs, so it follows the actual visitor paint
without generating or uploading a visitor-specific video.

Focused regression: `pnpm exec playwright test tests/e2e/spray-wall.spec.ts`.
Existing footer/control regression: `tests/e2e/eggs.spec.ts`. Check desktop and
compact screens with real pointer input, reload before arming, Clear wall,
Escape during cleanup, keyboard focus, and Reduce Motion.
