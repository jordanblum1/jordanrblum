import React, {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import * as THREE from 'three';
import {AbsoluteFill, Composition, cancelRender, continueRender, delayRender, interpolate, registerRoot, staticFile, useCurrentFrame} from 'remotion';
import paths from './logo-paths.json';
import {createLogoScene} from './logo-scene.js';

export const StudioCard = () => {
  const frame = useCurrentFrame();
  const model = useMemo(()=>createLogoScene(paths),[]);
  const canvas = useRef(null);
  const renderer = useRef(null);
  const [ready] = useState(()=>delayRender('Prepare studio canvas'));
  useLayoutEffect(()=>{
    try{
      const render = new THREE.WebGLRenderer({canvas:canvas.current,alpha:true,antialias:true,preserveDrawingBuffer:true});
      render.setSize(1200,630);
      render.setPixelRatio(1);
      render.shadowMap.enabled = true;
      render.shadowMap.type = THREE.VSMShadowMap;
      render.outputColorSpace = THREE.SRGBColorSpace;
      render.toneMapping = THREE.ACESFilmicToneMapping;
      render.toneMappingExposure = 1.05;
      renderer.current = render;
      return ()=>{render.dispose();model.dispose();};
    }catch(error){cancelRender(error);}
  },[model]);
  useEffect(()=>{
    new FontFace('Chillax',`url(${staticFile('chillax-600.woff2')})`,{weight:'600'}).load().then(font=>{
      document.fonts.add(font);
      continueRender(ready);
    }).catch(cancelRender);
  },[ready]);
  const {selection,cursor} = model.pose(frame);
  useLayoutEffect(()=>{renderer.current?.render(model.scene,model.camera);},[frame,model]);
  const clamp = {extrapolateLeft:'clamp',extrapolateRight:'clamp'};
  const editorOpacity = interpolate(frame,[0,49,58,89],[1,1,0,0],clamp);
  const cursorOpacity = interpolate(frame,[0,3,50,58,89],[0,1,1,0,0],clamp);
  return <AbsoluteFill style={{background:'#F7F3ED',overflow:'hidden'}}>
    <svg viewBox="0 0 1200 630" style={{position:'absolute',inset:0,width:'100%',height:'100%',opacity:editorOpacity*.45}}>
      <defs><pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="12" cy="12" r="1" fill="#9E998D"/></pattern></defs>
      <rect width="1200" height="630" fill="url(#dots)"/>
    </svg>
    <canvas ref={canvas} style={{position:'absolute',inset:0,width:'100%',height:'100%'}}/>
    <svg viewBox="0 0 1200 630" style={{position:'absolute',inset:0,width:'100%',height:'100%'}}>
      <g opacity={editorOpacity} fill="#F7F3ED" stroke="#315DAD" strokeWidth="3">
        <rect x={selection.left} y={selection.top} width={selection.right-selection.left} height={selection.bottom-selection.top} fill="none"/>
        {[[selection.left,selection.top],[selection.right,selection.top],[selection.left,selection.bottom],[selection.right,selection.bottom]].map(([x,y],i)=><rect key={i} x={x-6} y={y-6} width="12" height="12"/>)}
      </g>
      <path d="M0 0V32L8 24L15 39L23 35L16 21H28Z" fill="#315DAD" stroke="#F7F3ED" strokeWidth="3" strokeLinejoin="round" opacity={cursorOpacity} transform={`translate(${cursor.x} ${cursor.y}) scale(1.25)`}/>
    </svg>
    <div style={{position:'absolute',left:0,right:0,top:540,textAlign:'center',fontFamily:'Chillax',fontWeight:600,fontSize:72,lineHeight:1,letterSpacing:'-.06em',color:'#2B2521'}}>Studios</div>
  </AbsoluteFill>;
};
const Root = () => <Composition id="StudioOG" component={StudioCard} durationInFrames={90} fps={30} width={1200} height={630}/>;
registerRoot(Root);
