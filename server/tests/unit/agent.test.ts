import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage, RevealLogEntry } from '../../src/lib/types.js';

let capturedParams: Record<string, unknown> | undefined;

vi.mock('@anthropic-ai/sdk', () => {
  class FakeAnthropic {
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
    capturedParams = undefined;
    delete process.env.CHAT_MODEL;
    delete process.env.CHAT_MAX_TOKENS;
  });

  it('streams text deltas from the mocked tool runner', async () => {
    const { runAgentTurn } = await import('../../src/lib/agent.js');
    const messages: ChatMessage[] = [{ role: 'user', content: 'Hi' }];
    const revealLog: RevealLogEntry[] = [];

    const chunks: string[] = [];
    for await (const chunk of runAgentTurn({ messages, revealLog })) {
      chunks.push(chunk);
    }

    expect(chunks.join('')).toBe('Hello world');
  });

  it('defaults to claude-sonnet-5 and 800 max_tokens, with cache_control on the system prompt', async () => {
    const { runAgentTurn } = await import('../../src/lib/agent.js');
    const messages: ChatMessage[] = [{ role: 'user', content: 'Hi' }];

    for await (const _chunk of runAgentTurn({ messages, revealLog: [] })) {
      // drain the generator
    }

    expect(capturedParams?.model).toBe('claude-sonnet-5');
    expect(capturedParams?.max_tokens).toBe(800);
    const system = capturedParams?.system as Array<{ cache_control?: unknown }>;
    expect(system[0]?.cache_control).toEqual({ type: 'ephemeral' });
  });

  it('honors CHAT_MODEL and CHAT_MAX_TOKENS env overrides', async () => {
    process.env.CHAT_MODEL = 'claude-haiku-4-5-20251001';
    process.env.CHAT_MAX_TOKENS = '400';
    const { runAgentTurn } = await import('../../src/lib/agent.js');

    for await (const _chunk of runAgentTurn({ messages: [{ role: 'user', content: 'Hi' }], revealLog: [] })) {
      // drain the generator
    }

    expect(capturedParams?.model).toBe('claude-haiku-4-5-20251001');
    expect(capturedParams?.max_tokens).toBe(400);
  });

  it('registers exactly one tool: reveal_email', async () => {
    const { runAgentTurn } = await import('../../src/lib/agent.js');
    for await (const _chunk of runAgentTurn({ messages: [{ role: 'user', content: 'Hi' }], revealLog: [] })) {
      // drain the generator
    }
    const tools = capturedParams?.tools as Array<{ name: string }>;
    expect(tools).toHaveLength(1);
    expect(tools[0]?.name).toBe('reveal_email');
  });
});
