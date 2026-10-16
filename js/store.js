/* Famili'Quiz — stockage local (joueurs, statistiques, historique, questions déjà vues). */
const Store = (() => {
  const PREFIX = 'fq_';
  const mem = {}; // secours si le navigateur bloque localStorage

  // mem garde toujours la dernière valeur écrite : si une écriture échoue (stockage plein),
  // la partie en cours reste cohérente et l'application est prévenue.
  function read(key, def) {
    if (key in mem) return mem[key];
    try {
      const v = localStorage.getItem(PREFIX + key);
      return v == null ? def : (mem[key] = JSON.parse(v));
    } catch (e) {
      return def;
    }
  }
  function write(key, val) {
    mem[key] = val;
    try { localStorage.setItem(PREFIX + key, JSON.stringify(val)); }
    catch (e) {
      console.warn('Stockage impossible :', e);
      window.dispatchEvent(new CustomEvent('fq-storage-error'));
    }
  }
  function remove(key) {
    delete mem[key];
    try { localStorage.removeItem(PREFIX + key); } catch (e) { /* rien */ }
  }
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  /* ---------- Réglages ---------- */
  const DEFAULT_SETTINGS = {
    perSeries: 10,      // questions par série (5, 8 ou 10)
    time: 10,           // secondes par question
    youngBonus: true,   // +5 s (7-9 ans) / +3 s (10-12 ans)
    jokers: true,       // un joker 50/50 par série
    tts: 'young',       // lecture vocale : off | young (7-9 ans) | all
    voiceMode: 'natural', // natural : voix enregistrée intégrée (Piper) | device : voix de l'appareil
    voiceURI: '',       // voix de l'appareil choisie (vide = la meilleure trouvée)
    voiceRate: 1,       // vitesse de lecture (0,8 à 1,25)
    elVoice: '',        // ElevenLabs : identifiant de la voix choisie (la clé API est stockée à part, voir js/eleven.js)
    elVoiceName: '',
    elModel: 'eleven_multilingual_v2',
    autoNext: true,     // passage automatique après l'anecdote
    ranking: 'fair',    // classement : fair (équitable, selon la difficulté pour chacun) | classic
    music: true,
    sfx: true,
    musicVol: 0.55,
    sfxVol: 0.8
  };
  // Réglages toujours propres : une valeur du mauvais type (fichier abîmé, ancienne version) reprend sa valeur par défaut.
  const ALLOWED = {
    perSeries: [5, 8, 10], time: [8, 10, 12, 15, 20], tts: ['off', 'young', 'all'],
    voiceMode: ['natural', 'eleven', 'device'], elModel: ['eleven_multilingual_v2', 'eleven_flash_v2_5'], ranking: ['fair', 'classic']
  };
  const RANGES = { voiceRate: [0.8, 1.25], musicVol: [0, 1], sfxVol: [0, 1] };
  function cleanSettings(src) {
    const out = Object.assign({}, DEFAULT_SETTINGS);
    if (!isObj(src)) return out;
    Object.keys(DEFAULT_SETTINGS).forEach(k => {
      const v = src[k], def = DEFAULT_SETTINGS[k];
      if (typeof v !== typeof def) return;
      if (typeof v === 'number' && !Number.isFinite(v)) return;
      if (ALLOWED[k] && !ALLOWED[k].includes(v)) return;
      if (RANGES[k]) { out[k] = Math.min(RANGES[k][1], Math.max(RANGES[k][0], v)); return; }
      out[k] = typeof v === 'string' ? v.slice(0, 200) : v;
    });
    return out;
  }
  const settings = () => cleanSettings(read('settings', {}));
  const saveSettings = s => write('settings', cleanSettings(s));

  /* ---------- Joueurs ---------- */
  const players = () => read('players', []);
  const player = id => players().find(p => p.id === id) || null;

  function emptyStats() {
    return {
      games: 0, wins: 0, answered: 0, correct: 0, points: 0, bestScore: 0, bestStreak: 0, timeSum: 0, perCat: {},
      teamGames: 0, teamWins: 0, challengeOk: 0, photoOk: 0, xp: 0, weeklyDone: 0, goalsDone: 0
    };
  }
  function createPlayer({ name, avatar, color, age, birthYear, birthMonth }) {
    const p = {
      id: uid(), name: name.trim(), avatar, color,
      birthYear: birthYear || new Date().getFullYear() - age,
      birthMonth: birthMonth >= 1 && birthMonth <= 12 ? birthMonth : 0,
      createdAt: Date.now(), skill: {}, stats: emptyStats(), badges: {}
    };
    const list = players(); list.push(p); write('players', list);
    return p;
  }
  function savePlayer(p) {
    const list = players();
    const i = list.findIndex(x => x.id === p.id);
    if (i >= 0) list[i] = p; else list.push(p);
    write('players', list);
  }
  function deletePlayer(id) {
    write('players', players().filter(p => p.id !== id));
    remove('seen_' + id);
  }

  /* ---------- Questions déjà vues (anti-répétition) ---------- */
  const seen = pid => read('seen_' + pid, {});
  const familySeen = () => read('seen_family', {});
  function markSeen(pid, qid) {
    const now = Date.now();
    const s = seen(pid); s[qid] = now; write('seen_' + pid, s);
    const f = familySeen(); f[qid] = now; write('seen_family', f);
  }

  /* ---------- Historique des parties ---------- */
  const history = () => read('history', []);
  function addGame(g) {
    const list = history(); list.unshift(g);
    write('history', list.slice(0, 300));
  }
  const clearHistory = () => write('history', []);

  /* ---------- Sauvegarde / restauration ---------- */
  function exportAll() {
    const data = { app: 'familiquiz', version: 2, date: new Date().toISOString(), settings: settings(), players: players(), history: history(), weekly: read('weekly', null), seen: {} };
    data.seen.family = familySeen();
    players().forEach(p => { data.seen[p.id] = seen(p.id); });
    return data;
  }
  /* ---------- Contrôle strict des données importées ----------
   * Tout est reconstruit champ par champ (jamais de copie aveugle) : valeurs du mauvais type remplacées,
   * nombres bornés, textes raccourcis, clés dangereuses (« __proto__ »…) ignorées.
   * Rien n'est écrit tant que tout le fichier n'est pas validé, et l'écriture est annulée si elle échoue en route. */
  const SAFE_ID = /^[a-z0-9]{1,24}$/i;
  const SAFE_COLOR = /^#[0-9a-f]{3,8}$/i;
  const SAFE_KEY = /^[a-z0-9_-]{1,40}$/i;
  const cleanAvatar = a => (typeof a === 'string' && a.length <= 12 && !/[<>&"'\s]/.test(a) ? a : '🙂');
  const cleanColor = c => (typeof c === 'string' && SAFE_COLOR.test(c) ? c : '#8b5cf6');
  const cleanText = (t, max) => String(t == null ? '' : t).replace(/[\u0000-\u001f]/g, '').trim().slice(0, max);
  const num = (v, min = 0, max = 1e12) => (Number.isFinite(Number(v)) ? Math.min(max, Math.max(min, Number(v))) : min);
  function isObj(o) { return !!o && typeof o === 'object' && !Array.isArray(o); }
  // Copie d'un dictionnaire { clé: valeur } en ne gardant que des clés sûres et des valeurs validées.
  function cleanMap(src, valFn, keyRe = SAFE_KEY, max = 20000) {
    const out = {};
    if (!isObj(src)) return out;
    Object.keys(src).slice(0, max).forEach(k => {
      if (!keyRe.test(k) || k === '__proto__' || k === 'constructor' || k === 'prototype') return;
      const v = valFn(src[k]);
      if (v !== undefined) out[k] = v;
    });
    return out;
  }
  const cleanCat = v => (isObj(v) ? { c: num(v.c), n: num(v.n), pts: num(v.pts) } : undefined);
  function cleanStats(src) {
    const s = emptyStats(), o = isObj(src) ? src : {};
    Object.keys(s).forEach(k => { if (k !== 'perCat') s[k] = num(o[k]); });
    s.perCat = cleanMap(o.perCat, cleanCat);
    return s;
  }

  function importAll(data) {
    if (!isObj(data) || data.app !== 'familiquiz') throw new Error('fichier non reconnu');
    if (!Array.isArray(data.players) || !Array.isArray(data.history)) throw new Error('fichier incomplet');
    if (data.players.length > 100) throw new Error('trop de joueurs dans le fichier');
    const year = new Date().getFullYear();
    const ids = new Set();
    const plist = data.players.map(p => {
      if (!isObj(p) || typeof p.id !== 'string' || !SAFE_ID.test(p.id) || ids.has(p.id) || typeof p.name !== 'string' || !cleanText(p.name, 16)) throw new Error('joueur invalide');
      ids.add(p.id);
      const by = Number(p.birthYear);
      if (!Number.isInteger(by) || by < year - 110 || by > year) throw new Error('année de naissance invalide pour ' + cleanText(p.name, 16));
      const bm = Number(p.birthMonth);
      return {
        id: p.id, name: cleanText(p.name, 16), avatar: cleanAvatar(p.avatar), color: cleanColor(p.color),
        birthYear: by, birthMonth: Number.isInteger(bm) && bm >= 1 && bm <= 12 ? bm : 0,
        createdAt: num(p.createdAt, 0, Date.now()) || Date.now(),
        skill: cleanMap(p.skill, v => (Number.isFinite(Number(v)) ? num(v, 0.5, 5) : undefined)),
        rating: cleanMap(p.rating, v => (Number.isFinite(Number(v)) ? num(v, 0, 6) : undefined)),
        stats: cleanStats(p.stats),
        badges: cleanMap(p.badges, v => (Number.isFinite(Number(v)) ? num(v, 0, Date.now()) : undefined)),
        goal: isObj(p.goal) ? cleanMap(p.goal, v => (typeof v === 'string' ? cleanText(v, 40) : Number.isFinite(Number(v)) ? num(v, -1e12) : undefined)) : null
      };
    });
    const cleanHistPlayer = x => ({
      id: cleanText(x.id, 24), name: cleanText(x.name, 16) || '?', avatar: cleanAvatar(x.avatar), color: cleanColor(x.color),
      level: num(x.level, 1, 4), rank: Math.round(num(x.rank, 1, 99)), total: num(x.total), fair: num(x.fair),
      correct: num(x.correct), answers: num(x.answers), bestStreak: num(x.bestStreak), avgTime: num(x.avgTime, 0, 999),
      perCat: cleanMap(x.perCat, cleanCat), teamIcon: x.teamIcon ? cleanAvatar(x.teamIcon) : undefined
    });
    const hist = data.history.filter(g => isObj(g) && Array.isArray(g.players) && Array.isArray(g.cats)).slice(0, 300).map(g => ({
      id: cleanText(g.id, 24).replace(/[^a-z0-9]/gi, '') || uid(),
      date: num(g.date, 0, Date.now()), perSeries: num(g.perSeries, 1, 20),
      mode: g.mode === 'teams' ? 'teams' : 'solo', ranking: g.ranking === 'fair' ? 'fair' : 'classic',
      cats: g.cats.filter(c => typeof c === 'string' && SAFE_KEY.test(c)).slice(0, 20),
      winners: Array.isArray(g.winners) ? g.winners.filter(w => typeof w === 'string').map(w => cleanText(w, 24)) : [],
      players: g.players.filter(isObj).slice(0, 6).map(cleanHistPlayer),
      teams: Array.isArray(g.teams) ? g.teams.filter(isObj).slice(0, 2).map(t => ({
        name: cleanText(t.name, 18) || 'Équipe', color: cleanColor(t.color), icon: cleanAvatar(t.icon),
        ids: Array.isArray(t.ids) ? t.ids.filter(i => typeof i === 'string').map(i => cleanText(i, 24)) : [],
        score: num(t.score), rank: Math.round(num(t.rank, 1, 2))
      })) : null
    }));
    const s = isObj(data.seen) ? data.seen : {};
    const seenOf = o => cleanMap(o, v => (Number.isFinite(Number(v)) ? num(v, 0, Date.now()) : undefined), /^[a-z]{2,12}_[a-z0-9]{1,12}$/);
    const weekly = isObj(data.weekly) && /^\d{4}-S\d{2}$/.test(data.weekly.week) ? {
      week: data.weekly.week,
      progress: cleanMap(data.weekly.progress, v => (Number.isFinite(Number(v)) ? num(v) : undefined)),
      done: cleanMap(data.weekly.done, v => (Number.isFinite(Number(v)) ? num(v, 0, Date.now()) : undefined)),
      trophies: num(data.weekly.trophies, 0, 1e6)
    } : null;

    // Écriture « tout ou rien » : on photographie l'existant, on écrit, et on restaure tout si une écriture échoue.
    const writes = [
      ['settings', cleanSettings(data.settings)], ['players', plist], ['history', hist], ['seen_family', seenOf(s.family)],
      ...plist.map(p => ['seen_' + p.id, seenOf(s[p.id])])
    ];
    if (weekly) writes.push(['weekly', weekly]);
    const oldKeys = ['players', 'history', 'seen_family', 'settings', 'weekly', ...players().map(p => 'seen_' + p.id)];
    const snapshot = {};
    [...new Set([...oldKeys, ...writes.map(w => w[0])])].forEach(k => {
      try { snapshot[k] = localStorage.getItem(PREFIX + k); } catch (e) { snapshot[k] = null; }
    });
    try {
      oldKeys.forEach(k => { delete mem[k]; localStorage.removeItem(PREFIX + k); });
      writes.forEach(([k, v]) => { localStorage.setItem(PREFIX + k, JSON.stringify(v)); mem[k] = v; });
    } catch (err) {
      // Restauration : on libère d'abord toute la place prise par la nouvelle écriture, puis on remet l'ancien contenu
      // (qui tenait déjà dans le stockage avant l'import).
      Object.keys(snapshot).forEach(k => { delete mem[k]; try { localStorage.removeItem(PREFIX + k); } catch (e) { /* ignoré */ } });
      let restored = true;
      Object.keys(snapshot).forEach(k => {
        if (snapshot[k] == null) return;
        try { localStorage.setItem(PREFIX + k, snapshot[k]); } catch (e) { restored = false; }
      });
      throw new Error(restored ? 'écriture impossible (stockage plein ?) : rien n’a été modifié'
        : 'écriture impossible et restauration incomplète : réimportez votre dernière sauvegarde');
    }
  }
  function resetAll() {
    players().forEach(p => remove('seen_' + p.id));
    ['players', 'history', 'seen_family', 'settings', 'weekly', 'secret_elevenlabs'].forEach(remove);
  }

  // Lecture / écriture d'une donnée simple (défis de la semaine…).
  const get = (key, def) => read(key, def);
  const set = (key, val) => write(key, val);

  return {
    get, set, settings, saveSettings, DEFAULT_SETTINGS,
    players, player, createPlayer, savePlayer, deletePlayer, emptyStats,
    seen, familySeen, markSeen,
    history, addGame, clearHistory,
    exportAll, importAll, resetAll
  };
})();
