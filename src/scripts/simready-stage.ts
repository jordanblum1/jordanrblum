import { createViewer, type Viewer } from '@huggingface/usd-web-viewer';
import { Box3 } from 'three';
import { assetUrl, type concepts } from '../data/simready';

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
  let disposed = false;
  let timer: ReturnType<typeof setTimeout>;

  stage.dataset.loaded = 'false';
  illustration?.setAttribute('aria-hidden', 'false');
  status.textContent = 'Loading spray can…';
  progress.hidden = false;
  progress.removeAttribute('value');
  host.replaceChildren();

  function releaseViewer() {
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
      const canvas = viewer.renderer.domElement;
      canvas.setAttribute('aria-label', 'Spray can 3D preview. Drag to orbit, arrows to pan, plus or minus to zoom.');
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
      const complete = result.complete.catch(error => { fallback('Spray can textures unavailable.'); throw error; });
      if (!result.info.meshes || new Box3().setFromObject(result.root).isEmpty()) {
        void complete.catch(() => {});
        fallback('No drawable geometry was returned.');
        return;
      }
      stage.dataset.loaded = 'true';
      illustration?.setAttribute('aria-hidden', 'true');
      const textures = await complete;
      if (signal.aborted || load.signal.aborted) return;
      clearTimeout(timer);
      status.textContent = result.info.warnings.length || textures.failed
        ? 'Spray can ready · some materials are simplified. Drag to orbit.'
        : 'Spray can ready. Drag to orbit.';
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
