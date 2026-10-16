#!/usr/bin/env node
/* Génère les lectures enregistrées des questions avec une voix libre Piper.
 *
 * Usage : node tools/make-voice.js                 -> niveau 1 (7-9 ans), voix enregistrée dans data/voice.js
 *         node tools/make-voice.js 1 2             -> niveaux 1 et 2
 *         node tools/make-voice.js 1 --voix=pierre -> change de voix (tout est régénéré)
 *
 * Voix disponibles (VOICES ci-dessous) : tom, pierre (hommes), siwis (femme).
 * La vitesse (length_scale) de chaque voix est calibrée pour ~19 caractères par seconde.
 *
 * Prérequis (non publiés, dans .voice/) :
 *   .voice/piper/piper/piper.exe              (https://github.com/rhasspy/piper/releases)
 *   .voice/model/<modèle>.onnx(.json)         (https://huggingface.co/rhasspy/piper-voices)
 *   .voice/node_modules/lamejs                (npm install --prefix .voice lamejs@1.2.1)
 *
 * Sorties : audio/voix/<empreinte>.mp3 (un fichier par texte : question, réponse, lettre A-D)
 *           data/voice.js (voix utilisée et liste des enregistrements disponibles, lue par le jeu)
 * Seuls les textes manquants sont générés ; les enregistrements devenus inutiles sont supprimés.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { spawn } = require('child_process');

const VOICES = {
  tom: {
    model: 'fr_FR-tom-medium', scale: 1.06,
    credit: 'Voix « tom » (Piper, licence AGPLv3, https://git.bksp.space/Tjiho/French-tts-model-piper)'
  },
  pierre: {
    model: 'fr_FR-upmc-medium', speaker: 1, scale: 1.14,
    credit: 'Voix « pierre » (corpus UPMC Pierre, licence CC BY-SA 4.0), synthèse Piper'
  },
  siwis: {
    model: 'fr_FR-siwis-medium', scale: 1.2,
    credit: 'Voix « siwis » (corpus SIWIS, Université d’Édimbourg, CC BY 4.0), synthèse Piper'
  }
};

const root = path.join(__dirname, '..');
const V = path.join(root, '.voice');
const PIPER = path.join(V, 'piper', 'piper', 'piper.exe');
const TMP = path.join(V, 'tmp');
const OUT = path.join(root, 'audio', 'voix');
const MANIFEST = path.join(root, 'data', 'voice.js');
const LETTERS = ['A', 'B', 'C', 'D'];
const SAMPLE = 'Bonjour ! C’est moi qui lirai les questions à voix haute.';
const args = process.argv.slice(2);
const levels = args.map(Number).filter(n => n >= 1 && n <= 4);
if (!levels.length) levels.push(1);

// Voix : celle demandée, sinon celle déjà utilisée (data/voice.js), sinon siwis.
const previous = (() => { try { return (fs.readFileSync(MANIFEST, 'utf8').match(/voiceId: '([a-z]+)'/) || [])[1]; } catch (e) { return null; } })();
const voiceId = ((args.find(a => a.startsWith('--voix=')) || '').slice(7)) || previous || 'siwis';
const VOICE = VOICES[voiceId];
if (!VOICE) { console.error('Voix inconnue : ' + voiceId + ' (au choix : ' + Object.keys(VOICES).join(', ') + ')'); process.exit(1); }
const MODEL = path.join(V, 'model', VOICE.model + '.onnx');
const SIGNATURE = `${VOICE.model}#${VOICE.speaker ?? ''}@${VOICE.scale}`;

for (const f of [PIPER, MODEL, path.join(V, 'node_modules', 'lamejs', 'lame.all.js')]) {
  if (!fs.existsSync(f)) { console.error('Fichier manquant : ' + f + '\nVoir l’en-tête de ce script.'); process.exit(1); }
}

/* ---------- Empreinte identique à celle du jeu (js/engine.js) ---------- */
function hash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/* ---------- Questions ---------- */
const ctx = {}; ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'data/categories.js'), 'utf8'), ctx);
const cats = ctx.QUIZ_DATA.categories.map(c => c.id);
cats.forEach(id => ['questions', 'photos'].forEach(dir => {
  const f = path.join(root, 'data', dir, id + '.js');
  if (fs.existsSync(f)) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx);
}));
const all = cats.flatMap(id => ctx.QUIZ_DATA.questions[id] || []);

const textsFor = qs => qs.flatMap(q => [q.q, ...q.a]);
const wanted = new Set([...LETTERS, SAMPLE, ...textsFor(all.filter(q => levels.includes(q.l)))]);
const known = new Set([...LETTERS, SAMPLE, ...textsFor(all)]); // tout texte encore utilisé, quel que soit le niveau

