import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { ChatMessage, ResumeOfferLogEntry, RevealLogEntry } from './types.js';

let s3Client: S3Client | undefined;

function getClient(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({});
  }
  return s3Client;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export interface TranscriptRecord {
  conversationId: string;
  messages: ChatMessage[];
  assistantReply: string;
  model: string;
  ipHash: string;
  startedAt: string;
  finishedAt: string;
  revealEvents: RevealLogEntry[];
  resumeOfferEvents: ResumeOfferLogEntry[];
}

export function transcriptKey(conversationId: string, startedAt: string): string {
  const date = startedAt.slice(0, 10);
  return `transcripts/${date}/${conversationId}.json`;
}

export async function saveTranscript(record: TranscriptRecord): Promise<void> {
  const bucket = requireEnv('TRANSCRIPTS_BUCKET');
  const key = transcriptKey(record.conversationId, record.startedAt);

  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: JSON.stringify(record, null, 2),
      ContentType: 'application/json',
    }),
  );
}
