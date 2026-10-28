interface DataConnection extends EventTarget { readonly saveData?: boolean }

export function setupLandingMotion(root: Document): (() => void) | undefined {
  const videos = [...root.querySelectorAll('[data-landing-motion]')].filter((element): element is HTMLVideoElement => element instanceof HTMLVideoElement && Boolean(element.dataset.src));
  if (videos.length === 0) return;

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const connection = (navigator as Navigator & { connection?: DataConnection }).connection;
  const visible = new Set<HTMLVideoElement>();
  const failed = new Set<HTMLVideoElement>();
  const restricted = () => reducedMotion.matches || connection?.saveData === true;
  const update = () => {
    const disabled = restricted();
    for (const video of videos) {
      if (disabled || root.hidden || !visible.has(video) || failed.has(video)) {
        video.pause();
        continue;
      }
      if (!video.getAttribute('src') && video.dataset.src) video.src = video.dataset.src;
      void video.play().catch(error => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        if (restricted() || root.hidden || !visible.has(video) || failed.has(video)) return;
        failed.add(video);
        video.pause();
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
  const onError = (event: Event) => {
    if (!(event.currentTarget instanceof HTMLVideoElement)) return;
    failed.add(event.currentTarget);
    event.currentTarget.pause();
  };
  videos.forEach(video => {
    video.muted = true;
    video.loop = true;
    observer.observe(video);
    video.addEventListener('error', onError);
  });
  root.addEventListener('visibilitychange', update);
  reducedMotion.addEventListener('change', update);
  connection?.addEventListener('change', update);
  update();
  return () => {
    observer.disconnect();
    root.removeEventListener('visibilitychange', update);
    reducedMotion.removeEventListener('change', update);
    connection?.removeEventListener('change', update);
    videos.forEach(video => { video.pause(); video.removeEventListener('error', onError); });
  };
}
