const progress = (frame,start,end) => {
  const t = Math.max(0,Math.min(1,(frame-start)/(end-start)));
  return t*t*(3-2*t);
};

export const choreography = frame => {
  const place = progress(frame,6,22);
  return {
    mX:32*(1-place),
    mZ:34*(1-place),
    depth:.025+.975*progress(frame,28,47),
  };
};
