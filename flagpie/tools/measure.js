// Precise colour shares of every country flag (official proportions, svg-country-flags, public domain)
const {chromium}=require('playwright');const fs=require('fs');const vm=require('vm');
const REPO=process.argv[2],SVGDIR=process.argv[3],OUT=process.argv[4];
const src=fs.readFileSync(REPO+'/shared/data.js','utf8');
const ctx={window:{},document:{},navigator:{},localStorage:{getItem(){},setItem(){}}};vm.createContext(ctx);
vm.runInContext(src.replace(/^const /gm,'var ').replace(/^let /gm,'var '),ctx);
const C=ctx.C.filter(c=>!c.t);
const iso2=c=>[...c.f].map(ch=>String.fromCharCode(ch.codePointAt(0)-0x1F1E6+97)).join('');
const NAMED={white:'#ffffff',black:'#000000',red:'#ff0000',green:'#008000',blue:'#0000ff',yellow:'#ffff00',navy:'#000080',gold:'#ffd700',orange:'#ffa500',maroon:'#800000',lime:'#00ff00',gray:'#808080',grey:'#808080',silver:'#c0c0c0',purple:'#800080',brown:'#a52a2a'};
function palette(svg){const s=new Set();
  for(const m of svg.matchAll(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g)){let h=m[1].toLowerCase();if(h.length===3)h=h.split('').map(x=>x+x).join('');s.add('#'+h)}
  for(const m of svg.matchAll(/rgb\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)/g))s.add('#'+[m[1],m[2],m[3]].map(v=>(+v).toString(16).padStart(2,'0')).join(''));
  for(const m of svg.matchAll(/(?:fill|stroke|stop-color|color)\s*[:=]\s*"?([a-z]+)/g))if(NAMED[m[1]])s.add(NAMED[m[1]]);
  // SVG draws a shape with no fill in black (Afghanistan's black stripe): black is always a possible colour
  s.add('#000000');
  return [...s]}
(async()=>{const b=await chromium.launch();const p=await b.newPage();const out={},miss=[];
for(const c of C){const k=c.c==='UNK'?'xk':iso2(c);const f=SVGDIR+'/'+k+'.svg';if(!fs.existsSync(f)){miss.push(c.c+' '+k);continue}
  const svg=fs.readFileSync(f,'utf8');const pal=palette(svg);
  const r=await p.evaluate(async({svg,pal})=>{
    const vb=(svg.match(/viewBox="([^"]+)"/)||[])[1];let w=0,h=0;
    if(vb){const v=vb.trim().split(/[ ,]+/).map(Number);w=v[2];h=v[3]}
    else{w=parseFloat((svg.match(/<svg[^>]*\swidth="([\d.]+)/)||[])[1]);h=parseFloat((svg.match(/<svg[^>]*\sheight="([\d.]+)/)||[])[1])}
    const W=1500,H=Math.round(W*h/w);
    const s2=svg.replace(/<svg\b/,`<svg width="${W}" height="${H}" preserveAspectRatio="none"`).replace(/(<svg[^>]*?)\swidth="[^"]*"([^>]*?)\swidth="/,'$1$2 data-w="');
    const img=new Image();img.src='data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(s2)));await img.decode();
    const cv=document.createElement('canvas');cv.width=W;cv.height=H;const x=cv.getContext('2d');x.drawImage(img,0,0,W,H);
    const d=x.getImageData(0,0,W,H).data;const P=pal.map(h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)]);
    const cnt=new Float64Array(P.length);const cache=new Map(),far=new Map();let tot=0,off=0;
    // small map of which colour each cell is, for the stripes clue (100 x rows)
    const GW=100,GH=Math.max(1,Math.round(GW*H/W)),grid=new Int16Array(GW*GH).fill(-1);
    for(let y=0;y<H;y++)for(let X=0;X<W;X++){const i=(y*W+X)*4,a=d[i+3]/255;if(a<0.02)continue;
      const key=d[i]<<16|d[i+1]<<8|d[i+2];let j=cache.get(key);
      if(j===undefined){let bd=1e9;j=0;for(let q=0;q<P.length;q++){const dd=(P[q][0]-d[i])**2+(P[q][1]-d[i+1])**2+(P[q][2]-d[i+2])**2;if(dd<bd){bd=dd;j=q}}cache.set(key,j);far.set(key,bd>60*60)}
      cnt[j]+=a;tot+=a;if(a>0.9&&far.get(key))off++;
      const gx=Math.floor(X*GW/W),gy=Math.floor(y*GH/H);if((X*GW)%W<GW&&(y*GH)%H<GH)grid[gy*GW+gx]=j}
    return {W,H,tot,off:off/tot,full:W*H,cnt:[...cnt],grid:[...grid],GW,GH}},{svg,pal});
  out[c.c]={k,n:c.n,pal,...r}}
await b.close();fs.writeFileSync(OUT,JSON.stringify(out));console.log('done',Object.keys(out).length,'missing',miss)})();
