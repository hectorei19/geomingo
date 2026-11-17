/* Geomingo account: one Google sign-in (Firebase Authentication, project geomingogames) for the whole site.
   Every page loads it in its <head>, right after ../brand/mingo.js, so Geomingo.account is there for the page's own
   scripts; it starts once the page has loaded (and has loaded the Firebase SDK itself when the page did not).
   Signed in, these are kept in the account and follow you to every device:
   - your name (users/<uid>/profile, the same one Countries has always used); unique, changed from the Menu once every 30 days
   - the GeoPass (users/<uid>/pass) and the days you played (users/<uid>/days), for every game
   - the daily results of Connections, Top 10, Silhouette, Customs, Flag Pie, Impostor and Compass
     (users/<uid>/hist/<game>/<date>), and each one joins
     that game's public daily ranking (lb/<game>/<date>/<uid>); only the account's first try of the day counts.
   Countries and Capitals keep their own sign-in code (same account, same name); here they only get the header button,
   the GeoPass and the days. Signing out leaves the device clean: every game's saves go, the account keeps them.
   Everything lives in Geomingo.account. */
(function(){
'use strict';
const G=window.Geomingo;if(!G)return;
const SDK='https://www.gstatic.com/firebasejs/10.12.2/';
// the Firebase web config (not secret: access is controlled by the database rules), for pages without their own
const CONFIG={apiKey:'AIzaSyB5HP4CTb1_lQsz8ACEif8CLtS4lPTpzF8',authDomain:'auth.geomingo.com',
  databaseURL:'https://geomingogames-default-rtdb.europe-west1.firebasedatabase.app',projectId:'geomingogames',
  storageBucket:'geomingogames.firebasestorage.app',messagingSenderId:'444503206024',appId:'1:444503206024:web:b04854d7736d5774c1d73d'};
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
  'sil-easy':silhouette('easy'),'sil-normal':silhouette('normal'),'sil-hard':silhouette('hard'),
  customs:simple('cu-hist','cu-daily',S=>({x3:(S.qs||[]).some(q=>q.x3)?1:0,s:(S.qs||[]).reduce((n,q)=>n+G.clFlag(q),0),r:(S.qs||[]).filter(q=>q.st==='right').length,m:(S.qs||[]).reduce((n,q)=>n+(q.tries||[]).length,0)})),
  flagpie:simple('fp-hist','fp-daily',S=>({x3:(S.qs||[]).some(q=>q.x3)?1:0,s:(S.qs||[]).reduce((n,q)=>n+G.clFlag(q),0),r:(S.qs||[]).filter(q=>q.st==='right').length,m:(S.qs||[]).reduce((n,q)=>n+(q.tries||[]).length,0)})),
  impostor:simple('im-hist','im-daily',S=>({x3:(S.qs||[]).some(q=>q.x3)?1:0,s:(S.qs||[]).reduce((n,q)=>n+G.impRound(q),0),r:(S.qs||[]).filter(q=>q.st==='right').length,m:(S.qs||[]).filter(q=>q.st==='wrong'&&q.pick).length})),
  compass:simple('cm-hist','cm-daily',S=>({x3:(S.qs||[]).some(q=>q.x3)?1:0,s:(S.qs||[]).reduce((n,q)=>n+(q.st==='right'?+q.p||0:0),0),r:(S.qs||[]).filter(q=>q.st==='right').length,m:(S.qs||[]).reduce((n,q)=>n+(q.tries||[]).length,0)}))};

/* ---- Firebase ---- */
// set further down: a page that was signed in last time waits for the account's game of today (see holdOff)
let waitFor=new Set();
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
async function boot(){OWN=typeof window.initAuth==='function';trialCheck();
  try{if(typeof firebase==='undefined')await script(SDK+'firebase-app-compat.js');
    if(typeof firebase.auth!=='function')await script(SDK+'firebase-auth-compat.js');
    if(typeof firebase.database!=='function')await script(SDK+'firebase-database-compat.js');
    if(!firebase.apps.length)firebase.initializeApp(window.FIREBASE_CONFIG&&FIREBASE_CONFIG.apiKey?FIREBASE_CONFIG:CONFIG);
    db=firebase.database();ok=true;statsOn();watchNames()}
  catch(e){ok=false;failed=true;holdOff();changed();return}
  firebase.auth().onAuthStateChanged(onUser);
  if(!OWN)firebase.auth().getRedirectResult().catch(authError)}
const TS=()=>firebase.database.ServerValue.TIMESTAMP;

/* ---- anonymous usage counters, read only by the owner at geomingo.com/stats: st/<day>/<page>/<what> is a plain number
   that goes up by 1 (page views, phone or computer, signed in or guest, and Geomingo.stat's open/fin/giveup), plus
   st/<day>/_hour/h<0-23>. Nothing about the person is sent or kept on the device: no name, no account, no id.
   Only on geomingo.com and never in test mode. */
const COUNT=!TEST&&/(^|\.)geomingo\.com$/.test(location.hostname);let seen=0;
function count(page,k){if(!COUNT||!db||page==='stats')return;db.ref('st/'+T()+'/'+page+'/'+k).set(firebase.database.ServerValue.increment(1)).catch(()=>{})}
function statsOn(){if(!COUNT||!G.statTo)return;G.statTo(count);const p=G.PAGE;
  let phone=false;try{phone=matchMedia('(pointer:coarse)').matches}catch(e){}
  count(p,'view');count(p,phone?'phone':'computer');if(p!=='stats')count('_hour','h'+(+G.madridParts(Date.now()).hour))}
const uid=()=>user&&user.uid;

// signing out (here, or from Countries' menu) leaves the device clean, as Countries always did:
// the stats, today's games, the GeoPass and the name go; the account keeps them for the next sign-in
const DEVICE_KEYS=['bl-daily','bl-hist','bl-games','bl-arch','bl-user','cc-daily','cc-hist','cc-games','cc-arch','cc-user',
  'cx-daily','cx-hist','t10-daily','t10-hist','sil-daily','sil-hist','sil-miss','sil-train','gm-pass','gm-days','gm-acct','gm-lbc','gm-ranks','cx-solo','cx-friends','t10-solo','t10-friends','sil-friends','gm-feats','cu-daily','cu-hist','cu-arch','cu-solo','cu-diff','fp-daily','fp-hist','fp-arch','fp-solo','fp-solo5','fp-diff','im-daily','im-hist','im-arch','im-solo','im-diff','gm-ms'];
function onUser(u){const was=user;user=u||null;if(!user)holdOff();if(!seen){seen=1;count(G.PAGE,user?'in':'guest')}
  if(was&&!user){DEVICE_KEYS.forEach(k=>ls.set(k,null));ls.set('gm-acct',null);location.reload();return}
  if(user){if(!(LAST&&LAST.u===user.uid))name='';loadName()}
  remember();changed();if(user)setTimeout(scanFeats,2500)}
function authError(e){const c=(e&&e.code)||'';if(c==='auth/popup-closed-by-user'||c==='auth/cancelled-popup-request')return;
  say(c==='auth/unauthorized-domain'||c==='auth/operation-not-allowed'?'Sign-in is not set up yet for this site.':'Could not sign in. Try again.')}
function say(msg){if(typeof window.toast==='function')window.toast(msg,'bad');else alert(msg)}
function signIn(){if(!ok){say('Sign-in is not available right now. Check the connection and reload the page.');return}
  const p=new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(p).catch(e=>{if(e&&e.code==='auth/popup-blocked')firebase.auth().signInWithRedirect(p);else authError(e)})}
function signOut(){if(ok)firebase.auth().signOut().catch(()=>{})}

/* ---- 3 guest days: a guest can play for 3 days, then every page asks to sign in ----
   gm-trial: the days (dayKey) a guest opened a game page, at most 3. On a 4th day the sign-in screen covers the page
   (home and games) and can't be closed; signing in takes it away. The home page alone doesn't use up a day.
   An invite link (?room=) always opens, so a friend can join a room without an account; nor does test mode (?test) show it.
   Signing out keeps gm-trial (it is not in DEVICE_KEYS), so the free days are not given again. */
const TRIAL=3;
const GAME_PAGE=/\/(countries|capitals|connections|top10|silhouette|customs|flagpie|impostor|compass)\//.test(location.pathname);
const ROOM_LINK=(()=>{try{return new URLSearchParams(location.search).has('room')}catch(e){return false}})();
const trialDays=()=>{const d=json('gm-trial');return Array.isArray(d)?d.filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x)):[]};
// day: which free day today is (1-3, or the one it would be), left: free days still to come after today, over: no free day left
function trialState(){const d=trialDays(),k=T(),i=d.indexOf(k);
  return {day:i>=0?i+1:Math.min(d.length+1,TRIAL+1),left:Math.max(0,TRIAL-(i>=0?i+1:d.length+1)),over:i<0&&d.length>=TRIAL,max:TRIAL}}
