import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { beforeEach, describe, expect, it } from 'vitest';
import { checkRateLimit } from '../../src/lib/rateLimit.js';

class ConditionalCheckFailedException extends Error {
  override name = 'ConditionalCheckFailedException';
}

const ddbMock = mockClient(DynamoDBDocumentClient);

beforeEach(() => {
  ddbMock.reset();
  process.env.RATE_TABLE = 'test-rate-table';
});

describe('checkRateLimit', () => {
  it('allows a request within both the per-minute and per-day limits', async () => {
    ddbMock.on(UpdateCommand).resolves({});

    const result = await checkRateLimit('ip-hash-1');

    expect(result.allowed).toBe(true);
    expect(ddbMock.commandCalls(UpdateCommand)).toHaveLength(2);
  });

  it('rejects once the per-minute limit (10/min) is exceeded, without checking the daily counter', async () => {
    ddbMock.on(UpdateCommand).rejects(new ConditionalCheckFailedException());

    const result = await checkRateLimit('ip-hash-2');

    expect(result.allowed).toBe(false);
    expect(ddbMock.commandCalls(UpdateCommand)).toHaveLength(1);
  });

  it('rejects once the per-day limit (60/day) is exceeded, after the minute check passes', async () => {
    ddbMock.on(UpdateCommand).resolvesOnce({}).rejectsOnce(new ConditionalCheckFailedException());

    const result = await checkRateLimit('ip-hash-3');

    expect(result.allowed).toBe(false);
    expect(ddbMock.commandCalls(UpdateCommand)).toHaveLength(2);
  });

  it('propagates unexpected DynamoDB errors instead of silently allowing the request', async () => {
    ddbMock.on(UpdateCommand).rejects(new Error('network blip'));

    await expect(checkRateLimit('ip-hash-4')).rejects.toThrow('network blip');
  });
});
