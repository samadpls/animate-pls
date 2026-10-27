// =====================================================================
//  styles/linocut/kit.js — a hand-carved relief print: warm black ink and ONE second ink (vermilion) on cream paper.
//  Nothing is drawn as a line; everything is carved or printed. A scene draws into two plates (the key block in
//  black, the second block in red) as coverage, carves white gouge marks out of them (V-gouge and U-gouge cuts that
//  follow the form, tapered at both ends), and linoPrint() pulls the print: each plate's edges are roughened by a
//  seeded warp, its ink is broken by a roller texture (paper showing through), the red block lands a few pixels off
//  register, and the inks multiply onto the paper. Every print boils a little (three re-printed variants on 2s).
//  Built on kit/core.js (RNG, clamp, lerp, resample, ellipsePts, trace, bbox, TT, B, ev, popS, DEFER, E0, SPARK_AT).
//  Needs from the piece head: W, H, CX (caption centre x), SAFE. Optional: `const LINO_FONT_STACK = '...'`.
//
//  Inside a scene:
//    linoPaper()                       the sheet (cached)
//    linoPrint(() => { ... })          draw the blocks: ctx is the black plate in here (any opaque colour = ink);
//      linoRed(() => { ... })          the same, on the red plate
//      linoCarve(() => { ... })        cut away (destination-out) on the current plate; linoCuts / linoGouge make the marks
//      linoKnock(() => { ... })        cut the same shape out of both plates (a white contour, a paper letter)
//    Text is a real fillText on the full-size plate (tools/textcheck.mjs reads it): linoText, linoUrdu.
// =====================================================================