function trialCheck(){const u=who(),free=u!==null||ROOM_LINK||TEST||failed;
  if(free){wall(false);return}
  const d=trialDays(),k=T();if(GAME_PAGE&&!d.includes(k)&&d.length<TRIAL){d.push(k);put('gm-trial',d)}
  wall(trialState().over)}
function wall(on){let w=document.getElementById('gm-wall');
  if(!on){if(w){w.remove();document.documentElement.classList.remove('gm-walled')}return}
  if(w||!document.body)return;
  let km=0,st=0;try{const g=G.geo();km=g.km;st=g.streak}catch(e){}
  const have=km>0?'<p>You\'ve flown <b>'+EU(km)+' km</b>'+(st>1?' and have a <b>'+st+'-day streak</b>':'')+'. Sign in to keep them and keep playing. Geomingo is free, always.</p>'
    :'<p>Sign in to keep playing every day. Geomingo is free, always: no payments, just one tap.</p>';
  w=document.createElement('div');w.id='gm-wall';w.setAttribute('role','dialog');w.setAttribute('aria-modal','true');w.setAttribute('aria-labelledby','gm-wall-t');
  w.innerHTML='<div class="gm-wallcard">'+G.mingo('head',44)+'<h2 id="gm-wall-t">Your '+TRIAL+' days as a guest are over</h2>'+
    '<div class="gm-walldots" aria-hidden="true">'+'<i></i>'.repeat(TRIAL)+'</div>'+have+
    '<ul><li>Your GeoPass, km and streak, on any phone</li><li>Your name in the daily rankings</li><li>Every game, every day</li></ul>'+
    '<button class="gm-wallg" data-gm-signin><i aria-hidden="true">G</i>Continue with Google</button>'+
    '<p class="gm-wallnote">Got an invite link from a friend? Open it to join their room.</p></div>';
  document.body.appendChild(w);document.documentElement.classList.add('gm-walled');
  const b=w.querySelector('button');if(b)setTimeout(()=>b.focus(),50)}

/* ---- the name: kept in the account, shown in every ranking ----
   One name per player, nobody else can have it, and it can be changed from the Menu once every 30 days (Héctor 2026-11-16).
   names/<key> = uid: who holds a name. key = the name in small letters without accents or spaces ("Héctor M" = "hectorm").
   pnames/<uid> = {n, k, t}: each player's current name, public. Every ranking shows this name (nameOf), so a new name
   shows on past days too, although the ranking rows keep a copy of the old one. t = when it was last changed (0 = never).
   users/<uid>/profile keeps the name too (Countries and Capitals read it there). The rules check all of this. */
const NAME_DAYS=30,NAME_MS=NAME_DAYS*864e5;
const ACC={a:'àáâäãå',e:'èéêë',i:'ìíîï',o:'òóôöõ',u:'ùúûü',n:'ñ',c:'ç',y:'ýÿ'};   // the same list is in the Firebase rules
const nameKey=v=>{let s=String(v||'').toLowerCase().split(' ').join('');for(const [b,l] of Object.entries(ACC))for(const ch of l)s=s.split(ch).join(b);return s};
const cleanName=v=>String(v||'').replace(/\s+/g,' ').trim();
// how every name is shown (Héctor 2026-11-16): first letter of each word in capitals, the rest small ("AGST" → "Agst")
const fmtName=v=>cleanName(v).toLowerCase().replace(/(^|\s)(\S)/g,(m,a,b)=>a+b.toUpperCase());
const NAME_OK=/^[A-Za-z0-9 àáâäãåèéêëìíîïòóôöõùúûüñçýÿÀÁÂÄÃÅÈÉÊËÌÍÎÏÒÓÔÖÕÙÚÛÜÑÇÝ]+$/;
// a few words nobody can have in their name (checked inside the key, so spaces and accents don't hide them)
const BAD=['fuck','shit','cunt','nigger','nigga','fagot','faggot','bitch','whore','slut','asshole','pussy','penis','retard','hitler','nazi','porn',
  'puta','puto','mierda','joder','polla','gilipollas','maricon','cabron','zorra','follar','verga','pendejo','chinga','coño'].map(nameKey);
// what's wrong with a name, or '' when it can be used
function nameProblem(v){const n=cleanName(v),k=nameKey(n);
  if(!n)return 'Type a name.';
  if(!NAME_OK.test(n))return 'Only letters, numbers and spaces.';
  if(n.length>16)return 'At most 16 characters.';
  if(k.length<3)return 'At least 3 letters or numbers.';
  if(BAD.some(b=>k.includes(b)))return 'Please choose another name.';
  return ''}
// everyone's current name (pnames), kept up to date while the page is open; also kept on this device for the first paint
let NAMES=json('gm-pnames')||{},MYP=null;
function watchNames(){db.ref('pnames').on('value',s=>{const v=s.val()||{},m={};
  for(const [id,p] of Object.entries(v))if(p&&typeof p.n==='string')m[id]=p.n;
  namesIn=true;const same=JSON.stringify(m)===JSON.stringify(NAMES);NAMES=m;flushFill();if(!same){put('gm-pnames',m);changed('names')}},()=>{})}
const nameOf=(id,fallback)=>fmtName((id&&NAMES[id])||fallback)||'Player';
// the names this page already knows (everyone's current name, the rankings seen here): a name one of them uses
// counts as taken even before it is in names/ (players from before 2026-11-16 who haven't come back yet)
function knownNames(){const m={};const add=(id,n)=>{if(id&&n&&!m[id])m[id]=String(n)};
  for(const id in NAMES)add(id,NAMES[id]);
  for(const g in LB)for(const id in (LB[g]&&LB[g].rows)||{})add(id,LB[g].rows[id].name);
  const r=json('gm-rank');if(r&&Array.isArray(r.ppl))r.ppl.forEach(p=>add(p.id,p.n0||p.name));
  return m}
/* players from before names were unique are put in names/ by whoever sees them in a ranking (the rules check the name
   is the one in their account), so their names are taken at once, not only when they come back. Once per player per visit. */
const filled=new Set();let toFill=[],namesIn=false;
const flushFill=()=>{if(toFill.length&&uid()&&namesIn){const l=toFill;toFill=[];backfill(l)}};
function backfill(list){if(TEST||!db)return;if(!uid()||!namesIn){toFill=toFill.concat(list);return}let n=0;
  for(const [id,nm] of list){if(!id||filled.has(id)||NAMES[id]||id===uid()||n>=40)continue;filled.add(id);
    const c=cleanName(nm),k=nameKey(c);if(c!==nm||!NAME_OK.test(c)||!k||k.length>16)continue;n++;
    db.ref().update({['names/'+k]:id,['pnames/'+id]:{n:c,k,t:0}}).catch(()=>{})}}
