/**
 * Squishy portrait: the hero portrait rendered on a displaced plane so it
 * reacts to the cursor like jelly. Renditions (?squish=): jelly | cloth | bulge.
 * The original <img> stays in the DOM (hidden) for a11y and as the fallback.
 */
import * as THREE from 'three';
import { springTo, startLoop, tokenColor, variantFrom, type SpringValue } from './support';

// First entry is the default; the shader's uVariant mapping is fixed below.
const VARIANTS = ['cloth', 'jelly', 'bulge'] as const;
const SHADER_VARIANT = { jelly: 0, cloth: 1, bulge: 2 } as const;

// Canvas is 1.4x the portrait circle so displaced vertices have room to wobble.
const CANVAS_SCALE = 1.4;

const VERTEX = /* glsl */ `
  uniform vec2 uPointer;
  uniform vec2 uLean;
  uniform float uStrength;
  uniform float uTime;
  uniform int uVariant;
  varying vec2 vUv;
  varying float vShade;

  void main() {
    vUv = uv;
    vec3 p = position;
    vec2 fromPointer = uv - uPointer;
    float d = length(fromPointer);
    float z = 0.0;

    if (uVariant == 0) {
      // jelly: damped ripple radiating from the cursor + a soft outward push
      z = uStrength * 0.085 * cos(d * 26.0 - uTime * 9.0) * exp(-d * 5.5);
      vec2 dir = d > 0.0001 ? fromPointer / d : vec2(0.0);
      p.xy += uStrength * 0.035 * dir * exp(-d * 7.0);
    } else if (uVariant == 1) {
      // cloth: whole plane sways after the cursor with a traveling wave
      // (amplitude fully cursor-driven — no idle loop, per docs/brand.md)
      z = uStrength * 0.06
        * sin(uv.x * 7.0 + uTime * 1.4)
        * sin(uv.y * 5.0 + uTime * 1.1);
      z += uLean.x * (uv.x - 0.5) * 0.6 + uLean.y * (uv.y - 0.5) * 0.6;
    } else {
      // bulge: lens bump toward the camera under the cursor
      float bump = exp(-d * d * 34.0);
      z = uStrength * 0.16 * bump;
      p.xy -= uStrength * 0.05 * fromPointer * bump;
    }

    p.z += z;
    vShade = z;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uRing;
  varying vec2 vUv;
  varying float vShade;

  void main() {
    float r = distance(vUv, vec2(0.5));
    float alpha = 1.0 - smoothstep(0.492, 0.5, r);
    if (alpha <= 0.001) discard;
    vec3 color = texture2D(uMap, vUv).rgb;
    color *= 1.0 + vShade * 1.4;
    float ring = smoothstep(0.478, 0.488, r);
    color = mix(color, uRing, ring * 0.9);
    gl_FragColor = vec4(color, alpha);
  }
`;

