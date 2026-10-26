// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { BoxGeometry, CanvasTexture, CylinderGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PerspectiveCamera, Scene, ShaderLib, SRGBColorSpace, Vector3 } from 'three';
import { concepts, assetUrl } from '../../src/data/simready';
import type { LoadOptions, ViewerOptions } from '@huggingface/usd-web-viewer';

const createViewer = vi.hoisted(() => vi.fn());
vi.mock('@huggingface/usd-web-viewer', () => ({ createViewer }));
import { createStage } from '../../src/scripts/simready-stage';

const cleanups: (() => void)[] = [];
let reduced = false;
beforeEach(() => {
  reduced = false;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(vi.fn().mockReturnValue({
    scale:vi.fn(), translate:vi.fn(), rotate:vi.fn(), save:vi.fn(), restore:vi.fn(), fill:vi.fn(), fillRect:vi.fn(), fillText:vi.fn(),
  }));
  vi.stubGlobal('Path2D', class { constructor(public path: string) {} });
  vi.stubGlobal('matchMedia', vi.fn(() => Object.assign(new EventTarget(), {matches:reduced})));
});
afterEach(() => { cleanups.splice(0).forEach(fn => fn()); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });

function setup(index = 0, partCount = 2) {
  document.body.innerHTML = `<section><div data-stage><svg role="img"></svg><div data-viewer></div></div><p data-status></p><progress data-progress></progress></section>`;
  const panel = document.querySelector('section')!;
  const root = new Group();
  const positions = partCount === 1 ? [0] : [-1, 1];
  for (const y of positions) {
    const part = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial());
    part.matrix.makeTranslation(0, y, 0);
    part.matrix.elements[4] = .2;
    part.matrixAutoUpdate = false;
    root.add(part);
  }
  const result = {root, info:{meshes:partCount, warnings:[] as {code:string; message:string}[]}, complete:Promise.resolve({textures:0, failed:0}), dispose:vi.fn()};
  let loadOptions: LoadOptions | undefined;
  let viewerOptions: ViewerOptions | undefined;
  const canvas = document.createElement('canvas');
  const viewer = {
    renderer:{setPixelRatio:vi.fn(), domElement:canvas, toneMappingExposure:1},
    camera:new PerspectiveCamera(40, 200 / 340, .01, 1000), controls:{enabled:true, enableDamping:true, target:new Vector3(), update:vi.fn(), saveState:vi.fn(), reset:vi.fn(), stopListenToKeyEvents:vi.fn(), rotateLeft:vi.fn(), rotateUp:vi.fn()}, scene:new Scene(), requestRender:vi.fn(), frame:vi.fn(),
    load:vi.fn(async (_url: string, options: LoadOptions) => { loadOptions = options; return result; }),
    dispose:vi.fn(() => { result.dispose(); canvas.remove(); }),
  };
  viewer.scene.add(root);
  createViewer.mockImplementation((host: HTMLElement, options: ViewerOptions) => { host.append(canvas); viewerOptions = options; return viewer; });
  const abort = new AbortController();
  const start = () => { cleanups.push(createStage(panel, concepts[index], abort.signal)); };
  return {panel, root, result, viewer, abort, start, loadOptions:() => loadOptions!, viewerOptions:() => viewerOptions!};
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); };

test('loads its pinned spray can with safety limits and quiet partial-preview status', async () => {
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
  expect(study.panel.querySelector('[data-status]')!.textContent).toContain('simplified');
  study.abort.abort();
  expect(study.loadOptions().signal!.aborted).toBe(true);
  expect(study.viewer.dispose).toHaveBeenCalledOnce();
});

