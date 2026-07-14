import { animate } from 'motion';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const table = document.getElementById('light-table');

if (table) {
  // develop-in. rootMargin extends the trigger zone below the viewport: the hero
  // headline can push #light-table far enough down that prints sit below the fold
  // at load (measured ~300px on a 1280x720 viewport), so a bare threshold would
  // leave the "signature moment" undeveloped until the visitor scrolls.
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
  }, { threshold: 0.2, rootMargin: '0px 0px 350px 0px' });
  table.querySelectorAll('.print').forEach((p) => io.observe(p));

  let zTop = 100;
  table.querySelectorAll<HTMLElement>('.print').forEach((print) => {
    let sx = 0, sy = 0, dx = 0, dy = 0, moved = false;

    print.addEventListener('pointerdown', (ev) => {
      if (reduced) return;
      print.setPointerCapture(ev.pointerId);
      sx = ev.clientX - dx; sy = ev.clientY - dy; moved = false;
      print.style.zIndex = String(++zTop);
    });
    print.addEventListener('pointermove', (ev) => {
      if (!print.hasPointerCapture(ev.pointerId)) return;
      dx = ev.clientX - sx; dy = ev.clientY - sy;
      if (Math.hypot(dx, dy) > 5) moved = true;
      print.style.translate = `${dx}px ${dy}px`;
    });
    print.addEventListener('pointerup', (ev) => {
      if (!print.hasPointerCapture(ev.pointerId)) return;
      print.releasePointerCapture(ev.pointerId);
      if (moved) {
        // soft spring settle at the drop point (slight overshoot back)
        animate(print, { translate: `${dx * 0.98}px ${dy * 0.98}px` }, { type: 'spring', stiffness: 320, damping: 22 });
        dx *= 0.98; dy *= 0.98;
      }
    });

    if (print.classList.contains('facedown')) {
      const flip = () => { if (!moved) print.classList.toggle('flipped'); };
      print.addEventListener('click', flip);
      print.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); print.classList.toggle('flipped'); } });
    }
  });
}
