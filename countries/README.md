# Countries (Geomingo)

Part of [Geomingo](https://hectorei19.github.io/geomingo/), daily geography games. The game was called Country Grid (and Borderline before that); the saved data keep those names (`bl-` keys, Firebase project borderline-90920).

Geography grid game: name a country or territory that matches each row and column (250 to choose from). Every grid is checked so it can always be completed, whatever answers are given.
Today's grid (one 4×4 Normal grid a day for everyone), Solo (unlimited grids), or With friends (online rooms, up to 4 phones) via Firebase Realtime Database.

Files:
- `index.html` – the whole game (country data, category data and flags included). Its look (colours, fonts, Mingo, the header, the result window) comes from Geomingo's shared files in `../brand/`.
- `version.json` – the version number; change it together with `APP_VERSION` in `index.html` so phones with the game open get the reload notice.
- `firebase-config.js` – your Firebase web config (paste it in).
- `database.rules.json` – rules to paste in Firebase → Realtime Database → Rules.

## Daily grids

The daily grids are fixed in advance in `index.html` (`DAILY_FIXED`, one entry per day from 2026-10-15 to 2027-10-15), so adding or changing categories never changes a day's grid. Days not in the list fall back to generating the grid from the date.
To add more days before the list runs out, open the game in a browser, run this in the console and paste the result into `DAILY_FIXED` (merging `labels` and `days`). A category never comes back within 3 days and appears at most 45 times a year:

```js
const labels=[...DAILY_FIXED.labels],idx=new Map(labels.map((l,i)=>[l,i])),days={},count={},recent=[];
for(let d=0;d<366;d++){const key=new Date(Date.parse('2027-10-16T12:00Z')+d*864e5).toISOString().slice(0,10);
  AVOID=new Set(recent.slice(-3).flat());for(const l in count)if(count[l]>=45)AVOID.add(l);
  let seed=dailySeed(key),g=generate(DAILY_N,seed,DAILY_DIFF),k=0;while(!g&&k++<50){seed=(seed+1)%7962624;g=generate(DAILY_N,seed,DAILY_DIFF)}
  AVOID=null;if(!g)continue;const ls=[...g.rows,...g.cols].map(i=>CATS[i].label);recent.push(ls);ls.forEach(l=>count[l]=(count[l]||0)+1);
  days[key]=ls.map(l=>{if(!idx.has(l)){idx.set(l,labels.length);labels.push(l)}return idx.get(l)})}
copy(JSON.stringify({labels,days}))
```

How categories are picked: every category has the same chance, then `CATW` (measured weights) holds back the ones that fit with almost anything, and `WILD` halves the chance of the two broadest ("Drives on the left", "Independence from the UK"). The weights only apply up to 4 × 4.

## Credits

- Country data: [mledoze/countries](https://github.com/mledoze/countries) (npm `world-countries`), Open Database License (ODbL) 1.0. Adapted: some names shortened; a few borders, official languages, currencies and capitals corrected; Antarctica removed; "drives on the left" list added by hand.
- Flag colours (measured, then checked by eye), flag symbols, seas, peaks, memberships, monarchies and sport lists: compiled by hand, correct as of October 2026.
- Population, capitals, development and economy, politics and history, geography and sport categories: Wikipedia lists (CC BY-SA 4.0), downloaded in October 2026; each list and its original source (UN, UNDP, World Bank, CIA World Factbook, Transparency International...) is named in the game's Credits and in each category's info.
- Flags: [flag-icons](https://github.com/lipis/flag-icons), MIT License.
- Fonts: Fredoka and Nunito (Google Fonts, SIL Open Font License).
- Online rooms: Firebase Realtime Database.
