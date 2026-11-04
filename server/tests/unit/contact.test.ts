import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import {
  handleContactRequest,
  saveContact,
  type ContactEvent,
  type ContactInput,
} from '../../src/lib/contact.js';

const origin = 'https://buildwithblum.com';
const idempotencyKey = '8cd88f12-bf3e-4df5-94bb-67f011a7510a';
const id = '7620047d-7404-4d01-87c9-8bc92a2bd5a7';
const validInput = {
  name: ' Jordan Blum ',
  email: ' Hello@Example.test ',
  message: ' I need help building a small app. ',
  website: '',
};

function event(body: unknown = validInput, overrides: Partial<ContactEvent> = {}): ContactEvent {
  const raw = typeof body === 'string' ? body : JSON.stringify(body);
  const { headers: overrideHeaders, requestContext: overrideContext, ...rest } = overrides;
  return {
    rawPath: '/api/studio/contact',
    body: raw,
    headers: {
      origin,
      'content-type': 'application/json',
      'idempotency-key': idempotencyKey,
      'x-amz-content-sha256': createHash('sha256').update(raw).digest('hex'),
      'x-forwarded-for': '198.51.100.9, 192.0.2.2',
      ...overrideHeaders,
    },
    requestContext: overrideContext ?? { http: { method: 'POST', sourceIp: '130.176.0.1' } },
    ...rest,
  };
}

function dependencies(saveResult: 'created' | 'duplicate' | 'conflict' = 'created') {
  return {
    increment: vi.fn(async () => true),
    save: vi.fn(async () => saveResult),
    notify: vi.fn(async () => undefined),
    id: () => id,
    now: () => new Date('2026-11-03T20:45:00.000Z'),
  };
}

