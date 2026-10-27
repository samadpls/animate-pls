#!/usr/bin/env node
// Import the user's own footage (a screen recording, a product demo: MP4 / MOV / WEBM) into a piece for edit mode.
//   usage: node tools/footage.mjs <piece> <name> <file> [--cut auto|none] [--keep 0-4.2,6-12.5] [--max 1920]
//                                 [--fps 24] [--poster [t]] [--q 2] [--no-sheet]
//   -> <piece>/footage/<name>/f00000.jpg ...   every output frame at the piece's fps (constant frame rate), JPEG
//      <piece>/footage/<name>.wav              the audio (48 kHz stereo), cut the same way, 30 ms fades at every join
//      <piece>/footage/<name>/map.json         output time -> source time (and the spans removed)
//      <piece>/footage/<name>-sheet.jpg        a contact sheet with timecodes, the change boxes and the suggested zooms
//      <piece>/footage.json                    { <name>: { fps, w, h, n, duration, src, audio, frames, cuts, activity,
//                                                suggestions } }, merged with the other footage already there;
//                                                tools/build.mjs injects it as FOOTAGE (metadata only, no pixels)
//   --cut auto   cut dead air: spans that are silent (silencedetect -35 dB, >= 0.5 s) AND show no change on screen (a
//                pixel-activity pass; freezedetect alone takes a moving cursor for a freeze), >= 1.2 s, keeping 0.3 s
//                of stillness on each side so a cut never lands inside a word
//   --keep a-b,c-d  keep only these source ranges (seconds), in order (the agent's own cut list)
//   --max N      long side capped at N px (default 1920; 2560 keeps a 1440p screen sharp under a 2x zoom)
//   --poster [t] also write <piece>/assets/<name>-poster.jpg (the frame at output time t, default 0): the browser
//                preview shows it in place of the placeholder (it is embedded in index.html, so keep it small)
//
//   node tools/footage.mjs <piece> --ensure [--force]
//                (re)make every footage piece.json "footage" names that is missing: { "<name>": { "record": "steps.json" }
//                | { "import": "file.mp4", "cut": "auto", "keep": "0-4,6-9", "max": 1920 } } (paths relative to the
//                piece). Footage is never committed, so a fresh clone runs this before build / export.
//   node tools/footage.mjs <piece> --mix [--format 16:9]
//                every clip's own audio laid on the output timeline (TIMELINE.clips: windows, offsets, speed, 30 ms
//                fades) -> <piece>/footage/mix.wav, for piece.json "voice": { "file": "footage/mix.wav", "music": -16 }
//                (the score under the recording's sound, ducked) or "music": { "file": "footage/mix.wav" } (instead)
// The footage folder is a build product: never commit it. Only import footage the user owns or may use.
// Activity and suggestions are heuristics (clicks and keys can't be recovered from pixels): check every suggestion
// against the sheet, and prefer tools/record.mjs (which logs the real clicks) for the user's own web app.
import { createRequire } from 'node:module';
import { execSync, spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
export function loadPlaywright() {
  try { return require('playwright'); } catch { return require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); }
}
const r3 = (v) => Math.round(v * 1000) / 1000;
const pad5 = (i) => String(i).padStart(5, '0');

