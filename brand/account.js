/* Geomingo account: one Google sign-in (Firebase Authentication, project borderline-90920) for the whole site.
   Every page loads it in its <head>, right after ../brand/mingo.js, so Geomingo.account is there for the page's own
   scripts; it starts once the page has loaded (and has loaded the Firebase SDK itself when the page did not).
   Signed in, these are kept in the account and follow you to every device:
   - your name, chosen once (users/<uid>/profile, the same one Countries has always used)
   - the GeoPass (users/<uid>/pass) and the days you played (users/<uid>/days), for every game
   - the daily results of Connections, Top 10 and Silhouette (users/<uid>/hist/<game>/<date>), and each one joins
     that game's public daily ranking (lb/<game>/<date>/<uid>); only the account's first try of the day counts.
   Countries and Capitals keep their own sign-in code (same account, same name); here they only get the header button,
   the GeoPass and the days. Signing out leaves the device clean: every game's saves go, the account keeps them.
   Everything lives in Geomingo.account. */
(function(){
'use strict';
const G=window.Geomingo;if(!G)return;
const SDK='https://www.gstatic.com/firebasejs/10.12.2/';
// the Firebase web config (not secret: access is controlled by the database rules), for pages without their own
const CONFIG={apiKey:'AIzaSyBSHPqTRcuA3orK4W5LKbRNTNij48a4hdQ',authDomain:'borderline-90920.firebaseapp.com',
  databaseURL:'https://borderline-90920-default-rtdb.europe-west1.firebasedatabase.app',projectId:'borderline-90920',
  storageBucket:'borderline-90920.firebasestorage.app',messagingSenderId:'934438573870',appId:'1:934438573870:web:3461a8b859b9267187ccbf'};
const ls={get:k=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,v)}catch(e){}}};
const json=k=>{try{return JSON.parse(ls.get(k)||'null')}catch(e){return null}};
const put=(k,v)=>ls.set(k,JSON.stringify(v));
const esc=G.esc;
// hidden test mode (?test&day=…): nothing is saved to the account or the rankings
const TEST=(()=>{try{return new URLSearchParams(location.search).has('test')}catch(e){return false}})();
// Countries and Capitals run their own sign-in screens (name, banner); the other pages use the ones here
let OWN=false;

/* ---- each game's daily saves on this device, as the account sees them ----
   get/put/dates: the stats entry of a day; today(): today's finished game {j: the whole save, r: its ranking score};
   adopt(j): take the account's game of today on this device (one try per account) */
const T=()=>G.dayKey();
function simple(hist,daily,rank){return {
  get:d=>(json(hist)||{})[d],
  put:(d,e)=>{const h=json(hist)||{};h[d]=e;put(hist,h)},
  dates:()=>Object.keys(json(hist)||{}),
  today:()=>{const x=json(daily);return x&&x.date===T()&&x.over&&x.S?{j:x,r:rank(x.S)}:null},
  adopt:j=>{const x=json(daily);if(!(x&&x.date===T()&&JSON.stringify(x)===JSON.stringify(j))){put(daily,j);return true}return false}}}
function silhouette(L){return {
  get:d=>((json('sil-hist')||{})[d]||{})[L],
  put:(d,e)=>{const h=json('sil-hist')||{};h[d]=Object.assign(h[d]||{},{[L]:e});put('sil-hist',h)},
  dates:()=>{const h=json('sil-hist')||{};return Object.keys(h).filter(d=>h[d]&&h[d][L]!=null)},
  today:()=>{const x=json('sil-daily'),g=x&&x.date===T()&&x[L];
    return g&&g.over?{j:g,r:{s:g.qs.filter(q=>q.st==='right').length,m:g.qs.reduce((n,q)=>n+q.tries.length,0)}}:null},
  adopt:j=>{let x=json('sil-daily');if(!(x&&x.date===T()))x={date:T(),over:false};
    if(JSON.stringify(x[L])===JSON.stringify(j))return false;x[L]=j;x.over=true;put('sil-daily',x);return true}}}
