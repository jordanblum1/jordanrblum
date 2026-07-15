const desktop = matchMedia('(min-width: 721px)');

document.querySelectorAll<HTMLElement>('.story-track').forEach((track) => {
  const beats = [...track.querySelectorAll<HTMLElement>('[data-story-beat]')];
  let active = -1;
  let frame = 0;
  let listening = false;

  const setActive = (next: number) => {
    if (next === active) return;
    active = next;

    beats.forEach((beat, index) => {
      const isActive = index === next;
      beat.classList.toggle('is-active', isActive);
      beat.querySelector('.beat-sentence')?.classList.toggle('active', isActive);
      beat.querySelector('.beat-visual')?.classList.toggle('active', isActive);
    });
  };

  const update = () => {
    frame = 0;
    if (!desktop.matches || beats.length === 0) return;

    const rect = track.getBoundingClientRect();
    const travel = Math.max(track.offsetHeight - window.innerHeight, 1);
    const progress = Math.min(0.999, Math.max(0, -rect.top / travel));
    setActive(Math.floor(progress * beats.length));
  };

  const requestUpdate = () => {
    if (frame === 0) frame = requestAnimationFrame(update);
  };

  const enable = () => {
    if (listening) return;
    listening = true;
    track.classList.add('is-enhanced');
    update();
    addEventListener('scroll', requestUpdate, { passive: true });
    addEventListener('resize', requestUpdate, { passive: true });
  };

  const disable = () => {
    if (frame !== 0) cancelAnimationFrame(frame);
    frame = 0;
    listening = false;
    active = -1;
    track.classList.remove('is-enhanced');
    removeEventListener('scroll', requestUpdate);
    removeEventListener('resize', requestUpdate);
    beats.forEach((beat) => {
      beat.classList.remove('is-active');
      beat.querySelector('.beat-sentence')?.classList.remove('active');
      beat.querySelector('.beat-visual')?.classList.remove('active');
    });
  };

  const sync = () => {
    if (desktop.matches) enable();
    else disable();
  };

  desktop.addEventListener('change', sync);
  sync();
});
