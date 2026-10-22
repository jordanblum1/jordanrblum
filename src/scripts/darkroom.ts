// The "develop" easter egg: the page's own words come out as a darkroom print,
// hung on a line under the safelight until the lights come back on. Browsers
// with HTML-in-Canvas develop the real DOM through a WebGL shader; the rest get
// the same print with a CSS develop. Either way it stays real, selectable text.
// ?inline keeps the styles inside this lazy chunk instead of every page's CSS.
import css from '../styles/darkroom.css?inline';

const DEVELOP_MS = 2000;
let shut: (() => void) | null = null;

export function toggleDarkroom(): void {
  if (shut) return shut();
  const opener = document.activeElement as HTMLElement | null;
  const room = document.createElement('div');
  room.className = 'darkroom';
  room.innerHTML = `<figure class="darkroom-print" role="dialog" aria-label="Darkroom print" tabindex="-1">
    <span class="darkroom-pin" aria-hidden="true"></span>
    <div class="darkroom-image"><h2></h2><p></p></div>
    <figcaption>Developed just now · Esc to put it away</figcaption>
  </figure>`;
  const print = room.querySelector<HTMLElement>('.darkroom-print')!;
  const image = room.querySelector<HTMLElement>('.darkroom-image')!;
  image.querySelector('h2')!.textContent = document.querySelector('main h1')?.textContent?.trim() ?? document.title;
  image.querySelector('p')!.textContent = document.querySelector('main p')?.textContent?.trim() ?? '';
  if (!document.getElementById('darkroom-css')) {
    document.head.append(Object.assign(document.createElement('style'), { id: 'darkroom-css', textContent: css }));
  }
  document.body.append(room);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stopPlate = !reduced && htmlInCanvas() ? developOnCanvas(image) : undefined;
  print.focus({ preventScroll: true });

  const onKey = (e: KeyboardEvent) => e.key === 'Escape' && shut?.();
  let downOutside = false;
  room.onpointerdown = (e) => { downOutside = e.target === room; };
  room.onclick = (e) => { if (downOutside && e.target === room) shut?.(); };
  addEventListener('keydown', onKey);

  shut = () => {
    shut = null;
    removeEventListener('keydown', onKey);
    stopPlate?.();
    room.classList.add('is-leaving');
    setTimeout(() => room.remove(), 220);
    opener?.focus({ preventScroll: true });
  };
}

type PaintCanvas = HTMLCanvasElement & {
  onpaint: (() => void) | null;
  requestPaint(): void;
  captureElementImage(el: Element): { width: number; height: number };
};
type ElementGL = WebGL2RenderingContext & {
  texElementImage2D(...args: unknown[]): void;
  texElementSubImage2D?(target: number, level: number, x: number, y: number, el: Element): void;
};

function htmlInCanvas(): boolean {
  const gl = window.WebGL2RenderingContext?.prototype;
  return 'onpaint' in HTMLCanvasElement.prototype && !!gl && ('texElementImage2D' in gl || 'texElementSubImage2D' in gl);
}

const VERTEX = `#version 300 es
out vec2 uv;
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  uv = vec2(p.x, 1.0 - p.y);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAGMENT = `#version 300 es
precision highp float;
uniform sampler2D tex;
uniform float progress, time;
in vec2 uv;
out vec4 color;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f *= f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
void main() {
  float wet = 1.0 - progress;
  // The developer is still sloshing: a slow ripple that settles as the print develops.
  vec2 slosh = wet * wet * 0.006 * vec2(sin(uv.y * 20.0 + time * 2.4), sin(uv.x * 14.0 + time * 1.9));
  vec3 ink = texture(tex, uv + slosh).rgb;
  float density = 1.0 - dot(ink, vec3(0.299, 0.587, 0.114));
  // Uneven agitation develops some patches first, and shadows arrive before midtones.
  float developed = clamp(progress * 1.5 - noise(uv * vec2(5.0, 3.0)) * 0.5, 0.0, 1.0);
  float amount = clamp(developed * (1.0 + density * 2.0), 0.0, 1.0);
  color = vec4(1.0 - (1.0 - ink) * amount, 1.0);
}`;

/** Moves `image` into a drawable canvas and develops it there. Returns cleanup. */
function developOnCanvas(image: HTMLElement): (() => void) | undefined {
  const canvas = document.createElement('canvas') as PaintCanvas;
  const gl = canvas.getContext('webgl2') as ElementGL | null;
  if (!gl) return;
  canvas.className = 'darkroom-plate';
  canvas.setAttribute('layoutsubtree', ''); // Chrome < 155
  canvas.setAttribute('content', 'drawable'); // Chrome 155+
  image.replaceWith(canvas);
  canvas.append(image);

  const program = gl.createProgram()!;
  for (const [type, source] of [[gl.VERTEX_SHADER, VERTEX], [gl.FRAGMENT_SHADER, FRAGMENT]] as const) {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    gl.attachShader(program, shader);
  }
  gl.linkProgram(program);
  gl.useProgram(program);
  const progress = gl.getUniformLocation(program, 'progress');
  const time = gl.getUniformLocation(program, 'time');

  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  let allocated = '';
  const upload = () => {
    if (gl.texElementSubImage2D) {
      // Chrome 155+: storage is allocated up front, then the element fills it.
      const { width, height } = canvas.captureElementImage(image);
      const size = `${Math.ceil(width)}x${Math.ceil(height)}`;
      if (size !== allocated) {
        allocated = size;
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, Math.ceil(width), Math.ceil(height), 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      }
      gl.texElementSubImage2D(gl.TEXTURE_2D, 0, 0, 0, image);
    } else if (gl.texElementImage2D.length === 3) {
      gl.texElementImage2D(gl.TEXTURE_2D, gl.RGBA8, image); // Chrome 150-154
    } else {
      gl.texElementImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image); // Chrome < 150
    }
  };

  // The quad covers the canvas and the element fills it, so the DOM's own
  // layout already lines up with the pixels for selection and hit-testing.
  let start = 0;
  let raf = 0;
  const draw = () => {
    const elapsed = performance.now() - start;
    gl.uniform1f(progress, Math.min(elapsed / DEVELOP_MS, 1));
    gl.uniform1f(time, elapsed / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    return elapsed < DEVELOP_MS;
  };
  const frame = () => { raf = draw() ? requestAnimationFrame(frame) : 0; };
  canvas.onpaint = () => {
    upload();
    if (!start) {
      start = performance.now();
      frame();
    } else if (!raf) draw();
  };

  const resize = new ResizeObserver(() => {
    canvas.style.height = `${image.offsetHeight}px`;
    canvas.width = Math.round(canvas.clientWidth * devicePixelRatio);
    canvas.height = Math.round(image.offsetHeight * devicePixelRatio);
    gl.viewport(0, 0, canvas.width, canvas.height);
    canvas.requestPaint();
  });
  resize.observe(image);

  return () => {
    cancelAnimationFrame(raf);
    resize.disconnect();
    canvas.onpaint = null;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  };
}
