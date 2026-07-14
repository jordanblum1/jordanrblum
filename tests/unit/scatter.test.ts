import { scatter } from '../../src/scripts/scatter';

test('deterministic for same seed', () => {
  expect(scatter(6, 42)).toEqual(scatter(6, 42));
});
test('different seeds differ', () => {
  expect(scatter(6, 1)).not.toEqual(scatter(6, 2));
});
test('placements stay in bounds and rotation band', () => {
  for (const p of scatter(8, 7)) {
    expect(p.xPct).toBeGreaterThanOrEqual(4); expect(p.xPct).toBeLessThanOrEqual(96);
    expect(p.yPct).toBeGreaterThanOrEqual(6); expect(p.yPct).toBeLessThanOrEqual(94);
    expect(Math.abs(p.rot)).toBeLessThanOrEqual(8);
    expect(Math.abs(p.rot)).toBeGreaterThanOrEqual(2); // never perfectly straight
  }
});
test('no two prints closer than 12% (x-axis crowding guard)', () => {
  const ps = scatter(6, 42);
  for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
    const d = Math.hypot(ps[i].xPct - ps[j].xPct, ps[i].yPct - ps[j].yPct);
    expect(d).toBeGreaterThanOrEqual(12);
  }
});
