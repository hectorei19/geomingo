// Silhouette helpers: drawing a country's shape, the answer box's search, and seeded random picks.
// Needs countries.js (COUNTRIES) loaded first.

// the day changes at midnight in Spain, for everyone (as in the other games)
const madrid = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
function madridParts(t) { const o = {}; madrid.formatToParts(new Date(t)).forEach(p => o[p.type] = p.value); return o; }

const byCode = Object.fromEntries(COUNTRIES.map(c => [c.c, c]));
// country names compared without accents, case, spaces or punctuation ("Côte d'Ivoire" = "cotedivoire")
const norm = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');
COUNTRIES.forEach(c => { c.k = norm(c.n); c.ak = c.al.map(norm); });

// the points of a silhouette, read once from its path
const ptsCache = {};
function silPoints(c) {
  if (!ptsCache[c.c]) ptsCache[c.c] = c.p.split(/[MLZ]/).filter(Boolean).map(s => s.split(' ').map(Number));
  return ptsCache[c.c];
}
// a country's silhouette as an <svg>, turned rot degrees (Hard) and fitted to the same square box whatever the turn
function silSVG(code, rot, cls) {
  const c = byCode[code];
  rot = rot || 0;
  // a small margin keeps the outline inside the box
  let vb = '-3 -3 106 106', g = '';
  if (rot) {
    const a = rot * Math.PI / 180, cos = Math.cos(a), sin = Math.sin(a);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of silPoints(c)) {
      const u = 50 + (x - 50) * cos - (y - 50) * sin, v = 50 + (x - 50) * sin + (y - 50) * cos;
      if (u < x0) x0 = u; if (u > x1) x1 = u; if (v < y0) y0 = v; if (v > y1) y1 = v;
    }
    const side = Math.max(x1 - x0, y1 - y0) * 1.06, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    vb = [cx - side / 2, cy - side / 2, side, side].map(v => +v.toFixed(2)).join(' ');
    g = ` transform="rotate(${rot} 50 50)"`;
  }
  // the outline adds a hair around the shape so that islets too small to fill still show as dots
  return `<svg class="sil${cls ? ' ' + cls : ''}" viewBox="${vb}" role="img" aria-label="Silhouette of a country"><path d="${c.p}" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke" fill-rule="evenodd"${g}/></svg>`;
}

// the answer box: countries named exactly by what was typed, then those whose name starts with it, then contain it
function searchCountries(q, pool, max) {
  const k = norm(q);
  if (!k) return [];
  const list = pool || COUNTRIES, exact = [], starts = [], inside = [];
  for (const c of list) {
    if (c.k === k || c.ak.includes(k)) exact.push(c);
    else if (c.k.startsWith(k) || c.ak.some(a => a.startsWith(k))) starts.push(c);
    else if (k.length >= 3 && (c.k.includes(k) || c.ak.some(a => a.includes(k)))) inside.push(c);
  }
  return [...exact, ...starts, ...inside].slice(0, max || 6);
}
// the country a full answer names, or null
const countryNamed = q => { const k = norm(q); return COUNTRIES.find(c => c.k === k || c.ak.includes(k)) || null; };

// seeded random numbers (mulberry32): the same seed always gives the same picks
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function shuffled(arr, rand) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
// Hard turns: anything from 30 to 330 degrees, so north is never up by chance
const hardTurn = rand => 30 + Math.floor(rand() * 301);

const DIFFS = ['easy', 'normal', 'hard'];
const poolOf = (diff, cont) => COUNTRIES.filter(c => (diff !== 'easy' || c.e) && (!cont || cont === 'all' || c.r === cont));
