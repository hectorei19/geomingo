/* Geomingo: Mingo, the GeoPass, the shared header, the result card and the list of games.
   Every page loads it in its <head> (before its own scripts) from ../brand/mingo.js, so the saved
   light/dark choice is applied before anything is drawn. Everything lives in window.Geomingo. */
/* European number format everywhere (Héctor, 2026-11-02): a dot for thousands and a comma for decimals,
   4.964 km, 83,7 years. EU(n) keeps up to 3 decimals, EU(n,1) always 1. EUT(text) turns '10,000' and '0.9' in a
   written label into '10.000' and '0,9' (only for showing it: the labels stay the same inside the games). */
window.EU=(n,d)=>Number(n||0).toLocaleString('de-DE',d==null?{maximumFractionDigits:3}:{minimumFractionDigits:d,maximumFractionDigits:d});
window.EUT=s=>String(s).replace(/(\d),(?=\d{3}(?!\d))/g,'$1\u0001').replace(/(\d)\.(?=\d)/g,'$1,').replace(/\u0001/g,'.');
(function(){
'use strict';
const SRC=document.currentScript&&document.currentScript.src||location.href;
const HOME=new URL('../',SRC).href;          // the Geomingo home page (geomingo.com/)
const ROOT=HOME;                             // the games live in folders of the home page

/* ---------- light / dark: the choice is kept for every game (gm-theme) ---------- */
const store={get:k=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,v)}catch(e){}}};
// Geomingo is dark only (Héctor, 2026-10-24): the light tokens stay in the CSS but are never used
function applyTheme(){document.documentElement.setAttribute('data-theme','dark')}
applyTheme();
function currentTheme(){return 'dark'}
function toggleTheme(){const next=currentTheme()==='dark'?'light':'dark';store.set('gm-theme',next);applyTheme();
  document.querySelectorAll('[data-gm-theme]').forEach(b=>b.setAttribute('aria-pressed',String(next==='dark')))}

/* ---------- the games, each one a trip ----------
   id: the id each game already uses for its saves (Countries kept Borderline's), soon: shown as "Coming soon" */
const GAMES=[
  {id:'borderline',name:'Countries',path:'countries/',gate:'1',hint:'Fill the grid with countries'},
  {id:'citygrid',name:'Capitals',path:'capitals/',gate:'2',hint:'Fill the grid with capitals'},
  {id:'connections',name:'Connections',path:'connections/',gate:'3',hint:'Find 4 hidden groups'},
  {id:'top10',name:'Top 10',path:'top10/',gate:'4',hint:'Name the top 10 countries'},
  {id:'silhouette',name:'Silhouette',path:'silhouette/',gate:'5',hint:'Guess the hidden country'},
  {id:'customs',name:'Customs',path:'customs/',gate:'6',hint:'Guess the country from clues',nofriends:1}];
GAMES.forEach(g=>g.href=ROOT+g.path);
const live=()=>GAMES.filter(g=>!g.soon);
const game=id=>GAMES.find(g=>g.id===id);

// Spain's calendar day: every daily puzzle changes at midnight, Madrid time
function madridParts(t){const o={};new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(t).forEach(p=>o[p.type]=p.value);return o}
function dayKey(t){const p=madridParts(t==null?Date.now():t);return p.year+'-'+p.month+'-'+p.day}
function msToMidnight(){const p=madridParts(Date.now());return (24*3600-(+p.hour*3600+ +p.minute*60+ +p.second))*1000}
// '24 Oct 2026', 'Sat 24 Oct', 'Sat'
const dateText=(k,o)=>new Date(k+'T12:00Z').toLocaleDateString('en-GB',Object.assign({timeZone:'UTC'},o||{day:'numeric',month:'short',year:'numeric'})).replace(',','');
const json=k=>{try{return JSON.parse(store.get(k)||'null')}catch(e){return null}};
const fmt=n=>EU(Math.round(Number(n||0)));

/* today's result of each game, read from the game's own save on this device (the keys never change):
   {done:true, label:'1,240'} once today's daily is over */
function result(id,k){k=k||dayKey();
  if(id==='borderline'||id==='citygrid'){const p=id==='borderline'?'bl':'cc',h=json(p+'-hist')||{},e=h[k];
    if(e&&e.f!==0)return {done:true,label:fmt(e.s)};
    const d=json(p+'-daily');if(d&&d.date===k&&d.S&&d.S.over)return {done:true,label:fmt(d.S.players&&d.S.players[0]?d.S.players[0].score:0)};
    return {done:false}}
  if(id==='connections'){const d=json('cx-daily');if(!(d&&d.date===k&&d.over))return {done:false};
    const s=d.S||{};return {done:true,label:s.won?'Solved':((s.found||[]).length+'/4')}}
  if(id==='top10'){const d=json('t10-daily');if(!(d&&d.date===k&&d.over))return {done:false};
    return {done:true,label:((d.S&&d.S.found||[]).length)+'/10'}}
  if(id==='silhouette'){const d=json('sil-daily');if(!(d&&d.date===k&&d.over))return {done:false};
    const day=(json('sil-hist')||{})[k]||{},v=Object.values(day).filter(x=>typeof x==='number');
    return {done:true,label:v.length?Math.max(...v)+'/9':'Done'}}
  if(id==='customs'){const d=json('cu-daily');if(!(d&&d.date===k&&d.over&&d.S))return {done:false};
    return {done:true,label:(d.S.qs||[]).reduce((n,q)=>n+(q.st==='right'?6-q.k:0),0)+'/25'}}
  return {done:false}}
const playedToday=id=>result(id).done;
// the next game of the day not played yet, in list order after this one (null when all are done)
function nextGame(cur){const L=live(),i=L.findIndex(g=>g.id===cur);
  for(let s=1;s<=L.length;s++){const g=L[(i+s)%L.length];if(g.id!==cur&&!playedToday(g.id))return g}return null}

/* ---------- streak: days in a row with at least one daily game played (gm-days) ----------
   The first time, it is filled in from the games' own histories on this device, so nobody starts from zero. */
function days(){let d=json('gm-days');
  if(!Array.isArray(d)){const s=new Set();
    ['bl-hist','cc-hist'].forEach(k=>{const h=json(k)||{};Object.keys(h).forEach(x=>{if(h[x]&&h[x].f!==0)s.add(x)})});
    ['cx-hist','t10-hist','sil-hist','cu-hist'].forEach(k=>Object.keys(json(k)||{}).forEach(x=>s.add(x)));
    d=[...s].filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x)).sort()}
  const k=dayKey();
  if(!d.includes(k)&&GAMES.some(g=>playedToday(g.id)))d.push(k);
  d=d.sort().slice(-400);store.set('gm-days',JSON.stringify(d));return d}
function streak(){const n=k=>Math.round(Date.parse(k+'T12:00Z')/864e5),set=new Set(days().map(n)),t=n(dayKey());
  let x=set.has(t)?t:t-1,c=0;while(set.has(x)){c++;x--}return c}

/* ---------- the GeoPass: every right answer is a stamp (gm-pass) ----------
   {n: stamps in all, since: first day, list: the latest stamps [{g: game id, t: name, s: small text, d: day}]}
   The first time, n is filled in from the games' histories on this device (one stamp per right answer). */
function seedCount(){let n=0,first=null;const see=k=>{if(/^\d{4}-\d{2}-\d{2}$/.test(k)&&(!first||k<first))first=k};
  ['bl-hist','cc-hist'].forEach(k=>{const h=json(k)||{};Object.keys(h).forEach(x=>{const e=h[x];if(e&&e.f!==0){n+=+e.c||0;see(x)}})});
  const cx=json('cx-hist')||{};Object.keys(cx).forEach(x=>{n+=cx[x]&&cx[x].w?4:0;see(x)});
  const t=json('t10-hist')||{};Object.keys(t).forEach(x=>{n+=+(t[x]&&t[x].f)||0;see(x)});
  const s=json('sil-hist')||{};Object.keys(s).forEach(x=>{Object.values(s[x]||{}).forEach(v=>{if(typeof v==='number')n+=v});see(x)});
  const u=json('cu-hist')||{};Object.keys(u).forEach(x=>{n+=+(u[x]&&u[x].r)||0;see(x)});
  return {n,first}}
function pass(){let p=json('gm-pass');
  if(!p||typeof p.n!=='number'){const s=seedCount();p={n:s.n,since:s.first||dayKey(),list:[]};store.set('gm-pass',JSON.stringify(p))}
  if(!Array.isArray(p.list))p.list=[];return p}
