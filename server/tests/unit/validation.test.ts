import { describe, expect, it } from 'vitest';
import { MAX_MESSAGE_BYTES, MAX_MESSAGES, checkBodySize, validateRequest } from '../../src/lib/validation.js';

function baseBody(overrides: Record<string, unknown> = {}) {
  return {
    conversationId: 'conv-1',
    messages: [{ role: 'user', content: 'Hello there' }],
    ...overrides,
  };
}

describe('checkBodySize', () => {
  it('accepts a body at or under 16 KB', () => {
    expect(checkBodySize('x'.repeat(16 * 1024))).toBe(true);
  });

  it('rejects a body over 16 KB', () => {
    expect(checkBodySize('x'.repeat(16 * 1024 + 1))).toBe(false);
  });
});

describe('validateRequest', () => {
  it('accepts a well-formed request', () => {
    const result = validateRequest(baseBody());
    expect(result.ok).toBe(true);
  });

  it('rejects a non-object body', () => {
    expect(validateRequest('nope').ok).toBe(false);
    expect(validateRequest(null).ok).toBe(false);
  });

  it('rejects a missing or empty conversationId', () => {
    expect(validateRequest(baseBody({ conversationId: '' })).ok).toBe(false);
    expect(validateRequest(baseBody({ conversationId: undefined })).ok).toBe(false);
  });

  it('rejects a non-array messages field', () => {
    expect(validateRequest(baseBody({ messages: 'hi' })).ok).toBe(false);
  });

  it('rejects an empty messages array', () => {
    expect(validateRequest(baseBody({ messages: [] })).ok).toBe(false);
  });

  it(`rejects more than ${MAX_MESSAGES} messages`, () => {
    const messages = Array.from({ length: MAX_MESSAGES + 1 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: 'hi',
    }));
    // keep the last message a user turn so that isn't what trips the check
    messages[messages.length - 1] = { role: 'user', content: 'hi' };
    expect(validateRequest(baseBody({ messages })).ok).toBe(false);
  });

  it(`accepts exactly ${MAX_MESSAGES} messages`, () => {
    const messages = Array.from({ length: MAX_MESSAGES }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: 'hi',
    }));
    messages[messages.length - 1] = { role: 'user', content: 'hi' };
    expect(validateRequest(baseBody({ messages })).ok).toBe(true);
  });

  it('rejects an invalid role', () => {
    expect(validateRequest(baseBody({ messages: [{ role: 'system', content: 'hi' }] })).ok).toBe(false);
  });

  it('rejects empty message content', () => {
    expect(validateRequest(baseBody({ messages: [{ role: 'user', content: '' }] })).ok).toBe(false);
  });

  it(`rejects message content over ${MAX_MESSAGE_BYTES} bytes`, () => {
    const oversized = 'a'.repeat(MAX_MESSAGE_BYTES + 1);
    expect(validateRequest(baseBody({ messages: [{ role: 'user', content: oversized }] })).ok).toBe(false);
  });

  it(`accepts message content at exactly ${MAX_MESSAGE_BYTES} bytes`, () => {
    const atLimit = 'a'.repeat(MAX_MESSAGE_BYTES);
    expect(validateRequest(baseBody({ messages: [{ role: 'user', content: atLimit }] })).ok).toBe(true);
  });

  it('rejects a conversation that does not end on a user turn', () => {
    const messages = [
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hello' },
    ];
    expect(validateRequest(baseBody({ messages })).ok).toBe(false);
  });
});
