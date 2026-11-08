/* ---- Impostor: the sentences ----
   Six countries a round. In each round one of them is the impostor: every sentence of that round is true for the other
   five and false for it. The sentences are made here from the same data as the other games (../shared/data.js:
   CATS, the yes/no traits of Connections and Countries; DATA and ../top10/extra-data.js XDATA, the figures of Top 10).
   - a trait the other five have and the impostor hasn't ("Its flag has a star"), or the other way round ("It is not in Africa")
   - a figure where the impostor is the highest or the lowest of the six ("More than 5 million people live there"),
     with a round number between the impostor and the closest of the other five
   Every sentence has a topic (two sentences about the same thing never go in one round) and an "ease" from 0 (hard)
   to 1 (obvious). A round has five sentences, shown from the hardest to the easiest.
   Only the independent countries (t:0 in C). */

// a trait: [topic, ease, sentence when the five HAVE it, sentence when the five DON'T (null: not used that way)]
const TRAITS={
  'In Africa':['cont',.95,'It is in Africa.','It is not in Africa.'],
  'In Europe':['cont',.95,'It is in Europe.','It is not in Europe.'],
  'In Asia':['cont',.95,'It is in Asia.','It is not in Asia.'],
  'In Oceania':['cont',.95,'It is in Oceania.','It is not in Oceania.'],
  'In North or Central America':['cont',.95,'It is in North or Central America.','It is not in North or Central America.'],
  'In South America':['cont',.95,'It is in South America.','It is not in South America.'],
  'Landlocked':['coast',.6,'It has no coast at all.','It has a coast.'],
  'Island nation (no land borders)':['nb',.6,'It has no land borders.','It shares a land border with at least one country.'],
  'Has 5+ land neighbours':['nb',.4,'It has 5 or more land neighbours.','It has fewer than 5 land neighbours.'],
  'Exactly 1 land neighbour':['nb',.4,'It has exactly one land neighbour.',null],
  'Exactly 2 land neighbours':['nb',.35,'It has exactly two land neighbours.',null],
  '3 or 4 land neighbours':['nb',.3,'It has 3 or 4 land neighbours.',null],
  'Centre south of the Equator':['lat',.55,'Its centre is south of the Equator.','Its centre is north of the Equator.'],
  'Centre in the tropics':['lat',.45,'Its centre lies in the tropics.','Its centre lies outside the tropics.'],
  'Centre north of 45°N':['lat',.4,'Its centre is north of 45° N.','Its centre is south of 45° N.'],
  'Crossed by the Equator':['lat',.45,'The Equator crosses it.','The Equator doesn\'t cross it.'],
  'Has nuclear power plants':['nuke',.3,'It makes electricity with nuclear power.','It has no working nuclear power plant.'],
  'Has nuclear weapons':['nukes',.5,'It has nuclear weapons.','It has no nuclear weapons.'],
  'Arab League member':['club',.6,'It is a member of the Arab League.','It is not in the Arab League.'],
  'ASEAN member':['club',.5,'It is a member of ASEAN (Southeast Asian nations).','It is not in ASEAN (Southeast Asian nations).'],
  'APEC member':['club',.3,'It is a member of APEC (Asia-Pacific Economic Cooperation).','It is not in APEC (Asia-Pacific Economic Cooperation).'],
  'Antarctic Treaty party':['club',.15,'It has signed the Antarctic Treaty.','It has not signed the Antarctic Treaty.'],
  'No standing army':['army',.3,'It has no army.','It has an army.'],
  'Has a metro system':['metro',.3,'It has a metro system.','It has no metro system.'],
  'Independence from the UK':['indep',.4,'It became independent from the United Kingdom.','It did not become independent from the United Kingdom.'],
  'Independence from Spain':['indep',.45,'It became independent from Spain.','It did not become independent from Spain.'],
  'Took part in Eurovision':['euro',.4,'It has taken part in Eurovision.','It has never taken part in Eurovision.'],
  'Drives on the left':['drive',.45,'People drive on the left.','People drive on the right.'],
  'Official language: English':['lang',.65,'English is an official language there.','English is not an official language there.'],
  'Official language: French':['lang',.65,'French is an official language there.','French is not an official language there.'],
  'Official language: Spanish':['lang',.7,'Spanish is an official language there.','Spanish is not an official language there.'],
  'Official language: Arabic':['lang',.7,'Arabic is an official language there.','Arabic is not an official language there.'],
  'Official language: Portuguese':['lang',.7,'Portuguese is an official language there.','Portuguese is not an official language there.'],
  'Uses the euro':['money',.65,'It pays in euros.','It doesn\'t use the euro.'],
  'Currency called "dollar"':['money',.5,'Its money is called the dollar.','Its money is not called the dollar.'],
  'Flag has blue':['flag',.55,'Its flag has blue.','Its flag has no blue.'],
  'Flag has green':['flag',.55,'Its flag has green.','Its flag has no green.'],
  'Flag has yellow or gold':['flag',.55,'Its flag has yellow or gold.','Its flag has no yellow or gold.'],
  'Flag has black':['flag',.5,'Its flag has black.','Its flag has no black.'],
  'Flag has orange':['flag',.5,'Its flag has orange.','Its flag has no orange.'],
  'No red on the flag':['flag',.55,'Its flag has no red.','Its flag has red.'],
  'Flag of exactly 2 colours':['flag',.45,'Its flag has exactly 2 colours.',null],
  'Flag of exactly 3 colours':['flag',.4,'Its flag has exactly 3 colours.',null],
  'Flag has a star':['flag',.6,'Its flag has a star.','Its flag has no star.'],
  'Flag has a crescent moon':['flag',.6,'Its flag has a crescent moon.','Its flag has no crescent moon.'],
  'Flag has a sun':['flag',.55,'Its flag has a sun.','Its flag has no sun.'],
  'Flag has a cross':['flag',.6,'Its flag has a cross.','Its flag has no cross.'],
  'Flag has the Union Jack':['flag',.65,'Its flag has the Union Jack.','Its flag has no Union Jack.'],
  'Flag has a coat of arms or seal':['flag',.45,'Its flag has a coat of arms or a seal.','Its flag has no coat of arms or seal.'],
  'Flag has an animal':['flag',.5,'Its flag has an animal.','Its flag has no animal.'],
  'Coast on the Mediterranean':['sea',.55,'It has a coast on the Mediterranean.','It has no coast on the Mediterranean.'],
  'Coast on the Caribbean Sea':['sea',.5,'It has a coast on the Caribbean Sea.','It has no coast on the Caribbean Sea.'],
  'Coast on the Baltic Sea':['sea',.5,'It has a coast on the Baltic Sea.','It has no coast on the Baltic Sea.'],
  'Coast on the Black Sea':['sea',.5,'It has a coast on the Black Sea.','It has no coast on the Black Sea.'],
  'Coast on the Red Sea':['sea',.45,'It has a coast on the Red Sea.','It has no coast on the Red Sea.'],
  'Coast on the Persian Gulf':['sea',.45,'It has a coast on the Persian Gulf.','It has no coast on the Persian Gulf.'],
  'Coast on the Caspian Sea':['sea',.4,'It has a coast on the Caspian Sea.','It has no coast on the Caspian Sea.'],
  'Coast on the North Sea':['sea',.45,'It has a coast on the North Sea.','It has no coast on the North Sea.'],
  'EU member':['club',.6,'It is in the European Union.','It is not in the European Union.'],
  'NATO member':['club',.5,'It is in NATO.','It is not in NATO.'],
  'Commonwealth member':['club',.4,'It is in the Commonwealth.','It is not in the Commonwealth.'],
  'G20 member':['club',.45,'It is in the G20.','It is not in the G20.'],
  'OPEC member':['club',.4,'It is in OPEC, the oil exporters\' group.','It is not in OPEC, the oil exporters\' group.'],
  'Monarchy':['king',.45,'It has a king, queen, emperor or other monarch.','It has no king, queen or other monarch.'],
  'Former Soviet republic':['ussr',.55,'It was part of the Soviet Union.','It was never part of the Soviet Union.'],
  'Hosted the Summer Olympics':['host',.45,'It has hosted the Summer Olympics.','It has never hosted the Summer Olympics.'],
  'Hosted the Winter Olympics':['host',.4,'It has hosted the Winter Olympics.','It has never hosted the Winter Olympics.'],
  'Hosted the men\'s World Cup':['host',.45,'It has hosted the men\'s football World Cup.','It has never hosted the men\'s football World Cup.'],
  'Won the men\'s World Cup':['wcwin',.5,'It has won the men\'s football World Cup.','It has never won the men\'s football World Cup.'],
  'Hosts a Formula 1 race (2026)':['f1',.4,'It has a Formula 1 Grand Prix in 2026.','It has no Formula 1 Grand Prix in 2026.']};
