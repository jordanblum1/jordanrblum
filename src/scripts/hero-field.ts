const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(pointer: fine)');

if (!reducedMotion.matches && finePointer.matches) {
  document.querySelectorAll<HTMLElement>('[data-portrait-panel]').forEach((portrait) => {
    let frame = 0;

    const reset = () => {
      window.cancelAnimationFrame(frame);
      portrait.classList.remove('is-portrait-reacting');
      portrait.style.removeProperty('--portrait-x');
      portrait.style.removeProperty('--portrait-y');
      portrait.style.removeProperty('--portrait-rotate');
      portrait.style.removeProperty('--portrait-ring-x');
      portrait.style.removeProperty('--portrait-ring-y');
      portrait.style.removeProperty('--portrait-ring-inverse-x');
      portrait.style.removeProperty('--portrait-ring-inverse-y');
    };

    portrait.addEventListener('pointerenter', () => {
      portrait.classList.add('is-portrait-reacting');
    });

    portrait.addEventListener('pointermove', (event) => {
      const bounds = portrait.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
      const y = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height));
      const horizontal = x - 0.5;
      const vertical = y - 0.5;

      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        portrait.style.setProperty('--portrait-x', `${horizontal * 8}px`);
        portrait.style.setProperty('--portrait-y', `${vertical * 8}px`);
        portrait.style.setProperty('--portrait-rotate', `${horizontal * 2.4}deg`);
        portrait.style.setProperty('--portrait-ring-x', `${horizontal * -4}px`);
        portrait.style.setProperty('--portrait-ring-y', `${vertical * -4}px`);
        portrait.style.setProperty('--portrait-ring-inverse-x', `${horizontal * 3}px`);
        portrait.style.setProperty('--portrait-ring-inverse-y', `${vertical * 3}px`);
      });
    });

    portrait.addEventListener('pointerleave', reset);
    portrait.addEventListener('pointercancel', reset);
  });

  document.querySelectorAll<HTMLElement>('[data-hero-field]').forEach((field) => {
    let frame = 0;

    const reset = () => {
      window.cancelAnimationFrame(frame);
      field.style.removeProperty('--field-x');
      field.style.removeProperty('--field-y');
      field.style.removeProperty('--field-inverse-x');
      field.style.removeProperty('--field-inverse-y');
      field.style.removeProperty('--mark-x');
      field.style.removeProperty('--mark-y');
      field.style.removeProperty('--mark-rotate');
    };

    field.addEventListener('pointermove', (event) => {
      const bounds = field.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
      const y = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height));

      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        field.style.setProperty('--field-x', `${x * 100}%`);
        field.style.setProperty('--field-y', `${y * 100}%`);
        field.style.setProperty('--field-inverse-x', `${(1 - x) * 100}%`);
        field.style.setProperty('--field-inverse-y', `${(1 - y) * 100}%`);
        field.style.setProperty('--mark-x', `${(x - 0.5) * 28}px`);
        field.style.setProperty('--mark-y', `${(y - 0.5) * 20}px`);
        field.style.setProperty('--mark-rotate', `${(x - 0.5) * 6}deg`);
      });
    });

    field.addEventListener('pointerleave', reset);
  });
}
