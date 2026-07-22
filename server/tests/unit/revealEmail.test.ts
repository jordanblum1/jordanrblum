import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { beforeEach, describe, expect, it } from 'vitest';
import { MIN_PRIOR_USER_TURNS, evaluateEmailReveal } from '../../src/lib/tools/revealEmail.js';

class ConditionalCheckFailedException extends Error {
  override name = 'ConditionalCheckFailedException';
}

const ddbMock = mockClient(DynamoDBDocumentClient);

beforeEach(() => {
  ddbMock.reset();
  process.env.RATE_TABLE = 'test-rate-table';
  process.env.CONTACT_EMAIL = 'contact@example.com';
});

describe('evaluateEmailReveal', () => {
  it(`denies when fewer than ${MIN_PRIOR_USER_TURNS} prior visitor turns have happened`, async () => {
    const result = await evaluateEmailReveal({ priorUserTurns: MIN_PRIOR_USER_TURNS - 1 });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('insufficient_conversation');
    expect(result.email).toBeUndefined();
    // Doesn't even touch the daily-cap counter when the turn gate fails.
    expect(ddbMock.commandCalls(UpdateCommand)).toHaveLength(0);
  });

  it('allows once the turn threshold is met and the daily cap has room', async () => {
    ddbMock.on(UpdateCommand).resolves({});

    const result = await evaluateEmailReveal({ priorUserTurns: MIN_PRIOR_USER_TURNS });

    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('allowed');
    expect(result.email).toBe('contact@example.com');
  });

  it('denies once the global daily reveal cap (20/day) is hit', async () => {
    ddbMock.on(UpdateCommand).rejects(new ConditionalCheckFailedException());

    const result = await evaluateEmailReveal({ priorUserTurns: MIN_PRIOR_USER_TURNS });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('daily_cap_reached');
    expect(result.email).toBeUndefined();
  });

  it('denies (without throwing) when CONTACT_EMAIL is not configured', async () => {
    delete process.env.CONTACT_EMAIL;
    ddbMock.on(UpdateCommand).resolves({});

    const result = await evaluateEmailReveal({ priorUserTurns: MIN_PRIOR_USER_TURNS });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('contact_email_not_configured');
  });
});