// ---- palette: printed colours on this paper (the inks are stored as multiply factors over the paper)
const LINO_PAL = { paper: '#efe6d0', ink: '#1e1813', red: '#d8432b' };
const linoRGB = (c) => (c[0] === '#' ? [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) : (c.match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map(Number));
const LINO_P = linoRGB(LINO_PAL.paper);
const LINO_KF = linoRGB(LINO_PAL.ink).map((v, i) => v / LINO_P[i]);   // black ink: paper * KF
const LINO_RF = linoRGB(LINO_PAL.red).map((v, i) => v / LINO_P[i]);   // red ink:   paper * RF
// carved lettering: a wood-type slab (macOS Superclarendon, Windows Rockwell, then Georgia, Linux DejaVu Serif)
const LINO_FONT = typeof LINO_FONT_STACK !== 'undefined' ? LINO_FONT_STACK : 'Superclarendon, "Rockwell Extra Bold", Rockwell, Georgia, "DejaVu Serif", serif';
const LINO_URDU_FONTS = ['Noto Nastaliq Urdu', 'Urdu Typesetting', 'Jameel Noori Nastaleeq'];   // Nastaliq faces only
const linoV = (n = 3) => B % n;   // the print variant: each re-printed frame inks a little differently

// ---------------------------------------------------------------------
//  scratch canvases (static caches, keyed by size; nothing drawn on them carries between frames)
// ---------------------------------------------------------------------
const LINO_C = {};
function linoCanvas(id, w = W, h = H, read = false) {
  const k = id + w + 'x' + h;
  if (!LINO_C[k]) { const c = document.createElement('canvas'); c.width = w; c.height = h; LINO_C[k] = { c, g: c.getContext('2d', { willReadFrequently: read }) }; }
  return LINO_C[k];
}
// smooth value noise 0..255 over w x h: random cells upscaled with bilinear smoothing, octaves blended (cached by key)
function linoNoise(key, w, h, cells) {
  const k = 'n' + key + w + 'x' + h;
  if (LINO_C[k]) return LINO_C[k];
  const { c, g } = linoCanvas('nz' + key, w, h, true), R = RNG('linoNoise', key);
  g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
  cells.forEach(([cell, al], o) => {
    const cw = Math.ceil(w / cell) + 2, ch = Math.ceil(h / cell) + 2, s = linoCanvas('nzs' + key + o, cw, ch);
    const img = s.g.createImageData(cw, ch);
    for (let i = 0; i < cw * ch; i++) { const v = R.i(0, 255); img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
    s.g.putImageData(img, 0, 0);
    g.globalAlpha = al; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(s.c, 0, 0, cw, ch, -cell, -cell, cw * cell, ch * cell);
  });
  g.globalAlpha = 1;
  const d = g.getImageData(0, 0, w, h).data, out = new Uint8Array(w * h);
  let lo = 255, hi = 0;
  for (let i = 0; i < w * h; i++) { const v = d[i * 4]; if (v < lo) lo = v; if (v > hi) hi = v; }
  for (let i = 0; i < w * h; i++) out[i] = ((d[i * 4] - lo) * 255 / Math.max(1, hi - lo)) | 0;   // stretch to 0..255
  return (LINO_C[k] = out);
}

// ---------------------------------------------------------------------
//  THE PAPER: warm cream, soft mottle, fibres, specks and a fine tooth. Static, so cached per frame size.
// ---------------------------------------------------------------------
function linoPaperCanvas() {
  const k = 'paper' + W + 'x' + H;
  if (LINO_C[k]) return LINO_C[k];
  const { c, g } = linoCanvas('paperC'), R = RNG('linoPaper'), area = (W * H) / (1080 * 1080);
  g.fillStyle = LINO_PAL.paper; g.fillRect(0, 0, W, H);
  const tooth = linoNoise('tooth', W, H, [[3, 0.6], [9, 0.5], [70, 0.7]]), img = g.getImageData(0, 0, W, H), d = img.data;
  for (let i = 0; i < W * H; i++) { const t = (tooth[i] - 128) / 128, k2 = 1 + t * 0.028; d[i * 4] *= k2; d[i * 4 + 1] *= k2; d[i * 4 + 2] *= k2 * 0.995; }
  g.putImageData(img, 0, 0);
  g.lineCap = 'round';
  for (let i = 0; i < 260 * area; i++) {   // fibres: short curly hairs a shade darker (or lighter) than the sheet
    let x = R.r(0, W), y = R.r(0, H), a = R.r(0, TAU); const L = R.r(8, 26), bend = R.n(0.4);
    g.strokeStyle = R.f() < 0.75 ? `rgba(120,100,75,${R.r(0.08, 0.2)})` : `rgba(255,252,242,${R.r(0.3, 0.6)})`; g.lineWidth = R.r(0.6, 1.3);
    g.beginPath(); g.moveTo(x, y);
    for (let j = 0; j < 6; j++) { a += bend; x += Math.cos(a) * L / 6; y += Math.sin(a) * L / 6; g.lineTo(x, y); }
    g.stroke();
  }
  for (let i = 0; i < 420 * area; i++) { g.fillStyle = `rgba(95,80,60,${R.r(0.12, 0.35)})`; const s = R.r(0.8, 2); g.fillRect(R.r(0, W), R.r(0, H), s, s * R.r(0.6, 1.2)); }
  return (LINO_C[k] = c);
}
function linoPaper() { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(linoPaperCanvas(), 0, 0); ctx.restore(); }

// ---------------------------------------------------------------------
//  THE PRESS. Fields (cached once, read at a per-variant offset so every re-print differs):
//    warp  -2..2 px: the cut edge is never machine-straight (nearest sample, so steps read as tool nicks)
//    texK  black ink: brayer streaks along x, starved patches, pinholes of paper
//    texR  red ink: lighter, mottled "salt" texture
// ---------------------------------------------------------------------
const LINO_PAD = 96;
function linoFields() {
  const k = 'fields' + W + 'x' + H;
  if (LINO_C[k]) return LINO_C[k];
  const SW = W + LINO_PAD, SH = H + LINO_PAD, n = SW * SH;
  const wx = linoNoise('wx', SW, SH, [[7, 0.7], [22, 0.6]]), wy = linoNoise('wy', SW, SH, [[7, 0.7], [22, 0.6]]);
  const fine = linoNoise('fine', SW, SH, [[2, 0.7], [4, 0.45], [9, 0.25]]), coarse = linoNoise('coarse', SW, SH, [[30, 0.5], [110, 0.9]]);
  const salt = linoNoise('salt', SW, SH, [[2, 0.7], [3, 0.4], [7, 0.25]]);
  const WX = new Int8Array(n), WY = new Int8Array(n), TK = new Uint8Array(n), TR = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    WX[i] = Math.round((wx[i] - 128) / 52); WY[i] = Math.round((wy[i] - 128) / 52);   // about -2..2
    // black: solid ink, with crisp pinholes of paper; where the roller ran starved (coarse dips) the holes crowd in
    const c = coarse[i], f = fine[i], thr = 30 + Math.max(0, 105 - c) * 0.55;
    TK[i] = f < thr * 0.78 ? 0 : f < thr ? 110 : c < 45 ? 236 : 255;
    // red: a touch lighter, a finer mottled "salt" of paper through it
    const r = salt[i], rt = 34 + Math.max(0, 100 - c) * 0.35;
    TR[i] = r < rt * 0.75 ? 20 : r < rt ? 150 : c > 200 ? 236 : 250;
  }
  return (LINO_C[k] = { SW, WX, WY, TK, TR });
}
const LINO_REG = [[3, -2], [2, -3], [4, -2]];   // the red block's registration per re-print (px)

let LINO_PLATES = null;
function linoPlates() {
  if (LINO_PLATES && LINO_PLATES.w === W && LINO_PLATES.h === H) return LINO_PLATES;
  const k = linoCanvas('plateK', W, H, true), r = linoCanvas('plateR', W, H, true), o = linoCanvas('plateOut', W, H, true);
  return (LINO_PLATES = { w: W, h: H, k, r, o, img: o.g.createImageData(W, H) });
}
// pull a print: fn() draws the blocks (ctx = black plate). o.box = [x0, y0, x1, y1] in screen px limits the work;
// o.alpha fades the whole print (0..1, for a hold or a lift-off); o.reg overrides the red offset.
function linoPrint(fn, o = {}) {
  const target = ctx, T = target.getTransform(), P = linoPlates(), F2 = linoFields(), v = o.v ?? linoV();
  const bx0 = Math.max(0, Math.floor(o.box ? o.box[0] : 0)), by0 = Math.max(0, Math.floor(o.box ? o.box[1] : 0));
  const bx1 = Math.min(W, Math.ceil(o.box ? o.box[2] : W)), by1 = Math.min(H, Math.ceil(o.box ? o.box[3] : H));
  if (bx1 - bx0 < 2 || by1 - by0 < 2) return;
  for (const p of [P.k, P.r]) { const g = p.g; g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.clearRect(bx0, by0, bx1 - bx0, by1 - by0); g.setTransform(T); g.fillStyle = '#000'; g.strokeStyle = '#000'; }
  const keep = { ctx, red: LINO_ON_RED };
  ctx = P.k.g; LINO_ON_RED = false;
  try { fn(); } finally { ctx = keep.ctx; LINO_ON_RED = keep.red; }
  P.k.g.setTransform(1, 0, 0, 1, 0, 0); P.r.g.setTransform(1, 0, 0, 1, 0, 0);
  // the press: gather each plate through the warp, break the ink with the roller texture, multiply the inks
  const w = bx1 - bx0, h = by1 - by0;
  const K = P.k.g.getImageData(bx0, by0, w, h).data, Rd = P.r.g.getImageData(bx0, by0, w, h).data, out = P.img.data;
  const [rx, ry] = o.reg ?? LINO_REG[v % LINO_REG.length], al = clamp(o.alpha ?? 1);
  const { SW, WX, WY, TK, TR } = F2, ow = 31 * v + 11, oh = 23 * v + 7, tw = 29 * ((v + 1) % 3) + 5, th = 41 * ((v + 2) % 3) + 3;
  const k0 = 1 - LINO_KF[0], k1 = 1 - LINO_KF[1], k2 = 1 - LINO_KF[2], r0 = 1 - LINO_RF[0], r1 = 1 - LINO_RF[1], r2 = 1 - LINO_RF[2];
  for (let y = 0; y < h; y++) {
    const Y = y + by0, wrow = (Y + oh) * SW + ow, trow = (Y + th) * SW + tw;
    let oi = (Y * W + bx0) * 4;
    for (let x = 0; x < w; x++, oi += 4) {
      const X = x + bx0, wi = wrow + X, ti = trow + X;
      let sx = x + WX[wi], sy = y + WY[wi];
      sx = sx < 0 ? 0 : sx >= w ? w - 1 : sx; sy = sy < 0 ? 0 : sy >= h ? h - 1 : sy;
      const ck = K[(sy * w + sx) * 4 + 3] * TK[ti] * al / 65025;
      let qx = sx - rx, qy = sy - ry;
      qx = qx < 0 ? 0 : qx >= w ? w - 1 : qx; qy = qy < 0 ? 0 : qy >= h ? h - 1 : qy;
      const cr = Rd[(qy * w + qx) * 4 + 3] * TR[ti] * al / 65025;
      out[oi] = 255 * (1 - ck * k0) * (1 - cr * r0); out[oi + 1] = 255 * (1 - ck * k1) * (1 - cr * r1); out[oi + 2] = 255 * (1 - ck * k2) * (1 - cr * r2); out[oi + 3] = 255;
    }
  }
  P.o.g.putImageData(P.img, 0, 0, bx0, by0, w, h);
  target.save(); target.setTransform(1, 0, 0, 1, 0, 0); target.globalAlpha = 1; target.globalCompositeOperation = 'multiply';
  target.drawImage(P.o.c, bx0, by0, w, h, bx0, by0, w, h);
  target.restore();
}
// inside linoPrint: draw on the red block, cut away, or cut both blocks at once
let LINO_ON_RED = false;
function linoRed(fn) {
  const P = linoPlates(), keep = ctx, T = keep.getTransform(), was = LINO_ON_RED;
  ctx = P.r.g; ctx.setTransform(T); LINO_ON_RED = true;
  ctx.save(); try { fn(); } finally { ctx.restore(); ctx = keep; LINO_ON_RED = was; }
}
function linoCarve(fn) { ctx.save(); ctx.globalCompositeOperation = 'destination-out'; try { fn(); } finally { ctx.restore(); } }
function linoKnock(fn) {
  const P = linoPlates(), keep = ctx, T = keep.getTransform();
  for (const p of [P.k, P.r]) { ctx = p.g; ctx.setTransform(T); linoCarve(fn); }
  ctx = keep;
}

// ---------------------------------------------------------------------
//  THE GOUGES. A cut is a tapered polygon around a polyline: 'v' (V-gouge) enters and leaves sharp, widest past the
//  middle; 'u' (U-gouge) enters round and flicks out. w = the widest cut in px, or w(x, y) for a cut whose width
//  follows a tone. linoGouge appends to the current path; linoCuts carves a list (one fill: cheap).
//  The block is carved once: cut geometry is seeded by its key, never by B (the print boils, not the block).
// ---------------------------------------------------------------------
function linoGouge(P, w, o = {}) {
  const n = P.length; if (n < 2) return;
  const L = [0]; for (let i = 1; i < n; i++) L.push(L[i - 1] + dist(P[i - 1], P[i]));
  const tot = L[n - 1] || 1, u = o.kind === 'u', a = o.a ?? (u ? 0.12 : 0.3), b = o.b ?? (u ? 0.3 : 0.4), R = RNG('lg', o.key ?? '', n, P[0][0] | 0, P[0][1] | 0);
  const left = [], right = [];
  for (let i = 0; i < n; i++) {
    const s = L[i] / tot, p = P[i], q = P[Math.max(0, i - 1)], r = P[Math.min(n - 1, i + 1)];
    let nx = q[1] - r[1], ny = r[0] - q[0]; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    const up = s < a ? (u ? Math.sqrt(s / a) : s / a) : 1, dn = s > 1 - b ? (1 - s) / b : 1;
    const ww = (typeof w === 'function' ? w(p[0], p[1]) : w) * Math.min(up, dn) ** (u ? 0.5 : 0.85) * (1 + R.n(o.jit ?? 0.14)) / 2;
    left.push([p[0] + nx * ww, p[1] + ny * ww]); right.push([p[0] - nx * ww, p[1] - ny * ww]);
  }
  ctx.moveTo(left[0][0], left[0][1]);
  for (let i = 1; i < n; i++) ctx.lineTo(left[i][0], left[i][1]);
  for (let i = n - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
  ctx.closePath();
}
// list: polylines, or { P, w, kind } items. o: w, kind, step (resample), clip (outline the cuts stay inside), ink (draw, don't cut)
function linoCuts(list, o = {}) {
  const run = () => {
    if (o.clip) { trace(o.clip, true); ctx.clip(); }
    ctx.beginPath();
    list.forEach((it, i) => {
      const P = Array.isArray(it) ? it : it.P; if (!P || P.length < 2) return;
      const w = Array.isArray(it) ? o.w ?? 6 : it.w ?? o.w ?? 6;
      linoGouge(o.step === 0 ? P : resample(P, false, o.step ?? 6), w, { ...o, kind: (Array.isArray(it) ? null : it.kind) ?? o.kind, key: (o.key ?? 'c') + i });
    });
    ctx.fill('nonzero');
  };
  if (o.ink) { ctx.save(); run(); ctx.restore(); } else linoCarve(run);
}
// the engraver's shading: parallel cuts across an outline, widths from tone(x, y) 0..1 (0 = solid ink, 1 = widest).
// o: a (angle), gap, w (widest), tone, len [min, max], skip [min, max], wave [amp, freq], kind, key
function linoHatch(clip, o = {}) {
  const bb = o.bb || bbox(clip), a = o.a ?? 0, gap = o.gap ?? 14, S = RNG('lh', o.key ?? 'h');
  const cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2, rad = Math.hypot(bb.x1 - bb.x0, bb.y1 - bb.y0) / 2 + 4;
  const ca = Math.cos(a), sa = Math.sin(a), tone = o.tone ?? (() => 0.6), wmax = o.w ?? gap * 0.62, list = [];
  for (let d = -rad; d <= rad; d += gap) {
    const dd = d + S.n(gap * 0.14);
    let u = -rad + S.r(0, 40);
    while (u < rad) {
      const u2 = Math.min(rad, u + S.r(...(o.len ?? [70, 240]))), P = [];
      for (let s = u; s <= u2; s += 6) { const wv = o.wave ? Math.sin(s * o.wave[1] + dd * 0.07) * o.wave[0] : 0; P.push([cx + ca * s - sa * (dd + wv), cy + sa * s + ca * (dd + wv)]); }
      if (P.length > 2) { const m = P[P.length >> 1]; if (tone(m[0], m[1]) > 0.05) list.push({ P, w: (x, y) => wmax * clamp(tone(x, y)) }); }
      u = u2 + S.r(...(o.skip ?? [10, 46]));
    }
  }
  linoCuts(list, { kind: o.kind ?? 'v', clip, step: 0, key: o.key ?? 'h', jit: 0.1, ink: o.ink });
}
// echo cuts: broken lines following an outline inward (n rings, gap apart), the classic contour carving
function linoEcho(P, o = {}) {
  const Q = resample(P, true, 6), n = Q.length, S = RNG('le', o.key ?? 'e'), list = [];
  const c = Q.reduce((s, p) => [s[0] + p[0] / n, s[1] + p[1] / n], [0, 0]);
  for (let k = 1; k <= (o.n ?? 3); k++) {
    const d = k * (o.gap ?? 16), ring = Q.map((p, i) => {
      const q = Q[(i - 1 + n) % n], r = Q[(i + 1) % n]; let nx = q[1] - r[1], ny = r[0] - q[0]; const l = Math.hypot(nx, ny) || 1;
      if (nx * (c[0] - p[0]) + ny * (c[1] - p[1]) < 0) { nx = -nx; ny = -ny; }   // the normal that points inside
      return [p[0] + nx / l * d, p[1] + ny / l * d];
    });
    let i = S.i(0, n - 1);
    for (let left = n * (o.cover ?? 0.8); left > 0;) {
      const len = Math.min(left, S.i(8, 26)), seg2 = []; for (let j = 0; j < len; j++) seg2.push(ring[(i + j) % n]);
      list.push({ P: seg2, w: (o.w ?? 6) * (1 - (k - 1) * 0.18) });
      const skip = S.i(2, 7); i = (i + len + skip) % n; left -= len + skip;
    }
  }
  linoCuts(list, { kind: o.kind ?? 'v', clip: P, step: 0, key: (o.key ?? 'e') + 'c', ink: o.ink });
}
// spiral arms around (cx, cy) from r0 out to r1: storms, whirlpools, a cloud's curl. o: arms, turns, rot, w, kind
function linoSpiral(cx, cy, r0, r1, o = {}) {
  const list = [], arms = o.arms ?? 6, turns = o.turns ?? 0.9, S = RNG('ls', o.key ?? 's');
  for (let j = 0; j < arms; j++) {
    const a0 = (o.rot ?? 0) + j / arms * TAU + S.n(0.2), P = [], k = Math.log(r1 / r0) / (turns * TAU), len = S.r(0.55, 1);
    for (let t = 0; t <= turns * TAU * len; t += 0.06) { const r = r0 * Math.exp(k * t) * (1 + S.n(0.015)); P.push([cx + Math.cos(a0 + t * (o.dir ?? 1)) * r, cy + Math.sin(a0 + t * (o.dir ?? 1)) * r * (o.sy ?? 1)]); }
    list.push({ P, w: (x, y) => (o.w ?? 14) * (0.35 + 0.65 * clamp(Math.hypot(x - cx, y - cy) / r1)) });
  }
  linoCuts(list, { kind: o.kind ?? 'v', clip: o.clip, step: 0, key: o.key ?? 's', a: 0.15, b: 0.55, ink: o.ink });
}
// rows of U-gouge scallops (a sea): rows from y0 down to y1, each scoop `size` wide, alternate rows offset
function linoScallops(x0, x1, y0, y1, o = {}) {
  const size = o.size ?? 60, gap = o.gap ?? size * 0.42, S = RNG('lsc', o.key ?? 'sc'), list = [];
  let row = 0;
  for (let y = y0; y < y1; y += gap, row++) {
    const k = o.grow ? lerp(1, o.grow, (y - y0) / Math.max(1, y1 - y0)) : 1, sz = size * k, sh = (o.shift ?? 0) + (row % 2) * sz * 0.5;
    for (let x = x0 - sz + (sh % sz); x < x1; x += sz) {
      const P = [], h = sz * (o.lift ?? 0.32) * S.r(0.8, 1.15);
      for (let i = 0; i <= 10; i++) { const u = i / 10; P.push([x + u * sz * 0.92, y + gap * 0.1 - Math.sin(u * Math.PI) * h + S.n(1)]); }
      list.push({ P, w: (o.w ?? sz * 0.12) * k });
    }
  }
  linoCuts(list, { kind: 'u', clip: o.clip, step: 0, key: o.key ?? 'sc', ink: o.ink });
}
// U-gouge stabs: spray, stars, raindrops. pts [[x, y, size, angle]]
function linoDots(pts, o = {}) {
  const run = () => {
    if (o.clip) { trace(o.clip, true); ctx.clip(); }
    ctx.beginPath();
    for (const [x, y, s, a = 0] of pts) { ctx.moveTo(x + Math.cos(a) * s, y + Math.sin(a) * s); ctx.ellipse(x, y, s, s * (o.flat ?? 0.62), a, 0, TAU); }
    ctx.fill();
  };
  if (o.ink) { ctx.save(); run(); ctx.restore(); } else linoCarve(run);
}
// chatter: the ridges a gouge leaves in a cleared area. They print faint and broken: the mark of a hand-cleared block
function linoChatter(x0, y0, x1, y1, o = {}) {
  const S = RNG('lch', o.key ?? 'ch'), n = o.n ?? Math.round((x1 - x0) * (y1 - y0) / 9000), a = o.a ?? 0;
  ctx.save(); ctx.globalAlpha = o.al ?? 0.55; ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x = S.r(x0, x1), y = S.r(y0, y1), aa = a + S.n(0.12), L = S.r(14, 60), P = [];
    for (let s = 0; s <= L; s += 5) P.push([x + Math.cos(aa) * s, y + Math.sin(aa) * s + Math.sin(s * 0.08) * 1.5]);
    linoGouge(P, S.r(1.4, 3.2), { kind: 'v', key: 'ch' + i });
  }
  ctx.fill(); ctx.restore();
}
// a solid block shape on the current plate. o.halo: first cut a white contour that wide around it (on this plate),
// o.wob: a hand-cut wobble of the edge (seeded per key, static)
function linoBlock(P, o = {}) {
  const Q = o.wob ? linoWob(P, o.wob, o.key ?? 'b') : P;
  if (o.halo) linoCarve(() => { trace(Q, true); ctx.lineWidth = o.halo * 2; ctx.lineJoin = 'round'; ctx.stroke(); ctx.fill(); });
  ctx.save(); trace(Q, true); ctx.fill(o.rule ?? 'nonzero'); ctx.restore();
  return Q;
}
const linoWob = (P, amt, key) => { const B0 = B; B = 0; const Q = wobble(P, true, amt, 'lw' + key, 9); B = B0; return Q; };   // static: the block does not boil

// ---------------------------------------------------------------------
//  CARVED LETTERING: a wood-type slab, every glyph set a little off by hand (seeded per letter: cut once).
//  o: weight, font, align, track (px between letters), tilt, carve (cut it out: paper letters), key
// ---------------------------------------------------------------------
function linoTextW(str, size, o = {}) { ctx.save(); ctx.font = `${o.weight ?? 900} ${size}px ${o.font ?? LINO_FONT}`; const w = ctx.measureText(str).width + (o.track ?? 0) * (str.length - 1); ctx.restore(); return w; }
function linoText(str, x, y, size, o = {}) {
  ctx.save(); ctx.font = `${o.weight ?? 900} ${size}px ${o.font ?? LINO_FONT}`; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  if (o.carve) ctx.globalCompositeOperation = 'destination-out';
  const tr = o.track ?? 0, total = ctx.measureText(str).width + tr * (str.length - 1);
  const x0 = o.align === 'center' ? x - total / 2 : o.align === 'right' ? x - total : x;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i]; if (ch === ' ') continue;
    const dx = ctx.measureText(str.slice(0, i)).width + tr * i, w = ctx.measureText(ch).width, R = RNG('ltx', o.key ?? str, i), k = 1 + R.n(o.grow ?? 0.025);
    ctx.save(); ctx.translate(x0 + dx + w / 2, y + R.n(size * (o.lift ?? 0.022))); ctx.rotate(R.n(o.tilt ?? 0.03)); ctx.scale(k, k);
    ctx.fillText(ch, -w / 2, 0); ctx.restore();
  }
  ctx.restore();
  return { x0, x1: x0 + total, w: total };
}
// the Urdu line: one shaped right-to-left string in a Nastaliq face found on this machine, or null (then leave it out)
let LINO_URDU;
function linoUrduFont() {
  if (LINO_URDU !== undefined) return LINO_URDU;
  const g = linoCanvas('probe', 8, 8).g, s = 'نغمۂ موج ہے';
  const m = (f) => { g.font = `40px ${f}`; return g.measureText(s).width; };
  return (LINO_URDU = LINO_URDU_FONTS.find((f) => m(`"${f}", monospace`) !== m('monospace') || m(`"${f}", serif`) !== m('serif')) ?? null);
}
function linoUrdu(str, x, y, size, o = {}) {   // x = the right end (the line starts there)
  const f = linoUrduFont(); if (!f) return null;
  ctx.save(); ctx.font = `${o.weight ?? 400} ${size}px "${f}"`; ctx.direction = 'rtl'; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
  if (o.carve) ctx.globalCompositeOperation = 'destination-out';
  const m = ctx.measureText(str); ctx.fillText(str, x, y); ctx.restore();
  return { x0: x - m.width, x1: x, w: m.width, asc: m.actualBoundingBoxAscent, desc: m.actualBoundingBoxDescent };
}

