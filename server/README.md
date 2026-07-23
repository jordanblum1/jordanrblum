# Chat backend

The AWS Lambda backend for the "Jordan's assistant" chat widget on
[blumjordan.com](https://blumjordan.com). A Node 22 Lambda using
[response streaming](https://docs.aws.amazon.com/lambda/latest/dg/configuration-response-streaming.html)
to serve Server-Sent Events to the browser.

## Architecture

```
Browser (chat widget)
  └─ POST https://<site>/api/chat  (CloudFront /api/* behavior, no cache, OAC)
       └─ Lambda Function URL (InvokeMode: RESPONSE_STREAM, CORS)
            └─ handler.ts
                 ├─ validate body (size/shape caps)
                 ├─ rate limit (DynamoDB, per client-IP hash)
                 ├─ agent.ts — @anthropic-ai/sdk tool runner, streams `text_delta`s as SSE
                 │    └─ reveal_email tool → lib/tools/revealEmail.ts enforces the gate
                 └─ transcripts.ts — PutObject full conversation JSON to S3 (awaited
                    before the response stream closes)
```

Resume requests use the same Lambda and `/api/*` behavior:

```
Jordy calls offer_resume
  └─ SSE resume_offer event renders the download card
       └─ POST /api/resume/download → bundled one-page PDF
```

The PDF is bundled with the Lambda rather than placed in the static site's
`public/` directory. Visitors who ask Jordy for the resume can download it
immediately without submitting personal information.

Request contract: `POST` body `{ conversationId: string, messages: [{ role: 'user' | 'assistant', content: string }, ...] }`.
Response is `text/event-stream`, one JSON object per `data:` line:

- `{"type":"delta","text":"..."}` — an incremental chunk of the assistant's reply
- `{"type":"resume_offer"}` — render the resume download card after the reply
- `{"type":"done"}` — the turn is complete
- `{"type":"error","code":"rate_limited" | "invalid_input" | "internal_error"}`

## The system prompt and the email address

`src/generated/bio.ts` is a **checked-in, generated file**. It's produced by
`pnpm generate:bio` (also runs as the first step of `pnpm build`), which reads
`../src/data/site.ts` and `../public/llms.txt`, assembles Jordan's bio, and
**strips every email address and `mailto:` link** before writing the file.
`lib/systemPrompt.ts` builds the assistant's system prompt from that redacted
bio plus a short persona — the email address never appears in it. This is
covered by `tests/unit/systemPrompt.test.ts`, which asserts the literal email
string (and any `mailto:`) never appears in the assembled prompt or the
generated bio, even if `CONTACT_EMAIL` happens to be set to it.

The system prompt block is sent with a `cache_control: { type: "ephemeral" }`
breakpoint so repeat turns in the same conversation reuse the cached prefix.

If `src/data/site.ts` or `public/llms.txt` change, re-run `pnpm generate:bio`
and commit the updated `src/generated/bio.ts`.

## The `reveal_email` tool and its gate

The model may call `reveal_email` whenever a visitor asks how to reach Jordan.
The model itself decides *when* to call it; the **handler** decides whether a
call actually reveals anything (`lib/tools/revealEmail.ts`):

1. At least 2 prior visitor (user-role) turns must exist in the conversation.
2. A **global** daily cap of 20 reveals (across all conversations) enforced via
   an atomic conditional increment on the `RATE_TABLE` DynamoDB table.
3. The email value is read **only** from the `CONTACT_EMAIL` environment
   variable — it is never a prompt or code constant.
4. Every reveal attempt (allowed or denied) is logged into `revealEvents` on
   the conversation's transcript, with a timestamp and reason.

On denial, the tool returns a refusal instruction the model uses to explain
itself; it never fabricates its own excuse tied to the specific policy
detail.

## Environment variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | yes | — | Anthropic API credential |
| `CHAT_MODEL` | no | `claude-haiku-4-5-20251001` | Model used for chat turns |
| `CHAT_MAX_TOKENS` | no | `1200` | `max_tokens` per turn |
| `CONTACT_EMAIL` | yes (for reveal to work) | — | The only source of the email address the model may share |
| `TRANSCRIPTS_BUCKET` | yes | — | S3 bucket transcripts are written to |
| `RATE_TABLE` | yes | — | DynamoDB table used for both per-IP rate limiting and the global reveal cap |

## Model choice and response examples

Haiku 4.5 is the default. The system prompt gives it an information map, an
explicit response-shape playbook, and reference answers for quick summaries,
short lists, technical explanations with team attribution, detailed answers,
missing facts, off-topic redirects, and tool-driven requests.

On the first backend deploy after this change, the workflow migrates a Lambda
still using the old `claude-sonnet-5` default to Haiku. It reads the existing
environment and changes only `CHAT_MODEL`, preserving credentials and all
other values. An existing non-legacy custom model is left unchanged.

To change models later, run the **Chat backend** workflow manually and provide
the desired Claude API model ID in `chat_model`. The workflow updates the
complete environment safely; direct `update-function-configuration` calls
replace the whole `Environment.Variables` map rather than merging it.

## Reading transcripts

Transcripts are written to `s3://$TRANSCRIPTS_BUCKET/transcripts/YYYY-MM-DD/{conversationId}.json`,
one object per completed turn (each turn's PutObject overwrites the previous
one for that conversation with the full, updated history). Each object
contains `conversationId`, `messages`, `assistantReply`, `model`, `ipHash`,
`startedAt`, `finishedAt`, and `revealEvents`.

```sh
aws s3 ls s3://<bucket>/transcripts/2026-07-21/
aws s3 cp s3://<bucket>/transcripts/2026-07-21/<conversationId>.json - | jq .
```

## Running tests

From this directory (or via the repo-root `pnpm -r test:unit`):

```sh
pnpm install
pnpm test:unit
```

Anthropic and AWS SDK clients are mocked (`aws-sdk-client-mock`, a fake
`@anthropic-ai/sdk` module) — no network access or credentials required to
run the suite.

## Building

```sh
pnpm build
```

Runs `generate:bio`, type-checks with `tsc`, then bundles `src/handler.ts`
with esbuild into `dist/index.js` (a single CommonJS file, Node 22 target),
then copies the bundled PDF beside it — the two artifacts the deploy workflow
zips and uploads to Lambda.

## Infrastructure

Provisioning and deploys run entirely through
[`.github/workflows/chat-backend.yml`](../.github/workflows/chat-backend.yml)
— there is no local `aws` CLI dependency for this project:

- **`provision`** (`workflow_dispatch`, manual): idempotently creates/updates
  the Lambda function, its Function URL (`RESPONSE_STREAM` + CORS), the
  transcripts S3 bucket, the DynamoDB rate/reveal table, the IAM role, and the
  CloudFront `/api/*` behavior on distribution `E2S9S3SPS1S2DW`.
- **`deploy`**: on pushes to `master` touching `server/**`, builds and
  uploads the new Lambda code.

See that workflow file for the exact resource names and required secrets.
