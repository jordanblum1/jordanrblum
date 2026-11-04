import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  acquireContactEmailLease,
  markContactEmailSent,
  notifyContact,
  releaseContactEmailLease,
  sendContactEmail,
  type ContactNotificationDependencies,
  type ContactNotificationInput,
} from '../../src/lib/contactNotification.js';

class ConditionalCheckFailedException extends Error {
  override name = 'ConditionalCheckFailedException';
}

const ddbMock = mockClient(DynamoDBDocumentClient);
const sesMock = mockClient(SESv2Client);
const reference = '8cd88f12-bf3e-4df5-94bb-67f011a7510a';
const token = '7620047d-7404-4d01-87c9-8bc92a2bd5a7';
const now = new Date('2026-11-03T20:45:00.000Z');
const input: ContactNotificationInput = {
  name: 'Jordan Blum',
  email: 'hello@example.test',
  message: 'I need help building a small app.',
};

function dependencies(overrides: Partial<ContactNotificationDependencies> = {}): ContactNotificationDependencies {
  return {
    acquire: vi.fn(async (): Promise<'acquired'> => 'acquired'),
    increment: vi.fn(async () => true),
    markSent: vi.fn(async () => undefined),
    release: vi.fn(async () => undefined),
    send: vi.fn(async () => undefined),
    token: () => token,
    now: () => now,
    ...overrides,
  };
}

beforeEach(() => {
  ddbMock.reset();
  sesMock.reset();
  process.env.RATE_TABLE = 'test-rate-table';
});

