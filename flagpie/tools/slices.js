const fs=require('fs');const raw=JSON.parse(fs.readFileSync(process.argv[2]));
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const dist=(a,b)=>{const A=rgb(a),B=rgb(b);return Math.sqrt((A[0]-B[0])**2+(A[1]-B[1])**2+(A[2]-B[2])**2)};
function hsl(h){let [r,g,b]=rgb(h).map(v=>v/255);const mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2;let H=0,S=0;
  if(mx!==mn){const d=mx-mn;S=l>.5?d/(2-mx-mn):d/(mx+mn);H=mx===r?((g-b)/d+(g<b?6:0)):mx===g?(b-r)/d+2:(r-g)/d+4;H*=60}return [H,S,l]}
function base(h){const [H,S,L]=hsl(h);
  if(L>=0.9&&S<0.5||L>0.82&&S<0.25)return 'White';if(L<0.13)return 'Black';if(S<0.18)return 'Grey';
  if(H<16||H>=340)return (L<0.32?'Maroon':'Red');if(H<42)return L<0.4||S<0.5&&L<0.55?'Brown':'Orange';
  if(H<70)return L<0.4?'Olive':(S<0.55&&L<0.7?'Tan':'Yellow');if(H<165)return 'Green';if(H<200)return 'Turquoise';if(H<255)return L>0.6?'Light blue':'Blue';if(H<290)return 'Purple';return 'Pink'}
const out={},layout={};
for(const c in raw){const R=raw[c];let sl=R.pal.map((h,i)=>({h,n:R.cnt[i],idx:[i]})).filter(s=>s.n>0).sort((a,b)=>b.n-a.n);
  // 1 colours that are almost the same: one slice
  const m=[];for(const s of sl){const t=m.find(x=>dist(x.h,s.h)<30);if(t){t.n+=s.n;t.idx.push(...s.idx)}else m.push({...s})}
  // 2 tiny bits (under 0.5%): into the closest colour
  const big=m.filter(s=>s.n/R.tot>=0.005),small=m.filter(s=>s.n/R.tot<0.005);
  for(const s of small){let t=big[0],bd=1e9;for(const x of big){const d=dist(x.h,s.h);if(d<bd){bd=d;t=x}}t.n+=s.n;t.idx.push(...s.idx)}
  big.sort((a,b)=>b.n-a.n);
  // names: same name twice gets Dark / Light
  big.forEach(s=>s.nm=base(s.h));
  const by={};big.forEach(s=>(by[s.nm]=by[s.nm]||[]).push(s));
  for(const k in by)if(by[k].length>1){const g=by[k].sort((a,b)=>hsl(a.h)[2]-hsl(b.h)[2]);
    if(k==='White'||k==='Black'){g.forEach((s,i)=>{if(i)s.nm=k==='White'?'Off-white':'Dark grey'});continue}
    g.forEach((s,i)=>{if(g.length===2)s.nm=(i?'Light ':'Dark ')+k.toLowerCase();else s.nm=['Dark ','',"Light "][Math.min(i,2)]+(i===1?k:k.toLowerCase())})}
  big.forEach(s=>{s.nm=s.nm.charAt(0).toUpperCase()+s.nm.slice(1)});
  // percentages with one decimal that add up to exactly 100.0
  const tenths=big.map(s=>s.n/R.tot*1000),fl=tenths.map(Math.floor);let left=1000-fl.reduce((a,b)=>a+b,0);
  tenths.map((t,i)=>[t-fl[i],i]).sort((a,b)=>b[0]-a[0]).slice(0,left).forEach(([,i])=>fl[i]++);
  out[c]=big.map((s,i)=>[s.h,fl[i]/10,s.nm]);
  // stripes: rows (or columns) of one colour
  const G=R.grid,W=R.GW,H=R.GH,sliceOf=new Map();big.forEach((s,i)=>s.idx.forEach(j=>sliceOf.set(j,i)));
  const at=(x,y)=>sliceOf.get(G[y*W+x]);
  function bands(n,len,get){const dom=[];let uni=0;for(let a=0;a<n;a++){const ct={};for(let b=0;b<len;b++){const v=get(a,b);ct[v]=(ct[v]||0)+1}
      const [v,k]=Object.entries(ct).sort((p,q)=>q[1]-p[1])[0];dom.push(k/len>=0.98?v:null);if(k/len>=0.98)uni++}
    const seq=[];for(const v of dom)if(v!==null&&seq[seq.length-1]!==v)seq.push(v);return {share:uni/n,n:seq.length}}
  const hz=bands(H,W,(y,x)=>at(x,y)),vt=bands(W,H,(x,y)=>at(x,y));
  const lay=(b,dir)=>b.n+' '+dir+' stripes'+(b.share>=0.9?'':' and a design');
  layout[c]=hz.share>=0.25&&hz.n>=2&&hz.share>=vt.share?lay(hz,'horizontal'):vt.share>=0.25&&vt.n>=2?lay(vt,'vertical'):'No simple stripes'}
fs.writeFileSync(process.argv[3],JSON.stringify({out,layout}));
for(const k of (process.argv[4]||'').split(',').filter(Boolean))console.log(k,raw[k].n,'|',layout[k],'|',out[k].map(s=>s[2]+' '+s[1]).join(', '))
