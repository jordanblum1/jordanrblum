import { Box3, CanvasTexture, Matrix4, Mesh, MeshStandardMaterial, Object3D, SRGBColorSpace, Vector3 } from 'three';

export function applyCanTreatment(root: Object3D, bounds: Box3, style: CSSStyleDeclaration): () => void {
  const size = bounds.getSize(new Vector3());
  if (size.x <= 0 || size.y <= 0) throw new Error('Can body has no drawable surface');
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 1120;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Can artwork unavailable');
  const cream = style.getPropertyValue('--paper-raised').trim();
  const oxblood = style.getPropertyValue('--accent').trim();
  const ochre = style.getPropertyValue('--warning').trim();
  context.scale(4, 4);
  context.fillStyle = cream;
  context.fillRect(0, 0, 100, 280);
  context.fillStyle = ochre;
  context.fillRect(0, 0, 100, 44);
  context.fillRect(0, 234, 100, 25);
  context.fillStyle = oxblood;
  context.fillRect(0, 83, 100, 5);
  context.textAlign = 'center';
  context.font = '900 28px Arial, sans-serif';
  context.letterSpacing = '-2px';
  context.fillText('MTN', 50, 121);
  context.font = '900 85px Arial, sans-serif';
  context.letterSpacing = '-8px';
  context.fillText('94', 50, 203);
  context.fillStyle = style.getPropertyValue('--ink').trim();
  context.fillRect(14, 216, 72, 2);
  context.fillRect(14, 222, 51, 2);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  const projection = new Matrix4().makeScale(1 / size.x, 1 / size.y, 1)
    .multiply(new Matrix4().makeTranslation(-bounds.min.x, -bounds.min.y, 0));
  const replacements: {mesh: Mesh; original: Mesh['material']; material: MeshStandardMaterial}[] = [];
  root.updateMatrixWorld(true);
  root.traverse(mesh => {
    if (!(mesh instanceof Mesh)) return;
    const material = new MeshStandardMaterial({map:texture, roughness:.6, metalness:.05});
    material.name = 'MTN-inspired can paint';
    const canProjection = projection.clone().multiply(mesh.matrixWorld);
    // Streaming USD meshes release CPU vertices; project in the vertex shader instead of DecalGeometry.
    material.onBeforeCompile = shader => {
      shader.uniforms.canProjection = {value:canProjection};
      shader.vertexShader = `uniform mat4 canProjection;\n${shader.vertexShader}`.replace('#include <uv_vertex>', `
        #include <uv_vertex>
        vec4 canVertex = vec4(position, 1.0);
        #ifdef USE_INSTANCING
          canVertex = instanceMatrix * canVertex;
        #endif
        vMapUv = (canProjection * canVertex).xy;
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