// ranking score: s more is better, m fewer is better (then whoever finished first)
const ADAPT={
  connections:simple('cx-hist','cx-daily',S=>({s:(S.found||[]).length,m:S.mistakes||0})),
  top10:simple('t10-hist','t10-daily',S=>({s:(S.found||[]).length,m:(S.wrong||[]).length})),
  'sil-easy':silhouette('easy'),'sil-normal':silhouette('normal'),'sil-hard':silhouette('hard')};

/* ---- Firebase ---- */
let ok=false,failed=false,db=null,user,name='',watchers=[];   // user: undefined until Firebase knows, then null (guest) or the account
// what this device was last time (gm-acct: {u, n, dn, e} signed in, {guest:1} as a guest): the pages show it at once,
// so nothing jumps from Guest to your name (or from no ranking to the ranking) while Firebase wakes up
const LAST=json('gm-acct');
const lastUser=()=>LAST&&LAST.u?{uid:LAST.u,displayName:LAST.dn||'',email:LAST.e||''}:LAST&&LAST.guest?null:undefined;
if(LAST&&LAST.u&&LAST.n)name=LAST.n;
// the account as the pages see it: the real one once Firebase knows, until then the last one seen here (undefined: no idea yet)
const who=()=>failed?undefined:user!==undefined?user:lastUser();
const meId=()=>{const w=who();return w&&w.uid};
function remember(){put('gm-acct',user?{u:user.uid,n:name,dn:user.displayName||'',e:user.email||''}:{guest:1})}
function script(src){return new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=rej;document.head.appendChild(s)})}
async function boot(){OWN=typeof window.initAuth==='function';
  try{if(typeof firebase==='undefined')await script(SDK+'firebase-app-compat.js');
    if(typeof firebase.auth!=='function')await script(SDK+'firebase-auth-compat.js');
    if(typeof firebase.database!=='function')await script(SDK+'firebase-database-compat.js');
    if(!firebase.apps.length)firebase.initializeApp(window.FIREBASE_CONFIG&&FIREBASE_CONFIG.apiKey?FIREBASE_CONFIG:CONFIG);
    db=firebase.database();ok=true}
  catch(e){ok=false;failed=true;changed();return}
  firebase.auth().onAuthStateChanged(onUser);
  if(!OWN)firebase.auth().getRedirectResult().catch(authError)}
const TS=()=>firebase.database.ServerValue.TIMESTAMP;
const uid=()=>user&&user.uid;

// signing out (here, or from Countries' menu) leaves the device clean, as Countries always did:
// the stats, today's games, the GeoPass and the name go; the account keeps them for the next sign-in
const DEVICE_KEYS=['bl-daily','bl-hist','bl-games','bl-arch','bl-user','cc-daily','cc-hist','cc-games','cc-arch','cc-user',
  'cx-daily','cx-hist','t10-daily','t10-hist','sil-daily','sil-hist','sil-train','gm-pass','gm-days','gm-acct','gm-lbc'];
function onUser(u){const was=user;user=u||null;
  if(was&&!user){DEVICE_KEYS.forEach(k=>ls.set(k,null));ls.set('gm-acct',null);location.reload();return}
  if(user){if(!(LAST&&LAST.u===user.uid))name='';loadName()}
  remember();changed()}
function authError(e){const c=(e&&e.code)||'';if(c==='auth/popup-closed-by-user'||c==='auth/cancelled-popup-request')return;
  say(c==='auth/unauthorized-domain'||c==='auth/operation-not-allowed'?'Sign-in is not set up yet for this site.':'Could not sign in. Try again.')}
function say(msg){if(typeof window.toast==='function')window.toast(msg,'bad');else alert(msg)}
function signIn(){if(!ok){say('Sign-in is not available right now. Check the connection and reload the page.');return}
  const p=new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(p).catch(e=>{if(e&&e.code==='auth/popup-blocked')firebase.auth().signInWithRedirect(p);else authError(e)})}
