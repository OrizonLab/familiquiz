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
  // Âge exact au mois près : le niveau change le mois de l'anniversaire (et non au 1er janvier).
  // Sans mois de naissance (anciens profils), on retombe sur la seule année.
  function ageFromBirth(year, month) {
    const now = new Date();
    let a = now.getFullYear() - year;
    if (month >= 1 && month <= 12 && now.getMonth() + 1 < month) a--;
    return a;
  }
  const ageOf = p => ageFromBirth(p.birthYear, p.birthMonth);
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
  /* ---------- Classement équitable ----------
   * « rating » : estimation sans plafond de la force réelle du joueur dans un thème (0 à 6), alors que
   * « skill » reste bornée autour de son âge pour choisir les questions. Un adulte très fort dépasse donc 4,
   * un enfant en difficulté descend sous 1, et la probabilité de réussite attendue reste juste pour tous. */
  const expect = (r, qLevel) => 1 / (1 + Math.exp(-2.2 * (r - qLevel + 0.4)));
  function rating(p, catId) {
    const r = p.rating && p.rating[catId];
    return typeof r === 'number' ? r : skill(p, catId);
  }
  function updateRating(p, catId, qLevel, ok) {
    const r = rating(p, catId);
    p.rating = p.rating || {};
    p.rating[catId] = clamp(r + 0.25 * ((ok ? 1 : 0) - expect(r, qLevel)), 0, 6);
  }
  // Chance de réussite attendue pour ce joueur sur cette question (avant qu'il réponde).
  const expected = (p, catId, qLevel) => expect(rating(p, catId), qLevel);
  // Points équitables : 100 (+ jusqu'à 50 de rapidité) quand la chance de réussite attendue est de 70 %,
  // davantage si la question était difficile POUR CE JOUEUR, moins si elle était facile. La rapidité est pondérée
  // de la même façon. En moyenne, chacun gagne donc autant en jouant « à son niveau », quel que soit son âge.
  function fairScore({ ok, e, timeLeft, timeTotal }) {
    if (!ok) return { total: 0, base: 0, speed: 0, streak: 0, level: 0, e };
    const w = 1 / clamp(e, 0.15, 0.97);
    const base = Math.round(70 * w);
    const speed = Math.round(35 * clamp(timeLeft / timeTotal, 0, 1) * w);
    return { base, speed, streak: 0, level: 0, total: base + speed, e };
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
    ageOf, ageFromBirth, ageLevel, levelOf, skill, updateSkill, rating, updateRating, expected, fairScore,
    pickQuestion, shuffle, rand, timeFor, score, clamp
  };
})();
