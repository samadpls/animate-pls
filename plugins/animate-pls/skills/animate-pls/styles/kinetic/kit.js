// =====================================================================
//  styles/kinetic/kit.js — kinetic typography for reels and launch posts. Huge bold condensed words on a flat
//  ground (a warm black, an off-white paper or a signal yellow), ONE pop colour that only marks the keyword (a box
//  behind ink text) or a sticker, flat die-cut stickers (asterisk, arrow, dot, tick, underline swipe, emphasis
//  marks), and a pop asterisk with eyes as the hero. Motion on 1s: slams, center-builds, flips, count-ups, swipes
//  and word-by-word reveals, all on easeOutExpo / easeOutBack and springs. No texture: the type is the medium.
//  Built on kit/core.js (RNG, EZ, SPRING, springTrack, ellipsePts, subPath, TT / F / E0 / DEFER / SPARK_AT,
//  LX / LY / UNIT / PORTRAIT / WIDE). Needs from the piece head: W, H, FPS (BEAT and SAFE if present).
//  Optional before the kit (e.g. src/options.js listed before "style" in piece.json "build"):
//    const BRAND = { bg, fg, accent, display, weight, squeeze }   the user's ground, text colour, pop colour, display face
//    const KIN_GROUND = 'ink' | 'paper' | 'signal'                 the default ground
//  Fonts are system fonts only: the display face is the first installed of a condensed list (Impact,
//  Haettenschweiler, Arial Narrow, Liberation Sans Narrow, ...); a wide fallback is squeezed horizontally, so
//  every OS sets narrow. Every string is measured and fit with ctx.measureText (cached per string + font).
//  Credits: no code ported. The optional brand-token idea comes from HeyGen's HyperFrames theme contract
//  (Apache-2.0; idea only). easeOutExpo / easeOutBack are the standard curves. See STYLE.md.
// =====================================================================

// ---- palette: three grounds and one pop -------------------------------------------------------------
const KIN_BR = typeof BRAND !== 'undefined' && BRAND ? BRAND : {};
const KIN = {
  ink: '#17130f',                    // warm black: the night ground, and every word on a light ground
  paper: '#f4efe4',                  // off-white: the day ground, words on the dark ground, the stickers' die-cut rim
  signal: '#ffd319',                 // signal yellow: the loud ground
  pop: KIN_BR.accent || '#ff3d7f',   // the ONE pop colour: the keyword's box, the hero, a sticker
};
const KIN_GROUNDS = { ink: KIN.ink, paper: KIN.paper, signal: KIN.signal };
if (KIN_BR.bg) KIN_GROUNDS.brand = KIN_BR.bg;
const KIN_G0 = typeof KIN_GROUND !== 'undefined' ? KIN_GROUND : KIN_BR.bg ? 'brand' : 'ink';