function signOut(){if(ok)firebase.auth().signOut().catch(()=>{})}

/* ---- the name: chosen once, kept in the account, shown in every ranking ---- */
function setName(n){name=n;ls.set('bl-user',n);ls.set('cc-user',n);if(user)remember();G.refreshPass()}
function loadName(){const id=uid();
  db.ref('users/'+id+'/profile').once('value').then(s=>{if(uid()!==id)return;const v=s.val();
    if(v&&v.name)setName(v.name);else if(!OWN)askName();
    syncAll();changed()}).catch(()=>{})}
function askName(){const first=((user.displayName||'').trim().split(/\s+/)[0]||'').slice(0,16);
  const box=G.openWindow('<div class="gm-res gm-namebox"><div class="gm-band">'+G.mingo('head',26)+'<b>Welcome aboard</b></div><div class="gm-rbody">'+
    '<label class="gm-lab" for="gm-name">Your name in Geomingo</label><input id="gm-name" class="gm-input" maxlength="16" autocomplete="nickname" placeholder="Your name" value="'+esc(first)+'">'+
    '<p class="gm-note" style="text-align:left">It appears in the daily ranking of every game. Choose carefully: it stays with your account and can\'t be changed later.</p>'+
    '<button class="gm-big coral" data-gm-act="savename">Save name</button></div></div>','Choose your name');
  const inp=box.querySelector('#gm-name');box._acts={savename:()=>saveName(inp.value)};
  inp.addEventListener('keydown',e=>{if(e.key==='Enter')saveName(inp.value)});setTimeout(()=>inp.focus(),50)}
function saveName(v){const n=String(v||'').trim().slice(0,16);if(!n){say('Type a name to continue.');return}
  if(!uid())return;
  db.ref('users/'+uid()+'/profile').transaction(cur=>cur?undefined:{name:n}).then(r=>{const x=(r.snapshot.val()||{}).name;
    if(x){setName(x);G.closeWindow();if(!OWN)Object.keys(ADAPT).forEach(syncGame);changed()}}).catch(()=>say('Could not save your name. Try again.'))}

/* ---- keeping the account and this device in step ---- */
function syncAll(){if(!uid()||!db)return;syncPass();syncDays();if(!OWN){Object.keys(ADAPT).forEach(syncGame);syncGrid('daily','bl-hist');syncGrid('cities/daily','cc-hist')}}
// Countries and Capitals keep their days in the account themselves (users/<uid>/daily, users/<uid>/cities/daily), but only
// when you open them: here (the home page, the other games) the account's days are copied to this device too,
// so a grid played on another device shows as played everywhere at once. Only the stats line, never the whole game (j).
function syncGrid(path,key){const id=uid();
  db.ref('users/'+id+'/'+path).once('value').then(s=>{if(uid()!==id)return;const R=s.val()||{},h=json(key)||{};let moved=false;
    for(const [d,v] of Object.entries(R)){if(!v||typeof v!=='object')continue;const {j,...e}=v;
      if(JSON.stringify(h[d])!==JSON.stringify(e)){h[d]=e;moved=true}}
    if(moved){put(key,h);changed('adopt')}}).catch(()=>{})}
// GeoPass: the account's stamps, plus the ones collected here as a guest (once)
const asList=x=>Array.isArray(x)?x.filter(Boolean):x?Object.values(x):[];
function syncPass(){const id=uid(),ref=db.ref('users/'+id+'/pass');
  ref.once('value').then(s=>{if(uid()!==id)return;const R=s.val(),L=G.pass(),since=(a,b)=>!a?b:!b?a:a<b?a:b;let M;
    if(!R)M={n:L.n,since:L.since,list:L.list};
    else if(L.u===id)M={n:Math.max(R.n||0,L.n),since:since(R.since,L.since),list:asList(R.list).length>=L.list.length?asList(R.list):L.list};
    else M={n:(R.n||0)+L.n,since:since(R.since,L.since),list:[...asList(R.list),...L.list].sort((a,b)=>a.d<b.d?-1:a.d>b.d?1:0).slice(-240)};
    put('gm-pass',Object.assign({},M,{u:id}));ref.set(M).catch(()=>{});G.refreshPass();changed()}).catch(()=>{})}
