/* With friends for the clue games (Customs, Flag Pie, Impostor, Compass): online rooms in the Geomingo Firebase
   database (rooms/ABCD, next to the other games' rooms; the rules need no change).
   Everyone in a room plays the same set (dealt from the room's seed) at the same time, each on their own phone, at
   their own pace, with no lives (Héctor, 2026-11-02: no lives with friends). The others' points show live on chips.
   Ranking: more points, then more right, then the faster finish. Then anyone can start the next game.
   Load after ../shared/minigames.js and the Firebase scripts + firebase-config.js. Uses the page's header(), toast(),
   esc(), $(), pageLink(), logFriends(), share(), SHARE_BTN.

   const R = GeoRace({
     game: 'customs', key: 'cu', name: 'Customs',            // room tag, localStorage prefix, title
     total: 5, what: 'the same five travellers',              // items per game, for the texts
     deal: seed => G,                                         // a new game from the room's seed (same for everyone)
     points: G => n, right: G => n,                           // the game's score and how many it got right
     shareLine: G => '🟩🟨…',                                 // the squares for the share text
     render: () => {}                                         // redraw the page
   });
   R.view(): 'friends' | 'room' | null — what to draw; R.G the game being played in the room; R.save() after every move. */
(function(){
const FB_OK=typeof firebase!=='undefined'&&!!(window.FIREBASE_CONFIG&&FIREBASE_CONFIG.apiKey);
const MAX=6;
const ls={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},
  set(k,v){try{v==null?localStorage.removeItem(k):localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const randRoom=()=>Array.from({length:4},()=>'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random()*24)]).join('');
const fmtTime=ms=>{const s=Math.round((ms||0)/1000);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};
const pinStyle=i=>`background:var(--p${i%6})`;

window.GeoRace=function(cfg){
  const K=cfg.key,ROOMKEY=K+'-room';
  const ME=(()=>{let id=ls.get(K+'-pid','');if(!id){id=Math.random().toString(36).slice(2,12);ls.set(K+'-pid',id)}return id})();
  const R={G:null,code:null,room:null,screen:null,armed:false,FB_OK};
  let db=null,offset=0,ref=null,joining=false,joinCode='',lastPush='';
  let myName=ls.get(K+'-name','')||(()=>{const n=(Geomingo.traveller&&Geomingo.traveller())||'';return n==='Guest'?'':n.slice(0,16)})();
  const now=()=>Date.now()+offset;
  const TS=()=>firebase.database.ServerValue.TIMESTAMP;
  function initFB(){if(!FB_OK)return false;if(db)return true;
    try{if(!firebase.apps.length)firebase.initializeApp(FIREBASE_CONFIG);db=firebase.database();
      db.ref('.info/serverTimeOffset').on('value',s=>{offset=s.val()||0});
      // back online: mark me as here again, and as away when the connection drops
      db.ref('.info/connected').on('value',s=>{if(!s.val()||!ref)return;const r=ref,on=r.child('players/'+ME+'/on');
        on.onDisconnect().set(false);r.child('players/'+ME).once('value',p=>{if(p.exists()&&r===ref)on.set(true)})})}
    catch(e){console.error(e);return false}
    return true}
  const order=r=>Object.keys((r&&r.players)||{}).filter(k=>r.players[k].name).sort((a,b)=>(r.players[a].t||0)-(r.players[b].t||0));
  function needName(){const el=$('fname');if(el)myName=el.value.trim().slice(0,16);
    if(!myName){toast('Type your name first.','bad');if(el)el.focus();return true}
    ls.set(K+'-name',myName);return false}
  async function create(){if(needName())return;
    if(!initFB()){toast('Online play could not load. Check the connection and reload the page.','bad');return}
    try{let code='';
      for(let i=0;i<8;i++){code=randRoom();const ex=await db.ref('rooms/'+code).get();if(!ex.exists())break}
      await db.ref('rooms/'+code).set({game:cfg.game,host:ME,created:TS(),status:'lobby',round:0,players:{[ME]:{name:myName,t:TS(),on:true}}});
      listen(code)}
    catch(e){console.error(e);toast('Could not create the room. Check the connection and try again.','bad')}}
  async function join(raw){const code=(raw||'').toUpperCase().replace(/[^A-Z]/g,'');
    if(code.length!==4){toast('Room codes have 4 letters.','bad');return}
    if(needName())return;
    if(!initFB()){toast('Online play could not load. Check the connection and reload the page.','bad');return}
    if(joining)return;joining=true;
    try{let why='';
      // late arrivals are welcome: they play the current set (their time still counts from the start)
      const res=await db.ref('rooms/'+code).transaction(r=>{why='';if(!r)return r;
        if(r.game!==cfg.game){why='other';return}
        r.players=r.players||{};
        if(r.players[ME]&&r.players[ME].name){r.players[ME].name=myName;r.players[ME].on=true;return r}
        if(order(r).length>=MAX){why='full';return}
        r.players[ME]={name:myName,t:now(),on:true};return r});
      const val=res.snapshot.val();
      if(!val){toast('No room called '+code+'. Check the code.','bad');return}
      if(why==='other'||val.game!==cfg.game){toast(code+' is a room of another game. Open that game to join it.','bad');return}
      if(!res.committed||!val.players||!val.players[ME]){toast(why==='full'?`Room ${code} already has ${MAX} players.`:'Could not join '+code+'.','bad');return}
      joinCode='';listen(code)}
    catch(e){console.error(e);toast('Could not join. Check the connection and try again.','bad')}
    finally{joining=false}}
  const myDone=r=>{const p=r&&r.players&&r.players[ME];return !!(r&&r.status==='play'&&p&&p.r===r.round&&p.done)};
  // resume: reopening the page goes back to the room you were in; if it is gone, quietly to today's game
  function listen(code,resume){if(ref)ref.off();
    R.code=code;ref=db.ref('rooms/'+code);ls.set(ROOMKEY,code);Geomingo.room.seen(ROOMKEY);R.screen='room';R.armed=false;
    const r0=ref;let first=true;
    r0.child('players/'+ME+'/on').onDisconnect().set(false);
    r0.on('value',snap=>{if(r0!==ref)return;const r=snap.val();
      if(!r||!r.players||!r.players[ME]||!r.players[ME].name){const was=R.code;drop();
        if(resume&&first)R.screen=null;else{R.screen='friends';toast(r?'You are no longer in room '+was+'.':'Room '+was+' was closed.','bad')}
        cfg.render();return}
      if(resume&&first&&!Geomingo.room.resume(ROOMKEY,myDone(r))){drop();R.screen=null;cfg.render();return}
      first=false;R.room=r;Geomingo.room.seen(ROOMKEY);sync()})}
  function drop(){if(ref){ref.off();try{ref.child('players/'+ME+'/on').onDisconnect().cancel()}catch(e){}}
    R.room=null;ref=null;R.code=null;R.G=null;Geomingo.room.forget(ROOMKEY)}
  async function leave(){const r0=ref;
    if(r0){try{await r0.transaction(x=>{if(!x||!x.players)return x;
      // in the lobby you leave the list; during a game your result stays, marked offline. Nobody left: the room is deleted
      if(x.status==='lobby')delete x.players[ME];else if(x.players[ME])x.players[ME].on=false;
      const here=order(x).filter(k=>x.players[k].on!==false);if(!here.length)return null;
      if(x.host===ME)x.host=here[0];return x})}catch(e){}}
    drop();ls.set(K+'-online',null);R.screen='friends';cfg.render()}
  function sync(){const r=R.room;
    if(r.status==='play'&&r.seed!=null){
      if(!R.G||R.G.code!==R.code||R.G.round!==r.round){const k=ls.get(K+'-online',null);
        R.G=k&&k.code===R.code&&k.round===r.round&&k.G?k.G:cfg.deal(r.seed);
        if(R.G){R.G.mode='online';R.G.code=R.code;R.G.round=r.round;R.armed=false;R.save()}}}
    else R.G=null;
    if(R.screen==='room')cfg.render()}
  // after every move: keep the game on this phone and tell the others (points, right, where I am, done, time)
  R.save=function(){const G=R.G;if(!G||!ref||G.code!==R.code)return;
    if(G.over&&G.ms==null)G.ms=Math.max(0,now()-((R.room&&R.room.startAt)||now()));
    ls.set(K+'-online',{code:R.code,round:G.round,G});
    const p={r:G.round,s:cfg.points(G),ok:cfg.right(G),at:Math.min(cfg.total,(G.left!=null?G.left:G.sel)+1),done:!!G.over,on:true};if(G.over)p.ms=G.ms||0;
    // only when something changed (the page calls this on every redraw)
    const sig=R.code+JSON.stringify(p);if(sig===lastPush)return;lastPush=sig;
    ref.child('players/'+ME).update(p).catch(()=>{lastPush=''})};
  // the host starts the first game; after a game anyone can start the next one once everyone has finished
  async function start(){if(!ref||!R.room)return;
    const seed=Math.floor(Math.random()*1e9),round=(R.room.round||0)+1;
    try{await ref.transaction(x=>{if(!x)return x;if((x.round||0)>=round)return;x.status='play';x.round=round;x.seed=seed;x.startAt=now();return x})}
    catch(e){toast('Could not start the game. Check the connection.','bad')}}
  const players=()=>order(R.room).map((pid,i)=>{const p=R.room.players[pid];return {pid,i,...p,cur:p.r===R.room.round}});
  const key=p=>!p.cur?[1,0,0,0]:[0,-(p.s||0),-(p.ok||0),p.done?(p.ms||0):1e12];
  const ranked=()=>players().sort((a,b)=>{const x=key(a),y=key(b);for(let i=0;i<4;i++)if(x[i]!==y[i])return x[i]-y[i];return 0});
  R.view=()=>R.screen;
  R.me=()=>myName||'Guest';
  R.open=()=>{R.screen=R.code?'room':'friends';cfg.render();window.scrollTo(0,0)};
  R.inGame=()=>R.screen==='room'&&R.room&&R.room.status==='play'&&!!R.G;
  // the chips above the game: everyone's points and where they are
  R.scoresHTML=()=>`<div class="scores" aria-label="Players">${players().map(p=>`<span class="chip${p.cur&&p.done?' done':''}${p.on===false?' off':''}"><span class="pin" style="${pinStyle(p.i)}"></span>${esc(p.name)}<small>${!p.cur?'joining':(p.s||0)+' pts'+(p.done?' ✓':' · '+(p.at||1)+'/'+cfg.total)}</small></span>`).join('')}</div>`;
  R.friendsHTML=()=>cfg.header(cfg.name,'')+`<section class="panel">
    <div class="backline"><button class="linkbtn" id="home">← Back</button><span class="ht">With friends</span></div>
    <p class="hint">Play online, 2 to ${MAX} players, each on their own phone. Everyone gets ${cfg.what} at the same time and sees how the others are doing.</p>
    <div class="field"><label class="label" for="fname">Your name in the room</label><input class="nameinp" id="fname" maxlength="16" autocomplete="nickname" placeholder="Your name" value="${esc(myName)}"></div>
    ${FB_OK?'':'<p class="hint">Online play could not load. Check the connection and reload the page.</p>'}
    <div class="field"><button class="primary" id="create" ${FB_OK?'':'disabled'}>Create room</button></div>
    <div class="field"><label class="label" for="jcode">Join a friend's room</label><div class="joinrow"><input class="code-in" id="jcode" placeholder="ABCD" maxlength="4" value="${esc(joinCode)}" autocomplete="off"><button class="ghost" id="join" ${FB_OK?'':'disabled'}>Join</button></div></div>
  </section>`;
  R.lobbyHTML=()=>{const r=R.room;
    if(!r)return cfg.header(cfg.name,'')+'<section class="panel"><p class="hint">Connecting to the room…</p></section>';
    const o=order(r),host=r.host===ME;
    return cfg.header(cfg.name,'Room '+R.code)+`<section class="panel namecard">
    <div class="backline"><button class="linkbtn" id="leave">← Leave</button><span class="ht">With friends</span></div>
    <span class="label">Room code</span><p class="roomcode">${R.code}</p>
    <p class="hint">Friends open ${esc(cfg.name)}, choose <b>With friends</b> and type this code. Or send them the link:</p>
    <pre class="sharebox" id="linkbox">${esc(pageLink('?room='+R.code))}</pre>
    <button class="ghost" id="copylink">Copy link</button>
    <span class="label">Players ${o.length}/${MAX}</span>
    <div class="players">${o.map((pid,i)=>{const p=r.players[pid];return `<div class="lp ${p.on===false?'off':''}"><span class="pin" style="${pinStyle(i)}"></span>${esc(p.name)}<span class="tag">${[pid===r.host?'host':'',pid===ME?'you':'',p.on===false?'offline':''].filter(Boolean).join(' · ')}</span></div>`}).join('')}</div>
    <p class="hint">Everyone gets ${cfg.what} at the same time. No lives: play to the end at your own pace. Most points win, then the fastest.</p>
    ${host?`<button class="primary" id="ostart" ${o.length<2?'disabled':''}>${o.length<2?'Waiting for players…':'Start game'}</button>`:'<p class="hint">Waiting for the host to start the game.</p>'}
  </section>`};
  R.backHTML=()=>`<div class="backline"><button class="linkbtn" id="leave">${R.armed?'Tap again to leave':'← Leave'}</button><span class="ht">Room ${R.code} · game ${R.G?R.G.round:''}</span></div>`;
  R.shareText=()=>{const G=R.G;return Geomingo.share(cfg.name)+' (with friends) — '+cfg.points(G)+' points, '+cfg.right(G)+' of '+cfg.total+'\n'+cfg.shareLine(G)};
  // the room's ranking, live while the others finish; the next game starts when everyone still here is done
  R.resultHTML=()=>{const G=R.G,list=ranked(),cur=list.filter(p=>p.cur),pos=cur.findIndex(p=>p.pid===ME)+1;
    const waiting=cur.some(p=>!p.done&&p.on!==false);
    if(G.over&&!waiting)logFriends(K+'-friends',R.code+':'+G.round+':'+((R.room&&R.room.startAt)||''),pos,cfg.points(G),pos===1?G.ms:0);
    const win=pos===1&&!waiting;
    return `<section class="panel">${Geomingo.hello(win?'happy':'think',win?'You win.':waiting?cfg.points(G)+' points. Now wait for the others.':'Everyone has finished.',waiting?'Some players are still playing.':win?'Most points in the room.':'You came '+pos+(pos===2?'nd':pos===3?'rd':'th')+'.',{key:'res'})}
    <span class="label">Room ${R.code} · game ${G.round}</span><p class="big">${cfg.points(G)} points</p>
    <div class="players">${list.map((p,k)=>`<div class="lp${p.pid===ME?' me':''}${p.on===false?' off':''}"><span class="rk">${p.cur?k+1:''}</span><span class="pin" style="${pinStyle(p.i)}"></span>${esc(p.name)}<span class="tag">${!p.cur?'joining':p.done?`${p.s||0} pts · ${p.ok||0} of ${cfg.total} · ${fmtTime(p.ms)}`:p.on===false?'left':`${p.s||0} pts · playing…`}</span></div>`).join('')}</div>
    <pre class="sharebox" id="share">${esc(R.shareText())}</pre>
    ${SHARE_BTN}<div class="row-btns sharerow"><button class="primary" id="rematch" style="flex:1" ${waiting?'disabled':''}>${waiting?'Waiting for the others…':'Play again'}</button></div>
  </section>`};
  function copyText(t,ok){const manual=()=>{const el=$('linkbox');if(el){const r=document.createRange();r.selectNodeContents(el);const s=getSelection();s.removeAllRanges();s.addRange(r)}toast('Select the link and copy it.')};
    try{navigator.clipboard.writeText(t).then(()=>toast(ok,'good'),manual)}catch(e){manual()}}
  // the buttons of these screens (call from the page's bind())
  R.bind=()=>{
    if($('fname'))$('fname').oninput=e=>{myName=e.target.value.trim().slice(0,16)};
    if($('create'))$('create').onclick=create;
    if($('jcode')){$('jcode').oninput=e=>{joinCode=e.target.value};$('jcode').onkeydown=e=>{if(e.key==='Enter')join($('jcode').value)}}
    if($('join'))$('join').onclick=()=>join($('jcode').value);
    if($('copylink'))$('copylink').onclick=()=>copyText(pageLink('?room='+R.code),'Link copied.');
    if($('ostart'))$('ostart').onclick=start;
    if($('rematch'))$('rematch').onclick=start;
    if(R.screen==='room'&&R.G&&R.G.over&&$('copy'))$('copy').onclick=()=>share(R.shareText()+'\n\nPlay '+cfg.name+': '+pageLink());
    // leaving in the middle of a game asks first
    if($('leave'))$('leave').onclick=()=>{if(R.G&&!R.G.over&&!R.armed){R.armed=true;cfg.render();return}leave()}};
  // start: ?room=ABCD joins that room (invite links), ?friends opens With friends, else the room this phone was in
  R.boot=()=>{let q='',fr=false;try{const u=new URLSearchParams(location.search);q=u.get('room')||'';fr=u.has('friends')}catch(e){}
    const back=Geomingo.room.saved(ROOMKEY),clean=()=>{try{history.replaceState(null,'',location.pathname)}catch(e){}};
    if(q&&/^[A-Za-z]{4}$/.test(q)){clean();joinCode=q.toUpperCase();R.screen='friends';if(myName)join(joinCode);return true}
    if(back&&initFB()){listen(back,true);return true}
    if(fr){clean();R.screen='friends';return true}
    return false};
  R.leaveHome=()=>{if(R.code){leave();return true}R.screen=null;return false};
  // back from another app with a finished room still on screen a long time: leave it
  document.addEventListener('visibilitychange',()=>{if(document.hidden)return;if(R.code&&R.room&&Geomingo.room.stale(myDone(R.room)))leave()});
  return R};
})();
