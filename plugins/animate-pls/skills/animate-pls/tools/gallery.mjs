#!/usr/bin/env node
// Lay every style's thumbnail side by side with its name — the intake gallery ("which of these, or show me a reference?").
//   usage: node tools/gallery.mjs <out.png> [extra styles dirs...] [--no-custom]
// The last tile is "custom": any other look, made from the user's references (new-style.md), shown with styles/custom.jpg.
// Reads this skill's styles/*/sample.jpg (a style's README tile, 540x540: docs/gallery/build.mjs writes them) or
// sample.png (a style made in a project, 540x960), then any extra styles/ folders given (e.g. a project's own styles/).
// Every thumbnail is cropped to a square from its centre.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from './lib/pw.mjs';
const argv = process.argv.slice(2), noCustom = argv.includes('--no-custom');
const [out, ...extra] = argv.filter((a) => a !== '--no-custom');
if (!out) { console.error('usage: node tools/gallery.mjs <out.png> [extra styles dirs...]'); process.exit(2); }
const SKILL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORDER = ['cutout', 'crosshatch', 'riso', 'sketchbook', 'math', 'pixel', 'isometric', 'kinetic', 'flat', 'clay', 'comic', 'chalkboard', 'linocut', 'watercolor', 'terminal', 'poster'];
const items = [];
const dataURL = (f) => `data:image/${f.endsWith('.png') ? 'png' : 'jpeg'};base64,` + fs.readFileSync(f).toString('base64');
for (const dir of [path.join(SKILL, 'styles'), ...extra.map((d) => path.resolve(d))]) {
  if (!fs.existsSync(dir)) continue;
  const sample = (n) => ['sample.jpg', 'sample.png'].map((f) => path.join(dir, n, f)).find((f) => fs.existsSync(f));
  const names = fs.readdirSync(dir).filter((n) => sample(n));
  names.sort((a, b) => ((ORDER.indexOf(a) + 1) || 99) - ((ORDER.indexOf(b) + 1) || 99) || a.localeCompare(b));
  for (const n of names) if (!items.some((i) => i.name === n)) items.push({ name: n, url: dataURL(sample(n)) });
}
if (!items.length) { console.error('no styles/*/sample.jpg or sample.png found'); process.exit(1); }
const customImg = path.join(SKILL, 'styles', 'custom.jpg');
if (!noCustom && fs.existsSync(customImg)) items.push({ name: 'custom', url: dataURL(customImg) });
const browser = await chromium.launch(), page = await browser.newPage();
const png = await page.evaluate(async (items) => {
  const PW = 300, PH = 300, GAP = 24, LAB = 52, cols = Math.min(items.length, 4), rows = Math.ceil(items.length / cols);
  const c = document.createElement('canvas'); c.width = GAP + cols * (PW + GAP); c.height = GAP + rows * (PH + LAB + GAP);
  const g = c.getContext('2d'); g.fillStyle = '#1e1b19'; g.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < items.length; i++) {
    const x = GAP + (i % cols) * (PW + GAP), y = GAP + Math.floor(i / cols) * (PH + LAB + GAP);
    const cover = async (url) => {   // a square crop from the centre, rounded corners
      const img = new Image(); img.src = url; await img.decode();
      const k = Math.min(img.width, img.height), sx = (img.width - k) / 2, sy = (img.height - k) / 2;
      g.save(); g.beginPath(); g.roundRect(x, y, PW, PH, 14); g.clip(); g.imageSmoothingQuality = 'high'; g.drawImage(img, sx, sy, k, k, x, y, PW, PH); g.restore();
    };
    await cover(items[i].url);
    g.fillStyle = '#f0b27c'; g.font = '700 24px "Segoe UI", "Helvetica Neue", Arial, sans-serif'; g.fillText(`${i + 1}`, x, y + PH + 34);
    const nw = g.measureText(`${i + 1}`).width;   // two-digit numbers push the name along
    g.fillStyle = '#efe5cf'; g.font = '600 24px "Segoe UI", "Helvetica Neue", Arial, sans-serif'; g.fillText(items[i].name, x + nw + 12, y + PH + 34);
  }
  return c.toDataURL('image/png').split(',')[1];
}, items);
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
fs.writeFileSync(out, Buffer.from(png, 'base64'));
console.log('gallery', out, items.map((i) => i.name).join(', '));
await browser.close();
