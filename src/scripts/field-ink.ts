// Cursor-driven ink splatter for the hero field panel. As the pointer travels
// across the panel, procedurally generated watercolor blooms are stamped onto
// a multiply-blended canvas and slowly dry away. Everything is generated at
// runtime (no sprite assets): each sprite is a deformed polygon refilled in
// many low-alpha layers, which reads as soaked pigment once multiplied over
// the wash. Mouse-only and skipped under reduced motion; the panel simply
// keeps its static wash for everyone else.
import { finePointer, reducedMotion } from './media';

interface Stamp {
  x: number;
  y: number;
  rotation: number;
  scale: number;
  sprite: HTMLCanvasElement;
  born: number;
}

const SPRITE_SIZE = 256;
const STAMP_SPACING = 46;
const STAMP_LIFE = 3400;
const MAX_STAMPS = 90;

const readToken = (name: string, fallback: string) => {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
};

// One watercolor bloom: a wobbly polygon redrawn ~22 times at ~4.5% alpha with
// fresh per-vertex jitter each pass, so edges feather like wet pigment, plus a
// few satellite droplets.
const makeSprite = (color: string): HTMLCanvasElement => {
  const sprite = document.createElement('canvas');
  sprite.width = SPRITE_SIZE;
  sprite.height = SPRITE_SIZE;
  const ctx = sprite.getContext('2d');
  if (!ctx) return sprite;

  const center = SPRITE_SIZE / 2;
  const baseRadius = SPRITE_SIZE * 0.22;
  const vertexCount = 12;
  const baseRadii = Array.from({ length: vertexCount }, () => baseRadius * (0.7 + Math.random() * 0.5));

  ctx.fillStyle = color;

  const fillBlob = (layers: number, alpha: number, radiusMin: number, radiusJitter: number) => {
    for (let layer = 0; layer < layers; layer += 1) {
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      for (let i = 0; i < vertexCount; i += 1) {
        const angle = (i / vertexCount) * Math.PI * 2;
        const radius = baseRadii[i] * (radiusMin + Math.random() * radiusJitter);
        const x = center + Math.cos(angle) * radius;
        const y = center + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    }
  };

  // Feathered rim over a denser core, so each stamp reads as a discrete blot
  // with soaked edges rather than haze.
  fillBlob(10, 0.05, 0.95, 0.35);
  fillBlob(12, 0.1, 0.55, 0.3);

  const droplets = 4 + Math.floor(Math.random() * 4);
  for (let i = 0; i < droplets; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const distance = baseRadius * (1.3 + Math.random() * 0.8);
    ctx.globalAlpha = 0.22 + Math.random() * 0.2;
    ctx.beginPath();
    ctx.arc(
      center + Math.cos(angle) * distance,
      center + Math.sin(angle) * distance,
      1.8 + Math.random() * 4.6,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  return sprite;
};

if (!reducedMotion.matches) {
  document.querySelectorAll<HTMLElement>('[data-hero-field]').forEach((field) => {
    const canvas = field.querySelector<HTMLCanvasElement>('.field-ink');
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let sprites: HTMLCanvasElement[] = [];
    let stamps: Stamp[] = [];
    let frame = 0;
    let dpr = 1;
    let lastStampX = 0;
    let lastStampY = 0;
    let lastMoveAt = 0;
    let initialized = false;
    // Cached so pointermove (a hot path) never forces a layout read; refreshed
    // on resize and on each pointerenter.
    let fieldBounds = { left: 0, top: 0 };

    const resize = () => {
      const bounds = field.getBoundingClientRect();
      fieldBounds = bounds;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(bounds.width * dpr);
      canvas.height = Math.round(bounds.height * dpr);
    };

    const init = () => {
      if (initialized) return;
      initialized = true;
      const accent = readToken('--accent', '#9C4037');
      const sage = readToken('--success', '#52735B');
      sprites = [
        ...Array.from({ length: 5 }, () => makeSprite(accent)),
        ...Array.from({ length: 2 }, () => makeSprite(sage)),
      ];
      resize();
      window.addEventListener('resize', resize);
      // Keep the cached bounds honest while the page scrolls under the cursor
      // — rAF-coalesced so it costs at most one layout read per frame.
      let scrollFrame = 0;
      window.addEventListener(
        'scroll',
        () => {
          if (scrollFrame) return;
          scrollFrame = window.requestAnimationFrame(() => {
            scrollFrame = 0;
            fieldBounds = field.getBoundingClientRect();
          });
        },
        { passive: true },
      );
    };

    const step = (now: number) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'multiply';

      stamps = stamps.filter((stamp) => now - stamp.born < STAMP_LIFE);
      for (const stamp of stamps) {
        const age = (now - stamp.born) / STAMP_LIFE;
        // Quick bloom, then a long dry-out; the stamp also spreads slightly
        // while it blooms, like ink soaking into paper.
        const bloom = Math.min(age / 0.06, 1);
        const alpha = 0.85 * bloom * (1 - age) ** 1.5;
        const spread = 0.82 + 0.18 * Math.min(age / 0.18, 1);

        ctx.setTransform(dpr, 0, 0, dpr, stamp.x * dpr, stamp.y * dpr);
        ctx.rotate(stamp.rotation);
        ctx.scale(stamp.scale * spread, stamp.scale * spread);
        ctx.globalAlpha = alpha;
        ctx.drawImage(stamp.sprite, -SPRITE_SIZE / 2, -SPRITE_SIZE / 2);
      }

      frame = stamps.length > 0 ? window.requestAnimationFrame(step) : 0;
    };

    const spawn = (x: number, y: number, boost = 0) => {
      stamps.push({
        x: x + (Math.random() - 0.5) * 14,
        y: y + (Math.random() - 0.5) * 14,
        rotation: Math.random() * Math.PI * 2,
        scale: 0.45 + Math.random() * 0.45 + boost,
        sprite: sprites[Math.floor(Math.random() * sprites.length)],
        born: performance.now(),
      });
      if (stamps.length > MAX_STAMPS) stamps.splice(0, stamps.length - MAX_STAMPS);
      if (!frame) frame = window.requestAnimationFrame(step);
    };

    if (finePointer.matches) {
      // Desktop: paint follows the cursor.
      field.addEventListener('pointerenter', (event) => {
        init();
        fieldBounds = field.getBoundingClientRect();
        const x = event.clientX - fieldBounds.left;
        const y = event.clientY - fieldBounds.top;
        lastStampX = x;
        lastStampY = y;
        lastMoveAt = performance.now();
        for (let i = 0; i < 3; i += 1) {
          spawn(x + (Math.random() - 0.5) * 90, y + (Math.random() - 0.5) * 70);
        }
      });

      field.addEventListener('pointermove', (event) => {
        if (!initialized) return;
        const x = event.clientX - fieldBounds.left;
        const y = event.clientY - fieldBounds.top;
        const travelled = Math.hypot(x - lastStampX, y - lastStampY);
        if (travelled < STAMP_SPACING) return;

        const now = performance.now();
        const velocity = travelled / Math.max(now - lastMoveAt, 1);
        lastStampX = x;
        lastStampY = y;
        lastMoveAt = now;
        // Faster strokes throw slightly bigger splatters.
        spawn(x, y, Math.min(velocity * 0.18, 0.5));
      });
    } else if ('IntersectionObserver' in window) {
      // Touch: no cursor to follow, so the wall gets tagged once on arrival —
      // a choreographed burst of blooms arcing across the panel as it scrolls
      // into view.
      const observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          observer.disconnect();
          init();
          const bounds = field.getBoundingClientRect();
          const points = 8;
          for (let i = 0; i < points; i += 1) {
            const t = i / (points - 1);
            window.setTimeout(() => {
              spawn(
                bounds.width * (0.12 + t * 0.76),
                bounds.height * (0.3 + Math.sin(t * Math.PI) * 0.35),
                0.15,
              );
            }, 220 + i * 140);
          }
        },
        { threshold: 0.45 },
      );
      observer.observe(field);
    }
  });
}