// ---- colour maths (WCAG 2): the contrast rule is measured, not eyeballed ------------------------------
function kinRGB(c) {
  c = String(c).trim();
  if (c[0] === '#') { if (c.length === 4) c = '#' + [...c.slice(1)].map((h) => h + h).join(''); return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); }
  const m = c.match(/[\d.]+/g); return m ? m.slice(0, 3).map(Number) : [0, 0, 0];
}
const kinHex = (c) => '#' + kinRGB(c).map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
function kinLum(c) {
  const k = [0.2126, 0.7152, 0.0722];
  return kinRGB(c).reduce((a, v, i) => { v /= 255; return a + k[i] * (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); }, 0);
}
function kinContrast(a, b) { const x = kinLum(a), y = kinLum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
// the text colour for a ground: the brand's fg when it passes 4.5:1, else ink or paper, whichever contrasts more
function kinOn(bg) {
  if (KIN_BR.fg && kinContrast(KIN_BR.fg, bg) >= 4.5) return KIN_BR.fg;
  return kinContrast(KIN.ink, bg) >= kinContrast(KIN.paper, bg) ? KIN.ink : KIN.paper;
}
if (kinContrast(kinOn(KIN.pop), KIN.pop) < 4.5) console.warn(`kinetic: pop ${KIN.pop} reaches only ${kinContrast(kinOn(KIN.pop), KIN.pop).toFixed(2)}:1 with ink or paper; keyword text needs 4.5:1`);

// the current ground (set by kinGround at the top of every scene; reset after every frame by STYLE.post)
let KIN_NOW = { bg: KIN_GROUNDS[KIN_G0] || KIN.ink, fg: kinOn(KIN_GROUNDS[KIN_G0] || KIN.ink) };
const kinFg = () => KIN_NOW.fg;
function kinGround(name = KIN_G0) {
  const bg = KIN_GROUNDS[name] || name;
  KIN_NOW = { bg, fg: kinOn(bg), name };
  fillAll(bg);
  return KIN_NOW;
}

// ---- the display face: the first installed of a condensed list, measured once ------------------------
const KIN_STACK = 'Impact, Haettenschweiler, "Arial Narrow", "Liberation Sans Narrow", "Nimbus Sans Narrow", "DejaVu Sans Condensed", "Arial Black", "Helvetica Neue", "DejaVu Sans", Arial, sans-serif';
const KIN_FONTS = [   // [family, weight, horizontal squeeze so a wide face still sets condensed]
  ['Impact', 400, 1], ['Haettenschweiler', 400, 1], ['Arial Narrow', 700, 1], ['Liberation Sans Narrow', 700, 1],
  ['Nimbus Sans Narrow', 700, 1], ['DejaVu Sans Condensed', 800, 0.88], ['Arial Black', 900, 0.78],
  ['Helvetica Neue', 800, 0.8], ['DejaVu Sans', 800, 0.76], ['Arial', 800, 0.78],   // Linux: Arial resolves to Liberation Sans
];
const KIN_MC = document.createElement('canvas').getContext('2d');   // the measuring context (never drawn)
function kinHas(fam) {   // is a system family installed? (its metrics differ from the generic fallbacks)
  const probe = (f) => { KIN_MC.font = `72px ${f}`; return KIN_MC.measureText('mmmmmmmmmmlliWW@#0').width; };
  return ['monospace', 'serif'].some((g) => Math.abs(probe(`"${fam}", ${g}`) - probe(g)) > 0.5);
}
const KIN_FACE = (() => {
  if (KIN_BR.display) return { fam: `${KIN_BR.display}, ${KIN_STACK}`, wt: KIN_BR.weight ?? 800, sq: KIN_BR.squeeze ?? 1, name: KIN_BR.display };
  for (const [f, wt, sq] of KIN_FONTS) if (kinHas(f)) return { fam: `"${f}", ${KIN_STACK}`, wt, sq, name: f };
  return { fam: KIN_STACK, wt: 800, sq: 0.8, name: 'sans-serif' };
})();
window.FONTS_OK = `kinetic display face: ${KIN_FACE.name}`;   // tile.mjs prints it
const kinFont = (size, o = {}) => `${o.wt ?? KIN_FACE.wt} ${Math.max(1, size).toFixed(2)}px ${o.fam ?? KIN_FACE.fam}`;
const KIN_RTL = /[֐-ࣿיִ-﷿ﹰ-﻿]/;   // Hebrew, Arabic, Urdu, Persian ranges
const kinDir = (str, o = {}) => o.dir ?? (KIN_RTL.test(str) ? 'rtl' : 'ltr');

// measureText, cached per string + font + tracking + direction: { w (before squeeze), asc, desc }
const KIN_MEM = new Map();
function kinMeasure(str, size, o = {}) {
  const font = kinFont(size, o), tr = (o.track ?? 0) * size, dir = kinDir(str, o), key = `${font}|${tr}|${dir}|${str}`;
  let m = KIN_MEM.get(key);
  if (!m) {
    KIN_MC.font = font; KIN_MC.letterSpacing = `${tr}px`; KIN_MC.direction = dir;
    const r = KIN_MC.measureText(str);
    m = { w: r.width, asc: r.actualBoundingBoxAscent, desc: r.actualBoundingBoxDescent };
    if (KIN_MEM.size > 4000) KIN_MEM.clear();
    KIN_MEM.set(key, m);
  }
  return m;
}
const kinCapK = (o = {}) => kinMeasure('H', 100, o).asc / 100;   // cap height per px of size
// the size that sets str exactly maxW wide (squeeze included), capped at o.max. strs may be a list (fit them all)
function kinFit(strs, maxW, o = {}) {
  const sq = o.sq ?? KIN_FACE.sq;
  return [].concat(strs).reduce((s, str) => Math.min(s, Math.floor(200 * maxW / Math.max(1, kinMeasure(str, 100, o).w * sq)) / 2), o.max ?? 1e9);
}
const kinW = (str, size, o = {}) => kinMeasure(str, size, o).w * (o.sq ?? KIN_FACE.sq);

// ---- easing and springs (closed form, so any frame renders alone) ---------------------------------------
const kinExpo = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));    // easeOutExpo
const kinBack = (t) => EZ.back(t);                                                  // easeOutBack
function kinKick(t, t0, k = 300, z = 0.3) {   // 0 -> +1 -> -... -> 0: a squash or a wobble after an impact
  if (t <= t0) return 0;
  const w0 = Math.sqrt(k), wd = w0 * Math.sqrt(1 - z * z), s = t - t0;
  return Math.exp(-z * w0 * s) * Math.sin(wd * s);
}
const kinBeatT = () => (typeof BEAT !== 'undefined' ? BEAT : 0.5);
const kinPulse = (t0 = 0, every = kinBeatT()) => (TT < t0 ? 0 : Math.exp(-mod(TT - t0, every) * 9));   // 1 on each beat, decaying

