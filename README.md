# Geomingo

Daily geography games. Better with friends. Home page live at https://geomingo.com/

- Countries: https://geomingo.com/countries/
- Cities: https://geomingo.com/cities/
- Connections: https://geomingo.com/connections/
- Top 10: https://geomingo.com/top10/
- Silhouette: https://geomingo.com/silhouette/

`index.html` is the home page, styled as a departures board: Mingo counts today's stamps, one trip per game with its gate (A1, A2, B1, B2, C1) and its real state ("Play" or "✓ score"), and Play with friends (rooms in Countries and Silhouette). "Played today" reads each game's own save on this device, so it only works on the live site (same origin as the games).

## Layout

Everything is one website, one repository (published with GitHub Pages from `main`, root folder, at https://geomingo.com/ — the domain is in `CNAME`):

- `index.html` – the home page; `brand/` – the shared Geomingo look (below)
- `countries/` – Countries (formerly Country Grid / Borderline), with `firebase-config.js`, `database.rules.json` and `version.json`
- `cities/` – Cities (City Grid)
- `connections/`, `top10/`, `silhouette/` – the smaller games, each with its own `index.html` and `firebase-config.js`
- `shared/` – files used by Connections, Top 10 and Silhouette: `style.css`, `games.js`, `minigames.js`, and `data.js` (the country data of Connections and Top 10)

The games moved here from their own repositories (hectorei19/country-grid, city-grid, connections, top10, silhouette, and geo-games for the home page), which keep their history. Saved progress (localStorage) belongs to the website address, so saves made on the old hectorei19.github.io addresses do not show on geomingo.com. Rooms still use the Firebase project borderline-90920.

## The brand: `brand/`

One source for every game. The games load these files from `../brand/`:

- `geomingo.css` – the travel / passport look: colour tokens (paper, navy cover, coral, gold, stamp inks; light and dark, `data-theme`), the fonts Archivo, Public Sans and Courier Prime, the brand components (`gm-*`: header with the GeoPass button, theme button, Mingo's bubble, departures board, stamps, big buttons, result card, GeoPass booklet, toast) and the games' common pieces (panel, buttons, grid, answer sheet, Menu) in the brand's look. Load it after the game's own styles.
- `mingo.js` – `window.Geomingo`: Mingo in his poses (`mingo('pass'|'happy'|'sad'|'think'|'head', width)`), his speech bubble (`hello`), the shared header (`header`), the result card (`resultWindow`), the GeoPass (`stamp`, `stamps`, `stampsToday`, `openPass`), the list of games with their gates, "played today" and today's score (`GAMES`, `result`, `nextGame`) and the streak. Load it in the `<head>`, before the page's own scripts: it applies the saved light/dark choice before anything is drawn.
- `account.js` – `Geomingo.account`: one Google sign-in for the whole site (Firebase project borderline-90920; the sign-in is shared by every page because they are one website). It adds the header button (Sign in, or your initial with Sign out), and for Connections, Top 10 and Silhouette the "Playing as … / Sign in to join the daily ranking" banner (`userHTML`), today's ranking (`rankingHTML`) and the saving of each daily result (`done(game)`, called by the game when today's puzzle ends). Load it right after `mingo.js`; it loads the Firebase SDK itself on pages that don't. Countries and Cities keep their own sign-in code and share the same account and name.
- `icons/` – favicon and app icons (Mingo's head), `og.png` – the picture shown when a link is shared, `site.webmanifest`.

Saved on the device by the brand (new keys; the games' own keys never change): `gm-theme` (light or dark, for every game), `gm-days` (days with at least one daily game played, for the streak; filled in the first time from the games' histories) and `gm-pass` (the GeoPass: total stamps and the last 240, one stamp per right answer in any game; filled in the first time from the games' histories).

## The account (Firebase Realtime Database)

Signing in is optional. With an account, everything below follows you to every device; signing out leaves the device clean (the account keeps it all):

- `users/<uid>/profile` – your name, chosen once, shown in every ranking (the same one Countries has always used)
- `users/<uid>/pass`, `users/<uid>/days` – the GeoPass and the days played (the streak), for every game
- `users/<uid>/hist/<game>/<date>` – the daily results of Connections (`connections`), Top 10 (`top10`) and Silhouette (`sil-easy`, `sil-normal`, `sil-hard`), with today's whole game, so another device shows the same one (one try per account)
- `lb/<game>/<date>/<uid>` – each game's public daily ranking (`{name, s, m, t}`: more `s` first, then fewer `m`, then who finished first); each account writes its result once. Cities uses `lb/citygrid/…`, `users/<uid>/cities/…` and `gprofiles/citygrid/…`; Countries keeps `leaderboard/…`, `users/<uid>/daily…` and `profiles/…`.

The rules are in `countries/database.rules.json`: paste them in Firebase → Realtime Database → Rules and Publish after changing them.

A game marked `soon:true` in `GAMES` (`brand/mingo.js`) shows as "Coming soon" and is left out of the menus.

Publishing: change the `?v=` number after the brand files in each page, so phones load the new files. Publish this repository before the games that use a new brand file.