G.onStamp(x=>{const id=uid(),p=json('gm-pass');if(!id||!db||!p||p.u!==id)return;
  db.ref('users/'+id+'/pass').transaction(cur=>{cur=cur||{n:0,since:x.d,list:[]};const l=asList(cur.list);l.push(x);
    return {n:(cur.n||0)+1,since:cur.since||x.d,list:l.slice(-240)}}).catch(()=>{});
  markToday()});
// the days you played (the streak): every device's, together
function syncDays(){const id=uid(),ref=db.ref('users/'+id+'/days');
  ref.once('value').then(s=>{if(uid()!==id)return;const R=s.val()||{},L=G.days(),up={};
    L.forEach(d=>{if(!R[d])up[d]=1});put('gm-days',[...new Set([...Object.keys(R),...L])].sort().slice(-400));
    if(Object.keys(up).length)ref.update(up).catch(()=>{});changed()}).catch(()=>{})}
let marked='';
function markToday(){const k=T();if(!uid()||marked===uid()+k)return;marked=uid()+k;db.ref('users/'+uid()+'/days/'+k).set(1).catch(()=>{})}
// a game's daily results: the account's days come here, this device's other days go there;
// today's game played here joins the account (and the ranking) unless the account already played it
function syncGame(g){const id=uid(),A=ADAPT[g],ref=db.ref('users/'+id+'/hist/'+g),k=T();
  ref.once('value').then(s=>{if(uid()!==id)return;const R=s.val()||{},up={};let moved=false;
    for(const [d,v] of Object.entries(R))if(v&&v.e!=null&&JSON.stringify(A.get(d))!==JSON.stringify(v.e)){A.put(d,v.e);moved=true}
    for(const d of A.dates())if(!R[d]&&d!==k&&A.get(d)!=null)up[d]={e:A.get(d)};
    if(Object.keys(up).length)ref.update(up).catch(()=>{});
    const r=R[k];
    if(r&&r.j){try{if(A.adopt(JSON.parse(r.j)))moved=true}catch(e){}if(r.r&&r.d)submit(g,k,r.r)}
    else if(!r)record(g);
    if(moved)changed('adopt')}).catch(()=>{})}
// today's game just ended on this device (each game calls Geomingo.account.done(id))
function record(g){const id=uid(),A=ADAPT[g],k=T(),t=A&&A.today();if(!id||!db||TEST||!t)return;markToday();
  const e=A.get(k),entry={e:e==null?null:e,j:JSON.stringify(t.j),r:t.r,d:k};
  db.ref('users/'+id+'/hist/'+g+'/'+k).transaction(cur=>cur?undefined:entry)
    .then(x=>{if(x.committed)submit(g,k,t.r);else syncGame(g)}).catch(()=>{})}
function done(g){if(uid())record(g);else changed()}

/* ---- the daily rankings: lb/<game>/<date>/<uid> = {name, s, m, t}; anyone can read them,
   each account writes its own result once (the database rules refuse a second write) ---- */
// the last rows seen of today's rankings (gm-lbc) are shown while the live ones load, instead of "Loading…"
const LB={},lbRef={},sent={};
(()=>{const c=json('gm-lbc')||{};for(const g in c)if(c[g]&&c[g].date===T()&&c[g].rows)LB[g]={date:c[g].date,rows:c[g].rows,old:true}})();
function keepLB(g){const c=json('gm-lbc')||{};for(const k in c)if(!c[k]||c[k].date!==T())delete c[k];
  c[g]={date:LB[g].date,rows:LB[g].rows};put('gm-lbc',c)}