// ---- the motion vocabulary ---------------------------------------------------------------------------------
// shake: a tiny jolt after an impact at t0 that dies within 0.3s (a new offset every frame, seeded)
function kinShake(t0, key = 's', amt = 1) {
  const u = TT - t0; if (u < 0 || u > 0.32) return { dx: 0, dy: 0, rot: 0 };
  const R = RNG('kshake', key, F), a = 7 * UNIT * amt * Math.exp(-u * 13);
  return { dx: R.n(a), dy: R.n(a), rot: R.n(0.012 * amt) };
}
// slam: a word lands at t0: scale 1.3 -> 1 in ~0.2s (easeOutExpo) plus the shake
function kinSlam(t0, key = 's', amt = 1) {
  const u = TT - t0; if (u < 0) return null;
  return { k: 1 + 0.3 * amt * (1 - kinExpo(u / 0.22)), ...kinShake(t0, key, amt) };
}
// pop: a word arrives at t0 (word-by-word reveals): scale 0.6 -> 1 on easeOutBack in 0.18s, rising a little
function kinPop(t0, d = 0.18) { const u = (TT - t0) / d; if (u < 0) return null; const e = kinBack(u); return { k: 0.6 + 0.4 * e, dy: (1 - Math.min(1, e)) * 18 * UNIT, rot: 0 }; }
// type-swap: list = [[t, 'WORD'], ...]: the word folds shut (scaleY 1 -> 0, 0.08s) and the next opens (0.16s, back)
function kinSwap(list) {
  let i = -1; for (let j = 0; j < list.length; j++) if (TT >= list[j][0]) i = j;
  if (i < 0) return { s: list[0][1], sy: 0, i };
  const next = list[i + 1], shut = next ? clamp((next[0] - TT) / 0.08) : 1, open = i > 0 ? kinBack((TT - list[i][0]) / 0.16) : 1;
  return { s: list[i][1], sy: Math.min(open, EZ.o2(shut)), i };
}
// count-up: a number from a to b over [t0, t0 + d] on easeOutExpo, formatted ({ dec, sep, pre, post })
function kinNum(v, o = {}) {
  const dec = o.dec ?? 0; let s = (Math.round(v * 10 ** dec) / 10 ** dec).toFixed(dec);
  if (o.sep) { const [a, b] = s.split('.'); s = a.replace(/\B(?=(\d{3})+(?!\d))/g, o.sep) + (b ? '.' + b : ''); }
  return (o.pre ?? '') + s + (o.post ?? '');
}
const kinCount = (t0, d, a, b, o = {}) => kinNum(lerp(a, b, kinExpo(clamp((TT - t0) / d))), o);
// highlight swipe: 0..1 progress of the keyword box wiping in from t0 over d
const kinSwipe = (t0, d = 0.28) => kinExpo(clamp((TT - t0) / d));

// ---- type --------------------------------------------------------------------------------------------------
// kinText(str, x, y, size, o): one word or line, (x, y) on the baseline, o.align 'left' | 'center' | 'right'.
//   o: { color, stroke (an outline row: stroke colour, no fill), sw, edge (a stroke under the fill), k (scale about
//   the word's centre), sy (flip), rot, dx, dy, al, dir ('rtl' for Urdu / Arabic / Hebrew, auto-detected), track }
//   Returns the box on screen before scale: { w, x0, x1, y, top, cap }.
function kinText(str, x, y, size, o = {}) {
  str = String(str);
  const m = kinMeasure(str, size, o), sq = o.sq ?? KIN_FACE.sq, w = m.w * sq, cap = kinCapK(o) * size;
  const al = o.align ?? 'left', x0 = al === 'center' ? x - w / 2 : al === 'right' ? x - w : x;
  const box = { w, x0, x1: x0 + w, y, top: y - cap, cap, size };
  const k = o.k ?? 1, sy = o.sy ?? 1;
  if (k * Math.abs(sy) < 0.02 || (o.al ?? 1) <= 0.02 || !str.trim()) return box;
  ctx.save();
  ctx.translate(x0 + w / 2 + (o.dx ?? 0), y - cap / 2 + (o.dy ?? 0));
  if (o.rot) ctx.rotate(o.rot);
  ctx.scale(k * sq, k * sy);
  ctx.globalAlpha *= o.al ?? 1;
  ctx.font = kinFont(size, o); ctx.letterSpacing = `${(o.track ?? 0) * size}px`; ctx.direction = kinDir(str, o);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round'; ctx.miterLimit = 2;
  const tx = -m.w / 2, ty = cap / 2;
  if (o.edge) { ctx.strokeStyle = o.edge; ctx.lineWidth = (o.ew ?? size * 0.14) / k; ctx.strokeText(str, tx, ty); }
  if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = (o.sw ?? Math.max(3, size * 0.03)) / k; ctx.strokeText(str, tx, ty); }
  else { ctx.fillStyle = o.color ?? kinFg(); ctx.fillText(str, tx, ty); }
  ctx.restore();
  return box;
}

