/**
 * The hero field panel's blum mark, extruded into a chunky 3D object.
 * It tumbles gently, leans toward the cursor, and does a full spin when the
 * panel is entered. Renditions (?mark=): clay | paper | sketch.
 */
import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import markSvg from '../../assets/identity/blum-mark.svg?raw';
import { springTo, startLoop, tokenColor, variantFrom, type SpringValue } from './support';

const VARIANTS = ['clay', 'paper', 'sketch'] as const;

// Entrance offsets per stroke, echoing the flat SVG's blum-assemble keyframes.
const PIECE_OFFSETS = [
  { x: -0.9, y: 0.35, rotate: -0.1 },
  { x: -0.25, y: 0.85, rotate: 0.08 },
  { x: 0.2, y: -0.75, rotate: -0.08 },
  { x: 0.9, y: 0.38, rotate: 0.1 },
];

const easeOutBack = (t: number) => {
  const c = 1.70158;
  const u = t - 1;
  return 1 + (c + 1) * u * u * u + c * u * u;
};

export function initBlumMark(panel: HTMLElement): void {
  const variant = variantFrom('mark', VARIANTS);
  const accent = new THREE.Color(tokenColor('--accent'));
  const paper = new THREE.Color(tokenColor('--paper-raised'));
  const ink = new THREE.Color(tokenColor('--ink'));

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.className = 'field-canvas';
  canvas.setAttribute('aria-hidden', 'true');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  camera.position.set(0, 0, 14);

  // Warm paper-toned lighting; the sketch rendition mostly ignores it.
  scene.add(new THREE.HemisphereLight(paper, ink, 1.5));
  const key = new THREE.DirectionalLight(0xfff6e8, 2.3);
  key.position.set(4, 6, 9);
  scene.add(key);
  const fill = new THREE.DirectionalLight(accent, 0.5);
  fill.position.set(-6, -3, 5);
  scene.add(fill);

  const svg = new SVGLoader().parse(markSvg);
  const geometries = svg.paths.map((path) => {
    const shapes = SVGLoader.createShapes(path);
    return new THREE.ExtrudeGeometry(shapes, {
      depth: 46,
      curveSegments: 10,
      bevelEnabled: true,
      bevelThickness: 7,
      bevelSize: 5,
      bevelSegments: 3,
    });
  });

  const bounds = new THREE.Box3();
  for (const geometry of geometries) {
    geometry.computeBoundingBox();
    if (geometry.boundingBox) bounds.union(geometry.boundingBox);
  }
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  for (const geometry of geometries) {
    geometry.translate(-center.x, -center.y, -center.z);
    // SVG space is y-down; mirror once here (materials render DoubleSide).
    geometry.scale(1, -1, 1);
  }

  const buildMaterials = (): THREE.Material | THREE.Material[] => {
    if (variant === 'clay') {
      return new THREE.MeshStandardMaterial({
        color: accent,
        roughness: 0.55,
        side: THREE.DoubleSide,
      });
    }
    if (variant === 'paper') {
      // Cut-paper: unlit cream faces (exact token color), lit ink side walls
      // (extrude caps = material index 0, walls = 1).
      return [
        new THREE.MeshBasicMaterial({ color: paper, side: THREE.DoubleSide }),
        new THREE.MeshStandardMaterial({ color: ink, roughness: 0.5, side: THREE.DoubleSide }),
      ];
    }
    return new THREE.MeshBasicMaterial({
      color: paper,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  };

  const group = new THREE.Group();
  const pieces = geometries.map((geometry, index) => {
    const piece = new THREE.Group();
    piece.add(new THREE.Mesh(geometry, buildMaterials()));
    if (variant === 'sketch') {
      const lines = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry, 24),
        new THREE.LineBasicMaterial({ color: ink, transparent: true, opacity: 0.55 }),
      );
      piece.add(lines);
    }
    group.add(piece);
    return { piece, phase: index * 1.7 };
  });
  scene.add(group);

  const markWidth = size.x;
  const markHeight = size.y;
  const fit = () => {
    const width = panel.clientWidth;
    const height = panel.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const viewHeight = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const viewWidth = viewHeight * camera.aspect;
    const targetWidth = Math.min(viewWidth * 0.72, viewHeight * 0.5 * (markWidth / markHeight));
    group.scale.setScalar(targetWidth / markWidth);
    // Resizing clears the buffer; repaint since the loop may be resting.
    renderer.render(scene, camera);
  };
  fit();
  new ResizeObserver(fit).observe(panel);

  // Pointer lean + hover spin, driven by springs for a toy-like feel.
  const yaw: SpringValue = { value: 0, velocity: 0 };
  const pitch: SpringValue = { value: 0, velocity: 0 };
  const spin: SpringValue = { value: 0, velocity: 0 };
  let yawTarget = 0;
  let pitchTarget = 0;
  let spinTarget = 0;

  panel.addEventListener('pointermove', (event) => {
    const rect = panel.getBoundingClientRect();
    const nx = (event.clientX - rect.left) / rect.width - 0.5;
    const ny = (event.clientY - rect.top) / rect.height - 0.5;
    yawTarget = nx * 0.6;
    pitchTarget = ny * 0.38;
  });
  let pointerInside = false;
  panel.addEventListener('pointerenter', () => {
    pointerInside = true;
    spinTarget += Math.PI * 2;
  });
  const settle = () => {
    pointerInside = false;
    yawTarget = 0;
    pitchTarget = 0;
  };
  panel.addEventListener('pointerleave', settle);
  panel.addEventListener('pointercancel', settle);

  const springSettled = (state: SpringValue, target: number) =>
    Math.abs(state.value - target) < 0.002 && Math.abs(state.velocity) < 0.002;

  // Per docs/brand.md the mark never loops decoratively: motionTime advances
  // only during the one-shot entrance and direct pointer interaction, and
  // rendering stops entirely once everything settles.
  const ENTRANCE = 0.07 * (PIECE_OFFSETS.length - 1) + 0.7;
  let motionTime = 0;
  const stop = startLoop(panel, (dt) => {
    const active =
      pointerInside ||
      motionTime < ENTRANCE ||
      !springSettled(yaw, yawTarget) ||
      !springSettled(pitch, pitchTarget) ||
      !springSettled(spin, spinTarget);
    if (!active) return;
    motionTime += dt;

    springTo(yaw, yawTarget, dt, 42, 9);
    springTo(pitch, pitchTarget, dt, 42, 9);
    springTo(spin, spinTarget, dt, 26, 7);

    group.rotation.y = Math.sin(motionTime * 0.32) * 0.12 + yaw.value + spin.value;
    group.rotation.x = Math.sin(motionTime * 0.45) * 0.06 + pitch.value;
    group.rotation.z = Math.sin(motionTime * 0.27) * 0.03 - 0.035;

    pieces.forEach(({ piece, phase }, index) => {
      const enter = Math.min(1, Math.max(0, (motionTime - index * 0.07) / 0.7));
      const eased = easeOutBack(enter);
      const offset = PIECE_OFFSETS[index] ?? PIECE_OFFSETS[0];
      piece.position.x = offset.x * (1 - eased);
      piece.position.y = offset.y * (1 - eased) + Math.sin(motionTime * 0.9 + phase) * 0.045;
      piece.rotation.z = offset.rotate * (1 - eased);
      piece.position.z = Math.sin(motionTime * 0.7 + phase * 2.1) * 0.05;
    });

    renderer.render(scene, camera);
  });

  canvas.addEventListener('webglcontextlost', () => {
    stop();
    panel.classList.remove('is-3d');
    canvas.remove();
  });

  panel.append(canvas);
  panel.classList.add('is-3d');
}
