/* Geomingo: Mingo, the GeoPass, the shared header, the result card and the list of games.
   Every page loads it in its <head> (before its own scripts) from ../brand/mingo.js.
   Everything lives in window.Geomingo. */
/* European number format everywhere (Héctor, 2026-11-02): a dot for thousands and a comma for decimals,
   4.964 km, 83,7 years. EU(n) keeps up to 3 decimals, EU(n,1) always 1. EUT(text) turns '10,000' and '0.9' in a
   written label into '10.000' and '0,9' (only for showing it: the labels stay the same inside the games). */
window.EU=(n,d)=>Number(n||0).toLocaleString('de-DE',d==null?{maximumFractionDigits:3}:{minimumFractionDigits:d,maximumFractionDigits:d});
window.EUT=s=>String(s).replace(/(\d),(?=\d{3}(?!\d))/g,'$1\u0001').replace(/(\d)\.(?=\d)/g,'$1,').replace(/\u0001/g,'.');
(function(){
'use strict';
// a browser that has never opened Geomingo: nothing saved yet (read before anything below saves) — counted in /stats
let FRESH=false;try{FRESH=!localStorage.length}catch(e){}
const SRC=document.currentScript&&document.currentScript.src||location.href;
const HOME=new URL('../',SRC).href;          // the Geomingo home page (geomingo.com/)
const ROOT=HOME;                             // the games live in folders of the home page

/* ---------- saved on this device ---------- */
const store={get:k=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,v)}catch(e){}}};

/* ---------- the games, each one a trip ----------
   id: the id each game already uses for its saves (Countries kept Borderline's), soon: shown as "Coming soon" */
const GAMES=[
  {id:'borderline',first:'2026-10-15',arch:'bl-arch',name:'Countries',path:'countries/',gate:'1',hint:'Fill the grid with countries'},
  {id:'citygrid',first:'2026-10-22',arch:'cc-arch',name:'Capitals',path:'capitals/',gate:'2',hint:'Fill the grid with capitals'},
  {id:'connections',first:'2026-10-19',arch:'cx-arch',name:'Connections',path:'connections/',gate:'3',hint:'Find 4 hidden groups'},
  {id:'top10',first:'2026-10-19',arch:'t10-arch',name:'Top 10',path:'top10/',gate:'4',hint:'Name the top 10 countries'},
  {id:'silhouette',first:'2026-10-22',arch:'sil-arch',name:'Silhouette',path:'silhouette/',gate:'5',hint:'Guess the hidden country'},
  {id:'customs',first:'2026-11-02',arch:'cu-arch',name:'Customs',path:'customs/',gate:'6',hint:'Guess the country from clues'},
  {id:'flagpie',first:'2026-11-04',arch:'fp-arch',name:'Flag Pie',path:'flagpie/',gate:'7',hint:'Guess the flag from its colours'},
  {id:'impostor',first:'2026-11-08',arch:'im-arch',name:'Impostor',path:'impostor/',gate:'8',hint:'Find the country that doesn\'t fit'},
  {id:'compass',first:'2026-11-10',arch:'cm-arch',name:'Compass',path:'compass/',gate:'9',hint:'Find the capital with a compass'}];
// first: the day of the game's daily #1; arch: where its Archive games are kept on this device (Menu → Archive reads both)
/* ARCH_FROM: the Archive offers every game from Countries' first daily (Héctor 2026-11-17: "como si estuvieran los 9 juegos").
   Days before a game's own first daily are dealt by its usual daily rules (its puzzles and numbers from its first day on
   stay as they are); they have no number, so they show their date instead ("Archive 15 Oct", archNo) */
const ARCH_FROM='2026-10-15';
const archNo=n=>typeof n==='string'&&!/^\d+$/.test(n)?n:'#'+n;
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
    return {done:true,label:(d.S.qs||[]).reduce((n,q)=>n+clFlag(q),0)+((d.S.qs||[]).some(q=>q.x3)?'/100':'/25')}}
  if(id==='flagpie'){const d=json('fp-daily');if(!(d&&d.date===k&&d.over&&d.S))return {done:false};
    if(!Array.isArray(d.S.qs))return {done:true,label:(d.S.st==='right'?6-d.S.k:0)+'/5'};
    return {done:true,label:d.S.qs.reduce((n,q)=>n+clFlag(q),0)+(d.S.qs.some(q=>q.x3)?'/100':'/25')}}
  if(id==='impostor'){const d=json('im-daily');if(!(d&&d.date===k&&d.over&&d.S&&Array.isArray(d.S.qs)))return {done:false};
    return {done:true,label:d.S.qs.reduce((n,q)=>n+impRound(q),0)+(d.S.qs.some(q=>q.x5)?'/100':d.S.qs.some(q=>q.x3)?'/90':'/30')}}
  if(id==='compass'){const d=json('cm-daily');if(!(d&&d.date===k&&d.over&&d.S&&Array.isArray(d.S.qs)))return {done:false};
    return {done:true,label:d.S.qs.reduce((n,q)=>n+(q.st==='right'?+q.p||0:0),0)+(d.S.qs.some(q=>q.x3)?'/100':'/25')}}
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
    ['cx-hist','t10-hist','sil-hist','cu-hist','fp-hist','im-hist'].forEach(k=>Object.keys(json(k)||{}).forEach(x=>s.add(x)));
    d=[...s].filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x)).sort()}
  const k=dayKey();
  if(!d.includes(k)&&GAMES.some(g=>playedToday(g.id)))d.push(k);
  d=d.sort().slice(-400);store.set('gm-days',JSON.stringify(d));return d}
/* the streak: days in a row with at least one daily played. A missed day is saved by a rest day, one a week (Monday to
   Sunday), used on its own (Héctor 2026-11-16, like a streak freeze). A rest day keeps the streak but doesn't add to it.
   Today not played yet never breaks it. streakInfo(): {now, best, rest: the days saved, restLeft: this week's rest day still free} */
const dnum=k=>Math.floor(Date.parse(k+'T12:00Z')/864e5),wnum=x=>Math.floor((x+3)/7);   // day number; its week, Monday first
function streakInfo(){const set=new Set(days().map(dnum)),t=dnum(dayKey()),used=new Set(),rest=new Set();
  const all=[...set].sort((a,b)=>a-b);let now=0,best=0;
  if(all.length)for(let x=all[0];x<=t;x++){
    if(set.has(x))now++;
    else if(x===t){}                                                   // today is still open
    else if(now>0&&!used.has(wnum(x))){used.add(wnum(x));rest.add(x)}
    else now=0;
    best=Math.max(best,now)}
  return {now,best,rest,restLeft:!used.has(wnum(t))}}
const streak=()=>streakInfo().now;

/* ---------- the GeoPass: every right answer is a stamp (gm-pass) ----------
   {n: stamps in all, since: first day, list: the latest stamps [{g: game id, t: name, s: small text, d: day}]}
   The first time, n is filled in from the games' histories on this device (one stamp per right answer). */