const hsh=s=>{let h=7;for(const ch of String(s))h=(h*31+ch.charCodeAt(0))%9973;return h};
const INK=['var(--green)','var(--blue)','var(--violet)','var(--coral-text)'];
// one stamp: stamp('borderline','Strasbourg','FR') when a right answer lands
// whoever listens (../brand/account.js keeps the GeoPass in your account) hears of every new stamp
const stampHooks=[];
// stamp('borderline','France','','FRA'): the 4th value, the country's code, ticks that game for the country in the atlas
function stamp(g,t,s,code){const p=pass(),x={g,t:String(t),s:s?String(s):'',d:dayKey()};
  if(code&&GBIT[g]&&ATLAS[code]){x.c=code;const a=atlas(p),was=country(code,a).mine;a[code]=(a[code]||0)|GBIT[g];
    if(!was&&country(code,a).mine)moment({k:'c',c:code,d:x.d})}
  p.n++;p.list.push(x);p.list=p.list.slice(-240);
  store.set('gm-pass',JSON.stringify(p));refreshPass();stampHooks.forEach(f=>{try{f(x)}catch(e){}});return p.n}

/* ---------- milestones: the big moments shown on the Passport page (gm-ms, this device) ----------
   {e: [{k: 'c' country became yours (c: code) | 'v' visa (n: name), d: day}], v: the visas already held, so a new one is noticed}
   Levels and personal bests need no record: they come from the games' histories (ledger). */
function moments(){const m=json('gm-ms');return m&&Array.isArray(m.e)?m:{e:[]}}
function moment(x){const m=moments();m.e.push(x);m.e=m.e.slice(-60);store.set('gm-ms',JSON.stringify(m))}
// a visa you didn't have the last time the GeoPass was opened is a new moment (the first time, or many at once after
// signing in on a new device, they are only remembered)
function visaMoments(V){const m=moments(),now=V.filter(v=>v[4]).map(v=>v[2]);
  if(Array.isArray(m.v)){const add=now.filter(n=>!m.v.includes(n));if(add.length<=3)add.forEach(n=>m.e.push({k:'v',n,d:dayKey()}))}
  m.v=now;m.e=m.e.slice(-60);store.set('gm-ms',JSON.stringify(m))}
/* ---------- the atlas: the 196 countries and which games have stamped each one (gm-pass .atlas) ----------
   A country is yours once you get it right in every game it can come up in: Countries, Capitals (its capital),
   Silhouette, Top 10 (Héctor, 2026-11-01) and Customs (2026-11-02: every country can come up there, so it counts for all). Israel and Palestine have no capital in Capitals and Vanuatu is in
   no Top 10 list, so those games don't count for them. ATLAS[code] = {n: name, r: continent, m: the games it can
   come up in (bits, GBIT), k: capital}. Made from Silhouette's, Countries' and Capitals' data and Top 10's lists. */
const GBIT={borderline:1,citygrid:2,silhouette:4,top10:8,customs:16};
const ATLAS={};"AFG|Afghanistan|AS|15|Kabul;ALB|Albania|EU|15|Tirana;DZA|Algeria|AF|15|Algiers;AND|Andorra|EU|15|Andorra la Vella;AGO|Angola|AF|15|Luanda;ATG|Antigua and Barbuda|NA|15|St. John's;ARG|Argentina|SA|15|Buenos Aires;ARM|Armenia|AS|15|Yerevan;AUS|Australia|OC|15|Canberra;AUT|Austria|EU|15|Vienna;AZE|Azerbaijan|AS|15|Baku;BHS|Bahamas|NA|15|Nassau;BHR|Bahrain|AS|15|Manama;BGD|Bangladesh|AS|15|Dhaka;BRB|Barbados|NA|15|Bridgetown;BLR|Belarus|EU|15|Minsk;BEL|Belgium|EU|15|Brussels;BLZ|Belize|NA|15|Belmopan;BEN|Benin|AF|15|Porto-Novo;BTN|Bhutan|AS|15|Thimphu;BOL|Bolivia|SA|15|La Paz;BIH|Bosnia and Herzegovina|EU|15|Sarajevo;BWA|Botswana|AF|15|Gaborone;BRA|Brazil|SA|15|Brasília;BRN|Brunei|AS|15|Bandar Seri Begawan;BGR|Bulgaria|EU|15|Sofia;BFA|Burkina Faso|AF|15|Ouagadougou;BDI|Burundi|AF|15|Gitega;KHM|Cambodia|AS|15|Phnom Penh;CMR|Cameroon|AF|15|Yaoundé;CAN|Canada|NA|15|Ottawa;CPV|Cape Verde|AF|15|Praia;CAF|Central African Republic|AF|15|Bangui;TCD|Chad|AF|15|N'Djamena;CHL|Chile|SA|15|Santiago;CHN|China|AS|15|Beijing;COL|Colombia|SA|15|Bogotá;COM|Comoros|AF|15|Moroni;CRI|Costa Rica|NA|15|San José;HRV|Croatia|EU|15|Zagreb;CUB|Cuba|NA|15|Havana;CYP|Cyprus|EU|15|Nicosia;CZE|Czechia|EU|15|Prague;DNK|Denmark|EU|15|Copenhagen;DJI|Djibouti|AF|15|Djibouti;DMA|Dominica|NA|15|Roseau;DOM|Dominican Republic|NA|15|Santo Domingo;COD|DR Congo|AF|15|Kinshasa;ECU|Ecuador|SA|15|Quito;EGY|Egypt|AF|15|Cairo;SLV|El Salvador|NA|15|San Salvador;GNQ|Equatorial Guinea|AF|15|Malabo;ERI|Eritrea|AF|15|Asmara;EST|Estonia|EU|15|Tallinn;SWZ|Eswatini|AF|15|Mbabane;ETH|Ethiopia|AF|15|Addis Ababa;FJI|Fiji|OC|15|Suva;FIN|Finland|EU|15|Helsinki;FRA|France|EU|15|Paris;GAB|Gabon|AF|15|Libreville;GMB|Gambia|AF|15|Banjul;GEO|Georgia|AS|15|Tbilisi;DEU|Germany|EU|15|Berlin;GHA|Ghana|AF|15|Accra;GRC|Greece|EU|15|Athens;GRD|Grenada|NA|15|St. George's;GTM|Guatemala|NA|15|Guatemala City;GIN|Guinea|AF|15|Conakry;GNB|Guinea-Bissau|AF|15|Bissau;GUY|Guyana|SA|15|Georgetown;HTI|Haiti|NA|15|Port-au-Prince;HND|Honduras|NA|15|Tegucigalpa;HUN|Hungary|EU|15|Budapest;ISL|Iceland|EU|15|Reykjavík;IND|India|AS|15|Delhi;IDN|Indonesia|AS|15|Jakarta;IRN|Iran|AS|15|Tehran;IRQ|Iraq|AS|15|Baghdad;IRL|Ireland|EU|15|Dublin;ISR|Israel|AS|13|;ITA|Italy|EU|15|Rome;CIV|Ivory Coast|AF|15|Yamoussoukro;JAM|Jamaica|NA|15|Kingston;JPN|Japan|AS|15|Tokyo;JOR|Jordan|AS|15|Amman;KAZ|Kazakhstan|AS|15|Astana;KEN|Kenya|AF|15|Nairobi;KIR|Kiribati|OC|15|Tarawa;UNK|Kosovo|EU|15|Pristina;KWT|Kuwait|AS|15|Kuwait City;KGZ|Kyrgyzstan|AS|15|Bishkek;LAO|Laos|AS|15|Vientiane;LVA|Latvia|EU|15|Riga;LBN|Lebanon|AS|15|Beirut;LSO|Lesotho|AF|15|Maseru;LBR|Liberia|AF|15|Monrovia;LBY|Libya|AF|15|Tripoli;LIE|Liechtenstein|EU|15|Vaduz;LTU|Lithuania|EU|15|Vilnius;LUX|Luxembourg|EU|15|Luxembourg;MDG|Madagascar|AF|15|Antananarivo;MWI|Malawi|AF|15|Lilongwe;MYS|Malaysia|AS|15|Kuala Lumpur;MDV|Maldives|AS|15|Malé;MLI|Mali|AF|15|Bamako;MLT|Malta|EU|15|Valletta;MHL|Marshall Islands|OC|15|Majuro;MRT|Mauritania|AF|15|Nouakchott;MUS|Mauritius|AF|15|Port Louis;MEX|Mexico|NA|15|Mexico City;FSM|Micronesia|OC|15|Palikir;MDA|Moldova|EU|15|Chișinău;MCO|Monaco|EU|15|Monaco;MNG|Mongolia|AS|15|Ulaanbaatar;MNE|Montenegro|EU|15|Podgorica;MAR|Morocco|AF|15|Rabat;MOZ|Mozambique|AF|15|Maputo;MMR|Myanmar|AS|15|Naypyidaw;NAM|Namibia|AF|15|Windhoek;NRU|Nauru|OC|15|Yaren;NPL|Nepal|AS|15|Kathmandu;NLD|Netherlands|EU|15|Amsterdam;NZL|New Zealand|OC|15|Wellington;NIC|Nicaragua|NA|15|Managua;NER|Niger|AF|15|Niamey;NGA|Nigeria|AF|15|Abuja;PRK|North Korea|AS|15|Pyongyang;MKD|North Macedonia|EU|15|Skopje;NOR|Norway|EU|15|Oslo;OMN|Oman|AS|15|Muscat;PAK|Pakistan|AS|15|Islamabad;PLW|Palau|OC|15|Ngerulmud;PSE|Palestine|AS|13|;PAN|Panama|NA|15|Panama City;PNG|Papua New Guinea|OC|15|Port Moresby;PRY|Paraguay|SA|15|Asunción;PER|Peru|SA|15|Lima;PHL|Philippines|AS|15|Manila;POL|Poland|EU|15|Warsaw;PRT|Portugal|EU|15|Lisbon;QAT|Qatar|AS|15|Doha;COG|Republic of the Congo|AF|15|Brazzaville;ROU|Romania|EU|15|Bucharest;RUS|Russia|EU|15|Moscow;RWA|Rwanda|AF|15|Kigali;KNA|Saint Kitts and Nevis|NA|15|Basseterre;LCA|Saint Lucia|NA|15|Castries;VCT|Saint Vincent and the Grenadines|NA|15|Kingstown;WSM|Samoa|OC|15|Apia;SMR|San Marino|EU|15|San Marino;STP|São Tomé and Príncipe|AF|15|São Tomé;SAU|Saudi Arabia|AS|15|Riyadh;SEN|Senegal|AF|15|Dakar;SRB|Serbia|EU|15|Belgrade;SYC|Seychelles|AF|15|Victoria;SLE|Sierra Leone|AF|15|Freetown;SGP|Singapore|AS|15|Singapore;SVK|Slovakia|EU|15|Bratislava;SVN|Slovenia|EU|15|Ljubljana;SLB|Solomon Islands|OC|15|Honiara;SOM|Somalia|AF|15|Mogadishu;ZAF|South Africa|AF|15|Pretoria;KOR|South Korea|AS|15|Seoul;SSD|South Sudan|AF|15|Juba;ESP|Spain|EU|15|Madrid;LKA|Sri Lanka|AS|15|Colombo;SDN|Sudan|AF|15|Khartoum;SUR|Suriname|SA|15|Paramaribo;SWE|Sweden|EU|15|Stockholm;CHE|Switzerland|EU|15|Bern;SYR|Syria|AS|15|Damascus;TWN|Taiwan|AS|15|Taipei;TJK|Tajikistan|AS|15|Dushanbe;TZA|Tanzania|AF|15|Dodoma;THA|Thailand|AS|15|Bangkok;TLS|Timor-Leste|AS|15|Dili;TGO|Togo|AF|15|Lomé;TON|Tonga|OC|15|Nukuʻalofa;TTO|Trinidad and Tobago|NA|15|Port of Spain;TUN|Tunisia|AF|15|Tunis;TUR|Türkiye|AS|15|Ankara;TKM|Turkmenistan|AS|15|Ashgabat;TUV|Tuvalu|OC|15|Funafuti;UGA|Uganda|AF|15|Kampala;UKR|Ukraine|EU|15|Kyiv;ARE|United Arab Emirates|AS|15|Abu Dhabi;GBR|United Kingdom|EU|15|London;USA|United States|NA|15|Washington;URY|Uruguay|SA|15|Montevideo;UZB|Uzbekistan|AS|15|Tashkent;VUT|Vanuatu|OC|7|Port Vila;VEN|Venezuela|SA|15|Caracas;VNM|Vietnam|AS|15|Hanoi;YEM|Yemen|AS|15|Sanaa;ZMB|Zambia|AF|15|Lusaka;ZWE|Zimbabwe|AF|15|Harare".split(';').forEach(r=>{const [c,n,re,m,k]=r.split('|');ATLAS[c]={n,r:re,m:+m|GBIT.customs,k}});
const bits=m=>(m&1)+(m>>1&1)+(m>>2&1)+(m>>3&1)+(m>>4&1);
// the first time: what the latest stamps on this device already say (names of countries and capitals)
function atlasFromList(list){const a={},by={};
  for(const c in ATLAS){by['n'+ATLAS[c].n.toLowerCase()]=c;if(ATLAS[c].k)by['k'+ATLAS[c].k.toLowerCase()]=c}
  (list||[]).forEach(x=>{const b=GBIT[x.g];if(!b)return;const c=x.c&&ATLAS[x.c]?x.c:by[(x.g==='citygrid'?'k':'n')+String(x.t).toLowerCase()];
    if(c)a[c]=(a[c]||0)|b});return a}