// ---------------------------------------------------------------------
//  THE ROLLER PASS: what fn() draws prints only where the brayer has been (u 0..1 across box [x0, y0, x1, y1]);
//  the leading edge is a ragged band of streaks along the roll. o: dir 'right' | 'left' | 'down' | 'up', band, key
// ---------------------------------------------------------------------
function linoRoll(u, box, fn, o = {}) {
  if (u <= 0) return; if (u >= 1) { fn(); return; }
  const [x0, y0, x1, y1] = box, band = o.band ?? 80, S = RNG('roll', o.key ?? 'r'), dir = o.dir ?? 'right', hz = dir === 'right' || dir === 'left';
  const span = (hz ? x1 - x0 : y1 - y0) + band, e = span * EZ.io(u) - band;   // the edge's distance from the start side
  ctx.save(); ctx.beginPath();
  const R = (a, b, len, th) => (hz ? (dir === 'right' ? ctx.rect(x0 + a, b, len, th) : ctx.rect(x1 - a - len, b, len, th)) : (dir === 'down' ? ctx.rect(b, y0 + a, th, len) : ctx.rect(b, y1 - a - len, th, len)));
  R(0, hz ? y0 : x0, Math.max(0, e), hz ? y1 - y0 : x1 - x0);
  for (let s = hz ? y0 : x0, end = hz ? y1 : x1; s < end;) { const th = S.r(3, 10); R(Math.max(0, e), s, S.r(0, band) ** 1.2 / band ** 0.2, th + 0.5); s += th; }
  ctx.clip(); fn(); ctx.restore();
}

