import * as THREE from 'three';
import {SVGLoader} from 'three/examples/jsm/loaders/SVGLoader.js';
import {Easing, interpolate} from 'remotion';
import {choreography} from './motion.js';

const ease = {extrapolateLeft:'clamp',extrapolateRight:'clamp',easing:Easing.inOut(Easing.cubic)};
const mix = (frame,start,end,from,to) => interpolate(frame,[start,end],[from,to],ease);

export const createLogoScene = paths => {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-350,350,183.75,-183.75,1,2000);
  camera.position.set(0,700,800);
  camera.lookAt(0,14,0);
  camera.updateMatrixWorld();
  const grainCanvas = document.createElement('canvas');
  grainCanvas.width = grainCanvas.height = 128;
  const ctx = grainCanvas.getContext('2d');
  const image = ctx.createImageData(128,128);
  let seed = 19;
  for(let i=0;i<image.data.length;i+=4){
    seed = (Math.imul(seed,1664525)+1013904223)>>>0;
    const value = 110+(seed>>>26);
    image.data.set([value,value,value,255],i);
  }
  ctx.putImageData(image,0,0);
  const grain = new THREE.CanvasTexture(grainCanvas);
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
  const face = new THREE.MeshStandardMaterial({color:'#C65B43',roughness:.82,bumpMap:grain,bumpScale:.5});
  const side = new THREE.MeshStandardMaterial({color:'#AC4632',roughness:.88,bumpMap:grain,bumpScale:.5});
  const parsed = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><g transform="translate(-288.435,145) scale(1,-1)">${paths.map(d=>`<path d="${d}"/>`).join('')}</g></svg>`);
  const meshes = parsed.paths.map(path => {
    const geometry = new THREE.ExtrudeGeometry(path.toShapes(),{depth:70,bevelEnabled:true,bevelThickness:2.5,bevelSize:2.5,bevelSegments:4,curveSegments:32,steps:1});
    geometry.rotateX(-Math.PI/2);
    geometry.computeBoundingBox();
    const mesh = new THREE.Mesh(geometry,[face,side]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  });
  const bounds = new THREE.Box3();
  meshes.forEach(mesh=>bounds.union(mesh.geometry.boundingBox));
  scene.add(new THREE.HemisphereLight('#FFF7EA','#8E5A43',2.2));
  const light = new THREE.DirectionalLight('#FFF1DB',3.0);
  light.position.set(-300,650,400);
  light.castShadow = true;
  light.shadow.mapSize.set(1024,1024);
  Object.assign(light.shadow.camera,{left:-450,right:450,top:400,bottom:-400,near:100,far:1400});
  light.shadow.normalBias = .6;
  light.shadow.bias = -.0002;
  light.shadow.radius = 5;
  light.shadow.blurSamples = 8;
  scene.add(light);
  const groundMaterial = new THREE.ShadowMaterial({opacity:.075});
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(2500,2500),groundMaterial);
  ground.rotation.x = -Math.PI/2;
  ground.position.y = -3;
  ground.receiveShadow = true;
  scene.add(ground);
  const project = (x,y,z) => {
    const p = new THREE.Vector3(x,y,z).project(camera);
    return {x:(p.x+1)*600,y:(1-p.y)*315};
  };
  const screenBounds = (box,dx,dz,depth) => {
    const points = [];
    for(const x of [box.min.x,box.max.x]) for(const y of [box.min.y,box.max.y]) for(const z of [box.min.z,box.max.z]) points.push(project(x+dx,y*depth,z+dz));
    return {left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))};
  };
  return {
    scene,camera,
    pose(frame){
      const state = choreography(frame);
      meshes.forEach((mesh,i)=>{
        mesh.scale.y = state.depth;
        mesh.position.set(i===3?state.mX:0,0,i===3?state.mZ:0);
      });
      const selection = frame<23?screenBounds(meshes[3].geometry.boundingBox,state.mX,state.mZ,state.depth):screenBounds(bounds,0,0,state.depth);
      const grab = project(529-288.435,meshes[3].geometry.boundingBox.max.y*.025,135-145);
      const movingGrab = project(529-288.435+state.mX,meshes[3].geometry.boundingBox.max.y*.025,135-145+state.mZ);
      const flatGroup = screenBounds(bounds,0,0,.025);
      let cursor;
      if(frame<6) cursor={x:mix(frame,0,6,1225,movingGrab.x),y:mix(frame,0,6,580,movingGrab.y)};
      else if(frame<=22) cursor=movingGrab;
      else if(frame<28) cursor={x:mix(frame,22,28,grab.x,flatGroup.right),y:mix(frame,22,28,grab.y,flatGroup.top)};
      else if(frame<=47) cursor={x:selection.right,y:selection.top};
      else cursor={x:mix(frame,47,58,selection.right,1235),y:mix(frame,47,58,selection.top,25)};
      return {selection,cursor,state};
    },
    dispose(){meshes.forEach(mesh=>mesh.geometry.dispose());ground.geometry.dispose();groundMaterial.dispose();face.dispose();side.dispose();grain.dispose();},
  };
};