// cu: once, when Customs joined the atlas, the Customs stamps already in the list are added to an older atlas
function atlas(p){p=p||pass();if(!p.atlas||typeof p.atlas!=='object'){p.atlas=atlasFromList(p.list);p.cu=1;store.set('gm-pass',JSON.stringify(p))}
  else if(!p.cu){const f=atlasFromList(p.list);for(const c in f)p.atlas[c]=(p.atlas[c]||0)|f[c];p.cu=1;store.set('gm-pass',JSON.stringify(p))}
  return p.atlas}
// one country: {have: the games done, of: how many it needs, n: how many done, mine: true when all of them}
function country(code,a){const c=ATLAS[code],h=((a||atlas())[code]||0)&c.m;return {have:h,n:bits(h),of:bits(c.m),mine:h===c.m}}
const countriesMine=a=>{a=a||atlas();return Object.keys(ATLAS).filter(c=>country(c,a).mine).length};

/* ---------- km and levels: every daily game you finish earns km for how well it went ----------
   up to 100 for the result, +20 for a perfect game, +50 on a day you play all of them (ALLN: how many games that is) */
const LEVELS=[['Tourist',0],['Traveller',500],['Explorer',2000],['Ambassador',5000],['Globetrotter',10000]];
const ALL5=50,ALLN=GAMES.filter(g=>!g.soon).length,ALLW=['','one','two','three','four','five','six','seven','eight'][ALLN]||String(ALLN);
const pts=f=>{f=Math.max(0,Math.min(1,+f||0));return Math.round(f*100)+(f>=1?20:0)};
const cxPts=(won,m)=>won?Math.max(40,100-15*(+m||0))+(m?0:20):20;
// this device's daily games, from each game's own history: {day: {game id: km}}
function ledger(){const L={},add=(d,id,mi)=>{if(/^\d{4}-\d{2}-\d{2}$/.test(d))(L[d]=L[d]||{})[id]=mi};
  [['bl-hist','borderline'],['cc-hist','citygrid']].forEach(([k,id])=>{const h=json(k)||{};
    for(const d in h){const e=h[d];if(e&&e.f!==0){const n=+e.n||3;add(d,id,pts((+e.c||0)/(n*n)))}}});
  const cx=json('cx-hist')||{};for(const d in cx)if(cx[d])add(d,'connections',cxPts(cx[d].w,cx[d].m));
  const t=json('t10-hist')||{};for(const d in t)if(t[d])add(d,'top10',pts((+t[d].f||0)/10));
  const s=json('sil-hist')||{};for(const d in s){const v=Object.values(s[d]||{}).filter(x=>typeof x==='number');if(v.length)add(d,'silhouette',pts(Math.max(...v)/9))}
  const u=json('cu-hist')||{};for(const d in u)if(u[d])add(d,'customs',pts((+u[d].p||0)/25));
  return L}
const dayTotal=day=>{const v=Object.values(day||{});return v.reduce((a,b)=>a+b,0)+(v.length>=ALLN?ALL5:0)};
function level(km){let i=0;LEVELS.forEach((l,k)=>{if(km>=l[1])i=k});const next=LEVELS[i+1];
  return {i,name:LEVELS[i][0],next,pct:next?Math.round((km-LEVELS[i][1])/(next[1]-LEVELS[i][1])*100):100}}
function geo(){const L=ledger(),k=dayKey();let km=0,games=0;
  for(const d in L){km+=dayTotal(L[d]);games+=Object.keys(L[d]).length}
  return {L,km,miles:km,games,today:L[k]||{},todayKm:dayTotal(L[k]),todayMiles:dayTotal(L[k]),streak:streak()}}
function bestStreak(){const n=k=>Math.round(Date.parse(k+'T12:00Z')/864e5),v=[...new Set(days().map(n))].sort((a,b)=>a-b);let b=0,c=0,prev=null;
  v.forEach(x=>{c=prev!=null&&x===prev+1?c+1:1;b=Math.max(b,c);prev=x});return b}

