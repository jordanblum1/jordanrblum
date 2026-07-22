import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  codeHash,
  hasVerifiedResumeAccess,
  maskEmail,
  normalizeEmail,
  requestResumeAccess,
  resumeTokenKey,
  verifyResumeAccess,
} from '../../src/lib/resumeVerification.js';

const ddbMock = mockClient(DynamoDBDocumentClient);
const sesMock = mockClient(SESv2Client);

beforeEach(() => {
  ddbMock.reset();
  sesMock.reset();
  process.env.RATE_TABLE = 'test-table';
  process.env.RESUME_FROM_EMAIL = 'Jordan Blum <resume@blumjordan.com>';
  process.env.CONTACT_EMAIL = 'jordan@example.com';
});

describe('email normalization', () => {
  it('trims and lowercases a valid address', () => {
    expect(normalizeEmail('  Recruiter.Name+jobs@Example.COM ')).toBe('recruiter.name+jobs@example.com');
  });

  it('rejects malformed, header-injection, and non-ASCII addresses', () => {
    for (const value of [
      'not-an-email',
      '.lead@example.com',
      'lead..name@example.com',
      'lead@example',
      'lead@example.com\nBcc: bad@example.com',
      'léad@example.com',
    ]) {
      expect(normalizeEmail(value)).toBeNull();
    }
  });

  it('masks the local part while leaving the delivery domain recognizable', () => {
    expect(maskEmail('recruiter@example.com')).toBe('re•••••••@example.com');
  });
});

describe('resume access request', () => {
  it('stores a hashed code and sends the plaintext code only through SES', async () => {
    ddbMock.on(UpdateCommand).resolves({});
    sesMock.on(SendEmailCommand).resolves({});

    const result = await requestResumeAccess('recruiter@example.com', 'ip-hash');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.token).toMatch(/^[a-f0-9]{64}$/);
    expect(result.maskedEmail).toBe('re•••••••@example.com');

    const updates = ddbMock.commandCalls(UpdateCommand);
    expect(updates).toHaveLength(3); // hourly IP cap, daily email cap, token record
    const tokenWrite = updates[2]?.args[0].input;
    expect(tokenWrite?.Key).toEqual({ pk: resumeTokenKey(result.token) });
    const stored = tokenWrite?.ExpressionAttributeValues as Record<string, unknown>;
    expect(stored[':email']).toBe('recruiter@example.com');
    expect(stored[':codeHash']).toMatch(/^[a-f0-9]{64}$/);

    const email = sesMock.commandCalls(SendEmailCommand)[0]?.args[0].input;
    const text = email?.Content?.Simple?.Body?.Text?.Data ?? '';
    const code = text.match(/\b(\d{6})\b/)?.[1];
    expect(code).toMatch(/^\d{6}$/);
    expect(stored[':codeHash']).toBe(codeHash(result.token, code!));
  });

  it('rejects invalid input before touching DynamoDB or SES', async () => {
    expect(await requestResumeAccess('bad address', 'ip-hash')).toEqual({ ok: false, reason: 'invalid_email' });
    expect(ddbMock.calls()).toHaveLength(0);
    expect(sesMock.calls()).toHaveLength(0);
  });
});

describe('resume code verification', () => {
  const token = 'a'.repeat(64);
  const code = '123456';
  const nowEpoch = Math.floor(Date.now() / 1000);

  it('unlocks a verified token and notifies Jordan without exposing the PDF publicly', async () => {
    ddbMock.on(GetCommand).resolves({
      Item: {
        pk: resumeTokenKey(token),
        email: 'recruiter@example.com',
        codeHash: codeHash(token, code),
        verified: false,
        attempts: 0,
        expiresAt: nowEpoch + 600,
        ttl: nowEpoch + 600,
      },
    });
    ddbMock.on(UpdateCommand).resolves({});
    sesMock.on(SendEmailCommand).resolves({});

    const result = await verifyResumeAccess(token, code);
    expect(result.ok).toBe(true);
    expect(ddbMock.commandCalls(UpdateCommand)).toHaveLength(1);

    const ownerEmail = sesMock.commandCalls(SendEmailCommand)[0]?.args[0].input;
    expect(ownerEmail?.Destination?.ToAddresses).toEqual(['jordan@example.com']);
    expect(ownerEmail?.ReplyToAddresses).toEqual(['recruiter@example.com']);
  });

  it('increments the attempt counter for a wrong code and does not notify Jordan', async () => {
    ddbMock.on(GetCommand).resolves({
      Item: {
        email: 'recruiter@example.com',
        codeHash: codeHash(token, code),
        verified: false,
        attempts: 1,
        expiresAt: nowEpoch + 600,
        ttl: nowEpoch + 600,
      },
    });
    ddbMock.on(UpdateCommand).resolves({});

    expect(await verifyResumeAccess(token, '999999')).toEqual({ ok: false, reason: 'invalid_code' });
    expect(ddbMock.commandCalls(UpdateCommand)).toHaveLength(1);
    expect(sesMock.calls()).toHaveLength(0);
  });

  it('allows a download only while a verified token is fresh', async () => {
    ddbMock.on(GetCommand).resolves({ Item: { verified: true, ttl: nowEpoch + 60 } });
    await expect(hasVerifiedResumeAccess(token)).resolves.toBe(true);

    ddbMock.on(GetCommand).resolves({ Item: { verified: true, ttl: nowEpoch - 1 } });
    await expect(hasVerifiedResumeAccess(token)).resolves.toBe(false);
  });
});
