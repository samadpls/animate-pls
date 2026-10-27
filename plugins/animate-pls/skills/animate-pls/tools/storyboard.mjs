// Render a piece's storyboard (TIMELINE.board, drawn by kit/board.js) to a PNG, plus optional single panels at full size
// usage: node tools/storyboard.mjs <piece dir | index.html> [out.png] [panel numbers...] [--format 1:1]   (out defaults to <piece>/storyboard.png)
import fs from 'node:fs';
import path from 'node:path';
import { chromium, openPiece } from './lib/pw.mjs';
const args = process.argv.slice(2), fmtI = args.indexOf('--format'), format = fmtI >= 0 ? args.splice(fmtI, 2)[1] : null, src = args.shift();
if (!src) { console.error('usage: node tools/storyboard.mjs <piece dir | index.html> [out.png] [panel numbers...]'); process.exit(2); }
const file = src.endsWith('.html') ? src : path.join(src, 'index.html');
const out = args[0] && args[0].endsWith('.png') ? args.shift() : path.join(path.dirname(file), 'storyboard.png');
const panels = args;
const browser = await chromium.launch(); const page = await browser.newPage();
page.on('pageerror', (e) => console.error('pageerror:', e.message));
await openPiece(page, file, { format });
await page.evaluate(() => document.fonts.ready);
const t0 = Date.now();
const url = await page.evaluate(async () => (await window.renderBoard()).toDataURL('image/png'));
fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
console.log('board', out, (Date.now() - t0) + 'ms');
for (const n of panels) {
  const u = await page.evaluate(async (k) => { await window.__prepare(TIMELINE.board[k].t); const c = document.createElement('canvas'); c.width = TIMELINE.width; c.height = TIMELINE.height; ctx = c.getContext('2d'); drawPanel(k, 1); return c.toDataURL('image/png'); }, Number(n) - 1);
  const p = out.replace(/\.png$/, `-p${n}.png`); fs.writeFileSync(p, Buffer.from(u.split(',')[1], 'base64')); console.log('panel', p);
}
await browser.close();
