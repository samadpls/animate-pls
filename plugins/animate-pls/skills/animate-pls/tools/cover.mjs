#!/usr/bin/env node
// After an export: the reel's cover, caption files and an optional GIF preview (grammar/FORMATS.md F10).
//   usage: node tools/cover.mjs <piece dir> [--format 9:16] [--t 1.0] [--gif <width>] [--gif-fps 12] [--chunks]
//   renders/cover.png       the cover frame at full size: --t, else TIMELINE.reel.cover, else the hook (reel.hook), else
//                           1.0s. Rendered from the page like tools/still.mjs, so it is the exact frame, lossless. Mobile
//                           Shorts and TikTok covers are picked from the video's own frames, so the cover is a real frame.
//   renders/cover-grid.jpg  9:16 only: the 3:4 crop Instagram shows on a profile grid (y 240–1680 at 1080x1920)
//   renders/cover-feed.jpg  9:16 only: the 4:5 crop of a Reel in the feed (y 285–1635)
//   renders/captions.srt / captions.vtt   one cue per spoken line (from TIMELINE.captions, which kit/captions.js
//                           builds from VOICE or CAPTION_SCRIPT; else from VOICE or TIMELINE.narration), at most 42
//                           characters a line and 2 lines a cue. --chunks: one cue per caption chunk instead.
//                           LinkedIn takes the SRT as a sidecar; YouTube and Vimeo take either.
//   renders/preview-<w>.gif --gif <width>: a GIF of the render (10–15 fps, at most 128 colours, palettegen/paletteuse
//                           when this ffmpeg has them, its plain GIF encoder otherwise). A 15s reel at 360 wide is
//                           ~10 MB (the boil changes every frame); --gif-fps 10 or a narrower width for less
//   Another format than the piece's main one writes cover-<w>x<h>.png, captions-<w>x<h>.*, preview-<w>x<h>-<gw>.gif.
import { createRequire } from 'node:module';
import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = (() => { try { return require('playwright'); } catch { return require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); } })();
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); if (i < 0) return d; const v = argv[i + 1]; argv.splice(i, 2); return v; };
const flag = (k) => { const i = argv.indexOf('--' + k); if (i < 0) return false; argv.splice(i, 1); return true; };
const FORMAT = opt('format', null), TCOVER = opt('t', null), GIFW = opt('gif', null), GIFFPS = Math.min(15, Math.max(10, Number(opt('gif-fps', 12)))), CHUNKS = flag('chunks');
if (!argv[0]) { console.error('usage: node tools/cover.mjs <piece dir> [--format 9:16] [--t 1.0] [--gif <width>] [--gif-fps 12] [--chunks]'); process.exit(2); }
const ROOT = path.resolve(argv[0]), RENDERS = path.join(ROOT, 'renders');
const PIECE = fs.existsSync(path.join(ROOT, 'piece.json')) ? JSON.parse(fs.readFileSync(path.join(ROOT, 'piece.json'), 'utf8')) : {};
fs.mkdirSync(RENDERS, { recursive: true });

// ---- the page: the cover frame (and its crops) and the caption cues
const browser = await chromium.launch(), page = await browser.newPage();
page.on('pageerror', (e) => console.error('PAGE ERROR:', e.message));
await page.goto(pathToFileURL(path.join(ROOT, 'index.html')).href + '?export=1' + (FORMAT ? `&format=${encodeURIComponent(FORMAT)}` : ''));
await page.waitForFunction(() => window.TIMELINE && window.renderFrame, null, { timeout: 30000 });
await page.evaluate(() => document.fonts.ready);
const R = await page.evaluate((tArg) => {
  const T = window.TIMELINE, W = T.width, H = T.height, reel = T.reel || {};
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  window.renderFrame(0, c);   // builds the caption list when it waits for the first frame
  const t = tArg != null ? Number(tArg) : reel.cover ?? reel.hook ?? 1.0;
  window.renderFrame(Math.round(t * T.fps) / T.fps, c);
  const out = { W, H, t, png: c.toDataURL('image/png').split(',')[1], crops: {} };
  if (H / W > 1.7) for (const [name, y0, y1] of [['grid', 240, 1680], ['feed', 285, 1635]]) {   // 1080x1920 numbers, scaled
    const k = H / 1920, a = Math.round(y0 * k), b = Math.round(y1 * k), x = document.createElement('canvas'); x.width = W; x.height = b - a;
    x.getContext('2d').drawImage(c, 0, a, W, b - a, 0, 0, W, b - a);
    out.crops[name] = x.toDataURL('image/jpeg', 0.92).split(',')[1];
  }
  // cues: the caption chunks with their spoken line (kit/captions.js), else the voice's lines, else the narration
  const lines = T.captionSafe && T.captionSafe.lines;
  out.chunks = (T.captions || []).map((ch) => ({ t0: ch.t0, t1: ch.t1, text: ch.text, line: ch.line, words: ch.words }));
  out.lines = lines || null;
  out.voice = typeof VOICE !== 'undefined' ? VOICE.lines.map((l) => ({ t0: l.t0, t1: l.t1, text: l.text })) : null;
  out.narration = (T.narration || []).map((n) => ({ t0: n.t0, t1: n.t1, text: n.text }));
  return out;
}, TCOVER);
await browser.close();

