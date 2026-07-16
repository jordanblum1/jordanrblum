# Experience screen provenance

These local images support the Roam work samples on `/about`. The section does not link to the live products, so the visual record remains useful if a public route changes or disappears.

- `roam-marketplace.jpg` was captured from Roam's public Miami map search.
- `roam-listing.jpg` was captured from the public listing shown in that map result. The capture stays on Roam's top-level product UI and photo gallery rather than lower-page agent or MLS details.
- `reed-home.jpg` and `reed-chat.jpg` were captured from Reed's public homepage and unauthenticated buyer-start flow.
- `agent-harness-chat.png` and `agent-harness-subagents.png` were captured from an isolated Mission Control test server. The harness used temporary storage, fake CLIs, and a manually seeded synthetic launch-review transcript; it did not read live Mission Control state.

Do not replace either harness image with a live product screenshot. A replacement must be manually checked for customer data, employee names, repository or branch names, prompts, secrets, URLs, and private metrics, then intentionally update the reviewed SHA-256 assertions in `tests/unit/site-data.test.ts`.

Reviewed SHA-256 values:

- `agent-harness-chat.png`: `c90c191f7be9d612bfff2d2395a18c0ed3b8844780c1e6cc2cd63c9dfccdf182`
- `agent-harness-subagents.png`: `9d0db76b03373a79b3d04cde17e7d736db1e08679c17d2e36f187bfdb76e9ad1`
