import { expect, test } from 'vitest';
import {
  MAX_MESSAGES,
  MAX_MESSAGE_CHARS,
  appendMessage,
  hasRoomForTurn,
  hexEncode,
  loadChatState,
  parseSSEBuffer,
  saveChatState,
  sha256Hex,
  truncateMessage,
  type ChatMessage,
  type ChatState,
} from '../../src/scripts/chat';

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
}

test('truncateMessage leaves short content untouched', () => {
  expect(truncateMessage('hello', 2000)).toBe('hello');
});

test('truncateMessage clips content past the cap', () => {
  const long = 'x'.repeat(MAX_MESSAGE_CHARS + 50);
  const result = truncateMessage(long, MAX_MESSAGE_CHARS);
  expect(result.length).toBe(MAX_MESSAGE_CHARS);
});

test('hasRoomForTurn reserves space for both the user message and its reply', () => {
  const messages = (n: number): ChatMessage[] =>
    Array.from({ length: n }, () => ({ role: 'user', content: 'hi' }));

  expect(hasRoomForTurn(messages(MAX_MESSAGES - 2), MAX_MESSAGES)).toBe(true);
  expect(hasRoomForTurn(messages(MAX_MESSAGES - 1), MAX_MESSAGES)).toBe(false);
  expect(hasRoomForTurn(messages(MAX_MESSAGES), MAX_MESSAGES)).toBe(false);
});

test('appendMessage adds while under the cap and no-ops once full', () => {
  let messages: ChatMessage[] = [];
  messages = appendMessage(messages, { role: 'user', content: 'a' }, 2);
  messages = appendMessage(messages, { role: 'assistant', content: 'b' }, 2);
  expect(messages).toHaveLength(2);

  const full = appendMessage(messages, { role: 'user', content: 'c' }, 2);
  expect(full).toBe(messages);
  expect(full).toHaveLength(2);
});

test('saveChatState and loadChatState round-trip', () => {
  const storage = new MemoryStorage();
  const state: ChatState = {
    conversationId: 'abc-123',
    messages: [{ role: 'user', content: 'hi there' }],
  };
  saveChatState(storage, state, 'k');
  expect(loadChatState(storage, 'k')).toEqual(state);
});

test('loadChatState returns null for a missing key', () => {
  const storage = new MemoryStorage();
  expect(loadChatState(storage, 'nope')).toBeNull();
});

test('loadChatState returns null for malformed JSON', () => {
  const storage = new MemoryStorage();
  storage.setItem('k', '{not json');
  expect(loadChatState(storage, 'k')).toBeNull();
});

test('loadChatState returns null when the shape does not match', () => {
  const storage = new MemoryStorage();
  storage.setItem('k', JSON.stringify({ conversationId: 'x', messages: [{ role: 'system', content: 'no' }] }));
  expect(loadChatState(storage, 'k')).toBeNull();

  storage.setItem('k', JSON.stringify({ messages: [] }));
  expect(loadChatState(storage, 'k')).toBeNull();
});

test('hexEncode produces lowercase hex with zero-padded bytes', () => {
  expect(hexEncode(new Uint8Array([]))).toBe('');
  expect(hexEncode(new Uint8Array([0x00, 0x0f, 0xab, 0xff]))).toBe('000fabff');
});

test('sha256Hex matches the known SHA-256 test vector for "abc"', async () => {
  // FIPS 180-2 test vector: sha256("abc")
  expect(await sha256Hex('abc')).toBe(
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  );
});

test('sha256Hex hashes the empty string to the well-known digest', async () => {
  expect(await sha256Hex('')).toBe(
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  );
});

test('sha256Hex hashes the UTF-8 encoding of non-ASCII input', async () => {
  // sha256(utf8("é")) = sha256(0xc3 0xa9)
  expect(await sha256Hex('é')).toBe(
    '4a99557e4033c3539de2eb65472017cad5f9557f7a0625a09f1c3f6e2ba69c4c',
  );
});

test('parseSSEBuffer parses a single complete event', () => {
  const { events, rest } = parseSSEBuffer('data: {"type":"delta","text":"Hi"}\n\n');
  expect(events).toEqual([{ type: 'delta', text: 'Hi' }]);
  expect(rest).toBe('');
});

test('parseSSEBuffer parses multiple events in one chunk', () => {
  const buffer = 'data: {"type":"delta","text":"a"}\n\ndata: {"type":"delta","text":"b"}\n\ndata: {"type":"done"}\n\n';
  const { events, rest } = parseSSEBuffer(buffer);
  expect(events).toEqual([{ type: 'delta', text: 'a' }, { type: 'delta', text: 'b' }, { type: 'done' }]);
  expect(rest).toBe('');
});

test('parseSSEBuffer carries an incomplete trailing event over as rest', () => {
  const { events, rest } = parseSSEBuffer('data: {"type":"delta","text":"a"}\n\ndata: {"type":"delta","te');
  expect(events).toEqual([{ type: 'delta', text: 'a' }]);
  expect(rest).toBe('data: {"type":"delta","te');
});

test('parseSSEBuffer resumes once the rest of a split event arrives', () => {
  const first = parseSSEBuffer('data: {"type":"delta","te');
  expect(first.events).toEqual([]);
  const second = parseSSEBuffer(`${first.rest}xt":"hi"}\n\n`);
  expect(second.events).toEqual([{ type: 'delta', text: 'hi' }]);
});

test('parseSSEBuffer skips malformed events without throwing', () => {
  const { events } = parseSSEBuffer('data: {not json}\n\ndata: {"type":"done"}\n\n');
  expect(events).toEqual([{ type: 'done' }]);
});

test('parseSSEBuffer carries an error event with its code', () => {
  const { events } = parseSSEBuffer('data: {"type":"error","code":"rate_limited"}\n\n');
  expect(events).toEqual([{ type: 'error', code: 'rate_limited' }]);
});
