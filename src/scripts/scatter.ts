export interface Placement { xPct: number; yPct: number; rot: number; z: number }

function lcg(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 0xffffffff);
}

/** Deterministic scattered-print layout: golden-angle base ring + seeded jitter. */
export function scatter(count: number, seed: number): Placement[] {
  const rnd = lcg(seed);
  const out: Placement[] = [];
  for (let i = 0; i < count; i++) {
    for (let attempt = 0; attempt < 40; attempt++) {
      const angle = i * 2.399963 + rnd() * 0.6;
      const radius = 18 + 26 * Math.sqrt((i + rnd()) / count);
      const xPct = Math.min(96, Math.max(4, 50 + Math.cos(angle) * radius * 1.6));
      const yPct = Math.min(94, Math.max(6, 50 + Math.sin(angle) * radius));
      const ok = out.every(p => Math.hypot(p.xPct - xPct, p.yPct - yPct) >= 12);
      if (ok || attempt === 39) {
        const mag = 2 + rnd() * 6;
        out.push({ xPct, yPct, rot: rnd() > 0.5 ? mag : -mag, z: i + 1 });
        break;
      }
    }
  }
  return out;
}
