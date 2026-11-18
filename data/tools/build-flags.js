// Makes one small file per flag from data/flags.js (THE Geomingo flags), so a game downloads only the flags it shows
// instead of the whole 2 MB file (Héctor 2026-11-18, point 7 of the code review: "que carguen más rápido en el móvil").
//   node data/tools/build-flags.js     (run it after changing data/flags.js)
// Writes data/flags/<CODE>.svg for every code, data/flags.json (all of them, fetched after the page loads) and data/flag-files.js, the tiny file the games load:
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
fs.writeFileSync(path.join(DATA,'flags.json'),JSON.stringify(Object.fromEntries(codes.map(k=>[k,S[k]]))));
// the version changes only when a flag changes, so phones fetch the new file then and keep the old ones otherwise
const hash=require('crypto').createHash('sha1').update(codes.map(k=>k+S[k]).join('\n')).digest('hex').slice(0,10);
const js=
`// THE GEOMINGO FLAGS, one file each: data/flags/<CODE>.svg, made from data/flags.js by data/tools/build-flags.js (do not edit by hand).
// FLAGS[code] gives the address of the flag's image. The page shows at once without waiting for any flag; once it has loaded,
// all the flags come quietly in one download (data/flags.json), so a stamp shows its flag straight away (Héctor 2026-11-18).
const FLAGS={};
(()=>{const s=document.currentScript,base=(s&&s.src?s.src:location.href).replace(/[^/]*$/,'')+'flags/',V='${hash}';
  for(const k of ${JSON.stringify(codes)})FLAGS[k]=base+k+'.svg?v='+V;
  // then all the flags in one download (data/flags.json): from then on FLAGS[code] is the image itself, ready at once
  const warm=()=>fetch(base.slice(0,-6)+'flags.json?v='+V).then(r=>r.ok?r.json():null).then(J=>{if(!J)return;
    for(const k in J){let u;Object.defineProperty(FLAGS,k,{enumerable:true,configurable:true,get:()=>u||(u='data:image/svg+xml;utf8,'+encodeURIComponent(J[k]))})}}).catch(()=>{});
  if(document.readyState==='complete')setTimeout(warm,300);else addEventListener('load',()=>setTimeout(warm,300),{once:true})})();
`;
fs.writeFileSync(path.join(DATA,'flag-files.js'),js);
const pv=require('crypto').createHash('sha1').update(js).digest('hex').slice(0,10);
console.log(codes.length+' flags, '+changed+' files written; load it as flag-files.js?v='+pv);
