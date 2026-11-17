// Helpers shared by Connections, Top 10, Silhouette, Customs, Flag Pie, Impostor and Compass (Countries and Capitals have
// their own): page header, toast, info box,
// daily key and number, seeds, streaks and sharing the result.
const esc=s=>String(s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const $=id=>document.getElementById(id);
const app=$('app'),layer=$('layer');
// hidden test mode, as in Borderline: ?test&day=2026-11-20 plays that day's puzzle (results are not saved)
const TESTQ=(()=>{try{return new URLSearchParams(location.search)}catch(e){return new URLSearchParams()}})();
const TESTDAY=TESTQ.has('test')&&/^\d{4}-\d{2}-\d{2}$/.test(TESTQ.get('day')||'')?TESTQ.get('day'):null;
function todayKey(){if(TESTDAY)return TESTDAY;const p=madridParts(Date.now());return p.year+'-'+p.month+'-'+p.day}
const dayNum=(key,first)=>Math.round((Date.parse(key+'T00:00Z')-Date.parse(first+'T00:00Z'))/864e5)+1;
// an Archive day's number: its daily number, or its date ("15 Oct") for a day before the game's first daily (Geomingo.ARCH_FROM)
const archNum=(key,first)=>{const n=dayNum(key,first);return n>=1?n:Geomingo.dateText(key,{day:'numeric',month:'short'})};
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
function dialog(title,html,label){layer.innerHTML=`<div class="infoscrim" id="dscrim"></div><div class="infobox helpbox" role="dialog" aria-modal="true" aria-labelledby="dlgt"><div class="dlg-head"><h2 id="dlgt">${title}</h2><button class="dlg-x" id="dok">Close</button></div>${html}</div>`;
  const close=()=>{layer.innerHTML=''};$('dok').onclick=$('dscrim').onclick=close;$('dok').focus()}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('dok'))layer.innerHTML=''});
// Geomingo's shared header (../brand/mingo.js): "‹ geomingo", streak and light/dark on top, then the game's
// name and the Menu. Tapping the game's name goes back to its home screen (each page defines goHome).
// the name you play with in Countries (same site, so the same device storage); Guest otherwise
function playerName(){try{return localStorage.getItem('bl-user')||'Guest'}catch(e){return 'Guest'}}
function header(brand,coord,home,practice){const game=brand.replace(/<[^>]*>/g,'');gameMenu(game);
  return Geomingo.header({game,coord,practice})}
// this game's lines in the one Menu (your initial ▾, brand/account.js): How to play, My stats, and its data sources
function gameMenu(name){if(!Geomingo.setGameMenu)return;
  // (the Archive is one line for all the games, in the Geomingo part of the Menu: a calendar on the home page;
  // "<Game> archive" lists every past day of this game, as before, Héctor 2026-11-16)
  Geomingo.setGameMenu({name,items:[['How to play','help','#7FA2F0',()=>dialog('How to play',rulesHTML())],
    ['My stats','stats','#5FC28F',()=>dialog('My stats',myStatsHTML())],
    [name+' archive','cal','#D4AD4B',()=>{DAYOF=null;openArchive()}]],sources:openCredits})}
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
// the end-of-game Share button: full width with a gold border, on its own line above the other buttons
const SHARE_BTN='<button class="primary sharebig" id="copy"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>Share result</button>';
const TRIP_STYLE='flex:1;display:flex;align-items:center;justify-content:center;min-width:0;white-space:nowrap;font-size:clamp(10px,calc((100vw - 170px)/15.5),14px);letter-spacing:.03em;padding:13.5px 8px 10.5px';
function nextGameBtn(cur){const g=Geomingo.nextGame(cur);
  return g?`<a class="primary" href="${g.href}" style="${TRIP_STYLE}">Next trip: ${esc(g.name)} →</a>`:`<a class="primary" href="${Geomingo.HOME}" style="${TRIP_STYLE}">All games</a>`}
