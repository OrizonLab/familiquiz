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
    autoNext: true,     // passage automatique après l'anecdote
    music: true,
    sfx: true,
    musicVol: 0.55,
    sfxVol: 0.8
  };
  const settings = () => Object.assign({}, DEFAULT_SETTINGS, read('settings', {}));
  const saveSettings = s => write('settings', s);

  /* ---------- Joueurs ---------- */
  const players = () => read('players', []);
  const player = id => players().find(p => p.id === id) || null;

  function emptyStats() {
    return {
      games: 0, wins: 0, answered: 0, correct: 0, points: 0, bestScore: 0, bestStreak: 0, timeSum: 0, perCat: {},
      teamGames: 0, teamWins: 0, challengeOk: 0, photoOk: 0, xp: 0
    };
  }
  function createPlayer({ name, avatar, color, age }) {
    const p = {
      id: uid(), name: name.trim(), avatar, color,
      birthYear: new Date().getFullYear() - age,
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
    const data = { app: 'familiquiz', version: 1, date: new Date().toISOString(), settings: settings(), players: players(), history: history(), seen: {} };
    data.seen.family = familySeen();
    players().forEach(p => { data.seen[p.id] = seen(p.id); });
    return data;
  }
  // Contrôle strict du fichier importé : rien n'est écrit tant que tout n'est pas validé.
  const SAFE_ID = /^[a-z0-9]{1,24}$/i;
  const SAFE_COLOR = /^#[0-9a-f]{3,8}$/i;
  const cleanAvatar = a => (typeof a === 'string' && a.length <= 12 && !/[<>&"'\s]/.test(a) ? a : '🙂');
  const cleanColor = c => (typeof c === 'string' && SAFE_COLOR.test(c) ? c : '#8b5cf6');
  const isObj = o => o && typeof o === 'object' && !Array.isArray(o);

  function importAll(data) {
    if (!isObj(data) || data.app !== 'familiquiz') throw new Error('fichier non reconnu');
    if (!Array.isArray(data.players) || !Array.isArray(data.history)) throw new Error('fichier incomplet');
    const year = new Date().getFullYear();
    const plist = data.players.map(p => {
      if (!isObj(p) || typeof p.id !== 'string' || !SAFE_ID.test(p.id) || typeof p.name !== 'string' || !p.name.trim()) throw new Error('joueur invalide');
      const by = Number(p.birthYear);
      if (!Number.isFinite(by) || by < year - 110 || by > year) throw new Error('âge invalide pour ' + p.name);
      return {
        id: p.id, name: p.name.trim().slice(0, 16), avatar: cleanAvatar(p.avatar), color: cleanColor(p.color),
        birthYear: by, createdAt: Number(p.createdAt) || Date.now(),
        skill: isObj(p.skill) ? p.skill : {}, stats: Object.assign(emptyStats(), isObj(p.stats) ? p.stats : {}),
        badges: isObj(p.badges) ? p.badges : {}
      };
    });
    const hist = data.history.filter(g => isObj(g) && Array.isArray(g.players) && Array.isArray(g.cats)).map(g => Object.assign({}, g, {
      id: String(g.id).replace(/[^a-z0-9]/gi, '').slice(0, 24) || uid(),
      players: g.players.filter(isObj).map(x => Object.assign({}, x, { name: String(x.name || '?').slice(0, 16), avatar: cleanAvatar(x.avatar), color: cleanColor(x.color), id: String(x.id || '') })),
      cats: g.cats.map(String)
    }));
    const s = isObj(data.seen) ? data.seen : {};
    const seenOf = o => (isObj(o) ? o : {});
    resetAll();
    write('settings', isObj(data.settings) ? data.settings : {});
    write('players', plist);
    write('history', hist);
    write('seen_family', seenOf(s.family));
    plist.forEach(p => write('seen_' + p.id, seenOf(s[p.id])));
  }
  function resetAll() {
    players().forEach(p => remove('seen_' + p.id));
    ['players', 'history', 'seen_family', 'settings'].forEach(remove);
  }

  return {
    settings, saveSettings, DEFAULT_SETTINGS,
    players, player, createPlayer, savePlayer, deletePlayer, emptyStats,
    seen, familySeen, markSeen,
    history, addGame, clearHistory,
    exportAll, importAll, resetAll
  };
})();
