/* Famili'Quiz — moteur : niveaux d'âge, difficulté adaptative, tirage des questions, score. */
const Engine = (() => {
  const CATS = QUIZ_DATA.categories;
  const LEVELS = {
    1: { name: 'Petit curieux', range: '7-9 ans', icon: '🐣' },
    2: { name: 'Explorateur', range: '10-12 ans', icon: '🧭' },
    3: { name: 'Aventurier', range: '13-16 ans', icon: '🚀' },
    4: { name: 'Expert', range: 'Adultes', icon: '🎓' }
  };

  /* ---------- Index des questions ---------- */
  function hash(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }
  const byCat = {};
  let total = 0;
  CATS.forEach(c => {
    byCat[c.id] = { 1: [], 2: [], 3: [], 4: [] };
    (QUIZ_DATA.questions[c.id] || []).forEach(q => {
      if (!q || !byCat[c.id][q.l] || typeof q.q !== 'string' || !Array.isArray(q.a) || q.a.length < 3 || q.a.length > 4) return;
      // Les questions photo partagent souvent le même texte (« Quel est cet animal ? ») : l'image fait partie de l'identifiant.
      byCat[c.id][q.l].push(Object.assign({}, q, { id: c.id + '_' + hash(q.img ? q.q + '|' + q.img : q.q), cat: c.id }));
      total++;
    });
  });
  const cats = CATS.filter(c => [1, 2, 3, 4].some(l => byCat[c.id][l].length));
  const photos = [].concat(...CATS.map(c => [].concat(...[1, 2, 3, 4].map(l => byCat[c.id][l])).filter(q => q.img)));
  const cat = id => CATS.find(c => c.id === id);
  const countCat = id => [1, 2, 3, 4].reduce((n, l) => n + byCat[id][l].length, 0);

  /* ---------- Âge et niveau ---------- */
  const ageOf = p => new Date().getFullYear() - p.birthYear;
  const ageLevel = age => (age <= 9 ? 1 : age <= 12 ? 2 : age <= 16 ? 3 : 4);
  const levelOf = p => ageLevel(ageOf(p));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // Le niveau réel d'un joueur dans un thème peut s'écarter de son niveau d'âge de ±0,8.
  function bounds(p) {
    const L = levelOf(p);
    return [Math.max(1, L - 0.8), Math.min(4, L + 0.8)];
  }
  function skill(p, catId) {
    const [lo, hi] = bounds(p);
    const s = p.skill && p.skill[catId];
    return clamp(typeof s === 'number' ? s : levelOf(p), lo, hi);
  }
  // Ajustement façon Elo : objectif ≈ 70 % de bonnes réponses pour chacun.
  function updateSkill(p, catId, qLevel, ok) {
    const r = skill(p, catId);
    const expected = 1 / (1 + Math.exp(-2.2 * (r - qLevel + 0.4)));
    const [lo, hi] = bounds(p);
    p.skill = p.skill || {};
    p.skill[catId] = clamp(r + 0.25 * ((ok ? 1 : 0) - expected), lo, hi);
    return p.skill[catId];
  }
  function sampleLevel(r) {
    const base = Math.floor(r);
    return clamp(base + (Math.random() < r - base ? 1 : 0), 1, 4);
  }

  /* ---------- Tirage ---------- */
  const rand = arr => arr[Math.floor(Math.random() * arr.length)];
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Priorité : jamais vue par personne > jamais vue par ce joueur > vue il y a le plus longtemps.
  function choose(pool, seenP, seenF) {
    const fresh = pool.filter(q => !seenP[q.id] && !seenF[q.id]);
    if (fresh.length) return rand(fresh);
    const notMine = pool.filter(q => !seenP[q.id]).sort((a, b) => seenF[a.id] - seenF[b.id]);
    if (notMine.length) return rand(notMine.slice(0, Math.max(1, Math.ceil(notMine.length / 3))));
    const old = pool.slice().sort((a, b) => seenP[a.id] - seenP[b.id]);
    return rand(old.slice(0, Math.max(1, Math.ceil(old.length / 4))));
  }

  function pickQuestion(p, catId, used) {
    const lvl = sampleLevel(skill(p, catId));
    const order = [lvl, lvl - 1, lvl + 1, lvl - 2, lvl + 2, lvl - 3, lvl + 3].filter(l => l >= 1 && l <= 4);
    const seenP = Store.seen(p.id), seenF = Store.familySeen();
    // Environ une question sur quatre : une question photo encore jamais vue par ce joueur, si possible.
    if (Math.random() < 0.25) {
      for (const l of order.slice(0, 2)) {
        const photos = byCat[catId][l].filter(q => q.img && !used.has(q.id) && !seenP[q.id]);
        if (photos.length) return prepare(choose(photos, seenP, seenF));
      }
    }
    for (const l of order) {
      const pool = byCat[catId][l].filter(q => !used.has(q.id));
      if (pool.length) return prepare(choose(pool, seenP, seenF));
    }
    // Banque épuisée pour cette partie : on réautorise les questions déjà posées.
    const all = byCat[catId][lvl].length ? byCat[catId][lvl] : [].concat(...[1, 2, 3, 4].map(l => byCat[catId][l]));
    return prepare(choose(all, seenP, seenF));
  }

  function prepare(q) {
    const answers = shuffle(q.a.map((t, i) => ({ t, ok: i === 0 })));
    return Object.assign({}, q, { answers });
  }

  /* ---------- Temps et score ---------- */
  function timeFor(p, settings) {
    const bonus = settings.youngBonus ? { 1: 5, 2: 3, 3: 0, 4: 0 }[levelOf(p)] : 0;
    return settings.time + bonus;
  }
  function score({ ok, timeLeft, timeTotal, streak, qLevel, ageLvl }) {
    if (!ok) return { total: 0, base: 0, speed: 0, streak: 0, level: 0 };
    const base = 100;
    const speed = Math.round(50 * clamp(timeLeft / timeTotal, 0, 1));
    const streakB = Math.min(50, Math.max(0, streak - 1) * 10);
    const level = Math.max(0, qLevel - ageLvl) * 25;
    return { base, speed, streak: streakB, level, total: base + speed + streakB + level };
  }

  return {
    CATS, LEVELS, cats, cat, countCat, total, photos,
    ageOf, ageLevel, levelOf, skill, updateSkill,
    pickQuestion, shuffle, rand, timeFor, score, clamp
  };
})();