// once, from the owner's account: every player in every ranking since the first daily game (15 Oct 2026)
const OWNER='WjzTvjoYtjcshmTn4P7Lg5yKsdE3',LB_PATHS=['leaderboard','lb/capitals','lb/connections','lb/top10','lb/sil-easy','lb/sil-normal','lb/sil-hard','lb/customs','lb/flagpie','lb/impostor','lb/compass'];
function sweepNames(){if(uid()!==OWNER||ls.get('gm-namesweep')||TEST)return;const days=[];
  for(let t=Date.parse('2026-10-15T12:00Z');t<=Date.now();t+=864e5)days.push(new Date(t).toISOString().slice(0,10));
  const seen={};Promise.all(days.flatMap(d=>LB_PATHS.map(p=>db.ref(p+'/'+d).once('value').then(s=>{const v=s.val()||{};
    for(const id in v)if(v[id]&&v[id].name&&!seen[id])seen[id]=String(v[id].name)}).catch(()=>{}))))
   .then(()=>{const L=Object.entries(seen);let i=0;const step=()=>{const part=L.slice(i,i+40);i+=40;if(!part.length){ls.set('gm-namesweep','1');return}
     part.forEach(x=>filled.delete(x[0]));backfill(part);setTimeout(step,1500)};step()})}
function setName(n){name=fmtName(n);ls.set('bl-user',n);ls.set('cc-user',n);if(user)remember();G.refreshPass()}
function loadName(){const id=uid();
  db.ref('users/'+id+'/profile').once('value').then(s=>{if(uid()!==id)return;const v=s.val();
    if(v&&v.name){setName(v.name);claimOld(v.name);sweepNames();flushFill()}else{holdOff();if(!OWN)askName()}
    syncAll();changed()}).catch(()=>holdOff())}
// a name chosen before names were unique: it is reserved for its player the first time they come back,
// unless someone else got it first (then they keep showing it until they change it)
function claimOld(n){const id=uid();
  db.ref('pnames/'+id).once('value').then(s=>{if(uid()!==id)return;MYP=s.val();if(MYP)return;
    const c=cleanName(n),k=nameKey(c);if(c!==n||!NAME_OK.test(c)||!k||k.length>16)return;
    db.ref().update({['names/'+k]:id,['pnames/'+id]:{n:c,k,t:0}}).then(()=>{MYP={n:c,k,t:0}}).catch(()=>{})}).catch(()=>{})}
// is a name free? resolves 'free', 'mine' or 'taken'
function nameFree(v){const k=nameKey(cleanName(v)),me=uid(),K=knownNames();
  if(Object.entries(K).some(([id,n])=>id!==me&&nameKey(cleanName(n))===k))return Promise.resolve('taken');
  return db.ref('names/'+k).once('value').then(s=>{const w=s.val();return !w?'free':w===me?'mine':'taken'})}
// saves a name for the account: the first one (t 0) or a change (t now). Resolves the name, or rejects with a message
function claimName(v,first){const id=uid(),n=fmtName(v),k=nameKey(n),bad=nameProblem(n);
  if(bad)return Promise.reject(new Error(bad));if(!id||!db)return Promise.reject(new Error('Sign in first.'));
  return nameFree(n).then(f=>{if(f==='taken')throw new Error('Taken. Try another name.');
    const up={['names/'+k]:id,['pnames/'+id]:{n,k,t:first?0:TS()},['users/'+id+'/profile']:{name:n}};
    if(MYP&&MYP.k&&MYP.k!==k)up['names/'+MYP.k]=null;
    return db.ref().update(up).catch(()=>{throw new Error('Could not save your name. Try again.')})})
   .then(()=>{MYP={n,k,t:first?0:Date.now()};NAMES[id]=n;put('gm-pnames',NAMES);setName(n);changed('myname');return n})}
// the first name, when you sign in for the first time (also used by Countries and Capitals)
function firstName(v){const id=uid();if(!id||!db)return Promise.reject(new Error('Sign in first.'));
  return db.ref('users/'+id+'/profile').once('value').then(s=>{const x=s.val();if(x&&x.name){setName(x.name);return x.name}return claimName(v,true)})}
// when the name can be changed again (0 = now)
const nextChange=()=>MYP&&MYP.t?Math.max(0,MYP.t+NAME_MS-Date.now()):0;
// the name window: the first time (no Close, it must be chosen) or a change from the Menu
function nameWindow(first){const cur=first?((user.displayName||'').trim().split(/\s+/)[0]||'').slice(0,16):name,wait=first?0:nextChange();
  const when=wait?new Date(Date.now()+wait).toLocaleDateString('en-GB',{day:'numeric',month:'long'}):'';
  const note=first?'It appears in the daily ranking of every game. Nobody else can have the same name. You can change it later in the Menu, once every '+NAME_DAYS+' days.'
    :'3 to 16 letters, numbers or spaces. Nobody else can use the same name. You can change it once every '+NAME_DAYS+' days.';
  const body=wait?'<p class="gm-nmwait">You changed your name recently. You can change it again on <b>'+esc(when)+'</b>.</p>'
    :'<label class="gm-lab" for="gm-name">Your name in Geomingo</label><input id="gm-name" class="gm-input" maxlength="16" autocomplete="nickname" placeholder="Your name" value="'+esc(cur)+'">'+
     '<p class="gm-nmst" aria-live="polite"></p><p class="gm-note" style="text-align:left">'+note+'</p>'+
     '<button class="gm-big coral" data-gm-act="savename" disabled>Save name</button>';
  const box=G.openWindow('<div class="gm-res gm-namebox"><div class="gm-band">'+bico('user')+'<b>'+(first?'Welcome aboard':'Change name')+'</b></div><div class="gm-rbody">'+body+
    (first?'':'<button class="gm-text" data-gm-act="close">Close</button>')+'</div></div>',first?'Choose your name':'Change name');
  const inp=box.querySelector('#gm-name');if(!inp)return;
  const st=box.querySelector('.gm-nmst'),btn=box.querySelector('[data-gm-act="savename"]');let ask=0,tm=0;
  const show=(cls,t,okay)=>{st.className='gm-nmst'+(cls?' '+cls:'');st.textContent=t;inp.classList.toggle('bad',cls==='bad');inp.classList.toggle('good',cls==='good');btn.disabled=!okay};
  const check=()=>{clearTimeout(tm);const n=cleanName(inp.value),bad=nameProblem(n),me=++ask;
    if(!first&&fmtName(n)===name){show('','This is your name now.',false);return}
    if(bad){show(n?'bad':'',n?'✗ '+bad:'',false);return}
    show('','Checking…',false);
    tm=setTimeout(()=>nameFree(n).then(f=>{if(me!==ask)return;f==='taken'?show('bad','✗ Taken. Try another name.',false):show('good','✓ '+fmtName(n)+(f==='mine'?' is yours':' is free'),true)})
      .catch(()=>{if(me===ask)show('','',true)}),300)};
  const save=()=>{if(btn.disabled)return;btn.disabled=true;
    (first?firstName(inp.value):claimName(inp.value)).then(()=>{G.closeWindow();if(first&&!OWN)Object.keys(ADAPT).forEach(syncGame);changed()})
      .catch(e=>{show('bad','✗ '+((e&&e.message)||'Could not save your name. Try again.'),false)})};
  box._acts={savename:save};inp.addEventListener('input',check);inp.addEventListener('keydown',e=>{if(e.key==='Enter')save()});
  check();setTimeout(()=>inp.focus(),50)}
