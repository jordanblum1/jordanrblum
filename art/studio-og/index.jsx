import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Composition, Img, cancelRender, continueRender, delayRender, interpolate, registerRoot, staticFile, useCurrentFrame} from 'remotion';

export const StudioCard = () => {
  const frame = useCurrentFrame();
  const phase = frame / 179 * Math.PI * 2;
  const clamp = {extrapolateLeft:'clamp', extrapolateRight:'clamp'};
  const alive = interpolate(frame, [45,57,130,145], [0,1,1,0], clamp);
  const birthday = interpolate(frame, [105,117,165,179], [0,1,1,0], clamp);
  const [fontHandle] = useState(() => delayRender('Load studio fonts'));
  useEffect(() => {
    Promise.all([
      new FontFace('Switzer', `url(${staticFile('switzer-400.woff2')})`).load(),
      new FontFace('Chillax', `url(${staticFile('chillax-600.woff2')})`, {weight: '600'}).load(),
    ]).then(fonts => {
      fonts.forEach(font => document.fonts.add(font));
      continueRender(fontHandle);
    }).catch(cancelRender);
  }, [fontHandle]);
  return <AbsoluteFill style={{background:'#F7F3ED', color:'#2B2521', overflow:'hidden', fontFamily:'Switzer'}}>
    <Img src={staticFile('city.webp')} style={{position:'absolute',left:0,bottom:-95,width:1200,height:675,objectFit:'cover',opacity:0.32,transform:`translateY(${Math.sin(phase)*2}px)`}} />
    <div style={{position:'absolute',inset:0,background:'linear-gradient(#F7F3ED 0%, #F7F3ED 30%, rgba(247,243,237,.75) 64%, rgba(247,243,237,0) 100%)'}} />
    <div style={{position:'absolute',left:70,top:70,width:440}}>
      <Img src={staticFile('blum.svg')} style={{width:310,height:156,objectFit:'contain',transform:`translateY(${Math.sin(phase)*2}px)`}} />
      <div style={{fontFamily:'Chillax',fontWeight:600,fontSize:51,lineHeight:1,letterSpacing:'-0.06em',marginLeft:59,marginTop:-12}}>Studios</div>
      <div style={{fontFamily:'Chillax',fontWeight:600,fontSize:49,lineHeight:1.13,letterSpacing:'-0.055em',marginTop:55}}>iOS apps.<br/>Web products.</div>
    </div>
    <div style={{position:'absolute',left:598,top:241,width:455,height:285,padding:14,background:'#DFE6DB',border:'1px solid #D3DACC',borderRadius:27,boxShadow:'0 20px 45px rgba(43,37,33,.12)',transform:`translateY(${Math.sin(phase)*9}px) rotate(${-5+Math.sin(phase)*0.6}deg)`}}>
      <div style={{height:20,display:'flex',gap:5,alignItems:'center',paddingLeft:3}}>{[0,1,2].map(dot=><span key={dot} style={{width:5,height:5,borderRadius:'50%',background:'#8F9F88'}}/>)}</div>
      <Img src={staticFile('web.webp')} style={{display:'block',width:'100%',height:230,objectFit:'contain',borderRadius:15,background:'#F7F3ED'}} />
    </div>
    <div style={{position:'absolute',left:921,top:75,width:214,height:440,transform:`translateY(${-Math.sin(phase)*11}px) rotate(${7-Math.sin(phase)*0.8}deg)`,filter:'drop-shadow(0 18px 17px rgba(43,37,33,.16))'}}>
      {[['phone.webp',1],['phone-alive.webp',alive],['phone-birthday.webp',birthday]].map(([src,opacity]) => <Img key={src} src={staticFile(src)} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'contain',opacity}} />)}
    </div>
  </AbsoluteFill>;
};
const Root = () => <Composition id="StudioOG" component={StudioCard} durationInFrames={180} fps={30} width={1200} height={630}/>;
registerRoot(Root);
