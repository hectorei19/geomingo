// Today's games, from Geomingo's list (../brand/mingo.js): "played today" and the next game.
// One file for every small game (loaded from ../shared/games.js). The list itself lives in ../brand/mingo.js.
// each game's own save on this device: Countries keeps bl-daily and bl-hist, the others cx-daily, t10-daily and sil-daily
const playedToday=id=>Geomingo.playedToday(id);
// the next game of the day not played yet, in list order after this one (null when all are done)
const nextGame=cur=>Geomingo.nextGame(cur);
