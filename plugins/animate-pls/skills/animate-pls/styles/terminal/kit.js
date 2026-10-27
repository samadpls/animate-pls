// =====================================================================
//  styles/terminal/kit.js — a warm, crafted developer terminal for dev-tool videos. A warm black ground, cream and
//  amber monospace text on a character grid, ONE terracotta accent (the hero, a caret come alive) and a muted sage
//  for success. Everything that must read is real text (fillText, so tools/textcheck.mjs sees it): commands typed
//  at a human rate, output that arrives line by line, progress bars and spinners made of block characters, ASCII
//  boxes and arrows, a status line. A cheap CRT finish in STYLE.post: a tight quarter-res phosphor glow on what is
//  brighter than the ground (the text), faint scanlines, a slow refresh band, a gentle vignette. Motion on 1s.
//  Built on kit/core.js (RNG, EZ, SPRING, springMove, seg, ev, popS, mod, bbox, rrectPts, screen, fillAll, toScreen,
//  TT / F / B / E0 / DEFER / SPARK_AT, LX / LY / UNIT / PORTRAIT / WIDE). Needs from the piece head: W, H, SAFE
//  (top, bottom, left, right; LOOP_T if present).
//  Optional before the kit (a src/options.js listed before "style" in piece.json "build"):
//    const TM_CRT = { glow: 0.3, scan: 0.12, band: 0.03, vignette: 0.42, grain: 0.05 }   tune the finish (false: none)
//  Fonts: a monospace stack per OS ("SF Mono" / Menlo on macOS, Consolas / Cascadia Mono on Windows, DejaVu Sans Mono
//  / Liberation Mono on Linux). Layout is in columns measured from the face in use, so every OS sets the same grid.
//  Credits: no code ported. The scanline + phosphor finish is an idea from cool-retro-term (GPL: the idea only).
// =====================================================================

// ---- palette: what each colour means (STYLE.md has the table) ----------------------------------------------------
const TM = {
  ground: '#1b1714',   // warm black: the ground, the blank sheet a morph happens on, text on chips
  pane: '#221c18',     // a terminal pane: one step up from the ground
  bar: '#2e2620',      // the status line and resting chips
  edge: '#5a493c',     // pane frames, box lines, arrows at rest
  shadow: '#0c0907',   // hard offset shadows (printed, never blurred)
  faint: '#4d4137',    // rules, tree lines, the empty part of a bar
  dim: '#9d8c77',      // comments, secondary output, "review", the status line
  text: '#e4d8c1',     // output
  cream: '#f6ecd7',    // commands, headings, the caret
  amber: '#ecb163',    // the prompt, keywords, progress, a GATE chip: what the eye should read next
  terra: '#d97757',    // THE HERO ONLY (the caret critter); never decoration
  terraL: '#eea486', terraD: '#a9553b',
  sage: '#a7bf8f',     // success: ticks, PASS, "CI passed"
  fail: '#d2574a',     // failure: a crossed check (sparingly, never beside the hero)
};

// ---- the face: the first installed of a monospace stack, measured once ---------------------------------------------
const TM_MONO = '"SF Mono", SFMono-Regular, Menlo, Monaco, Consolas, "Cascadia Mono", "DejaVu Sans Mono", "Liberation Mono", "Courier New", monospace';
const TM_MC = document.createElement('canvas').getContext('2d');   // the measuring context (never drawn)
const TM_FACE = (() => {
  const probe = (f) => { TM_MC.font = `72px ${f}`; return TM_MC.measureText('mmmmmmmmmmlliWW@#0').width; };
  const has = (fam) => ['monospace', 'serif'].some((g) => Math.abs(probe(`"${fam}", ${g}`) - probe(g)) > 0.5);
  for (const f of ['SF Mono', 'Menlo', 'Monaco', 'Consolas', 'Cascadia Mono', 'DejaVu Sans Mono', 'Liberation Mono', 'Courier New']) if (has(f)) return f;
  return 'monospace';
})();
window.FONTS_OK = `terminal face: ${TM_FACE}`;   // tile.mjs prints it
const tmFont = (size, wt = 400) => `${wt} ${Math.max(1, size).toFixed(2)}px ${TM_MONO}`;
// per px of font size: the column width, the block glyph's box (a terminal cell), the cap height
const TM_M = (() => {
  TM_MC.font = tmFont(100); const blk = TM_MC.measureText('█'), h = TM_MC.measureText('H');
  const m = { cw: TM_MC.measureText('M').width / 100, top: blk.actualBoundingBoxAscent / 100, bot: blk.actualBoundingBoxDescent / 100, cap: h.actualBoundingBoxAscent / 100 };
  if (!(m.top + m.bot > 0.85 && m.top + m.bot < 1.45)) { m.top = 0.78; m.bot = 0.24; }   // a face without the block glyph
  return m;
})();
const tmCW = (size) => TM_M.cw * size;
const tmCellH = (size) => (TM_M.top + TM_M.bot) * size;

