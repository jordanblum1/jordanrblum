import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { getDocumentClient, requireDynamoTable } from './dynamo.js';
import { atomicIncrementWithLimit } from './dynamo.js';

export const RESUME_CODE_TTL_SECONDS = 10 * 60;
export const RESUME_ACCESS_TTL_SECONDS = 30 * 60;
export const RESUME_MAX_CODE_ATTEMPTS = 5;
export const RESUME_IP_REQUEST_LIMIT = 5;
export const RESUME_EMAIL_REQUEST_LIMIT = 3;

const RATE_TTL_SECONDS = 2 * 24 * 60 * 60;
const EMAIL_MAX_LENGTH = 254;
const TOKEN_PATTERN = /^[a-f0-9]{64}$/;
const CODE_PATTERN = /^\d{6}$/;
const LOCAL_PATTERN = /^[a-z0-9!#$%&'*+/=?^_`{|}~.-]+$/i;
const DOMAIN_LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

let sesClient: SESv2Client | undefined;

function getSesClient(): SESv2Client {
  if (!sesClient) sesClient = new SESv2Client({});
  return sesClient;
}

function configuredEmail(name: 'RESUME_FROM_EMAIL' | 'CONTACT_EMAIL'): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function normalizeEmail(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const email = input.trim().toLowerCase();
  if (!email || email.length > EMAIL_MAX_LENGTH || /[\u0000-\u001f\u007f-\uffff]/.test(email)) return null;

  const at = email.lastIndexOf('@');
  if (at <= 0 || at !== email.indexOf('@')) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (
    local.length > 64 ||
    local.startsWith('.') ||
    local.endsWith('.') ||
    local.includes('..') ||
    !LOCAL_PATTERN.test(local)
  ) {
    return null;
  }

  const labels = domain.split('.');
  if (domain.length > 253 || labels.length < 2 || labels.some((label) => !DOMAIN_LABEL_PATTERN.test(label))) return null;
  if ((labels.at(-1)?.length ?? 0) < 2) return null;
  return email;
}

export function maskEmail(email: string): string {
  const [local = '', domain = ''] = email.split('@');
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'•'.repeat(Math.max(3, Math.min(7, local.length - visible.length)))}@${domain}`;
}

export function hashValue(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function resumeTokenKey(token: string): string {
  return `RESUME_TOKEN#${hashValue(token)}`;
}

export function codeHash(token: string, code: string): string {
  return hashValue(`${token}:${code}`);
}

function hourBucket(now: Date): string {
  return now.toISOString().slice(0, 13);
}

function dayBucket(now: Date): string {
  return now.toISOString().slice(0, 10);
}

async function withinRequestLimits(ipHash: string, email: string, now: Date): Promise<boolean> {
  const ipAllowed = await atomicIncrementWithLimit(
    `RESUME_RATE#IP#${ipHash}#${hourBucket(now)}`,
    RESUME_IP_REQUEST_LIMIT,
    RATE_TTL_SECONDS,
  );
  if (!ipAllowed) return false;
  return atomicIncrementWithLimit(
    `RESUME_RATE#EMAIL#${hashValue(email)}#${dayBucket(now)}`,
    RESUME_EMAIL_REQUEST_LIMIT,
    RATE_TTL_SECONDS,
  );
}

function verificationText(code: string): string {
  return `Here is your code to unlock Jordan Blum's resume: ${code}\n\nThis code expires in 10 minutes. If you did not request it, you can ignore this email.`;
}

function verificationHtml(code: string): string {
  return `<!doctype html><html><body style="margin:0;background:#F7F3ED;color:#2B2521;font-family:Arial,sans-serif"><div style="max-width:520px;margin:0 auto;padding:48px 24px"><p style="margin:0 0 24px;color:#9C4037;font-size:12px;font-weight:700;letter-spacing:.12em">JORDAN BLUM</p><h1 style="margin:0 0 16px;font-size:28px;line-height:1.15">Your resume access code</h1><p style="margin:0 0 28px;color:#746960;line-height:1.6">Enter this code in Jordy's chat to unlock the PDF.</p><p style="margin:0 0 28px;font-family:ui-monospace,monospace;font-size:32px;font-weight:700;letter-spacing:.18em">${code}</p><p style="margin:0;color:#746960;font-size:13px;line-height:1.6">It expires in 10 minutes. If you didn't request it, you can ignore this email.</p></div></body></html>`;
}