function askName(){nameWindow(true)}
// Change name (Menu): reads when it was last changed first, so the 30 days are shown right
function changeMyName(){const id=uid();if(!id||!db){say('One moment, signing you in…');return}
  db.ref('pnames/'+id).once('value').then(s=>{if(uid()!==id)return;MYP=s.val();nameWindow(false)}).catch(()=>nameWindow(false))}

/* ---- keeping the account and this device in step ---- */
function syncAll(){if(!uid()||!db)return;syncPass();syncDays();if(!OWN){Object.keys(ADAPT).forEach(syncGame);syncGrid('daily','bl-hist');syncGrid('capitals/daily','cc-hist')}}
// Countries and Capitals keep their days in the account themselves (users/<uid>/daily, users/<uid>/capitals/daily), but only
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
    // the atlas (which games stamped each country): both sides together, plus what the stamps list says
    const A=Object.assign({},G.atlasFromList?G.atlasFromList(M.list):{});[R&&R.atlas,G.atlas(L)].forEach(o=>{for(const c in o||{})A[c]=(A[c]||0)|(+o[c]||0)});M.atlas=A;
    put('gm-pass',Object.assign({},M,{u:id}));ref.set(M).catch(()=>{});G.refreshPass();changed()}).catch(()=>{})}
G.onStamp(x=>{const id=uid(),p=json('gm-pass');if(!id||!db||!p||p.u!==id)return;
  db.ref('users/'+id+'/pass').transaction(cur=>{cur=cur||{n:0,since:x.d,list:[]};const l=asList(cur.list);l.push(x);
    const at=Object.assign({},cur.atlas||{}),b=x.c&&(G.ABIT?G.ABIT(x.g):G.GBIT[x.g]);if(b)at[x.c]=(at[x.c]||0)|b;
    return {n:(cur.n||0)+1,since:cur.since||x.d,list:l.slice(-240),atlas:at}}).catch(()=>{});
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
    if(moved)changed('adopt');holdOff(g)}).catch(()=>holdOff(g))}
// today's game just ended on this device (each game calls Geomingo.account.done(id))
function record(g){const id=uid(),A=ADAPT[g],k=T(),t=A&&A.today();if(!id||!db||TEST||!t)return;markToday();
  const e=A.get(k),entry={e:e==null?null:e,j:JSON.stringify(t.j),r:t.r,d:k};
  db.ref('users/'+id+'/hist/'+g+'/'+k).transaction(cur=>cur?undefined:entry)
    .then(x=>{if(x.committed)submit(g,k,t.r);else syncGame(g)}).catch(()=>{})}
function done(g){G.stat('fin','daily');if(uid())record(g);else changed()}

/* ---- opening a game on a device that was signed in last time: today's game stays behind "Opening today's game…"
   until the account's game of today has come (at most 5 s), so an empty game never flashes before the one played
   on another device (Héctor 2026-11-14). Not when today's game is already finished here, in test mode or from an invite link.
   Countries and Capitals do the same in their own pages. ---- */
waitFor=new Set((()=>{const m=location.pathname.match(/\/(connections|top10|silhouette|customs|flagpie|impostor|compass)\//);
  if(!m||!(LAST&&LAST.u)||TEST||ROOM_LINK)return [];
  return (m[1]==='silhouette'?['sil-easy','sil-normal','sil-hard']:[m[1]]).filter(g=>!ADAPT[g].today())})());
function holdOff(g){if(g)waitFor.delete(g);else waitFor.clear();if(!waitFor.size)document.documentElement.classList.remove('gm-wait')}
if(waitFor.size){document.documentElement.classList.add('gm-wait');
  const st=document.createElement('style');
  st.textContent='html.gm-wait #app{position:relative}html.gm-wait #app>:not(.gm-top):not(.gm-bar){visibility:hidden}'+
    'html.gm-wait #app::after{content:"Opening today\'s game…";position:absolute;left:0;right:0;top:132px;text-align:center;color:var(--muted,#9aa3b8);font-size:15px}';
  document.head.appendChild(st);setTimeout(()=>holdOff(),5000)}

/* ---- the daily rankings: lb/<game>/<date>/<uid> = {name, s, m, t}; anyone can read them,
   each account writes its own result once (the database rules refuse a second write) ---- */
// the last rows seen of today's rankings (gm-lbc) are shown while the live ones load, instead of "Loading…"
const LB={},lbRef={},sent={};
(()=>{const c=json('gm-lbc')||{};for(const g in c)if(c[g]&&c[g].date===T()&&c[g].rows)LB[g]={date:c[g].date,rows:c[g].rows,old:true}})();
function keepLB(g){const c=json('gm-lbc')||{};for(const k in c)if(!c[k]||c[k].date!==T())delete c[k];
  c[g]={date:LB[g].date,rows:LB[g].rows};put('gm-lbc',c)}
function submit(g,k,r){const id=uid();if(!id||!name||TEST||k!==T())return;const key=id+g+k;
  if(sent[key]||(LB[g]&&LB[g].date===k&&LB[g].rows&&LB[g].rows[id]))return;sent[key]=1;
  const sec=G.clock&&G.clock.secs(g.indexOf('sil-')===0?'silhouette':g,k);
  db.ref('lb/'+g+'/'+k+'/'+id).set(Object.assign({name:name.slice(0,16),s:r.s,m:r.m||0,t:TS()},r.r!=null?{r:r.r}:{},r.x3?{x3:1}:{},sec?{sec}:{})).catch(()=>{})}
function watch(g){if(!ok||TEST)return;const k=T();if(lbRef[g]&&lbRef[g].day===k)return;
  if(lbRef[g])lbRef[g].off();if(!(LB[g]&&LB[g].date===k))LB[g]={date:k,rows:null};lbRef[g]=db.ref('lb/'+g+'/'+k);lbRef[g].day=k;
  lbRef[g].on('value',s=>{LB[g]={date:k,rows:s.val()||{}};keepLB(g);backfill(Object.entries(LB[g].rows).map(([id,r])=>[id,r&&r.name]));changed()},()=>{LB[g]={date:k,rows:null,off:true};changed()})}
// from G.KM_FROM the ranking is by the game's points (the same table as the km), then fewer mistakes, then who finished first
const PTS={connections:r=>G.cxPts(r.s,r.m),top10:r=>G.KM.top10(r.s,r.m),'sil-easy':r=>G.KM.sil(r.s,r.m),'sil-normal':r=>G.KM.sil(r.s,r.m),'sil-hard':r=>G.KM.sil(r.s,r.m),
  customs:r=>G.KM.cl3(r.r,r.s,T(),r.x3,5),flagpie:r=>G.KM.cl3(r.r,r.s,T(),r.x3,5),compass:r=>G.KM.cl3(r.r,r.s,T(),r.x3,5),impostor:r=>G.KM.imp(r.r,r.s,T(),r.x3)};
const rankPts=(g,r)=>PTS[g]&&G.newKm(T())?PTS[g](r):r.s;
const sorted=g=>Object.entries((LB[g]&&LB[g].rows)||{}).map(([id,v])=>Object.assign({id},v)).sort((a,b)=>rankPts(g,b)-rankPts(g,a)||b.s-a.s||(a.m||0)-(b.m||0)||(a.t||0)-(b.t||0));
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
  const row=(r,k)=>{const [a,b]=sc(r);return '<li class="'+(r.id===me?'me':'')+'"><span class="rk">'+(k+1)+'</span><span class="nm">'+esc(nameOf(r.id,r.name))+'</span><span class="sq">'+esc(b)+'</span><span class="pt">'+esc(a)+'</span></li>'};
  const list=rows.slice(0,10).map(row).join('')+(i>=10?'<li class="gap">…</li>'+row(rows[i],i):'');
  const foot=!u?'<button class="ghost" data-gm-signin>Sign in to join today\'s ranking</button>'+(ADAPT[g]&&ADAPT[g].today()?'<p class="hint">Your result is added when you sign in.</p>':'')
    :i<0?'<p class="hint">Your result joins the ranking when you finish today\'s '+esc(o.what||'game')+' signed in. Only your first try counts.</p>':'';
  return '<section class="panel lb"><span class="label">'+esc(title)+(i>=0?'<b>You: #'+(i+1)+' of '+rows.length+'</b>':rows.length?' · '+rows.length+' player'+(rows.length===1?'':'s'):'')+'</span>'+
    (rows.length?'<ol class="lbl">'+list+'</ol>':'<p class="hint">Nobody in today\'s ranking yet.</p>')+foot+'</section>'}

