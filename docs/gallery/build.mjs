#!/usr/bin/env node
// The README gallery: nine tiles drawn by the skill itself (one per style, the one-take format, and a look made
// for this), laid out 3 x 3 with their labels -> docs/gallery.png
//   usage: node docs/gallery/build.mjs [--rebuild]
//   a tile without a thumb.png is built from its src/ and rendered at its piece.json "thumb" time (default 2.5s);
//   --rebuild  does that for every tile (thumb.png files are not committed: they come from the sources)
import { createRequire } from 'node:module';
import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = (() => { try { return require('playwright'); } catch { return require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); } })();
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKILL = path.resolve(HERE, '../../plugins/animate-pls/skills/animate-pls');
const TILES = [
  ['01-cut-paper', 'cut paper', 'GSoC 2024 · INCF'],
  ['02-crosshatch', 'crosshatch', 'Querypls'],
  ['03-riso', 'riso', 'Open Source Summit EU'],
  ['04-sketchbook', 'sketchbook', 'first-PR guide'],
  ['05-math', 'math', 'BestRAG'],
  ['06-pixel', 'pixel', 'GraphNeT'],
  ['07-isometric', 'isometric', 'LFX 2023 · Zowe'],
  ['08-one-take', 'one take (F9)', 'AI engineer, today'],
  ['09-your-look', 'your own look', 'NED University'],
];

const rebuildAll = process.argv.includes('--rebuild');
for (const [dir] of TILES) {
  const piece = path.join(HERE, dir), thumb = path.join(piece, 'thumb.png');
  if (!rebuildAll && fs.existsSync(thumb)) continue;
  const t = JSON.parse(fs.readFileSync(path.join(piece, 'piece.json'), 'utf8')).thumb ?? 2.5;
  for (const [tool, args] of [['build.mjs', [piece]], ['still.mjs', [piece, String(t), thumb]]]) {
    const r = spawnSync('node', [path.join(SKILL, 'tools', tool), ...args], { stdio: 'inherit' });
    if (r.status !== 0) { console.error(`${tool} failed for ${dir}`); process.exit(1); }
  }
}

const items = TILES.map(([dir, style, topic], i) => {
  const f = path.join(HERE, dir, 'thumb.png');
  return { n: i + 1, style, topic, url: 'data:image/png;base64,' + fs.readFileSync(f).toString('base64') };
});
const browser = await chromium.launch(), page = await browser.newPage();
const png = await page.evaluate(async (items) => {
  const S = 380, GAP = 26, LAB = 74, cols = 3, rows = Math.ceil(items.length / cols);
  const c = document.createElement('canvas'); c.width = GAP + cols * (S + GAP); c.height = GAP + rows * (S + LAB + GAP);
  const x = c.getContext('2d');
  x.fillStyle = '#1b1714'; x.fillRect(0, 0, c.width, c.height);
  const font = '"Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif';
  for (const [i, it] of items.entries()) {
    const img = new Image(); img.src = it.url; await img.decode();
    const cx = GAP + (i % cols) * (S + GAP), cy = GAP + Math.floor(i / cols) * (S + LAB + GAP);
    x.save(); x.beginPath(); x.roundRect(cx, cy, S, S, 14); x.clip(); x.drawImage(img, cx, cy, S, S); x.restore();
    x.fillStyle = '#d97757'; x.font = `700 27px ${font}`; x.fillText(String(it.n), cx + 2, cy + S + 36);
    const w = x.measureText(String(it.n)).width;
    x.fillStyle = '#f4ecd9'; x.font = `600 27px ${font}`; x.fillText(it.style, cx + w + 14, cy + S + 36);
    x.fillStyle = '#b9ab94'; x.font = `400 21px ${font}`; x.fillText(it.topic, cx + w + 14, cy + S + 64);
  }
  return c.toDataURL('image/png').split(',')[1];
}, items);
await browser.close();
const out = path.join(HERE, '..', 'gallery.png');
fs.writeFileSync(out, Buffer.from(png, 'base64'));
console.log('wrote', path.relative(process.cwd(), out));
