export function advanceLessonAnimation(position,direction,elapsed,rate,min,max,mode='once'){
 if(!(max>min)||!Number.isFinite(position)||!Number.isFinite(elapsed)||elapsed<0||!Number.isFinite(rate)||rate<=0)throw new Error('Invalid animation range');
 const travel=elapsed*rate;
 if(mode==='loop'){const width=max-min;return {position:min+((position-min+travel)%width+width)%width,direction:1,finished:false};}
 if(mode==='bounce'){
  const width=max-min,phase=(direction<0?2*width-(position-min):position-min)+travel,wrapped=((phase%(2*width))+2*width)%(2*width);
  return {position:min+(wrapped<=width?wrapped:2*width-wrapped),direction:wrapped<width?1:-1,finished:false};
 }
 return {position:Math.min(max,Math.max(min,position+travel)),direction:1,finished:position+travel>=max};
}
