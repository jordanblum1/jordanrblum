// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Scene, Vector3 } from 'three';
import { concepts, assetUrl } from '../../src/data/simready';
import type { LoadOptions, ViewerOptions } from '@huggingface/usd-web-viewer';

const createViewer = vi.hoisted(() => vi.fn());
vi.mock('@huggingface/usd-web-viewer', () => ({ createViewer }));
import { createStage } from '../../src/scripts/simready-stage';

const cleanups: (() => void)[] = [];
let reduced = false;
beforeEach(() => {
  reduced = false;
  vi.stubGlobal('matchMedia', () => Object.assign(new EventTarget(), {matches:reduced}));
});
afterEach(() => { cleanups.splice(0).forEach(fn => fn()); vi.useRealTimers(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });

function setup(index = 0) {
  document.body.innerHTML = `<section><div data-stage><div data-viewer></div><span data-medium></span><span data-route-label></span><span data-time-label></span></div><p data-status></p><progress data-progress></progress><details data-warnings><span data-warning-count></span><ul data-warning-list></ul></details><select data-route><option value="a">A</option><option value="b">B</option></select><button data-motion></button><input data-explode type="range" value="0"/><output></output><select data-light><option value="morning">Morning</option><option value="late">Late</option></select><button data-reset></button></section>`;
  const panel = document.querySelector('section')!;
  const root = new Group();
  for (const y of [-1, 1]) {
    const part = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial());
    part.matrix.makeTranslation(0, y, 0);
    part.matrix.elements[4] = .2;
    part.matrixAutoUpdate = false;
    root.add(part);
  }
  const result = {root, info:{meshes:2, warnings:[] as {code:string; message:string}[]}, complete:Promise.resolve({textures:0, failed:0}), dispose:vi.fn()};
  let loadOptions: LoadOptions | undefined;
  let viewerOptions: ViewerOptions | undefined;
  const canvas = document.createElement('canvas');
  const viewer = {
    renderer:{setPixelRatio:vi.fn(), domElement:canvas, toneMappingExposure:1},
    controls:{enableDamping:true}, scene:new Scene(), requestRender:vi.fn(), frame:vi.fn(),
    load:vi.fn(async (_url: string, options: LoadOptions) => { loadOptions = options; return result; }),
    dispose:vi.fn(() => { result.dispose(); canvas.remove(); }),
  };
  createViewer.mockImplementation((host: HTMLElement, options: ViewerOptions) => { host.append(canvas); viewerOptions = options; return viewer; });
  const abort = new AbortController();
  const start = () => { cleanups.push(createStage(panel, concepts[index], abort.signal)); };
  return {panel, root, result, viewer, abort, start, loadOptions:() => loadOptions!, viewerOptions:() => viewerOptions!};
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };

test('loads only its pinned asset with conservative limits and displays progress and warnings', async () => {
  const study = setup();
  study.result.info.warnings.push({code:'material-fallback', message:'Unsupported material shown grey.'});
  let finish!: (value: {textures:number; failed:number}) => void;
  study.result.complete = new Promise(done => { finish = done; });
  study.start();
  expect(study.panel.querySelector('[data-status]')!.textContent).toContain('Loading');
  await flush();
  expect(study.viewer.load).toHaveBeenCalledOnce();
  expect(study.viewer.load.mock.calls[0][0]).toBe(assetUrl(concepts[0].asset));
  expect(study.loadOptions()).toMatchObject({textures:'preview', maxTextureSize:1024, maxTriangles:1_000_000, maxInstances:10_000});
  study.loadOptions().onProgress!({stage:'geometry', loaded:1, total:2, fraction:.65});
  expect(study.panel.querySelector('[data-status]')!.textContent).toContain('65%');
  expect(study.panel.querySelector('[data-stage]')!.getAttribute('data-loaded')).toBe('true');
  finish({textures:0, failed:0});
  await flush();
  expect(study.panel.querySelector('[data-status]')!.textContent).toBe('Asset loaded with preview warnings.');
  expect(study.panel.querySelector('[data-warning-list]')!.textContent).toContain('Unsupported material');
  study.abort.abort();
  expect(study.loadOptions().signal!.aborted).toBe(true);
  expect(study.viewer.dispose).toHaveBeenCalledOnce();
});

test('format or cross-origin errors keep the illustration, hide progress and dispose the viewer', async () => {
  const study = setup();
  study.viewer.load.mockRejectedValue(Object.assign(new Error('unsupported'), {code:'compose'}));
  study.start();
  await flush();
  expect(study.panel.querySelector('[data-status]')!.textContent).toContain('failed (compose');
  expect(study.panel.querySelector('[data-stage]')!.getAttribute('data-loaded')).toBe('false');
  expect(study.panel.querySelector<HTMLProgressElement>('[data-progress]')!.hidden).toBe(true);
  expect(study.viewer.dispose).toHaveBeenCalledOnce();
  expect(study.panel.querySelectorAll('canvas')).toHaveLength(0);
});

test('timeout aborts the active download and preserves a usable fallback', async () => {
  vi.useFakeTimers();
  const study = setup();
  study.viewer.load.mockImplementation((_url, options) => {
    const pending = new Promise<never>(() => {});
    // The caller must abort downloads even when a transport never settles.
    expect(options.signal).toBeInstanceOf(AbortSignal);
    return pending;
  });
  study.start();
  vi.advanceTimersByTime(45_000);
  await flush();
  expect(study.panel.querySelector('[data-status]')!.textContent).toContain('timed out after 45 seconds');
  expect(study.viewer.dispose).toHaveBeenCalledOnce();
});

test('the chair slider separates actual mesh parts and returns them to authored positions', async () => {
  const study = setup(1);
  study.start();
  await flush();
  const initial = study.root.children.map(part => part.getWorldPosition(new Vector3()));
  const slider = study.panel.querySelector<HTMLInputElement>('[data-explode]')!;
  slider.value = '100'; slider.dispatchEvent(new Event('input'));
  expect(study.root.children[0].getWorldPosition(new Vector3()).y).toBeLessThan(initial[0].y);
  expect(study.root.children[1].getWorldPosition(new Vector3()).y).toBeGreaterThan(initial[1].y);
  slider.value = '0'; slider.dispatchEvent(new Event('input'));
  expect(study.root.children.map(part => part.getWorldPosition(new Vector3()))).toEqual(initial);
  expect(study.root.children.every(part => part.matrix.elements[4] === .2)).toBe(true);
});

test('reduced motion disables stage movement while route and light controls still work', async () => {
  reduced = true;
  const study = setup(2);
  study.start();
  await flush();
  expect(study.viewer.controls.enableDamping).toBe(false);
  expect(study.panel.querySelector('[data-stage]')!.getAttribute('data-moving')).toBe('false');
  const light = study.panel.querySelector<HTMLSelectElement>('select[data-light]')!;
  light.value = 'late'; light.dispatchEvent(new Event('change'));
  expect(study.viewer.renderer.toneMappingExposure).toBe(.85);
  expect(study.panel.querySelector('[data-stage]')!.getAttribute('data-light')).toBe('late');
});

test('a lost WebGL context returns to the explicit illustration state', async () => {
  const study = setup(); study.start(); await flush();
  study.viewerOptions().onContextLost!();
  expect(study.panel.querySelector('[data-status]')!.textContent).toContain('Graphics context lost');
  expect(study.viewer.dispose).toHaveBeenCalledOnce();
});
