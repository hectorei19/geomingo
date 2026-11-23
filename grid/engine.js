/* Geomingo grid engine: everything Countries and Capitals share (saves, daily grid, archive, ranking,
   Practice and With friends rooms, sign-in, stats, drawing the board, the guess sheet, the menu).
   Each game's index.html first defines its own data, categories and grid rules, its stampCell and matches,
   and GRID (names, save keys, Firebase paths and its own texts), then loads this file. */
/* ---- codes ---- */
const LET='ABCDEFGHJKLMNPQRSTUVWXYZ';
function makeCode(n,seed){let s='',x=seed;for(let i=0;i<5;i++){s+=LET[x%24];x=Math.floor(x/24)}return n+'-'+s}
function parseCode(t){const m=/^\s*4\s*-?\s*([A-Z]{5})\s*$/i.exec(t||'');if(!m)return null;let x=0;const s=m[1].toUpperCase();for(let i=4;i>=0;i--){const v=LET.indexOf(s[i]);if(v<0)return null;x=x*24+v}return{n:4,seed:x}}
const randSeed=()=>Math.floor(Math.random()*7962624);

/* ---- state ---- */
let S = null;
let setup = {mode:'solo',code:'',user:''};
try{const s=JSON.parse(localStorage.getItem(GRID.key+'setup')||'null');if(s&&typeof s==='object'){setup={...setup,...s,code:''};delete setup.names;if(setup.mode!=='online')setup.mode='solo';['n','diff','timer','fname','join'].forEach(k=>delete setup[k])}}catch(e){}
try{setup.user=GRID.userKeys.map(k=>localStorage.getItem(k)).find(Boolean)||setup.user||''}catch(e){}
let editingUser=!setup.user;
function saveUser(v){
  const name=v.trim().slice(0,16);if(!name){toast('Type a name to continue.','bad');return}
  const old=setup.user;setup.user=name;editingUser=false;
  try{localStorage.setItem('bl-user',name);localStorage.setItem('cc-user',name)}catch(e){}
  render();
}
let ui = {sel:-1,query:'',reveal:-1,toast:null,fresh:-1};
// Geomingo: the game's name, and what Mingo says about your last move ({g: the game it belongs to, pose, t, s})
const GAME_NAME=GRID.name;
let mood=null;
const gameKey=()=>S?(S.gid||(S.daily?'d'+S.daily+(S.archive?'a':''):S.mode+S.code)):'';
function say(pose,t,sub){mood={g:gameKey(),pose,t,s:sub}}
let offset=0;const now=()=>Date.now()+offset;
let tick=null;

// drop ?grid= from the address once used, so a reload does not bring the friend's grid back
function clearGridParam(){try{const u=new URL(location.href);if(u.searchParams.has('grid')){u.searchParams.delete('grid');history.replaceState(null,'',u.pathname+u.search+u.hash)}}catch(e){}}
/* ---- daily grid: one 4×4 Normal grid for everyone, new at midnight in Spain, one try per device ---- */
const DAILY_N=4,DAILY_FIRST=GRID.dailyFirst;
const madrid=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
function madridParts(t){const o={};madrid.formatToParts(new Date(t)).forEach(p=>o[p.type]=p.value);return o}
// hidden test mode: add ?test to the address to replay today's grid; ?test&day=2026-11-20 plays another day's grid
const TESTQ=(()=>{try{return new URLSearchParams(location.search)}catch(e){return new URLSearchParams()}})();
const TEST=TESTQ.has('test'),TESTDAY=TEST&&/^\d{4}-\d{2}-\d{2}$/.test(TESTQ.get('day')||'')?TESTQ.get('day'):null;
function todayKey(){if(TESTDAY)return TESTDAY;const p=madridParts(now());return p.year+'-'+p.month+'-'+p.day}
function dayNumber(key){return Math.round((Date.parse(key+'T00:00Z')-Date.parse(DAILY_FIRST+'T00:00Z'))/864e5)+1}
// an Archive grid's number: its daily number, or its date ("15 Oct") for a day before Grid #1 (Geomingo.ARCH_FROM, Héctor 2026-11-17)
function archNumber(key){const n=dayNumber(key);return n>=1?n:Geomingo.dateText(key,{day:'numeric',month:'short'})}
function msToNextDay(){const p=madridParts(now());return (24*3600-(+p.hour*3600+ +p.minute*60+ +p.second))*1000}
// the same seed for everyone on a given day; step on until the seed gives a grid that can be completed
function dailySeed(key){let h=2166136261;for(const ch of GRID.seed+key){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0}return h%7962624}
function loadDaily(){try{const d=JSON.parse(localStorage.getItem(GRID.key+'daily')||'null');return d&&d.date===todayKey()?d:null}catch(e){return null}}
function saveDaily(){if(S&&S.dayof)return; // a grid played on its day, opened from the archive only to look at it
  if(S&&S.archive){saveArchGame(S);if(S.over)recordArchive(S);return}
  if(S&&S.daily)try{localStorage.setItem(GRID.key+'daily',JSON.stringify({date:S.daily,S}))}catch(e){}
  if(S&&S.daily&&S.over)recordDaily(S);else pushProgress()}
/* ---- daily stats: one entry per played day {date:{s:score,c:squares,n:size}}, kept on the device
   and, when signed in with Google, in Firebase (users/<uid>/(game)/daily) so they follow you to other devices ---- */
function loadHist(){try{return JSON.parse(localStorage.getItem(GRID.key+'hist')||'{}')||{}}catch(e){return {}}}
function saveHist(h){try{localStorage.setItem(GRID.key+'hist',JSON.stringify(h))}catch(e){}}
// entry: s points, c squares, n grid size, g squares got ("1" or "0" each), d device that played it, f 1 when finished
// w: lives lost (wrong answers and timed-out turns), for the perfect grid (+20 km, from 2026-11-15)
const dailyEntry=(s,f)=>({s:s.players[0].score||0,c:s.players[0].cells||0,n:s.n,g:s.cells.map(c=>c.o>=0?'1':'0').join(''),d:ME,f,w:s.lives!=null?Math.max(0,LIVES-s.lives):(s.wrong||0)});
// with an account, today's try belongs to the first device that started it (ACCT_TODAY is the account's entry for today)
// an entry with no device (saved by an old version of the game) belongs to nobody: any device may replace it
const otherDevice=e=>!!e&&!!e.d&&e.d!==ME;
let dailyUp='';
// another device only started today's grid and never finished it: a game finished here still counts
// and replaces it, so the device that opened it shows this result too (Héctor 2026-11-14)
const emptyStart=e=>!!e&&e.f===0&&!e.c&&!e.s&&!e.j;
// today's grid is locked only by a game another device finished (or played on): opening it there is not enough,
// so a phone that only opened today's grid never shows the old "started on another device" screen here (Héctor 2026-11-16)
// a half-played game kept in the account (j, not finished) is not a lock either: every device of the account
// continues that same game, with the same squares and lives (Héctor 2026-11-16)
const shared=e=>!!e&&e.f===0&&!!e.j;
const lockedElsewhere=e=>otherDevice(e)&&!emptyStart(e)&&!shared(e);
// how far a game has gone: squares got + lives lost; it only grows, so the account keeps the furthest one
const progOf=e=>(e&&(e.c||0)+(e.w||0))||0;
const progS=s=>s.cells.filter(c=>c.o>=0).length+(dailyEntry(s,0).w||0);
// today's grid half played on this device: keep it in the account, so the other devices show it too
// the account entry keeps the device that first opened today's grid (d), as the Firebase rules ask
let progUp='';
function pushProgress(){if(!USER||!db||TESTDAY||!S||!S.daily||S.archive||S.dayof||S.over||S.guest&&!S.first||S.mode!=='solo'||S.daily!==todayKey())return;
  const sig=USER.uid+S.daily+':'+progS(S);if(progUp===sig)return;progUp=sig;const mine=S,e={...dailyEntry(mine,0),c:mine.cells.filter(c=>c.o>=0).length,s:liveScore(0)},j=JSON.stringify(mine);
  db.ref('users/'+USER.uid+GRID.fb+'/daily/'+mine.daily).transaction(cur=>cur&&cur.f===1||cur&&progOf(cur)>progOf(e)?undefined:{...e,d:cur&&cur.d||ME,j})
    .catch(()=>{progUp=''})}
function recordDaily(s){if(TESTDAY)return;if(s.daily===todayKey())Geomingo.clock.stop(GRID.id,s.daily,(s.players[0].cells||0)/(s.n*s.n));const h=loadHist(),e=dailyEntry(s,1),today=s.daily===todayKey();
  if(USER&&today&&lockedElsewhere(ACCT_TODAY))return; // the account already used today's try elsewhere
  const old=h[s.daily],same=old&&old.s===e.s&&old.c===e.c&&old.f===1&&old.d===ME;
  if(!same){h[s.daily]=e;saveHist(h);publishSoon()}
  if(!USER||!db||!today)return;
  if(s.guest&&!s.first)return; // played as a guest after another game of the day on this device: stays out of the account
  // the account keeps the whole finished game (j), so every device of the account shows the same grid;
  // the result joins the public ranking only once the account confirms today's try is this device's
  if(ACCT_TODAY&&ACCT_TODAY.d===ME&&ACCT_TODAY.f===1&&ACCT_TODAY.j){submitLB(s.daily,e);return}
  if(dailyUp===USER.uid+s.daily)return;
  dailyUp=USER.uid+s.daily;const full={...e,j:JSON.stringify(s)};const fin=cur=>({...full,d:cur&&cur.d||ME});
  db.ref('users/'+USER.uid+GRID.fb+'/daily/'+s.daily).transaction(cur=>cur&&cur.f===1&&cur.j?undefined:!cur||!cur.d||cur.d===ME||emptyStart(cur)||shared(cur)?fin(cur):undefined)
    .then(r=>{if(r.committed)submitLB(s.daily,e)}).catch(()=>{dailyUp=''})}
// another device of the account finished today's grid: take its whole game, so this device shows exactly the same
// the account decides: it replaces whatever this device has for today, even a game finished here.
// A game finished on this device comes back too when the device lost it (signing out clears the device)
function adoptDaily(a){if(shared(a)){adoptProgress(a);return}
  if(!a||a.f!==1||!a.j)return;const loc=loadDaily();
  if(!otherDevice(a)){if(loc&&loc.S.over)return;try{const s=JSON.parse(a.j);if(s&&s.daily===todayKey()&&s.over){localStorage.setItem(GRID.key+'daily',JSON.stringify({date:s.daily,S:s}));if(S&&S.daily===todayKey()&&!S.over)S=null}}catch(e){}return}
  if(loc&&loc.S.over&&loc.S.adopted===a.d+a.s)return;
  try{const s=JSON.parse(a.j);if(s&&s.daily===todayKey()&&s.over){s.adopted=a.d+a.s;localStorage.setItem(GRID.key+'daily',JSON.stringify({date:s.daily,S:s}));if(S&&S.daily===todayKey())S=null}}catch(e){}}
function adoptProgress(a){try{const s=JSON.parse(a.j);if(!s||s.daily!==todayKey()||s.over)return;const loc=loadDaily();
  if(loc&&(loc.S.over||progS(loc.S)>=progS(s)))return;if(S&&S.daily===todayKey()&&!S.archive&&(S.over||progS(S)>=progS(s)))return;
  localStorage.setItem(GRID.key+'daily',JSON.stringify({date:s.daily,S:s}));progUp=USER?USER.uid+s.daily+':'+progS(s):'';
  if(S&&S.daily===todayKey()&&!S.archive){S=s;ui={sel:-1,query:'',reveal:-1,toast:null,fresh:-1};startTurn()}}catch(e){}}
/* ---- daily ranking: (ranking)/<date>/<uid> = {name, s, c, t}; anyone can read it, each account
   writes its own result once (Firebase rules refuse a second write) ---- */
let LB=null,lbRef=null,lbDate=null,lbSent='';
function submitLB(date,e){if(!USER||!db||TESTDAY||date!==todayKey()||e.f!==1||e.d!==ME)return;
  if(LB&&LB[USER.uid]||lbSent===USER.uid+date)return;lbSent=USER.uid+date;
  const sec=Geomingo.clock.secs(GRID.id,date);
  db.ref(GRID.lb+'/'+date+'/'+USER.uid).set(Object.assign({name:(PROFILE||setup.user||'Player').slice(0,16),s:e.s,c:e.c,t:TS()},e.w!=null?{w:e.w}:{},sec?{sec}:{})).catch(()=>{})}
// the last rows seen of today's ranking show at once, until the live ones come
function lbCached(k){try{const c=JSON.parse(localStorage.getItem(GRID.key+'lbc')||'null');return c&&c.date===k&&c.rows||null}catch(e){return null}}
function watchLB(){if(!FB_OK||TESTDAY||!initFB())return;const k=todayKey();if(lbDate===k)return;
  if(lbRef)lbRef.off();lbDate=k;LB=lbCached(k);lbRef=db.ref(GRID.lb+'/'+k);
  lbRef.on('value',s=>{LB=s.val()||{};try{localStorage.setItem(GRID.key+'lbc',JSON.stringify({date:k,rows:LB}))}catch(e){}if(!S||S.daily)render()},()=>{})}
