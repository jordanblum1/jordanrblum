import Anthropic from '@anthropic-ai/sdk';
import { betaTool } from '@anthropic-ai/sdk/helpers/beta/json-schema';
import { buildSystemPrompt } from './systemPrompt.js';
import { evaluateEmailReveal } from './tools/revealEmail.js';
import type { ChatMessage, RevealLogEntry } from './types.js';

export const DEFAULT_MODEL = 'claude-sonnet-5';
export const DEFAULT_MAX_TOKENS = 800;

let client: Anthropic | undefined;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

export interface AgentTurnParams {
  messages: ChatMessage[];
  revealLog: RevealLogEntry[];
}

function countPriorUserTurns(messages: ChatMessage[]): number {
  const userTurns = messages.filter((m) => m.role === 'user').length;
  // The final message is the visitor's current turn — don't count it as "prior".
  return Math.max(userTurns - 1, 0);
}

export async function* runAgentTurn({ messages, revealLog }: AgentTurnParams): AsyncGenerator<string> {
  const priorUserTurns = countPriorUserTurns(messages);

  const revealEmailTool = betaTool({
    name: 'reveal_email',
    description:
      "Reveal Jordan's contact email to the visitor. Call this only when the visitor has clearly asked how to contact or email Jordan directly — the handler decides whether the reveal is actually allowed.",
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    run: async () => {
      const result = await evaluateEmailReveal({ priorUserTurns });
      revealLog.push({
        timestamp: new Date().toISOString(),
        allowed: result.allowed,
        reason: result.reason,
      });
      return result.allowed
        ? `You may share this email address with the visitor: ${result.email}`
        : `Do not reveal an email address right now. ${result.refusalInstruction}`;
    },
  });

  const model = process.env.CHAT_MODEL || DEFAULT_MODEL;
  const maxTokens = Number(process.env.CHAT_MAX_TOKENS) || DEFAULT_MAX_TOKENS;

  const runner = getClient().beta.messages.toolRunner({
    model,
    max_tokens: maxTokens,
    system: [
      {
        type: 'text',
        text: buildSystemPrompt(),
        cache_control: { type: 'ephemeral' },
      },
    ],
    tools: [revealEmailTool],
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    stream: true,
  });

  for await (const messageStream of runner) {
    for await (const event of messageStream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }
  }
}
