#!/usr/bin/env node
// Reel checks (grammar/FORMATS.md F10): measured on a built and exported piece, so "it works as a reel" is a number.
//   usage: node tools/reel-check.mjs <piece dir> [--format 9:16] [--platforms tiktok,reels,shorts]
//   reads <piece>/index.html (the page: TIMELINE, TIMELINE.captions from kit/captions.js, VOICE) and the render
//   (renders/final.mp4 for the main format, renders/final-<w>x<h>.mp4 for another one; audio from the same file, or
//   renders/audio.wav)
//   R1 hook: frame 0 is a picture, not a flat fill (luma spread and edge energy against the piece's median), and the
//      first text (a caption or any drawn string) is on screen by 1.0 s                                 [FAIL]
//   R2 safe zone: every caption chunk clear of the phone UI, from tools/safezones.mjs (the same zone as textcheck and
//      review: piece.json review.safe for the main format > the profile of review.platforms or --platforms, default
//      'all' > TIMELINE.safe). 'all' on 9:16 is the union of TikTok, Instagram Reels and YouTube Shorts: x 120–888,
//      y 288–1248, and left of x 780 below y 840. Checked on the declared boxes (TIMELINE.captions) and on the text
//      traced while the captions draw, and names the platforms that would hide a chunk                    [FAIL]
//   R3 timing: with a voice-over, each chunk appears within 2 frames of its first word, and the highlight moves to
//      each word within 2 frames of the word (default lettering)                                         [FAIL]
//   R4 size: every caption is at least 50 px tall in font size at 1080 wide (traced: font px x transform)   [FAIL]
//   R5 length: 15–35 s is the sweet spot; up to 90 s passes; over 90 s WARN (reach), over 180 s WARN (Shorts cap)
//   R6 end hold: the still stretch at the end is at most 1.4 s (judged like review's dead beats)        [FAIL]
//   R7 loudness: ffmpeg ebur128: integrated -16..-13 LUFS and true peak <= -1 dBTP, else WARN (no platform publishes a
//      target; -14 LUFS / -1 dBTP is the common advice)
//   R8 loop: the last frame against frame 0 (informational, or PASS/FAIL when TIMELINE.reel.loop is true)
// Prints PASS / WARN / FAIL / INFO lines and `reel: PASS (n/m)`; exits 1 on any FAIL.
import { createRequire } from 'node:module';
import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { safeZone, hidden, NAMES } from './safezones.mjs';

const require = createRequire(import.meta.url);
const { chromium } = (() => { try { return require('playwright'); } catch { return require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); } })();
const argv = process.argv.slice(2);
const fi = argv.indexOf('--format'), FORMAT = fi >= 0 ? argv.splice(fi, 2)[1] : null;
const pi = argv.indexOf('--platforms'), PLATFORMS = pi >= 0 ? argv.splice(pi, 2)[1] : null;
if (!argv[0]) { console.error('usage: node tools/reel-check.mjs <piece dir> [--format 9:16] [--platforms tiktok,reels,shorts]'); process.exit(2); }
const ROOT = path.resolve(argv[0]);
const PIECE = fs.existsSync(path.join(ROOT, 'piece.json')) ? JSON.parse(fs.readFileSync(path.join(ROOT, 'piece.json'), 'utf8')) : {};
const MAIN = (PIECE.formats || [])[0];