const allPlayedHTML=cur=>Geomingo.nextGame(cur)?'':`<p class="hint">You have played all of today's games. New ones at midnight CET.</p>`;
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
// "How to play" in the Quick rules box opens the full rules
document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('.qhelp'))dialog('How to play',rulesHTML())});
/* ---- archive: past daily games, one try each, kept on this device ----
   o: {first: the first day, played: day => what you did on its day (or null), saved: day => the archive game (or null),
   num: day => its number, label: 'Puzzle', done: game => [result text, squares HTML]} */
function archDates(first,playedToday){const out=[],end=Date.parse(todayKey()+'T12:00Z');let d=Date.parse(first+'T12:00Z');
  while(d<end){out.push(new Date(d).toISOString().slice(0,10));d+=864e5}
  if(playedToday&&!TESTDAY)out.push(todayKey());return out.reverse()}
// a day you played on its day, opened from the calendar on the home page: its result on the coral archive ticket,
// with Back to archive under it, instead of this game's old list of days (Héctor 2026-11-16)
let DAYOF=null;
document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('#archlist')){DAYOF=null;openArchive()}});
function dayofHTML(o,k){const p=String(o.played(k)||''),g=Geomingo.GAMES.find(x=>x.path===Geomingo.PAGE+'/'),
    date=new Date(k+'T12:00Z').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'});
  const score=p.replace(/ pts$/,' points').replace(/^(\d+)\/(\d+)( groups)?$/,'$1 of $2');
  return Geomingo.archTicket({id:g?g.id:'',num:o.num(k),score,detail:'Played on its day',note:date,
      body:`<p class="hint" style="margin:0">Each day can be played once, so this one is done.</p>`})+
    `<div class="gm-done-btns gm-solo-btns"><button class="primary" id="archback" style="flex:1">Back to calendar</button></div>${Geomingo.archListBtn()}`}
function archiveHTML(o){if(DAYOF)return dayofHTML(o,DAYOF);const items=archDates(Geomingo.ARCH_FROM||o.first,o.played(todayKey())).map(k=>{const n=o.num(k),g=o.saved(k),p=o.played(k),
      date=new Date(k+'T12:00Z').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
    let st,sq='';
    if(g&&g.over){const [t,q]=o.done(g);st=`<span class="as done">${t}</span>`;sq=q||''}
    else if(p)st=`<span class="as done">${esc(p)}</span>`;
    else st=`<span class="as">${g?'In progress':'Play'}</span>`;
    return `<li><button data-arch="${k}"><span class="an">${typeof n==='number'?'#'+n:'·'}</span><span class="ad"><b>${o.label} ${Geomingo.archNo(n)}</b><small>${date}</small></span>${sq}${st}</button></li>`}).join('');
  return `<section class="panel"><a class="linkbtn" href="${Geomingo.HOME}#archive" style="display:inline-block;margin-bottom:6px">← Calendar of all games</a><div class="backline"><span class="ht">Archive</span></div>
    <p class="hint">Play the past ${o.label.toLowerCase()}s you missed. The ones you played on their day are already done. One try each, on this device. Their km count for their own day, in your GeoPass and the ranking, but not for your streak.</p>
    ${items?`<ul class="arch">${items}</ul>`:`<p class="hint">No past ${o.label.toLowerCase()}s yet. Come back tomorrow.</p>`}</section>`}
// Menu → Archive on the home page opens a past day (?day=…): that day's archive game, or its result when it was played on its day
function openDay(k){if(archDay(k)){DAYOF=k;openArchive();return}playArchive(k)}
// Back to archive (after an archive game): the calendar of all the games on the home page
const toArchive=()=>{location.href=Geomingo.HOME+'#archive'};
// the game's title: in Practice and With friends you stay where you are (Practice has no first screen any more, and the
// game you are playing is kept), else today's game (Héctor 2026-11-15). The "‹ geomingo" on top goes to the home page.
function titleTap(){const m=Geomingo.mode?Geomingo.mode():'';
  if(m==='solo'||m==='friends')window.scrollTo(0,0);else if(typeof goHome==='function')goHome()}
document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('#brand');if(t)titleTap()});
document.addEventListener('keydown',e=>{
  if(e.key==='Enter'&&document.activeElement&&document.activeElement.id==='brand')titleTap()});