/* ---------- the clock: how long each daily took ----------
   gm-times {day: {game: {a: when today's puzzle was first on screen, b: when it ended, f: share right 0..1}}}, kept on this device.
   Each game starts it when it shows today's unfinished puzzle and stops it when the puzzle ends; the seconds go with the result
   to the daily ranking (sec), for the Fastest of the day visa. Game ids: borderline, citygrid, connections, top10, silhouette, customs. */
const clockAll=()=>{const T=json('gm-times');return T&&typeof T==='object'?T:{}};
function clockStart(g,d){d=d||dayKey();if(d!==dayKey())return;const T=clockAll(),x=T[d]=T[d]||{};if(x[g])return;x[g]={a:Date.now()};
  const ks=Object.keys(T).sort();while(ks.length>400)delete T[ks.shift()];store.set('gm-times',JSON.stringify(T))}
function clockStop(g,d,f){const T=clockAll(),x=T[d]&&T[d][g];if(!x||x.b)return;x.b=Date.now();x.f=Math.max(0,Math.min(1,+f||0));store.set('gm-times',JSON.stringify(T))}
function clockSecs(g,d){const x=(clockAll()[d]||{})[g];return x&&x.b&&x.b>=x.a?Math.max(1,Math.round((x.b-x.a)/1000)):null}
const clock={start:clockStart,stop:clockStop,secs:clockSecs};
// 52″, 2′41″, 21′05″
const secText=s=>s<60?s+'″':Math.floor(s/60)+'′'+String(s%60).padStart(2,'0')+'″';

/* ---------- visas: special entries for special games ----------
   [ink, mark, name, what it takes, done?, progress 0..1 while not done, progress text, note (shown when done, or a best time), group]
   groups: 0 Only one a day (the daily rankings), 1 Against the clock (your times), 2 Rare moments, 3 On the road (the first twelve).
   Group 0 comes from the rankings of the days you played, read by account.js once each day is over (gm-feats, signed in only):
   {game: {day: [place, players, first to finish, fastest, your finish time]}}. Only results with at least half right count
   for First, Fastest and the clock visas, and a ranking needs two players or more. */
const HALF=.5;
function visas(){const H=k=>json(k)||{},vals=o=>Object.values(o).filter(Boolean),L=ledger(),p=pass(),bs=bestStreak(),cm=countriesMine();
  const grid=vals(H('bl-hist')).concat(vals(H('cc-hist'))).some(e=>e.f!==0&&+e.c>0&&+e.c>=(+e.n||3)*(+e.n||3));
  const sil=vals(H('sil-hist')).some(d=>Object.values(d).some(v=>v===9));
  const fr=['cx-friends','t10-friends','sil-friends'].some(k=>(H(k).w||0)>0);
  const up=(n,of)=>[n>=of,Math.min(1,n/of),fmt(Math.min(n,of))+' / '+fmt(of)];
  const times=(n,last)=>n?'×'+n+(last?' · last on '+dateText(last,{day:'numeric',month:'short'}):''):'';
  // the rankings (group 0)
  const fa=json('gm-feats'),ac=json('gm-acct'),F=fa&&ac&&ac.u&&fa.u===ac.u&&fa.r?fa.r:{};
  const gold=[],first=[],fast=[],pod=[],byDay={},finish=[];
  for(const g in F)for(const d in F[g]){const e=F[g][d];if(!Array.isArray(e))continue;const [pl,n,f1,fs,t]=e;
    if(n>=2&&pl===1){gold.push(d);(byDay[d]=byDay[d]||new Set()).add(g)}
    if(n>=2&&pl>=1&&pl<=3)pod.push(d);if(f1)first.push(d);if(fs)fast.push(d);if(t)finish.push([d,g,t])}
  const last=a=>a.slice().sort().pop();
  const crowns=Object.values(byDay).filter(s=>s.size>=3).length;
  const dn=k=>Math.round(Date.parse(k+'T12:00Z')/864e5);
  let defend=0;for(const g in F){const v=Object.keys(F[g]).filter(d=>{const e=F[g][d];return Array.isArray(e)&&e[0]===1&&e[1]>=2}).map(dn).sort((a,b)=>a-b);
    let run=0,prev=null;v.forEach(x=>{run=prev!=null&&x===prev+1?run+1:1;if(run===3)defend++;prev=x})}
  // the clock (group 1)
  const T=clockAll(),tl=[];for(const d in T)for(const g in T[d]){const x=T[d][g];if(x&&x.b&&x.b>=x.a)tl.push({d,g,s:Math.max(1,Math.round((x.b-x.a)/1000)),f:+x.f||0,b:x.b})}
  const good=tl.filter(x=>x.f>=HALF),best=a=>a.length?Math.min(...a.map(x=>x.s)):null;
  const bx=best(good),bl=best(tl.filter(x=>x.g==='silhouette'&&x.f>=1));
  let bt=null;for(const d in T){const day=good.filter(x=>x.d===d);if(new Set(day.map(x=>x.g)).size>=ALLN){const s=day.reduce((a,x)=>a+x.s,0);if(bt==null||s<bt)bt=s}}
  const tb=s=>s==null?'':'Best: '+secText(s);
  // rare moments (group 2): when a daily ended, Madrid time (from this device's clock and from your rows in the rankings)
  const at={};good.forEach(x=>at[x.d+x.g]=x.b);finish.forEach(([d,g,t])=>{const k=d+(g==='leaderboard'?'borderline':g);if(!at[k])at[k]=t});
  let owl=0,call=0;for(const k in at){const m=madridParts(at[k]),day=k.slice(0,10);if(dayKey(at[k])!==day)continue;
    if(+m.hour===0&&+m.minute<10)owl++;if(+m.hour===23&&+m.minute>=50)call++}
  const close=vals(H('cx-hist')).filter(e=>+e.w&&+e.m===3).length;
  const flaw=Object.values(L).filter(d=>Object.keys(d).length>=ALLN&&Object.values(d).every(v=>v>=120)).length;
  const pdn=pod.length;
  return [
    ['#A07C1E','1st','Gold medal','1st in a daily ranking',gold.length>0,0,'',times(gold.length,last(gold)),0],
    ['#C94A58','⏱','First to arrive','First player to finish a daily',first.length>0,0,'',times(first.length,last(first)),0],
    ['#2A56B8','⚡','Fastest of the day','Quickest time in a daily ranking',fast.length>0,0,'',times(fast.length,last(fast)),0],
    ['#6B4BA8','3×1','Triple crown','1st in 3 games on the same day',crowns>0,0,'',times(crowns),0],
    ['#25744F','1·1·1','Defending champion','1st in the same game 3 days running',defend>0,0,'',times(defend),0],
    ['#A07C1E','▲10','Podium regular','Top 3 in 10 dailies',pdn>=10,Math.min(1,pdn/10),fmt(Math.min(pdn,10))+' / 10',pdn>10?'×'+pdn+' podiums':'',0],
    ['#C94A58','<1′','Express','A daily done in under 1 minute',bx!=null&&bx<60,0,'',tb(bx),1],
    ['#6B4BA8','2′','Lightning','9/9 in Silhouette in under 2 minutes',bl!=null&&bl<120,0,'',tb(bl),1],
    ['#2A56B8','15′','Speed tour','All '+ALLW+' dailies in under 15 minutes',bt!=null&&bt<900,0,'',tb(bt),1],
    ['#1D2B4C','0:00','Night owl','A daily in its first 10 minutes (midnight CET)',owl>0,0,'',times(owl),2],
    ['#A07C1E','23:59','Last call','A daily in its last 10 minutes',call>0,0,'',times(call),2],
    ['#C94A58','3✕','Close call','Win Connections with 3 mistakes',close>0,0,'',times(close),2],
    ['#25744F',ALLN+'★','Flawless day','All '+ALLW+' dailies perfect on one day',flaw>0,0,'',times(flaw),2],
    ['#C94A58','7','Week on the road','7 days in a row',...up(bs,7),'',3],
    ['#A07C1E',ALLN+'/'+ALLN,'Grand tour','All '+ALLW+' dailies in one day',Object.values(L).some(d=>Object.keys(d).length>=ALLN),0,'','',3],
    ['#2A56B8','0✕','Clean sweep','Connections with no mistakes',vals(H('cx-hist')).some(e=>e.w&&!+e.m),0,'','',3],
    ['#25744F','10','Full list','All ten in a Top 10',vals(H('t10-hist')).some(e=>+e.f>=10),0,'','',3],
    ['#C94A58','▦','Perfect grid','Every square of a daily grid',grid,0,'','',3],
    ['#6B4BA8','9/9','Eagle eye','9 out of 9 in Silhouette',sil,0,'','',3],
    ['#B5632A','5/5','Nothing to declare','All five travellers right in Customs',vals(H('cu-hist')).some(e=>+e.r>=5),0,'','',3],
    ['#2A56B8','2+','Good company','Win a game with friends',fr,0,'','',3],
    ['#A07C1E','1','New homeland','Your first country',...up(cm,1),'',3],
    ['#25744F','100','Collector','100 stamps',...up(p.n,100),'',3],
    ['#C94A58','30','Month away','30 days in a row',...up(bs,30),'',3],
    ['#6B4BA8','50','Citizen of the world','50 countries',...up(cm,50),'',3],
    ['#1D2B4C','1K','Full passport','1,000 stamps',...up(p.n,1000),'',3]]}
