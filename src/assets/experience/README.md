# Experience screen provenance

These local images and the public video assets in `public/media/` support the Roam work samples on `/about`. The section does not link to the live products, so the visual record remains useful if a public route changes or disappears.

- `roam-calculator-authenticated.webp` is the authenticated 1280×800 calculator still rendered on `/about`. It shows the full desktop navigation—including Account—the assumable 3.96% payment, yearly savings, and both calculator sliders.
- `public/media/roam-search-mobile.*` is the rendered 390×844 Austin search recording. It is a true 25 fps browser recording normalized to 30 fps for delivery, opens the mobile filter sheet, applies a 3.5% maximum rate, and scrolls the filtered results. The WebM and MP4 encodes share `roam-search-mobile-poster.webp` and fit the inline SVG phone frame without cropping or blank page space.
- `public/media/roam-search.*`, `public/media/roam-calculator.*`, and `public/media/roam-calculator-mobile.*` remain committed as optional authenticated alternates, but are not rendered so the current presentation stays focused.
- `scripts/record-roam-demos.mjs` regenerates the authenticated desktop search and calculator captures at 30 fps, along with WebP posters and MP4 fallbacks when the selected ffmpeg build includes `libx264`. `ROAM_STORAGE_STATE` is required and must point to a deliberately exported Playwright storage-state file; the script never reads the in-app browser's session.
- `reed-home.jpg` and `reed-chat.jpg` were captured from Reed's public homepage and unauthenticated buyer-start flow.
- `agent-harness-chat.png` and `agent-harness-subagents.png` were captured from an isolated Mission Control test server. The harness used temporary storage, fake CLIs, and a manually seeded synthetic launch-review transcript; it did not read live Mission Control state.

Do not replace either harness image with a live product screenshot. A replacement must be manually checked for customer data, employee names, repository or branch names, prompts, secrets, URLs, and private metrics, then intentionally update the reviewed SHA-256 assertions in `tests/unit/site-data.test.ts`.

Reviewed SHA-256 values:

- `agent-harness-chat.png`: `c90c191f7be9d612bfff2d2395a18c0ed3b8844780c1e6cc2cd63c9dfccdf182`
- `agent-harness-subagents.png`: `9d0db76b03373a79b3d04cde17e7d736db1e08679c17d2e36f187bfdb76e9ad1`
