/* Famili'Quiz — page manette du téléphone.
 * Se connecte au jeu (code dans l'adresse : manette.html#ABCD2345) via PeerJS, puis échange directement
 * avec lui (WebRTC chiffré). Le téléphone n'envoie que des commandes ; tout ce qu'il affiche vient du jeu
 * et est inséré comme du texte (jamais comme du HTML).
 */
(() => {
  const view = document.getElementById('view');
  const statusEl = document.getElementById('status');
  const meBtn = document.getElementById('meBtn');
  const CODE_RE = /^[A-HJ-NP-Z2-9]{8}$/;
  const LETTERS = ['A', 'B', 'C', 'D'];

  let code = (location.hash.slice(1) || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  let peer = null, conn = null, retry = null, ended = false;
  let players = [], state = null, picked = false, me = null, chooseNotice = '';
  let tick = null, tLeft = 0, tTotal = 0, tAt = 0, tRunning = false;

  /* ---------- Outils ---------- */
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  function button(label, cls, onTap) {
    const b = el('button', 'btn ' + (cls || ''), label);
    b.type = 'button';
    b.addEventListener('click', () => { buzz(15); onTap(b); });
    return b;
  }
  const buzz = ms => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* pas de vibreur */ } };
  function setStatus(text, kind) { statusEl.textContent = text; statusEl.className = 'status ' + (kind || ''); }
  function send(msg) { try { if (conn && conn.open) conn.send(msg); } catch (e) { /* connexion perdue */ } }
  const remember = id => { try { sessionStorage.setItem('fq_manette_' + code, id || '-'); } catch (e) { /* navigation privée */ } };
  const recall = () => { try { return sessionStorage.getItem('fq_manette_' + code); } catch (e) { return null; } };

  // Écran toujours allumé pendant la partie (iOS 16.4+, Android).
  let wake = null;
  async function keepAwake() {
    try { if ('wakeLock' in navigator && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch (e) { /* refusé */ }
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) keepAwake(); });
  document.addEventListener('click', keepAwake, { once: true });

  /* ---------- Connexion ---------- */
  function connect() {
    clearTimeout(retry);
    if (!CODE_RE.test(code)) { renderJoin(); return; }
    history.replaceState(null, '', '#' + code);
    setStatus('Connexion…', 'warn');
    if (!peer || peer.destroyed) {
      peer = new Peer({ debug: 0 });
      peer.on('error', err => {
        if (err.type === 'peer-unavailable') { setStatus('Jeu introuvable', 'err'); renderNotFound(); return; }
        lost();
      });
      peer.on('disconnected', () => { if (!peer.destroyed) peer.reconnect(); });
    }
    const go = () => {
      conn = peer.connect('familiquiz-' + code.toLowerCase(), { reliable: true, serialization: 'json' });
      conn.on('open', () => {
        setStatus('Connecté', 'ok');
        send({ t: 'hello' });
        const prev = recall();
        if (prev) { picked = true; send({ t: 'pick', player: prev === '-' ? null : prev }); }
      });
      conn.on('data', onMessage);
      conn.on('close', lost);
      conn.on('error', lost);
    };
    if (peer.open) go(); else peer.once('open', go);
  }
  function lost() {
    if (ended) return;
    setStatus('Reconnexion…', 'warn');
    clearTimeout(retry);
    retry = setTimeout(connect, 3000);
  }

  function onMessage(m) {
    if (!m || typeof m !== 'object') return;
    if (m.t === 'welcome') {
      players = Array.isArray(m.players) ? m.players.filter(p => p && typeof p.id === 'string').slice(0, 30) : [];
      if (!picked) renderChoose(chooseNotice);
    } else if (m.t === 'state') {
      const turnStarts = m.view === 'turn' && (!state || state.view !== 'turn');
      state = m; me = typeof m.me === 'string' ? m.me : null;
      updateMe();
      if (picked) render();
      if (turnStarts) buzz([80, 60, 80]);
    } else if (m.t === 'taken') { // un autre téléphone a choisi notre joueur
      const p = players.find(x => x.id === m.player);
      picked = false; remember(null); buzz([60, 40, 60]);
      renderChoose(`${p ? p.name : 'Ce joueur'} joue maintenant sur un autre téléphone.`);
    } else if (m.t === 'bye') {
      ended = true; clearTimeout(retry);
      setStatus('Déconnecté', 'err');
      view.replaceChildren(el('div', 'panel center', 'Le jeu a déconnecté ce téléphone.'), button('Se reconnecter', 'primary', () => { ended = false; connect(); }));
    }
  }

  /* ---------- Écrans ---------- */
  function updateMe() {
    const p = players.find(x => x.id === me);
    meBtn.classList.toggle('hidden', !picked);
    meBtn.textContent = p ? `${p.avatar} ${p.name}` : '🎮 Télécommande';
  }
  meBtn.addEventListener('click', () => { picked = false; renderChoose(); send({ t: 'hello' }); }); // hello : liste à jour

  function renderJoin() {
    setStatus('Pas connecté', '');
    const box = el('div', 'panel');
    box.append(el('h2', '', 'Rejoindre la partie'), el('p', 'muted', 'Scanne le QR code affiché sur la télé, ou tape le code :'));
    const input = el('input', 'code-input');
    input.maxLength = 9; input.placeholder = 'ABCD-2345'; input.autocapitalize = 'characters'; input.autocomplete = 'off'; input.spellcheck = false;
    const go = () => { code = input.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); if (CODE_RE.test(code)) connect(); else input.classList.add('bad'); };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    box.append(input, button('Rejoindre ▶', 'primary', go));
    view.replaceChildren(box);
  }
  function renderNotFound() {
    const box = el('div', 'panel center');
    box.append(el('h2', '', 'Jeu introuvable'), el('p', 'muted', 'Vérifie que l’écran « Téléphones-manettes » est ouvert sur le jeu, et que le code est le bon.'));
    view.replaceChildren(box, button('Réessayer', 'primary', connect), button('Changer de code', '', () => { code = ''; renderJoin(); }));
  }
  function renderChoose(notice) {
    chooseNotice = notice || '';
    const box = el('div', 'panel');
    if (notice) box.append(el('p', 'notice', notice));
    box.append(el('h2', '', 'Qui es-tu ?'));
    const grid = el('div', 'players');
    players.forEach(p => {
      const b = button('', 'player', () => { picked = true; remember(p.id); send({ t: 'pick', player: p.id }); });
      const av = el('span', 'avatar', p.avatar); av.style.setProperty('--pc', /^#[0-9a-f]{3,8}$/i.test(p.color) ? p.color : '#8b5cf6');
      b.append(av, el('span', 'name', p.name));
      if (p.taken === true) b.append(el('span', 'taken', '📱 déjà connecté'));
      grid.append(b);
    });
    box.append(grid, el('p', 'muted', 'Ou utilise ce téléphone comme simple télécommande :'),
      button('🎮 Juste télécommande', '', () => { picked = true; remember(null); send({ t: 'pick', player: null }); }));
    if (!players.length) box.append(el('p', 'muted', 'Aucun joueur pour l’instant : crée les joueurs sur le jeu.'));
    view.replaceChildren(box);
    meBtn.classList.add('hidden');
  }

  function pad(withPause) {
    const wrap = el('div', 'pad');
    const key = (k, label, cls) => button(label, 'key ' + (cls || ''), () => send({ t: 'nav', key: k }));
    wrap.append(el('span'), key('ArrowUp', '▲', 'up'), el('span'),
      key('ArrowLeft', '◀', 'left'), key('Enter', 'OK', 'ok'), key('ArrowRight', '▶', 'right'),
      el('span'), key('ArrowDown', '▼', 'down'), el('span'));
    const row = el('div', 'row');
    row.append(key('Escape', '↩ Retour', 'back'));
    if (withPause) row.append(button('⏸ Pause', 'key', () => send({ t: 'pause' })));
    const box = el('div', 'panel');
    box.append(wrap, row);
    return box;
  }

  function stopTick() { clearInterval(tick); tick = null; }
  function render() {
    stopTick();
    const s = state || { view: 'menu' };
    switch (s.view) {
      case 'turn': {
        const box = el('div', 'panel center');
        box.append(el('div', 'big', s.avatar || '🎉'), el('h2', '', `C’est ton tour, ${s.who || ''} !`), el('p', 'muted', `Thème : ${s.theme || ''}`));
        view.replaceChildren(box, button('Je suis prêt ! ▶', 'primary huge', () => send({ t: 'ready' })));
        break;
      }
      case 'question': renderQuestion(s); break;
      case 'feedback': {
        const box = el('div', 'panel center ' + (s.ok ? 'ok' : 'ko'));
        box.append(el('div', 'big', s.ok ? '✅' : s.timeout ? '⏰' : '❌'),
          el('h2', '', s.ok ? `Bravo ! +${s.points} pts` : s.timeout ? 'Temps écoulé !' : 'Raté !'));
        if (!s.ok && s.good) box.append(el('p', '', `La bonne réponse : ${s.good}`));
        view.replaceChildren(box, button(s.last ? 'Fin de la série 🏁' : 'Question suivante ▶', 'primary huge', () => send({ t: 'next' })));
        break;
      }
      case 'series': {
        const box = el('div', 'panel center');
        box.append(el('div', 'big', '🏁'), el('h2', '', `Série terminée : ${s.c}/${s.n}`), el('p', '', `+${s.points} points`));
        view.replaceChildren(box, button('Continuer ▶', 'primary huge', () => send({ t: 'next' })));
        break;
      }
      case 'round': case 'final': {
        const box = el('div', 'panel');
        box.append(el('h2', '', s.view === 'final' ? '🏆 Résultats' : '📊 Classement'));
        const list = el('ol', 'ranking');
        (Array.isArray(s.ranking) ? s.ranking : []).slice(0, 8).forEach(r => {
          const li = el('li', '', `${r.avatar || ''} ${r.name || ''}`); li.append(el('b', '', String(r.total || 0))); list.append(li);
        });
        box.append(list);
        if (s.view === 'final') { // fin de partie : on choisit sur la télé (Rejouer, Accueil…) avec les flèches
          box.append(el('p', 'muted', 'Choisis la suite sur la télé avec les flèches, puis OK.'));
          view.replaceChildren(box, pad(false));
        } else view.replaceChildren(box, button('Continuer ▶', 'primary', () => send({ t: 'next' })), pad(false));
        break;
      }
      case 'watch': {
        const box = el('div', 'panel center');
        const phase = { turn: 'se prépare', question: 'réfléchit…', feedback: 'découvre la réponse', series: 'termine sa série' }[s.phase] || 'joue';
        box.append(el('div', 'big', s.avatar || '📺'), el('h2', '', `Au tour de ${s.who || '…'}`), el('p', 'muted', `${s.who || ''} ${phase} — regarde la télé 📺`));
        view.replaceChildren(box);
        break;
      }
      default: { // menus : télécommande
        const box = el('div', 'panel center');
        box.append(el('p', 'muted', 'Utilise les flèches pour choisir sur la télé, puis OK.'));
        view.replaceChildren(box, pad(false));
      }
    }
  }

  function renderQuestion(s) {
    if (s.paused) { // comme sur la télé : la question est cachée pendant la pause
      const box = el('div', 'panel center');
      box.append(el('div', 'big', '⏸'), el('h2', '', 'Pause'), el('p', 'muted', 'La question est cachée pendant la pause.'));
      view.replaceChildren(box, button('▶ Reprendre', 'primary huge', () => send({ t: 'pause' })));
      return;
    }
    const box = el('div', 'panel');
    box.append(el('div', 'qhead', `Question ${s.index || ''}/${s.count || ''}`));
    box.append(el('div', 'qtext', s.q || ''));
    if (s.photo) box.append(el('p', 'muted', '📷 Regarde bien la photo sur la télé !'));
    const bar = el('div', 'tbar'), fill = el('i'); bar.append(fill);
    const num = el('span', 'tnum', '');
    const timer = el('div', 'timer'); timer.append(bar, num);
    box.append(timer);
    const answers = el('div', 'answers');
    const removed = Array.isArray(s.removed) ? s.removed : [];
    (Array.isArray(s.answers) ? s.answers : []).slice(0, 4).forEach((a, i) => {
      const b = button('', 'ans a' + i, () => { answers.querySelectorAll('button').forEach(x => { x.disabled = true; }); b.classList.add('chosen'); send({ t: 'answer', i }); });
      b.append(el('span', 'key', LETTERS[i]), el('span', 'txt', a));
      if (removed.includes(i)) { b.disabled = true; b.classList.add('removed'); }
      answers.append(b);
    });
    box.append(answers);
    const tools = el('div', 'row');
    if (s.joker) tools.append(button('🎭 Joker 50/50', 'key', b => { b.disabled = true; send({ t: 'joker' }); }));
    tools.append(button('⏸ Pause', 'key', () => send({ t: 'pause' })));
    view.replaceChildren(box, tools);
    // Compte à rebours local, recalé à chaque message du jeu.
    tLeft = Number(s.left) || 0; tTotal = Number(s.total) || 10; tAt = performance.now(); tRunning = !!s.running;
    const draw = () => {
      const left = tRunning ? Math.max(0, tLeft - (performance.now() - tAt) / 1000) : tLeft;
      fill.style.width = (100 * left / tTotal).toFixed(1) + '%';
      fill.className = left <= 3 ? 'danger' : left <= tTotal / 2 ? 'warn' : '';
      num.textContent = tRunning ? Math.ceil(left) + ' s' : '🔊';
    };
    draw();
    tick = setInterval(draw, 100);
  }

  // Nouveau QR code scanné alors que la page est déjà ouverte : on repart de zéro avec le nouveau code.
  window.addEventListener('hashchange', () => {
    const c = (location.hash.slice(1) || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (c && c !== code) location.reload();
  });

  connect();
})();
