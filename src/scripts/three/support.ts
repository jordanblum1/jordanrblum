/**
 * Shared guards + helpers for the three.js moments. Scenes are only booted
 * when motion is allowed, WebGL exists, and the host element is near the
 * viewport — and the heavy three chunk is dynamic-imported behind all three.
 */

export const prefersReducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function webglSupported(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

export const shouldRunThree = (): boolean => !prefersReducedMotion() && webglSupported();

/** Resolves on the first real user input — pointer, touch, scroll, or key. */
const firstInput = new Promise<void>((resolve) => {
  const events = ['pointermove', 'pointerdown', 'touchstart', 'scroll', 'keydown'] as const;
  const done = () => {
    for (const event of events) removeEventListener(event, done);
    resolve();
  };
  for (const event of events) addEventListener(event, done, { passive: true });
});

/**
 * Runs `boot` after the first user input, once the element is near the
 * viewport and the main thread is idle. Input-gating keeps the three.js
 * chunk out of the initial load entirely (LCP and the CI byte budget never
 * see it) and matches the brand rule that scenes respond to the visitor.
 */
export function whenNearViewportIdle(el: Element, boot: () => void): void {
  void firstInput.then(() => observeThenIdle(el, boot));
}

function observeThenIdle(el: Element, boot: () => void): void {
  const idle = () => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(boot, { timeout: 2000 });
    } else {
      setTimeout(boot, 350);
    }
  };

  if (!('IntersectionObserver' in window)) {
    idle();
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        idle();
      }
    },
    { rootMargin: '240px' },
  );
  observer.observe(el);
}

/** Rendition switch, e.g. ?mark=ink — defaults to the first option. */
export function variantFrom<const T extends readonly string[]>(param: string, options: T): T[number] {
  const value = new URLSearchParams(location.search).get(param);
  return value && (options as readonly string[]).includes(value) ? value : options[0];
}

/** Reads a brand token off :root so scene colors stay in the design system. */
export function tokenColor(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export interface SpringValue {
  value: number;
  velocity: number;
}

/** Damped spring integration toward `target`; mutates and returns `state`. */
export function springTo(
  state: SpringValue,
  target: number,
  dt: number,
  stiffness: number,
  damping: number,
): SpringValue {
  const acceleration = stiffness * (target - state.value) - damping * state.velocity;
  state.velocity += acceleration * dt;
  state.value += state.velocity * dt;
  return state;
}

/**
 * Starts a render loop that pauses while `el` is offscreen or the tab is
 * hidden. `tick` receives dt (seconds, clamped) and elapsed time.
 */
export function startLoop(el: Element, tick: (dt: number, elapsed: number) => void): () => void {
  let raf = 0;
  let visible = true;
  let last = performance.now();
  let elapsed = 0;

  const frame = (now: number) => {
    const dt = Math.min((now - last) / 1000, 1 / 20);
    last = now;
    elapsed += dt;
    tick(dt, elapsed);
    raf = requestAnimationFrame(frame);
  };

  const play = () => {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };

  const pause = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };

  const observer = new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting);
    if (visible && !document.hidden) play();
    else pause();
  });
  observer.observe(el);

  const onVisibility = () => {
    if (!document.hidden && visible) play();
    else pause();
  };
  document.addEventListener('visibilitychange', onVisibility);

  play();

  return () => {
    pause();
    observer.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