describe('Blum Studios contact Lambda boundary', () => {
  it('normalizes valid input and returns created, duplicate, and conflict outcomes', async () => {
    const created = dependencies('created');
    const createdResponse = await handleContactRequest(event(), created);
    expect(createdResponse.statusCode).toBe(201);
    expect(JSON.parse(createdResponse.body)).toEqual({ success: true });
    expect(created.save).toHaveBeenCalledWith(
      { name: 'Jordan Blum', email: 'hello@example.test', message: 'I need help building a small app.' },
      id,
      idempotencyKey,
      expect.stringMatching(/^[a-f0-9]{64}$/),
    );
    expect(created.notify).toHaveBeenCalledWith(
      { name: 'Jordan Blum', email: 'hello@example.test', message: 'I need help building a small app.' },
      idempotencyKey,
    );

    const duplicate = dependencies('duplicate');
    expect((await handleContactRequest(event(), duplicate)).statusCode).toBe(200);
    expect(duplicate.notify).toHaveBeenCalledOnce();
    const conflict = dependencies('conflict');
    expect((await handleContactRequest(event(), conflict)).statusCode).toBe(409);
    expect(conflict.notify).not.toHaveBeenCalled();

    const raw = JSON.stringify(validInput);
    const encoded = event(validInput, { body: Buffer.from(raw).toString('base64'), isBase64Encoded: true });
    expect((await handleContactRequest(encoded, dependencies())).statusCode).toBe(201);
  });

  it('enforces exact fields, Unicode character limits, content type, size, UUID, and body digest', async () => {
    for (const body of [
      { ...validInput, name: '' },
      { ...validInput, email: 'bad' },
      { ...validInput, message: 'short' },
      { ...validInput, message: 'Hello 👋👋' },
      { ...validInput, extra: true },
      { ...validInput, name: 'bad\0name' },
    ]) {
      expect((await handleContactRequest(event(body), dependencies())).statusCode).toBe(400);
    }

    expect((await handleContactRequest(event(validInput, {
      headers: { 'idempotency-key': 'not-a-uuid' },
    }), dependencies())).statusCode).toBe(400);
    expect((await handleContactRequest(event(validInput, {
      headers: { 'content-type': 'text/plain' },
    }), dependencies())).statusCode).toBe(415);
    expect((await handleContactRequest(event('x'.repeat(8193)), dependencies())).statusCode).toBe(413);
    expect((await handleContactRequest(event(validInput, {
      headers: { 'x-amz-content-sha256': '0'.repeat(64) },
    }), dependencies())).statusCode).toBe(400);
  });

  it('enforces exact studio origins while leaving response CORS to the Function URL', async () => {
    const allowed = await handleContactRequest(event(), dependencies());
    expect(allowed.headers['Access-Control-Allow-Origin']).toBeUndefined();
    expect(allowed.headers['Access-Control-Allow-Credentials']).toBeUndefined();
    expect((await handleContactRequest(event(validInput, {
      headers: { origin: 'https://buildwithblum.com.evil.test' },
    }), dependencies())).statusCode).toBe(403);

    const directOptions = await handleContactRequest(event('', {
      requestContext: { http: { method: 'OPTIONS', sourceIp: '130.176.0.1' } },
      headers: {
        origin,
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type, idempotency-key, x-amz-content-sha256',
      },
    }), dependencies());
    expect(directOptions.statusCode).toBe(405);
    expect(directOptions.headers['Access-Control-Allow-Origin']).toBeUndefined();
  });

  it('rate limits a one-hour hashed network bucket and fails closed on storage errors', async () => {
    const deps = dependencies();
    expect((await handleContactRequest(event(), deps)).statusCode).toBe(201);
    expect(deps.increment).toHaveBeenCalledWith(
      `CONTACT#2026-11-03T20#${createHash('sha256').update('192.0.2.2').digest('hex')}`,
      5,
      3600,
    );

    const denied = dependencies();
    denied.increment.mockResolvedValue(false);
    expect((await handleContactRequest(event(), denied)).statusCode).toBe(429);
    const unavailable = dependencies();
    unavailable.increment.mockRejectedValue(new Error('Dynamo unavailable'));
    expect((await handleContactRequest(event(), unavailable)).statusCode).toBe(503);
    const databaseFailure = dependencies();
    databaseFailure.save.mockRejectedValue(new Error('Database unavailable'));
    expect((await handleContactRequest(event(), databaseFailure)).statusCode).toBe(503);
    expect(databaseFailure.notify).not.toHaveBeenCalled();

    const notificationFailure = dependencies();
    notificationFailure.notify.mockRejectedValue(new Error('SES unavailable'));
    expect((await handleContactRequest(event(), notificationFailure)).statusCode).toBe(503);
    expect(notificationFailure.save).toHaveBeenCalledOnce();
  });

  it('accepts honeypot spam without storing contact data', async () => {
    const deps = dependencies();
    const result = await handleContactRequest(event({ ...validInput, website: 'https://spam.test' }), deps);
    expect(result.statusCode).toBe(201);
    expect(deps.increment).toHaveBeenCalledOnce();
    expect(deps.save).not.toHaveBeenCalled();
    expect(deps.notify).not.toHaveBeenCalled();
  });

  it('classifies atomic SQL insert, duplicate, and changed-content conflict results', async () => {
    const input: ContactInput = { name: 'Jordan', email: 'hello@example.test', message: 'A complete message.' };
    const fingerprint = 'a'.repeat(64);
    const query = vi.fn(async (_text: string, _values: unknown[]) => [{ id, request_fingerprint: fingerprint }]);
    expect(await saveContact(input, id, idempotencyKey, fingerprint, query)).toBe('created');
    expect(query.mock.calls[0]?.[0]).toContain('ON CONFLICT (idempotency_key) DO UPDATE');
    expect(query.mock.calls[0]?.[1]).toEqual([id, idempotencyKey, fingerprint, input.name, input.email, input.message]);

    expect(await saveContact(input, id, idempotencyKey, fingerprint, async () => [
      { id: '7919bb81-65d8-4bf0-8c5e-fc7dbe842afd', request_fingerprint: fingerprint },
    ])).toBe('duplicate');
    expect(await saveContact(input, id, idempotencyKey, fingerprint, async () => [
      { id, request_fingerprint: 'b'.repeat(64) },
    ])).toBe('conflict');
  });
});
