import motion from '../assets/spray/painter-motion.json';

/** The visitor's paint is the only layer wiped; the original mural stays intact. */
export function repaintWall(canvas: HTMLCanvasElement, painter: HTMLElement, done: () => void): () => void {
  const cycle = motion.frames * Math.max(100, motion.frameDurationMs);
  const duration = cycle * 2;
  const rollerOffset = painter.offsetWidth * 0.7;
  const sprite = painter.querySelector<HTMLImageElement>('[data-spray-painter-frames]')!;
  const strokes = sprite.animate(Array.from({ length: motion.frames + 1 }, (_, index) => {
    const frame = index % motion.frames;
    return {
      transform: `translate(${-(frame % motion.columns) * 100 / motion.columns}%, ${-Math.floor(frame / motion.columns) * 100 / motion.rows}%)`,
      offset: index / motion.frames,
      easing: 'step-end',
    };
  }), { duration: cycle, iterations: 2 });
  const wipe = canvas.animate(
    [{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(0 0 0 100%)' }],
    { duration, easing: 'linear', fill: 'forwards' },
  );
  const walk = painter.animate([
    { transform: `translateX(${-rollerOffset}px)`, opacity: 0 },
    { opacity: 1, offset: 0.08 },
    { opacity: 1, offset: 0.92 },
    { transform: `translateX(${canvas.clientWidth - rollerOffset}px)`, opacity: 0 },
  ], { duration, easing: 'linear', fill: 'forwards' });
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    done();
    wipe.cancel();
    walk.cancel();
    strokes.cancel();
  };
  void wipe.finished.then(finish, finish);
  return finish;
}