// borders: "Borders China" and so on
const BORDER_EASE=.55;
// at most this many sentences about one topic in a round (the rest: one)
const TOPIC_MAX={flag:2,club:2};

/* a figure: [topic, ease, value of a country, text when the five are ABOVE (the impostor is the lowest),
   text when the five are BELOW, how the number is written, smallest gap that counts (ratio, or a difference with d:)] */
const fnum=(n,d)=>Number(n).toLocaleString('de-DE',d==null?{maximumFractionDigits:3}:{minimumFractionDigits:d,maximumFractionDigits:d});
const fpop=n=>n>=1e9?fnum(+(n/1e9).toFixed(2))+' billion':n>=1e6?fnum(+(n/1e6).toFixed(n>=1e8?0:1))+' million':n>=1e4?fnum(Math.round(n/1e3)*1e3):fnum(n);
const flat=v=>v===0?'the Equator':fnum(Math.abs(v))+'° '+(v>0?'N':'S');
const fig=(k,fill)=>c=>{const v=DATA[k]&&DATA[k][c.c];if(typeof v==='number')return v;const f=fill&&fill[k]&&fill[k][c.c];return typeof f==='number'?f:undefined};
const xfig=k=>c=>{const v=XDATA[k]&&XDATA[k][c.c];return typeof v==='number'?v:undefined};
const zero=f=>c=>{const v=f(c);return v===undefined?0:v};
const FIGS=[
  ['pop',.5,fig('pop'),x=>`More than ${fpop(x)} people live there.`,x=>`Fewer than ${fpop(x)} people live there.`,fpop,{r:1.15},v=>fpop(Math.round(v))+' people'],
  ['area',.5,c=>c.a||undefined,x=>`It is bigger than ${fnum(x)} km².`,x=>`It is smaller than ${fnum(x)} km².`,fnum,{r:1.15},v=>fnum(Math.round(v))+' km²'],
  ['lat',.4,c=>typeof c.lat==='number'?c.lat:undefined,x=>`Its centre is north of ${flat(x)}.`,x=>`Its centre is south of ${flat(x)}.`,flat,{d:3},v=>'centre at '+flat(Math.round(v*10)/10)],
  ['gdp',.4,fig('gdp'),x=>`It makes more than ${fnum(x)} US dollars per person a year (GDP).`,x=>`It makes less than ${fnum(x)} US dollars per person a year (GDP).`,fnum,{r:1.25},v=>fnum(Math.round(v))+' US dollars per person'],
  ['life',.35,fig('life',typeof XFILL!=='undefined'?XFILL:null),x=>`People live more than ${fnum(x)} years on average.`,x=>`People live less than ${fnum(x)} years on average.`,fnum,{d:2},v=>fnum(v,1)+' years on average'],
  ['hdi',.3,fig('hdi'),x=>`Its Human Development Index (0 to 1) is over ${fnum(x)}.`,x=>`Its Human Development Index (0 to 1) is under ${fnum(x)}.`,fnum,{d:.03},v=>'HDI '+fnum(v,3)],
  ['age',.3,fig('age'),x=>`Half the people there are older than ${fnum(x)}.`,x=>`Half the people there are younger than ${fnum(x)}.`,fnum,{d:2},v=>'median age '+fnum(v,1)],
  ['cpi',.2,fig('cpi'),x=>`It scores over ${fnum(x)} out of 100 in the corruption index (higher is cleaner).`,x=>`It scores under ${fnum(x)} out of 100 in the corruption index (higher is cleaner).`,fnum,{d:5},v=>fnum(v)+' out of 100 in the corruption index'],
  ['co2',.25,fig('co2',typeof XFILL!=='undefined'?XFILL:null),x=>`Each person puts out more than ${fnum(x)} t of CO₂ a year.`,x=>`Each person puts out less than ${fnum(x)} t of CO₂ a year.`,fnum,{r:1.3},v=>fnum(v,1)+' t of CO₂ per person'],
  ['urban',.25,fig('urban'),x=>`More than ${fnum(x)} % of people live in towns and cities.`,x=>`Less than ${fnum(x)} % of people live in towns and cities.`,fnum,{d:5},v=>fnum(Math.round(v))+' % in towns and cities'],
  ['coast',.3,c=>{const v=DATA.coast[c.c];return typeof v==='number'&&v>0?v:undefined},x=>`Its coastline is longer than ${fnum(x)} km.`,x=>`Its coastline is shorter than ${fnum(x)} km.`,fnum,{r:1.3},v=>fnum(Math.round(v))+' km of coast'],
  ['elev',.3,fig('elev',typeof XFILL!=='undefined'?XFILL:null),x=>`Its highest point is over ${fnum(x)} m.`,x=>`Its highest point is under ${fnum(x)} m.`,fnum,{r:1.2},v=>'highest point '+fnum(Math.round(v))+' m'],
  ['forest',.25,fig('forest'),x=>`Forest covers more than ${fnum(x)} % of it.`,x=>`Forest covers less than ${fnum(x)} % of it.`,fnum,{d:5},v=>fnum(v,1)+' % forest'],
  ['temp',.3,xfig('temp'),x=>`Its average yearly temperature is over ${fnum(x)} °C.`,x=>`Its average yearly temperature is under ${fnum(x)} °C.`,fnum,{d:2},v=>fnum(v,1)+' °C a year on average'],
  ['capital',.3,c=>DATA.cap_skip.includes(c.c)?undefined:fig('cappop')(c),x=>`More than ${fpop(x)} people live in its capital.`,x=>`Fewer than ${fpop(x)} people live in its capital.`,fpop,{r:1.3},v=>fpop(Math.round(v))+' people in the capital'],
  ['olymp',.35,zero(fig('olymp')),x=>x<1?'It has won at least one Olympic medal.':`It has won more than ${fnum(x)} Olympic medals.`,x=>`It has won fewer than ${fnum(x)} Olympic medals.`,fnum,{r:1.3,z:1},v=>fnum(v)+' Olympic medal'+(v===1?'':'s')],
  ['olymp',.3,zero(xfig('ogold')),x=>x<1?'It has won at least one Olympic gold medal.':`It has won more than ${fnum(x)} Olympic gold medals.`,x=>`It has won fewer than ${fnum(x)} Olympic gold medals.`,fnum,{r:1.3,z:1},v=>fnum(v)+' Olympic gold medal'+(v===1?'':'s')],
  ['wc',.4,zero(xfig('wc')),x=>x<1?'It has played at least one men\'s football World Cup.':`It has played more than ${fnum(x)} men's football World Cups.`,x=>`It has played fewer than ${fnum(x)} men's football World Cups.`,fnum,{r:1.3,z:1},v=>v?'played '+fnum(v)+' World Cup'+(v===1?'':'s'):'never played a World Cup'],
  ['nobel',.2,zero(xfig('nobel')),x=>x<1?'At least one Nobel Prize winner comes from there.':`More than ${fnum(x)} Nobel Prize winners come from there.`,x=>`Fewer than ${fnum(x)} Nobel Prize winners come from there.`,fnum,{r:1.4,z:1},v=>fnum(v)+' Nobel Prize winner'+(v===1?'':'s')]];

