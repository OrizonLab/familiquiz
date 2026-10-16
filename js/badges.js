/* Famili'Quiz — badges à collectionner et rangs d'expérience. */
const Badges = (() => {
  const RANKS = [
    { xp: 0, name: 'Apprenti', icon: '🐣' },
    { xp: 100, name: 'Curieux', icon: '🔎' },
    { xp: 300, name: 'Malin', icon: '💡' },
    { xp: 600, name: 'Futé', icon: '🦊' },
    { xp: 1000, name: 'Savant', icon: '📚' },
    { xp: 1600, name: 'Érudit', icon: '🎓' },
    { xp: 2500, name: 'Génie', icon: '🧠' },
    { xp: 4000, name: 'Grand Maître', icon: '👑' },
    { xp: 6000, name: 'Légende', icon: '🌟' }
  ];

  function rankOf(xp = 0) {
    let i = 0;
    while (i + 1 < RANKS.length && xp >= RANKS[i + 1].xp) i++;
    const cur = RANKS[i], next = RANKS[i + 1] || null;
    const progress = next ? (xp - cur.xp) / (next.xp - cur.xp) : 1;
    return { ...cur, index: i, next, progress, xp };
  }

  // XP d'une partie : points / 20 + participation, bonus de victoire.
  const xpFor = (r, won) => Math.round(r.total / 20) + 10 + (won ? 20 : 0);

  const SPECIALISTS = {
    geo: 'As de la géo', histoire: 'Historien', sport: 'Sportif dans l’âme', animaux: 'Ami des bêtes',
    ecran: 'Cinéphile', sciences: 'Petit génie', espace: 'Astronaute', musique: 'Mélomane',
    cuisine: 'Fin gourmet', arts: 'Artiste', jeux: 'Pro du joystick', nature: 'Écolo'
  };
  const SPECIALIST_GOAL = 30;

  // c = { st, r, g } — st : statistiques cumulées (après la partie), r : résultat du joueur dans la partie,
  // g : { mode, nPlayers, nCats, won, teamWon, lastAfterFirst, hour, jokers }
  const LIST = [
    { id: 'premiere-partie', icon: '🎈', name: 'Premiers pas', desc: 'Jouer sa première partie', test: c => c.st.games >= 1 },
    { id: 'habitue', icon: '🎟️', name: 'Habitué', desc: 'Jouer 10 parties', test: c => c.st.games >= 10 },
    { id: 'fidele', icon: '🏅', name: 'Fidèle', desc: 'Jouer 25 parties', test: c => c.st.games >= 25 },
    { id: 'accro', icon: '💎', name: 'Accro du quiz', desc: 'Jouer 50 parties', test: c => c.st.games >= 50 },
    { id: 'centurion', icon: '🏛️', name: 'Centurion', desc: 'Jouer 100 parties', test: c => c.st.games >= 100 },

    { id: 'victoire', icon: '🥇', name: 'Première victoire', desc: 'Gagner une partie à plusieurs', test: c => c.st.wins >= 1 },
    { id: 'champion', icon: '🏆', name: 'Champion', desc: 'Gagner 5 parties', test: c => c.st.wins >= 5 },
    { id: 'invincible', icon: '👑', name: 'Invincible', desc: 'Gagner 20 parties', test: c => c.st.wins >= 20 },
    { id: 'remontada', icon: '🚀', name: 'Remontada', desc: 'Gagner après avoir été dernier à la fin du 1er thème', test: c => c.g.won && c.g.lastAfterFirst },
    { id: 'esprit-equipe', icon: '🤝', name: 'Esprit d’équipe', desc: 'Gagner une partie en équipe', test: c => c.st.teamWins >= 1 },
    { id: 'equipe-de-choc', icon: '🛡️', name: 'Équipe de choc', desc: 'Gagner 5 parties en équipe', test: c => c.st.teamWins >= 5 },

    { id: 'serie-5', icon: '🔥', name: 'En feu', desc: '5 bonnes réponses d’affilée', test: c => c.r.bestStreak >= 5 },
    { id: 'serie-10', icon: '☄️', name: 'Inarrêtable', desc: '10 bonnes réponses d’affilée', test: c => c.r.bestStreak >= 10 },
    { id: 'sans-faute', icon: '💯', name: 'Sans-faute', desc: 'Réussir toute une série d’au moins 5 questions', test: c => c.r.series.some(s => s.n >= 5 && s.c === s.n) },
    { id: 'pluie-etoiles', icon: '✨', name: 'Pluie d’étoiles', desc: '3 étoiles à toutes ses séries (au moins 2 thèmes)', test: c => c.r.series.length >= 2 && c.r.series.every(s => s.stars === 3) },
    { id: 'reflexe', icon: '⚡', name: 'Réflexe', desc: 'Bonne réponse en moins de 2 secondes', test: c => c.r.fastestOk < 2 },
    { id: 'sur-le-fil', icon: '⏰', name: 'Sur le fil', desc: 'Bonne réponse dans la dernière seconde', test: c => c.r.lastSecondOk },
    { id: 'joker-gagnant', icon: '🎭', name: 'Bien joué, joker !', desc: 'Bonne réponse après avoir utilisé le joker', test: c => c.r.jokerOk },
    { id: 'sans-filet', icon: '🧘', name: 'Sans filet', desc: 'Partie d’au moins 2 thèmes sans joker et 70 % de réussite', test: c => c.g.jokers && c.g.nCats >= 2 && c.r.jokersUsed === 0 && c.r.answers > 0 && c.r.correct / c.r.answers >= 0.7 },
    { id: 'audacieux', icon: '💪', name: 'Audacieux', desc: 'Réussir 10 questions défi (au-dessus de son âge)', test: c => c.st.challengeOk >= 10 },
    { id: 'surdoue', icon: '🦾', name: 'Surdoué', desc: 'Réussir 50 questions défi', test: c => c.st.challengeOk >= 50 },
    { id: 'oeil-de-lynx', icon: '📸', name: 'Œil de lynx', desc: 'Réussir 10 questions photo', test: c => c.st.photoOk >= 10 },

    { id: 'rat-de-bibliotheque', icon: '📖', name: 'Rat de bibliothèque', desc: '100 bonnes réponses au total', test: c => c.st.correct >= 100 },
    { id: 'tete-bien-pleine', icon: '🧠', name: 'Tête bien pleine', desc: '500 bonnes réponses au total', test: c => c.st.correct >= 500 },
    { id: 'puits-de-science', icon: '🌌', name: 'Puits de science', desc: '1 000 bonnes réponses au total', test: c => c.st.correct >= 1000 },
    { id: 'tour-du-monde', icon: '🧭', name: 'Tour du savoir', desc: 'Jouer au moins une fois chacun des 12 thèmes', test: c => Object.keys(SPECIALISTS).every(k => (c.st.perCat[k] || {}).n > 0) },

    ...Object.keys(SPECIALISTS).map(cat => ({
      id: 'expert-' + cat, cat, name: SPECIALISTS[cat], desc: `${SPECIALIST_GOAL} bonnes réponses dans ce thème`,
      test: c => (c.st.perCat[cat] || {}).c >= SPECIALIST_GOAL
    })),

    { id: 'defi-semaine', icon: '🗓️', name: 'Défi de la semaine', desc: 'Participer à un défi familial de la semaine réussi', test: c => c.st.weeklyDone >= 1 },
    { id: 'pilier-famille', icon: '🏡', name: 'Pilier de la famille', desc: 'Participer à 10 défis de la semaine réussis', test: c => c.st.weeklyDone >= 10 },
    { id: 'objectif', icon: '🎯', name: 'Objectif atteint', desc: 'Atteindre son objectif personnel', test: c => c.st.goalsDone >= 1 },
    { id: 'perseverant', icon: '🧗', name: 'Persévérant', desc: 'Atteindre 5 objectifs personnels', test: c => c.st.goalsDone >= 5 },

    { id: 'couche-tard', icon: '🦉', name: 'Couche-tard', desc: 'Finir une partie après 21 h', test: c => c.g.hour >= 21 },
    { id: 'leve-tot', icon: '🐓', name: 'Lève-tôt', desc: 'Finir une partie avant 9 h', test: c => c.g.hour < 9 },
    { id: 'grande-tablee', icon: '🍽️', name: 'Grande tablée', desc: 'Jouer une partie à 6 joueurs', test: c => c.g.nPlayers >= 6 },
    { id: 'marathon', icon: '🏃', name: 'Marathon', desc: 'Jouer une partie d’au moins 6 thèmes', test: c => c.g.nCats >= 6 }
  ];

  // Icône d'un badge spécialiste = icône du thème.
  function iconOf(b) {
    if (b.icon) return b.icon;
    const c = (window.QUIZ_DATA.categories || []).find(x => x.id === b.cat);
    return c ? c.icon : '🏅';
  }

  // Débloque les badges gagnés ; renvoie la liste des nouveaux.
  function evaluate(p, c) {
    p.badges = p.badges || {};
    const fresh = [];
    LIST.forEach(b => {
      if (p.badges[b.id]) return;
      let ok = false;
      try { ok = !!b.test(c); } catch (e) { ok = false; }
      if (ok) { p.badges[b.id] = Date.now(); fresh.push(b); }
    });
    return fresh;
  }

  return { RANKS, LIST, rankOf, xpFor, evaluate, iconOf };
})();