// the keyword: a pop box behind INK text, wiping in from the left (u 0..1). Scarce: one box on screen per frame —
// a second keyword in the same frame is set without a box (KIN_BOXES counts them; STYLE.post resets it).
let KIN_BOXES = 0;
// the box around a word: padded from its cap height, or from its own ink (o.asc / o.desc) when that reaches further
// (Urdu and Arabic letters climb and drop well past a Latin cap)
function kinBoxRect(x0, w, y, cap, o = {}) {
  const px = cap * (o.padX ?? 0.2), pt = cap * (o.padY ?? 0.17), pb = cap * (o.padB ?? 0.2);
  const top = Math.max(cap, o.asc ?? 0) + pt, bot = Math.max(pb, (o.desc ?? 0) + cap * 0.1);
  return { x: x0 - px, y: y - top, w: w + 2 * px, h: top + bot };
}
// o.ref: size the box for this string instead (a count-up keeps one box from 0 to 120); o.u: the swipe (0..1)
function kinKey(str, x, y, size, o = {}) {
  str = String(str);
  const sq = o.sq ?? KIN_FACE.sq, m = kinMeasure(str, size, o), w = m.w * sq, wb = o.ref != null ? kinW(String(o.ref), size, o) : w, cap = kinCapK(o) * size;
  const al = o.align ?? 'left', x0 = al === 'center' ? x - wb / 2 : al === 'right' ? x - wb : x, rtlInk = kinDir(str, o) === 'rtl';
  const R = kinBoxRect(x0, wb, y, cap, rtlInk ? { ...o, asc: m.asc, desc: m.desc } : o), u = clamp(o.u ?? 1), boxed = u > 0.001 && KIN_BOXES === 0 && o.box !== false;
  const cx = R.x + R.w / 2, cy = R.y + R.h / 2, k = o.k ?? 1, rtl = kinDir(str, o) === 'rtl';
  ctx.save();
  ctx.translate(cx + (o.dx ?? 0), cy + (o.dy ?? 0)); ctx.rotate(o.rot ?? 0); ctx.scale(k, k * (o.sy ?? 1)); ctx.translate(-cx, -cy);
  const t = { ...o, k: 1, sy: 1, rot: 0, dx: 0, dy: 0, align: 'center' }, tx = x0 + wb / 2;
  if (u < 1 || !boxed) kinText(str, tx, y, size, { ...t, color: o.color ?? kinFg() });   // the word before the swipe reaches it
  if (boxed) {
    KIN_BOXES++;
    const bw = R.w * kinExpo(u), bx = rtl ? R.x + R.w - bw : R.x;   // the swipe runs with the reading direction
    if (o.shadow) { ctx.fillStyle = o.shadow; ctx.fillRect(bx + 10 * UNIT, R.y + 10 * UNIT, bw, R.h); }
    ctx.fillStyle = o.pop ?? KIN.pop; ctx.fillRect(bx, R.y, bw, R.h);
    ctx.save(); ctx.beginPath(); ctx.rect(bx, R.y - cap, bw, R.h + 2 * cap); ctx.clip();
    kinText(str, tx, y, size, { ...t, color: kinOn(o.pop ?? KIN.pop) });
    ctx.restore();
  }
  ctx.restore();
  return { w: wb, x0, x1: x0 + wb, y, top: y - cap, cap, size, box: R, boxed };
}