export async function initSquishPortrait(panel: HTMLElement): Promise<void> {
  const img = panel.querySelector<HTMLImageElement>('.portrait');
  if (!img) return;
  await img.decode();

  const variant = variantFrom('squish', VARIANTS);

  // Load via TextureLoader (not the live srcset <img>) so the GPU upload is
  // reliable; NoColorSpace passes pixels through untouched for the raw shader.
  const texture = await new THREE.TextureLoader().loadAsync(img.currentSrc || img.src);
  texture.colorSpace = THREE.NoColorSpace;

  const ring = new THREE.Color(tokenColor('--hairline')).lerp(
    new THREE.Color(tokenColor('--accent')),
    0.2,
  );

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const canvas = renderer.domElement;
  canvas.className = 'portrait-canvas';
  canvas.setAttribute('aria-hidden', 'true');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
  // Distance where the 1x1 plane spans 1/CANVAS_SCALE of the view.
  camera.position.z = CANVAS_SCALE / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));

  const uniforms = {
    uMap: { value: texture },
    uRing: { value: ring },
    uPointer: { value: new THREE.Vector2(0.5, 0.5) },
    uLean: { value: new THREE.Vector2(0, 0) },
    uStrength: { value: 0 },
    uTime: { value: 0 },
    uVariant: { value: SHADER_VARIANT[variant] },
  };

  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1, 90, 90),
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
    }),
  );
  scene.add(mesh);

  let fittedPx = 0;
  const fit = () => {
    const sizePx = canvas.clientWidth || canvas.offsetWidth;
    if (!sizePx || sizePx === fittedPx) return;
    fittedPx = sizePx;
    renderer.setSize(sizePx, sizePx, false);
    // setSize clears the buffer; repaint since the loop may be resting.
    renderer.render(scene, camera);
  };

  const pointer: { x: SpringValue; y: SpringValue } = {
    x: { value: 0.5, velocity: 0 },
    y: { value: 0.5, velocity: 0 },
  };
  const lean: { x: SpringValue; y: SpringValue } = {
    x: { value: 0, velocity: 0 },
    y: { value: 0, velocity: 0 },
  };
  let pointerTarget = new THREE.Vector2(0.5, 0.5);
  let strengthTarget = 0;
  let lastMove = 0;

  panel.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    // Plane occupies the central 1/CANVAS_SCALE of the canvas.
    const margin = (1 - 1 / CANVAS_SCALE) / 2;
    const u = ((event.clientX - rect.left) / rect.width - margin) * CANVAS_SCALE;
    const v = (1 - (event.clientY - rect.top) / rect.height - margin) * CANVAS_SCALE;
    pointerTarget = new THREE.Vector2(u, v);

    const now = performance.now();
    const speed = lastMove ? Math.hypot(event.movementX, event.movementY) / Math.max(now - lastMove, 1) : 0;
    lastMove = now;
    strengthTarget = Math.min(1, strengthTarget + speed * 0.55);
  });
  const release = () => {
    strengthTarget = 0;
  };
  panel.addEventListener('pointerleave', release);
  panel.addEventListener('pointercancel', release);

  const springSettled = (state: SpringValue, target: number) =>
    Math.abs(state.value - target) < 0.002 && Math.abs(state.velocity) < 0.002;

  // Motion is a direct cursor response only (docs/brand.md): time advances
  // and frames render solely while the wobble is alive, then the loop rests.
  let motionTime = 0;
  const stop = startLoop(panel, (dt) => {
    fit();
    const leanTargetX = (pointerTarget.x - 0.5) * (strengthTarget > 0 ? 0.4 : 0);
    const leanTargetY = (pointerTarget.y - 0.5) * (strengthTarget > 0 ? 0.4 : 0);
    const active =
      strengthTarget > 0 ||
      uniforms.uStrength.value > 0.001 ||
      !springSettled(pointer.x, pointerTarget.x) ||
      !springSettled(pointer.y, pointerTarget.y) ||
      !springSettled(lean.x, leanTargetX) ||
      !springSettled(lean.y, leanTargetY);
    if (!active) return;
    motionTime += dt;

    springTo(pointer.x, pointerTarget.x, dt, 90, 14);
    springTo(pointer.y, pointerTarget.y, dt, 90, 14);
    springTo(lean.x, leanTargetX, dt, 30, 8);
    springTo(lean.y, leanTargetY, dt, 30, 8);
    strengthTarget = Math.max(0, strengthTarget - dt * 1.1);

    uniforms.uPointer.value.set(pointer.x.value, pointer.y.value);
    uniforms.uLean.value.set(lean.x.value, lean.y.value);
    uniforms.uStrength.value += (strengthTarget - uniforms.uStrength.value) * Math.min(1, dt * 7);
    uniforms.uTime.value = motionTime;

    renderer.render(scene, camera);
  });

  // First paint before the canvas fades in over the hidden <img>.
  fit();
  renderer.render(scene, camera);

  canvas.addEventListener('webglcontextlost', () => {
    stop();
    panel.classList.remove('is-squish');
    canvas.remove();
  });

  panel.append(canvas);
  panel.classList.add('is-squish');
}
