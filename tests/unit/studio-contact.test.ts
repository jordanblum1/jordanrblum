// @vitest-environment happy-dom
import { beforeEach, afterEach, expect, test, vi } from 'vitest';
import { initContactForm } from '../../studio/scripts/contact';

beforeEach(() => {
  document.body.innerHTML = `<dialog open><form data-contact-form action="https://jordanblum.com/api/studio/contact" hidden>
    <input name="name" value="Visitor"><input name="email" value="visitor@example.com">
    <textarea name="message">A real project inquiry.</textarea><input name="website" value="">
    <button type="submit"><span data-contact-button-label>Send message</span></button><p data-contact-error hidden></p><a data-contact-error-email hidden>Email instead</a></form><div data-contact-sent hidden><h3 tabindex="-1" data-contact-confirmation>Message sent</h3></div><p data-contact-status></p></dialog>`;
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
  await vi.advanceTimersByTimeAsync(20_000);
  expect(document.querySelector('[data-contact-status]')?.textContent).toContain('timed out');
  expect(document.querySelector('button')?.disabled).toBe(false);
  expect(document.querySelector('textarea')?.disabled).toBe(false);
  submit();
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  await vi.advanceTimersByTimeAsync(20_000);
});

test('a provider response after the former five-second deadline can still finish', async () => {
  vi.useFakeTimers();
  const fetch = vi.fn((_url: string, options: RequestInit) => new Promise<Response>((resolve, reject) => {
    const responseTimer = setTimeout(() => resolve(new Response('{"success":true}', { status: 201 })), 16_000);
    options.signal?.addEventListener('abort', () => {
      clearTimeout(responseTimer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  }));
  vi.stubGlobal('fetch', fetch);
  submit();
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
  await vi.advanceTimersByTimeAsync(15_500);
  expect(document.querySelector('[data-contact-status]')?.textContent).toBe('Sending…');
  expect(document.querySelector('form')?.getAttribute('aria-busy')).toBe('true');
  expect(document.querySelector('button')?.disabled).toBe(true);
  expect(document.querySelector('textarea')?.disabled).toBe(true);
  expect(fetch.mock.calls[0]?.[1].signal?.aborted).toBe(false);
  await vi.advanceTimersByTimeAsync(500);
  expect(document.querySelector('[data-contact-status]')?.textContent).toBe('Message sent');
  expect(document.querySelector('form')?.hasAttribute('aria-busy')).toBe(false);
  expect(document.querySelector('button')?.disabled).toBe(true);
  expect(document.querySelector('textarea')?.disabled).toBe(true);
  expect(document.querySelector('form')?.hidden).toBe(true);
  expect(document.querySelector<HTMLElement>('[data-contact-sent]')?.hidden).toBe(false);
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
  await vi.waitFor(() => expect(document.querySelector('[data-contact-status]')?.textContent).toBe('Too many attempts. Try again in up to an hour.'));
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
  await vi.waitFor(() => expect(document.querySelector('form')?.hidden).toBe(true));
  submit();
  expect(fetch).toHaveBeenCalledTimes(1);
});

test('unavailable browser crypto preserves the draft and offers the email fallback', async () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  vi.spyOn(crypto, 'randomUUID').mockImplementation(() => { throw new Error('Secure context required'); });
  submit();
  await vi.waitFor(() => expect(document.querySelector('[data-contact-status]')?.textContent).toContain('Try again'));
  expect(document.querySelector<HTMLElement>('[data-contact-error-email]')?.hidden).toBe(false);
  expect(fetch).not.toHaveBeenCalled();
  expect(document.querySelector('button')?.disabled).toBe(false);
  expect(document.querySelector('textarea')?.value).toBe('A real project inquiry.');
});


test.each([
  [200, '{"success":false}'],
  [201, '{}'],
  [201, 'invalid JSON'],
  [503, '{"success":true}'],
])('an unconfirmed response (%s, %s) keeps the draft and exposes retry', async (statusCode, body) => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, { status: statusCode })));
  submit();
  await vi.waitFor(() => expect(document.querySelector('[data-contact-status]')?.textContent).toMatch(/try again/i));
  expect(document.querySelector('form')?.hidden).toBe(false);
  expect(document.querySelector<HTMLElement>('[data-contact-sent]')?.hidden).toBe(true);
  expect(document.querySelector<HTMLElement>('[data-contact-error]')?.hidden).toBe(false);
  expect(document.querySelector<HTMLElement>('[data-contact-error-email]')?.hidden).toBe(false);
  expect(document.querySelector('textarea')?.value).toBe('A real project inquiry.');
});

test('reopening a sent message resets the form and permits a new draft', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response('{"success":true}', { status: 201 }));
  vi.stubGlobal('fetch', fetch);
  submit();
  await vi.waitFor(() => expect(document.querySelector('form')?.hidden).toBe(true));
  const form = document.querySelector('form');
  if (!form) throw new Error('missing form');
  vi.spyOn(form, 'reset').mockImplementation(() => { document.querySelectorAll('input, textarea').forEach(field => { if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) field.value = ''; }); });
  document.querySelector('dialog')?.dispatchEvent(new Event('contact:open'));
  expect(form.hidden).toBe(false);
  expect(document.querySelector('textarea')?.value).toBe('');
  expect(document.querySelector('button')?.disabled).toBe(false);
  expect(document.querySelector('[data-contact-status]')?.textContent).toBe('');
});