/* ---- the ranking visas of the GeoPass (Gold medal, First to arrive, Fastest of the day…) ----
   For every daily you played, once its day is over, that day's whole ranking is read once and what you did in it is kept
   on this device: gm-feats {u, r: {game: {day: [place, players, first to finish, fastest, your finish time]}}}.
   First, Fastest and the finish time only count a result with at least half right; Fastest compares the rows that carry
   the seconds the game took (sec, sent from 2026-11 on). mingo.js visas() reads it. */
const FEATS=[['borderline','leaderboard','bl-hist',r=>(+r.c||0)>=8,e=>e&&e.f!==0],['citygrid','lb/capitals','cc-hist',r=>(+r.c||0)>=8,e=>e&&e.f!==0],
  ['connections','lb/connections','cx-hist',r=>(+r.s||0)>=2,e=>!!e],['top10','lb/top10','t10-hist',r=>(+r.s||0)>=5,e=>!!e],
  ['silhouette','lb/sil-normal','sil-hist',r=>(+r.s||0)>=5,e=>e&&e.normal!=null],['customs','lb/customs','cu-hist',(r,d)=>(+r.s||0)>=(G.clNew(d,r.x3)?50:13),e=>!!e],
  ['flagpie','lb/flagpie','fp-hist',(r,d)=>(+r.s||0)>=(G.clNew(d,r.x3)?50:13),e=>!!e],['impostor','lb/impostor','im-hist',(r,d)=>(+r.s||0)>=(G.imp5(d)?50:G.impNew(d,r.x3)?45:15),e=>!!e],
  ['compass','lb/compass','cm-hist',(r,d)=>(+r.s||0)>=(G.clNew(d,r.x3)?50:13),e=>!!e]];
let featBusy=false;
const featStore=me=>{const c=json('gm-feats');return c&&c.u===me&&c.r?c:{u:me,r:{}}};
function featsOf(rows,me,half){const L=Object.entries(rows||{}).map(([id,v])=>Object.assign({id},v)),i=L.slice().sort(lbOrder).findIndex(r=>r.id===me);
  const q=L.filter(half),mine=L.find(r=>r.id===me),ok=!!mine&&half(mine),two=q.length>=2;
  const first=ok&&two&&q.reduce((a,b)=>(+b.t||Infinity)<(+a.t||Infinity)?b:a).id===me;
  const tq=q.filter(r=>typeof r.sec==='number'&&r.sec>0);
  const fast=ok&&two&&tq.length>0&&tq.reduce((a,b)=>b.sec<a.sec?b:a).id===me;
  return [i<0?0:i+1,L.length,first?1:0,fast?1:0,ok&&+mine.t||0]}
function scanFeats(){const me=uid();if(!me||!db||TEST||featBusy)return;const c=featStore(me),k=T(),todo=[];
  FEATS.forEach(([g,path,hk,half,played])=>{const h=json(hk)||{},have=c.r[g]=c.r[g]||{};
    Object.keys(h).forEach(d=>{if(/^\d{4}-\d{2}-\d{2}$/.test(d)&&d<k&&!have[d]&&played(h[d]))todo.push([g,path,d,half])})});
  put('gm-feats',c);if(!todo.length)return;featBusy=true;
  const step=()=>{const x=todo.shift();if(!x||uid()!==me){featBusy=false;return}const [g,path,d,half]=x;
    db.ref(path+'/'+d).once('value').then(s=>{const c2=featStore(me);(c2.r[g]=c2.r[g]||{})[d]=featsOf(s.val(),me,r=>half(r,d));put('gm-feats',c2);step()})
      .catch(()=>{featBusy=false})};
  step()}

/* ---- My stats: one card per way to play (statsPage below) ----
   The Daily card's cup is your best place in a daily ranking. The places come from the public rankings of the days you played
   (lbs[].path: lb/<game>, Countries' leaderboard, Capitals' lb/capitals), read once a day is over and kept here (gm-ranks);
   today's place counts too, but can still change until midnight. */
const RK={};
function ranksStore(){const id=meId(),c=json('gm-ranks');return c&&c.u===id&&c.r?c:{u:id,r:{}}}
const lbOrder=(a,b)=>b.s-a.s||(a.m||0)-(b.m||0)||(b.c||0)-(a.c||0)||(a.t||0)-(b.t||0);
function placeIn(rows,me){const l=Object.entries(rows||{}).map(([id,v])=>Object.assign({id},v)).sort(lbOrder),i=l.findIndex(r=>r.id===me);
  return [i<0?0:i+1,l.length]}
// every day you played: [place (0: not in it), players], today's from the live ranking; null while the account is unknown
function places(lbs){const me=meId();if(!me||!ok)return null;const c=ranksStore(),k=T(),out=[];let ask=false;
  for(const {path,dates} of lbs){const P=c.r[path]=c.r[path]||{};
    for(const d of dates){if(d>k)continue;
      if(d===k){const L=liveDay(path);if(L)out.push({d,p:placeIn(L,me)});continue}
      if(P[d]){out.push({d,p:P[d]});continue}
      const key=me+path+d;if(RK[key])continue;RK[key]=1;ask=true;
      db.ref(path+'/'+d).once('value').then(s=>{const c2=ranksStore();(c2.r[path]=c2.r[path]||{})[d]=placeIn(s.val(),me);put('gm-ranks',c2);drawTrophies()}).catch(()=>{})}}
  if(ask)put('gm-ranks',c);return out}
// today's ranking, live (it can still change until midnight)
const TD={};
function liveDay(path){const k=T();if(!TD[path]||TD[path].day!==k){if(TD[path])TD[path].ref.off();
  const ref=db.ref(path+'/'+k);TD[path]={day:k,ref,rows:null};ref.on('value',s=>{TD[path].rows=s.val()||{};drawTrophies()},()=>{})}
  return TD[path].rows}
// the cup: gold for a 1st place, silver for 2nd, bronze for 3rd, a plain outline before your first ranking
function cupSVG(tone,label,size){const f={1:'#D4AD4B',2:'#C3CBD6',3:'#C98A5A'}[tone]||'none',s=f==='none'?'var(--line)':f,lf=f==='none'?'var(--muted)':'#16202F';
  return '<svg class="gm-cup" width="'+size+'" height="'+size+'" viewBox="0 0 120 120" aria-hidden="true">'+
    '<path d="M30 18h60v22c0 20-13 36-30 36S30 60 30 40z" fill="'+f+'" stroke="'+s+'" stroke-width="3"/>'+
    '<path d="M30 26H14c0 18 8 28 20 30M90 26h16c0 18-8 28-20 30" fill="none" stroke="'+s+'" stroke-width="6" stroke-linecap="round"/>'+
    '<rect x="53" y="76" width="14" height="12" fill="'+s+'"/><rect x="38" y="88" width="44" height="9" rx="2" fill="'+s+'"/>'+
    '<rect x="32" y="97" width="56" height="13" rx="3" fill="var(--page)" stroke="'+s+'" stroke-width="2"/>'+
    (label?'<text x="60" y="53" text-anchor="middle" font-family="Archivo,sans-serif" font-weight="900" font-size="'+(label.length>3?20:26)+'" fill="'+lf+'">'+esc(label)+'</text>':'')+'</svg>'}
