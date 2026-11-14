// Moves Capitals' data in Firebase from its old names (Cities / City Grid) to "capitals".
//
//   users/<uid>/cities/…   ->  users/<uid>/capitals/…   (daily, games, archive of every player)
//   lb/citygrid/…          ->  lb/capitals/…            (the daily rankings)
//   gprofiles/citygrid/…   ->  gprofiles/capitals/…     (the public stats)
//
// Nothing is lost: what is already at the new place wins, the old data only fills in what is missing.
// The old places are deleted only after the copy. It can be run again safely (it only moves what is left).
//
// How to run it (from this folder, capitals/tools/):
//   1. Firebase console -> Project settings -> Service accounts -> "Generate new private key".
//      Save the file here as key.json (it is secret: .gitignore keeps it out of GitHub; delete it when done).
//   2. npm install
//   3. node move-to-capitals.js        -> only shows what it would move (changes nothing)
//   4. node move-to-capitals.js --go   -> moves it
const admin = require('firebase-admin');
const path = require('path');

const GO = process.argv.includes('--go');
const DB_URL = 'https://borderline-90920-default-rtdb.europe-west1.firebasedatabase.app';
admin.initializeApp({ credential: admin.credential.cert(require(path.join(__dirname, 'key.json'))), databaseURL: DB_URL });
const db = admin.database();

const isObj = x => x && typeof x === 'object' && !Array.isArray(x);
// old filled in under new: anything already in the new place wins
function merge(oldV, newV) {
  if (!isObj(oldV) || !isObj(newV)) return newV === undefined || newV === null ? oldV : newV;
  const out = { ...oldV };
  for (const [k, v] of Object.entries(newV)) out[k] = merge(oldV[k], v);
  return out;
}
const count = x => isObj(x) ? Object.keys(x).length : 0;

async function main() {
  console.log(GO ? 'MOVING the data…' : 'TRIAL RUN: nothing is changed. Add --go to move it.');
  const up = {};

  // every player's Capitals data
  const users = (await db.ref('users').once('value')).val() || {};
  let players = 0;
  for (const [uid, u] of Object.entries(users)) {
    if (!u || !u.cities) continue;
    players++;
    up['users/' + uid + '/capitals'] = merge(u.cities, u.capitals);
    up['users/' + uid + '/cities'] = null;
  }
  console.log('Players with Capitals data to move:', players);

  // rankings and public stats
  for (const [from, to] of [['lb/citygrid', 'lb/capitals'], ['gprofiles/citygrid', 'gprofiles/capitals']]) {
    const oldV = (await db.ref(from).once('value')).val();
    if (!oldV) { console.log(from + ': nothing there'); continue; }
    const newV = (await db.ref(to).once('value')).val();
    up[to] = merge(oldV, newV);
    up[from] = null;
    console.log(from + ' -> ' + to + ': ' + count(oldV) + (from.startsWith('lb') ? ' days' : ' players'));
  }

  if (!Object.keys(up).length) { console.log('Nothing left to move.'); return; }
  if (!GO) { console.log('Trial run finished. Run it again with --go to move it.'); return; }
  await db.ref().update(up); // all at once: either everything moves or nothing does
  console.log('Done: everything is now under "capitals".');
}
main().then(() => process.exit(0), e => { console.error('Error:', e.message); process.exit(1); });
