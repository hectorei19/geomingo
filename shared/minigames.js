// Helpers shared by Connections, Top 10 and Silhouette (Countries has its own): page header, toast, info box,
// daily key and number, seeds, streaks and sharing the result.
const esc=s=>String(s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const $=id=>document.getElementById(id);
const app=$('app'),layer=$('layer');
// hidden test mode, as in Borderline: ?test&day=2026-11-20 plays that day's puzzle (results are not saved)
const TESTQ=(()=>{try{return new URLSearchParams(location.search)}catch(e){return new URLSearchParams()}})();
const TESTDAY=TESTQ.has('test')&&/^\d{4}-\d{2}-\d{2}$/.test(TESTQ.get('day')||'')?TESTQ.get('day'):null;
function todayKey(){if(TESTDAY)return TESTDAY;const p=madridParts(Date.now());return p.year+'-'+p.month+'-'+p.day}
const dayNum=(key,first)=>Math.round((Date.parse(key+'T00:00Z')-Date.parse(first+'T00:00Z'))/864e5)+1;
function msToNextDay(){const p=madridParts(Date.now());return (24*3600-(+p.hour*3600+ +p.minute*60+ +p.second))*1000}
const nextIn=()=>{const ms=msToNextDay();return `${Math.floor(ms/36e5)} h ${Math.floor(ms%36e5/6e4)} min`};
// the same seed for everyone on a given day
function seedOf(str){let h=2166136261;for(const ch of str){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0}return h}
function load(k,def){try{const v=JSON.parse(localStorage.getItem(k)||'null');return v==null?def:v}catch(e){return def}}
function store(k,v){if(TESTDAY&&k!=='cx-free'&&k!=='t10-free'&&k!=='sil-train')return;try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
// days played in a row, ending today (or yesterday when today is not played yet)
function streakOf(hist){const day=k=>Math.round(Date.parse(k+'T12:00Z')/864e5),set=new Set(Object.keys(hist).map(day));
  let d=set.has(day(todayKey()))?day(todayKey()):day(todayKey())-1,n=0;while(set.has(d)){n++;d--}return n}

let toastT=null,toastMsg=null;
function toast(msg,kind){toastMsg={msg,kind};clearTimeout(toastT);toastT=setTimeout(()=>{toastMsg=null;drawToast()},2200);drawToast()}
function drawToast(){let el=$('toastbox');if(!el){el=document.createElement('div');el.id='toastbox';document.body.appendChild(el)}
  el.innerHTML=toastMsg?`<div class="toast ${toastMsg.kind||''}" role="status">${esc(toastMsg.msg)}</div>`:''}
// a dialog over the page (rules, a category's meaning); closes with its button, the scrim or Escape
function dialog(title,html,label){layer.innerHTML=`<div class="infoscrim" id="dscrim"></div><div class="infobox helpbox" role="dialog" aria-modal="true" aria-labelledby="dlgt"><h2 id="dlgt">${title}</h2>${html}<button class="primary" id="dok">${label||'Got it'}</button></div>`;
  const close=()=>{layer.innerHTML=''};$('dok').onclick=$('dscrim').onclick=close;$('dok').focus()}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('dok'))layer.innerHTML=''});
// Geomingo's shared header (../brand/mingo.js): "‹ geomingo", streak and light/dark on top, then the game's
// name and the Menu. Tapping the game's name goes back to its home screen (each page defines goHome).
const MICONS={menu:'M4 6h16M4 12h16M4 18h16',games:'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',help:'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18M12 17v.01M12 13.5a1.5 1.5 0 0 1 1-1.5a2.6 2.6 0 1 0-3-4',
  stats:'M4 12h4a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1M10 8h4a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1M16 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1',
  credits:'M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0M3 6v13M12 6v13M21 6v13',
  archive:'M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2M16 3v4M8 3v4M4 11h16'};
const mico=k=>`<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="${MICONS[k]}"/></svg>`;
const menuBtn=()=>`<button class="helpbtn" id="menu" aria-haspopup="true" aria-expanded="false">${mico('menu')}Menu</button>`;
// the name you play with in Countries (same site, so the same device storage); Guest otherwise
function playerName(){try{return localStorage.getItem('bl-user')||'Guest'}catch(e){return 'Guest'}}
function header(brand,coord,home){
  return Geomingo.header({game:brand.replace(/<[^>]*>/g,''),coord,menu:menuBtn()})}