function submit(g,k,r){const id=uid();if(!id||!name||TEST||k!==T())return;const key=id+g+k;
  if(sent[key]||(LB[g]&&LB[g].date===k&&LB[g].rows&&LB[g].rows[id]))return;sent[key]=1;
  db.ref('lb/'+g+'/'+k+'/'+id).set({name:name.slice(0,16),s:r.s,m:r.m||0,t:TS()}).catch(()=>{})}
function watch(g){if(!ok||TEST)return;const k=T();if(lbRef[g]&&lbRef[g].day===k)return;
  if(lbRef[g])lbRef[g].off();if(!(LB[g]&&LB[g].date===k))LB[g]={date:k,rows:null};lbRef[g]=db.ref('lb/'+g+'/'+k);lbRef[g].day=k;
  lbRef[g].on('value',s=>{LB[g]={date:k,rows:s.val()||{}};keepLB(g);changed()},()=>{LB[g]={date:k,rows:null,off:true};changed()})}
const sorted=g=>Object.entries((LB[g]&&LB[g].rows)||{}).map(([id,v])=>Object.assign({id},v)).sort((a,b)=>b.s-a.s||(a.m||0)-(b.m||0)||(a.t||0)-(b.t||0));
function mine(g){const me=meId();if(!me)return null;watch(g);const rows=sorted(g),i=rows.findIndex(r=>r.id===me);
  return i<0?null:{rank:i+1,total:rows.length,top:Math.max(1,Math.round((i+1)/rows.length*100))}}
// one line for the home screen: "#3 of 12 today · top 25%"
function rankLine(g){if(TEST||who()===undefined)return '';watch(g);const m=mine(g),n=sorted(g).length;
  return m?'<span class="hrank"><b>#'+m.rank+'</b> of '+m.total+' today · top '+m.top+'%</span>'
    :n?'<span class="hrank">'+n+' player'+(n===1?'':'s')+' in today\'s ranking</span>':''}
// today's ranking: the top 10, plus your own row further down. o: {title, what ("list"), score: r=>[main, small]}
function rankingHTML(g,o){const u=who();if(TEST||u===undefined)return '';o=o||{};watch(g);const L=LB[g],title=o.title||"Today's ranking";
  if(!L||!L.rows)return '<section class="panel lb"><span class="label">'+esc(title)+'</span><p class="hint">'+(L&&L.off?'The ranking is not available right now.':'Loading…')+'</p></section>';
  const rows=sorted(g),me=meId(),i=rows.findIndex(r=>r.id===me),sc=o.score||(r=>[String(r.s),'']);
  const row=(r,k)=>{const [a,b]=sc(r);return '<li class="'+(r.id===me?'me':'')+'"><span class="rk">'+(k+1)+'</span><span class="nm">'+esc(r.name||'Player')+'</span><span class="sq">'+esc(b)+'</span><span class="pt">'+esc(a)+'</span></li>'};
  const list=rows.slice(0,10).map(row).join('')+(i>=10?'<li class="gap">…</li>'+row(rows[i],i):'');
  const foot=!u?'<button class="ghost" data-gm-signin>Sign in to join today\'s ranking</button>'+(ADAPT[g]&&ADAPT[g].today()?'<p class="hint">Your result is added when you sign in.</p>':'')
    :i<0?'<p class="hint">Your result joins the ranking when you finish today\'s '+esc(o.what||'game')+' signed in. Only your first try counts.</p>':'';
  return '<section class="panel lb"><span class="label">'+esc(title)+(rows.length?' · '+rows.length+' player'+(rows.length===1?'':'s'):'')+'</span>'+
    (rows.length?'<ol class="lbl">'+list+'</ol>':'<p class="hint">Nobody in today\'s ranking yet.</p>')+foot+'</section>'}

