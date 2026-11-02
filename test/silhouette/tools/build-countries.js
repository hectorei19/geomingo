// Builds ../countries.js (and ../flags.js): the 196 countries of the game with their names, aliases, continent and silhouette.
// Only needed to rebuild that file. Run from this folder:
//   npm install
//   node build-countries.js ../../shared/data.js     (any copy of Country Grid's data.js, e.g. Top 10's)
// Borders: world-atlas (Natural Earth 1:10m, public domain). Names, aliases, continents: Country Grid's data.
const fs = require('fs'), path = require('path');
const d3 = require('d3-geo'), topo = require('topojson-client'), wc = require('world-countries');

const dataFile = process.argv[2];
if (!dataFile) { console.error('Usage: node build-countries.js <path to data.js>'); process.exit(1); }
// Vatican City is left out: at 0.44 km2 its border in world-atlas is a single line, with no shape to draw
const C = JSON.parse(fs.readFileSync(dataFile, 'utf8').match(/const C = (\[.*?\]);/s)[1]).filter(c => !c.t && c.c !== 'VAT');

// silhouettes are drawn in a 100 x 100 box
const BOX = 100;
// a detail smaller than this (in box units) is smoothed away; 0.25 is a quarter of a pixel at 400 px
const TOL = 0.25;
// an island or exclave is kept when it lies within this distance of the part already kept; when the result fills
// too little of the box (Mauritius with its far islands) the next, shorter distance is tried; when none does
// (nations of tiny atolls: Tuvalu, Maldives) the whole group stays, and the game draws each islet as a dot
const NEAR_KM = [600, 150, 40];
const MIN_FILL = 0.015;
// ...or when it is at least this share of the biggest part (Alaska, Svalbard)
const BIG = 0.2;
// countries whose main part is not their biggest: [lon, lat] inside the part to start from
const ANCHOR = { KIR: [173.0, 1.4] }; // Kiribati: the Gilbert Islands (Tarawa), not Kiritimati
// a speck smaller than this area (box units squared) is dropped, unless the country has no big landmass
const SPECK = 0.15;

// extra names players commonly type (the data already has official names and some short forms)
const EXTRA = {
  NLD: ['Holland'], CZE: ['Czech Republic'], MKD: ['Macedonia'], SWZ: ['Swaziland'], MMR: ['Burma'],
  CPV: ['Cape Verde'], TLS: ['East Timor'], COD: ['DRC', 'Congo Kinshasa', 'Zaire'], COG: ['Congo Brazzaville', 'Republic of the Congo'],
  PRK: ['DPRK'], ARE: ['UAE', 'Emirates'], VAT: ['Holy See', 'Vatican'], FSM: ['Micronesia'],
  TUR: ['Turkey', 'Turkiye'], BIH: ['Bosnia'], GBR: ['Great Britain'], USA: ['USA', 'US'], CAF: ['CAR'], PNG: ['PNG'],
  VCT: ['St Vincent'], KNA: ['St Kitts', 'Saint Kitts'], LCA: ['St Lucia'], STP: ['Sao Tome'], GNB: ['Guinea Bissau'],
  TTO: ['Trinidad'], ATG: ['Antigua'], LAO: ['Laos'], BRN: ['Brunei'], RUS: ['Russian Federation'], SYR: ['Syria'],
  VNM: ['Viet Nam'], IRN: ['Persia'], LKA: ['Ceylon'], ZAF: ['RSA'], NZL: ['NZ'], BLR: ['Belorussia']
};

// the Easy list: big or very present on maps, news and travel, and with a shape that reads in a small box
const EASY = ['ESP','PRT','FRA','ITA','DEU','GBR','IRL','GRC','NOR','SWE','FIN','POL','UKR','RUS','TUR','ISL',
  'USA','CAN','MEX','CUB','BRA','ARG','CHL','PER','COL','VEN','BOL','URY',
  'CHN','IND','JPN','KOR','IDN','PHL','VNM','THA','SAU','IRN','PAK','MNG','KAZ',
  'EGY','MAR','DZA','LBY','NGA','ETH','KEN','SOM','COD','ZAF','MDG',
  'AUS','NZL'];