// ---- the grid -------------------------------------------------------------------------------------------------------
// a character grid: column c starts at X(c), row r's baseline is Y(r). lh = line pitch as a multiple of the size.
function tmGrid(x, y, size, lh = 1.32) {
  const cw = tmCW(size), L = lh * size;
  return { x, y, size, cw, lh: L, X: (c) => x + c * cw, Y: (r) => y + r * L, top: TM_M.top * size, bot: TM_M.bot * size, cap: TM_M.cap * size };
}
// the font size at which `cols` columns and `rows` rows fit a w x h box (capped at o.max)
const tmFit = (cols, rows, w, h, o = {}) => Math.min(o.max ?? 1e9, w / (cols * TM_M.cw), h / (rows * (o.lh ?? 1.32)));
// the safe area for text: SAFE from the head (left defaults to the right margin); on a phone-tall frame also the
// TikTok action rail (nothing that must read right of x 780 below y 840, scaled), as tools/safezones.mjs says
function tmArea() {
  const S = typeof SAFE !== 'undefined' ? SAFE : {}, m = 60 * UNIT;
  const x0 = S.left ?? S.right ?? m, x1 = W - (S.right ?? m), y0 = S.top ?? m, y1 = H - (S.bottom ?? m);
  const rail = H > W * 1.5 ? { x: 780 * W / 1080, y: 840 * H / 1920 } : null;
  return { x0, x1, y0, y1, w: x1 - x0, h: y1 - y0, rail, xr: rail ? Math.min(x1, rail.x) : x1 };
}

// ---- text -------------------------------------------------------------------------------------------------------------
// one run of monospace text at (x, baseline y). o: wt (400 | 700), al, count (typing: how many characters show),
// bg (an inverse chip behind it: a cell-high block from half a column before to half after), pad (columns), cells.
// Keep glyphs outside ASCII (✓ ▸ █ ├) in their own run: a face without one falls back, and its width could drift.
function tmText(str, x, y, size, color, o = {}) {
  str = String(str);
  const n = o.count != null ? clamp(Math.floor(o.count), 0, str.length) : str.length, s = str.slice(0, n), cw = tmCW(size);
  ctx.save();
  const a0 = ctx.globalAlpha;
  if (o.bg) {
    const pad = o.pad ?? 0.5, cells = o.cells ?? str.length;
    ctx.globalAlpha = a0 * (o.bgAl ?? 1); ctx.fillStyle = o.bg;
    ctx.fillRect(x - pad * cw, y - TM_M.top * size, (cells + 2 * pad) * cw, tmCellH(size));
  }
  if (s.trim()) {
    ctx.globalAlpha = a0 * (o.al ?? 1); ctx.font = tmFont(size, o.wt ?? 400);
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; ctx.fillStyle = color;
    ctx.fillText(s, x, y);
  }
  ctx.restore();
  return n * cw;
}
// one line of output on grid G, row r: segs = [[col, str, color, o], ...], shown from time t on (a terminal prints a
// line whole). o.k scales a segment's size; o.pop = a time: the segment stamps in (1.25x -> 1 in 0.16s).
function tmLine(G, r, segs, t = -1e9) {
  if (TT < t - 1e-6) return false;
  for (const [c, s, col, o = {}] of segs) {
    const size = G.size * (o.k ?? 1), x = G.X(c), y = G.Y(r);
    if (o.pop != null) {
      if (TT < o.pop - 1e-6) continue;
      const k = 1 + 0.25 * (1 - EZ.o3(seg(TT, o.pop, o.pop + 0.16))), cx = x + String(s).length * tmCW(size) / 2, cy = y - TM_M.top * size + tmCellH(size) / 2;
      ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k); ctx.translate(-cx, -cy); tmText(s, x, y, size, col, o); ctx.restore();
    } else tmText(s, x, y, size, col, o);
  }
  return true;
}

// ---- typing at a human rate ------------------------------------------------------------------------------------------
// the time each character of str lands when typed from t0 at about cps keys a second: an uneven, seeded rhythm, a
// breath at word boundaries, the odd hesitation (never metronomic). Cached; the score reads the same times.
const TM_KEYS = new Map();
function tmTypeTimes(str, t0, cps = 13, key = '') {
  const k = `${str}|${t0}|${cps}|${key}`;
  let ts = TM_KEYS.get(k);
  if (!ts) {
    const R = RNG('tmtype', key || str); ts = []; let t = t0;
    for (let i = 0; i < str.length; i++) {
      ts.push(+t.toFixed(4));
      let d = (0.62 + 0.76 * R.f()) / cps;
      if (/[\s\-_./]/.test(str[i])) d *= 1.45;
      if (R.f() < 0.1) d *= 1.8;
      t += d;
    }
    TM_KEYS.set(k, ts);
  }
  return ts;
}
const tmTyped = (str, t0, cps, key) => tmTypeTimes(str, t0, cps, key).reduce((n, t) => n + (TT >= t - 1e-6 ? 1 : 0), 0);
const tmTypedEnd = (str, t0, cps, key) => { const ts = tmTypeTimes(str, t0, cps, key); return ts.length ? ts[ts.length - 1] : t0; };
// 0..1: a small kick after each keystroke (the hero squashes as it types)
function tmKeyKick(str, t0, cps, key) {
  let k = 0;
  for (const t of tmTypeTimes(str, t0, cps, key)) if (TT >= t - 1e-6) k = Math.max(k, Math.exp(-(TT - t) * 24));
  return k;
}

