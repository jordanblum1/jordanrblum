import { waitlistSource } from '../data/waitlist';
export function setupWaitlist(element: Element): void {
  if (!(element instanceof HTMLFormElement)) return;
  const fieldset = element.querySelector('fieldset');
  const email = element.querySelector('[name="email"]');
  const website = element.querySelector('[name="website"]');
  const button = element.querySelector('button');
  const status = element.querySelector('[role="status"]');
  const endpoint = element.dataset.endpoint;
  if (!(fieldset instanceof HTMLFieldSetElement) || !(email instanceof HTMLInputElement) || !(website instanceof HTMLInputElement) || !(button instanceof HTMLButtonElement) || !status || !endpoint) return;
  fieldset.disabled = false;
  document.querySelector('.hero-notify[href="#launch"]')?.addEventListener('click', () => {
    requestAnimationFrame(() => email.focus({ preventScroll: true }));
  });
  element.addEventListener('submit', async event => {
    event.preventDefault();
    if (fieldset.disabled || !element.reportValidity()) return;
    const payload = { idea:'stamp-shift',email:email.value,consent:true,consentVersion:'launch-v1',website:website.value,source:waitlistSource(new URL(location.href).searchParams.get('source')) };
    fieldset.disabled = true;
    button.textContent = 'Saving…';
    status.textContent = '';
    status.removeAttribute('data-error');
    try {
      const response = await fetch(endpoint,{ method:'POST',headers:{ 'Content-Type':'application/json' },credentials:'omit',body:JSON.stringify(payload),signal:AbortSignal.timeout(10000) });
      const result: unknown = await response.json();
      if (!response.ok || typeof result !== 'object' || result === null || !('success' in result) || result.success !== true) throw new Error('Signup failed');
      status.textContent = 'You’re on the Stamp Shift launch list. No confirmation email is sent.';
      button.textContent = 'Saved';
    } catch {
      status.textContent = 'Your signup could not be saved. Try again or ';
      const contact = document.createElement('a');
      contact.href = element.dataset.contact ?? 'mailto:jordanblum16@gmail.com';
      contact.textContent = 'contact support';
      status.append(contact,'.');
      status.setAttribute('data-error','true');
      fieldset.disabled = false;
      button.textContent = 'Notify me';
    }
  });
}