// the roundest number strictly between a and b (a < b): 5 million rather than 5.381.204
function roundBetween(a,b){for(let p=12;p>=-3;p--)for(const m of [5,2,1]){const s=m*Math.pow(10,p);
    const t=Math.round((Math.floor(a/s)+1)*s*1e6)/1e6;if(t>a&&t<b)return t}return null}
const roundLat=(a,b)=>{for(const s of [10,5,1]){const t=(Math.floor(a/s)+1)*s;if(t>a&&t<b)return t}return null};

const IMP_COUNTRIES=C.filter(c=>!c.t);
const impIdx=Object.fromEntries(C.map((c,i)=>[c.c,i]));
const impByCode=Object.fromEntries(IMP_COUNTRIES.map(c=>[c.c,c]));

// every sentence for a group of six: {CODE: [{t: text, topic, e: ease, v: what the impostor really has (or '')}]}
function allFacts(codes){const cs=codes.map(c=>impByCode[c]),out=Object.fromEntries(codes.map(c=>[c,[]]));
  for(const k of CATS){let tr=TRAITS[k.label],m;
    if(!tr&&(m=/^Borders (.+)$/.exec(k.label)))tr=['border',BORDER_EASE,'It shares a land border with '+m[1]+'.','It does not border '+m[1]+'.'];
    if(!tr)continue;
    const has=cs.map(c=>!!k.set[impIdx[c.c]]),n=has.filter(Boolean).length;
    // a border sentence never about the neighbour itself ("It does not border China" with China among the six is fine)
    if(n===5&&tr[2])out[cs[has.indexOf(false)].c].push({t:tr[2],topic:tr[0],e:tr[1],v:''});
    if(n===1&&tr[3])out[cs[has.indexOf(true)].c].push({t:tr[3],topic:tr[0],e:tr[1],v:''})}
  for(const [topic,e,val,above,below,,gap,show] of FIGS){const v=cs.map(val);if(v.some(x=>x===undefined))continue;
    const s=[...v].sort((a,b)=>a-b),far=(a,b)=>gap.d!=null?b-a>=gap.d:(a<=0?(gap.z?b>0:false):b/a>=gap.r);
    const bonus=(a,b)=>gap.d!=null?Math.min(.3,(b-a)/gap.d*.05):a<=0?.3:Math.min(.3,Math.log10(b/a)*.3);
    const R=topic==='lat'?roundLat:roundBetween;
    if(s[0]<s[1]&&far(s[0],s[1])){const x=gap.z&&s[0]<=0?0:R(s[0],s[1]);if(x!=null){const i=v.indexOf(s[0]);out[cs[i].c].push({t:above(x),topic,e:e+bonus(s[0],s[1]),v:show(s[0])})}}
    if(s[5]>s[4]&&far(s[4],s[5])){const x=R(s[4],s[5]);if(x!=null){const i=v.indexOf(s[5]);out[cs[i].c].push({t:below(x),topic,e:e+bonus(s[4],s[5]),v:show(s[5])})}}}
  return out}

