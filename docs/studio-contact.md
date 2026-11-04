# Studio contact operations

The static studio form sends JSON to `https://jordanblum.com/api/studio/contact`, served by the existing personal-site Lambda. Messages are stored in the existing Chicks of NYC Neon database, in the private `blum_studio_contact.messages` table. After a valid created or duplicate save, the Lambda sends a private notification through Amazon SES to `hi@jordanblum.com`, with the normalized visitor address as Reply-To. This route does not subscribe anyone to marketing or write chat transcripts. The visible email link is a separate fallback.

## Runtime contract

Only POST requests from the exact studio apex/www HTTPS origins may write. Required headers are `Content-Type: application/json`, UUID `Idempotency-Key` and `x-amz-content-sha256` containing the lowercase SHA-256 of the exact UTF-8 JSON body. Fields are name, email, message and optional website honeypot. The decoded body is capped at 8KiB; names at 100 characters, email at 254 and messages at 10–4000 Unicode code points. The browser's UTF-16 maxlength is intentionally stricter for astral characters.

Created messages return 201; the same key and normalized content return 200 without another row; a reused key with different content returns 409. Invalid input returns 400/413/415, rate limiting returns 429 and unavailable storage or notification returns 503. The existing Dynamo limiter permits five valid attempts per hourly network-hash bucket, including retries. It does not store raw IP addresses. Function URL configuration owns CORS; the contact handler independently checks the origin before accepting a write. Browser preflight is handled by Function URL, not by the application handler.

The database save always finishes before notification. A notification failure returns 503 but leaves the saved message intact; retrying the same key and content reuses that row and attempts notification again. A Dynamo receipt keyed by `CONTACT_EMAIL#<idempotency UUID>` uses a 60-second conditional lease to reject concurrent retries, retains a sent marker for 30 days and skips another send when that marker exists. The lease must remain longer than the Lambda's deployed 30-second timeout so a stalled counter or send cannot outlive delivery ownership. Failed sends release only their own lease. A separate atomic counter caps SES send attempts at 50 per UTC day while the existing five-per-network hourly limit remains unchanged.

The SES request explicitly selects the verified `jordanblum.com` identity ARN that the execution-role policy authorizes, even when an individual email identity also exists. SES sends one fixed plain-text message from `Blum Studios <hi@jordanblum.com>` to `hi@jordanblum.com`; the body contains only the submitted name, normalized email, message and UUID reference. The application does not log the message body or other submitted contact data. Infrastructure failures log only a fixed operation stage and an allowlisted error name; provider messages and stacks stay excluded. The SDK performs one bounded provider attempt. If SES accepts a message but its acknowledgement or the subsequent sent-marker write is lost, a later retry can rarely deliver a duplicate; the receipt deliberately does not claim provider-level exactly-once delivery.

The private HTTP Tailscale preview verifies visual states. It is not an approved API origin or a secure browser context for purchase/contact credentials. Verify real form delivery on the HTTPS production origin; do not widen CORS for the preview.

## Database and credentials

The canonical DDL and restricted-role recipe are in [server/db/contact](../server/db/contact). The schema is already applied; do not rerun the raw DDL as a startup migration. The operational proof records the actual target and schema checksum. Never change shared database grants automatically.

The dedicated `blum_studio_contact` runtime login owns no objects. It has schema usage, table SELECT/INSERT and UPDATE only on request_fingerprint for atomic idempotency. It cannot read Chicks/waitlist tables, delete messages, change content or create objects. A privileged operator handles approved retrieval/deletion separately; never put the owner connection in Lambda or public code.

`CONTACT_DATABASE_URL` is a GitHub repository secret merged into the existing Lambda environment by the trusted self-hosted Chat backend workflow. Missing optional secret preserves the existing value. An unreadable existing environment must abort deployment rather than replace unrelated settings. No connection string belongs in logs, screenshots, PR text or command arguments.

Notification uses the Lambda's existing AWS credentials, not an OAuth token or API secret. The deploy workflow converges a separate scoped mail policy: SES `SendEmail` is limited to the verified `jordanblum.com` identity and the fixed sender/recipient, and Dynamo `GetItem` is limited to the `CONTACT_EMAIL#*` receipt prefix. Existing `UpdateItem` permission covers leases, receipts and counters. Verify the SES domain identity and DKIM before enabling delivery.

## Release verification

1. Run unit tests, TypeScript/build and the studio browser suite. Fixture successes prove protocol and UI states only.
2. Deploy the reviewed Lambda through the self-hosted workflow; verify Function URL CORS permits studio origins and all three request headers, with a single ACAO response header.
3. On the real HTTPS studio page, send one synthetic inquiry from an address the operator controls, repeat its exact key/body, and verify 201 then 200, one table row and one received notification. Record only the UUID and delivery status in the external receipt.
4. With the restricted runtime login, verify forbidden reads/deletes still fail. A privileged operator removes only the recorded synthetic UUID/key. Record status/row counts, never message bodies or secrets, in the external delivery receipt.

For authorized owner retrieval, use an existing private operator connection and an explicit date window, for example `SELECT id,name,normalized_email,message,submitted_at FROM blum_studio_contact.messages WHERE submitted_at >= $1 ORDER BY submitted_at DESC LIMIT 50`. Keep results private. A deletion request uses the verified email and exact record IDs; inspect before deleting. No public admin endpoint is provided.

Rollback restores the prior static site and Lambda bundle while preserving the table and messages. App routes, waitlists, ad destinations and existing chat/email/resume tools remain independent.
