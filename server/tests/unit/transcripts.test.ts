import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { beforeEach, describe, expect, it } from 'vitest';
import { saveTranscript, transcriptKey } from '../../src/lib/transcripts.js';

const s3Mock = mockClient(S3Client);

beforeEach(() => {
  s3Mock.reset();
  process.env.TRANSCRIPTS_BUCKET = 'test-transcripts-bucket';
});

describe('transcriptKey', () => {
  it('builds a YYYY-MM-DD partitioned key from the turn start time', () => {
    expect(transcriptKey('conv-1', '2026-07-21T10:00:00.000Z')).toBe('transcripts/2026-07-21/conv-1.json');
  });
});

describe('saveTranscript', () => {
  it('PutObjects the full conversation as JSON, keyed by date and conversationId', async () => {
    s3Mock.on(PutObjectCommand).resolves({});

    await saveTranscript({
      conversationId: 'conv-42',
      messages: [{ role: 'user', content: 'hi' }],
      assistantReply: 'hello!',
      model: 'claude-sonnet-5',
      ipHash: 'abc123',
      startedAt: '2026-07-21T10:00:00.000Z',
      finishedAt: '2026-07-21T10:00:05.000Z',
      revealEvents: [{ timestamp: '2026-07-21T10:00:03.000Z', allowed: false, reason: 'insufficient_conversation' }],
      resumeOfferEvents: [{ timestamp: '2026-07-21T10:00:04.000Z' }],
    });

    const calls = s3Mock.commandCalls(PutObjectCommand);
    expect(calls).toHaveLength(1);

    const input = calls[0]?.args[0].input;
    expect(input?.Bucket).toBe('test-transcripts-bucket');
    expect(input?.Key).toBe('transcripts/2026-07-21/conv-42.json');
    expect(input?.ContentType).toBe('application/json');

    const body = JSON.parse(input?.Body as string);
    expect(body).toMatchObject({
      conversationId: 'conv-42',
      messages: [{ role: 'user', content: 'hi' }],
      assistantReply: 'hello!',
      model: 'claude-sonnet-5',
      ipHash: 'abc123',
      startedAt: '2026-07-21T10:00:00.000Z',
      finishedAt: '2026-07-21T10:00:05.000Z',
    });
    expect(body.revealEvents).toHaveLength(1);
    expect(body.revealEvents[0]).toMatchObject({ allowed: false, reason: 'insufficient_conversation' });
    expect(body.resumeOfferEvents).toHaveLength(1);
  });

  it('throws if TRANSCRIPTS_BUCKET is not configured', async () => {
    delete process.env.TRANSCRIPTS_BUCKET;

    await expect(
      saveTranscript({
        conversationId: 'conv-1',
        messages: [],
        assistantReply: '',
        model: 'claude-sonnet-5',
        ipHash: 'abc',
        startedAt: '2026-07-21T10:00:00.000Z',
        finishedAt: '2026-07-21T10:00:00.000Z',
        revealEvents: [],
        resumeOfferEvents: [],
      }),
    ).rejects.toThrow(/TRANSCRIPTS_BUCKET/);
  });
});
