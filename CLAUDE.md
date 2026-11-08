# Geomingo — notes for Claude

Daily geography games, live at https://geomingo.com (GitHub Pages from `main`, root; domain in `CNAME`).
Plain static HTML/CSS/JS: no build step, no framework, no tests. Each game is one `index.html`.

## Layout
- `index.html` – home page (game tiles, GeoPass card, ranking)
- `brand/` – shared look and logic: `geomingo.css`, `mingo.js` (`window.Geomingo`, list of games `GAMES`, GeoPass, header), `account.js` (Google sign-in, rankings), `icons/`, `og.png`
- `countries/` – Countries (old Country Grid / Borderline); data in `data.js` (C, EXTRA, DATA, DAILY_FIXED),
  flags in `flags.js` (FLAGS); `database.rules.json` = Firebase rules
- `capitals/` – Capitals (old Cities / City Grid); `cities/` only forwards to `capitals/`
- `connections/`, `top10/`, `silhouette/`, `customs/`, `flagpie/` – the smaller games
- `shared/` – `style.css`, `games.js`, `minigames.js`, `data.js` (country data for the smaller games)
- `silhouette/tools/`, `flagpie/tools/` – Node scripts that regenerate data files
- `README.md` – longer description (brand, account, Firebase paths)

## Big data files: do not read them whole
- Reading is blocked in `.claude/settings.json` for `shared/data.js`, `countries/data.js`,
  `countries/flags.js`, `silhouette/flags.js`, `silhouette/countries.js` and everything in
  `flagpie/flags/` (several MB of data/SVG).
  They are one-line JSON/SVG blobs. If you really need a value, grep a short snippet
  (e.g. `grep -o '"c":"ESP".\{0,200\}' shared/data.js`); never print whole lines.
- `capitals/index.html` holds data on HUGE single lines. Never read it whole: read only line
  ranges (`Read` with offset/limit, or `sed -n 'A,Bp'`) away from the data lines,
  and find code with grep (`grep -n` and `cut -c1-200` to keep output short).

## Rules
- Only change what was asked. Do not touch game logic, data or other games "while you are there".
- Games are 100% English (UI and accepted answers). Dark theme only: no light mode or theme toggle.
- Numbers European style with SI units: use `EU()` / `EUT()` from `brand/mingo.js`.
- Daily reset is midnight Europe/Madrid; any text says "midnight CET".
- Travel words, not airport words (Trip, Visited, km, Traveller; no Gate/Boarding/Landed/miles).
- Never rename localStorage keys (`bl-*`, `cc-*`, `gm-*`…), game ids in `GAMES`
  (`borderline`, `citygrid`…) or Firebase paths: saves and rankings depend on them.
  Firebase project is `borderline-90920`.
- After changing a shared file (`brand/`, `shared/`, a game's `.js`), bump its `?v=` number in
  every page that loads it, so phones pick up the new file.
- If Firebase rules change, say so: they must be pasted by hand in the Firebase console.

## Workflow
- Work on a branch and open a pull request. Never merge until Héctor explicitly says
  "súbelo" / "publícalo" / "fusiona".
- Héctor is not technical and writes in Spanish: explain results simply, in Spanish.
- Check changes in a phone-size browser (Playwright) and share screenshots when the look changes.
