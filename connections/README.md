# Connections (Geomingo)

Part of [Geomingo](https://hectorei19.github.io/geomingo/). Colours, fonts, Mingo, the header and the result window come from `../brand/`; `games.js`, `minigames.js` and `style.css` are shared with the other small games in `../shared/`.

Geography puzzle: 16 countries, four hidden groups of four. Pick four that share a category (a region, a flag, a language, a name...) and submit. Four mistakes and the game ends. Colours go from easiest to trickiest: yellow, green, blue, purple.

Part of [Geomingo](https://hectorei19.github.io/geomingo/), daily geography games: [Countries](https://hectorei19.github.io/geomingo/countries/), [Cities](https://hectorei19.github.io/geomingo/cities/), [Connections](https://hectorei19.github.io/geomingo/connections/) and [Top 10](https://hectorei19.github.io/geomingo/top10/).

- The page opens on today's puzzle, as Countries (formerly Country Grid) opens on today's grid: tap a country to start.
- Today's puzzle: the same for everyone, new at midnight CET (Spain), one try. Solo: unlimited practice puzzles; a shared practice link (`?p=123`) opens the same puzzle.
- With friends: online rooms for 2 to 8 players, each on their own phone, all playing the same puzzle at the same time with everyone's progress shown live. Solved first, then fewer mistakes, then faster. A room link (`?room=ABCD`) joins that room. Rooms live in Countries' Firebase Realtime Database under `rooms/ABCD` (tagged `game: 'connections'`), so Countries' database rules already cover them.
- Results and stats are kept on the device (localStorage: `cx-daily`, `cx-free`, `cx-hist`; for rooms `cx-pid`, `cx-name`, `cx-room`, `cx-online`).
- Every country fits its own group's category and none of the other three, so the puzzle has one solution. Independent countries only.

Files:
- `index.html` – the game.
- `../shared/data.js` – copy of Countries' data: countries, flags, figures, categories (`CATS`) and their descriptions.
- `../shared/style.css` – Countries' styles (colours, fonts, dark mode).
- `../shared/games.js` – the Games menu, one file for Connections, Top 10 and Silhouette.
- `../shared/minigames.js` – helpers shared by Connections, Top 10 and Silhouette.
- `firebase-config.js` – Countries' Firebase web config (a copy), for With friends.

Publishing a new version: change the `?v=` number after the files in `index.html`, so phones load the new files.

Data sources and licences: see Credits in [Countries](https://hectorei19.github.io/geomingo/countries/).