describe('contact email delivery', () => {
  it('skips a duplicate whose delivery receipt is already sent', async () => {
    const deps = dependencies({ acquire: vi.fn(async (): Promise<'sent'> => 'sent') });

    await notifyContact(input, reference, deps);

    expect(deps.increment).not.toHaveBeenCalled();
    expect(deps.send).not.toHaveBeenCalled();
    expect(deps.markSent).not.toHaveBeenCalled();
  });

  it('releases a failed send so a retry can deliver and mark the receipt sent', async () => {
    let state: 'free' | 'leased' | 'sent' = 'free';
    const send = vi.fn()
      .mockRejectedValueOnce(new Error('SES unavailable'))
      .mockResolvedValueOnce(undefined);
    const deps = dependencies({
      acquire: vi.fn(async (): Promise<'acquired' | 'sent' | 'busy'> => {
        if (state === 'sent') return 'sent';
        if (state === 'leased') return 'busy';
        state = 'leased';
        return 'acquired';
      }),
      send,
      markSent: vi.fn(async () => { state = 'sent'; }),
      release: vi.fn(async () => { state = 'free'; }),
    });

    await expect(notifyContact(input, reference, deps)).rejects.toThrow('SES unavailable');
    await expect(notifyContact(input, reference, deps)).resolves.toBeUndefined();
    await notifyContact(input, reference, deps);

    expect(send).toHaveBeenCalledTimes(2);
    expect(deps.release).toHaveBeenCalledOnce();
    expect(deps.markSent).toHaveBeenCalledOnce();
    expect(deps.increment).toHaveBeenCalledWith('CONTACT_EMAIL_ATTEMPT#2026-11-03', 50, 172800);
  });

  it('rejects a concurrent retry while another lease is active', async () => {
    const deps = dependencies({ acquire: vi.fn(async (): Promise<'busy'> => 'busy') });

    await expect(notifyContact(input, reference, deps)).rejects.toThrow('already in progress');
    expect(deps.send).not.toHaveBeenCalled();
  });

  it('keeps a retry busy while the first invocation waits 16 seconds on its daily counter', async () => {
    let state: 'free' | 'leased' | 'sent' = 'free';
    let leaseExpiresAt = 0;
    let releaseCounter!: (allowed: boolean) => void;
    const increment = vi.fn(() => new Promise<boolean>((resolve) => { releaseCounter = resolve; }));
    const send = vi.fn(async () => undefined);
    const firstNow = now;
    const retryNow = new Date(now.getTime() + 16_000);
    const deps = dependencies({
      now: vi.fn()
        .mockReturnValueOnce(firstNow)
        .mockReturnValueOnce(retryNow),
      acquire: vi.fn(async (_reference, _token, attemptNow): Promise<'acquired' | 'sent' | 'busy'> => {
        const attemptSeconds = Math.floor(attemptNow.getTime() / 1000);
        if (state === 'sent') return 'sent';
        if (state === 'leased' && leaseExpiresAt > attemptSeconds) return 'busy';
        state = 'leased';
        leaseExpiresAt = attemptSeconds + 60;
        return 'acquired';
      }),
      increment,
      send,
      markSent: vi.fn(async () => { state = 'sent'; }),
      release: vi.fn(async () => { state = 'free'; }),
    });

    const firstAttempt = notifyContact(input, reference, deps);
    await vi.waitFor(() => expect(increment).toHaveBeenCalledOnce());
    await expect(notifyContact(input, reference, deps)).rejects.toThrow('already in progress');
    releaseCounter(true);
    await firstAttempt;

    expect(send).toHaveBeenCalledOnce();
    expect(deps.markSent).toHaveBeenCalledOnce();
  });

  it('releases its lease without sending when the daily attempt cap is full', async () => {
    const deps = dependencies({ increment: vi.fn(async () => false) });

    await expect(notifyContact(input, reference, deps)).rejects.toThrow('daily limit reached');
    expect(deps.send).not.toHaveBeenCalled();
    expect(deps.release).toHaveBeenCalledWith(reference, token, now);
  });

  it('uses one conditional write to acquire a new or expired lease', async () => {
    ddbMock.on(UpdateCommand).resolves({});

    await expect(acquireContactEmailLease(reference, token, now)).resolves.toBe('acquired');

    const command = ddbMock.commandCalls(UpdateCommand)[0]?.args[0].input;
    expect(command?.Key).toEqual({ pk: `CONTACT_EMAIL#${reference}` });
    expect(command?.ConditionExpression).toContain('#lease <= :now');
    expect(command?.ExpressionAttributeValues).toMatchObject({
      ':now': 1793738700,
      ':lease': 1793738760,
    });
    expect(ddbMock.commandCalls(GetCommand)).toHaveLength(0);
  });

  it('distinguishes an active concurrent lease from an already-sent receipt after a conditional loss', async () => {
    ddbMock.on(UpdateCommand).rejects(new ConditionalCheckFailedException());
    ddbMock.on(GetCommand)
      .resolvesOnce({ Item: { status: 'sending', leaseExpiresAt: 1793738760 } })
      .resolvesOnce({ Item: { status: 'sent' } });

    await expect(acquireContactEmailLease(reference, token, now)).resolves.toBe('busy');
    await expect(acquireContactEmailLease(reference, token, now)).resolves.toBe('sent');
  });

  it('keeps sent receipts for 30 days and makes sent/release writes owner-conditional', async () => {
    ddbMock.on(UpdateCommand).resolves({});

    await markContactEmailSent(reference, token, now);
    await releaseContactEmailLease(reference, token, now);

    const sent = ddbMock.commandCalls(UpdateCommand)[0]?.args[0].input;
    const released = ddbMock.commandCalls(UpdateCommand)[1]?.args[0].input;
    expect(sent?.ConditionExpression).toBe('#status = :sending AND #token = :token');
    expect(sent?.ExpressionAttributeValues?.[':ttl']).toBe(1796330700);
    expect(released?.ConditionExpression).toBe('#status = :sending AND #token = :token');
    expect(released?.ExpressionAttributeValues?.[':ttl']).toBe(1793738760);
  });

  it('sends only the fixed envelope with the visitor address as Reply-To', async () => {
    sesMock.on(SendEmailCommand).resolves({ MessageId: 'message-id' });

    await sendContactEmail(input, reference);

    const command = sesMock.commandCalls(SendEmailCommand)[0]?.args[0].input;
    expect(command).toMatchObject({
      FromEmailAddress: 'Blum Studios <hi@jordanblum.com>',
      FromEmailAddressIdentityArn: 'arn:aws:ses:us-east-1:868796843372:identity/jordanblum.com',
      Destination: { ToAddresses: ['hi@jordanblum.com'] },
      ReplyToAddresses: ['hello@example.test'],
      Content: { Simple: { Subject: { Data: 'New Blum Studios project inquiry' } } },
    });
    expect(command?.Content?.Simple?.Body?.Text?.Data).toContain(`Reference: ${reference}`);
  });
});
