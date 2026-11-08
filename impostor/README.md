# Impostor (Trip 8)

Six rounds, each with six new countries (no country twice in a game). In each round one of the six is the impostor: up to five sentences come out, from hard to
easy, each true for the other five countries and false for the impostor. Tap the impostor: 6 − sentences open points
(5 down to 1), a wrong pick scores 0. Best game 30.

- `facts.js` makes the sentences from the Geomingo country database `../data/countries.js` (DATA figures), `../shared/data.js` (CATS traits) and `../top10/extra-data.js`
  (XDATA figures). Numbers in sentences are round numbers between the impostor and the closest of the other five.
- Daily: countries with 2 million people or more, seeded by the day (`impostor-YYYY-MM-DD`). Solo Easy: 10 million
  or more; Hard: all 197.
- Saves: `im-daily`, `im-hist` {p, r, a, m}, `im-arch`, `im-solo`, `im-diff`. Ranking: `lb/impostor` (no rule change).
- Flags: the official-shape SVGs of Flag Pie (`../flagpie/flags/`).
- The daily game is made from the data each time, so changing the data changes future (and archive) days.
