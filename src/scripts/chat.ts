import { MarkdownStream, renderMarkdownInto } from './chat-markdown';

export const MAX_MESSAGES = 20;
export const MAX_MESSAGE_CHARS = 2000;

const STORAGE_KEY = 'jrb-chat-state-v1';
const ENDPOINT = (import.meta.env.PUBLIC_CHAT_ENDPOINT as string | undefined) ?? '/api/chat';

const NETWORK_ERROR_MESSAGE =
  'Something went wrong reaching Jordy. Please try again, or email Jordan directly below.';
const LIMIT_NOTICE =
  'This conversation has reached its message limit. Feel free to start a new visit later, or email Jordan directly below.';

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatState {
  conversationId: string;
  messages: ChatMessage[];
}

export interface ChatEvent {
  type: 'delta' | 'done' | 'error';
  text?: string;
  code?: string;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function truncateMessage(content: string, max: number = MAX_MESSAGE_CHARS): string {
  return content.length > max ? content.slice(0, max) : content;
}

// A turn always writes a user message and (on success) an assistant reply, so a
// turn only starts if both slots fit under the cap — otherwise a user message
// could get stranded with no room left for its reply.
export function hasRoomForTurn(messages: ChatMessage[], max: number = MAX_MESSAGES): boolean {
  return messages.length + 2 <= max;
}

export function appendMessage(
  messages: ChatMessage[],
  message: ChatMessage,
  max: number = MAX_MESSAGES,
): ChatMessage[] {
  if (messages.length >= max) return messages;
  return [...messages, message];
}

export function loadChatState(storage: StorageLike, key: string = STORAGE_KEY): ChatState | null {
  const raw = storage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.conversationId === 'string' &&
      Array.isArray(parsed.messages) &&
      parsed.messages.every(
        (m: unknown): m is ChatMessage =>
          !!m &&
          typeof m === 'object' &&
          ((m as ChatMessage).role === 'user' || (m as ChatMessage).role === 'assistant') &&
          typeof (m as ChatMessage).content === 'string',
      )
    ) {
      return parsed as ChatState;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveChatState(storage: StorageLike, state: ChatState, key: string = STORAGE_KEY): void {
  storage.setItem(key, JSON.stringify(state));
}

export function hexEncode(bytes: Uint8Array): string {
  let hex = '';
  for (const byte of bytes) hex += byte.toString(16).padStart(2, '0');
  return hex;
}

// CloudFront forwards /api/chat to a Lambda Function URL behind Origin Access
// Control, which SigV4-signs the origin request. For signed POSTs AWS requires
// the VIEWER to send `x-amz-content-sha256` (lowercase-hex SHA-256 of the exact
// body bytes) — without it the origin rejects with a signature mismatch.
// Returns null when crypto.subtle is unavailable (non-secure context) so the
// caller can proceed without the header rather than break chat entirely.
export async function sha256Hex(text: string): Promise<string | null> {
  if (typeof crypto === 'undefined' || !crypto.subtle) return null;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return hexEncode(new Uint8Array(digest));
}

// Parses a (possibly partial) SSE byte buffer into complete `data:`-framed events plus
// whatever incomplete text should be carried over into the next chunk. Events are
// separated by a blank line; a multi-line `data:` body is joined with newlines per spec.
export function parseSSEBuffer(buffer: string): { events: ChatEvent[]; rest: string } {
  const events: ChatEvent[] = [];
  const segments = buffer.split('\n\n');
  const rest = segments.pop() ?? '';

  for (const segment of segments) {
    const dataLines = segment.split('\n').filter((line) => line.startsWith('data:'));
    if (!dataLines.length) continue;
    const json = dataLines.map((line) => line.slice(5).trimStart()).join('\n');
    try {
      const parsed = JSON.parse(json);
      if (parsed && typeof parsed.type === 'string') events.push(parsed as ChatEvent);
    } catch {
      // Malformed event on the wire — skip it rather than break the stream.
    }
  }

  return { events, rest };
}

// --- Follow-up chips ---------------------------------------------------------
// A small curated map keyed on light-touch topic detection over the last
// exchange (user question + assistant reply). Deliberately client-side and
// simple — the chips are suggestions, not navigation.

export type ChipTopic = 'work' | 'projects' | 'stack' | 'contact' | 'default';

export function detectTopic(text: string): ChipTopic {
  const t = text.toLowerCase();
  if (/(email|contact|reach|in touch|touch\b|hire|hiring|linkedin)/.test(t)) return 'contact';
  if (/(stack|typescript|javascript|react|astro|aws|lambda|node|tech\b|tooling|framework|language)/.test(t)) return 'stack';
  if (/(project|chicks|alive still|alivestill|citibike|blumblumblum|side\b|poker|stock|jams|built|building)/.test(t)) return 'projects';
  if (/(roam|work\b|works\b|job|career|engineer|company|startup|procore|workday)/.test(t)) return 'work';
  return 'default';
}

export const FOLLOW_UP_CHIPS: Record<ChipTopic, string[]> = {
  work: ['What is Roam building?', 'What did he work on before Roam?', "What's his tech stack?"],
  projects: ['What is Chicks of NYC?', 'What powers his side projects?', 'What does Jordan do at Roam?'],
  stack: ['What has he built with that stack?', 'Tell me about his side projects', 'What does Jordan do at Roam?'],
  contact: ["What's the best way to reach Jordan?", 'What does Jordan do at Roam?', 'Tell me about his side projects'],
  default: ['What does Jordan do at Roam?', 'Tell me about his side projects', "What's his tech stack?", 'How can I get in touch?'],
};

// Picks 2-3 chips for a topic, skipping anything in `exclude` (e.g. the
// question just asked) and rotating the default pool via `offset` so repeat
// small-talk doesn't show identical chips every time.
export function followUpsFor(topic: ChipTopic, exclude: string[] = [], offset = 0): string[] {
  const pool = FOLLOW_UP_CHIPS[topic];
  const excluded = new Set(exclude.map((text) => text.trim().toLowerCase()));
  const rotated = pool.map((_, index) => pool[(index + (topic === 'default' ? offset : 0)) % pool.length]);
  const picks = rotated.filter((chip) => !excluded.has(chip.trim().toLowerCase())).slice(0, 3);
  for (const extra of FOLLOW_UP_CHIPS.default) {
    if (picks.length >= 2) break;
    if (!excluded.has(extra.trim().toLowerCase()) && !picks.includes(extra)) picks.push(extra);
  }
  return picks.slice(0, 3);
}

function errorMessageFor(code?: string): string {
  if (code === 'rate_limited') {
    return 'Jordy is getting a lot of messages right now — give it a minute and try again.';
  }
  return NETWORK_ERROR_MESSAGE;
}

type StreamResult =
  | { ok: true; text: string }
  | { ok: false; aborted: boolean; message: string; text: string };

async function streamAssistantReply(
  messages: ChatMessage[],
  conversationId: string,
  signal: AbortSignal,
  onDelta: (text: string) => void,
): Promise<StreamResult> {
  let buffer = '';
  let text = '';

  try {
    // Serialize once: the hash must cover the exact bytes sent as the body.
    const body = JSON.stringify({ conversationId, messages });
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const payloadHash = await sha256Hex(body);
    if (payloadHash) headers['x-amz-content-sha256'] = payloadHash;

    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers,
      body,
      signal,
    });

    if (!response.ok || !response.body) {
      return { ok: false, aborted: false, message: NETWORK_ERROR_MESSAGE, text };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parsed = parseSSEBuffer(buffer);
      buffer = parsed.rest;

      for (const event of parsed.events) {
        if (event.type === 'delta' && event.text) {
          text += event.text;
          onDelta(event.text);
        } else if (event.type === 'done') {
          return { ok: true, text };
        } else if (event.type === 'error') {
          return { ok: false, aborted: false, message: errorMessageFor(event.code), text };
        }
      }
    }

    return text
      ? { ok: true, text }
      : { ok: false, aborted: false, message: NETWORK_ERROR_MESSAGE, text };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      // Aborted (stop button or panel close): hand back the partial text so the
      // caller can keep it on screen and in history.
      return { ok: false, aborted: true, message: '', text };
    }
    return { ok: false, aborted: false, message: NETWORK_ERROR_MESSAGE, text };
  }
}

