# Impostor (Trip 8)

Geography quiz: six countries each say something about themselves, and one of them is lying: the impostor. Part of [Geomingo](https://geomingo.com/).

## How to play

**Who's lying?** (since 2026-11-15, `LIES_FROM` in `lies.js`; Solo and With friends too). Six rounds per game, each with six new countries (no country twice in a game). Every country says one sentence about itself: five are true, one is a lie that sounds true. Tap the liar: right first time 5 points; a wrong pick shows that sentence was true and leaves one more try for 2 points; wrong again 0. Best game 30. After each round every sentence shows a short note.

- The sentences are hand-written in `lies.js` (`LIES_BANK`): `[code, kind, topic, sentence, note, first day]`, kind 0 = true, 1–3 = lie (easy to hard). Two sentences of the same topic never meet in a round, and the six lies of a day all have different topics.
- Never about what you can see on the flag; nothing that can change soon (no "won the World Cup N times").
- Daily: dealt day after day from `LIES_FROM`, each day taking the lies and truths used longest ago (seeded by `impostor-YYYY-MM-DD`), easy lies first. Add new entries **at the end**, with a first day of tomorrow or later, so past days stay as they were.

Each daily game uses the rules of the day it was made, so the archive keeps old days as they were.

From 2026-11-13 to 2026-11-14 (`FACTS_FROM` in `facts.js`):

- Five plain sentences per round, from hard to easy, each true for five of the six and false only for the impostor.
- Only positive sentences (no "It is not…"), no numbers to compare, no continents.
- The six are picked around a random sentence, with one of the five on the impostor's continent, so the impostor doesn't stick out.
- Héctor's rule: never say which countries are not the impostor.

## Older daily games

- Before 2026-11-12: every clue is false only for the impostor.
- 2026-11-12 (`SUSPECTS_FROM` to `FACTS_FROM` in `facts.js`): a clue can also be false for one or two other countries ("suspects"), and number clues can be a range ("between 1.000 and 4.000 m"). Clues 1–3 cut the suspects down to the impostor, clues 4–5 are easy ones false only for it.

## Files and data

- `facts.js` makes the sentences from the Geomingo country database `../data/countries.js` (DATA figures), `../shared/data.js` (CATS traits) and `../top10/extra-data.js` (XDATA figures). Numbers in sentences are round numbers between the impostor and the closest of the other five.
- Days before 2026-11-15: countries with 2 million people or more, seeded by the day (`impostor-YYYY-MM-DD`). With friends: an online room, everyone plays the same set at the same time on their own phone, no lives (`../shared/race.js`).
- The daily game is made from the data each time, so changing the data changes future (and archive) days.
- Flags: the official-shape SVGs of Flag Pie (`../flagpie/flags/`).
- Saves: `im-daily`, `im-hist` {p, r, a, m}, `im-arch`, `im-solo`, `im-diff`. Ranking: `lb/impostor` (no rule change).
