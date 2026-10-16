#!/usr/bin/env node
/* Génère sw.js (service worker) avec la liste de tous les fichiers du jeu, pour qu'il marche hors ligne
 * une fois installé sur l'iPad. À relancer après chaque modification des fichiers :
 *   node tools/build-sw.js
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const INCLUDE = ['index.html', 'manette.html', 'manifest.webmanifest', 'css', 'js', 'data', 'img', 'icons', 'fonts', 'audio'];

function walk(rel) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) return [];
  if (fs.statSync(abs).isFile()) return [rel];
  return fs.readdirSync(abs).flatMap(f => walk(path.posix.join(rel, f)));
}

const files = INCLUDE.flatMap(walk).filter(f => !/(^|\/)\./.test(f)).sort();
const hash = crypto.createHash('sha1');
files.forEach(f => hash.update(f).update(fs.readFileSync(path.join(root, f))));
const version = hash.digest('hex').slice(0, 10);

const sw = `/* Famili'Quiz — service worker (généré par tools/build-sw.js, ne pas modifier à la main) */
const VERSION = '${version}';
const CACHE = 'familiquiz-' + VERSION;
const FILES = ${JSON.stringify(['./', ...files], null, 0).replace(/","/g, '",\n  "')};

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache =>
    Promise.all(FILES.map(f => cache.add(f).catch(() => null)))
  ).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

// Fichiers du jeu : réseau d'abord (pour recevoir les mises à jour), cache si hors ligne.
// Le jeu ne charge rien d'extérieur : les autres origines ne sont pas interceptées.
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await Promise.race([
        fetch(req),
        new Promise((_, reject) => setTimeout(() => reject(new Error('lent')), 4000))
      ]);
      if (res.ok) cache.put(req, res.clone());
      return res;
    } catch (e) {
      const hit = await cache.match(req, { ignoreSearch: true });
      return hit || (req.mode === 'navigate' ? cache.match('index.html') : Response.error());
    }
  })());
});
`;

fs.writeFileSync(path.join(root, 'sw.js'), sw);
console.log(`sw.js généré : ${files.length} fichiers, version ${version}`);
