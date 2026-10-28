interface DataConnection extends EventTarget { readonly saveData?: boolean }

export function setupLandingMotion(root: Document): (() => void) | undefined {
  const toggle = root.querySelector('[data-motion-toggle]');
  const label = toggle?.querySelector('[data-motion-label]');
  const videos = [...root.querySelectorAll('[data-landing-motion]')].filter((element): element is HTMLVideoElement => element instanceof HTMLVideoElement && Boolean(element.dataset.src));
  if (!(toggle instanceof HTMLButtonElement) || !label || videos.length === 0) return;

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const connection = (navigator as Navigator & { connection?: DataConnection }).connection;
  const visible = new Set<HTMLVideoElement>();
  const failed = new Set<HTMLVideoElement>();
  let paused = false;
  const restricted = () => reducedMotion.matches || connection?.saveData === true;
  const update = () => {
    const disabled = restricted();
    toggle.hidden = disabled || failed.size === videos.length;
    toggle.setAttribute('aria-pressed', String(paused));
    label.textContent = paused ? 'Play motion' : 'Pause motion';
    for (const video of videos) {
      if (disabled || paused || root.hidden || !visible.has(video) || failed.has(video)) {
        video.pause();
        continue;
      }
      if (!video.getAttribute('src') && video.dataset.src) video.src = video.dataset.src;
      void video.play().catch(() => {
        if (restricted() || paused || root.hidden || !visible.has(video) || failed.has(video)) return;
        paused = true;
        update();
      });
    }
  };
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!(entry.target instanceof HTMLVideoElement)) continue;
      if (entry.isIntersecting) visible.add(entry.target);
      else visible.delete(entry.target);
    }
    update();
  }, { threshold: 0.1 });
  const onToggle = () => { paused = !paused; update(); };
  const onError = (event: Event) => {
    if (event.currentTarget instanceof HTMLVideoElement) failed.add(event.currentTarget);
    update();
  };
  videos.forEach(video => { observer.observe(video); video.addEventListener('error', onError); });
  toggle.addEventListener('click', onToggle);
  root.addEventListener('visibilitychange', update);
  reducedMotion.addEventListener('change', update);
  connection?.addEventListener('change', update);
  update();
  return () => {
    observer.disconnect();
    toggle.removeEventListener('click', onToggle);
    root.removeEventListener('visibilitychange', update);
    reducedMotion.removeEventListener('change', update);
    connection?.removeEventListener('change', update);
    videos.forEach(video => { video.pause(); video.removeEventListener('error', onError); });
  };
}
