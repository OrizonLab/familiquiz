#!/usr/bin/env node
/* Tests automatiques du stockage (js/store.js) et du calcul de l'âge (js/engine.js).
 * Usage : node tools/test-store.js
 * Vérifie notamment que l'import d'une sauvegarde abîmée, piégée ou interrompue ne casse jamais les données.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ✓ ' + name); }
  catch (e) { failed++; console.log('  ✗ ' + name + '\n      ' + e.message); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion fausse'); }
const eq = (a, b, msg) => assert(JSON.stringify(a) === JSON.stringify(b), (msg || 'valeurs différentes') + ` : ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`);

// Faux localStorage avec un vrai quota (en caractères), comme un navigateur dont le stockage est presque plein.
class FakeStorage {
  constructor() { this.m = new Map(); this.quota = Infinity; }
  size() { let n = 0; this.m.forEach((v, k) => { n += k.length + v.length; }); return n; }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) {
    const old = this.m.has(k) ? k.length + this.m.get(k).length : 0;
    if (this.size() - old + k.length + String(v).length > this.quota) { const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e; }
    this.m.set(k, String(v));
  }
  removeItem(k) { this.m.delete(k); }
}
// Charge une copie neuve de Store dans un contexte isolé.
function freshStore(storage = new FakeStorage()) {
  const ctx = { localStorage: storage, console, Date, JSON, Math, Number, String, Object, Array, Set, Map, Error, RegExp,
    CustomEvent: class { constructor(t) { this.type = t; } }, dispatchEvent: () => true };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(root, 'js/store.js'), 'utf8') + '\nwindow.Store = Store;', ctx);
  return { Store: ctx.Store, storage };
}
const year = new Date().getFullYear();
function sample(Store) {
  const p = Store.createPlayer({ name: 'Léa', avatar: '🦊', color: '#ff9800', birthYear: year - 8, birthMonth: 5 });
  Store.markSeen(p.id, 'geo_abc123');
  Store.addGame({ id: 'g1', date: Date.now(), cats: ['geo'], perSeries: 5, players: [{ id: p.id, name: 'Léa', avatar: '🦊', total: 300, perCat: { geo: { c: 3, n: 5, pts: 300 } } }], winners: [] });
  return p;
}

console.log('Import / export');

test('aller-retour export → import identique', () => {
  const { Store } = freshStore(); sample(Store);
  const dump = JSON.parse(JSON.stringify(Store.exportAll()));
  const b = freshStore().Store; b.importAll(dump);
  eq(b.players().map(p => [p.name, p.birthYear, p.birthMonth]), [['Léa', year - 8, 5]]);
  eq(b.history().length, 1); eq(Object.keys(b.seen(b.players()[0].id)), ['geo_abc123']);
});

const refused = (label, data) => test(label, () => {
  const { Store } = freshStore(); sample(Store);
  const before = JSON.stringify(Store.exportAll().players);
  let threw = false;
  try { Store.importAll(data); } catch (e) { threw = true; }
  assert(threw, 'aurait dû être refusé');
  eq(JSON.stringify(Store.exportAll().players), before, 'les données existantes ont changé');
});
refused('fichier qui n’est pas une sauvegarde : refusé, rien ne change', { hello: 'monde' });
refused('liste de joueurs absente : refusé', { app: 'familiquiz', players: 'x', history: [] });
refused('année de naissance absurde : refusé', { app: 'familiquiz', players: [{ id: 'a1', name: 'X', birthYear: 1066 }], history: [] });
refused('identifiant de joueur dangereux : refusé', { app: 'familiquiz', players: [{ id: '<img>', name: 'X', birthYear: year - 9 }], history: [] });
refused('joueurs en double : refusé', { app: 'familiquiz', players: [{ id: 'a1', name: 'X', birthYear: year - 9 }, { id: 'a1', name: 'Y', birthYear: year - 9 }], history: [] });

test('clés « __proto__ » ignorées (pas de pollution de prototype)', () => {
  const { Store } = freshStore();
  const evil = JSON.parse('{"app":"familiquiz","history":[],"players":[{"id":"a1","name":"X","birthYear":' + (year - 9) +
    ',"stats":{"__proto__":{"pirate":1},"games":3},"skill":{"__proto__":{"pirate":1},"geo":2},"badges":{"constructor":5}}],' +
    '"seen":{"a1":{"__proto__":{"pirate":1},"geo_ab":1}}}');
  Store.importAll(evil);
  const p = Store.players()[0];
  assert(({}).pirate === undefined, 'Object.prototype pollué');
  assert(p.stats.pirate === undefined && p.skill.pirate === undefined, 'objet du joueur pollué');
  eq(p.stats.games, 3); eq(p.skill.geo, 2); eq(Object.keys(p.badges), []);
});

test('avatar, couleur et nom piégés sont neutralisés', () => {
  const { Store } = freshStore();
  Store.importAll({ app: 'familiquiz', history: [], players: [{ id: 'a1', name: 'Léa\u0000<script>alert(1)</script>', avatar: '<img src=x onerror=alert(1)>', color: 'red;background:url(x)', birthYear: year - 9 }] });
  const p = Store.players()[0];
  eq(p.avatar, '🙂'); eq(p.color, '#8b5cf6'); assert(!p.name.includes('\u0000') && p.name.length <= 16, 'nom non nettoyé');
});

test('nombres abîmés (texte, négatif, infini) remis à des valeurs sûres', () => {
  const { Store } = freshStore();
  Store.importAll({ app: 'familiquiz', history: [], players: [{ id: 'a1', name: 'X', birthYear: year - 9, birthMonth: 42,
    stats: { games: 'beaucoup', wins: -5, xp: 1e400, perCat: { geo: { c: 'x', n: 4 } } }, skill: { geo: 'fort' } }] });
  const p = Store.players()[0];
  eq([p.birthMonth, p.stats.games, p.stats.wins, p.stats.xp], [0, 0, 0, 0]); eq(p.stats.perCat.geo, { c: 0, n: 4, pts: 0 }); eq(p.skill, {});
});

test('historique géant tronqué à 300 parties', () => {
  const { Store } = freshStore();
  const h = Array.from({ length: 1000 }, (_, i) => ({ id: 'g' + i, cats: ['geo'], players: [] }));
  Store.importAll({ app: 'familiquiz', history: h, players: [] });
  eq(Store.history().length, 300);
});

test('réglages de mauvais type remplacés par les valeurs par défaut', () => {
  const { Store } = freshStore();
  Store.importAll({ app: 'familiquiz', history: [], players: [], settings: { perSeries: 'dix', time: 999, voiceRate: 50, music: 'oui', tts: 'young' } });
  const s = Store.settings();
  eq([s.perSeries, s.time, s.voiceRate, s.music, s.tts], [10, 10, 1.25, true, 'young']);
});

test('stockage plein en pleine écriture : retour à l’état d’avant', () => {
  const { Store, storage } = freshStore(); sample(Store);
  const before = JSON.stringify([...storage.m.entries()].sort());
  const dump = JSON.parse(JSON.stringify(Store.exportAll()));
  dump.players[0].name = 'Nouveau';
  // Historique volumineux : l'écriture de l'historique dépassera le quota, après celle des joueurs.
  dump.history = Array.from({ length: 300 }, (_, i) => ({ id: 'g' + i, cats: ['geo'], players: [{ id: 'x', name: 'Joueur ' + i, total: i }] }));
  storage.quota = storage.size() + 2000;
  let threw = false;
  try { Store.importAll(dump); } catch (e) { threw = true; }
  storage.quota = Infinity;
  assert(threw, 'l’échec aurait dû être signalé');
  eq(JSON.stringify([...storage.m.entries()].sort()), before, 'stockage non restauré');
  const again = freshStore(storage).Store;
  eq(again.players()[0].name, 'Léa', 'données perdues après la coupure');
});

test('import sans toucher la clé ElevenLabs de l’appareil', () => {
  const { Store, storage } = freshStore(); sample(Store);
  storage.setItem('fq_secret_elevenlabs', 'sk_test');
  Store.importAll(JSON.parse(JSON.stringify(Store.exportAll())));
  eq(storage.getItem('fq_secret_elevenlabs'), 'sk_test');
  assert(!JSON.stringify(Store.exportAll()).includes('sk_test'), 'la clé ne doit jamais être exportée');
});

test('stockage illisible (JSON cassé) : pas de plantage', () => {
  const s = new FakeStorage();
  s.setItem('fq_players', '{pas du json'); s.setItem('fq_settings', '[[[');
  const { Store } = freshStore(s);
  eq(Store.players(), []); eq(Store.settings().perSeries, 10);
});

console.log('Âge');
test('le niveau change le mois de l’anniversaire, pas au 1er janvier', () => {
  const ctx = { window: {} }; ctx.window = ctx; ctx.Store = {}; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(root, 'data/categories.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(root, 'js/engine.js'), 'utf8') + '\nwindow.Engine = Engine;', ctx);
  const E = ctx.Engine, m = new Date().getMonth() + 1;
  eq(E.ageFromBirth(year - 10, m), 10, 'anniversaire ce mois-ci');
  if (m < 12) eq(E.ageFromBirth(year - 10, m + 1), 9, 'anniversaire le mois prochain');
  eq(E.ageFromBirth(year - 10, 0), 10, 'sans mois : année seule');
});

console.log(`\n${passed} test(s) réussi(s), ${failed} échec(s).`);
process.exit(failed ? 1 : 0);