// ranking order: more km first, then more points, then the faster one, then more squares, then whoever finished first
// a row's km that day, the same number as the home page's ranking (+20 km for a perfect grid)
const rowKm=(r,d)=>Geomingo.rowKm(GRID.id,r,d||todayKey());
// small text of a row: points and the perfect-grid +20 km (Héctor 17 Nov: show how the points become km)
const lbPerfect=r=>(+r.c||0)>=DAILY_N*DAILY_N&&!(+r.w);
const lbSmall=(r,d)=>{d=d||todayKey();return `${r.c}/${DAILY_N*DAILY_N}${Geomingo.newKm(d)&&lbPerfect(r)?' +20':''}`};
const lbHow=d=>{d=d||todayKey();return `<p class="hint">${isKm(d)?'Squares are worth 3 to 10 km, more the harder they are (100 km for all 16); +20 km for a perfect grid with no mistakes. A tie: the faster one first.':'100 km for all 16 squares, +20 km for a perfect grid with no mistakes.'}</p>`};
function lbRows(src,d){return Object.entries(src||LB||{}).map(([uid,v])=>({uid,...v,km:rowKm(v,d)})).sort((a,b)=>b.km-a.km||b.s-a.s||(a.sec||1e9)-(b.sec||1e9)||b.c-a.c||(a.t||0)-(b.t||0))}
// a past day's ranking (archive games): read once, only to look at it
const LBD={};
function pastLB(date){if(LBD[date]===undefined&&initFB()){LBD[date]=null;db.ref(GRID.lb+'/'+date).once('value').then(s=>{LBD[date]=s.val()||{};if(S&&S.daily===date)render()}).catch(()=>{})}return LBD[date]}
// ranking table: the top 10, plus your own row if you are further down (today's, or a past day's for archive games)
function lbView(date){if(!FB_OK||TESTDAY)return '';
  if(date){const src=pastLB(date);if(!src)return `<section class="panel lb"><span class="label">Ranking of grid #${dayNumber(date)}</span><p class="hint">Loading…</p></section>`;
    const rows=lbRows(src,date),me=USER&&USER.uid,i=rows.findIndex(r=>r.uid===me);
    const row=(r,k)=>`<li class="${r.uid===me?'me':''}" data-stats="${esc(r.uid)}" role="button" tabindex="0"><span class="rk">${k+1}</span><span class="nm">${esc(pname(r.uid,r.name))}</span><span class="sq">${lbSmall(r,date)}</span><span class="pt">${EU(r.km)} km</span></li>`;
    return `<section class="panel lb"><span class="label">Ranking of grid #${dayNumber(date)}${rows.length?` · ${rows.length} player${rows.length===1?'':'s'}`:''}</span>${rows.length?`<ol class="lbl">${rows.slice(0,10).map(row).join('')+(i>=10?`<li class="gap">…</li>`+row(rows[i],i):'')}</ol>`:'<p class="hint">Nobody played this grid on its day.</p>'}${rows.length&&Geomingo.newKm(date)?lbHow(date):''}<p class="hint">How the players did on the day. Archive games are not added.</p></section>`}
  const rows=lbRows(),me=USER&&USER.uid,i=rows.findIndex(r=>r.uid===me);
  const row=(r,k)=>`<li class="${r.uid===me?'me':''}" data-stats="${esc(r.uid)}" role="button" tabindex="0"><span class="rk">${k+1}</span><span class="nm">${esc(pname(r.uid,r.name))}</span><span class="sq">${lbSmall(r)}</span><span class="pt">${EU(r.km)} km</span></li>`;
  const list=rows.slice(0,10).map(row).join('')+(i>=10?`<li class="gap">…</li>`+row(rows[i],i):'');
  const foot=!USER&&!MAYBE_IN()?(AUTH_OK?`<button class="ghost" id="signin2">Sign in to join today's ranking</button>${carryable(loadDaily())?'<p class="hint">Your result is added when you sign in.</p>':''}`:''):i<0?`<p class="hint">Your result joins the ranking when you finish today's grid signed in.</p>`:'';
  return `<section class="panel lb"><span class="label">Today's ranking${i>=0?`<b>You: #${i+1} of ${rows.length}</b>`:rows.length?` · ${rows.length} player${rows.length===1?'':'s'}`:''}</span>${rows.length?`<ol class="lbl">${list}</ol>`+lbHow():`<p class="hint">Nobody in today's ranking yet.</p>`}${foot}</section>`}
function lbMine(){const id=USER?USER.uid:MAYBE_IN()&&(Geomingo.account.user||{}).uid;if(!id||!LB)return null;const rows=lbRows(),i=rows.findIndex(r=>r.uid===id);
  return i<0?null:{rank:i+1,total:rows.length,top:Math.max(1,Math.round((i+1)/rows.length*100))}}
function dailyStats(){return dailyStatsFrom(loadHist())}
function dailyStatsFrom(h){const days=Object.keys(h).sort(),day=k=>Math.round(Date.parse(k+'T12:00Z')/864e5);
  let streak=0;const today=day(todayKey());let d=h[todayKey()]?today:today-1;
  const set=new Set(days.map(day));while(set.has(d)){streak++;d--}
  return {played:days.length,streak,best:days.length?Math.max(...days.map(k=>h[k].s)):0,avg:days.length?Math.round(days.reduce((t,k)=>t+(h[k].s||0),0)/days.length)+' pts':'–'}}
// the three numbers under today's result, as in every game
const statTiles=st=>`<div class="stgrid"><div class="st"><b>${st.played}</b><span>played</span></div><div class="st"><b>${st.avg}</b><span>average</span></div><div class="st"><b>${st.streak}</b><span>streak</span></div></div>`;
/* ---- Solo and With friends games: one entry per finished game, kept on the device and, when signed in,
   in users/<uid>/(game)/games; a public summary of all three modes is published in (profiles)/<uid> ---- */
function loadGames(){try{return JSON.parse(localStorage.getItem(GRID.key+'games')||'[]')||[]}catch(e){return []}}
function saveGames(g){try{localStorage.setItem(GRID.key+'games',JSON.stringify(g.slice(-1000)))}catch(e){}}
function recordGame(){if(!S||!S.over||S.daily||!S.gid||TEST)return;if(S.mode!=='solo'&&S.mode!=='online')return;
  const games=loadGames();if(games.some(g=>g.id===S.gid))return;let e;
  if(S.mode==='solo'){const p=S.players[0];e={id:S.gid,m:'s',n:S.n,s:p.score||0,c:p.cells||0,t:todayKey()}}
  else{if(S.me<0)return;const sc=S.players.map(p=>p.score||0),mine=sc[S.me],better=sc.filter(x=>x>mine).length,tie=sc.filter(x=>x===mine).length>1;
    e={id:S.gid,m:'f',n:S.n,s:mine,c:S.players[S.me].cells||0,np:S.players.length,r:better+1,w:better===0&&!tie?1:0,dr:better===0&&tie?1:0,t:todayKey()}}
  games.push(e);saveGames(games);
  if(USER&&db)db.ref('users/'+USER.uid+GRID.fb+'/games/'+e.id).set(e).catch(()=>{});
  publishSoon()}
function syncGames(){if(!USER||!db)return Promise.resolve();const ref=db.ref('users/'+USER.uid+GRID.fb+'/games');
  return ref.once('value').then(snap=>{const remote=snap.val()||{},local=loadGames(),ids=new Set(local.map(g=>g.id)),up={};
    for(const [k,v] of Object.entries(remote))if(!ids.has(k)){local.push({...v,id:k});ids.add(k)}
    for(const g of local)if(!remote[g.id])up[g.id]=g;
    saveGames(local);if(Object.keys(up).length)return ref.update(up).catch(()=>{})}).catch(()=>{})}
// all the numbers of the stats page, from the daily history and the list of games
function computeStats(hist,games){
  const days=Object.keys(hist).sort(),dv=days.map(k=>hist[k]),day=k=>Math.round(Date.parse(k+'T12:00Z')/864e5);
  const avg=a=>a.length?Math.round(a.reduce((x,y)=>x+y,0)/a.length):0,best=a=>a.length?Math.max(...a):0;
  let maxStreak=0,run=0,prev=null;for(const k of days){const d=day(k);run=prev!==null&&d===prev+1?run+1:1;prev=d;maxStreak=Math.max(maxStreak,run)}
  const ds=dailyStatsFrom(hist);
  const solo=games.filter(g=>g.m==='s'),fr=games.filter(g=>g.m==='f');
  const sum=a=>{const sq=a.reduce((x,g)=>x+(g.c||0),0),all=a.reduce((x,g)=>x+g.n*g.n,0);
    return {played:a.length,best:best(a.map(g=>g.s)),avg:avg(a.map(g=>g.s)),perfect:a.filter(g=>g.c===g.n*g.n).length,
      squares:sq,acc:all?Math.round(sq/all*100):0}};
  const wins=fr.filter(g=>g.w===1).length;
  return {d:{played:days.length,streak:ds.streak,max:maxStreak,best:best(dv.map(e=>e.s||0)),avg:avg(dv.map(e=>e.s||0)),perfect:dv.filter(e=>e.c===(e.n||DAILY_N)*(e.n||DAILY_N)).length},
    s:sum(solo),
    f:{played:fr.length,wins,draws:fr.filter(g=>g.dr===1).length,pct:fr.length?Math.round(wins/fr.length*100):0,best:best(fr.map(g=>g.s)),
      avg:avg(fr.map(g=>g.s)),place:fr.length?Math.round(fr.reduce((x,g)=>x+(g.r||1),0)/fr.length*10)/10:0}}}
let pubTimer=null;
function publishSoon(){clearTimeout(pubTimer);pubTimer=setTimeout(publishProfile,1500)}
function publishProfile(){if(!USER||!db||!PROFILE)return;
  db.ref(GRID.profiles+USER.uid).set({name:PROFILE,...computeStats(loadHist(),loadGames()),u:TS()}).catch(()=>{})}
// today's grid is built once per day and kept, so the home screen can show it before you play
let dailyCache=null;
// a day listed in DAILY_FIXED always gets that grid; it is rebuilt from the category labels and checked again
function fixedDaily(key){const ids=DAILY_FIXED.days[key];if(!ids)return null;
  const ks=ids.map(i=>CATS.find(k=>k.label===DAILY_FIXED.labels[i]));if(ks.some(k=>!k))return null;
  const rows=ks.slice(0,DAILY_N),cols=ks.slice(DAILY_N),answers=[];
  rows.forEach(r=>cols.forEach(c=>answers.push(inter(r,c,setMode(key)))));
  if(answers.some(a=>!a.length)||!isSafe(answers))return null;
  return {rows:rows.map(k=>k.id),cols:cols.map(k=>k.id),answers}}
function dailyGrid(day){const key=day||todayKey();if(dailyCache&&dailyCache.key===key)return dailyCache;
  const fixed=fixedDaily(key);if(fixed)return dailyCache={key,seed:dailySeed(key),g:fixed};
  let seed=dailySeed(key),g=generate(DAILY_N,seed),k=0;
  while(!g&&k++<50){seed=(seed+1)%7962624;g=generate(DAILY_N,seed)}
  return dailyCache=g?{key,seed,g}:null}
function playDaily(){
  if(USER)adoptDaily(ACCT_TODAY); // the account's finished game first, so it can't be started again here
  const saved=loadDaily();
  if(USER&&lockedElsewhere(ACCT_TODAY)&&!(saved&&saved.S.over)){toast('You already played today\'s grid with this account on another device.','bad');render();return}
  if(saved){S=saved.S;ui={sel:-1,query:'',reveal:-1,toast:null,fresh:-1};if(!S.over)startTurn();render();return}
  const dg=dailyGrid();
  if(!dg){toast('Could not build today\'s grid. Try again later.','bad');return}
  const key=dg.key,seed=dg.seed,g=dg.g;
  S={mode:'solo',daily:key,day:dayNumber(key),n:DAILY_N,seed,code:makeCode(DAILY_N,seed),rows:g.rows,cols:g.cols,answers:g.answers,
     cells:g.answers.map(()=>({o:-1,c:null})),used:[],players:[{name:setup.user||'You',score:0}],turn:0,
     lives:LIVES,timer:0,deadline:0,passes:0,over:false,wrong:0};
  // a guest's result can join the account later (sign in after playing), but only for the first game of the day on this device
  try{S.first=localStorage.getItem(GRID.key+'dfirst')!==key;localStorage.setItem(GRID.key+'dfirst',key)}catch(e){S.first=false}
  S.guest=!USER;
  ui={sel:-1,query:'',reveal:-1,toast:null,fresh:-1};
  startTurn(true);render();
  // signed in: claim today's try for this device as soon as the game starts; if another device got there first, stop
  if(USER&&db&&!TESTDAY){const mine=S,ref=db.ref('users/'+USER.uid+GRID.fb+'/daily/'+key);
    ref.transaction(cur=>!cur||!cur.d?dailyEntry(mine,0):cur.d===ME?cur:undefined).then(r=>{
      if(!r.committed&&lockedElsewhere(r.snapshot.val())&&S===mine){S=null;try{localStorage.removeItem(GRID.key+'daily')}catch(e){}
        toast('You already played today\'s grid with this account on another device.','bad');render()}}).catch(()=>{})}
}
/* ---- archive: past daily grids, one try each (per account when signed in, otherwise per device).
   Games are kept in bl-arch / cc-arch on the device and in users/<uid>/(game)/archive/<date> (with the whole game, like today's grid).
   Since 2026-11-16 their km count for their own day (GeoPass and ranking, ../brand/mingo.js ARL), never for the streak. ---- */
function loadArch(){try{return JSON.parse(localStorage.getItem(GRID.key+'arch')||'{}')||{}}catch(e){return {}}}
// pd: the day the archive grid was really played (its stamp on the home page's Archive shows it, Héctor 2026-11-16)
function saveArchGame(s){if(s.over&&!s.pd)s.pd=Geomingo.dayKey();const a=loadArch();a[s.daily]=s;try{localStorage.setItem(GRID.key+'arch',JSON.stringify(a))}catch(e){}}
let ARCH_REMOTE=null,archBack='home';const archUp=new Set();
function syncArch(){if(!USER||!db)return;const uid=USER.uid;
  db.ref('users/'+uid+GRID.fb+'/archive').once('value').then(s=>{if(!USER||USER.uid!==uid)return;ARCH_REMOTE=s.val()||{};
    const a=loadArch();let ch=false;
    for(const [k,v] of Object.entries(ARCH_REMOTE))if(otherDevice(v)&&v.f===1&&v.j&&!(a[k]&&a[k].over&&a[k].adopted===v.d+v.s)){
      try{const g=JSON.parse(v.j);g.adopted=v.d+v.s;a[k]=g;ch=true}catch(e){}}
    if(ch)try{localStorage.setItem(GRID.key+'arch',JSON.stringify(a))}catch(e){}
    if(screen==='archive')render()}).catch(()=>{})}
function recordArchive(s){if(!USER||!db||TESTDAY||archUp.has(s.daily))return;
  const r=(ARCH_REMOTE||{})[s.daily];if(r&&r.d===ME&&r.f===1&&r.j)return;
  archUp.add(s.daily);const full={...dailyEntry(s,1),j:JSON.stringify(s)};
  db.ref('users/'+USER.uid+GRID.fb+'/archive/'+s.daily).transaction(cur=>!cur||!cur.d||cur.d===ME?full:undefined)
    .then(x=>{if(x.committed&&ARCH_REMOTE)ARCH_REMOTE[s.daily]=full}).catch(()=>archUp.delete(s.daily))}
// the day's own try (from the daily stats: this device's or the account's): an archive grid you played on its day
const onDay=k=>loadHist()[k]||null;
// the guest banner on the home screen, once closed, stays closed on this device
const noBanner=()=>{try{return localStorage.getItem(GRID.key+'nobanner')==='1'}catch(e){return false}};
function archDates(){const out=[],end=Date.parse(todayKey()+'T12:00Z');let d=Date.parse((Geomingo.ARCH_FROM||DAILY_FIRST)+'T12:00Z');
  while(d<end){out.push(new Date(d).toISOString().slice(0,10));d+=864e5}
  // today's grid joins the list as soon as you have finished it, so the archive lists every grid you played
  const t=onDay(todayKey());if(t&&t.f!==0&&!TESTDAY)out.push(todayKey());return out.reverse()}
function openArchive(){if(screen!=='archive')archBack=screen;screen='archive';ui.reveal=-1;if(USER)syncArch();render();window.scrollTo(0,0)}
function archiveView(){const a=loadArch(),rem=ARCH_REMOTE||{};
  const items=archDates().map(k=>{const g=a[k],r=rem[k],n=archNumber(k),
      date=new Date(k+'T12:00Z').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
    let st,sq='';
    if(g&&g.over){st=`<span class="as done">${showKm(k)?EU(stateKm(g))+' km':EU(g.players[0].score)+' pts'}</span>`;
      sq=`<span class="dsq" style="grid-template-columns:repeat(${g.n},1fr)" aria-hidden="true">${g.cells.map(c=>`<i class="${c.o>=0?'on':''}"></i>`).join('')}</span>`}
    else if(onDay(k)){const e=onDay(k);st=`<span class="as done">${e.f===0?'Started on its day':showKm(k)?EU(Geomingo.KM.grid(e.s,e.c,e.n||DAILY_N,e.w,k))+' km':EU(e.s)+' pts'}</span>`;
      if(e.g&&e.f!==0)sq=`<span class="dsq" style="grid-template-columns:repeat(${e.n},1fr)" aria-hidden="true">${[...e.g].map(x=>`<i class="${x==='1'?'on':''}"></i>`).join('')}</span>`}
    else if(USER&&r&&otherDevice(r))st=`<span class="as">${r.f===1?'Played on another device':'Started on another device'}</span>`;
    else st=`<span class="as">${g?'In progress':'Play'}</span>`;
    return `<li><button data-arch="${k}"><span class="an">${typeof n==='number'?'#'+n:'·'}</span><span class="ad"><b>Grid ${Geomingo.archNo(n)}</b><small>${date}</small></span>${sq}${st}</button></li>`}).join('');
  return `<section class="panel"><a class="linkbtn" href="${Geomingo.HOME}#archive" style="display:inline-block;margin-bottom:6px">← Calendar of all games</a><div class="backline"><span class="ht">Archive</span></div>
    <p class="hint">Play the daily grids you missed. Grids you played on their day are already done. One try per grid${USER?' with your account':' on this device'}. Their km count for their own day, in your GeoPass and the ranking, but not for your streak.</p>
    ${items?`<ul class="arch">${items}</ul>`:'<p class="hint">No past grids yet. Come back tomorrow.</p>'}</section>`}
function playArchive(k){const a=loadArch(),r=(ARCH_REMOTE||{})[k];
  if(USER&&r&&otherDevice(r)&&!(a[k]&&a[k].over)){toast(r.f===1?'You played this grid on another device with this account.':'You started this grid on another device with this account. One try per grid.','bad');return}
  if(!a[k]&&onDay(k)){showOnDay(k);return}
  ui={sel:-1,query:'',reveal:-1,toast:null,fresh:-1};screen='home';
  if(a[k]){S=a[k];if(!S.over)startTurn();render();window.scrollTo(0,0);return}
  const dg=dailyGrid(k);if(!dg){toast('Could not build this grid.','bad');return}
  const g=dg.g;
  S={mode:'solo',daily:k,archive:true,day:archNumber(k),n:DAILY_N,seed:dg.seed,code:makeCode(DAILY_N,dg.seed),rows:g.rows,cols:g.cols,answers:g.answers,
     cells:g.answers.map(()=>({o:-1,c:null})),used:[],players:[{name:setup.user||'You',score:0}],turn:0,
     lives:LIVES,timer:0,deadline:0,passes:0,over:false,wrong:0};
  startTurn(true);render();window.scrollTo(0,0);
  // signed in: claim this grid's try for this device; if another device got there first, stop
  if(USER&&db&&!TESTDAY){const mine=S;
    db.ref('users/'+USER.uid+GRID.fb+'/archive/'+k).transaction(cur=>!cur||!cur.d?dailyEntry(mine,0):cur.d===ME?cur:undefined).then(x=>{
      if(!x.committed&&otherDevice(x.snapshot.val())&&S===mine){S=null;const b=loadArch();delete b[k];try{localStorage.setItem(GRID.key+'arch',JSON.stringify(b))}catch(e){}
        toast('You already played this grid with this account on another device.','bad');screen='archive';render()}}).catch(()=>{})}}
// a grid you played on its day: show that game (kept on this device for yesterday, or in the account), never replay it
function showOnDay(k){const e=onDay(k),open=g=>{if(!g||g.daily!==k){toast(e.f===0?'You started this grid on its day. One try per grid.':`You played this grid on its day: ${EU(e.s)} points.`);return}
    ui={sel:-1,query:'',reveal:-1,toast:null,fresh:-1};screen='home';S={...g,archive:true,dayof:true,over:true};render();window.scrollTo(0,0)};
  try{const d=JSON.parse(localStorage.getItem(GRID.key+'daily')||'null');if(d&&d.date===k&&d.S){open(d.S);return}}catch(x){}
  if(USER&&db)db.ref('users/'+USER.uid+GRID.fb+'/daily/'+k+'/j').once('value').then(v=>{let g=null;try{g=JSON.parse(v.val())}catch(x){}open(g)}).catch(()=>open(null));
  else open(null)}
function startGame(){
  // Practice has no setup screen (Héctor 2026-11-15): always a grid like the daily one (4 × 4, Easy), with the lives
  // chosen on the home page's Practice screen; a friend's shared grid (?grid=) is played as it was
  setup.mode='solo';
  const n=DAILY_N,pc=parseCode(setup.code);let seed=randSeed();
  if(setup.code.trim()){if(!pc){toast('That code is not valid. It looks like 4-KQPMT.','bad');return false}seed=pc.seed}
  let g=generate(n,seed),tries=0;
  while(!g&&!pc&&tries++<20){seed=randSeed();g=generate(n,seed)}
  if(!g){toast('Could not build a grid from that code. Try another.','bad');return false}
  try{localStorage.setItem(GRID.key+'setup',JSON.stringify({...setup,code:''}))}catch(e){}
  clearGridParam();
  const players=[{name:setup.user||'You',score:0}];
  S={mode:'solo',n,seed,code:makeCode(n,seed),rows:g.rows,cols:g.cols,answers:g.answers,
     cells:g.answers.map(()=>({o:-1,c:null})),used:[],players,turn:0,
     lives:LIVES,nolives:Geomingo.lives()?0:1,timer:0,deadline:0,passes:0,over:false,wrong:0,
     gid:'s-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7)};
  ui={sel:-1,query:'',reveal:-1,toast:null,fresh:-1};
  startTurn(true);
  render();
  return true;
}
function startTurn(first){
  if(!S||S.over)return;
  if(S.mode==='online'){ensureTick();return}
  S.turnStart=now();
  S.deadline=S.timer?now()+S.timer*1000:0;
  clearInterval(tick);
  if(S.timer)tick=setInterval(onTick,250);
}
function onTick(){
  if(!S||S.over||!S.timer){clearInterval(tick);return}
  const left=S.deadline-now();
  const bar=document.querySelector('.tbar');const sub=document.getElementById('tleft');
  if(bar){bar.style.width=Math.max(0,left/(S.timer*1000)*100)+'%';bar.classList.toggle('low',left<=5000)}
  if(sub)sub.textContent=Geomingo.mmss(left);
  if(S.mode==='online'){if(left<=-400)tryTimeout(S.turn,S.deadline);return}
  if(left<=0){
    if(S.mode==='solo'){loseLife();const l=livesLeft();say('sad',"Time's up.",S.nolives?'Try another square.':'That cost a life.'+(l>0?' '+livesWord(l)+' left.':''))}
    else say('sad',"Time's up.",'Too slow, '+S.players[S.turn].name+'. Turn passes.');
    ui.sel=-1;ui.query='';nextTurn(false);
  }
}
function nextTurn(claimed){
  if(S.over)return;
  if(checkEnd())return;
  if(S.mode!=='solo')S.turn=(S.turn+1)%S.players.length;
  startTurn();render();
}
/* Solo and daily: five lives for the whole grid; only a wrong answer or a timed-out turn costs one.
   Games saved before lives (they counted guesses) start from five minus their wrong answers. */
const LIVES=5;
const livesLeft=()=>S.lives!=null?S.lives:Math.max(0,LIVES-(S.wrong||0));
const livesWord=n=>n+' '+(n===1?'life':'lives');
// Practice can be played with no lives (training): wrong answers are only counted, the game ends when the grid is full
function loseLife(){if(S.mode==='solo'&&!S.nolives)S.lives=Math.max(0,livesLeft()-1)}
const livesDots=(left,all)=>`<span class="tk-dots" aria-label="${livesWord(left)} left">${Array.from({length:all},(_,i)=>`<i class="${i<left?'':'off'}"></i>`).join('')}</span>`;
function checkEnd(){
  const full=S.cells.every(c=>c.o>=0);
  const outOfLives=S.mode==='solo'&&!S.nolives&&livesLeft()<=0;
  const allPassed=S.mode!=='solo'&&S.passes>=S.players.length;
  if(full||outOfLives||allPassed){endGame();return true}
  return false;
}
/* ---- scoring ----
   square: difficulty from 0 to 100 by ranking inside each grid: squares are sorted by how many
           countries fit them and get evenly spaced points, 100 for the fewest options, 0 for the most
   speed:  +2 for every whole second left (the turn timer, or a 30-second window when the timer is off)
   lines:  +50 for every full row or column that is all yours */
// With friends (Héctor 2026-11-17): squares share 100 like the daily (plainValues km), no speed, +10 a full row or column all yours
const LINE_BONUS=10,SQ_MAX=100,SPEED_PER_SEC=2,SPEED_WINDOW=30;
function cellValues(answers){
  // ranking: sort squares from fewest to most options and give them evenly spaced points,
  // 100 for the hardest down to 0 for the easiest; squares with the same count share their average place
  const ks=answers.map(a=>a.length),N=ks.length,sorted=[...ks].sort((x,y)=>x-y);
  if(N<2||sorted[0]===sorted[N-1])return ks.map(()=>SQ_MAX);
  return ks.map(k=>{const f=sorted.indexOf(k),l=sorted.lastIndexOf(k);return Math.round(SQ_MAX*(N-1-(f+l)/2)/(N-1))});
}
const valCache=new WeakMap();
function valuesFor(answers){if(!valCache.has(answers))valCache.set(answers,cellValues(answers));return valCache.get(answers)}
/* Daily (from PLAIN_FROM) and Practice: no line bonus (Héctor 2026-11-15). The squares share PLAIN_TOTAL points (80 km
   at 15 points a km), a hard square worth up to twice an easy one, plus +1 for every second under PLAIN_SPEED s (about
   20 km more), so a fast full grid reaches the 100 km top. With friends keeps 0-100 squares, its speed and lines. */
const PLAIN_FROM='2026-11-16',PLAIN_TOTAL=1200,PLAIN_SPEED=20,plainCache=new WeakMap();
const plain=()=>!!S&&S.mode==='solo'&&(!S.daily||S.daily>=PLAIN_FROM);
/* From Geomingo.KMSQ_FROM (Héctor 2026-11-17), daily and Practice: the squares share KMSQ_TOTAL whole km (Practice: points),
   a hard square worth up to KMSQ_HARD times an easy one, no speed; +20 km for a perfect grid. Points are km. */
const KMSQ_TOTAL=100,KMSQ_HARD=3,kmCache=new WeakMap();
const kmsq=()=>plain()&&(!S.daily||S.daily>=Geomingo.KMSQ_FROM||!!S.archive);
const isKm=d=>!!d&&d>=Geomingo.KMSQ_FROM;
// a finished daily's km (squares, +20 for a perfect grid); a game state's score text: km from KMSQ_FROM, points before
const stateKm=st=>{const e=dailyEntry(st,1);return Geomingo.KM.grid(e.s,e.c,e.n,e.w,st.daily)};
const showKm=d=>!!d&&Geomingo.newKm(d);
const scoreTxt=st=>showKm(st.daily)?EU(stateKm(st))+' km':EU(st.players[0].score)+' points';
function plainValues(answers,km){const C=km?kmCache:plainCache,T=km?KMSQ_TOTAL:PLAIN_TOTAL,H=km?KMSQ_HARD-1:1;if(C.has(answers))return C.get(answers);
  const w=valuesFor(answers).map(x=>1+H*x/SQ_MAX),t=w.reduce((a,b)=>a+b,0),raw=w.map(x=>x*T/t),v=raw.map(Math.floor);
  let left=T-v.reduce((a,b)=>a+b,0);raw.map((x,i)=>[x-v[i],i]).sort((a,b)=>b[0]-a[0]||a[1]-b[1]).forEach(([,i])=>{if(left>0){v[i]++;left--}});
  C.set(answers,v);return v}
function speedPts(elapsedMs,timer){const win=timer||SPEED_WINDOW;return SPEED_PER_SEC*Math.max(0,Math.floor(win-elapsedMs/1000))}
function lineCounts(){
  const n=S.n,b=S.players.map(()=>0);
  for(let i=0;i<n;i++){
    const row=[...Array(n)].map((_,j)=>S.cells[i*n+j].o),col=[...Array(n)].map((_,j)=>S.cells[j*n+i].o);
    [row,col].forEach(l=>{if(l[0]>=0&&l.every(x=>x===l[0]))b[l[0]]++});
  }return b;
}
function computeScores(){
  const lc=lineCounts();
  S.players.forEach((p,i)=>{const mine=S.cells.filter(c=>c.o===i);
    p.cells=mine.length;p.base=mine.reduce((a,c)=>a+(c.p||0),0);p.speed=mine.reduce((a,c)=>a+(c.sb||0),0);
    p.lines=lc[i];p.bonus=plain()?0:lc[i]*LINE_BONUS;p.score=p.base+p.speed+p.bonus});
}
function liveScore(i){const lc=lineCounts();return S.cells.filter(c=>c.o===i).reduce((a,c)=>a+(c.p||0)+(c.sb||0),0)+(plain()?0:lc[i]*LINE_BONUS)}
let statLive=false;
function endGame(){
  if(S.mode==='online'){onlineAct('end');return}
  S.over=true;clearInterval(tick);ui.sel=-1;
  computeScores();
  if(S.daily&&!S.archive)saveDaily(); // today's km are saved before the done ticket is drawn, so it shows "+N km" at once like the other games
  render();
}
// a wrong answer says which category it misses, so the player learns something (Héctor 2026-11-17)
function whyNot(ci,c){const n=S.n,ks=[S.rows[Math.floor(ci/n)],S.cols[ci%n]],miss=ks.filter(k=>!(CATS[k].set[c.i]||CATS[k].setAll&&CATS[k].setAll[c.i]));
  const q=k=>'“'+EUT(CATS[k].label)+'”';
  return miss.length===2?c.n+' fits neither '+q(miss[0])+' nor '+q(miss[1])+'.':miss.length?c.n+" doesn't fit "+q(miss[0])+'.':c.n+" doesn't fit that square."}
function guess(ci,cid){
  const c=byCode[cid];if(!c||S.over)return;
  if(S.mode==='online'){ui.sel=-1;ui.query='';drawLayer();onlineGuess(ci,cid);return}
  if(S.used.includes(cid)){say('think','Hold on.',c.n+' is already stamped on this grid. Try another '+GRID.one+'.');ui.sel=-1;ui.query='';render();return}
  const ok=S.answers[ci].includes(c.i);
  const p=S.players[S.turn];
  if(ok){
    const pts=plain()?plainValues(S.answers,kmsq())[ci]:valuesFor(S.answers)[ci],sb=kmsq()?0:plain()?Math.max(0,Math.floor(PLAIN_SPEED-(now()-(S.turnStart||now()))/1000)):speedPts(now()-(S.turnStart||now()),S.timer);
    const before=lineCounts()[S.turn];
    S.cells[ci]={o:S.turn,c:cid,p:pts,sb};S.used.push(cid);S.passes=0;ui.fresh=ci;ui.freshAt=Date.now();
    const nl=lineCounts()[S.turn]-before;
    Geomingo.stamp(GRID.id,c.n,'',GRID.code(c));
    say('happy','Stamped: '+c.n+'.','+'+pts+(kmsq()&&S.daily?' km':' pts')+(sb?' · +'+sb+' speed':'')+(nl&&!plain()?' · +'+nl*LINE_BONUS+' for the line':'')+(S.mode==='solo'?'':' for '+p.name+'.'));
  }else{
    S.wrong++;loseLife();ui.bad=ci; // the square shakes with a red cross (Héctor 2026-11-21, idea 2)
    const left=S.mode==='solo'?livesLeft():0;
    say('sad','Denied entry.',whyNot(ci,c)+(S.mode==='solo'?(S.nolives?' Mistakes: '+S.wrong+'.':left>0?' '+livesWord(left)+' left.':''):' Turn passes.'));
  }
  ui.sel=-1;ui.query='';
  nextTurn(ok);
}
function pass(){if(S.over)return;if(S.mode==='online'){ui.sel=-1;onlineAct('pass');return}S.passes++;toast(S.players[S.turn].name+' passed.');ui.sel=-1;nextTurn(false)}


/* ---- online (Firebase Realtime Database) ---- */
const FB_OK = typeof firebase!=='undefined' && !!(window.FIREBASE_CONFIG&&/^https:\/\//.test(FIREBASE_CONFIG.databaseURL||''));
let db=null, room=null, roomRef=null, roomCode=null, seenEv=null, firstSync=true, joining=false;
const ansCache={};
let ME='';
try{ME=localStorage.getItem(GRID.key+'pid')||''}catch(e){}
if(!ME){ME='p'+Math.random().toString(36).slice(2,10);try{localStorage.setItem(GRID.key+'pid',ME)}catch(e){}}
function initFB(){
  if(!FB_OK||db)return!!db;
  try{if(!firebase.apps.length)firebase.initializeApp(FIREBASE_CONFIG);db=firebase.database();db.ref('.info/serverTimeOffset').on('value',s=>{offset=s.val()||0})}catch(e){console.error(e);return false}
  return true;
}
const TS=()=>firebase.database.ServerValue.TIMESTAMP;

/* ---- optional Google sign-in (Firebase Authentication): only used to keep your daily stats in sync between devices ---- */
let USER=null,ACCT_TODAY=null,ACCT_READY=true,ACCT_WAIT=0,acctT=0,acctRef=null,PROFILE=null,NEEDNAME=false;
// the account's name (users/<uid>/profile): unique, changed from the Menu once every 30 days (brand/account.js); it is also the name shown in the ranking
function applyProfile(name){name=pname(null,name);PROFILE=name;NEEDNAME=false;const old=setup.user;setup.user=name;editingUser=false;
  try{localStorage.setItem(GRID.key+'user',name)}catch(e){}publishSoon();carryDaily();render()}
// signed in after finishing today's grid as a guest: the result joins the account and today's ranking
// (only the first game of the day on this device, and only if the account hasn't played today: recordDaily checks that)
const carryable=d=>!!d&&d.S.over&&d.S.guest&&d.S.first;
function carryDaily(){const d=loadDaily();if(USER&&carryable(d))recordDaily(d.S)}
function loadProfile(){if(!USER||!db)return;const uid=USER.uid;
  db.ref('users/'+uid+'/profile').once('value').then(s=>{if(!USER||USER.uid!==uid)return;const v=s.val();
    if(v&&v.name)applyProfile(v.name);else{NEEDNAME=true;render()}}).catch(()=>{})}
function saveProfile(v){const name=(v||'').trim().slice(0,16);if(!name){toast('Type a name to continue.','bad');return}
  if(!USER||!db)return;
  // the name is unique (Héctor 2026-11-16): Geomingo.account checks and reserves it
  const A=window.Geomingo&&Geomingo.account;if(!A||!A.firstName){toast('Could not save your name. Try again.','bad');return}
  const bad=A.nameProblem(name);if(bad){toast(bad,'bad');return}
  A.firstName(name).then(applyProfile).catch(e=>toast((e&&e.message)||'Could not save your name. Try again.','bad'))}
// every ranking shows each player's current name (pnames), also on past days
const pname=(id,n)=>{const A=window.Geomingo&&Geomingo.account;return A&&A.nameOf?A.nameOf(id,n):(n||'Player')};
if(window.Geomingo&&Geomingo.account&&Geomingo.account.onChange)Geomingo.account.onChange((why,typing)=>{
  if(why==='myname'&&USER&&PROFILE&&Geomingo.account.name&&Geomingo.account.name!==PROFILE)applyProfile(Geomingo.account.name);
  else if(why==='names'&&!typing&&!(document.activeElement&&document.activeElement.tagName==='INPUT'))render()});
const AUTH_OK=FB_OK&&typeof firebase.auth==='function';
// until Firebase says who you are, a device that was signed in last time is shown as signed in (no Sign in banner flashing)
let AUTH_KNOWN=false;
const MAYBE_IN=()=>!USER&&!AUTH_KNOWN&&!!(window.Geomingo&&Geomingo.account&&Geomingo.account.wasSignedIn);
// keep the account's entry for today up to date, so another device that starts today's grid locks it here at once
// until the account says what it has for today, a signed-in device waits (up to 4 s) instead of opening an empty grid
// that the account's finished game would replace a moment later (Héctor 2026-11-14)
function watchToday(){if(acctRef){acctRef.off();acctRef=null}ACCT_TODAY=null;ACCT_READY=true;clearTimeout(acctT);if(!USER||!db||TESTDAY)return;
  ACCT_READY=false;ACCT_WAIT=1;acctT=setTimeout(()=>{if(!ACCT_READY){ACCT_WAIT=0;if(!S&&screen==='home')render()}},4000);
  acctRef=db.ref('users/'+USER.uid+GRID.fb+'/daily/'+todayKey());
  acctRef.on('value',s=>{ACCT_TODAY=s.val();ACCT_READY=true;
    if(otherDevice(ACCT_TODAY)){const h=loadHist(),{j,...entry}=ACCT_TODAY;h[todayKey()]=entry;saveHist(h)}
    adoptDaily(ACCT_TODAY);
    if(!S||S.daily)render()},()=>{ACCT_READY=true;render()})}
function initAuth(){if(!AUTH_OK||!initFB()){AUTH_KNOWN=true;return}
  firebase.auth().onAuthStateChanged(u=>{USER=u||null;AUTH_KNOWN=true;PROFILE=null;NEEDNAME=false;watchToday();if(USER){loadProfile();syncHist();syncGames().then(publishSoon);syncArch()}else ARCH_REMOTE=null;render()});
  firebase.auth().getRedirectResult().catch(e=>authError(e))}
function authError(e){const c=(e&&e.code)||'';if(c==='auth/popup-closed-by-user'||c==='auth/cancelled-popup-request')return;
  toast(c==='auth/unauthorized-domain'||c==='auth/operation-not-allowed'?'Sign-in is not set up yet for this site.':'Could not sign in. Try again.','bad')}
function signIn(){if(!AUTH_OK||!initFB()){toast('Sign-in is not available here.','bad');return}
  const p=new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(p).catch(e=>{if(e&&e.code==='auth/popup-blocked')firebase.auth().signInWithRedirect(p);else authError(e)})}
// signing out leaves the device clean: the account's name, today's grid, stats, games and archive go
// (they stay in the account and come back when you sign in again) and you go on as Guest
function signOut(){if(!AUTH_OK)return;firebase.auth().signOut().then(()=>{
  for(const k of [GRID.key+'daily',GRID.key+'hist',GRID.key+'games',GRID.key+'arch',GRID.key+'user'])try{localStorage.removeItem(k)}catch(e){}
  setup.user='Guest';try{localStorage.setItem(GRID.key+'setup',JSON.stringify({...setup,code:''}))}catch(e){}
  S=null;screen='home';ui={sel:-1,query:'',reveal:-1,toast:null,fresh:-1};editingUser=false;render();window.scrollTo(0,0)}).catch(()=>{})}
// merge the stats saved in your account with the ones on this device and save both ways;
// a day already in the account always wins (one try per account), days only on this device are uploaded
function syncHist(){if(!USER||!db)return;const ref=db.ref('users/'+USER.uid+GRID.fb+'/daily');
  ref.once('value').then(snap=>{const remote=snap.val()||{},local=loadHist(),up={};
    for(const [k,v] of Object.entries(remote)){const {j,...r}=v;local[k]=r} // the stats don't need the whole game (j)
    adoptDaily(remote[todayKey()]);
    // past days only: today's game goes through recordDaily, which checks the account's one try first
    for(const [k,v] of Object.entries(local))if(!remote[k]&&k!==todayKey())up[k]={...v,d:v.d||ME,g:v.g||'',f:v.f===0?0:1};
    saveHist(local);if(Object.keys(up).length)ref.update(up).catch(()=>{});publishSoon();render()}).catch(()=>{})}
const randRoom=()=>[...Array(4)].map(()=>LET[Math.floor(Math.random()*24)]).join('');
const evId=()=>Math.random().toString(36).slice(2,9);
function gridFor(n,seed){const k=n+':'+seed;if(!ansCache[k])ansCache[k]=generate(n,seed);return ansCache[k]}
const APP_VERSION=GRID.appVersion;
// The room stores the exact rows and columns, so every phone shows the host's grid.
function roomGrid(r){
  if(r.rows&&r.cols){const k='ids:'+r.rows.join(',')+'|'+r.cols.join(',');
    if(!ansCache[k]){const answers=[];for(const a of r.rows)for(const b of r.cols)answers.push(CATS[a]&&CATS[b]?inter(CATS[a],CATS[b]):[]);ansCache[k]={rows:r.rows,cols:r.cols,answers}}
    return ansCache[k]}
  return gridFor(r.cfg.n,r.seed);
}
const versionOK=r=>!r.v||r.v===APP_VERSION;
// rooms of every game live side by side at rooms/ABCD; this marks the game's own (Countries' rooms carry no game name, as before),
// so a code of another game never opens here
const ROOM_GAME=GRID.room;
function freshSeed(n){for(let i=0;i<30;i++){const sd=randSeed();if(gridFor(n,sd))return sd}return 1}
function lobbyOrder(r){return Object.entries(r.players||{}).sort((a,b)=>(a[1].t||0)-(b[1].t||0)).map(x=>x[0])}

// the name the others see in a room: the account's name, or the one a guest typed in the room on the home page
const roomName=()=>USER?setup.user:((Geomingo.party&&Geomingo.party.name())||'');
function needRoomName(){if(roomName())return false;toast("Type your name so your friends know who's playing.",'bad');return true}
const SIGNED=()=>!!(USER||MAYBE_IN());
async function createRoom(){if(!SIGNED()&&!(Geomingo.party&&Geomingo.party.on())){signIn();return}  // a game opened from the With friends room: its organiser may have no account
  if(needRoomName())return;
  if(!initFB()){toast('Online play is not set up on this copy of the site.','bad');return}
  try{
    let code='';
    for(let i=0;i<8;i++){code=randRoom();const ex=await db.ref('rooms/'+code).get();if(!ex.exists())break}
    await db.ref('rooms/'+code).set({...(ROOM_GAME?{game:ROOM_GAME}:{}),v:APP_VERSION,host:ME,created:TS(),cfg:{n:DAILY_N,timer:30},status:'lobby',
      players:{[ME]:{name:roomName(),t:TS(),on:true,...(USER?{uid:USER.uid}:{})}}});
    listenRoom(code);
  }catch(e){console.error(e);toast('Could not create the room. Check the connection and try again.','bad')}
}
async function joinRoom(raw){
  const code=(raw||'').toUpperCase().replace(/[^A-Z]/g,'');
  if(code.length!==4){toast('Room codes have 4 letters.','bad');return}
  if(needRoomName())return;
  if(!initFB()){toast('Online play is not set up on this copy of the site.','bad');return}
  if(joining)return;joining=true;
  try{
    const ref=db.ref('rooms/'+code);
    let why='';
    const res=await ref.transaction(r=>{
      if(!r)return r;
      r.players=r.players||{};
      if(ROOM_GAME?r.game!==ROOM_GAME:r.game){why='other';return}
      if(r.v&&r.v!==APP_VERSION){why='version';return}
      if(r.players[ME]){r.players[ME].name=roomName();r.players[ME].on=true;if(USER)r.players[ME].uid=USER.uid;return r}
      if(r.status!=='lobby'){why='started';return}
      if(Object.keys(r.players).length>=6){why='full';return}
      r.players[ME]={name:roomName(),t:Date.now()+offset,on:true,...(USER?{uid:USER.uid}:{})};return r;
    });
    const val=res.snapshot.val();
    if(!val){toast('No room called '+code+'. Check the code.','bad');return}
    if(!res.committed||!val.players||!val.players[ME]){
      toast(why==='other'?code+' is a room of another game. Open that game to join it.':why==='version'?'You and the host have different versions of the game. Both of you reload the page, then try again.':why==='full'?'Room '+code+' already has 6 players.':why==='started'?'That game has already started. Ask the host for a rematch.':'Could not join '+code+'.','bad');return}
    listenRoom(code);
  }catch(e){console.error(e);toast('Could not join. Check the connection and try again.','bad')}
  finally{joining=false}
}
function listenRoom(code){
  if(roomRef)roomRef.off();
  roomCode=code;roomRef=db.ref('rooms/'+code);firstSync=true;seenEv=null;
  try{localStorage.setItem(GRID.key+'room',code)}catch(e){}Geomingo.room.seen(GRID.key+'room');
  const me=roomRef.child('players/'+ME+'/on');
  me.onDisconnect().set(false);
  db.ref('.info/connected').on('value',s=>{if(s.val()&&roomCode===code){me.onDisconnect().set(false);roomRef.child('players/'+ME).once('value',p=>{if(p.exists())me.set(true)})}});
  roomRef.on('value',snap=>{
    const r=snap.val();
    if(!r||!r.players||!r.players[ME]){
      const was=roomCode;dropRoom();
      if(was)toast(r?'You are no longer in room '+was+'.':'Room '+was+' was closed.','bad');
      render();return}
    room=r;Geomingo.room.seen(GRID.key+'room');syncRoom();
  });
}
function dropRoom(){
  if(roomRef){roomRef.off();try{roomRef.child('players/'+ME+'/on').onDisconnect().cancel()}catch(e){}}
  room=null;roomRef=null;roomCode=null;S=null;clearInterval(tick);
  Geomingo.room.forget(GRID.key+'room');
}
// tapping the logo goes to the home screen from anywhere; a game that would be lost (Solo, a room) asks first
function goHome(){if(USER&&NEEDNAME)return;AUTO=1;
  if(roomCode){if(confirm('Leave the room and go to the home screen?'))leaveRoom().then(()=>{screen='home';render();window.scrollTo(0,0)});return}
  if(S&&!S.over&&!S.daily&&!confirm('Leave this game and go to the home screen? This game will be lost.'))return;
  clearInterval(tick);S=null;setup.code='';clearGridParam();if(setup.user)editingUser=false;
  ui={sel:-1,query:'',reveal:-1,toast:null,fresh:-1};screen='home';render();window.scrollTo(0,0)}
async function leaveRoom(){
  const ref=roomRef;
  if(ref&&room&&room.status==='lobby'){
    try{await ref.transaction(r=>{if(!r)return r;if(r.players)delete r.players[ME];
      const left=lobbyOrder(r);if(!left.length)return null;if(r.host===ME)r.host=left[0];return r})}catch(e){}
  }else if(ref){try{await ref.child('players/'+ME+'/on').set(false)}catch(e){}}
  dropRoom();render();
}
function syncRoom(){
  const r=room;
  if(r.status==='lobby'){S=null;clearInterval(tick);render();return}
  const n=r.cfg.n,g=roomGrid(r);
  if(!versionOK(r)){S=null;clearInterval(tick);render();return}
  if(!g){toast('This room has a broken grid. Start a rematch.','bad');return}
  const order=r.order||lobbyOrder(r);
  const cellMap=r.cells||{};
  const cells=g.answers.map((_,i)=>cellMap[i]?{o:cellMap[i].o,c:cellMap[i].c,p:cellMap[i].p||0,sb:cellMap[i].sb||0}:{o:-1,c:null});
  S={mode:'online',n,seed:r.seed,code:makeCode(n,r.seed),rows:g.rows,cols:g.cols,answers:g.answers,cells,
     used:cells.filter(c=>c.c).map(c=>c.c),
     players:order.map(pid=>({pid,uid:(r.players[pid]||{}).uid||null,name:(r.players[pid]||{}).name||'Gone',on:(r.players[pid]||{}).on!==false,score:0})),
     gid:'f-'+roomCode+'-'+(r.started||r.seed),
     turn:r.turn||0,timer:r.cfg.timer,deadline:r.deadline||0,turnStart:r.started||0,passes:r.passes||0,over:r.status==='over',wrong:r.wrong||0,
     me:order.indexOf(ME),host:r.host===ME};
  if(S.over){computeScores();clearInterval(tick)}
  if(r.ev&&r.ev.id!==seenEv){
    if(!firstSync){toast(r.ev.text,r.ev.kind);if(r.ev.ci!=null&&r.ev.kind==='good'){ui.fresh=r.ev.ci;ui.freshAt=Date.now()};
      if(r.ev.kind==='good'||r.ev.kind==='bad')say(r.ev.kind==='good'?'happy':'sad',r.ev.kind==='good'?'Stamped.':'Denied entry.',r.ev.text)}
    seenEv=r.ev.id;
  }
  firstSync=false;
  if(S.over||S.turn!==S.me)ui.sel=-1;
  if(!S.over)ensureTick();
  render();
}
function ensureTick(){clearInterval(tick);if(S&&S.timer&&!S.over)tick=setInterval(onTick,250)}
function advance(r,len){
  r.mc=(r.mc||0)+1;   // turns played, for the With friends room: a game ended early counts only after 5 rounds
  const filled=Object.keys(r.cells||{}).length;
  // With friends: a wrong answer, a pass or time up are all a turn with no stamp; three full rounds with no stamp
  // from anyone end the game, so nobody stays stuck on a hard grid (Héctor 2026-11-22)
  if(filled>=r.cfg.n*r.cfg.n){r.status='over';r.deadline=0;return}
  if((r.passes||0)>=3*len){r.status='over';r.deadline=0;r.ev={id:evId(),kind:'',text:'Three rounds with no stamp: game over.'};return}
  r.turn=((r.turn||0)+1)%len;
  r.started=Date.now()+offset;
  r.deadline=r.cfg.timer?Date.now()+offset+r.cfg.timer*1000:0;
}
async function onlineGuess(ci,cid){
  const c=byCode[cid];let note='',fit=false;
  try{
    const res=await roomRef.transaction(r=>{
      if(!r)return r;fit=false;
      if(r.status!=='playing'){note='over';return}
      const order=r.order;if(order[r.turn||0]!==ME){note='turn';return}
      r.cells=r.cells||{};
      if(r.cells[ci]){note='taken';return}
      if(Object.values(r.cells).some(x=>x.c===cid)){note='used';return}
      const g=roomGrid(r);const ok=g.answers[ci].includes(c.i);
      const nm=(r.players[ME]||{}).name||'Someone';
      if(ok){const pts=plainValues(g.answers,true)[ci],sb=0;
        r.cells[ci]={o:r.turn||0,c:cid,p:pts,sb};r.passes=0;fit=true;r.ev={id:evId(),kind:'good',ci,text:nm+': '+c.n+' fits. +'+pts+(sb?' +'+sb+' speed':'')}}
      else{r.wrong=(r.wrong||0)+1;r.passes=(r.passes||0)+1;r.ev={id:evId(),kind:'bad',text:nm+': '+c.n+" doesn't fit there."}}
      advance(r,order.length);return r;
    });
    if(res.committed&&fit&&GRID.onlineStamp)Geomingo.stamp(GRID.id,c.n,'',GRID.code(c));
    if(!res.committed){toast(note==='turn'?'It is not your turn any more.':note==='taken'?'Someone already filled that square.':note==='used'?c.n+' is already on the board.':'The game is over.','bad')}
  }catch(e){console.error(e);toast('That move did not go through. Check the connection.','bad')}
}
async function onlineAct(kind){
  try{await roomRef.transaction(r=>{
    if(!r)return r;
    const nm=(r.players[ME]||{}).name||'Someone';
    if(kind==='pass'){if(r.status!=='playing'||r.order[r.turn||0]!==ME)return;r.passes=(r.passes||0)+1;r.ev={id:evId(),kind:'',text:nm+' passed.'};advance(r,r.order.length);return r}
    if(kind==='end'){if(r.status!=='playing')return;r.status='over';r.deadline=0;r.ev={id:evId(),kind:'',text:nm+' ended the game.'};return r}
    if(kind==='start'||kind==='rematch'){
      if(r.host!==ME)return;
      const order=kind==='start'?lobbyOrder(r):(r.order||lobbyOrder(r)).filter(pid=>r.players[pid]);
      if(order.length<2)return;
      r.order=order;r.seed=freshSeed(r.cfg.n);{const gg=gridFor(r.cfg.n,r.seed);r.rows=gg.rows;r.cols=gg.cols}r.v=APP_VERSION;r.cells=null;r.passes=0;r.wrong=0;r.mc=0;r.turn=Math.floor(Math.random()*order.length);r.status='playing';
      r.started=Date.now()+offset;
      r.deadline=r.cfg.timer?Date.now()+offset+r.cfg.timer*1000:0;
      r.ev={id:evId(),kind:'',text:(kind==='start'?'Game on. ':'Rematch. New grid. ')+(r.players[order[r.turn]].name)+' starts.'};return r}
    if(kind==='lobby'){if(r.host!==ME)return;r.status='lobby';r.cells=null;r.order=null;r.seed=null;r.deadline=0;return r}
  })}catch(e){console.error(e);toast('That did not go through. Check the connection.','bad')}
}
async function tryTimeout(turn,deadline){
  if(!roomRef||tryTimeout.busy===deadline)return;tryTimeout.busy=deadline;
  try{await roomRef.transaction(r=>{
    if(!r)return r;
    if(r.status!=='playing'||(r.turn||0)!==turn||r.deadline!==deadline||Date.now()+offset<deadline)return;
    const nm=(r.players[r.order[turn]]||{}).name||'Someone';
    r.passes=(r.passes||0)+1;r.ev={id:evId(),kind:'bad',text:"Time's up for "+nm+'.'};advance(r,r.order.length);return r})}catch(e){}
}
// the one room for all nine games (../brand/party.js) drives this game's room
if(Geomingo.party)Geomingo.party.game({stats:()=>{if(S&&S.mode==='online'&&!S.over){S.over=true;try{recordGame()}finally{S.over=false}}},turns:()=>room&&room.mc||0,points:()=>S&&S.mode==='online'&&S.players?S.players.map(p=>({n:p.name,p:Math.max(0,Math.round(p.score||0))})):[],room:()=>roomCode,host:()=>!!room&&room.host===ME,lobby:()=>!!room&&room.status==='lobby',
  count:()=>room?lobbyOrder(room).length:0,names:()=>room?lobbyOrder(room).map(k=>room.players[k].name):[],create:createRoom,join:joinRoom,start:()=>onlineAct('start')});
/* ---- new version check ---- */
let newVersion=false;
async function checkVersion(){
  if(location.protocol!=='https:'||!FB_OK)return;
  try{const r=await fetch('version.json?t='+Date.now(),{cache:'no-store'});if(!r.ok)return;const j=await r.json();
    if(j.v&&j.v!==APP_VERSION&&!newVersion){
      // not in the middle of a game: load the new version straight away (once per version, so it can never loop)
      // a page opened from the browser's cache (no ?v= of the new version yet) always reloads; one that already has it never does,
      // so it can never loop, and tapping the game again a moment later does not show the old version (Héctor 2026-11-16)
      let here='';try{here=new URLSearchParams(location.search).get('v')||''}catch(e){}
      const untouched=!S||S.over||(S.daily&&S.cells&&!S.cells.some(c=>c.o>=0)&&!S.wrong);
      if(untouched&&here!==j.v){const u=new URL(location.href);u.searchParams.set('v',j.v);location.replace(u.toString());return}
      newVersion=true;render()}}catch(e){}
}
setTimeout(checkVersion,1500);setInterval(checkVersion,60000);

/* ---- toast ---- */
let tt=null;
function toast(msg,kind){ui.toast={msg,kind};clearTimeout(tt);tt=setTimeout(()=>{ui.toast=null;drawLayer()},2200);drawLayer()}

/* ---- render ---- */
const esc=s=>String(s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const app=document.getElementById('app'),layer=document.getElementById('layer');
const pinStyle=i=>`background:var(--p${i})`;
const colRef=j=>'ABCDE'[j], rowRef=i=>String(i+1);

// the Geomingo home page: Back from today's grid, Solo or With friends goes there
const toHub=()=>{location.href='../'};
// opening the game goes straight into today's grid (or today's result when it is played);
// done once per visit (and again when the game name on top is tapped), and only once the sign-in is known
let AUTO=1;
// signed in on this phone before: wait up to 4 s for the sign-in, showing only "Opening today's grid…" (not the old screen)
let AUTH_WAIT=1;setTimeout(()=>{if(AUTH_WAIT){AUTH_WAIT=0;if(!S&&screen==='home')render()}},4000);
// today's grid already finished (here, or taken from another device of the account a moment later):
// always show its result ticket, never the old summary card (Héctor 2026-11-14)
const dailyOver=()=>{const d=loadDaily();return !!(d&&d.S&&d.S.over)};
const acctWaiting=()=>!!USER&&!ACCT_READY&&!!ACCT_WAIT&&!dailyOver();
function autoDaily(){if(!AUTO&&!dailyOver()||S||screen!=='home'||editingUser||roomCode||MAYBE_IN()&&AUTH_WAIT||(USER&&NEEDNAME)||acctWaiting())return false;
  AUTO=0;if(USER)adoptDaily(ACCT_TODAY);const d=loadDaily();
  if(USER&&lockedElsewhere(ACCT_TODAY)&&!(d&&d.S.over))return false;
  if(!d&&!dailyGrid())return false;
  playDaily();return true}
function render(){
  if(autoDaily())return;
  if(AUTO&&(AUTH_WAIT&&MAYBE_IN()||acctWaiting()&&!editingUser&&!NEEDNAME)&&!S&&screen==='home'&&!roomCode){
    app.innerHTML=Geomingo.header({game:GAME_NAME,coord:''})+`<section class="panel"><p class="hint">Opening today's grid…</p></section>`;bind();drawLayer();return}
  // the clock of the visas starts when today's grid is first on screen (home or game), unless it is already over
  if(!TESTDAY&&!roomCode){const k=todayKey(),dd=loadDaily(),hh=loadHist()[k];
    if(S?S.daily===k&&!S.archive&&S.mode==='solo'&&!S.over:screen==='home'&&!(dd&&dd.S.over)&&!(hh&&hh.f===1))Geomingo.clock.start(GRID.id,k)}
  // Practice (?solo, Play Solo, a shared grid): no setup screen, a grid starts at once
  if(!S&&screen==='solo'&&!roomCode&&!editingUser&&!(USER&&NEEDNAME)){setup.mode='solo';if(startGame())return;screen='home';setup.code=''}
  const body=screen==='stats'?statsView():screen==='archive'?archiveView():S?gameView():((editingUser||(USER&&NEEDNAME))?nameView():((Geomingo.party&&Geomingo.party.on())&&(screen==='friends'||roomCode)?'':homeView()));
  watchResult();
  app.innerHTML=Geomingo.header({game:GAME_NAME,practice:!!(S&&S.mode==='solo'&&!S.daily),coord:S?(S.daily?'Daily '+Geomingo.archNo(S.day):S.code)+(S.mode==='online'?' · room '+roomCode:''):(roomCode?'Room '+roomCode:'')})+(newVersion?`<div class="status" style="border-color:var(--sea)"><span class="who" style="white-space:normal">A new version of the game is available.</span><button class="primary" id="reload" style="padding:8px 12px;font-size:.9rem">Reload</button></div>`:'')+body;
  bind();drawLayer();fitHeaders();saveDaily();recordGame();
  if(S&&!S.over&&S.timer)onTickVisual();
}
// Keep header labels as large as possible: shrink only the ones that would not fit their square.
// One text size for all category titles in a grid (the largest that lets every title fit inside
// its square with its margin), then shrink individually only if a title still does not fit.
// the info icon is glued to the last word so it can never wrap onto a line of its own
function titleWithInfo(t){
  const i=t.lastIndexOf(' '),head=i<0?'':t.slice(0,i+1),last=i<0?t:t.slice(i+1),icon='\u00A0<span class="ib">i</span>';
  // short last words are glued to the icon; long ones (which may need hyphenating) are left free
  return last.replace(/\u00AD/g,'').length<=7?esc(head)+'<span style="white-space:nowrap">'+esc(last)+icon+'</span>':esc(t)+icon}
function fitHeaders(){
  const ts=[...document.querySelectorAll('.hd .ht')];if(!ts.length)return;
  ts.forEach(t=>t.style.fontSize='');
  document.querySelectorAll('.hd.col').forEach(h=>{h.style.aspectRatio='';h.style.height=''});
  const fits=t=>{const box=t.parentElement,cs=getComputedStyle(box),ref=box.querySelector('.ref');
    const free=box.clientHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom)-(ref?ref.offsetHeight+1:0);
    return t.scrollHeight<=free+0.5&&t.scrollWidth<=t.clientWidth+0.5};
  const board=document.querySelector('.board'),floor=board&&board.classList.contains('b5')?11:board&&board.classList.contains('b4')?12:13;
  let f=parseFloat(getComputedStyle(ts[0]).fontSize),n=0;
  const setAll=v=>ts.forEach(t=>t.style.fontSize=v+'px');
  while(ts.some(t=>!fits(t))&&f>floor&&n++<40){f-=.5;setAll(f)}
  ts.forEach(t=>{let g=f,m=0;while(!fits(t)&&g>7&&m++<30){g-=.5;t.style.fontSize=g+'px'}});
  // shared top offset per header line: centre the tallest block, start every other block at the same height
  ['.hd.col','.hd.rowh'].forEach(sel=>{
    const hs=[...document.querySelectorAll(sel)];if(!hs.length)return;
    hs.forEach(h=>h.style.paddingTop='');
    const cs=getComputedStyle(hs[0]),pt=parseFloat(cs.paddingTop),pb=parseFloat(cs.paddingBottom);
    const inner=hs[0].clientHeight-pt-pb;
    const tall=Math.max(...hs.map(h=>{const r=h.querySelector('.ref'),t=h.querySelector('.ht');return (r?r.offsetHeight+1:0)+(t?t.offsetHeight:0)}));
    // the titles row is only as tall as its tallest title, so the grid starts right under it (Héctor 2026-11-16: too much space)
    if(sel==='.hd.col'){hs.forEach(h=>{h.style.aspectRatio='auto';h.style.height=Math.ceil(tall+pt+pb)+'px'});return}
    const off=Math.max(0,(inner-tall)/2);
    hs.forEach(h=>h.style.paddingTop=(pt+off)+'px');
  });
  const cb=document.querySelector('.cbrand');
  if(cb){cb.style.fontSize='';const box=cb.parentElement;let h=parseFloat(getComputedStyle(cb).fontSize),k=0;
    while(cb.scrollWidth>box.clientWidth-parseFloat(getComputedStyle(box).paddingLeft)*2&&h>8&&k++<40){h-=.5;cb.style.fontSize=h+'px'}}
  if(GRID.fitStamps)GRID.fitStamps();
}
try{document.fonts&&document.fonts.ready.then(()=>fitHeaders())}catch(e){}
addEventListener('resize',()=>{clearTimeout(fitHeaders.t);fitHeaders.t=setTimeout(fitHeaders,120)});
function onTickVisual(){const left=S.deadline-now();const bar=document.querySelector('.tbar');const sub=document.getElementById('tleft');if(bar){bar.style.width=Math.max(0,left/(S.timer*1000)*100)+'%';bar.classList.toggle('low',left<=5000)}if(sub)sub.textContent=Geomingo.mmss(left)}

// player stats page: your own (from this device and your account) or another player's public summary (profiles/<uid>)
let STATS_UID=null,statsBack='home';const statsCache={};
function openStats(uid){STATS_UID=uid||null;if(screen!=='stats')statsBack=screen;screen='stats';ui.reveal=-1;
  if(STATS_UID&&!(USER&&STATS_UID===USER.uid)&&statsCache[STATS_UID]===undefined&&initFB())
    db.ref(GRID.profiles+STATS_UID).once('value').then(s=>{statsCache[STATS_UID]=s.val()||null;render()}).catch(()=>{statsCache[STATS_UID]=null;render()});
  render();window.scrollTo(0,0)}
function statsView(){
  const mine=!STATS_UID||(USER&&STATS_UID===USER.uid);let st,name;
  const back=`<div class="backline"><span class="ht">${'%NAME%'}</span></div>`;
  if(mine){st=computeStats(loadHist(),loadGames());name=PROFILE||setup.user||'You'}
  else{const p=statsCache[STATS_UID];
    if(p===undefined)return `<section class="panel">${back.replace('%NAME%','Player')}<p class="hint">Loading…</p></section>`;
    if(!p||!p.d)return `<section class="panel">${back.replace('%NAME%','Player')}<p class="hint">No stats yet for this player.</p></section>`;
    st=p;name=pname(STATS_UID,p.name)}
  const tile=(v,l)=>`<div class="st"><b>${v}</b><span>${l}</span></div>`,D=st.d,So=st.s,F=st.f;
  // your own stats: the same cards as every game (../brand/account.js statsPage): Daily, Solo, With friends
  const A=mine&&window.Geomingo&&Geomingo.account,days=A?Object.keys(loadHist()):[];
  if(A)return `<section class="panel stats">${back.replace('%NAME%','My stats')}${A.statsPage({game:GAME_NAME,dates:days,lbs:[{path:GRID.lb,dates:days}],num:k=>'Grid #'+dayNumber(k),
    daily:{n:D.played,unit:'grid',streak:D.streak,avg:D.avg},
    solo:{n:So.played,unit:'game',medal:So.best,stats:[[So.best,'best'],[(So.acc||0)+'%','accuracy'],[So.perfect,'perfect']]},
    friends:{n:F.played,w:F.wins,place:(F.place||0)*F.played,third:[F.best,'best']}})}</section>`;
  return `<section class="panel stats">${back.replace('%NAME%',esc(name))}
    <span class="label">Today's grid</span>
    <div class="stgrid">${tile(D.played,'played')}${tile(D.streak,'streak')}${tile(D.max,'best streak')}${tile(D.best,'best score')}${tile(D.avg,'average')}${tile(D.perfect,'perfect grids')}</div>
    <span class="label">Practice</span>
    <div class="stgrid">${tile(So.played,'games')}${tile(So.best,'best score')}${tile(So.avg,'average')}${tile(So.perfect,'perfect grids')}${tile(So.acc===undefined?'–':So.acc+'%','accuracy')}${tile(So.squares===undefined?'–':So.squares,'squares')}</div>
    <span class="label">With friends</span>
    <div class="stgrid">${tile(F.played,'games')}${tile(F.wins,'wins')}${tile(F.pct+'%','win rate')}${tile(F.best,'best score')}${tile(F.avg===undefined?'–':F.avg,'average')}${tile(F.place===undefined||!F.played?'–':String(F.place),'avg. place')}</div>
  </section>`}
// welcome: sign in with Google (name kept in the account, ranking, synced stats) or play as a guest on this device
function nameView(){
  if(USER&&NEEDNAME){const first=((USER.displayName||'').trim().split(/\s+/)[0]||'').slice(0,16);
    return `<section class="panel namecard"><p class="big">Choose your name</p>
      <label class="label" for="pickname">Your name in Geomingo</label>
      <input id="pickname" maxlength="16" autocomplete="nickname" placeholder="Your name" value="${esc(setup.user||first)}">
      <p class="hint">It appears in the daily ranking and on your results. Nobody else can have the same name. You can change it later in the Menu, once every 30 days.</p>
      <button class="primary" id="savepick">Save name</button></section>`}
  // without Google sign-in (Firebase not reachable) the name is typed and stays on this device
  return `<section class="panel namecard"><p class="big">Who's playing?</p>
    <label class="label" for="uname">Your name</label>
    <input id="uname" maxlength="16" autocomplete="nickname" placeholder="Your name" value="${esc(setup.user)}">
    <p class="hint">Shown on the grid, the scoreboard and the result you share. It stays on this device.</p>
    <button class="primary" id="savename">${setup.user?'Save name':'Continue'}</button></section>`;
}
// home: three ways to play. 'solo' and 'friends' are the settings screens behind two of them
let screen='home';
const screenFor=s=>!s?'home':s.archive?'archive':s.daily?'home':s.mode==='solo'?'solo':'friends';
// top-left corner of a board: the daily grid shows its number (GRID #10), other games their grid code
const cornerHTML=(day,code)=>day?`<div class="corner dnum" aria-label="Grid number ${day}"><span class="dl">Grid</span><span class="dn${day>=100||typeof day==='string'?' long':''}">${Geomingo.archNo(day)}</span></div>`
  :`<div class="corner dnum" aria-label="Grid ${esc(code||'')}"><span class="dl">Grid</span><span class="dn code">${esc(code||'')}</span></div>`;
// today's grid shown open on the home screen: tapping a square starts (or continues) the daily game there
function dailyBoard(saved){
  const dg=saved?null:dailyGrid();if(!saved&&!dg)return '';
  const rows=saved?saved.rows:dg.g.rows,cols=saved?saved.cols:dg.g.cols,n=cols.length;
  let h=`<div class="board-wrap dboard"><div class="board b${n}" lang="en" style="grid-template-columns:minmax(0,1.25fr) repeat(${n},minmax(0,1fr))">${cornerHTML(dayNumber(todayKey()))}`;
  cols.forEach((k,j)=>h+=`<div class="hd col" data-info="${k}" role="button" tabindex="0" aria-label="${esc(EUT(CATS[k].label))}: explain"><span class="ref">${colRef(j)}</span><span class="ht">${titleWithInfo(CATS[k].short)}</span></div>`);
  rows.forEach((rk,i)=>{
    h+=`<div class="hd rowh" data-info="${rk}" role="button" tabindex="0" aria-label="${esc(EUT(CATS[rk].label))}: explain"><span class="ref">${rowRef(i)}</span><span class="ht">${titleWithInfo(CATS[rk].short)}</span></div>`;
    for(let j=0;j<n;j++){const ci=i*n+j,cell=saved&&saved.cells[ci];
      if(cell&&cell.o>=0){const c=byCode[cell.c];h+=`<div class="cell taken flag">${stampCell(c,cell,'cs')}</div>`}
      else h+=`<button class="cell" data-dcell="${ci}" aria-label="Square ${colRef(j)+rowRef(i)}: start today's grid"><span class="plus"></span></button>`}
  });
  return h+`</div></div>`;
}
function homeView(){
  const key=todayKey(),d=loadDaily(),ms=msToNextDay(),next=`${Math.floor(ms/36e5)} h ${Math.floor(ms%36e5/6e4)} min`;
  const date=new Date(key+'T12:00Z').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'});
  const done=d&&d.S.over,p=done&&d.S.players[0];
  if(done)recordDaily(d.S); // also counts a game finished before stats existed, or on a device that was offline
  if(USER&&acctRef&&acctRef.key!==key)watchToday(); // a new day began while the page was open
  watchLB();
  const mine=lbMine(),nPlayers=LB?Object.keys(LB).length:0;
  const rankLine=mine?`<span class="hrank"><b>#${mine.rank}</b> of ${mine.total} today · top ${mine.top}%</span>`
    :USER||MAYBE_IN()?(nPlayers?`<span class="hrank">${nPlayers} player${nPlayers===1?'':'s'} in today's ranking</span>`:'')
    :AUTH_OK?`<span class="hrank">Sign in to join today's ranking${nPlayers?` (${nPlayers} player${nPlayers===1?'':'s'})`:''}.</span>`:'';
  // signed in and today's try was used on another device of the account: show that result instead of the grid
  const other=!done&&USER&&lockedElsewhere(ACCT_TODAY)?ACCT_TODAY:null;
  // played: green squares for the answers you got, grey for the rest (like the shared result); tap to see the full grid
  const doneCard=(status,n,got,score,cells,hint)=>`<button class="hcard" id="daily"><span class="hm">Today's grid #${dayNumber(key)} · ${status}</span><span class="dsum"><span class="dsq" style="grid-template-columns:repeat(${n},1fr)" aria-hidden="true">${got.map(x=>`<i class="${x?'on':''}"></i>`).join('')}</span><span class="dtxt"><span class="ht">${EU(score)} points</span><span class="hs">${cells} of ${n*n} squares</span></span>${(st=>`<span class="dstats"><span><b>${st.streak}</b>streak</span><span><b>${st.played}</b>played</span><span><b>${st.avg}</b>average</span></span>`)(dailyStats())}</span>${rankLine}<span class="hs">${hint}</span><span class="hm">Next grid in ${next}</span></button>`;
  const daily=done?doneCard('done',d.S.n,d.S.cells.map(c=>c.o>=0),p.score,p.cells,'Tap to see your grid, the ranking and share it.')
    :other?doneCard(other.f===0?'started on another device':'played on another device',other.n||DAILY_N,[...(other.g||'').padEnd((other.n||DAILY_N)**2,'0')].map(x=>x==='1'),other.s||0,other.c||0,other.f===0?'You started it on another device with this account. One try per account.':'You played it on another device with this account.')
    :`<div class="hcard ac"><span class="hm">#${dayNumber(key)} · ${date}</span><span class="ht">Today's grid</span><span class="hs">${d?'You started it: tap a square to continue.':'Compete with everyone: the same grid, one try. Tap a square to start.'}</span>${dailyBoard(d&&d.S)}</div>`;
  const st=Geomingo.streak();
  const hi=done?(p.score>0?Geomingo.hello('happy','Stamped for today.'+(st>1?' '+st+'-day streak.':''),`Today's grid: ${scoreTxt(d.S)}. Next grid in ${next}.`):Geomingo.hello('sad','Rough crossing today.',`Today's grid: 0 ${showKm(key)?'km':'points'}. Next grid in ${next}.`))
    :other?Geomingo.hello('think','Played on another device.',`Next grid in ${next}.`)
    :d?Geomingo.hello('think','Your grid is waiting.','Tap a square to carry on. One try.')
    :Geomingo.hello('pass','GeoPass ready.','Tap a square to start. Every right answer is a stamp. One try, the same grid for everyone.');
  return `<section class="home">
    ${hi}
    <div class="userline"><span class="pin" style="background:var(--sea)"></span>Playing as ${esc(setup.user)}${USER?'':'<button class="ghost" id="chname">Change</button>'}
      ${AUTH_OK&&!USER&&!MAYBE_IN()&&noBanner()?`<span class="uright"><button class="ghost" id="signin">Sign in</button></span>`:''}</div>
    ${AUTH_OK&&!USER&&!MAYBE_IN()&&!noBanner()?`<div class="gbanner"><span>Sign in to join the daily ranking</span><button class="primary" id="bsignin">Sign in</button><button class="linkbtn" id="bclose" aria-label="Close">✕</button></div>`:''}
    ${daily}
    ${TEST?`<div class="testbar"><span>Test mode${TESTDAY?' · day '+TESTDAY:''}</span><button class="ghost" id="dreset">Test: reset today's grid</button>
      <small class="tdiag">${(()=>{const a=ACCT_TODAY,hh=loadHist()[key],l=loadDaily();return `version ${APP_VERSION} · this device ${ME}<br>account today: ${USER?(a?`device ${a.d||'none'}, ${a.s} pts, ${a.f===1?'finished':a.f===0?'started':'old format'}, full game ${a.j?'yes':'no'}`:'nothing'):'not signed in'}<br>this device today: ${l?(l.S.over?l.S.players[0].score+' pts, finished':'in progress'):'nothing'} · stats today: ${hh?hh.s+' pts':'none'}`})()}</small></div>`:''}
  </section>
  ${QRULES}`;
}
const QRULES=`<section class="panel qrules"><span class="label">Quick rules</span><p class="hint">Fill each square with a ${GRID.one} that fits its row and its column, each ${GRID.one} once. Tap <span class="ib">i</span> to see what a category means. Harder squares score more. Full rules in <button type="button" class="qhelp">How to play</button>.</p></section>`;
function gameView(){
  // today's daily done: the grid goes inside the result ticket, Next trip and Share under it (Héctor 2026-11-12)
  const n=S.n,done=S.over&&S.daily&&!S.archive&&!S.dayof,solo=S.over&&S.mode==='solo';let h='',mark=0;
  // the title (in a room also ← Leave); the back is the "‹ geomingo" on top, as in every game (Héctor 2026-11-15)
  const title=S.daily?(S.archive?'Grid '+Geomingo.archNo(S.day):"Today's grid"):S.mode==='online'?'With friends':'Practice';
  // today's finished daily: no ← Back line, the "‹ geomingo" on top already goes back (Héctor 2026-11-14)
  // only a room has a title line (← Leave); today's grid, the archive and Practice say it in the ticket's strip (Héctor 2026-11-15)
  if(S.mode==='online')h+=`<div class="backline">${S.mode==='online'?'<button class="linkbtn" id="gback">← Leave</button>':''}<span class="ht">${title}</span></div>`;
  if(S.over){
    if(S.mode!=='solo')h+=`<div class="scores">${S.players.map((p,i)=>`<span class="chip ${p.on===false?'off':''}"><span class="pin" style="${pinStyle(i)}"></span>${esc(p.name)} <b>${EU(p.score)}</b></span>`).join('')}</div>`;
    if(!done&&!solo)h+=resultsView();
  }else{
    // one ticket: Mingo's message on top, the game's numbers on the stub below the tear line
    const m=mood&&mood.g===gameKey()?mood:null,p=S.players[S.turn];
    const say=m?Geomingo.hello(m.pose,m.t,m.s)
      :S.mode==='online'?Geomingo.hello('pass',S.turn===S.me?'Your turn':p.name+"'s turn",S.passes>=2*S.players.length?'Two rounds with no stamp. If nobody stamps this round, the game ends.':'Name a '+GRID.one+' that fits its row and its column.')
      :Geomingo.hello('pass',S.n*S.n+' stamps to win.','Each '+GRID.one+' must match its row and its column.');
    const cell=Geomingo.tk;
    const time=S.timer?cell('Time',`<span id="tleft">${Geomingo.mmss(S.deadline?S.deadline-now():S.timer*1000)}</span>`):'';
    const stub=S.mode==='solo'
      ?cell('Traveller',esc(S.players[0].name),'tk-name')+cell('Stamps',S.cells.filter(c=>c.o===0).length+'/'+S.n*S.n)
        // the same four boxes in every game (Héctor, 2026-11-10): today's km in the daily, points in Practice and the archive (no class: Practice has no levels)
        +(S.daily&&!S.archive?cell('km',Geomingo.newKm(S.daily)?Geomingo.KM.grid(liveScore(0),S.cells.filter(c=>c.o===0).length,S.n,LIVES-livesLeft(),S.daily):Geomingo.pts(S.cells.filter(c=>c.o===0).length/(S.n*S.n)),'tk-pts'):cell('Points',EU(liveScore(0)),'tk-pts'))+(S.nolives?cell('Mistakes',S.wrong,'tk-gs'):cell('Lives',livesDots(livesLeft(),LIVES),'tk-gs'))+time
      :S.players.map((q,i)=>`<div class="tk-c pl${i===S.turn?' on':''}${q.on===false?' off':''}"><i><span class="pin" style="${pinStyle(i)}"></span>${esc(q.name)}</i><b>${liveScore(i)}</b></div>`).join('')+time;
    h+=Geomingo.ticket(say,stub,{timer:S.timer,color:S.mode==='solo'?'':`var(--p${S.turn})`,mode:S.daily?(S.archive?'archive':'daily'):S.mode==='solo'?'practice':'friends',num:S.day});
  }
  mark=h.length;
  h+=`<div class="board-wrap"><div class="board b${n}" lang="en" style="grid-template-columns:minmax(0,1.25fr) repeat(${n},minmax(0,1fr))">`;
  h+=cornerHTML(S.daily?S.day:0,S.code);
  S.cols.forEach((k,j)=>h+=`<div class="hd col" data-info="${k}" role="button" tabindex="0" aria-label="${esc(EUT(CATS[k].label))}: explain"><span class="ref">${colRef(j)}</span><span class="ht">${titleWithInfo(CATS[k].short)}</span></div>`);
  S.rows.forEach((rk,i)=>{
    h+=`<div class="hd rowh" data-info="${rk}" role="button" tabindex="0" aria-label="${esc(EUT(CATS[rk].label))}: explain"><span class="ref">${rowRef(i)}</span><span class="ht">${titleWithInfo(CATS[rk].short)}</span></div>`;
    for(let j=0;j<n;j++){
      const ci=i*n+j,cell=S.cells[ci];
      const ref=colRef(j)+rowRef(i);
      if(cell.o>=0){const c=byCode[cell.c];
        // a fresh stamp drops onto the square, leaves a gold ring and its points float up (Héctor 2026-11-21, idea 1)
        const fly=ui.fresh===ci?`<span class="gm-ring" aria-hidden="true"></span><span class="gm-fly" aria-hidden="true">+${(cell.p||0)+(cell.sb||0)}${kmsq()&&S.daily?' km':''}</span>`:'';
        h+=`<button class="cell taken flag ${ui.fresh===ci?'new':''}"${ui.fresh===ci?` style="--el:-${Math.max(0,Date.now()-(ui.freshAt||Date.now()))}ms"`:''} data-cell="${ci}" aria-label="${ref}: ${esc(c.n)}">${stampCell(c,cell,S.mode==='solo'?'cs':'c'+cell.o)}${fly}</button>`;
      }else if(S.over){
        h+=`<button class="cell miss" data-cell="${ci}" aria-label="${ref}: show answers"><span class="nm">${S.answers[ci].length} possible</span></button>`;
      }else h+=`<button class="cell ${ui.sel===ci?'sel':''}${ui.bad===ci?' bad':''}" data-cell="${ci}" aria-label="Square ${ref}"><span class="plus"></span>${ui.bad===ci?'<span class="gm-x" aria-hidden="true">✕</span>':''}</button>`;
    }
  });
  h+=`</div></div>`;
  // the new-stamp animation survives a quick re-render (sync, flags arriving) for 1.5 s, then it is cleared
  if(Date.now()-(ui.freshAt||0)>1500)ui.fresh=-1;ui.bad=-1;
  if(!S.over)h+=(S.mode==='solo'||(S.mode==='online'&&S.turn!==S.me)?'':'<div class="actions"><button class="ghost" id="pass">Pass turn</button></div>')+`<button class="linkbtn giveup" id="giveup">${S.mode==='solo'?'Give up':'End game'}</button>`+QRULES;
  else if(done||solo)h=h.slice(0,mark)+resultsView(h.slice(mark)+answersView())+(done?lbView(null):'');
  else h+=answersView()+(S.daily&&!S.archive&&!S.dayof?lbView(null):'');
  return h;
}
function shareText(){
  const n=S.n;let g='';
  for(let i=0;i<n;i++){for(let j=0;j<n;j++){const o=S.cells[i*n+j].o;g+=o<0?'⬜':(S.mode==='solo'?'🟩':['🟥','🟦','🟨','🟪','🟩','🟫'][o])}g+='\n'}
  const head=S.daily?`${Geomingo.share(GAME_NAME)} ${Geomingo.archNo(S.day)} — ${showKm(S.daily)?EU(stateKm(S))+' km':EU(S.players[0].score)+' pts'} (${S.players[0].cells}/${n*n})`:S.mode==='solo'?`${Geomingo.share(GAME_NAME)} ${S.code} — ${EU(S.players[0].score)} pts (${S.players[0].cells}/${n*n})`:`${Geomingo.share(GAME_NAME)} ${S.code} — `+S.players.map(p=>p.name+' '+p.score).join(', ');
  return head+'\n'+g.trim();
}
// link that opens this exact grid (?grid=4E-KQPMT), sent together with the result
// the daily grid links to the game itself, so friends use their own one try instead of replaying it as a free grid
function gridLink(){return location.origin+location.pathname+(S.daily?'':'?grid='+encodeURIComponent(S.code))}
function shareMessage(){return shareText()+'\n\n'+(S.daily?"Play today's grid: ":'Play this grid: ')+gridLink()}
// phones: the system share menu (WhatsApp, Telegram...); elsewhere: copy result and link
// computers: our own panel with WhatsApp, Telegram and Copy (the Windows/Mac share menu rarely offers them)
const TOUCH=matchMedia('(pointer:coarse)').matches;
function shareResult(){const t=shareMessage();Geomingo.stat('share');
  if(navigator.share&&TOUCH){navigator.share({text:t}).catch(e=>{if(e&&e.name!=='AbortError')copyShare()})}
  else{ui.sharing=true;drawLayer()}}
function copyShare(){const t=shareMessage();
  // if the clipboard API is blocked, put the full message (with the link) in the result box, select it
  // and try the older copy command; if that fails too, the text stays selected for a manual copy
  const manual=()=>{const el=document.getElementById('share');if(el){el.hidden=false;el.textContent=t}selectShare();
    let ok=false;try{ok=document.execCommand('copy')}catch(e){}
    if(ok){if(el)el.hidden=true;toast('Result and link copied.','good')}else toast('Copy blocked here. The text is selected: copy it manually.')};
  try{navigator.clipboard.writeText(t).then(()=>toast('Result and link copied.','good'),manual)}catch(e){manual()}}
function shareView(){const enc=encodeURIComponent;
  return `<div class="infoscrim" id="sharescrim"></div><div class="infobox" role="dialog" aria-modal="true" aria-labelledby="sht">
    <h2 id="sht">Share your result</h2><p class="meta">Friends who open the link play this same grid.</p>
    <div class="sharebtns"><a class="primary" href="https://wa.me/?text=${enc(shareMessage())}" target="_blank" rel="noopener">WhatsApp</a>
    <a class="primary" href="https://t.me/share/url?url=${enc(gridLink())}&text=${enc(shareText())}" target="_blank" rel="noopener">Telegram</a>
    <button class="ghost" id="sharecopy">Copy result and link</button></div>
    <button class="linkbtn" id="shareclose">Close</button></div>`}
function breakdown(p){return `<p class="hint bdline">${p.cells} squares ${p.base} · lines ${p.lines}×${LINE_BONUS} = ${p.bonus}</p>`}
// Mingo's verdict on a finished game: {pose, t, s}
function verdict(){const n=S.n;
  if(S.mode==='solo'){const p=S.players[0],f=p.cells/(n*n),st=S.daily&&!S.archive?Geomingo.streak():0;
    const sub=p.cells+' of '+n*n+' squares · '+p.score+' points';
    return f>=1?{pose:'happy',t:'Full page. Every square stamped.',s:sub}
      :f>=.6?{pose:'happy',t:'Visited.'+(st>1?' '+st+'-day streak.':''),s:sub}
      :f>=.3?{pose:'think',t:'A few gaps in the pages.',s:sub}:{pose:'sad',t:'Rough crossing, this one.',s:sub}}
  const top=Math.max(...S.players.map(p=>p.score)),win=S.players.filter(p=>p.score===top);
  if(S.mode==='online'&&S.me>=0){const me=S.players[S.me];
    return me.score===top?{pose:'happy',t:win.length>1?'A draw. Well played.':'You win. First to arrive.',s:me.score+' points · '+me.cells+' squares'}
      :{pose:'think',t:'So close. Rematch?',s:me.score+' points · '+me.cells+' squares'}}
  return {pose:'happy',t:win.length>1?'A draw at '+top+' points.':win[0].name+' wins.',s:'Well played, everyone.'}}
const verdictHTML=()=>{const v=verdict();return Geomingo.hello(v.pose,v.t,v.s,{key:'res'})};
// the next daily game of Geomingo not played yet: the big button of today's result (All games, back to the home page, once every game is played)
// every game is a trip: one line, the same small size in every game, so no name ever wraps (a touch smaller only on very narrow phones)
// the end-of-game Share button: full width with a gold border, on its own line above the other buttons
const SHARE_BTN='<button class="primary sharebig" id="copy"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>Share result</button>';
const TRIP_STYLE='flex:1;display:flex;align-items:center;justify-content:center;min-width:0;white-space:nowrap;font-size:clamp(10px,calc((100vw - 170px)/15.5),14px);letter-spacing:.03em;padding:13.5px 8px 10.5px';
const nextGameBtn=g=>g?`<a class="primary" href="${g.href}" style="${TRIP_STYLE}">Next trip: ${esc(g.name)} →</a>`:`<a class="primary" href="${Geomingo.HOME}" style="${TRIP_STYLE}">All games</a>`;
const afterNextHTML=g=>`<button class="ghost" id="playsolo">Practice</button>`+(g?'':`<p class="hint">You have played all of today's games. New ones at midnight CET.</p>`);
// when a game you were playing ends: straight to the summary at the top of the page (no window over it)
let liveKey='';
function watchResult(){if(!S){liveKey='';return}const k=gameKey();
  if(!S.over){liveKey=k;return}
  if(liveKey!==k)return;liveKey='';
  setTimeout(()=>window.scrollTo({top:0,behavior:'smooth'}),50)}
function resultsView(body){
  if(S.daily){const p=S.players[0],n=S.n,ms=msToNextDay(),next=S.archive?null:Geomingo.nextGame(GRID.id);
    if(!S.archive&&!S.dayof)return `${Geomingo.doneTicket(GRID.id,S.day,scoreTxt(S),`next in ${Math.floor(ms/36e5)} h ${Math.floor(ms%36e5/6e4)} min`,body)}<pre class="sharebox" id="share" hidden>${esc(shareText())}</pre>
    <div class="gm-done-btns">${nextGameBtn(next)}${SHARE_BTN.replace('Share result','Share')}</div>`;
    // an archive grid (or one played on its day, opened from the archive): the coral ticket with the grid inside,
    // Back to archive (the calendar of all the games on the home page) and Share under it (Héctor 2026-11-16)
    return `${Geomingo.archTicket({id:GRID.id,num:S.day,day:S.dayof?'':S.daily,state:S,score:scoreTxt(S),detail:S.dayof?'Played on its day':p.cells+' of '+n*n+' squares',note:S.dayof?'':undefined,body})}<pre class="sharebox" id="share" hidden>${esc(shareText())}</pre>
    <div class="gm-done-btns gm-solo-btns"><button class="primary" id="archback" style="flex:1">Back to calendar</button>${SHARE_BTN.replace('Share result','Share')}</div>${Geomingo.archListBtn()}${lbView(S.daily)}`}
  // a finished Solo game: the pink ticket with the grid inside, then New grid and Share (Héctor 2026-11-14)
  if(S.mode==='solo'){const p=S.players[0],n=S.n,best=Math.max(p.score||0,...loadGames().filter(g=>g.m==='s'&&g.n===n).map(g=>g.s||0));
    return `${Geomingo.soloTicket({id:GRID.id,what:S.nolives?'Unlimited':LIVES+' lives',code:S.code,score:EU(p.score)+' points',best:'Best: '+EU(best),detail:p.cells+' of '+n*n+' squares',body})}<pre class="sharebox" id="share" hidden>${esc(shareText())}</pre>
    <div class="gm-done-btns gm-solo-btns"><button class="primary" id="again" style="flex:1">New grid</button>${SHARE_BTN.replace('Share result','Share')}</div>`}
  const ranked=S.players.map((p,i)=>({...p,i})).sort((a,b)=>b.score-a.score||b.cells-a.cells);
  // the one room for all nine games: these points as they are (squares share 100, +10 a line)
  if(S.mode==='online'&&S.over&&Geomingo.party)Geomingo.party.result(ranked.map(p=>({n:p.name,p:Math.max(0,Math.round(p.score||0))})));
  const top=ranked[0].score,winners=ranked.filter(p=>p.score===top);
  return `<section class="panel respanel">${verdictHTML()}<p class="big">${winners.length>1?'Draw at '+top+' points':esc(winners[0].name)+' wins'}</p>
   <div class="podium">${ranked.map((p,r)=>`<div class="place ${p.score===top?'win':''}" ${p.uid?`data-stats="${esc(p.uid)}" role="button" tabindex="0"`:''}><span class="rk">${r+1}</span><span class="pin" style="${pinStyle(p.i)}"></span><span class="nm">${esc(p.name)}</span><span class="pt">${EU(p.score)}</span></div><div class="bd">${breakdown(p)}</div>`).join('')}</div>
   <pre class="sharebox" id="share">${esc(shareText())}</pre>
   ${SHARE_BTN}<div class="row-btns sharerow">${S.mode==='online'&&!S.host?'':'<button class="primary" id="again" style="flex:1">Rematch, new grid</button>'}</div>
   ${S.mode==='online'?(S.host?'':(Geomingo.party&&Geomingo.party.on()?'':'<p class="hint">The host can start a rematch.</p>'))+'<button class="ghost" id="newg">Leave room</button>':''}</section>`;
}
function answersView(){
  if(ui.reveal<0)return `<p class="hint" style="margin-top:12px">Tap any square to see every ${GRID.one} that fits it.</p>`;
  const ci=ui.reveal,n=S.n,i=Math.floor(ci/n),j=ci%n;
  const list=S.answers[ci].map(x=>GRID.items[x]);
  return `<section class="panel answers"><p class="hdr"><span>${colRef(j)}${rowRef(i)} · ${esc(EUT(CATS[S.rows[i]].label))} × ${esc(EUT(CATS[S.cols[j]].label))}</span><span class="nsol">${list.length} answer${list.length===1?'':'s'}</span></p><p class="alist">${list.map(GRID.answer).join('')}</p></section>`;
}

/* ---- guess sheet ---- */
// The list shows names only, never flags: only names (or one of their words) that start with what you typed, so the list gives less away.
const wordKeys=c=>c.wk||(c.wk=c.n.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().split(/[^a-z]+/).filter(Boolean).map((w,i,a)=>a.slice(i).join('')).slice(1));
// line icons for the menu (24×24, drawn with the text colour)
const ICONS={menu:'M4 6h16M4 12h16M4 18h16',games:'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',help:'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18M12 17v.01M12 13.5a1.5 1.5 0 0 1 1-1.5a2.6 2.6 0 1 0-3-4',
  archive:'M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2M16 3v4M8 3v4M4 11h16',
  stats:'M4 12h4a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1M10 8h4a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1M16 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1',
  credits:'M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0M3 6v13M12 6v13M21 6v13',
  signout:'M14 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-2M9 12h12l-3-3M18 15l3-3',
  signin:'M14 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-2M20 12H7l3-3M10 15l-3-3'};
const ico=k=>`<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[k]}"/></svg>`;
// "How to play" in the Quick rules box opens the full rules
document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('.qhelp')){ui.help=true;drawLayer()}});
// this game's lines in the one Menu (your initial ▾, brand/account.js; Héctor 2026-11-15: the game's own ☰ is gone)
if(Geomingo.setGameMenu)Geomingo.setGameMenu({name:GAME_NAME,items:[
  ['How to play','help','#7FA2F0',()=>{ui.help=true;drawLayer()}],
  ['My stats','stats','#5FC28F',()=>openStats(USER?USER.uid:null)],
  // every past grid of this game, as before (Héctor 2026-11-16); the Menu's Archive is the calendar of all the games
  [GAME_NAME+' archive','cal','#D4AD4B',openArchive]],sources:()=>{ui.credits=true;drawLayer()}});