// ---------------------------------------------------------------------
//  A RISING WAVE: a tube from the sea at base up its back and over into a curl around `curl`, carved with flow
//  lines that follow it and foam scoops along the crest. Draws on the current plate. o: base [x, y], curl [x, y],
//  r (curl radius), w (tube width at the base), turn (how far the curl has rolled, 0..1.4), rise (0..1, the wave
//  grows out of the sea), n (flow cuts), halo, key. Returns { P: outline, tip, crest: outer edge points }.
// ---------------------------------------------------------------------
function linoWave(o) {
  const [bx, by] = o.base, rise = o.rise ?? 1, cx = o.curl[0], cy = lerp(by, o.curl[1], rise), r = o.r * lerp(0.5, 1, rise), w = o.w ?? 300;
  const sx = cx - r, Q = [];
  for (let i = 0; i <= 40; i++) {   // the back: a cubic from the base up to the left side of the curl, arriving upright
    const t = i / 40, a = [bx, by], b = [bx + (sx - bx) * 0.15, lerp(by, cy, 0.55)], c = [sx, lerp(by, cy, 0.85)], d = [sx, cy];
    const m = 1 - t; Q.push([m * m * m * a[0] + 3 * m * m * t * b[0] + 3 * m * t * t * c[0] + t * t * t * d[0], m * m * m * a[1] + 3 * m * m * t * b[1] + 3 * m * t * t * c[1] + t * t * t * d[1]]);
  }
  const turn = (o.turn ?? 1) * TAU, nC = Math.max(6, Math.round(turn / 0.08));
  for (let i = 1; i <= nC; i++) { const th = Math.PI + turn * i / nC, rr = r * Math.exp(-0.2 * (th - Math.PI)); Q.push([cx + Math.cos(th) * rr, cy + Math.sin(th) * rr]); }
  const C = resample(Q, false, 7), n = C.length, L = [0];
  for (let i = 1; i < n; i++) L.push(L[i - 1] + dist(C[i - 1], C[i]));
  const tot = L[n - 1], NRM = C.map((p, i) => { const q = C[Math.max(0, i - 1)], s = C[Math.min(n - 1, i + 1)]; let nx = q[1] - s[1], ny = s[0] - q[0]; const l = Math.hypot(nx, ny) || 1; return [nx / l, ny / l]; });
  const half = (s) => (w / 2) * (1 - s) ** 1.15 + 3, at = (i, k) => { const s = L[i] / tot, h = half(s) * k; return [C[i][0] + NRM[i][0] * h, C[i][1] + NRM[i][1] * h]; };
  const O = C.map((_, i) => at(i, 1)), I = C.map((_, i) => at(i, -1)), P = [...O, ...I.slice().reverse()];
  if (o.halo) linoCarve(() => { trace(P, true); ctx.lineWidth = o.halo * 2; ctx.lineJoin = 'round'; ctx.stroke(); ctx.fill(); });
  ctx.save(); trace(P, true); ctx.fill(); ctx.restore();
  // flow cuts: bands between the edges, broken, wider toward the crest and the outside (the light catches the back)
  const S = RNG('lwv', o.key ?? 'w'), cuts = [], nb = o.n ?? 9;
  for (let b = 0; b < nb; b++) {
    const k = lerp(0.82, -0.7, b / Math.max(1, nb - 1)) + S.n(0.03);
    let i = S.i(0, 10);
    while (i < n - 4) {
      const len = S.i(9, 26), seg2 = []; for (let j = i; j < Math.min(n - 2, i + len); j++) seg2.push(at(j, k));
      if (seg2.length > 2) cuts.push({ P: seg2, w: (x, y) => (o.cw ?? 9) * (0.45 + 0.75 * (k + 1) / 2) * (0.5 + 0.7 * Math.min(1, L[Math.min(n - 1, i + len)] / tot)) });
      i += len + S.i(2, 9);
    }
  }
  linoCuts(cuts, { kind: 'v', clip: P, step: 0, key: (o.key ?? 'w') + 'f' });
  // foam: U-gouge scoops along the crest's outer edge, bitten in from outside
  const foam = [];
  for (let i = Math.round(n * 0.42); i < n - 3; i += S.i(2, 4)) {
    const p = O[i], q = NRM[i], s = L[i] / tot, d = (o.foam ?? 26) * (0.5 + s * 0.6) * S.r(0.6, 1.1);
    foam.push({ P: [[p[0] + q[0] * 4, p[1] + q[1] * 4], [p[0] - q[0] * d * 0.5 + S.n(3), p[1] - q[1] * d * 0.5], [p[0] - q[0] * d, p[1] - q[1] * d]], w: d * 0.55 });
  }
  linoCuts(foam, { kind: 'u', step: 4, key: (o.key ?? 'w') + 'foam' });
  return { P, tip: C[n - 1], crest: O.slice(Math.round(n * 0.4)), C, O };
}

