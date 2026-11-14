# Geomingo — notes for Claude

Daily geography games, live at https://geomingo.com (GitHub Pages from `main`, root; domain in `CNAME`).
Plain static HTML/CSS/JS: no build step, no framework, no tests. Each game is one `index.html`.

## Layout
- `index.html` – home page (game tiles, GeoPass card, ranking)
- `brand/` – shared look and logic: `geomingo.css`, `mingo.js` (`window.Geomingo`, list of games `GAMES`, GeoPass, header), `account.js` (Google sign-in, rankings), `firebase-config.js` (one Firebase config for every game), `icons/`, `og.png`
- `data/` – THE GEOMINGO COUNTRY DATABASE, the one source of country data for every game:
  `countries.js` (C, EXTRA, DATA) and `flags.js` (FLAG_SVG as SVG text; `FLAGS[code]` gives the image address; loaded only by games that show flags).
  One name per country (`n`); `al` stays empty everywhere. Change country data here, never in a game folder.
- `countries/` – Countries (old Country Grid / Borderline); its daily grids in `daily.js` (DAILY_FIXED);
  `database.rules.json` = Firebase rules
- `capitals/` – Capitals (old City Grid); cities in `data.js` (CITIES, CO_LISTS, DAILY_FIXED;
  country names CO are built from `data/countries.js`),
  flags from `data/flags.js`
- `connections/`, `top10/`, `silhouette/`, `customs/`, `flagpie/`, `impostor/`, `compass/` – the smaller games
  (Compass loads `capitals/data.js` for the capitals and their coordinates)
- `shared/` – used by the seven smaller games (not Countries/Capitals): `style.css`, `games.js`, `minigames.js`,
  `race.js` (With friends rooms for Customs, Flag Pie, Impostor, Compass), `data.js` (category rules only, no data)
- Connections, Top 10, Customs, Flag Pie, Impostor load `data/countries.js` before `shared/data.js`; Silhouette's
  `countries.js` is built from `data/` by `silhouette/tools/build-countries.js` (run it after changing `data/`).
- `silhouette/tools/`, `flagpie/tools/` – Node scripts that regenerate data files; `capitals/tools/` – the one-off Firebase move
- `README.md` – longer description (brand, account, Firebase paths)

## Big data files: do not read them whole
- Reading is blocked in `.claude/settings.json` for `data/countries.js`,
  `data/flags.js`, `countries/daily.js`, `capitals/data.js`,
  `silhouette/countries.js` and everything in `flagpie/flags/` (several MB of data/SVG).
  They are one-line JSON/SVG blobs. If you really need a value, grep a short snippet
  (e.g. `grep -o '"c":"ESP".\{0,200\}' data/countries.js`); never print whole lines.
- The game `index.html` files still have some long lines: read only line
  ranges (`Read` with offset/limit, or `sed -n 'A,Bp'`)
  and find code with grep (`grep -n` and `cut -c1-200` to keep output short).

## Rules
- Only change what was asked. Do not touch game logic, data or other games "while you are there".
- Games are 100% English (UI and accepted answers). Dark theme only: no light mode or theme toggle.
- Numbers European style with SI units: use `EU()` / `EUT()` from `brand/mingo.js`.
- Daily reset is midnight Europe/Madrid; any text says "midnight CET".
- Travel words, not airport words (Trip, Visited, km, Traveller; no Gate/Boarding/Landed/miles).
- Never rename localStorage keys (`bl-*`, `cc-*`, `gm-*`…), game ids in `GAMES`
  (`borderline`, `citygrid`…) or Firebase paths: saves and rankings depend on them.
  Firebase project is `geomingogames` (moved from the old `borderline-90920` on 14 Nov 2026; the old one is kept only as a backup). (Capitals' Firebase paths were moved once, on Héctor's request, from
  `users/<uid>/cities`, `lb/citygrid`, `gprofiles/citygrid` to `…/capitals` by `capitals/tools/move-to-capitals.js`.)
- After changing a shared file (`brand/`, `shared/`, a game's `.js`), bump its `?v=` number in
  every page that loads it, so phones pick up the new file.
- If Firebase rules change, say so: they must be pasted by hand in the Firebase console.

## Workflow
- Work on a branch and open a pull request. Never merge until Héctor explicitly says
  "súbelo" / "publícalo" / "fusiona".
- Héctor is not technical and writes in Spanish: explain results simply, in Spanish.
- Check changes in a phone-size browser (Playwright) and share screenshots when the look changes.