function drawLayer(){
  let h='';
  if(S&&!S.over&&ui.sel>=0){
    const n=S.n,i=Math.floor(ui.sel/n),j=ui.sel%n;
    const res=matches(ui.query);
    h+=`<div class="scrim" id="scrim"></div><div class="sheet" role="dialog" aria-label="Name a ${GRID.one}">
      <div class="q"><i>${colRef(j)}${rowRef(i)}</i><button class="qcat" data-info="${S.rows[i]}">${esc(EUT(CATS[S.rows[i]].label))}<span class="ib">i</span></button> <i>×</i> <button class="qcat" data-info="${S.cols[j]}">${esc(EUT(CATS[S.cols[j]].label))}<span class="ib">i</span></button></div>
      <input id="gq" placeholder="Type a ${GRID.one}…" autocomplete="off" autocapitalize="words" spellcheck="false" value="${esc(ui.query)}">
      <ul class="sugg" id="sugg">${sugg(res)}</ul>
      <div class="bar"><button class="ghost" id="cancel">Back to grid</button></div></div>`;
  }
  if(ui.sharing&&S&&S.over)h+=shareView();
  if(ui.credits){
    h+=GRID.credits()}
  if(ui.help)h+=GRID.help();
  if(ui.info!=null&&CATS[ui.info]){const k=CATS[ui.info];
    h+=`<div class="infoscrim" id="infoscrim"></div><div class="infobox" role="dialog" aria-modal="true" aria-labelledby="infot"><div class="dlg-head"><h2 id="infot"><span class="label">Category</span><br>${esc(EUT(k.label))}</h2><button class="dlg-x" id="infook">Close</button></div><p>${esc(k.desc)}</p><span class="meta">${k.count} ${GRID.many} in the game match this on its own.</span></div>`}
  if(ui.toast)h+=`<div class="toast ${ui.toast.kind||''}" role="status">${esc(ui.toast.msg)}</div>`;
  const had=document.getElementById('gq');const caret=had?had.selectionStart:null;
  layer.innerHTML=h;
  const sc=document.getElementById('shareclose');
  if(sc){const close=()=>{ui.sharing=false;drawLayer()};sc.onclick=close;document.getElementById('sharescrim').onclick=close;
    layer.querySelectorAll('.sharebtns a').forEach(a=>a.addEventListener('click',close));
    document.getElementById('sharecopy').onclick=()=>{close();copyShare()}}
  const ck=document.getElementById('credok');
  if(ck){const close=()=>{ui.credits=false;drawLayer()};ck.onclick=close;document.getElementById('credscrim').onclick=close}
  const hk=document.getElementById('helpok');
  if(hk){const close=()=>{ui.help=false;drawLayer()};hk.onclick=close;document.getElementById('helpscrim').onclick=close}
  const ok=document.getElementById('infook');
  if(ok){const close=()=>{ui.info=null;drawLayer()};ok.onclick=close;document.getElementById('infoscrim').onclick=close;ok.focus()}
  layer.querySelectorAll('[data-info]').forEach(b=>b.onclick=e=>{e.preventDefault();ui.info=+b.dataset.info;drawLayer()});
  const gq=document.getElementById('gq');
  if(gq){if(ui.info==null){gq.focus();if(caret!=null)gq.setSelectionRange(caret,caret)}
    gq.oninput=e=>{ui.query=e.target.value;document.getElementById('sugg').innerHTML=sugg(matches(ui.query));bindSugg()};
    gq.onkeydown=e=>{if(e.key==='Enter'){const r=matches(ui.query).filter(c=>!S.used.includes(c.c));if(r[0])guess(ui.sel,r[0].c)}if(e.key==='Escape'){ui.sel=-1;render()}};
    bindSugg();
    document.getElementById('cancel').onclick=document.getElementById('scrim').onclick=()=>{ui.sel=-1;ui.query='';render()};
  }
}
function sugg(res){if(!ui.query)return `<li class="hint" style="padding:8px 2px">Start typing. You only get one try per turn.</li>`;if(!res.length)return `<li class="hint" style="padding:8px 2px">No ${GRID.one} matches “${esc(ui.query)}”.</li>`;
  return res.map(c=>{const u=S.used.includes(c.c);return `<li><button data-g="${c.c}" ${u?'disabled':''}>${esc(c.n)}${u?'<span class="tag">used</span>':GRID.tag(c)}</button></li>`}).join('')}
