#!/usr/bin/env node
// The README gallery: tiles drawn by the skill itself (one per style, the formats, edit mode, and a look made for this),
// each telling part of samadpls.com, laid out 4 across with their labels -> docs/gallery.jpg
//   usage: node docs/gallery/build.mjs [--rebuild] [--clips]
//   every style's tile is also its thumbnail in the intake gallery (tools/gallery.mjs): styles/<name>/sample.jpg,
//   540x540, and the "your own look" tile is the custom slot (styles/custom.jpg). Written when the tile's thumb is newer.
//   a tile without a thumb.png is built from its src/ and rendered at its piece.json "thumb" time (default 2.5s);
//   --rebuild  does that for every tile (thumb.png files are not committed: they come from the sources)
//   --clips    also exports every tile as a video, all aligned for a montage (1080x1080, 24 fps, H.264, in gallery
//              order) -> docs/gallery/clips/NN-<tile>.mp4 + clips.json (not committed). A clip is rendered again only
//              when its tile, its style or the skill's kit has changed since it was made.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '../../plugins/animate-pls/skills/animate-pls/tools/lib/pw.mjs';   // the skill's Playwright loader

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKILL = path.resolve(HERE, '../../plugins/animate-pls/skills/animate-pls');
const TILES = [
  ['01-cutout', 'cutout'],
  ['02-crosshatch', 'crosshatch'],
  ['03-riso', 'riso'],
  ['04-sketchbook', 'sketchbook'],
  ['05-math', 'math'],
  ['06-pixel', 'pixel'],
  ['07-isometric', 'isometric'],
  ['08-kinetic', 'kinetic'],
  ['09-flat', 'flat'],
  ['10-clay', 'clay'],
  ['11-comic', 'comic'],
  ['12-chalkboard', 'chalkboard'],
  ['13-linocut', 'linocut'],
  ['14-watercolor', 'watercolor'],
  ['15-terminal', 'terminal'],
  ['16-poster', 'poster'],
  ['17-seamless', 'seamless'],
  ['18-reel', 'reel'],
  ['19-edit', 'edit'],
  ['20-custom', 'custom'],
];

const rebuildAll = process.argv.includes('--rebuild');
for (const [dir] of TILES) {
  const piece = path.join(HERE, dir), thumb = path.join(piece, 'thumb.png');
  if (!rebuildAll && fs.existsSync(thumb)) continue;
  const meta = JSON.parse(fs.readFileSync(path.join(piece, 'piece.json'), 'utf8')), t = meta.thumb ?? 2.5;
  // an edit-mode tile records its footage first (tools/footage.mjs --ensure; footage/ is never committed)
  for (const [tool, args] of [...(meta.footage ? [['footage.mjs', [piece, '--ensure']]] : []), ['build.mjs', [piece]], ['still.mjs', [piece, String(t), thumb]]]) {
    const r = spawnSync('node', [path.join(SKILL, 'tools', tool), ...args], { stdio: 'inherit' });
    if (r.status !== 0) { console.error(`${tool} failed for ${dir}`); process.exit(1); }
  }
}

// ---- the intake gallery's thumbnails: a style's own tile (01-cutout -> styles/cutout/sample.jpg) and the custom slot
const ffmpeg = (args) => spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: 'inherit' }).status === 0;
for (const [dir] of TILES) {
  const piece = path.join(HERE, dir), style = JSON.parse(fs.readFileSync(path.join(piece, 'piece.json'), 'utf8')).style;
  const out = dir.replace(/^\d+-/, '') === style && fs.existsSync(path.join(SKILL, 'styles', style, 'kit.js')) ? path.join(SKILL, 'styles', style, 'sample.jpg')
    : dir.endsWith('-custom') ? path.join(SKILL, 'styles', 'custom.jpg') : null;
  const thumb = path.join(piece, 'thumb.png');
  if (!out || (fs.existsSync(out) && fs.statSync(out).mtimeMs > fs.statSync(thumb).mtimeMs)) continue;
  if (!ffmpeg(['-i', thumb, '-vf', 'scale=540:540:flags=lanczos', '-q:v', '3', out])) { console.error(`could not write ${out}`); process.exit(1); }
  console.log('thumbnail', path.relative(process.cwd(), out));
}