const ordinal=n=>n+(n%100>10&&n%100<14?'th':['th','st','nd','rd'][n%10]||'th');
const shortDate=d=>{const p=d.split('-');return +p[2]+' '+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+p[1]-1]};
// the medal of the Solo card and the ring of the With friends card
function medalSVG(label,size){return '<svg class="gm-medalsvg" width="'+size+'" height="'+size+'" viewBox="0 0 100 100" aria-hidden="true">'+
  '<path d="M30 4h14l10 30H40zM70 4H56L46 34h14z" fill="var(--blue)"/><circle cx="50" cy="62" r="32" fill="'+(label==null?'none':'#D4AD4B')+'" stroke="'+(label==null?'var(--line)':'#D4AD4B')+'" stroke-width="3"/>'+
  '<circle cx="50" cy="62" r="24" fill="none" stroke="'+(label==null?'var(--line)':'#16202F')+'" stroke-opacity=".3" stroke-width="3"/>'+
  '<text x="50" y="71" text-anchor="middle" font-family="Archivo,sans-serif" font-weight="900" font-size="'+(String(label==null?'?':label).length>3?20:24)+'" fill="'+(label==null?'var(--muted)':'#16202F')+'">'+esc(label==null?'?':String(label))+'</text></svg>'}
function ringSVG(pct,size){const L=2*Math.PI*40,on=pct!=null;
  return '<svg class="gm-ring" width="'+size+'" height="'+size+'" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="40" fill="none" stroke="var(--line)" stroke-width="10"/>'+
    (on&&pct>0?'<circle cx="50" cy="50" r="40" fill="none" stroke="var(--green)" stroke-width="10" stroke-linecap="round" stroke-dasharray="'+(L*pct/100).toFixed(1)+' '+L.toFixed(1)+'" transform="rotate(-90 50 50)"/>':'')+
    '<text x="50" y="58" text-anchor="middle" font-family="Archivo,sans-serif" font-weight="900" font-size="22" fill="'+(on?'var(--ink)':'var(--muted)')+'">'+(on?pct+'%':'–')+'</text></svg>'}
const nums=a=>'<div class="gm-mnums">'+a.map(([v,l])=>'<span><b>'+esc(typeof v==='number'?EU(v):String(v))+'</b>'+esc(l)+'</span>').join('')+'</div>';
const modeCard=(icon,title,count,body,cls)=>'<div class="gm-mode'+(cls?' '+cls:'')+'"><span class="gm-mico">'+icon+'</span><div class="gm-mtxt"><div class="gm-mhd"><b>'+title+'</b><small>'+esc(count)+'</small></div>'+body+'</div></div>';
// the Daily card: the cup with your best place in the daily rankings (it fills in as the rankings are read)
function dailyCard(o){const u=who(),d=o.daily,P=u?places(o.lbs)||[]:[],got=P.filter(x=>x.p[0]>0);
  const b=got.slice().sort((x,y)=>x.p[0]-y.p[0]||y.p[1]-x.p[1]||(x.d<y.d?1:-1))[0],r=b&&b.p[0];
  const count=d.n+' '+d.unit+(d.n===1?'':'s'),stats=[[r?'#'+r:'–','best rank'],[d.streak,'streak'],[d.avg,'average']];
  const foot=u===null?'<button class="linkbtn gm-msign" data-gm-signin>Sign in to join the daily ranking</button>'
    :r?'<span class="gm-mfoot">'+ordinal(r)+' of '+b.p[1]+' · '+esc(o.num(b.d))+' · '+(b.d===T()?'today, so far':shortDate(b.d))+'</span>':'';
  return modeCard(cupSVG(r?(r<=3?r:1):0,r?'#'+r:'?',64),'Daily',count,nums(stats)+foot)}
/* My stats, the same in every game: you (name, games, GeoPass countries visited), then one card per way to play:
   Daily (the cup), Solo (the medal), With friends (the ring of wins), then anything the game adds (o.extra).
   o: {game, lbs: [{path, dates}], dates, num: date → 'Puzzle #14',
       daily: {n, unit, streak, avg}, solo: {n, unit, medal, stats: [[value, label] ×3]},
       friends: {n, w, place, third: [value, label]}, extra} */
const CARDS={};let cardN=0;
function statsPage(o){const id='c'+(++cardN);CARDS[id]=o;const s=o.solo,f=o.friends,u=who();
  const all=o.daily.n+s.n+f.n,first=o.dates.slice().sort()[0],nm=(u&&name)||G.traveller();
  const me='<div class="gm-me"><span class="gm-av">'+esc((nm.trim()[0]||'·').toUpperCase())+'</span><div class="gm-mett"><b>'+esc(nm)+'</b><small>'+esc(o.game)+' · '+all+' game'+(all===1?'':'s')+(first?'<br>since '+shortDate(first):'')+'</small></div>'+
    '<div class="gm-mest"><b>'+EU((G.countriesSeen&&G.countriesSeen())||0)+'</b><small>countries</small></div></div>';
  const solo=modeCard(medalSVG(s.n?s.medal:null,64),'Practice',s.n+' '+s.unit+(s.n===1?'':'s'),s.n?nums(s.stats):'<span class="gm-mfoot">Practice at your pace: your best and your accuracy show here.</span>');
  const fr=modeCard(ringSVG(f.n?Math.round(f.w/f.n*100):null,64),'With friends',f.n+' game'+(f.n===1?'':'s'),
    f.n?nums([[f.w,f.w===1?'win':'wins'],[EU(f.place/f.n,1),'avg place'],f.third]):'<span class="gm-mfoot">Play online with 2 to 6 friends: your wins show here.</span>');
  return '<div class="gm-stats">'+me+'<div data-gm-card="'+id+'">'+dailyCard(o)+'</div>'+solo+fr+(o.extra||'')+'</div>'}
function drawTrophies(){document.querySelectorAll('[data-gm-card]').forEach(el=>{const o=CARDS[el.dataset.gmCard];if(!o)return;
  const h=dailyCard(o);if(el.innerHTML!==h)el.innerHTML=h})}
// bars for a game's levels: [[name, percent, games, colour]]
function levelBars(title,rows){rows=rows.filter(r=>r[2]);if(rows.length<2)return '';
  return '<div class="gm-levels"><span class="label">'+esc(title)+'</span>'+rows.map(([n,p,g,c])=>'<div class="gm-lv"><span>'+esc(n)+'</span><i><b style="width:'+p+'%;background:var(--'+c+')"></b></i><small>'+p+'% · '+g+'</small></div>').join('')+'</div>'}
// the longest run of days in a row, and when it ran ("2 – 12 Oct")
function bestRun(dates){const n=k=>Math.round(Date.parse(k+'T12:00Z')/864e5),ds=dates.slice().sort();let best=0,from='',to='',run=0,start='',prev=null;
  for(const d of ds){run=prev!==null&&n(d)===prev+1?run+1:1;if(run===1)start=d;prev=n(d);if(run>best){best=run;from=start;to=d}}
  return {n:best,when:best>1?shortDate(from).replace(/ \w+$/,m=>from.slice(5,7)===to.slice(5,7)?'':m)+' – '+shortDate(to):best?shortDate(from):''}}

