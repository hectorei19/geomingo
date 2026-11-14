# Impostor (Trip 8)

Geography quiz: six countries, one of them is the impostor. Clues come out one by one; find the country that doesn't fit. Part of [Geomingo](https://geomingo.com/).

## How to play

Six rounds per game, each with six new countries (no country twice in a game). Up to five clues come out one by one; tap the impostor. Right with k clues open = 6 − k points (5 down to 1), a wrong pick scores 0. Best game 30.

Each daily game uses the rules of the day it was made, so the archive keeps old days as they were. Today's rules (since 2026-11-13, `FACTS_FROM` in `facts.js`), also used by Practice and With friends:

- Five plain sentences per round, from hard to easy, each true for five of the six and false only for the impostor.
- Only positive sentences (no "It is not…"), no numbers to compare, no continents.
- The six are picked around a random sentence, with one of the five on the impostor's continent, so the impostor doesn't stick out.
- Héctor's rule: never say which countries are not the impostor.

## Older daily games

- Before 2026-11-12: every clue is false only for the impostor.
- 2026-11-12 (`SUSPECTS_FROM` in `facts.js`): a clue can also be false for one or two other countries ("suspects"), and number clues can be a range ("between 1.000 and 4.000 m"). Clues 1–3 cut the suspects down to the impostor, clues 4–5 are easy ones false only for it.
- **What do they have in common?** (`LINK_FROM` in `facts.js`, `buildLinkRound`): five of the six share one hidden link (a trait from `../shared/data.js` CATS); the impostor doesn't. The five clues: the topic ("Look at the flags."), another fact the five share and the impostor hasn't, two innocent countries crossed out, a third one, then the link itself. Rounds: `{set, c, m:'link', f:[topic, shared fact, link], x: three innocents}`. It was replaced the same day by the plain sentences: `LINK_FROM` and `FACTS_FROM` are the same date, so no daily game uses it now. The code is kept.

## Files and data

- `facts.js` makes the sentences from the Geomingo country database `../data/countries.js` (DATA figures), `../shared/data.js` (CATS traits) and `../top10/extra-data.js` (XDATA figures). Numbers in sentences are round numbers between the impostor and the closest of the other five.
- Daily: countries with 2 million people or more, seeded by the day (`impostor-YYYY-MM-DD`). Solo Easy: 10 million or more; Hard: all 197. With friends: an online room, everyone plays the same set at the same time on their own phone, no lives (`../shared/race.js`).
- The daily game is made from the data each time, so changing the data changes future (and archive) days.
- Flags: the official-shape SVGs of Flag Pie (`../flagpie/flags/`).
- Saves: `im-daily`, `im-hist` {p, r, a, m}, `im-arch`, `im-solo`, `im-diff`. Ranking: `lb/impostor` (no rule change).