// ---- the page: timeline, captions, the text drawn early, the caption text traced at each chunk, onsets
const browser = await chromium.launch(), page = await browser.newPage();
page.on('pageerror', (e) => console.error('PAGE ERROR:', e.message));
await page.goto(pathToFileURL(path.join(ROOT, 'index.html')).href + '?export=1' + (FORMAT ? `&format=${encodeURIComponent(FORMAT)}` : ''));
await page.waitForFunction(() => window.TIMELINE && window.renderFrame, null, { timeout: 30000 });
await page.evaluate(() => document.fonts.ready);
const P = await page.evaluate(() => {
  const T = window.TIMELINE, W = T.width, H = T.height, fps = T.fps, Pr = CanvasRenderingContext2D.prototype;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  window.renderFrame(0, cv);   // builds the caption list when it waits for the first frame
  const capOn = () => { try { return typeof capBusy !== 'undefined' && capBusy; } catch (e) { return false; } };
  let rec = [];
  const wrap = (name) => {
    const orig = Pr[name];
    Pr[name] = function (str, x, y, maxW) {
      const s = String(str).trim();
      if (s && this.canvas.width === W && this.canvas.height === H && this.globalAlpha > 0.05) {
        const m = this.measureText(String(str)), w = maxW != null ? Math.min(m.width, maxW) : m.width;
        const al = this.textAlign, x0 = al === 'center' ? x - w / 2 : al === 'right' || al === 'end' ? x - w : x;
        const asc = m.actualBoundingBoxAscent || 0, desc = m.actualBoundingBoxDescent || 0, tf = this.getTransform();
        const pad = name === 'strokeText' ? this.lineWidth / 2 : 0;
        const pts = [[x0 - pad, y - asc - pad], [x0 + w + pad, y - asc - pad], [x0 + w + pad, y + desc + pad], [x0 - pad, y + desc + pad]].map(([px, py]) => [tf.a * px + tf.c * py + tf.e, tf.b * px + tf.d * py + tf.f]);
        const px = Number((/(\d+(?:\.\d+)?)px/.exec(this.font) || [])[1] || 0) * Math.sqrt(Math.abs(tf.a * tf.d - tf.b * tf.c));
        rec.push({ s, cap: capOn(), name, fill: String(this.fillStyle), px, x0: Math.min(...pts.map((p) => p[0])), y0: Math.min(...pts.map((p) => p[1])), x1: Math.max(...pts.map((p) => p[0])), y1: Math.max(...pts.map((p) => p[1])) });
      }
      return orig.apply(this, arguments);
    };
    return () => { Pr[name] = orig; };
  };
  const undo = [wrap('fillText'), wrap('strokeText')];
  const frame = (f) => { rec = []; window.renderFrame(f / fps, cv); return rec; };
  // the first frame with text on it (any string of 2+ characters), and the first with a caption
  let firstText = null, firstCap = null;
  for (let f = 0; f < Math.min(T.frames, Math.round(1.5 * fps)) && (firstText == null || firstCap == null); f++) {
    const r = frame(f);
    if (firstText == null && r.some((b) => b.s.length > 1)) firstText = f / fps;
    if (firstCap == null && r.some((b) => b.cap)) firstCap = f / fps;
  }
  // the pixels: frame 0's luma spread (on the canvas, full size)
  const caps = (T.captions || []).map((c) => {
    const f = Math.min(T.frames - 1, Math.round(Math.min(c.t0 + 0.3, (c.t0 + c.t1) / 2) * fps));
    const r = frame(f).filter((b) => b.cap);
    const box = r.length ? [Math.min(...r.map((b) => b.x0)), Math.min(...r.map((b) => b.y0)), Math.max(...r.map((b) => b.x1)), Math.max(...r.map((b) => b.y1))] : null;
    return { ...c, traced: box, px: r.length ? Math.min(...r.filter((b) => b.name === 'fillText').map((b) => b.px)) : null, at: f / fps };
  });
  // onsets (with a voice): the frame each chunk first shows, and the frame each word first takes the highlight
  const hasVoice = typeof VOICE !== 'undefined';
  const styled = typeof STYLE !== 'undefined' && typeof STYLE.caption === 'function';
  let fill = null; try { fill = capCache && capCache.o.fill; } catch (e) { /* no kit/captions.js */ }
  const norm = (c) => { const x = document.createElement('canvas').getContext('2d'); x.fillStyle = c; return String(x.fillStyle); };
  const onsets = [];
  if (hasVoice) {
    // judged against the voice's own word times (voice.json), word k of the captions = word k of the voice. A word the
    // recogniser could not hear has no length there (voice.mjs fills it in) and is skipped
    const vw = VOICE.lines.flatMap((l) => (l.words || []).filter((w) => String(w.w).trim()));
    let k0 = 0;
    for (const c of T.captions || []) {
      const strs = c.text.split(' '), V = vw.slice(k0, k0 + c.words.length); k0 += c.words.length;
      const heard = (v) => v && v.t1 - v.t0 >= 0.05;
      let chunkOn = null;
      if (heard(V[0])) for (let f = Math.max(0, Math.round(V[0].t0 * fps) - 3); f <= Math.round(V[0].t0 * fps) + 3 && chunkOn == null; f++) if (frame(f).some((b) => b.cap && b.s === strs[0])) chunkOn = f / fps;
      const words = [];
      if (!styled && fill) V.forEach((v, k) => {
        if (!heard(v)) { words.push({ w: strs[k], skip: true }); return; }
        let on = null;
        for (let f = Math.max(0, Math.round(v.t0 * fps) - 3); f <= Math.round(v.t0 * fps) + 3 && on == null; f++) if (frame(f).some((b) => b.cap && b.name === 'fillText' && b.s === strs[k] && b.fill !== norm(fill))) on = f / fps;
        words.push({ w: strs[k], t0: v.t0, on });
      });
      onsets.push({ text: c.text, t0: V[0] ? V[0].t0 : c.t0, on: chunkOn, words, skip: !heard(V[0]) });
    }
  }
  undo.forEach((u) => u());
  window.renderFrame(0, cv);
  const d = cv.getContext('2d').getImageData(0, 0, W, H).data;
  let n = 0, s = 0, s2 = 0;
  for (let i = 0; i < d.length; i += 4 * 7) { const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; n++; s += l; s2 += l * l; }
  const sd = Math.sqrt(Math.max(0, s2 / n - (s / n) ** 2));
  return { W, H, fps, frames: T.frames, duration: T.duration ?? T.frames / fps, reel: T.reel || {}, safe: T.safe || null, captionSafe: T.captionSafe || null, caps, firstText, firstCap, onsets, hasVoice, styled, sd };
});
await browser.close();