// center-build: rows stack in one at a time and the stack stays centred on o.cy. A new row's slot opens first
// (the rows above slide up on a stiff spring, 0.16s of anticipation), then the word slams into it (1.3 -> 1 and a
// shake), so rows never sit on each other. rows: [{ s | swap: [[t, s], ...] | count: [t0, d, a, b, fmt], t (when
// the word lands; < 0 = already there), size, kind: 'fill' | 'outline' | 'key', box (the keyword's swipe time), rot }]
// o: { x, align, cy, gap (px between rows), lead (s), spring: { k, d } }. Returns the rows as laid out ({ s, x0, x1,
// y, top, cap, box }) so stickers can sit on them; kinBuildAt(rows, o) gives the settled baselines (bridge shapes).
const KIN_BUILD = { k: 600, d: 40, lead: 0.16 };
// a row's slot: its cap height, plus the box's padding for a keyword row: [above the cap, the cap, below the baseline]
const kinSlot = (r) => { const c = kinCapK() * r.size; return r.kind === 'key' ? [c * (r.padY ?? 0.17), c, c * (r.padB ?? 0.2)] : [0, c, 0]; };
function kinBuild(rows, o = {}) {
  const sl = rows.map(kinSlot), hs = sl.map((s) => s[0] + s[1] + s[2]), gap = o.gap ?? 0.16 * sl[0][1], sp = o.spring ?? KIN_BUILD, lead = o.lead ?? sp.lead ?? 0.12;
  const e = rows.map((r) => (r.t < 0 ? 1 : TT < r.t - lead ? 0 : springEase(TT - r.t + lead, sp.k, sp.d)));
  const tot = rows.reduce((a, r, i) => a + (hs[i] + (i ? gap : 0)) * e[i], 0);
  let y = o.cy - tot / 2;
  const out = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]; if (e[i] <= 0) break;
    y += i ? gap * e[i] : 0;
    const mid = y + hs[i] * e[i] / 2;
    if (TT >= r.t) out.push(kinRow(r, o.x ?? LX(0.5), mid + (sl[i][1] + sl[i][0] - sl[i][2]) / 2, { align: o.align ?? 'center', en: r.t < 0 ? null : kinSlam(r.t, 'b' + i + (r.key ?? ''), r.amt ?? 1) }));
    y += hs[i] * e[i];
  }
  return out;
}
function kinBuildAt(rows, o = {}) {   // the settled baselines
  const sl = rows.map(kinSlot), gap = o.gap ?? 0.16 * sl[0][1];
  let y = o.cy - (sl.reduce((a, s) => a + s[0] + s[1] + s[2], 0) + gap * (rows.length - 1)) / 2;
  return sl.map((s, i) => { y += (i ? gap : 0) + s[0] + s[1]; const yb = y; y += s[2]; return yb; });
}
function kinRow(r, x, yb, o = {}) {
  const sw = r.swap ? kinSwap(r.swap) : null;
  const str = sw ? sw.s : r.count ? kinCount(...r.count) : r.s;
  const en = o.en ?? (r.enter === 'none' ? null : r.enter === 'pop' ? kinPop(r.t) : kinSlam(r.t, r.key ?? String(r.s ?? r.t), r.amt ?? 1));
  const t = { align: r.align ?? o.align, k: en ? en.k : 1, dx: en ? en.dx ?? 0 : 0, dy: en ? en.dy ?? 0 : 0, rot: (r.rot ?? 0) + (en ? en.rot ?? 0 : 0), sy: sw ? sw.sy : 1, track: r.track };
  let b;
  if (r.kind === 'key') b = kinKey(str, x, yb, r.size, { ...t, u: r.box != null ? kinSwipe(r.box) : 1, shadow: r.shadow, ref: r.ref });
  else if (r.kind === 'outline') b = kinText(str, x, yb, r.size, { ...t, stroke: r.color ?? kinFg(), sw: r.sw ?? r.size * 0.032 });
  else b = kinText(str, x, yb, r.size, { ...t, color: r.color ?? kinFg() });
  return { ...b, s: str };
}
// word-by-word reveal of one line: words[i] pops in at t0 + i * step. (x, y) on the baseline. Returns the boxes.
function kinWords(words, x, y, size, t0, step = 0.25, o = {}) {
  const sp = size * (o.space ?? 0.26), ws = words.map((w) => kinW(w, size, o));
  const tot = ws.reduce((a, b) => a + b, 0) + sp * (words.length - 1), rtl = o.dir === 'rtl' || words.some((w) => KIN_RTL.test(w));
  let cx = (o.align ?? 'center') === 'center' ? x - tot / 2 : o.align === 'right' ? x - tot : x;
  const out = [];
  for (let j = 0; j < words.length; j++) {
    const i = rtl ? words.length - 1 - j : j, p = kinPop(t0 + i * step);   // right-to-left: the first word sits on the right
    if (p) out[i] = kinText(words[i], cx, y, size, { ...o, align: 'left', k: p.k, dy: p.dy });
    cx += ws[i] + sp;
  }
  return out;
}

