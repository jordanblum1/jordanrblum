export const MAX_MESSAGES = 20;
export const MAX_MESSAGE_CHARS = 2000;

const STORAGE_KEY = 'jrb-chat-state-v1';
const ENDPOINT = (import.meta.env.PUBLIC_CHAT_ENDPOINT as string | undefined) ?? '/api/chat';

const NETWORK_ERROR_MESSAGE =
  "Something went wrong reaching Jordan's assistant. Please try again, or email Jordan directly below.";
const LIMIT_NOTICE =
  "This conversation has reached its message limit. Feel free to start a new visit later, or email Jordan directly below.";

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

function errorMessageFor(code?: string): string {
  if (code === 'rate_limited') {
    return "Jordan's assistant is getting a lot of messages right now — give it a minute and try again.";
  }
  return NETWORK_ERROR_MESSAGE;
}

type StreamResult =
  | { ok: true; text: string }
  | { ok: false; aborted: boolean; message: string };

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
      return { ok: false, aborted: false, message: NETWORK_ERROR_MESSAGE };
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
          return { ok: false, aborted: false, message: errorMessageFor(event.code) };
        }
      }
    }

    return text ? { ok: true, text } : { ok: false, aborted: false, message: NETWORK_ERROR_MESSAGE };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { ok: false, aborted: true, message: '' };
    }
    return { ok: false, aborted: false, message: NETWORK_ERROR_MESSAGE };
  }
}

function initChatWidget(): void {
  const launcher = document.querySelector<HTMLButtonElement>('[data-chat-launcher]');
  const panel = document.querySelector<HTMLElement>('[data-chat-panel]');
  const closeButton = document.querySelector<HTMLButtonElement>('[data-chat-close]');
  const log = document.querySelector<HTMLElement>('[data-chat-log]');
  const form = document.querySelector<HTMLFormElement>('[data-chat-form]');
  const input = document.querySelector<HTMLTextAreaElement>('[data-chat-input]');
  const sendButton = document.querySelector<HTMLButtonElement>('[data-chat-send]');
  const notice = document.querySelector<HTMLElement>('[data-chat-notice]');

  if (!launcher || !panel || !closeButton || !log || !form || !input || !sendButton || !notice) return;

  const GREETING = "Hi, I'm Jordan's assistant — I can answer any questions about him. What would you like to know?";

  let state = loadChatState(sessionStorage, STORAGE_KEY);
  if (!state) {
    state = { conversationId: crypto.randomUUID(), messages: [] };
    saveChatState(sessionStorage, state, STORAGE_KEY);
  }

  let controller: AbortController | null = null;

  function persist(): void {
    saveChatState(sessionStorage, state!, STORAGE_KEY);
  }

  function renderBubble(role: 'user' | 'assistant' | 'system', text: string): HTMLElement {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble role-${role}`;
    bubble.textContent = text;
    log!.appendChild(bubble);
    log!.scrollTop = log!.scrollHeight;
    return bubble;
  }

  function updateComposerAvailability(): void {
    const full = !hasRoomForTurn(state!.messages, MAX_MESSAGES);
    input!.disabled = full;
    sendButton!.disabled = full;
    notice!.hidden = !full;
    if (full) notice!.textContent = LIMIT_NOTICE;
  }

  function renderHistory(): void {
    log!.innerHTML = '';
    if (state!.messages.length) {
      for (const message of state!.messages) renderBubble(message.role, message.content);
    } else {
      renderBubble('assistant', GREETING);
    }
    updateComposerAvailability();
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      closePanel();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = Array.from(panel!.querySelectorAll<HTMLElement>('button, textarea, a[href]')).filter(
      (el) => !el.hasAttribute('disabled'),
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

  function openPanel(): void {
    panel!.hidden = false;
    launcher!.setAttribute('aria-expanded', 'true');
    renderHistory();
    (input!.disabled ? closeButton! : input!).focus();
    document.addEventListener('keydown', onKeydown);
  }

  function closePanel(): void {
    panel!.hidden = true;
    launcher!.setAttribute('aria-expanded', 'false');
    document.removeEventListener('keydown', onKeydown);
    controller?.abort();
    controller = null;
    launcher!.focus();
  }

  launcher.addEventListener('click', () => {
    if (panel!.hidden) openPanel();
    else closePanel();
  });

  closeButton.addEventListener('click', closePanel);

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      form!.requestSubmit();
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const raw = input.value.trim();
    if (!raw || !hasRoomForTurn(state!.messages, MAX_MESSAGES)) return;

    const content = truncateMessage(raw, MAX_MESSAGE_CHARS);
    state = { ...state!, messages: appendMessage(state!.messages, { role: 'user', content }, MAX_MESSAGES) };
    persist();
    renderBubble('user', content);
    input.value = '';
    input.disabled = true;
    sendButton.disabled = true;

    controller?.abort();
    controller = new AbortController();
    const assistantBubble = renderBubble('assistant', '');

    const result = await streamAssistantReply(state.messages, state.conversationId, controller.signal, (delta) => {
      assistantBubble.textContent += delta;
      log!.scrollTop = log!.scrollHeight;
    });

    if (result.ok) {
      state = { ...state, messages: appendMessage(state.messages, { role: 'assistant', content: result.text }, MAX_MESSAGES) };
      assistantBubble.textContent = result.text;
      persist();
    } else if (result.aborted) {
      assistantBubble.remove();
    } else {
      assistantBubble.textContent = result.message;
      assistantBubble.classList.add('role-system');
    }

    controller = null;
    updateComposerAvailability();
    if (!input.disabled) input.focus();
  });

  renderHistory();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatWidget);
  } else {
    initChatWidget();
  }
}
