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

The painter is generated with Higgsfield GPT Image 2.6 using the site's
illustrated portrait and existing public gallery portrait at Jordan's request.
His red French chore coat, white double-knee painter's workwear pants, Cubs cap
and navy Converse come from the animated generation, including moving arms,
hands, knees and roller strokes. Job `00989fc8-602f-42ba-bc97-9e36a66a47d1`
quoted 1.5 credits. The provider returned sixteen 80ms frames despite a requested
36; the checked-in animation uses the actual decoded frames.

Run `node scripts/prepare-painter-motion.mjs` to rebuild the atlas and metadata
from `src/assets/spray/source/jordan-painter-workwear.gif`. The browser plays
two cycles at 100ms/frame (3.2 seconds), with the wipe aligned to the roller.
Frames start at zero on every Clear and all animations stop on cancellation.
The atlas loads after opening the spray tools, only when motion is allowed;
Clear waits for decoding and clears safely if loading fails. Escape can finish
while decoding is pending without letting that old load affect a later Clear.
Visitor artwork never goes to the generator or server.

The labeled Clear control has its own hover/press roller motion, then lifts the
roller when clicked. `clear-roller.webp` was extracted from the matching
transparent sheet (job `bffc9993-22ea-4889-8894-8e9f1649a7f6`, 1.5 quoted
credits; source rectangle x712/y190/w257/h340). The original reference sheet is
retained with the task media in the private agent workspace. No visitor-specific
video is generated or uploaded.

Focused regression: `pnpm exec playwright test tests/e2e/spray-wall.spec.ts`.
Existing footer/control regression: `tests/e2e/eggs.spec.ts`. Check desktop and
compact screens with real pointer input, reload before arming, Clear wall,
Escape during cleanup, keyboard focus, and Reduce Motion.