// --- Open/close API ---------------------------------------------------------
// The panel has no launcher of its own: the nav "Chat" button and the footer
// "Chat with my assistant" CTA (both marked with `data-chat-trigger`) are the
// only ways in. Their glue scripts import these functions instead of poking
// widget-internal DOM. The trigger that opened the panel is remembered so
// closing (Esc or the close button) returns focus to it.

interface ChatPanelController {
  open(trigger: HTMLElement | null): void;
  close(): void;
  isOpen(): boolean;
}

let panelController: ChatPanelController | null = null;

export function openChat(trigger: HTMLElement | null = null): void {
  panelController?.open(trigger);
}

export function closeChat(): void {
  panelController?.close();
}

export function toggleChat(trigger: HTMLElement | null = null): void {
  if (!panelController) return;
  if (panelController.isOpen()) panelController.close();
  else panelController.open(trigger);
}

function initChatWidget(): void {
  const panel = document.querySelector<HTMLElement>('[data-chat-panel]');
  const closeButton = document.querySelector<HTMLButtonElement>('[data-chat-close]');
  const scroller = document.querySelector<HTMLElement>('[data-chat-scroll]');
  const intro = document.querySelector<HTMLElement>('[data-chat-intro]');
  const log = document.querySelector<HTMLElement>('[data-chat-log]');
  const form = document.querySelector<HTMLFormElement>('[data-chat-form]');
  const input = document.querySelector<HTMLTextAreaElement>('[data-chat-input]');
  const sendButton = document.querySelector<HTMLButtonElement>('[data-chat-send]');
  const stopButton = document.querySelector<HTMLButtonElement>('[data-chat-stop]');
  const jumpButton = document.querySelector<HTMLButtonElement>('[data-chat-jump]');
  const notice = document.querySelector<HTMLElement>('[data-chat-notice]');
  const announcer = document.querySelector<HTMLElement>('[data-chat-announce]');

  if (
    !panel || !closeButton || !scroller || !intro || !log || !form ||
    !input || !sendButton || !stopButton || !jumpButton || !notice || !announcer
  ) {
    return;
  }

  // aria-expanded lives on the triggers (nav + footer) now that there is no
  // launcher; every trigger mirrors the panel's state.
  const triggers = Array.from(document.querySelectorAll<HTMLElement>('[data-chat-trigger]'));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let state = loadChatState(sessionStorage, STORAGE_KEY);
  if (!state) {
    state = { conversationId: crypto.randomUUID(), messages: [] };
    saveChatState(sessionStorage, state, STORAGE_KEY);
  }

  let controller: AbortController | null = null;
  let lastTrigger: HTMLElement | null = null;
  let hideTimer = 0;
  let defaultChipOffset = 0;

  function persist(): void {
    saveChatState(sessionStorage, state!, STORAGE_KEY);
  }

  function isStreaming(): boolean {
    return controller !== null;
  }

  function setTriggersExpanded(expanded: boolean): void {
    for (const trigger of triggers) trigger.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  }

  // --- Screen-reader announcements -------------------------------------------
  // The visual transcript is deliberately NOT a live region: streaming re-renders
  // the growing block on every delta, which would re-announce the whole
  // accumulated paragraph each time, and reopening the panel re-renders history.
  // Instead this visually-hidden region announces exactly two things: a
  // completed assistant reply (its rendered plain text, once) and error/limit
  // notices. The visitor's own message, chips, and restored history are never
  // announced.

  let announceTimer = 0;

  function announce(text: string): void {
    if (!text) return;
    // Clear, then set in a separate tick, so assistive tech reliably reports a
    // fresh addition even when consecutive notices carry identical text.
    announcer!.textContent = '';
    window.clearTimeout(announceTimer);
    announceTimer = window.setTimeout(() => {
      announcer!.textContent = text;
    }, 30);
  }

  // --- Scroll behavior -------------------------------------------------------
  // Research-verified pattern: a new assistant reply is top-anchored (the
  // exchange pins to the top of the viewport) and the viewport does NOT follow
  // the growing text. When the reply grows past the fold, an opt-in
  // "jump to latest" pill appears instead.

  function distanceFromLatest(): number {
    return scroller!.scrollHeight - scroller!.scrollTop - scroller!.clientHeight;
  }

  function scrollToLatest(smooth = false): void {
    scroller!.scrollTo({
      top: scroller!.scrollHeight,
      behavior: smooth && !reducedMotion.matches ? 'smooth' : 'auto',
    });
  }

  function syncJump(): void {
    jumpButton!.hidden = !(isStreaming() && distanceFromLatest() > 56);
  }

  scroller.addEventListener('scroll', syncJump);
  jumpButton.addEventListener('click', () => {
    scrollToLatest(true);
    jumpButton!.hidden = true;
  });

  // --- Messages --------------------------------------------------------------

  function makeBubble(role: 'user' | 'assistant' | 'system'): HTMLElement {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble role-${role}`;
    log!.appendChild(bubble);
    return bubble;
  }

  function renderMessageBubble(role: ChatRole, text: string): HTMLElement {
    const bubble = makeBubble(role);
    if (role === 'assistant') renderMarkdownInto(bubble, text);
    else bubble.textContent = text;
    return bubble;
  }

  function clearFollowUps(): void {
    log!.querySelector('.chat-followups')?.remove();
  }

  function lastExchangeText(): string {
    const lastUser = [...state!.messages].reverse().find((m) => m.role === 'user');
    const lastAssistant = [...state!.messages].reverse().find((m) => m.role === 'assistant');
    return `${lastUser?.content ?? ''} ${lastAssistant?.content ?? ''}`;
  }

  function showFollowUps(topic: ChipTopic): void {
    clearFollowUps();
    const lastUser = [...state!.messages].reverse().find((m) => m.role === 'user');
    const chips = followUpsFor(topic, lastUser ? [lastUser.content] : [], defaultChipOffset);
    if (topic === 'default') defaultChipOffset += 1;
    if (!chips.length || !hasRoomForTurn(state!.messages, MAX_MESSAGES)) return;

    const wrap = document.createElement('div');
    wrap.className = 'chat-followups';
    for (const label of chips) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chat-chip';
      chip.textContent = label;
      chip.addEventListener('click', () => void sendMessage(label));
      wrap.appendChild(chip);
    }
    log!.appendChild(wrap);
  }

  function autosizeInput(): void {
    input!.style.height = 'auto';
    // CSS max-height caps growth at ~4 lines; past that the field scrolls.
    input!.style.height = `${input!.scrollHeight}px`;
  }

  // Announce the limit notice only when the conversation fills during this
  // session — a restored already-full conversation is history, not news.
  let announcedFull = !hasRoomForTurn(state.messages, MAX_MESSAGES);

  function updateComposerAvailability(): void {
    const full = !hasRoomForTurn(state!.messages, MAX_MESSAGES);
    input!.disabled = full;
    sendButton!.disabled = full;
    notice!.hidden = !full;
    if (full) {
      notice!.textContent = LIMIT_NOTICE;
      if (!announcedFull) {
        announcedFull = true;
        announce(LIMIT_NOTICE);
      }
    }
  }

  function renderHistory(): void {
    log!.replaceChildren();
    intro!.hidden = state!.messages.length > 0;
    for (const message of state!.messages) renderMessageBubble(message.role, message.content);
    const last = state!.messages[state!.messages.length - 1];
    if (last?.role === 'assistant') showFollowUps(detectTopic(lastExchangeText()));
    updateComposerAvailability();
    scrollToLatest();
  }

  async function sendMessage(raw: string): Promise<void> {
    const content = truncateMessage(raw.trim(), MAX_MESSAGE_CHARS);
    if (!content || isStreaming() || !hasRoomForTurn(state!.messages, MAX_MESSAGES)) return;

    intro!.hidden = true;
    clearFollowUps();

    state = { ...state!, messages: appendMessage(state!.messages, { role: 'user', content }, MAX_MESSAGES) };
    persist();
    const userBubble = renderMessageBubble('user', content);
    input!.value = '';
    autosizeInput();
    input!.disabled = true;
    sendButton!.disabled = true;

    controller = new AbortController();
    const assistantBubble = makeBubble('assistant');
    // Top-anchor the new exchange: the question sits at the top of the viewport
    // and the reply streams in below it. No auto-follow while it grows.
    scroller!.scrollTop = userBubble.offsetTop - 12;
    stopButton!.hidden = false;

    const stream = new MarkdownStream(assistantBubble);
    const result = await streamAssistantReply(state.messages, state.conversationId, controller.signal, (delta) => {
      stream.append(delta);
      syncJump();
    });

    controller = null;
    stopButton!.hidden = true;
    jumpButton!.hidden = true;

    if (result.ok) {
      state = { ...state, messages: appendMessage(state.messages, { role: 'assistant', content: result.text }, MAX_MESSAGES) };
      persist();
      showFollowUps(detectTopic(`${content} ${result.text}`));
      // One announcement per completed reply, as rendered plain text.
      announce(assistantBubble.textContent ?? '');
    } else if (result.aborted) {
      if (result.text) {
        // Keep the partial reply (on screen and in history) with a quiet marker.
        state = { ...state, messages: appendMessage(state.messages, { role: 'assistant', content: result.text }, MAX_MESSAGES) };
        persist();
        const note = document.createElement('span');
        note.className = 'chat-stopped-note';
        note.textContent = '— stopped';
        assistantBubble.appendChild(note);
        announce(assistantBubble.textContent ?? '');
      } else {
        assistantBubble.remove();
      }
    } else {
      assistantBubble.textContent = result.message;
      assistantBubble.classList.add('role-system');
      announce(result.message);
    }

    updateComposerAvailability();
    if (!input!.disabled && !panel!.hidden) input!.focus();
  }

  // --- Dialog behavior -------------------------------------------------------

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      closePanel();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = Array.from(panel!.querySelectorAll<HTMLElement>('button, textarea, a[href]')).filter(
      (el) => !el.hasAttribute('disabled') && !el.hidden && el.getClientRects().length > 0,
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function openPanel(trigger: HTMLElement | null = null): void {
    window.clearTimeout(hideTimer);
    if (!panel!.hidden && panel!.classList.contains('is-open')) return;
    panel!.hidden = false;
    if (!reducedMotion.matches) {
      // Commit the hidden→shown layout first so the enter transition runs.
      panel!.getBoundingClientRect();
    }
    panel!.classList.add('is-open');
    lastTrigger = trigger;
    setTriggersExpanded(true);
    renderHistory();
    (input!.disabled ? closeButton! : input!).focus();
    document.addEventListener('keydown', onKeydown);
  }

  function closePanel(): void {
    if (panel!.hidden) return;
    panel!.classList.remove('is-open');
    setTriggersExpanded(false);
    document.removeEventListener('keydown', onKeydown);
    controller?.abort();
    if (reducedMotion.matches) {
      panel!.hidden = true;
    } else {
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => {
        panel!.hidden = true;
      }, 280);
    }
    // Focus goes back to whichever trigger opened the panel.
    lastTrigger?.focus();
    lastTrigger = null;
  }

  closeButton.addEventListener('click', closePanel);

  stopButton.addEventListener('click', () => {
    stopButton!.hidden = true;
    controller?.abort();
  });

  for (const chip of Array.from(document.querySelectorAll<HTMLButtonElement>('[data-chat-chip]'))) {
    chip.addEventListener('click', () => void sendMessage(chip.textContent ?? ''));
  }

  input.addEventListener('input', autosizeInput);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      form!.requestSubmit();
    }
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void sendMessage(input.value);
  });

  panelController = {
    open: openPanel,
    close: closePanel,
    isOpen: () => !panel!.hidden,
  };

  renderHistory();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatWidget);
  } else {
    initChatWidget();
  }
}