/* ---- what the pages show ---- */
const noBanner=()=>ls.get('gm-nobanner')==='1';
// under Mingo on a game's home screen: who's playing, and the sign-in banner for guests (as in Countries)
function userHTML(){const u=who();if(u===undefined)return '';
  if(u)return '<div class="userline"><span class="pin" style="background:var(--sea)"></span>Playing as '+esc(name||'…')+'</div>';
  return '<div class="userline"><span class="pin" style="background:var(--sea)"></span>Playing as Guest'+(noBanner()?'<span class="uright"><button class="ghost" data-gm-signin>Sign in</button></span>':'')+'</div>'+
    (noBanner()?'':'<div class="gbanner"><span>Sign in to join the daily ranking</span><button class="primary" data-gm-signin>Sign in</button><button class="linkbtn" data-gm-nobanner aria-label="Close">✕</button></div>')}
// the header button: Sign in, or your initial (it opens a small menu with Sign out)
function acctHTML(){const u=who();if(u===undefined)return '';
  if(!u)return '<button class="gm-acct" data-gm-signin>Sign in</button>';
  const n=name||u.displayName||'';
  return '<button class="gm-acct me" data-gm-acctmenu aria-haspopup="true" aria-label="Your account: '+esc(n)+'" title="'+esc(n)+'">'+esc((n.trim()[0]||'·').toUpperCase())+'</button>'}
function acctMenu(open){let box=document.getElementById('gm-acctmenu');if(box)box.remove();if(!open||!user)return;
  const b=document.querySelector('[data-gm-acctmenu]'),r=b?b.getBoundingClientRect():{bottom:54,right:innerWidth-16};
  box=document.createElement('div');box.id='gm-acctmenu';
  box.innerHTML='<div class="menuscrim gm-ascrim" data-gm-aclose></div><div class="gm-amenu" role="dialog" aria-label="Your account" style="top:'+Math.round(r.bottom+6)+'px;right:'+Math.max(8,Math.round(innerWidth-r.right))+'px">'+
    '<span class="gm-lab">Signed in as</span><b>'+esc(name||user.displayName||'')+'</b>'+(user.email?'<small>'+esc(user.email)+'</small>':'')+
    '<p>Your stats, your GeoPass and your daily results are saved in your account, on every device.</p>'+
    '<button class="gm-big ghost" data-gm-signout>Sign out</button></div>';
  document.body.appendChild(box);const s=box.querySelector('[data-gm-signout]');if(s)s.focus()}
document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('[data-gm-signin],[data-gm-nobanner],[data-gm-acctmenu],[data-gm-signout],[data-gm-aclose]');if(!t)return;
  e.preventDefault();
  if(t.hasAttribute('data-gm-signin'))signIn();
  else if(t.hasAttribute('data-gm-nobanner')){ls.set('gm-nobanner','1');changed()}
  else if(t.hasAttribute('data-gm-acctmenu'))acctMenu(!document.getElementById('gm-acctmenu'));
  else if(t.hasAttribute('data-gm-signout')){acctMenu(false);signOut()}
  else acctMenu(false)});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.getElementById('gm-acctmenu'))acctMenu(false)});

// something changed: the header buttons are redrawn here; the page redraws itself (onChange) unless you are typing
function changed(why){document.querySelectorAll('[data-gm-acctslot]').forEach(el=>{const h=acctHTML();if(el.innerHTML!==h)el.innerHTML=h});
  const a=document.activeElement,typing=a&&(a.tagName==='INPUT'||a.tagName==='TEXTAREA')&&!a.closest('#gm-window');
  watchers.forEach(f=>{try{f(why||'',typing)}catch(e){console.error(e)}})}

G.acctHTML=acctHTML;
// ready/user: known for sure, or the last account seen on this device until Firebase answers (wasSignedIn: that last one)
G.account={get ready(){return who()!==undefined},get user(){return who()||null},get name(){return name},
  wasSignedIn:!!(LAST&&LAST.u),
  signIn,signOut,done,userHTML,rankingHTML,rankLine,mine,onChange:f=>watchers.push(f)};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
