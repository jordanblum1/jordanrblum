// Portrait whack: five fast hits on the hero portrait arm it (see eggs.ts).
// The face then dodges the pointer and the first few taps, tiring with each
// dodge, until a hit lands and earns a fun fact from the site's own data.
// The fact is a little print: real DOM, developed on a canvas when the browser
// has HTML-in-Canvas, plain DOM otherwise. Esc resets.
import { about, education, projectArchive } from '../data/site';
import { developOnCanvas, htmlInCanvas } from './darkroom';

const project = (title: string) => {
  const item = projectArchive.find((entry) => entry.title === title)!;
  return `${item.title}: ${item.description}`;
};
const FACTS = [
  `${about.paragraphs[0].split('. ')[0]}.`,
  about.paragraphs[2].split('. ').at(-1)!,
  `I was a ${education.campusRoles[0]} at ${education.school}.`,
  project('Citi Bike Wrapped'),
  project('Chicks of NYC'),
  project('Roast My Friend'),
];
let factIndex = Math.floor(Math.random() * FACTS.length);
let armed = false;
let caughtAt = -Infinity;
let reset: (() => void) | null = null;

export function armWhack(panel: HTMLElement): void {
  // A catch can land mid-burst; don't let the same burst re-arm it.
  if (armed || performance.now() - caughtAt < 1500) return;
  reset?.();
  armed = true;
  const face = panel.querySelector<HTMLElement>('.portrait')!;
  const duration = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 280;
  let x = 0;
  let y = 0;
  let dodges = 0;
  let lastDodge = 0;
  let stopPlate: (() => void) | undefined;

  // One animation on the panel; the face (img or squish canvas, even one that
  // boots mid-game) follows through the inherited custom properties.
  const moveTo = (nextX: number, nextY: number, squish: boolean) => {
    const from = { '--dodge-x': `${x}px`, '--dodge-y': `${y}px` };
    [x, y] = [nextX, nextY];
    const to = { '--dodge-x': `${x}px`, '--dodge-y': `${y}px`, '--squish': 0 };
    const frames = squish ? [from, { '--squish': 1, offset: 0.35 }, to] : [from, to];
    panel.animate(frames, { duration, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', fill: 'forwards' });
  };

  const center = () => {
    const rect = face.getBoundingClientRect();
    return { cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2, radius: rect.width / 2 };
  };

  const dodge = (px: number, py: number) => {
    const { cx, cy, radius } = center();
    const angle = Math.hypot(cx - px, cy - py) < 1 ? Math.random() * Math.PI * 2 : Math.atan2(cy - py, cx - px);
    const step = radius * 0.9 * 0.8 ** dodges++;
    const box = panel.getBoundingClientRect();
    const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));
    moveTo(
      clamp(x + Math.cos(angle) * step, Math.max(0, box.width / 2 - radius)),
      clamp(y + Math.sin(angle) * step, Math.max(0, box.height / 2 - radius)),
      true,
    );
    lastDodge = performance.now();
  };

  const hint = note(panel, 'whack-hint', 'Okay, catch me. Esc to stop.');

  const onMove = (event: PointerEvent) => {
    if (event.pointerType === 'touch' || performance.now() - lastDodge < 220) return;
    const { cx, cy, radius } = center();
    if (Math.hypot(event.clientX - cx, event.clientY - cy) < radius) dodge(event.clientX, event.clientY);
  };

  const onClick = (event: MouseEvent) => {
    const { cx, cy, radius } = center();
    if (Math.hypot(event.clientX - cx, event.clientY - cy) > radius) return;
    if (dodges < 3) return dodge(event.clientX, event.clientY);
    disarm();
    caughtAt = performance.now();
    const card = note(panel, 'whack-fact', '');
    card.innerHTML = '<div class="whack-print"><p class="whack-label">Fun fact about Jordan</p><p></p></div>';
    card.querySelector('p:last-child')!.textContent = FACTS[factIndex++ % FACTS.length];
    stopPlate = duration && htmlInCanvas() ? developOnCanvas(card.firstElementChild as HTMLElement) : undefined;
  };

  const onKey = (event: KeyboardEvent) => event.key === 'Escape' && reset?.();

  const disarm = () => {
    armed = false;
    panel.classList.remove('is-whack');
    panel.removeEventListener('pointermove', onMove);
    panel.removeEventListener('click', onClick);
    hint.remove();
    moveTo(0, 0, false);
  };

  reset = () => {
    if (armed) disarm();
    reset = null;
    stopPlate?.();
    panel.querySelector('.whack-fact')?.remove();
    removeEventListener('keydown', onKey);
  };

  panel.classList.add('is-whack');
  panel.addEventListener('pointermove', onMove);
  panel.addEventListener('click', onClick);
  addEventListener('keydown', onKey);
}

function note(panel: HTMLElement, className: string, text: string): HTMLElement {
  panel.querySelector(`.${className}`)?.remove();
  const el = document.createElement('div');
  el.className = className;
  el.setAttribute('role', 'status');
  el.textContent = text;
  panel.append(el);
  return el;
}