/* ---------- Texte à prononcer ---------- */
const CARD = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize',
  'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf', 'vingt', 'vingt et un', 'vingt-deux', 'vingt-trois'];
function roman(s) {
  const v = { I: 1, V: 5, X: 10, L: 50, C: 100 };
  let n = 0;
  for (let i = 0; i < s.length; i++) n += v[s[i]] < (v[s[i + 1]] || 0) ? -v[s[i]] : v[s[i]];
  return n;
}
function ordinal(n, fem) {
  if (n === 1) return fem ? 'première' : 'premier';
  const b = CARD[n] || String(n);
  if (/q$/.test(b)) return b + 'uième';
  if (/f$/.test(b)) return b.slice(0, -1) + 'vième';
  if (/e$/.test(b)) return b.slice(0, -1) + 'ième';
  return b + 'ième';
}
const KINGS = 'Louis|Henri|Charles|François|Philippe|Napoléon|Jean|Élisabeth|Elisabeth|Pie|Paul|Benoît|Grégoire|Léon|Ramsès|Richard|Édouard|Edouard|Guillaume|Frédéric|Pierre|Nicolas|Alexandre|Catherine|Victoria|Jules|Clément|Thoutmôsis|Aménophis';
function toSpeech(t) {
  return t
    .replace(/[   ]/g, ' ')
    .replace(/[«»“”"]/g, '')
    .replace(/’/g, '\'')
    .replace(/…/g, '...')
    .replace(/(\d) (?=\d{3}\b)/g, '$1').replace(/(\d) (?=\d{3}\b)/g, '$1')
    .replace(/(\d)\s?km\/h\b/g, '$1 kilomètres heure')
    .replace(/(\d)\s?°C/g, '$1 degrés')
    .replace(/(\d)\s?km\b/g, '$1 kilomètres')
    .replace(/(\d)\s?kg\b/g, '$1 kilos')
    .replace(/(\d)\s?cm\b/g, '$1 centimètres')
    .replace(/(\d)\s?m\b/g, '$1 mètres')
    .replace(/(\d)\s?%/g, '$1 pour cent')
    .replace(/\bn°\s?/g, 'numéro ')
    .replace(/\bIer\b/g, 'premier').replace(/\bIre\b/g, 'première')
    .replace(/\b([IVXL]{1,6})(e|ème)\s+(siècle|millénaire|dynastie|arrondissement|République)/g, (m, r, s, w) => ordinal(roman(r), w === 'République' || w === 'dynastie') + ' ' + w)
    .replace(new RegExp(`\\b(${KINGS})\\s+([IVX]{1,5})\\b`, 'g'), (m, name, r) => name + ' ' + (CARD[roman(r)] || r))
    .replace(/\s+/g, ' ')
    .trim();
}

/* ---------- WAV → MP3 ---------- */
const lame = {}; vm.createContext(lame);
vm.runInContext(fs.readFileSync(path.join(V, 'node_modules', 'lamejs', 'lame.all.js'), 'utf8'), lame);

function readWav(file) {
  const b = fs.readFileSync(file);
  let p = 12, rate = 22050, data = null;
  while (p + 8 <= b.length) {
    const id = b.toString('ascii', p, p + 4), size = b.readUInt32LE(p + 4);
    if (id === 'fmt ') rate = b.readUInt32LE(p + 12);
    if (id === 'data') { data = new Int16Array(b.buffer.slice(b.byteOffset + p + 8, b.byteOffset + p + 8 + size)); break; }
    p += 8 + size + (size % 2);
  }
  return { rate, data };
}
// Ramène les voix en 44,1 kHz à 22,05 kHz (moyenne de deux échantillons) : fichiers deux fois plus légers.
function to22k(data, rate) {
  if (rate !== 44100) return { data, rate };
  const out = new Int16Array(data.length >> 1);
  for (let i = 0; i < out.length; i++) out[i] = (data[2 * i] + data[2 * i + 1]) >> 1;
  return { data: out, rate: 22050 };
}
// Retire les silences du début et de la fin (on garde 40 ms de marge).
function trim(s, rate) {
  const thr = 300, pad = Math.round(rate * 0.04);
  let a = 0, z = s.length - 1;
  while (a < s.length && Math.abs(s[a]) < thr) a++;
  while (z > a && Math.abs(s[z]) < thr) z--;
  return s.subarray(Math.max(0, a - pad), Math.min(s.length, z + pad));
}
function toMp3(samples, rate) {
  const enc = new lame.lamejs.Mp3Encoder(1, rate, 32), chunks = [];
  for (let i = 0; i < samples.length; i += 1152) {
    const c = enc.encodeBuffer(samples.subarray(i, i + 1152));
    if (c.length) chunks.push(Buffer.from(c));
  }
  const end = enc.flush();
  if (end.length) chunks.push(Buffer.from(end));
  return Buffer.concat(chunks);
}

/* ---------- Génération ---------- */
async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(TMP, { recursive: true });
  // Autre voix ou autre vitesse que la dernière fois : on repart de zéro.
  const prevSig = (() => { try { return (fs.readFileSync(MANIFEST, 'utf8').match(/signature: '([^']+)'/) || [])[1]; } catch (e) { return null; } })();
  if (prevSig !== SIGNATURE) {
    const old = fs.readdirSync(OUT).filter(x => x.endsWith('.mp3'));
    old.forEach(x => fs.unlinkSync(path.join(OUT, x)));
    if (old.length) console.log(`Nouvelle voix ou vitesse (${voiceId}) : ${old.length} anciens enregistrements supprimés.`);
  }
  const todo = [...wanted].filter(t => !fs.existsSync(path.join(OUT, hash(t) + '.mp3')));
  console.log(`Voix ${voiceId} — niveaux ${levels.join(', ')} : ${wanted.size} textes, ${todo.length} à générer.`);

  if (todo.length) {
    await new Promise((resolve, reject) => {
      const pargs = ['-m', MODEL, '--json-input', '--length_scale', String(VOICE.scale), '--sentence_silence', '0.1'];
      if (VOICE.speaker !== undefined) pargs.push('--speaker', String(VOICE.speaker));
      const p = spawn(PIPER, pargs, { stdio: ['pipe', 'pipe', 'pipe'] });
      let done = 0;
      p.stdout.on('data', d => {
        done += String(d).split('\n').filter(l => l.trim().endsWith('.wav')).length;
        process.stdout.write(`\r  synthèse : ${done}/${todo.length}`);
      });
      p.stderr.on('data', () => {});
      p.on('error', reject);
      p.on('close', code => (code === 0 ? resolve() : reject(new Error('piper a échoué : ' + code))));
      todo.forEach(t => p.stdin.write(JSON.stringify({ text: toSpeech(t), output_file: path.join(TMP, hash(t) + '.wav') }) + '\n'));
      p.stdin.end();
    });
    console.log('');
    let n = 0, bytes = 0;
    for (const t of todo) {
      const wav = path.join(TMP, hash(t) + '.wav');
      if (!fs.existsSync(wav)) { console.warn('  manquant : ' + t); continue; }
      const w = readWav(wav), { rate, data } = to22k(w.data, w.rate);
      const mp3 = toMp3(trim(data, rate), rate);
      fs.writeFileSync(path.join(OUT, hash(t) + '.mp3'), mp3);
      fs.unlinkSync(wav);
      bytes += mp3.length;
      if (++n % 200 === 0) process.stdout.write(`\r  encodage MP3 : ${n}/${todo.length}`);
    }
    console.log(`\r  encodage MP3 : ${n}/${todo.length} (${(bytes / 1048576).toFixed(1)} Mo)`);
  }

  // Ménage : supprime les enregistrements dont le texte n'existe plus.
  const knownHashes = new Set([...known].map(hash));
  let removed = 0;
  for (const f of fs.readdirSync(OUT)) {
    if (f.endsWith('.mp3') && !knownHashes.has(f.slice(0, -4))) { fs.unlinkSync(path.join(OUT, f)); removed++; }
  }
  const have = fs.readdirSync(OUT).filter(f => f.endsWith('.mp3')).map(f => f.slice(0, -4)).sort();
  const size = have.reduce((s, h) => s + fs.statSync(path.join(OUT, h + '.mp3')).size, 0);
  fs.writeFileSync(MANIFEST, `/* Généré par tools/make-voice.js — ne pas modifier à la main.
 * Lectures enregistrées avec Piper (MIT) — ${VOICE.credit}. */
window.QUIZ_VOICE = {
  voiceId: '${voiceId}',
  voice: '${VOICE.model}',
  signature: '${SIGNATURE}',
  credit: ${JSON.stringify(VOICE.credit)},
  sample: ${JSON.stringify(SAMPLE)},
  has: ${JSON.stringify(have.join(' '))}
};
`);
  console.log(`✓ ${have.length} enregistrements (${(size / 1048576).toFixed(1)} Mo), ${removed} supprimé(s). data/voice.js mis à jour.`);
}

main().catch(e => { console.error(e); process.exit(1); });
