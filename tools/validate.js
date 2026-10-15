#!/usr/bin/env node
/* Valide les banques de questions (texte : data/questions/*.js, photo : data/photos/*.js).
 * Usage : node tools/validate.js            -> tous les thèmes
 *         node tools/validate.js geo sport  -> thèmes choisis
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');

const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const FLAG = /[\u{1F1E6}-\u{1F1FF}]/u;
const EMOJI = /\p{Extended_Pictographic}/u;

// Charge un fichier dans un contexte neuf et renvoie les questions ajoutées pour ce thème.
function load(file, id) {
  const ctx = {}; ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(root, 'data/categories.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: file });
  return { list: ctx.QUIZ_DATA.questions[id] || [], cats: ctx.QUIZ_DATA.categories.map(c => c.id) };
}

const catCtx = {}; catCtx.window = catCtx;
vm.createContext(catCtx);
vm.runInContext(fs.readFileSync(path.join(root, 'data/categories.js'), 'utf8'), catCtx);
const cats = catCtx.QUIZ_DATA.categories.map(c => c.id);
const wanted = process.argv.slice(2).length ? process.argv.slice(2) : cats;

let totalErrors = 0, totalWarnings = 0, totalQuestions = 0, totalPhotos = 0;
const allKeys = new Map(); // doublons entre texte et photo d'un même thème

function check(list, kind, id, errors, warnings, perLevel) {
  list.forEach((item, i) => {
    const where = `${kind} #${i + 1} « ${String(item.q || '').slice(0, 60)} »`;
    if (![1, 2, 3, 4].includes(item.l)) errors.push(`${where}: niveau l invalide (${item.l})`);
    else perLevel[item.l]++;
    if (typeof item.q !== 'string' || item.q.length < 8) errors.push(`${where}: question manquante`);
    else if (item.q.length > 160) warnings.push(`${where}: question longue (${item.q.length} car.)`);
    if (!Array.isArray(item.a) || item.a.length < 3 || item.a.length > 4) errors.push(`${where}: il faut 3 ou 4 réponses`);
    else {
      const an = item.a.map(norm);
      if (new Set(an).size !== an.length) errors.push(`${where}: réponses en double`);
      item.a.forEach(r => {
        if (typeof r !== 'string' || !r.trim()) errors.push(`${where}: réponse vide`);
        else if (r.length > 48) warnings.push(`${where}: réponse longue « ${r} »`);
      });
      if (item.a.some(r => /toutes|aucune de ces/i.test(r))) warnings.push(`${where}: éviter « toutes / aucune »`);
    }
    if (kind === 'photo') {
      if (typeof item.img !== 'string' || !/^img\/[a-z0-9_-]+\/[a-z0-9_.-]+\.(jpe?g|png|webp)$/i.test(item.img)) errors.push(`${where}: chemin img invalide (${item.img})`);
      else {
        const f = path.join(root, item.img);
        if (!fs.existsSync(f)) errors.push(`${where}: image absente ${item.img}`);
        else if (fs.statSync(f).size > 350 * 1024) warnings.push(`${where}: image lourde (${Math.round(fs.statSync(f).size / 1024)} Ko)`);
      }
      if (typeof item.cr !== 'string' || item.cr.length < 3) errors.push(`${where}: crédit cr manquant`);
      if (typeof item.src !== 'string' || !/^https:\/\/commons\.wikimedia\.org\//.test(item.src)) errors.push(`${where}: source src manquante`);
      if (item.e && FLAG.test(item.e)) errors.push(`${where}: emoji drapeau interdit`);
    } else {
      if (typeof item.e !== 'string' || !EMOJI.test(item.e)) errors.push(`${where}: emoji e manquant`);
      else if (FLAG.test(item.e)) errors.push(`${where}: emoji drapeau interdit (illisible sous Windows)`);
    }
    if (typeof item.f !== 'string' || item.f.length < 10) warnings.push(`${where}: anecdote f manquante`);
    else if (item.f.length > 220) warnings.push(`${where}: anecdote longue (${item.f.length} car.)`);
    const key = id + '|' + norm(item.q) + (item.img ? '|' + item.img : '');
    if (allKeys.has(key)) errors.push(`${where}: doublon de ${allKeys.get(key)}`);
    else allKeys.set(key, where);
  });
}

for (const id of wanted) {
  const errors = [], warnings = [];
  const perLevel = { 1: 0, 2: 0, 3: 0, 4: 0 }, photoLevel = { 1: 0, 2: 0, 3: 0, 4: 0 };
  let n = 0, np = 0;
  const qFile = path.join(root, 'data/questions', id + '.js');
  const pFile = path.join(root, 'data/photos', id + '.js');
  if (!fs.existsSync(qFile)) { console.log(`✗ ${id}: fichier absent`); totalErrors++; continue; }
  try { const { list } = load(qFile, id); n = list.length; check(list, 'texte', id, errors, warnings, perLevel); }
  catch (e) { console.log(`✗ ${id}: erreur de syntaxe — ${e.message}`); totalErrors++; continue; }
  if (fs.existsSync(pFile)) {
    try { const { list } = load(pFile, id); np = list.length; check(list, 'photo', id, errors, warnings, photoLevel); }
    catch (e) { errors.push(`photos : erreur de syntaxe — ${e.message}`); }
  }
  totalQuestions += n; totalPhotos += np;
  totalErrors += errors.length; totalWarnings += warnings.length;
  const lv = Object.entries(perLevel).map(([k, v]) => `N${k}:${v}`).join(' ');
  const pv = np ? `  📷 ${np} (${Object.entries(photoLevel).map(([k, v]) => `N${k}:${v}`).join(' ')})` : '';
  console.log(`${errors.length ? '✗' : '✓'} ${id.padEnd(9)} ${String(n).padStart(4)} questions  (${lv})${pv}  erreurs:${errors.length} avert.:${warnings.length}`);
  errors.forEach(e => console.log('    ERREUR ' + e));
  warnings.forEach(w => console.log('    avert. ' + w));
}

console.log(`\nTotal : ${totalQuestions} questions texte + ${totalPhotos} questions photo, ${totalErrors} erreur(s), ${totalWarnings} avertissement(s).`);
process.exit(totalErrors ? 1 : 0);