// ---------------------------------------------------------------------------------------------------------------
//  shared by tools/record.mjs
// ---------------------------------------------------------------------------------------------------------------
export function pieceFps(piece) {
  const f = path.join(piece, 'piece.json');
  if (!fs.existsSync(f)) return 24;
  const m = JSON.parse(fs.readFileSync(f, 'utf8'));
  return (m.format && m.format.fps) || m.fps || 24;
}
// write / merge <piece>/footage.json
export function writeEntry(piece, name, entry) {
  const f = path.join(piece, 'footage.json');
  const all = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
  all[name] = entry;
  // one field per line, arrays of objects one item per line, everything else compact
  const L = ['{'], names = Object.keys(all);
  names.forEach((n, i) => {
    L.push(` ${JSON.stringify(n)}: {`);
    const ks = Object.keys(all[n]);
    ks.forEach((k, j) => {
      const v = all[n][k];
      const s = Array.isArray(v) && v.length && v[0] && typeof v[0] === 'object' && !Array.isArray(v[0]) ? '[\n' + v.map((x) => '   ' + JSON.stringify(x)).join(',\n') + '\n  ]' : JSON.stringify(v);
      L.push(`  ${JSON.stringify(k)}: ${s}${j < ks.length - 1 ? ',' : ''}`);
    });
    L.push(` }${i < names.length - 1 ? ',' : ''}`);
  });
  L.push('}');
  fs.writeFileSync(f, L.join('\n') + '\n');
  return f;
}
// clear old frames of a footage folder (a shorter take leaves its tail behind otherwise)
export function freshDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  for (const n of fs.readdirSync(dir)) if (/^f\d+\.(jpg|png)$/.test(n)) fs.unlinkSync(path.join(dir, n));
}
export function writePoster(piece, name, entry, t = 0) {
  const i = Math.max(0, Math.min(entry.n - 1, Math.round(t * entry.fps)));
  const src = path.join(piece, entry.frames.replace(/%05d/, pad5(i))), out = path.join(piece, 'assets', `${name}-poster.jpg`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const r = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', src, '-vf', `scale='min(1280,iw)':-2:flags=lanczos`, '-q:v', '4', out], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('poster failed');
  return out;
}

// the contact sheet: thumbnails with timecodes and frame numbers, the suggestions' boxes (orange, numbered), the
// recorder's events (clicks as blue rings, typed fields as blue boxes), an activity strip and the cut joins
export async function contactSheet(piece, name, entry, out) {
  const { chromium } = loadPlaywright();
  const D = entry.duration, nice = [0.25, 0.5, 1, 2, 3, 5, 10, 15, 30, 60];
  const step = nice.find((s) => D / s <= 24) || 60;
  const times = []; for (let t = 0; t < D - 1e-6; t += step) times.push(r3(t));
  if (D - times[times.length - 1] > step * 0.4) times.push(r3((entry.n - 1) / entry.fps));
  const thumbs = times.map((t) => {
    const i = Math.max(0, Math.min(entry.n - 1, Math.round(t * entry.fps)));
    return { t, i, b64: fs.readFileSync(path.join(piece, entry.frames.replace(/%05d/, pad5(i)))).toString('base64') };
  });
  const browser = await chromium.launch(), page = await browser.newPage();
  const jpg = await page.evaluate(async ({ thumbs, E, name, step }) => {
    const COLS = 4, TW = 440, TH = Math.round(TW * E.h / E.w), G = 14, HEAD = 96, STRIP = 120, LAB = 30;
    const rows = Math.ceil(thumbs.length / COLS), cw = G + COLS * (TW + G), chh = HEAD + rows * (TH + LAB + G) + STRIP + G;
    const c = document.createElement('canvas'); c.width = cw; c.height = chh; const x = c.getContext('2d');
    const SANS = '"Segoe UI", "Helvetica Neue", Arial, sans-serif', MONO = 'Consolas, Menlo, "DejaVu Sans Mono", monospace';
    x.fillStyle = '#16171c'; x.fillRect(0, 0, cw, chh);
    x.fillStyle = '#f2f2f4'; x.font = `700 28px ${SANS}`; x.fillText(`${name}`, G, 38);
    x.font = `400 19px ${MONO}`; x.fillStyle = '#b8bac4';
    const cut = E.cuts && E.cuts.removed && E.cuts.removed.length ? `   cut ${E.cuts.removed.length} span(s): ${E.cuts.source.toFixed(1)}s -> ${E.duration.toFixed(1)}s` : '';
    x.fillText(`${E.w}x${E.h} px  ${E.fps} fps  ${E.n} frames  ${E.duration.toFixed(2)}s${E.audio ? '  audio' : ''}${cut}`, G, 66);
    x.textAlign = 'right'; x.fillStyle = '#ff9a3c'; x.fillText('#n suggested zoom (source px)', cw - G, 38);
    x.fillStyle = '#5aa2ff'; x.fillText('o click  [] typed field (recorded events)', cw - G, 66); x.textAlign = 'left';
    const sug = E.suggestions || [], evs = E.events || [];
    for (const [k, th] of thumbs.entries()) {
      const img = new Image(); img.src = 'data:image/jpeg;base64,' + th.b64; await img.decode();
      const X = G + (k % COLS) * (TW + G), Y = HEAD + Math.floor(k / COLS) * (TH + LAB + G), s = TW / E.w;
      x.drawImage(img, X, Y, TW, TH);
      x.strokeStyle = 'rgba(255,255,255,0.10)'; x.lineWidth = 1; x.beginPath();
      for (let q = 1; q < 4; q++) { x.moveTo(X + TW * q / 4, Y); x.lineTo(X + TW * q / 4, Y + TH); x.moveTo(X, Y + TH * q / 4); x.lineTo(X + TW, Y + TH * q / 4); }
      x.stroke();
      sug.forEach((g, j) => {
        if (th.t < g.t0 - 0.6 || th.t > g.t1 + 0.6) return;
        if (g.kind === 'page') { x.fillStyle = '#ff9a3c'; x.font = `700 16px ${SANS}`; x.fillText(`#${j} page`, X + 6, Y + 20); return; }
        const [bx, by, bw, bh] = g.box; x.strokeStyle = '#ff9a3c'; x.lineWidth = 2.5; x.strokeRect(X + bx * s, Y + by * s, bw * s, bh * s);
        x.fillStyle = '#ff9a3c'; x.font = `700 16px ${SANS}`; x.fillText('#' + j, X + bx * s + 3, Y + by * s - 4 < Y + 12 ? Y + by * s + 16 : Y + by * s - 4);
      });
      for (const e of evs) {
        const t0 = e.t0 ?? e.t, t1 = e.t1 ?? e.t;
        if (th.t < t0 - step / 2 || th.t > t1 + step / 2) continue;
        x.strokeStyle = '#5aa2ff'; x.lineWidth = 2.5;
        if (e.type === 'click' && e.x != null) { x.beginPath(); x.arc(X + e.x * s, Y + e.y * s, 12, 0, Math.PI * 2); x.stroke(); }
        else if (e.box) { const [bx, by, bw, bh] = e.box; x.strokeRect(X + bx * s, Y + by * s, bw * s, bh * s); }
      }
      x.fillStyle = '#f2f2f4'; x.font = `600 18px ${MONO}`;
      x.fillText(`${th.t.toFixed(2)}s`, X, Y + TH + 21);
      x.fillStyle = '#8a8c96'; x.textAlign = 'right'; x.fillText(`f${th.i}`, X + TW, Y + TH + 21); x.textAlign = 'left';
    }
    // activity strip: change per 0.1 s (log scale), suggestions as orange spans, events as blue ticks, cut joins red
    const SY = chh - STRIP - G + 10, SW = cw - 2 * G, sx = (t) => G + SW * t / E.duration;
    x.fillStyle = '#202128'; x.fillRect(G, SY, SW, STRIP - 20);
    x.fillStyle = '#9fa3b0'; x.font = `400 15px ${MONO}`; x.fillText('change on screen (log)', G + 6, SY + 18);
    x.fillStyle = '#7fd1a0';
    for (const [t, fr] of E.activity || []) { const hgt = Math.min(1, Math.log10(1 + fr * 2000) / 3.3) * (STRIP - 30); x.fillRect(sx(t), SY + STRIP - 20 - hgt, Math.max(1.5, SW / (E.duration * 10)), hgt); }
    for (const [j, g] of sug.entries()) { x.fillStyle = 'rgba(255,154,60,0.85)'; x.fillRect(sx(g.t0), SY + 24 + (j % 3) * 8, Math.max(3, sx(g.t1) - sx(g.t0)), 6); }
    x.fillStyle = '#5aa2ff'; for (const e of evs) x.fillRect(sx(e.t0 ?? e.t) - 1, SY, 2.5, STRIP - 20);
    x.fillStyle = '#ff5a5a'; for (const s of (E.cuts && E.cuts.map) || []) if (s.out0 > 0) x.fillRect(sx(s.out0) - 1, SY, 3, STRIP - 20);
    x.fillStyle = '#8a8c96'; for (let t = 0; t <= E.duration; t += Math.max(1, Math.round(E.duration / 12))) x.fillText(`${t}s`, sx(t) + 2, SY + STRIP - 4);
    return c.toDataURL('image/jpeg', 0.88).split(',')[1];
  }, { thumbs, E: entry, name, step });
  await browser.close();
  fs.writeFileSync(out, Buffer.from(jpg, 'base64'));
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
//  probe, activity, silence
// ---------------------------------------------------------------------------------------------------------------
function ffprobe(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`ffprobe could not read ${file}: ${r.stderr}`);
  return JSON.parse(r.stdout);
}
const rate = (s) => { const [a, b] = String(s || '0/1').split('/').map(Number); return b ? a / b : a; };
function filters() { return new Set((spawnSync('ffmpeg', ['-hide_banner', '-filters'], { encoding: 'utf8' }).stdout || '').split('\n').map((l) => l.trim().split(/\s+/)[1]).filter(Boolean)); }

// per 0.1 s: how many pixels changed (> 16 grey levels at 480 px wide) and where, as connected blobs on an 8 px grid
function activityPass(file, pre, W0, H0) {
  const w = 480, h = Math.max(2, Math.round(w * H0 / W0 / 2) * 2), N = w * h, CS = 8, gw = Math.ceil(w / CS), gh = Math.ceil(h / CS);
  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', file, '-an', '-vf', `${pre}fps=10,scale=${w}:${h}:flags=area,format=gray`, '-f', 'rawvideo', '-']);
    let buf = Buffer.alloc(0), prev = null, i = 0; const rows = [];
    ff.stdout.on('data', (d) => {
      buf = Buffer.concat([buf, d]);
      while (buf.length >= N) {
        const f = buf.subarray(0, N); buf = buf.subarray(N);
        if (prev) {
          const cell = new Uint16Array(gw * gh); let n = 0;
          for (let p = 0; p < N; p++) if (Math.abs(f[p] - prev[p]) > 16) { n++; const row = (p / w) | 0, col = p - row * w; cell[((row / CS) | 0) * gw + ((col / CS) | 0)]++; }
          const blobs = [];
          if (n >= 4) {
            const seen = new Uint8Array(gw * gh);
            for (let c0 = 0; c0 < gw * gh; c0++) {
              if (cell[c0] < 2 || seen[c0]) continue;
              const st = [c0]; seen[c0] = 1; let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, px = 0;
              while (st.length) {
                const c = st.pop(), cx = c % gw, cy = (c / gw) | 0; px += cell[c];
                if (cx < x0) x0 = cx; if (cx > x1) x1 = cx; if (cy < y0) y0 = cy; if (cy > y1) y1 = cy;
                for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {   // bridge one empty cell
                  const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
                  const q = ny * gw + nx; if (!seen[q] && cell[q] >= 2) { seen[q] = 1; st.push(q); }
                }
              }
              blobs.push({ box: [x0 * CS / w, y0 * CS / h, (x1 - x0 + 1) * CS / w, (y1 - y0 + 1) * CS / h], px });
            }
          }
          rows.push({ t: r3(i / 10), n, frac: n / N, blobs });
        }
        prev = Buffer.from(f); i++;
      }
    });
    ff.on('error', reject);
    ff.on('close', (code) => (code === 0 ? resolve({ rows, N }) : reject(new Error('activity pass failed'))));
  });
}
function silences(file, dur) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-vn', '-af', 'silencedetect=noise=-35dB:d=0.5', '-f', 'null', '-'], { encoding: 'utf8' });
  const out = []; let s = null;
  for (const l of (r.stderr || '').split('\n')) {
    let m = /silence_start: (-?[\d.]+)/.exec(l); if (m) s = Math.max(0, Number(m[1]));
    m = /silence_end: ([\d.]+)/.exec(l); if (m && s != null) { out.push([s, Number(m[1])]); s = null; }
  }
  if (s != null) out.push([s, dur]);
  return out;
}

