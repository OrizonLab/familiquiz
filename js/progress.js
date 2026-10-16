/* Famili'Quiz — progression : défis familiaux de la semaine et objectifs personnels. */
const Progress = (() => {
  const CATS = () => (window.QUIZ_DATA && QUIZ_DATA.categories) || [];
  const XP_WEEKLY = 50, XP_GOAL = 100;

  /* ---------- Semaine ---------- */
  // Identifiant de semaine (norme ISO) : « 2026-S42 ». Les défis changent chaque lundi.
  function weekId(d = new Date()) {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    const y = t.getUTCFullYear(), w = Math.ceil(((t - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7);
    return `${y}-S${String(w).padStart(2, '0')}`;
  }
  const daysLeft = (d = new Date()) => 7 - ((d.getDay() + 6) % 7); // lundi : 7 … dimanche : 1

  // Hasard reproductible : la même semaine donne les mêmes défis sur tous les appareils.
  function rng(seed) {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
    return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  // Modèles de défis. « kind » : sum (on additionne), max (meilleure valeur), set (nombre d'éléments différents).
  const TEMPLATES = [
    { id: 'parties', icon: '🎲', kind: 'sum', targets: [3, 4, 5], text: n => `Jouer ${n} parties en famille` },
    { id: 'bonnes', icon: '✅', kind: 'sum', targets: [60, 80, 100], text: n => `Réussir ${n} bonnes réponses tous ensemble` },
    { id: 'theme', icon: '📚', kind: 'sum', targets: [12, 15, 20], withCat: true, text: (n, c) => `Réussir ${n} bonnes réponses en ${c.name}` },
    { id: 'serie', icon: '🔥', kind: 'max', targets: [5, 6, 7], text: n => `Faire une série de ${n} bonnes réponses` },
    { id: 'sansfaute', icon: '💯', kind: 'sum', targets: [1, 2], text: n => (n > 1 ? `Réussir ${n} séries sans aucune faute` : 'Réussir une série sans aucune faute') },
    { id: 'photos', icon: '📸', kind: 'sum', targets: [8, 10, 12], text: n => `Réussir ${n} questions photo` },
    { id: 'equipe', icon: '🤝', kind: 'sum', targets: [1, 2], text: n => (n > 1 ? `Jouer ${n} parties en équipes` : 'Jouer une partie en équipes') },
    { id: 'themes', icon: '🧭', kind: 'set', targets: [5, 6, 8], text: n => `Jouer ${n} thèmes différents` },
    { id: 'tous', icon: '👨‍👩‍👧‍👦', kind: 'sum', targets: [1], text: () => 'Faire une partie à 4 joueurs ou plus' },
    { id: 'defi', icon: '💪', kind: 'sum', targets: [5, 8], text: n => `Réussir ${n} questions défi (au-dessus de son âge)` }
  ];

  function challengesFor(week) {
    const r = rng(week), pool = TEMPLATES.slice(), out = [];
    while (out.length < 3 && pool.length) {
      const t = pool.splice(Math.floor(r() * pool.length), 1)[0];
      const target = t.targets[Math.floor(r() * t.targets.length)];
      const cats = CATS();
      const cat = t.withCat && cats.length ? cats[Math.floor(r() * cats.length)] : null;
      if (t.withCat && !cat) continue;
      out.push({ id: t.id, icon: t.icon, kind: t.kind, target, cat: cat && cat.id, text: t.text(target, cat) });
    }
    return out;
  }

  function state() {
    const week = weekId();
    let w = Store.get('weekly', null);
    if (!w || w.week !== week) w = { week, progress: {}, done: {}, trophies: (w && w.trophies) || 0 };
    return w;
  }
  function value(ch, w) {
    if (ch.kind === 'set') return Object.keys(w.progress).filter(k => k.startsWith(ch.id + '_')).length;
    return w.progress[ch.id] || 0;
  }
  function current() {
    const w = state();
    return {
      week: w.week, daysLeft: daysLeft(), trophies: w.trophies || 0,
      challenges: challengesFor(w.week).map(ch => {
        const v = value(ch, w);
        return Object.assign({}, ch, { value: Math.min(v, ch.target), done: !!w.done[ch.id] });
      })
    };
  }

  // Après chaque partie : fait avancer les défis. Renvoie les défis réussis grâce à cette partie.
  // info = { nPlayers, mode, cats, players: [{ correct, perCat, bestStreak, perfectSeries, photoOk, challengeOk }] }
  function recordGame(info) {
    const w = state(), chs = challengesFor(w.week), sum = f => info.players.reduce((s, x) => s + (f(x) || 0), 0);
    const add = (id, n) => { w.progress[id] = (w.progress[id] || 0) + n; };
    chs.forEach(ch => {
      switch (ch.id) {
        case 'parties': add(ch.id, 1); break;
        case 'bonnes': add(ch.id, sum(x => x.correct)); break;
        case 'theme': add(ch.id, sum(x => (x.perCat[ch.cat] || {}).c)); break;
        case 'serie': w.progress[ch.id] = Math.max(w.progress[ch.id] || 0, ...info.players.map(x => x.bestStreak || 0)); break;
        case 'sansfaute': add(ch.id, sum(x => x.perfectSeries)); break;
        case 'photos': add(ch.id, sum(x => x.photoOk)); break;
        case 'equipe': if (info.mode === 'teams') add(ch.id, 1); break;
        case 'themes': info.cats.forEach(c => { w.progress[ch.id + '_' + c] = 1; }); break;
        case 'tous': if (info.nPlayers >= 4) add(ch.id, 1); break;
        case 'defi': add(ch.id, sum(x => x.challengeOk)); break;
      }
    });
    const completed = chs.filter(ch => !w.done[ch.id] && value(ch, w) >= ch.target);
    completed.forEach(ch => { w.done[ch.id] = Date.now(); w.trophies = (w.trophies || 0) + 1; });
    Store.set('weekly', w);
    return completed;
  }

  /* ---------- Objectif personnel ---------- */
  // Mesures suivies pour les objectifs (à partir des statistiques cumulées du joueur).
  const METRICS = {
    games: { icon: '🎲', read: st => st.games },
    wins: { icon: '🏆', read: st => (st.wins || 0) + (st.teamWins || 0) },
    correct: { icon: '✅', read: st => st.correct },
    cat: { icon: '📚', read: (st, g) => ((st.perCat || {})[g.cat] || {}).c || 0 },
    streak: { icon: '🔥', read: st => st.bestStreak, absolute: true },
    photos: { icon: '📸', read: st => st.photoOk },
    challenge: { icon: '💪', read: st => st.challengeOk },
    xp: { icon: '⭐', read: st => st.xp }
  };
  const goalText = g => {
    const c = CATS().find(x => x.id === g.cat), pl = g.target > 1 ? 's' : '';
    return {
      games: `Jouer ${g.target} partie${pl}`, wins: `Gagner ${g.target} partie${pl}`, correct: `Réussir ${g.target} bonne${pl} réponse${pl}`,
      cat: `Réussir ${g.target} bonnes réponses en ${c ? c.name : 'ce thème'}`, streak: `Faire une série de ${g.target} bonnes réponses`,
      photos: `Réussir ${g.target} question${pl} photo`, challenge: `Réussir ${g.target} question${pl} défi`,
      xp: `Gagner ${g.target} points d’expérience`
    }[g.type] || 'Objectif';
  };
  // Propositions adaptées au joueur : son thème le plus faible, une série un peu plus longue que son record…
  function suggestions(p) {
    const st = p.stats || {}, perCat = st.perCat || {}, cats = CATS();
    const played = cats.filter(c => (perCat[c.id] || {}).n >= 5);
    const weakest = played.sort((a, b) => (perCat[a.id].c / perCat[a.id].n) - (perCat[b.id].c / perCat[b.id].n))[0]
      || cats[Math.floor(Math.random() * cats.length)];
    const list = [
      { type: 'games', target: 3 },
      { type: 'wins', target: 2 },
      { type: 'cat', cat: weakest && weakest.id, target: 15 },
      { type: 'streak', target: Math.max(4, (st.bestStreak || 0) + 2) },
      { type: 'correct', target: 50 },
      { type: 'photos', target: 8 },
      { type: 'xp', target: 300 }
    ];
    if ((st.games || 0) >= 2) list.push({ type: 'challenge', target: 5 });
    return list.map(g => Object.assign(g, { text: goalText(g), icon: METRICS[g.type].icon }));
  }
  function setGoal(p, g) {
    const m = METRICS[g.type];
    if (!m) return;
    p.goal = { type: g.type, cat: g.cat || '', target: g.target, base: m.absolute ? 0 : m.read(p.stats || {}, g) || 0, set: Date.now() };
  }
  function goalProgress(p) {
    const g = p.goal;
    if (!g || !METRICS[g.type]) return null;
    const v = Math.max(0, (METRICS[g.type].read(p.stats || {}, g) || 0) - (g.base || 0));
    return { text: goalText(g), icon: METRICS[g.type].icon, value: Math.min(v, g.target), target: g.target, done: v >= g.target };
  }
  // Appelée après la partie : si l'objectif est atteint, on l'archive et on donne la récompense.
  function checkGoal(p) {
    const gp = goalProgress(p);
    if (!gp || !gp.done) return null;
    p.stats.goalsDone = (p.stats.goalsDone || 0) + 1;
    p.stats.xp = (p.stats.xp || 0) + XP_GOAL;
    p.goal = null;
    return gp;
  }

  return { weekId, current, recordGame, suggestions, setGoal, goalProgress, checkGoal, XP_WEEKLY, XP_GOAL };
})();
