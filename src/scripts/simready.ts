import { concepts } from '../data/simready';
import type { createStage } from './simready-stage';

type StageModule = { createStage: typeof createStage };

export function mountLab(root: HTMLElement, loadStage: () => Promise<StageModule> = () => import('./simready-stage')): () => void {
  const tabs = [...root.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  const lifetime = new AbortController();
  let active = '';
  let scene: AbortController | undefined;
  let dispose: (() => void) | undefined;

  function activate(id: string, persist = false) {
    const concept = concepts.find(concept => concept.id === id) ?? concepts[0];
    if (active === concept.id) return;
    scene?.abort();
    dispose?.();
    dispose = undefined;
    const current = scene = new AbortController();
    active = concept.id;
    const panel = root.querySelector<HTMLElement>(`#${concept.id}`)!;
    for (const tab of tabs) {
      const selected = tab.getAttribute('aria-controls') === active;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      root.querySelector<HTMLElement>(`#${tab.getAttribute('aria-controls')}`)!.hidden = !selected;
    }
    if (persist) history.pushState(null, '', `#${active}`);
    void loadStage().then(({ createStage }) => {
      if (!current.signal.aborted) dispose = createStage(panel, concept, current.signal);
    }).catch(() => {
      if (current.signal.aborted) return;
      panel.querySelector('[data-status]')!.textContent = 'Preview module unavailable. Showing the authored illustration.';
      panel.querySelector<HTMLProgressElement>('[data-progress]')!.hidden = true;
    });
  }

  for (const [index, tab] of tabs.entries()) {
    tab.addEventListener('click', () => activate(tab.getAttribute('aria-controls')!, true), {signal:lifetime.signal});
    tab.addEventListener('keydown', event => {
      const positions: Partial<Record<string, number>> = { ArrowLeft:(index + tabs.length - 1) % tabs.length, ArrowRight:(index + 1) % tabs.length, Home:0, End:tabs.length - 1 };
      const next = positions[event.key];
      if (next !== undefined) {
        event.preventDefault();
        tabs.forEach((tab, i) => { tab.tabIndex = i === next ? 0 : -1; });
        tabs[next].focus();
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        activate(tab.getAttribute('aria-controls')!, true);
      }
    }, {signal:lifetime.signal});
  }
  const fromHash = () => activate(location.hash.slice(1));
  window.addEventListener('hashchange', fromHash, {signal:lifetime.signal});
  window.addEventListener('popstate', fromHash, {signal:lifetime.signal});
  activate(location.hash.slice(1));
  const cleanup = () => { lifetime.abort(); scene?.abort(); dispose?.(); };
  window.addEventListener('pagehide', cleanup, {once:true, signal:lifetime.signal});
  return cleanup;
}
