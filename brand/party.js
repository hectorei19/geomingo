/* With friends: ONE room for all nine games (Héctor 2026-11-15).
   On the home page, With friends opens this room: someone signed in creates it (friends join with the code or the link,
   no account needed). Inside are the 9 games: the organiser picks one, it opens on every phone at once (a new random
   puzzle with the daily's rules, never today's), and at the end everyone comes back to the room, where a table adds up
   the points of every game played. Then the organiser picks the next one.

   The room lives at rooms/ABCD like every game's rooms (marked game:'party', so no game opens it; the rules need no change):
     {game:'party', host, created, players:{pid:{name,t,on}},
      cur:{n, g, room, exp},            // game n: the game id, its own room code once the organiser made it, players expected
      res:{n:{g, s:[{n:name, p:points}]}}}  // the points of each finished game
   Each game keeps its own With friends room for the game itself; this file drives it (create, join, start) through the
   few functions the game hands over with Geomingo.party.game({...}), and the game reports the points with
   Geomingo.party.result([{n,p}]) once everyone has finished. */
(function(){
const G=window.Geomingo;if(!G)return;
const MAX=6,LET='ABCDEFGHJKLMNPQRSTUVWXYZ',HOME=G.PAGE==='home';
const ls={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},
  set(k,v){try{v==null?localStorage.removeItem(k):localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const ss={get(k,d){try{const v=sessionStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},
  set(k,v){try{v==null?sessionStorage.removeItem(k):sessionStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const PID=(()=>{let id=ls.get('gm-ppid','');if(!id){id='q'+Math.random().toString(36).slice(2,11);ls.set('gm-ppid',id)}return id})();
const acct=()=>G.account&&G.account.user?String(G.account.name||'').trim().slice(0,16):'';
const SIGNED=()=>!!(G.account&&G.account.user);
// the room this phone is in (kept 6 hours, so closing the tab and coming back still finds it)
let mine=ls.get('gm-party',null);if(mine&&(!mine.code||Date.now()-(mine.at||0)>6*36e5)){mine=null;ls.set('gm-party',null)}
const code=()=>mine&&mine.code||'';
function keepMine(c){mine=c?{code:c,at:Date.now()}:null;ls.set('gm-party',mine)}
const myName=()=>acct()||ls.get('gm-pname','');
// an invite link (geomingo.com/?party=ABCD), read before the home page tidies its address
let INVITE='';if(HOME)try{INVITE=(new URLSearchParams(location.search).get('party')||'').toUpperCase()}catch(e){}
let tt=null;
function toast(msg,kind){let el=document.getElementById('pt-toast');
  if(!el){el=document.createElement('div');el.id='pt-toast';el.setAttribute('role','status');document.body.appendChild(el)}
  el.className='pt-toast'+(kind?' '+kind:'');el.textContent=msg;el.hidden=false;clearTimeout(tt);tt=setTimeout(()=>{el.hidden=true},2600)}

let db=null,offset=0;
function fb(){if(db)return db;
  if(typeof firebase==='undefined'||!firebase.apps||!firebase.apps.length||typeof firebase.database!=='function')return null;
  try{db=firebase.database();db.ref('.info/serverTimeOffset').on('value',s=>{offset=s.val()||0})}catch(e){db=null}
  return db}
function whenFB(cb){if(fb()){cb();return}let n=0;const t=setInterval(()=>{if(fb()||++n>150){clearInterval(t);if(db)cb()}},200)}
const now=()=>Date.now()+offset;
const TS=()=>firebase.database.ServerValue.TIMESTAMP;
const order=r=>Object.keys((r&&r.players)||{}).filter(k=>r.players[k]&&r.players[k].name).sort((a,b)=>(r.players[a].t||0)-(r.players[b].t||0));
const here=r=>order(r).filter(k=>r.players[k].on!==false);
const gameOf=id=>(G.GAMES||[]).find(g=>g.id===id);
// home → a game: the address the game opens with (its With friends screen, this room, game n)
const gameURL=(id,n)=>{const g=gameOf(id);return (HOME?'':'../')+(g?g.path:'')+'?friends&party='+code()+'&pn='+n};
const homeURL=()=>(HOME?'':'../')+'?party='+code()+'#friends';
// the table: everyone's points, game by game
function table(r){const res=(r&&r.res)||{},ns=Object.keys(res).map(Number).sort((a,b)=>a-b),tot={},last={},lastN=ns[ns.length-1];
  order(r).forEach(k=>{tot[r.players[k].name]=0});
  ns.forEach(n=>(res[n].s||[]).forEach(x=>{if(!x||!x.n)return;tot[x.n]=(tot[x.n]||0)+(+x.p||0);if(n===lastN)last[x.n]=+x.p||0}));
  return {rows:Object.keys(tot).map(n=>({n,t:tot[n],l:last[n]})).sort((a,b)=>b.t-a.t),games:ns.length,played:ns.map(n=>res[n].g)}}

let ref=null,R=null,listeners=[];
function listen(c,cb){if(ref)ref.off();ref=db.ref('rooms/'+c);const r0=ref;
  const on=r0.child('players/'+PID+'/on');on.onDisconnect().set(false);
  db.ref('.info/connected').on('value',s=>{if(!s.val()||r0!==ref)return;on.onDisconnect().set(false);r0.child('players/'+PID).once('value',p=>{if(p.exists()&&r0===ref)on.set(true)})});
  r0.on('value',snap=>{if(r0!==ref)return;const r=snap.val();
    if(!r||r.game!=='party'||!r.players||!r.players[PID]){const was=code();stop();keepMine(null);cb(null,was,!!r);return}
    R=r;if(mine){mine.at=Date.now();ls.set('gm-party',mine)}cb(r)})}
function stop(){if(ref){ref.off();try{ref.child('players/'+PID+'/on').onDisconnect().cancel()}catch(e){}}ref=null;R=null}

/* ================= the home page: create / join, then the room ================= */
let H=null; // {el, tile(id,{played,click}), toast, onBack}
let joinVal='',busy=false,seenN=null,armed=false;
async function create(){if(!SIGNED()){G.account.signIn();return}
  if(!fb()){H.toast('Online play could not load. Check the connection and reload the page.','bad');return}
  if(busy)return;busy=true;
  try{let c='';for(let i=0;i<8;i++){c=Array.from({length:4},()=>LET[Math.floor(Math.random()*24)]).join('');const ex=await db.ref('rooms/'+c).get();if(!ex.exists())break}
    await db.ref('rooms/'+c).set({game:'party',host:PID,created:TS(),players:{[PID]:{name:myName()||'Host',t:TS(),on:true}}});
    keepMine(c);seenN=null;open()}
  catch(e){console.error(e);H.toast('Could not create the room. Check the connection and try again.','bad')}
  finally{busy=false}}
async function join(raw){const c=String(raw||'').toUpperCase().replace(/[^A-Z]/g,'');
  if(c.length!==4){H.toast('Room codes have 4 letters.','bad');return}
  const el=document.getElementById('pname');if(el){const v=el.value.trim().slice(0,16);if(v)ls.set('gm-pname',v)}
  const nm=myName();if(!nm){H.toast('Type your name first.','bad');if(el)el.focus();return}
  if(!fb()){H.toast('Online play could not load. Check the connection and reload the page.','bad');return}
  if(busy)return;busy=true;
  try{let why='';
    const res=await db.ref('rooms/'+c).transaction(r=>{why='';if(!r)return r;
      if(r.game!=='party'){why='other';return}
      r.players=r.players||{};
      if(r.players[PID]){r.players[PID].name=nm;r.players[PID].on=true;return r}
      if(order(r).length>=MAX){why='full';return}
      // the same name twice would mix up the table: the second one gets a number
      let n=nm,k=2;const names=order(r).map(p=>r.players[p].name);while(names.includes(n))n=nm.slice(0,14)+' '+k++;
      r.players[PID]={name:n,t:now(),on:true};return r});
    const v=res.snapshot.val();
    if(!v){H.toast('No room called '+c+'. Check the code.','bad');return}
    if(why==='other'||v.game!=='party'){H.toast(c+' is a room of one game. Open that game, choose With friends and join there.','bad');return}
    if(!res.committed||!v.players||!v.players[PID]){H.toast(why==='full'?'Room '+c+' already has '+MAX+' players.':'Could not join '+c+'.','bad');return}
    joinVal='';keepMine(c);seenN=null;open()}
  catch(e){console.error(e);H.toast('Could not join. Check the connection and try again.','bad')}
  finally{busy=false}}
async function leave(){const r0=ref;
  if(r0){try{await r0.transaction(x=>{if(!x||!x.players)return x;delete x.players[PID];
    const h=here(x),all=order(x);if(!all.length)return null;if(x.host===PID)x.host=(h[0]||all[0]);return x})}catch(e){}}
  stop();keepMine(null);armed=false;draw()}
// the organiser picks a game: it opens on every phone in the room
async function pick(id){if(!ref||!R||R.host!==PID)return;
  const n=((R.cur&&R.cur.n)||0)+1;
  try{const res=await ref.transaction(x=>{if(!x||x.host!==PID)return;const c=x.cur||{};
      // a game still going (no points yet, opened less than 30 min ago) is not replaced by mistake
      if(c.n&&!(x.res&&x.res[c.n])&&!armed&&now()-(c.t||0)<30*6e4){return}
      x.cur={n,g:id,room:'',exp:here(x).length,t:now()};return x});
    if(!res.committed){armed=true;H.toast('A game is still going. Tap a game again to start a new one anyway.');draw();return}
    armed=false;location.href=gameURL(id,n)}
  catch(e){H.toast('That did not go through. Check the connection.','bad')}}
function open(){if(!code())return;whenFB(()=>listen(code(),(r,was,gone)=>{
  if(!r){H.toast(gone?'You are no longer in room '+was+'.':'Room '+was+' was closed.','bad');draw();return}
  // the organiser picked a game while this screen was open: go
  const c=r.cur;if(seenN==null)seenN=c?c.n:0;
  else if(c&&c.n>seenN&&r.host!==PID){seenN=c.n;location.href=gameURL(c.g,c.n);return}
  draw()}))}
function share(){const link=location.origin+'/?party='+code();
  const t='Play Geomingo with me: room '+code()+'\n'+link;
  if(navigator.share&&matchMedia('(pointer:coarse)').matches){navigator.share({text:t}).catch(()=>{});return}
  try{navigator.clipboard.writeText(link).then(()=>H.toast('Link copied.','good'),()=>H.toast(link))}catch(e){H.toast(link)}}
const RULES='<p class="pt-rules">Every game uses the daily\'s rules with a new random puzzle (never today\'s). No lives. Countries, Capitals and Top 10: 30 s per turn.</p>';
function startHTML(){const sg=SIGNED();
  return '<div class="pt-card"><h3>Create a room</h3><p>'+(sg?'You get a code to send to your friends. Then you pick the games, one after another.':'Sign in to create a room. Your friends join with your code, no account needed.')+'</p>'+
    '<button class="pt-btn" id="pcreate">'+(sg?'Create room':'Sign in to create a room')+'</button></div>'+
    '<div class="pt-card"><h3>Join a room</h3><p>Got a code from a friend? No sign-in needed.</p>'+
    (acct()?'':'<input class="pt-name" id="pname" maxlength="16" autocomplete="nickname" placeholder="Your name" value="'+esc(ls.get('gm-pname',''))+'">')+
    '<div class="pt-join"><input id="pcode" maxlength="4" placeholder="ABCD" autocomplete="off" value="'+esc(joinVal)+'"><button class="pt-ghost" id="pjoin">Join</button></div></div>'+RULES}
function roomHTML(){const r=R,T=table(r),host=r.host===PID,ids=order(r),c=r.cur,live=c&&c.n&&!(r.res&&r.res[c.n]);
  const pin=i=>'background:var(--p'+(i%6)+')';
  const chips=ids.map((k,i)=>{const p=r.players[k];return '<span class="pt-pp'+(p.on===false?' off':'')+'"><i style="'+pin(i)+'">'+esc((p.name||'?')[0].toUpperCase())+'</i>'+esc(p.name)+(k===r.host?' <small>host</small>':k===PID?' <small>you</small>':'')+'</span>'}).join('');
  const color=n=>{const i=ids.findIndex(k=>r.players[k].name===n);return i<0?'var(--line)':'var(--p'+(i%6)+')'};
  const med=['#D4AD4B','#C9CED6','#C99B78'];
  const tbl=T.games?'<div class="pt-tbl">'+T.rows.map((x,k)=>'<div class="pt-tr'+(x.n===(r.players[PID]||{}).name?' me':'')+'"><span class="md" style="'+(k<3&&x.t>0?'background:'+med[k]+';color:#0C1220':'')+'">'+(k+1)+'</span><span class="nm"><i style="background:'+color(x.n)+'"></i>'+esc(x.n)+'</span><span class="lt">'+(x.l!=null?'+'+x.l:'')+'</span><b>'+x.t+'</b></div>').join('')+'</div>':'';
  const g=c&&gameOf(c.g);
  const now_=live&&g?'<div class="pt-now"><span><i></i>Now playing: <b>'+esc(g.name)+'</b></span><a class="pt-ghost" href="'+gameURL(c.g,c.n)+(c.room?'&room='+c.room:'')+'">'+(host?'Back to it':'Join')+'</a></div>':'';
  return '<div class="pt-card"><div class="pt-code"><div><p class="pt-lab">Room code</p><b>'+esc(code())+'</b></div><button class="pt-ghost" id="pinvite">Invite</button></div>'+
    '<p class="pt-lab">In the room · '+ids.length+'</p><div class="pt-ppl">'+chips+'</div></div>'+
    (T.games?'<div class="pt-card"><p class="pt-lab">Points · after '+T.games+' game'+(T.games===1?'':'s')+'</p>'+tbl+'</div>':'')+now_+
    '<div class="pkhead"><h2>'+(T.games?'Next game':'Pick a game')+'</h2>'+(host?'<p>'+(armed?'A game is still going. Tap a game to start a new one anyway.':'Everyone in the room starts it at the same time.')+'</p>':'')+'</div>'+
    (host?'':'<p class="pt-wait"><i></i>'+esc((r.players[r.host]||{}).name||'The host')+' is picking the next game…</p>')+
    '<ul class="tiles c3">'+(G.live?G.live():G.GAMES).map(x=>H.tile(x,{played:T.played.includes(x.id),click:host})).join('')+'</ul>'+
    (ids.length<2?'<p class="pt-rules">Waiting for friends: send them the code or tap Invite.</p>':RULES)+
    '<button class="pt-leave" id="pleave">Leave room</button>'}
function draw(){if(!H)return;const el=H.el;
  el.innerHTML=code()&&R?roomHTML():code()?'<p class="pt-rules">Opening room '+esc(code())+'…</p>':startHTML();bind()}
function bind(){const $=id=>document.getElementById(id);
  if($('pcreate'))$('pcreate').onclick=create;
  if($('pcode')){$('pcode').oninput=e=>{joinVal=e.target.value};$('pcode').onkeydown=e=>{if(e.key==='Enter')join(e.target.value)}}
  if($('pjoin'))$('pjoin').onclick=()=>join($('pcode').value);
  if($('pinvite'))$('pinvite').onclick=share;
  if($('pleave'))$('pleave').onclick=()=>{if(confirm('Leave the room?'))leave()};
  H.el.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>pick(b.dataset.pick))}
// the home page hands over the box to draw in and how to draw a game tile; ?party=ABCD (an invite link) joins that room
function home(o){H=o;addCSS();H.toast=H.toast||toast;ss.set('gm-pg',null);
  const q=INVITE;INVITE='';
  if(/^[A-Z]{4}$/.test(q)&&q!==code()){joinVal=q;
    const go=()=>{if(myName())join(q);else draw()};
    if(G.account&&G.account.ready)whenFB(go);else{let n=0;const t=setInterval(()=>{if(G.account.ready||++n>20){clearInterval(t);whenFB(go)}},200)}}
  else if(code())open();
  if(G.account&&G.account.onChange)G.account.onChange(()=>{if(!code())draw()});
  draw()}

/* ================= inside a game: this phone came from the room ================= */
// the game opened from the room: ?party=ABCD&pn=3 (kept for a reload, as the game cleans its address)
let PG=null,A=null,done=false;
if(!HOME){let u;try{u=new URLSearchParams(location.search)}catch(e){u=new URLSearchParams('')}
  const pc=(u.get('party')||'').toUpperCase(),pn=+u.get('pn')||0;
  if(/^[A-Z]{4}$/.test(pc)&&pn){PG={code:pc,n:pn,page:G.PAGE,room:(u.get('room')||'').toUpperCase()};ss.set('gm-pg',PG);keepMine(pc)}
  else{const s=ss.get('gm-pg',null);if(s&&s.page===G.PAGE&&s.code===code())PG=s}
  if(PG)document.documentElement.classList.add('gm-party')}
const css=`html.gm-party #rematch,html.gm-party #orematch,html.gm-party #olobby,html.gm-party #again,html.gm-party #newg,html.gm-party #ostart{display:none!important}
.pt-ov{position:fixed;inset:0;z-index:60;background:var(--bg,#0C1220);display:flex;align-items:center;justify-content:center;padding:24px 16px}
.pt-ov>div{max-width:420px;width:100%;display:flex;flex-direction:column;gap:14px;text-align:center}
.pt-ov .lab{font-family:var(--type);font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--blue)}
.pt-ov h2{margin:0;font-family:var(--display);font-weight:900;font-size:34px;text-transform:uppercase;line-height:1}
.pt-ov p{margin:0;color:var(--muted);font-size:15px}
.pt-ov .ppl{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
.pt-ov .ppl span{padding:6px 12px;border-radius:20px;border:1px solid var(--line);background:var(--guil);font-size:14px;font-weight:600}
.pt-ov .ppl span.in{border-color:var(--blue);color:var(--blue)}
.pt-btn,.pt-ghost{min-height:50px;border-radius:12px;font-family:var(--display);font-weight:800;font-size:15px;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;padding:0 16px}
.pt-btn{border:0;background:var(--blue);color:#0C1220}
.pt-btn:disabled{opacity:.45;cursor:default}
.pt-ghost{border:1.5px solid var(--blue);background:transparent;color:var(--blue)}
.pt-bar{position:fixed;left:0;right:0;bottom:0;z-index:50;padding:12px max(16px,env(safe-area-inset-left,0px)) calc(12px + env(safe-area-inset-bottom,0px));background:linear-gradient(transparent,var(--bg,#0C1220) 30%);display:flex;justify-content:center}
.pt-bar .pt-btn{width:100%;max-width:428px;box-shadow:0 8px 24px rgba(0,0,0,.5)}
html.gm-party body{padding-bottom:84px}
.pt-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--blue);box-shadow:0 0 10px var(--blue);margin-right:8px;vertical-align:middle;animation:pt-blink 1s ease-in-out infinite alternate}
@keyframes pt-blink{to{opacity:.3}}
.pt-toast{position:fixed;left:50%;bottom:calc(20px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:70;max-width:calc(100% - 32px);padding:10px 16px;border-radius:8px;background:var(--cover);color:var(--cover-ink);font-family:var(--type);font-size:14px;text-align:center;box-shadow:var(--shadow)}
.pt-toast.bad{background:var(--red);color:var(--page)}.pt-toast.good{background:var(--green);color:var(--page)}.pt-toast[hidden]{display:none}
/* the home page's With friends: create / join, then the room */
#party{display:flex;flex-direction:column;gap:14px}
.pt-card{border-radius:16px;background:var(--guil);border:1px solid var(--line);padding:16px;display:flex;flex-direction:column;gap:12px}
.pt-card h3{margin:0;font-family:var(--display);font-weight:900;font-size:18px;text-transform:uppercase;letter-spacing:.02em}
.pt-card p{margin:0;color:var(--muted);font-size:14px;line-height:1.4}
.pt-lab,.pt-card p.pt-lab{font-family:var(--type);font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin:0}
.pt-name,.pt-join input{min-width:0;min-height:50px;box-sizing:border-box;border-radius:12px;border:1.5px solid var(--line);background:var(--bg);color:var(--ink);font-family:var(--type);font-size:17px;padding:0 14px}
.pt-join{display:flex;gap:8px}.pt-join input{flex:1;font-size:22px;letter-spacing:.3em;text-transform:uppercase}
.pt-code{display:flex;align-items:center;justify-content:space-between;gap:10px}
.pt-code b{font-family:var(--type);font-size:40px;letter-spacing:.2em;color:var(--blue);line-height:1.1}
.pt-ppl{display:flex;flex-wrap:wrap;gap:8px}
.pt-pp{display:flex;align-items:center;gap:7px;padding:6px 11px 6px 7px;border-radius:20px;background:var(--bg);border:1px solid var(--line);font-size:14px;font-weight:600}
.pt-pp.off{opacity:.45}
.pt-pp i{width:22px;height:22px;border-radius:50%;color:#0C1220;font-style:normal;font-weight:800;font-size:12px;display:flex;align-items:center;justify-content:center}
.pt-pp small{color:var(--muted);font-weight:500;font-size:12px}
.pt-tbl{display:flex;flex-direction:column;gap:6px}
.pt-tr{display:grid;grid-template-columns:24px minmax(0,1fr) auto 56px;gap:10px;align-items:center;padding:8px 10px;border-radius:10px;background:var(--bg)}
.pt-tr.me{outline:1.5px solid var(--blue)}
.pt-tr .md{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;background:var(--line);color:var(--ink)}
.pt-tr .nm{display:flex;align-items:center;gap:8px;font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pt-tr .nm i{width:10px;height:10px;border-radius:50%;flex:none}
.pt-tr .lt{font-family:var(--type);font-size:12px;color:var(--green)}
.pt-tr b{font-family:var(--display);font-weight:900;font-size:20px;text-align:right}
.pt-now{display:flex;align-items:center;justify-content:space-between;gap:10px;border-radius:14px;border:1.5px solid var(--blue);padding:10px 12px 10px 14px;font-size:15px}
.pt-now i,.pt-wait i{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--blue);box-shadow:0 0 10px var(--blue);margin-right:8px;vertical-align:middle}
.pt-now .pt-ghost{min-height:40px}
.pt-wait{margin:0;text-align:center;color:var(--muted);font-size:15px}
.pt-rules{margin:0;text-align:center;color:var(--muted);font-size:13px;line-height:1.45}
.pt-leave{background:none;border:0;color:var(--muted);font:inherit;font-size:14px;text-decoration:underline;cursor:pointer;align-self:center;padding:8px}
#party .tile{cursor:default}#party button.tile{border:0;font:inherit;text-align:inherit;cursor:pointer;width:100%}
#party .tile.played{opacity:.45}`;
function addCSS(){if(document.getElementById('pt-css'))return;const s=document.createElement('style');s.id='pt-css';s.textContent=css;document.head.appendChild(s)}
let ov=null,bar=null,started=0,created=false,joined='',hadRoom=false,tickT=null,stamp=0;
function overlay(html){if(!document.body)return;if(!html){if(ov){ov.remove();ov=null}return}
  if(!ov){ov=document.createElement('div');ov.className='pt-ov';document.body.appendChild(ov)}
  if(ov.dataset.h!==html){ov.dataset.h=html;ov.innerHTML='<div>'+html+'</div>';
    const s=ov.querySelector('[data-pstart]');if(s)s.onclick=()=>{if(A&&A.start){A.start();started=Date.now()}};
    const b=ov.querySelector('[data-pback]');if(b)b.onclick=()=>{location.href=homeURL()}}}
function backBar(on){if(!document.body)return;if(!on){if(bar){bar.remove();bar=null}return}
  if(!bar){bar=document.createElement('div');bar.className='pt-bar';bar.innerHTML='<a class="pt-btn" href="'+homeURL()+'">Back to the room</a>';document.body.appendChild(bar)}}
// every half second: make the game's room, join it, start it when everyone is in, then step out of the way
function drive(){if(!PG||!A||!R)return;const c=R.cur||{},g=gameOf(c.g),rc=A.room&&A.room();
  if(rc)hadRoom=true;
  // the organiser moved on to another game: follow
  if(c.n>PG.n){if(c.g){ss.set('gm-pg',null);location.href=gameURL(c.g,c.n)}return}
  if(c.n!==PG.n){overlay('');backBar(true);return}
  const ok=G.account&&G.account.ready;
  if(!rc&&hadRoom){location.href=homeURL();return}   // left the game's room: back to our room
  if(!rc&&ok){
    if(c.room&&joined!==c.room){joined=c.room;PG.room=c.room;ss.set('gm-pg',PG);A.join(c.room)}
    else if(!c.room&&R.host===PID&&!created){created=true;A.create()}}
  if(rc&&!c.room&&R.host===PID)ref.child('cur').transaction(x=>{if(!x||x.n!==PG.n||x.room)return;x.room=rc;return x}).catch(()=>{});
  const inLobby=!rc||(A.lobby&&A.lobby());
  if(inLobby){const n=rc&&A.count?A.count():0,exp=Math.max(2,c.exp||2),host=rc&&A.host&&A.host();
    if(host&&n>=exp&&Date.now()-started>4000){started=Date.now();A.start()}
    const names=order(R).map(k=>R.players[k].name),inn=A.names?A.names():[];
    overlay('<span class="lab">Room '+esc(PG.code)+' · game '+PG.n+'</span><h2>'+esc(g?g.name:'')+'</h2>'+
      '<p><span class="pt-dot"></span>'+(rc?'Getting everyone in… '+n+' of '+exp:'Opening the game…')+'</p>'+
      '<div class="ppl">'+names.map(x=>'<span class="'+(inn.includes(x)?'in':'')+'">'+esc(x)+'</span>').join('')+'</div>'+
      (host?'<button class="pt-btn" data-pstart '+(n<2?'disabled':'')+'>Start now</button>':'')+
      '<button class="pt-ghost" data-pback>Back to the room</button>');backBar(false)}
  else{overlay('');backBar(!!(R.res&&R.res[PG.n])||done)}}
// what the game hands over: room() its room code (or null), host(), lobby(), count() players in its room, names(),
// create(), join(code), start()
function game(a){A=a;if(!PG)return;addCSS();
  whenFB(()=>listen(PG.code,r=>{if(!r){ss.set('gm-pg',null);location.href=homeURL();return}drive()}));
  clearInterval(tickT);tickT=setInterval(drive,500)}
// the points of this game, once everyone has finished: [{n:name, p:points}] (the first phone to send them wins)
function result(list){if(!PG||!ref||done)return;done=true;
  const s=(list||[]).filter(x=>x&&x.n).map(x=>({n:String(x.n).slice(0,16),p:Math.max(0,Math.round(+x.p||0))}));
  ref.child('res/'+PG.n).transaction(x=>x?undefined:{g:(R&&R.cur&&R.cur.g)||'',s}).catch(()=>{done=false});backBar(true)}
G.party={home,game,result,on:()=>!!PG,name:()=>PG?myName():'',code};
})();