test('format or cross-origin errors keep the illustration, hide progress and dispose the viewer', async () => {
  const study = setup();
  study.viewer.load.mockRejectedValue(Object.assign(new Error('unsupported'), {code:'compose'}));
  study.start();
  await flush();
  expect(study.panel.querySelector('[data-status]')!.textContent).toContain('3D preview unavailable.');
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

test('reduced motion disables damping and preference changes update the live viewer', async () => {
  reduced = true;
  const study = setup(2);
  study.start();
  await flush();
  expect(study.viewer.controls.enableDamping).toBe(false);
  const media = vi.mocked(matchMedia).mock?.results?.[0]?.value;
  if (media) {
    media.matches = false;
    media.dispatchEvent(new Event('change'));
    expect(study.viewer.controls.enableDamping).toBe(true);
  }
});

test('switching while a load is pending aborts transport and disposes late geometry', async () => {
  const study = setup();
  let finish!: (result: typeof study.result) => void;
  let pendingSignal: AbortSignal | undefined;
  study.viewer.load.mockImplementation((_url, options) => { pendingSignal = options.signal; return new Promise(done => { finish = done; }); });
  study.start();
  study.abort.abort();
  expect(pendingSignal!.aborted).toBe(true);
  expect(study.viewer.dispose).toHaveBeenCalledOnce();
  finish(study.result);
  await flush();
  expect(study.result.dispose).toHaveBeenCalled();
  expect(study.panel.querySelectorAll('canvas')).toHaveLength(0);
  expect(study.panel.querySelector('[data-stage]')!.getAttribute('data-loaded')).toBe('false');
});

test('empty geometry keeps the authored can and disposes the renderer', async () => {
  const study = setup();
  study.result.info.meshes = 0;
  study.start();
  await flush();
  expect(study.panel.querySelector('[data-status]')!.textContent).toContain('No drawable geometry');
  expect(study.viewer.dispose).toHaveBeenCalledOnce();
});

test('a lost WebGL context returns to the explicit illustration state', async () => {
  const study = setup(); study.start(); await flush();
  study.viewerOptions().onContextLost!();
  expect(study.panel.querySelector('[data-status]')!.textContent).toContain('Graphics context lost');
  expect(study.viewer.dispose).toHaveBeenCalledOnce();
});

test('interaction is disabled until drawable geometry arrives, then exposes controls and reset', async () => {
  const study = setup();
  let finish!: (result: typeof study.result) => void;
  study.viewer.load.mockImplementation(() => new Promise(done => { finish = done; }));
  study.start();
  const canvas = study.panel.querySelector('canvas')!;
  expect(study.viewer.controls.enabled).toBe(false);
  expect(canvas.tabIndex).toBe(-1);
  finish(study.result);
  await flush();
  expect(study.viewer.controls).toMatchObject({enabled:true, enablePan:false, enableRotate:true, enableZoom:true, autoRotate:false});
  expect(canvas.tabIndex).toBe(0);
  expect(canvas.getAttribute('aria-label')).toContain('BLUM');
  expect(canvas.getAttribute('aria-label')).toContain('Arrow keys');
  expect(study.panel.querySelector('[data-status]')!.textContent).toContain('drag to rotate · scroll to zoom');
  expect(study.viewer.controls.saveState).toHaveBeenCalledOnce();
  canvas.dispatchEvent(new MouseEvent('dblclick'));
  expect(study.viewer.controls.reset).toHaveBeenCalledOnce();
  canvas.dispatchEvent(new KeyboardEvent('keydown', {key:'ArrowLeft', cancelable:true}));
  expect(study.viewer.controls.rotateLeft).toHaveBeenCalled();
  const distanceBeforeZoom = study.viewer.camera.position.distanceTo(study.viewer.controls.target);
  canvas.dispatchEvent(new KeyboardEvent('keydown', {key:'+', cancelable:true}));
  expect(study.viewer.camera.position.distanceTo(study.viewer.controls.target)).toBeLessThan(distanceBeforeZoom);
  canvas.dispatchEvent(new KeyboardEvent('keydown', {key:'Home', cancelable:true}));
  expect(study.viewer.controls.reset).toHaveBeenCalledTimes(2);
  study.abort.abort();
  expect(study.viewer.controls.enabled).toBe(false);
  canvas.dispatchEvent(new MouseEvent('dblclick'));
  expect(study.viewer.controls.reset).toHaveBeenCalledTimes(2);
});

test('can artwork uses only charcoal, site red and cream, drawing the exact four BLUM paths', async () => {
  const study = setup();
  const stage = study.panel.querySelector<HTMLElement>('[data-stage]')!;
  stage.style.setProperty('--can-black', '#151515');
  stage.style.setProperty('--paper-raised', '#FCFAF6');
  stage.style.setProperty('--accent', '#9C4037');
  const colors: string[] = [];
  const context = {scale:vi.fn(), translate:vi.fn(), rotate:vi.fn(), save:vi.fn(), restore:vi.fn(), fill:vi.fn(), fillText:vi.fn(), fillRect:vi.fn(), set fillStyle(value: string) { colors.push(value); }};
  vi.mocked(HTMLCanvasElement.prototype.getContext).mockImplementation(vi.fn().mockReturnValue(context));
  study.start();
  await flush();
  expect(new Set(colors)).toEqual(new Set(['#151515', '#FCFAF6', '#9C4037']));
  const paths = [...readFileSync('src/assets/identity/blum-mark.svg', 'utf8').matchAll(/ d="([^"]+)"/g)].map(match => match[1]);
  expect(context.fill.mock.calls.map(([path]) => path.path)).toEqual(paths);
  expect(context.fillText.mock.calls.flat()).not.toContain('MTN');
  expect(context.fillText.mock.calls.flat()).not.toContain('94');
});

test('a projected CanvasTexture material follows curved geometry without CPU vertex arrays', async () => {
  const study = setup(0, 1);
  const body = study.root.children[0];
  if (!(body instanceof Mesh)) throw new Error('missing body fixture');
  body.geometry = new CylinderGeometry(.5, .5, 3, 48);
  body.geometry.computeBoundingBox();
  body.geometry.computeBoundingSphere();
  // The USD viewer releases these arrays once a streamed mesh reaches the GPU.
  const positions = body.geometry.getAttribute('position');
  positions.onUpload(() => { Reflect.set(positions, 'array', null); });
  positions.onUploadCallback();
  const original = body.material;
  study.start();
  await flush();
  expect(body.material).not.toBe(original);
  expect(body.material).toBeInstanceOf(MeshStandardMaterial);
  if (!(body.material instanceof MeshStandardMaterial)) throw new Error('expected lit can material');
  expect(body.material.map).toBeInstanceOf(CanvasTexture);
  expect(body.material.map!.colorSpace).toBe(SRGBColorSpace);
  expect(body.material).toMatchObject({depthTest:true, depthWrite:true});
  const shader = {uniforms:{...ShaderLib.standard.uniforms}, vertexShader:ShaderLib.standard.vertexShader, fragmentShader:ShaderLib.standard.fragmentShader};
  Reflect.apply(body.material.onBeforeCompile, body.material, [shader]);
  expect(shader.vertexShader).toContain('canProjection * canVertex');
  expect(shader.fragmentShader).toContain('atan(');
  expect(shader.fragmentShader).toContain('canPoint.z');
  expect(shader.vertexShader).toContain('instanceMatrix * canVertex');
  const projection = shader.uniforms.canProjection.value.clone();
  body.matrix.makeRotationY(.4).setPosition(1, .2, 0);
  study.root.updateMatrixWorld(true);
  expect(shader.uniforms.canProjection.value.equals(projection)).toBe(true);
  expect(study.viewer.scene.getObjectById(body.id)).toBe(body);
  expect(study.viewer.camera.position.x).toBe(0);
  expect(study.viewer.camera.position.z).toBeGreaterThan(0);
});

test.each(['switch', 'context', 'textures', 'timeout'])('%s releases the can material and shared texture once', async reason => {
  vi.useFakeTimers();
  const study = setup();
  const body = study.root.children[0];
  if (!(body instanceof Mesh)) throw new Error('missing body fixture');
  const original = body.material;
  let rejectTextures!: (error: Error) => void;
  study.result.complete = new Promise((_resolve, reject) => { rejectTextures = reject; });
  study.start();
  await flush();
  if (!(body.material instanceof MeshStandardMaterial)) throw new Error('missing can treatment');
  const canvas = study.panel.querySelector('canvas')!;
  const disposeMaterial = vi.spyOn(body.material, 'dispose');
  const disposeTexture = vi.spyOn(body.material.map!, 'dispose');
  if (reason === 'switch') study.abort.abort();
  if (reason === 'context') study.viewerOptions().onContextLost!();
  if (reason === 'textures') { rejectTextures(new Error('texture failure')); await flush(); }
  if (reason === 'timeout') vi.advanceTimersByTime(45_000);
  canvas.dispatchEvent(new MouseEvent('dblclick'));
  expect(study.viewer.controls.reset).not.toHaveBeenCalled();
  expect(disposeMaterial).toHaveBeenCalledOnce();
  expect(disposeTexture).toHaveBeenCalledOnce();
  expect(body.material).toBe(original);
  expect(study.panel.querySelector('[data-stage]')!.getAttribute('data-loaded')).toBe('false');
  expect(study.panel.querySelector('svg')!.getAttribute('aria-hidden')).toBe('false');
  study.abort.abort();
  expect(disposeMaterial).toHaveBeenCalledOnce();
  expect(disposeTexture).toHaveBeenCalledOnce();
});

test('unavailable canvas artwork preserves the illustration before the handoff', async () => {
  vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(null);
  const study = setup();
  study.result.complete = Promise.reject(new Error('late texture failure'));
  study.start();
  await flush();
  expect(study.panel.querySelector('[data-status]')!.textContent).toContain('3D preview unavailable');
  expect(study.panel.querySelector('[data-stage]')!.getAttribute('data-loaded')).toBe('false');
  expect(study.viewer.dispose).toHaveBeenCalledOnce();
});
