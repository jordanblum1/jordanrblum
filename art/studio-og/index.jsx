import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Composition, Freeze, OffthreadVideo, continueRender, cancelRender, delayRender, interpolate, registerRoot, staticFile, useCurrentFrame} from 'remotion';

export const StudioCard = () => {
  const frame = useCurrentFrame();
  const [fontHandle] = useState(() => delayRender('Load studio font'));
  useEffect(() => {
    new FontFace('Chillax', `url(${staticFile('chillax-600.woff2')})`, {weight:'600'}).load().then(font => {
      document.fonts.add(font);
      continueRender(fontHandle);
    }).catch(cancelRender);
  }, [fontHandle]);
  const clamp = {extrapolateLeft:'clamp',extrapolateRight:'clamp'};
  const selection = interpolate(frame,[0,12,21,59,72,89],[0,0,1,1,0,0],clamp);
  const cursorX = interpolate(frame,[12,24,59,72],[1175,1128,1128,1195],clamp);
  const cursorY = interpolate(frame,[12,24,59,72],[525,486,486,530],clamp);
  const videoStyle = {width:'100%',height:'100%',objectFit:'cover'};
  return <AbsoluteFill style={{background:'#F7F3ED',overflow:'hidden'}}>
    <OffthreadVideo src={staticFile('source-video.mp4')} muted playbackRate={4/3} style={videoStyle}/>
    {frame>=84 && <AbsoluteFill style={{opacity:interpolate(frame,[84,89],[0,1],clamp)}}><Freeze frame={0}><OffthreadVideo src={staticFile('source-video.mp4')} muted playbackRate={4/3} style={videoStyle}/></Freeze></AbsoluteFill>}
    <svg viewBox="0 0 1200 630" style={{position:'absolute',inset:0,width:'100%',height:'100%',opacity:selection}}>
      <g fill="#F7F3ED" stroke="#315DAD" strokeWidth="3">
        <rect x="53" y="43" width="1075" height="443" fill="none"/>
        {[[53,43],[1128,43],[53,486],[1128,486]].map(([x,y])=><rect key={`${x}-${y}`} x={x-6} y={y-6} width="12" height="12"/>)}
      </g>
      <path d="M0 0V32L8 24L15 39L23 35L16 21H28Z" fill="#315DAD" stroke="#F7F3ED" strokeWidth="3" strokeLinejoin="round" transform={`translate(${cursorX} ${cursorY})`}/>
    </svg>
    <div style={{position:'absolute',left:48,top:550,fontFamily:'Chillax',fontWeight:600,fontSize:64,lineHeight:1,letterSpacing:'-.06em',color:'#2B2521'}}>Studios</div>
    <div style={{position:'absolute',right:48,top:560,display:'flex',alignItems:'center',gap:20,fontFamily:'Chillax',fontWeight:600,fontSize:39,lineHeight:1,letterSpacing:'-.035em',color:'#2B2521'}}>
      <svg width="52" height="34" viewBox="0 0 52 34" fill="none" stroke="#315DAD" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="m14 7-10 10 10 10m24-20 10 10-10 10M30 3l-8 28"/></svg>
      Software &amp; design
    </div>
  </AbsoluteFill>;
};
const Root = () => <Composition id="StudioOG" component={StudioCard} durationInFrames={90} fps={30} width={1200} height={630}/>;
registerRoot(Root);
