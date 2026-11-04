import { randomUUID } from 'node:crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { atomicIncrementWithLimit } from './dynamo.js';

const FROM_ADDRESS = 'Blum Studios <hi@jordanblum.com>';
const TO_ADDRESS = 'hi@jordanblum.com';
const SUBJECT = 'New Blum Studios project inquiry';
// Keep this above the deployed Lambda's 30-second timeout so one invocation owns delivery until it exits.
const LEASE_SECONDS = 60;
const SENT_RECEIPT_SECONDS = 30 * 24 * 60 * 60;
const ATTEMPT_LIMIT = 50;
const ATTEMPT_TTL_SECONDS = 2 * 24 * 60 * 60;
const SEND_TIMEOUT_MS = 5_000;

export interface ContactNotificationInput {
  name: string;
  email: string;
  message: string;
}

type LeaseResult = 'acquired' | 'sent' | 'busy';

export interface ContactNotificationDependencies {
  acquire: (reference: string, token: string, now: Date) => Promise<LeaseResult>;
  increment: (key: string, limit: number, ttlSeconds: number) => Promise<boolean>;
  markSent: (reference: string, token: string, now: Date) => Promise<void>;
  release: (reference: string, token: string, now: Date) => Promise<void>;
  send: (input: ContactNotificationInput, reference: string) => Promise<void>;
  token: () => string;
  now: () => Date;
}

let documentClient: DynamoDBDocumentClient | undefined;
let sesClient: SESv2Client | undefined;

function getDocumentClient(): DynamoDBDocumentClient {
  if (!documentClient) documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
  return documentClient;
}

function getSesClient(): SESv2Client {
  if (!sesClient) sesClient = new SESv2Client({ maxAttempts: 1 });
  return sesClient;
}

function rateTable(): string {
  const table = process.env.RATE_TABLE;
  if (!table) throw new Error('Missing required environment variable: RATE_TABLE');
  return table;
}

function receiptKey(reference: string): string {
  return `CONTACT_EMAIL#${reference}`;
}

function isConditionalFailure(error: unknown): boolean {
  return error instanceof Error && error.name === 'ConditionalCheckFailedException';
}

export async function acquireContactEmailLease(
  reference: string,
  token: string,
  now: Date,
): Promise<LeaseResult> {
  const nowSeconds = Math.floor(now.getTime() / 1000);
  try {
    await getDocumentClient().send(new UpdateCommand({
      TableName: rateTable(),
      Key: { pk: receiptKey(reference) },
      UpdateExpression: 'SET #status = :sending, #token = :token, #lease = :lease, #ttl = :ttl',
      ConditionExpression: '(attribute_not_exists(#status) OR #status <> :sent) AND (attribute_not_exists(#lease) OR #lease <= :now)',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#token': 'leaseToken',
        '#lease': 'leaseExpiresAt',
        '#ttl': 'ttl',
      },
      ExpressionAttributeValues: {
        ':sending': 'sending',
        ':sent': 'sent',
        ':token': token,
        ':lease': nowSeconds + LEASE_SECONDS,
        ':now': nowSeconds,
        ':ttl': nowSeconds + LEASE_SECONDS,
      },
    }));
    return 'acquired';
  } catch (error) {
    if (!isConditionalFailure(error)) throw error;
  }

  const receipt = await getDocumentClient().send(new GetCommand({
    TableName: rateTable(),
    Key: { pk: receiptKey(reference) },
    ConsistentRead: true,
  }));
  return receipt.Item?.status === 'sent' ? 'sent' : 'busy';
}

export async function markContactEmailSent(reference: string, token: string, now: Date): Promise<void> {
  const nowSeconds = Math.floor(now.getTime() / 1000);
  await getDocumentClient().send(new UpdateCommand({
    TableName: rateTable(),
    Key: { pk: receiptKey(reference) },
    UpdateExpression: 'SET #status = :sent, #sentAt = :sentAt, #ttl = :ttl REMOVE #token, #lease',
    ConditionExpression: '#status = :sending AND #token = :token',
    ExpressionAttributeNames: {
      '#status': 'status',
      '#sentAt': 'sentAt',
      '#ttl': 'ttl',
      '#token': 'leaseToken',
      '#lease': 'leaseExpiresAt',
    },
    ExpressionAttributeValues: {
      ':sending': 'sending',
      ':sent': 'sent',
      ':token': token,
      ':sentAt': now.toISOString(),
      ':ttl': nowSeconds + SENT_RECEIPT_SECONDS,
    },
  }));
}

export async function releaseContactEmailLease(reference: string, token: string, now: Date): Promise<void> {
  await getDocumentClient().send(new UpdateCommand({
    TableName: rateTable(),
    Key: { pk: receiptKey(reference) },
    UpdateExpression: 'SET #ttl = :ttl REMOVE #status, #token, #lease',
    ConditionExpression: '#status = :sending AND #token = :token',
    ExpressionAttributeNames: {
      '#status': 'status',
      '#ttl': 'ttl',
      '#token': 'leaseToken',
      '#lease': 'leaseExpiresAt',
    },
    ExpressionAttributeValues: {
      ':sending': 'sending',
      ':token': token,
      ':ttl': Math.floor(now.getTime() / 1000) + LEASE_SECONDS,
    },
  }));
}

export async function sendContactEmail(input: ContactNotificationInput, reference: string): Promise<void> {
  await getSesClient().send(new SendEmailCommand({
    FromEmailAddress: FROM_ADDRESS,
    Destination: { ToAddresses: [TO_ADDRESS] },
    ReplyToAddresses: [input.email],
    Content: {
      Simple: {
        Subject: { Data: SUBJECT, Charset: 'UTF-8' },
        Body: {
          Text: {
            Data: `Name: ${input.name}\nEmail: ${input.email}\n\nMessage:\n${input.message}\n\nReference: ${reference}`,
            Charset: 'UTF-8',
          },
        },
      },
    },
  }), { abortSignal: AbortSignal.timeout(SEND_TIMEOUT_MS) });
}

const defaultDependencies: ContactNotificationDependencies = {
  acquire: acquireContactEmailLease,
  increment: atomicIncrementWithLimit,
  markSent: markContactEmailSent,
  release: releaseContactEmailLease,
  send: sendContactEmail,
  token: randomUUID,
  now: () => new Date(),
};

export async function notifyContact(
  input: ContactNotificationInput,
  reference: string,
  dependencies: ContactNotificationDependencies = defaultDependencies,
): Promise<void> {
  const now = dependencies.now();
  const token = dependencies.token();
  const lease = await dependencies.acquire(reference, token, now);
  if (lease === 'sent') return;
  if (lease === 'busy') throw new Error('Contact notification is already in progress');

  try {
    const day = now.toISOString().slice(0, 10);
    const allowed = await dependencies.increment(`CONTACT_EMAIL_ATTEMPT#${day}`, ATTEMPT_LIMIT, ATTEMPT_TTL_SECONDS);
    if (!allowed) throw new Error('Contact notification daily limit reached');
    await dependencies.send(input, reference);
    await dependencies.markSent(reference, token, now);
  } catch (error) {
    await dependencies.release(reference, token, now).catch(() => undefined);
    throw error;
  }
}
