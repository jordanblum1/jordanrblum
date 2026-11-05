import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Composition, Img, cancelRender, continueRender, delayRender, interpolate, registerRoot, staticFile, useCurrentFrame} from 'remotion';

export const StudioCard = () => {
  const frame = (useCurrentFrame() + 24) % 89;
  const clamp = {extrapolateLeft:'clamp', extrapolateRight:'clamp'};
  const stroke = interpolate(frame, [8,44], [0,1], clamp);
  const pencilOpacity = interpolate(frame, [5,9,47,55], [0,1,1,0], clamp);
  const inkOpacity = interpolate(frame, [8,12,66,84], [0,1,1,0], clamp);
  const [fontHandle] = useState(() => delayRender('Load studio font'));
  useEffect(() => {
    new FontFace('Chillax', `url(${staticFile('chillax-600.woff2')})`, {weight:'600'}).load().then(font => {
      document.fonts.add(font);
      continueRender(fontHandle);
    }).catch(cancelRender);
  }, [fontHandle]);
  return <AbsoluteFill style={{background:'#F7F3ED',overflow:'hidden'}}>
    {[0,1,2,3].map(letter => {
      const progress = interpolate(frame, [6+letter*5,30+letter*5], [0,1], clamp);
      const press = Math.sin(progress*Math.PI);
      return <Img key={letter} src={staticFile(`letter-${letter}.svg`)} style={{position:'absolute',left:75,top:-6,width:1050,height:528,objectFit:'contain',transform:`translateY(${press*10}px)`,filter:`drop-shadow(0 ${4+press*3}px 0 rgba(112,43,37,${.09+press*.07}))`}}/>;
    })}
    <svg width="1200" height="630" viewBox="0 0 1200 630" style={{position:'absolute',inset:0,opacity:inkOpacity}}>
      <path d="M130 509 H1060" fill="none" stroke="#547FA0" strokeWidth="7" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1-stroke}/>
    </svg>
    <div style={{position:'absolute',left:0,right:0,top:528,textAlign:'center',fontFamily:'Chillax',fontWeight:600,fontSize:74,lineHeight:1,letterSpacing:'-0.06em',color:'#2B2521'}}>Studios</div>
    <svg width="330" height="130" viewBox="0 0 330 130" style={{position:'absolute',left:130+stroke*930,top:509-112,opacity:pencilOpacity,transform:'translateX(-12px)'}}>
      <g stroke="#243F51" strokeWidth="3" strokeLinejoin="round">
        <path d="M12 112 60 69 296 10 312 67 76 126Z" fill="#5E8FAC"/>
        <path d="m60 69 236-59 8 27-236 59Z" fill="#8BB5CA"/>
        <path d="m12 112 48-43 16 57Z" fill="#D7B785"/>
        <path d="m12 112 15-14 5 17Z" fill="#243F51"/>
        <path d="m296 10 11-3q12-3 15 10l9 31q3 12-9 15l-10 4Z" fill="#B85046"/>
        <path d="m286 13 16 57" fill="none"/>
      </g>
    </svg>
  </AbsoluteFill>;
};
const Root = () => <Composition id="StudioOG" component={StudioCard} durationInFrames={90} fps={30} width={1200} height={630}/>;
registerRoot(Root);
