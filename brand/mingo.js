/* Geomingo: Mingo, the GeoPass, the shared header, the result card and the list of games.
   Every page loads it in its <head> (before its own scripts) from ../brand/mingo.js, so the saved
   light/dark choice is applied before anything is drawn. Everything lives in window.Geomingo. */
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
  {id:'top10',name:'Top 10',path:'top10/',gate:'4',hint:'Name a ranking. 3 lives.'},
  {id:'silhouette',name:'Silhouette',path:'silhouette/',gate:'5',hint:'Which country is it?'}];
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
const fmt=n=>Number(n||0).toLocaleString('en');

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
    ['cx-hist','t10-hist','sil-hist'].forEach(k=>Object.keys(json(k)||{}).forEach(x=>s.add(x)));
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
  return {n,first}}
function pass(){let p=json('gm-pass');
  if(!p||typeof p.n!=='number'){const s=seedCount();p={n:s.n,since:s.first||dayKey(),list:[]};store.set('gm-pass',JSON.stringify(p))}
  if(!Array.isArray(p.list))p.list=[];return p}
const hsh=s=>{let h=7;for(const ch of String(s))h=(h*31+ch.charCodeAt(0))%9973;return h};
const INK=['var(--green)','var(--blue)','var(--violet)','var(--coral-text)'];
// one stamp: stamp('borderline','Strasbourg','FR') when a right answer lands
// whoever listens (../brand/account.js keeps the GeoPass in your account) hears of every new stamp
const stampHooks=[];
function stamp(g,t,s){const p=pass(),x={g,t:String(t),s:s?String(s):'',d:dayKey()};p.n++;p.list.push(x);p.list=p.list.slice(-240);
  store.set('gm-pass',JSON.stringify(p));refreshPass();stampHooks.forEach(f=>{try{f(x)}catch(e){}});return p.n}
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
   Values are HTML: escape names before passing them. o.timer adds the countdown bar along the bottom (.tbar). */
function tk(k,v,c){return '<div class="tk-c'+(c?' '+c:'')+'"><i>'+k+'</i><b>'+v+'</b></div>'}
function ticket(say,stub,o){o=o||{};
  return '<section class="ticket">'+say+'<div class="tk-tear" aria-hidden="true"></div><div class="tk-stub">'+stub+'</div>'+(o.timer?'<span class="tbar" style="width:100%"></span>':'')+'</section>'}
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

/* the GeoPass booklet: the holder's page and the stamps */
function openPass(){const p=pass(),n=p.n,k=dayKey(),s=streak(),today=p.list.filter(x=>x.d===k),earlier=p.list.filter(x=>x.d!==k).slice(-9).reverse();
  const name=(store.get('bl-user')||store.get('cc-user')||'').trim().slice(0,16);
  const mrz=(s=>s.toUpperCase().replace(/[^A-Z0-9]+/g,'<'))('P<WLDMINGO<<AND<'+(name||'YOU'))+'<'.repeat(14);
  const sub=x=>{const g=game(x.g);return [x.s,g?g.name:''].filter(Boolean).join(' · ')};
  const html='<div class="gm-book"><div class="gm-bbar"><b>GEOPASS</b><span style="font-family:var(--type);font-size:12px;opacity:.8">geomingo</span><button data-gm-act="close">Close</button></div><div class="gm-spread">'+
    '<div class="gm-leaf"><h4>Passport · Geomingo</h4><div class="gm-idrow"><span class="gm-photo">'+mingo('pass',84)+'</span><div class="gm-fields">'+
      '<div><span>Holder</span><b>Mingo &amp; '+esc(name||'you')+'</b></div><div><span>Nationality</span><b>World</b></div><div><span>Stamps</span><b>'+fmt(n)+'</b></div>'+
      '<div><span>Streak</span><b>'+s+' day'+(s===1?'':'s')+'</b></div><div><span>Issued</span><b>'+esc(dateText(p.since))+'</b></div></div></div>'+
      '<span class="gm-mrz">'+esc(mrz.slice(0,32))+'<br>GEOPASS'+String(n).padStart(5,'0')+'&lt;&lt;GEOMINGO&lt;&lt;&lt;&lt;&lt;&lt;</span></div>'+
    '<div class="gm-leaf"><h4>Visas &amp; entries</h4>'+
      (today.length?'<span class="gm-lab">Today</span><div class="gm-visas">'+today.slice(-12).reverse().map(x=>stampHTML(x.t,sub(x),'today')).join('')+'</div>'
        :'<p class="gm-empty">No stamps yet today. Every right answer in a game is a new stamp.</p>')+
      (earlier.length?'<span class="gm-lab">Earlier</span><div class="gm-visas">'+earlier.map(x=>stampHTML(x.t,[x.s,dateText(x.d,{weekday:'short'})].filter(Boolean).join(' · '))).join('')+'</div>':'')+
      '<div class="gm-ticker"><span>'+fmt(n)+' stamps</span><span>'+days().length+' days played</span><span>'+s+'-day streak</span></div></div>'+
    '</div></div>';
  const box=openWindow(html,'Your GeoPass');const c=box.querySelector('[data-gm-act="close"]');if(c)c.focus()}

/* a little grid of squares for the result card (true = got it) */
function mini(list,cols){return '<div class="gm-mini" style="grid-template-columns:repeat('+cols+',16px)" aria-hidden="true">'+list.map(x=>'<i class="'+(x?'ok':'')+'"></i>').join('')+'</div>'}

window.Geomingo={HOME,GAMES,live,game,dayKey,madridParts,msToMidnight,dateText,result,playedToday,nextGame,
  days,streak,pass,stamp,stamps,stampsToday,stampHTML,openPass,mingo,hello,tk,ticket,traveller,header,passBtn,themeBtn,toggleTheme,currentTheme,
  resultWindow,openWindow,closeWindow,mini,esc,refreshPass,onStamp:f=>stampHooks.push(f),share:name=>'Geomingo · '+name};
})();
