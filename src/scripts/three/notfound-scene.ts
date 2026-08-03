/**
 * 404 toy: chunky extruded "4 0 4" numerals drop into the stage, and you can
 * grab and toss them. Tiny bespoke physics (spheres + impulses) — no engine.
 */
import * as THREE from 'three';
import { startLoop, tokenColor } from './support';

const NUMERAL_HEIGHT = 1.3;
const GRAVITY = 16;
const RESTITUTION = 0.55;

// Poster-style "4" with a triangular counter, drawn as shape + hole.
function fourShape(): THREE.Shape {
  const W = 0.95;
  const H = NUMERAL_HEIGHT;
  const t = 0.26;
  const c = 0.3;

  const shape = new THREE.Shape();
  shape.moveTo(W, 0);
  shape.lineTo(W, H);
  shape.lineTo(W - t, H);
  shape.lineTo(0, c + t);
  shape.lineTo(0, c);
  shape.lineTo(W - t, c);
  shape.lineTo(W - t, 0);
  shape.closePath();

  const counter = new THREE.Path();
  counter.moveTo(W - t, c + t);
  counter.lineTo(W - t, H - 0.4);
  counter.lineTo(0.35, c + t);
  counter.closePath();
  shape.holes.push(counter);
  return shape;
}

function zeroShape(): THREE.Shape {
  const shape = new THREE.Shape();
  shape.absellipse(0.48, NUMERAL_HEIGHT / 2, 0.48, NUMERAL_HEIGHT / 2, 0, Math.PI * 2, false, 0);
  const counter = new THREE.Path();
  counter.absellipse(0.48, NUMERAL_HEIGHT / 2, 0.21, 0.37, 0, Math.PI * 2, true, 0);
  shape.holes.push(counter);
  return shape;
}

interface Body {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  radius: number;
  dropDelay: number;
  active: boolean;
}

