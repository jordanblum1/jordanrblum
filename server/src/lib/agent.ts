import Anthropic from '@anthropic-ai/sdk';
import { betaTool } from '@anthropic-ai/sdk/helpers/beta/json-schema';
import { buildSystemPrompt } from './systemPrompt.js';
import { evaluateEmailReveal } from './tools/revealEmail.js';
import type { ChatMessage, ResumeOfferLogEntry, RevealLogEntry } from './types.js';

export const DEFAULT_MODEL = 'anthropic/claude-haiku-4.5';
export const DEFAULT_MAX_TOKENS = 1200;
const DIRECT_DEFAULT_MODELS = new Set(['claude-haiku-4-5-20251001', 'claude-sonnet-5']);

let client: Anthropic | undefined;

function getClient(): Anthropic {
  if (!client) {
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterApiKey) throw new Error('OPENROUTER_API_KEY is required');
    client = new Anthropic({
      baseURL: 'https://openrouter.ai/api',
      authToken: openRouterApiKey,
      apiKey: null,
    });
  }
  return client;
}

export interface AgentTurnParams {
  messages: ChatMessage[];
  revealLog: RevealLogEntry[];
  resumeOfferLog: ResumeOfferLogEntry[];
  onResumeOffer?: () => void;
  signal?: AbortSignal;
  client?: Anthropic;
}

function countPriorUserTurns(messages: ChatMessage[]): number {
  const userTurns = messages.filter((m) => m.role === 'user').length;
  // The final message is the visitor's current turn — don't count it as "prior".
  return Math.max(userTurns - 1, 0);
}

export function configuredModel(): string {
  const model = process.env.CHAT_MODEL;
  return !model || DIRECT_DEFAULT_MODELS.has(model) ? DEFAULT_MODEL : model;
}

export async function* runAgentTurn({
  messages,
  revealLog,
  resumeOfferLog,
  onResumeOffer,
  signal,
  client: agentClient,
}: AgentTurnParams): AsyncGenerator<string> {
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

  const offerResumeTool = betaTool({
    name: 'offer_resume',
    description:
      "Show the visitor Jordan's resume download card. Call this whenever they ask to see, get, download, or receive Jordan's resume or CV.",
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    run: async () => {
      resumeOfferLog.push({ timestamp: new Date().toISOString() });
      onResumeOffer?.();
      return 'A resume download button will appear automatically below your reply. Briefly tell the visitor to use it; do not invent or paste a resume URL.';
    },
  });

  const model = configuredModel();
  const maxTokens = Number(process.env.CHAT_MAX_TOKENS) || DEFAULT_MAX_TOKENS;

  const runner = (agentClient ?? getClient()).beta.messages.toolRunner(
    {
      model,
      max_tokens: maxTokens,
      system: [
        {
          type: 'text',
          text: buildSystemPrompt(),
          cache_control: { type: 'ephemeral' },
        },
      ],
      tools: [revealEmailTool, offerResumeTool],
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
    },
    { signal },
  );

  for await (const messageStream of runner) {
    for await (const event of messageStream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }
  }
}
