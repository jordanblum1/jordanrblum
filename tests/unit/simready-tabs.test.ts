// @vitest-environment happy-dom
import { afterEach, expect, test, vi } from 'vitest';
import { concepts } from '../../src/data/simready';
import { mountLab } from '../../src/scripts/simready';
import type { createStage as StageFactory } from '../../src/scripts/simready-stage';

const cleanups: (() => void)[] = [];
afterEach(() => { cleanups.splice(0).forEach(fn => fn()); document.body.innerHTML = ''; history.replaceState(null, '', '/'); });
function fixture() {
  document.body.innerHTML = `<main><div role="tablist">${concepts.map((c, i) => `<button role="tab" id="tab-${c.id}" aria-controls="${c.id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${c.title}</button>`).join('')}</div>${concepts.map(c => `<section role="tabpanel" id="${c.id}" hidden><p data-status></p><progress data-progress></progress></section>`).join('')}</main>`;
  return document.querySelector('main')!;
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

test('arrow/Home/End only move focus; Enter/Space activate and persist the selected tab', async () => {
  const root = fixture();
  const dispose = vi.fn();
  const createStage = vi.fn<typeof StageFactory>(() => dispose);
  cleanups.push(mountLab(root, async () => ({ createStage })));
  await flush();
  const tabs = [...root.querySelectorAll<HTMLButtonElement>('[role=tab]')];
  tabs[0].focus();
  tabs[0].dispatchEvent(new KeyboardEvent('keydown', {key:'ArrowLeft', bubbles:true}));
  expect(document.activeElement).toBe(tabs[2]);
  expect(createStage).toHaveBeenCalledTimes(1);
  tabs[2].dispatchEvent(new KeyboardEvent('keydown', {key:'Home', bubbles:true}));
  expect(document.activeElement).toBe(tabs[0]);
  tabs[0].dispatchEvent(new KeyboardEvent('keydown', {key:'ArrowRight', bubbles:true}));
  tabs[1].dispatchEvent(new KeyboardEvent('keydown', {key:'Enter', bubbles:true}));
  await flush();
  expect(location.hash).toBe('#hero-accent');
  expect(tabs[1].getAttribute('aria-selected')).toBe('true');
  expect(root.querySelector<HTMLElement>('#hero-accent')!.hidden).toBe(false);
  expect(dispose).toHaveBeenCalledOnce();
  tabs[1].dispatchEvent(new KeyboardEvent('keydown', {key:'End', bubbles:true}));
  expect(document.activeElement).toBe(tabs[2]);
  tabs[2].dispatchEvent(new KeyboardEvent('keydown', {key:' ', bubbles:true}));
  await flush();
  expect(location.hash).toBe('#about-signature');
  expect(root.querySelectorAll('[aria-selected=true]')).toHaveLength(1);
  expect(root.querySelectorAll('[role=tab][tabindex="0"]')).toHaveLength(1);
});

test('deep links load one asset; hash navigation disposes and aborts the previous preview', async () => {
  history.replaceState(null, '', '/labs/simready#about-signature');
  const root = fixture();
  const dispose = vi.fn();
  const createStage = vi.fn<typeof StageFactory>(() => dispose);
  cleanups.push(mountLab(root, async () => ({ createStage })));
  await flush();
  expect(createStage.mock.calls[0][1].id).toBe('about-signature');
  const firstSignal = createStage.mock.calls[0][2];
  history.pushState(null, '', '#workbench');
  window.dispatchEvent(new HashChangeEvent('hashchange'));
  await flush();
  expect(firstSignal.aborted).toBe(true);
  expect(dispose).toHaveBeenCalledOnce();
  expect(createStage).toHaveBeenCalledTimes(2);
  expect(createStage.mock.calls[1][1].id).toBe('workbench');
});

test('rapid switching cannot start a stale scene after a delayed module import', async () => {
  const root = fixture();
  const createStage = vi.fn<typeof StageFactory>(() => vi.fn());
  let resolve!: (module: {createStage: typeof createStage}) => void;
  const pending = new Promise<{createStage: typeof createStage}>(done => { resolve = done; });
  cleanups.push(mountLab(root, () => pending));
  root.querySelector<HTMLButtonElement>('#tab-hero-accent')!.click();
  root.querySelector<HTMLButtonElement>('#tab-about-signature')!.click();
  resolve({createStage});
  await flush();
  expect(createStage).toHaveBeenCalledOnce();
  expect(createStage.mock.calls[0][1].id).toBe('about-signature');
});

test('module failure leaves a visible explicit fallback state', async () => {
  const root = fixture();
  cleanups.push(mountLab(root, async () => { throw new Error('chunk failed'); }));
  await flush();
  expect(root.querySelector('#workbench [data-status]')!.textContent).toContain('illustration');
  expect(root.querySelector<HTMLProgressElement>('#workbench progress')!.hidden).toBe(true);
});
