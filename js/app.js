/* Famili'Quiz — application : écrans, déroulement de la partie, statistiques. */
(() => {
  const app = document.getElementById('app');
  const modalRoot = document.getElementById('modal-root');
  let S = Store.settings();
  Sound.configure(S);

  const AVATARS = ['🦊', '🐼', '🐯', '🦁', '🐸', '🐵', '🦄', '🐲', '🐙', '🦉', '🐧', '🐨', '🐰', '🐻', '🐱', '🐶',
    '🦖', '🐝', '🦋', '🐢', '🦈', '🐳', '🦜', '🐞', '🤖', '👽', '👻', '🧙', '🦸', '🧚', '🤠', '🥷'];
  const COLORS = ['#ff5a5f', '#ff9800', '#f5c400', '#22c55e', '#00b8d4', '#3d8bfd', '#8b5cf6', '#ec4899'];
  const OK_WORDS = ['Bravo !', 'Excellent !', 'Super !', 'Génial !', 'Trop fort !', 'Bien joué !', 'Champion !', 'Magnifique !', 'Bingo !', 'Parfait !'];
  const KO_WORDS = ['Raté !', 'Oups !', 'Dommage !', 'Presque !', 'Pas cette fois !', 'Aïe !'];
  const HAS_TTS = 'speechSynthesis' in window;

  /* ================= Outils ================= */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const avatar = (p, size = '') => `<span class="avatar ${size} emoji" style="--pc:${/^#[0-9a-f]{3,8}$/i.test(p.color) ? p.color : "#8b5cf6"}">${esc(p.avatar)}</span>`;
  const catVars = c => `--t1:${c.c1};--t2:${c.c2}`;
  const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);
  const plural = (n, w) => `${n} ${w}${n > 1 ? 's' : ''}`;
  const medal = r => (r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : r + 'e');
  const lvlBadge = p => { const lv = Engine.LEVELS[Engine.levelOf(p)]; return `<span class="lvl-badge">${lv.icon} ${lv.name}</span>`; };
  const fmtDate = ts => {
    const d = new Date(ts);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) + ' · ' +
      d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  function toast(msg) {
    const el = document.createElement('div');
    el.textContent = msg;
    document.getElementById('toast').appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }
  let storageWarned = false;
  window.addEventListener('fq-storage-error', () => {
    if (storageWarned) return;
    storageWarned = true;
    toast('⚠️ Sauvegarde impossible dans ce navigateur (stockage plein ou bloqué)');
  });
  function popPoints(text) {
    const el = document.createElement('div');
    el.className = 'pts-pop'; el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1300);
  }
  function countUp(el, from, to) {
    if (!el) return;
    const t0 = performance.now();
    const step = now => {
      const k = Math.min(1, (now - t0) / 700);
      el.textContent = Math.round(from + (to - from) * k);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  function confetti(ms = 3500) {
    let cv = document.getElementById('confetti');
    if (!cv) { cv = document.createElement('canvas'); cv.id = 'confetti'; document.body.appendChild(cv); }
    const ctx = cv.getContext('2d');
    cv.width = innerWidth; cv.height = innerHeight;
    const colors = ['#ffd84d', '#ff5a5f', '#3d8bfd', '#22c55e', '#ff7eb3', '#7afcff', '#ffffff'];
    const parts = Array.from({ length: 170 }, () => ({
      x: Math.random() * cv.width, y: -20 - Math.random() * cv.height * 0.7,
      vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 4, r: 6 + Math.random() * 7,
      a: Math.random() * 6, va: (Math.random() - 0.5) * 0.3, c: colors[Math.floor(Math.random() * colors.length)]
    }));
    const end = performance.now() + ms;
    (function frame(now) {
      ctx.clearRect(0, 0, cv.width, cv.height);
      parts.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.025; p.a += p.va;
        if (now < end && p.y > cv.height) { p.y = -10; p.vy = 2 + Math.random() * 3; p.x = Math.random() * cv.width; }
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
        ctx.fillStyle = p.c; ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
        ctx.restore();
      });
      if (parts.some(p => p.y < cv.height + 20)) requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, cv.width, cv.height);
    })(performance.now());
  }
  function setTint(c) {
    const r = document.documentElement.style;
    if (c) { r.setProperty('--c1', c.c1); r.setProperty('--c2', c.c2); }
    else { r.removeProperty('--c1'); r.removeProperty('--c2'); }
  }

  /* ================= Écrans, actions, clavier ================= */
  let actions = {}, modalActions = null, keyHandler = null, cleanups = [];

  function screen(cls, html, acts = {}, keys = null, opts = {}) {
    // À la télécommande, on garde la sélection sur le même bouton quand l'écran se redessine.
    const prev = usingKeys && app.contains(document.activeElement) ? focusKey(document.activeElement) : null;
    cleanups.forEach(f => f()); cleanups = [];
    closeModal();
    document.querySelectorAll('.zoom-overlay').forEach(z => z.remove());
    actions = acts; keyHandler = keys;
    app.className = cls;
    app.innerHTML = html;
    if (opts.anim !== false) { app.classList.add('screen'); app.style.animation = 'none'; void app.offsetHeight; app.style.animation = ''; }
    if (opts.anim !== false) window.scrollTo(0, 0);
    if (usingKeys) {
      // Même écran redessiné (anim: false) : on reste sur le même bouton ; nouvel écran : sélection par défaut.
      const again = opts.anim === false && prev ? app.querySelector(prev) : null;
      if (again && focusables().includes(again)) again.focus(); else focusDefault();
    }
  }
  function later(fn, ms) {
    const id = setTimeout(fn, ms);
    cleanups.push(() => clearTimeout(id));
    return id;
  }
  function openModal(html, acts, opaque = false) {
    modalRoot.innerHTML = `<div class="overlay" ${opaque ? 'style="background:rgba(20,8,50,.97)"' : ''}>${html}</div>`;
    modalActions = acts;
    if (usingKeys) focusDefault();
  }
  function closeModal() {
    const had = !!modalActions;
    modalRoot.innerHTML = ''; modalActions = null;
    if (had && usingKeys) focusDefault();
  }
  function confirmBox(text, onYes, onNo, yesLabel = 'Oui') {
    openModal(`<div class="modal"><h3>🤔 Es-tu sûr ?</h3><p style="text-align:center;font-size:1.1rem">${esc(text)}</p>
      <div class="actions"><button class="btn ghost" data-act="no">Non</button><button class="btn danger" data-act="yes">${esc(yesLabel)}</button></div></div>`,
    { yes: () => { closeModal(); onYes(); }, no: () => { closeModal(); onNo && onNo(); } }, true);
  }

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const inModal = modalRoot.contains(el);
    const fn = (inModal ? modalActions : actions || {})[el.dataset.act];
    if (!fn) return;
    if (!el.dataset.quiet) Sound.play('click');
    fn(el, e);
  });
  /* ----- Clavier et télécommande de TV ----- */
  // Flèches : déplacer la sélection vers le bouton le plus proche dans cette direction.
  // OK / Entrée : valider. Retour : écran précédent, ou pause pendant une question.
  // Touches « Retour » : Échap, Retour arrière, GoBack / BrowserBack (Android TV, Fire TV),
  // codes 10009 (Samsung Tizen) et 461 (LG webOS).
  const ARROWS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
  const isBack = e => ['Escape', 'Backspace', 'GoBack', 'BrowserBack'].includes(e.key) || e.keyCode === 10009 || e.keyCode === 461;
  const isPauseKey = e => ['MediaPlayPause', 'Pause', 'MediaPause'].includes(e.key) || e.keyCode === 19;
  const FOCUSABLE = 'button:not(:disabled), input:not([type=hidden]):not(.hidden), a[href]';
  let usingKeys = false;

  function setKeyMode(on) {
    usingKeys = on;
    document.body.classList.toggle('keynav', on);
  }
  document.addEventListener('pointerdown', () => setKeyMode(false), { capture: true });

  // Sélecteur qui retrouve « le même » bouton après un nouveau rendu de l'écran.
  function focusKey(el) {
    if (!el || !el.dataset || !el.dataset.act) return null;
    const extra = ['id', 'v', 'i', 'k', 'n'].find(k => el.dataset[k] !== undefined);
    return `[data-act="${CSS.escape(el.dataset.act)}"]` + (extra ? `[data-${extra}="${CSS.escape(el.dataset[extra])}"]` : '');
  }
  const navRoot = () => modalRoot.firstElementChild || document.body;
  function focusables() {
    const root = navRoot();
    return [...root.querySelectorAll(FOCUSABLE)].filter(el => {
      if (root === document.body && modalRoot.contains(el)) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
    });
  }
  // Sélection par défaut : bouton « suivant » du retour de réponse, réponse A, bouton principal, sinon le premier bouton.
  function focusDefault() {
    const root = navRoot();
    const el = root.querySelector('.feedback .btn.primary') || root.querySelector('.ans:not(:disabled)')
      || root.querySelector('.btn.primary:not(:disabled):not(.hidden)') || root.querySelector('.modal .btn.green, .modal .btn.danger')
      || root.querySelector('.count-btn, .mode-card.on, .mode-card, .pcard')
      || focusables().find(x => x.dataset.act !== 'back' && !x.closest('#sound-bar')) || focusables()[0];
    if (el) el.focus();
  }
  function moveFocus(dir) {
    const items = focusables(), cur = document.activeElement;
    if (!items.includes(cur)) { focusDefault(); return; }
    const a = cur.getBoundingClientRect();
    const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    let best = null, bestScore = Infinity;
    items.forEach(el => {
      if (el === cur) return;
      const b = el.getBoundingClientRect();
      const dx = b.left + b.width / 2 - ax, dy = b.top + b.height / 2 - ay;
      let gap, side;
      if (dir === 'right') { if (dx <= 1) return; gap = b.left - a.right; side = Math.abs(dy); }
      else if (dir === 'left') { if (dx >= -1) return; gap = a.left - b.right; side = Math.abs(dy); }
      else if (dir === 'down') { if (dy <= 1) return; gap = b.top - a.bottom; side = Math.abs(dx); }
      else { if (dy >= -1) return; gap = a.top - b.bottom; side = Math.abs(dx); }
      const score = Math.max(0, gap) + side * 2;
      if (score < bestScore) { bestScore = score; best = el; }
    });
    if (best) { best.focus(); best.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
    else if (dir === 'up' || dir === 'down') window.scrollBy({ top: (dir === 'down' ? 1 : -1) * innerHeight * 0.4, behavior: 'smooth' });
  }

  document.addEventListener('keydown', e => {
    const dir = ARROWS[e.key];
    const t = e.target;
    const inField = t && t.matches && t.matches('input, textarea, select');
    if (dir || (isBack(e) && !inField)) setKeyMode(true);

    // Champs de saisie : les flèches gardent leur rôle (curseur, curseur de volume, nombre) sauf pour en sortir.
    if (inField) {
      const native = t.type === 'number' ? dir === 'up' || dir === 'down' : dir === 'left' || dir === 'right';
      if (dir && !native) { e.preventDefault(); moveFocus(dir); }
      else if (e.key === 'Escape') t.blur();
      return;
    }
    if (modalActions) {
      if (dir) { e.preventDefault(); moveFocus(dir); return; }
      if (isBack(e)) {
        e.preventDefault();
        (modalActions.resume || modalActions.no || modalActions.cancel || closeModal)();
      }
      return;
    }
    if (keyHandler && keyHandler(e) === true) return;
    if (dir) { e.preventDefault(); moveFocus(dir); return; }
    if (isBack(e)) {
      const b = app.querySelector('[data-act="back"]');
      if (b) { e.preventDefault(); b.click(); }
      return;
    }
    if (e.key === 'Enter') {
      // Bouton sélectionné (télécommande, Tab) : le navigateur l'active lui-même.
      const f = document.activeElement;
      if (f && f !== document.body && f.matches('button, a[href]')) return;
      const b = app.querySelector('.btn.primary:not(:disabled):not(.hidden)');
      if (b) { e.preventDefault(); b.click(); }
    }
  });

  /* ================= Audio : déblocage et musique ================= */
  let unlocked = false, wantMusic = 'menu';
  function music(name) {
    wantMusic = name;
    if (!name) return Sound.stopMusic();
    if (unlocked && S.music) Sound.playMusic(name);
  }
  // Le son ne peut démarrer qu'après un geste de l'utilisateur ; sur iPad il peut aussi être suspendu
  // après une mise en veille : chaque toucher le relance si besoin.
  function unlock() {
    Sound.init();
    if (unlocked) return;
    unlocked = true;
    if (wantMusic && S.music) Sound.playMusic(wantMusic);
  }
  ['pointerdown', 'touchend', 'keydown'].forEach(ev => document.addEventListener(ev, unlock, { capture: true }));

  const btnMusic = document.getElementById('btnMusic');
  const btnSfx = document.getElementById('btnSfx');
  function refreshSoundBar() {
    btnMusic.classList.toggle('off', !S.music);
    btnSfx.classList.toggle('off', !S.sfx);
    btnSfx.textContent = S.sfx ? '🔊' : '🔇';
  }
  btnMusic.addEventListener('click', () => {
    S.music = !S.music; Store.saveSettings(S); Sound.configure(S);
    if (S.music) { unlock(); if (wantMusic) Sound.playMusic(wantMusic); } else Sound.stopMusic();
    refreshSoundBar();
    if (app.classList.contains('settings-screen')) settingsScreen(false);
  });
  btnSfx.addEventListener('click', () => {
    S.sfx = !S.sfx; Store.saveSettings(S); Sound.configure(S); refreshSoundBar();
    if (app.classList.contains('settings-screen')) settingsScreen(false);
  });
  refreshSoundBar();

  /* Fond animé */
  (function background() {
    const bg = document.getElementById('bg');
    const icons = Engine.CATS.map(c => c.icon).concat(['⭐', '❓', '💡', '🏆']);
    bg.innerHTML = Array.from({ length: 16 }, (_, i) =>
      `<span class="emoji" style="left:${(i * 6.3 + Math.random() * 4).toFixed(1)}%;animation-duration:${22 + Math.random() * 22}s;animation-delay:-${Math.random() * 40}s;font-size:${2 + Math.random() * 2.5}rem">${icons[i % icons.length]}</span>`).join('');
  })();

  /* ================= Accueil ================= */
  function home() {
    setTint(null); music('menu'); Sound.duck(false); Sound.stopSpeech();
    G = null; T = null;
    const np = Store.players().length;
    screen('home-screen', `
      <div class="home">
        <div class="logo">
          <div class="logo-icon emoji">🧠</div>
          <h1>Famili'Quiz</h1>
          <p>Le grand quiz de la famille, adapté à chaque âge !</p>
        </div>
        <div class="cat-ribbon emoji">${Engine.cats.map((c, i) => `<span style="animation-delay:${(i * 0.2).toFixed(1)}s" title="${esc(c.name)}">${c.icon}</span>`).join('')}</div>
        <div class="menu">
          <button class="btn big primary" data-act="play">🎮 Nouvelle partie</button>
          <button class="btn" data-act="players">👥 Joueurs & statistiques</button>
          <button class="btn" data-act="history">📜 Historique des parties</button>
          <div class="row" style="flex-wrap:nowrap">
            <button class="btn" style="flex:1" data-act="settings">⚙️ Réglages</button>
            <button class="btn" style="flex:1" data-act="rules">❓ Règles</button>
          </div>
        </div>
        <div class="home-foot">${Engine.total} questions · ${Engine.cats.length} thèmes · ${plural(np, 'joueur')} enregistré${np > 1 ? 's' : ''}</div>
      </div>`,
    { play: setupCount, players: playersScreen, history: historyScreen, settings: () => settingsScreen(), rules: rulesScreen });
  }

  /* ================= Préparation de la partie ================= */
  let setup = null;

  function setupCount() {
    if (!Engine.cats.length) { toast('Aucune question chargée !'); return; }
    setup = { count: 0, selected: [], themeCount: Math.min(3, Engine.cats.length), mode: 'random', manual: [], perSeries: S.perSeries, gameMode: 'solo', teams: null };
    const faces = ['🧒', '👩', '🧔', '👧', '👵', '👦'];
    screen('setup', `
      <div class="topbar"><button class="btn round ghost" data-act="back">←</button><h2>Nouvelle partie</h2></div>
      <h2 class="title">Combien de joueurs ?</h2>
      <div class="count-grid">
        ${[1, 2, 3, 4, 5, 6].map(n => `<button class="count-btn" data-act="count" data-n="${n}"><b>${n}</b>
          <span class="emoji">${faces.slice(0, n).join('')}</span><small>${n === 1 ? 'Entraînement solo' : n + ' joueurs'}</small></button>`).join('')}
      </div>`,
    { back: home, count: el => { setup.count = +el.dataset.n; setupPlayers(); } },
    e => { if (/^[1-6]$/.test(e.key)) { setup.count = +e.key; setupPlayers(); return true; } });
  }

  function setupPlayers(anim = true) {
    const list = Store.players();
    setup.selected = setup.selected.filter(id => list.some(p => p.id === id)).slice(0, setup.count);
    const need = setup.count, sel = setup.selected;
    screen('setup', `
      <div class="topbar"><button class="btn round ghost" data-act="back">←</button><h2>Qui joue ?</h2>
        ${need > 1 ? `<button class="btn small ghost" data-act="shuffle" ${sel.length < 2 ? 'disabled' : ''}>🎲 Ordre au hasard</button>` : ''}</div>
      <p class="sub">${need === 1 ? 'Choisis ton joueur' : `Choisis ${need} joueurs, dans l’ordre de passage`} — <b>${sel.length}/${need}</b></p>
      <div class="players-grid">
        ${list.map(p => {
          const i = sel.indexOf(p.id);
          return `<button class="pcard ${i >= 0 ? 'selected' : ''}" data-act="toggle" data-id="${esc(p.id)}">
            ${i >= 0 ? `<span class="order">${i + 1}</span>` : ''}${avatar(p, 'lg')}
            <span class="name">${esc(p.name)}</span><span class="meta">${Engine.ageOf(p)} ans</span>${lvlBadge(p)}</button>`;
        }).join('')}
        <button class="pcard add" data-act="create"><span class="plus emoji">➕</span>Nouveau joueur</button>
      </div>
      <div class="center" style="margin-top:24px"><button class="btn big primary" data-act="next" ${sel.length === need ? '' : 'disabled'}>Suivant ▶</button></div>`,
    {
      back: setupCount,
      toggle: el => {
        const id = el.dataset.id, i = sel.indexOf(id);
        if (i >= 0) sel.splice(i, 1);
        else if (sel.length < need) { sel.push(id); Sound.play('pop'); }
        else if (need === 1) sel[0] = id;
        else { toast(`Déjà ${need} joueurs choisis : retire quelqu’un d’abord`); return; }
        setupPlayers(false);
      },
      create: () => playerForm(null, p => { if (sel.length < need) sel.push(p.id); setupPlayers(false); }),
      shuffle: () => { setup.selected = Engine.shuffle(sel); Sound.play('whoosh'); setupPlayers(false); },
      next: () => { if (need > 1) setupMode(); else { setup.gameMode = 'solo'; setupThemes(); } }
    }, null, { anim });
  }

  /* ----- Mode de jeu et équipes ----- */
  const TEAM_COLORS = ['#3d8bfd', '#ff8a00'];
  const TEAM_ICONS = ['🔵', '🟠'];
  const TEAM_DEFAULT = ['Équipe Bleue', 'Équipe Orange'];

  // Parents (adultes) contre enfants si possible, sinon deux équipes équilibrées par âge (en serpentin).
  function autoTeams(ids) {
    const ps = ids.map(id => Store.player(id)).filter(Boolean);
    const adults = ps.filter(p => Engine.levelOf(p) === 4), kids = ps.filter(p => Engine.levelOf(p) < 4);
    if (adults.length && kids.length) return [{ name: 'Les Parents', ids: adults.map(p => p.id) }, { name: 'Les Enfants', ids: kids.map(p => p.id) }];
    const A = [], B = [];
    ps.slice().sort((a, b) => Engine.ageOf(b) - Engine.ageOf(a)).forEach((p, i) => (i % 4 === 0 || i % 4 === 3 ? A : B).push(p.id));
    return [{ name: TEAM_DEFAULT[0], ids: A }, { name: TEAM_DEFAULT[1], ids: B }];
  }

  function setupMode() {
    const card = (v, ic, title, desc) => `<button class="mode-card ${setup.gameMode === v ? 'on' : ''}" data-act="pick" data-v="${v}">
      <span class="ic emoji">${ic}</span><b>${title}</b><small>${desc}</small></button>`;
    screen('setup', `
      <div class="topbar"><button class="btn round ghost" data-act="back">←</button><h2>Mode de jeu</h2></div>
      <div class="mode-grid">
        ${card('solo', '🏆', 'Chacun pour soi', 'Chaque joueur joue pour lui : un seul gagnant.')}
        ${card('teams', '🤝', 'En équipes', 'Parents contre enfants, ou deux équipes au choix. Le score d’une équipe est la moyenne de ses joueurs.')}
      </div>`,
    {
      back: () => setupPlayers(),
      pick: el => { setup.gameMode = el.dataset.v; setup.gameMode === 'teams' ? setupTeams() : setupThemes(); }
    }, e => {
      if (e.key === '1') { setup.gameMode = 'solo'; setupThemes(); return true; }
      if (e.key === '2') { setup.gameMode = 'teams'; setupTeams(); return true; }
    });
  }

  function setupTeams(anim = true) {
    const sel = setup.selected;
    const valid = setup.teams && setup.teams.reduce((n, t) => n + t.ids.length, 0) === sel.length && setup.teams.every(t => t.ids.every(id => sel.includes(id)));
    if (!valid) setup.teams = autoTeams(sel);
    const ok = setup.teams.every(t => t.ids.length > 0);
    screen('setup', `
      <div class="topbar"><button class="btn round ghost" data-act="back">←</button><h2>Les équipes</h2>
        <button class="btn small ghost" data-act="auto">🔄 Répartition auto</button></div>
      <p class="sub">Touche un joueur pour le changer d’équipe. Tu peux aussi renommer les équipes.</p>
      <div class="teams-grid">${setup.teams.map((t, k) => `
        <div class="team-col" style="--tc:${TEAM_COLORS[k]}">
          <div class="team-head"><span class="emoji">${TEAM_ICONS[k]}</span><input type="text" class="team-name" data-k="${k}" maxlength="18" value="${esc(t.name)}" aria-label="Nom de l’équipe"></div>
          <div class="team-members">${t.ids.map(id => {
            const p = Store.player(id);
            return p ? `<button class="tmember" data-act="move" data-id="${esc(id)}">${avatar(p, 'sm')}<span>${esc(p.name)}</span><small>${Engine.ageOf(p)} ans</small></button>` : '';
          }).join('') || '<p class="team-empty">Aucun joueur</p>'}</div>
        </div>`).join('<div class="vs">VS</div>')}</div>
      ${ok ? '' : '<p class="sub">Il faut au moins un joueur dans chaque équipe.</p>'}
      <div class="center" style="margin-top:22px"><button class="btn big primary" data-act="next" ${ok ? '' : 'disabled'}>Suivant ▶</button></div>`,
    {
      back: setupMode,
      auto: () => { setup.teams = autoTeams(sel); Sound.play('whoosh'); setupTeams(false); },
      move: el => {
        const id = el.dataset.id, from = setup.teams.findIndex(t => t.ids.includes(id));
        if (from < 0) return;
        setup.teams[from].ids = setup.teams[from].ids.filter(x => x !== id);
        setup.teams[1 - from].ids.push(id);
        Sound.play('pop'); setupTeams(false);
      },
      next: () => setupThemes()
    }, null, { anim });
    app.querySelectorAll('.team-name').forEach(inp => inp.addEventListener('input', () => {
      setup.teams[+inp.dataset.k].name = inp.value.trim().slice(0, 18) || TEAM_DEFAULT[+inp.dataset.k];
    }));
  }

  function setupThemes(anim = true) {
    const manual = setup.mode === 'manual';
    const max = Engine.cats.length;
    setup.themeCount = Engine.clamp(setup.themeCount, 1, max);
    const n = manual ? setup.manual.length : setup.themeCount;
    const minutes = Math.max(1, Math.round((setup.count * n * setup.perSeries * (S.time + 8)) / 60));
    screen('setup', `
      <div class="topbar"><button class="btn round ghost" data-act="back">←</button><h2>Les thèmes</h2></div>
      <div class="opt-block"><label class="lbl">Questions par thème pour chaque joueur</label>
        <div class="seg">${[5, 8, 10].map(v => `<button class="${setup.perSeries === v ? 'on' : ''}" data-act="per" data-v="${v}">${v}</button>`).join('')}</div></div>
      <div class="opt-block"><label class="lbl">Choix des thèmes</label>
        <div class="seg"><button class="${!manual ? 'on' : ''}" data-act="mode" data-v="random">🎲 Tirage au sort</button><button class="${manual ? 'on' : ''}" data-act="mode" data-v="manual">✋ On choisit</button></div></div>
      ${manual
        ? `<p class="sub">Touche les thèmes à jouer (${n} choisi${n > 1 ? 's' : ''})</p>
           <div class="cats-grid">${Engine.cats.map(c => `<button class="cat-tile ${setup.manual.includes(c.id) ? 'on' : 'off'}" style="${catVars(c)}" data-act="pick" data-id="${c.id}">
             <span class="ic emoji">${c.icon}</span>${esc(c.name)}</button>`).join('')}</div>`
        : `<div class="opt-block"><label class="lbl">Nombre de thèmes</label>
             <div class="stepper"><button class="btn round" data-act="dec" ${n <= 1 ? 'disabled' : ''}>−</button><b>${n}</b><button class="btn round" data-act="inc" ${n >= max ? 'disabled' : ''}>+</button></div></div>`}
      <p class="estimate">⏱️ Durée estimée : environ ${minutes} min · ${plural(setup.count * n * setup.perSeries, 'question')} au total</p>
      <div class="center"><button class="btn big primary" data-act="go" ${n ? '' : 'disabled'}>${manual ? 'C’est parti ! 🚀' : 'Tirer les thèmes au sort 🎲'}</button></div>`,
    {
      back: () => (setup.count < 2 ? setupPlayers() : setup.gameMode === 'teams' ? setupTeams() : setupMode()),
      per: el => { setup.perSeries = +el.dataset.v; S.perSeries = setup.perSeries; Store.saveSettings(S); setupThemes(false); },
      mode: el => { setup.mode = el.dataset.v; setupThemes(false); },
      pick: el => {
        const id = el.dataset.id, i = setup.manual.indexOf(id);
        if (i >= 0) setup.manual.splice(i, 1); else setup.manual.push(id);
        setupThemes(false);
      },
      dec: () => { setup.themeCount--; setupThemes(false); },
      inc: () => { setup.themeCount++; setupThemes(false); },
      go: () => (manual ? startGame(setup.selected.slice(), setup.manual.slice()) : drawScreen())
    }, e => {
      if (manual) return;
      if (e.key === '+') { if (setup.themeCount < max) { setup.themeCount++; setupThemes(false); } return true; }
      if (e.key === '-') { if (setup.themeCount > 1) { setup.themeCount--; setupThemes(false); } return true; }
    }, { anim });
  }

  /* ================= Tirage au sort des thèmes ================= */
  function drawScreen() {
    const n = setup.themeCount;
    const targets = Engine.shuffle(Engine.cats.map(c => c.id)).slice(0, n);
    let k = 0, skipped = false;
    screen('draw', `
      <h2 class="title">🎲 Tirage au sort des thèmes</h2>
      <div class="slot" id="slot"><div><div class="ic emoji" id="slotIc">❓</div><div class="nm" id="slotNm">Prêts ?</div></div></div>
      <div class="drawn" id="drawn"></div>
      <div class="center"><button class="btn ghost" data-act="skip" id="skipBtn">⏩ Passer l’animation</button>
        <button class="btn big primary hidden" id="goBtn" data-act="go">Lancer la partie ! 🚀</button></div>`,
    {
      skip: () => {
        skipped = true;
        for (; k < n; k++) addChip(Engine.cat(targets[k]), k + 1);
        show(Engine.cat(targets[n - 1]));
        done();
      },
      go: () => startGame(setup.selected.slice(), targets)
    }, e => { if (e.key === ' ' && !skipped) { actions.skip(); return true; } });

    const slot = document.getElementById('slot');
    const show = c => {
      slot.style.cssText = catVars(c);
      document.getElementById('slotIc').textContent = c.icon;
      document.getElementById('slotNm').textContent = c.name;
    };
    const addChip = (c, i) => {
      document.getElementById('drawn').insertAdjacentHTML('beforeend',
        `<span class="chip" style="${catVars(c)}"><span class="n">${i}</span><span class="emoji">${c.icon}</span>${esc(c.name)}</span>`);
    };
    const done = () => {
      document.getElementById('skipBtn').classList.add('hidden');
      document.getElementById('goBtn').classList.remove('hidden');
      if (usingKeys) document.getElementById('goBtn').focus();
    };
    const spin = () => {
      if (skipped) return;
      if (k >= n) { Sound.play('turn'); return done(); }
      const target = Engine.cat(targets[k]);
      let delay = 45;
      const roll = () => {
        if (skipped) return;
        if (delay > 280) {
          show(target);
          slot.classList.remove('landed'); void slot.offsetWidth; slot.classList.add('landed');
          Sound.play('reveal');
          addChip(target, ++k);
          later(spin, 950);
          return;
        }
        show(Engine.rand(Engine.cats)); Sound.play('slot');
        delay *= 1.12;
        later(roll, delay);
      };
      roll();
    };
    later(spin, 500);
  }

  /* ================= Partie ================= */
  let G = null; // partie en cours
  let T = null; // série (tour) en cours

  function startGame(pids, catIds) {
    let players = pids.map(id => Store.player(id)).filter(Boolean);
    let teams = null;
    if (setup.gameMode === 'teams' && setup.teams && players.length > 1) {
      teams = setup.teams.map((t, k) => ({ name: t.name, color: TEAM_COLORS[k], icon: TEAM_ICONS[k], ids: t.ids.filter(id => players.some(p => p.id === id)) }));
      // Ordre de passage alterné : un joueur de chaque équipe à tour de rôle.
      const order = [];
      for (let i = 0; i < Math.max(...teams.map(t => t.ids.length)); i++) teams.forEach(t => { if (t.ids[i]) order.push(t.ids[i]); });
      players = order.map(id => players.find(p => p.id === id));
    }
    G = {
      id: Date.now().toString(36), date: Date.now(), cats: catIds, perSeries: setup.perSeries,
      players, teams, mode: teams ? 'teams' : 'solo', round: 0, turn: 0, used: new Set(), res: {}, saved: false
    };
    players.forEach(p => {
      G.res[p.id] = {
        total: 0, correct: 0, answers: 0, timeSum: 0, fracSum: 0, bestStreak: 0, levelBonus: 0, perCat: {},
        fastestOk: Infinity, lastSecondOk: false, jokersUsed: 0, jokerOk: false, series: [], challengeOk: 0, photoOk: 0, lastAfterFirst: false
      };
    });
    music('game');
    turnIntro();
  }
  const curPlayer = () => G.players[G.turn];
  const curCat = () => Engine.cat(G.cats[G.round]);
  const teamOf = pid => (G.teams ? G.teams.find(t => t.ids.includes(pid)) : null);
  const teamChip = t => `<span class="team-chip" style="--tc:${t.color}"><span class="emoji">${t.icon}</span> ${esc(t.name)}</span>`;

  // Score d'équipe = moyenne des points de ses joueurs (juste si les équipes n'ont pas la même taille).
  function teamRanking() {
    const arr = G.teams.map(t => {
      const sum = t.ids.reduce((s, id) => s + G.res[id].total, 0);
      return { t, sum, score: Math.round(sum / t.ids.length) };
    }).sort((a, b) => b.score - a.score);
    arr.forEach((x, i) => { x.rank = i > 0 && x.score === arr[i - 1].score ? arr[i - 1].rank : i + 1; });
    return arr;
  }

  function miniBoard() {
    if (G.teams) {
      const cur = teamOf(curPlayer().id);
      return `<div class="mini-board">${teamRanking().map(x => `<span class="it team ${x.t === cur ? 'cur' : ''}" style="--tc:${x.t.color}">
        <span class="emoji">${x.t.icon}</span>${esc(x.t.name)} · ${x.score}</span>`).join('')}</div>`;
    }
    return `<div class="mini-board">${G.players.map((p, i) =>
      `<span class="it ${i === G.turn ? 'cur' : ''}">${avatar(p, 'sm')}${esc(p.name)} · ${G.res[p.id].total}</span>`).join('')}</div>`;
  }

  function turnIntro() {
    const p = curPlayer(), c = curCat(), L = Engine.levelOf(p), lv = Engine.LEVELS[L];
    setTint(c); Sound.duck(false);
    const t = Engine.timeFor(p, S);
    const sk = Engine.skill(p, c.id);
    const hint = sk > L + 0.25 ? '🔥 Tu es très fort dans ce thème : tu auras quelques questions plus corsées… avec un bonus de points !'
      : sk < L - 0.25 ? '🌱 Dans ce thème, tu auras quelques questions plus accessibles pour bien progresser.' : '';
    screen('turn-screen', `
      <div class="turn">
        <div class="theme-banner"><span class="ic emoji">${c.icon}</span>${esc(c.name)} <small style="opacity:.85">· thème ${G.round + 1}/${G.cats.length}</small></div>
        ${avatar(p, 'xl')}
        <h2>${G.players.length > 1 ? 'Au tour de ' : 'À toi, '}${esc(p.name)} !</h2>
        ${G.teams ? teamChip(teamOf(p.id)) : ''}
        <span class="lvl-badge">${lv.icon} Niveau ${lv.name} (${lv.range})</span>
        <div class="info">${G.perSeries} questions · ⏱️ ${t} s par question${t > S.time ? ` (dont +${t - S.time} s bonus)` : ''}${S.jokers ? ' · 🎭 1 joker 50/50' : ''}</div>
        ${hint ? `<div class="info">${hint}</div>` : ''}
        <button class="btn big primary" data-act="go">Je suis prêt ! ▶</button>
        ${G.players.length > 1 ? miniBoard() : ''}
      </div>`,
    { go: startSeries });
    Sound.play('turn');
  }

  function startSeries() {
    const p = curPlayer(), c = curCat();
    T = { p, cat: c, i: 0, streak: 0, bestStreak: 0, joker: S.jokers, marks: [], points: 0, correct: 0 };
    G.res[p.id].perCat[c.id] = G.res[p.id].perCat[c.id] || { c: 0, n: 0, pts: 0 };
    askQuestion();
  }

  function askQuestion() {
    const { p, cat } = T;
    const q = Engine.pickQuestion(p, cat.id, G.used);
    G.used.add(q.id);
    Store.markSeen(p.id, q.id);
    const total = Engine.timeFor(p, S);
    Object.assign(T, { q, locked: false, canNext: false, paused: false, autoId: null, token: {}, jokerOn: false });
    T.timer = { total, left: total, running: false, last: 0, sec: Math.ceil(total), iv: 0 };
    const res = G.res[p.id];
    const lv = Engine.LEVELS[q.l];

    screen('question-screen', `
      <div class="q-top">
        <div class="q-player">${avatar(p, 'sm')} ${esc(p.name)}</div>
        <div class="q-progress">${Array.from({ length: G.perSeries }, (_, i) => `<i class="${T.marks[i] || (i === T.i ? 'cur' : '')}"></i>`).join('')}</div>
        ${T.streak >= 2 ? `<div class="streak-badge">🔥 ${T.streak}</div>` : ''}
        <div class="q-score">⭐ <span id="score">${res.total}</span></div>
      </div>
      <div class="q-stage ${q.img ? 'has-photo' : ''}">
        <div class="q-visual ${q.img ? 'photo' : ''}">
          ${q.img
            ? `<img class="q-photo" id="qPhoto" src="${esc(q.img)}" alt="Photo de la question" data-act="zoom" data-quiet="1" draggable="false">`
            : `<div class="q-emoji emoji">${esc(q.e)}</div>`}
          <div class="q-tag"><span class="emoji">${cat.icon}</span> ${T.i + 1}/${G.perSeries} · ${lv.icon}</div>
          <div class="timer" id="timer"><svg viewBox="0 0 100 100"><circle class="track" cx="50" cy="50" r="42"/>
            <circle class="bar" id="tbar" cx="50" cy="50" r="42" stroke-dasharray="263.9" stroke-dashoffset="0"/></svg>
            <div class="num" id="tnum">${total}</div></div>
        </div>
        <div class="q-right">
          <div class="q-text"><span>${esc(q.q)}</span>${HAS_TTS ? '<button class="speak" data-act="speak" data-quiet="1" title="Lire la question">🔊</button>' : ''}</div>
          <div class="answers n${q.answers.length}">${q.answers.map((a, i) =>
            `<button class="ans a${i}" data-act="answer" data-i="${i}" data-quiet="1"><span class="key">${'ABCD'[i]}</span><span class="txt">${esc(a.t)}</span></button>`).join('')}</div>
          <div class="q-tools">
            ${S.jokers ? `<button class="btn small ghost" id="jokerBtn" data-act="joker" data-quiet="1" ${T.joker ? '' : 'disabled'}>🎭 Joker 50/50</button>` : ''}
            <button class="btn small ghost" data-act="pause">⏸ Pause</button>
          </div>
        </div>
      </div>`,
    {
      answer: el => answer(+el.dataset.i),
      joker: useJoker,
      pause: pauseGame,
      speak: () => Sound.speak(q.q),
      next: nextQuestion,
      zoom: () => {
        const z = document.createElement('div');
        z.className = 'zoom-overlay';
        z.innerHTML = `<img src="${esc(q.img)}" alt=""><span>Touche pour fermer</span>`;
        z.addEventListener('click', () => z.remove());
        document.body.appendChild(z);
      }
    }, e => {
      if (ARROWS[e.key]) return; // flèches : passer d'une réponse à l'autre (télécommande)
      const k = e.key.toLowerCase();
      const idx = { '1': 0, '2': 1, '3': 2, '4': 3, a: 0, b: 1, c: 2, d: 3 }[k];
      if (idx !== undefined && !T.locked && idx < q.answers.length) {
        const b = app.querySelector(`.ans[data-i="${idx}"]`);
        if (b && !b.disabled) answer(idx);
        return true;
      }
      if (k === 'p' || isBack(e) || isPauseKey(e)) { e.preventDefault(); pauseGame(); return true; }
      if ((k === 'enter' || k === ' ') && T.locked) { e.preventDefault(); nextQuestion(); return true; }
      return true;
    }, { anim: T.i === 0 });
    const thisTimer = T.timer;
    cleanups.push(() => { thisTimer.running = false; clearInterval(thisTimer.iv); });
    Sound.duck(true);

    const token = T.token;
    const readAloud = HAS_TTS && (S.tts === 'all' || (S.tts === 'young' && Engine.levelOf(p) === 1));
    const begin = () => {
      if (!T || T.token !== token) return;
      if (readAloud) {
        Sound.speak(q.q + ' … ' + q.answers.map((a, i) => 'ABCD'[i] + ' : ' + a.t).join(' ; '), () => { if (T && T.token === token) startTimer(); });
      } else {
        later(startTimer, 500);
      }
    };
    // Question photo : le chrono ne démarre qu'une fois l'image affichée (3 s maximum d'attente).
    const photo = document.getElementById('qPhoto');
    if (photo && !photo.complete) {
      let started = false;
      const go = () => { if (!started) { started = true; begin(); } };
      photo.addEventListener('load', go);
      photo.addEventListener('error', go);
      later(go, 3000);
    } else {
      begin();
    }
  }

  /* ----- Compte à rebours ----- */
  function startTimer() {
    if (!T || T.locked || T.paused) return;
    if (document.hidden) { T.waitVisible = true; return; } // démarrera au retour sur l'onglet
    const tm = T.timer;
    if (tm.running) return;
    tm.running = true; tm.last = performance.now();
    // Horloge réelle (et non requestAnimationFrame) : fiable même si l'affichage est ralenti.
    const tick = () => {
      if (!tm.running) return;
      const now = performance.now();
      tm.left -= Math.min(now - tm.last, 1000) / 1000; tm.last = now;
      drawTimer();
      const sec = Math.ceil(tm.left);
      if (sec < tm.sec && sec > 0) { tm.sec = sec; Sound.play(sec <= 3 ? 'tickUrgent' : 'tick'); }
      if (tm.left <= 0) { tm.left = 0; stopTimer(); drawTimer(); answer(-1); }
    };
    tm.iv = setInterval(tick, 50);
  }
  function stopTimer() {
    if (T && T.timer) { T.timer.running = false; clearInterval(T.timer.iv); }
  }
  function drawTimer() {
    const tm = T.timer, el = document.getElementById('timer');
    if (!el) return;
    const frac = Math.max(0, tm.left / tm.total);
    document.getElementById('tbar').setAttribute('stroke-dashoffset', (263.9 * (1 - frac)).toFixed(1));
    document.getElementById('tnum').textContent = Math.max(0, Math.ceil(tm.left));
    el.classList.toggle('warn', tm.left <= tm.total / 2 && tm.left > 3);
    el.classList.toggle('danger', tm.left <= 3);
  }

  /* ----- Réponse ----- */
  function answer(i) {
    if (!T || T.locked) return;
    T.locked = true;
    stopTimer(); Sound.stopSpeech();
    const { p, cat, q } = T, tm = T.timer;
    const ok = i >= 0 && q.answers[i].ok;
    T.streak = ok ? T.streak + 1 : 0;
    T.bestStreak = Math.max(T.bestStreak, T.streak);
    const sc = Engine.score({ ok, timeLeft: tm.left, timeTotal: tm.total, streak: T.streak, qLevel: q.l, ageLvl: Engine.levelOf(p) });
    Engine.updateSkill(p, cat.id, q.l, ok);

    const r = G.res[p.id], pc = r.perCat[cat.id];
    const before = r.total;
    r.answers++; pc.n++;
    const used = tm.total - tm.left;
    r.timeSum += used; r.fracSum += used / tm.total;
    if (ok) {
      r.correct++; pc.c++; T.correct++;
      r.fastestOk = Math.min(r.fastestOk, used);
      if (tm.left < 1) r.lastSecondOk = true;
      if (q.l > Engine.levelOf(p)) r.challengeOk++;
      if (q.img) r.photoOk++;
      if (T.jokerOn) r.jokerOk = true;
    }
    r.total += sc.total; pc.pts += sc.total; T.points += sc.total;
    r.bestStreak = Math.max(r.bestStreak, T.streak);
    r.levelBonus += sc.level;
    T.marks[T.i] = ok ? 'ok' : 'ko';

    app.querySelectorAll('.ans').forEach((b, k) => {
      b.disabled = true;
      if (q.answers[k].ok) b.classList.add('correct');
      else if (k === i) b.classList.add('wrong');
      else b.classList.add('dim');
    });
    const dot = app.querySelectorAll('.q-progress i')[T.i];
    if (dot) dot.className = T.marks[T.i];
    const jb = document.getElementById('jokerBtn'); if (jb) jb.disabled = true;
    countUp(document.getElementById('score'), before, r.total);

    if (ok) {
      Sound.play('correct');
      popPoints('+' + sc.total);
      if (T.streak >= 3) later(() => Sound.play('streak'), 500);
    } else {
      Sound.play(i < 0 ? 'timeout' : 'wrong');
    }
    later(() => showFeedback(ok, i < 0, sc), 650);
  }

  function showFeedback(ok, timeout, sc) {
    const q = T.q;
    const good = q.answers.find(a => a.ok).t;
    const title = ok ? `✅ ${Engine.rand(OK_WORDS)}` : timeout ? '⏰ Temps écoulé !' : `❌ ${Engine.rand(KO_WORDS)}`;
    const chips = ok ? [`Bonne réponse +${sc.base}`, sc.speed && `⚡ Rapidité +${sc.speed}`, sc.streak && `🔥 Série de ${T.streak} +${sc.streak}`, sc.level && `💪 Question défi +${sc.level}`].filter(Boolean) : [];
    const last = T.i + 1 >= G.perSeries;
    const autoMs = Math.min(13000, 5000 + (q.f || '').length * 40);
    const div = document.createElement('div');
    div.className = 'feedback ' + (ok ? 'ok' : 'ko');
    div.innerHTML = `
      <div class="fb-title">${title}${ok ? `<span class="pts">+${sc.total} pts</span>` : ''}</div>
      ${ok ? '' : `<div class="fb-answer">La bonne réponse était : <b>${esc(good)}</b></div>`}
      ${chips.length ? `<div class="fb-chips">${chips.map(c => `<span>${c}</span>`).join('')}</div>` : ''}
      ${q.f ? `<div class="fb-fact">💡 <b>Le savais-tu ?</b> ${esc(q.f)}</div>` : ''}
      ${q.img ? `<div class="fb-credit">📷 ${esc(q.cr)} · Wikimedia Commons</div>` : ''}
      <div class="fb-actions"><button class="btn primary has-bar" data-act="next">${last ? 'Fin de la série 🏁' : 'Question suivante ▶'}
        ${S.autoNext ? `<span class="autobar" style="animation-duration:${autoMs}ms"></span>` : ''}</button></div>`;
    app.appendChild(div);
    if (usingKeys) div.querySelector('.btn.primary').focus();
    T.canNext = true;
    if (T.paused) { const bar = div.querySelector('.autobar'); if (bar) bar.remove(); }
    else if (S.autoNext) T.autoId = later(nextQuestion, autoMs);
  }

  function nextQuestion() {
    if (!T || !T.canNext) return;
    T.canNext = false;
    clearTimeout(T.autoId);
    T.i++;
    if (T.i < G.perSeries) askQuestion(); else seriesEnd();
  }

  function useJoker() {
    if (!T || !T.joker || T.locked) return;
    T.joker = false; T.jokerOn = true;
    G.res[T.p.id].jokersUsed++;
    const wrong = T.q.answers.map((a, i) => (a.ok ? -1 : i)).filter(i => i >= 0);
    Engine.shuffle(wrong).slice(0, T.q.answers.length === 4 ? 2 : 1).forEach(i => {
      const b = app.querySelector(`.ans[data-i="${i}"]`);
      if (b) { b.classList.add('removed'); b.disabled = true; }
    });
    document.getElementById('jokerBtn').disabled = true;
    Sound.play('joker');
  }

  function pauseGame() {
    if (!T) return;
    T.paused = true;
    stopTimer(); Sound.stopSpeech();
    if (T.autoId) { clearTimeout(T.autoId); T.autoId = null; const bar = app.querySelector('.autobar'); if (bar) bar.remove(); }
    openModal(`<div class="modal"><h3>⏸ Pause</h3>
      <p style="text-align:center">La question est cachée pendant la pause.<br>Le chrono reprendra là où il s’est arrêté.</p>
      <div class="actions"><button class="btn green big" data-act="resume">▶ Reprendre</button>
      <button class="btn danger" data-act="quit">🚪 Quitter la partie</button></div></div>`,
    {
      resume: () => {
        closeModal(); T.paused = false;
        if (!T.locked) startTimer();
        else if (T.canNext && S.autoNext) T.autoId = later(nextQuestion, 4000);
      },
      quit: () => confirmBox('Quitter la partie en cours ? Les scores de cette partie ne seront pas enregistrés.', home, pauseGame, 'Quitter')
    }, true);
  }
  document.addEventListener('visibilitychange', () => {
    if (!T || !T.timer) return;
    if (document.hidden && !T.locked && !T.paused) pauseGame();
    else if (!document.hidden && T.waitVisible) { T.waitVisible = false; startTimer(); }
  });

  /* ----- Fin de série, de thème, de partie ----- */
  function seriesEnd() {
    Sound.duck(false);
    const { p, cat } = T;
    Store.savePlayer(p); // niveau adaptatif mis à jour
    const n = G.perSeries, c = T.correct, ratio = c / n;
    const stars = ratio >= 0.9 ? 3 : ratio >= 0.7 ? 2 : ratio >= 0.4 ? 1 : 0;
    G.res[p.id].series.push({ cat: cat.id, c, n, stars });
    const team = teamOf(p.id);
    const msg = [`Courage ${esc(p.name)}, ça ira mieux au prochain thème !`, `Pas mal, ${esc(p.name)} !`, `Très bien joué, ${esc(p.name)} !`, `Incroyable, ${esc(p.name)} !`][stars];
    const lastPlayer = G.turn + 1 >= G.players.length;
    const lastRound = G.round + 1 >= G.cats.length;
    const nextLabel = !lastPlayer ? `Au tour de ${esc(G.players[G.turn + 1].name)} ▶`
      : G.players.length > 1 ? 'Résultats du thème 📊' : lastRound ? 'Résultats finaux 🏆' : 'Thème suivant ▶';
    screen('result-screen', `
      <div class="result">
        <div class="theme-banner"><span class="ic emoji">${cat.icon}</span>${esc(cat.name)}</div>
        ${avatar(p, 'lg')}
        <h2 class="title">${msg}</h2>
        ${team ? `<div class="sub">${teamChip(team)} +${T.points} points pour l’équipe</div>` : ''}
        <div class="stars">${[0, 1, 2].map(i => `<span class="emoji ${i < stars ? '' : 'off'}">⭐</span>`).join('')}</div>
        <div class="big-num">${c}/${n}</div>
        <div class="stat-row">
          <div class="stat"><b>+${T.points}</b><small>points gagnés</small></div>
          <div class="stat"><b>🔥 ${T.bestStreak}</b><small>meilleure série</small></div>
          <div class="stat"><b>${G.res[p.id].total}</b><small>score total</small></div>
        </div>
        <button class="btn big primary" data-act="next">${nextLabel}</button>
      </div>`,
    { next: afterSeries });
    T = null;
    if (stars === 3) { confetti(2500); Sound.play('fanfare'); }
    else if (stars >= 1) Sound.play('turn');
    else Sound.play('pop');
  }

  function afterSeries() {
    G.turn++;
    if (G.turn < G.players.length) return turnIntro();
    G.turn = 0;
    if (G.players.length > 1) return roundEnd();
    G.round++;
    G.round < G.cats.length ? turnIntro() : finalScreen();
  }

  function ranking() {
    const arr = G.players.map(p => ({ p, res: G.res[p.id], total: G.res[p.id].total })).sort((a, b) => b.total - a.total);
    arr.forEach((x, i) => { x.rank = i > 0 && x.total === arr[i - 1].total ? arr[i - 1].rank : i + 1; });
    return arr;
  }

  function teamBoard() {
    const tr = teamRanking(), max = Math.max(1, ...tr.map(x => x.score));
    return `<div class="board">${tr.map((x, i) => `
      <div class="line team-line" style="--tc:${x.t.color};animation-delay:${(i * 0.12).toFixed(2)}s">
        <span class="rank">${medal(x.rank)}</span><span class="nm"><span class="emoji">${x.t.icon}</span> ${esc(x.t.name)}</span>
        <span class="team-avs">${x.t.ids.map(id => avatar(G.players.find(p => p.id === id), 'xs')).join('')}</span>
        <div class="barwrap"><div class="barfill" data-w="${((100 * x.score) / max).toFixed(1)}"></div></div>
        <span class="sc">${x.score}</span>
      </div>`).join('')}</div>
      <p class="sub" style="margin:8px 0 0">Score d’équipe = moyenne des points de ses joueurs</p>`;
  }

  function roundEnd() {
    const c = curCat();
    const ranked = ranking();
    const max = Math.max(1, ...ranked.map(x => x.total));
    const lastRound = G.round + 1 >= G.cats.length;
    const next = !lastRound && Engine.cat(G.cats[G.round + 1]);
    if (G.round === 0 && !lastRound) {
      // Pour le badge « Remontada » : qui est dernier après le premier thème ?
      const worst = Math.max(...ranked.map(x => x.rank));
      if (worst > 1) ranked.forEach(x => { G.res[x.p.id].lastAfterFirst = x.rank === worst; });
    }
    screen('round-screen', `
      <div class="result">
        <div class="theme-banner"><span class="ic emoji">${c.icon}</span>Fin du thème « ${esc(c.name)} »</div>
        <h2 class="title">${lastRound ? 'Dernier thème terminé !' : 'Classement provisoire'}</h2>
        ${G.teams ? teamBoard() + '<h3 class="section-title">Les joueurs</h3>' : ''}
        <div class="board">${ranked.map((x, i) => `
          <div class="line" style="animation-delay:${(i * 0.12).toFixed(2)}s">
            <span class="rank">${medal(x.rank)}</span>${avatar(x.p, 'sm')}<span class="nm">${esc(x.p.name)}${G.teams ? ` <span class="emoji">${teamOf(x.p.id).icon}</span>` : ''}</span>
            <div class="barwrap"><div class="barfill" data-w="${((100 * x.total) / max).toFixed(1)}"></div></div>
            <span class="plus">+${(x.res.perCat[c.id] || { pts: 0 }).pts}</span><span class="sc">${x.total}</span>
          </div>`).join('')}</div>
        ${next ? `<p class="sub" style="margin-top:16px">Prochain thème : <b><span class="emoji">${next.icon}</span> ${esc(next.name)}</b></p>` : ''}
        <button class="btn big primary" data-act="next">${lastRound ? 'Voir les résultats 🏆' : 'Thème suivant ▶'}</button>
      </div>`,
    { next: () => { G.round++; lastRound ? finalScreen() : turnIntro(); } });
    later(() => app.querySelectorAll('.barfill').forEach(b => { b.style.width = b.dataset.w + '%'; }), 80);
    Sound.play('drumroll', 1.1);
    later(() => Sound.play('reveal'), 1100);
  }

  function computeAwards(ranked) {
    if (ranked.length < 2) return [];
    const best = (fn, better) => ranked.filter(x => x.res.answers).reduce((a, b) => (a && !better(fn(b), fn(a)) ? a : b), null);
    const list = [];
    const fast = best(x => x.res.fracSum / x.res.answers, (a, b) => a < b);
    if (fast) list.push({ ic: '⚡', t: 'L’Éclair', who: fast.p, d: 'répond le plus vite' });
    const streak = best(x => x.res.bestStreak, (a, b) => a > b);
    if (streak && streak.res.bestStreak >= 2) list.push({ ic: '🔥', t: 'Série de feu', who: streak.p, d: `${streak.res.bestStreak} bonnes réponses d’affilée` });
    const acc = best(x => x.res.correct / x.res.answers, (a, b) => a > b);
    if (acc && acc.res.correct / acc.res.answers >= 0.5) list.push({ ic: '🎯', t: 'Tireur d’élite', who: acc.p, d: `${pct(acc.res.correct, acc.res.answers)} % de bonnes réponses` });
    const bold = best(x => x.res.levelBonus, (a, b) => a > b);
    if (bold && bold.res.levelBonus > 0) list.push({ ic: '💪', t: 'Audacieux', who: bold.p, d: 'a réussi des questions défi' });
    return list;
  }

  function detailTable(cats, rows) {
    const multi = rows.length > 1;
    return `<div class="table-wrap"><table class="detail">
      <thead><tr><th>Joueur</th>${cats.map(cid => { const c = Engine.cat(cid) || { icon: '❔', name: cid }; return `<th><span class="emoji">${c.icon}</span><br>${esc(c.name)}</th>`; }).join('')}<th>Total</th></tr></thead>
      <tbody>${rows.map(r => `<tr class="${multi && r.rank === 1 ? 'win' : ''}">
        <td class="pl">${multi ? medal(r.rank) + ' ' : ''}<span class="emoji">${esc(r.avatar)}</span> ${esc(r.name)}${r.teamIcon ? ` <span class="emoji">${esc(r.teamIcon)}</span>` : ''}</td>
        ${cats.map(cid => { const v = r.perCat[cid]; return `<td>${v ? `${v.pts}<small>${v.c}/${v.n} ✔</small>` : '–'}</td>`; }).join('')}
        <td class="tot">${r.total}<small>${r.correct}/${r.answers} ✔</small></td></tr>`).join('')}
      </tbody></table></div>`;
  }

  function saveGame(ranked) {
    if (G.saved) return;
    G.saved = true;
    const multi = G.players.length > 1;
    let winners = [], teamResult = null;
    if (G.teams) {
      teamResult = teamRanking();
      const top = teamResult.filter(x => x.rank === 1);
      winners = top.length === 1 ? top[0].t.ids.slice() : []; // égalité : pas de vainqueur
    } else if (multi) {
      winners = ranked.filter(x => x.rank === 1).map(x => x.p.id);
    }
    G.teamResult = teamResult;
    G.newBadges = {}; G.rankUps = {};
    const hour = new Date().getHours();
    G.players.forEach(p => {
      const r = G.res[p.id];
      const won = winners.includes(p.id);
      const st = (p.stats = Object.assign(Store.emptyStats(), p.stats || {}));
      st.games++;
      if (G.teams) { st.teamGames++; if (won) st.teamWins++; }
      else if (won) st.wins++;
      st.answered += r.answers; st.correct += r.correct; st.points += r.total; st.timeSum += r.timeSum;
      st.challengeOk += r.challengeOk; st.photoOk += r.photoOk;
      st.bestScore = Math.max(st.bestScore, r.total);
      st.bestStreak = Math.max(st.bestStreak, r.bestStreak);
      Object.entries(r.perCat).forEach(([cid, v]) => {
        const pc = (st.perCat[cid] = st.perCat[cid] || { c: 0, n: 0, pts: 0 });
        pc.c += v.c; pc.n += v.n; pc.pts += v.pts;
      });
      // Expérience, rang et badges
      const before = Badges.rankOf(st.xp);
      st.xp += Badges.xpFor(r, won);
      const after = Badges.rankOf(st.xp);
      if (after.index > before.index) G.rankUps[p.id] = after;
      const fresh = Badges.evaluate(p, {
        st, r,
        g: { mode: G.mode, nPlayers: G.players.length, nCats: G.cats.length, won: !G.teams && won, teamWon: !!G.teams && won, lastAfterFirst: r.lastAfterFirst, hour, jokers: S.jokers }
      });
      if (fresh.length) G.newBadges[p.id] = fresh;
      if (Store.player(p.id)) Store.savePlayer(p);
    });
    Store.addGame({
      id: G.id, date: G.date, cats: G.cats, perSeries: G.perSeries, winners, mode: G.mode,
      teams: teamResult && teamResult.map(x => ({ name: x.t.name, color: x.t.color, icon: x.t.icon, ids: x.t.ids, score: x.score, rank: x.rank })),
      players: ranked.map(x => ({
        id: x.p.id, name: x.p.name, avatar: x.p.avatar, color: x.p.color, level: Engine.levelOf(x.p),
        rank: x.rank, total: x.total, correct: x.res.correct, answers: x.res.answers, bestStreak: x.res.bestStreak,
        avgTime: x.res.answers ? +(x.res.timeSum / x.res.answers).toFixed(1) : 0, perCat: x.res.perCat,
        teamIcon: G.teams ? teamOf(x.p.id).icon : undefined
      }))
    });
  }

  function badgesSection() {
    const list = G.players.filter(p => G.newBadges[p.id] || G.rankUps[p.id]);
    if (!list.length) return '';
    return `<h3 class="section-title">🏅 Récompenses de la partie</h3>
      <div class="new-badges">${list.map(p => `
        <div class="nb-player">${avatar(p, 'sm')}<b>${esc(p.name)}</b>
          ${G.rankUps[p.id] ? `<span class="rankup">⬆️ Nouveau rang : <span class="emoji">${G.rankUps[p.id].icon}</span> ${esc(G.rankUps[p.id].name)}</span>` : ''}
          ${(G.newBadges[p.id] || []).map(b => `<span class="badge-chip" title="${esc(b.desc)}"><span class="emoji">${Badges.iconOf(b)}</span>${esc(b.name)}</span>`).join('')}
        </div>`).join('')}</div>`;
  }

  function teamFinal() {
    const tr = G.teamResult || teamRanking();
    return `<div class="team-final">${tr.map(x => `
      <div class="tf-card ${x.rank === 1 && tr.filter(y => y.rank === 1).length === 1 ? 'win' : ''}" style="--tc:${x.t.color}">
        ${x.rank === 1 && tr.filter(y => y.rank === 1).length === 1 ? '<div class="crown emoji">👑</div>' : ''}
        <div class="tf-name"><span class="emoji">${x.t.icon}</span> ${esc(x.t.name)}</div>
        <div class="tf-avs">${x.t.ids.map(id => avatar(G.players.find(p => p.id === id), 'sm')).join('')}</div>
        <div class="tf-score">${x.score}</div><small>points en moyenne · ${x.sum} au total</small>
      </div>`).join('<div class="vs">VS</div>')}</div>`;
  }

  function finalScreen() {
    setTint(null); Sound.duck(false);
    const ranked = ranking();
    saveGame(ranked);
    music('menu');
    const multi = ranked.length > 1;
    const top = ranked.filter(x => x.rank === 1);
    let title;
    if (G.teams) {
      const tt = G.teamResult.filter(x => x.rank === 1);
      title = tt.length > 1 ? 'Égalité parfaite entre les équipes !' : `Victoire de l’équipe « ${esc(tt[0].t.name)} » !`;
    } else {
      title = !multi ? `Partie terminée, ${esc(ranked[0].p.name)} !`
        : top.length > 1 ? `Égalité entre ${top.map(x => esc(x.p.name)).join(' et ')} !` : `Victoire de ${esc(top[0].p.name)} !`;
    }
    const podium = multi ? [ranked[1], ranked[0], ranked[2]].map((x, i) => x ? `
      <div class="step p${x.rank > 3 ? 3 : x.rank}" style="order:${i}">
        ${x.rank === 1 ? '<div class="crown emoji">👑</div>' : ''}${avatar(x.p, 'lg')}
        <div class="who">${esc(x.p.name)}</div><div class="pts">${x.total} pts</div>
        <div class="block">${x.rank}</div></div>` : '').join('') : '';
    const awards = computeAwards(ranked);
    const rows = ranked.map(x => ({
      name: x.p.name, avatar: x.p.avatar, rank: x.rank, perCat: x.res.perCat, total: x.total, correct: x.res.correct, answers: x.res.answers,
      teamIcon: G.teams ? teamOf(x.p.id).icon : null
    }));
    const solo = ranked[0];
    const hasRewards = Object.keys(G.newBadges).length || Object.keys(G.rankUps).length;
    screen('final-screen', `
      <div class="result">
        <h2 class="title">🏆 ${title}</h2>
        ${G.teams ? teamFinal() : multi ? `<div class="podium">${podium}</div>` : `${avatar(solo.p, 'xl')}<div class="big-num">${solo.total} pts</div>
          <div class="stat-row"><div class="stat"><b>${solo.res.correct}/${solo.res.answers}</b><small>bonnes réponses</small></div>
          <div class="stat"><b>🔥 ${solo.res.bestStreak}</b><small>meilleure série</small></div></div>`}
        ${awards.length ? `<div class="awards">${awards.map(a => `<div class="award"><div class="ic emoji">${a.ic}</div><b>${a.t}</b>
          <span class="emoji">${esc(a.who.avatar)}</span> ${esc(a.who.name)}<br><small>${esc(a.d)}</small></div>`).join('')}</div>` : ''}
        ${badgesSection()}
        <h3 class="section-title">📋 Détail des scores par thème</h3>
        ${detailTable(G.cats, rows)}
        <div class="center" style="margin-top:20px">
          <button class="btn big primary" data-act="replay">🔁 Rejouer</button>
          <button class="btn big" data-act="home">🏠 Accueil</button>
        </div>
      </div>`,
    {
      replay: () => {
        setup = setup || { mode: 'random', manual: [], themeCount: G.cats.length };
        setup.selected = G.players.map(p => p.id); setup.count = setup.selected.length; setup.perSeries = G.perSeries;
        setup.gameMode = G.mode;
        if (G.teams) setup.teams = G.teams.map(t => ({ name: t.name, ids: t.ids.slice() }));
        setupThemes();
      },
      home
    });
    confetti(4500);
    Sound.play('drumroll', 1.2);
    later(() => { Sound.play('fanfare'); }, 1200);
    later(() => { Sound.play('applause', 2.5); }, 2500);
    if (hasRewards) later(() => Sound.play('badge'), 4200);
  }

  /* ================= Joueurs ================= */
  function playerForm(existing, onSave) {
    const st = existing
      ? { name: existing.name, avatar: existing.avatar, color: existing.color, age: Engine.ageOf(existing) }
      : { name: '', avatar: Engine.rand(AVATARS), color: Engine.rand(COLORS), age: 10 };
    const preview = () => {
      const lv = Engine.LEVELS[Engine.ageLevel(st.age)];
      document.getElementById('pfPrev').innerHTML = avatar(st, 'xl');
      document.getElementById('pfAge').value = st.age;
      document.getElementById('pfLvl').textContent = `→ ${lv.icon} Niveau ${lv.name} (${lv.range})`;
      modalRoot.querySelectorAll('[data-act="av"]').forEach(b => b.classList.toggle('on', b.dataset.v === st.avatar));
      modalRoot.querySelectorAll('[data-act="col"]').forEach(b => b.classList.toggle('on', b.dataset.v === st.color));
    };
    openModal(`<div class="modal">
      <h3>${existing ? '✏️ Modifier le joueur' : '✨ Nouveau joueur'}</h3>
      <div class="preview-head" id="pfPrev"></div>
      <label class="field"><span>Prénom ou pseudo</span><input type="text" id="pfName" maxlength="16" value="${esc(st.name)}" placeholder="Ex. : Léa" autocomplete="off"></label>
      <div class="field"><span>Âge</span>
        <div class="age-row"><button class="btn small" data-act="ageDn">−</button>
          <input type="number" id="pfAge" min="4" max="110" style="width:90px;font-size:1.6rem;text-align:center;border:3px solid #e3ddf5;border-radius:14px;padding:6px">
          <button class="btn small" data-act="agePlus">+</button><button class="btn small" data-act="adult">Adulte</button>
          <span class="lvl-preview" id="pfLvl"></span></div></div>
      <div class="field"><span>Avatar</span><div class="pick-grid">${AVATARS.map(a => `<button class="emoji" data-act="av" data-v="${a}" data-quiet="1">${a}</button>`).join('')}</div></div>
      <div class="field"><span>Couleur</span><div class="colors">${COLORS.map(c => `<button data-act="col" data-v="${c}" data-quiet="1" style="background:${c}"></button>`).join('')}</div></div>
      <div class="actions"><button class="btn ghost" data-act="cancel">Annuler</button><button class="btn green" data-act="save">💾 Enregistrer</button></div>
    </div>`, {
      av: el => { st.avatar = el.dataset.v; Sound.play('pop'); preview(); },
      col: el => { st.color = el.dataset.v; Sound.play('pop'); preview(); },
      ageDn: () => { st.age = Engine.clamp(st.age - 1, 4, 110); preview(); },
      agePlus: () => { st.age = Engine.clamp(st.age + 1, 4, 110); preview(); },
      adult: () => { st.age = Math.max(st.age, 30); preview(); },
      cancel: closeModal,
      save: () => {
        st.name = document.getElementById('pfName').value.trim();
        if (!st.name) { toast('Il faut un prénom !'); document.getElementById('pfName').focus(); return; }
        const age = parseInt(document.getElementById('pfAge').value, 10);
        if (!(age >= 4 && age <= 110)) { toast('Âge entre 4 et 110 ans, s’il te plaît'); return; }
        st.age = age;
        const dup = Store.players().find(x => x.name.toLowerCase() === st.name.toLowerCase() && (!existing || x.id !== existing.id));
        if (dup) { toast('Ce prénom existe déjà'); return; }
        let p;
        if (existing) {
          p = Store.player(existing.id);
          Object.assign(p, { name: st.name, avatar: st.avatar, color: st.color, birthYear: new Date().getFullYear() - st.age });
          Store.savePlayer(p);
        } else {
          p = Store.createPlayer(st);
        }
        closeModal(); Sound.play('turn'); toast(existing ? 'Joueur modifié ✔' : `Bienvenue ${p.name} ! 🎉`);
        onSave && onSave(p);
      }
    });
    const nameIn = document.getElementById('pfName');
    document.getElementById('pfAge').addEventListener('input', e => {
      const v = parseInt(e.target.value, 10);
      if (v >= 4 && v <= 110) { st.age = v; const lv = Engine.LEVELS[Engine.ageLevel(v)]; document.getElementById('pfLvl').textContent = `→ ${lv.icon} Niveau ${lv.name} (${lv.range})`; }
    });
    nameIn.addEventListener('keydown', e => { if (e.key === 'Enter') modalActions.save(); });
    preview();
    setTimeout(() => nameIn.focus(), 50);
  }

  function playersScreen() {
    setTint(null);
    const list = Store.players();
    screen('players-screen', `
      <div class="topbar"><button class="btn round ghost" data-act="back">←</button><h2>👥 Joueurs</h2></div>
      <div class="players-grid">
        ${list.map(p => {
          const st = p.stats || {};
          const rk = Badges.rankOf(st.xp || 0);
          const nb = Object.keys(p.badges || {}).length;
          return `<button class="pcard" data-act="open" data-id="${esc(p.id)}">${avatar(p, 'lg')}<span class="name">${esc(p.name)}</span>
            <span class="meta">${Engine.ageOf(p)} ans · ${plural(st.games || 0, 'partie')} · ${(st.wins || 0) + (st.teamWins || 0)} 🏆</span>
            <span class="meta"><span class="emoji">${rk.icon}</span> ${rk.name} · 🏅 ${nb}</span>${lvlBadge(p)}</button>`;
        }).join('')}
        <button class="pcard add" data-act="create"><span class="plus emoji">➕</span>Nouveau joueur</button>
      </div>
      ${list.length ? '' : '<p class="empty">Crée les joueurs de la famille : ils seront gardés pour toutes les parties, avec leurs statistiques !</p>'}`,
    { back: home, open: el => profile(el.dataset.id), create: () => playerForm(null, () => playersScreen()) });
  }

  function sparkline(values) {
    const w = 600, h = 110, pad = 12;
    const max = Math.max(...values), min = Math.min(...values, 0);
    const x = i => pad + (i * (w - 2 * pad)) / Math.max(1, values.length - 1);
    const y = v => h - pad - ((v - min) * (h - 2 * pad)) / Math.max(1, max - min);
    const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <defs><linearGradient id="sg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#7c4dff" stop-opacity=".35"/><stop offset="1" stop-color="#7c4dff" stop-opacity="0"/></linearGradient></defs>
      <polygon points="${x(0)},${h - pad} ${pts} ${x(values.length - 1)},${h - pad}" fill="url(#sg)"/>
      <polyline points="${pts}" fill="none" stroke="#7c4dff" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
    </svg>`;
  }

  const teamWinner = g => (g.teams && g.teams.filter(t => t.rank === 1).length === 1 ? g.teams.find(t => t.rank === 1) : null);
  const histItem = g => `<button class="hist" data-act="game" data-id="${esc(g.id)}">
    <span class="date">${fmtDate(g.date)}</span>
    <span class="cats emoji">${g.cats.map(c => (Engine.cat(c) || {}).icon || '').join(' ')}</span>
    <span class="who">${g.mode === 'teams' && g.teams
      ? g.teams.map(t => `<span>${teamWinner(g) === t ? '👑' : ''}<span class="emoji">${esc(t.icon || '')}</span>${esc(t.name)} <small>${t.score}</small></span>`).join('<span>vs</span>')
      : g.players.map(x => `<span>${x.rank === 1 && g.players.length > 1 ? '👑' : ''}<span class="emoji">${esc(x.avatar)}</span>${esc(x.name)} <small>${x.total}</small></span>`).join('')}</span>
  </button>`;

  function profile(id) {
    const p = Store.player(id);
    if (!p) return playersScreen();
    const st = Object.assign(Store.emptyStats(), p.stats || {});
    const L = Engine.levelOf(p), lv = Engine.LEVELS[L];
    const games = Store.history().filter(g => g.players.some(x => x.id === id));
    const scores = games.slice(0, 20).reverse().map(g => g.players.find(x => x.id === id).total);
    const tile = (v, l) => `<div class="tile"><b>${v}</b><small>${l}</small></div>`;
    const rk = Badges.rankOf(st.xp);
    const got = p.badges || {};
    const nb = Badges.LIST.filter(b => got[b.id]).length;
    // Badges obtenus d'abord (les plus récents en tête), puis ceux à débloquer.
    const sortedBadges = Badges.LIST.slice().sort((a, b) => (got[b.id] || 0) - (got[a.id] || 0));
    screen('profile-screen', `
      <div class="topbar"><button class="btn round ghost" data-act="back">←</button><h2>Profil</h2></div>
      <div class="profile-head">${avatar(p, 'xl')}
        <div><h2>${esc(p.name)}</h2>
          <div class="row" style="margin-top:6px"><span>${Engine.ageOf(p)} ans</span><span class="lvl-badge">${lv.icon} ${lv.name} (${lv.range})</span></div>
          <div class="row" style="margin-top:12px"><button class="btn small" data-act="edit">✏️ Modifier</button><button class="btn small danger" data-act="del">🗑️ Supprimer</button></div>
        </div></div>
      <div class="rank-card">
        <span class="rank-ic emoji">${rk.icon}</span>
        <div class="rank-info"><b>${rk.name}</b>
          <small>${st.xp} XP${rk.next ? ` · encore ${rk.next.xp - st.xp} XP pour devenir <span class="emoji">${rk.next.icon}</span> ${rk.next.name}` : ' · rang maximum atteint !'}</small>
          <div class="xpbar"><i style="width:${Math.round(rk.progress * 100)}%"></i></div></div>
      </div>
      <div class="tiles">
        ${tile(st.games, 'parties jouées')}${tile(st.wins + ' 🏆', 'victoires')}${tile(st.teamWins + ' 🤝', 'victoires en équipe')}
        ${tile(pct(st.correct, st.answered) + ' %', 'bonnes réponses')}${tile(st.bestScore, 'meilleur score')}${tile('🔥 ' + st.bestStreak, 'meilleure série')}
      </div>
      <h3 class="section-title">🏅 Badges — ${nb}/${Badges.LIST.length}</h3>
      <div class="badges-grid">${sortedBadges.map(b => {
        const t = got[b.id];
        return `<div class="badge ${t ? 'got' : 'locked'}"><span class="bi emoji">${Badges.iconOf(b)}</span><b>${esc(b.name)}</b>
          <small>${esc(b.desc)}</small>${t ? `<small class="date">${new Date(t).toLocaleDateString('fr-FR')}</small>` : ''}</div>`;
      }).join('')}</div>
      ${scores.length >= 2 ? `<h3 class="section-title">📈 Évolution des scores</h3><div class="card">${sparkline(scores)}</div>` : ''}
      <h3 class="section-title">🎯 Réussite par thème</h3>
      <div class="catstats">${Engine.cats.map(c => {
        const v = st.perCat[c.id];
        const sk = Engine.skill(p, c.id);
        const trend = sk > L + 0.25 ? '🔼 questions plus difficiles' : sk < L - 0.25 ? '🔽 questions plus faciles' : '';
        return `<div class="catstat" style="${catVars(c)}"><span class="ic emoji">${c.icon}</span>
          <span><span class="nm">${esc(c.name)}</span><br><span class="trend">${trend}</span></span>
          <div class="bar"><i style="width:${v ? pct(v.c, v.n) : 0}%"></i></div>
          <span class="val">${v && v.n ? `${pct(v.c, v.n)} % · ${v.n} q.` : '<span class="trend">pas encore joué</span>'}</span></div>`;
      }).join('')}</div>
      <h3 class="section-title">📜 Dernières parties</h3>
      ${games.length ? `<div class="hist-list">${games.slice(0, 8).map(histItem).join('')}</div>` : '<p class="empty">Aucune partie pour l’instant.</p>'}`,
    {
      back: playersScreen,
      edit: () => playerForm(p, () => profile(id)),
      del: () => confirmBox(`Supprimer ${p.name} et toutes ses statistiques ? (L’historique des parties est conservé.)`, () => { Store.deletePlayer(id); toast('Joueur supprimé'); playersScreen(); }, null, 'Supprimer'),
      game: el => gameDetail(el.dataset.id, () => profile(id))
    });
  }

  /* ================= Historique ================= */
  function historyScreen() {
    setTint(null);
    const list = Store.history();
    screen('history-screen', `
      <div class="topbar"><button class="btn round ghost" data-act="back">←</button><h2>📜 Historique des parties</h2></div>
      ${list.length ? `<div class="hist-list">${list.map(histItem).join('')}</div>` : '<p class="empty">Aucune partie terminée pour le moment. À vous de jouer ! 🎮</p>'}`,
    { back: home, game: el => gameDetail(el.dataset.id, historyScreen) });
  }

  function gameDetail(id, back) {
    const g = Store.history().find(x => x.id === id);
    if (!g) return back();
    const multi = g.players.length > 1;
    const tw = teamWinner(g);
    const winnerTxt = g.mode === 'teams' && g.teams
      ? (tw ? ` · victoire de l’équipe ${esc(tw.name)} 🏆` : ' · égalité entre les équipes')
      : multi ? ` · vainqueur : ${g.players.filter(x => x.rank === 1).map(x => esc(x.name)).join(' & ')} 🏆` : '';
    screen('history-screen', `
      <div class="topbar"><button class="btn round ghost" data-act="back">←</button><h2>Partie du ${fmtDate(g.date)}</h2></div>
      <p class="sub">${plural(g.cats.length, 'thème')} · ${g.perSeries} questions par série${winnerTxt}</p>
      ${g.mode === 'teams' && g.teams ? `<div class="mini-board" style="margin-bottom:16px">${g.teams.map(t => `<span class="it team" style="--tc:${/^#[0-9a-f]{3,8}$/i.test(t.color) ? t.color : '#888'}">
        <span class="emoji">${esc(t.icon || '')}</span>${esc(t.name)} · ${t.score} pts</span>`).join('')}</div>` : ''}
      ${detailTable(g.cats, g.players)}`,
    { back });
  }

  /* ================= Réglages ================= */
  function settingsScreen(anim = true) {
    setTint(null);
    const sw = (key, on) => `<button class="switch ${on ? 'on' : ''}" data-act="toggle" data-k="${key}" aria-label="${key}"></button>`;
    const seg = (key, values, labels) => `<div class="seg">${values.map((v, i) => `<button class="${S[key] === v ? 'on' : ''}" data-act="set" data-k="${key}" data-v="${v}">${labels ? labels[i] : v}</button>`).join('')}</div>`;
    const row = (ic, title, desc, ctrl) => `<div class="set"><span class="emoji" style="font-size:1.8rem">${ic}</span><div class="txt"><b>${title}</b><small>${desc}</small></div>${ctrl}</div>`;
    screen('settings-screen', `
      <div class="topbar"><button class="btn round ghost" data-act="back">←</button><h2>⚙️ Réglages</h2></div>
      <div class="settings">
        ${row('🎵', 'Musique', 'Ambiance musicale entraînante', `<input type="range" min="0" max="1" step="0.05" value="${S.musicVol}" data-k="musicVol">${sw('music', S.music)}`)}
        ${row('🔊', 'Bruitages', 'Tic-tac, bonnes et mauvaises réponses…', `<input type="range" min="0" max="1" step="0.05" value="${S.sfxVol}" data-k="sfxVol">${sw('sfx', S.sfx)}`)}
        ${row('⏱️', 'Temps par question', 'Durée du compte à rebours', seg('time', [8, 10, 12, 15, 20], ['8 s', '10 s', '12 s', '15 s', '20 s']))}
        ${row('🐣', 'Temps bonus pour les plus jeunes', '+5 s pour les 7-9 ans, +3 s pour les 10-12 ans (le temps de lire)', sw('youngBonus', S.youngBonus))}
        ${row('❓', 'Questions par série', 'Nombre de questions par thème et par joueur', seg('perSeries', [5, 8, 10]))}
        ${row('🎭', 'Joker 50/50', 'Un joker par série : retire des mauvaises réponses', sw('jokers', S.jokers))}
        ${HAS_TTS ? row('🗣️', 'Lecture à voix haute', 'La question et les réponses sont lues, le chrono démarre ensuite', seg('tts', ['off', 'young', 'all'], ['Non', '7-9 ans', 'Tous'])) : ''}
        ${row('⏭️', 'Passage automatique', 'Passe à la question suivante après l’anecdote', sw('autoNext', S.autoNext))}
        ${row('💾', 'Sauvegarde des joueurs', 'Exporte / importe joueurs, stats et historique (fichier .json)',
          `<button class="btn small" data-act="export">⬇️ Exporter</button><button class="btn small" data-act="import">⬆️ Importer</button><input type="file" id="importFile" accept=".json,application/json" class="hidden">`)}
        ${row('🧹', 'Effacer l’historique', 'Les joueurs et leurs statistiques sont conservés', '<button class="btn small danger" data-act="clearHist">Effacer</button>')}
        ${row('♻️', 'Tout réinitialiser', 'Supprime joueurs, statistiques, historique et réglages', '<button class="btn small danger" data-act="reset">Réinitialiser</button>')}
      </div>`,
    {
      back: home,
      toggle: el => {
        const k = el.dataset.k; S[k] = !S[k]; Store.saveSettings(S); Sound.configure(S);
        if (k === 'music') { if (S.music) { unlock(); Sound.playMusic(wantMusic || 'menu'); } else Sound.stopMusic(); }
        refreshSoundBar(); settingsScreen(false);
      },
      set: el => {
        const k = el.dataset.k, raw = el.dataset.v;
        S[k] = /^\d+$/.test(raw) ? +raw : raw; Store.saveSettings(S);
        if (k === 'tts' && raw !== 'off') Sound.speak('Bonjour ! Je lirai les questions à voix haute.');
        settingsScreen(false);
      },
      export: () => {
        const blob = new Blob([JSON.stringify(Store.exportAll(), null, 1)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `familiquiz-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        toast('Sauvegarde exportée ✔');
      },
      import: () => document.getElementById('importFile').click(),
      clearHist: () => confirmBox('Effacer tout l’historique des parties ?', () => { Store.clearHistory(); toast('Historique effacé'); }, null, 'Effacer'),
      reset: () => confirmBox('Tout supprimer (joueurs, statistiques, historique, réglages) ?', () => {
        Store.resetAll(); S = Store.settings(); Sound.configure(S); refreshSoundBar(); toast('Tout a été réinitialisé'); home();
      }, null, 'Tout supprimer')
    }, null, { anim });

    app.querySelectorAll('input[type=range]').forEach(r => {
      r.addEventListener('input', () => { S[r.dataset.k] = +r.value; Sound.configure(S); });
      r.addEventListener('change', () => { Store.saveSettings(S); Sound.play('pop'); });
    });
    document.getElementById('importFile').addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          confirmBox('Remplacer les données actuelles par celles du fichier ?', () => {
            try {
              Store.importAll(data); S = Store.settings(); Sound.configure(S); refreshSoundBar();
              toast('Sauvegarde importée ✔'); settingsScreen(false);
            } catch (err) { toast('Import impossible : ' + err.message); }
          }, null, 'Importer');
        } catch (err) { toast('Fichier illisible'); }
      };
      reader.readAsText(file);
    });
  }

  /* ================= Règles ================= */
  function rulesScreen() {
    screen('rules-screen', `
      <div class="topbar"><button class="btn round ghost" data-act="back">←</button><h2>❓ Comment jouer</h2></div>
      <div class="rules">
        <div class="card"><h3>👨‍👩‍👧‍👦 Le principe</h3><p>De 1 à 6 joueurs jouent <b>chacun leur tour</b> sur le même écran. Pour chaque thème, chaque joueur répond à sa <b>série de questions</b> (5, 8 ou 10). Le joueur qui a le plus de points à la fin gagne !</p></div>
        <div class="card"><h3>🎂 Des questions adaptées à chaque âge</h3>
          <p>Chaque joueur reçoit des questions de son niveau :</p>
          <ul>${[1, 2, 3, 4].map(l => `<li>${Engine.LEVELS[l].icon} <b>${Engine.LEVELS[l].name}</b> — ${Engine.LEVELS[l].range}</li>`).join('')}</ul>
          <p>Le jeu s’adapte aussi au fil des parties : si un joueur réussit très bien un thème, il reçoit des questions un peu plus difficiles (qui rapportent un bonus <b>💪 Défi</b>) ; s’il a du mal, des questions un peu plus faciles. Ainsi, un enfant de 8 ans peut battre un adulte !</p></div>
        <div class="card"><h3>⭐ Les points</h3><ul>
          <li>Bonne réponse : <b>100 points</b></li>
          <li>⚡ Rapidité : jusqu’à <b>+50</b> selon le temps restant</li>
          <li>🔥 Série : <b>+10</b> par bonne réponse d’affilée (max +50)</li>
          <li>💪 Question défi (au-dessus de son âge) : <b>+25</b> par niveau</li>
          <li>Mauvaise réponse ou temps écoulé : 0 point (rien n’est retiré)</li></ul></div>
        <div class="card"><h3>🎭 Joker et astuces</h3><ul>
          <li>Le <b>joker 50/50</b> (une fois par série) enlève des mauvaises réponses.</li>
          <li>Au clavier : touches <b>1 2 3 4</b> ou <b>A B C D</b> pour répondre, <b>Entrée</b> pour continuer, <b>P</b> pour la pause.</li>
          <li>📺 À la télécommande de TV : <b>flèches</b> pour choisir, <b>OK</b> pour valider, <b>Retour</b> pour revenir en arrière (ou mettre en pause pendant une question).</li>
          <li>Les questions déjà vues par la famille sont évitées le plus longtemps possible.</li>
          <li>Les plus jeunes ont du temps bonus pour lire, et les questions sont lues à voix haute pour les 7-9 ans (réglable).</li>
          <li>Questions photo : touche l’image pour l’agrandir.</li></ul></div>
        <div class="card"><h3>🤝 Le mode équipes</h3>
          <p>Choisis « En équipes » après avoir sélectionné les joueurs : le jeu propose <b>Parents contre Enfants</b> (ou deux équipes équilibrées). Touche un joueur pour le changer d’équipe et renomme les équipes comme tu veux.</p>
          <p>Les joueurs des deux équipes passent en alternance. Le <b>score d’une équipe est la moyenne</b> des points de ses joueurs : une équipe de 2 peut battre une équipe de 3.</p></div>
        <div class="card"><h3>🏅 Badges et rangs</h3>
          <p>Chaque partie rapporte de l’<b>expérience (XP)</b> : on passe de ${Badges.RANKS[0].icon} ${Badges.RANKS[0].name} à ${Badges.RANKS[Badges.RANKS.length - 1].icon} ${Badges.RANKS[Badges.RANKS.length - 1].name}.</p>
          <p>${Badges.LIST.length} <b>badges</b> sont à collectionner (séries, victoires, expert de chaque thème, réflexes…). Retrouve ta collection dans ton profil.</p></div>
        ${Engine.photos.length ? `<div class="center"><button class="btn" data-act="credits">📷 Crédits des photos</button></div>` : ''}
      </div>`,
    { back: home, credits: creditsScreen });
  }

  function creditsScreen() {
    const byCat = Engine.cats.map(c => ({ c, list: Engine.photos.filter(q => q.cat === c.id) })).filter(x => x.list.length);
    screen('rules-screen', `
      <div class="topbar"><button class="btn round ghost" data-act="back">←</button><h2>📷 Crédits des photos</h2></div>
      <p class="sub">Toutes les photos viennent de Wikimedia Commons, sous licence libre. Merci à leurs auteurs !</p>
      <div class="rules">${byCat.map(({ c, list }) => `
        <div class="card"><h3><span class="emoji">${c.icon}</span> ${esc(c.name)}</h3>
          <div class="credits">${list.map(q => `<a class="credit" href="${esc(q.src)}" target="_blank" rel="noopener noreferrer">
            <img src="${esc(q.img)}" alt="" loading="lazy"><span>${esc(q.cr)}</span></a>`).join('')}</div></div>`).join('')}</div>`,
    { back: rulesScreen });
  }

  /* ================= Application installable (iPad, tablette) ================= */
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname))) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  home();
})();
