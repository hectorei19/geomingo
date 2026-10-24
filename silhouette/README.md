# Silhouette

Geography quiz: name the country from its shape. Part of [Geomingo](https://geomingo.com/), daily geography games: [Countries](https://geomingo.com/countries/), [Cities](https://geomingo.com/cities/), [Connections](https://geomingo.com/connections/), [Top 10](https://geomingo.com/top10/) and [all the games](https://geomingo.com/).

- Three levels: Easy (54 well-known countries), Normal (all 196) and Hard (all 196, each shape turned by a random angle). 3 tries per shape.
- Today's shapes: a 3 × 3 board of nine shapes per level, the same for everyone, new at midnight CET, one try, open on the home screen. Each level's countries are shuffled once per cycle (from the cycle number) and dealt nine a day, so none comes back within a cycle (Easy every 6 days, Normal and Hard every 21). Hard turns come from the date. `?test&day=2026-11-20` plays that day's boards without saving.
- Training: unlimited shapes at the chosen level, from a shuffled deck.
- With friends: online rooms for 2 to 6 phones (`?room=ABCD` opens a room's join screen). The host picks "Getting harder" (3 Easy, 4 Normal not in Easy, 3 Hard) or a continent and a level; ten shapes, everyone sees the same one at the same time, 20 s each, 3 tries. A right answer scores 500 plus up to 500 for speed. The ranking shows after every shape and at the end. Rooms use Countries' Firebase Realtime Database (`rooms/ABCD`, marked `game: 'silhouette'`), so its rules need no change. Each phone writes only its own answers (`ans/<shape>/<player>`); the host's phone moves the room on (anyone's, a little later, if the host has gone).
- Saved on the device (localStorage): `sil-daily`, `sil-hist`, `sil-train`, `sil-diff`, `sil-ddiff`; for rooms `sil-pid`, `sil-setup`, `sil-room`.
- `check.html` shows every silhouette, north up or turned, to look them over.

Files:
- `index.html` – the game.
- `countries.js` – the 196 countries: English name, other accepted names, continent, flag, Easy or not, and the silhouette (an SVG path in a 100 × 100 box). Made by `tools/build-countries.js`; do not edit it by hand.
- `silhouette.js` – drawing a silhouette (turned and fitted to the box for Hard), the answer box's search (no accents, case or spaces needed; common other names such as Holland, Burma, UK), seeded random picks.
- `flags.js` – the flags as SVG text, loaded after the page. Made by the same tool.
- `../shared/style.css`, `../shared/games.js`, `../shared/minigames.js` – styles, the Games list and helpers shared with Top 10 and Connections (`minigames.js` has a `creditsHTML` hook for this game's Credits and saves `sil-train` in test mode).
- `firebase-config.js` – the Firebase web config, the same as Countries'.

Publishing a new version: change the `?v=` number after the files in `index.html`, so phones load the new files. Change `ROOM_V` too when the room format changes.
- `tools/` – only to rebuild `countries.js`: `cd tools`, `npm install`, `node build-countries.js ../../shared/data.js` (any copy of Countries' `data.js`).

How the silhouettes are made: each country on its own map centred on itself (azimuthal equal-area), so nothing far from the equator is stretched and the date line never splits a country (Russia, Fiji, Kiribati). Far-off small parts are left out (French Guiana, Hawaii, Easter Island, the Canaries); big or nearby ones stay (Alaska, Svalbard, Sicily). Every shape fills the same box, so size gives nothing away. Outlines are simplified in screen units, a quarter of a pixel at 400 px, so small countries keep their detail. Nations made only of tiny atolls (Tuvalu, Maldives) keep all their islets, drawn as dots. Vatican City is left out: its border in the data is a single line.

Data sources and licences:
- Borders: [world-atlas](https://github.com/topojson/world-atlas) 2.0.2, from [Natural Earth](https://www.naturalearthdata.com/) 1:10m, public domain. Pieces Natural Earth keeps apart are joined to their country (Somaliland to Somalia, Northern Cyprus to Cyprus, Baikonur to Kazakhstan).
- Flags: [flag-icons](https://github.com/lipis/flag-icons), MIT License, as in Countries.
- Country names and continents: Countries' data, from [mledoze/countries](https://github.com/mledoze/countries), Open Database License (ODbL) 1.0.
- Fonts: Big Shoulders Display, Barlow Semi Condensed, JetBrains Mono (Google Fonts, SIL Open Font License).