const n2a = {}; wc.forEach(c => { if (c.ccn3) n2a[c.ccn3] = c.cca3; });
const atlas = require('world-atlas/countries-10m.json');
// pieces Natural Earth keeps apart, joined to the country they are drawn with on most maps
const JOIN = { 'Kosovo': 'UNK', 'Somaliland': 'SOM', 'N. Cyprus': 'CYP', 'Cyprus U.N. Buffer Zone': 'CYP', 'Akrotiri': 'CYP',
  'Dhekelia': 'CYP', 'Baikonur': 'KAZ', 'USNB Guantanamo Bay': 'CUB' };
// world-atlas gives Ashmore and Cartier Islands Australia's number too
const SKIP = new Set(['Ashmore and Cartier Is.']);
const parts = {};
atlas.objects.countries.geometries.forEach(g => {
  const code = JOIN[g.properties.name] || (!SKIP.has(g.properties.name) && n2a[g.id]);
  if (code) (parts[code] = parts[code] || []).push(g);
});
// one shape per country, with the shared borders of joined pieces dissolved
const featureOf = code => ({ type: 'Feature', properties: { code }, geometry: topo.merge(atlas, parts[code]) });

// keep the main part and what lies near it, so far-off pieces (French Guiana, Hawaii, Easter Island) do not shrink the country
function keepParts(f, code, nearKm) {
  const g = f.geometry;
  if (g.type !== 'MultiPolygon') return f;
  const near = nearKm / 6371;
  // world-atlas has a few broken rings (three in the Maldives) that would cover the whole globe
  const P = g.coordinates.filter(c => d3.geoArea({ type: 'Polygon', coordinates: c }) < 2 * Math.PI).map(c => {
    const p = { type: 'Polygon', coordinates: c }, m = d3.geoCentroid(p);
    let r = 0; for (const v of c[0]) r = Math.max(r, d3.geoDistance(m, v));
    return { c, p, a: d3.geoArea(p), m, r };
  }).sort((x, y) => y.a - x.a);
  let main = P[0];
  if (ANCHOR[code]) main = P.reduce((b, q) => d3.geoDistance(q.m, ANCHOR[code]) < d3.geoDistance(b.m, ANCHOR[code]) ? q : b);
  const kept = new Set([main]), queue = [main];
  while (queue.length) {
    const k = queue.shift();
    for (const q of P) {
      if (kept.has(q)) continue;
      // gap between the two parts, measured between their enclosing circles
      if ((q.a >= BIG * main.a && !ANCHOR[code]) || d3.geoDistance(k.m, q.m) - k.r - q.r < near) { kept.add(q); queue.push(q); }
    }
  }
  return { type: 'Feature', properties: f.properties, geometry: { type: 'MultiPolygon', coordinates: [...kept].map(k => k.c) } };
}

// Douglas-Peucker on one closed ring, in box units: split at the point farthest from the start, then each half
function simplify(ring, tol) {
  if (ring.length < 4) return ring;
  const [x0, y0] = ring[0];
  let far = 0, fd = -1;
  ring.forEach(([x, y], i) => { const d = (x - x0) ** 2 + (y - y0) ** 2; if (d > fd) { fd = d; far = i; } });
  const a = simplifyLine(ring.slice(0, far + 1), tol), b = simplifyLine([...ring.slice(far), ring[0]], tol);
  return [...a, ...b.slice(1, -1)];
}
function simplifyLine(pts, tol) {
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [i, j] = stack.pop(), [ax, ay] = pts[i], [bx, by] = pts[j], dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
    let md = 0, mi = -1;
    for (let k = i + 1; k < j; k++) { const d = Math.abs(dy * (pts[k][0] - ax) - dx * (pts[k][1] - ay)) / L; if (d > md) { md = d; mi = k; } }
    if (md > tol) { keep[mi] = 1; stack.push([i, mi], [mi, j]); }
  }
  return pts.filter((_, k) => keep[k]);
}
const ringArea = r => Math.abs(r.reduce((s, [x, y], i) => { const [u, v] = r[(i + 1) % r.length]; return s + x * v - u * y; }, 0) / 2);

