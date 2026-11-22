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
   R.view(): 'friends' | 'room' | null — what to draw; R.G the game being played in the room; R.save() after every move.

   TURNS (Héctor 2026-11-21: every game with friends is played in turns, like Countries, Capitals and Top 10).
   One game for the whole room: a random player starts, then each player in order, 30 s a turn, no lives.
   The room keeps only the moves (mv: [{p: player, a: answer or '-' for a pass, t: 1 when the time ran out}]);
   every phone deals the same game from the seed and plays the moves on it with the game's own rules:
     prep: G => {},                    // once after the deal (e.g. the 20/15/10/5/3 points table)
     move: (G, a) => ({res, pts}),     // a = the answer (null: pass / I don't know / time up) on the current item;
                                       // res 'right' | 'wrong' | 'pass' | 'again' (same player tries again, nothing is sent)
     ansName: code => 'Kenya',         // an answer's name for the ticket line
     item: G => 'Traveller 2 of 5',    // where the game is, for the ticket line
     sol: (G, i) => code,              // item i's answer, said when nobody got it
     worth: G => 15,                   // what the current item is worth now
     said: (who, name) => '…'          // optional: the line for a wrong answer (default "Olga said Kenya: no.") */
(function(){
const FB_OK=typeof firebase!=='undefined'&&!!(window.FIREBASE_CONFIG&&FIREBASE_CONFIG.apiKey);
const MAX=6,TURN=30000;
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
  const ACN=()=>{const a=window.Geomingo&&Geomingo.account;return a&&a.user&&a.name?String(a.name).trim().slice(0,16):(Geomingo.party&&Geomingo.party.name())||''};
  function needName(){const an=ACN();if(an){myName=an;return false}const el=$('fname');if(el)myName=el.value.trim().slice(0,16);
    if(!myName){toast('Type your name first.','bad');if(el)el.focus();return true}
    ls.set(K+'-name',myName);return false}
  const SIGNED=()=>!!(window.Geomingo&&Geomingo.account&&Geomingo.account.user);
  async function create(){if(!SIGNED()&&!(Geomingo.party&&Geomingo.party.on())){Geomingo.account.signIn();return}  // from the With friends room the organiser may have no account
    if(needName())return;
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
  // turns: the room's game, dealt from the seed, with every move played on it; who scored what
  const movesOf=r=>{const m=r&&r.mv;return !m?[]:Array.isArray(m)?m.filter(Boolean):Object.keys(m).sort((a,b)=>a-b).map(k=>m[k])};
  function replay(r){const G=cfg.deal(r.seed);if(!G)return null;if(cfg.prep)cfg.prep(G);
    const sc={},ok={};let last=null;
    for(const m of movesOf(r)){if(G.over)break;const i=G.sel,a=m.a&&m.a!=='-'?m.a:null,res=cfg.move(G,a)||{};
      if(res.pts){sc[m.p]=(sc[m.p]||0)+res.pts;ok[m.p]=(ok[m.p]||0)+1}
      // who said each wrong answer (their place in the order = their colour), for games that show it (Compass)
      if(a&&res.res==='wrong'&&G.qs&&G.qs[i]){const q=G.qs[i];q.by=q.by||{};q.by[a]=(r.order||[]).indexOf(m.p)}
      last={p:m.p,a,t:!!m.t,res:res.res,pts:res.pts||0,i,done:G.sel!==i||G.over}}
    G.left=null;return {G,sc,ok,last}}
  const nextTurn=(x,from)=>{const o=x.order||[];for(let k=1;k<=o.length;k++){const j=(from+k)%o.length,p=x.players[o[j]];if(p&&p.on!==false)return j}return (from+1)%Math.max(1,o.length)};
  // a move on my turn (or a pass for whoever let the time run out): only if nothing moved since
  async function push(a,timeout){const r=R.room;if(!ref||!r||!r.order)return false;
    const n=movesOf(r).length,round=r.round,tEnd=r.tEnd;
    try{const res=await ref.transaction(x=>{if(!x||x.status!=='play'||x.round!==round||movesOf(x).length!==n||!x.order)return;
        const who=x.order[x.turn||0];if(timeout?(x.tEnd!==tEnd||now()<x.tEnd):who!==ME)return;
        const mv=movesOf(x);mv.push(timeout?{p:who,a:'-',t:1}:{p:ME,a:a||'-'});x.mv=mv;
        const g=replay(x);if(g&&g.G.over)x.tEnd=0;else{x.turn=nextTurn(x,x.turn||0);x.tEnd=now()+TURN}
        return x},undefined,false);
      return res.committed}
    catch(e){if(!timeout)toast('That did not go through. Check the connection.','bad');return false}}
  let tick=null,T0=null;
  function onTick(){const r=R.room;if(!R.T||!r||r.status!=='play'||!r.tEnd||R.T.G.over){clearInterval(tick);tick=null;return}
    const left=r.tEnd-now(),bar=document.querySelector('.tk-track .tbar'),sub=document.getElementById('tleft');
    if(bar){bar.style.width=Math.max(0,Math.min(100,left/TURN*100))+'%';bar.classList.toggle('low',left<=5000)}
    if(sub)sub.textContent=Geomingo.mmss(Math.min(left,TURN));
    // the player whose turn it is passes when the time runs out; if that phone has gone, anyone does, a little later
    if(left<=(r.order[r.turn||0]===ME?-300:-2500)&&T0!==r.tEnd){T0=r.tEnd;push(null,true).then(ok=>{if(!ok)setTimeout(()=>{if(T0===r.tEnd)T0=null},3000)})}}
  function sync(){const r=R.room;
    if(r.status==='play'&&r.seed!=null&&r.order&&cfg.move){R.T=replay(r);R.G=R.T&&R.T.G;
      if(R.G){R.G.mode='online';R.G.code=R.code;R.G.round=r.round;R.armed=false;R.save()}
      if(!tick&&R.G&&!R.G.over)tick=setInterval(onTick,250)}
    else if(r.status==='play'&&r.seed!=null){R.T=null;
      if(!R.G||R.G.code!==R.code||R.G.round!==r.round){const k=ls.get(K+'-online',null);
        R.G=k&&k.code===R.code&&k.round===r.round&&k.G?k.G:cfg.deal(r.seed);
        if(R.G){R.G.mode='online';R.G.code=R.code;R.G.round=r.round;R.armed=false;R.save()}}}
    else{R.G=null;R.T=null}
    if(R.screen==='room')cfg.render()}
  // after every move: keep the game on this phone and tell the others (points, right, where I am, done, time)
  R.save=function(){const G=R.G;if(!G||!ref||G.code!==R.code)return;
    if(R.T){const p={r:G.round,s:R.T.sc[ME]||0,ok:R.T.ok[ME]||0,done:!!G.over,on:true};
      const sig=R.code+JSON.stringify(p);if(sig===lastPush)return;lastPush=sig;ref.child('players/'+ME).update(p).catch(()=>{lastPush=''});return}
    if(G.over&&G.ms==null)G.ms=Math.max(0,now()-((R.room&&R.room.startAt)||now()));
    ls.set(K+'-online',{code:R.code,round:G.round,G});
    const p={r:G.round,s:cfg.points(G),ok:cfg.right(G),at:Math.min(cfg.total,(G.left!=null?G.left:G.sel)+1),done:!!G.over,on:true};if(G.over)p.ms=G.ms||0;
    // only when something changed (the page calls this on every redraw)
    const sig=R.code+JSON.stringify(p);if(sig===lastPush)return;lastPush=sig;
    ref.child('players/'+ME).update(p).catch(()=>{lastPush=''})};
  // the host starts the first game; after a game anyone can start the next one once everyone has finished
  async function start(){if(!ref||!R.room)return;
    const seed=Math.floor(Math.random()*1e9),round=(R.room.round||0)+1;
    try{await ref.transaction(x=>{if(!x)return x;if((x.round||0)>=round)return;x.status='play';x.round=round;x.seed=seed;x.startAt=now();
      // turns: the players here now, a random one starts (Héctor 2026-11-21)
      const ord=order(x).filter(k=>x.players[k].on!==false);x.order=ord;x.turn=Math.floor(Math.random()*ord.length);x.mv=null;x.tEnd=x.startAt+TURN+1000;
      return x},undefined,false)}  // false: not shown before the server agrees (a progress write meanwhile would cancel the start)
    catch(e){toast('Could not start the game. Check the connection.','bad')}}
  const players=()=>order(R.room).map((pid,i)=>{const p=R.room.players[pid];
    if(R.T){const o=R.room.order||[];return {pid,i,...p,cur:o.includes(pid),s:R.T.sc[pid]||0,ok:R.T.ok[pid]||0,done:!!R.G.over,ms:0}}
    return {pid,i,...p,cur:p.r===R.room.round}});
  const myPts=G=>R.T?R.T.sc[ME]||0:cfg.points(G);
  const key=p=>!p.cur?[1,0,0,0]:[0,-(p.s||0),-(p.ok||0),p.done?(p.ms||0):1e12];
  const ranked=()=>players().sort((a,b)=>{const x=key(a),y=key(b);for(let i=0;i<4;i++)if(x[i]!==y[i])return x[i]-y[i];return 0});
  R.view=()=>R.screen;
  R.me=()=>myName||'Guest';
  R.open=()=>{R.screen=R.code?'room':'friends';cfg.render();window.scrollTo(0,0)};
  R.inGame=()=>R.screen==='room'&&R.room&&R.room.status==='play'&&!!R.G;
  // the chips above the game: everyone's points and where they are
  R.scoresHTML=()=>R.T?'':`<div class="scores" aria-label="Players">${players().map(p=>`<span class="chip${p.cur&&p.done?' done':''}${p.on===false?' off':''}"><span class="pin" style="${pinStyle(p.i)}"></span>${esc(p.name)}<small>${!p.cur?'joining':(p.s||0)+' pts'+(p.done?' ✓':' · '+(p.at||1)+'/'+cfg.total)}</small></span>`).join('')}</div>`;
  // the room's own screen (../brand/party.js) shows the players and the code: this game shows only its header there
  R.friendsHTML=()=>cfg.header(cfg.name,'');
  R.lobbyHTML=()=>cfg.header(cfg.name,'');
  R.backHTML=()=>`<div class="backline"><button class="linkbtn" id="leave">${R.armed?'Tap again to leave':'← Leave'}</button><span class="ht">Room ${R.code} · game ${R.G?R.G.round:''}</span></div>`;
  R.shareText=()=>{const G=R.G;return Geomingo.share(cfg.name)+' (with friends) — '+myPts(G)+' points'+(R.T?'':', '+cfg.right(G)+' of '+cfg.total)+'\n'+cfg.shareLine(G)};
  // turns: is it my turn; play my answer (null: pass). Returns the result on a copy of the game, so the page can stamp
  // a right answer or say "try again" (res 'again': nothing is sent and it is still my turn)
  R.turns=()=>!!R.T;
  R.myTurn=()=>!!(R.T&&R.G&&!R.G.over&&R.room.order&&R.room.order[R.room.turn||0]===ME);
  R.play=a=>{if(!R.myTurn()){toast('Wait for your turn.');return null}
    const G=JSON.parse(JSON.stringify(R.G)),i=G.sel,res=cfg.move(G,a||null)||{};res.q=G.qs&&G.qs[i];
    if(res.res==='again'){R.G=R.T.G=G;cfg.render()}else push(a,false);return res};
  // the ticket while playing: whose turn, the clock, what just happened, everyone's points (the look of Top 10)
  R.turnTicket=()=>{const r=R.room,o=r.order||[],T=R.T,G=R.G,cur=o[r.turn||0],nm=pid=>((r.players[pid]||{}).name||'Someone');
    const mine=cur===ME,L=T.last;let line='';
    if(L){const who=L.p===ME?'You':nm(L.p);
      line=L.res==='right'?`${who}: ${cfg.ansName(L.a)}, right! +${L.pts}.`:L.t?`${L.p===ME?'Your':nm(L.p)+"'s"} time ran out.`:L.a?(cfg.said?cfg.said(who,cfg.ansName(L.a)):`${who} said ${cfg.ansName(L.a)}: no.`):`${who} passed.`;
      if(L.done&&L.res!=='right')line+=` It was ${cfg.ansName(cfg.sol(G,L.i))}.`;line+=' '}
    else line=`${mine?'You start':nm(cur)+' starts'}, chosen at random. `;
    line+=`${cfg.item(G)}, worth ${cfg.worth(G)}.`;
    const stub=o.map((pid,i)=>{const p=r.players[pid]||{};return `<div class="tk-c pl${pid===cur?' on':''}${p.on===false?' off':''}"><i><span class="pin" style="${pinStyle(i)}"></span>${esc(p.name||'Gone')}</i><b>${T.sc[pid]||0}</b></div>`}).join('')
      +Geomingo.tk('Time',`<span id="tleft">${Geomingo.mmss(Math.min(TURN,Math.max(0,(r.tEnd||0)-now())))}</span>`);
    return Geomingo.ticket(Geomingo.hello('think',mine?'Your turn':nm(cur)+"'s turn",line,{key:'turn'}),stub,{timer:30,color:`var(--p${Math.max(0,o.indexOf(cur))%6})`,mode:'friends'})};
  // the room's ranking, live while the others finish; the next game starts when everyone still here is done
  R.resultHTML=()=>{const G=R.G,list=ranked(),cur=list.filter(p=>p.cur),pos=cur.findIndex(p=>p.pid===ME)+1;
    const waiting=cur.some(p=>!p.done&&p.on!==false);
    if(G.over&&!waiting&&Geomingo.party)Geomingo.party.result(cur.map(p=>({n:p.name,p:p.s||0})));
    if(G.over&&!waiting)logFriends(K+'-friends',R.code+':'+G.round+':'+((R.room&&R.room.startAt)||''),pos,myPts(G),pos===1&&!R.T?G.ms:0);
    const win=pos===1&&!waiting;
    return `<section class="panel">${Geomingo.hello(win?'happy':'think',win?'You win.':waiting?myPts(G)+' points. Now wait for the others.':'Everyone has finished.',waiting?'Some players are still playing.':win?'Most points in the room.':'You came '+pos+(pos===2?'nd':pos===3?'rd':'th')+'.',{key:'res'})}
    <span class="label">Room ${R.code} · game ${G.round}</span><p class="big">${myPts(G)} points</p>
    <div class="players">${list.map((p,k)=>`<div class="lp${p.pid===ME?' me':''}${p.on===false?' off':''}"><span class="rk">${p.cur?k+1:''}</span><span class="pin" style="${pinStyle(p.i)}"></span>${esc(p.name)}<span class="tag">${!p.cur?'joining':p.done?`${p.s||0} pts · ${p.ok||0} of ${cfg.total}${R.T?'':' · '+fmtTime(p.ms)}`:p.on===false?'left':`${p.s||0} pts · playing…`}</span></div>`).join('')}</div>
    <pre class="sharebox" id="share">${esc(R.shareText())}</pre>
    ${SHARE_BTN}<div class="row-btns sharerow"><button class="primary" id="rematch" style="flex:1" ${waiting?'disabled':''}>${waiting?'Waiting for the others…':'Play again'}</button></div>
  </section>`};
  // the buttons of these screens (call from the page's bind())
  R.bind=()=>{
    if($('rematch'))$('rematch').onclick=start;
    if(R.screen==='room'&&R.G&&R.G.over&&$('copy'))$('copy').onclick=()=>share(R.shareText()+'\n\nPlay '+cfg.name+': '+pageLink());
    // leaving in the middle of a game asks first
    if($('leave'))$('leave').onclick=()=>{if(R.G&&!R.G.over&&!R.armed){R.armed=true;cfg.render();return}leave()}};
  // start: back into the room this phone was in, only inside the one room for all nine games (old ?room= and ?friends links go home, ../brand/party.js)
  R.boot=()=>{const back=Geomingo.room.saved(ROOMKEY);
    if(back&&Geomingo.party&&Geomingo.party.on()&&initFB()){listen(back,true);return true}
    return false};
  R.leaveHome=()=>{if(R.code){leave();return true}R.screen=null;return false};
  // back from another app with a finished room still on screen a long time: leave it
  document.addEventListener('visibilitychange',()=>{if(document.hidden)return;if(R.code&&R.room&&Geomingo.room.stale(myDone(R.room)))leave()});
  // the one room for all nine games (../brand/party.js) drives this game's room
  if(Geomingo.party)Geomingo.party.game({turns:()=>movesOf(R.room).length,points:()=>R.room?players().filter(p=>p.cur).map(p=>({n:p.name,p:p.s||0})):[],room:()=>R.code,host:()=>!!R.room&&R.room.host===ME,lobby:()=>!!R.room&&R.room.status==='lobby',
    count:()=>R.room?order(R.room).length:0,names:()=>R.room?order(R.room).map(k=>R.room.players[k].name):[],
    create:()=>{if(initFB())create()},join:c=>{if(initFB())join(c)},start});
  return R};
})();
