// The bounds describe the entire allowed family, never the current figure.
// Resizing the viewport may change pixels/unit; changing a parameter must not.
export function geometryFrame(kind,width,height){
 const bounds=kind==='trapezoid'?{minX:0,maxX:12,maxY:3*Math.sqrt(3)}:{minX:-5,maxX:13,maxY:5};
 const scale=Math.min((width-110)/(bounds.maxX-bounds.minX),(height-205)/bounds.maxY);
 const X=x=>width/2+(x-(bounds.minX+bounds.maxX)/2)*scale;
 const Y=y=>height/2+bounds.maxY/2*scale-y*scale;
 return {scale,X,Y};
}