// phones: the system share menu; elsewhere copy the result and the link (if the clipboard is blocked, select the text)
const TOUCH=matchMedia('(pointer:coarse)').matches;
function share(text){
  const manual=()=>{const el=$('share');if(el){el.hidden=false;el.textContent=text;const r=document.createRange();r.selectNodeContents(el);const s=getSelection();s.removeAllRanges();s.addRange(r)}
    let ok=false;try{ok=document.execCommand('copy')}catch(e){}if(ok&&el)el.hidden=true;toast(ok?'Result and link copied.':'Copy blocked here. The text is selected: copy it manually.',ok?'good':'')};
  if(navigator.share&&TOUCH){navigator.share({text}).catch(e=>{if(e&&e.name!=='AbortError')manual()});return}
  try{navigator.clipboard.writeText(text).then(()=>toast('Result and link copied.','good'),manual)}catch(e){manual()}}
const pageLink=q=>location.origin+location.pathname+(q||'');
// Give up: ends today's game (or a practice one) as it stands, so nobody has to type nonsense to finish.
// Two taps, like Countries: the first asks to confirm.
const giveUpHTML=()=>`<button class="linkbtn giveup" id="giveup">Give up</button>`;
function bindGiveUp(end){const b=$('giveup');if(!b)return;
  // Give up sits just below the game's box, never inside it, the same in all 9 games (Héctor 2026-11-16)
  const box=b.closest('.panel');if(box&&!box.classList.contains('t10ask'))box.after(b);
  b.onclick=()=>{if(b.dataset.armed){Geomingo.stat('giveup');end();return}b.dataset.armed='1';b.textContent='Tap again to give up'}}
// the three numbers under every daily result (and in My stats): days played, the average result, the streak
const statTiles=(played,avg,streak)=>`<div class="stgrid"><div class="st"><b>${played}</b><span>played</span></div><div class="st"><b>${avg}</b><span>average</span></div><div class="st"><b>${streak}</b><span>streak</span></div></div>`;
// My stats (Menu): the same cards in every game (../brand/account.js statsPage): Daily, Solo, With friends.
// Solo and With friends results are kept on this device for it: <game>-solo (each game its own numbers) and
// <game>-friends {n games, w wins, pl sum of places, best score, fast quickest win, k the last games counted}
function logSolo(key,add){Geomingo.stat('fin','solo');const s=load(key,null)||{n:0};s.n++;for(const k in add)s[k]=k==='best'?Math.max(s.best||0,add.best):(s[k]||0)+add[k];store(key,s)}
function logFriends(key,id,place,score,ms){const f=load(key,null)||{n:0,w:0,pl:0,best:0,k:[]};if(!place||(f.k||[]).includes(id))return;Geomingo.stat('fin','friends');
  f.k=(f.k||[]).concat(id).slice(-40);f.n++;if(place===1)f.w++;f.pl+=place;f.best=Math.max(f.best||0,score||0);
  if(ms&&place===1)f.fast=f.fast?Math.min(f.fast,ms):ms;store(key,f)}
const friendsOf=key=>{const f=load(key,null)||{n:0,w:0,pl:0,best:0};return {n:f.n,w:f.w,place:f.pl,best:f.best,fast:f.fast}};
// o: as statsPage, with hist (the daily results by date), unit and avg for the Daily card
function statsPageHTML(o){const A=window.Geomingo&&Geomingo.account,dates=Object.keys(o.hist);
  const daily={n:dates.length,unit:o.unit,streak:streakOf(o.hist),avg:o.avg};
  if(!A)return statTiles(daily.n,daily.avg,daily.streak);
  return A.statsPage(Object.assign({},o,{dates,daily,lbs:o.lbs(dates)}))}
// lives on the ticket: pink dots, the ones used empty (the same in Connections, Top 10 and Silhouette)
const livesHTML=(left,all)=>`<span class="tk-dots" aria-label="${left} ${left===1?'life':'lives'} left">${Array.from({length:all},(_,i)=>`<i class="${i<left?'':'off'}"></i>`).join('')}</span>`;
// the same three numbers, small, on the home screen's card of today's game once it is done
const dstatsHTML=(streak,played,avg)=>`<span class="dstats"><span><b>${streak}</b>streak</span><span><b>${played}</b>played</span><span><b>${avg}</b>average</span></span>`;