// ---- carets, spinners, bars ------------------------------------------------------------------------------------------
// the block caret: one cell in cream. Blinks 0.53s on / 0.53s off from o.t0 unless o.solid (solid while typing).
function tmCaret(x, y, size, o = {}) {
  if (!o.solid && mod(TT - (o.t0 ?? 0), 1.06) >= 0.53) return;
  ctx.save(); ctx.globalAlpha *= o.al ?? 0.92; ctx.fillStyle = o.c ?? TM.cream;
  ctx.fillRect(x, y - TM_M.top * size, tmCW(size) * (o.w ?? 1), tmCellH(size)); ctx.restore();
}
// a spinner of block quadrants going round (▖ ▘ ▝ ▗), o.rate steps a second (8: one step every 3 frames at 24fps)
const TM_SPIN = ['▖', '▘', '▝', '▗'];
function tmSpin(x, y, size, color, o = {}) {
  const set = o.set ?? TM_SPIN, i = Math.floor((TT - (o.t0 ?? 0)) * (o.rate ?? 8) + 1e-6);
  return tmText(set[mod(i, set.length)], x, y, size, color ?? TM.amber, o);
}
// a progress bar of `cols` cells in block characters: full blocks, an eighth-block at the leading edge, shaded cells
// after it, thin caps either side (▕████▋░░░░▏). Returns its width (caps not included).
const TM_EIGHTHS = ' ▏▎▍▌▋▊▉';
function tmBar(x, y, size, cols, frac, o = {}) {
  const cw = tmCW(size), f = clamp(frac) * cols, full = Math.min(cols, Math.floor(f + 1e-6)), part = full < cols ? Math.floor((f - full) * 8) : 0;
  const head = '█'.repeat(full) + (part > 0 ? TM_EIGHTHS[part] : ''), rest = cols - full - (part > 0 ? 1 : 0);
  if (o.caps !== false) { tmText('▕', x - cw, y, size, o.capC ?? TM.faint); tmText('▏', x + cols * cw, y, size, o.capC ?? TM.faint); }
  if (head) tmText(head, x, y, size, o.c ?? TM.amber);
  if (rest > 0) tmText('░'.repeat(rest), x + (cols - rest) * cw, y, size, o.empty ?? TM.faint);
  return cols * cw;
}