const stamps=()=>pass().n;
const stampsToday=g=>pass().list.filter(x=>x.d===dayKey()&&(!g||x.g===g)).length;
// a stamp: name, small line, optional flag picture; a player class (c0…c5) gives the player's ink instead
function stampHTML(t,sub,cls,flag){const r=(hsh(t)%15)-7,own=/\bc\d\b/.test(cls||'');
  const L=Math.max(...String(t).split(' ').map(w=>w.length)),fs=L>11?10:L>8?12:14; // long names get smaller, never cut in half
  return '<span class="gm-stamp '+(cls||'')+'" style="'+(own?'':'color:'+INK[hsh(t)%4]+';')+'--r:'+r+'deg">'+(flag?'<img class="sf" src="'+esc(flag)+'" alt="">':'')+'<b class="sn" style="font-size:'+fs+'px">'+esc(t)+'</b>'+(sub?'<small>'+esc(sub)+'</small>':'')+'</span>'}
function refreshPass(){const n=stamps();document.querySelectorAll('[data-gm-pass]').forEach(b=>{const x=b.querySelector('b');if(x)x.textContent=fmt(n);b.setAttribute('aria-label','Open your GeoPass: '+n+' stamps')})}
addEventListener('storage',e=>{if(e.key==='gm-theme')applyTheme();if(e.key==='gm-pass')refreshPass()});

/* ---------- Mingo: a flat, grown-up flamingo who carries the GeoPass ----------
   poses: pass (ready, GeoPass under the wing), happy (stamped), sad (denied), think (hold on), head */
function mingo(pose,w){w=w||52;if(pose==='hello')pose='pass';
  let eye='<circle class="mg-eye" cx="48" cy="16" r="1.9"/>';
  if(pose==='happy')eye='<path class="mg-eyel" d="M45.5 17 Q48 13.5 50.5 17" stroke-width="1.8" stroke-linecap="round"/>';
  if(pose==='sad')eye='<circle class="mg-eye" cx="48" cy="17.5" r="1.7"/><path class="mg-eyel" d="M44.5 13 L51 14.5" stroke-width="1.6" stroke-linecap="round"/>';
  if(pose==='think')eye='<path class="mg-eyel" d="M45.5 16.5 L50.5 16.5" stroke-width="1.8" stroke-linecap="round"/>';
  const head='<circle class="mg-body" cx="46" cy="18" r="9"/><path class="mg-beak" d="M39 14 C32 15 29 21 31 27 L35 23 C36 20 38 18 41 17 Z"/><path class="mg-tip" d="M31 27 C30 24 31 22 33 21 L35 23 Z"/>'+eye;
  if(pose==='head')return '<svg class="mingo" viewBox="28 6 30 30" width="'+w+'" height="'+w+'" aria-hidden="true" focusable="false">'+head+'</svg>';
  const up=pose==='happy',book=up?'<g transform="translate(78 52) rotate(14)">':'<g transform="translate(72 74) rotate(-10)">';
  const pp=book+'<rect class="mg-pass" x="0" y="0" width="22" height="28" rx="2.5"/><circle class="mg-gold" cx="11" cy="12" r="5" stroke-width="1.4"/><path class="mg-gold" d="M6 22 H16" stroke-width="1.4"/></g>';
  const wing=up?'<path class="mg-deep" d="M58 86 C64 66 82 58 96 64 C90 80 74 90 58 86 Z"/>':'<path class="mg-deep" d="M52 88 C62 76 84 78 96 88 C84 98 62 100 52 88 Z"/>';
  return '<svg class="mingo" viewBox="0 0 120 160" width="'+w+'" height="'+Math.round(w*160/120)+'" aria-hidden="true" focusable="false">'+
  '<path class="mg-leg" d="M64 104 V152 M56 152 H72" stroke-width="3.2" stroke-linecap="round"/>'+
  '<path class="mg-leg" d="M70 104 L80 120 L68 124" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>'+
  '<path class="mg-deep" d="M90 86 L112 78 L104 92 L114 98 L94 102 Z"/>'+(up?pp:'')+
  '<ellipse class="mg-body" cx="68" cy="92" rx="30" ry="18"/>'+(up?'':pp)+wing+
  '<path class="mg-neck" d="M46 92 C28 80 28 54 42 46 C54 39 56 28 48 20" stroke-width="9" stroke-linecap="round"/>'+head+'</svg>'}

const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
// Mingo with a speech bubble: short, dry lines. The bubble pops only when what he says changes (pages redraw often)
const said={};
function hello(pose,title,sub,o){o=o||{};const key=o.key||'main',txt=pose+title,pop=said[key]!==undefined&&said[key]!==txt;said[key]=txt;
  const kind=o.kind!==undefined?o.kind:pose==='happy'?'good':pose==='sad'?'bad':'';
  return '<section class="gm-hello" aria-live="polite">'+mingo(pose,o.size||52)+'<div class="gm-bubble'+(kind?' '+kind:'')+(pop?' pop':'')+'"><b>'+esc(title)+'</b>'+(sub?'<span>'+esc(sub)+'</span>':'')+'</div></section>'}

/* the in-game ticket, the same in every game while you play: Mingo's message (a hello()) on top, a tear line,
   then the stub with the game's numbers, one tk(label, value, class) each (tk-pts gold, tk-gs coral, tk-name wider).
   Values are HTML: escape names before passing them. o.timer adds the countdown bar along the bottom (.tbar);
   o.color paints it, the ticket's edge and the playing traveller's box in the colour of the player whose turn it is
   (e.g. 'var(--p1)'); in the last 5 seconds the bar blinks (.tbar.low, set by the game's tick). */
function tk(k,v,c){return '<div class="tk-c'+(c?' '+c:'')+'"><i>'+k+'</i><b>'+v+'</b></div>'}
/* o.mode puts a coloured strip on top so you always know what you are playing:
   'daily' (gold, "★ Daily #N · Counts for ranking"), 'practice' (blue, "Practice") or 'archive' (blue, "Archive #N"); o.num is the number.
   Practice and archive also turn the ticket's edge blue. Rooms with friends pass no mode and keep the plain ticket. */
function ticket(say,stub,o){o=o||{};const m=o.mode,n=o.num!=null?' #'+o.num:'';
  const strip=m==='daily'?'<div class="tk-mode daily"><span>★ Daily'+n+'</span><span>Counts for ranking</span></div>'
    :m==='practice'?'<div class="tk-mode practice"><span>Practice</span></div>'
    :m==='archive'?'<div class="tk-mode practice"><span>Archive'+n+'</span></div>':'';
  // o.color (a game with turns): the whole ticket takes the colour of the player whose turn it is (.tk-turn, --pc)
  return '<section class="ticket'+(m==='practice'||m==='archive'?' tk-practice':'')+(o.color?' tk-turn" style="--pc:'+o.color:'')+'">'+strip+say+'<div class="tk-tear" aria-hidden="true"></div><div class="tk-stub">'+stub+'</div>'+(o.timer?'<span class="tbar" style="width:100%'+(o.color?';background:'+o.color:'')+'"></span>':'')+'</section>'}
// the traveller's name on the ticket: the account's, else the one played with in Countries or Capitals
function traveller(){const a=window.Geomingo&&window.Geomingo.account;return ((a&&a.name)||store.get('bl-user')||store.get('cc-user')||'Guest').trim().slice(0,16)||'Guest'}

/* ---------- the shared header ----------
   header({game:'Countries', coord:'Daily #12', menu:'<button…>'}): "‹ geomingo", GeoPass and theme on top,
   then the game's own bar: its name (goes to the game's home screen, id="brand"), its trip number, Menu.
   Without game: the home page. */
const ICO={back:'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  moon:'<svg class="moon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>',
  sun:'<svg class="sun" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'};
