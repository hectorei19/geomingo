/* Compass: the five clue cities of a mystery capital.
   Each clue is another capital: how far it is from the mystery one and in which direction (seen from the mystery capital).
   Clue 1 is far (about 2.600 km, more for remote capitals), each next one closer, the last one near; the five sit in
   different directions round the compass. Only capitals with 300.000 people or more are used as clues (well known),
   unless a remote capital needs smaller ones. Uses CITIES from ../capitals/data.js. */
(function(){
const R=Math.PI/180;
function dist(a,b){const t=Math.sin((b.lat-a.lat)*R/2)**2+Math.cos(a.lat*R)*Math.cos(b.lat*R)*Math.sin((b.lon-a.lon)*R/2)**2;return 12742*Math.asin(Math.sqrt(Math.min(1,t)))}
function bearing(a,b){const y=Math.sin((b.lon-a.lon)*R)*Math.cos(b.lat*R),x=Math.cos(a.lat*R)*Math.sin(b.lat*R)-Math.sin(a.lat*R)*Math.cos(b.lat*R)*Math.cos((b.lon-a.lon)*R);return (Math.atan2(y,x)/R+360)%360}
const gap=(a,b)=>{const d=Math.abs(a-b)%360;return d>180?360-d:d};
const BIG=3e5,NC=5;
// the score of a set of clues (lower is better): each one near its target distance, well-known cities preferred
const cost=(o,tg,v,av)=>Math.abs(Math.log(o.d/tg))+(o.x.pop<BIG?.6:o.x.pop<1e6?.2:0)+(v?jit(v,o.x.c)+(av.includes(o.x.c)?AVOID:0):0);
// o.v (a capital's 2nd, 3rd… time in the daily, Héctor 2026-11-10): every city gets a small fixed nudge from v, so the
// best five are other cities and a capital that comes back has new clues; without o.v nothing changes
const JIT=1.2,AVOID=1; // o.avoid: the clue cities of its first time, pushed back so the new five are mostly other ones
function jit(v,c){let h=2166136261;const s=v+'|'+c;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0)/4294967296*JIT}
// [{c: city code, d: km (whole), b: degrees from north, clockwise}], far to near.
// A small search: clue by clue, keep the best partial sets (300, more when it is hard); the five must sit at least G degrees apart (45 if it can, less round remote capitals)
// o.pre: clue codes already on the compass (they stay, in order); o.skip: cities that can't be clues (wrong guesses)
function cluesFor(t,o){o=o||{};const pre=o.pre||[],skip=o.skip||[],v=o.v||0,av=o.avoid||[];
  const all=CITIES.filter(x=>x.c!==t.c&&(pre.includes(x.c)||!skip.includes(x.c))).map(x=>({x,d:dist(t,x),b:bearing(t,x)})).filter(o=>o.d>=40).sort((a,b)=>a.d-b.d);
  const big=all.filter(o=>o.x.pop>=BIG),near=Math.min(big[0].d,all[0].d*2);
  const start=Math.max(2600,near*2.5),end=Math.max(all[0].d,120),tg=i=>start*Math.pow(end/start,i/(NC-1));
  for(const [G,R] of [[45,4000],[40,6000],[35,6000],[30,9000],[25,9000],[15,20000],[0,20000]]){let beam=[{s:0,l:pre.map(c=>all.find(a=>a.x.c===c)).filter(Boolean)}];
    const pool=all.filter(o=>o.d<=Math.max(R,near*4)).slice(0,G<30?197:110);
    for(let i=beam[0].l.length;i<NC;i++){const nb=[];
      for(const st of beam){const last=st.l[st.l.length-1];
        for(const o of pool){if(st.l.includes(o)||last&&o.d>last.d/1.15)continue;if(st.l.some(p=>gap(p.b,o.b)<G))continue;
          nb.push({s:st.s+cost(o,tg(i),v,av),l:st.l.concat(o)})}}
      nb.sort((a,b)=>a.s-b.s);beam=nb.slice(0,G<30?2000:300);if(!beam.length)break}
    if(beam.length&&beam[0].l.length===NC)return beam[0].l.map(o=>({c:o.x.c,d:Math.round(o.d),b:Math.round(o.b)}))}
  return []}
const C8=['north','north-east','east','south-east','south','south-west','west','north-west'];
const dirWord=b=>C8[Math.round(b/45)%8];
window.COMPASS={dist,bearing,gap,cluesFor,dirWord};
})();
