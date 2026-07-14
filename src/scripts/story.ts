// src/scripts/story.ts
const track = document.querySelector<HTMLElement>('.story-track');
if (track) {
  const mql = matchMedia('(min-width: 721px)');
  let initialized = false;
  const init = () => {
    if (initialized) return;
    initialized = true;
    const beats = Number(track.dataset.beats ?? 4);
    track.style.setProperty('--beats', String(beats));
    const sentences = [...track.querySelectorAll('.beat-sentence')];
    const visuals = [...track.querySelectorAll('.beat-visual')];
    let current = -1;
    const setBeat = (i: number) => {
      if (i === current) return;
      current = i;
      sentences.forEach((s, j) => s.classList.toggle('active', j === i));
      visuals.forEach((v, j) => v.classList.toggle('active', j === i));
    };
    const onScroll = () => {
      const r = track.getBoundingClientRect();
      const progress = Math.min(0.999, Math.max(0, -r.top / (track.offsetHeight - innerHeight)));
      setBeat(Math.floor(progress * beats));
    };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  };
  // Loading at ≤720px must not attach the scroll listener (mobile CSS forces static/visible
  // beats regardless); but if the window is later resized/rotated across the 720px boundary,
  // the desktop scroll-scrub must come alive without a reload — otherwise the story is left
  // permanently un-initialized (desktop CSS positions/hides beats but nothing ever sets .active).
  mql.addEventListener('change', (e) => { if (e.matches) init(); });
  if (mql.matches) init();
}