const logo='<span class="gm-logo">geo<span>mingo</span></span>';
const passBtn=()=>{const n=stamps();return '<button class="gm-pass" data-gm-pass aria-label="Open your GeoPass: '+n+' stamps" title="Your GeoPass"><i aria-hidden="true">✦</i><span class="gm-pw">GEOPASS</span><b>'+fmt(n)+'</b></button>'};
const themeBtn=()=>'';
// the account button (Sign in, or your initial): ../brand/account.js fills it in once it knows who is playing
const acctSlot=()=>'<span class="gm-acctslot" data-gm-acctslot>'+(window.Geomingo&&Geomingo.acctHTML?Geomingo.acctHTML():'')+'</span>';
function header(o){o=o||{};
  if(!o.game)return '<header class="gm-top"><h1 class="gm-logo">geo<span>mingo</span></h1><span class="gm-spacer"></span>'+passBtn()+acctSlot()+themeBtn()+'</header>';
  const g=GAMES.find(x=>x.name===o.game),gate=g?'Trip '+g.gate:'',sub=[gate,o.coord].filter(Boolean).join(' · ');
  return '<header class="gm-top"><a class="gm-home" href="'+HOME+'" aria-label="All Geomingo games">'+ICO.back+logo+'</a><span class="gm-spacer"></span>'+passBtn()+acctSlot()+themeBtn()+'</header>'+
    '<div class="gm-bar"><h2 class="gm-title" id="brand" role="link" tabindex="0" title="'+esc(o.game)+' home">'+esc(o.game)+(sub?'<small>'+esc(sub)+'</small>':'')+'</h2><span class="gm-spacer"></span>'+(o.menu||'')+'</div>'}
document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('[data-gm-theme],[data-gm-pass]');if(!t)return;e.preventDefault();
  if(t.hasAttribute('data-gm-theme'))toggleTheme();else openPass()});

/* ---------- windows: the result card and the GeoPass booklet (one at a time, Escape closes) ---------- */
let lastFocus=null,onCloseFn=null;
function closeWindow(){const w=document.getElementById('gm-window');if(!w)return;w.remove();const f=onCloseFn;onCloseFn=null;
  if(lastFocus&&lastFocus.focus)try{lastFocus.focus()}catch(e){}if(f)f()}
function openWindow(html,label,onClose){const had=document.getElementById('gm-window');if(had)had.remove();else lastFocus=document.activeElement;onCloseFn=onClose||null;
  const box=document.createElement('div');box.id='gm-window';box.className='gm-scrim center';
  box.innerHTML='<div role="dialog" aria-modal="true" aria-label="'+esc(label)+'" style="width:100%;display:flex;justify-content:center;max-height:100%">'+html+'</div>';
  document.body.appendChild(box);
  box.addEventListener('click',e=>{if(e.target===box||e.target===box.firstChild){closeWindow();return}
    const a=e.target.closest('[data-gm-act]');if(!a)return;const act=a.dataset.gmAct;
    if(act==='close')closeWindow();else if(act==='pass')openPass();else if(box._acts&&box._acts[act])box._acts[act]()});
  return box}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.getElementById('gm-window')){e.stopPropagation();closeWindow()}},true);

/* the result card, like a boarding pass:
   resultWindow({game:'borderline', pose, title:'Mingo's line', num:'1,240', unit:'Points', mini, line, share:fn, next, allDone, close:'See the grid', onClose}) */
function resultWindow(o){const g=game(o.game)||{name:o.gameName||''},nx=o.next||null,st=o.game?stampsToday(o.game):0;
  const line=o.line!=null?o.line:[st?st+' new stamp'+(st===1?'':'s'):'',o.stat||''].filter(Boolean).join(' · ');
  const html='<div class="gm-res"><div class="gm-band">'+mingo('head',26)+'<b>'+esc(g.name)+' · visited</b></div><div class="gm-rbody">'+
    '<div class="gm-rtop">'+mingo(o.pose||'happy',70)+'<div><span class="gm-lab">'+esc(o.unit||'Score')+'</span>'+(o.num!=null?'<span class="gm-num">'+esc(o.num)+'</span>':'')+'</div>'+(o.mini||'')+'</div>'+
    (o.room&&o.title?'<p class="gm-say">'+esc(o.title)+'</p>':'')+(line?'<p class="gm-line">'+esc(line)+'</p>':'')+'<hr class="gm-rsep">'+
    (st?'<button class="gm-big" data-gm-act="pass">See them in the GeoPass</button>':'')+
    (o.share?'<button class="gm-big coral" data-gm-act="share">'+esc(o.shareLabel||'Share result')+'</button>':'')+
    (nx?'<a class="gm-big ghost" href="'+esc(nx.href)+'">Next: '+esc(nx.name)+'</a>':(o.allDone?'<p class="gm-note">That was the last game today. New trips at midnight, Spain time.</p>':''))+
    '<button class="gm-text" data-gm-act="close">'+esc(o.close||'Close')+'</button></div></div>';
  const box=openWindow(html,(g.name||'Game')+' result',o.onClose);box._acts={share:()=>o.share&&o.share()};
  const f=box.querySelector('[data-gm-act="share"]')||box.querySelector('a,button');if(f)f.focus()}

/* ---------- the GeoPass: one passport, the same from the home page and from every game ----------
   The data page on top (Mingo, name, level, km, streak, stamps, countries), then three pages:
   Passport (the route, today's entry stamp, the countries almost yours, the latest milestones, how it works), Countries (the atlas) and Visas. */
const PINK={borderline:'#C94A58',citygrid:'#A07C1E',connections:'#2A56B8',top10:'#25744F',silhouette:'#6B4BA8',customs:'#B5632A'};
const GORDER=[['borderline','Countries'],['citygrid','Capitals'],['silhouette','Silhouette'],['top10','Top 10'],['customs','Customs']];
const CONT=[['all','All'],['EU','Europe'],['AS','Asia'],['AF','Africa'],['AM','Americas'],['OC','Oceania']];
const inCont=(c,k)=>k==='all'||(k==='AM'?c.r==='NA'||c.r==='SA':c.r===k);
let gpTab='passport',gpCont='all',SHAPES=null,shapesBusy=false;
// the outlines come from Silhouette's file, loaded the first time the Countries page opens
function loadShapes(then){if(SHAPES)return then();
  const use=()=>{try{SHAPES={};COUNTRIES.forEach(c=>SHAPES[c.c]=c.p)}catch(e){SHAPES={}}then()};
  if(typeof COUNTRIES!=='undefined')return use();
  if(shapesBusy)return;shapesBusy=true;const sc=document.createElement('script');sc.src=ROOT+'silhouette/countries.js?v=202610230100';
  sc.onload=()=>{shapesBusy=false;use()};sc.onerror=()=>{shapesBusy=false;SHAPES={};then()};document.head.appendChild(sc)}
function routeHTML(km){const lv=level(km),at=i=>8+i*21,me=lv.next?at(lv.i)+21*lv.pct/100:at(lv.i);
  return '<div class="gp-route" role="img" aria-label="'+esc(lv.name+', '+fmt(km)+' km'+(lv.next?'. '+fmt(lv.next[1]-km)+' km to '+lv.next[0]:''))+'">'+
    '<span class="ln"></span><span class="lnd" style="width:'+(me-8)+'%"></span>'+
    LEVELS.map((l,i)=>'<span class="p'+(i<=lv.i?' ok':'')+'" style="left:'+at(i)+'%"><i></i><small>'+l[0]+'</small><em>'+(l[1]?fmt(l[1]):'0')+'</em></span>').join('')+
    '<span class="me" style="left:'+me+'%">'+mingo('pass',26)+'</span></div>'}
function howHTML(){return '<ul class="gp-how">'+
  '<li><b>Stamps.</b> Every right answer in any game is one more stamp in your count.</li>'+
  '<li><b>Km.</b> Every daily game you finish earns up to 100 km for how well it went. A perfect game +20, all '+ALLW+' in one day +'+ALL5+'.</li>'+
  '<li><b>Levels.</b> Km move you along the route: '+LEVELS.map(l=>l[0]+(l[1]?' ('+fmt(l[1])+')':'')).join(', ')+'.</li>'+
  '<li><b>Countries.</b> A country is yours when you get it right in every game it comes up in: Countries, Capitals, Silhouette, Top 10 and Customs. The dots show which ones you have.</li>'+
  '<li><b>Visas.</b> Special entries for special games, like a week in a row or a perfect grid.</li></ul>'}
// Passport page (Héctor's option D, 2026-11-02): the route, today's entry stamp, the countries closest to being yours, the latest big moments
const SHORT={borderline:'Countr.',citygrid:'Capit.',connections:'Conn.',top10:'Top 10',silhouette:'Silh.',customs:'Cust.'};
function todayHTML(P){const k=dayKey(),L=live(),done=L.filter(g=>result(g.id).done).length;
  const cells=L.map(g=>{const r=result(g.id),c=PINK[g.id]||'#1D2B4C';
    if(!r.done)return '<a class="no" href="'+esc(g.href)+'" aria-label="'+esc(g.name)+': not played yet">'+esc(SHORT[g.id]||g.name)+'<b>–</b></a>';
    return '<span style="--c:'+c+'" aria-label="'+esc(g.name+': '+r.label)+'">'+esc(SHORT[g.id]||g.name)+'<b>'+esc(r.label==='Solved'?'4/4':r.label)+'</b></span>'}).join('');
  return '<div class="gp-entry'+(done?'':' off')+'"><div><div class="d">Today, '+esc(dateText(k,{day:'numeric',month:'short'}))+'</div>'+
    '<div class="s">'+(done?'Entry stamp · '+done+' of '+L.length+' games':'No games yet today')+'</div></div><div class="k">+'+fmt(P.todayKm)+' km</div>'+
    '<div class="gp-g">'+cells+'</div></div>'}
