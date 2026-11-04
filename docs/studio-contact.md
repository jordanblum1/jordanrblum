# Studio contact operations

The static studio form sends JSON to `https://jordanblum.com/api/studio/contact`, served by the existing personal-site Lambda. Messages are stored in the existing Chicks of NYC Neon database, in the private `blum_studio_contact.messages` table. This route does not send email, subscribe anyone to marketing or write chat transcripts. The visible email link is a separate fallback.

## Runtime contract

Only POST requests from the exact studio apex/www HTTPS origins may write. Required headers are `Content-Type: application/json`, UUID `Idempotency-Key` and `x-amz-content-sha256` containing the lowercase SHA-256 of the exact UTF-8 JSON body. Fields are name, email, message and optional website honeypot. The decoded body is capped at 8KiB; names at 100 characters, email at 254 and messages at 10–4000 Unicode code points. The browser's UTF-16 maxlength is intentionally stricter for astral characters.

Created messages return 201; the same key and normalized content return 200 without another row; a reused key with different content returns 409. Invalid input returns 400/413/415, rate limiting returns 429 and unavailable storage returns 503. The existing Dynamo limiter permits five valid attempts per hourly network-hash bucket, including retries. It does not store raw IP addresses. Function URL configuration owns CORS; the contact handler independently checks the origin before accepting a write. Browser preflight is handled by Function URL, not by the application handler.

The private HTTP Tailscale preview verifies visual states. It is not an approved API origin or a secure browser context for purchase/contact credentials. Verify real form delivery on the HTTPS production origin; do not widen CORS for the preview.

## Database and credentials

The canonical DDL and restricted-role recipe are in [server/db/contact](../server/db/contact). The schema is already applied; do not rerun the raw DDL as a startup migration. The operational proof records the actual target and schema checksum. Never change shared database grants automatically.

The dedicated `blum_studio_contact` runtime login owns no objects. It has schema usage, table SELECT/INSERT and UPDATE only on request_fingerprint for atomic idempotency. It cannot read Chicks/waitlist tables, delete messages, change content or create objects. A privileged operator handles approved retrieval/deletion separately; never put the owner connection in Lambda or public code.

`CONTACT_DATABASE_URL` is a GitHub repository secret merged into the existing Lambda environment by the trusted self-hosted Chat backend workflow. Missing optional secret preserves the existing value. An unreadable existing environment must abort deployment rather than replace unrelated settings. No connection string belongs in logs, screenshots, PR text or command arguments.

## Release verification

1. Run unit tests, TypeScript/build and the studio browser suite. Fixture successes prove protocol and UI states only.
2. Deploy the reviewed Lambda through the self-hosted workflow; verify Function URL CORS permits studio origins and all three request headers, with a single ACAO response header.
3. On the real HTTPS studio page, send one synthetic `.test` inquiry, repeat its exact key/body, and verify 201 then 200. Query the private table by that exact key to prove there is exactly one row.
4. With the restricted runtime login, verify forbidden reads/deletes still fail. A privileged operator removes only the recorded synthetic UUID/key. Record status/row counts, never message bodies or secrets, in the external delivery receipt.

For authorized owner retrieval, use an existing private operator connection and an explicit date window, for example `SELECT id,name,normalized_email,message,submitted_at FROM blum_studio_contact.messages WHERE submitted_at >= $1 ORDER BY submitted_at DESC LIMIT 50`. Keep results private. A deletion request uses the verified email and exact record IDs; inspect before deleting. No public admin endpoint is provided.

Rollback restores the prior static site and Lambda bundle while preserving the table and messages. App routes, waitlists, ad destinations and existing chat/email/resume tools remain independent.