// ---------------------------------------------------------------------
//  THE HERO: a carved swallow. A black block bird with gouged wing feathers and a white eye; its throat is the red
//  block. (x, y) its middle, s its half-span, facing +x. o: flap (0..1 phase; default flaps on 2s), tilt (rad), halo
//  (a white contour cut around it, for dark grounds), key. Sets SPARK_AT. linoBirdPts: its outline (bridges).
// ---------------------------------------------------------------------
function linoBirdPts(x, y, s, o = {}) {
  // wings on 2s: the far wing swings high to low, the near wing folds in as it rises; some wing always shows
  const f = o.flap ?? (B % 4) / 4, up = (Math.cos(f * TAU) + 1) / 2, wy = lerp(0.5, 1.08, up), wn = lerp(0.95, 0.42, up), wx = lerp(-0.08, 0.06, up);
  const L = [   // around the bird: beak, crown, the far wing, the forked tail, the near wing, the chin
    [0.78, 0.03], [0.6, -0.1], [0.42, -0.15], [0.2, -0.12],
    [0.04 + wx, -0.4 * wy], [-0.22 + wx, -0.8 * wy], [-0.5 + wx, -1.0 * wy], [-0.3 + wx, -0.62 * wy], [-0.22, -0.2], [-0.12, -0.12],
    [-0.48, -0.1], [-0.82, -0.24], [-1.14, -0.38], [-0.86, -0.12], [-0.66, -0.0], [-0.86, 0.12], [-1.1, 0.3], [-0.78, 0.17], [-0.42, 0.11],
    [-0.12, 0.13], [-0.22 + wx, 0.42 * wn], [-0.5 + wx, 0.9 * wn], [-0.22 + wx, 0.58 * wn], [0.12, 0.17], [0.42, 0.14], [0.6, 0.1],
  ];
  const c = Math.cos(o.tilt ?? 0), sn = Math.sin(o.tilt ?? 0);
  return L.map(([u, v]) => [x + (u * c - v * sn) * s, y + (u * sn + v * c) * s]);
}
function linoBird(x, y, s, o = {}) {
  const key = o.key ?? 'bird', f = o.flap ?? (B % 4) / 4, P = linoBirdPts(x, y, s, { ...o, flap: f });
  const c = Math.cos(o.tilt ?? 0), sn = Math.sin(o.tilt ?? 0), at = (u, v) => [x + (u * c - v * sn) * s, y + (u * sn + v * c) * s];
  const Q = resample(P, true, Math.max(3, s * 0.06));
  if (o.halo) linoKnock(() => { trace(Q, true); ctx.lineWidth = o.halo * 2; ctx.lineJoin = 'round'; ctx.stroke(); ctx.fill(); });
  ctx.save(); trace(Q, true); ctx.fill(); ctx.restore();
  // feathers: V-cuts down each wing from the shoulder toward the tip, a belly line, the eye
  const wing = (side) => { const k = side < 0 ? P.slice(4, 8) : P.slice(20, 23); return k; };
  const cuts = [], up = wing(-1), dn = wing(1), sh = at(-0.02, -0.12), sh2 = at(-0.05, 0.14);
  [0.25, 0.5, 0.75].forEach((t) => { const tp = up[2]; cuts.push({ P: [lerp2(sh, tp, 0.08), lerp2(lerp2(sh, up[3], t), tp, 0.55)], w: s * 0.05 }); });
  [0.35, 0.7].forEach((t) => { const tp = dn[1]; cuts.push({ P: [lerp2(sh2, tp, 0.1), lerp2(lerp2(sh2, dn[2], t), tp, 0.6)], w: s * 0.045 }); });
  cuts.push({ P: [at(0.3, 0.09), at(0.0, 0.1), at(-0.35, 0.06)], w: s * 0.04 });
  linoCuts(cuts, { kind: 'v', step: s * 0.05, key: key + 'f' });
  linoDots([[...at(0.5, -0.04), s * 0.055, 0]], { flat: 1 });
  // the red throat: cut from the black block, printed by the red one
  const throat = [at(0.62, 0.09), at(0.5, 0.0), at(0.36, 0.02), at(0.26, 0.12), at(0.44, 0.15)];
  linoCarve(() => { trace(throat, true); ctx.fill(); });
  linoRed(() => { trace(throat, true); ctx.fill(); ctx.lineWidth = s * 0.03; ctx.stroke(); });
  SPARK_AT = toScreen(x, y);
  return P;
}
const lerp2 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

