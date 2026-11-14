# Geomingo

Daily geography games. Better with friends. Live at https://geomingo.com/

| Trip | Game | What you do | Address |
|---|---|---|---|
| 1 | Countries | Fill a grid with countries | https://geomingo.com/countries/ |
| 2 | Capitals | Fill a grid with capitals | https://geomingo.com/capitals/ |
| 3 | Connections | Find 4 hidden groups of 4 countries | https://geomingo.com/connections/ |
| 4 | Top 10 | Name the 10 countries of a ranking | https://geomingo.com/top10/ |
| 5 | Silhouette | Guess the country from its shape | https://geomingo.com/silhouette/ |
| 6 | Customs | Guess the traveller's country from clues | https://geomingo.com/customs/ |
| 7 | Flag Pie | Guess the flag from its colours | https://geomingo.com/flagpie/ |
| 8 | Impostor | Find the country that doesn't fit | https://geomingo.com/impostor/ |
| 9 | Compass | Find the capital with a compass | https://geomingo.com/compass/ |

Every game has a daily puzzle (the same for everyone, new at midnight CET), a Practice mode and a With friends mode (online rooms, each player on their own phone). Each game folder has its own `README.md` with its rules.

## The home page: `index.html`

- **Today's itinerary**: one tile per game (Trip 1 to 9), showing "To visit" or today's result. "Played today" reads each game's own save on this device, so it only works on the live site (same address as the games).
- **Practice** and **With friends**: open a screen to pick a game, then that game's Solo or With friends screen.
- **My GeoPass**: the km travelled (every daily game moves you up to 100 km, +50 km for playing all nine), the level (Tourist, Traveller…), stamps, countries unlocked, days in a row and today's nine boxes.
- **Ranking** (signed in): today, this week and this month, in km.
- **Menu** (top right): the account, then one line per window, and the sources used by the games.

## Folders

Everything is one website and one repository, published with GitHub Pages from `main` (root folder) at https://geomingo.com/; the domain is in `CNAME`. Plain HTML, CSS and JavaScript: no build step, no framework.

- `index.html` – the home page (above)
- `brand/` – the shared Geomingo look and logic (below)
- `data/` – the Geomingo country database, the one source of country data for every game: `countries.js` (the 197 countries, one name each, figures and lists) and `flags.js` (the flags, loaded only by games that show flags)
- `countries/` – Countries (formerly Country Grid / Borderline): `daily.js` (the daily grids), `database.rules.json` (the Firebase rules for the whole site) and `version.json`
- `capitals/` – Capitals (formerly City Grid): `data.js` (the cities and the daily grids) and `version.json`
- `connections/`, `top10/`, `silhouette/`, `customs/`, `flagpie/`, `impostor/`, `compass/` – the other seven games, each with its own `index.html` and data files. Compass also loads `capitals/data.js` (capitals and their coordinates); Impostor also loads `top10/extra-data.js`.
- `shared/` – files used by those seven games (not by Countries and Capitals):
  - `style.css` – the common game styles
  - `games.js` – "played today" and the next game (from the list in `brand/mingo.js`)
  - `minigames.js` – the common helpers: page header, toast, info box, daily key and number, seeds, streaks and sharing the result
  - `race.js` – With friends for Customs, Flag Pie, Impostor and Compass (online rooms where everyone plays the same set at the same time)
  - `data.js` – the category rules (the same categories as Countries) used by Connections, Top 10, Customs, Flag Pie, Impostor and Compass; the country data itself is in `data/`
- `silhouette/tools/`, `flagpie/tools/` – Node scripts that regenerate those games' data files (see each game's README)

## The brand: `brand/`

One source for every game. The games load these files from `../brand/`:

- `geomingo.css` – the travel / passport look: colour tokens (paper, navy cover, coral, gold, stamp inks; dark theme only), the fonts Archivo, Public Sans and Courier Prime, the brand components (`gm-*`: header with the GeoPass button, Mingo's bubble, stamps, big buttons, windows, GeoPass booklet) and the games' common pieces (panel, buttons, grid, answer sheet, Menu) in the brand's look. Load it after the game's own styles.
- `mingo.js` – `window.Geomingo`: Mingo in his poses (`mingo('pass'|'happy'|'sad'|'think'|'head', width)`), his speech bubble (`hello`), the shared header (`header`), the GeoPass (`stamp`, `stamps`, `openPass`), the list of games with their trip numbers (`GAMES`), "played today" and today's score (`result`, `nextGame`), the streak, and the number format (`EU()` / `EUT()`: European style, 4.964 km). Load it in the `<head>`, before the page's own scripts.
- `account.js` – `Geomingo.account`: one Google sign-in for the whole site, the header button (Sign in, or your initial), the daily rankings and the saving of each daily result (`done(game)`, called by the game when today's puzzle ends). Load it right after `mingo.js`; it loads the Firebase SDK itself on pages that don't. Countries and Capitals keep their own sign-in code and share the same account and name.
- `firebase-config.js` – the Firebase web config, one file for every game (not secret: access is controlled by the database rules).
- `icons/` – favicon and app icons (Mingo's head), `og.png` – the picture shown when a link is shared, `site.webmanifest`.

A game marked `soon:true` in `GAMES` (`brand/mingo.js`) shows as "Coming soon" and is left out of the menus.

## Saved on the device (localStorage)

Each game keeps its own keys with its own prefix (`bl-` Countries, `cc-` Capitals, `cx-` Connections, `t10-` Top 10, `sil-` Silhouette, `cu-` Customs, `fp-` Flag Pie, `im-` Impostor…), and the brand uses `gm-` keys, for example `gm-days` (days with at least one daily game, for the streak) and `gm-pass` (the GeoPass: one stamp per right answer in any game). **Never rename these keys**: saves depend on them.

Guests (not signed in) can play on 3 different days (`gm-trial`); after that a sign-in screen covers the games.

## The account (Firebase Realtime Database)

Firebase project `borderline-90920` (the name comes from the first version of Countries). With an account, everything below follows you to every device; signing out leaves the device clean (the account keeps it all):

- `users/<uid>/profile` – your name, chosen once, shown in every ranking
- `users/<uid>/pass`, `users/<uid>/days` – the GeoPass and the days played (the streak), for every game
- `users/<uid>/hist/<game>/<date>` – the daily results of Connections (`connections`), Top 10 (`top10`), Silhouette (`sil-easy`, `sil-normal`, `sil-hard`), Customs (`customs`), Flag Pie (`flagpie`), Impostor (`impostor`) and Compass (`compass`), with today's whole game, so another device shows the same one (one try per account)
- `lb/<game>/<date>/<uid>` – each game's public daily ranking; each account writes its result once
- Countries keeps its own paths: `leaderboard/…`, `users/<uid>/daily…` and `profiles/…`. Capitals uses `lb/capitals/…`, `users/<uid>/capitals/…` and `gprofiles/capitals/…` (until 2026-11-14 they were `lb/citygrid`, `users/<uid>/cities` and `gprofiles/citygrid`, moved by `capitals/tools/move-to-capitals.js`).
- `rooms/<code>` – the With friends rooms of every game (each room is tagged with its game)

The rules are in `countries/database.rules.json`. After changing them, paste them by hand in the Firebase console → Realtime Database → Rules, and Publish.

## Publishing changes

- After changing a shared file (`brand/`, `shared/`, a game's `.js`), change its `?v=` number in every page that loads it, so phones load the new file.
- Countries and Capitals: change `version.json` together with `APP_VERSION` in the game's `index.html`, so phones with the game open get the reload notice.

## History

The games started in separate repositories (country-grid, city-grid, connections, top10, silhouette, and geo-games for the home page). They were moved here in October 2026 and those old repositories were deleted on 14 November 2026. Saves made on the old hectorei19.github.io addresses do not show on geomingo.com, because saved progress belongs to the website address.