function seedCount(){let n=0,first=null;const see=k=>{if(/^\d{4}-\d{2}-\d{2}$/.test(k)&&(!first||k<first))first=k};
  ['bl-hist','cc-hist'].forEach(k=>{const h=json(k)||{};Object.keys(h).forEach(x=>{const e=h[x];if(e&&e.f!==0){n+=+e.c||0;see(x)}})});
  const cx=json('cx-hist')||{};Object.keys(cx).forEach(x=>{n+=cx[x]&&cx[x].w?4:0;see(x)});
  const t=json('t10-hist')||{};Object.keys(t).forEach(x=>{n+=+(t[x]&&t[x].f)||0;see(x)});
  const s=json('sil-hist')||{};Object.keys(s).forEach(x=>{Object.values(s[x]||{}).forEach(v=>{if(typeof v==='number')n+=v});see(x)});
  const u=json('cu-hist')||{};Object.keys(u).forEach(x=>{n+=+(u[x]&&u[x].r)||0;see(x)});
  const f=json('fp-hist')||{};Object.keys(f).forEach(x=>{n+=+(f[x]&&f[x].r)||0;see(x)});
  const im=json('im-hist')||{};Object.keys(im).forEach(x=>{n+=+(im[x]&&im[x].r)||0;see(x)});
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
// the game's bit in the atlas (Compass ticked Capitals' bit until 2026-11-16; now it has its own)
const ABIT=g=>GBIT[g]||0;
function stamp(g,t,s,code){const p=pass(),x={g,t:String(t),s:s?String(s):'',d:dayKey()};
  // only the daily counts for the countries (Héctor 2026-11-16): a Practice or With friends stamp is marked p and ticks nothing
  if(mode())x.p=1;
  else if(code&&ABIT(g)&&ATLAS[code]){x.c=code;const a=atlas(p);a[code]=(a[code]||0)|ABIT(g)}
  p.n++;p.list.push(x);p.list=p.list.slice(-240);
  store.set('gm-pass',JSON.stringify(p));refreshPass();stampHooks.forEach(f=>{try{f(x)}catch(e){}});return p.n}

/* ---------- the atlas: the 197 countries (193 UN members, Vatican City, Palestine, Kosovo, Taiwan: the same list in every game) and which games have had each one right (gm-pass .atlas, bits) ----------
   Since 2026-11-16 (Héctor): right once in any game = visited; right in 3 different games = expert. Countries, Capitals,
   Silhouette, Top 10, Customs, Flag Pie, Impostor and Compass count (Connections has no countries). Before, Compass ticked
   Capitals and Impostor didn't count, so older atlases have those as Capitals or not at all.
   ATLAS[code] = {n: name, r: continent, m: (old, unused) the games it can come up in, k: capital}. */
const GBIT={borderline:1,citygrid:2,silhouette:4,top10:8,customs:16,flagpie:32,impostor:64,compass:128};
// expert (Héctor 2026-11-16): right in Countries, Capitals, Silhouette and Top 10, plus one of Customs, Flag Pie, Impostor, Compass.
// The two countries in no Top 10 list (ATLAS m without the Top 10 bit) don't need Top 10.
const CORE=GBIT.borderline|GBIT.citygrid|GBIT.silhouette|GBIT.top10,OTHER=GBIT.customs|GBIT.flagpie|GBIT.impostor|GBIT.compass,EXPERT=5;
// known (Héctor 2026-11-16): halfway, 3 of the 5 steps
const KNOWN=3;
const coreOf=code=>CORE&(ATLAS[code]?ATLAS[code].m|~GBIT.top10:CORE);
const ATLAS={};"AFG|Afghanistan|AS|15|Kabul;ALB|Albania|EU|15|Tirana;DZA|Algeria|AF|15|Algiers;AND|Andorra|EU|15|Andorra la Vella;AGO|Angola|AF|15|Luanda;ATG|Antigua and Barbuda|NA|15|St. John's;ARG|Argentina|SA|15|Buenos Aires;ARM|Armenia|AS|15|Yerevan;AUS|Australia|OC|15|Canberra;AUT|Austria|EU|15|Vienna;AZE|Azerbaijan|AS|15|Baku;BHS|Bahamas|NA|15|Nassau;BHR|Bahrain|AS|15|Manama;BGD|Bangladesh|AS|15|Dhaka;BRB|Barbados|NA|15|Bridgetown;BLR|Belarus|EU|15|Minsk;BEL|Belgium|EU|15|Brussels;BLZ|Belize|NA|15|Belmopan;BEN|Benin|AF|15|Porto-Novo;BTN|Bhutan|AS|15|Thimphu;BOL|Bolivia|SA|15|Sucre;BIH|Bosnia and Herzegovina|EU|15|Sarajevo;BWA|Botswana|AF|15|Gaborone;BRA|Brazil|SA|15|Brasília;BRN|Brunei|AS|15|Bandar Seri Begawan;BGR|Bulgaria|EU|15|Sofia;BFA|Burkina Faso|AF|15|Ouagadougou;BDI|Burundi|AF|15|Gitega;KHM|Cambodia|AS|15|Phnom Penh;CMR|Cameroon|AF|15|Yaoundé;CAN|Canada|NA|15|Ottawa;CPV|Cape Verde|AF|15|Praia;CAF|Central African Republic|AF|15|Bangui;TCD|Chad|AF|15|N'Djamena;CHL|Chile|SA|15|Santiago;CHN|China|AS|15|Beijing;COL|Colombia|SA|15|Bogotá;COM|Comoros|AF|15|Moroni;CRI|Costa Rica|NA|15|San José;HRV|Croatia|EU|15|Zagreb;CUB|Cuba|NA|15|Havana;CYP|Cyprus|EU|15|Nicosia;CZE|Czechia|EU|15|Prague;DNK|Denmark|EU|15|Copenhagen;DJI|Djibouti|AF|15|Djibouti;DMA|Dominica|NA|15|Roseau;DOM|Dominican Republic|NA|15|Santo Domingo;COD|DR Congo|AF|15|Kinshasa;ECU|Ecuador|SA|15|Quito;EGY|Egypt|AF|15|Cairo;SLV|El Salvador|NA|15|San Salvador;GNQ|Equatorial Guinea|AF|15|Malabo;ERI|Eritrea|AF|15|Asmara;EST|Estonia|EU|15|Tallinn;SWZ|Eswatini|AF|15|Mbabane;ETH|Ethiopia|AF|15|Addis Ababa;FJI|Fiji|OC|15|Suva;FIN|Finland|EU|15|Helsinki;FRA|France|EU|15|Paris;GAB|Gabon|AF|15|Libreville;GMB|Gambia|AF|15|Banjul;GEO|Georgia|AS|15|Tbilisi;DEU|Germany|EU|15|Berlin;GHA|Ghana|AF|15|Accra;GRC|Greece|EU|15|Athens;GRD|Grenada|NA|15|St. George's;GTM|Guatemala|NA|15|Guatemala City;GIN|Guinea|AF|15|Conakry;GNB|Guinea-Bissau|AF|15|Bissau;GUY|Guyana|SA|15|Georgetown;HTI|Haiti|NA|15|Port-au-Prince;HND|Honduras|NA|15|Tegucigalpa;HUN|Hungary|EU|15|Budapest;ISL|Iceland|EU|15|Reykjavík;IND|India|AS|15|Delhi;IDN|Indonesia|AS|15|Jakarta;IRN|Iran|AS|15|Tehran;IRQ|Iraq|AS|15|Baghdad;IRL|Ireland|EU|15|Dublin;ISR|Israel|AS|15|Jerusalem;ITA|Italy|EU|15|Rome;CIV|Ivory Coast|AF|15|Yamoussoukro;JAM|Jamaica|NA|15|Kingston;JPN|Japan|AS|15|Tokyo;JOR|Jordan|AS|15|Amman;KAZ|Kazakhstan|AS|15|Astana;KEN|Kenya|AF|15|Nairobi;KIR|Kiribati|OC|15|Tarawa;UNK|Kosovo|EU|15|Pristina;KWT|Kuwait|AS|15|Kuwait City;KGZ|Kyrgyzstan|AS|15|Bishkek;LAO|Laos|AS|15|Vientiane;LVA|Latvia|EU|15|Riga;LBN|Lebanon|AS|15|Beirut;LSO|Lesotho|AF|15|Maseru;LBR|Liberia|AF|15|Monrovia;LBY|Libya|AF|15|Tripoli;LIE|Liechtenstein|EU|15|Vaduz;LTU|Lithuania|EU|15|Vilnius;LUX|Luxembourg|EU|15|Luxembourg;MDG|Madagascar|AF|15|Antananarivo;MWI|Malawi|AF|15|Lilongwe;MYS|Malaysia|AS|15|Kuala Lumpur;MDV|Maldives|AS|15|Malé;MLI|Mali|AF|15|Bamako;MLT|Malta|EU|15|Valletta;MHL|Marshall Islands|OC|15|Majuro;MRT|Mauritania|AF|15|Nouakchott;MUS|Mauritius|AF|15|Port Louis;MEX|Mexico|NA|15|Mexico City;FSM|Micronesia|OC|15|Palikir;MDA|Moldova|EU|15|Chișinău;MCO|Monaco|EU|15|Monaco;MNG|Mongolia|AS|15|Ulaanbaatar;MNE|Montenegro|EU|15|Podgorica;MAR|Morocco|AF|15|Rabat;MOZ|Mozambique|AF|15|Maputo;MMR|Myanmar|AS|15|Naypyidaw;NAM|Namibia|AF|15|Windhoek;NRU|Nauru|OC|15|Yaren;NPL|Nepal|AS|15|Kathmandu;NLD|Netherlands|EU|15|Amsterdam;NZL|New Zealand|OC|15|Wellington;NIC|Nicaragua|NA|15|Managua;NER|Niger|AF|15|Niamey;NGA|Nigeria|AF|15|Abuja;PRK|North Korea|AS|15|Pyongyang;MKD|North Macedonia|EU|15|Skopje;NOR|Norway|EU|15|Oslo;OMN|Oman|AS|15|Muscat;PAK|Pakistan|AS|15|Islamabad;PLW|Palau|OC|15|Ngerulmud;PSE|Palestine|AS|15|Ramallah;PAN|Panama|NA|15|Panama City;PNG|Papua New Guinea|OC|15|Port Moresby;PRY|Paraguay|SA|15|Asunción;PER|Peru|SA|15|Lima;PHL|Philippines|AS|15|Manila;POL|Poland|EU|15|Warsaw;PRT|Portugal|EU|15|Lisbon;QAT|Qatar|AS|15|Doha;COG|Republic of the Congo|AF|15|Brazzaville;ROU|Romania|EU|15|Bucharest;RUS|Russia|EU|15|Moscow;RWA|Rwanda|AF|15|Kigali;KNA|Saint Kitts and Nevis|NA|15|Basseterre;LCA|Saint Lucia|NA|15|Castries;VCT|Saint Vincent and the Grenadines|NA|15|Kingstown;WSM|Samoa|OC|15|Apia;SMR|San Marino|EU|15|San Marino;STP|São Tomé and Príncipe|AF|15|São Tomé;SAU|Saudi Arabia|AS|15|Riyadh;SEN|Senegal|AF|15|Dakar;SRB|Serbia|EU|15|Belgrade;SYC|Seychelles|AF|15|Victoria;SLE|Sierra Leone|AF|15|Freetown;SGP|Singapore|AS|15|Singapore;SVK|Slovakia|EU|15|Bratislava;SVN|Slovenia|EU|15|Ljubljana;SLB|Solomon Islands|OC|15|Honiara;SOM|Somalia|AF|15|Mogadishu;ZAF|South Africa|AF|15|Pretoria;KOR|South Korea|AS|15|Seoul;SSD|South Sudan|AF|15|Juba;ESP|Spain|EU|15|Madrid;LKA|Sri Lanka|AS|15|Colombo;SDN|Sudan|AF|15|Khartoum;SUR|Suriname|SA|15|Paramaribo;SWE|Sweden|EU|15|Stockholm;CHE|Switzerland|EU|15|Bern;SYR|Syria|AS|15|Damascus;TWN|Taiwan|AS|15|Taipei;TJK|Tajikistan|AS|15|Dushanbe;TZA|Tanzania|AF|15|Dodoma;THA|Thailand|AS|15|Bangkok;TLS|Timor-Leste|AS|15|Dili;TGO|Togo|AF|15|Lomé;TON|Tonga|OC|7|Nukuʻalofa;TTO|Trinidad and Tobago|NA|15|Port of Spain;TUN|Tunisia|AF|15|Tunis;TUR|Türkiye|AS|15|Ankara;TKM|Turkmenistan|AS|15|Ashgabat;TUV|Tuvalu|OC|15|Funafuti;UGA|Uganda|AF|15|Kampala;UKR|Ukraine|EU|15|Kyiv;ARE|United Arab Emirates|AS|15|Abu Dhabi;GBR|United Kingdom|EU|15|London;USA|United States|NA|15|Washington;URY|Uruguay|SA|15|Montevideo;UZB|Uzbekistan|AS|15|Tashkent;VUT|Vanuatu|OC|7|Port Vila;VAT|Vatican City|EU|15|Vatican City;VEN|Venezuela|SA|15|Caracas;VNM|Vietnam|AS|15|Hanoi;YEM|Yemen|AS|15|Sanaa;ZMB|Zambia|AF|15|Lusaka;ZWE|Zimbabwe|AF|15|Harare".split(';').forEach(r=>{const [c,n,re,m,k]=r.split('|');ATLAS[c]={n,r:re,m:+m|GBIT.customs|GBIT.flagpie,k}});
const bits=m=>{let n=0;for(let b=1;b<=128;b<<=1)if(m&b)n++;return n};
// the first time: what the latest stamps on this device already say (names of countries and capitals)
function atlasFromList(list){const a={},by={};
  for(const c in ATLAS){by['n'+ATLAS[c].n.toLowerCase()]=c;if(ATLAS[c].k)by['k'+ATLAS[c].k.toLowerCase()]=c}
  by['kla paz']='BOL'; // older Capitals stamps said La Paz for Bolivia
  (list||[]).forEach(x=>{const b=ABIT(x.g);if(!b||x.p)return;const c=x.c&&ATLAS[x.c]?x.c:by[(x.g==='citygrid'||x.g==='compass'?'k':'n')+String(x.t).toLowerCase()];
    if(c)a[c]=(a[c]||0)|b});return a}
// cu / fp / va / cm / ic: once, when Customs (and later Flag Pie, Vatican City on 2026-11-07, Compass on 2026-11-10, Impostor and
// Compass as games of their own on 2026-11-16) joined the atlas, their stamps already in the list are added to an older atlas
function atlas(p){p=p||pass();if(!p.atlas||typeof p.atlas!=='object'){p.atlas=atlasFromList(p.list);p.cu=1;p.fp=1;p.va=1;p.cm=1;p.ic=1;store.set('gm-pass',JSON.stringify(p))}
  else if(!p.cu||!p.fp||!p.va||!p.cm||!p.ic){const f=atlasFromList(p.list);for(const c in f)p.atlas[c]=(p.atlas[c]||0)|f[c];p.cu=1;p.fp=1;p.va=1;p.cm=1;p.ic=1;store.set('gm-pass',JSON.stringify(p))}
  return p.atlas}
// one country: {have: the games it was right in (bits), n: how many, seen: visited, step / of: on the way to expert
// (one for each core game, one more for any of the others), mine: expert, core: the core games it needs}
// (Héctor 2026-11-17: any games count; visited 1, known 3, expert 5 different games)
function country(code,a){const h=(a||atlas())[code]||0,n=bits(h),core=coreOf(code),of=EXPERT,step=Math.min(n,EXPERT);
  return {have:h,n,seen:n>0,step,of,core,known:step>=KNOWN,mine:step>=of}}
// what a country still needs to be expert: "Capitals and Silhouette", "one more game (Top 10, Customs…)"
function missing(h){const k=Math.max(0,EXPERT-bits(h));return k+' more game'+(k===1?'':'s')}
const countriesMine=a=>{a=a||atlas();return Object.keys(ATLAS).filter(c=>country(c,a).mine).length};
const countriesSeen=a=>{a=a||atlas();return Object.keys(ATLAS).filter(c=>country(c,a).seen).length};
const countriesKnown=a=>{a=a||atlas();return Object.keys(ATLAS).filter(c=>{const x=country(c,a);return x.known&&!x.mine}).length};
const stateOf=x=>x.mine?'expert':x.known?'known':'visited';

/* ---------- km and levels: every daily game you finish earns km for how well it went ----------
   up to 100 for the result, +20 for a perfect game, +50 on a day you play all of them (ALLN: how many games that is).
   Clue games (Customs, Flag Pie, Impostor): each right answer is worth 100/n km, minus 5% for every extra clue it took
   (so 80% at the last clue); all right = perfect (+20). Connections: 25 km per group found, minus 10 per mistake, +20
   for no mistakes at all; nothing for giving up at once. */
// longer road (Héctor 2026-11-16): a good daily player (~600 km a day) reaches Explorer in a month, Legend in about 14 months
const LEVELS=[['Tourist',0],['Backpacker',2000],['Traveller',7500],['Explorer',20000],['Ambassador',50000],['Globetrotter',100000],['Legend',250000]];
const ALL5=50,ALLN=GAMES.filter(g=>!g.soon).length,ALLW=['','one','two','three','four','five','six','seven','eight','nine'][ALLN]||String(ALLN);
const pts=f=>{f=Math.max(0,Math.min(1,+f||0));return Math.round(f*100)+(f>=1?20:0)};
// r right answers out of n, p points (5 for the first clue down to 1 for the fifth)
const clPts=(r,p,n)=>{r=+r||0;p=+p||0;n=+n||0;if(!n)return 0;const f=Math.max(0,Math.min(1,(.75*r+.05*p)/n));return Math.round(f*100)+(r>=n?20:0)};
// f groups found out of 4, m mistakes
// h: categories shown with the hint button (from 2026-11-18): 10 less each, and no +20 for a perfect game
const cxPts=(f,m,h)=>{f=Math.max(0,Math.min(4,+f||0));m=+m||0;h=+h||0;return Math.max(0,25*f-10*m-10*h)+(f>=4&&!m&&!h?20:0)};
/* From KM_FROM (Héctor 2026-11-14) every game uses the same table: up to 100 points, +20 for a perfect game (not one
   mistake), and the daily's points are its km. Days before keep the km they had (the formulas above).
   Countries, Capitals keep their own points (hard squares, speed, lines): 1 km for every 15 points, up to 100, +20 for
   all 16 squares with no life lost. Connections: 25 a group, -10 a mistake (cxPts). Top 10: 10 an answer.
   Silhouette: 10 a shape, +10 for all 9. Customs, Flag Pie, Compass: 20 at the first clue, 1 less for each clue more
   (15 per right answer + its 5-to-1 points). Impostor: 15 caught first time, 1 less for each wrong pick, +10 for all 6;
   from IMP3_FROM (Héctor 2026-11-15: a late catch gave almost as much as a first one; he asked for it from that same day) 15, 10, 5, 3, 1 (IMP3), and the history
   and the ranking keep these points (p / s) instead of the old 5-to-1 ones.
   w / m: mistakes (null = not known: counts as none). */
const KM_FROM='2026-11-15';
const newKm=d=>d>=KM_FROM;
const IMP3_FROM='2026-11-15',imp3=d=>!d||d>=IMP3_FROM;   // no day (Practice, With friends): the new table
// a saved result (history entry, ranking row) has the new points from the day after IMP3_FROM, and on that day only if it says x3
const impNew=(d,x)=>!d||d>IMP3_FROM||d===IMP3_FROM&&!!x;
// from IMP5_FROM (Héctor 2026-11-15, starts the next day): five rounds like Customs, Flag Pie and Compass, 20, 15, 10, 5, 3
// a round (CL3, x5 on the round), no +10 for all caught; 5 x 20 = 100, +20 perfect. No day (Practice, With friends): five rounds
const IMP5_FROM='2026-11-16',imp5=d=>!d||d>=IMP5_FROM;
const IMP3=[15,10,5,3,1],impRound=q=>q.st!=='right'?0:q.x5?[20,15,10,5,3][q.k-1]||0:q.x3?IMP3[q.k-1]||0:6-q.k;   // a round's stored points (x3: a game from IMP3_FROM, x5: from IMP5_FROM)
// Flag Pie, Customs, Compass from CL3_FROM (Héctor 2026-11-15: +16 with all five clues was far too much, "like Impostor"):
// 20, 15, 10, 5, 3 an answer by clues open (Compass: by clues and wrong guesses; x3 on the answer), so five still make 100;
// the history and the ranking keep these points (p / s, 0-100). clFlag: an answer's stored points by clues open
const CL3_FROM='2026-11-15',cl3=d=>!d||d>=CL3_FROM;
const clNew=(d,x)=>!d||d>CL3_FROM||d===CL3_FROM&&!!x;
const CL3=[20,15,10,5,3],clFlag=q=>q.st!=='right'?0:q.x3?CL3[q.k-1]||0:6-q.k;
// from KMSQ_FROM (Héctor 2026-11-17) the daily Countries and Capitals squares are worth whole km (16 share 100, a hard one up
// to three times an easy one, no speed): their points ARE km. Days before it (Héctor 2026-11-17: fix the games already
// played, their speed points gave odd km): 100 km for all the squares, shared evenly by the squares right; +20 perfect
const KMSQ_FROM='2026-11-18';
const pf=(all,m)=>all&&!(+m)?20:0;
const KM={
  grid:(s,c,n,w,d)=>{n=(+n||4)*(+n||4);return Math.min(100,d&&d>=KMSQ_FROM?Math.round(+s||0):Math.round(Math.min(+c||0,n)/n*100))+pf((+c||0)>=n,w)},
  top10:(f,m)=>{f=Math.min(+f||0,10);return 10*f+pf(f>=10,m)},
  sil:(r,m)=>{r=Math.min(+r||0,9);return 10*r+(r>=9?10:0)+pf(r>=9,m)},
  clue:(r,p,n)=>{r=+r||0;p=+p||0;n=+n||5;return Math.round((15*r+p)*5/n)+(p>=5*n?20:0)},
  imp:(r,p,d,x,x5)=>{r=+r||0;p=+p||0;if(d?d>=IMP5_FROM:x5)return p+(p>=100?20:0);const n=impNew(d,x);return (n?p:10*r+p)+(r>=6?10:0)+(p>=(n?90:30)?20:0)},
  cl3:(r,p,d,x,n)=>{if(!clNew(d,x))return KM.clue(r,p,n);p=+p||0;return p+(p>=100?20:0)}};
// this device's daily games, from each game's own history: {day: {game id: km}}
function ledger(){const L={},add=(d,id,mi)=>{if(/^\d{4}-\d{2}-\d{2}$/.test(d))(L[d]=L[d]||{})[id]=mi};
  [['bl-hist','borderline'],['cc-hist','citygrid']].forEach(([k,id])=>{const h=json(k)||{};
    for(const d in h){const e=h[d];if(e&&e.f!==0){const n=+e.n||3;add(d,id,newKm(d)?KM.grid(e.s,e.c,n,e.w,d):pts((+e.c||0)/(n*n)))}}});
  const cx=json('cx-hist')||{};for(const d in cx)if(cx[d])add(d,'connections',cxPts(cx[d].f!=null?cx[d].f:cx[d].w?4:0,cx[d].m,cx[d].h));
  const t=json('t10-hist')||{};for(const d in t)if(t[d])add(d,'top10',newKm(d)?KM.top10(t[d].f,t[d].l!=null?5-t[d].l:null):pts((+t[d].f||0)/10));
  const s=json('sil-hist')||{},sm=json('sil-miss')||{};for(const d in s){const day=s[d]||{},k=Object.keys(day).filter(x=>typeof day[x]==='number');
    if(!k.length)continue;if(!newKm(d)){add(d,'silhouette',pts(Math.max(...k.map(x=>day[x]))/9));continue}
    add(d,'silhouette',Math.max(...k.map(x=>KM.sil(day[x],(sm[d]||{})[x]))))}
  const u=json('cu-hist')||{};for(const d in u)if(u[d])add(d,'customs',newKm(d)?KM.cl3(u[d].r,u[d].p,d,u[d].x3,5):clPts(u[d].r,u[d].p,5));
  const f=json('fp-hist')||{};for(const d in f)if(f[d])add(d,'flagpie',newKm(d)?KM.cl3(f[d].r,f[d].p,d,f[d].x3,+f[d].n||5):clPts(f[d].r,f[d].p,+f[d].n||5));
  const im=json('im-hist')||{};for(const d in im)if(im[d])add(d,'impostor',newKm(d)?KM.imp(im[d].r,im[d].p,d,im[d].x3):clPts(im[d].r,im[d].p,6));
  const cm=json('cm-hist')||{};for(const d in cm)if(cm[d])add(d,'compass',newKm(d)?KM.cl3(cm[d].r,cm[d].p,d,cm[d].x3,5):clPts(cm[d].r,cm[d].p,5));
  // archive games: a past daily played later counts on its own day (archive games below)
  GAMES.forEach(g=>{const f=ARL[g.id],a=f&&g.arch&&json(g.arch);if(!a||typeof a!=='object')return;
    for(const d in a){const S=a[d];if(!archDone(S)||(L[d]&&L[d][g.id]!=null))continue;add(d,g.id,rowKm(g.id,f[1](S),d))}});
  return L}
/* ---------- archive games (Héctor 2026-11-16): a past daily played later, from the Archive, counts like that daily ----------
   Its km go to the day of the puzzle (not the day it was played): in the GeoPass (ledger above) and, signed in, in that day's
   public ranking (../brand/account.js archRank, the row marked ar). The streak only counts days played on their day.
   ARL: game id → [its ranking path, the ranking row of a finished archive game (the same row as the daily's)] */
const archDone=S=>!!S&&typeof S==='object'&&!!S.over;
const gridRow=S=>{const p=(S.players||[])[0]||{};return {s:+p.score||0,c:+p.cells||0,n:+S.n||4,w:S.lives!=null?Math.max(0,5-S.lives):(+S.wrong||0)}};
const qsOf=S=>Array.isArray(S.qs)?S.qs:[],rightN=S=>qsOf(S).filter(q=>q.st==='right').length,triesN=S=>qsOf(S).reduce((n,q)=>n+(q.tries||[]).length,0);
const x3Of=S=>qsOf(S).some(q=>q.x3)?1:0;
const clRow=S=>({x3:x3Of(S),s:qsOf(S).reduce((n,q)=>n+clFlag(q),0),r:rightN(S),m:triesN(S)});
const ARL={
  borderline:[()=>'leaderboard',gridRow],
  citygrid:[()=>'lb/capitals',gridRow],
  connections:[()=>'lb/connections',S=>({s:(S.found||[]).length,m:+S.mistakes||0})],
  top10:[()=>'lb/top10',S=>({s:(S.found||[]).length,m:(S.wrong||[]).length})],
  silhouette:[S=>'lb/sil-'+(S.diff||'normal'),S=>({s:rightN(S),m:triesN(S)})],
  customs:[()=>'lb/customs',clRow],
  flagpie:[()=>'lb/flagpie',clRow],
  impostor:[()=>'lb/impostor',S=>({x3:x3Of(S),s:qsOf(S).reduce((n,q)=>n+impRound(q),0),r:rightN(S),m:qsOf(S).filter(q=>q.st==='wrong'&&q.pick).length})],
  compass:[()=>'lb/compass',S=>({x3:x3Of(S),s:qsOf(S).reduce((n,q)=>n+(q.st==='right'?+q.p||0:0),0),r:rightN(S),m:triesN(S)})]};
// a ranking row's km on day d (the home page's ranking counts them the same way)
function rowKm(id,r,d){const N=newKm(d);
  if(id==='borderline'||id==='citygrid'){const n=+r.n||4;return N?KM.grid(r.s,r.c,n,r.w,d):pts((+r.c||0)/(n*n))}
  if(id==='connections')return cxPts(r.s,r.m,r.h);
  if(id==='top10')return N?KM.top10(r.s,r.m):pts((+r.s||0)/10);
  if(id==='silhouette')return N?KM.sil(r.s,r.m):pts((+r.s||0)/9);
  if(id==='impostor')return N?KM.imp(r.r,r.s,d,r.x3):clPts(r.r,r.s,6);
  return N?KM.cl3(r.r,r.s,d,r.x3,5):clPts(r.r,r.s,5)}
const dayTotal=day=>{const v=Object.values(day||{});return v.reduce((a,b)=>a+b,0)+(v.length>=ALLN?ALL5:0)};
function level(km){let i=0;LEVELS.forEach((l,k)=>{if(km>=l[1])i=k});const next=LEVELS[i+1];
  return {i,name:LEVELS[i][0],next,pct:next?Math.round((km-LEVELS[i][1])/(next[1]-LEVELS[i][1])*100):100}}
function geo(){const L=ledger(),k=dayKey();let km=0,games=0;
  for(const d in L){km+=dayTotal(L[d]);games+=Object.keys(L[d]).length}
  return {L,km,miles:km,games,today:L[k]||{},todayKm:dayTotal(L[k]),todayMiles:dayTotal(L[k]),streak:streak()}}

/* ---------- the clock: how long each daily took ----------
   gm-times {day: {game: {a: when today's puzzle was first on screen, b: when it ended, f: share right 0..1}}}, kept on this device.
   Each game starts it when it shows today's unfinished puzzle and stops it when the puzzle ends; the seconds go with the result
   to the daily ranking (sec), for the Fastest of the day visa. Game ids: borderline, citygrid, connections, top10, silhouette, customs, flagpie, impostor, compass. */
const clockAll=()=>{const T=json('gm-times');return T&&typeof T==='object'?T:{}};
function clockStart(g,d){d=d||dayKey();if(d!==dayKey())return;const T=clockAll(),x=T[d]=T[d]||{};if(x[g])return;x[g]={a:Date.now()};
  const ks=Object.keys(T).sort();while(ks.length>400)delete T[ks.shift()];store.set('gm-times',JSON.stringify(T))}
function clockStop(g,d,f){const T=clockAll(),x=T[d]&&T[d][g];if(!x||x.b)return;x.b=Date.now();x.f=Math.max(0,Math.min(1,+f||0));store.set('gm-times',JSON.stringify(T))}
function clockSecs(g,d){const x=(clockAll()[d]||{})[g];return x&&x.b&&x.b>=x.a?Math.max(1,Math.round((x.b-x.a)/1000)):null}
const clock={start:clockStart,stop:clockStop,secs:clockSecs};
// 52″, 2′41″, 21′05″
// a turn's time left as a clock: 0:27 (With friends, Héctor 2026-11-17)
const mmss=ms=>{const t=Math.max(0,Math.ceil((ms||0)/1000));return Math.floor(t/60)+':'+String(t%60).padStart(2,'0')};
const secText=s=>s<60?s+'″':Math.floor(s/60)+'′'+String(s%60).padStart(2,'0')+'″';

/* ---------- visas (Héctor 2026-11-16) ----------
   One visa a game, moved up by the days you play its daily: Bronze 1, Silver 7, Gold 30, Platinum 100.
   Twelve special visas: [ink, mark, name, what it takes, done?, progress 0..1 (null: no bar), progress text].
   Gold medal comes from the daily rankings (gm-feats, read by account.js once a day is over, signed in only). */
const TIERS=[['Bronze',1,'#C98B5A'],['Silver',7,'#B9C2CF'],['Gold',30,'#D4AD4B'],['Platinum',100,'#9FE3E0']];
function gameVisas(L){L=L||ledger();return live().map(g=>{const n=Object.values(L).filter(d=>d[g.id]!=null).length;
  let t=-1;TIERS.forEach((x,k)=>{if(n>=x[1])t=k});const next=TIERS[t+1];
  const pf=Object.values(L).filter(d=>d[g.id]>=120).length;   // perfect dailies (★): 100 + 20 for not one mistake
  return {g,n,t,tier:t>=0?TIERS[t]:null,next,pr:next?Math.min(1,n/next[1]):1,left:next?next[1]-n:0,pf}})}
/* the official launch day (Héctor 2026-11-17): the beta ends the day before. Everyone keeps everything; three special
   visas that can only be won at that time: Beta traveller (every game's daily 3 times before it), Opening day (all the dailies on it), Launch week (every day of its first week) */
// days with a daily played on its own day: the streak's list (last 400 days) plus every game's own history, so the beta
// visa stays after a year too
function playedDays(){const s=new Set(days());['bl-hist','cc-hist','cx-hist','t10-hist','sil-hist','cu-hist','fp-hist','im-hist','cm-hist'].forEach(k=>{const h=json(k)||{};
  Object.keys(h).forEach(x=>{if(h[x]&&h[x].f!==0&&/^\d{4}-\d{2}-\d{2}$/.test(x))s.add(x)})});return [...s]}
// Beta traveller (Héctor 2026-11-17): every game's daily played on its own day at least 3 times before the launch
const HIST={borderline:'bl-hist',citygrid:'cc-hist',connections:'cx-hist',top10:'t10-hist',silhouette:'sil-hist',customs:'cu-hist',flagpie:'fp-hist',impostor:'im-hist',compass:'cm-hist'};
// Opening day (Héctor 2026-11-17): all the dailies on the launch day itself
function openGames(){return live().filter(g=>{const h=json(HIST[g.id])||{};return h[LAUNCH]&&h[LAUNCH].f!==0}).length}
function betaGames(){return live().filter(g=>{const h=json(HIST[g.id])||{};return Object.keys(h).filter(d=>d<LAUNCH&&h[d]&&h[d].f!==0).length>=3}).length}
const LAUNCH='2027-01-01',LAUNCH_TXT='1 January 2027',LAUNCH_WEEK=['01','02','03','04','05','06','07'].map(x=>'2027-01-'+x);
function specialVisas(L,S){L=L||ledger();S=S||streakInfo();const dd=playedDays(),beta=betaGames(),open=openGames(),H=k=>json(k)||{},a=atlas();
  const up=(n,of)=>[n>=of,Math.min(1,n/of),fmt(Math.min(n,of))+' / '+fmt(of)];
  const full=Object.values(L).filter(d=>Object.keys(d).length>=ALLN);
  const perfect=full.some(d=>Object.values(d).every(v=>v>=120));
  const expert=Object.keys(ATLAS).filter(c=>country(c,a).mine),conts=new Set(expert.map(c=>ATLAS[c].r)).size;
  const fa=json('gm-feats'),ac=json('gm-acct'),F=fa&&ac&&ac.u&&fa.u===ac.u&&fa.r?fa.r:{};
  let gold=0;for(const g in F)for(const d in F[g]){const e=F[g][d];if(Array.isArray(e)&&e[1]>=2&&e[0]===1)gold++}
  const fr=['cx','t10','sil','cu','fp','im','cm'].some(k=>(+H(k+'-friends').n||0)>0)||
    ['bl-games','cc-games'].some(k=>{const g=json(k);return Array.isArray(g)&&g.some(x=>x&&x.m==='f')});
  return [
    ['#D4AD4B',ALLN+'/'+ALLN,'Grand tour','All '+ALLW+' dailies in one day',full.length>0,null,''],
    ['#F07884','7','Week on the road','7 days in a row',...up(S.best,7)],
    ['#F07884','30','Month away','30 days in a row',...up(S.best,30)],
    ['#F07884','100','100 days','100 days in a row',...up(S.best,100)],
    ['#5FC28F','★','Perfect day','All '+ALLW+' dailies with no mistakes',perfect,null,''],
    ['#A98BE0','6','Six continents','An expert country on every continent',...up(conts,6)],
    ['#6FC7C7','100','World expert','100 expert countries',...up(expert.length,100)],
    ['#D4AD4B','1st','Gold medal','1st in a daily ranking',gold>0,null,''],
    ['#7FA2F0','2+','Good company','A game with friends',fr,null,''],
    // the official launch (Héctor 2026-11-17): only dailies played on their own day count (playedDays), never Archive games
    ['#9FE3E0','β','Beta traveller','Every game\'s daily 3 times before '+LAUNCH_TXT,beta>=ALLN,dayKey()<LAUNCH?beta/ALLN:null,beta+' / '+ALLN],
    ['#D4AD4B','1/1','Opening day','All '+ALLW+' dailies on '+LAUNCH_TXT,open>=ALLN,null,''],
    ['#F07884','1–7','Launch week','A daily every day, 1 to 7 January 2027',LAUNCH_WEEK.every(d=>dd.includes(d)),null,'']]}
/* Challenges (Héctor 2026-11-16, back from the GeoPass before the redesign: "the hard ones that make you come back"):
   the daily rankings (gm-feats, signed in only; a ranking needs 2 players or more), the clock (gm-times) and rare moments.
   Same shape as the special visas plus [7]: a note shown once done (how many times, or your best time).
   Only results with at least half right count for First, Fastest and the clock ones. */
const HALF=.5;
function challengeVisas(){const H=k=>json(k)||{},vals=o=>Object.values(o).filter(Boolean);
  const times=(n,last)=>n?'×'+n+(last?' · last '+dateText(last,{day:'numeric',month:'short'}):''):'';
  const fa=json('gm-feats'),ac=json('gm-acct'),F=fa&&ac&&ac.u&&fa.u===ac.u&&fa.r?fa.r:{};
  const first=[],fast=[],pod=[],byDay={},finish=[];
  for(const g in F)for(const d in F[g]){const e=F[g][d];if(!Array.isArray(e))continue;const [pl,n,f1,fs,t]=e;
    if(n>=2&&pl===1)(byDay[d]=byDay[d]||new Set()).add(g);
    if(n>=2&&pl>=1&&pl<=3)pod.push(d);if(f1)first.push(d);if(fs)fast.push(d);if(t)finish.push([d,g,t])}
  const last=a=>a.slice().sort().pop();
  const crowns=Object.values(byDay).filter(x=>x.size>=3).length;
  let defend=0;for(const g in F){const v=Object.keys(F[g]).filter(d=>{const e=F[g][d];return Array.isArray(e)&&e[0]===1&&e[1]>=2}).map(dnum).sort((a,b)=>a-b);
    let run=0,prev=null;v.forEach(x=>{run=prev!=null&&x===prev+1?run+1:1;if(run===3)defend++;prev=x})}
  const T=clockAll(),tl=[];for(const d in T)for(const g in T[d]){const x=T[d][g];if(x&&x.b&&x.b>=x.a)tl.push({d,g,s:Math.max(1,Math.round((x.b-x.a)/1000)),f:+x.f||0,b:x.b})}
  const good=tl.filter(x=>x.f>=HALF),best=a=>a.length?Math.min(...a.map(x=>x.s)):null;
  const bx=best(good),bl=best(tl.filter(x=>x.g==='silhouette'&&x.f>=1));
  let bt=null;for(const d in T){const day=good.filter(x=>x.d===d);if(new Set(day.map(x=>x.g)).size>=ALLN){const n=day.reduce((a,x)=>a+x.s,0);if(bt==null||n<bt)bt=n}}
  const tb=n=>n==null?'':'Best: '+secText(n);
  const at={};good.forEach(x=>at[x.d+x.g]=x.b);finish.forEach(([d,g,t])=>{const k=d+(g==='leaderboard'?'borderline':g);if(!at[k])at[k]=t});
  let owl=0,call=0;for(const k in at){const m=madridParts(at[k]),day=k.slice(0,10);if(dayKey(at[k])!==day)continue;
    if(+m.hour===0&&+m.minute<10)owl++;if(+m.hour===23&&+m.minute>=50)call++}
  const close=vals(H('cx-hist')).filter(e=>+e.w&&+e.m===4).length;
  const breath=vals(H('t10-hist')).filter(e=>+e.f>=10&&+e.l===1).length;
  const pdn=pod.length;
  return [
    ['#F07884','⏱','First to arrive','First player to finish a daily',first.length>0,null,'',times(first.length,last(first))],
    ['#7FA2F0','⚡','Fastest of the day','Quickest time in a daily ranking',fast.length>0,null,'',times(fast.length,last(fast))],
    ['#A98BE0','3×1','Triple crown','1st in 3 games on the same day',crowns>0,null,'',times(crowns)],
    ['#5FC28F','1·1·1','Defending champion','1st in the same game 3 days running',defend>0,null,'',times(defend)],
    ['#D4AD4B','▲10','Podium regular','Top 3 in 10 dailies',pdn>=10,Math.min(1,pdn/10),fmt(Math.min(pdn,10))+' / 10',pdn>10?'×'+pdn+' podiums':''],
    ['#E09A62','<1′','Express','A daily done in under 1 minute',bx!=null&&bx<60,null,'',tb(bx)],
    ['#A98BE0','2′','Lightning','9/9 in Silhouette in under 2 minutes',bl!=null&&bl<120,null,'',tb(bl)],
    ['#7FA2F0','15′','Speed tour','All '+ALLW+' dailies in under 15 minutes',bt!=null&&bt<900,null,'',tb(bt)],
    ['#9AA6B6','0:00','Night owl','A daily in its first 10 minutes (midnight CET)',owl>0,null,'',times(owl)],
    ['#D4AD4B','23:59','Last call','A daily in its last 10 minutes',call>0,null,'',times(call)],
    ['#F07884','4✕','Close call','Win Connections with 4 mistakes',close>0,null,'',times(close)],
    ['#A98BE0','1♥','Last breath','All ten in a Top 10 with one life left',breath>0,null,'',times(breath)]]}
// all the visas you hold: the games played at least once, the special ones and the challenges done
function visas(){const G=gameVisas(),V=specialVisas(),C=challengeVisas();return {game:G,special:V,challenge:C,got:G.filter(x=>x.tier).length+V.filter(v=>v[4]).length+C.filter(v=>v[4]).length,of:G.length+V.length+C.length}}
const stamps=()=>pass().n;
// a stamp: name, small line, optional flag picture; a player class (c0…c5) gives the player's ink instead
function stampHTML(t,sub,cls,flag){const r=(hsh(t)%15)-7,own=/\bc\d\b/.test(cls||'');
  const L=Math.max(...String(t).split(' ').map(w=>w.length)),fs=L>11?10:L>8?12:14; // long names get smaller, never cut in half
  return '<span class="gm-stamp '+(cls||'')+'" style="'+(own?'':'color:'+INK[hsh(t)%4]+';')+'--r:'+r+'deg">'+(flag?'<img class="sf" src="'+esc(flag)+'" alt="">':'')+'<b class="sn" style="font-size:'+fs+'px">'+esc(t)+'</b>'+(sub?'<small>'+esc(sub)+'</small>':'')+'</span>'}
function refreshPass(){const n=geo().km;document.querySelectorAll('[data-gm-pass]').forEach(b=>{const x=b.querySelector('b');if(x)x.textContent=fmt(n)+' km';b.setAttribute('aria-label','Open your GeoPass: '+fmt(n)+' km')})}
addEventListener('storage',e=>{if(e.key==='gm-pass')refreshPass()});

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
   o.color (With friends games with turns) gives the turn layout: whose turn + the clock (the game's Time box) on one line,
   a thin blue line that runs down, the players as pills; in the last 5 seconds the clock pulses (.tbar.low, set by the game's tick). */
/* the result of today's daily, when it is over (right after playing, or opening the game again later): the gold ticket with
   the score, the km it earned and when the next one comes; Next trip and Share go under it (Héctor 2026-11-10: less is more) */
/* body: the day's answers, shown inside the same ticket under a tear line (Héctor 2026-11-12: one card, buttons below) */
// from KM_FROM the big number is the day's points, the same number as its km (Countries and Capitals keep their own points)
// the streak under the km on the done ticket, from 2 days on: "🔥 5 days in a row" (Héctor 2026-11-16, option B)
function streakSpan(){let n=0;try{n=streak()}catch(e){}return n>=2?'<span class="gm-done-st">🔥 '+n+' days in a row</span>':''}
function doneTicket(id,num,score,next,body){setTimeout(refreshPass,0);setTimeout(dayDone,600);const km=(ledger()[dayKey()]||{})[id];if(km!=null&&newKm(dayKey())&&id!=='borderline'&&id!=='citygrid')score=fmt(km)+' point'+(km===1?'':'s');
  // the trip and daily number sit in the gold strip (not under the game's name: geomingo.css hides it there) (Héctor 2026-11-14)
  const g=GAMES.find(x=>x.id===id);
  return '<section class="ticket gm-done"><div class="tk-mode daily"><span>★ '+(g?'Trip '+g.gate+' · ':'')+'Daily #'+esc(String(num))+'</span><span>Done</span></div>'+
    '<div class="gm-done-c"><p class="big">'+esc(String(score))+'</p><p class="gm-done-s">'+(km!=null?'<b>+'+fmt(km)+' km</b>':'')+streakSpan()+'<span>'+esc(next)+'</span></p></div>'+
    (body?'<div class="tk-tear"></div><div class="gm-done-a">'+body+'</div>':'')+'</section>'}
/* ---------- the day complete (Héctor 2026-11-17) ----------
   When today's last daily is done (all of them played on their day), a window pops up once, with the day's card:
   date, streak, the day's km and the nine games in their colours. "Share my day" shares the card as a picture
   (the phone's share sheet; on a computer the picture is saved and the line copied). gm-dayfull: the day it was shown. */
// Mingo's colours for the picture (the page's .mg-* rules in geomingo.css)
const MG_CSS='.mg-body{fill:#F07884}.mg-deep{fill:#D85C69}.mg-neck{stroke:#F07884;fill:none}.mg-leg{stroke:#D85C69;fill:none}.mg-beak{fill:#F6F1E4}.mg-tip{fill:#16202F}.mg-eye{fill:#16202F}.mg-eyel{stroke:#16202F;fill:none}.mg-pass{fill:#24365F}.mg-gold{fill:none;stroke:#D4AD4B}';
const DCOL={borderline:'#F07884',citygrid:'#D4AD4B',connections:'#7FA2F0',top10:'#5FC28F',silhouette:'#A98BE0',customs:'#E39A5C',flagpie:'#5CC2C2',impostor:'#E58BC8',compass:'#B5D46A'};
function dayInfo(k){k=k||dayKey();const day=ledger()[k]||{},g=live();let st=0;try{st=streak()}catch(e){}
  return {k,km:dayTotal(day),st,games:g.map(x=>({id:x.id,name:x.name,km:day[x.id]})),all:g.every(x=>day[x.id]!=null)}}
const dayDate=k=>dateText(k,{weekday:'short',day:'numeric',month:'short'}).toUpperCase();
function dayCardHTML(D){return '<div class="gm-dc">'+mingo('happy',58)+'<div class="gm-dc-l">geo<span>mingo</span></div><div class="gm-dc-d">'+esc(dayDate(D.k))+(D.st>=2?' · 🔥 '+D.st+' DAYS':'')+'</div>'+
  '<p class="gm-dc-k">'+fmt(D.km)+' <small>km</small></p><p class="gm-dc-s">All '+ALLW+' trips · +'+ALL5+' Grand tour</p>'+
  '<div class="gm-dc-g">'+D.games.map(x=>'<b style="background:'+(DCOL[x.id]||'#9AA6B6')+'">'+esc(x.name)+'<br>'+fmt(x.km||0)+' km</b>').join('')+'</div>'+
  '<p class="gm-dc-f">Play today\'s trips at geomingo.com</p></div>'}
// the same card drawn as a 1080 × 1350 picture
function dayCardPNG(D){return new Promise(res=>{const W=1080,H=1350,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
  const disp='"Archivo","Arial Narrow",Impact,sans-serif',type='"Courier Prime","Courier New",monospace';
  const rr=(X,Y,w,h,r)=>{x.beginPath();x.moveTo(X+r,Y);x.arcTo(X+w,Y,X+w,Y+h,r);x.arcTo(X+w,Y+h,X,Y+h,r);x.arcTo(X,Y+h,X,Y,r);x.arcTo(X,Y,X+w,Y,r);x.closePath()};
  x.fillStyle='#0E1622';x.fillRect(0,0,W,H);
  const gr=x.createLinearGradient(0,0,W*.6,H);gr.addColorStop(0,'#2A2414');gr.addColorStop(.65,'#16202F');x.fillStyle=gr;rr(40,40,W-80,H-80,48);x.fill();
  x.lineWidth=6;x.strokeStyle='#D4AD4B';x.stroke();
  x.textBaseline='alphabetic';x.font='900 84px '+disp;x.fillStyle='#F4F1EA';x.fillText('geo',110,200);const gw=x.measureText('geo').width;x.fillStyle='#F07884';x.fillText('mingo',110+gw,200);
  x.font='700 40px '+type;x.fillStyle='#F3D98B';x.fillText(dayDate(D.k)+(D.st>=2?'  ·  🔥 '+D.st+' DAYS':''),110,270);
  x.font='900 220px '+disp;x.fillStyle='#F3D98B';const kt=fmt(D.km);x.fillText(kt,104,500);const kw=x.measureText(kt).width;x.font='900 72px '+disp;x.fillText('km',104+kw+24,500);
  x.font='400 40px '+type;x.fillStyle='#CFD6E0';x.fillText('All '+ALLW+' trips · +'+ALL5+' Grand tour',110,575);
  const cw=(W-220-2*24)/3,ch=150;D.games.forEach((g,i)=>{const X=110+(i%3)*(cw+24),Y=630+Math.floor(i/3)*(ch+24);
    x.fillStyle=DCOL[g.id]||'#9AA6B6';rr(X,Y,cw,ch,22);x.fill();x.fillStyle='#16202F';x.textAlign='center';
    x.font='800 34px '+type;x.fillText(g.name.toUpperCase(),X+cw/2,Y+64);x.font='800 40px '+type;x.fillText(fmt(g.km||0)+' km',X+cw/2,Y+116);x.textAlign='left'});
  x.font='400 38px '+type;x.fillStyle='#9AA6B6';x.textAlign='center';x.fillText("Play today's trips at geomingo.com",W/2,H-110);
  // Mingo, happy with his GeoPass, top right (Héctor 2026-11-17: "¿y Mingo no sale?")
  const svg=mingo('happy',300).replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" ').replace('aria-hidden="true" focusable="false">','aria-hidden="true" focusable="false"><style>'+MG_CSS+'</style>');
  const im=new Image();im.onload=()=>{x.drawImage(im,W-110-260,70,260,Math.round(260*160/120));c.toBlob(b=>res(b),'image/png')};
  im.onerror=()=>c.toBlob(b=>res(b),'image/png');im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)})}
async function shareDay(D){stat('share');const line='Geomingo · '+dateText(D.k,{day:'numeric',month:'short'})+' · '+fmt(D.km)+' km'+(D.st>=2?' · 🔥 '+D.st:'')+'\nhttps://geomingo.com';
  try{if(document.fonts&&document.fonts.ready)await document.fonts.ready}catch(e){}
  const b=await dayCardPNG(D),f=b&&typeof File==='function'?new File([b],'geomingo-'+D.k+'.png',{type:'image/png'}):null;
  try{if(f&&navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],text:line});return}}catch(e){if(e&&e.name==='AbortError')return}
  try{if(navigator.share){await navigator.share({text:line});return}}catch(e){if(e&&e.name==='AbortError')return}
  if(b){const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='geomingo-'+D.k+'.png';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000)}
  try{await navigator.clipboard.writeText(line)}catch(e){}
  const t=document.querySelector('#gm-window .gm-dc-ok');if(t)t.hidden=false}
