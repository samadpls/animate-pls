#!/usr/bin/env node
// Record the user's own web app as footage, deterministically: Playwright drives scripted steps on a fake clock and
// takes one screenshot per output frame (never a real-time screen capture, which drops and repeats frames).
//   usage: node tools/record.mjs <piece> <name> <steps.json> [--fps 24] [--scale 2] [--poster [t]] [--no-sheet]
//   -> <piece>/footage/<name>/f00000.jpg ...  one JPEG per frame at the piece's fps
//      <piece>/footage.json  { <name>: { fps, w, h, n, duration, frames, scale, events, cursor, suggestions, ... } }
//      <piece>/footage/<name>-sheet.jpg     a contact sheet with the events marked
// steps.json (paths relative to the steps file; only a page or site the user owns):
//   { "url": "sample/studio.html", "viewport": [1280, 720], "scale": 2, "cursor": [640, 420], "date": "2026-01-15T09:00:00Z",
//     "blur": ["#email"], "hide": [".cookie-banner"], "dark": false,
//     "steps": [
//       { "pause": 0.6 },                          record 0.6 s as it is
//       { "click": "#name" },                      move the pointer there (eased, a gentle arc), press, release
//       { "type": "#name", "text": "Ada", "cps": 14 },   click the field if needed, then type (14 characters / s);
//                                                  "secret": true keeps the text out of footage.json
//       { "press": "Enter" },  { "hover": ".menu" },
//       { "scroll": 600 } | { "scroll": "#pricing" } | { "scroll": 600, "in": "#list" }   smooth, eased
//       { "wait": 400 } | { "wait": "#result" }    let the page run (fake clock) without recording it
//       { "mark": "#result" }                  log that element's box now (a zoom target that is the app's answer)
//       { "goto": "pricing.html" }
//     ] }
//   Any step takes "after": seconds recorded after it (default 0.25; 0 for none) and "move": the pointer's travel time.
// Deterministic: the page runs on Playwright's fake clock (Date, timers, requestAnimationFrame), stepped one frame at a
// time; CSS transitions and animations are paused and stepped on the same clock; the text caret is hidden. The pointer
// is not in the screenshots: its path and every click / typed field (with element boxes, in frame pixels) go to
// footage.json, and kit/footage.js draws a clean cursor and click rings from them, and zooms on the real events.
// deviceScaleFactor ("scale", default 2): frames are viewport x scale pixels, so a 2x zoom on a ~1600 px card stays sharp.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadPlaywright, pieceFps, writeEntry, freshDir, contactSheet, writePoster } from './footage.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : d; };
const flag = (k) => { const i = args.indexOf(k); return i >= 0 ? (args.splice(i, 1), true) : false; };
const fpsArg = opt('--fps', null), scaleArg = opt('--scale', null), noSheet = flag('--no-sheet');
let poster = null;
{ const i = args.indexOf('--poster'); if (i >= 0) { const v = args[i + 1]; if (v != null && /^[\d.]+$/.test(v)) { poster = Number(v); args.splice(i, 2); } else { poster = 0; args.splice(i, 1); } } }
const [pieceArg, name, stepsFile] = args;
if (!pieceArg || !name || !stepsFile) { console.error('usage: node tools/record.mjs <piece> <name> <steps.json> [--fps 24] [--scale 2] [--poster [t]] [--no-sheet]'); process.exit(2); }
if (!/^[a-z0-9][a-z0-9_-]*$/i.test(name)) { console.error(`name "${name}": use letters, digits, - and _`); process.exit(2); }
const PIECE = path.resolve(pieceArg), SPEC = JSON.parse(fs.readFileSync(stepsFile, 'utf8')), BASE = path.dirname(path.resolve(stepsFile));
const FPS = Number(fpsArg || SPEC.fps || pieceFps(PIECE)), DPR = Number(scaleArg || SPEC.scale || 2);
const [VW, VH] = SPEC.viewport || [1280, 720];
const r3 = (v) => Math.round(v * 1000) / 1000, px = (v) => Math.round(v * DPR);
const where = (u) => (/^[a-z][a-z0-9+.-]*:/i.test(u) ? u : pathToFileURL(path.resolve(BASE, u)).href);

