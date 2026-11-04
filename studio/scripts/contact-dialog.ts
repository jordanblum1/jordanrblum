export function initContactDialog(root: ParentNode = document): void {
  const trigger = root.querySelector<HTMLButtonElement>('[data-contact-trigger]');
  const dialog = root.querySelector<HTMLDialogElement>('[data-contact-dialog]');
  const content = root.querySelector<HTMLElement>('[data-contact-dialog-content]');
  const dismiss = root.querySelector<HTMLButtonElement>('[data-contact-close]');
  if (!trigger || !dialog || !content || !dismiss) return;
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const paper = getComputedStyle(dialog).backgroundColor;
  const border = getComputedStyle(dialog).borderTopColor;
  let phase: 'closed' | 'opening' | 'open' | 'closing' = 'closed';
  let shape: Animation | undefined;
  const viewport = () => {
    dialog.style.setProperty('--contact-viewport-height', `${visualViewport?.height ?? innerHeight}px`);
    dialog.style.setProperty('--contact-viewport-top', `${visualViewport?.offsetTop ?? 0}px`);
  };
  const finishClose = () => {
    content.getAnimations().forEach(animation => animation.cancel());
    dialog.close();
    dialog.style.height = '';
    trigger.style.visibility = '';
    content.style.opacity = '';
    content.inert = false;
    phase = 'closed';
    trigger.focus({ preventScroll: true });
    if (location.hash === '#contact') queueMicrotask(() => { void open(false); });
  };
  const close = async (updateHash = true) => {
    if (phase === 'closed' || phase === 'closing') return;
    if (updateHash && location.hash === '#contact') history.replaceState(null, '', location.pathname + location.search);
    content.inert = true;
    if (phase === 'opening') {
      phase = 'closing';
      shape?.cancel();
      finishClose();
      return;
    }
    phase = 'closing';
    if (!preference.matches) {
      await content.animate([{ opacity: 1, filter: 'blur(0px)' }, { opacity: 0, filter: 'blur(2px)' }], { duration: 90, easing: 'ease-out', fill: 'forwards' }).finished.catch(() => {});
      content.style.opacity = '0';
      const from = dialog.getBoundingClientRect();
      dialog.style.height = `${from.height}px`;
      const to = trigger.getBoundingClientRect();
      shape = dialog.animate([
        { transform: 'none', borderRadius: '28px', backgroundColor: paper, borderColor: border },
        { transform: `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${to.width / from.width}, ${to.height / from.height})`, borderRadius: `${to.height / 2 / (to.width / from.width)}px / ${from.height / 2}px`, backgroundColor: getComputedStyle(trigger).backgroundColor, borderColor: getComputedStyle(trigger).borderTopColor },
      ], { duration: 280, easing: 'cubic-bezier(.4, 0, .2, 1)', fill: 'forwards' });
      await shape.finished.catch(() => {});
    }
    finishClose();
    shape?.cancel();
    content.getAnimations().forEach(animation => animation.cancel());
  };
  const open = async (updateHash = true) => {
    if (phase !== 'closed') return;
    phase = 'opening';
    viewport();
    const from = trigger.getBoundingClientRect();
    const fromColor = getComputedStyle(trigger).backgroundColor;
    content.inert = true;
    content.style.opacity = '0';
    dialog.showModal();
    trigger.style.visibility = 'hidden';
    if (updateHash && location.hash !== '#contact') history.pushState(null, '', `${location.pathname}${location.search}#contact`);
    if (!preference.matches) {
      const to = dialog.getBoundingClientRect();
      dialog.style.height = `${to.height}px`;
      shape = dialog.animate([
        { transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`, borderRadius: `${from.height / 2 / (from.width / to.width)}px / ${to.height / 2}px`, backgroundColor: fromColor, borderColor: getComputedStyle(trigger).borderTopColor },
        { transform: 'none', borderRadius: '28px', backgroundColor: paper, borderColor: border },
      ], { duration: 360, easing: 'cubic-bezier(.22, .75, .2, 1)' });
      await shape.finished.catch(() => {});
    }
    if (phase !== 'opening') return;
    dialog.style.height = '';
    content.style.opacity = '1';
    if (!preference.matches) {
      await content.animate([{ opacity: 0, transform: 'translateY(6px)', filter: 'blur(2px)' }, { opacity: 1, transform: 'none', filter: 'blur(0px)' }], { duration: 140, easing: 'ease-out' }).finished.catch(() => {});
    }
    if (phase !== 'opening') return;
    content.inert = false;
    phase = 'open';
    dialog.querySelector<HTMLInputElement>('input[name="name"]')?.focus({ preventScroll: true });
  };
  trigger.hidden = false;
  trigger.addEventListener('click', () => { void open(); });
  dismiss.addEventListener('click', () => { void close(); });
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
  preference.addEventListener('change', () => { if (preference.matches) dialog.getAnimations({ subtree: true }).forEach(animation => animation.finish()); });
  syncHash();
}
