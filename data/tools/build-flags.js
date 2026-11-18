// Makes one small file per flag from data/flags.js (THE Geomingo flags), so a game downloads only the flags it shows
// instead of the whole 2 MB file (Héctor 2026-11-18, point 7 of the code review: "que carguen más rápido en el móvil").
//   node data/tools/build-flags.js     (run it after changing data/flags.js)
// Writes data/flags/<CODE>.svg for every code and data/flag-files.js, the tiny file the games load:
// FLAGS[code] there gives the address of that flag's file, like FLAGS[code] in data/flags.js gives its image.
// Then set flag-files.js?v= in the pages that load it to the version printed at the end.
const fs=require('fs'),path=require('path'),vm=require('vm');
const DATA=path.join(__dirname,'..'),OUT=path.join(DATA,'flags');
const box={};vm.runInNewContext(fs.readFileSync(path.join(DATA,'flags.js'),'utf8')+';this.FLAG_SVG=FLAG_SVG',box);
const S=box.FLAG_SVG,codes=Object.keys(S).sort();
fs.mkdirSync(OUT,{recursive:true});
for(const f of fs.readdirSync(OUT))if(f.endsWith('.svg')&&!S[f.slice(0,-4)])fs.unlinkSync(path.join(OUT,f));
let changed=0;
for(const k of codes){const p=path.join(OUT,k+'.svg');if(!fs.existsSync(p)||fs.readFileSync(p,'utf8')!==S[k]){fs.writeFileSync(p,S[k]);changed++}}
// the version changes only when a flag changes, so phones fetch the new file then and keep the old ones otherwise
const hash=require('crypto').createHash('sha1').update(codes.map(k=>k+S[k]).join('\n')).digest('hex').slice(0,10);
const js=
`// THE GEOMINGO FLAGS, one file each: data/flags/<CODE>.svg, made from data/flags.js by data/tools/build-flags.js (do not edit by hand).
// FLAGS[code] gives the address of the flag's image. The page shows at once without waiting for any flag; once it has loaded,
// the flags are fetched quietly in the background, a few at a time, so a stamp shows its flag straight away (Héctor 2026-11-18).
const FLAGS={};
(()=>{const s=document.currentScript,base=(s&&s.src?s.src:location.href).replace(/[^/]*$/,'')+'flags/',V='${hash}';
  for(const k of ${JSON.stringify(codes)})FLAGS[k]=base+k+'.svg?v='+V;
  const keep=[],warm=()=>{const q=Object.values(FLAGS);let i=0;
    const next=()=>{if(i>=q.length)return;const im=new Image();keep.push(im);im.onload=im.onerror=next;im.src=q[i++]};
    for(let n=0;n<6;n++)next()};
  if(document.readyState==='complete')setTimeout(warm,300);else addEventListener('load',()=>setTimeout(warm,300),{once:true})})();
`;
fs.writeFileSync(path.join(DATA,'flag-files.js'),js);
const pv=require('crypto').createHash('sha1').update(js).digest('hex').slice(0,10);
console.log(codes.length+' flags, '+changed+' files written; load it as flag-files.js?v='+pv);
