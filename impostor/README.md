# Impostor (Trip 8)

Since 2026-11-13 (`LINK_FROM` in `facts.js`): **What do they have in common?** Six rounds of six new countries. Five share
one hidden link (a trait from `../shared/data.js` CATS); the impostor doesn't. Five clues come out one by one, as before (6 − k points,
best game 30): the topic ("Look at the flags."), a nudge (`LINK_NUDGE`, "Count carefully."), two innocent countries
crossed out, a third one, then the link itself. A set is
only used when no other trait of the same topic leaves out a different country. Rounds: {set, c, m:'link', f:[topic, nudge, link], x: three innocents}.

Older daily games keep their rules (below): clue rounds before 2026-11-12, suspect clues on 2026-11-12.

Six rounds, each with six new countries (no country twice in a game). In each round one of the six is the impostor: up to five clues come out. Every clue is false
for the impostor; since 2026-11-12 (`SUSPECTS_FROM` in `facts.js`) a clue can also be false for one or two other countries
("suspects"), and number clues can be a range ("between 1.000 and 4.000 m"). Clues 1-3 cut the suspects down to the
impostor, clues 4-5 are easy ones false only for it. Daily games from before keep the first rules (each clue false only for the impostor). Tap the impostor: 6 − sentences open points
(5 down to 1), a wrong pick scores 0. Best game 30.

- `facts.js` makes the sentences from the Geomingo country database `../data/countries.js` (DATA figures), `../shared/data.js` (CATS traits) and `../top10/extra-data.js`
  (XDATA figures). Numbers in sentences are round numbers between the impostor and the closest of the other five.
- Daily: countries with 2 million people or more, seeded by the day (`impostor-YYYY-MM-DD`). Solo Easy: 10 million
  or more; Hard: all 197.
- Saves: `im-daily`, `im-hist` {p, r, a, m}, `im-arch`, `im-solo`, `im-diff`. Ranking: `lb/impostor` (no rule change).
- Flags: the official-shape SVGs of Flag Pie (`../flagpie/flags/`).
- The daily game is made from the data each time, so changing the data changes future (and archive) days.
