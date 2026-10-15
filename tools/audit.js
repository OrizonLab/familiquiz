#!/usr/bin/env node
/* Audit des banques : biais « la bonne réponse est la plus longue » et doublons entre thèmes.
 * Usage : node tools/audit.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const ctx = {}; ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'data/categories.js'), 'utf8'), ctx);
const cats = ctx.QUIZ_DATA.categories.map(c => c.id);
cats.forEach(id => {
  const f = path.join(root, 'data/questions', id + '.js');
  if (fs.existsSync(f)) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx);
});
// Questions photo : chargées à part pour ne pas fausser les statistiques des questions texte.
const pctx = {}; pctx.window = pctx;
vm.createContext(pctx);
vm.runInContext(fs.readFileSync(path.join(root, 'data/categories.js'), 'utf8'), pctx);
cats.forEach(id => {
  const f = path.join(root, 'data/photos', id + '.js');
  if (fs.existsSync(f)) vm.runInContext(fs.readFileSync(f, 'utf8'), pctx);
});

const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const words = s => new Set(norm(s).split(' ').filter(w => w.length > 3));
const jaccard = (a, b) => { let i = 0; a.forEach(w => b.has(w) && i++); return i / (a.size + b.size - i || 1); };

console.log('Thème      longest%  (attendu ≈ 25-33 %)');
const all = [];
cats.forEach(id => {
  const list = ctx.QUIZ_DATA.questions[id] || [];
  if (!list.length) return;
  let longest = 0;
  list.forEach((q, i) => {
    const L = q.a.map(s => s.length);
    if (L[0] > Math.max(...L.slice(1))) longest++;
    all.push({ id, i, q: q.q, w: words(q.q), ans: norm(q.a[0]) });
  });
  console.log(`${id.padEnd(10)} ${String(Math.round(100 * longest / list.length)).padStart(5)} %`);
});

console.log('\nQuestions très proches entre thèmes (même bonne réponse et formulation proche) :');
let n = 0;
for (let x = 0; x < all.length; x++) for (let y = x + 1; y < all.length; y++) {
  const A = all[x], B = all[y];
  if (A.id === B.id || A.ans !== B.ans) continue;
  const j = jaccard(A.w, B.w);
  if (j >= 0.35) { n++; console.log(`  [${A.id}] ${A.q}\n  [${B.id}] ${B.q}\n`); }
}
console.log(n ? `${n} paire(s) à vérifier.` : 'Aucune.');

console.log('\nQuestions photo en double (même image, ou même bonne réponse dans un thème) :');
let m = 0;
const imgs = new Map();
cats.forEach(id => {
  const list = pctx.QUIZ_DATA.questions[id] || [];
  const answers = new Map();
  list.forEach(q => {
    if (imgs.has(q.img)) { m++; console.log(`  image réutilisée : ${q.img}`); } else imgs.set(q.img, 1);
    const a = norm(q.a[0]);
    if (answers.has(a)) { m++; console.log(`  [${id}] « ${q.a[0]} » : ${answers.get(a)} / ${q.img}`); } else answers.set(a, q.img);
  });
});
console.log(m ? `${m} doublon(s) photo.` : 'Aucun.');