function openDay(D){D=D||dayInfo();const box=openWindow('<div class="gm-res gm-dcw"><div class="gm-rbody"><div class="dlg-head"><h2>Your day is complete</h2><button class="dlg-x" data-gm-act="close">Close</button></div>'+
  dayCardHTML(D)+'<button class="gm-big gm-dc-sh" data-gm-act="shareday">'+ICO.share+' Share my day</button><p class="gm-dc-ok" hidden>Picture saved and line copied. Paste it in any chat.</p></div></div>','Your day is complete');
  box._acts={shareday:()=>shareDay(D)};const c=box.querySelector('[data-gm-act="close"]');if(c)c.focus()}
function dayDone(){const k=dayKey();if(store.get('gm-dayfull')===k||document.getElementById('gm-window'))return;const D=dayInfo(k);if(!D.all)return;
  store.set('gm-dayfull',k);openDay(D)}
/* a finished Archive game (a past day): the same ticket again, in the archive's coral, the day's answers inside;
   Back to archive and Share go under it (Héctor 2026-11-16). archTicket({id:'top10', num:28, score:'7 of 10', detail:'3 mistakes', body:'…answers…'});
   day:'2026-11-13' adds "+86 km for 13 Nov" (the km of that day, archive games count since 2026-11-16); note:'' shows no line */