// eases (cubic-bezier by bisection, the same shape the kit uses)
function bezier(x1, y1, x2, y2) {
  const bz = (a, b, t) => 3 * a * t * (1 - t) * (1 - t) + 3 * b * t * t * (1 - t) + t * t * t;
  return (u) => { if (u <= 0 || u >= 1) return Math.max(0, Math.min(1, u)); let lo = 0, hi = 1; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (bz(x1, x2, m) < u) lo = m; else hi = m; } return bz(y1, y2, (lo + hi) / 2); };
}
const moveEase = bezier(0.35, 0, 0.15, 1), scrollEase = bezier(0.45, 0, 0.25, 1);

const OUT = path.join(PIECE, 'footage', name);
freshDir(OUT);
const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: DPR, colorScheme: SPEC.dark ? 'dark' : 'light', locale: SPEC.locale || 'en-US', timezoneId: SPEC.timezone || 'UTC' });
const page = await context.newPage();
page.on('pageerror', (e) => console.error('PAGE ERROR:', e.message));
const T0 = Date.parse(SPEC.date || '2026-01-15T09:00:00Z');
await page.clock.install({ time: T0 });
await page.clock.pauseAt(T0 + 1000);

let frame = 0, clockMs = 0, cur = SPEC.cursor ? [...SPEC.cursor] : [VW / 2, VH * 0.62], lastShot = null;
const events = [], cursor = [], t = () => r3(frame / FPS);
const logCursor = () => cursor.push([t(), r3(cur[0] * DPR), r3(cur[1] * DPR)]);
// keep only the ends of each run where the pointer stands still (the kit interpolates between samples)
const squeeze = (P) => P.filter((p, i) => i === 0 || i === P.length - 1 || !(P[i - 1][1] === p[1] && P[i - 1][2] === p[2] && P[i + 1][1] === p[1] && P[i + 1][2] === p[2]));
async function css() {
  const rules = ['html { scroll-behavior: auto !important; }', '::-webkit-scrollbar { display: none; }', '* { caret-color: transparent !important; }'];
  for (const s of [].concat(SPEC.blur || [])) rules.push(`${s} { filter: blur(8px) !important; }`);
  for (const s of [].concat(SPEC.hide || [])) rules.push(`${s} { visibility: hidden !important; }`);
  await page.addStyleTag({ content: rules.join('\n') });
  // CSS transitions / animations and element.animate(): paused, then stepped on the fake clock
  await page.evaluate(() => {
    window.__ftStep = () => {
      const now = performance.now();
      for (const a of document.getAnimations()) {
        try {
          if (a.__ft == null) { a.__ft = now; a.pause(); }
          const ct = now - a.__ft, end = a.effect && a.effect.getComputedTiming ? a.effect.getComputedTiming().endTime : Infinity;
          if (Number.isFinite(end) && ct >= end) a.finish(); else a.currentTime = ct;
        } catch { /* a cancelled animation: skip */ }
      }
    };
  });
}
// advance the fake clock to this frame's time, then screenshot it
async function shoot() {
  const want = Math.round(frame * 1000 / FPS);
  if (want > clockMs) { await page.clock.runFor(want - clockMs); clockMs = want; }
  await page.evaluate(() => window.__ftStep && window.__ftStep());
  const buf = await page.screenshot({ type: 'jpeg', quality: 92, animations: 'allow', caret: 'hide', scale: 'device' });
  fs.writeFileSync(path.join(OUT, `f${String(frame).padStart(5, '0')}.jpg`), buf);
  lastShot = buf; logCursor(); frame++;
}
const record = async (sec) => { const n = Math.round(sec * FPS); for (let i = 0; i < n; i++) await shoot(); };
async function skip(ms) { await page.clock.runFor(ms); }   // the page runs, nothing is recorded (time is not added)
async function box(sel) {
  const loc = page.locator(sel).first();
  await loc.waitFor({ state: 'visible', timeout: 10000 });
  const b = await loc.boundingBox();
  if (!b) throw new Error(`no box for ${sel}`);
  return b;
}
// the pointer travels on a gentle arc with an ease, one mouse.move per frame (so hover states follow it)
async function moveTo(x, y, sec, k) {
  const a = [...cur], d = Math.hypot(x - a[0], y - a[1]);
  if (d < 1) return;
  const dur = sec ?? Math.min(1.0, Math.max(0.45, 0.32 + d / 1500)), n = Math.max(2, Math.round(dur * FPS));
  const side = k % 2 ? 1 : -1, nx = -(y - a[1]) / d, ny = (x - a[0]) / d, bow = Math.min(60, d * 0.07) * side;
  for (let j = 1; j <= n; j++) {
    const u = moveEase(j / n), arc = Math.sin(Math.PI * u) * bow;
    cur = [a[0] + (x - a[0]) * u + nx * arc, a[1] + (y - a[1]) * u + ny * arc];
    await page.mouse.move(cur[0], cur[1]);
    await shoot();
  }
  cur = [x, y];
}
const ebox = (b) => [px(b.x), px(b.y), px(b.width), px(b.height)];
async function ensureVisible(sel, k) {
  const b = await box(sel);
  if (b.y >= 0 && b.y + b.height <= VH) return;
  await scrollTo(sel, null, k);
}
async function scrollTo(target, inside, k, sec) {
  const get = (s) => (s ? document.querySelector(s).scrollTop : window.scrollY);
  const from = await page.evaluate(get, inside || null);
  let to = target;
  if (typeof target === 'string') to = await page.evaluate(([s, ins, vh]) => { const e = document.querySelector(s), r = e.getBoundingClientRect(); const top = ins ? document.querySelector(ins).scrollTop : window.scrollY; return Math.max(0, top + r.top - vh * 0.2); }, [target, inside || null, VH]);
  const dy = to - from, dur = sec ?? Math.min(1.4, Math.max(0.6, 0.5 + Math.abs(dy) / 1500)), n = Math.max(2, Math.round(dur * FPS)), t0 = t();
  for (let j = 1; j <= n; j++) {
    const y = from + dy * scrollEase(j / n);
    await page.evaluate(([y, ins]) => (ins ? (document.querySelector(ins).scrollTop = y) : window.scrollTo(0, y)), [y, inside || null]);
    await shoot();
  }
  events.push({ type: 'scroll', t0, t1: t(), from: px(from), to: px(to), ...(inside ? { sel: inside } : {}) });
}

