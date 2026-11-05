import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Composition, cancelRender, continueRender, delayRender, interpolate, registerRoot, spring, staticFile, useCurrentFrame} from 'remotion';
import paths from './logo-paths.json';

const clamp = {extrapolateLeft:'clamp', extrapolateRight:'clamp'};
const plane = height => `matrix(1.75 0 -.3 1.1 145 ${190-height})`;

export const StudioCard = () => {
  const frame = (useCurrentFrame()+59)%89;
  const returnToPlan = interpolate(frame,[73,88],[1,0],clamp);
  const material = interpolate(frame,[4,18,74,88],[0,1,1,0],clamp);
  const windows = interpolate(frame,[35,46,72,81],[0,1,1,0],clamp);
  const heights = paths.map((_, index) => 130 * spring({frame:frame-5-index*5,fps:30,config:{damping:18,stiffness:160,mass:.8}}) * returnToPlan);
  const [fontHandle] = useState(() => delayRender('Load studio font'));
  useEffect(() => {
    new FontFace('Chillax', `url(${staticFile('chillax-600.woff2')})`, {weight:'600'}).load().then(font => {
      document.fonts.add(font);
      continueRender(fontHandle);
    }).catch(cancelRender);
  }, [fontHandle]);

  return <AbsoluteFill style={{background:'#F7F3ED',overflow:'hidden'}}>
    <svg width="1200" height="630" viewBox="0 0 1200 630">
      <defs>
        <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="#547FA0" strokeWidth=".8"/></pattern>
        {heights.map((height,index)=><filter key={index} id={`extrude-${index}`} filterUnits="userSpaceOnUse" x="0" y="0" width="1200" height="630"><feMorphology in="SourceGraphic" operator="dilate" radius={`.5 ${height/2}`}/><feOffset dy={height/2}/></filter>)}
        <mask id="walls">
          {paths.map((path,index)=><g key={index} filter={`url(#extrude-${index})`}><path d={path} transform={plane(heights[index])} fill="white"/></g>)}
          {paths.map((path,index)=><path key={index} d={path} transform={plane(heights[index])} fill="black"/>)}
        </mask>
      </defs>
      <g opacity={.12+(1-material)*.12} transform="matrix(1 0 -.38 .55 95 260)">
        <rect width="1200" height="500" fill="url(#grid)"/>
      </g>
      {paths.map((path,index)=><path key={index} d={path} transform={plane(0)} fill="#E7EDF0" stroke="#547FA0" strokeWidth="2" strokeDasharray="6 4" opacity=".8"/>)}
      <g opacity={material}>
        {paths.map((path,index)=><g key={index} filter={`url(#extrude-${index})`}><path d={path} transform={plane(heights[index])} fill="#70352F"/></g>)}
        {paths.map((path,index)=><path key={index} d={path} transform={plane(heights[index])} fill="#9C4037" stroke="#622C29" strokeWidth="1.1"/>)}
      </g>
      <g mask="url(#walls)" opacity={windows}>
        {[[145,400,105,56],[411,424,110,43],[641,410,38,43],[823,378,32,43],[1026,407,32,43]].map(([x,y,width,height],index)=><g key={index}><rect x={x} y={y} width={width} height={height} rx="2" fill={index%2?'#88B6C5':'#F2D498'} stroke="#442724" strokeWidth="4"/>{index===0?<path d="m170 417-10 11 10 11m58-22 10 11-10 11m-22-24-11 26" fill="none" stroke="#62332B" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>:index===1?<g fill="none" stroke="#F7F3ED" strokeWidth="3"><path d="M425 456Q454 423 507 437M425 456l25-26M507 437l-30-6"/><circle cx="425" cy="456" r="3" fill="#F7F3ED"/><circle cx="507" cy="437" r="3" fill="#F7F3ED"/><circle cx="450" cy="430" r="2"/><circle cx="477" cy="431" r="2"/></g>:<path d={`M${x+width/2} ${y}v${height}`} stroke="#70352F" strokeWidth="4"/>}</g>)}
      </g>
      <g opacity={interpolate(frame,[0,8,36,48,75,88],[.65,.8,.65,0,0,.65],clamp)} stroke="#547FA0" fill="none" strokeWidth="1.3">
        <path d="M82 515H1133M82 509v12M1133 509v12"/>
        <path d="M1118 192v312M1112 192h12M1112 504h12"/>
      </g>
    </svg>
    <div style={{position:'absolute',left:0,right:0,top:540,textAlign:'center',fontFamily:'Chillax',fontWeight:600,fontSize:72,lineHeight:1,letterSpacing:'-.06em',color:'#2B2521'}}>Studios</div>
  </AbsoluteFill>;
};
const Root = () => <Composition id="StudioOG" component={StudioCard} durationInFrames={90} fps={30} width={1200} height={630}/>;
registerRoot(Root);
