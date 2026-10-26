import { createViewer, type Viewer, type LoadResult } from '@huggingface/usd-web-viewer';
import { Box3, Color, DirectionalLight, Matrix4, Mesh, Vector3 } from 'three';
import { assetUrl, type concepts } from '../data/simready';

type Concept = typeof concepts[number];

export function createStage(panel: HTMLElement, concept: Concept, signal: AbortSignal): () => void {
  const stage = panel.querySelector<HTMLElement>('[data-stage]')!;
  const host = panel.querySelector<HTMLElement>('[data-viewer]')!;
  const status = panel.querySelector<HTMLElement>('[data-status]')!;
  const progress = panel.querySelector<HTMLProgressElement>('[data-progress]')!;
  const medium = panel.querySelector<HTMLElement>('[data-medium]')!;
  const warnings = panel.querySelector<HTMLDetailsElement>('[data-warnings]')!;
  const routeControl = panel.querySelector<HTMLSelectElement>('select[data-route]');
  const pullControl = panel.querySelector<HTMLInputElement>('[data-explode]');
  const lightControl = panel.querySelector<HTMLSelectElement>('select[data-light]');
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const load = new AbortController();
  const events = new AbortController();
  let viewer: Viewer | undefined;
  let model: LoadResult | undefined;
  let frame = 0;
  let paused = media.matches;
  let route = 'a';
  let yaw = 0;
  let disposed = false;
  let parts: { mesh: Mesh; origin: Matrix4; offset: Vector3 }[] = [];
  let clones: Mesh[] = [];
  const lamp = new DirectionalLight(0xffffff, 2);
  const motionButton = panel.querySelector<HTMLButtonElement>('[data-motion]');
  let timer: ReturnType<typeof setTimeout>;

  stage.dataset.loaded = 'false';
  stage.querySelector('svg')?.setAttribute('aria-hidden', 'false');
  stage.tabIndex = concept.id === 'counter-study' ? 0 : -1;
  stage.setAttribute('role', 'group');
  stage.setAttribute('aria-label', concept.id === 'counter-study' ? 'Counter Study composition. Drag or use left and right arrows to adjust.' : `${concept.title} object study`);
  status.textContent = 'Loading OpenUSD preview…';
  medium.textContent = 'Authored illustration · awaiting OpenUSD';
  progress.hidden = false;
  progress.removeAttribute('value');
  warnings.hidden = true;
  host.replaceChildren();

  function stopMotion() { cancelAnimationFrame(frame); frame = 0; }
  function removeClones() {
    for (const clone of clones) clone.removeFromParent();
    clones = [];
  }
  function motion() {
    stopMotion();
    const moving = concept.id === 'dispatch' && !paused && !media.matches && !document.hidden;
    stage.dataset.moving = String(moving);
    if (motionButton) {
      motionButton.textContent = paused || media.matches ? 'Resume movement' : 'Pause movement';
      motionButton.setAttribute('aria-pressed', String(paused || media.matches));
      motionButton.disabled = media.matches;
      motionButton.title = media.matches ? 'Movement disabled by reduced motion preference' : '';
    }
    if (!moving || !model || !viewer) return;
    const tick = (time: number) => {
      if (disposed) return;
      model!.root.rotation.y = yaw + (route === 'b' ? .3 : 0) + Math.sin(time * .00035) * .045;
      viewer!.requestRender();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
  }
  function showWarnings() {
    const list = panel.querySelector('[data-warning-list]')!;
    list.replaceChildren();
    for (const warning of model?.info.warnings ?? []) {
      const item = document.createElement('li');
      item.textContent = `${warning.code}: ${warning.message}`;
      list.append(item);
    }
    warnings.hidden = !list.childElementCount;
    panel.querySelector('[data-warning-count]')!.textContent = `(${list.childElementCount})`;
  }
  function fallback(message: string) {
    clearTimeout(timer);
    stopMotion();
    stage.dataset.loaded = 'false';
    stage.querySelector('svg')?.setAttribute('aria-hidden', 'false');
    stage.tabIndex = concept.id === 'counter-study' ? 0 : -1;
    medium.textContent = 'Authored illustration · OpenUSD unavailable';
    status.textContent = `${message} Showing the authored illustration.`;
    progress.hidden = true;
    showWarnings();
    load.abort();
    removeClones();
    viewer?.dispose();
    viewer = undefined;
    model = undefined;
    parts = [];
    motion();
  }
  function applyRoute() {
    route = routeControl?.value === 'b' ? 'b' : 'a';
    stage.dataset.route = route;
    const label = stage.querySelector('[data-route-label]');
    if (label) label.textContent = `ROUTE ${route.toUpperCase()} →`;
    if (model) model.root.rotation.y = yaw + (route === 'b' ? .3 : 0);
    viewer?.requestRender();
  }
  function positionParts(amount: number) {
    for (const part of parts) {
      part.mesh.matrix.copy(part.origin);
      part.mesh.matrix.elements[12] += part.offset.x * amount;
      part.mesh.matrix.elements[13] += part.offset.y * amount;
      part.mesh.matrix.elements[14] += part.offset.z * amount;
      part.mesh.matrixWorldNeedsUpdate = true;
    }
  }
  function applyPull() {
    const pull = Number(pullControl?.value ?? 0) / 100;
    stage.style.setProperty('--pull', String(pull));
    positionParts(pull);
    panel.querySelector('output')!.textContent = `${Math.round(pull * 100)}%`;
    viewer?.requestRender();
  }
  function applyLight() {
    const light = lightControl?.value ?? 'morning';
    stage.dataset.light = light;
    const presets = { morning:{color:0xffe3bd, position:[-3,4,4], exposure:1.05}, window:{color:0xe2ebff, position:[4,2,-1], exposure:1.2}, late:{color:0xe8a071, position:[-4,1,2], exposure:.85} };
    const preset = light === 'window' ? presets.window : light === 'late' ? presets.late : presets.morning;
    lamp.color = new Color(preset.color);
    lamp.position.set(preset.position[0], preset.position[1], preset.position[2]);
    if (viewer) viewer.renderer.toneMappingExposure = preset.exposure;
    const label = stage.querySelector('[data-time-label]');
    if (label) label.textContent = light === 'morning' ? '08:00' : light === 'window' ? '12:00' : '17:00';
    viewer?.requestRender();
  }
  routeControl?.addEventListener('change', applyRoute, {signal:events.signal});
  motionButton?.addEventListener('click', () => { paused = !paused; motion(); }, {signal:events.signal});
  pullControl?.addEventListener('input', applyPull, {signal:events.signal});
  lightControl?.addEventListener('change', applyLight, {signal:events.signal});
  let dragStart: number | undefined;
  let cupX = 0;
  const compose = () => { stage.style.setProperty('--cup-x', `${cupX}px`); stage.style.setProperty('--cup-turn', `${cupX * .08}deg`); };
  if (concept.id === 'counter-study') {
    stage.addEventListener('pointerdown', event => { if (stage.dataset.loaded === 'true') return; dragStart = event.clientX - cupX; stage.setPointerCapture(event.pointerId); }, {signal:events.signal});
    stage.addEventListener('pointermove', event => { if (dragStart === undefined) return; cupX = Math.max(-65, Math.min(65, event.clientX - dragStart)); compose(); }, {signal:events.signal});
    const endDrag = () => { dragStart = undefined; };
    stage.addEventListener('pointerup', endDrag, {signal:events.signal});
    stage.addEventListener('pointercancel', endDrag, {signal:events.signal});
    stage.addEventListener('keydown', event => { if (stage.dataset.loaded === 'true' || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return; event.preventDefault(); cupX = Math.max(-65, Math.min(65, cupX + (event.key === 'ArrowLeft' ? -10 : 10))); compose(); }, {signal:events.signal});
    panel.querySelector('[data-reset]')?.addEventListener('click', () => { cupX = 0; compose(); viewer?.frame(); }, {signal:events.signal});
  }
  media.addEventListener('change', () => { if (viewer) viewer.controls.enableDamping = !media.matches; motion(); }, {signal:events.signal});
  document.addEventListener('visibilitychange', motion, {signal:events.signal});
  // Restore each scene's visible controls when revisiting it, without retaining GPU resources.
  applyRoute();
  if (concept.id === 'working-set') applyPull();
  if (concept.id === 'counter-study') { applyLight(); compose(); }
  motion();

  async function start() {
    try {
      viewer = createViewer(host, {onContextLost:() => fallback('Graphics context lost.')});
      viewer.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      viewer.controls.enableDamping = !media.matches;
      viewer.scene.add(lamp);
      const canvas = viewer.renderer.domElement;
      canvas.setAttribute('aria-label', `${concept.title} OpenUSD preview. Drag to orbit, arrows to pan, plus or minus to zoom.`);
      const result = await viewer.load(assetUrl(concept.asset), {
        textures: 'preview', maxTextureSize: 1024, maxTriangles: 1_000_000, maxInstances: 10_000,
        maxConcurrentFetches: 4, maxLayerBytes: 128 * 1024 * 1024, maxTextureBytes: 64 * 1024 * 1024, maxLayers: 128,
        signal:load.signal,
        onProgress: update => {
          if (signal.aborted || load.signal.aborted) return;
          progress.value = update.fraction;
          status.textContent = `Loading ${update.stage} · ${Math.round(update.fraction * 100)}%`;
          if (model) showWarnings();
          viewer?.requestRender();
        },
      });
      if (signal.aborted || load.signal.aborted) { result.dispose(); return; }
      model = result;
      showWarnings();
      const bounds = new Box3().setFromObject(model.root);
      if (!model.info.meshes || bounds.isEmpty()) {
        void model.complete.catch(() => {});
        fallback('No drawable geometry was returned.');
        return;
      }
      yaw = model.root.rotation.y;
      if (concept.id === 'working-set') {
        const center = bounds.getCenter(new Vector3());
        const size = bounds.getSize(new Vector3());
        model.root.updateMatrixWorld(true);
        const meshes: Mesh[] = [];
        model.root.traverse(object => { if (object instanceof Mesh && object.parent) meshes.push(object); });
        if (meshes.length === 1) {
          // The published chair is one composed mesh. Build three lightweight,
          // shared-geometry impressions so the editorial slider still reveals
          // input / attention / revision instead of lifting the intact chair.
          const original = meshes[0];
          const parent = original.parent!;
          const middle = original.clone();
          const right = original.clone();
          parent.add(middle, right);
          clones = [middle, right];
          const spread = Math.max(size.x, size.y, size.z) * .72;
          for (const [mesh, offset] of [[original, -spread], [middle, 0], [right, spread]] as const) {
            mesh.matrixAutoUpdate = false;
            parts.push({mesh, origin:mesh.matrix.clone(), offset:new Vector3(offset, 0, 0)});
          }
        } else for (const object of meshes) {
          const partCenter = new Box3().setFromObject(object).getCenter(new Vector3());
          const direction = partCenter.clone().sub(center);
          if (direction.lengthSq() < .000001) direction.set(0, 1, 0);
          direction.normalize().multiplyScalar(size.length() * .2);
          const originWorld = object.getWorldPosition(new Vector3());
          const offset = object.parent.worldToLocal(originWorld.clone().add(direction)).sub(object.parent.worldToLocal(originWorld));
          // USD keeps authored matrices (including shear); offset their translation without decomposing them.
          object.matrixAutoUpdate = false;
          parts.push({mesh:object, origin:object.matrix.clone(), offset});
        }
        applyPull();
        // The expanded envelope contains the collapsed composition, so one frame
        // operation keeps both slider endpoints visible.
        positionParts(1);
        model.root.updateMatrixWorld(true);
        viewer.frame();
        applyPull();
        model.root.updateMatrixWorld(true);
      }
      if (concept.id === 'dispatch') applyRoute();
      if (concept.id === 'counter-study') applyLight();
      stage.dataset.loaded = 'true';
      stage.querySelector('svg')?.setAttribute('aria-hidden', 'true');
      stage.tabIndex = -1;
      medium.textContent = 'NVIDIA SimReady · OpenUSD preview';
      motion();
      await model.complete;
      if (signal.aborted || load.signal.aborted) return;
      clearTimeout(timer);
      showWarnings();
      status.textContent = model.info.warnings.length ? 'Asset loaded with preview warnings.' : 'OpenUSD asset loaded. Preview ready.';
      progress.hidden = true;
      viewer?.requestRender();
    } catch (error) {
      if (signal.aborted || load.signal.aborted) return;
      clearTimeout(timer);
      const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : 'viewer';
      fallback(`OpenUSD preview failed (${code}; network, cross-origin, or format support).`);
    }
  }
  timer = setTimeout(() => { if (!signal.aborted) fallback('OpenUSD preview timed out after 45 seconds.'); }, 45_000);
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    clearTimeout(timer);
    stopMotion();
    stage.dataset.moving = 'false';
    events.abort();
    load.abort();
    removeClones();
    viewer?.dispose();
    viewer = undefined;
    model = undefined;
    parts = [];
    stage.dataset.loaded = 'false';
    host.replaceChildren();
    signal.removeEventListener('abort', dispose);
  };
  signal.addEventListener('abort', dispose, {once:true});
  void start();
  return dispose;
}
