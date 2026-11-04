CREATE SCHEMA blum_studio_contact;
REVOKE ALL ON SCHEMA blum_studio_contact FROM PUBLIC;

CREATE TABLE blum_studio_contact.messages (
  id uuid PRIMARY KEY,
  idempotency_key uuid NOT NULL UNIQUE,
  request_fingerprint text NOT NULL CHECK (request_fingerprint ~ '^[0-9a-f]{64}$'),
  name text NOT NULL CHECK (name = btrim(name) AND length(name) BETWEEN 1 AND 100),
  normalized_email text NOT NULL CHECK (
    normalized_email = lower(btrim(normalized_email))
    AND length(normalized_email) BETWEEN 3 AND 254
    AND normalized_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  message text NOT NULL CHECK (message = btrim(message) AND length(message) BETWEEN 10 AND 4000),
  submitted_at timestamptz NOT NULL DEFAULT transaction_timestamp()
);

CREATE INDEX contact_messages_submitted_idx ON blum_studio_contact.messages(submitted_at DESC, id DESC);
REVOKE ALL ON ALL TABLES IN SCHEMA blum_studio_contact FROM PUBLIC;
