// ML Kit returns blocks in reading order by column. Rebuild receipt rows
// from line coordinates, compensating for the paper's rotation first.
export function receiptText(result) {
 const lines=(result.blocks||[]).flatMap(b=>b.lines||[]);
 const slopes=lines.filter(l=>l.cornerPoints?.length===4).map(l=>{
  const [a,b]=l.cornerPoints;return b.x-a.x>10?(b.y-a.y)/(b.x-a.x):0;
 }).filter(n=>Number.isFinite(n)&&Math.abs(n)<.5).sort((a,b)=>a-b);
 const slope=slopes[Math.floor(slopes.length/2)]||0;
 const positioned=lines.map(l=>{
  const b=l.boundingBox,p=l.cornerPoints;
  if(!b)return null;
  const x=(b.left+b.right)/2,y=(b.top+b.bottom)/2;
  const height=p?.length===4?Math.hypot(p[3].x-p[0].x,p[3].y-p[0].y):b.bottom-b.top;
  return {text:l.text,x,y:y-slope*x,height};
 }).filter(l=>l&&Number.isFinite(l.y)&&l.height>0);
 if(!positioned.length)return String(result.text||'');
 // Mixed geometry must never silently discard unpositioned text.
 if(positioned.length!==lines.length)return String(result.text||'');
 const rows=[];
 for(const line of positioned.sort((a,b)=>a.y-b.y)){
  const row=rows.at(-1);
  if(row&&Math.abs(row.y-line.y)<Math.min(row.height,line.height)*.55)row.parts.push(line);
  else rows.push({y:line.y,height:line.height,parts:[line]});
 }
 return rows.map(r=>r.parts.sort((a,b)=>a.x-b.x).map(l=>l.text).join(' ')).join('\n');
}
