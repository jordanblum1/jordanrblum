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
  const videoStyle = {width:'100%',height:'100%',objectFit:'cover'};
  return <AbsoluteFill style={{background:'#F7F3ED',overflow:'hidden'}}>
    <OffthreadVideo src={staticFile('source-video.mp4')} muted playbackRate={4/3} style={videoStyle}/>
    {frame>=84 && <AbsoluteFill style={{opacity:interpolate(frame,[84,89],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'})}}><Freeze frame={0}><OffthreadVideo src={staticFile('source-video.mp4')} muted playbackRate={4/3} style={videoStyle}/></Freeze></AbsoluteFill>}
    <div style={{position:'absolute',left:0,right:0,top:540,textAlign:'center',fontFamily:'Chillax',fontWeight:600,fontSize:72,lineHeight:1,letterSpacing:'-.06em',color:'#2B2521'}}>Studios</div>
  </AbsoluteFill>;
};
const Root = () => <Composition id="StudioOG" component={StudioCard} durationInFrames={90} fps={30} width={1200} height={630}/>;
registerRoot(Root);
