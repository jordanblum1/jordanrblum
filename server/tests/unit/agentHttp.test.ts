import { createServer, type IncomingHttpHeaders, type ServerResponse } from 'node:http';
import Anthropic from '@anthropic-ai/sdk';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_MODEL, runAgentTurn } from '../../src/lib/agent.js';

interface RecordedRequest {
  url: string;
  headers: IncomingHttpHeaders;
  body: Record<string, unknown>;
}

const openServers = new Set<ReturnType<typeof createServer>>();

async function startFixture(
  respond: (request: RecordedRequest, response: ServerResponse) => void,
): Promise<{ baseURL: string; requests: RecordedRequest[] }> {
  const requests: RecordedRequest[] = [];
  const server = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const recorded = {
      url: request.url ?? '',
      headers: request.headers,
      body: JSON.parse(Buffer.concat(chunks).toString()) as Record<string, unknown>,
    };
    requests.push(recorded);
    respond(recorded, response);
  });
  openServers.add(server);

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected a TCP fixture address');
  return { baseURL: `http://127.0.0.1:${address.port}/api`, requests };
}

function sendEvents(response: ServerResponse, events: Array<Record<string, unknown>>): void {
  response.writeHead(200, { 'Content-Type': 'text/event-stream' });
  for (const event of events) {
    response.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
  }
  response.end();
}

function messageStart(): Record<string, unknown> {
  return {
    type: 'message_start',
    message: {
      id: 'msg_fixture',
      type: 'message',
      role: 'assistant',
      model: DEFAULT_MODEL,
      content: [],
      stop_reason: null,
      stop_sequence: null,
      usage: { input_tokens: 20, output_tokens: 0 },
    },
  };
}

function toolUseEvents(): Array<Record<string, unknown>> {
  return [
    messageStart(),
    {
      type: 'content_block_start',
      index: 0,
      content_block: { type: 'tool_use', id: 'toolu_resume', name: 'offer_resume', input: {} },
    },
    { type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json: '' } },
    { type: 'content_block_stop', index: 0 },
    {
      type: 'message_delta',
      delta: { stop_reason: 'tool_use', stop_sequence: null },
      usage: { output_tokens: 4 },
    },
    { type: 'message_stop' },
  ];
}

function textEvents(): Array<Record<string, unknown>> {
  return [
    messageStart(),
    { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '', citations: null } },
    { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Use the ' } },
    { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'button below.' } },
    { type: 'content_block_stop', index: 0 },
    {
      type: 'message_delta',
      delta: { stop_reason: 'end_turn', stop_sequence: null },
      usage: { output_tokens: 5 },
    },
    { type: 'message_stop' },
  ];
}

function fixtureClient(baseURL: string): Anthropic {
  return new Anthropic({
    baseURL,
    authToken: 'fixture-openrouter-key',
    apiKey: null,
    maxRetries: 0,
  });
}

afterEach(async () => {
  await Promise.all(
    [...openServers].map(
      (server) => new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
    ),
  );
  openServers.clear();
});

beforeEach(() => {
  delete process.env.CHAT_MODEL;
  delete process.env.CHAT_MAX_TOKENS;
});

describe('OpenRouter Anthropic SDK HTTP contract', () => {
  it('streams through a tool continuation with the exact model, history, cache marker, and Bearer auth', async () => {
    const fixture = await startFixture((_request, response) => {
      sendEvents(response, fixture.requests.length === 1 ? toolUseEvents() : textEvents());
    });
    const resumeOfferLog: Array<{ timestamp: string }> = [];
    let resumeOffered = 0;
    const chunks: string[] = [];

    for await (const chunk of runAgentTurn({
      messages: [
        { role: 'user', content: 'What have you built?' },
        { role: 'assistant', content: 'A few products.' },
        { role: 'user', content: 'Can I get your resume?' },
      ],
      revealLog: [],
      resumeOfferLog,
      onResumeOffer: () => resumeOffered++,
      client: fixtureClient(fixture.baseURL),
    })) {
      chunks.push(chunk);
    }

    expect(chunks.join('')).toBe('Use the button below.');
    expect(resumeOffered).toBe(1);
    expect(resumeOfferLog).toHaveLength(1);
    expect(fixture.requests).toHaveLength(2);

    const first = fixture.requests[0]!;
    expect(first.url).toBe('/api/v1/messages?beta=true');
    expect(first.headers.authorization).toBe('Bearer fixture-openrouter-key');
    expect(first.headers['x-api-key']).toBeUndefined();
    expect(first.body).toMatchObject({
      model: 'anthropic/claude-haiku-4.5',
      max_tokens: 1200,
      provider: { data_collection: 'deny' },
      stream: true,
      messages: [
        { role: 'user', content: 'What have you built?' },
        { role: 'assistant', content: 'A few products.' },
        { role: 'user', content: 'Can I get your resume?' },
      ],
    });
    expect(first.body).not.toHaveProperty('fallbacks');
    expect(first.body.system).toEqual([
      expect.objectContaining({ type: 'text', cache_control: { type: 'ephemeral' } }),
    ]);
    expect(first.body.tools).toEqual([
      expect.objectContaining({ name: 'reveal_email' }),
      expect.objectContaining({ name: 'offer_resume' }),
    ]);

    const continuationRequest = fixture.requests[1]!.body;
    expect(continuationRequest.provider).toEqual({ data_collection: 'deny' });
    const continuation = continuationRequest.messages as Array<Record<string, unknown>>;
    expect(continuation).toHaveLength(5);
    expect(continuation[3]).toMatchObject({
      role: 'assistant',
      content: [expect.objectContaining({ type: 'tool_use', id: 'toolu_resume', name: 'offer_resume' })],
    });
    expect(continuation[4]).toMatchObject({
      role: 'user',
      content: [expect.objectContaining({ type: 'tool_result', tool_use_id: 'toolu_resume' })],
    });
  });

  it('surfaces an upstream OpenRouter failure', async () => {
    const fixture = await startFixture((_request, response) => {
      response.writeHead(503, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ type: 'error', error: { type: 'api_error', message: 'fixture unavailable' } }));
    });

    const consume = async () => {
      for await (const _chunk of runAgentTurn({
        messages: [{ role: 'user', content: 'Hi' }],
        revealLog: [],
        resumeOfferLog: [],
        client: fixtureClient(fixture.baseURL),
      })) {
        // drain the generator
      }
    };

    await expect(consume()).rejects.toThrow('fixture unavailable');
  });

  it('aborts the in-flight SDK request through the tool runner signal', async () => {
    const controller = new AbortController();
    const fixture = await startFixture((_request, _response) => controller.abort());

    const consume = async () => {
      for await (const _chunk of runAgentTurn({
        messages: [{ role: 'user', content: 'Hi' }],
        revealLog: [],
        resumeOfferLog: [],
        signal: controller.signal,
        client: fixtureClient(fixture.baseURL),
      })) {
        // drain the generator
      }
    };

    await expect(consume()).rejects.toThrow('Request was aborted');
  });
});