// ---- panes, boxes, rules, arrows, the status line ----------------------------------------------------------------------
function tmRR(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, Math.max(0, h), Math.max(0, Math.min(r, w / 2, h / 2))); }
// a frame with a title set into its top edge, TUI style: ─ title ─────╮ (and an optional right label). Strokes only.
function tmFrame(x, y, w, h, o = {}) {
  const r = Math.max(0, Math.min(o.r ?? 12 * UNIT, w / 2, h / 2)), size = o.titleSize ?? 40 * UNIT, cw = tmCW(size), gap = cw * 0.6;
  const tx = x + (o.titleX ?? r + cw * 1.2), tw = o.title ? o.title.length * cw : 0;
  const rw = o.right ? o.right.length * tmCW(o.rightSize ?? size * 0.8) : 0, rx = x + w - r - cw * 1.2 - rw;
  ctx.save(); ctx.lineWidth = o.lw ?? 2.5 * UNIT; ctx.strokeStyle = o.c ?? TM.edge; ctx.lineJoin = 'round'; ctx.lineCap = 'butt';
  ctx.beginPath();
  ctx.moveTo(o.title ? tx + tw + gap : x + r, y);
  if (o.right) { ctx.lineTo(rx - gap, y); ctx.moveTo(rx + rw + gap, y); }
  ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r); ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r); ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
  if (o.title) ctx.lineTo(tx - gap, y);
  ctx.stroke(); ctx.restore();
  const base = y + TM_M.cap * size / 2;
  if (o.title) tmText(o.title, tx, base, size, o.titleC ?? TM.amber, { wt: o.titleWt ?? 700, count: o.titleCount });
  if (o.right) tmText(o.right, rx, y + TM_M.cap * (o.rightSize ?? size * 0.8) / 2, o.rightSize ?? size * 0.8, o.rightC ?? TM.dim);
}
// a terminal pane: a hard offset shadow, the pane, its frame with the title set into the top edge, and o.inner()
// drawn clipped inside. o.open (0..1) turns it on like a CRT: a bright line spreads across, then opens to full height.
// Returns the open rect { x, y, w, h, u } (u = how open, 0..1) or null while it is still a line.
function tmPane(x, y, w, h, o = {}) {
  const open = o.open ?? 1; if (open <= 0) return null;
  const r = (o.r ?? 14) * UNIT, u1 = EZ.o3(seg(open, 0, 0.42)), u2 = EZ.io(seg(open, 0.32, 1));
  ctx.save();
  if (u2 <= 0) {   // the turn-on line: bright, with a soft halo (two fills, no blur)
    const lw = w * u1, cy = y + h / 2;
    ctx.fillStyle = TM.cream; ctx.globalAlpha = 0.18; ctx.fillRect(x + (w - lw) / 2, cy - 10 * UNIT, lw, 20 * UNIT);
    ctx.globalAlpha = 0.95; ctx.fillRect(x + (w - lw) / 2, cy - 2 * UNIT, lw, 4 * UNIT);
    ctx.restore(); return null;
  }
  const hh = Math.max(4 * UNIT, h * u2), yy = y + (h - hh) / 2, off = (o.shadow ?? 14) * UNIT;
  ctx.fillStyle = TM.shadow; tmRR(x + off, yy + off, w, hh, r); ctx.fill();
  ctx.fillStyle = o.fill ?? TM.pane; tmRR(x, yy, w, hh, r); ctx.fill();
  if (o.inner) { ctx.save(); tmRR(x, yy, w, hh, r); ctx.clip(); o.inner({ x, y: yy, w, h: hh, u: u2 }); ctx.restore(); }
  if (u2 < 1) { ctx.globalAlpha = 0.5 * (1 - u2); ctx.fillStyle = TM.cream; tmRR(x, yy, w, hh, r); ctx.fill(); ctx.globalAlpha = 1; }   // the flash of turning on
  tmFrame(x, yy, w, hh, { ...o, r, title: u2 > 0.9 ? o.title : null, right: u2 > 0.9 ? o.right : null });
  ctx.restore();
  return { x, y: yy, w, h: hh, u: u2 };
}
// an ASCII box on the grid: a hairline frame with rounded corners (╭╮╰╯), an optional title in its top edge, an
// optional fill (o.fill: an inverse block of characters, o.line: false for no frame)
function tmBox(x, y, w, h, o = {}) {
  const r = (o.r ?? 10) * UNIT;
  if (o.shadow) { ctx.save(); ctx.fillStyle = TM.shadow; tmRR(x + o.shadow, y + o.shadow, w, h, r); ctx.fill(); ctx.restore(); }
  if (o.fill) { ctx.save(); ctx.globalAlpha *= o.fillAl ?? 1; ctx.fillStyle = o.fill; tmRR(x, y, w, h, r); ctx.fill(); ctx.restore(); }
  if (o.line !== false) tmFrame(x, y, w, h, { ...o, r, c: o.c ?? TM.edge });
}
// a dim rule across, solid or dashed (o.dash = [on, off] in px)
function tmRule(x0, x1, y, o = {}) {
  ctx.save(); ctx.strokeStyle = o.c ?? TM.faint; ctx.lineWidth = o.lw ?? 2 * UNIT; if (o.dash) ctx.setLineDash(o.dash);
  ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); ctx.restore();
}
// an ASCII-diagram arrow, straight from (x0, y0) to (x1, y1): a dashed hairline whose dashes flow toward the head
// when o.flow (px a second), and a solid head. o.frac writes it on (the head lands at 1).
function tmArrow(x0, y0, x1, y1, o = {}) {
  const f = clamp(o.frac ?? 1); if (f <= 0) return;
  const L = Math.hypot(x1 - x0, y1 - y0) || 1, ux = (x1 - x0) / L, uy = (y1 - y0) / L, hs = (o.head ?? 18) * UNIT;
  const ex = x0 + ux * (L - hs) * f, ey = y0 + uy * (L - hs) * f;
  ctx.save(); ctx.strokeStyle = o.c ?? TM.edge; ctx.lineWidth = (o.lw ?? 3) * UNIT; ctx.lineCap = 'butt';
  ctx.setLineDash(o.dash ?? [12 * UNIT, 9 * UNIT]); ctx.lineDashOffset = -(o.flow ?? 0) * TT;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(ex, ey); ctx.stroke(); ctx.setLineDash([]);
  if (f >= 1) {
    ctx.fillStyle = o.headC ?? o.c ?? TM.amber; ctx.beginPath();
    ctx.moveTo(x1, y1); ctx.lineTo(x1 - ux * hs - uy * hs * 0.62, y1 - uy * hs + ux * hs * 0.62); ctx.lineTo(x1 - ux * hs + uy * hs * 0.62, y1 - uy * hs - ux * hs * 0.62);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
// a status line (tmux / vim style) across (x, w) on baseline y: segments [{ s, c, bg, wt }] from the left and
// o.right [...] from the right. A segment with bg is a chip. Returns the bar's rect.
function tmStatus(x, y, w, size, left, o = {}) {
  const cw = tmCW(size), top = y - TM_M.top * size - size * 0.2, hb = tmCellH(size) + size * 0.4;
  ctx.save(); ctx.fillStyle = o.bg ?? TM.bar; ctx.fillRect(x, top, w, hb); ctx.restore();
  const put = (sg, cx) => tmText(sg.s, cx, y, size, sg.c ?? TM.dim, { wt: sg.wt, bg: sg.bg, pad: sg.bg ? 0.5 : 0 });
  let cx = x + cw * 0.8;
  for (const sg of left) { put(sg, cx); cx += (sg.s.length + (sg.gap ?? 1) + (sg.bg ? 1 : 0)) * cw; }
  let rx = x + w - cw * 0.8;
  for (const sg of o.right ?? []) { rx -= sg.s.length * cw; put(sg, rx); rx -= ((sg.gap ?? 1) + (sg.bg ? 1 : 0)) * cw; }
  return { x, y: top, w, h: hb };
}

// ---- the hero: the caret come alive --------------------------------------------------------------------------------
// A terracotta block (the solid cursor) with two ears, a darker keycap lip, two short feet and dark eyes shaped like
// tiny carets. x, y = the centre of its body; s = the body's height (about one text cell: 1.0-1.1 x the font size).
// o: mood 'idle' | 'happy' | 'wow', look (-1..1: where the eyes look, x), lookY (-1..1), squash (0..1: a keystroke or
// a landing), hop (0..1 along a hop), hopH (the hop's height in s), walk (a step phase, or null), key.
// The reserved colour is the hero's alone. Sets SPARK_AT (review's anchor check follows it).
function tmCritter(x, y, s, o = {}) {
  const key = o.key ?? 'tmc', seed = hash(key) % 97;
  const hop = clamp(o.hop ?? 0), sq = clamp(o.squash ?? 0) * (hop > 0 && hop < 1 ? 0 : 1);
  const bob = hop > 0 && hop < 1 ? 0 : Math.sin((TT + seed * 0.13) * TAU * 0.7) * s * 0.022;
  const w = s * 1.08 * (1 + 0.09 * sq - 0.05 * Math.sin(Math.PI * hop)), h = s * (1 - 0.13 * sq + 0.07 * Math.sin(Math.PI * hop));
  const foot = y + s / 2, lift = Math.sin(Math.PI * hop) * s * (o.hopH ?? 0.8);
  const bx = x - w / 2, by = foot - h - lift + bob, lip = h * 0.14, r = s * 0.1;
  SPARK_AT = toScreen(x, by + h / 2);
  ctx.save();
  // hard offset shadow (ears and body together), then the feet
  const sh = s * 0.085, ew = s * 0.2, eh = s * 0.17, ex = [bx + w * 0.07, bx + w * 0.93 - ew];
  ctx.fillStyle = TM.shadow; ctx.globalAlpha *= 0.95;
  tmRR(bx + sh, by + sh, w, h, r); ctx.fill(); for (const e of ex) ctx.fillRect(e + sh, by - eh + sh + r * 0.4, ew, eh);
  ctx.globalAlpha = 1;
  const step = o.walk != null ? Math.sin(o.walk * TAU) : 0;
  ctx.fillStyle = TM.terraD;
  for (const k of [-1, 1]) { const fy = foot - lift + bob + Math.max(0, k * step) * -s * 0.08; ctx.fillRect(x + k * w * 0.24 - s * 0.1, fy - s * 0.02, s * 0.2, s * 0.1); }
  // ears, the body, the keycap lip, a lit top edge
  ctx.fillStyle = TM.terra; for (const e of ex) ctx.fillRect(e, by - eh + r * 0.4, ew, eh);
  tmRR(bx, by, w, h, r); ctx.fill();
  ctx.save(); tmRR(bx, by, w, h, r); ctx.clip();
  ctx.fillStyle = TM.terraD; ctx.fillRect(bx, by + h - lip, w, lip);
  ctx.fillStyle = TM.terraL; ctx.globalAlpha = 0.8; ctx.fillRect(bx, by, w, Math.max(1.5, s * 0.045)); ctx.restore();
  // the eyes: two little carets; they blink every couple of seconds (3 frames) unless happy
  const look = clamp(o.look ?? 0, -1, 1) * s * 0.07, lookY = clamp(o.lookY ?? 0, -1, 1) * s * 0.05;
  const ey = by + (h - lip) * 0.5 + lookY, mood = o.mood ?? 'idle', blink = mood !== 'happy' && mod(F + seed, 53) < 3;
  ctx.fillStyle = TM.ground; ctx.strokeStyle = TM.ground; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const k of [-1, 1]) {
    const cx = x + k * w * 0.2 + look;
    if (mood === 'happy') { ctx.lineWidth = s * 0.075; ctx.beginPath(); ctx.moveTo(cx - s * 0.09, ey + s * 0.05); ctx.lineTo(cx, ey - s * 0.06); ctx.lineTo(cx + s * 0.09, ey + s * 0.05); ctx.stroke(); }
    else { const eh2 = blink ? s * 0.05 : mood === 'wow' ? s * 0.36 : s * 0.29, ew2 = mood === 'wow' ? s * 0.13 : s * 0.11; ctx.fillRect(cx - ew2 / 2, ey - eh2 / 2, ew2, eh2); }
  }
  ctx.restore();
  return { x: bx, y: by, w, h };
}
// a prompt line on grid G at row r: the hero as the prompt (or o.sym, '$', once it has left), then cmd typed from t0
// at a human rate, then the caret (solid while typing, blinking after; gone once o.enter has passed).
// Returns { n, end (when the last key lands), cx (the caret's x) }.
function tmPrompt(G, r, cmd, t0, o = {}) {
  const cps = o.cps ?? 13, key = o.key ?? 'prompt', col = o.col ?? 0, at = o.at ?? 3;
  const n = tmTyped(cmd, t0, cps, key), end = tmTypedEnd(cmd, t0, cps, key), y = G.Y(r);
  if (o.hero !== false) tmCritter(G.X(col) + G.cw, y - G.top + tmCellH(G.size) * 0.55, G.size * (o.heroK ?? 1.04), { key, squash: tmKeyKick(cmd, t0, cps, key), ...o.heroO });
  else tmText(o.sym ?? '$', G.X(col + 1), y, G.size, TM.amber, { wt: 700 });
  if (n > 0) tmText(cmd, G.X(col + at), y, G.size, o.c ?? TM.cream, { count: n, wt: o.wt ?? 400 });
  const cx = G.X(col + at + n);
  if (o.caret !== false && !(o.enter != null && TT >= o.enter)) tmCaret(cx, y, G.size, { solid: n > 0 && n < cmd.length, t0: end });
  return { n, end, cx };
}

// ---- captions (drawn after the camera through DEFER, inside the safe area; 9:16 also keeps left of the rail) ---------
// the beat's tag: an inverse amber chip at the top-left of the safe area, stamped in
function tmTagNow(str, o = {}) {
  const A = tmArea(), size = (o.size ?? 54) * UNIT, cw = tmCW(size), x = A.x0 + cw * 0.5, y = A.y0 + TM_M.top * size + 6 * UNIT;
  const at = E0 + (o.at ?? 0.1); if (TT < at - 1e-6) return;
  const k = 1 + 0.25 * (1 - EZ.o3(seg(TT, at, at + 0.16))), cx = x + str.length * cw / 2, cy = y - TM_M.top * size + tmCellH(size) / 2;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k); ctx.translate(-cx, -cy);
  ctx.fillStyle = TM.shadow; ctx.fillRect(x - cw * 0.5 + 8 * UNIT, y - TM_M.top * size + 8 * UNIT, (str.length + 1) * cw, tmCellH(size));
  tmText(str, x, y, size, TM.ground, { bg: o.bg ?? TM.amber, wt: 700 });
  ctx.restore();
}
// the beat's caption: typed on at the bottom of the safe area ("› " in amber, then cream) over a dark strip, with a
// caret that blinks a moment after. Sized to fit the width it has (left of the rail on 9:16), never under 50px.
function tmCaptionNow(str, o = {}) {
  const A = tmArea(), avail = (A.rail && A.y1 > A.rail.y ? A.xr : A.x1) - A.x0, full = '› ' + str;
  const size = Math.max(50 * UNIT, Math.min((o.size ?? 56) * UNIT, avail / ((full.length + 1.5) * TM_M.cw)));
  const cw = tmCW(size), x = A.x0 + cw * 0.5, y = A.y1 - TM_M.bot * size - 8 * UNIT, t0 = E0 + (o.at ?? 0.45);
  const n = Math.floor(clamp((TT - t0) * (o.cps ?? 26), 0, full.length));
  if (n <= 0) return;
  ctx.save(); ctx.globalAlpha = 0.86; ctx.fillStyle = TM.ground;
  ctx.fillRect(x - cw * 0.5, y - TM_M.top * size - 10 * UNIT, (n + 1.5) * cw, tmCellH(size) + 20 * UNIT); ctx.restore();
  tmText('›', x, y, size, TM.amber, { wt: 700 });
  if (n > 2) tmText(str, x + 2 * cw, y, size, TM.cream, { count: n - 2 });
  const tEnd = t0 + full.length / (o.cps ?? 26);
  if (TT < tEnd + 1.2) tmCaret(x + n * cw, y, size, { solid: n < full.length, t0: tEnd, al: 0.85 });
}
const tmTag = (str, o) => { const f = () => tmTagNow(str, o); if (DEFER) DEFER.push(f); else f(); };
const tmCaption = (str, o) => { const f = () => tmCaptionNow(str, o); if (DEFER) DEFER.push(f); else f(); };

