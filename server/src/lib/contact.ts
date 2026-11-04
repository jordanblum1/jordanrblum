import { createHash, randomUUID } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { clientIp, rateLimitBucket, type ClientIpEvent } from './clientIp.js';
import { notifyContact } from './contactNotification.js';
import { atomicIncrementWithLimit } from './dynamo.js';
import { hashIp } from './ipHash.js';

const CONTACT_PATH = '/api/studio/contact';
const CONTACT_ORIGINS = new Set([
  'https://buildwithblum.com',
  'https://www.buildwithblum.com',
]);
const MAX_BODY_BYTES = 8192;
const CONTACT_LIMIT = 5;
const CONTACT_TTL_SECONDS = 3600;
const IDEMPOTENCY_KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const BODY_SHA256 = /^[0-9a-f]{64}$/;

export interface ContactEvent extends ClientIpEvent {
  body?: string;
  isBase64Encoded?: boolean;
  rawPath?: string;
  requestContext?: ClientIpEvent['requestContext'] & { http?: { method?: string; sourceIp?: string } };
}

export interface ContactResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export interface ContactInput {
  name: string;
  email: string;
  message: string;
}

export type ContactSaveResult = 'created' | 'duplicate' | 'conflict';

type ContactQuery = (text: string, values: unknown[]) => Promise<unknown[]>;

interface ContactDependencies {
  increment: (key: string, limit: number, ttlSeconds: number) => Promise<boolean>;
  save: (input: ContactInput, id: string, idempotencyKey: string, fingerprint: string) => Promise<ContactSaveResult>;
  notify: (input: ContactInput, idempotencyKey: string) => Promise<void>;
  id: () => string;
  now: () => Date;
}

const defaultDependencies: ContactDependencies = {
  increment: atomicIncrementWithLimit,
  save: saveContact,
  notify: notifyContact,
  id: randomUUID,
  now: () => new Date(),
};

class ContactRequestError extends Error {
  constructor(readonly statusCode: number, readonly publicMessage = 'Invalid contact request') {
    super(publicMessage);
  }
}

function header(event: ContactEvent, name: string): string | undefined {
  const match = Object.entries(event.headers ?? {}).find(([key]) => key.toLowerCase() === name);
  return match?.[1];
}

function responseHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  };
}

function jsonResponse(statusCode: number, body: Record<string, string | boolean>): ContactResponse {
  return { statusCode, headers: responseHeaders(), body: JSON.stringify(body) };
}

function allowedOrigin(event: ContactEvent): string | undefined {
  const origin = header(event, 'origin');
  return origin && CONTACT_ORIGINS.has(origin) ? origin : undefined;
}

function bodyBytes(event: ContactEvent): Buffer {
  const raw = event.body ?? '';
  if (!event.isBase64Encoded) {
    const body = Buffer.from(raw, 'utf8');
    if (body.byteLength > MAX_BODY_BYTES) throw new ContactRequestError(413);
    return body;
  }

  // Reject an oversized encoded body before allocating its decoded form.
  if (raw.length > Math.ceil(MAX_BODY_BYTES / 3) * 4 + 4) throw new ContactRequestError(413);
  const body = Buffer.from(raw, 'base64');
  if (body.byteLength > MAX_BODY_BYTES) throw new ContactRequestError(413);
  return body;
}

function normalizedEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return Array.from(email).length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !email.includes('\0')
    ? email
    : null;
}

function parseContactInput(value: unknown): { input: ContactInput; honeypot: boolean } | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (Object.keys(row).some((key) => !['name', 'email', 'message', 'website'].includes(key))) return null;

  const name = typeof row.name === 'string' ? row.name.trim() : '';
  const email = normalizedEmail(row.email);
  const message = typeof row.message === 'string' ? row.message.trim() : '';
  const website = row.website === undefined ? '' : row.website;
  if (
    Array.from(name).length < 1 || Array.from(name).length > 100 || name.includes('\0') ||
    !email || Array.from(message).length < 10 || Array.from(message).length > 4000 || message.includes('\0') ||
    typeof website !== 'string' || Array.from(website).length > 200 || website.includes('\0')
  ) return null;

  return { input: { name, email, message }, honeypot: website.length > 0 };
}

function parseBody(event: ContactEvent): { input: ContactInput; honeypot: boolean } {
  if (header(event, 'content-type')?.split(';', 1)[0]?.trim().toLowerCase() !== 'application/json') {
    throw new ContactRequestError(415);
  }
  const contentLength = header(event, 'content-length');
  if (contentLength && (!/^\d+$/.test(contentLength) || Number(contentLength) > MAX_BODY_BYTES)) {
    throw new ContactRequestError(413);
  }

  const bytes = bodyBytes(event);
  const suppliedHash = header(event, 'x-amz-content-sha256')?.trim();
  const actualHash = createHash('sha256').update(bytes).digest('hex');
  if (!suppliedHash || !BODY_SHA256.test(suppliedHash) || suppliedHash !== actualHash) {
    throw new ContactRequestError(400);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new ContactRequestError(400);
  }
  const input = parseContactInput(parsed);
  if (!input) throw new ContactRequestError(400, 'Check your name, email, and message.');
  return input;
}

function contactDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  let parsed: URL;
  try {
    parsed = new URL(env.CONTACT_DATABASE_URL ?? '');
  } catch {
    throw new Error('Contact database is unavailable');
  }
  if (
    !['postgres:', 'postgresql:'].includes(parsed.protocol) || !parsed.username || !parsed.password ||
    parsed.pathname.length < 2 || parsed.port && parsed.port !== '5432' ||
    !/^ep-[a-z0-9-]+(?:\.[a-z0-9-]+)+\.neon\.tech$/.test(parsed.hostname) || parsed.hash ||
    [...parsed.searchParams.keys()].some((key) => !['sslmode', 'channel_binding'].includes(key)) ||
    parsed.searchParams.getAll('sslmode').length !== 1 ||
    !['require', 'verify-full'].includes(parsed.searchParams.get('sslmode') ?? '') ||
    parsed.searchParams.getAll('channel_binding').length > 1 ||
    parsed.searchParams.has('channel_binding') && parsed.searchParams.get('channel_binding') !== 'require'
  ) throw new Error('Contact database is unavailable');
  return parsed.href;
}

async function runContactQuery(text: string, values: unknown[]): Promise<unknown[]> {
  const sql = neon(contactDatabaseUrl(), { fetchOptions: { signal: AbortSignal.timeout(5000) } });
  return sql.query(text, values);
}

export async function saveContact(
  input: ContactInput,
  id: string,
  idempotencyKey: string,
  fingerprint: string,
  query: ContactQuery = runContactQuery,
): Promise<ContactSaveResult> {
  const rows = await query(`INSERT INTO blum_studio_contact.messages
      (id,idempotency_key,request_fingerprint,name,normalized_email,message)
    VALUES ($1,$2,$3,$4,$5,$6)
    ON CONFLICT (idempotency_key) DO UPDATE
      SET request_fingerprint=blum_studio_contact.messages.request_fingerprint
    RETURNING id,request_fingerprint`, [id, idempotencyKey, fingerprint, input.name, input.email, input.message]);
  const row = rows[0];
  if (rows.length !== 1 || typeof row !== 'object' || row === null || Array.isArray(row)) {
    throw new Error('Invalid contact save result');
  }
  const result = row as Record<string, unknown>;
  if (typeof result.id !== 'string' || typeof result.request_fingerprint !== 'string') {
    throw new Error('Invalid contact save result');
  }
  if (result.request_fingerprint !== fingerprint) return 'conflict';
  return result.id === id ? 'created' : 'duplicate';
}

export async function handleContactRequest(
  event: ContactEvent,
  dependencies: ContactDependencies = defaultDependencies,
): Promise<ContactResponse> {
  if (event.rawPath !== CONTACT_PATH) return jsonResponse(404, { error: 'Not found' });
  const origin = allowedOrigin(event);
  if (!origin) return jsonResponse(403, { error: 'Origin not allowed' });
  const method = event.requestContext?.http?.method ?? 'POST';
  // Lambda Function URL configuration is the sole CORS response owner. It
  // handles browser preflights before invocation and adds one ACAO value to
  // POST responses; emitting CORS here would create duplicate headers.
  if (method !== 'POST') return jsonResponse(405, { error: 'Method not allowed' });

  const idempotencyKey = header(event, 'idempotency-key')?.trim().toLowerCase() ?? '';
  if (!IDEMPOTENCY_KEY.test(idempotencyKey)) return jsonResponse(400, { error: 'Invalid contact request' });

  let stage: 'validate' | 'rate-limit' | 'save' | 'notify' = 'validate';
  try {
    const parsed = parseBody(event);
    stage = 'rate-limit';
    const hour = dependencies.now().toISOString().slice(0, 13);
    const networkHash = hashIp(rateLimitBucket(clientIp(event)));
    const allowed = await dependencies.increment(`CONTACT#${hour}#${networkHash}`, CONTACT_LIMIT, CONTACT_TTL_SECONDS);
    if (!allowed) return jsonResponse(429, { error: 'Too many requests. Please try again later.' });
    if (parsed.honeypot) return jsonResponse(201, { success: true });

    const fingerprint = createHash('sha256').update(JSON.stringify(parsed.input)).digest('hex');
    stage = 'save';
    const saved = await dependencies.save(parsed.input, dependencies.id(), idempotencyKey, fingerprint);
    if (saved === 'conflict') {
      return jsonResponse(409, { error: 'Idempotency key was already used for a different message.' });
    }
    stage = 'notify';
    await dependencies.notify(parsed.input, idempotencyKey);
    return jsonResponse(saved === 'created' ? 201 : 200, { success: true });
  } catch (error) {
    if (error instanceof ContactRequestError) {
      return jsonResponse(error.statusCode, { error: error.publicMessage });
    }
    const knownErrors = ['AccessDeniedException', 'MessageRejected', 'ValidationException', 'ResourceNotFoundException', 'ConditionalCheckFailedException', 'TimeoutError', 'AbortError', 'NeonDbError'];
    const code = error instanceof Error && knownErrors.includes(error.name) ? error.name : 'Error';
    const action = ['ses:SendEmail', 'ses:SendRawEmail', 'dynamodb:GetItem', 'dynamodb:UpdateItem']
      .find(candidate => error instanceof Error && error.message.includes(candidate)) ?? 'unknown';
    console.error('studio_contact_unavailable', { stage, code, action });
    return jsonResponse(503, { error: 'Contact is temporarily unavailable. Please try again later.' });
  }
}
