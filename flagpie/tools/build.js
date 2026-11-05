// node tools/build.js pies.json > ../pies.js : PIE, LAY, SAME (every colour within 1,5 points) and UNIQ (no other flag within 3)
const fs=require('fs');const {out,layout}=JSON.parse(fs.readFileSync(process.argv[2]));const ks=Object.keys(out).sort();
const sig=k=>{const m={};for(const [h,p,n] of out[k]){const b=n.replace(/^(Dark|Light) /i,'').replace('Off-white','White').replace(/^./,x=>x.toUpperCase());m[b]=(m[b]||0)+p}return m};
const S=Object.fromEntries(ks.map(k=>[k,sig(k)]));
const like=(a,b,t)=>{const A=S[a],B=S[b];for(const n of new Set([...Object.keys(A),...Object.keys(B)]))if(Math.abs((A[n]||0)-(B[n]||0))>t)return false;return true};
const SAME={},UNIQ=[];for(const a of ks){const s=ks.filter(b=>b!==a&&like(a,b,1.5));if(s.length)SAME[a]=s;if(!ks.some(b=>b!==a&&like(a,b,3)))UNIQ.push(a)}
let js='// Flag Pie: how much of each flag every colour covers, measured once (see flagpie/README.md).\n// PIE[code] = [[colour, % of the flag, name], …] biggest first, adding up to 100. LAY: the stripes. SAME: flags with the same pie\n// (every colour within 1,5 points), all right answers. UNIQ: flags with no near twin (within 3 points), the daily ones.\n';
js+='const PIE={\n'+ks.map(k=>k+':'+JSON.stringify(out[k])).join(',\n')+'};\n';
js+='const LAY='+JSON.stringify(Object.fromEntries(ks.map(k=>[k,layout[k]])))+';\n';
js+='const SAME='+JSON.stringify(SAME)+';\n';js+='const UNIQ='+JSON.stringify(UNIQ)+';\n';
process.stdout.write(js);
