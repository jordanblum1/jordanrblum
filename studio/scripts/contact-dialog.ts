export function initContactDialog(root: ParentNode = document): void {
  const trigger = root.querySelector<HTMLButtonElement>('[data-contact-trigger]');
  const dialog = root.querySelector<HTMLDialogElement>('[data-contact-dialog]');
  const surface = dialog?.querySelector<HTMLElement>('[data-contact-surface]');
  const content = dialog?.querySelector<HTMLElement>('[data-contact-dialog-content]');
  if (!trigger || !dialog || !surface || !content) return;
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  let phase: 'closed' | 'opening' | 'open' | 'closing' = 'closed';
  let shape: Animation | undefined;
  let reveal: Animation | undefined;
  let operation = 0;
  const viewport = () => {
    if (phase === 'closing') return;
    dialog.style.setProperty('--contact-viewport-height', `${visualViewport?.height ?? innerHeight}px`);
    dialog.style.setProperty('--contact-viewport-top', `${visualViewport?.offsetTop ?? 0}px`);
  };
  const triggerShape = (): Keyframe => {
    const from = dialog.getBoundingClientRect();
    const to = trigger.getBoundingClientRect();
    const scaleX = to.width / from.width;
    return {
      transform: `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${scaleX}, ${to.height / from.height})`,
      borderRadius: `${to.height / 2 / scaleX}px / ${from.height / 2}px`,
      backgroundColor: getComputedStyle(trigger).backgroundColor,
      borderColor: getComputedStyle(trigger).borderTopColor,
    };
  };
  const paperShape: Keyframe = { transform: 'none', borderRadius: '28px', backgroundColor: getComputedStyle(surface).backgroundColor, borderColor: getComputedStyle(surface).borderTopColor };
  const finishClose = () => {
    shape?.cancel();
    reveal?.cancel();
    dialog.close();
    dialog.style.height = '';
    dialog.scrollTop = 0;
    trigger.style.visibility = '';
    content.style.opacity = '';
    content.inert = false;
    phase = 'closed';
    delete dialog.dataset.contactPhase;
    trigger.focus({ preventScroll: true });
    if (location.hash === '#contact') queueMicrotask(() => { void open(false); });
  };
  const close = async (updateHash = true) => {
    if (phase === 'closed' || phase === 'closing') return;
    const current = ++operation;
    if (updateHash && location.hash === '#contact') history.replaceState(null, '', location.pathname + location.search);
    const style = getComputedStyle(surface);
    const from: Keyframe = { transform: style.transform, borderRadius: style.borderRadius, backgroundColor: style.backgroundColor, borderColor: style.borderTopColor };
    const contentStyle = getComputedStyle(content);
    const appearance: Keyframe = { opacity: contentStyle.opacity, transform: contentStyle.transform };
    phase = 'closing';
    dialog.dataset.contactPhase = 'closing';
    content.inert = true;
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    shape?.cancel();
    reveal?.cancel();
    if (!preference.matches) {
      dialog.style.height = `${dialog.getBoundingClientRect().height}px`;
      reveal = content.animate([appearance, { ...appearance, opacity: 0 }], { duration: 100, easing: 'ease-out', fill: 'forwards' });
      shape = surface.animate([from, triggerShape()], { duration: 260, easing: 'cubic-bezier(.32, 0, .2, 1)', fill: 'forwards' });
      await shape.finished.catch(() => {});
    }
    if (current === operation) finishClose();
  };
  const open = async (updateHash = true) => {
    if (phase !== 'closed') return;
    const current = ++operation;
    phase = 'opening';
    dialog.dataset.contactPhase = 'opening';
    viewport();
    dialog.dispatchEvent(new Event('contact:open'));
    content.inert = true;
    content.style.opacity = '0';
    dialog.showModal();
    trigger.style.visibility = 'hidden';
    if (updateHash && location.hash !== '#contact') history.pushState(null, '', `${location.pathname}${location.search}#contact`);
    if (!preference.matches) {
      dialog.style.height = `${dialog.getBoundingClientRect().height}px`;
      shape = surface.animate([triggerShape(), paperShape], { duration: 360, easing: 'cubic-bezier(.22, .75, .2, 1)', fill: 'forwards' });
      await shape.finished.catch(() => {});
    }
    if (current !== operation) return;
    shape?.cancel();
    dialog.style.height = '';
    content.style.opacity = '1';
    if (!preference.matches) {
      reveal = content.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 140, easing: 'ease-out' });
      await reveal.finished.catch(() => {});
    }
    if (current !== operation) return;
    content.inert = false;
    phase = 'open';
    dialog.dataset.contactPhase = 'open';
    (dialog.querySelector<HTMLElement>('[data-contact-sent]:not([hidden]) [data-contact-confirmation]') ?? dialog.querySelector<HTMLInputElement>('input[name="name"]:enabled') ?? dialog.querySelector<HTMLButtonElement>('[data-contact-close]'))?.focus({ preventScroll: true });
  };
  trigger.hidden = false;
  trigger.addEventListener('click', () => { void open(); });
  dialog.querySelectorAll('[data-contact-close]').forEach(button => button.addEventListener('click', () => { void close(); }));
  dialog.addEventListener('cancel', event => { event.preventDefault(); void close(); });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) void close();
  });
  const syncHash = () => {
    if (location.hash === '#contact') void open(false);
    else if (dialog.open) void close(false);
  };
  addEventListener('popstate', syncHash);
  addEventListener('hashchange', syncHash);
  visualViewport?.addEventListener('resize', viewport);
  visualViewport?.addEventListener('scroll', viewport);
  preference.addEventListener('change', () => {
    if (preference.matches) [shape, reveal].forEach(animation => {
      if (animation?.playState === 'running' || animation?.playState === 'paused') animation.finish();
    });
  });
  syncHash();
}