// under an archive game's result: the list of every past day of this game (Héctor 2026-11-16: the calendar and the lists link both ways)
function archListBtn(){const g=GAMES.find(x=>x.path===PAGE+'/');return '<button type="button" class="gm-text" id="archlist">All '+esc(g?g.name:'')+' days</button>'}
function archTicket(o){o=o||{};const g=GAMES.find(x=>x.id===o.id);
  // its km count for the puzzle's own day (Héctor 2026-11-16): "+86 km for 13 Nov"; signed in, it joins that day's ranking too
  if(o.note===undefined&&o.day){let km=(ledger()[o.day]||{})[o.id];
    if(km==null&&o.state&&ARL[o.id]&&archDone(o.state))km=rowKm(o.id,ARL[o.id][1](o.state),o.day);   /* shown before the game is saved */
   o.note=km!=null?'+'+fmt(km)+' km for '+dateText(o.day,{day:'numeric',month:'short'}):''}
  setTimeout(()=>{refreshPass();const a=window.Geomingo&&window.Geomingo.account;if(a&&a.archRank)a.archRank()},0);
  return '<section class="ticket gm-done tk-pink"><div class="tk-mode practice"><span>'+(g?'Trip '+g.gate+' · ':'')+'Archive '+esc(archNo(o.num))+'</span><span>Done</span></div>'+
    '<div class="gm-done-c"><p class="big">'+esc(String(o.score))+'</p><p class="gm-done-s">'+(o.detail?'<b>'+esc(o.detail)+'</b>':'')+(o.note?'<span>'+esc(o.note)+'</span>':'')+'</p></div>'+
    (o.body?'<div class="tk-tear"></div><div class="gm-done-a">'+o.body+'</div>':'')+'</section>'}
