# Website working instructions

## Stamp Shift changes only

Jordan authorized merges of wholly Stamp Shift-scoped PRs on October28,2026 without a separate human reviewer after a completed thermonuclear review. This exception does not cover mixed or unrelated website changes.

Before merge, freeze base/head and use the installed official Cursor skills `thermo-nuclear-code-quality-review` and `thermo-nuclear-review` (cursor/plugins pin `0f77cd5dab1e006de02d6ad221d5620de026473a`). Require an independent structural review and separate correctness/security verdicts, no unresolved blockers, and required tests/CI passing on that same head. Record the head, rubric revision, verdicts, validation and limitations in the PR. Any head change refreshes the gate. Use an individual admin merge only if the remaining blocker is the human-review requirement; never disable repository-wide protections or fabricate a GitHub approval. Lock merge to the reviewed head.

The detailed contract is maintained in Stamp Shift's `docs/review-and-merge.md`: https://github.com/jordanblum1/stamp-shift/blob/main/docs/review-and-merge.md . Missing/inconclusive review or failing checks is not PASS. Preserve all other authorization gates, including spending, new terms/permissions/data practices and App Review submissions. This is an agent-run process, not an installed unattended merge bot.
