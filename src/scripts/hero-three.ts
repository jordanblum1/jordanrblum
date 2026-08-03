import { shouldRunThree, whenNearViewportIdle } from './three/support';

if (shouldRunThree()) {
  const field = document.querySelector<HTMLElement>('[data-hero-field]');
  if (field) {
    whenNearViewportIdle(field, () => {
      import('./three/blum-mark-scene')
        .then(({ initBlumMark }) => initBlumMark(field))
        .catch(() => {});
    });
  }

  const portrait = document.querySelector<HTMLElement>('[data-portrait-panel]');
  if (portrait) {
    whenNearViewportIdle(portrait, () => {
      import('./three/portrait-squish-scene')
        .then(({ initSquishPortrait }) => initSquishPortrait(portrait))
        .catch(() => {});
    });
  }
}
