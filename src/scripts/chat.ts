import { MarkdownStream, renderMarkdownInto } from './chat-markdown';
import { social } from '../data/site';

export const MAX_MESSAGES = 20;
export const MAX_MESSAGE_CHARS = 2000;

const STORAGE_KEY = 'jrb-chat-state-v1';
const ENDPOINT = (import.meta.env.PUBLIC_CHAT_ENDPOINT as string | undefined) ?? '/api/chat';

const NETWORK_ERROR_MESSAGE =
  'Something went wrong reaching Jordy. Please try again, or email Jordan directly.';
export const LIMIT_NOTICE =
  "This conversation's full — email Jordan directly, or come back for a fresh start.";

// The panel no longer carries a persistent mailto — error and limit notices
// are the one surface that still links the email, so chat stays escapable
// when the backend is unreachable.
export const CONTACT_EMAIL_HREF = social.find((entry) => entry.href.startsWith('mailto:'))!.href;

const EMAIL_LINK_TEXT = 'email Jordan directly';

// Builds a notice as real DOM nodes, turning the literal phrase
// "email Jordan directly" into a mailto anchor. createElement only — notice
// copy must never pass through innerHTML — and the anchor is runtime-created,
// so the widget styles it via :global(...).
export function renderNoticeInto(el: HTMLElement, message: string): void {
  el.replaceChildren();
  const index = message.indexOf(EMAIL_LINK_TEXT);
  if (index === -1) {
    el.textContent = message;
    return;
  }
  el.append(message.slice(0, index));
  const link = document.createElement('a');
  link.href = CONTACT_EMAIL_HREF;
  link.textContent = EMAIL_LINK_TEXT;
  el.append(link, message.slice(index + EMAIL_LINK_TEXT.length));
}

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

// The character counter stays out of the way until the input approaches the
// cap, then quietly shows how much room is left.
export const CHAR_COUNT_RATIO = 0.85;

export function shouldShowCharCount(
  length: number,
  max: number = MAX_MESSAGE_CHARS,
  ratio: number = CHAR_COUNT_RATIO,
): boolean {
  return length >= Math.ceil(max * ratio);
}

export function formatCharCount(length: number, max: number = MAX_MESSAGE_CHARS): string {
  return `${length.toLocaleString('en-US')} / ${max.toLocaleString('en-US')}`;
}

// --- Reveal cascade ----------------------------------------------------------
// Replies are buffered behind a typing indicator and revealed whole: each
// rendered block fades/rises in over REVEAL_BLOCK_MS, staggered by
// REVEAL_STAGGER_MS, with the stagger capped so even a long reply finishes its
// reveal well under a second.

export const REVEAL_BLOCK_MS = 140;
export const REVEAL_STAGGER_MS = 70;
export const REVEAL_MAX_DELAY_MS = 560;

export function revealDelay(index: number): number {
  return Math.min(Math.max(0, index) * REVEAL_STAGGER_MS, REVEAL_MAX_DELAY_MS);
}

