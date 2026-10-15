#!/usr/bin/env node
/* Dessine l'icône de Famili'Quiz et génère les PNG (sans dépendance) :
 *   icons/icon-192.png, icon-512.png (coins arrondis), icon-maskable-512.png et apple-touch-icon.png (plein cadre)
 * Usage : node tools/make-icons.js
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const out = path.join(__dirname, '..', 'icons');
fs.mkdirSync(out, { recursive: true });

/* ---------- Formes (repère 512 × 512) ---------- */
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function sdRoundRect(x, y, x0, y0, x1, y1, r) {
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, hw = (x1 - x0) / 2 - r, hh = (y1 - y0) / 2 - r;
  const dx = Math.abs(x - cx) - hw, dy = Math.abs(y - cy) - hh;
  return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - r;
}
function sdSegment(x, y, ax, ay, bx, by) {
  const px = x - ax, py = y - ay, vx = bx - ax, vy = by - ay;
  const t = clamp((px * vx + py * vy) / (vx * vx + vy * vy), 0, 1);
  return Math.hypot(px - vx * t, py - vy * t);
}

// Point d'interrogation : arc puis descente, trait épais à bouts ronds.
const QM = [];
for (let a = 200; a <= 390; a += 5) {
  const r = (a * Math.PI) / 180;
  QM.push([256 + 58 * Math.cos(r), 190 + 58 * Math.sin(r)]);
}
QM.push([272, 238], [258, 256], [256, 282]);

const TILES = [['#ff5a5f', 112], ['#3d8bfd', 188], ['#ffb020', 264], ['#22b07d', 340]];
const SPARKS = [[108, 118, 9], [408, 98, 11], [424, 300, 6], [90, 292, 6], [380, 170, 5]];

// Couleur [r, g, b, a] d'un point, pour le fond (rounded ou plein cadre) et le contenu (éventuellement réduit).
function sample(x, y, rounded, scale) {
  let col = [0, 0, 0], alpha = 0;
  const over = (c, a) => { col = mix(col, c, a / Math.max(alpha + a * (1 - alpha), 1e-6) * (alpha ? 1 : 1)); alpha = a + alpha * (1 - a); };
  // Fond
  const inBg = rounded ? sdRoundRect(x, y, 0, 0, 512, 512, 112) <= 0 : true;
  if (!inBg) return [0, 0, 0, 0];
  const t = clamp((x + y) / 1024, 0, 1);
  col = mix(hex('#8b5cf6'), hex('#2a1b5e'), t); alpha = 1;
  // Contenu (réduit autour du centre pour les icônes « maskable »)
  const cx = (x - 256) / scale + 256, cy = (y - 256) / scale + 256;
  const put = (c, a) => { col = mix(col, c, a); };
  if (Math.hypot(cx - 256, cy - 226) <= 176) put([255, 255, 255], 0.12);
  if (Math.hypot(cx - 256, cy - 226) <= 150) put(mix(hex('#ffe066'), hex('#ffb300'), clamp((cy - 76) / 300, 0, 1)), 1);
  if (Math.hypot(cx - 256, cy - 226) <= 150 && Math.hypot(cx - 256, cy - 226) >= 138) put(hex('#f59e0b'), 0.5);
  let dq = Infinity;
  for (let i = 0; i + 1 < QM.length; i++) dq = Math.min(dq, sdSegment(cx, cy, QM[i][0], QM[i][1], QM[i + 1][0], QM[i + 1][1]));
  if (dq <= 21) put(hex('#5b2a86'), 1);
  if (Math.hypot(cx - 256, cy - 330) <= 23) put(hex('#5b2a86'), 1);
  TILES.forEach(([c, x0]) => { if (sdRoundRect(cx, cy, x0, 410, x0 + 60, 452, 12) <= 0) put(hex(c), 1); });
  SPARKS.forEach(([sx, sy, r]) => {
    const d = Math.min(Math.abs(cx - sx) + Math.abs(cy - sy) * 3.2, Math.abs(cx - sx) * 3.2 + Math.abs(cy - sy));
    if (d <= r * 2.2) put([255, 255, 255], 0.9);
  });
  void over;
  return [col[0], col[1], col[2], alpha];
}

function render(size, rounded, scale) {
  const ss = 4, k = 512 / size, px = Buffer.alloc(size * size * 4);
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let sj = 0; sj < ss; sj++) for (let si = 0; si < ss; si++) {
      const c = sample((i + (si + 0.5) / ss) * k, (j + (sj + 0.5) / ss) * k, rounded, scale);
      r += c[0] * c[3]; g += c[1] * c[3]; b += c[2] * c[3]; a += c[3];
    }
    const o = (j * size + i) * 4, n = ss * ss;
    px[o] = a ? Math.round(r / a) : 0; px[o + 1] = a ? Math.round(g / a) : 0; px[o + 2] = a ? Math.round(b / a) : 0;
    px[o + 3] = Math.round((a / n) * 255);
  }
  return png(size, size, px);
}

/* ---------- Encodeur PNG minimal ---------- */
const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = buf => { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = ihdr[11] = ihdr[12] = 0;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

const jobs = [
  ['icon-512.png', 512, true, 1],
  ['icon-192.png', 192, true, 1],
  ['icon-maskable-512.png', 512, false, 0.8],
  ['apple-touch-icon.png', 180, false, 0.86]
];
jobs.forEach(([name, size, rounded, scale]) => {
  fs.writeFileSync(path.join(out, name), render(size, rounded, scale));
  console.log('✓ icons/' + name);
});
