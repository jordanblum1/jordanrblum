import { createViewer, type Viewer } from '@huggingface/usd-web-viewer';
import { Box3, Vector3 } from 'three';
import { assetUrl, type concepts } from '../data/simready';
import { applyCanTreatment } from './simready-can';

type Concept = typeof concepts[number];

export function createStage(panel: HTMLElement, concept: Concept, signal: AbortSignal): () => void {
  const stage = panel.querySelector<HTMLElement>('[data-stage]')!;
  const host = panel.querySelector<HTMLElement>('[data-viewer]')!;
  const status = panel.querySelector<HTMLElement>('[data-status]')!;
  const progress = panel.querySelector<HTMLProgressElement>('[data-progress]')!;
  const illustration = stage.querySelector('svg');
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const load = new AbortController();
  const events = new AbortController();
  let viewer: Viewer | undefined;
  let releaseTreatment: (() => void) | undefined;
  let disposed = false;
  let timer: ReturnType<typeof setTimeout>;

  stage.dataset.loaded = 'false';
  illustration?.setAttribute('aria-hidden', 'false');
  status.textContent = 'Loading spray can…';
  progress.hidden = false;
  progress.removeAttribute('value');
  host.replaceChildren();

  function releaseViewer() {
    releaseTreatment?.();
    releaseTreatment = undefined;
    const current = viewer;
    viewer = undefined;
    current?.dispose();
    host.replaceChildren();
    stage.dataset.loaded = 'false';
    illustration?.setAttribute('aria-hidden', 'false');
  }

  function fallback(message: string) {
    if (disposed || load.signal.aborted) return;
    clearTimeout(timer);
    load.abort();
    releaseViewer();
    status.textContent = `${message} Showing the authored illustration.`;
    progress.hidden = true;
  }

  media.addEventListener('change', () => {
    if (viewer) viewer.controls.enableDamping = !media.matches;
  }, {signal:events.signal});

  async function start() {
    try {
      viewer = createViewer(host, {onContextLost:() => fallback('Graphics context lost.')});
      viewer.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      viewer.controls.enableDamping = !media.matches;
      viewer.controls.enabled = false;
      const canvas = viewer.renderer.domElement;
      canvas.tabIndex = -1;
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', 'MTN-inspired spray can 3D preview');
      const result = await viewer.load(assetUrl(concept.asset), {
        textures: 'preview', maxTextureSize: 1024, maxTriangles: 1_000_000, maxInstances: 10_000,
        maxConcurrentFetches: 4, maxLayerBytes: 128 * 1024 * 1024, maxTextureBytes: 64 * 1024 * 1024, maxLayers: 128,
        signal:load.signal,
        onProgress: update => {
          if (signal.aborted || load.signal.aborted) return;
          progress.value = update.fraction;
          status.textContent = `Loading spray can · ${Math.round(update.fraction * 100)}%`;
        },
      });
      if (signal.aborted || load.signal.aborted) { result.dispose(); return; }
      // Observe texture failure even when the geometry cannot be shown.
      const complete = result.complete.catch(() => { fallback('Spray can textures unavailable.'); });
      const bounds = new Box3().setFromObject(result.root);
      if (!result.info.meshes || bounds.isEmpty()) {
        fallback('No drawable geometry was returned.');
        return;
      }
      releaseTreatment = applyCanTreatment(result.root, bounds, getComputedStyle(stage));
      // Keep the authored frontal composition across all three placements.
      const center = bounds.getCenter(new Vector3());
      const size = bounds.getSize(new Vector3());
      const camera = viewer.camera;
      const distance = Math.max(size.y, size.x / camera.aspect) / (2 * Math.tan(camera.fov * Math.PI / 360)) * 1.2 + size.z / 2;
      camera.position.set(center.x, center.y, center.z + distance);
      camera.lookAt(center);
      camera.updateMatrixWorld();
      viewer.controls.target.copy(center);
      viewer.controls.update();
      viewer.requestRender();
      stage.dataset.loaded = 'true';
      illustration?.setAttribute('aria-hidden', 'true');
      const textures = await complete;
      if (!textures || signal.aborted || load.signal.aborted) return;
      clearTimeout(timer);
      status.textContent = result.info.warnings.length || textures.failed
        ? 'Spray can ready · some materials are simplified.'
        : 'Spray can ready.';
      progress.hidden = true;
      viewer?.requestRender();
    } catch {
      if (signal.aborted || load.signal.aborted) return;
      fallback('3D preview unavailable.');
    }
  }

  timer = setTimeout(() => fallback('3D preview timed out after 45 seconds.'), 45_000);
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    clearTimeout(timer);
    events.abort();
    load.abort();
    releaseViewer();
    signal.removeEventListener('abort', dispose);
  };
  if (signal.aborted) { dispose(); return dispose; }
  signal.addEventListener('abort', dispose, {once:true});
  void start();
  return dispose;
}