// each country on its own map, centred on itself (azimuthal equal-area): no stretching far from the equator,
// and the antimeridian cut falls on the far side of the globe, so Russia, Fiji or Kiribati are never split
function silhouette(feature, code) {
  let first = null;
  for (const km of NEAR_KM) {
    const r = drawn(keepParts(feature, code, km));
    if (!first) first = r;
    if (r.fill >= MIN_FILL) { if (km !== NEAR_KM[0]) console.log(code, 'kept parts within', km, 'km'); return r.path; }
  }
  console.log(code, 'only tiny islands, fill', first.fill.toFixed(4));
  return first.path;
}
function drawn(f) {
  const proj = d3.geoAzimuthalEqualArea().rotate(d3.geoCentroid(f).map(v => -v)).fitExtent([[0, 0], [BOX, BOX]], f);
  const rings = []; let cur = null;
  d3.geoStream(f, proj.stream({
    point(x, y) { cur.push([x, y]); }, lineStart() { cur = []; }, lineEnd() { rings.push(cur); },
    polygonStart() {}, polygonEnd() {}, sphere() {}
  }));
  // after dropping specks, centre the drawing in the box again
  // specks are measured against the biggest ring, so a country made only of atolls (Kiribati) keeps them
  // an islet that simplifies away keeps a few of its points, so it still shows as a dot
  const simple = rings.map(r => { const t = simplify(r, TOL); return t.length >= 3 ? t : r.filter((_, i) => i % Math.ceil(r.length / 4) === 0); })
    .filter(r => r.length >= 3);
  const big = Math.max(...simple.map(ringArea));
  const out = big >= 50 ? simple.filter(r => ringArea(r) >= SPECK) : simple;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  out.forEach(r => r.forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }));
  const s = BOX / Math.max(x1 - x0, y1 - y0), ox = (BOX - (x1 - x0) * s) / 2, oy = (BOX - (y1 - y0) * s) / 2;
  const q = v => Math.round(v * 10) / 10;
  return {
    path: out.map(r => 'M' + r.map(([x, y]) => q((x - x0) * s + ox) + ' ' + q((y - y0) * s + oy)).join('L') + 'Z').join(''),
    fill: out.reduce((t, r) => t + ringArea(r), 0) * s * s / (BOX * BOX)
  };
}

const missing = C.filter(c => !parts[c.c]);
if (missing.length) { console.error('No border for', missing.map(c => c.n)); process.exit(1); }
const badEasy = EASY.filter(k => !C.some(c => c.c === k));
if (badEasy.length) { console.error('Easy codes not in the data', badEasy); process.exit(1); }

const list = C.map(c => {
  const al = [...new Set([...(c.al || []), ...(EXTRA[c.c] || [])])].filter(a => a !== c.n);
  return { c: c.c, n: c.n, al, r: c.r, f: c.f, e: EASY.includes(c.c) ? 1 : 0, p: silhouette(featureOf(c.c), c.c) };
}).sort((a, b) => a.n.localeCompare(b.n));

const head = `// The ${list.length} countries of Silhouette: code, English name, other accepted names (al), continent (r),
// flag emoji (f), in the Easy list (e) and silhouette (p, an SVG path in a 100 x 100 box, north up).
// Made by tools/build-countries.js from world-atlas (Natural Earth 1:10m borders, public domain) and Country Grid's
// country data (mledoze/countries, ODbL). Do not edit by hand: change the tool and run it again.\n`;
const body = 'const COUNTRIES = [\n' + list.map(x => JSON.stringify(x)).join(',\n') + '\n];\n';
fs.writeFileSync(path.join(__dirname, '..', 'countries.js'), head + body);
// flags (flag-icons, MIT, as in Country Grid), kept as plain SVG text: smaller to download than base64
const F = JSON.parse(fs.readFileSync(dataFile, 'utf8').match(/const FLAGS = (\{.*?\});/s)[1]);
const flags = {};
list.forEach(c => { const u = F[c.c]; flags[c.c] = u.startsWith('data:image/svg+xml;base64,') ? Buffer.from(u.split(',')[1], 'base64').toString('utf8') : u; });
const fhead = `// Flags of the ${list.length} countries as SVG text, shown once a silhouette is answered. Made by tools/build-countries.js
// from Country Grid's flags (flag-icons, MIT License). Loaded after the page, so the game never waits for it.\n`;
fs.writeFileSync(path.join(__dirname, '..', 'flags.js'), fhead + 'const FLAGS = ' + JSON.stringify(flags) + ';\n');
console.log(list.length, 'countries,', EASY.length, 'easy,', Math.round((head + body).length / 1024), 'KB');
