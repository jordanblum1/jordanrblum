// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupLandingMotion } from '../../src/scripts/stamp-shift-motion';

let intersect: (entries: Partial<IntersectionObserverEntry>[]) => void;
let reduced: MediaQueryList;
let cleanup: (() => void) | undefined;
const play = vi.fn<() => Promise<void>>();
const pause = vi.fn();

beforeEach(() => {
  document.body.innerHTML = '<video data-landing-motion data-src="/gameplay.mp4" poster="/poster.webp"></video>';
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
afterEach(() => { cleanup?.(); cleanup = undefined; vi.restoreAllMocks(); vi.unstubAllGlobals(); Reflect.deleteProperty(document, 'hidden'); Reflect.deleteProperty(navigator, 'connection'); play.mockClear(); pause.mockClear(); });

function enter() {
  const video = document.querySelector('video')!;
  intersect([{ target: video, isIntersecting: true }]);
  return video;
}

describe('optional landing motion', () => {
  it('loops muted video only while visible and pauses it with the page lifecycle', () => {
    cleanup = setupLandingMotion(document);
    const video = document.querySelector('video')!;
    expect(video.getAttribute('src')).toBeNull();
    expect(play).not.toHaveBeenCalled();
    enter();
    expect(video.getAttribute('src')).toBe('/gameplay.mp4');
    expect(video.muted).toBe(true);
    expect(video.loop).toBe(true);
    expect(play).toHaveBeenCalledOnce();
    expect(video.getAttribute('poster')).toBe('/poster.webp');
    Object.defineProperty(document, 'hidden', { configurable:true, value:true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(pause).toHaveBeenCalled();
    Object.defineProperty(document, 'hidden', { configurable:true, value:false });
    document.dispatchEvent(new Event('visibilitychange'));
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
  });
  it('does not load video for Save-Data', () => {
    Object.defineProperty(navigator, 'connection', { configurable: true, value: Object.assign(new EventTarget(), { saveData: true }) });
    cleanup = setupLandingMotion(document);
    expect(enter().getAttribute('src')).toBeNull();
    expect(play).not.toHaveBeenCalled();
  });
  it('keeps the poster and does not retry-loop when autoplay is refused', async () => {
    play.mockRejectedValueOnce(new Error('Autoplay blocked'));
    cleanup = setupLandingMotion(document);
    const video = enter();
    await Promise.resolve();
    expect(pause).toHaveBeenCalled();
    expect(video.getAttribute('poster')).toBe('/poster.webp');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(play).toHaveBeenCalledOnce();
  });
  it('resumes after a pending play rejects while the video is offscreen', async () => {
    let rejectPlay!: (reason?: unknown) => void;
    play.mockImplementationOnce(() => new Promise<void>((_, reject) => { rejectPlay = reject; }));
    cleanup = setupLandingMotion(document);
    const video = enter();
    intersect([{ target:video, isIntersecting:false }]);
    rejectPlay(new Error('Playback interrupted'));
    await Promise.resolve();
    intersect([{ target:video, isIntersecting:true }]);
    expect(play).toHaveBeenCalledTimes(2);
  });
  it('ignores a delayed AbortError after a hidden video becomes visible again', async () => {
    let rejectPlay!: (reason?: unknown) => void;
    play.mockImplementationOnce(() => new Promise<void>((_, reject) => { rejectPlay = reject; }));
    cleanup = setupLandingMotion(document);
    enter();
    Object.defineProperty(document, 'hidden', { configurable:true, value:true });
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'hidden', { configurable:true, value:false });
    document.dispatchEvent(new Event('visibilitychange'));
    rejectPlay(new DOMException('Playback interrupted', 'AbortError'));
    await Promise.resolve();
    document.dispatchEvent(new Event('visibilitychange'));
    expect(play).toHaveBeenCalledTimes(3);
  });
  it('isolates a failed video while the remaining motion keeps playing', () => {
    document.body.insertAdjacentHTML('beforeend', '<video data-landing-motion data-src="/collection.mp4" poster="/collection.webp"></video>');
    cleanup = setupLandingMotion(document);
    const videos = [...document.querySelectorAll('video')];
    intersect(videos.map(target => ({ target, isIntersecting:true })));
    expect(play).toHaveBeenCalledTimes(2);
    videos[0].dispatchEvent(new Event('error'));
    document.dispatchEvent(new Event('visibilitychange'));
    expect(play).toHaveBeenCalledTimes(3);
    expect(videos[0].getAttribute('poster')).toBe('/poster.webp');
  });
});