// The software-keyboard inset: how much of the layout viewport the keyboard
// covers. innerHeight is the layout viewport; the visual viewport (height +
// offsetTop) is what remains visible above the keyboard.
export function keyboardInset(innerHeight: number, vvHeight: number, vvOffsetTop: number): number {
  return Math.max(0, Math.round(innerHeight - vvHeight - vvOffsetTop));
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

// Phrased the way a recruiter or someone reaching out cold would ask —
// generalized (no company names assumed) and limited to questions the bio can
// actually answer.
// The visitor's question is the stronger signal of intent — replies often
// graze several topics (a work answer that mentions "building" a platform
// would otherwise read as projects). Fall back to the reply only when the
// question itself is small talk.
export function detectExchangeTopic(question: string, reply: string): ChipTopic {
  const topic = detectTopic(question);
  return topic !== 'default' ? topic : detectTopic(reply);
}

export const FOLLOW_UP_CHIPS: Record<ChipTopic, string[]> = {
  work: ['What did he do before that?', "What's his biggest win?", "What's his tech stack?"],
  projects: ['What is Chicks of NYC?', 'What powers his side projects?', "What's his recent work experience?"],
  stack: ['What has he built with that stack?', "What's his recent work experience?", 'What are his side projects?'],
  contact: ["What's the best way to reach him?", "What's his recent work experience?", 'What has he built?'],
  default: ["What's his recent work experience?", 'What has he built?', "What's his tech stack?", 'How can I get in touch?'],
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
    return 'Jordy is getting a lot of messages right now — give it a minute and try again, or email Jordan directly.';
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
  const jumpButton = document.querySelector<HTMLButtonElement>('[data-chat-jump]');
  const notice = document.querySelector<HTMLElement>('[data-chat-notice]');
  const announcer = document.querySelector<HTMLElement>('[data-chat-announce]');
  const counter = document.querySelector<HTMLElement>('[data-chat-count]');

  if (
    !panel || !closeButton || !scroller || !intro || !log || !form ||
    !input || !sendButton || !jumpButton || !notice ||
    !announcer || !counter
  ) {
    return;
  }

  // aria-expanded lives on the triggers (nav + footer) now that there is no
  // launcher; every trigger mirrors the panel's state.
  const triggers = Array.from(document.querySelectorAll<HTMLElement>('[data-chat-trigger]'));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  // Mirrors the CSS breakpoint where the panel becomes a full-screen sheet
  // (portrait phones by width, landscape phones by height).
  const mobileSheet = window.matchMedia('(max-width: 30rem), (max-height: 30rem)');

  let state = loadChatState(sessionStorage, STORAGE_KEY);
  if (!state) {
    state = { conversationId: crypto.randomUUID(), messages: [] };
    saveChatState(sessionStorage, state, STORAGE_KEY);
  }

  let controller: AbortController | null = null;
  let lastTrigger: HTMLElement | null = null;
  let hideTimer = 0;
  let defaultChipOffset = 0;

  function finishPanelClose(): void {
    if (panel!.classList.contains('is-open')) return;
    window.clearTimeout(hideTimer);
    panel!.hidden = true;
  }

  // The transform is the longest shell transition. Waiting for its real end
  // keeps CSS and JS in sync if the motion tokens change; the timer below is
  // only a fallback for interrupted or unsupported transition events.
  panel.addEventListener('transitionend', (event) => {
    if (event.target === panel && event.propertyName === 'transform') finishPanelClose();
  });

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
  // The visual transcript is deliberately NOT a live region: replies buffer
  // behind the typing indicator and reveal whole, and reopening the panel
  // re-renders history. Instead this visually-hidden region announces exactly
  // two things: a completed assistant reply (its rendered plain text, once)
  // and error/limit notices. The visitor's own message, chips, restored
  // history, and the typing indicator are never announced.

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

  // --- Native-feeling mobile sheet -------------------------------------------
  // The sheet itself is plain fixed-position CSS sized with dvh — there is NO
  // JS geometry syncing chasing the browser toolbar. What makes dvh stable is
  // the body lock below: with the page frozen the iOS toolbar cannot
  // collapse/expand under the sheet, so 100dvh stops moving. The only
  // visualViewport work left is the keyboard inset (--kb), active only while
  // the sheet is open.

  let savedScrollY = 0;
  let bodyLocked = false;

  function lockBody(): void {
    if (bodyLocked) return;
    savedScrollY = Math.round(window.scrollY);
    const { style } = document.body;
    style.position = 'fixed';
    style.top = `-${savedScrollY}px`;
    style.left = '0';
    style.right = '0';
    style.width = '100%';
    style.overflow = 'hidden';
    style.overscrollBehavior = 'none';
    bodyLocked = true;
  }

  function unlockBody(): void {
    if (!bodyLocked) return;
    const { style } = document.body;
    style.position = '';
    style.top = '';
    style.left = '';
    style.right = '';
    style.width = '';
    style.overflow = '';
    style.overscrollBehavior = '';
    bodyLocked = false;
    // Instant, not smooth: the page has scroll-behavior:smooth, and an
    // animated restore would be stomped by the focus() that follows close.
    window.scrollTo({ top: savedScrollY, left: 0, behavior: 'instant' });
  }

  // Keyboard inset: --kb is how much of the layout viewport the software
  // keyboard covers; the composer lifts by exactly that much (see the mobile
  // sheet CSS). Listeners are attached only while the sheet is open and
  // removed (with the var) on close.
  let keyboardSyncActive = false;

  function syncKeyboard(): void {
    const vv = window.visualViewport;
    if (!vv) return;
    const wasNearBottom = distanceFromLatest() < 72;
    document.documentElement.style.setProperty(
      '--kb',
      `${keyboardInset(window.innerHeight, vv.height, vv.offsetTop)}px`,
    );
    // The 1fr messages row just shrank/grew — keep the log bottom in view if
    // the visitor was reading there.
    if (wasNearBottom) scrollToLatest();
  }

  function enableKeyboardSync(): void {
    if (keyboardSyncActive || !window.visualViewport) return;
    keyboardSyncActive = true;
    window.visualViewport.addEventListener('resize', syncKeyboard);
    window.visualViewport.addEventListener('scroll', syncKeyboard);
    syncKeyboard();
  }

  function disableKeyboardSync(): void {
    if (!keyboardSyncActive) return;
    keyboardSyncActive = false;
    window.visualViewport?.removeEventListener('resize', syncKeyboard);
    window.visualViewport?.removeEventListener('scroll', syncKeyboard);
    document.documentElement.style.removeProperty('--kb');
  }

  // iOS can dismiss the keyboard on blur without a final visualViewport
  // resize event, leaving --kb stale — re-read shortly after blur.
  input.addEventListener('blur', () => {
    if (keyboardSyncActive) window.setTimeout(syncKeyboard, 250);
  });

  function syncSheetMode(): void {
    if (!panel!.hidden && mobileSheet.matches) {
      lockBody();
      enableKeyboardSync();
    } else {
      unlockBody();
      disableKeyboardSync();
    }
  }

  mobileSheet.addEventListener?.('change', syncSheetMode);

  // --- Scroll behavior -------------------------------------------------------
  // A new exchange is top-anchored: the question pins to the top of the
  // viewport with the typing indicator (then the revealed reply) beneath it.
  // The viewport never follows on its own; when a revealed reply's tail sits
  // below the fold, an opt-in "jump to latest" pill appears instead.

  function distanceFromLatest(): number {
    return scroller!.scrollHeight - scroller!.scrollTop - scroller!.clientHeight;
  }

  function scrollToLatest(smooth = false): void {
    scroller!.scrollTo({
      top: scroller!.scrollHeight,
      behavior: smooth && !reducedMotion.matches ? 'smooth' : 'auto',
    });
  }

  // The in-flight exchange gets a spacer below it so the user's question can
  // actually pin near the top of the viewport while the content below is still
  // short — without it, setting scrollTop to the anchor just clamps against
  // scrollHeight and the question stays stuck at the bottom edge. The spacer
  // re-balances when the reply reveals and stays afterwards so the anchor holds.
  let spacer: HTMLElement | null = null;
  let anchorTarget = 0;

  function ensureSpacer(): HTMLElement {
    if (!spacer || spacer.parentElement !== log) {
      spacer = document.createElement('div');
      spacer.className = 'chat-spacer';
      spacer.setAttribute('aria-hidden', 'true');
    }
    // The spacer always sits last in the log.
    log!.appendChild(spacer);
    return spacer;
  }

  function sizeSpacerFor(userBubble: HTMLElement): void {
    const el = ensureSpacer();
    const previousScrollTop = scroller!.scrollTop;
    anchorTarget = Math.max(0, userBubble.offsetTop - 12);
    const contentHeight = scroller!.scrollHeight - el.offsetHeight;
    const deficit = anchorTarget + scroller!.clientHeight - contentHeight;
    el.style.height = `${Math.max(0, deficit)}px`;
    // Re-balancing must never move the viewport on its own.
    scroller!.scrollTop = previousScrollTop;
  }

  // The "Jump to latest" pill: available while waiting on a reply if the
  // visitor scrolls up, and it lingers briefly after a reveal whose tail (and
  // chips) sit below the fold.
  let jumpLinger = false;
  let jumpLingerTimer = 0;

  function syncJump(): void {
    jumpButton!.hidden = !(distanceFromLatest() > 56 && (isStreaming() || jumpLinger));
  }

  scroller.addEventListener('scroll', syncJump);
  jumpButton.addEventListener('click', () => {
    jumpLinger = false;
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

  // iMessage-style typing indicator: an assistant bubble holding three
  // staggered bouncing dots. Purely decorative — the aria-live announcer
  // handles assistive tech, so the whole bubble is aria-hidden.
  function makeTypingIndicator(): HTMLElement {
    const bubble = makeBubble('assistant');
    bubble.classList.add('chat-typing');
    bubble.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 3; i += 1) {
      const dot = document.createElement('span');
      dot.className = 'chat-typing-dot';
      bubble.appendChild(dot);
    }
    return bubble;
  }

  // Applies the reveal cascade (opacity + 4px rise, staggered per block) to an
  // element and cleans the animation styles up afterwards. No-op under
  // prefers-reduced-motion: the content simply appears in place.
  function applyReveal(el: HTMLElement, index: number): void {
    if (reducedMotion.matches) return;
    el.classList.add('chat-reveal');
    el.style.animationDelay = `${revealDelay(index)}ms`;
    el.addEventListener(
      'animationend',
      () => {
        el.classList.remove('chat-reveal');
        el.style.animationDelay = '';
      },
      { once: true },
    );
  }

  // Moves the buffered, already-rendered blocks into the live bubble. Layout
  // is final immediately (the cascade only animates opacity/transform), so the
  // anchor/spacer math can run right away.
  function revealBlocks(bubble: HTMLElement, rendered: HTMLElement, cascade: boolean): number {
    const blocks = Array.from(rendered.children) as HTMLElement[];
    blocks.forEach((block, index) => {
      if (cascade) applyReveal(block, index);
      bubble.appendChild(block);
    });
    return blocks.length;
  }

  function clearFollowUps(): void {
    log!.querySelector('.chat-followups')?.remove();
  }

  function lastExchangeTopic(): ChipTopic {
    const lastUser = [...state!.messages].reverse().find((m) => m.role === 'user');
    const lastAssistant = [...state!.messages].reverse().find((m) => m.role === 'assistant');
    return detectExchangeTopic(lastUser?.content ?? '', lastAssistant?.content ?? '');
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

  function syncCharCount(): void {
    const length = input!.value.length;
    const show = shouldShowCharCount(length, MAX_MESSAGE_CHARS);
    counter!.hidden = !show;
    if (show) counter!.textContent = formatCharCount(length, MAX_MESSAGE_CHARS);
  }

  // Announce the limit notice only when the conversation fills during this
  // session — a restored already-full conversation is history, not news.
  let announcedFull = !hasRoomForTurn(state.messages, MAX_MESSAGES);

  function syncSendAvailability(): void {
    const full = !hasRoomForTurn(state!.messages, MAX_MESSAGES);
    sendButton!.disabled = full || isStreaming() || input!.value.trim().length === 0;
  }

  function updateComposerAvailability(): void {
    const full = !hasRoomForTurn(state!.messages, MAX_MESSAGES);
    input!.disabled = full;
    syncSendAvailability();
    notice!.hidden = !full;
    if (full) {
      renderNoticeInto(notice!, LIMIT_NOTICE);
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
    if (last?.role === 'assistant') showFollowUps(lastExchangeTopic());
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
    syncCharCount();
    input!.disabled = true;
    sendButton!.disabled = true;

    controller = new AbortController();

    // The typing indicator appears immediately; SSE deltas buffer into a
    // detached container (rendered block-incrementally by MarkdownStream but
    // never painted) and the whole reply reveals at once on completion.
    const typing = makeTypingIndicator();
    sizeSpacerFor(userBubble);
    scroller!.scrollTop = anchorTarget;

    const buffered = document.createElement('div');
    const stream = new MarkdownStream(buffered);
    const result = await streamAssistantReply(
      state.messages,
      state.conversationId,
      controller.signal,
      (delta) => stream.append(delta),
    );

    controller = null;
    typing.remove();

    if (result.ok) {
      state = { ...state, messages: appendMessage(state.messages, { role: 'assistant', content: result.text }, MAX_MESSAGES) };
      persist();
      const bubble = makeBubble('assistant');
      const blockCount = revealBlocks(bubble, buffered, true);
      showFollowUps(detectExchangeTopic(content, result.text));
      // The chips ride in at the tail of the cascade.
      const wrap = log!.querySelector<HTMLElement>('.chat-followups');
      if (wrap) applyReveal(wrap, blockCount);
      // One announcement per completed reply, as rendered plain text.
      announce(bubble.textContent ?? '');
    } else if (result.aborted) {
      if (result.text) {
        // An abort only happens when the panel closes mid-reply — keep the
        // buffered partial in history (and the log) so it's there on reopen.
        state = { ...state, messages: appendMessage(state.messages, { role: 'assistant', content: result.text }, MAX_MESSAGES) };
        persist();
        const bubble = makeBubble('assistant');
        revealBlocks(bubble, buffered, false);
      }
    } else {
      const bubble = makeBubble('assistant');
      bubble.classList.add('role-system');
      renderNoticeInto(bubble, result.message);
      announce(result.message);
    }

    // Anchor the reveal: the question pins to the top of the viewport and the
    // reply (or error) sits beneath it. Layout is final at this point — the
    // cascade animates opacity/transform only — so the measurement is stable.
    sizeSpacerFor(userBubble);
    scroller!.scrollTop = anchorTarget;

    // Keep "Jump to latest" available briefly when the revealed reply's tail
    // and its chips ended up below the fold, then let it fade away.
    if (distanceFromLatest() > 56) {
      jumpLinger = true;
      window.clearTimeout(jumpLingerTimer);
      jumpLingerTimer = window.setTimeout(() => {
        jumpLinger = false;
        syncJump();
      }, 6000);
    } else {
      jumpLinger = false;
    }
    syncJump();

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
    syncSheetMode();
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
    unlockBody();
    disableKeyboardSync();
    if (reducedMotion.matches) {
      panel!.hidden = true;
    } else {
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(finishPanelClose, 650);
    }
    // Focus goes back to whichever trigger opened the panel.
    lastTrigger?.focus();
    lastTrigger = null;
  }

  closeButton.addEventListener('click', closePanel);

  for (const chip of Array.from(document.querySelectorAll<HTMLButtonElement>('[data-chat-chip]'))) {
    chip.addEventListener('click', () => void sendMessage(chip.textContent ?? ''));
  }

  input.addEventListener('input', () => {
    autosizeInput();
    syncCharCount();
    syncSendAvailability();
  });
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
