import blumMark from '../assets/identity/blum-mark.svg?raw';
import { Box3, CanvasTexture, Matrix4, Mesh, MeshStandardMaterial, Object3D, ShaderChunk, SRGBColorSpace, Vector3 } from 'three';

export function applyCanTreatment(root: Object3D, bounds: Box3, style: CSSStyleDeclaration): () => void {
  const size = bounds.getSize(new Vector3());
  if (size.x <= 0 || size.y <= 0 || size.z <= 0) throw new Error('Can body has no drawable surface');
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 1120;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Can artwork unavailable');
  const cream = style.getPropertyValue('--paper-raised').trim();
  const oxblood = style.getPropertyValue('--accent').trim();
  const black = style.getPropertyValue('--can-black').trim();
  context.scale(4, 4);
  context.fillStyle = black;
  context.fillRect(0, 0, 300, 280);
  context.fillStyle = oxblood;
  context.fillRect(0, 43, 300, 3);
  context.fillRect(0, 258, 300, 2);
  context.save();
  context.translate(110, 65);
  context.scale(80 / 576.87, 80 / 576.87);
  for (const [, path] of blumMark.matchAll(/ d="([^"]+)"/g)) context.fill(new Path2D(path));
  context.restore();
  context.fillStyle = cream;
  context.save();
  context.translate(167, 243);
  context.rotate(-Math.PI / 2);
  context.font = '900 36px Arial, sans-serif';
  context.fillText('STUDIO', 0, 0);
  context.restore();
  context.font = '5px Arial, sans-serif';
  for (const x of [23, 111, 225]) {
    context.fillText('JORDAN', x, 133);
    context.fillText('BLUM', x, 140);
    context.fillRect(x, 147, 14, 1);
    context.fillText('NEW YORK', x, 160);
    context.fillText('COLOR', x, 174);
    context.fillText('STUDY', x, 181);
    context.fillRect(x, 191, 14, 1);
    context.fillText('WORK IN', x, 204);
    context.fillText('PROGRESS', x, 211);
  }
  context.fillText('ORIGINAL WORK / BLUM STUDIO', 110, 252);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  const center = bounds.getCenter(new Vector3());
  const projection = new Matrix4().makeScale(1 / size.x, 1 / size.y, 1 / size.z)
    .multiply(new Matrix4().makeTranslation(-center.x, -bounds.min.y, -center.z));
  const replacements: {mesh: Mesh; original: Mesh['material']; material: MeshStandardMaterial}[] = [];
  root.updateMatrixWorld(true);
  root.traverse(mesh => {
    if (!(mesh instanceof Mesh)) return;
    const material = new MeshStandardMaterial({map:texture, roughness:.85, metalness:.05});
    material.name = 'BLUM studio can paint';
    const canProjection = projection.clone().multiply(mesh.matrixWorld);
    // Streaming USD meshes release CPU vertices; project in the vertex shader instead of DecalGeometry.
    material.onBeforeCompile = shader => {
      shader.uniforms.canProjection = {value:canProjection};
      shader.vertexShader = `uniform mat4 canProjection;\nvarying vec3 vCanPoint;\n${shader.vertexShader}`.replace('#include <uv_vertex>', `
        #include <uv_vertex>
        vec4 canVertex = vec4(position, 1.0);
        #ifdef USE_INSTANCING
          canVertex = instanceMatrix * canVertex;
        #endif
        vCanPoint = (canProjection * canVertex).xyz;
      `);
      // Compute the wrap per fragment so triangles crossing the rear seam do not smear the print.
      shader.fragmentShader = `varying vec3 vCanPoint;\n${shader.fragmentShader}`.replace('#include <map_fragment>', `
        vec3 canPoint = vCanPoint;
        vec2 canUv = vec2(atan(canPoint.x, canPoint.z) / 6.28318530718 + 0.5, canPoint.y);
        ${ShaderChunk.map_fragment.replaceAll('vMapUv', 'canUv')}
      `);
    };
    replacements.push({mesh, original:mesh.material, material});
    mesh.material = material;
  });
  return () => {
    for (const {mesh, original, material} of replacements) {
      mesh.material = original;
      material.dispose();
    }
    texture.dispose();
  };
}
