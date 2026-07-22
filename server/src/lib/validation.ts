import type { ChatMessage } from './types.js';

export const MAX_BODY_BYTES = 16 * 1024;
export const MAX_MESSAGE_BYTES = 2 * 1024;
export const MAX_MESSAGES = 20;

export interface ChatRequestBody {
  conversationId: string;
  messages: ChatMessage[];
}

export type ValidationResult =
  | { ok: true; value: ChatRequestBody }
  | { ok: false; reason: string };

export function checkBodySize(raw: string): boolean {
  return Buffer.byteLength(raw, 'utf8') <= MAX_BODY_BYTES;
}

export function validateRequest(input: unknown): ValidationResult {
  if (typeof input !== 'object' || input === null) {
    return { ok: false, reason: 'body_not_an_object' };
  }
  const body = input as Record<string, unknown>;

  if (typeof body.conversationId !== 'string' || body.conversationId.length === 0 || body.conversationId.length > 200) {
    return { ok: false, reason: 'invalid_conversation_id' };
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > MAX_MESSAGES) {
    return { ok: false, reason: 'invalid_messages_array' };
  }

  const messages: ChatMessage[] = [];
  for (const raw of body.messages) {
    if (typeof raw !== 'object' || raw === null) {
      return { ok: false, reason: 'invalid_message_shape' };
    }
    const m = raw as Record<string, unknown>;
    if (m.role !== 'user' && m.role !== 'assistant') {
      return { ok: false, reason: 'invalid_message_role' };
    }
    if (typeof m.content !== 'string' || m.content.length === 0) {
      return { ok: false, reason: 'invalid_message_content' };
    }
    if (Buffer.byteLength(m.content, 'utf8') > MAX_MESSAGE_BYTES) {
      return { ok: false, reason: 'message_too_large' };
    }
    messages.push({ role: m.role, content: m.content });
  }

  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== 'user') {
    return { ok: false, reason: 'last_message_must_be_user' };
  }

  return { ok: true, value: { conversationId: body.conversationId, messages } };
}
