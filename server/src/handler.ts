import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Context } from 'aws-lambda';
import { runAgentTurn, DEFAULT_MODEL } from './lib/agent.js';
import { clientIp, rateLimitBucket } from './lib/clientIp.js';
import { hashIp } from './lib/ipHash.js';
import { checkRateLimit } from './lib/rateLimit.js';
import {
  hasVerifiedResumeAccess,
  requestResumeAccess,
  verifyResumeAccess,
} from './lib/resumeVerification.js';
import { formatSseEvent } from './lib/sse.js';
import { saveTranscript } from './lib/transcripts.js';
import type { ResumeOfferLogEntry, RevealLogEntry } from './lib/types.js';
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
  rawPath?: string;
  headers?: Record<string, string | undefined>;
  requestContext?: {
    http?: {
      method?: string;
      sourceIp?: string;
    };
  };
}

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};

const RESUME_FILENAME = 'Jordan_Blum_Product_Engineer.pdf';

function decodeBody(event: LambdaFunctionUrlEvent): string {
  if (!event.body) return '';
  return event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
}

function parseJsonBody(event: LambdaFunctionUrlEvent): Record<string, unknown> | null {
  const raw = decodeBody(event);
  if (!checkBodySize(raw)) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function respond(
  responseStream: NodeJS.WritableStream,
  statusCode: number,
  body: string | Buffer,
  headers: Record<string, string> = JSON_HEADERS,
): void {
  const stream = awslambda.HttpResponseStream.from(responseStream, { statusCode, headers });
  stream.write(body);
  stream.end();
}

function respondJson(
  responseStream: NodeJS.WritableStream,
  statusCode: number,
  body: Record<string, unknown>,
): void {
  respond(responseStream, statusCode, JSON.stringify(body));
}

async function handleResumeRequest(event: LambdaFunctionUrlEvent, responseStream: NodeJS.WritableStream): Promise<void> {
  const body = parseJsonBody(event);
  if (!body) {
    respondJson(responseStream, 400, { ok: false, error: 'invalid_request' });
    return;
  }

  const result = await requestResumeAccess(body.email, hashIp(rateLimitBucket(clientIp(event))));
  if (result.ok) {
    respondJson(responseStream, 200, result);
    return;
  }
  const status = result.reason === 'rate_limited' ? 429 : result.reason === 'invalid_email' ? 400 : 503;
  respondJson(responseStream, status, { ok: false, error: result.reason });
}

async function handleResumeVerify(event: LambdaFunctionUrlEvent, responseStream: NodeJS.WritableStream): Promise<void> {
  const body = parseJsonBody(event);
  if (!body || typeof body.token !== 'string' || typeof body.code !== 'string') {
    respondJson(responseStream, 400, { ok: false, error: 'invalid_request' });
    return;
  }

  const result = await verifyResumeAccess(body.token, body.code);
  if (result.ok) {
    respondJson(responseStream, 200, result);
    return;
  }
  respondJson(responseStream, result.reason === 'too_many_attempts' ? 429 : 400, {
    ok: false,
    error: result.reason,
  });
}

async function handleResumeDownload(event: LambdaFunctionUrlEvent, responseStream: NodeJS.WritableStream): Promise<void> {
  const body = parseJsonBody(event);
  if (!body || typeof body.token !== 'string' || !(await hasVerifiedResumeAccess(body.token))) {
    respondJson(responseStream, 403, { ok: false, error: 'resume_access_required' });
    return;
  }

  const pdf = readFileSync(join(__dirname, RESUME_FILENAME));
  respond(responseStream, 200, pdf, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${RESUME_FILENAME}"`,
    'Cache-Control': 'private, no-store',
    'Content-Length': String(pdf.byteLength),
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  });
}

async function handleChat(event: LambdaFunctionUrlEvent, responseStream: NodeJS.WritableStream): Promise<void> {
  const httpStream = awslambda.HttpResponseStream.from(responseStream, {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    },
  });

  const startedAt = new Date().toISOString();
  const visitorIp = clientIp(event);
  // Transcripts record the hash of the full visitor address; rate-limit keys
  // hash the /64-bucketed form so IPv6 visitors can't rotate within their
  // allocation to dodge the limiter.
  const ipHash = hashIp(visitorIp);
  const rateKeyHash = hashIp(rateLimitBucket(visitorIp));

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

  const rateLimit = await checkRateLimit(rateKeyHash);
  if (!rateLimit.allowed) {
    httpStream.write(formatSseEvent({ type: 'error', code: 'rate_limited' }));
    httpStream.end();
    return;
  }

  const revealEvents: RevealLogEntry[] = [];
  const resumeOfferEvents: ResumeOfferLogEntry[] = [];
  let assistantReply = '';

  try {
    for await (const delta of runAgentTurn({
      messages,
      revealLog: revealEvents,
      resumeOfferLog: resumeOfferEvents,
      onResumeOffer: () => httpStream.write(formatSseEvent({ type: 'resume_offer' })),
    })) {
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
        resumeOfferEvents,
      });
    } catch (err) {
      console.error('failed to persist transcript', err);
    }
    httpStream.end();
  }
}

export const handler = awslambda.streamifyResponse(async (event, responseStream) => {
  const method = event.requestContext?.http?.method ?? 'POST';
  const path = event.rawPath ?? '/api/chat';

  if (method !== 'POST') {
    respondJson(responseStream, 405, { ok: false, error: 'method_not_allowed' });
    return;
  }

  // Chat owns the response stream from its first line of SSE onward. Keep it
  // outside the JSON-route catch below so an upstream chat failure never
  // attempts to wrap the same Lambda stream a second time as JSON.
  if (path === '/api/chat') return await handleChat(event, responseStream);

  try {
    if (path === '/api/resume/request') return await handleResumeRequest(event, responseStream);
    if (path === '/api/resume/verify') return await handleResumeVerify(event, responseStream);
    if (path === '/api/resume/download') return await handleResumeDownload(event, responseStream);
    respondJson(responseStream, 404, { ok: false, error: 'not_found' });
  } catch (error) {
    console.error('request failed', error);
    respondJson(responseStream, 500, { ok: false, error: 'internal_error' });
  }
});