const MAIN = (PIECE.formats || [])[0], other = FORMAT && MAIN && FORMAT !== MAIN, SUF = other ? `-${R.W}x${R.H}` : '';
const write = (name, b64) => { const f = path.join(RENDERS, name); fs.writeFileSync(f, Buffer.from(b64, 'base64')); return f; };
console.log(`cover: ${path.relative(process.cwd(), write(`cover${SUF}.png`, R.png))} (t=${R.t.toFixed(2)}s, ${R.W}x${R.H})`);
for (const [name, b64] of Object.entries(R.crops)) console.log(`       ${path.relative(process.cwd(), write(`cover${SUF}-${name}.jpg`, b64))} (${name === 'grid' ? 'the 3:4 profile-grid crop' : 'the 4:5 feed crop'})`);

// ---- caption files
const words = (s) => String(s).trim().split(/\s+/).filter(Boolean);
function wrap(text, max = 42) {   // at most 42 characters a line, as even as the words allow; returns lines
  const ws = words(text); if (!ws.length) return [];
  if (text.length <= max) return [ws.join(' ')];
  let best = null;
  for (let k = 1; k < ws.length; k++) { const a = ws.slice(0, k).join(' '), b = ws.slice(k).join(' '), m = Math.max(a.length, b.length); if (!best || m < best.m) best = { m, L: [a, b] }; }
  return best.L;
}
let cues = [];
if (R.chunks.length && CHUNKS) cues = R.chunks.map((c) => ({ t0: c.t0, t1: c.t1, lines: wrap(c.text) }));
else if (R.chunks.length) {
  const byLine = new Map();
  for (const c of R.chunks) { const k = c.line ?? -1, v = byLine.get(k); if (v) { v.t1 = c.t1; v.words.push(...c.words.map((w) => w.w)); } else byLine.set(k, { t0: c.t0, t1: c.t1, words: c.words.map((w) => w.w), chunks: [] }); byLine.get(k).chunks.push(c); }
  for (const [k, v] of byLine) {
    const text = (R.lines && R.lines[k]) || v.words.join(' ');
    const L = wrap(text);
    if (L.length <= 2 && L.every((l) => l.length <= 42)) { cues.push({ t0: v.t0, t1: v.t1, lines: L }); continue; }
    // too long for one cue: split at a chunk boundary near the middle of the words
    const half = Math.ceil(v.chunks.length / 2), A = v.chunks.slice(0, half), B = v.chunks.slice(half);
    for (const P of [A, B]) if (P.length) cues.push({ t0: P[0].t0, t1: P[P.length - 1].t1, lines: wrap(P.map((c) => c.text).join(' ')) });
  }
} else cues = (R.voice || R.narration || []).filter((l) => l.text).map((l) => ({ t0: l.t0, t1: l.t1, lines: wrap(l.text) }));
cues.sort((a, b) => a.t0 - b.t0);
for (let i = 0; i + 1 < cues.length; i++) cues[i].t1 = Math.min(cues[i].t1, cues[i + 1].t0);   // no overlaps
const ts = (t, sep) => { const ms = Math.max(0, Math.round(t * 1000)), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}${sep}${String(ms % 1000).padStart(3, '0')}`; };
if (cues.length) {
  const srt = cues.map((c, i) => `${i + 1}\n${ts(c.t0, ',')} --> ${ts(c.t1, ',')}\n${c.lines.join('\n')}\n`).join('\n');
  const vtt = 'WEBVTT\n\n' + cues.map((c) => `${ts(c.t0, '.')} --> ${ts(c.t1, '.')}\n${c.lines.join('\n')}\n`).join('\n');
  fs.writeFileSync(path.join(RENDERS, `captions${SUF}.srt`), srt);
  fs.writeFileSync(path.join(RENDERS, `captions${SUF}.vtt`), vtt);
  console.log(`captions: renders/captions${SUF}.srt, renders/captions${SUF}.vtt (${cues.length} cues, ${CHUNKS ? 'one per chunk' : 'one per line'}, from ${R.chunks.length ? 'TIMELINE.captions' : R.voice ? 'VOICE' : 'TIMELINE.narration'})`);
} else console.log('captions: none (no TIMELINE.captions, VOICE or narration)');

// ---- the GIF preview
if (GIFW) {
  const VIDEO = path.join(RENDERS, other ? `final${SUF}.mp4` : 'final.mp4');
  if (!fs.existsSync(VIDEO)) { console.error('no render at', VIDEO, '- run export.mjs first'); process.exit(1); }
  const filters = spawnSync('ffmpeg', ['-hide_banner', '-filters'], { encoding: 'utf8' }).stdout || '';
  const has = (f) => new RegExp(`\\b${f}\\b`).test(filters);
  const gw = Math.max(64, Math.round(Number(GIFW) / 2) * 2), out = path.join(RENDERS, `preview${SUF}-${gw}.gif`);
  // a light temporal denoise (when this ffmpeg has hqdn3d) calms the paper grain that boils every frame: ~30% smaller
  const base = `fps=${GIFFPS},scale=${gw}:-2:flags=lanczos${has('hqdn3d') ? ',hqdn3d=4:4:6:6' : ''}`;
  const vf = has('palettegen') && has('paletteuse') && has('split')
    ? `${base},split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`
    : base;
  if (vf === base) console.log('note: this ffmpeg has no palettegen/paletteuse, so the GIF uses its default palette');
  const r = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', VIDEO, '-an', '-filter_complex', vf, '-loop', '0', out], { encoding: 'utf8' });
  if (r.status !== 0) { console.error('gif failed:', r.stderr); process.exit(1); }
  console.log(`gif: ${path.relative(process.cwd(), out)} (${gw} wide, ${GIFFPS} fps, ${(fs.statSync(out).size / 1e6).toFixed(1)} MB)`);
}