/* ---- what the pages show ---- */
const noBanner=()=>ls.get('gm-nobanner')==='1';
// under Mingo on a game's home screen: who's playing, and the sign-in banner for guests (as in Countries).
// A guest plays with the name typed in any game (bl-user, the same everywhere) and can change it here.
function trialLine(){const t=trialState();return t.over?'Sign in to keep playing. Geomingo is free.':'Guest day '+t.day+' of '+t.max+'. After that, sign in to keep playing. Geomingo is free.'}
function userHTML(){const u=who();
  if(u)return '<div class="userline"><span class="pin" style="background:var(--sea)"></span>Playing as '+esc(name||'…')+'</div>';
  const signin=u===null;
  return '<div class="userline"><span class="pin" style="background:var(--sea)"></span>Playing as '+esc(G.traveller())+'<button class="ghost" data-gm-chname>Change</button>'+(signin&&noBanner()?'<span class="uright"><button class="ghost" data-gm-signin>Sign in</button></span>':'')+'</div>'+
    (signin&&!noBanner()?'<div class="gbanner"><span>'+trialLine()+'</span><button class="primary" data-gm-signin>Sign in</button><button class="linkbtn" data-gm-nobanner aria-label="Close">✕</button></div>':'')}
// a guest's name: one small window, saved for every game on this device
function changeName(then){const cur=G.traveller()==='Guest'?'':G.traveller();
  const box=G.openWindow('<div class="gm-res gm-namebox"><div class="gm-band">'+bico('user')+'<b>Who\'s playing?</b></div><div class="gm-rbody">'+
    '<label class="gm-lab" for="gm-gname">Your name</label><input id="gm-gname" class="gm-input" maxlength="16" autocomplete="nickname" placeholder="Your name" value="'+esc(cur)+'">'+
    '<p class="gm-note" style="text-align:left">Shown on your ticket, in rooms with friends and on the result you share, in every game. It stays on this device.</p>'+
    '<button class="gm-big coral" data-gm-act="saveg">Save</button></div></div>','Your name');
  const inp=box.querySelector('#gm-gname'),save=()=>{const n=inp.value.trim().slice(0,16);if(!n){say('Type a name to continue.');return}
    ls.set('bl-user',n);ls.set('cc-user',n);G.closeWindow();G.refreshPass();if(typeof then==='function')then(n);changed('name')};
  box._acts={saveg:save};inp.addEventListener('keydown',e=>{if(e.key==='Enter')save()});setTimeout(()=>inp.focus(),50)}
// the ONE header button (Héctor 2026-11-15, option A with ▾): your initial, or "Sign in" for a guest; both open the Menu
const CHEV='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
function acctHTML(){const u=who();if(u===undefined)return '';
  if(!u)return '<button class="gm-acct" data-gm-acctmenu aria-haspopup="dialog" aria-label="Menu and sign in">Sign in'+CHEV+'</button>';
  const n=name||u.displayName||'';
  return '<button class="gm-acct me" data-gm-acctmenu aria-haspopup="dialog" aria-label="Menu. Your account: '+esc(n)+'" title="'+esc(n)+'"><span class="av">'+esc((n.trim()[0]||'·').toUpperCase())+'</span>'+CHEV+'</button>'}
/* the Menu, the same on the home page and in every game (Héctor 2026-11-15, option D): your account on top, then GeoPass, Ranking, Archive, Send feedback.
   FAQ, Contact, Privacy and Sources are in the line of links at the bottom of the home page (G.openFaq, G.openFeedback, G.openCredits).
   Each game's own "Menu" button keeps How to play, its stats and its sources. */
const CONTACT_EMAIL='hello@geomingo.com';
const HOME_URL=(()=>{try{const s=document.querySelector('script[src*="brand/account.js"]');return new URL('../',s.src).href}catch(e){return '/'}})();
const MICO={help:'<circle cx="12" cy="12" r="9"/><path d="M12 17v.01M12 13.5a1.5 1.5 0 0 1 1-1.5a2.6 2.6 0 1 0-3-4"/>',
  cal:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  stats:'<path d="M4 20h16M7 16v-4M12 16V8M17 16v-6"/>',gp:'<rect x="5" y="3" width="14" height="18" rx="2"/><circle cx="12" cy="11" r="3.5"/><path d="M9 17h6"/>',
  rank:'<path d="M6 20V11M12 20V5M18 20v-6"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',ch:'<path d="M9 6l6 6-6 6"/>'};
const mico=(k,n)=>'<svg width="'+(n||20)+'" height="'+(n||20)+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+MICO[k]+'</svg>';
// the gold line icon in a window's top band (Héctor 2026-11-15, option C: no Mingo head there)
const BICO={menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',faq:'<circle cx="12" cy="12" r="9"/><path d="M12 17v.01M12 13.5a1.5 1.5 0 0 1 1-1.5a2.6 2.6 0 1 0-3-4"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',shield:'<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9c-4.6-1-8-4.5-8-9V6z"/>',
  book:'<path d="M4 5a2 2 0 0 1 2-2h5v17H6a2 2 0 0 0-2 2zM20 5a2 2 0 0 0-2-2h-5v17h5a2 2 0 0 1 2 2z"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'};
const bico=k=>'<svg class="gm-bico" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+BICO[k]+'</svg>';
const WICO={'Menu':'menu','FAQ':'faq','Contact':'mail','Send feedback':'mail','Privacy':'shield','Sources':'book'};
function mwin(title,body,acts){const box=G.openWindow('<div class="gm-res hw"><div class="gm-band">'+(WICO[title]?bico(WICO[title]):'')+'<b>'+esc(title)+'</b></div><div class="gm-rbody">'+body+
  '<button class="gm-text" data-gm-act="close">Close</button></div></div>',title);
  box._acts=acts||{};box.addEventListener('click',e=>{if(e.target.closest('[data-gm-signin],[data-gm-signout]'))G.closeWindow()});
  const f=box.querySelector('a,button');if(f)f.focus({preventScroll:true});return box}
function openMenu(){const u=who();let km=0;try{km=G.geo().km}catch(e){}
  const nm=u?(name||u.displayName||'').trim():'';
  const box=u===undefined?'':u?'<div class="acctbox"><span class="av" aria-hidden="true">'+esc((nm[0]||'·').toUpperCase())+'</span><span class="nm"><b>'+esc(nm||'Traveller')+'</b><button class="chn" data-gm-act="chname">Change name</button></span><button class="out" data-gm-signout>Sign out</button></div>'
    :'<div class="acctbox guest"><span class="nm"><b>Guest traveller</b><span>Saved on this phone only.</span></span><button class="gbtn" data-gm-signin><i aria-hidden="true">G</i>Continue with Google</button></div>';
  const it=(act,c,ic,t,sub,end)=>'<li><button class="it" data-gm-act="'+act+'" style="--c:'+c+'"><span class="ic">'+mico(ic)+'</span><span class="tx">'+t+(sub?'<small>'+sub+'</small>':'')+'</span>'+(end||'<span class="ch">'+mico('ch',18)+'</span>')+'</button></li>';
  // in a game (Héctor 2026-11-15, option B: the games' own ☰ is gone): that game's lines on top, then Geomingo's, no subtitles
  const g=GM,sub=t=>g?'':t,acts={};
  let game='';if(g){g.items.forEach((x,i)=>{acts['g'+i]=()=>{G.closeWindow();x[3]()}});
    game='<h5 class="gh">'+esc(g.name)+'</h5><ul>'+g.items.map((x,i)=>it('g'+i,x[2],x[1],x[0],'')).join('')+'</ul><h5 class="gh">Geomingo</h5>'}
  mwin('Menu',box+game+'<ul>'+it('gp','#D4AD4B','gp','My GeoPass',sub('Km, streak, countries and visas'),'<span class="mt">'+EU(Math.round(km))+' km</span>')+
    it('rank','#5FC28F','rank','Ranking',sub('Today, this week, this month'))+
    it('arch','#7FA2F0','cal','Archive',sub('Play past days of all '+G.ALLW+' games'))+
    it('fb','#F07884','mail','Send feedback',sub('Ideas, mistakes, anything'))+'</ul>'+
    (g&&g.sources?'<button class="gm-text msrc" data-gm-act="gsrc">'+esc(g.name)+' data sources</button>':''),
    Object.assign(acts,{chname:changeMyName,gp:()=>G.openPass('passport'),fb:openFeedback,gsrc:()=>{G.closeWindow();g.sources()},
     // Archive: a calendar of past days on the home page, for all the games (Héctor 2026-11-15); from a game it opens the home page there
     arch:()=>{G.closeWindow();if(typeof G.showArchive==='function')G.showArchive();else location.href=HOME_URL+'#archive'},
     // the ranking is on the home page: there it scrolls to it, from a game it opens the home page at the ranking
     rank:()=>{G.closeWindow();if(typeof G.showRanking==='function')G.showRanking();else location.href=HOME_URL+'#ranking'}}))}