const { W, H, fps } = P;
const VIDEO = path.join(ROOT, 'renders', FORMAT && FORMAT !== MAIN ? `final-${W}x${H}.mp4` : 'final.mp4');
const haveVideo = fs.existsSync(VIDEO);
const results = [];
const say = (v, id, text) => { results.push(v); console.log(`  ${v.padEnd(4)}  ${id} ${text}`); };
console.log(`\nREEL (${haveVideo ? path.relative(ROOT, VIDEO) : 'no render: run export.mjs first'}, ${W}x${H}, ${P.duration.toFixed(2)}s, ${P.caps.length} caption chunks${P.captionSafe ? ` from the ${P.captionSafe.source}` : ''})`);

// ---- the render: small grey frames for the pixel checks
const SW = 96, SH = Math.round((96 * H) / W / 2) * 2, PX = SW * SH;
const raw = haveVideo ? spawnSync('ffmpeg', ['-v', 'error', '-i', VIDEO, '-vf', `scale=${SW}:${SH},format=gray`, '-f', 'rawvideo', '-'], { maxBuffer: 1 << 29 }).stdout : null;
const nF = raw ? raw.length / PX : 0;
const fdiff = (a, b) => { let d = 0; for (let i = 0; i < PX; i++) d += Math.abs(raw[a * PX + i] - raw[b * PX + i]); return d / PX; };
const edge = (f) => { let e = 0; for (let y = 0; y < SH - 1; y++) for (let x = 0; x < SW - 1; x++) { const i = f * PX + y * SW + x; e += Math.abs(raw[i] - raw[i + 1]) + Math.abs(raw[i] - raw[i + SW]); } return e / ((SW - 1) * (SH - 1)); };
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };

