#!/usr/bin/env node
// Hash renderFrame output for chosen frames — to prove a kit or style change left a piece pixel-identical.
//   usage: node tools/framehash.mjs a/index.html [b/index.html] f0 f1 f2 ... [--format 1:1]
// With two files it compares them frame by frame (exit 1 on any difference).
import crypto from 'node:crypto';
import { chromium, openPiece } from './lib/pw.mjs';
const args = process.argv.slice(2);
const fi = args.indexOf('--format'), format = fi >= 0 ? args.splice(fi, 2)[1] : null;
const files = args.filter((a) => /\.html?$/i.test(a)), frames = args.filter((a) => /^\d+$/.test(a)).map(Number);
if (!files.length || !frames.length) { console.error('usage: node tools/framehash.mjs a.html [b.html] f0 f1 ... [--format 1:1]'); process.exit(2); }
const browser = await chromium.launch();
async function hashes(file) {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('pageerror', file, e.message));
  await openPiece(page, file, { format });
  await page.evaluate(() => document.fonts.ready);
  const out = [];
  for (const f of frames) {
    const data = await page.evaluate(async (fr) => {
      const T = window.TIMELINE, c = document.createElement('canvas'); c.width = T.width; c.height = T.height;
      await window.__frame(fr / T.fps, c); return c.toDataURL('image/png');
    }, f);
    out.push(crypto.createHash('md5').update(data).digest('hex').slice(0, 10));
  }
  await page.close();
  return out;
}
const H = [];
for (const f of files) H.push(await hashes(f));
let diff = 0;
frames.forEach((f, i) => {
  const row = H.map((h) => h[i]), same = row.every((v) => v === row[0]);
  if (!same) diff++;
  console.log(`f${f}  ${row.join('  ')}${files.length > 1 ? (same ? '  same' : '  DIFF') : ''}`);
});
if (files.length > 1) console.log(`${frames.length - diff}/${frames.length} frames identical`);
await browser.close();
process.exit(diff ? 1 : 0);