// Phones: typing an answer works as in Countries. The game shows a box-shaped button ("Type a country…");
// tapping it opens a sheet at the bottom of the screen with the box (the phone keyboard opens), the countries
// that match and a way back. Picking a country closes the sheet, and with it the keyboard, so you see the result.
// ?kb=1 shows it on a computer too, for testing.
const SHEETS=TOUCH||/[?&]kb=1/.test(location.search);
let sheet=null;
const askBtnHTML=()=>`<button type="button" class="askbtn" id="askbtn" aria-haspopup="dialog"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.5 4a6.5 6.5 0 1 0 0 13a6.5 6.5 0 0 0 0-13M15.3 15.3L20 20"/></svg>Type a country…</button>`;
function sheetLayer(){let el=$('sheetlayer');if(!el){el=document.createElement('div');el.id='sheetlayer';document.body.appendChild(el)}return el}
function drawSheetSugg(){const u=$('ssugg');if(!u||!sheet)return;u.innerHTML=sheet.sugg(sheet.text);
  u.querySelectorAll('[data-g]').forEach(b=>b.onclick=()=>pickSheet(b.dataset.g))}
function pickSheet(code){if(!sheet)return;const f=sheet.pick;closeSheet();f(code)}
// o: {key: the question on screen, head: its line at the top, sugg(text): the list items, first(text): the code Enter picks,
//     pick(code): the answer, back: the label of the way back}
function openSheet(o){sheet=Object.assign({text:''},o);
  sheetLayer().innerHTML=`<div class="scrim" id="sscrim"></div><div class="sheet" role="dialog" aria-label="Name a country">
    ${o.head?`<div class="q">${o.head}</div>`:''}
    <input id="sq" placeholder="Type a country…" autocomplete="off" autocapitalize="words" spellcheck="false" enterkeyhint="go" aria-label="Type a country">
    <ul class="sugg" id="ssugg"></ul>
    <div class="bar"><button class="ghost" id="sback">${esc(o.back||'Back')}</button></div></div>`;
  const q=$('sq');
  q.oninput=e=>{sheet.text=e.target.value;drawSheetSugg()};
  q.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();const c=sheet.first(sheet.text);if(c)pickSheet(c)}if(e.key==='Escape')closeSheet()};
  $('sback').onclick=$('sscrim').onclick=closeSheet;
  drawSheetSugg();q.focus();if(o.fit)fitSheet()}
// o.fit: keep the sheet in the part of the screen the phone keyboard leaves free (iPhones and some Androids put the
// keyboard over the page instead of shrinking it, which hid the box behind the keyboard); the list scrolls inside
function fitSheet(){const vv=window.visualViewport,el=document.querySelector('#sheetlayer .sheet');if(!vv||!el)return;
  const u=$('ssugg');if(u){u.style.flex='1 1 auto';u.style.minHeight='0'}
  const fit=()=>{if(!el.isConnected){vv.removeEventListener('resize',fit);vv.removeEventListener('scroll',fit);return}
    el.style.bottom=Math.max(0,Math.round(window.innerHeight-vv.height-vv.offsetTop))+'px';el.style.maxHeight=Math.floor(vv.height)+'px'};
  vv.addEventListener('resize',fit);vv.addEventListener('scroll',fit);fit()}
function closeSheet(){if(!sheet)return;sheet=null;const q=$('sq');if(q)q.blur();sheetLayer().innerHTML=''}
// after every render of a game: the button (and any [data-ask] spot, like an empty place) opens the sheet.
// An open sheet stays open while the same question is still on screen, otherwise it closes.
function bindAsk(o){
  if(!o||!$('askbtn')){closeSheet();return}
  app.querySelectorAll('#askbtn,[data-ask]').forEach(b=>b.onclick=()=>openSheet(o));
  if(!sheet)return;
  if(sheet.key!==o.key){closeSheet();return}
  const text=sheet.text;Object.assign(sheet,o,{text});
  const h=document.querySelector('#sheetlayer .q');if(h&&o.head)h.innerHTML=o.head;drawSheetSugg()}