// Mingo: what he says about your last move, for the game it belongs to (key), or what he says by default
let mood=null;
function say(key,pose,t,s){mood={key,pose,t,s}}
function moodHTML(key,pose,t,s){const m=mood&&mood.key===key?mood:{pose,t,s};return Geomingo.hello(m.pose,m.t,m.s)}
// when a game you were playing ends: straight to the summary at the top of the page (no window over it)
let liveKey='';
function watchResult(key,over){if(!key)return;if(!over){liveKey=key;return}
  if(liveKey!==key)return;liveKey='';setTimeout(()=>window.scrollTo({top:0,behavior:'smooth'}),50)}
// the next game of the day not played yet: the big button of a daily result (All games once every trip is done)
// every game is a trip: one line, the same small size in every game, so no name ever wraps (a touch smaller only on very narrow phones)
const TRIP_STYLE='flex:1;display:flex;align-items:center;justify-content:center;min-width:0;white-space:nowrap;font-size:clamp(10px,calc((100vw - 170px)/15.5),14px);letter-spacing:.03em;padding:13.5px 8px 10.5px';
function nextGameBtn(cur){const g=Geomingo.nextGame(cur);
  return g?`<a class="primary" href="${g.href}" style="${TRIP_STYLE}">Next trip: ${esc(g.name)} →</a>`:`<a class="primary" href="${Geomingo.HOME}" style="${TRIP_STYLE}">All games</a>`}
const allPlayedHTML=cur=>Geomingo.nextGame(cur)?'':`<p class="hint">You have played all of today's games. New ones at midnight, Spain time.</p>`;
function drawMenu(open){let box=$('menulayer');
  if(!box){box=document.createElement('div');box.id='menulayer';document.body.appendChild(box)}
  const b=$('menu');if(b)b.setAttribute('aria-expanded',open?'true':'false');
  if(!open){box.innerHTML='';return}
  const it=(k,label)=>`<button class="mitem" data-menu="${k}">${mico(k)}${label}</button>`;
  box.innerHTML=`<div class="menuscrim" id="menuscrim"></div><nav class="menubox" aria-label="Menu" style="top:${Math.round((b?b.getBoundingClientRect().bottom:54)+4)}px">${it('help','How to play')}${typeof openArchive==='function'?it('archive','Archive'):''}${it('stats','My stats')}${it('credits','Credits &amp; data sources')}${it('games','All Geomingo games')}</nav>`;
  $('menuscrim').onclick=()=>drawMenu(false);
  box.querySelectorAll('[data-menu]').forEach(m=>m.onclick=()=>{const k=m.dataset.menu;drawMenu(false);
    if(k==='help')dialog('How to play',rulesHTML());
    else if(k==='archive')openArchive();
    else if(k==='stats')dialog('My stats',`<p class="hint">Your daily games, kept on this device.</p>${statsHTML()}`);
    else if(k==='credits')openCredits();
    else if(k==='games')location.href=Geomingo.HOME})}
// the sources of the countries' data (the same as Countries'), told here so nobody has to open another game
const DATA_CREDITS=`<ul style="padding-left:18px">
  <li>Country data (names, borders, regions, area, languages, currencies, capitals): <a href="https://github.com/mledoze/countries" target="_blank" rel="noopener">mledoze/countries</a>, under the Open Database License (ODbL) 1.0, with a few corrections by hand.</li>
  <li>Population, development, economy, politics, geography and sport figures: Wikipedia lists (CC BY-SA 4.0), downloaded in October 2026, which cite the UN, the UNDP, the World Bank and the CIA World Factbook among others.</li>
  <li>Flag colours and symbols, seas, memberships and sporting hosts: compiled by hand from public sources, correct as of October 2026.</li>
  <li>Flags: <a href="https://github.com/lipis/flag-icons" target="_blank" rel="noopener">flag-icons</a> (MIT License).</li>
  <li>Fonts: Archivo, Public Sans and Courier Prime (Google Fonts, SIL Open Font License).</li>
  <li>Online play and rankings: <a href="https://firebase.google.com" target="_blank" rel="noopener">Firebase</a>. Only room codes, player names, results and moves are stored.</li></ul>`;
function openCredits(){dialog('Credits &amp; data sources',typeof creditsHTML==='function'?creditsHTML():DATA_CREDITS)}
// the footer's "Credits & data sources", as in every game
document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('#creditsbtn'))openCredits()});
/* ---- archive: past daily games, one try each, kept on this device ----
   o: {first: the first day, played: day => what you did on its day (or null), saved: day => the archive game (or null),
   num: day => its number, label: 'Puzzle', done: game => [result text, squares HTML]} */
