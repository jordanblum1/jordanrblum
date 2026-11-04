// @vitest-environment happy-dom
import { beforeEach, afterEach, expect, test, vi } from 'vitest';
import { initContactForm } from '../../studio/scripts/contact';

beforeEach(() => {
  document.body.innerHTML = `<form data-contact-form action="https://jordanblum.com/api/studio/contact" hidden>
    <input name="name" value="Visitor"><input name="email" value="visitor@example.com">
    <textarea name="message">A real project inquiry.</textarea><input name="website" value="">
    <button type="submit">Send message</button><p data-contact-status></p></form>`;
  initContactForm();
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); });
function submit() {
  document.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true }));
}

test('byte limit prevents oversized Unicode messages without discarding the draft', () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  const message = document.querySelector('textarea');
  if (!message) throw new Error('missing message field');
  message.value = '界'.repeat(3000);
  submit();
  expect(fetch).not.toHaveBeenCalled();
  expect(document.querySelector('[data-contact-status]')?.textContent).toContain('too long');
  expect(message.value).toHaveLength(3000);
});

test('a timed-out send is aborted and can be retried', async () => {
  vi.useFakeTimers();
  const fetch = vi.fn((_url: string, options: RequestInit) => new Promise((_resolve, reject) => {
    options.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
  }));
  vi.stubGlobal('fetch', fetch);
  submit();
  expect(document.querySelector('button')?.disabled).toBe(true);
  expect(document.querySelector('textarea')?.disabled).toBe(true);
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  await vi.advanceTimersByTimeAsync(15_000);
  expect(document.querySelector('[data-contact-status]')?.textContent).toContain('timed out');
  expect(document.querySelector('button')?.disabled).toBe(false);
  expect(document.querySelector('textarea')?.disabled).toBe(false);
  submit();
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  await vi.advanceTimersByTimeAsync(15_000);
});

test('whitespace-only contact details never reach the server', () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  const name = document.querySelector('input[name="name"]');
  if (!(name instanceof HTMLInputElement)) throw new Error('missing name field');
  name.value = '   ';
  submit();
  expect(fetch).not.toHaveBeenCalled();
  expect(document.querySelector('[data-contact-status]')?.textContent).toContain('Enter your name');
});


test('message minimum counts Unicode code points instead of UTF-16 units', () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  const message = document.querySelector('textarea');
  if (!message) throw new Error('missing message field');
  message.value = 'Hello \u{1F44B}\u{1F44B}';
  submit();
  expect(fetch).not.toHaveBeenCalled();
  expect(document.querySelector('[data-contact-status]')?.textContent).toContain('at least 10 characters');
});

test('rate limiting explains the actual hourly retry window', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 429 })));
  submit();
  await vi.waitFor(() => expect(document.querySelector('[data-contact-status]')?.textContent).toBe('Too many attempts. Try again in up to an hour, or email below.'));
});


test('duplicate submits stay locked while the signed payload digest is pending', async () => {
  const actualDigest = crypto.subtle.digest.bind(crypto.subtle);
  let release: () => void = () => {};
  const held = new Promise<void>(resolve => { release = resolve; });
  vi.spyOn(crypto.subtle, 'digest').mockImplementation(async (...args) => { await held; return actualDigest(...args); });
  const fetch = vi.fn().mockResolvedValue(new Response('{"success":true}', { status: 201 }));
  vi.stubGlobal('fetch', fetch);
  submit();
  submit();
  expect(document.querySelector('textarea')?.disabled).toBe(true);
  expect(fetch).not.toHaveBeenCalled();
  release();
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  await vi.waitFor(() => expect(document.querySelector('textarea')?.disabled).toBe(false));
});

test('unavailable browser crypto preserves the draft and offers the email fallback', async () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  vi.spyOn(crypto, 'randomUUID').mockImplementation(() => { throw new Error('Secure context required'); });
  submit();
  await vi.waitFor(() => expect(document.querySelector('[data-contact-status]')?.textContent).toContain('email below'));
  expect(fetch).not.toHaveBeenCalled();
  expect(document.querySelector('button')?.disabled).toBe(false);
  expect(document.querySelector('textarea')?.value).toBe('A real project inquiry.');
});