// a game tells the Menu its own lines: setGameMenu({name:'Countries',items:[[label,icon,colour,fn],…],sources:fn})
let GM=null;function setGameMenu(o){GM=o}
// Send feedback (Menu) and Contact (bottom of the home page): one small window that opens an email
function openFeedback(title){const m='mailto:'+CONTACT_EMAIL+'?subject='+encodeURIComponent('Geomingo feedback');
  mwin(typeof title==='string'?title:'Send feedback','<div class="fb"><p>Found a mistake, have an idea for a game or just want to say hi? We read every message.</p>'+
    '<a class="gm-big coral" href="'+m+'">Write to us</a><p class="fbm">'+esc(CONTACT_EMAIL)+'</p></div>')}
// Privacy: the same window as FAQ and Sources, filled from the privacy/ page (the one text; that page keeps its own address for Google)
function openPrivacy(){fetch(HOME_URL+'privacy/').then(r=>{if(!r.ok)throw 0;return r.text()}).then(t=>{
  const d=new DOMParser().parseFromString(t,'text/html'),w=d.querySelector('.wrap');if(!w)throw 0;
  w.querySelectorAll('.back,h1,script').forEach(e=>e.remove());mwin('Privacy','<div class="priv">'+w.innerHTML+'</div>')})
  .catch(()=>{location.href=HOME_URL+'privacy/'})}
// About & FAQ: what Geomingo is, then the common questions (tap one to open its answer)
const FAQ=[
  ['When do new games come out?','Every day at midnight CET. Everyone in the world gets the same puzzles that day.'],
  ['How do I play?','Tap a game in Today\'s itinerary. Inside a game, Menu → How to play has its rules.'],
  ['What are the km?','Each daily game moves you up to 100 km, +20 km for a perfect game and +50 km for playing all nine. Your km fill your GeoPass and count for the ranking.'],
  ['What is in my GeoPass?','Four things. Km take you up 7 levels, from Tourist to Legend (250.000 km). Your streak: one daily a day, with one rest day a week. Countries, from the daily only: visited when you get one right in 1 game, known in 3 different games, expert in 5. Visas: one per game (Bronze, Silver, Gold, Platinum by days played), special ones and hard challenges.'],
  ['Is there an unlimited mode?','Yes, Practice. Random puzzles with the daily rules, as many as you like, with 5 lives or unlimited. Practice gives points but no km.'],
  ['Can I play with friends?','Yes. Tap With friends, create a room (you need to sign in) and share the code. Up to 6 players, the host picks the game and the points add up.'],
  ['Do I need an account?','Not at first: you can play 3 days as a guest. Then sign in with Google to keep playing. It\'s free, and your GeoPass follows you to any phone.'],
  ['Is there an app?','Not yet. Add geomingo.com to your home screen and it opens like an app.']];
function openFaq(){mwin('FAQ','<div class="faq"><div class="fqa"><h3>What is Geomingo?</h3><p>Geomingo is a free daily geography game: nine short games every day, from naming countries and capitals to guessing a country by its shape or spotting the lie about it. Every daily game moves you up to 100 km in your GeoPass. Play today\'s trip alone, practise as much as you like, or open a room and play with friends.</p></div>'+
  '<div class="fql">'+FAQ.map((q,i)=>'<details><summary><i>'+String(i+1).padStart(2,'0')+'</i><span>'+esc(q[0])+'</span></summary><p>'+esc(q[1])+'</p></details>').join('')+'</div></div>')}
// the sources used by all the games (each game's Menu adds its own)
function openCredits(){mwin('Sources','<div class="credits"><ul>'+
  '<li>Country data (names, borders, regions, area, languages, currencies, capitals): <a href="https://github.com/mledoze/countries" target="_blank" rel="noopener">mledoze/countries</a>, under the Open Database License (ODbL) 1.0, with a few corrections by hand.</li>'+
  '<li>Population, development, economy, politics, geography and sport figures: Wikipedia lists (CC BY-SA 4.0), which cite the UN, the UNDP, the World Bank and the CIA World Factbook among others.</li>'+
  '<li>Flags: <a href="https://github.com/lipis/flag-icons" target="_blank" rel="noopener">flag-icons</a> (MIT License).</li>'+
  '<li>Fonts: Archivo, Public Sans and Courier Prime (Google Fonts, SIL Open Font License).</li>'+
  '<li>Accounts, online play and rankings: <a href="https://firebase.google.com" target="_blank" rel="noopener">Firebase</a>.</li></ul>'+
  '<p>Each game\'s Menu lists its own extra sources.</p></div>')}
document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('[data-gm-signin],[data-gm-chname],[data-gm-nobanner],[data-gm-acctmenu],[data-gm-signout]');if(!t)return;
  e.preventDefault();
  if(t.hasAttribute('data-gm-signin'))signIn();
  else if(t.hasAttribute('data-gm-chname'))changeName();
  else if(t.hasAttribute('data-gm-nobanner')){ls.set('gm-nobanner','1');changed()}
  else if(t.hasAttribute('data-gm-acctmenu'))openMenu();
  else if(t.hasAttribute('data-gm-signout'))signOut()});

// something changed: the header buttons are redrawn here; the page redraws itself (onChange) unless you are typing
function changed(why){trialCheck();document.querySelectorAll('[data-gm-acctslot]').forEach(el=>{const h=acctHTML();if(el.innerHTML!==h)el.innerHTML=h});drawTrophies();
  const a=document.activeElement,typing=a&&(a.tagName==='INPUT'||a.tagName==='TEXTAREA')&&!a.closest('#gm-window');
  watchers.forEach(f=>{try{f(why||'',typing)}catch(e){console.error(e)}})}

G.acctHTML=acctHTML;G.openMenu=openMenu;G.openFaq=openFaq;G.openCredits=openCredits;G.openFeedback=openFeedback;G.openPrivacy=openPrivacy;G.setGameMenu=setGameMenu;
// ready/user: known for sure, or the last account seen on this device until Firebase answers (wasSignedIn: that last one)
G.account={get ready(){return who()!==undefined},get user(){return who()||null},get name(){return name},
  wasSignedIn:!!(LAST&&LAST.u),get trial(){return trialState()},trialLine,
  signIn,signOut,done,userHTML,changeName,nameOf,fmtName,backfill,firstName,nameProblem,nameFree,changeMyName,rankingHTML,rankLine,mine,statsPage,levelBars,bestRun,onChange:f=>watchers.push(f)};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