function archDates(first,playedToday){const out=[],end=Date.parse(todayKey()+'T12:00Z');let d=Date.parse(first+'T12:00Z');
  while(d<end){out.push(new Date(d).toISOString().slice(0,10));d+=864e5}
  if(playedToday&&!TESTDAY)out.push(todayKey());return out.reverse()}
function archiveHTML(o){const items=archDates(o.first,o.played(todayKey())).map(k=>{const n=o.num(k),g=o.saved(k),p=o.played(k),
      date=new Date(k+'T12:00Z').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
    let st,sq='';
    if(g&&g.over){const [t,q]=o.done(g);st=`<span class="as done">${t}</span>`;sq=q||''}
    else if(p)st=`<span class="as done">${esc(p)}</span>`;
    else st=`<span class="as">${g?'In progress':'Play'}</span>`;
    return `<li><button data-arch="${k}"><span class="an">#${n}</span><span class="ad"><b>${o.label} #${n}</b><small>${date}</small></span>${sq}${st}</button></li>`}).join('');
  return `<section class="panel"><div class="backline"><button class="linkbtn" id="home">← Back</button><span class="ht">Archive</span></div>
    <p class="hint">Play the daily ${o.label.toLowerCase()}s you missed. The ones you played on their day are already done. One try each, on this device. Archive games don't count for the daily ranking or your streak.</p>
    ${items?`<ul class="arch">${items}</ul>`:`<p class="hint">No past ${o.label.toLowerCase()}s yet. Come back tomorrow.</p>`}</section>`}
document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('#menu,#brand');if(!t)return;
  if(t.id==='menu')drawMenu(!document.querySelector('#menulayer .menubox'));else if(typeof goHome==='function')goHome()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.querySelector('#menulayer .menubox'))drawMenu(false);
  if(e.key==='Enter'&&document.activeElement&&document.activeElement.id==='brand'&&typeof goHome==='function')goHome()});

// phones: the system share menu; elsewhere copy the result and the link (if the clipboard is blocked, select the text)
const TOUCH=matchMedia('(pointer:coarse)').matches;
function share(text){
  const manual=()=>{const el=$('share');if(el){el.textContent=text;const r=document.createRange();r.selectNodeContents(el);const s=getSelection();s.removeAllRanges();s.addRange(r)}
    let ok=false;try{ok=document.execCommand('copy')}catch(e){}toast(ok?'Result and link copied.':'Copy blocked here. The text is selected: copy it manually.',ok?'good':'')};
  if(navigator.share&&TOUCH){navigator.share({text}).catch(e=>{if(e&&e.name!=='AbortError')manual()});return}
  try{navigator.clipboard.writeText(text).then(()=>toast('Result and link copied.','good'),manual)}catch(e){manual()}}
const pageLink=q=>location.origin+location.pathname+(q||'');
// Give up: ends today's game (or a practice one) as it stands, so nobody has to type nonsense to finish.
// Two taps, like Countries: the first asks to confirm.
const giveUpHTML=()=>`<button class="linkbtn giveup" id="giveup">Give up</button>`;
function bindGiveUp(end){const b=$('giveup');if(!b)return;
  b.onclick=()=>{if(b.dataset.armed){end();return}b.dataset.armed='1';b.textContent='Tap again to give up'}}
// the three numbers under every daily result (and in My stats): days played, the average result, the streak
const statTiles=(played,avg,streak)=>`<div class="stgrid"><div class="st"><b>${played}</b><span>played</span></div><div class="st"><b>${avg}</b><span>average</span></div><div class="st"><b>${streak}</b><span>streak</span></div></div>`;
// lives on the ticket: pink dots, the ones used empty (the same in Connections, Top 10 and Silhouette)
const livesHTML=(left,all)=>`<span class="tk-dots" aria-label="${left} ${left===1?'life':'lives'} left">${Array.from({length:all},(_,i)=>`<i class="${i<left?'':'off'}"></i>`).join('')}</span>`;
// the same three numbers, small, on the home screen's card of today's game once it is done
const dstatsHTML=(streak,played,avg)=>`<span class="dstats"><span><b>${streak}</b>streak</span><span><b>${played}</b>played</span><span><b>${avg}</b>average</span></span>`;
