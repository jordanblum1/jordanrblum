/** The visitor's paint is the only layer wiped; the original mural stays intact. */
export function repaintWall(canvas: HTMLCanvasElement, painter: HTMLElement, done: () => void): () => void {
  const duration = 2600;
  const halfPainter = painter.offsetWidth / 2;
  const wipe = canvas.animate(
    [{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(0 0 0 100%)' }],
    { duration, easing: 'linear', fill: 'forwards' },
  );
  const walk = painter.animate([
    { transform: `translateX(${-halfPainter}px)`, opacity: 0 },
    { opacity: 1, offset: 0.08 },
    { opacity: 1, offset: 0.92 },
    { transform: `translateX(${canvas.clientWidth - halfPainter}px)`, opacity: 0 },
  ], { duration, easing: 'linear', fill: 'forwards' });
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    done();
    wipe.cancel();
    walk.cancel();
  };
  void wipe.finished.then(finish, finish);
  return finish;
}