// ---- stickers: flat shapes, a paper die-cut rim and a hard ink shadow -----------------------------------
function kinDie(path, fill, o = {}) {
  const b = (o.b ?? 8) * UNIT, sh = (o.sh ?? 7) * UNIT;
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (sh > 0) { ctx.save(); ctx.translate(sh, sh); ctx.fillStyle = o.shadow ?? KIN.ink; ctx.fill(path); if (b > 0) { ctx.lineWidth = 2 * b; ctx.strokeStyle = o.shadow ?? KIN.ink; ctx.stroke(path); } ctx.restore(); }
  if (b > 0) { ctx.lineWidth = 2 * b; ctx.strokeStyle = o.rim ?? KIN.paper; ctx.stroke(path); }
  ctx.fillStyle = fill; ctx.fill(path);
  ctx.restore();
}
function kinDieLine(path, color, lw, o = {}) {   // a stroked sticker (arrow shaft, tick, underline)
  const b = (o.b ?? 7) * UNIT, sh = (o.sh ?? 6) * UNIT;
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = o.cap ?? 'round';
  if (sh > 0) { ctx.save(); ctx.translate(sh, sh); ctx.strokeStyle = o.shadow ?? KIN.ink; ctx.lineWidth = lw + 2 * b; ctx.stroke(path); ctx.restore(); }
  if (b > 0) { ctx.strokeStyle = o.rim ?? KIN.paper; ctx.lineWidth = lw + 2 * b; ctx.stroke(path); }
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.stroke(path);
  ctx.restore();
}
const kinPath = (P, closed = true) => { const p = new Path2D(); P.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y))); if (closed) p.closePath(); return p; };
// the asterisk outline: the union of `arms` capsules through the centre (2 * arms points), sampled by angle
function kinAstPts(x, y, r, o = {}) {
  const n = o.n ?? 120, arms = o.arms ?? 3, w = (o.w ?? 0.25) * r, L = r - w, rot = o.rot ?? 0, P = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU; let best = 0;
    for (let j = 0; j < arms; j++) {
      const d = a - rot - j * Math.PI / arms, c = Math.abs(Math.cos(d)), s = Math.abs(Math.sin(d));
      best = Math.max(best, w >= L * s ? L * c + Math.sqrt(w * w - L * L * s * s) : w / s);
    }
    P.push([x + Math.cos(a) * best, y + Math.sin(a) * best]);
  }
  return P;
}
// an asterisk sticker; o.outline = a stroke width: a big outlined asterisk for the background (no fill, no rim)
function kinAsterisk(x, y, r, o = {}) {
  const p = kinPath(kinAstPts(x, y, r, o));
  if (o.outline) { ctx.save(); ctx.lineJoin = 'round'; ctx.lineWidth = o.outline * UNIT; ctx.strokeStyle = o.color ?? kinFg(); ctx.stroke(p); ctx.restore(); }
  else kinDie(p, o.fill ?? KIN.pop, o);
}
function kinDot(x, y, r, o = {}) { kinDie(kinPath(ellipsePts(x, y, r, r, 0, 40)), o.fill ?? KIN.pop, { b: 0, sh: 0, ...o }); }
// a chunky arrow from (x0, y0) to (x1, y1), bent by o.bend (a fraction of its length, + = to the left), drawn on by o.frac
function kinArrow(x0, y0, x1, y1, o = {}) {
  const L = Math.hypot(x1 - x0, y1 - y0), bend = (o.bend ?? 0.25) * L, mx = (x0 + x1) / 2 + (y0 - y1) / L * bend, my = (y0 + y1) / 2 + (x1 - x0) / L * bend;
  const P = []; for (let i = 0; i <= 32; i++) { const t = i / 32, a = (1 - t) * (1 - t), b = 2 * t * (1 - t), c = t * t; P.push([a * x0 + b * mx + c * x1, a * y0 + b * my + c * y1]); }
  const fr = clamp(o.frac ?? 1); if (fr <= 0.01) return;
  const S = subPath(P, fr), lw = (o.w ?? 16) * UNIT, hd = (o.head ?? 2.6) * lw, [ex, ey] = S[S.length - 1], [px, py] = S[Math.max(0, S.length - 3)];
  const ang = Math.atan2(ey - py, ex - px), col = o.color ?? kinFg();
  const shaft = kinPath(subPath(P, fr * (1 - hd * 0.55 / (L || 1))), false);
  const head = kinPath([[ex + Math.cos(ang) * hd * 0.25, ey + Math.sin(ang) * hd * 0.25], [ex - Math.cos(ang - 0.5) * hd, ey - Math.sin(ang - 0.5) * hd], [ex - Math.cos(ang + 0.5) * hd, ey - Math.sin(ang + 0.5) * hd]]);
  kinDieLine(shaft, col, lw, o);
  ctx.save(); ctx.lineJoin = 'round';
  const b = (o.b ?? 7) * UNIT, sh = (o.sh ?? 6) * UNIT;
  if (sh > 0) { ctx.save(); ctx.translate(sh, sh); ctx.fillStyle = ctx.strokeStyle = o.shadow ?? KIN.ink; ctx.lineWidth = 2 * b + 6 * UNIT; ctx.fill(head); ctx.stroke(head); ctx.restore(); }
  if (b > 0) { ctx.strokeStyle = o.rim ?? KIN.paper; ctx.lineWidth = 2 * b + 6 * UNIT; ctx.stroke(head); }
  ctx.fillStyle = ctx.strokeStyle = col; ctx.lineWidth = 6 * UNIT; ctx.fill(head); ctx.stroke(head);
  ctx.restore();
}
// a tick (the test passed), size r, drawn on by o.frac
function kinTick(x, y, r, o = {}) {
  const P = [[x - 0.55 * r, y], [x - 0.15 * r, y + 0.42 * r], [x + 0.6 * r, y - 0.48 * r]], fr = clamp(o.frac ?? 1);
  if (fr > 0.01) kinDieLine(kinPath(subPath(P, fr), false), o.color ?? kinFg(), (o.w ?? 0.26) * r, o);
}
// underline swipe: a thick slanted bar under a word, wiping in with the reading direction (u 0..1)
function kinUnderline(x0, y, w, u, o = {}) {
  const h = (o.h ?? 16) * UNIT, e = kinExpo(clamp(u)), sl = h * 0.6; if (e <= 0.001) return;
  const x1 = o.rtl ? x0 + w : x0 + w * e, xa = o.rtl ? x0 + w * (1 - e) : x0;
  kinDie(kinPath([[xa + sl, y], [x1 + sl, y], [x1, y + h], [xa, y + h]]), o.color ?? KIN.pop, { b: o.b ?? 0, sh: o.sh ?? 0 });
}
// emphasis marks: three short bars fanned out from a corner (dir in radians), popping in at t0
function kinMarks(x, y, r, dir, t0, o = {}) {
  const k = kinBack((TT - t0) / 0.2); if (TT < t0) return;
  const wig = kinPulse(t0, o.every ?? kinBeatT()) * 0.12;
  [-0.62, 0, 0.62].forEach((da, i) => {
    const a = dir + da, L = r * (i === 1 ? 1 : 0.72) * (1 + wig), r0 = r * 0.6;
    kinDieLine(kinPath([[x + Math.cos(a) * r0, y + Math.sin(a) * r0], [x + Math.cos(a) * (r0 + L * k), y + Math.sin(a) * (r0 + L * k)]], false), o.color ?? kinFg(), (o.w ?? 14) * UNIT, { b: o.b ?? 0, sh: o.sh ?? 0 });
  });
}
// a beat counter: n squares, the current beat's filled (background life that keeps time)
function kinMeter(x, y, n, s, o = {}) {
  const on = Math.floor(mod((TT - (o.t0 ?? 0)) / kinBeatT(), n)), col = o.color ?? kinFg();
  ctx.save(); ctx.lineWidth = 4 * UNIT; ctx.strokeStyle = col; ctx.fillStyle = col;
  for (let i = 0; i < n; i++) { const xx = x + i * s * 1.5; if (i === on) ctx.fillRect(xx, y, s, s); else ctx.strokeRect(xx + 2 * UNIT, y + 2 * UNIT, s - 4 * UNIT, s - 4 * UNIT); }
  ctx.restore();
}