/* a finished Solo (Practice) game: the same ticket as today's result, in Mingo pink (Héctor 2026-11-14).
   soloTicket({id:'borderline', what:'Normal · 4 × 4', score:'804 points', best:'Best: 1.040', detail:'8 of 16 squares', body:'…answers…'}) */
function soloTicket(o){o=o||{};const g=GAMES.find(x=>x.id===o.id);
  return '<section class="ticket gm-done tk-pink"><div class="tk-mode"><span>'+(g?'Trip '+g.gate+' · ':'')+'Practice'+(o.what?' · '+esc(o.what):'')+(o.code?' · '+esc(String(o.code)):'')+'</span><span>Done</span></div>'+
    '<div class="gm-done-c"><p class="big">'+esc(String(o.score))+'</p><p class="gm-done-s">'+(o.best?'<b>'+esc(o.best)+'</b>':'')+(o.detail?'<span>'+esc(o.detail)+'</span>':'')+'</p></div>'+
    (o.body?'<div class="tk-tear"></div><div class="gm-done-a">'+o.body+'</div>':'')+'</section>'}
function tk(k,v,c){return '<div class="tk-c'+(c?' '+c:'')+'"><i>'+k+'</i><b>'+v+'</b></div>'}
/* o.mode puts a coloured strip on top so you always know what you are playing:
   'daily' (gold, "★ Daily #N · Counts for ranking"), 'practice' (Mingo pink, "Practice") or 'archive' (Mingo pink, "Archive #N"); o.num is the number.
   Practice and archive also turn the ticket's edge Mingo pink. 'friends' (or 'online'): blue strip "With friends" and blue edge (games with turns too: whose turn it is shows only in that player's box and the time bar). */