// R1 hook
{
  const e0 = raw ? edge(0) : null, emed = raw ? median(Array.from({ length: Math.min(nF, 400) }, (_, i) => edge(Math.floor(i * nF / Math.min(nF, 400))))) : null;
  const flat = P.sd < 10 || (e0 != null && e0 < 0.5 * emed);
  const late = P.firstText == null || P.firstText > 1.0 + 1e-6;
  say(flat || late ? 'FAIL' : 'PASS', 'R1 hook:', `frame 0 luma spread ${P.sd.toFixed(1)} (needs >= 10)${e0 != null ? `, edge energy ${e0.toFixed(2)} vs the piece's median ${emed.toFixed(2)} (needs >= 0.5x)` : ''}; first text at ${P.firstText == null ? 'none in 1.5s' : P.firstText.toFixed(2) + 's'}, first caption at ${P.firstCap == null ? 'none in 1.5s' : P.firstCap.toFixed(2) + 's'} (text needs <= 1.0s)`);
}

// R2 safe zone (tools/safezones.mjs: the zone textcheck and review use)
{
  const z = safeZone({ width: W, height: H, safe: P.safe }, PIECE, { format: FORMAT, platforms: PLATFORMS });
  const why = (b) => {
    if (!b || !z) return null;
    const h = hidden({ x0: b[0], y0: b[1], x1: b[2], y1: b[3] }, z, W, H);
    return h ? `${h.bands.join(', ')}${h.platforms && h.platforms.length ? ` (hidden on ${h.platforms.map((n) => NAMES[n]).join(', ')})` : ''} [${b.map((v) => v.toFixed(0)).join(', ')}]` : null;
  };
  const bad = [];
  for (const c of P.caps) { const a = why(c.box), b = why(c.traced); if (a || b) bad.push(`"${c.text}" at ${c.t0.toFixed(2)}s: ${a ? 'declared box in ' + a : ''}${a && b ? '; ' : ''}${b ? 'traced text in ' + b : ''}`); }
  const area = z ? `x ${z.left}–${W - z.right}, y ${z.top}–${H - z.bottom}${z.rail ? `, left of x ${z.rail.x0} below y ${z.rail.y0}` : ''} (${z.from})` : 'the frame (no safe zone known)';
  if (!P.caps.length) say('FAIL', 'R2 safe zone:', 'no caption chunks (add "kit/captions.js" to piece.json "build" and a CAPTION_SCRIPT or a voice)');
  else say(bad.length ? 'FAIL' : 'PASS', 'R2 safe zone:', `${P.caps.length - bad.length}/${P.caps.length} chunks clear inside ${area}`);
  for (const b of bad.slice(0, 8)) console.log(`          ${b}`);
}

// R3 timing (voice)
{
  if (!P.hasVoice) say('INFO', 'R3 timing:', 'no voice-over: the captions follow the script (CAPTION_SCRIPT), so there is nothing to sync');
  else {
    const tol = 2 / fps + 1e-6, bad = [];
    let nW = 0, nC = 0, skipped = 0;
    for (const o of P.onsets) {
      if (o.skip) skipped++;
      else { nC++; if (o.on == null || Math.abs(o.on - o.t0) > tol) bad.push(`chunk "${o.text}" ${o.on == null ? 'not shown within 3 frames' : `shows at ${o.on.toFixed(3)}s`} (first word said at ${o.t0.toFixed(3)}s)`); }
      for (const w of o.words) { if (w.skip) { skipped++; continue; } nW++; if (w.on == null || Math.abs(w.on - w.t0) > tol) bad.push(`word "${w.w}" ${w.on == null ? 'not lit within 3 frames' : `lit at ${w.on.toFixed(3)}s`} (said at ${w.t0.toFixed(3)}s)`); }
    }
    say(bad.length ? 'FAIL' : 'PASS', 'R3 timing:', `${nC} chunk onsets${nW ? ` and ${nW} word highlights` : P.styled ? ' (the style letters the words: highlights not traced)' : ''} within 2 frames of the voice (voice.json)${skipped ? `; ${skipped} skipped: no length in voice.json (not heard), so the captions give them time themselves` : ''}`);
    for (const b of bad.slice(0, 8)) console.log(`          ${b}`);
  }
}

// R4 size
{
  const k = 1080 / W, sizes = P.caps.map((c) => (c.px ?? c.size) * k), min = sizes.length ? Math.min(...sizes) : null;
  say(min == null ? 'FAIL' : min >= 50 ? 'PASS' : 'FAIL', 'R4 size:', min == null ? 'no captions traced' : `smallest caption ${min.toFixed(0)} px at 1080 wide (needs >= 50), largest ${Math.max(...sizes).toFixed(0)} px; ${P.caps.filter((c) => c.fit && c.fit !== 'ok').length} chunk(s) fitted below the 64 px minimum`);
}

// R5 length
{
  const d = haveVideo ? Number(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', VIDEO], { encoding: 'utf8' }).stdout) || P.duration : P.duration;
  const v = d > 90 ? 'WARN' : d < 15 ? 'WARN' : 'PASS';
  const note = d > 180 ? 'over 180 s: a long-form video on Shorts, and reach drops on Reels' : d > 90 ? 'over 90 s: Reels reach reportedly falls off' : d < 15 ? 'under 15 s: fine for a looper or a clip, short for a story' : d > 35 ? '15–90 s passes; 15–35 s is the sweet spot' : 'in the 15–35 s sweet spot';
  say(v, 'R5 length:', `${d.toFixed(2)}s (${note})`);
}

// R6 end hold
{
  if (!raw) say('FAIL', 'R6 end hold:', 'no render to measure');
  else {
    const lag = Math.round(fps / 2), pts = [];
    for (let f = lag; f < nF; f++) pts.push(fdiff(f, f - lag));
    const thr = Math.max(0.8, 0.25 * median(pts));
    let f = nF - 1; while (f >= lag && fdiff(f, f - lag) < thr) f--;
    if (f === nF - 1) f = nF - lag;   // still changing on the last frame: no hold
    const hold = Math.max(0, (nF - f + lag - 1) / fps), decl = P.reel.endHold;   // the last change sits between f - lag and f
    say(hold <= 1.4 + 1e-6 && (decl == null || decl <= 1.4 + 1e-6) ? 'PASS' : 'FAIL', 'R6 end hold:', `${hold.toFixed(2)}s still at the end (measured: change over 0.5s below ${thr.toFixed(2)}, a quarter of the median${decl != null ? `; TIMELINE.reel.endHold ${decl}s` : ''}; needs <= 1.4s)`);
  }
}

// R7 loudness
{
  const wav = path.join(ROOT, 'renders', 'audio.wav'), src = haveVideo ? VIDEO : fs.existsSync(wav) ? wav : null;
  const has = /\bebur128\b/.test(spawnSync('ffmpeg', ['-hide_banner', '-filters'], { encoding: 'utf8' }).stdout || '');
  if (!src || !has) say('INFO', 'R7 loudness:', !src ? 'no audio to measure' : 'this ffmpeg has no ebur128 filter');
  else {
    const eb = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', src, '-map', '0:a:0', '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' }).stderr || '';
    const num = (re) => { const m = eb.match(re); return m ? Number(m[1]) : null; };
    const I = num(/Integrated loudness:[\s\S]*?I:\s+(-?[\d.]+) LUFS/), TP = num(/True peak:[\s\S]*?Peak:\s+(-?[\d.]+) dBFS/);
    if (I == null) say('INFO', 'R7 loudness:', `no audio stream in ${path.basename(src)}`);
    else say(I >= -16 && I <= -13 && (TP == null || TP <= -1) ? 'PASS' : 'WARN', 'R7 loudness:', `${I.toFixed(1)} LUFS integrated, true peak ${TP != null ? TP.toFixed(1) + ' dBTP' : 'n/a'} (want -16..-13 LUFS, peak <= -1 dBTP; no platform publishes a target, -14 is the common advice)`);
  }
}

// R8 loop
{
  if (!raw) say('INFO', 'R8 loop:', 'no render to measure');
  else {
    const typical = median(Array.from({ length: Math.min(40, nF - 1) }, (_, i) => fdiff(i + 1, i))), seam = fdiff(nF - 1, 0);
    const ok = seam <= Math.max(1.5 * typical, 1.0);
    say(P.reel.loop ? (ok ? 'PASS' : 'FAIL') : 'INFO', 'R8 loop:', `last frame vs frame 0: ${seam.toFixed(2)} (a typical step is ${typical.toFixed(2)}; a seamless loop needs <= 1.5x)${P.reel.loop ? '' : ' — TIMELINE.reel.loop is off, so this is information'}`);
  }
}

const judged = results.filter((r) => r !== 'INFO'), pass = judged.filter((r) => r === 'PASS').length, warn = judged.filter((r) => r === 'WARN').length, fail = judged.filter((r) => r === 'FAIL').length;
console.log(`reel: ${fail ? 'FAIL' : 'PASS'} (${pass}/${judged.length}${warn ? `, ${warn} WARN` : ''})`);
process.exit(fail ? 1 : 0);