async function goto(u, first) {
  await page.goto(where(u), { waitUntil: 'load', timeout: 60000 });
  if (first) {
    // Playwright's clock replays its log in every new document and counts the real milliseconds between install and
    // pauseAt into performance.now() (Date stays exact), so timers and requestAnimationFrame (on a 16 ms grid of those
    // ticks) would land a few ms differently each run. Measure that offset, log a correction, reload: the page then
    // always starts at performance.now() = 1000 and a fixed Date, and every run records the same frames.
    const L = await page.evaluate(() => performance.now());
    await page.clock.runFor(1000 - L);
    await page.clock.setSystemTime(T0 + 2000);
    await page.reload({ waitUntil: 'load', timeout: 60000 });
  }
  await page.evaluate(() => document.fonts.ready);
  await css();
  await skip(120);
}
const T_START = Date.now();
await goto(SPEC.url, true);
await page.mouse.move(cur[0], cur[1]);
for (const [k, st] of (SPEC.steps || []).entries()) {
  const after = st.after ?? (st.pause != null || st.wait != null || st.mark ? 0 : 0.25);
  if (st.goto) { await goto(st.goto); events.push({ type: 'goto', t: t(), url: st.goto }); }
  else if (st.pause != null) await record(Number(st.pause));
  else if (st.wait != null) {
    if (typeof st.wait === 'number') await skip(st.wait);
    else { for (let i = 0; i < 200 && !(await page.locator(st.wait).first().isVisible()); i++) await skip(50); }
  } else if (st.click || st.hover) {
    const sel = st.click || st.hover;
    await ensureVisible(sel, k);
    const b = await box(sel), x = b.x + b.width * (st.at ? st.at[0] : 0.5), y = b.y + b.height * (st.at ? st.at[1] : 0.5);
    await moveTo(x, y, st.move, k);
    if (st.hover) { events.push({ type: 'hover', t: t(), x: px(x), y: px(y), box: ebox(b), sel }); }
    else {
      await record(st.dwell ?? 0.15);
      await page.mouse.down();
      events.push({ type: 'click', t: t(), x: px(x), y: px(y), box: ebox(b), sel });
      await shoot();
      await page.mouse.up();
      await shoot();
    }
  } else if (st.type) {
    const sel = st.type;
    await ensureVisible(sel, k);
    const focused = await page.evaluate((s) => document.activeElement === document.querySelector(s), sel);
    if (!focused) {
      const b = await box(sel);
      await moveTo(b.x + Math.min(b.width * 0.5, 40), b.y + b.height / 2, st.move, k);
      await record(0.12); await page.mouse.down();
      events.push({ type: 'click', t: t(), x: px(cur[0]), y: px(cur[1]), box: ebox(b), sel });
      await shoot(); await page.mouse.up(); await record(0.2);
    }
    const b = await box(sel), text = String(st.text ?? ''), cps = st.cps ?? 14, t0 = t(), f0 = frame;
    let i = 0;
    while (i < text.length) {
      while (i < text.length && (f0 + (i / cps) * FPS) <= frame + 1e-6) { await page.keyboard.type(text[i]); i++; }
      await shoot();
    }
    events.push({ type: 'type', t0, t1: t(), box: ebox(b), sel, ...(st.secret ? { chars: text.length } : { text }) });
  } else if (st.press) {
    await page.keyboard.press(st.press);
    events.push({ type: 'press', t: t(), key: st.press });
    await shoot();
  } else if (st.scroll != null) await scrollTo(st.scroll, st.in, k, st.move);
  else if (st.mark) { const b = await box(st.mark); events.push({ type: 'mark', t: t(), box: ebox(b), sel: st.mark }); }
  else { console.error(`step ${k + 1}: unknown ${JSON.stringify(st)}`); process.exit(2); }
  if (after > 0) await record(after);
}
if (frame === 0) await shoot();
await browser.close();