// suggestions from activity (output time, source px): content changes grouped into actions; a cursor that stops just
// before a change near it makes the change a likely click. Heuristic: check each one on the sheet.
function suggest(rows, W0, H0) {
  const isCursor = (b) => b.box[2] <= 0.06 && b.box[3] <= 0.09 && b.px <= 220;
  const acts = []; let cur = null, lastCursor = null, lastCursorT = -1;
  const near = (a, b, m = 0.03) => !(a[0] + a[2] + m < b[0] || b[0] + b[2] + m < a[0] || a[1] + a[3] + m < b[1] || b[1] + b[3] + m < a[1]);
  const uni = (a, b) => { const x0 = Math.min(a[0], b[0]), y0 = Math.min(a[1], b[1]); return [x0, y0, Math.max(a[0] + a[2], b[0] + b[2]) - x0, Math.max(a[1] + a[3], b[1] + b[3]) - y0]; };
  for (const r of rows) {
    const cursors = r.blobs.filter(isCursor), content = r.blobs.filter((b) => !isCursor(b));
    if (cursors.length === 1 && !content.length) { lastCursor = cursors[0].box; lastCursorT = r.t; }
    for (const b of content) {
      if (cur && r.t - cur.t1 <= 0.6 && near(cur.box, b.box)) { cur.box = uni(cur.box, b.box); cur.t1 = r.t; cur.rows++; cur.px += b.px; }
      else {
        if (cur) acts.push(cur);
        cur = { t0: r.t, t1: r.t, box: b.box.slice(), rows: 1, px: b.px, cursor: lastCursor && r.t - lastCursorT <= 1.2 ? lastCursor : null };
      }
    }
    if (cur && r.t - cur.t1 > 0.6) { acts.push(cur); cur = null; }
  }
  if (cur) acts.push(cur);
  const out = [];
  for (const a of acts) {
    const area = a.box[2] * a.box[3], span = a.t1 - a.t0;
    if (area < 0.0006 && span < 0.25) continue;                 // a blink, a caret
    let kind = area > 0.45 ? 'page' : span >= 0.8 && area < 0.06 && a.rows >= span * 10 * 0.4 ? 'type' : 'change';
    if (kind === 'change' && a.cursor) { const c = [a.cursor[0] + a.cursor[2] / 2, a.cursor[1] + a.cursor[3] / 2]; if (near(a.box, [c[0], c[1], 0, 0], 0.12)) kind = 'click'; }
    const box = [a.box[0] * W0, a.box[1] * H0, a.box[2] * W0, a.box[3] * H0].map(Math.round);
    const fit = Math.min(W0 / (box[2] * 1.7), H0 / (box[3] * 1.7));
    const scale = kind === 'page' ? 1 : r3(Math.max(1.2, Math.min(kind === 'type' ? 2.2 : 1.8, fit)));
    out.push({ t0: r3(a.t0), t1: r3(a.t1), kind, box, scale });
  }
  return out.slice(0, 24);
}

