# Top 10 (Geomingo)

Part of [Geomingo](https://geomingo.com/). Colours, fonts, Mingo, the header and the result window come from `../brand/`; `games.js`, `minigames.js` and `style.css` are shared with the other small games in `../shared/`.

Geography quiz: name the ten countries of a ranking ("The 10 most populous countries", "The 10 countries with the longest coastline"...). A country outside the top 10 costs one of 3 lives.

Part of [Geomingo](https://geomingo.com/), daily geography games: [Countries](https://geomingo.com/countries/), [Capitals](https://geomingo.com/capitals/), [Connections](https://geomingo.com/connections/) and [Top 10](https://geomingo.com/top10/).

- The page opens on today's list, open and playable on the home screen (like Countries' grid), with Solo and With friends below.
- Today's list: the same for everyone, new at midnight CET (Spain), one try. Lists come in a shuffled order, so none repeats until all have been used. The first round (2026-10-19 to 2026-11-05) keeps the original 18 lists; from 2026-11-06 the order covers every list.
- Solo: unlimited practice lists, never the same one twice until all have been played on this device (localStorage `t10-seen`); a shared practice link (`?l=pop-hi`) opens the same list.
- With friends: online rooms for 2 to 6 phones (`?room=ABCD` opens a room's join screen). Everyone plays the same random list and takes turns naming one country: in the top 10 scores a point, outside costs one of your 3 lives; optional turn timer (15 or 30 s). Rooms use Countries' Firebase Realtime Database (`rooms/ABCD`, marked `game: 'top10'`), so no change to its rules is needed.
- Results and stats are kept on the device (localStorage: `t10-daily`, `t10-free`, `t10-hist`, `t10-seen`; for rooms `t10-pid`, `t10-setup`, `t10-room`).
- Rankings use only figures Countries already has, with the sources named in its Credits. Independent countries only. A list is used only when the 10th and 11th places are not tied. Vatican City's area (0.44 km², missing in the country data) is added in `index.html`.
- About 130 lists: 25 world rankings, each also played within Europe, Asia, Africa or the Americas (continents as the country data groups them). In a continent list, only its countries can be typed. Some derived figures: density (population / area), total GDP (GDP per person × population), total CO₂, forest area (forest share × area), share of people living in the capital.

Files:
- `index.html` – the game.
- `firebase-config.js` – the Firebase web config, the same as Countries'.
- `../shared/data.js` – copy of Countries' data: countries, flags, figures, categories and their descriptions.
- `../shared/style.css` – Countries' styles (colours, fonts, dark mode).
- `../shared/games.js` – the Games menu, one file for Connections, Top 10 and Silhouette.
- `../shared/minigames.js` – helpers shared by Connections, Top 10 and Silhouette.

Publishing a new version: change the `?v=` number after the four files in `index.html`, so phones load the new files.

Data sources and licences: see Credits in [Countries](https://geomingo.com/countries/).
