import type { Context } from 'aws-lambda';
import { runAgentTurn, DEFAULT_MODEL } from './lib/agent.js';
import { hashIp } from './lib/ipHash.js';
import { checkRateLimit } from './lib/rateLimit.js';
import { formatSseEvent } from './lib/sse.js';
import { saveTranscript } from './lib/transcripts.js';
import type { RevealLogEntry } from './lib/types.js';
import { checkBodySize, validateRequest } from './lib/validation.js';

// Provided by the Lambda Node.js runtime for response-streaming functions —
// not an importable module, so it's declared as a runtime global here.
declare const awslambda: {
  streamifyResponse: (
    handler: (event: LambdaFunctionUrlEvent, responseStream: NodeJS.WritableStream, context: Context) => Promise<void>,
  ) => unknown;
  HttpResponseStream: {
    from(
      responseStream: NodeJS.WritableStream,
      metadata: { statusCode?: number; headers?: Record<string, string> },
    ): NodeJS.WritableStream;
  };
};

interface LambdaFunctionUrlEvent {
  body?: string;
  isBase64Encoded?: boolean;
  requestContext?: {
    http?: {
      sourceIp?: string;
    };
  };
}

function decodeBody(event: LambdaFunctionUrlEvent): string {
  if (!event.body) return '';
  return event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
}

export const handler = awslambda.streamifyResponse(async (event, responseStream) => {
  const httpStream = awslambda.HttpResponseStream.from(responseStream, {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });

  const startedAt = new Date().toISOString();
  const ipHash = hashIp(event.requestContext?.http?.sourceIp ?? 'unknown');

  const rawBody = decodeBody(event);
  if (!checkBodySize(rawBody)) {
    httpStream.write(formatSseEvent({ type: 'error', code: 'invalid_input' }));
    httpStream.end();
    return;
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    httpStream.write(formatSseEvent({ type: 'error', code: 'invalid_input' }));
    httpStream.end();
    return;
  }

  const validation = validateRequest(parsedBody);
  if (!validation.ok) {
    httpStream.write(formatSseEvent({ type: 'error', code: 'invalid_input' }));
    httpStream.end();
    return;
  }
  const { conversationId, messages } = validation.value;

  const rateLimit = await checkRateLimit(ipHash);
  if (!rateLimit.allowed) {
    httpStream.write(formatSseEvent({ type: 'error', code: 'rate_limited' }));
    httpStream.end();
    return;
  }

  const revealEvents: RevealLogEntry[] = [];
  let assistantReply = '';

  try {
    for await (const delta of runAgentTurn({ messages, revealLog: revealEvents })) {
      assistantReply += delta;
      httpStream.write(formatSseEvent({ type: 'delta', text: delta }));
    }
    httpStream.write(formatSseEvent({ type: 'done' }));
  } catch (err) {
    console.error('agent turn failed', err);
    httpStream.write(formatSseEvent({ type: 'error', code: 'internal_error' }));
  } finally {
    try {
      await saveTranscript({
        conversationId,
        messages,
        assistantReply,
        model: process.env.CHAT_MODEL || DEFAULT_MODEL,
        ipHash,
        startedAt,
        finishedAt: new Date().toISOString(),
        revealEvents,
      });
    } catch (err) {
      console.error('failed to persist transcript', err);
    }
    httpStream.end();
  }
});
