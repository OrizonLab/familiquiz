/* Famili'Quiz — téléphones-manettes (côté jeu / « hôte »).
 *
 * Le jeu (iPad, TV, ordinateur) ouvre une session PeerJS avec un code aléatoire ; les téléphones la rejoignent
 * en scannant le QR code (page manette.html). Le service gratuit PeerJS (0.peerjs.com) ne sert qu'à la mise
 * en relation ; ensuite les appareils échangent directement par WebRTC, chiffré de bout en bout (DTLS).
 *
 * Sécurité : les messages reçus des téléphones sont traités comme non fiables (vérification du format,
 * limite de débit, joueur vérifié) ; ils ne contiennent que des commandes, jamais de texte affiché tel quel.
 * Un téléphone ne peut répondre qu'à SES questions (ou à celles d'un joueur sans téléphone s'il est
 * « télécommande »). Le code de session change à chaque ouverture et l'hôte peut déconnecter un téléphone.
 */
const Remote = (() => {
  const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sans caractères ambigus (0/O, 1/I/L)
  const MAX_PHONES = 8;
  const CMDS = ['hello', 'pick', 'nav', 'ready', 'answer', 'joker', 'next', 'pause'];
  const NAV_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Escape'];

  let peer = null, code = '', status = 'off', error = '';
  const phones = new Map(); // id de connexion → { conn, n, player, role, hits, since }
  let phoneNo = 0, lastState = { view: 'menu' };
  let commandHandler = null, changeHandler = null;

  const newCode = () => {
    const a = new Uint32Array(8); crypto.getRandomValues(a);
    return [...a].map(x => ALPHA[x % ALPHA.length]).join('');
  };
  const peerIdOf = c => 'familiquiz-' + c.toLowerCase();
  const prettyCode = () => code.slice(0, 4) + '-' + code.slice(4);
  const joinUrl = () => new URL('manette.html#' + code, location.href).href;
  const changed = () => { if (changeHandler) changeHandler(); };

  // Liste des joueurs pour un téléphone, en signalant ceux déjà tenus par un autre téléphone.
  function players(ph) {
    const held = new Set([...phones.values()].filter(x => x !== ph && x.player).map(x => x.player));
    return Store.players().map(p => ({ id: p.id, name: p.name, avatar: p.avatar, color: p.color, taken: held.has(p.id) }));
  }
  function send(ph, msg) { try { if (ph.conn.open) ph.conn.send(msg); } catch (e) { /* téléphone parti */ } }

  // Un téléphone peut agir pour ce joueur : c'est son profil, ou il est « télécommande » et ce joueur n'a pas de téléphone.
  function canAct(ph, playerId) {
    if (!playerId) return true;
    if (ph.player === playerId) return true;
    return ph.role === 'remote' && ![...phones.values()].some(x => x.player === playerId);
  }
  // Ce que voit chaque téléphone : la vue complète s'il peut agir, sinon « regarde la télé ».
  function viewFor(ph, st) {
    const base = { me: ph.player || null, role: ph.role };
    if (['turn', 'question', 'feedback', 'series'].includes(st.view) && st.player && !canAct(ph, st.player)) {
      return Object.assign(base, { view: 'watch', who: st.who, avatar: st.avatar, phase: st.view });
    }
    return Object.assign(base, st);
  }
  function broadcast(st) {
    lastState = st || lastState;
    phones.forEach(ph => send(ph, Object.assign({ t: 'state' }, viewFor(ph, lastState))));
  }

  function onData(ph, msg) {
    // Limite de débit : 25 messages par seconde et par téléphone au maximum.
    const now = Date.now();
    if (now - ph.since > 1000) { ph.since = now; ph.hits = 0; }
    if (++ph.hits > 25) return;
    if (!msg || typeof msg !== 'object' || !CMDS.includes(msg.t)) return;
    switch (msg.t) {
      case 'hello':
        ph.picked = false; // le téléphone (re)choisit son joueur
        send(ph, { t: 'welcome', players: players(ph), n: ph.n });
        send(ph, Object.assign({ t: 'state' }, viewFor(ph, lastState)));
        break;
      case 'pick': {
        const id = typeof msg.player === 'string' ? msg.player : null;
        if (id && !Store.player(id)) return;
        // Un joueur = un téléphone : le dernier qui le choisit le garde (utile si l'ancien a perdu la connexion),
        // l'autre redevient télécommande et en est averti.
        if (id) phones.forEach(x => {
          if (x !== ph && x.player === id) { x.player = null; x.role = 'remote'; x.picked = false; send(x, { t: 'taken', player: id }); send(x, Object.assign({ t: 'state' }, viewFor(x, lastState))); }
        });
        ph.player = id; ph.role = id ? 'player' : 'remote'; ph.picked = true;
        send(ph, Object.assign({ t: 'state' }, viewFor(ph, lastState)));
        // Les téléphones encore sur « Qui es-tu ? » voient tout de suite qui est déjà pris.
        phones.forEach(x => { if (x !== ph && !x.picked) send(x, { t: 'welcome', players: players(x), n: x.n }); });
        changed();
        break;
      }
      case 'nav':
        if (NAV_KEYS.includes(msg.key) && commandHandler) commandHandler(ph, { t: 'nav', key: msg.key });
        break;
      case 'answer':
        if (Number.isInteger(msg.i) && msg.i >= 0 && msg.i < 4 && commandHandler) commandHandler(ph, { t: 'answer', i: msg.i });
        break;
      default:
        if (commandHandler) commandHandler(ph, { t: msg.t });
    }
  }

  function start() {
    if (peer && !peer.destroyed) return;
    if (typeof Peer === 'undefined') { status = 'error'; error = 'bibliothèque PeerJS absente'; changed(); return; }
    code = newCode(); status = 'connecting'; error = '';
    peer = new Peer(peerIdOf(code), { debug: 0 });
    peer.on('open', () => { status = 'ready'; changed(); });
    peer.on('connection', conn => {
      if (phones.size >= MAX_PHONES) { conn.on('open', () => conn.close()); return; }
      const ph = { conn, n: ++phoneNo, player: null, role: 'remote', picked: false, hits: 0, since: Date.now() };
      conn.on('open', () => { phones.set(conn.connectionId, ph); changed(); });
      conn.on('data', msg => onData(ph, msg));
      conn.on('close', () => { phones.delete(conn.connectionId); changed(); });
      conn.on('error', () => { phones.delete(conn.connectionId); changed(); });
    });
    peer.on('disconnected', () => { if (!peer.destroyed) { status = 'connecting'; changed(); peer.reconnect(); } });
    peer.on('error', err => {
      if (err.type === 'unavailable-id') { stop(); start(); return; } // code déjà pris : on en tire un autre
      if (err.type === 'peer-unavailable') return;
      status = 'error'; error = err.type === 'network' || err.type === 'server-error' ? 'service de mise en relation injoignable (Internet ?)' : (err.type || 'erreur');
      changed();
    });
    changed();
  }
  function stop() {
    phones.forEach(ph => { try { ph.conn.close(); } catch (e) { /* déjà fermé */ } });
    phones.clear();
    if (peer) { try { peer.destroy(); } catch (e) { /* déjà détruit */ } }
    peer = null; status = 'off'; code = ''; phoneNo = 0;
    changed();
  }
  function kick(connId) {
    const ph = phones.get(connId);
    if (ph) { send(ph, { t: 'bye' }); setTimeout(() => { try { ph.conn.close(); } catch (e) { /* fermé */ } }, 200); phones.delete(connId); changed(); }
  }

  return {
    start, stop, kick, broadcast, canAct,
    active: () => status !== 'off',
    info: () => ({
      status, error, code: code ? prettyCode() : '', url: code ? joinUrl() : '',
      phones: [...phones.entries()].map(([id, ph]) => ({ id, n: ph.n, player: ph.player, role: ph.role }))
    }),
    phoneFor: playerId => [...phones.values()].some(ph => ph.player === playerId),
    count: () => phones.size,
    onCommand: fn => { commandHandler = fn; },
    onChange: fn => { changeHandler = fn; }
  };
})();
