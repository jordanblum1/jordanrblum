// @vitest-environment happy-dom
import { expect, test } from 'vitest';
import {
  CHAR_COUNT_RATIO,
  CONTACT_EMAIL_HREF,
  FOLLOW_UP_CHIPS,
  LIMIT_NOTICE,
  MAX_MESSAGES,
  MAX_MESSAGE_CHARS,
  REVEAL_BLOCK_MS,
  REVEAL_MAX_DELAY_MS,
  REVEAL_STAGGER_MS,
  appendMessage,
  detectExchangeTopic,
  detectTopic,
  followUpsFor,
  formatCharCount,
  hasRoomForTurn,
  hexEncode,
  keyboardInset,
  loadChatState,
  parseSSEBuffer,
  renderNoticeInto,
  revealDelay,
  saveChatState,
  sha256Hex,
  shouldShowCharCount,
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

// --- Follow-up chip topic detection -----------------------------------------

test('detectTopic classifies each starter question', () => {
  expect(detectTopic("What's his recent work experience?")).toBe('work');
  expect(detectTopic('What has he built?')).toBe('projects');
  expect(detectTopic("What's his tech stack?")).toBe('stack');
  expect(detectTopic('How can I get in touch?')).toBe('contact');
});

test('detectTopic reads the assistant reply as well as the question', () => {
  expect(detectTopic('what is he up to? He is an engineer at Roam.')).toBe('work');
  expect(detectTopic('tools? Mostly TypeScript and AWS.')).toBe('stack');
});

test('detectTopic falls back to default for small talk', () => {
  expect(detectTopic('hello there!')).toBe('default');
  expect(detectTopic('nice weather today')).toBe('default');
});

test('detectTopic prefers contact over other topics', () => {
  expect(detectTopic('how do I email Jordan about Roam projects?')).toBe('contact');
});

test('detectExchangeTopic trusts the question over the reply', () => {
  // A work question whose reply mentions "building" a platform must still get
  // work follow-ups, not projects.
  expect(
    detectExchangeTopic(
      "What's his recent work experience?",
      'He spent four years at Procore building the internal deployment platform.',
    ),
  ).toBe('work');
});

test('detectExchangeTopic falls back to the reply for small-talk questions', () => {
  expect(detectExchangeTopic('what keeps him busy?', 'He is an engineer at Roam.')).toBe('work');
  expect(detectExchangeTopic('hello there!', 'Nice to meet you!')).toBe('default');
});

test('followUpsFor returns 2-3 chips from the topic pool', () => {
  for (const topic of ['work', 'projects', 'stack', 'contact', 'default'] as const) {
    const chips = followUpsFor(topic);
    expect(chips.length).toBeGreaterThanOrEqual(2);
    expect(chips.length).toBeLessThanOrEqual(3);
    expect(new Set(chips).size).toBe(chips.length);
  }
});

test('followUpsFor excludes the question that was just asked', () => {
  const [first] = FOLLOW_UP_CHIPS.work;
  const chips = followUpsFor('work', [first.toUpperCase()]);
  expect(chips).not.toContain(first);
  expect(chips.length).toBeGreaterThanOrEqual(2);
});

test('followUpsFor rotates the default pool between offsets', () => {
  const a = followUpsFor('default', [], 0);
  const b = followUpsFor('default', [], 1);
  expect(a).not.toEqual(b);
  expect(a[0]).toBe(FOLLOW_UP_CHIPS.default[0]);
  expect(b[0]).toBe(FOLLOW_UP_CHIPS.default[1]);
});

test('followUpsFor backfills from the default pool when exclusions bite', () => {
  const chips = followUpsFor('contact', FOLLOW_UP_CHIPS.contact);
  expect(chips.length).toBeGreaterThanOrEqual(2);
  for (const chip of chips) expect(FOLLOW_UP_CHIPS.contact).not.toContain(chip);
});

// --- Character counter -------------------------------------------------------

test('shouldShowCharCount trips at 85% of the cap', () => {
  expect(CHAR_COUNT_RATIO).toBe(0.85);
  expect(shouldShowCharCount(1699, 2000)).toBe(false);
  expect(shouldShowCharCount(1700, 2000)).toBe(true);
  expect(shouldShowCharCount(2000, 2000)).toBe(true);
  expect(shouldShowCharCount(0, 2000)).toBe(false);
});

test('shouldShowCharCount rounds the threshold up for odd caps', () => {
  // 85% of 10 is 8.5 — the counter should not appear until 9.
  expect(shouldShowCharCount(8, 10)).toBe(false);
  expect(shouldShowCharCount(9, 10)).toBe(true);
});

test('formatCharCount renders thousands-separated "used / max"', () => {
  expect(formatCharCount(1840, 2000)).toBe('1,840 / 2,000');
  expect(formatCharCount(1700, 2000)).toBe('1,700 / 2,000');
});

// --- Reveal cascade ----------------------------------------------------------

test('revealDelay staggers blocks by 70ms starting at zero', () => {
  expect(REVEAL_STAGGER_MS).toBe(70);
  expect(revealDelay(0)).toBe(0);
  expect(revealDelay(1)).toBe(REVEAL_STAGGER_MS);
  expect(revealDelay(3)).toBe(3 * REVEAL_STAGGER_MS);
});

test('revealDelay caps the stagger so long replies still reveal fast', () => {
  expect(revealDelay(100)).toBe(REVEAL_MAX_DELAY_MS);
  expect(revealDelay(REVEAL_MAX_DELAY_MS / REVEAL_STAGGER_MS + 1)).toBe(REVEAL_MAX_DELAY_MS);
});

test('revealDelay clamps a negative index to zero', () => {
  expect(revealDelay(-2)).toBe(0);
});

test('the whole cascade finishes well under a second', () => {
  // Last block starts at the delay cap and runs for one block duration.
  expect(REVEAL_MAX_DELAY_MS + REVEAL_BLOCK_MS).toBeLessThan(1000);
});

// --- Keyboard inset -----------------------------------------------------------

test('keyboardInset measures how much of the layout viewport the keyboard covers', () => {
  expect(keyboardInset(844, 500, 0)).toBe(344);
  // iOS scrolls the visual viewport down while the keyboard is up: the
  // offsetTop counts toward the visible region, not the keyboard.
  expect(keyboardInset(844, 500, 44)).toBe(300);
  expect(keyboardInset(844, 844, 0)).toBe(0);
});

test('keyboardInset never goes negative and rounds to whole pixels', () => {
  // Rotation races can briefly report a visual viewport taller than the layout one.
  expect(keyboardInset(500, 844, 0)).toBe(0);
  expect(keyboardInset(844, 500.4, 0)).toBe(344);
});

// --- Copy --------------------------------------------------------------------

test('LIMIT_NOTICE carries the approved conversation-full copy', () => {
  expect(LIMIT_NOTICE).toBe(
    "This conversation's full — email Jordan directly, or come back for a fresh start.",
  );
});

test('CONTACT_EMAIL_HREF resolves to the site mailto', () => {
  expect(CONTACT_EMAIL_HREF).toBe('mailto:jordanblum16@gmail.com');
});

// The panel has no persistent mailto anymore — error/limit notices are the
// one surface keeping the email reachable when the backend is down.
test('renderNoticeInto turns the email phrase into a real mailto anchor', () => {
  const el = document.createElement('div');
  renderNoticeInto(el, LIMIT_NOTICE);

  const link = el.querySelector('a');
  expect(link).not.toBeNull();
  expect(link!.getAttribute('href')).toBe('mailto:jordanblum16@gmail.com');
  expect(link!.textContent).toBe('email Jordan directly');
  expect(el.textContent).toBe(LIMIT_NOTICE);
  // Built with createElement, never innerHTML: exactly one element, the anchor.
  expect(el.querySelectorAll('*')).toHaveLength(1);
});

test('renderNoticeInto replaces earlier content and falls back to plain text', () => {
  const el = document.createElement('div');
  renderNoticeInto(el, LIMIT_NOTICE);
  renderNoticeInto(el, 'Jordy is getting a lot of messages right now — give it a minute and try again.');

  expect(el.querySelector('a')).toBeNull();
  expect(el.textContent).toBe('Jordy is getting a lot of messages right now — give it a minute and try again.');
});