// ---- the morph's shape: a block of characters ----------------------------------------------------------------------------
// outline P (screen coords) filled cell by cell on a fixed character grid (quadrant blocks: ▖▘▝▗ resolution): the
// inside solid, the edge a half-tone (like ▒), faint seams between cells, and a few characters cut out of it that
// change every 2 frames. Colour c may be 'rgb(...)' mid-morph.
function tmPoly(P) { ctx.beginPath(); P.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); }
function tmBlob(P, c, key = 'blob', u = 0) {
  const qx = Math.max(5, Math.round(12 * UNIT)), qy = qx * 2, path = new Path2D();
  P.forEach(([x, y], i) => (i ? path.lineTo(x, y) : path.moveTo(x, y))); path.closePath();
  const b = bbox(P), i0 = Math.floor(b.x0 / qx), j0 = Math.floor(b.y0 / qy), nx = Math.ceil(b.x1 / qx) - i0 + 1, ny = Math.ceil(b.y1 / qy) - j0 + 1;
  ctx.save(); screen();
  const In = new Uint8Array(nx * ny), at = (i, j) => (i < 0 || j < 0 || i >= nx || j >= ny ? 0 : In[j * nx + i]);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) In[j * nx + i] = ctx.isPointInPath(path, (i0 + i + 0.5) * qx, (j0 + j + 0.5) * qy) ? 1 : 0;
  const solid = new Path2D(), edge = new Path2D();
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    if (!In[j * nx + i]) continue;
    const e = !(at(i - 1, j) && at(i + 1, j) && at(i, j - 1) && at(i, j + 1));
    (e ? edge : solid).rect((i0 + i) * qx, (j0 + j) * qy, qx, qy);
  }
  ctx.fillStyle = c; ctx.fill(solid); ctx.globalAlpha = 0.5; ctx.fill(edge); ctx.globalAlpha = 1;
  // seams between character cells (every 2 quadrants), clipped to the block
  ctx.save(); ctx.clip(solid); ctx.strokeStyle = TM.ground; ctx.globalAlpha = 0.22; ctx.lineWidth = Math.max(1, UNIT * 1.5); ctx.beginPath();
  for (let i = Math.ceil(i0 / 2) * 2; i <= i0 + nx; i += 2) { ctx.moveTo(i * qx, b.y0); ctx.lineTo(i * qx, b.y1); }
  for (let j = Math.ceil(j0 / 2) * 2; j <= j0 + ny; j += 2) { ctx.moveTo(b.x0, j * qy); ctx.lineTo(b.x1, j * qy); }
  ctx.stroke(); ctx.restore();
  // characters cut out of the block, re-picked every 2 frames
  const R = RNG('tmblob', key, B), size = qy * 1.6;
  ctx.font = tmFont(size, 700); ctx.fillStyle = TM.ground; ctx.globalAlpha = 0.55; ctx.textBaseline = 'alphabetic';
  for (let j = 0; j + 1 < ny; j += 2) for (let i = 0; i + 1 < nx; i += 2) {
    if (R.f() > 0.1 || !(at(i, j) && at(i + 1, j) && at(i, j + 1) && at(i + 1, j + 1))) continue;
    ctx.fillText(R.pick(['0', '1', '#', '$', '>', '_', '/', '*', '=', '+']), (i0 + i) * qx + qx * 0.4, (j0 + j) * qy + qy * 1.7);
  }
  ctx.restore();
}
// the window: the world through outline P, framed like a pane opening: a cream hairline and four amber corner brackets
function tmWindow(P, key, src) {
  ctx.save(); screen(); tmPoly(P); ctx.clip(); ctx.drawImage(src, 0, 0); ctx.restore();
  ctx.save(); screen(); tmPoly(P); ctx.lineWidth = 3 * UNIT; ctx.lineJoin = 'round'; ctx.strokeStyle = TM.cream; ctx.globalAlpha = 0.8; ctx.stroke();
  const b = bbox(P), g = 12 * UNIT, L = Math.max(8 * UNIT, Math.min(40 * UNIT, (b.x1 - b.x0) / 4, (b.y1 - b.y0) / 4));
  ctx.globalAlpha = 1; ctx.strokeStyle = TM.amber; ctx.lineWidth = 5 * UNIT; ctx.lineCap = 'square'; ctx.beginPath();
  for (const [x, y, sx, sy] of [[b.x0 - g, b.y0 - g, 1, 1], [b.x1 + g, b.y0 - g, -1, 1], [b.x1 + g, b.y1 + g, -1, -1], [b.x0 - g, b.y1 + g, 1, -1]]) {
    ctx.moveTo(x, y + sy * L); ctx.lineTo(x, y); ctx.lineTo(x + sx * L, y);
  }
  ctx.stroke(); ctx.restore();
}