function ticket(say,stub,o){o=o||{};const m=o.mode,n=o.num!=null?' '+archNo(o.num):'',pg=GAMES.find(x=>x.path===PAGE+'/');
  const tr=pg?'Trip '+pg.gate+' · ':'';
  const strip=m==='daily'?'<div class="tk-mode daily"><span>★ '+tr+'Daily'+n+'</span><span>Counts for ranking</span></div>'
    :m==='practice'?'<div class="tk-mode practice"><span>'+tr+'Practice</span>'+(o.code?'<span>'+esc(String(o.code))+'</span>':'')+'</div>'
    :m==='archive'?'<div class="tk-mode practice"><span>'+tr+'Archive'+n+'</span></div>'
    :m==='friends'||m==='online'?'<div class="tk-mode friends"><span>With friends</span></div>':'';
  // With friends with turns (Countries, Capitals, Top 10; Héctor 2026-11-17, option C1): all in the blue of With friends.
  // One line says whose turn it is, the clock (0:27) on its right, a thin blue line under it that runs down,
  // then the players as small pills, the one playing with a blue edge. The game's "Time" box moves up next to the line.
  if(o.color&&o.timer&&(m==='friends'||m==='online')){let clock='';
    stub=stub.replace(/<div class="tk-c[^"]*"><i>Time<\/i><b>([\s\S]*?)<\/b><\/div>/,(x,v)=>{clock=v;return ''});
    return '<section class="ticket tk-friends tk-turn">'+strip+'<div class="tk-sayrow">'+say+(clock?'<span class="tk-clock">'+clock+'</span>':'')+'</div>'+
      '<div class="tk-track"><span class="tbar" style="width:100%"></span></div><div class="tk-stub">'+stub+'</div></section>'}
  return '<section class="ticket'+(m==='practice'||m==='archive'?' tk-practice':m==='friends'||m==='online'?' tk-friends':'')+(o.color?' tk-turn" style="--pc:'+o.color:'')+'">'+strip+say+'<div class="tk-tear" aria-hidden="true"></div><div class="tk-stub">'+stub+'</div>'+(o.timer?'<span class="tbar" style="width:100%'+(o.color?';background:'+o.color:'')+'"></span>':'')+'</section>'}
// the traveller's name on the ticket: the account's, else the one played with in Countries or Capitals
function traveller(){const a=window.Geomingo&&window.Geomingo.account;return ((a&&a.name)||store.get('bl-user')||store.get('cc-user')||'Guest').trim().slice(0,16)||'Guest'}

/* ---------- the shared header ----------
   header({game:'Countries', coord:'Daily #12', menu:'<button…>'}): "‹ geomingo", GeoPass and account on top,
   then the game's own bar: its name (goes to the game's home screen, id="brand"), its trip number, Menu.
   Without game: the home page. */
const ICO={share:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/></svg>',back:'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>'};
const logo='<span class="gm-logo">geo<span>mingo</span></span>';
// the GeoPass button shows your km (2026-11-16: stamps, one per right answer, are no longer shown)
const passBtn=()=>{const n=geo().km;return '<button class="gm-pass" data-gm-pass aria-label="Open your GeoPass: '+fmt(n)+' km" title="Your GeoPass"><i aria-hidden="true">✦</i><span class="gm-pw">GEOPASS</span><b>'+fmt(n)+' km</b></button>'};
// the account button (Sign in, or your initial): ../brand/account.js fills it in once it knows who is playing
const acctSlot=()=>'<span class="gm-acctslot" data-gm-acctslot>'+(window.Geomingo&&Geomingo.acctHTML?Geomingo.acctHTML():'')+'</span>';
function header(o){o=o||{};
  if(!o.game)return '<header class="gm-top"><h1 class="gm-logo">geo<span>mingo</span></h1><span class="gm-beta" title="Still in testing. Official launch on 1 January 2027.">BETA</span><span class="gm-spacer"></span>'+passBtn()+acctSlot()+'</header>';
  // Practice (o.practice): nothing under the name; the trip and the grid code go in the ticket's coral strip (Héctor 2026-11-15)
  // a game opened from the With friends room (brand/party.js): no second room code under the name; the room's strip
  // (Room ABCD · Game 2 · Exit), or the result ticket at the end, goes right under the bar (Héctor 2026-11-17)
  const pt=window.Geomingo&&window.Geomingo.party&&window.Geomingo.party.on()?window.Geomingo.party:null;
  const coord=pt&&o.coord?String(o.coord).replace(/(^|\s*·\s*)room [A-Z]{4}/i,'').replace(/^\s*·\s*/,''):o.coord;
  const g=GAMES.find(x=>x.name===o.game),gate=g?'Trip '+g.gate:'',sub=o.practice?'':[gate,coord].filter(Boolean).join(' · ');
  return '<header class="gm-top"><a class="gm-home" href="'+HOME+'" aria-label="All Geomingo games">'+ICO.back+logo+'<span class="gm-beta" title="Still in testing. Official launch on 1 January 2027.">BETA</span></a><span class="gm-spacer"></span>'+passBtn()+acctSlot()+'</header>'+
    '<div class="gm-bar"><h2 class="gm-title" id="brand" role="link" tabindex="0" title="'+esc(o.game)+' home">'+esc(o.game)+(sub?'<small>'+esc(sub)+'</small>':'')+'</h2><span class="gm-spacer"></span>'+(o.menu||'')+'</div>'+(pt?pt.slot():'')}
document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('[data-gm-pass]');if(!t)return;e.preventDefault();openPass()});

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

/* ---------- the GeoPass: one page, the same from the home page and from every game (Héctor 2026-11-16) ----------
   Dark like the rest of Geomingo. Four things, each with one rule: km (how well you play: levels), the streak (how often:
   one daily a day, a rest day a week), countries (what you know: visited, then expert) and visas (one a game that moves up
   with the days you play it, plus twelve special ones). On top, "Next up": the three goals closest to you. */
const GCOL={borderline:'#7FA2F0',citygrid:'#5FC28F',connections:'#D4AD4B',top10:'#A98BE0',silhouette:'#C99B78',customs:'#F07884',flagpie:'#6FC7C7',impostor:'#E58FC0',compass:'#B5D46A'};
const SHORT={borderline:'COUN',citygrid:'CAPS',connections:'CONN',top10:'TOP10',silhouette:'SILH',customs:'CUST',flagpie:'PIE',impostor:'IMP',compass:'COMP'};
// the games that count for a country, in the order of the trips
const GORDER=[['borderline','Countries'],['citygrid','Capitals'],['top10','Top 10'],['silhouette','Silhouette'],['customs','Customs'],['flagpie','Flag Pie'],['impostor','Impostor'],['compass','Compass']];
const CONT=[['all','All'],['EU','Europe'],['AS','Asia'],['AF','Africa'],['NA','N. America'],['SA','S. America'],['OC','Oceania']];
const inCont=(c,k)=>k==='all'||c.r===k;
let gpCont='all',gpAll=false,SHAPES=null,shapesBusy=false;
// the outlines come from Silhouette's file, loaded the first time the list of countries opens
function loadShapes(then){if(SHAPES)return then();
  const use=()=>{try{SHAPES={};COUNTRIES.forEach(c=>SHAPES[c.c]=c.p)}catch(e){SHAPES={}}then()};
  if(typeof COUNTRIES!=='undefined')return use();
  if(shapesBusy)return;shapesBusy=true;const sc=document.createElement('script');sc.src=ROOT+'silhouette/countries.js?v=202611081800';
  sc.onload=()=>{shapesBusy=false;use()};sc.onerror=()=>{shapesBusy=false;SHAPES={};then()};document.head.appendChild(sc)}