// ---- the clips: each tile exported as a video, cached on the newest source it depends on
const run = (tool, args) => {
  const r = spawnSync('node', [path.join(SKILL, 'tools', tool), ...args], { stdio: 'inherit' });
  if (r.status !== 0) { console.error(`${tool} failed for ${args[0]}`); process.exit(1); }
};
const newest = (p) => {   // the newest mtime under p, skipping build products
  if (!fs.existsSync(p)) return 0;
  const st = fs.statSync(p);
  if (!st.isDirectory()) return st.mtimeMs;
  return Math.max(0, ...fs.readdirSync(p).filter((n) => !['frames', 'renders', 'review', 'index.html', 'thumb.png'].includes(n) && !n.startsWith('frames-')).map((n) => newest(path.join(p, n))));
};
if (process.argv.includes('--clips')) {
  const OUT = path.join(HERE, 'clips');
  fs.mkdirSync(OUT, { recursive: true });
  const list = [];
  for (const [i, [dir, label]] of TILES.entries()) {
    const piece = path.join(HERE, dir), meta = JSON.parse(fs.readFileSync(path.join(piece, 'piece.json'), 'utf8'));
    const style = meta.style || 'cutout', local = path.join(piece, 'styles', style);
    const out = path.join(OUT, `${String(i + 1).padStart(2, '0')}-${dir.replace(/^\d+-/, '')}.mp4`);
    const deps = Math.max(newest(piece), newest(path.join(SKILL, 'kit')), newest(fs.existsSync(local) ? local : path.join(SKILL, 'styles', style)));
    if (fs.existsSync(out) && fs.statSync(out).mtimeMs > deps) console.log(`clip ${path.basename(out)}: up to date`);
    else { if (meta.footage) run('footage.mjs', [piece, '--ensure']); run('build.mjs', [piece]); run('export.mjs', [piece]); fs.copyFileSync(path.join(piece, 'renders', 'final.mp4'), out); }
    list.push({ n: i + 1, file: path.basename(out), label, title: meta.title || '', style, seconds: meta.format.duration, fps: meta.format.fps, size: `${meta.format.width}x${meta.format.height}` });
  }
  const odd = list.filter((c) => c.size !== '1080x1080' || c.fps !== 24);
  if (odd.length) console.warn('warning: not aligned (1080x1080 at 24 fps):', odd.map((c) => `${c.file} ${c.size}@${c.fps}`).join(', '));
  for (const f of fs.readdirSync(OUT)) if (f.endsWith('.mp4') && !list.some((c) => c.file === f)) { fs.rmSync(path.join(OUT, f)); console.log(`clip ${f}: removed (no longer in the gallery)`); }
  fs.writeFileSync(path.join(OUT, 'clips.json'), JSON.stringify(list, null, 2) + '\n');
  console.log(`clips: ${list.length} in ${path.relative(process.cwd(), OUT)} (${list.reduce((s, c) => s + c.seconds, 0).toFixed(1)}s in all)`);
}

const items = TILES.map(([dir, style], i) => {
  const f = path.join(HERE, dir, 'thumb.png');
  return { n: i + 1, style, url: 'data:image/png;base64,' + fs.readFileSync(f).toString('base64') };
});
const browser = await chromium.launch(), page = await browser.newPage();
const jpg = await page.evaluate(async (items) => {
  const S = 380, GAP = 26, LAB = 48, cols = 4, rows = Math.ceil(items.length / cols);
  const c = document.createElement('canvas'); c.width = GAP + cols * (S + GAP); c.height = GAP + rows * (S + LAB + GAP);
  const x = c.getContext('2d');
  x.fillStyle = '#1b1714'; x.fillRect(0, 0, c.width, c.height);
  const font = '"Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif';
  for (const [i, it] of items.entries()) {
    const img = new Image(); img.src = it.url; await img.decode();
    const row = Math.floor(i / cols), inRow = Math.min(cols, items.length - row * cols);   // a short last row is centred
    const cx = GAP + (cols - inRow) * (S + GAP) / 2 + (i % cols) * (S + GAP), cy = GAP + row * (S + LAB + GAP);
    x.save(); x.beginPath(); x.roundRect(cx, cy, S, S, 14); x.clip(); x.drawImage(img, cx, cy, S, S); x.restore();
    x.fillStyle = '#d97757'; x.font = `700 27px ${font}`; x.fillText(String(it.n), cx + 2, cy + S + 36);
    const w = x.measureText(String(it.n)).width;
    x.fillStyle = '#f4ecd9'; x.font = `600 27px ${font}`; x.fillText(it.style, cx + w + 14, cy + S + 36);
  }
  return c.toDataURL('image/jpeg', 0.9).split(',')[1];
}, items);
await browser.close();
const out = path.join(HERE, '..', 'gallery.jpg');
fs.writeFileSync(out, Buffer.from(jpg, 'base64'));
console.log('wrote', path.relative(process.cwd(), out));