function bindSugg(){layer.querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>guess(ui.sel,b.dataset.g))}

/* ---- bindings ---- */
function bind(){
  // the address says Practice (?solo) or With friends (?friends), so F5 keeps you there
  Geomingo.where(S?(S.daily?'':S.mode==='solo'?'solo':'friends'):roomCode||screen==='friends'?'friends':screen==='solo'?'solo':'');
  // anonymous counter for geomingo.com/stats: a game seen running on this page that has now ended
  if(S&&!S.over)statLive=true;else if(S&&S.over&&statLive){statLive=false;Geomingo.stat('fin',S.daily?'daily':S.mode==='solo'?'solo':'friends')}else if(!S)statLive=false;
  const $=id=>document.getElementById(id);
  if($('uname')){const u=$('uname');setTimeout(()=>u.focus(),30);u.onkeydown=e=>{if(e.key==='Enter')saveUser(u.value)};$('savename').onclick=()=>saveUser(u.value)}
  if($('bsignin'))$('bsignin').onclick=signIn;
  if($('bclose'))$('bclose').onclick=()=>{try{localStorage.setItem(GRID.key+'nobanner','1')}catch(e){}render()};
  if($('chname'))$('chname').onclick=()=>Geomingo.account.changeName(saveUser);
  if($('gsignin'))$('gsignin').onclick=signIn;
  if($('mystats'))$('mystats').onclick=()=>openStats(USER?USER.uid:null);
  if($('aback'))$('aback').onclick=()=>{screen=archBack==='archive'?'home':archBack;render()};
  app.querySelectorAll('[data-arch]').forEach(b=>b.onclick=()=>playArchive(b.dataset.arch));
  if($('sback'))$('sback').onclick=()=>{screen=statsBack==='stats'?'home':statsBack;render()};
  app.querySelectorAll('[data-stats]').forEach(b=>{b.onclick=()=>openStats(b.dataset.stats);b.onkeydown=e=>{if(e.key==='Enter')openStats(b.dataset.stats)}});
  if($('pickname')){const u=$('pickname');setTimeout(()=>u.focus(),30);u.onkeydown=e=>{if(e.key==='Enter')saveProfile(u.value)};$('savepick').onclick=()=>saveProfile(u.value)}
  app.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{screen=b.dataset.go;render()});
  if($('signin'))$('signin').onclick=signIn;
  if($('signin2'))$('signin2').onclick=signIn;
  if($('signout'))$('signout').onclick=signOut;
  // test reset: forget today's game on this device and, when signed in, in the account too (the public ranking keeps its first result)
  if($('dreset'))$('dreset').onclick=()=>{try{localStorage.removeItem(GRID.key+'daily');const h=loadHist();delete h[todayKey()];saveHist(h)}catch(e){}
    dailyCache=null;S=null;dailyUp='';
    if(USER&&db&&!TESTDAY)db.ref('users/'+USER.uid+GRID.fb+'/daily/'+todayKey()).remove().catch(()=>{});
    toast('Today\'s grid reset (test mode).','good');render()};
  app.querySelectorAll('[data-dcell]').forEach(b=>b.onclick=()=>{const ci=+b.dataset.dcell;playDaily();
    if(S&&S.daily&&!S.over&&S.cells[ci].o<0){ui.sel=ci;ui.query='';render()}});
  // the title: in Practice and With friends you stay where you are (the game is kept), else today's grid
  const titleTap=()=>{const m=Geomingo.mode();if(m==='solo'||m==='friends')window.scrollTo(0,0);else goHome()};
  if($('brand')){$('brand').onclick=titleTap;$('brand').onkeydown=e=>{if(e.key==='Enter')titleTap()}}
  if($('home'))$('home').onclick=toHub;
  if($('pass'))$('pass').onclick=pass;
  if($('giveup'))$('giveup').onclick=()=>{const b=$('giveup');if(b.dataset.armed){Geomingo.stat('giveup');endGame()}else{b.dataset.armed='1';b.textContent='Tap again to '+(S&&S.mode==='solo'?'give up':'end the game')}};
  if($('gback')&&S&&S.mode==='online')$('gback').onclick=leaveRoom;
  else if($('gback')&&S&&S.daily&&!S.archive)$('gback').onclick=toHub;
  else if($('gback'))$('gback').onclick=()=>{screen=screenFor(S);clearInterval(tick);S=null;setup.code='';render();window.scrollTo(0,0)};
  if($('playsolo'))$('playsolo').onclick=()=>{screen='solo';clearInterval(tick);S=null;setup.code='';render();window.scrollTo(0,0)};
  if($('reload'))$('reload').onclick=()=>{location.replace(location.pathname+'?v='+Date.now())};
  if($('archback'))$('archback').onclick=()=>{location.href=Geomingo.HOME+'#archive'};
  if($('archlist'))$('archlist').onclick=openArchive;
  if($('newg')&&S&&S.mode==='online')$('newg').onclick=leaveRoom;
  else if($('newg'))$('newg').onclick=()=>{screen=screenFor(S);clearInterval(tick);S=null;setup.code='';render()};
  if($('again'))$('again').onclick=()=>{if(S.mode==='online'){onlineAct('rematch');return}setup.code='';startGame()};
  if($('copy'))$('copy').onclick=shareResult;
  if($('daily'))$('daily').onclick=()=>{const d=loadDaily();if(USER&&lockedElsewhere(ACCT_TODAY)&&!(d&&d.S.over)){toast('Played on another device with this account. Open it there to see the full grid.');return}playDaily()};
  app.querySelectorAll('[data-info]').forEach(b=>{b.onclick=()=>{ui.info=+b.dataset.info;drawLayer()};b.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();b.click()}}});
  app.querySelectorAll('[data-cell]').forEach(b=>b.onclick=()=>{
    const ci=+b.dataset.cell;
    if(S.over){ui.reveal=ui.reveal===ci?-1:ci;render();return}
    if(S.cells[ci].o>=0)return;
    if(S.mode==='online'&&S.turn!==S.me){toast('Wait for your turn. It is '+S.players[S.turn].name+"'s go.");return}
    ui.sel=ci;ui.query='';render();
  });
}
function selectShare(){const el=document.getElementById('share');if(!el)return;const r=document.createRange();r.selectNodeContents(el);const s=getSelection();s.removeAllRanges();s.addRange(r)}

