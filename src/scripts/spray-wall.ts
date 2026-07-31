// Spray-paint easter egg for the footer graffiti wall. Tapping the leaning
// spray can arms paint mode: the cursor becomes a can, pointer-down sprays
// aerosol dot-scatter onto a persistent canvas over the mural, paint
// accumulates into drips, and a procedural WebAudio rattle/hiss plays along.
// Everything is direct interaction (brand: motion rewards direct interaction);
// nothing loops while idle. Reduced motion keeps the toy but drops the
// wobble flourishes; sound is off until unmuted and gated behind the arm tap.
import { reducedMotion } from './media';

interface Nozzle {
  /** Spray radius in CSS px. */
  radius: number;
  /** Per-stamp core alpha (Photoshop "flow"): overlapping stamps composite
      to near-solid coverage in a single pass. */
  flow: number;
  /** Stamp spacing along the stroke, as a fraction of radius. */
  spacing: number;
  /** Grain dots per stamp, scattered in the outer fringe only. */
  fringe: number;
  /** Per-fringe-dot alpha. */
  fringeAlpha: number;
  /** Fringe dot size range [min, max]. */
  size: [number, number];
  /** How quickly paint accumulates toward a drip (per stamp near center). */
  buildup: number;
}

// Presets modeled on real cap behavior: skinny = tight and dense, fat = wide
// soft coverage, needle = hard opaque core with dusty fuzz.
const NOZZLES: Record<string, Nozzle> = {
  skinny: { radius: 9, flow: 0.5, spacing: 0.45, fringe: 8, fringeAlpha: 0.14, size: [1, 2], buildup: 1.7 },
  fat: { radius: 34, flow: 0.38, spacing: 0.35, fringe: 14, fringeAlpha: 0.09, size: [1.4, 3], buildup: 1.1 },
  needle: { radius: 4, flow: 0.75, spacing: 0.4, fringe: 5, fringeAlpha: 0.2, size: [1, 1.6], buildup: 2.4 },
};

const SPRAY_TICK_MS = 24;
const DRIP_THRESHOLD = 46;
const STORAGE_KEY = 'jrb-spray-wall-v1';
const CELL = 24; // accumulation grid cell in CSS px

interface Drip {
  x: number;
  y: number;
  startY: number;
  maxRun: number;
  width: number;
  color: string;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// --- Procedural audio: aerosol hiss + can rattle, no assets. ---------------
class SprayAudio {
  private ctx: AudioContext | null = null;
  private hissGain: GainNode | null = null;
  muted = true;

  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    this.ctx = new Ctor();

    // Looped white noise through a bandpass reads as aerosol hiss.
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 4800;
    filter.Q.value = 0.6;
    this.hissGain = this.ctx.createGain();
    this.hissGain.gain.value = 0;
    source.connect(filter).connect(this.hissGain).connect(this.ctx.destination);
    source.start();
    return this.ctx;
  }

  resume(): void {
    void this.ensure()?.resume();
  }

  hiss(on: boolean): void {
    const ctx = this.ensure();
    if (!ctx || !this.hissGain) return;
    const target = on && !this.muted ? 0.14 : 0;
    this.hissGain.gain.setTargetAtTime(target, ctx.currentTime, 0.03);
  }

  rattle(): void {
    const ctx = this.ensure();
    if (!ctx || this.muted) return;
    // The mixing ball: a handful of short pitched clacks.
    for (let i = 0; i < 5; i += 1) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = ctx.currentTime + i * 0.07 + Math.random() * 0.02;
      osc.type = 'square';
      osc.frequency.value = 950 + Math.random() * 700;
      gain.gain.setValueAtTime(0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.05);
    }
  }
}

// ---------------------------------------------------------------------------
const root = document.querySelector<HTMLElement>('[data-spray-wall]');
const stage = root?.closest<HTMLElement>('.footer-stage');