async function sendVerificationCode(email: string, code: string): Promise<void> {
  await getSesClient().send(
    new SendEmailCommand({
      FromEmailAddress: configuredEmail('RESUME_FROM_EMAIL'),
      Destination: { ToAddresses: [email] },
      Content: {
        Simple: {
          Subject: { Data: "Your code to unlock Jordan Blum's resume", Charset: 'UTF-8' },
          Body: {
            Text: { Data: verificationText(code), Charset: 'UTF-8' },
            Html: { Data: verificationHtml(code), Charset: 'UTF-8' },
          },
        },
      },
    }),
  );
}

async function notifyJordan(email: string): Promise<void> {
  await getSesClient().send(
    new SendEmailCommand({
      FromEmailAddress: configuredEmail('RESUME_FROM_EMAIL'),
      Destination: { ToAddresses: [configuredEmail('CONTACT_EMAIL')] },
      ReplyToAddresses: [email],
      Content: {
        Simple: {
          Subject: { Data: 'Someone unlocked your resume', Charset: 'UTF-8' },
          Body: {
            Text: {
              Data: `${email} verified their inbox and unlocked your general Product Engineer resume on blumjordan.com.`,
              Charset: 'UTF-8',
            },
          },
        },
      },
    }),
  );
}

export type ResumeRequestResult =
  | { ok: true; token: string; maskedEmail: string; expiresAt: number }
  | { ok: false; reason: 'invalid_email' | 'rate_limited' | 'delivery_unavailable' };

export async function requestResumeAccess(emailInput: unknown, ipHash: string): Promise<ResumeRequestResult> {
  const email = normalizeEmail(emailInput);
  if (!email) return { ok: false, reason: 'invalid_email' };

  const now = new Date();
  if (!(await withinRequestLimits(ipHash, email, now))) return { ok: false, reason: 'rate_limited' };

  const token = randomBytes(32).toString('hex');
  const code = randomInt(100_000, 1_000_000).toString();
  const expiresAt = Math.floor(now.getTime() / 1000) + RESUME_CODE_TTL_SECONDS;

  try {
    await getDocumentClient().send(
      new UpdateCommand({
        TableName: requireDynamoTable(),
        Key: { pk: resumeTokenKey(token) },
        UpdateExpression:
          'SET #email = :email, #codeHash = :codeHash, #verified = :verified, #attempts = :attempts, #createdAt = :createdAt, #expiresAt = :expiresAt, #ttl = :ttl',
        ConditionExpression: 'attribute_not_exists(pk)',
        ExpressionAttributeNames: {
          '#email': 'email',
          '#codeHash': 'codeHash',
          '#verified': 'verified',
          '#attempts': 'attempts',
          '#createdAt': 'createdAt',
          '#expiresAt': 'expiresAt',
          '#ttl': 'ttl',
        },
        ExpressionAttributeValues: {
          ':email': email,
          ':codeHash': codeHash(token, code),
          ':verified': false,
          ':attempts': 0,
          ':createdAt': now.toISOString(),
          ':expiresAt': expiresAt,
          ':ttl': expiresAt,
        },
      }),
    );
    await sendVerificationCode(email, code);
  } catch (error) {
    console.error('resume verification delivery failed', error);
    return { ok: false, reason: 'delivery_unavailable' };
  }

  return { ok: true, token, maskedEmail: maskEmail(email), expiresAt };
}

interface ResumeTokenRecord {
  email?: unknown;
  codeHash?: unknown;
  verified?: unknown;
  attempts?: unknown;
  expiresAt?: unknown;
  ttl?: unknown;
}

async function readToken(token: string): Promise<ResumeTokenRecord | null> {
  if (!TOKEN_PATTERN.test(token)) return null;
  const result = await getDocumentClient().send(
    new GetCommand({
      TableName: requireDynamoTable(),
      Key: { pk: resumeTokenKey(token) },
      ConsistentRead: true,
    }),
  );
  return (result.Item as ResumeTokenRecord | undefined) ?? null;
}