export function initNotFoundToy(stage: HTMLElement): void {
  const accent = new THREE.Color(tokenColor('--accent'));
  const ink = new THREE.Color(tokenColor('--ink'));
  const success = new THREE.Color(tokenColor('--success'));

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.className = 'fof-canvas';

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 40);
  camera.position.set(0, 0.6, 9);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.HemisphereLight(new THREE.Color(tokenColor('--paper-raised')), ink, 1.1));
  const key = new THREE.DirectionalLight(0xfff6e8, 2.2);
  key.position.set(3, 7, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -6;
  key.shadow.camera.right = 6;
  key.shadow.camera.top = 6;
  key.shadow.camera.bottom = -6;
  scene.add(key);

  const bounds = { halfWidth: 4, floor: -2, ceiling: 4 };

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.ShadowMaterial({ opacity: 0.16, color: ink }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const makeBody = (shape: THREE.Shape, color: THREE.Color, x: number, dropDelay: number): Body => {
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.42,
      curveSegments: 24,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.045,
      bevelSegments: 3,
    });
    geometry.center();
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({ color, roughness: 0.5 }),
    );
    mesh.castShadow = true;
    geometry.computeBoundingSphere();
    const radius = (geometry.boundingSphere?.radius ?? 0.8) * 0.82;
    mesh.position.set(x, bounds.ceiling + 1.5, 0);
    scene.add(mesh);
    return {
      mesh,
      velocity: new THREE.Vector3(0, 0, 0),
      angularVelocity: new THREE.Vector3(
        (x % 2) * 0.8 - 0.4,
        x * 0.3,
        x > 0 ? -1.2 : 1.2,
      ),
      radius,
      dropDelay,
      active: false,
    };
  };

  const bodies: Body[] = [
    makeBody(fourShape(), accent, -1.9, 0.1),
    makeBody(zeroShape(), ink, 0, 0.32),
    makeBody(fourShape(), success, 1.9, 0.54),
  ];

  const fit = () => {
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const viewHeight = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const viewWidth = viewHeight * (width / height);
    bounds.halfWidth = viewWidth / 2 - 0.2;
    bounds.floor = -viewHeight / 2 + 0.75;
    bounds.ceiling = viewHeight / 2 + 1;
    floor.position.y = bounds.floor - 0.01;
  };
  fit();
  new ResizeObserver(fit).observe(stage);

  // --- grabbing ---
  const raycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2();
  const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const dragPoint = new THREE.Vector3();
  let grabbed: Body | null = null;

  const setRay = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    pointerNdc.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -(((event.clientY - rect.top) / rect.height) * 2 - 1),
    );
    raycaster.setFromCamera(pointerNdc, camera);
  };

  canvas.addEventListener('pointerdown', (event) => {
    setRay(event);
    const hit = raycaster.intersectObjects(bodies.map((body) => body.mesh))[0];
    if (!hit) return;
    grabbed = bodies.find((body) => body.mesh === hit.object) ?? null;
    if (grabbed) {
      dragPlane.constant = -grabbed.mesh.position.z;
      canvas.setPointerCapture(event.pointerId);
      canvas.style.cursor = 'grabbing';
      event.preventDefault();
    }
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!grabbed) return;
    setRay(event);
    raycaster.ray.intersectPlane(dragPlane, dragPoint);
  });
  const drop = () => {
    grabbed = null;
    canvas.style.cursor = 'grab';
  };
  canvas.addEventListener('pointerup', drop);
  canvas.addEventListener('pointercancel', drop);
  canvas.style.cursor = 'grab';
  canvas.style.touchAction = 'pan-y';

  // double-tap the stage: toss everything up
  canvas.addEventListener('dblclick', () => {
    for (const [index, body] of bodies.entries()) {
      body.velocity.y += 7 + index;
      body.velocity.x += (index - 1) * 2.2;
      body.angularVelocity.set((index - 1) * 2, index, 3 - index * 2);
    }
  });

  const identity = new THREE.Quaternion();
  const scratch = new THREE.Vector3();
  const axis = new THREE.Vector3();
  const spin = new THREE.Quaternion();

  const step = (dt: number) => {
    for (const body of bodies) {
      if (!body.active) continue;
      const p = body.mesh.position;

      if (body === grabbed) {
        scratch.copy(dragPoint).sub(p).multiplyScalar(14);
        body.velocity.lerp(scratch, Math.min(1, dt * 20));
        body.angularVelocity.multiplyScalar(1 - Math.min(1, dt * 4));
      } else {
        body.velocity.y -= GRAVITY * dt;
      }

      p.addScaledVector(body.velocity, dt);

      const omega = body.angularVelocity.length();
      if (omega > 0.0001) {
        axis.copy(body.angularVelocity).divideScalar(omega);
        spin.setFromAxisAngle(axis, omega * dt);
        body.mesh.quaternion.premultiply(spin);
      }

      // floor + walls
      if (p.y - body.radius < bounds.floor) {
        p.y = bounds.floor + body.radius;
        if (body.velocity.y < 0) body.velocity.y *= -RESTITUTION;
        body.velocity.x *= 0.94;
        body.angularVelocity.multiplyScalar(0.9);
        body.angularVelocity.z -= body.velocity.x * 0.25;
        if (Math.abs(body.velocity.y) < 0.9) body.velocity.y = 0;
      }
      if (p.x + body.radius > bounds.halfWidth) {
        p.x = bounds.halfWidth - body.radius;
        body.velocity.x = -Math.abs(body.velocity.x) * 0.7;
      } else if (p.x - body.radius < -bounds.halfWidth) {
        p.x = -bounds.halfWidth + body.radius;
        body.velocity.x = Math.abs(body.velocity.x) * 0.7;
      }
      p.z = THREE.MathUtils.clamp(p.z, -0.5, 0.5);
      if (p.y > bounds.ceiling + 3) {
        p.y = bounds.ceiling + 3;
        body.velocity.y = Math.min(body.velocity.y, 0);
      }

      // resting numerals slowly right themselves so "404" reads again
      const resting = body.velocity.lengthSq() < 0.05 && body !== grabbed;
      if (resting) {
        body.mesh.quaternion.slerp(identity, Math.min(1, dt * 2.2));
        body.angularVelocity.multiplyScalar(1 - Math.min(1, dt * 3));
      }
    }

    // sphere-sphere collisions, equal masses
    for (let i = 0; i < bodies.length; i += 1) {
      for (let j = i + 1; j < bodies.length; j += 1) {
        const a = bodies[i];
        const b = bodies[j];
        if (!a.active || !b.active) continue;
        scratch.copy(b.mesh.position).sub(a.mesh.position);
        const dist = scratch.length();
        const minDist = a.radius + b.radius;
        if (dist === 0 || dist >= minDist) continue;
        const normal = scratch.divideScalar(dist);
        const overlap = minDist - dist;
        a.mesh.position.addScaledVector(normal, -overlap / 2);
        b.mesh.position.addScaledVector(normal, overlap / 2);
        const relative = axis.copy(a.velocity).sub(b.velocity);
        const closing = relative.dot(normal);
        if (closing > 0) {
          const impulse = ((1 + RESTITUTION) * closing) / 2;
          a.velocity.addScaledVector(normal, -impulse);
          b.velocity.addScaledVector(normal, impulse);
          a.angularVelocity.z += closing * 0.4;
          b.angularVelocity.z -= closing * 0.4;
        }
      }
    }
  };

  let accumulator = 0;
  const stop = startLoop(stage, (dt, elapsed) => {
    for (const body of bodies) {
      if (!body.active && elapsed > body.dropDelay) body.active = true;
    }
    accumulator = Math.min(accumulator + dt, 0.12);
    while (accumulator >= 1 / 120) {
      step(1 / 120);
      accumulator -= 1 / 120;
    }
    renderer.render(scene, camera);
  });

  canvas.addEventListener('webglcontextlost', () => {
    stop();
    stage.classList.remove('is-3d');
    canvas.remove();
  });

  stage.append(canvas);
  stage.classList.add('is-3d');
}