// ---- the CRT finish (STYLE.post): phosphor glow, refresh band, scanlines, grain, vignette ----------------------------
// Costs a few ms: the glow is the frame at quarter resolution minus the ground (so only what is brighter than the
// ground glows: the text, chips, the hero), blurred 1.25px there and added back with 'lighter'. Static tiles and the
// vignette are cached; nothing carries between frames.
const TM_CRT_O = typeof TM_CRT !== 'undefined' ? TM_CRT : {};
const TM_POST = TM_CRT_O === false ? null : { glow: 0.3, scan: 0.12, band: 0.03, vignette: 0.42, grain: 0.05, ...TM_CRT_O };
const TM_CV = {};
function tmCanvas(name, w, h, draw) {
  let c = TM_CV[name];
  if (!c || c.width !== w || c.height !== h) { c = document.createElement('canvas'); c.width = w; c.height = h; TM_CV[name] = c; if (draw) draw(c.getContext('2d'), w, h); }
  return c;
}
function tmPost() {
  if (!TM_POST) return;
  const cv = ctx.canvas; if (cv.width !== W || cv.height !== H) return;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.filter = 'none'; ctx.globalAlpha = 1; ctx.setLineDash([]);
  if (TM_POST.glow > 0) {
    const w = Math.ceil(W / 4), h = Math.ceil(H / 4), a = tmCanvas('glowA', w, h), b = tmCanvas('glowB', w, h), ga = a.getContext('2d'), gb = b.getContext('2d');
    ga.globalCompositeOperation = 'copy'; ga.imageSmoothingEnabled = true; ga.drawImage(cv, 0, 0, w, h);
    ga.globalCompositeOperation = 'difference'; ga.fillStyle = TM.ground; ga.fillRect(0, 0, w, h);
    gb.globalCompositeOperation = 'copy'; gb.filter = 'blur(1.25px)'; gb.drawImage(a, 0, 0); gb.filter = 'none';
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = TM_POST.glow; ctx.imageSmoothingEnabled = true; ctx.drawImage(b, 0, 0, W, H);
  }
  if (TM_POST.band > 0) {   // a slow refresh band rolling down, a whole number of passes per loop
    const lp = typeof LOOP_T !== 'undefined' ? LOOP_T : 3, per = lp / Math.max(1, Math.round(lp / 3)), bh = H * 0.24, yb = -bh + (mod(TT, per) / per) * (H + bh);
    const g = ctx.createLinearGradient(0, yb, 0, yb + bh); g.addColorStop(0, 'rgba(255,230,190,0)'); g.addColorStop(0.55, 'rgba(255,230,190,1)'); g.addColorStop(1, 'rgba(255,230,190,0)');
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = TM_POST.band; ctx.fillStyle = g; ctx.fillRect(0, yb, W, bh);
  }
  ctx.globalCompositeOperation = 'source-over';
  if (TM_POST.scan > 0) {   // a dark line every 4px (a softer one beside it)
    const p = Math.max(3, Math.round(4 * UNIT)), t = tmCanvas('scan' + p, 4, p, (g, w) => { g.fillStyle = '#000'; g.fillRect(0, p - 1, w, 1); g.globalAlpha = 0.35; g.fillRect(0, p - 2, w, 1); });
    ctx.globalAlpha = TM_POST.scan; ctx.fillStyle = ctx.createPattern(t, 'repeat'); ctx.fillRect(0, 0, W, H);
  }
  if (TM_POST.grain > 0) {   // a seeded grain tile, nudged every 2 frames
    const t = tmCanvas('grain', 256, 256, (g, w, h) => { const R = RNG('tmgrain'), d = g.createImageData(w, h); for (let i = 0; i < d.data.length; i += 4) { const v = R.f() < 0.5 ? 0 : 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = Math.floor(R.f() * 255); } g.putImageData(d, 0, 0); });
    const R = RNG('tmgr', B), pat = ctx.createPattern(t, 'repeat'); pat.setTransform(new DOMMatrix([1, 0, 0, 1, Math.floor(R.r(0, 256)), Math.floor(R.r(0, 256))]));
    ctx.globalAlpha = TM_POST.grain; ctx.fillStyle = pat; ctx.fillRect(0, 0, W, H);
  }
  if (TM_POST.vignette > 0) {
    const v = tmCanvas('vig', W, H, (g, w, h) => { const D = Math.hypot(w, h) / 2, gr = g.createRadialGradient(w / 2, h / 2, D * 0.45, w / 2, h / 2, D * 1.02); gr.addColorStop(0, 'rgba(6,4,3,0)'); gr.addColorStop(1, 'rgba(6,4,3,1)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    ctx.globalAlpha = TM_POST.vignette; ctx.drawImage(v, 0, 0);
  }
  ctx.restore();
}

// =====================================================================
//  STYLE — the renderer's hooks (styles/README.md has the contract)
// =====================================================================
const STYLE = {
  name: 'terminal',
  paper: TM.ground,                                              // a morph happens on the warm black
  backdrop(c) { fillAll(c); },
  window(P, key, src) { tmWindow(P, key, src); },                // a pane opening onto the world
  blob(P, c, key, u) { tmBlob(P, c, key, u); },                  // a block of characters
  hero(x, y, r, o = {}) { tmCritter(x, y, r * 1.1, { mood: o.mood, key: o.key ?? 'morphhero' }); },
  heroColor: TM.terra,
  heroPts: (x, y, r) => rrectPts(x - r * 0.6, y - r * 0.55, r * 1.2, r * 1.1, r * 0.12),
  post() { tmPost(); },
  ones: true,                                                    // typing reads on 1s
};