function almostHTML(){const a=atlas(),k=dayKey();
  const L=Object.keys(ATLAS).map(c=>[c,country(c,a)]).filter(([,x])=>x.n&&!x.mine)
    .sort((A,B)=>(B[1].n/B[1].of-A[1].n/A[1].of)||(hsh(A[0]+k)-hsh(B[0]+k))); // a different few each day among the closest
  const one=L.filter(([,x])=>x.n===x.of-1).length;
  const rows=L.slice(0,3).map(([c,x])=>{const d=ATLAS[c],G=GORDER.filter(([g])=>d.m&GBIT[g]),miss=G.filter(([g])=>!(x.have&GBIT[g]));
    const dots=G.map(([g])=>'<i style="'+(x.have&GBIT[g]?'background:'+PINK[g]+';border-color:'+PINK[g]:'')+'"></i>').join('');
    const m=miss[0],gm=game(m[0]);
    return '<div><span><b>'+esc(d.n)+'</b><small><span class="gp-dots">'+dots+'</span>'+x.n+' of '+x.of+' games</small></span>'+
      '<a class="gp-miss" style="--c:'+PINK[m[0]]+'" href="'+esc(gm?gm.href:'#')+'">Missing: '+esc(m[1])+(miss.length>1?' +'+(miss.length-1):'')+'</a></div>'}).join('');
  return '<div class="gp-sec"><h4>Almost yours</h4><span>'+(one?one+' one game to go':'')+'</span></div>'+
    (rows?'<div class="gp-al">'+rows+'</div>':'<p class="gp-empty">Get a country right in any game and it starts its way to being yours.</p>')}
// every big moment: countries and visas from gm-ms, levels and personal bests worked out from the games' histories
function allMoments(V){const ev=moments().e.slice(),L=ledger(),ds=Object.keys(L).sort();let km=0,lv=0;const top={},n={};
  ds.forEach(d=>{km+=dayTotal(L[d]);while(LEVELS[lv+1]&&km>=LEVELS[lv+1][1]){lv++;ev.push({k:'l',n:LEVELS[lv][0],km:LEVELS[lv][1],d})}
    for(const g in L[d]){const v=L[d][g],had=top[g]||0;
      if(v>=120&&had<120)ev.push({k:'b',g,km:v,p:1,d});else if((n[g]||0)>=5&&v>had)ev.push({k:'b',g,km:v,prev:had,d});
      top[g]=Math.max(had,v);n[g]=(n[g]||0)+1}});
  const ord={c:0,v:1,l:2,b:3};return ev.sort((a,b)=>a.d<b.d?1:a.d>b.d?-1:ord[a.k]-ord[b.k])}
function momentHTML(x,V){const k=dayKey(),day=x.d===k?'Today':dateText(x.d,{weekday:'short',day:'numeric',month:'short'});
  let c='#1D2B4C',ic='',t='',s='';
  if(x.k==='c'){const d=ATLAS[x.c];if(!d)return '';ic=x.c;t=d.n+' is yours';s='Right in all '+country(x.c).of+' games it comes up in.'}
  else if(x.k==='v'){const v=V.find(v=>v[2]===x.n);if(!v)return '';c=v[0];ic=v[1];t='Visa: '+v[2];s=v[3]+'.'}
  else if(x.k==='l'){ic='↑';t=x.n+' reached';s=fmt(x.km)+' km on the road.'}
  else{const g=game(x.g);if(!g)return '';c=PINK[x.g]||c;ic='★';t=x.p?'First perfect '+g.name:'Best day yet in '+g.name;s=fmt(x.km)+' km'+(x.p?'.':'. Before: '+fmt(x.prev)+' km.')}
  return '<li style="--c:'+c+'"><span class="ic'+(ic.length>2?' sm':'')+'">'+esc(ic)+'</span><span><b>'+esc(t)+'</b><small>'+esc(s)+'</small><em>'+esc(day)+'</em></span></li>'}
function pagePassport(P){const lv=level(P.km),V=visas();visaMoments(V);
  const M=allMoments(V).map(x=>momentHTML(x,V)).filter(Boolean).slice(0,3);
  return '<div class="gp-sec"><h4>My route</h4><span>'+(lv.next?fmt(lv.next[1]-P.km)+' km to '+lv.next[0]:'Top level reached')+'</span></div>'+routeHTML(P.km)+
    '<div class="gp-sec"><h4>Today</h4></div>'+todayHTML(P)+almostHTML()+
    '<div class="gp-sec"><h4>Milestones</h4><span>'+(M.length?'latest':'')+'</span></div>'+
    (M.length?'<ul class="gp-ms">'+M.join('')+'</ul>':'<p class="gp-empty">The big moments show up here: a country that becomes yours, a new visa, a new level, your best day in a game.</p>')+
    '<details class="gp-det"><summary>How it works</summary>'+howHTML()+'</details>'}
function pageCountries(){const a=atlas(),codes=Object.keys(ATLAS),mine=countriesMine(a),way=codes.filter(c=>{const x=country(c,a);return x.n&&!x.mine}).length;
  const R=52,C2=2*Math.PI*R,frac=mine/codes.length,wfrac=(mine+way)/codes.length;
  const bars=CONT.slice(1).map(([k,n])=>{const L=codes.filter(c=>inCont(ATLAS[c],k)),m=L.filter(c=>country(c,a).mine).length;
    return '<div><span>'+n+'</span><i><b style="width:'+Math.round(m/L.length*100)+'%"></b></i><small>'+m+'/'+L.length+'</small></div>'}).join('');
  const list=codes.filter(c=>inCont(ATLAS[c],gpCont)).map(c=>[c,country(c,a)])
    .sort((x,y)=>(y[1].mine-x[1].mine)||(y[1].n/y[1].of-x[1].n/x[1].of)||(x[1].n?ATLAS[x[0]].n.localeCompare(ATLAS[y[0]].n):hsh(x[0])-hsh(y[0]))); // the ones not visited yet in a mixed order, so the order gives no names away
  const cell=([c,x])=>{const d=ATLAS[c],o=!x.n,path=SHAPES&&SHAPES[c];
    const dots=GORDER.filter(([g])=>d.m&GBIT[g]).map(([g])=>'<i style="'+(x.have&GBIT[g]?'background:'+PINK[g]:'')+'"></i>').join('');
    return '<button class="gp-c'+(x.mine?' mine':o?' off':' half')+'" data-gp-c="'+c+'" aria-label="'+esc(o?'A country you have not visited yet':d.n+': '+x.n+' of '+x.of+' games'+(x.mine?', yours':''))+'">'+
      (path?'<svg viewBox="-4 -4 108 108" aria-hidden="true"><path d="'+path+'"/></svg>':'<svg viewBox="0 0 100 100" aria-hidden="true"></svg>')+
      '<small>'+(o?'? ? ?':esc(d.n))+'</small><span class="dots">'+dots+'</span></button>'};
  return '<div class="gp-atl"><div class="gp-ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="'+R+'" class="t"/>'+
      '<circle cx="60" cy="60" r="'+R+'" class="w" stroke-dasharray="'+(C2*wfrac)+' '+C2+'"/><circle cx="60" cy="60" r="'+R+'" class="m" stroke-dasharray="'+(C2*frac)+' '+C2+'"/></svg>'+
      '<div><b>'+mine+'</b><small>of '+codes.length+'</small><small>countries</small></div></div><div class="gp-cont">'+bars+'</div></div>'+
    '<p class="gp-rule">'+(way?'<b>'+way+'</b> on the way. ':'')+'A country is yours when you get it right in <b>every game</b> it comes up in. Tap one to see which you have.</p>'+
    '<div class="gp-info" id="gp-info" aria-live="polite"></div>'+
    '<div class="gp-chips" role="group" aria-label="Continent">'+CONT.map(([k,n])=>'<button data-gp-cont="'+k+'" aria-pressed="'+(k===gpCont)+'">'+n+'</button>').join('')+'</div>'+
    '<div class="gp-grid">'+list.map(cell).join('')+'</div>'}