// a carved ring around outline P: a black band w wide with short radial gouges across it (the window's rim)
function linoRing(P, w, o = {}) {
  const Q = resample(P, true, 6), n = Q.length, c = Q.reduce((s, p) => [s[0] + p[0] / n, s[1] + p[1] / n], [0, 0]);
  ctx.save(); trace(Q, true); ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore();
  const S = RNG('lring', o.key ?? 'ring'), cuts = [];
  for (let i = 0; i < n; i += o.every ?? 3) {
    const p = Q[i], q = Q[(i + 1) % n], r = Q[(i - 1 + n) % n]; let nx = r[1] - q[1], ny = q[0] - r[0]; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    if (nx * (p[0] - c[0]) + ny * (p[1] - c[1]) < 0) { nx = -nx; ny = -ny; }   // outward
    const a = S.r(-0.45, -0.1) * w, b = S.r(0.15, 0.45) * w;
    cuts.push({ P: [[p[0] + nx * a, p[1] + ny * a], [p[0] + nx * b, p[1] + ny * b]], w: S.r(2.5, 5) });
  }
  linoCuts(cuts, { kind: 'v', step: 3, key: (o.key ?? 'ring') + 'c' });
}

// ---------------------------------------------------------------------
//  CAPTIONS (DEFER: printed after the camera, at screen size). A tag is a small black block with its words cut out
//  (top left, inside SAFE); a caption is a line of black letters printed under the picture. Both roll in on a paper
//  label laid first (a print can only darken what is under it, so a dark ground would swallow them).
// ---------------------------------------------------------------------
function linoLabel(u, box, key) {
  linoRoll(u, box, () => {
    const [x0, y0, x1, y1] = box;
    ctx.save(); trace(linoWob(resample([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], true, 16), 2, key), true); ctx.clip();
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(linoPaperCanvas(), 0, 0); ctx.restore();
  }, { key: key + 'r' });
}
function linoTagNow(str, o = {}) {
  const size = o.size ?? 64, w = linoTextW(str, size, { weight: 900 }) + size * 0.9, h = size * 1.45, x = o.x ?? 70, y = o.y ?? SAFE.top + 60;
  const u = ev(E0 + (o.t ?? 0.15), 0.35);
  if (u <= 0) return;
  linoLabel(u, [x - 12, y - 12, x + w + 12, y + h + 12], 'tagp' + str);
  linoPrint(() => linoRoll(u, [x - 10, y - 10, x + w + 10, y + h + 10], () => {
    linoBlock(resample([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], true, 18), { wob: 2.2, key: 'tag' + str });
    linoText(str, x + size * 0.45, y + h * 0.5 + size * 0.36, size, { carve: true, key: 'tag' + str });
  }, { key: 'tagroll' }), { box: [x - 30, y - 30, x + w + 30, y + h + 30] });
}
function linoCaptionNow(str, o = {}) {
  const size = o.size ?? 56, y = o.y ?? H - SAFE.bottom - 40, w = linoTextW(str, size, { weight: o.weight ?? 700 }), x = o.x ?? CX;
  const u = ev(E0 + (o.t ?? 0.5), 0.45);
  if (u <= 0) return;
  if (o.label !== false) linoLabel(u, [x - w / 2 - 22, y - size * 1.05, x + w / 2 + 22, y + size * 0.62], 'capp' + str);
  linoPrint(() => linoRoll(u, [x - w / 2 - 20, y - size * 1.2, x + w / 2 + 20, y + size * 0.6], () => {
    linoText(str, x, y, size, { weight: o.weight ?? 700, align: 'center', key: 'cap' + str });
    linoCuts([[[x - w * 0.3, y + size * 0.32], [x + w * 0.3, y + size * 0.36]]], { ink: true, w: 5, kind: 'v', key: 'capr' });
  }, { key: 'caproll' }), { box: [x - w / 2 - 40, y - size * 1.4, x + w / 2 + 40, y + size * 0.8] });
}
const linoTag = (str, o = {}) => { const f = () => linoTagNow(str, o); if (DEFER) DEFER.push(f); else f(); };
const linoCaption = (str, o = {}) => { const f = () => linoCaptionNow(str, o); if (DEFER) DEFER.push(f); else f(); };