// five sentences for one impostor, from hardest to easiest, never two on the same topic (flags and clubs: two);
// spread over the range: the hardest there is, the easiest, and three between. r: a random number function.
function pickFive(list,r){const L=shuffle(list,r).sort((a,b)=>a.e-b.e),used={},out=[];
  const ok=f=>(used[f.topic]||0)<(TOPIC_MAX[f.topic]||1);
  const take=f=>{used[f.topic]=(used[f.topic]||0)+1;out.push(f)};
  for(const q of [0,1,.25,.75,.5]){const want=q*(L.length-1);let best=null,bd=1e9;
    L.forEach((f,i)=>{if(out.includes(f)||!ok(f))return;const d=Math.abs(i-want);if(d<bd){bd=d;best=f}});if(best)take(best)}
  return out.length===5?out.sort((a,b)=>a.e-b.e):null}

// one round: six countries and the impostor among them, or null when no country of the six has five sentences
function buildRound(codes,r){const F=allFacts(codes);
  for(const c of shuffle(codes,r)){const f=pickFive(F[c],r);if(f)return {set:codes,c,f:f.map(x=>({t:x.t,v:x.v}))}}return null}

// a whole game: six rounds, each with six new countries (Héctor, 2026-11-08: the same six all game was boring),
// so no country shows up twice in a game. r: a random number function (seeded for the daily).
function dealGame(pool,r){const used=new Set(),rounds=[];
  while(rounds.length<6){let got=null;
    for(let n=0;n<400&&!got;n++)got=buildRound(shuffle(pool.filter(c=>!used.has(c)),r).slice(0,6),r);
    if(!got)return null;got.set.forEach(c=>used.add(c));rounds.push(got)}
  return {rounds}}