const gamesOf=h=>GORDER.filter(([g])=>h&GBIT[g]).map(g=>g[1]);
const andList=a=>a.length<2?a.join(''):a.slice(0,-1).join(', ')+' and '+a[a.length-1];
const goal=(c,ic,t,sub,pr,txt)=>'<div class="gp-goal" style="--c:'+c+'"><span class="gp-ic'+(ic.length>3?' sm':'')+'">'+esc(ic)+'</span><span><b>'+esc(t)+'</b><small>'+esc(sub)+'</small>'+
  (pr!=null?'<span class="gp-pb"><i style="width:'+Math.round(pr*100)+'%"></i></span>':'')+'</span><em>'+esc(txt)+'</em></div>';
// Next up: the game visa, the country and the special visa closest to you
function nextHTML(GV,SV,S,a){const out=[],k=dayKey();
  const gv=GV.filter(x=>x.next).sort((x,y)=>(y.pr-x.pr)||(x.left-y.left))[0];
  if(gv)out.push(goal(gv.next[2],SHORT[gv.g.id],gv.g.name+' · '+gv.next[0]+' visa',gv.n?'Play '+gv.left+' more '+gv.g.name+' dail'+(gv.left===1?'y':'ies'):'Play its daily once',gv.pr,gv.n+'/'+gv.next[1]));
  const cs=Object.keys(ATLAS).map(c=>[c,country(c,a)]).filter(([,x])=>x.seen&&!x.mine).sort((A,B)=>(B[1].step-A[1].step)||(hsh(A[0]+k)-hsh(B[0]+k)))[0];
  if(cs){const [c,x]=cs;
    out.push(goal('#F07884',c,ATLAS[c].n,'Right in '+andList(gamesOf(x.have))+'. To be an expert: '+missing(x.have,x.core)+'.',x.step/x.of,x.step+'/'+x.of))}
  const tgt=[7,30,100].find(t=>S.best<t),sp=[];
  if(tgt){const v=SV.find(v=>v[1]===String(tgt));sp.push([v,S.now/tgt,S.now+'/'+tgt])}
  SV.filter(v=>!v[4]&&v[5]!=null&&!['7','30','100'].includes(v[1])||v[2]==='World expert'&&!v[4]).forEach(v=>sp.push([v,v[5],v[6].replace(/ /g,'')]));
  const best=sp.sort((x,y)=>y[1]-x[1])[0];
  if(best)out.push(goal(best[0][0],best[0][1],best[0][2],best[0][3],best[1],best[2]));
  return out.length?'<div class="gp-card">'+out.join('')+'</div>':''}
function weekHTML(S){const t=dnum(dayKey()),mon=t-((t+3)%7),set=new Set(days().map(dnum));
  return '<div class="gp-wk">'+['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d,i)=>{const x=mon+i,on=set.has(x),r=S.rest.has(x);
    const c=on?'ok':r?'rest':x===t?'tod':x>t?'':'miss',m=on?'✓':r?'z':x===t?'?':x>t?'':'·';
    return '<div><span>'+d+'</span><i class="'+c+'" aria-label="'+d+': '+(on?'played':r?'rest day':x===t?'today':x>t?'still to come':'missed')+'">'+m+'</i></div>'}).join('')+'</div>'}
function contHTML(a){const codes=Object.keys(ATLAS);
  return '<div class="gp-card gp-cont">'+CONT.slice(1).map(([k,n])=>{const L=codes.filter(c=>ATLAS[c].r===k),X=L.map(c=>country(c,a)),v=X.filter(x=>x.seen).length,kn=X.filter(x=>x.known).length,m=X.filter(x=>x.mine).length;
    return '<div><span>'+n+'</span><i><u style="width:'+(v/L.length*100)+'%"></u><s style="width:'+(kn/L.length*100)+'%"></s><b style="width:'+(m/L.length*100)+'%"></b></i><small>'+m+'/'+L.length+'</small></div>'}).join('')+
    '<p class="gp-key"><span><i class="v"></i>Visited</span><span><i class="k"></i>Known</span><span><i class="m"></i>Expert</span><span class="r">expert/all</span></p></div>'}
function allHTML(a){
  const list=Object.keys(ATLAS).filter(c=>inCont(ATLAS[c],gpCont)).map(c=>[c,country(c,a)])
    .sort((x,y)=>(y[1].step-x[1].step)||(y[1].n-x[1].n)||(x[1].n?ATLAS[x[0]].n.localeCompare(ATLAS[y[0]].n):hsh(x[0])-hsh(y[0]))); // the ones not visited yet in a mixed order, so the order gives no names away
  const cell=([c,x])=>{const d=ATLAS[c],o=!x.seen,path=SHAPES&&SHAPES[c];
    const dots=Array.from({length:x.of},(_,i)=>i).map(i=>'<i'+(i<x.step?' class="on"':'')+'></i>').join('');
    return '<button class="gp-c'+(x.mine?' mine':x.known?' known':o?' off':' half')+'" data-gp-c="'+c+'" aria-label="'+esc(o?'A country you have not visited yet':d.n+': '+stateOf(x))+'">'+
      (path?'<svg viewBox="-4 -4 108 108" aria-hidden="true"><path d="'+path+'"/></svg>':'<svg viewBox="0 0 100 100" aria-hidden="true"></svg>')+
      '<small>'+(o?'? ? ?':esc(d.n))+'</small><span class="dots">'+dots+'</span></button>'};
  return '<div class="gp-info" id="gp-info" aria-live="polite"></div>'+
    '<div class="gp-chips" role="group" aria-label="Continent">'+CONT.map(([k,n])=>'<button data-gp-cont="'+k+'" aria-pressed="'+(k===gpCont)+'">'+n+'</button>').join('')+'</div>'+
    '<div class="gp-grid">'+list.map(cell).join('')+'</div>'}
function countryInfo(c){const d=ATLAS[c],x=country(c);
  if(!x.seen)return 'A country you haven\'t visited yet. Get it right in any daily to visit it.';
  return '<b>'+esc(d.n)+'</b> · '+stateOf(x)+' ('+x.step+' of '+x.of+'). Right in '+esc(andList(gamesOf(x.have)))+'.'+(x.mine?'':' To be an expert: '+esc(missing(x.have,x.core))+'.')}
function gvHTML(x){const t=x.tier,col=t?t[2]:'#4A5878';
  return '<div class="gp-gv'+(t?'':' lock')+'" style="--c:'+GCOL[x.g.id]+';--t:'+col+'"><span class="st'+(x.pf?'':' off')+'" aria-label="'+(x.pf?x.pf+' perfect dail'+(x.pf===1?'y':'ies'):'No perfect daily yet')+'">★'+(x.pf>1?'<small>'+x.pf+'</small>':'')+'</span><span class="md">'+SHORT[x.g.id]+'</span><b>'+esc(x.g.name)+'</b><span class="tr">'+(t?t[0]:'Not yet')+'</span>'+
    (x.next?'<span class="gp-pb"><i style="width:'+Math.round(x.pr*100)+'%"></i></span><small>'+(x.n?x.left+' to '+x.next[0]:'Play it once')+'</small>':'<small>'+x.n+' days</small>')+'</div>'}
const svHTML=([ink,mk,n,what,ok,pr,txt,note])=>'<div class="gp-sv'+(ok?'':' lock')+'" style="--c:'+ink+'"><span class="md'+(mk.length>3?' sm':'')+'">'+esc(mk)+'</span><b>'+esc(n)+'</b><small>'+esc(what)+'</small>'+
  (!ok&&pr!=null?'<span class="gp-pb"><i style="width:'+Math.round(pr*100)+'%"></i></span><small class="pt">'+esc(txt)+'</small>':'')+(ok&&note?'<small class="nt">'+esc(note)+'</small>':'')+'</div>';
function howHTML(){return '<ul class="gp-how">'+
  '<li><span class="n">km</span><span><b>How well you play.</b> Each daily gives up to 100&nbsp;km, +20 if perfect, +'+ALL5+' for all '+ALLW+' in a day. Km take you up the levels: '+LEVELS.map(l=>l[0]).join(', ')+'.</span></li>'+
  '<li><span class="n">7</span><span><b>How often you play.</b> One daily a day keeps your streak. Miss a day and a rest day saves it, one a week.</span></li>'+
  '<li><span class="n">197</span><span><b>What you know.</b> Only the daily counts. '+'Visited: right in 1 game. Known: right in 3 games. Expert: right in 5 games.'+'</span></li>'+
  '<li><span class="n">◎</span><span><b>Visas.</b> One a game, moved up by the days you play it: '+TIERS.map(t=>t[0]+' '+t[1]).join(', ')+'. A ★ on it for a perfect daily. Plus 12 special ones and 12 hard challenges.</span></li></ul>'}
