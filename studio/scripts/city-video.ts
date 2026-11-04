export function initCityVideo(root: ParentNode = document): void {
  const background = root.querySelector<HTMLElement>('[data-city-background]');
  const video = root.querySelector<HTMLVideoElement>('[data-city-video]');
  const toggle = root.querySelector<HTMLButtonElement>('[data-city-motion-toggle]');
  if (!background || !video || !toggle) return;

  const dialog = root.querySelector<HTMLDialogElement>('[data-contact-dialog]');
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const portrait = matchMedia('(max-aspect-ratio: 1/1)');
  let revision = 0;
  let playAttempt = 0;
  let progress = 0;
  let userPaused = false;
  let controllable = false;
  let hasPlayed = false;
  let listeners: AbortController | undefined;

  const updateControl = (): void => {
    const paused = video.paused;
    background.dataset.paused = String(paused);
    toggle.dataset.paused = String(paused);
    toggle.hidden = preference.matches || !controllable;
    const label = paused ? 'Play city animation' : 'Pause city animation';
    toggle.setAttribute('aria-label', label);
    toggle.title = label;
  };
  const unload = (): void => {
    revision += 1;
    playAttempt += 1;
    listeners?.abort();
    video.pause();
    video.removeAttribute('src');
    video.preload = 'none';
    video.load();
    controllable = false;
    hasPlayed = false;
    background.dataset.videoState = 'poster';
    updateControl();
  };
  const showPoster = (version: number): void => {
    if (version === revision) unload();
  };
  const play = async (version: number): Promise<void> => {
    if (preference.matches || userPaused || dialog?.open) return;
    const attempt = ++playAttempt;
    try {
      await video.play();
      if (version !== revision || attempt !== playAttempt) return;
      if (preference.matches || userPaused || dialog?.open) video.pause();
    } catch {
      if (version === revision && attempt === playAttempt) showPoster(version);
    }
  };
  const updateMedia = (): void => {
    if (Number.isFinite(video.duration) && video.duration > 0) progress = video.currentTime / video.duration;
    unload();
    if (preference.matches) return;
    const source = portrait.matches ? video.dataset.portraitSrc : video.dataset.landscapeSrc;
    if (!source) return;
    const version = revision;
    const controller = new AbortController();
    listeners = controller;
    const options = { signal: controller.signal };
    video.addEventListener('loadedmetadata', () => {
      if (version !== revision || !Number.isFinite(video.duration) || video.duration <= 0) return;
      video.currentTime = Math.min(progress * video.duration, Math.max(0, video.duration - .05));
    }, { ...options, once: true });
    video.addEventListener('canplay', () => {
      if (version !== revision || preference.matches) return;
      controllable = true;
      updateControl();
      if (!userPaused) void play(version);
    }, { ...options, once: true });
    video.addEventListener('playing', () => {
      if (version !== revision) return;
      if (preference.matches || userPaused || dialog?.open) { video.pause(); return; }
      hasPlayed = true;
      controllable = true;
      background.dataset.videoState = 'playing';
      updateControl();
    }, options);
    video.addEventListener('pause', () => {
      if (version !== revision) return;
      background.dataset.videoState = hasPlayed ? 'paused' : 'poster';
      updateControl();
    }, options);
    video.addEventListener('error', () => { showPoster(version); }, options);
    video.muted = true;
    video.preload = 'auto';
    video.src = source;
    video.load();
  };

  toggle.addEventListener('click', () => {
    if (!controllable || preference.matches) return;
    userPaused = !video.paused;
    if (userPaused) {
      playAttempt += 1;
      video.pause();
    } else {
      void play(revision);
    }
  });
  if (dialog) {
    new MutationObserver(() => {
      if (dialog.open) {
        playAttempt += 1;
        video.pause();
      } else {
        if (!userPaused && controllable) void play(revision);
      }
    }).observe(dialog, { attributes: true, attributeFilter: ['open'] });
  }
  preference.addEventListener('change', updateMedia);
  portrait.addEventListener('change', updateMedia);
  updateMedia();
}
