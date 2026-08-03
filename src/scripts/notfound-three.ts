import { shouldRunThree, whenNearViewportIdle } from './three/support';

const stage = document.querySelector<HTMLElement>('[data-fof-stage]');
if (stage && shouldRunThree()) {
  whenNearViewportIdle(stage, () => {
    import('./three/notfound-scene')
      .then(({ initNotFoundToy }) => initNotFoundToy(stage))
      .catch(() => {});
  });
}
