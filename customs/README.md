# Customs

Geography quiz: a traveller is at the customs desk and you work out which country they come from. Part of [Geomingo](https://geomingo.com/).

- Five travellers per game, five clues each, one picked at random from each of five groups (GROUPS), from not obvious to obvious: 1 Curiosity, 2 Numbers, 3 History and clubs (or the flag described), 4 On the map, 5 The obvious (neighbours, capital initial, flag). The picks are kept in each traveller (v); the daily ones are seeded from the day and the country.
- Right with k clues open = 6 − k points (5 to 1). A wrong answer opens the next clue; with all five open it lets the traveller go (0). Best game 25.
- Daily: the same five for everyone, new at midnight CET: three countries with 10 million people or more and two of the rest, each dealt from a deck shuffled once per cycle. `?test&day=2026-11-20` plays that day without saving.
- Solo: five random countries per game, Easy (10 million people or more) or Hard (any). With friends: an online room, everyone plays the same set at the same time on their own phone, no lives (`../shared/race.js`).
- Saved on the device: `cu-daily`, `cu-hist` ({p points, r named, m wrong}), `cu-arch`, `cu-solo`. Ranking: `lb/customs` (s points, m wrong answers), no rules change needed.
- Data: `../data/countries.js` and `../data/flags.js` (the Geomingo country database and flags, the one source of country data) plus `../shared/data.js` (categories), see Credits & data sources.