/* ---- hot reload state ---- */
function start(data){
  const keepUser=setup.user;
  if(data&&data.S){S=data.S;setup={...setup,...(data.setup||{})};}
  // nobody has to pick a name to play: without one you are Guest (sign in later from the home screen or the menu)
  setup.user=setup.user||keepUser||'Guest';
  editingUser=!setup.user;
  if(editingUser||(S&&S.mode==='online'))S=null;
  if(S&&!S.over)startTurn();
  try{if(new URLSearchParams(location.search).has('friends')&&!S){screen='friends';history.replaceState(null,'',location.pathname)}}catch(e){}
  // ?solo (from Practice on the Geomingo home page) starts a practice grid
  try{if(new URLSearchParams(location.search).has('solo')&&!S){screen='solo';history.replaceState(null,'',location.pathname)}}catch(e){}
  // a shared result link (?grid=4E-KQPMT) starts that same grid
  try{const g=new URLSearchParams(location.search).get('grid');if(g&&parseCode(g)){setup.code=g.trim().toUpperCase();if(setup.mode==='online')setup.mode='solo';screen='solo';if(S&&S.mode!=='online')S=null}}catch(e){}
  // Menu → Archive on the home page: ?day=2026-11-14 opens that past grid (or the Archive list, when it was played on its day)
  {const ak=Geomingo.askedDay(DAILY_FIRST);if(ak){AUTO=0;S=null;screen='archive';playArchive(ak)}}
  initAuth();watchLB();
  // back in the room after a reload (only from the one room on the home page), unless it is an old or finished one
  if(FB_OK&&!S&&Geomingo.party&&Geomingo.party.on()){const saved=Geomingo.room.saved(GRID.key+'room');
    if(saved&&initFB())db.ref('rooms/'+saved).once('value').then(s=>{const r=s.val();
      if(r&&r.players&&r.players[ME]&&!roomCode&&!S&&Geomingo.room.resume(GRID.key+'room',r.status==='over'))listenRoom(saved);else if(!roomCode)Geomingo.room.forget(GRID.key+'room')}).catch(()=>{})}
  // back from another app after a while with a finished room still open: go to the home screen
  document.addEventListener('visibilitychange',()=>{if(document.hidden||!roomCode||!room)return;
    if(Geomingo.room.stale(room.status==='over'))leaveRoom().then(()=>{screen='home';render()})});
  render();
}
document.getElementById('creditsbtn').onclick=()=>{ui.credits=true;drawLayer()};
window.claude?.hot?.snapshot?.(()=>({S,setup}));
window.claude?.hot?.ready ? window.claude.hot.ready(start) : start(window.claude?.hot?.data ?? {});