// ---------------------------------------------------------------------------------------------------------------
//  main
// ---------------------------------------------------------------------------------------------------------------
// ---- --ensure: rebuild the footage a piece declares (piece.json "footage") when it is missing
function ensure(PIECE, force) {
  const meta = JSON.parse(fs.readFileSync(path.join(PIECE, 'piece.json'), 'utf8')), F = meta.footage || {};
  const have = fs.existsSync(path.join(PIECE, 'footage.json')) ? JSON.parse(fs.readFileSync(path.join(PIECE, 'footage.json'), 'utf8')) : {};
  const TOOLS = path.dirname(fileURLToPath(import.meta.url));
  if (!Object.keys(F).length) { console.log('piece.json lists no "footage"; nothing to do'); return; }
  for (const [name, spec] of Object.entries(F)) {
    const ok = have[name] && fs.existsSync(path.join(PIECE, have[name].frames.replace(/%05d/, '00000')));
    if (ok && !force) { console.log(`${name}: present (${have[name].n} frames)`); continue; }
    let args;
    if (spec.record) args = [path.join(TOOLS, 'record.mjs'), PIECE, name, path.resolve(PIECE, spec.record), '--no-sheet'];
    else if (spec.import) args = [path.join(TOOLS, 'footage.mjs'), PIECE, name, path.resolve(PIECE, spec.import), ...(spec.cut ? ['--cut', spec.cut] : []), ...(spec.keep ? ['--keep', spec.keep] : []), ...(spec.max ? ['--max', String(spec.max)] : [])];
    else { console.error(`${name}: give "record" (a steps.json) or "import" (a video file)`); process.exit(2); }
    console.log(`${name}: ${spec.record ? 'recording' : 'importing'}...`);
    const r = spawnSync(process.execPath, args, { stdio: 'inherit' });
    if (r.status !== 0) process.exit(r.status || 1);
  }
}
// ---- --mix: the clips' audio on the output timeline, read from the built piece (TIMELINE.clips, the duration)
async function mix(PIECE, format) {
  const html = path.join(PIECE, 'index.html'), fj = path.join(PIECE, 'footage.json');
  if (!fs.existsSync(html)) { console.error('build the piece first (tools/build.mjs)'); process.exit(1); }
  const FOOT = fs.existsSync(fj) ? JSON.parse(fs.readFileSync(fj, 'utf8')) : {};
  let src = fs.readFileSync(html, 'utf8');
  if (!/\bconst FOOTAGE\s*=/.test(src)) { const at = src.indexOf('"use strict";') + 13; src = src.slice(0, at) + `\nconst FOOTAGE = ${JSON.stringify(FOOT)};` + src.slice(at); }
  const tmp = path.join(PIECE, '.mix-probe.html'); fs.writeFileSync(tmp, src);
  const { chromium } = loadPlaywright(), b = await chromium.launch(), page = await b.newPage();
  await page.goto(pathToFileURL(tmp).href + '?export=1' + (format ? `&format=${encodeURIComponent(format)}` : ''));
  await page.waitForFunction(() => window.TIMELINE);
  const T = await page.evaluate(() => ({ dur: TIMELINE.frames / TIMELINE.fps, clips: typeof ftClips === 'function' ? ftClips() : TIMELINE.clips || [] }));
  await b.close(); fs.unlinkSync(tmp);
  const parts = T.clips.filter((c) => FOOT[c.name] && FOOT[c.name].audio && c.t1 > c.t0);
  if (!parts.length) { console.log('no clip has audio: nothing to mix'); return; }
  const inputs = [], graph = [];
  parts.forEach((c, i) => {
    const sp = c.speed ?? 1, len = c.t1 - c.t0, s0 = c.src0 ?? 0, d = Math.round(c.t0 * 1000);
    inputs.push('-i', path.join(PIECE, FOOT[c.name].audio));
    let tempo = ''; for (let k = sp; Math.abs(k - 1) > 1e-3;) { const step = Math.max(0.5, Math.min(2, k)); tempo += `,atempo=${r3(step)}`; k /= step; }
    graph.push(`[${i}:a]atrim=start=${r3(s0)}:end=${r3(s0 + len * sp)},asetpts=PTS-STARTPTS${tempo},afade=t=in:st=0:d=0.03,afade=t=out:st=${r3(Math.max(0, len - 0.03))}:d=0.03,adelay=${d}|${d}[c${i}]`);
  });
  graph.push(`${parts.map((_, i) => `[c${i}]`).join('')}amix=inputs=${parts.length}:normalize=0:duration=longest,apad=whole_dur=${r3(T.dur)},atrim=end=${r3(T.dur)}[o]`);
  const out = path.join(PIECE, 'footage', 'mix.wav');
  const r = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...inputs, '-filter_complex', graph.join(';'), '-map', '[o]', '-t', String(r3(T.dur)), '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', out], { stdio: 'inherit' });
  if (r.status !== 0) { console.error('mix failed'); process.exit(1); }
  console.log(`mixed ${parts.length} clip(s) onto ${r3(T.dur)}s -> ${out}\n  piece.json: "voice": { "file": "footage/mix.wav", "music": -16 }   (or "music": { "file": "footage/mix.wav" })`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--ensure')) { ensure(path.resolve(args[0]), args.includes('--force')); return; }
  if (args.includes('--mix')) { const i = args.indexOf('--format'); await mix(path.resolve(args[0]), i >= 0 ? args[i + 1] : null); return; }
  const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : d; };
  const cutMode = opt('--cut', 'none'), keepArg = opt('--keep', null), MAX = Number(opt('--max', 1920)), Q = String(opt('--q', 2));
  const noSheet = args.includes('--no-sheet'); if (noSheet) args.splice(args.indexOf('--no-sheet'), 1);
  let fpsArg = opt('--fps', null), poster = null;
  { const i = args.indexOf('--poster'); if (i >= 0) { const v = args[i + 1]; if (v != null && /^[\d.]+$/.test(v)) { poster = Number(v); args.splice(i, 2); } else { poster = 0; args.splice(i, 1); } } }
  const [pieceArg, name, file] = args;
  if (!pieceArg || !name || !file) { console.error('usage: node tools/footage.mjs <piece> <name> <file> [--cut auto|none] [--keep a-b,c-d] [--max 1920] [--fps 24] [--poster [t]]'); process.exit(2); }
  if (!/^[a-z0-9][a-z0-9_-]*$/i.test(name)) { console.error(`name "${name}": use letters, digits, - and _ (it becomes a folder and a key)`); process.exit(2); }
  if (!fs.existsSync(file)) { console.error('no such file:', file); process.exit(1); }
  const PIECE = path.resolve(pieceArg), FPS = Number(fpsArg || pieceFps(PIECE)), T0 = Date.now();
  const probe = ffprobe(file), v = probe.streams.find((s) => s.codec_type === 'video'), a = probe.streams.find((s) => s.codec_type === 'audio');
  if (!v) { console.error('no video stream in', file); process.exit(1); }
  const dur = Number(probe.format.duration || v.duration);
  let rot = 0; for (const sd of v.side_data_list || []) if (sd.rotation != null) rot = Number(sd.rotation); if (v.tags && v.tags.rotate) rot = Number(v.tags.rotate);
  const swap = Math.abs(rot) % 180 === 90, SW = swap ? v.height : v.width, SH = swap ? v.width : v.height;
  const srcFps = rate(v.avg_frame_rate) || rate(v.r_frame_rate), vfr = Math.abs(rate(v.r_frame_rate) - rate(v.avg_frame_rate)) > 0.01;
  const FL = filters();
  // HDR (HLG / PQ phone footage): tone-map to SDR with zscale, or stop (tonemap alone needs linear light)
  let pre = '';
  if (['arib-std-b67', 'smpte2084'].includes(v.color_transfer)) {
    if (!FL.has('zscale')) { console.error(`${file} is HDR (${v.color_transfer === 'smpte2084' ? 'PQ' : 'HLG'}) and this ffmpeg has no zscale to tone-map it. Ask for an SDR export (e.g. on iPhone: "Most Compatible" / HDR off, or export as SDR from the editor), or use an ffmpeg built with zimg.`); process.exit(1); }
    pre = 'zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p,';
  }
  const k = Math.min(1, MAX / Math.max(SW, SH)), OW = Math.round(SW * k / 2) * 2, OH = Math.round(SH * k / 2) * 2;
  console.log(`${path.basename(file)}: ${SW}x${SH}${rot ? ` (rotated ${rot})` : ''}, ${srcFps.toFixed(2)} fps${vfr ? ' (variable)' : ''}, ${dur.toFixed(2)}s, ${a ? 'audio' : 'no audio'}${pre ? ', HDR -> SDR' : ''} -> ${OW}x${OH} @ ${FPS} fps`);

  // activity on the source (10 fps), then the cut
  const act = await activityPass(file, pre, SW, SH);
  const nSrc = Math.max(1, Math.floor(dur * FPS + 1e-6));
  let segs = [[0, nSrc]], removed = [];
  if (keepArg) {
    segs = keepArg.split(',').map((r) => r.split('-').map(Number)).map(([s, e]) => [Math.max(0, Math.round(s * FPS)), Math.min(nSrc, Math.round(e * FPS))]).filter(([s, e]) => e > s);
    if (!segs.length) { console.error('--keep: no valid range'); process.exit(2); }
  } else if (cutMode === 'auto') {
    const sil = a ? silences(file, dur) : [[0, dur]];
    const still = []; let s0 = null;   // runs of 0.1 s rows with no change on screen
    for (const r of act.rows) { const quiet = r.n < 4; if (quiet && s0 == null) s0 = r.t - 0.1; if (!quiet && s0 != null) { still.push([Math.max(0, s0), r.t - 0.1]); s0 = null; } }
    if (s0 != null) still.push([s0, dur]);
    const dead = [];
    for (const [p, q] of still) for (const [x, y] of sil) { const lo = Math.max(p, x), hi = Math.min(q, y); if (hi - lo >= 1.2) dead.push([lo, hi]); }
    dead.sort((p, q) => p[0] - q[0]);
    const M = 0.3; let at = 0; segs = [];
    for (const [lo, hi] of dead) {
      const c0 = lo <= 0.05 ? 0 : lo + M, c1 = hi >= dur - 0.05 ? dur : hi - M;
      if (c1 - c0 < 0.5) continue;
      if (c0 > at) segs.push([Math.round(at * FPS), Math.round(c0 * FPS)]);
      removed.push([r3(c0), r3(c1)]); at = c1;
    }
    if (at < dur) segs.push([Math.round(at * FPS), nSrc]);
    segs = segs.filter(([s, e]) => e > s);
    if (!segs.length) { console.error('--cut auto: everything looked like dead air; nothing to keep. Use --cut none or --keep.'); process.exit(1); }
  }
  // frames: CFR at the piece's fps (the fps filter), then only the kept frames, then the size
  const OUTDIR = path.join(PIECE, 'footage', name);
  freshDir(OUTDIR);
  const cut = segs.length > 1 || segs[0][0] > 0 || segs[0][1] < nSrc;
  const sel = cut ? `select='${segs.map(([s, e]) => `between(n,${s},${e - 1})`).join('+')}',` : '';
  const vf = `${pre}fps=${FPS},${sel}scale=${OW}:${OH}:flags=lanczos,format=yuvj420p`;
  let r = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', file, '-an', '-vf', vf, '-fps_mode', 'passthrough', '-start_number', '0', '-q:v', Q, path.join(OUTDIR, 'f%05d.jpg')], { stdio: 'inherit' });
  if (r.status !== 0) r = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', file, '-an', '-vf', vf, '-vsync', '0', '-start_number', '0', '-q:v', Q, path.join(OUTDIR, 'f%05d.jpg')], { stdio: 'inherit' });
  if (r.status !== 0) { console.error('frame extraction failed'); process.exit(1); }
  const n = fs.readdirSync(OUTDIR).filter((f) => /^f\d{5}\.jpg$/.test(f)).length;
  // the map: output time -> source time, per kept segment
  const map = []; let o = 0;
  for (const [s, e] of segs) { map.push({ out0: r3(o / FPS), out1: r3((o + e - s) / FPS), src0: r3(s / FPS), src1: r3(e / FPS) }); o += e - s; }
  fs.writeFileSync(path.join(OUTDIR, 'map.json'), JSON.stringify({ source: path.resolve(file), fps: FPS, map, removed }, null, 1) + '\n');
  // audio: the same segments, a 30 ms fade at every join, 48 kHz stereo
  let audio = null;
  if (a) {
    const wav = path.join(PIECE, 'footage', `${name}.wav`), vst = Number(v.start_time || 0);
    let graph;
    if (cut) {
      graph = segs.map(([s, e], i) => {
        const len = (e - s) / FPS, fi = i > 0 ? `,afade=t=in:st=0:d=0.03` : '', fo = i < segs.length - 1 ? `,afade=t=out:st=${r3(Math.max(0, len - 0.03))}:d=0.03` : '';
        return `[0:a]atrim=start=${r3(vst + s / FPS)}:end=${r3(vst + e / FPS)},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo${fi}${fo}[a${i}]`;
      }).join(';') + ';' + segs.map((_, i) => `[a${i}]`).join('') + `concat=n=${segs.length}:v=0:a=1[o]`;
    } else graph = `[0:a]atrim=start=${r3(vst)},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo,apad[o]`;
    r = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', file, '-filter_complex', graph, '-map', '[o]', '-t', String(r3(n / FPS)), '-ar', '48000', '-c:a', 'pcm_s16le', wav], { stdio: 'inherit' });
    if (r.status !== 0) { console.error('audio extraction failed'); process.exit(1); }
    audio = path.relative(PIECE, wav).split(path.sep).join('/');
  }
  // activity on the output timeline (dropped where it was cut), and the suggestions
  const toOut = (ts) => { for (const m of map) if (ts >= m.src0 - 1e-6 && ts < m.src1 - 1e-6) return m.out0 + ts - m.src0; return null; };
  const rows = act.rows.map((x) => ({ ...x, t: toOut(x.t) })).filter((x) => x.t != null);
  const suggestions = suggest(rows, OW, OH);
  const entry = {
    kind: 'import', fps: FPS, w: OW, h: OH, n, duration: r3(n / FPS), src: path.resolve(file).startsWith(PIECE + path.sep) ? path.relative(PIECE, path.resolve(file)).split(path.sep).join('/') : path.basename(file),
    frames: `footage/${name}/f%05d.jpg`, audio, scale: 1,
    cuts: { mode: keepArg ? 'keep' : cutMode, source: r3(dur), removed, map },
    activity: rows.filter((x) => x.n >= 4).map((x) => [r3(x.t), Number(x.frac.toFixed(5))]),
    suggestions, events: [],
  };
  const jf = writeEntry(PIECE, name, entry);
  const sheet = noSheet ? null : await contactSheet(PIECE, name, entry, path.join(PIECE, 'footage', `${name}-sheet.jpg`));
  if (poster != null) console.log('poster', writePoster(PIECE, name, entry, poster));
  console.log(`${n} frames (${entry.duration}s) -> ${path.join(PIECE, 'footage', name)}${cut ? `; kept ${segs.length} segment(s), removed ${removed.length ? removed.map(([p, q]) => `${p}-${q}s`).join(', ') : 'outside --keep'}` : ''}`);
  if (audio) console.log('audio', path.join(PIECE, audio));
  console.log(`${suggestions.length} suggestion(s) (heuristic; check them on the sheet): ${suggestions.slice(0, 8).map((s, i) => `#${i} ${s.kind} ${s.t0}-${s.t1}s`).join(', ')}`);
  if (sheet) console.log('sheet', sheet);
  console.log('wrote', jf, `in ${((Date.now() - T0) / 1000).toFixed(1)}s`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e.message || e); process.exit(1); });