function hashesMatch(expectedHex: string, actualHex: string): boolean {
  const expected = Buffer.from(expectedHex, 'hex');
  const actual = Buffer.from(actualHex, 'hex');
  return expected.length === actual.length && expected.length > 0 && timingSafeEqual(expected, actual);
}

export type ResumeVerifyResult =
  | { ok: true; token: string; expiresAt: number }
  | { ok: false; reason: 'invalid_code' | 'expired' | 'too_many_attempts' };

export async function verifyResumeAccess(token: string, code: string): Promise<ResumeVerifyResult> {
  if (!TOKEN_PATTERN.test(token) || !CODE_PATTERN.test(code)) return { ok: false, reason: 'invalid_code' };

  const record = await readToken(token);
  const nowEpoch = Math.floor(Date.now() / 1000);
  if (!record || typeof record.email !== 'string' || typeof record.expiresAt !== 'number') {
    return { ok: false, reason: 'expired' };
  }
  if (record.verified === true && typeof record.ttl === 'number' && record.ttl >= nowEpoch) {
    return { ok: true, token, expiresAt: record.ttl };
  }
  if (record.expiresAt < nowEpoch) return { ok: false, reason: 'expired' };

  const attempts = typeof record.attempts === 'number' ? record.attempts : RESUME_MAX_CODE_ATTEMPTS;
  if (attempts >= RESUME_MAX_CODE_ATTEMPTS) return { ok: false, reason: 'too_many_attempts' };

  const matches =
    typeof record.codeHash === 'string' && hashesMatch(record.codeHash, codeHash(token, code));
  if (!matches) {
    try {
      await getDocumentClient().send(
        new UpdateCommand({
          TableName: requireDynamoTable(),
          Key: { pk: resumeTokenKey(token) },
          UpdateExpression: 'SET #attempts = #attempts + :one',
          ConditionExpression: '#attempts < :limit AND #verified = :false',
          ExpressionAttributeNames: { '#attempts': 'attempts', '#verified': 'verified' },
          ExpressionAttributeValues: { ':one': 1, ':limit': RESUME_MAX_CODE_ATTEMPTS, ':false': false },
        }),
      );
    } catch (error) {
      if (!(error instanceof Error && error.name === 'ConditionalCheckFailedException')) throw error;
      return { ok: false, reason: 'too_many_attempts' };
    }
    return { ok: false, reason: 'invalid_code' };
  }

  const accessExpiresAt = nowEpoch + RESUME_ACCESS_TTL_SECONDS;
  try {
    await getDocumentClient().send(
      new UpdateCommand({
        TableName: requireDynamoTable(),
        Key: { pk: resumeTokenKey(token) },
        UpdateExpression:
          'SET #verified = :true, #verifiedAt = :verifiedAt, #ttl = :ttl REMOVE #codeHash',
        ConditionExpression:
          '#verified = :false AND #attempts < :limit AND #expiresAt >= :now AND #codeHash = :codeHash',
        ExpressionAttributeNames: {
          '#verified': 'verified',
          '#verifiedAt': 'verifiedAt',
          '#ttl': 'ttl',
          '#codeHash': 'codeHash',
          '#attempts': 'attempts',
          '#expiresAt': 'expiresAt',
        },
        ExpressionAttributeValues: {
          ':true': true,
          ':false': false,
          ':verifiedAt': new Date().toISOString(),
          ':ttl': accessExpiresAt,
          ':limit': RESUME_MAX_CODE_ATTEMPTS,
          ':now': nowEpoch,
          ':codeHash': record.codeHash,
        },
      }),
    );
  } catch (error) {
    if (error instanceof Error && error.name === 'ConditionalCheckFailedException') {
      return { ok: false, reason: 'expired' };
    }
    throw error;
  }

  try {
    await notifyJordan(record.email);
  } catch (error) {
    // Access is already verified. A notification outage should not make the
    // visitor repeat the flow or lose the download they earned.
    console.error('resume owner notification failed', error);
  }
  return { ok: true, token, expiresAt: accessExpiresAt };
}

export async function hasVerifiedResumeAccess(token: string): Promise<boolean> {
  const record = await readToken(token);
  const nowEpoch = Math.floor(Date.now() / 1000);
  return record?.verified === true && typeof record.ttl === 'number' && record.ttl >= nowEpoch;
}
