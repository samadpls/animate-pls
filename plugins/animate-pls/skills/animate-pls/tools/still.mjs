#!/usr/bin/env node
// Render one frame of a piece to a PNG (a style's sample.png, a frame to compare against a reference),
// or several side by side (the look check's 2-4 style frames): seconds = '2.25,9.75,16.5'.
//   usage: node tools/still.mjs <piece dir | index.html> <seconds[,seconds...]> <out.png> [--scale 0.5] [--format 1:1] [--safe] [--platforms tiktok]
//   --safe       draws the safe zone in red, as tile.mjs does (tools/safezones.mjs); --platforms picks the 9:16 profile (implies --safe)
import fs from 'node:fs';
import path from 'node:path';
import { chromium, openPiece } from './lib/pw.mjs';
import { safeZone, bands } from './safezones.mjs';
const args = process.argv.slice(2);
const si = args.indexOf('--scale'), scale = si >= 0 ? Number(args.splice(si, 2)[1]) : 1;
const fi = args.indexOf('--format'), format = fi >= 0 ? args.splice(fi, 2)[1] : null;
const pi = args.indexOf('--platforms'), platforms = pi >= 0 ? args.splice(pi, 2)[1] : null;
const sf = args.indexOf('--safe'), showSafe = (sf >= 0 && !!args.splice(sf, 1)) || platforms != null;
const [src, sec, out] = args;
if (!src || sec == null || !out) { console.error('usage: node tools/still.mjs <piece dir | index.html> <seconds> <out.png> [--scale 0.5]'); process.exit(2); }
const file = src.endsWith('.html') ? src : path.join(src, 'index.html');
const browser = await chromium.launch(), page = await browser.newPage();
page.on('pageerror', (e) => { console.error('PAGE ERROR:', e.message); process.exitCode = 1; });
await openPiece(page, file, { format });
await page.evaluate(() => document.fonts.ready);
const times = String(sec).split(',').map(Number);
const pj = path.join(path.dirname(file), 'piece.json');
const zone = showSafe ? await page.evaluate(() => window.TIMELINE).then((T) => bands(safeZone(T, fs.existsSync(pj) ? JSON.parse(fs.readFileSync(pj, 'utf8')) : {}, { format, platforms }), T.width, T.height)) : [];
const url = await page.evaluate(async ([ts, k, zone]) => {
  const T = window.TIMELINE, c = document.createElement('canvas'); c.width = T.width; c.height = T.height;
  const w = Math.round(T.width * k), h = Math.round(T.height * k), GAP = ts.length > 1 ? Math.round(24 * k) : 0;
  const s = document.createElement('canvas'); s.width = ts.length * w + (ts.length - 1) * GAP; s.height = h;
  const g = s.getContext('2d'); g.fillStyle = '#222'; g.fillRect(0, 0, s.width, s.height); g.imageSmoothingQuality = 'high';
  for (const [i, t] of ts.entries()) {
    await window.__frame(Math.round(t * T.fps) / T.fps, c); g.drawImage(c, i * (w + GAP), 0, w, h);
    g.fillStyle = 'rgba(255,0,0,0.18)'; for (const [x, y, bw, bh] of zone) g.fillRect(i * (w + GAP) + x * k, y * k, bw * k, bh * k);
  }
  return s.toDataURL('image/png');
}, [times, scale, zone]);
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
console.log('still', out, `t=${times.join(', ')}s`, `scale ${scale}`);
await browser.close();
