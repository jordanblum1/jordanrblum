import { animate } from 'motion';

const workbenches = document.querySelectorAll<HTMLElement>('[data-workbench]');
const dragEnabled = matchMedia('(min-width: 761px) and (prefers-reduced-motion: no-preference)');

type Point = { x: number; y: number };

for (const workbench of workbenches) {
  const artifacts = workbench.querySelectorAll<HTMLElement>('[data-draggable]');
  const offsets = new WeakMap<HTMLElement, Point>();
  let topLayer = 20;

  const settleForStaticLayout = () => {
    if (dragEnabled.matches) return;

    for (const artifact of artifacts) {
      offsets.set(artifact, { x: 0, y: 0 });
      artifact.style.removeProperty('translate');
      artifact.style.removeProperty('z-index');
      delete artifact.dataset.dragging;
    }
  };

  for (const artifact of artifacts) {
    offsets.set(artifact, { x: 0, y: 0 });
    let pointerId: number | null = null;
    let origin: Point = { x: 0, y: 0 };
    let current: Point = { x: 0, y: 0 };
    let baseBounds = { left: 0, top: 0, width: 0, height: 0 };

    const finishDrag = (event: PointerEvent) => {
      if (pointerId !== event.pointerId) return;

      if (artifact.hasPointerCapture(pointerId)) {
        artifact.releasePointerCapture(pointerId);
      }

      pointerId = null;
      delete artifact.dataset.dragging;
      offsets.set(artifact, current);

      animate(
        artifact,
        { translate: [`${current.x}px ${current.y}px`, `${current.x * 0.99}px ${current.y * 0.99}px`] },
        { type: 'spring', stiffness: 340, damping: 26 },
      );

      current = { x: current.x * 0.99, y: current.y * 0.99 };
      offsets.set(artifact, current);
    };

    artifact.addEventListener('pointerdown', (event) => {
      const target = event.target as HTMLElement;

      if (
        !dragEnabled.matches ||
        event.button !== 0 ||
        target.closest('summary, a, button, input, textarea, select')
      ) return;

      event.preventDefault();
      pointerId = event.pointerId;
      const previous = offsets.get(artifact) ?? { x: 0, y: 0 };
      const artifactRect = artifact.getBoundingClientRect();
      origin = { x: event.clientX - previous.x, y: event.clientY - previous.y };
      current = previous;
      baseBounds = {
        left: artifactRect.left - previous.x,
        top: artifactRect.top - previous.y,
        width: artifactRect.width,
        height: artifactRect.height,
      };
      artifact.dataset.dragging = 'true';
      artifact.style.zIndex = String(++topLayer);
      artifact.setPointerCapture(pointerId);
    });

    artifact.addEventListener('pointermove', (event) => {
      if (pointerId !== event.pointerId || !artifact.hasPointerCapture(event.pointerId)) return;

      const proposed = {
        x: event.clientX - origin.x,
        y: event.clientY - origin.y,
      };
      const benchRect = workbench.getBoundingClientRect();
      const padding = 10;

      current = {
        x: Math.min(
          benchRect.right - baseBounds.left - baseBounds.width - padding,
          Math.max(benchRect.left - baseBounds.left + padding, proposed.x),
        ),
        y: Math.min(
          benchRect.bottom - baseBounds.top - baseBounds.height - padding,
          Math.max(benchRect.top - baseBounds.top + padding, proposed.y),
        ),
      };

      artifact.style.translate = `${current.x}px ${current.y}px`;
    });

    artifact.addEventListener('pointerup', finishDrag);
    artifact.addEventListener('pointercancel', finishDrag);
  }

  dragEnabled.addEventListener('change', settleForStaticLayout);
  settleForStaticLayout();
}
