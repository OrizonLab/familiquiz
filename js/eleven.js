/* Famili'Quiz — voix premium ElevenLabs (optionnelle, avec la clé API de l'utilisateur).
 *
 * Sécurité :
 * - la clé est enregistrée uniquement sur cet appareil (localStorage, entrée séparée des réglages) :
 *   elle n'est jamais exportée dans les sauvegardes, jamais publiée, jamais envoyée ailleurs
 *   qu'à api.elevenlabs.io (la politique de sécurité de la page, CSP, interdit tout autre serveur) ;
 * - seuls les textes des questions et réponses sont envoyés à ElevenLabs (aucun prénom, aucun score).
 * Économie : chaque lecture reçue est gardée sur l'appareil (IndexedDB) ; un même texte n'est payé qu'une fois.
 */
const Eleven = (() => {
  const API = 'https://api.elevenlabs.io/v1';
  const KEY_STORE = 'fq_secret_elevenlabs';
  const cfg = { voice: '', model: 'eleven_multilingual_v2' };

  /* ---------- Clé ---------- */
  const getKey = () => { try { return localStorage.getItem(KEY_STORE) || ''; } catch (e) { return ''; } };
  function setKey(k) {
    try { if (k) localStorage.setItem(KEY_STORE, k); else localStorage.removeItem(KEY_STORE); } catch (e) { /* stockage bloqué */ }
  }
  const masked = () => { const k = getKey(); return k ? '•••• ' + k.slice(-4) : ''; };
  const ready = () => !!(getKey() && cfg.voice);
  const configure = o => Object.assign(cfg, o);

  /* ---------- Cache local des lectures (IndexedDB) ---------- */
  let dbp = null;
  function db() {
    if (!dbp) {
      dbp = new Promise((res, rej) => {
        const r = indexedDB.open('familiquiz-voix', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('clips');
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
    }
    return dbp;
  }
  async function idb(mode, fn) {
    try {
      const d = await db();
      return await new Promise(res => {
        const req = fn(d.transaction('clips', mode).objectStore('clips'));
        req.onsuccess = () => res(req.result);
        req.onerror = () => res(null);
      });
    } catch (e) { return null; }
  }
  const cacheGet = k => idb('readonly', s => s.get(k));
  const cachePut = (k, v) => idb('readwrite', s => s.put(v, k));
  const cacheCount = () => idb('readonly', s => s.count()).then(n => n || 0);
  const cacheClear = () => idb('readwrite', s => s.clear());

  /* ---------- API ---------- */
  async function api(path, opts = {}) {
    const key = getKey();
    if (!key) throw new Error('aucune clé API');
    const r = await fetch(API + path, Object.assign({}, opts, { headers: Object.assign({ 'xi-api-key': key }, opts.headers || {}) }));
    if (!r.ok) {
      let msg = 'erreur ' + r.status;
      try { const j = await r.json(); msg = (j.detail && (j.detail.message || j.detail.status)) || msg; } catch (e) { /* réponse non JSON */ }
      const err = new Error(msg); err.status = r.status;
      throw err;
    }
    return r;
  }
  async function voices() {
    const j = await (await api('/voices')).json();
    return (j.voices || []).map(v => ({ id: v.voice_id, name: v.name, lang: (v.labels && (v.labels.language || v.labels.accent)) || '' }))
      .sort((a, b) => (/fr|french|français/i.test(b.lang) ? 1 : 0) - (/fr|french|français/i.test(a.lang) ? 1 : 0) || a.name.localeCompare(b.name));
  }
  async function quota() {
    const j = await (await api('/user/subscription')).json();
    return { used: j.character_count, limit: j.character_limit, tier: j.tier };
  }

  // MP3 (ArrayBuffer) d'un texte : cache de l'appareil d'abord, sinon appel payant à l'API.
  const inflight = new Map();
  async function tts(text, speed = 1) {
    const s = Math.min(1.2, Math.max(0.7, Math.round(speed * 100) / 100));
    const k = [cfg.voice, cfg.model, s, text].join('|');
    const hit = await cacheGet(k);
    if (hit) return hit.slice(0);
    if (!inflight.has(k)) {
      const body = { text, model_id: cfg.model, voice_settings: { stability: 0.5, similarity_boost: 0.75, speed: s } };
      if (/flash|turbo/.test(cfg.model)) body.language_code = 'fr'; // forcer le français (modèles Flash / Turbo uniquement)
      inflight.set(k, api(`/text-to-speech/${encodeURIComponent(cfg.voice)}?output_format=mp3_44100_64`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'audio/mpeg' }, body: JSON.stringify(body)
      }).then(r => r.arrayBuffer()).then(ab => { cachePut(k, ab); return ab; }).finally(() => inflight.delete(k)));
    }
    return (await inflight.get(k)).slice(0);
  }

  return { getKey, setKey, masked, ready, configure, voices, quota, tts, cacheCount, cacheClear, cfg: () => Object.assign({}, cfg) };
})();
