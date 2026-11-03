const errorMessages: Record<number, string> = {
  400: 'Check your name, email and message, then try again.',
  409: 'This message changed during sending. Edit it and try again.',
  429: 'Too many attempts. Try again in up to an hour, or email below.',
  503: 'Messages are temporarily unavailable. Try again or email below.',
};

export function initContactForm(root: ParentNode = document): void {
  const form = root.querySelector<HTMLFormElement>('[data-contact-form]');
  const status = form?.querySelector<HTMLElement>('[data-contact-status]');
  const button = form?.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (!form || !status || !button) return;
  const fields = form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input[name="name"], input[name="email"], textarea[name="message"]');
  form.hidden = false;
  let pending = false;
  let draft = '';
  let key = '';
  form.addEventListener('input', () => {
    if (!pending) status.textContent = '';
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (pending || !form.reportValidity()) return;
    const data = new FormData(form);
    const body = JSON.stringify({
      name: String(data.get('name') ?? '').trim(),
      email: String(data.get('email') ?? '').trim(),
      message: String(data.get('message') ?? '').trim(),
      website: String(data.get('website') ?? ''),
    });
    const message = String(data.get('message') ?? '').trim();
    if (!String(data.get('name') ?? '').trim() || Array.from(message).length < 10) {
      status.textContent = 'Enter your name and a message of at least 10 characters.';
      return;
    }
    if (new TextEncoder().encode(body).byteLength > 8192) {
      status.textContent = 'Your message is too long. Please shorten it and try again.';
      return;
    }
    if (draft !== body) {
      draft = body;
      key = crypto.randomUUID();
    }
    pending = true;
    button.disabled = true;
    fields.forEach(field => { field.disabled = true; });
    form.setAttribute('aria-busy', 'true');
    status.textContent = 'Sending…';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
        body,
        signal: controller.signal,
        credentials: 'omit',
      });
      const result: unknown = await response.json().catch(() => null);
      if (response.ok && typeof result === 'object' && result !== null && 'success' in result && result.success === true) {
        status.textContent = 'Message sent. Thank you.';
      } else {
        status.textContent = errorMessages[response.status] ?? 'Your message could not be sent. Try again or email below.';
      }
    } catch {
      status.textContent = controller.signal.aborted
        ? 'Sending timed out. Try again or email below.'
        : 'Your message could not be sent. Try again or email below.';
    } finally {
      clearTimeout(timeout);
      pending = false;
      button.disabled = false;
      fields.forEach(field => { field.disabled = false; });
      form.removeAttribute('aria-busy');
    }
  });
}
