import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage, RevealLogEntry } from '../../src/lib/types.js';

let capturedParams: Record<string, unknown> | undefined;
let capturedClientOptions: Record<string, unknown> | undefined;

vi.mock('@anthropic-ai/sdk', () => {
  class FakeAnthropic {
    constructor(options: Record<string, unknown>) {
      capturedClientOptions = options;
    }

    beta = {
      messages: {
        toolRunner: (params: Record<string, unknown>) => {
          capturedParams = params;
          async function* innerEvents() {
            yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hello' } };
            yield { type: 'content_block_delta', delta: { type: 'text_delta', text: ' world' } };
          }
          async function* outer() {
            yield innerEvents();
          }
          return outer();
        },
      },
    };
  }
  return { default: FakeAnthropic };
});

describe('runAgentTurn', () => {
  beforeEach(() => {
    vi.resetModules();
    capturedParams = undefined;
    capturedClientOptions = undefined;
    delete process.env.CHAT_MODEL;
    delete process.env.CHAT_MAX_TOKENS;
    process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
  });

  it('streams text deltas from the mocked tool runner', async () => {
    const { runAgentTurn } = await import('../../src/lib/agent.js');
    const messages: ChatMessage[] = [{ role: 'user', content: 'Hi' }];
    const revealLog: RevealLogEntry[] = [];

    const chunks: string[] = [];
    for await (const chunk of runAgentTurn({ messages, revealLog, resumeOfferLog: [] })) {
      chunks.push(chunk);
    }

    expect(chunks.join('')).toBe('Hello world');
  });

  it('uses the OpenRouter Anthropic endpoint with Bearer auth only', async () => {
    const { runAgentTurn } = await import('../../src/lib/agent.js');

    for await (const _chunk of runAgentTurn({ messages: [{ role: 'user', content: 'Hi' }], revealLog: [], resumeOfferLog: [] })) {
      // drain the generator
    }

    expect(capturedClientOptions).toEqual({
      baseURL: 'https://openrouter.ai/api',
      authToken: 'test-openrouter-key',
      apiKey: null,
    });
  });

  it('fails closed when the OpenRouter key is missing', async () => {
    delete process.env.OPENROUTER_API_KEY;
    const { runAgentTurn } = await import('../../src/lib/agent.js');

    const consume = async () => {
      for await (const _chunk of runAgentTurn({ messages: [{ role: 'user', content: 'Hi' }], revealLog: [], resumeOfferLog: [] })) {
        // drain the generator
      }
    };

    await expect(consume()).rejects.toThrow('OPENROUTER_API_KEY is required');
  });

  it('defaults to the exact OpenRouter Claude Haiku 4.5 model and 1200 max_tokens, with cache_control on the system prompt', async () => {
    const { runAgentTurn } = await import('../../src/lib/agent.js');
    const messages: ChatMessage[] = [{ role: 'user', content: 'Hi' }];

    for await (const _chunk of runAgentTurn({ messages, revealLog: [], resumeOfferLog: [] })) {
      // drain the generator
    }

    expect(capturedParams?.model).toBe('anthropic/claude-haiku-4.5');
    expect(capturedParams?.max_tokens).toBe(1200);
    const system = capturedParams?.system as Array<{ cache_control?: unknown }>;
    expect(system[0]?.cache_control).toEqual({ type: 'ephemeral' });
  });

  it('honors CHAT_MODEL and CHAT_MAX_TOKENS env overrides', async () => {
    process.env.CHAT_MODEL = 'anthropic/claude-sonnet-4.5';
    process.env.CHAT_MAX_TOKENS = '400';
    const { runAgentTurn } = await import('../../src/lib/agent.js');

    for await (const _chunk of runAgentTurn({ messages: [{ role: 'user', content: 'Hi' }], revealLog: [], resumeOfferLog: [] })) {
      // drain the generator
    }

    expect(capturedParams?.model).toBe('anthropic/claude-sonnet-4.5');
    expect(capturedParams?.max_tokens).toBe(400);
  });

  it.each(['claude-haiku-4-5-20251001', 'claude-sonnet-5'])(
    'normalizes the direct Anthropic model %s during deployment cutover',
    async (directModel) => {
      process.env.CHAT_MODEL = directModel;
      const { runAgentTurn } = await import('../../src/lib/agent.js');

      for await (const _chunk of runAgentTurn({ messages: [{ role: 'user', content: 'Hi' }], revealLog: [], resumeOfferLog: [] })) {
        // drain the generator
      }

      expect(capturedParams?.model).toBe('anthropic/claude-haiku-4.5');
    },
  );

  it('registers the contact and resume tools', async () => {
    const { runAgentTurn } = await import('../../src/lib/agent.js');
    for await (const _chunk of runAgentTurn({ messages: [{ role: 'user', content: 'Hi' }], revealLog: [], resumeOfferLog: [] })) {
      // drain the generator
    }
    const tools = capturedParams?.tools as Array<{ name: string }>;
    expect(tools.map((tool) => tool.name)).toEqual(['reveal_email', 'offer_resume']);
  });
});
