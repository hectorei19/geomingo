# Flag Pie

Geography quiz: a pie chart shows the colours of a country's flag and how much of the flag each one covers, coat of arms and all. Name the country. Part of [Geomingo](https://geomingo.com/).

- One flag per game. The pie is always open; a wrong answer (or Next clue) opens the next clue: 2 the design (stripes and symbols), 3 on the map (continent, coast, neighbours), 4 population and the capital's first letter, 5 the flag blurred.
- Right with k clues open = 6 − k points (5 to 1). A wrong answer with all five open, or "I don't know", is 0.
- A flag with the same pie (`SAME`: every colour within 1,5 points, for example France, the Netherlands, Russia and Thailand) is a right answer too.
- Daily: one flag, the same for everyone, new at midnight CET, only from flags whose pie has no near twin (`UNIQ`: no other flag within 3 points), dealt from a deck shuffled once per cycle. `?test&day=2026-11-20` plays that day without saving.
- Solo: one flag after another. Easy: `UNIQ` flags of countries with 10 million people or more. Hard: all 197. With friends: an online room, everyone plays the same set at the same time on their own phone, no lives (`../shared/race.js`).
- Saved on the device: `fp-daily`, `fp-hist` ({p points, r 1 if named, k clues, m wrong}), `fp-arch`, `fp-solo`, `fp-diff`. Ranking: `lb/flagpie` (s points, m wrong answers).

## The data

- `flags/<code>.svg`: the flags in their official shapes, from [hjnilsson/country-flags](https://github.com/hjnilsson/country-flags) (npm `svg-country-flags` 1.2.10, from Wikimedia Commons, public domain).
- `pies.js`: `PIE`, `LAY`, `SAME`, `UNIQ`, made with the scripts in `tools/`:
  1. `node tools/measure.js <repo> <folder with the svgs named by 2-letter code> raw.json` draws every flag 1.500 pixels wide in Chromium (Playwright) and gives each pixel to the closest colour named in the flag's SVG (so edges and gradients go to a real flag colour).
  2. `node tools/slices.js raw.json pies.json` joins colours that look the same (closer than 30 in RGB), puts specks under 0,5 % into the closest colour, names the colours, rounds to one decimal so they add up to exactly 100,0, and finds the stripes (rows or columns of one colour).
  3. `node tools/build.js pies.json > pies.js` compares the pies by colour name for `SAME` and `UNIQ`.
- Black is always one of the possible colours: an SVG shape with no fill is drawn black (Afghanistan, Belgium, Jamaica… were missing their black until 2026-11-05).
- The daily deck (`DECK` in index.html) is the list of the first day, kept as it is so a day's flags never change when the pies are measured again.
