# City Grid

Part of [Geomingo](https://geomingo.com/), daily geography games: the colours, fonts, Mingo and the shared header come from `../brand/`. Fonts: Archivo, Public Sans and Courier Prime.

Geography grid game with cities: name a city that matches each row and column (the 195 national capitals, one per country). A sister of [Country Grid](https://geomingo.com/countries/), same game and same look, with cities instead of countries. Every grid is checked so it can always be completed, whatever answers are given.

Live at https://geomingo.com/cities/ · all the games: https://geomingo.com/

- Today's grid: one 4×4 Normal grid a day for everyone, new at midnight CET (Spain), one try.
- Solo: unlimited grids (Easy, Normal, Hard; 3×3 or 4×4: 195 capitals are too few for 5×5). A shared result link (`?grid=4-KQPMT`) opens the same grid.
- With friends: shown as "coming soon".
- Results and stats are kept on the device (localStorage keys starting with `cc-`, so they never mix with Country Grid's `bl-` keys on the same website).

Files:
- `index.html` – the whole game (capitals, categories and country names included).

## How it was made

`index.html` is Country Grid's game with its data swapped: the city list, the categories, all about the city itself (continent, coast or inland, height, latitude, population, megacity, not its country's biggest city, Olympic and World Cup hosts, Mediterranean, Danube, and the letters of its name), and their explanations. A guessed square shows the city's name in big letters, no flag. Each category's ⓘ in the game gives the exact rule and the doubtful cases.

The daily grids are fixed in advance in `index.html` (`DAILY_FIXED`, one entry per day from 2026-10-22 to 2027-10-22), so changing categories later never changes a day's grid. Days not in the list fall back to generating the grid from the date. A category never comes back within 3 days.

## Credits

- Cities: [GeoNames](https://www.geonames.org) (via the `all-the-cities` package), CC BY 4.0: names, coordinates, population. A few outdated populations corrected.
- Capitals and country names: Country Grid's data, from [mledoze/countries](https://github.com/mledoze/countries) (ODbL 1.0, adapted). La Paz and Pretoria for Bolivia and South Africa. "Not its country's biggest city": Wikipedia, "List of countries whose capital is not their largest city", plus China.
- Coasts, seas, rivers, heights, hosts: compiled by hand from Wikipedia (CC BY-SA 4.0), coasts checked against [Natural Earth](https://www.naturalearthdata.com) (public domain), October 2026.
- Megacities: UN World Urbanization Prospects 2018 (Wikipedia, "Megacity").
- Fonts: Big Shoulders Display, Barlow Semi Condensed, JetBrains Mono (Google Fonts, SIL Open Font License).