// =====================================================================
//  STYLE — the renderer's hooks (styles/README.md). Each prints a small sheet over what ctx shows.
// =====================================================================
const linoNearRed = (c) => { const v = linoRGB(c), d = (q) => Math.hypot(v[0] - q[0], v[1] - q[1], v[2] - q[2]); return d(linoRGB(LINO_PAL.red)) < d(linoRGB(LINO_PAL.ink)); };
const linoBoxOf = (P, pad) => { const b = bbox(P, pad); return [b.x0, b.y0, b.x1, b.y1]; };
const STYLE = {
  name: 'linocut',
  paper: LINO_PAL.paper,
  backdrop(c) {   // the paper, tinted toward c (keeps the grain): c / paper multiplied over the sheet
    linoPaper();
    const v = linoRGB(c); if (Math.abs(v[0] - LINO_P[0]) + Math.abs(v[1] - LINO_P[1]) + Math.abs(v[2] - LINO_P[2]) < 4) return;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = `rgb(${v.map((x, i) => Math.min(255, Math.round(x / LINO_P[i] * 255))).join(',')})`; ctx.fillRect(0, 0, W, H); ctx.restore();
  },
  window(P, key, src) {   // the world seen through a carved round frame: a black band with radial gouges
    ctx.save(); trace(P, true); ctx.clip(); ctx.drawImage(src, 0, 0); ctx.restore();
    const b = bbox(P), r = Math.min(b.x1 - b.x0, b.y1 - b.y0), w = clamp(r * 0.06, 10, 34);
    linoPrint(() => linoRing(P, w, { key }), { box: linoBoxOf(P, w + 12) });
  },
  blob(P, c, key, u) {   // a carved shape: a block in the bridge's ink, echo cuts inside its edge and light from the top left
    const b = bbox(P), r = Math.max(30, Math.min(b.x1 - b.x0, b.y1 - b.y0) / 2), red = linoNearRed(c);
    const draw = () => {
      linoBlock(P);
      linoEcho(P, { n: 2, gap: clamp(r * 0.12, 8, 26), w: clamp(r * 0.05, 3, 10), key: 'blobE' });
      linoHatch(P, { a: -0.6, gap: clamp(r * 0.1, 8, 22), key: 'blobH', tone: (x, y) => clamp(1.1 - ((x - b.x0) + (y - b.y0)) / ((b.x1 - b.x0) + (b.y1 - b.y0)) * 2.2) });
    };
    linoPrint(() => (red ? linoRed(draw) : draw()), { box: linoBoxOf(P, 16) });
  },
  hero(x, y, r, o = {}) { linoPrint(() => linoBird(x, y, r, { key: o.key ?? 'hero' }), { box: [x - r * 1.4, y - r * 1.2, x + r * 1.1, y + r * 1.2] }); },
  heroColor: LINO_PAL.red,
  heroPts: (x, y, r) => resample(linoBirdPts(x, y, r, { flap: 0.25 }), true, Math.max(4, r * 0.05)),
  post() {},
  ones: false,
};