function openPass(){
  const P=geo(),lv=level(P.km),name=traveller(),a=atlas(),S=streakInfo(),GV=gameVisas(P.L),SV=specialVisas(P.L,S),CV=challengeVisas();
  const seen=countriesSeen(a),mine=countriesMine(a),known=countriesKnown(a),got=GV.filter(x=>x.tier).length+SV.filter(v=>v[4]).length+CV.filter(v=>v[4]).length,all=GV.length+SV.length+CV.length;
  const st=(n,t)=>'<div><b>'+n+'</b><span>'+t+'</span></div>';
  const html='<div class="gp"><div class="gp-bar"><svg class="gp-emb" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-3 3.5-3 14.5 0 18M12 3c3 3.5 3 14.5 0 18"/></svg><b>GEOPASS</b><button class="dlg-x" data-gm-act="close">Close</button></div>'+
    '<div class="gp-card gp-id"><div class="gp-who">'+mingo('pass',60)+'<span><span class="gp-lab">Traveller</span><b>'+esc(name==='Guest'?'Guest traveller':name)+'</b><span class="gp-lvl">'+esc(lv.name)+'</span></span></div>'+
      '<div class="gp-km"><b>'+fmt(P.km)+'</b><span>km travelled</span></div>'+
      '<div class="gp-bar2" role="img" aria-label="'+(lv.next?lv.pct+'% of the way to '+lv.next[0]:'Top level')+'"><i style="width:'+lv.pct+'%"></i></div>'+
      '<div class="gp-lad"><span>'+esc(lv.name)+'</span><span>'+(lv.next?'Next · '+esc(lv.next[0])+' '+fmt(lv.next[1]):'Top level')+'</span></div>'+
      // the seven levels, the ones reached with ✓ and yours marked (Héctor 2026-11-16)
      '<ol class="gp-levels" aria-label="Levels">'+LEVELS.map((l,i)=>'<li class="'+(i<lv.i?'ok':i===lv.i?'me':'')+'"><i aria-hidden="true">'+(i<=lv.i?'✓':'')+'</i><b>'+esc(l[0])+'</b>'+(i===lv.i?'<span class="you">You</span>':'')+'<em>'+fmt(l[1])+' km</em></li>').join('')+'</ol>'+
      '<div class="gp-stats">'+st(S.now,(S.now===1?'day':'days')+' in a row')+st(seen,'countries')+st(got,'visas')+'</div></div>'+
    '<div class="gp-h"><h4>This week</h4><span>'+(S.restLeft?'1 rest day left':'Rest day used')+'</span></div>'+
    '<div class="gp-card">'+weekHTML(S)+'<p class="gp-rule">Play any daily to keep your streak. Miss a day and a <b class="b">rest day</b> saves it (one a week).</p></div>'+
    '<div class="gp-h"><h4>Next up</h4></div>'+nextHTML(GV,SV,S,a)+
    '<div class="gp-h"><h4>Countries</h4><span>of 197</span></div>'+
    '<ul class="gp-steps"><li><i class="v"></i><span><b>Visited</b>: right in 1 game</span><em>'+seen+'</em></li><li><i class="k"></i><span><b>Known</b>: right in 3 games</span><em>'+known+'</em></li><li><i class="m"></i><span><b>Expert</b>: right in 5 games</span><em>'+mine+'</em></li></ul><p class="gp-rule">Different games, daily only.</p>'+contHTML(a)+
    '<button class="gp-more" data-gp-all aria-expanded="'+gpAll+'">'+(gpAll?'Hide the list':'See all '+Object.keys(ATLAS).length+' ›')+'</button><div class="gp-allc">'+(gpAll?allHTML(a):'')+'</div>'+
    '<div class="gp-h"><h4>Game visas</h4><span>'+GV.filter(x=>x.tier).length+' of '+GV.length+' · '+GV.filter(x=>x.pf).length+' ★</span></div>'+
    '<p class="gp-rule">Each daily you play moves its visa up: '+TIERS.map(t=>'<b style="color:'+t[2]+'">'+t[0]+'</b> '+t[1]).join(' · ')+'. <b class="g">★</b> a perfect daily in that game.</p>'+
    '<div class="gp-visas">'+GV.map(gvHTML).join('')+'</div>'+
    '<div class="gp-h"><h4>Special visas</h4><span>'+SV.filter(v=>v[4]).length+' of '+SV.length+'</span></div>'+
    '<div class="gp-visas">'+SV.map(svHTML).join('')+'</div>'+
    '<div class="gp-h"><h4>Challenges</h4><span>'+CV.filter(v=>v[4]).length+' of '+CV.length+'</span></div>'+
    '<p class="gp-rule">The hard ones, for travellers who want more: the daily rankings, the clock and rare moments.'+(json('gm-acct')&&json('gm-acct').u?'':' <b>Sign in to compete in the rankings.</b>')+'</p>'+
    '<div class="gp-visas">'+CV.map(svHTML).join('')+'</div>'+
    '<div class="gp-h"><h4>How it works</h4></div><div class="gp-card">'+howHTML()+'</div></div>';
  const box=openWindow(html,'Your GeoPass: '+got+' of '+all+' visas'),gp=box.querySelector('.gp');
  const drawAll=()=>{const w=box.querySelector('.gp-allc'),b=box.querySelector('[data-gp-all]');
    b.setAttribute('aria-expanded',String(gpAll));b.textContent=gpAll?'Hide the list':'See all '+Object.keys(ATLAS).length+' ›';
    w.innerHTML=gpAll?allHTML(atlas()):'';if(gpAll&&!SHAPES)loadShapes(()=>{if(gpAll&&w.isConnected)w.innerHTML=allHTML(atlas())})};
  box.addEventListener('click',e=>{const t=e.target.closest('[data-gp-all],[data-gp-cont],[data-gp-c]');if(!t)return;
    if(t.hasAttribute('data-gp-all')){gpAll=!gpAll;drawAll()}
    else if(t.dataset.gpCont){gpCont=t.dataset.gpCont;drawAll()}
    else{const i=box.querySelector('#gp-info');if(i){i.innerHTML=countryInfo(t.dataset.gpC);i.classList.add('on')}}});
  const c=box.querySelector('[data-gm-act="close"]');if(c)c.focus()}

/* With friends: a room only comes back on its own while it is still being played.
   Each game keeps its room code in localStorage (key) and here the last time this phone had that room open (key+'-seen').
   Reopening the game: an invite link to another room always wins; a room not seen for 30 minutes is forgotten;
   a finished game comes back only within 10 minutes (an accidental reload), never the next day. */
const ROOM_LIVE=30*60e3,ROOM_DONE=10*60e3;
let roomKey='',hiddenAt=0,awayMs=0;
function roomSeen(key){roomKey=key;try{localStorage.setItem(key+'-seen',String(Date.now()))}catch(e){}}
function roomForget(key){if(roomKey===key)roomKey='';try{localStorage.removeItem(key);localStorage.removeItem(key+'-seen')}catch(e){}}
function roomAge(key){let t=0;try{t=+localStorage.getItem(key+'-seen')||0}catch(e){}return t?Date.now()-t:Infinity}
function roomSaved(key){let code='';try{code=localStorage.getItem(key)||''}catch(e){}
  try{const j=JSON.parse(code);if(typeof j==='string')code=j}catch(e){}
  code=String(code||'').toUpperCase();if(!/^[A-Z]{4}$/.test(code)){roomForget(key);return ''}
  let link='';try{link=(new URLSearchParams(location.search).get('room')||'').toUpperCase()}catch(e){}
  if(link&&link!==code||roomAge(key)>ROOM_LIVE){roomForget(key);return ''}
  return code}
// after reading the saved room: may it come back? (finished = the game in it is over for me)
function roomResume(key,finished){if(finished&&roomAge(key)>ROOM_DONE){roomForget(key);return false}return true}
// back from another app with the room still on screen: leave it if it is over and the phone was away a while
function roomStale(finished){return awayMs>(finished?ROOM_DONE:ROOM_LIVE)}
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){hiddenAt=Date.now();if(roomKey)roomSeen(roomKey)}
  else{awayMs=hiddenAt?Date.now()-hiddenAt:0;hiddenAt=0}});
// Practice has one choice for every game, on the home page's Practice screen (Héctor 2026-11-15): 5 lives or Unlimited.
// gm-lives: 'unl' = Unlimited (mistakes are only counted), anything else = 5 lives. Games without lives ignore it.
const lives=()=>store.get('gm-lives')!=='unl';
const setLives=on=>store.set('gm-lives',on?null:'unl');
// the address says where you are, so a reload (F5) keeps you there: ?solo on Practice, ?friends on With friends,
// nothing on today's game. Set after the page's start code has run (it may still read ?room, ?p, ?grid); other parts kept.
let modeWant=null,modeQueued=false;
// the screen the address says ("solo", "friends" or "" for today's game): the game title keeps you there
const mode=()=>modeWant||'';
function where(m){modeWant=m==='solo'||m==='friends'?m:'';const o=modeWant||'daily';if(!opened.has(o)){opened.add(o);stat('open',o)}
  if(modeQueued)return;modeQueued=true;
  queueMicrotask(()=>{modeQueued=false;try{const u=new URL(location.href);u.searchParams.delete('solo');u.searchParams.delete('friends');
    let q=u.searchParams.toString();if(modeWant)q=modeWant+(q?'&'+q:'');const to=u.pathname+(q?'?'+q:'')+u.hash;
    if(to!==location.pathname+location.search+location.hash)history.replaceState(history.state,'',to)}catch(e){}})}
// ---- anonymous usage counters for geomingo.com/stats (sent by account.js): +1 on a number per page and day, for
// 'open-<mode>' (the first time a page shows today's game, Practice or With friends), 'fin-<mode>' (a game finished)
// and 'giveup-<mode>'; mode daily | solo | friends (none given: the one on screen). No name, account or device id.
const PAGE=(location.pathname.split('/').filter(Boolean)[0]||'home').toLowerCase().replace(/[^a-z0-9-]/g,'').slice(0,20)||'home';
const opened=new Set(),statQ=[];let statSink=null;
function stat(what,mode){const k=what+'-'+(mode||modeWant||'daily');if(statSink)statSink(PAGE,k);else if(statQ.length<50)statQ.push(k)}
function statTo(f){statSink=f;statQ.splice(0).forEach(k=>f(PAGE,k))}
// Cloudflare Web Analytics (visits, countries, phones, where people come from; no cookies): the site's token from
// dash.cloudflare.com → Analytics & Logs → Web Analytics. Empty: off. Only on geomingo.com, never in test mode.
const CF_TOKEN='b14a1376d8294064a5d68d966d941dbe';
try{if(CF_TOKEN&&/(^|\.)geomingo\.com$/.test(location.hostname)&&!new URLSearchParams(location.search).has('test')){
  const s=document.createElement('script');s.defer=true;s.src='https://static.cloudflareinsights.com/beacon.min.js';
  s.setAttribute('data-cf-beacon',JSON.stringify({token:CF_TOKEN}));document.head.appendChild(s)}}catch(e){}
/* Menu → Archive opens a game on a past day with ?day=2026-11-14: the day asked for, when it is one of that game's
   past days (from the Archive's first day, ARCH_FROM, to yesterday), else null. The ?day is taken off the address. */
function askedDay(first){try{const q=new URLSearchParams(location.search),k=q.get('day');if(k==null)return null;q.delete('day');
  history.replaceState(null,'',location.pathname+(q.toString()?'?'+q:''));
  return /^\d{4}-\d{2}-\d{2}$/.test(k)&&k>=(first<ARCH_FROM?first:ARCH_FROM)&&k<dayKey()?k:null}catch(e){return null}}
const room={seen:roomSeen,forget:roomForget,saved:roomSaved,resume:roomResume,stale:roomStale};

/* Search help, never an answer: a common older or everyday name ("Turkey", "USA", "UK") gives the country's code,
   so the answer list can show the one official name (Türkiye, United States…). The game still takes only that name. */
const OLD_NAMES={turkey:'TUR',usa:'USA',us:'USA',america:'USA',unitedstatesofamerica:'USA',uk:'GBR',britain:'GBR',greatbritain:'GBR',
  england:'GBR',scotland:'GBR',wales:'GBR',northernireland:'GBR',holland:'NLD',thenetherlands:'NLD',burma:'MMR',swaziland:'SWZ',
  czechrepublic:'CZE',easttimor:'TLS',macedonia:'MKD',drc:'COD',zaire:'COD',congokinshasa:'COD',congobrazzaville:'COG',uae:'ARE',
  emirates:'ARE',cotedivoire:'CIV',caboverde:'CPV',holysee:'VAT'};
const oldName=q=>OLD_NAMES[String(q||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z]/g,'')]||null;
// adds that country to a game's answer list (pool: the game's countries, with .c codes), if it isn't there yet
const withOld=(res,q,pool)=>{const o=oldName(q);if(!o||res.some(c=>c.c===o))return res;const c=pool.find(x=>x.c===o);return c?[...res,c]:res};

window.Geomingo={HOME,GAMES,live,game,dayKey,madridParts,msToMidnight,dateText,result,playedToday,nextGame,
  days,streak,streakInfo,openDay,dayInfo,pass,stamp,stamps,stampHTML,openPass,atlas,atlasFromList,country,countriesMine,countriesSeen,countriesKnown,EXPERT,CORE,TIERS,gameVisas,specialVisas,challengeVisas,ATLAS,GBIT,ABIT,LEVELS,ALL5,ALLN,ALLW,pts,cxPts,clPts,soloTicket,archTicket,archListBtn,KM,KM_FROM,KMSQ_FROM,newKm,imp3,impNew,IMP3,impRound,imp5,IMP5_FROM,cl3,clNew,CL3,clFlag,ledger,ARL,archDone,rowKm,dayTotal,level,geo,visas,clock,secText,mmss,mingo,hello,tk,ticket,doneTicket,traveller,header,passBtn,
  openWindow,closeWindow,esc,refreshPass,room,where,mode,askedDay,ARCH_FROM,archNo,lives,setLives,stat,statTo,PAGE,oldName,withOld,onStamp:f=>stampHooks.push(f),share:name=>'Geomingo · '+name,fresh:FRESH};
})();
