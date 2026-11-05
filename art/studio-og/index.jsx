import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Composition, Easing, Freeze, OffthreadVideo, continueRender, cancelRender, delayRender, interpolate, registerRoot, staticFile, useCurrentFrame} from 'remotion';

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
  const ease = {...clamp,easing:Easing.inOut(Easing.cubic)};
  const draft = interpolate(frame,[10,23],[0,1],ease);
  const handleY = 43+draft*84;
  const sourceFrame = Math.round(interpolate(frame,[0,10,23,32,71,89],[0,0,45,45,120,120],clamp));
  const selection = interpolate(frame,[0,7,10,23,28,89],[0,0,1,1,0,0],clamp);
  const cursorX = interpolate(frame,[0,8,23,31,35,46],[1208,1128,1128,610,610,830],ease);
  const cursorY = frame>=8 && frame<=23 ? handleY : interpolate(frame,[0,8,23,31,35,46],[18,43,127,557,557,625],ease);
  const cursorOpacity = interpolate(frame,[0,4,8,40,47,89],[0,0,1,1,0,0],clamp);
  const press = interpolate(frame,[29,32,35],[1,.93,1],clamp);
  const progress = interpolate(frame,[32,71],[0,1],clamp);
  const buttonOpacity = interpolate(frame,[0,20,26,73,77,89],[0,0,1,1,0,0],clamp);
  const studiosOpacity = interpolate(frame,[0,16,20,78,82,89],[1,1,0,0,1,1],clamp);
  const videoStyle = {width:'100%',height:'100%',objectFit:'cover'};
  return <AbsoluteFill style={{background:'#F7F3ED',overflow:'hidden'}}>
    <Freeze frame={sourceFrame}><OffthreadVideo src={staticFile('source-video.mp4')} muted style={videoStyle}/></Freeze>
    {frame>=84 && <AbsoluteFill style={{opacity:interpolate(frame,[84,89],[0,1],clamp)}}><Freeze frame={0}><OffthreadVideo src={staticFile('source-video.mp4')} muted style={videoStyle}/></Freeze></AbsoluteFill>}
    <svg viewBox="0 0 1200 630" style={{position:'absolute',inset:0,width:'100%',height:'100%'}}>
      <g fill="#F7F3ED" stroke="#315DAD" strokeWidth="3" opacity={selection}>
        <rect x="53" y={handleY} width="1075" height={486-handleY} fill="none"/>
        {[[53,handleY],[1128,handleY],[53,486],[1128,486]].map(([x,y],i)=><rect key={i} x={x-7} y={y-7} width="14" height="14"/>)}
      </g>
    </svg>
    <div style={{position:'absolute',left:465,top:534,width:270,height:68,borderRadius:34,background:'#315DAD',boxShadow:'0 5px 0 #203F79',overflow:'hidden',transform:`scale(${press})`,opacity:buttonOpacity,display:'flex',alignItems:'center',justifyContent:'center',gap:20,color:'#fff',fontFamily:'Chillax',fontWeight:600,fontSize:38,lineHeight:1}}>
      <div style={{position:'absolute',inset:0,background:'#203F79',transform:`scaleX(${progress})`,transformOrigin:'left'}}/>
      <svg width="42" height="32" viewBox="0 0 42 32" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{position:'relative'}}>
        {frame<71?<path d="m11 7-8 9 8 9m20-18 8 9-8 9M25 3l-8 26"/>:<path d="m8 17 9 9L35 6"/>}
      </svg>
      <span style={{position:'relative'}}>{frame<71?'Build':'Built'}</span>
    </div>
    <div style={{position:'absolute',left:0,right:0,top:537,textAlign:'center',fontFamily:'Chillax',fontWeight:600,fontSize:72,lineHeight:1,letterSpacing:'-.06em',color:'#2B2521',opacity:studiosOpacity}}>Studios</div>
    <svg viewBox="0 0 1200 630" style={{position:'absolute',inset:0,width:'100%',height:'100%',opacity:cursorOpacity}}>
      <path d="M0 0V32L8 24L15 39L23 35L16 21H28Z" fill="#315DAD" stroke="#F7F3ED" strokeWidth="3" strokeLinejoin="round" transform={`translate(${cursorX} ${cursorY}) scale(${frame>=29&&frame<=35?press:1})`}/>
    </svg>
  </AbsoluteFill>;
};
const Root = () => <Composition id="StudioOG" component={StudioCard} durationInFrames={90} fps={30} width={1200} height={630}/>;
registerRoot(Root);