// suggestions straight from the events: a zoom on each click and each typed field (the kit can use the events directly)
const suggestions = [];
for (const [i, e] of events.entries()) {
  if (e.type === 'click' && !events.some((q) => q.type === 'type' && q.sel === e.sel && q.t0 - e.t < 1)) suggestions.push({ t0: e.t, t1: e.t, kind: 'click', box: e.box, scale: 1.8, event: i });
  if (e.type === 'type') suggestions.push({ t0: e.t0, t1: e.t1, kind: 'type', box: e.box, scale: 2.2, event: i });
  if (e.type === 'scroll') suggestions.push({ t0: e.t0, t1: e.t1, kind: 'scroll', box: [0, 0, px(VW), px(VH)], scale: 1.0, event: i });
}
const entry = {
  kind: 'record', fps: FPS, w: px(VW), h: px(VH), n: frame, duration: r3(frame / FPS),
  src: path.relative(PIECE, path.resolve(stepsFile)).split(path.sep).join('/'), frames: `footage/${name}/f%05d.jpg`, audio: null,
  scale: DPR, viewport: [VW, VH], cuts: null, activity: [], suggestions, events, cursor: squeeze(cursor),
};
const jf = writeEntry(PIECE, name, entry);
console.log(`recorded ${frame} frames (${entry.duration}s) at ${FPS} fps, ${entry.w}x${entry.h} (viewport ${VW}x${VH} @${DPR}x) in ${((Date.now() - T_START) / 1000).toFixed(1)}s (${((Date.now() - T_START) / Math.max(1, frame)).toFixed(0)} ms/frame)`);
console.log(`${events.length} event(s): ${events.map((e) => `${e.type}${e.sel ? ' ' + e.sel : ''} @${e.t ?? e.t0}s`).join(', ')}`);
if (!noSheet) console.log('sheet', await contactSheet(PIECE, name, entry, path.join(PIECE, 'footage', `${name}-sheet.jpg`)));
if (poster != null) console.log('poster', writePoster(PIECE, name, entry, poster));
console.log('wrote', jf);