// ---- the hero: a pop asterisk sticker with two eyes ---------------------------------------------------------
// Its arms turn slowly; the eyes stay level, blink and look. o: { key, look: [lx, ly] in -1..1, land: the time it
// stamps down (a squash), spin (radians per second), at: arrival time (pops in), blink: a frame offset for the blinks }
function kinHero(x, y, r, o = {}) {
  const key = o.key ?? 'hero', t = TT;
  const inK = o.at != null ? (t < o.at ? 0 : kinBack((t - o.at) / 0.22)) : 1; if (inK <= 0) return;
  const sq = o.land != null ? kinKick(t, o.land, 380, 0.28) * 0.22 : 0;
  const bob = Math.sin(t * TAU * 0.9 + key.length) * r * 0.035;
  const rot = (o.rot ?? 0.26) + t * (o.spin ?? 0.5);
  ctx.save(); ctx.translate(x, y + bob); ctx.scale(inK * (1 + sq * 0.6), inK * (1 - sq));
  kinDie(kinPath(kinAstPts(0, 0, r, { rot, w: 0.23 })), o.fill ?? KIN.pop, { b: r * 0.085 / UNIT, sh: r * 0.075 / UNIT });
  // eyes: ink ovals with a paper glint, a blink every ~2.6s
  const blink = mod(F + (o.blink ?? key.length * 17), 62) < 3, [lx, ly] = o.look ?? [0, 0], ex = r * 0.19, ey = -r * 0.02;
  for (const s of [-1, 1]) {
    const cx = s * ex + lx * r * 0.06, cy = ey + ly * r * 0.06;
    ctx.fillStyle = KIN.ink; ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.115, blink ? r * 0.02 : r * 0.17, 0, 0, TAU); ctx.fill();
    if (!blink) { ctx.fillStyle = KIN.paper; ctx.beginPath(); ctx.arc(cx + r * 0.035, cy - r * 0.07, r * 0.04, 0, TAU); ctx.fill(); }
  }
  ctx.restore();
  SPARK_AT = toScreen(x, y);
}

// ---- layout: the type area of the current format (9:16: the union of the TikTok / Reels / Shorts UI) ----------
function kinArea() {
  const S = typeof SAFE !== 'undefined' ? SAFE : { top: 60, bottom: 60, right: 60 };
  if (PORTRAIT) return { x0: 120 * UNIT, x1: 780 * UNIT, xr: 888 * UNIT, y0: 288 * UNIT, y1: 1248 * UNIT, low: 840 * UNIT };
  const m = 72 * UNIT;
  return { x0: m, x1: W - Math.max(m, S.right), xr: W - Math.max(m, S.right), y0: Math.max(m, S.top), y1: H - Math.max(m, S.bottom), low: H };
}

// ---- tags and captions (through DEFER: drawn after the camera, at screen size) ----------------------------------
// the tag: a small label at the top of the type area, a square bullet and a word in the display face
function kinTagNow(str, o = {}) {
  const A = kinArea(), sz = (o.size ?? 54) * UNIT, a = kinPop(E0 + (o.at ?? 0.05), 0.2); if (!a) return;
  const x = o.x ?? A.x0, y = o.y ?? A.y0 + sz * 0.85, cap = kinCapK() * sz, col = o.color ?? kinFg();
  ctx.save(); ctx.fillStyle = col; ctx.fillRect(x, y - cap * 0.78, cap * 0.62 * a.k, cap * 0.62 * a.k); ctx.restore();
  kinText(String(str).toUpperCase(), x + cap * 1.05, y, sz, { color: col, k: a.k, dy: a.dy, track: 0.04 });
}
const kinTag = (str, o = {}) => { const f = () => kinTagNow(str, o); if (DEFER) DEFER.push(f); else f(); };
// a caption chunk revealed word by word: word i at t0 + i * step (seconds, absolute), lettered by STYLE.caption
function kinCaption(words, t0, o = {}) {
  const f = () => {
    const A = kinArea(), step = o.step ?? 0.25, ws = [].concat(words);
    const n = ws.filter((w, i) => TT >= t0 + i * step).length; if (!n) return;
    const act = TT < t0 + n * step + (o.hold ?? 0.25) ? n - 1 : -1;
    STYLE.caption(ws, act, o.x ?? (A.x0 + A.x1) / 2, o.y ?? A.y1 - 40 * UNIT, (o.size ?? 64) * UNIT, { count: n, since: TT - (t0 + (n - 1) * step), maxW: o.maxW ?? A.x1 - A.x0 });
  };
  if (DEFER) DEFER.push(f); else f();
}

