const errorMessages: Record<number, string> = {
  400: 'Check your name, email and message, then try again.',
  409: 'This message changed during sending. Edit it and try again.',
  429: 'Too many attempts. Try again in up to an hour.',
  503: 'Messages are temporarily unavailable. Try again.',
};

export function initContactForm(root: ParentNode = document): void {
  const form = root.querySelector<HTMLFormElement>('[data-contact-form]');
  const status = root.querySelector<HTMLElement>('[data-contact-status]');
  const error = form?.querySelector<HTMLElement>('[data-contact-error]');
  const email = form?.querySelector<HTMLElement>('[data-contact-error-email]');
  const confirmation = root.querySelector<HTMLElement>('[data-contact-sent]');
  const label = form?.querySelector<HTMLElement>('[data-contact-button-label]');
  const compose = form?.closest<HTMLElement>('[data-contact-compose]');
  const dialog = form?.closest('dialog');
  const button = form?.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (!form || !status || !button) return;
  const fields = form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input[name="name"], input[name="email"], textarea[name="message"]');
  form.hidden = false;
  let pending = false;
  let sent = false;
  let draft = '';
  let key = '';
  const showError = (message: string) => {
    status.textContent = message;
    if (error) { error.textContent = message; error.hidden = !message; }
    if (email) email.hidden = !message;
  };
  dialog?.addEventListener('contact:open', () => {
    if (!sent) return;
    sent = false;
    form.reset();
    form.hidden = false;
    compose?.style.removeProperty('--contact-compose-height');
    button.disabled = false;
    fields.forEach(field => { field.disabled = false; });
    if (confirmation) confirmation.hidden = true;
    draft = '';
    key = '';
    showError('');
  });
  form.addEventListener('input', () => {
    if (!pending && !sent) showError('');
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (pending || sent || !form.reportValidity()) return;
    const data = new FormData(form);
    const body = JSON.stringify({
      name: String(data.get('name') ?? '').trim(),
      email: String(data.get('email') ?? '').trim(),
      message: String(data.get('message') ?? '').trim(),
      website: String(data.get('website') ?? ''),
    });
    const message = String(data.get('message') ?? '').trim();
    if (!String(data.get('name') ?? '').trim() || Array.from(message).length < 10) {
      showError('Enter your name and a message of at least 10 characters.');
      return;
    }
    if (new TextEncoder().encode(body).byteLength > 8192) {
      showError('Your message is too long. Please shorten it and try again.');
      return;
    }
    pending = true;
    button.disabled = true;
    fields.forEach(field => { field.disabled = true; });
    form.setAttribute('aria-busy', 'true');
    showError('');
    status.textContent = 'Sending…';
    if (label) label.textContent = 'Sending…';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    try {
      if (draft !== body || !key) {
        key = crypto.randomUUID();
        draft = body;
      }
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body));
      const payloadHash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
      const response = await fetch(form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key, 'x-amz-content-sha256': payloadHash },
        body,
        signal: controller.signal,
        credentials: 'omit',
      });
      const result: unknown = await response.json().catch(() => null);
      if (response.ok && typeof result === 'object' && result !== null && 'success' in result && result.success === true) {
        sent = true;
        status.textContent = 'Message sent';
        compose?.style.setProperty('--contact-compose-height', `${form.getBoundingClientRect().height}px`);
        form.hidden = true;
        if (confirmation) {
          confirmation.hidden = false;
          if (dialog?.open && !form.closest('[inert]')) confirmation.querySelector<HTMLElement>('[data-contact-confirmation]')?.focus({ preventScroll: true });
        }
      } else {
        showError(errorMessages[response.status] ?? 'Your message could not be sent. Try again.');
      }
    } catch {
      showError(controller.signal.aborted
        ? 'Sending timed out. Try again.'
        : 'Your message could not be sent. Try again.');
    } finally {
      clearTimeout(timeout);
      pending = false;
      button.disabled = sent;
      fields.forEach(field => { field.disabled = sent; });
      if (label) label.textContent = 'Send message';
      form.removeAttribute('aria-busy');
    }
  });
}
