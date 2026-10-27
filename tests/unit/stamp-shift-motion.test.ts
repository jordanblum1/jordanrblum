// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupLandingMotion } from '../../src/scripts/stamp-shift-motion';

let intersect: (entries: Partial<IntersectionObserverEntry>[]) => void;
let reduced: MediaQueryList;
let cleanup: (() => void) | undefined;
const play = vi.fn<() => Promise<void>>();
const pause = vi.fn();

beforeEach(() => {
  document.body.innerHTML = '<button data-motion-toggle hidden aria-pressed="false"><span data-motion-label>Pause motion</span></button><video data-landing-motion data-src="/gameplay.mp4" poster="/poster.webp"></video>';
  reduced = Object.assign(new EventTarget(), { matches: false }) as MediaQueryList;
  vi.stubGlobal('matchMedia', () => reduced);
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback: typeof intersect) { intersect = callback; }
    observe() {}
    disconnect() {}
  });
  play.mockResolvedValue();
  vi.spyOn(HTMLVideoElement.prototype, 'play').mockImplementation(play);
  vi.spyOn(HTMLVideoElement.prototype, 'pause').mockImplementation(pause);
});
afterEach(() => { cleanup?.(); cleanup = undefined; vi.restoreAllMocks(); vi.unstubAllGlobals(); Reflect.deleteProperty(navigator, 'connection'); play.mockClear(); pause.mockClear(); });

function enter() {
  const video = document.querySelector('video')!;
  intersect([{ target: video, isIntersecting: true }]);
  return video;
}

describe('optional landing motion', () => {
  it('loads only visible motion, lets the player pause and keeps the poster available', () => {
    cleanup = setupLandingMotion(document);
    const video = document.querySelector('video')!;
    expect(video.getAttribute('src')).toBeNull();
    expect(play).not.toHaveBeenCalled();
    enter();
    expect(video.getAttribute('src')).toBe('/gameplay.mp4');
    expect(play).toHaveBeenCalledOnce();
    const button = document.querySelector('button')!;
    button.click();
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.textContent).toBe('Play motion');
    expect(pause).toHaveBeenCalled();
    expect(video.getAttribute('poster')).toBe('/poster.webp');
    button.click();
    expect(play).toHaveBeenCalledTimes(2);
    intersect([{ target: video, isIntersecting: false }]);
    expect(pause).toHaveBeenCalled();
  });
  it('does not load video for reduced motion', () => {
    Object.defineProperty(reduced, 'matches', { value: true });
    cleanup = setupLandingMotion(document);
    const video = enter();
    expect(video.getAttribute('src')).toBeNull();
    expect(play).not.toHaveBeenCalled();
    expect(document.querySelector('button')!.hidden).toBe(true);
  });
  it('does not load video for Save-Data', () => {
    Object.defineProperty(navigator, 'connection', { configurable: true, value: Object.assign(new EventTarget(), { saveData: true }) });
    cleanup = setupLandingMotion(document);
    expect(enter().getAttribute('src')).toBeNull();
    expect(play).not.toHaveBeenCalled();
  });
  it('offers an explicit play action when autoplay is refused', async () => {
    play.mockRejectedValueOnce(new Error('Autoplay blocked'));
    cleanup = setupLandingMotion(document);
    enter();
    await Promise.resolve();
    expect(document.querySelector('button')!.textContent).toBe('Play motion');
    expect(document.querySelector('button')!.hidden).toBe(false);
  });
});