if (root && stage) {
  const canvas = root.querySelector<HTMLCanvasElement>('[data-spray-canvas]')!;
  const ctx = canvas.getContext('2d')!;
  const armButton = root.querySelector<HTMLButtonElement>('[data-spray-arm]')!;
  const toolbar = root.querySelector<HTMLElement>('[data-spray-toolbar]')!;
  const cursorCan = root.querySelector<HTMLElement>('[data-spray-cursor]')!;
  const cursorImg = cursorCan.querySelector<HTMLImageElement>('img')!;
  const canButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-spray-can]')];
  const nozzleButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-spray-nozzle]')];
  const audio = new SprayAudio();

  let armed = false;
  let spraying = false;
  let dpr = 1;
  let color = canButtons[0]?.dataset.sprayColor ?? '#9C4037';
  let nozzle = NOZZLES.skinny;
  let nozzleKey = 'skinny';
  let stampCarry = 0;
  let sprayTimer = 0;
  let pointerX = 0;
  let pointerY = 0;
  let lastX = 0;
  let lastY = 0;
  let drips: Drip[] = [];
  let dripFrame = 0;
  let buildup = new Map<number, number>();
  let undoSnapshot: HTMLCanvasElement | null = null;
  let restored = false;

  const bounds = () => stage.getBoundingClientRect();

  const resize = () => {
    const box = bounds();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    // Preserve existing paint across resizes (drawImage copy — no readback).
    let keep: HTMLCanvasElement | null = null;
    if (canvas.width > 0 && canvas.height > 0) {
      keep = document.createElement('canvas');
      keep.width = canvas.width;
      keep.height = canvas.height;
      keep.getContext('2d')!.drawImage(canvas, 0, 0);
    }
    canvas.width = Math.round(box.width * dpr);
    canvas.height = Math.round(box.height * dpr);
    if (keep) ctx.drawImage(keep, 0, 0, canvas.width, canvas.height);
  };

  const persist = () => {
    try {
      // Downscaled webp keeps us well under localStorage quotas.
      const off = document.createElement('canvas');
      off.width = Math.round(canvas.width / 2);
      off.height = Math.round(canvas.height / 2);
      off.getContext('2d')!.drawImage(canvas, 0, 0, off.width, off.height);
      localStorage.setItem(STORAGE_KEY, off.toDataURL('image/webp', 0.6));
    } catch {
      /* quota or serialization issues — the wall just won't persist */
    }
  };

  const restore = () => {
    if (restored) return;
    restored = true;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      img.src = saved;
    } catch {
      /* ignore */
    }
  };

  // Pre-rendered soft radial stamps (hard center to ~55% of radius, feathered
  // to the edge) — the Photoshop-style "dab" that gives a bold core in one
  // pass. Rebuilding a gradient per stamp is slow; drawImage of a cached
  // offscreen canvas is not. Keyed by color/nozzle/dpr (tiny: 4×3 entries).
  const stampCache = new Map<string, HTMLCanvasElement>();
  const stampFor = (): HTMLCanvasElement => {
    const id = `${color}|${nozzleKey}|${dpr}`;
    let stamp = stampCache.get(id);
    if (stamp) return stamp;
    const side = Math.max(4, Math.ceil(nozzle.radius * 2 * dpr));
    stamp = document.createElement('canvas');
    stamp.width = side;
    stamp.height = side;
    const sctx = stamp.getContext('2d')!;
    const gradient = sctx.createRadialGradient(side / 2, side / 2, 0, side / 2, side / 2, side / 2);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.55, color);
    gradient.addColorStop(1, `${color}00`);
    sctx.fillStyle = gradient;
    sctx.fillRect(0, 0, side, side);
    stampCache.set(id, stamp);
    return stamp;
  };

  const stampAt = (x: number, y: number, alphaScale: number) => {
    const r = nozzle.radius;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Core dab, with slight position/alpha jitter so overlaps don't band.
    const jx = x + (Math.random() - 0.5) * r * 0.2;
    const jy = y + (Math.random() - 0.5) * r * 0.2;
    ctx.globalAlpha = clamp(nozzle.flow * alphaScale * (0.85 + Math.random() * 0.3), 0.02, 1);
    ctx.drawImage(stampFor(), jx - r, jy - r, r * 2, r * 2);
    // Grain lives in the outer fringe only, plus the odd overspray fleck.
    ctx.fillStyle = color;
    for (let i = 0; i < nozzle.fringe; i += 1) {
      const overspray = Math.random() < 0.12;
      const angle = Math.random() * Math.PI * 2;
      const dist = r * (overspray ? 1.4 + Math.random() : 0.75 + Math.random() * 0.65);
      const size = nozzle.size[0] + Math.random() * (nozzle.size[1] - nozzle.size[0]);
      ctx.globalAlpha = (overspray ? 0.04 : nozzle.fringeAlpha) * alphaScale;
      ctx.beginPath();
      ctx.arc(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Paint accumulation → drips. Lingering (stationary stamps) builds fastest.
    const key = Math.round(x / CELL) * 10000 + Math.round(y / CELL);
    const level = (buildup.get(key) ?? 0) + nozzle.buildup * alphaScale;
    if (level > DRIP_THRESHOLD) {
      buildup.set(key, 0);
      const startY = y + nozzle.radius * 0.4;
      drips.push({
        x: x + (Math.random() - 0.5) * 8,
        y: startY,
        startY,
        maxRun: 60 + Math.random() * 90,
        width: 4 + Math.random() * 2,
        color,
      });
      if (!dripFrame) dripFrame = requestAnimationFrame(stepDrips);
    } else {
      buildup.set(key, level);
    }
  };

  const sprayTickAt = (x: number, y: number) => {
    const travel = Math.hypot(x - lastX, y - lastY);
    const spacing = Math.max(2, nozzle.radius * nozzle.spacing);
    if (travel < 1) {
      // Holding still: keep depositing at reduced flow so the spot saturates
      // and eventually feeds a drip, without instantly blowing out.
      stampAt(x, y, 0.5);
    } else {
      // Stamps land at fixed spacing along the travel path (with carry-over
      // between ticks) so speed never leaves speckled gaps; fast passes thin
      // out slightly, like holding the can further away.
      const speedFade = clamp(1 / (1 + travel * 0.006), 0.55, 1);
      const ux = (x - lastX) / travel;
      const uy = (y - lastY) / travel;
      let d = spacing - stampCarry;
      let placed = 0;
      while (d <= travel && placed < 48) {
        stampAt(lastX + ux * d, lastY + uy * d, speedFade);
        d += spacing;
        placed += 1;
      }
      stampCarry = (stampCarry + travel) % spacing;
    }
    lastX = x;
    lastY = y;
  };

  const stepDrips = () => {
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const drip of drips) {
      // Slows and tapers as it runs, like paint losing volume.
      const progress = (drip.y - drip.startY) / drip.maxRun;
      const step = (1.8 - progress * 1.2) * (0.7 + Math.random() * 0.6);
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = drip.color;
      ctx.beginPath();
      ctx.arc(drip.x, drip.y, drip.width / 2, 0, Math.PI * 2);
      ctx.fill();
      drip.y += Math.max(0.4, step);
      drip.x += (Math.random() - 0.5) * 0.7;
      drip.width *= 0.975;
    }
    ctx.restore();
    const box = bounds();
    drips = drips.filter((d) => d.width > 0.8 && d.y < box.height && d.y - d.startY < d.maxRun);
    dripFrame = drips.length > 0 ? requestAnimationFrame(stepDrips) : 0;
  };

  const moveCursor = (clientX: number, clientY: number) => {
    const box = bounds();
    pointerX = clientX - box.left;
    pointerY = clientY - box.top;
    cursorCan.style.transform = `translate(${pointerX}px, ${pointerY}px) rotate(${spraying ? -18 : -8}deg)`;
  };

  const startSpray = () => {
    if (spraying) return;
    spraying = true;
    lastX = pointerX;
    lastY = pointerY;
    stampCarry = 0;
    audio.hiss(true);
    cursorCan.classList.add('is-spraying');
    toolbar.classList.add('is-stroking');
    undoSnapshot = document.createElement('canvas');
    undoSnapshot.width = canvas.width;
    undoSnapshot.height = canvas.height;
    undoSnapshot.getContext('2d')!.drawImage(canvas, 0, 0);
    sprayTimer = window.setInterval(() => sprayTickAt(pointerX, pointerY), SPRAY_TICK_MS);
    sprayTickAt(pointerX, pointerY);
  };

  const stopSpray = () => {
    if (!spraying) return;
    spraying = false;
    audio.hiss(false);
    cursorCan.classList.remove('is-spraying');
    toolbar.classList.remove('is-stroking');
    window.clearInterval(sprayTimer);
    buildup = new Map();
    persist();
  };

  const arm = () => {
    armed = true;
    audio.resume();
    if (!audio.muted) audio.rattle();
    resize();
    restore();
    root.classList.add('is-armed');
    stage.classList.add('is-spray-armed');
    if (!reducedMotion.matches) armButton.classList.add('is-shaking');
  };

  const disarm = () => {
    armed = false;
    stopSpray();
    root.classList.remove('is-armed');
    stage.classList.remove('is-spray-armed');
    armButton.classList.remove('is-shaking');
    armButton.focus();
  };

  armButton.addEventListener('click', () => (armed ? disarm() : arm()));

  document.addEventListener('keydown', (event) => {
    if (armed && event.key === 'Escape') disarm();
  });

  // Painting input — pointer events with capture so strokes survive fast drags.
  canvas.addEventListener('pointerdown', (event) => {
    if (!armed) return;
    event.preventDefault();
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      /* capture is a nicety; keep spraying without it */
    }
    moveCursor(event.clientX, event.clientY);
    startSpray();
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!armed) return;
    moveCursor(event.clientX, event.clientY);
  });
  canvas.addEventListener('pointerup', stopSpray);
  canvas.addEventListener('pointercancel', stopSpray);

  // Toolbar --------------------------------------------------------------
  canButtons.forEach((button) => {
    button.addEventListener('click', () => {
      color = button.dataset.sprayColor ?? color;
      canButtons.forEach((b) => b.classList.toggle('is-selected', b === button));
      cursorImg.src = button.querySelector('img')?.src ?? cursorImg.src;
      audio.rattle();
      if (navigator.vibrate) navigator.vibrate([15, 25, 15]);
    });
  });

  nozzleButtons.forEach((button) => {
    button.addEventListener('click', () => {
      nozzleKey = button.dataset.sprayNozzle ?? 'skinny';
      nozzle = NOZZLES[nozzleKey] ?? NOZZLES.skinny;
      nozzleButtons.forEach((b) => b.classList.toggle('is-selected', b === button));
    });
  });

  root.querySelector('[data-spray-undo]')?.addEventListener('click', () => {
    if (undoSnapshot) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(undoSnapshot, 0, 0);
      ctx.restore();
      undoSnapshot = null;
      persist();
    }
  });

  root.querySelector('[data-spray-save]')?.addEventListener('click', () => {
    // Composite the mural + user paint so the download is the whole wall.
    const art = stage.querySelector<HTMLImageElement>('.footer-art img:not([hidden])');
    const out = document.createElement('canvas');
    out.width = canvas.width;
    out.height = canvas.height;
    const octx = out.getContext('2d')!;
    if (art?.complete) octx.drawImage(art, 0, 0, out.width, out.height);
    octx.drawImage(canvas, 0, 0);
    out.toBlob((blob) => {
      if (!blob) return;
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'my-piece-on-blums-wall.png';
      link.click();
      URL.revokeObjectURL(link.href);
    }, 'image/png');
  });

  const muteButton = root.querySelector<HTMLButtonElement>('[data-spray-mute]');
  const syncMute = () => {
    muteButton?.classList.toggle('is-on', !audio.muted);
    muteButton?.setAttribute('aria-pressed', String(!audio.muted));
  };
  muteButton?.addEventListener('click', () => {
    audio.muted = !audio.muted;
    if (!audio.muted) {
      audio.resume();
      audio.rattle();
    }
    syncMute();
  });
  syncMute();

  root.querySelector('[data-spray-close]')?.addEventListener('click', disarm);

  window.addEventListener('resize', () => {
    if (armed) resize();
  });
}
