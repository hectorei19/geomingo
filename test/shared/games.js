// Today's games, from Geomingo's list (../brand/mingo.js): names, links, "played today" and the next game.
// Each game has a copy of this file: change it in one, copy it to the others. The list itself lives in mingo.js.
const GAMES=Geomingo.live();
const MORE_GAMES=Geomingo.HOME;
const GAME_HERE=document.documentElement.dataset.game||'borderline';
function gamesDay(){return Geomingo.dayKey()}
// each game's own save on this device: Countries keeps bl-daily and bl-hist, the others cx-daily, t10-daily and sil-daily
const playedToday=id=>Geomingo.playedToday(id);
// the next game of the day not played yet, in list order after this one (null when all are done)
const nextGame=cur=>Geomingo.nextGame(cur);