const VGROUPS=[['Only one a day',()=>'The whole daily ranking competes, and one traveller a day wins it. Given the day after, once the ranking closes. First and Fastest need at least half right.'+(json('gm-acct')&&json('gm-acct').u?'':' <b>Sign in to compete.</b>')],
  ['Against the clock',()=>'Timed from when you first see today\'s puzzle. Your best time is on the visa. Only games with at least half right count.'],
  ['Rare moments',()=>'Odd hours and close calls.'],
  ['On the road',()=>'']];
function pageVisas(){const V=visas(),got=V.filter(v=>v[4]).length;
  const card=([ink,mk,n,what,ok,pr,txt,note])=>'<div class="gp-visa'+(ok?'':' lock')+'" style="--c:'+ink+'"><span class="em'+(mk.length>3?' sm':'')+'">'+esc(mk)+'</span><b>'+esc(n)+'</b><small>'+esc(what)+'</small>'+
      (!ok&&txt?'<span class="pb"><i style="width:'+Math.round(pr*100)+'%"></i></span><small>'+esc(txt)+'</small>':'')+(note?'<small class="nt">'+esc(note)+'</small>':'')+'</div>';
  return '<div class="gp-sec"><h4>Visas</h4><span>'+got+' of '+V.length+'</span></div>'+VGROUPS.map(([h,sub],k)=>{const g=V.filter(v=>v[8]===k),t=sub();
    return '<div class="gp-sec gp-vg"><h5>'+h+'</h5><span>'+g.filter(v=>v[4]).length+' of '+g.length+'</span></div>'+(t?'<p class="gp-rule gp-vsub">'+t+'</p>':'')+
      '<div class="gp-visas">'+g.map(card).join('')+'</div>'}).join('')}
function countryInfo(c){const d=ATLAS[c],x=country(c);
  if(!x.n)return 'A country you haven\'t visited yet. Get it right in '+GORDER.filter(([g])=>d.m&GBIT[g]).map(g=>g[1]).join(', ')+' to make it yours.';
  return '<b>'+esc(d.n)+'</b>'+(x.mine?' is yours. ':' · ')+GORDER.filter(([g])=>d.m&GBIT[g]).map(([g,n])=>'<span class="'+(x.have&GBIT[g]?'ok':'no')+'">'+(x.have&GBIT[g]?'✓':'·')+' '+n+'</span>').join(' ')}
function openPass(tab){if(typeof tab==='string')gpTab=tab;
  const P=geo(),p=pass(),lv=level(P.km),name=traveller(),a=atlas(p),cm=countriesMine(a);
  const mrz=(s=>s.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Z0-9]+/g,'<'))('P<WLD'+(name==='Guest'?'GUEST':name)+'<<'+lv.name)+'<'.repeat(44);
  const tabs=[['passport','Passport'],['countries','Countries'],['visas','Visas']];
  const html='<div class="gp"><div class="gp-bar"><svg class="gp-emb" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-3 3.5-3 14.5 0 18M12 3c3 3.5 3 14.5 0 18"/></svg><b>GEOPASS</b><button data-gm-act="close">Close</button></div>'+
    '<div class="gp-data"><div class="gp-dh"><span>Passport · Geomingo</span><span>P · WLD</span></div><div class="gp-id"><span class="gp-photo">'+mingo('pass',70)+'</span>'+
      '<div class="gp-f"><div class="w"><span>Holder</span><b>'+esc(name==='Guest'?'Guest traveller':name)+'</b></div>'+
      '<div><span>Distance</span><b>'+fmt(P.km)+' km</b></div><div><span>Streak</span><b>'+P.streak+' day'+(P.streak===1?'':'s')+'</b></div>'+
      '<div><span>Stamps</span><b>'+fmt(p.n)+'</b></div><div><span>Countries</span><b>'+cm+' / '+Object.keys(ATLAS).length+'</b></div></div>'+
      '<span class="gp-lvl">'+esc(lv.name)+'</span></div>'+
      '<div class="gp-mrz">'+esc(mrz.slice(0,36))+'<br>GEOPASS'+String(p.n).padStart(6,'0')+'&lt;'+esc(String(P.km))+'KM&lt;&lt;'+esc(dateText(p.since).replace(/ /g,'').toUpperCase())+'&lt;&lt;&lt;&lt;&lt;&lt;</div></div>'+
    '<div class="gp-tabs" role="tablist">'+tabs.map(([k,n])=>'<button role="tab" data-gp-tab="'+k+'" aria-selected="'+(k===gpTab)+'">'+n+'</button>').join('')+'</div>'+
    '<div class="gp-page" role="tabpanel"></div></div>';
  const box=openWindow(html,'Your GeoPass'),pg=box.querySelector('.gp-page');
  const draw=()=>{box.querySelectorAll('[data-gp-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.gpTab===gpTab)));
    pg.innerHTML=(gpTab==='countries'?pageCountries():gpTab==='visas'?pageVisas():pagePassport(P))+'<span class="gp-pn">'+({passport:2,countries:3,visas:4}[gpTab])+'</span>';
    if(gpTab==='countries'&&!SHAPES)loadShapes(()=>{if(gpTab==='countries'&&pg.isConnected)draw()})};
  box.addEventListener('click',e=>{const t=e.target.closest('[data-gp-tab],[data-gp-cont],[data-gp-c]');if(!t)return;
    if(t.dataset.gpTab){gpTab=t.dataset.gpTab;draw();box.querySelector('.gp').scrollTop=box.querySelector('.gp-tabs').offsetTop-8}
    else if(t.dataset.gpCont){gpCont=t.dataset.gpCont;draw()}
    else{const i=box.querySelector('#gp-info');if(i){i.innerHTML=countryInfo(t.dataset.gpC);i.classList.add('on')}}});
  draw();const c=box.querySelector('[data-gm-act="close"]');if(c)c.focus()}

/* a little grid of squares for the result card (true = got it) */
function mini(list,cols){return '<div class="gm-mini" style="grid-template-columns:repeat('+cols+',16px)" aria-hidden="true">'+list.map(x=>'<i class="'+(x?'ok':'')+'"></i>').join('')+'</div>'}

window.Geomingo={HOME,GAMES,live,game,dayKey,madridParts,msToMidnight,dateText,result,playedToday,nextGame,
  days,streak,pass,stamp,stamps,stampsToday,stampHTML,openPass,atlas,atlasFromList,country,countriesMine,ATLAS,GBIT,LEVELS,ALL5,ALLN,ALLW,pts,cxPts,ledger,dayTotal,level,geo,visas,clock,secText,howHTML,mingo,hello,tk,ticket,traveller,header,passBtn,themeBtn,toggleTheme,currentTheme,
  resultWindow,openWindow,closeWindow,mini,esc,refreshPass,onStamp:f=>stampHooks.push(f),share:name=>'Geomingo · '+name};
// Typing on a phone: while a typing sheet is open (the bottom panel with the box and the phone keyboard),
// the page behind it stays where it was. The browser likes to scroll the page up when the keyboard opens,
// hiding the ticket and the header; we put it back, and when the sheet closes the page returns to exactly
// where it was, so you see the whole screen again. You can still move the page by hand meanwhile: then
// it stays where you left it. A game that scrolls on purpose (window.scrollTo) wins over all this.
(function keepPage(){
  if(!window.MutationObserver||!document.body){document.addEventListener('DOMContentLoaded',keepPage,{once:true});return}
  const go=window.scrollTo.bind(window);
  let open=false,restY=window.scrollY,touching=false,openedAt=0,timers=[],until=0;
  const stop=()=>{timers.forEach(clearTimeout);timers=[];until=0};
  const put=()=>{if(Math.abs(window.scrollY-restY)>1)go(0,restY)};
  window.scrollTo=function(){stop();const r=go.apply(window,arguments);restY=window.scrollY;return r};
  addEventListener('touchstart',()=>{touching=true;stop()},{passive:true,capture:true});
  addEventListener('touchend',()=>{touching=false},{passive:true,capture:true});
  addEventListener('touchcancel',()=>{touching=false},{passive:true,capture:true});
  addEventListener('scroll',()=>{
    if(touching||(!open&&!until)){restY=window.scrollY;return}
    if(open&&Date.now()-openedAt<1200)put();       // the browser's jump when the keyboard opens
    else if(until&&Date.now()<until)put()           // ... and when it closes
  },{passive:true});
  const settle=()=>{stop();until=Date.now()+1200;put();[60,150,300,500,800,1200].forEach(t=>timers.push(setTimeout(put,t)));
    timers.push(setTimeout(()=>{until=0},1250))};
  if(window.visualViewport)visualViewport.addEventListener('resize',()=>{if(until&&Date.now()<until)put()});
  new MutationObserver(()=>{const now=!!document.querySelector('.sheet');if(now===open)return;open=now;
    if(open){stop();openedAt=Date.now();put()}else settle()}).observe(document.body,{childList:true,subtree:true});
})();
})();
