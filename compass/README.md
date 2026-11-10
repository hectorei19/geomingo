# Compass (Trip 9)

Héctor's idea (2026-11-10): the mystery capital is the "?" in the middle of a compass. Clue capitals appear on the rim,
each in its real direction seen from the mystery capital, with its distance in km. Name the mystery capital.

- Five capitals per game, one at a time. The first clue is open; **Next clue** opens one more (five in all).
- Every extra clue and every wrong guess costs 1 point: right = 6 − clues open − wrong guesses (5 down to 1).
  A wrong guess also goes on the compass, in red, with its distance and direction. At 0 points left, or with
  **I don't know**, the capital goes with 0. Best game 25.
- `clues.js` picks the five clue capitals of a city: the first far (about 2.600 km, more round remote capitals), each next
  one closer (at least 15 % closer), in different directions (45° apart when possible, never under ~24° for the 197),
  capitals of 300.000 people or more preferred. Great-circle distance on a round Earth (6.371 km), direction = initial bearing.
- Data: `CITIES` from `../capitals/data.js` (names, other accepted names, coordinates), country names from `../data/countries.js`,
  flags from `../flagpie/flags/`. Answers: any of the 197 capitals; a city already on the compass can't be picked.
- Daily: five a day from `DECK` (145 capitals people know: country with 5 million people or more, capital of a million,
  or in Europe), kept as it was on the first day, dealt from a deck shuffled once per cycle (`compass-<cycle>`).
  `?test&day=2026-11-20` plays that day without saving.
- Solo: Easy = the daily deck, Hard = all 197. With friends: an online room, everyone plays the same set at the same time on their own phone, no lives (`../shared/race.js`).
- Saves: `cm-daily`, `cm-hist` {p, r, a, m}, `cm-arch`, `cm-solo`, `cm-diff`. Ranking: `lb/compass` (s points, r found, m wrong guesses), no rule change.
- Not in the GeoPass atlas (the countries' dots) yet.