// =====================================================================
//  STYLE — the renderer's hooks (see the skill's styles/README.md)
// =====================================================================
const STYLE = {
  name: 'kinetic',
  paper: KIN.paper,
  // the ground behind a morph: no muddy blend — the old ground with the paper wiping across it on a hard slanted
  // edge (shrink), paper (morph), then the new ground wiping in the same way (grow)
  backdrop(c, o = {}) {
    const G = typeof ERA_BG !== 'undefined' ? ERA_BG : null;
    if (!G || !o.phase || o.phase === 'morph') { fillAll(o.phase ? STYLE.paper : c); return; }
    const shrink = o.phase === 'shrink', u = shrink ? clamp(o.u) : kinExpo(clamp(o.u)), s = 0.18 * W, xe = lerp(-s, W + s, u);
    fillAll(shrink ? G[o.eraA] : STYLE.paper);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = shrink ? STYLE.paper : G[o.eraB];
    ctx.beginPath(); ctx.moveTo(-10, -10); ctx.lineTo(xe + s, -10); ctx.lineTo(xe - s, H + 10); ctx.lineTo(-10, H + 10); ctx.fill(); ctx.restore();
  },
  window(P, key, src, o = {}) {   // a hard-edged iris: an ink offset shadow, the era seen through P, a hard rim
    const path = kinPath(P), lw = 10 * UNIT;
    ctx.save(); ctx.translate(12 * UNIT, 12 * UNIT); ctx.fillStyle = KIN.ink; ctx.fill(path); ctx.restore();
    ctx.save(); ctx.clip(path); ctx.drawImage(src, 0, 0); ctx.restore();
    ctx.save(); ctx.lineJoin = 'miter'; ctx.lineWidth = lw; ctx.strokeStyle = o.c && o.c[0] === '#' ? o.c : KIN.pop; ctx.stroke(path); ctx.restore();
  },
  blob(P, c) {   // the morphing shape: a solid flat block in its colour with a hard ink offset shadow
    const path = kinPath(P);
    ctx.save(); ctx.translate(12 * UNIT, 12 * UNIT); ctx.fillStyle = KIN.ink; ctx.fill(path); ctx.restore();
    ctx.save(); ctx.fillStyle = c; ctx.fill(path); ctx.restore();
  },
  hero(x, y, r, o = {}) { kinHero(x, y, r, { key: o.key }); },
  heroColor: kinHex(KIN.pop),
  heroPts(x, y, r, n = 96) { return kinAstPts(x, y, r, { n, rot: 0.26, w: 0.23 }); },
  // captions (kit/captions.js and kinCaption): letter one chunk in the medium. words: strings (or { text }),
  // active: the lit word's index (-1: none), (x, y): the chunk's centre on the baseline, size: px.
  // Bold condensed caps, paper fill with a thick ink edge; the lit word sits on the pop box with ink text, or, when a
  // keyword box is already on screen (scarce emphasis), on a pop underline. o: { count (words shown), since (s since
  // the lit word began), maxW, align, dir, upper (default true) }. Returns { w, size }.
  caption(words, active, x, y, size, o = {}) {
    const ws = [].concat(words).map((w) => (typeof w === 'string' ? w : w.text ?? w.word ?? '')).map((w) => (o.upper === false ? w : w.toUpperCase()));
    const sp = () => size * 0.28, rtl = o.dir === 'rtl' || ws.some((w) => KIN_RTL.test(w));
    let tot = ws.reduce((a, w) => a + kinW(w, size), 0) + sp() * (ws.length - 1);
    if (o.maxW && tot > o.maxW) { size *= o.maxW / tot; tot = o.maxW; }
    const n = Math.min(o.count ?? ws.length, ws.length), cap = kinCapK() * size;
    let cx = (o.align ?? 'center') === 'center' ? x - tot / 2 : o.align === 'right' ? x - tot : x;
    const boxOK = KIN_BOXES === 0;
    for (let j = 0; j < ws.length; j++) {
      const i = rtl ? ws.length - 1 - j : j, w = kinW(ws[i], size);
      if (i < n) {
        if (i === active) {
          const u = clamp((o.since ?? 1) / 0.12), k = 1 + 0.08 * (1 - kinExpo(u));
          if (boxOK) kinKey(ws[i], cx, y, size, { k, u: 1, padX: 0.16, padY: 0.16, padB: 0.18 });
          else {
            kinText(ws[i], cx, y, size, { color: KIN.paper, edge: KIN.ink, ew: size * 0.13, k });
            kinUnderline(cx, y + cap * 0.16, w, u, { h: cap * 0.16 / UNIT, rtl });
          }
        } else kinText(ws[i], cx, y, size, { color: KIN.paper, edge: KIN.ink, ew: size * 0.13 });
      }
      cx += w + sp();
    }
    return { w: tot, size };
  },
  post() { KIN_BOXES = 0; KIN_NOW = { bg: KIN_GROUNDS[KIN_G0] || KIN.ink, fg: kinOn(KIN_GROUNDS[KIN_G0] || KIN.ink) }; },
  ones: true,
};
