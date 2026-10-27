// =====================================================================
//  styles/chalkboard/kit.js — a classroom slate: a deep green-black board with the ghosts of old lessons and eraser
//  swirls, a wooden frame and a chalk ledge, and everything on it drawn in chalk, stroke by stroke. A chalk stroke is a
//  soft core plus thin broken fibres along it (dry brush, seeded per stroke, boiling on 2s); every chalk mark then loses
//  the slate's tiny pits (a seeded tile anchored to the board), so lettering in any handwriting face reads as chalk.
//  Dust falls from the stick as it writes. White chalk and three colours: warm yellow, coral, pale teal.
//  Built on kit/core.js (RNG, wobble, resample, subPath, pointAt, ellipsePts, arcPts, trace, bbox, TT / ev / E0 /
//  DEFER / SPARK_AT, LX / LY / UNIT / PORTRAIT / WIDE). Needs from the piece head: W, H, FPS, CX, SAFE.
//  Optional before the kit: `const CH_SLATE = true` for a warm charcoal slate instead of the green board.
//  The chalk technique (a stroke laid at partial alpha, then dust holes punched out of it) follows the idea of
//  0xmmo/chalkboard (MIT, by Mohamed Moustafa); no code was copied: this is a rewrite on seeded RNG and a pit tile.
//
//  Draw chalk inside chalk(() => { ... }): it collects the strokes on a scratch layer, punches the pits once, and lays
//  the layer on the board. Chalk functions called outside one open their own (fine for one-offs, slower in bulk).
// =====================================================================

// ---- palette: the board, four chalks, the frame
const CH_SLATEMODE = typeof CH_SLATE !== 'undefined' && !!CH_SLATE;
const CHP = {
  board: CH_SLATEMODE ? '#2a2826' : '#1f2c26',     // the slate (green-black, or warm charcoal)
  boardD: CH_SLATEMODE ? '#1e1c1a' : '#16201b',    // a freshly wiped strip
  white: '#f1eee2',     // structure, lettering
  yellow: '#f2cf66',    // what the story follows (the moving thing, the focus, emphasis on it)
  coral: '#f0866a',     // the hero, only the hero
  teal: '#8acdbf',      // secondary: labels, registers, measures, underlines
  dust: '#e6e3d6',      // airborne chalk dust and eraser haze
  wood: '#93623a', woodD: '#5e3a20', woodL: '#c08c5a', felt: '#3b3a36',
};
// a handwriting face per OS: Chalkduster (macOS), Ink Free / Segoe Print (Windows), Comic Neue or the cursive default
// (Linux). The pits and the powdery double print make any of them read as chalk.
const CHFONT = '"Chalkduster", "Ink Free", "Segoe Print", "Chalkboard SE", "Bradley Hand", "Comic Neue", "Comic Sans MS", cursive';
const CH_W = 6.5 * UNIT;   // the default chalk line at 1080

// ---------------------------------------------------------------------
//  the chalk layer: strokes collect on a scratch canvas, lose the slate's pits, then land on the board
// ---------------------------------------------------------------------
let CH_L = null, CH_DEPTH = 0, CH_GRAIN = null;
function chGrainTile() {   // a seeded tile of the slate's hollows: powder holes, pits and a few voids (wrapped at the edges)
  if (CH_GRAIN) return CH_GRAIN;
  const S = 320, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'), R = RNG('chgrain');
  g.fillStyle = '#000';
  for (let i = 0; i < 15000; i++) { g.globalAlpha = R.r(0.1, 0.5); g.fillRect(Math.floor(R.r(0, S)), Math.floor(R.r(0, S)), 1, 1); }
  const dot = (x, y, rx, ry, a) => { for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { g.beginPath(); g.ellipse(x + ox, y + oy, rx, ry, a, 0, TAU); g.fill(); } };
  for (let i = 0; i < 2300; i++) { g.globalAlpha = R.r(0.5, 1); const s = R.r(0.9, 2.5); dot(R.r(0, S), R.r(0, S), s, s * R.r(0.5, 1), R.r(0, TAU)); }
  for (let i = 0; i < 110; i++) { g.globalAlpha = R.r(0.8, 1); const s = R.r(2.5, 4.2); dot(R.r(0, S), R.r(0, S), s, s * R.r(0.35, 0.7), R.r(0, TAU)); }
  g.globalAlpha = 1;
  return (CH_GRAIN = c);
}
function chalk(fn, o = {}) {
  if (CH_DEPTH > 0) { fn(); return; }
  if (!CH_L || CH_L.width !== W || CH_L.height !== H) { CH_L = document.createElement('canvas'); CH_L.width = W; CH_L.height = H; }
  const g = CH_L.getContext('2d'), m = ctx.getTransform(), main = ctx;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.clearRect(0, 0, W, H); g.restore();
  g.save(); g.setTransform(m); g.globalAlpha = 1; g.setLineDash([]); g.filter = 'none'; g.globalCompositeOperation = 'source-over';
  ctx = g; CH_DEPTH++;
  try { fn(); } finally { CH_DEPTH--; ctx = main; g.restore(); }
  // the pits: anchored to the board (world space), so they stay put while the strokes boil over them
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'destination-out'; g.globalAlpha = o.pits ?? 1;
  const pat = g.createPattern(chGrainTile(), 'repeat'); pat.setTransform(m); g.fillStyle = pat; g.fillRect(0, 0, W, H);
  g.restore();
  main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = o.alpha ?? 1; main.drawImage(CH_L, 0, 0); main.restore();
}

// ---------------------------------------------------------------------
//  strokes: a soft core and thin broken fibres along it; write-on with frac
// ---------------------------------------------------------------------
function chOffset(Q, s) {   // a polyline moved s along its normals
  const n = Q.length, out = new Array(n);
  for (let i = 0; i < n; i++) {
    const a = Q[Math.max(0, i - 1)], b = Q[Math.min(n - 1, i + 1)], nx = a[1] - b[1], ny = b[0] - a[0], l = Math.hypot(nx, ny) || 1;
    out[i] = [Q[i][0] + nx / l * s, Q[i][1] + ny / l * s];
  }
  return out;
}
function chPoly(Q) { ctx.beginPath(); ctx.moveTo(Q[0][0], Q[0][1]); for (let i = 1; i < Q.length; i++) ctx.lineTo(Q[i][0], Q[i][1]); }
function chDash(S, w) { const d = []; for (let i = 0; i < 8; i++) d.push(S.r(w * 3, w * 15), S.r(w * 0.25, w * 2)); return d; }
// P: points (world). o: { c, w, press 0..1, closed, frac, key, amt (wobble), fibres, raw (no wobble) }. Returns the drawn points.
function chLine(P, o = {}) {
  if (!CH_DEPTH) { let r = null; chalk(() => { r = chLine(P, o); }); return r; }
  const key = o.key ?? 'cl', w = o.w ?? CH_W, press = o.press ?? 1;
  let Q = o.raw ? resample(P, !!o.closed, 6) : wobble(P, !!o.closed, o.amt ?? 1.3, key, 6);
  if (o.closed) Q = [...Q, Q[0]];
  if (o.frac != null && o.frac < 1) { if (o.frac <= 0) return null; Q = subPath(Q, o.frac); }
  if (Q.length < 2) return null;
  const S = RNG('chs', key), R = RNG('chb', key, B);
  ctx.save(); ctx.strokeStyle = o.c ?? CHP.white; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.globalAlpha = 0.42 * press; ctx.lineWidth = w; chPoly(Q); ctx.stroke();              // the body
  const nf = o.fibres ?? 4;
  for (let i = 0; i < nf; i++) {                                                         // the fibres
    const s = (nf > 1 ? i / (nf - 1) - 0.5 : 0) * w * 0.78 + S.n(w * 0.08);
    ctx.lineWidth = w * S.r(0.22, 0.4); ctx.globalAlpha = press * S.r(0.5, 0.9);
    ctx.setLineDash(chDash(S, w)); ctx.lineDashOffset = S.r(0, 300) + R.n(w * 0.7);
    chPoly(chOffset(Q, s)); ctx.stroke();
  }
  ctx.setLineDash([]);
  const n = Math.floor(pathLen(Q) / (w * 2.2));                                          // crumbs at the edges
  if (n > 0) {
    ctx.fillStyle = o.c ?? CHP.white; ctx.globalAlpha = 0.5 * press; ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const p = pointAt(Q, S.f()), a = S.r(0, TAU), d = S.r(0.55, 1.15) * w, r = S.r(0.5, 1.3) * UNIT;
      ctx.rect(p[0] + Math.cos(a) * d + R.n(1), p[1] + Math.sin(a) * d + R.n(1), r, r);
    }
    ctx.fill();
  }
  ctx.restore();
  return Q;
}
const chTipOf = (P, frac) => pointAt(P, clamp(frac));

// ---- diagram marks (all write on with o.frac and return the chalk tip, for dust)
// a box as four strokes that overshoot their corners, drawn top, right, bottom, left
function chBox(x, y, w, h, o = {}) {
  const key = o.key ?? 'box', S = RNG('chbx', key), os = o.over ?? 8 * UNIT, f = clamp(o.frac ?? 1) * 4, j = 2 * UNIT;
  const sides = [
    [[x - S.r(0, os), y + S.n(j)], [x + w + S.r(0, os), y + S.n(j)]],
    [[x + w + S.n(j), y - S.r(0, os)], [x + w + S.n(j), y + h + S.r(0, os)]],
    [[x + w + S.r(0, os), y + h + S.n(j)], [x - S.r(0, os), y + h + S.n(j)]],
    [[x + S.n(j), y + h + S.r(0, os)], [x + S.n(j), y - S.r(0, os)]],
  ];
  let tip = null;
  sides.forEach((P, i) => { const fr = clamp(f - i); if (fr > 0) { chLine(P, { ...o, key: key + i, frac: fr }); tip = pointAt(P, fr); } });
  return tip;
}
// a line with an arrowhead (two short strokes) that arrives with the end of the line
function chArrow(P, o = {}) {
  const key = o.key ?? 'arr', fr = clamp(o.frac ?? 1), Q = chLine(P, { ...o, frac: fr });
  if (!Q || fr < 0.98) return Q ? Q[Q.length - 1] : null;
  const a = P[P.length - 1], b = P[Math.max(0, P.length - 2)], ang = Math.atan2(a[1] - b[1], a[0] - b[0]), L = o.head ?? 20 * UNIT;
  for (const s of [-1, 1]) chLine([a, [a[0] - Math.cos(ang + s * 0.5) * L, a[1] - Math.sin(ang + s * 0.5) * L]], { ...o, frac: 1, key: key + 'h' + s });
  return a;
}
// a hand-drawn loop around something (an ellipse that overshoots where it closes), for emphasis
function chLoop(cx, cy, rx, ry, rot = 0, o = {}) {
  const P = [], n = 64, S = RNG('chlp', o.key ?? 'loop'), a0 = S.r(-2.6, -2.0);
  for (let i = 0; i <= n; i++) { const t = i / n, a = a0 + t * TAU * 1.1, k = 1 + 0.06 * t; P.push([Math.cos(a) * rx * k, Math.sin(a) * ry * k]); }
  const c = Math.cos(rot), s = Math.sin(rot);
  return chLine(P.map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c]), o);
}
// a zigzag scribble filling outline P (turning at its edges), angle o.a, rows o.gap apart
function chScribble(P, o = {}) {
  const key = o.key ?? 'scr', a = o.a ?? -0.7, gap = o.gap ?? 12 * UNIT, ca = Math.cos(a), sa = Math.sin(a);
  const cx = P.reduce((s, p) => s + p[0], 0) / P.length, cy = P.reduce((s, p) => s + p[1], 0) / P.length;
  const U = P.map(([x, y]) => [(x - cx) * ca + (y - cy) * sa, -(x - cx) * sa + (y - cy) * ca]);
  let v0 = Infinity, v1 = -Infinity; for (const p of U) { v0 = Math.min(v0, p[1]); v1 = Math.max(v1, p[1]); }
  const S = RNG('chsc', key), Z = [], ins = o.inset ?? gap * 0.35;
  let k = 0;
  for (let v = v0 + gap * 0.4; v < v1 - gap * 0.2; v += gap, k++) {
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < U.length; i++) {
      const p = U[i], q = U[(i + 1) % U.length];
      if ((p[1] - v) * (q[1] - v) <= 0 && p[1] !== q[1]) { const u = p[0] + (v - p[1]) / (q[1] - p[1]) * (q[0] - p[0]); lo = Math.min(lo, u); hi = Math.max(hi, u); }
    }
    if (lo > hi) continue;
    Z.push([k % 2 ? hi - S.r(0, ins) : lo + S.r(0, ins), v + S.n(gap * 0.15)]);
  }
  if (Z.length < 2) return null;
  return chLine(Z.map(([u, v]) => [cx + u * ca - v * sa, cy + u * sa + v * ca]), { fibres: 2, amt: 0.8, ...o, key, w: o.w ?? CH_W * 0.8 });
}
// a five-point chalk asterisk (a star on the board), twinkling between two sizes on 2s
function chStar(x, y, r, o = {}) {
  const k = 1 + 0.18 * (((B + (o.ph ?? 0)) % 4) < 2 ? 1 : -1);
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI + 0.3; chLine([[x - Math.cos(a) * r * k, y - Math.sin(a) * r * k], [x + Math.cos(a) * r * k, y + Math.sin(a) * r * k]], { c: o.c ?? CHP.white, w: o.w ?? CH_W * 0.55, key: (o.key ?? 'st') + i, fibres: 2, press: o.press ?? 0.9 }); }
}

// ---- lettering: a real fillText (the text check reads it) in a handwriting face, a powdery double print, the pits
function chFit(str, size, maxW, font = CHFONT, weight = 400) {
  if (!maxW) return size;
  ctx.save(); ctx.font = `${weight} ${size}px ${font}`; const w = ctx.measureText(str).width; ctx.restore();
  return w > maxW ? size * maxW / w : size;
}
// o: { c, align, maxW (shrinks to fit: faces differ by OS), frac (write-on, left to right), rot, press, key }
function chText(str, x, y, size, o = {}) {
  if (!CH_DEPTH) { let r = null; chalk(() => { r = chText(str, x, y, size, o); }); return r; }
  size = chFit(str, size, o.maxW, o.font, o.weight);
  const R = RNG('cht', o.key ?? str, B);
  ctx.save(); ctx.translate(x + R.n(0.6), y + R.n(0.6)); if (o.rot) ctx.rotate(o.rot);
  ctx.font = `${o.weight ?? 400} ${size}px ${o.font ?? CHFONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  const w = ctx.measureText(str).width, frac = clamp(o.frac ?? 1), x0 = o.align === 'center' ? -w / 2 : o.align === 'right' ? -w : 0;
  const out = { w, size, x0: x + x0, tip: [x + x0 + w * frac, y - size * 0.3] };
  if (frac <= 0) { ctx.restore(); return out; }
  if (frac < 1) { ctx.beginPath(); ctx.rect(x0 - 8, -size * 1.4, w * frac + 8, size * 2); ctx.clip(); }
  ctx.fillStyle = o.c ?? CHP.white; const p = o.press ?? 1;
  ctx.globalAlpha = 0.28 * p; ctx.fillText(str, x0 + 1.4 * UNIT + R.n(0.6), -1.1 * UNIT + R.n(0.6));   // the powder beside each stroke
  ctx.globalAlpha = 0.92 * p; ctx.fillText(str, x0, 0);
  ctx.restore();
  return out;
}
const chTextW = (str, size, font = CHFONT) => { ctx.save(); ctx.font = `400 ${size}px ${font}`; const w = ctx.measureText(str).width; ctx.restore(); return w; };

// ---- chalk dust: specks shaken off the stick while it writes along P over [t0, t0 + d], falling and fading.
// Stateless: speck i is born at a seeded time and place, so any frame draws alone. P may be one point [x, y].
function chDust(P, t0, d, o = {}) {
  const life = o.life ?? 0.95; if (TT < t0 || TT > t0 + d + life) return;
  if (!CH_DEPTH) { chalk(() => chDust(P, t0, d, o)); return; }
  const key = o.key ?? 'dust', n = o.n ?? Math.max(6, Math.round(d * 46)), g = (o.g ?? 620) * UNIT, path = Array.isArray(P[0]);
  ctx.save(); ctx.fillStyle = o.c ?? CHP.dust;
  for (let i = 0; i < n; i++) {
    const R = RNG('chd', key, i), ts = t0 + d * (i + R.f()) / n, age = TT - ts, L = life * R.r(0.55, 1);
    if (age < 0 || age > L) continue;
    const p = path ? pointAt(P, (ts - t0) / Math.max(1e-6, d)) : P, vx = R.n(46) * UNIT, vy = R.r(-36, 14) * UNIT;
    const x = p[0] + R.n(6 * UNIT) + vx * age + Math.sin(age * 9 + i) * 3 * UNIT, y = p[1] + R.n(4 * UNIT) + vy * age + 0.5 * g * age * age, s = R.r(1.2, 3.4) * UNIT;
    ctx.globalAlpha = (1 - age / L) * R.r(0.35, 0.85); ctx.fillRect(x, y, s, s);
  }
  ctx.restore();
}

// ---- the board: a cached slate texture (mottle, old lessons half erased, eraser swirls, specks) over a base colour
const CH_TEX = new Map();
const CH_GHOSTS = ['a² + b² = c²', 'y = mx + b', 'F = ma', 'Δv / Δt', 'sin²θ + cos²θ = 1', 'x → 0', 'π r²', 'HW p. 42', 'f(x) = 2x + 1', 'n + 1', '∑ k', 'v = d / t', 'E = mc²', 'pH 7', '½ at²'];
function chBoardTex(key) {
  const id = key + '|' + W + 'x' + H; if (CH_TEX.has(id)) return CH_TEX.get(id);
  const pad = Math.round(90 * UNIT), k = 0.5, c = document.createElement('canvas');
  c.width = Math.ceil((W + 2 * pad) * k); c.height = Math.ceil((H + 2 * pad) * k);   // half resolution: the slate is soft
  const g = c.getContext('2d'), R = RNG('chboard', key), A = W * H / (1080 * 1920);
  g.scale(k, k); g.translate(pad, pad);
  for (let i = 0; i < Math.round(46 * Math.max(0.6, A)); i++) {   // mottle: the slate is never one flat colour
    const x = R.r(-pad, W + pad), y = R.r(-pad, H + pad), r = R.r(120, 430) * UNIT, light = R.f() < 0.45;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, light ? 'rgba(214,232,220,0.035)' : 'rgba(4,8,6,0.11)'); gr.addColorStop(1, 'rgba(4,8,6,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  // old lessons: faint, blurred, then half wiped by the eraser
  g.filter = 'blur(1.4px)'; g.fillStyle = '#e8e6da'; g.strokeStyle = '#e8e6da'; g.lineCap = 'round';
  for (let i = 0; i < Math.round(16 * Math.max(0.55, A)); i++) {
    g.save(); g.translate(R.r(0, W), R.r(0, H)); g.rotate(R.n(0.06)); g.globalAlpha = R.r(0.06, 0.12);
    if (R.f() < 0.72) { g.font = `400 ${Math.round(R.r(44, 92) * UNIT)}px ${CHFONT}`; g.fillText(R.pick(CH_GHOSTS), 0, 0); }
    else {   // an old diagram: a box with an arrow, or axes with a curve
      g.lineWidth = 5 * UNIT; g.beginPath(); const s = R.r(90, 200) * UNIT;
      if (R.f() < 0.5) { g.rect(0, 0, s, s * 0.6); g.moveTo(s, s * 0.3); g.lineTo(s * 1.6, s * 0.3); }
      else { g.moveTo(0, 0); g.lineTo(0, s); g.lineTo(s * 1.3, s); g.moveTo(0, s * 0.9); g.quadraticCurveTo(s * 0.6, -s * 0.2, s * 1.2, s * 0.6); }
      g.stroke();
    }
    g.restore();
  }
  g.filter = 'none'; g.globalCompositeOperation = 'destination-out'; g.lineCap = 'round';
  for (let i = 0; i < 9; i++) {   // the eraser took most of them
    g.globalAlpha = R.r(0.45, 0.8); g.lineWidth = R.r(70, 140) * UNIT; g.beginPath();
    let x = R.r(-pad, W), y = R.r(0, H); g.moveTo(x, y);
    for (let j = 0; j < 6; j++) { x += R.r(60, 160) * UNIT; y += (j % 2 ? -1 : 1) * R.r(80, 220) * UNIT; g.lineTo(x, y); }
    g.stroke();
  }
  g.globalCompositeOperation = 'source-over';
  // eraser swirls: wide faint sweeps of haze with the felt's drag lines inside
  for (let i = 0; i < Math.round(9 * Math.max(0.6, A)); i++) {
    const cx = R.r(-pad, W + pad), cy = R.r(-pad, H + pad), rx = R.r(120, 380) * UNIT, ry = rx * R.r(0.35, 0.8), a0 = R.r(0, TAU), sw = R.r(1.2, 3.4), rot = R.n(0.6);
    const P = []; for (let j = 0; j <= 60; j++) { const a = a0 + sw * j / 60, kk = 1 - 0.25 * j / 60; P.push([cx + Math.cos(a) * rx * kk * Math.cos(rot) - Math.sin(a) * ry * kk * Math.sin(rot), cy + Math.cos(a) * rx * kk * Math.sin(rot) + Math.sin(a) * ry * kk * Math.cos(rot)]); }
    const wd = R.r(60, 120) * UNIT;
    g.filter = 'blur(5px)'; g.strokeStyle = 'rgba(205,222,212,1)'; g.globalAlpha = R.r(0.025, 0.05); g.lineWidth = wd; g.beginPath(); g.moveTo(P[0][0], P[0][1]); for (const p of P) g.lineTo(p[0], p[1]); g.stroke();
    g.filter = 'none'; g.lineWidth = 1.6 * UNIT;
    for (let s = 0; s < 7; s++) {
      const off = R.n(wd * 0.45); g.globalAlpha = R.r(0.02, 0.05); g.beginPath();
      const Q = P.map((p, j) => { const q = P[Math.min(P.length - 1, j + 1)], b = P[Math.max(0, j - 1)], nx = b[1] - q[1], ny = q[0] - b[0], l = Math.hypot(nx, ny) || 1; return [p[0] + nx / l * off, p[1] + ny / l * off]; });
      g.moveTo(Q[0][0], Q[0][1]); for (const p of Q) g.lineTo(p[0], p[1]); g.stroke();
    }
  }
  g.globalAlpha = 1; g.fillStyle = '#e6e3d6';
  for (let i = 0; i < Math.round(900 * Math.max(0.6, A)); i++) { g.globalAlpha = R.r(0.04, 0.14); const s = R.r(1, 3.2) * UNIT; g.fillRect(R.r(-pad, W + pad), R.r(-pad, H + pad), s, s); }
  g.globalAlpha = 1;
  const tex = { c, pad };
  CH_TEX.set(id, tex);
  return tex;
}
let CH_SPECK = null;
function chSpeckTile() {   // the slate's fine surface at full resolution (anchored to the board)
  if (CH_SPECK) return CH_SPECK;
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), R = RNG('chspeck');
  for (let i = 0; i < 2600; i++) { g.fillStyle = R.f() < 0.55 ? 'rgba(230,236,226,0.07)' : 'rgba(0,0,0,0.16)'; g.fillRect(Math.floor(R.r(0, S)), Math.floor(R.r(0, S)), 1, R.f() < 0.25 ? 2 : 1); }
  return (CH_SPECK = c);
}
// the slate in world coordinates: base colour c, the cached texture, the fine surface
function chBoard(c = CHP.board, key = 'board') {
  const t = chBoardTex(key), p = t.pad;
  ctx.save(); ctx.fillStyle = c; ctx.fillRect(-p, -p, W + 2 * p, H + 2 * p);
  ctx.imageSmoothingEnabled = true; ctx.drawImage(t.c, -p, -p, W + 2 * p, H + 2 * p);
  ctx.fillStyle = ctx.createPattern(chSpeckTile(), 'repeat'); ctx.fillRect(-p, -p, W + 2 * p, H + 2 * p);
  ctx.restore();
}
// a freshly wiped strip (behind a caption, or where something was erased): the slate darker and cleaner
function chWiped(x, y, w, h, key, al = 1) {
  const R = RNG('chwp', key);
  ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = CHP.boardD;
  for (let i = 0; i < 4; i++) {
    const yy = y + R.n(h * 0.12), r = h * R.r(0.3, 0.42);
    ctx.globalAlpha = 0.3 * al; ctx.lineWidth = r * 2; ctx.beginPath(); ctx.moveTo(x - w / 2 + r + R.n(8), yy); ctx.lineTo(x + w / 2 - r + R.n(8), yy + R.n(3)); ctx.stroke();
  }
  ctx.strokeStyle = CHP.dust; ctx.lineWidth = 1.2 * UNIT;   // the felt's drag lines along its edges
  for (let i = 0; i < 6; i++) { const yy = y + (i % 2 ? -1 : 1) * h * R.r(0.38, 0.55); ctx.globalAlpha = R.r(0.04, 0.09) * al; ctx.beginPath(); ctx.moveTo(x - w / 2 + R.r(0, 30), yy); ctx.lineTo(x + w / 2 - R.r(0, 30), yy + R.n(3)); ctx.stroke(); }
  ctx.restore();
}
// a ghost: where a chalk mark was erased, a faint smear of its dust is left behind
function chGhost(x, y, w, h, key, al = 1) {
  const R = RNG('chgh', key);
  ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = CHP.dust;
  for (let i = 0; i < 5; i++) {
    ctx.globalAlpha = R.r(0.035, 0.07) * al; ctx.lineWidth = h * R.r(0.25, 0.45);
    const yy = y + h * R.r(0.2, 0.8); ctx.beginPath(); ctx.moveTo(x + R.r(0, w * 0.2), yy); ctx.lineTo(x + w - R.r(0, w * 0.2), yy + R.n(h * 0.2)); ctx.stroke();
  }
  ctx.restore();
}

// ---- the wooden frame and the chalk ledge (cached; world coordinates, so a camera push leaves them behind)
const CH_FRAME = new Map();
function chWoodStrip(g, x, y, w, h, along, R, o = {}) {   // a strip of wood: base, grain lines along it, a lit edge, a shadowed edge
  g.fillStyle = o.fill ?? CHP.wood; g.fillRect(x, y, w, h);
  const L = along ? w : h, T = along ? h : w;
  g.lineWidth = 1.3 * UNIT;
  for (let i = 0; i < Math.max(4, T / (4.5 * UNIT)); i++) {
    const off = R.r(0, T), f = R.r(0.004, 0.012), ph = R.r(0, TAU), amp = R.r(0.5, 2.6) * UNIT;
    g.strokeStyle = R.f() < 0.65 ? CHP.woodD : CHP.woodL; g.globalAlpha = R.r(0.18, 0.45); g.beginPath();
    for (let s = 0; s <= L; s += 16) { const q = off + Math.sin(s * f + ph) * amp; if (along) g.lineTo(x + s, y + q); else g.lineTo(x + q, y + s); }
    g.stroke();
  }
  for (let i = 0; i < Math.floor(L / (420 * UNIT)); i++) {   // a knot or two
    const s = R.r(0.1, 0.9) * L, q = R.r(0.3, 0.7) * T, kx = along ? x + s : x + q, ky = along ? y + q : y + s;
    g.strokeStyle = CHP.woodD; g.globalAlpha = 0.45;
    for (let k = 1; k < 4; k++) { g.beginPath(); g.ellipse(kx, ky, (along ? 10 : 4) * k * 0.7 * UNIT, (along ? 4 : 10) * k * 0.7 * UNIT, 0, 0, TAU); g.stroke(); }
  }
  g.globalAlpha = 0.5; g.fillStyle = CHP.woodL; if (along) g.fillRect(x, y, w, 2.5 * UNIT); else g.fillRect(x, y, 2.5 * UNIT, h);
  g.globalAlpha = 0.55; g.fillStyle = CHP.woodD; if (along) g.fillRect(x, y + h - 3 * UNIT, w, 3 * UNIT); else g.fillRect(x + w - 3 * UNIT, y, 3 * UNIT, h);
  g.globalAlpha = 1;
}
function chStick(g, x, y, len, rot, col, R) {   // a stick of chalk lying on the ledge, its shadow, a worn end
  const r = 7.5 * UNIT;
  g.save(); g.translate(x, y); g.rotate(rot);
  g.fillStyle = 'rgba(30,18,8,0.4)'; g.beginPath(); g.ellipse(len / 2 + 3 * UNIT, r * 0.9, len / 2 + r, r * 0.55, 0, 0, TAU); g.fill();
  g.fillStyle = col; g.beginPath(); g.moveTo(r * 0.4, -r); g.lineTo(len, -r); g.arc(len, 0, r, -Math.PI / 2, Math.PI / 2); g.lineTo(r * 0.4, r); g.quadraticCurveTo(-r * 0.4, 0, r * 0.4, -r); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(r, -r * 0.7, len - r * 1.5, r * 0.35);
  g.fillStyle = 'rgba(0,0,0,0.16)'; g.fillRect(r * 0.6, r * 0.35, len - r, r * 0.55);
  g.fillStyle = col; for (let i = 0; i < 14; i++) { g.globalAlpha = R.r(0.2, 0.6); g.fillRect(R.r(-14, 6) * UNIT, R.r(-r, r * 1.8), R.r(1, 3) * UNIT, R.r(1, 2.5) * UNIT); }   // its dust
  g.restore(); g.globalAlpha = 1;
}
// o: { side (frame width), ledge (its height), sticks: false, eraser: false }
function chFrameTex(o = {}) {
  const fw = Math.round((o.side ?? 30) * UNIT), lh = Math.round((o.ledge ?? 66) * UNIT), id = [W, H, fw, lh, o.sticks !== false, o.eraser !== false].join('|');
  if (CH_FRAME.has(id)) return CH_FRAME.get(id);
  const c = document.createElement('canvas'); c.width = W; c.height = H + 1;
  const g = c.getContext('2d'), R = RNG('chframe', id), y1 = H - lh;
  // the frame's shadow on the slate, inside the opening
  const sh = 16 * UNIT, edge = (x0, y0, x1, y1, w, h) => { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, 'rgba(0,0,0,0.42)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(Math.min(x0, x1), Math.min(y0, y1), w, h); };
  edge(0, fw, 0, fw + sh, W, sh); edge(fw, 0, fw + sh, 0, sh, H); edge(W - fw, 0, W - fw - sh, 0, sh, H);
  // dust settled along the bottom of the slate, above the ledge
  const gd = g.createLinearGradient(0, y1 - 40 * UNIT, 0, y1); gd.addColorStop(0, 'rgba(230,227,214,0)'); gd.addColorStop(1, 'rgba(230,227,214,0.13)'); g.fillStyle = gd; g.fillRect(fw, y1 - 40 * UNIT, W - 2 * fw, 40 * UNIT);
  chWoodStrip(g, 0, 0, W, fw, true, R);
  chWoodStrip(g, 0, fw, fw, y1 - fw, false, R);
  chWoodStrip(g, W - fw, fw, fw, y1 - fw, false, R);
  // the ledge: a tray floor seen from a little above, and its front lip
  const fl = lh * 0.42;
  chWoodStrip(g, 0, y1, W, fl, true, R, { fill: CHP.woodL });
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, y1, W, 4 * UNIT);
  g.fillStyle = 'rgba(232,229,216,0.16)'; for (let i = 0; i < 260; i++) { g.globalAlpha = R.r(0.2, 0.7); g.fillRect(R.r(fw, W - fw), y1 + R.r(3, fl - 4) * 1, R.r(1, 4) * UNIT, R.r(1, 2) * UNIT); }
  g.globalAlpha = 1;
  chWoodStrip(g, 0, y1 + fl, W, lh - fl, true, R);
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, y1 + fl, W, 3 * UNIT);
  for (const [cx, cy] of [[fw / 2, fw / 2], [W - fw / 2, fw / 2]]) { g.fillStyle = CHP.woodD; g.beginPath(); g.arc(cx, cy, 3.2 * UNIT, 0, TAU); g.fill(); }   // nails
  const ly = y1 + fl * 0.55;
  if (o.sticks !== false) {
    chStick(g, W * 0.12, ly, 120 * UNIT, -0.03, '#efede2', R);
    chStick(g, W * 0.12 + 150 * UNIT, ly + 2 * UNIT, 62 * UNIT, 0.05, CHP.yellow, R);
    chStick(g, W * 0.12 + 245 * UNIT, ly, 44 * UNIT, -0.08, CHP.coral, R);
    chStick(g, W * 0.12 + 320 * UNIT, ly + 1 * UNIT, 86 * UNIT, 0.02, CHP.teal, R);
  }
  if (o.eraser !== false) {   // the felt eraser: a wooden back over a dusty felt pad
    const ex = W * 0.72, ew = 150 * UNIT, eh = 34 * UNIT, ey = y1 + fl * 0.5 - eh * 0.7;
    g.fillStyle = 'rgba(30,18,8,0.4)'; g.fillRect(ex + 6 * UNIT, ey + eh * 0.5, ew, eh * 0.75);
    g.fillStyle = CHP.felt; g.fillRect(ex, ey + eh * 0.55, ew, eh * 0.5);
    g.fillStyle = CHP.dust; for (let i = 0; i < 90; i++) { g.globalAlpha = R.r(0.15, 0.55); g.fillRect(ex + R.r(0, ew), ey + eh * R.r(0.6, 1.02), R.r(1, 3) * UNIT, R.r(1, 2) * UNIT); }
    g.globalAlpha = 1;
    chWoodStrip(g, ex, ey, ew, eh * 0.6, true, R, { fill: '#b98552' });
  }
  const t = { c, fw, lh };
  CH_FRAME.set(id, t);
  return t;
}
function chFrame(o = {}) { const t = chFrameTex(o); ctx.drawImage(t.c, 0, 0); return t; }
// the board's inside (the drawable area) for the current frame sizes
const chInside = (o = {}) => ({ x0: (o.side ?? 30) * UNIT, y0: (o.side ?? 30) * UNIT, x1: W - (o.side ?? 30) * UNIT, y1: H - (o.ledge ?? 66) * UNIT });

// ---------------------------------------------------------------------
//  the hero: a little chalk person with a round face, coral chalk, white eyes and smile, who lives on the board.
//  (x, y) = the centre of the head, s = its radius. o: { key, mood: 'smile' | 'wow' | 'talk', point: [x, y] (a world
//  point its arm points at), wave, sit, look: [dx, dy], c }. Sets SPARK_AT. Returns the head's outline.
// ---------------------------------------------------------------------
function chHero(x, y, s, o = {}) {
  if (!CH_DEPTH) { let r = null; chalk(() => { r = chHero(x, y, s, o); }); return r; }
  const key = o.key ?? 'hero', c = o.c ?? CHP.coral, w = Math.max(3, s * 0.14);
  y += Math.sin(TT * TAU * 0.7 + key.length) * s * 0.05;
  SPARK_AT = toScreen(x, y);
  const L = (P, k, extra = {}) => chLine(P, { c, w, key: key + k, amt: 0.9, fibres: 3, ...extra });
  // the head: a light scribble of coral, then one loop drawn round with a little overshoot, and a tuft
  const head = ellipsePts(x, y, s, s * 0.97, 0, 40);
  chScribble(head, { c, key: key + 'fill', gap: s * 0.3, w: w * 0.85, press: 0.32, a: -0.6, inset: s * 0.12 });
  L(arcPts(x, y, s, -2.0, -2.0 + TAU * 1.07, 44), 'head');
  L([[x - s * 0.15, y - s * 0.95], [x - s * 0.05, y - s * 1.35], [x + s * 0.08, y - s * 0.98]], 'tuft', { w: w * 0.8 });
  // the face, in white so it reads on the coral
  const lk = o.look ?? (o.point ? [clamp((o.point[0] - x) / (s * 6), -1, 1), clamp((o.point[1] - y) / (s * 6), -1, 1)] : [0, 0]);
  const blink = (B + key.length * 5) % 37 < 1, ex = lk[0] * s * 0.12, ey = lk[1] * s * 0.1;
  ctx.save(); ctx.fillStyle = CHP.white; ctx.globalAlpha = 0.95;
  for (const sd of [-1, 1]) {
    if (blink) chLine([[x + sd * s * 0.36 - s * 0.12 + ex, y - s * 0.08], [x + sd * s * 0.36 + s * 0.12 + ex, y - s * 0.08]], { w: w * 0.7, key: key + 'bl' + sd, fibres: 2 });
    else { ctx.beginPath(); ctx.ellipse(x + sd * s * 0.36 + ex, y - s * 0.1 + ey, s * 0.13, s * (o.mood === 'wow' ? 0.19 : 0.16), 0, 0, TAU); ctx.fill(); }
  }
  ctx.restore();
  if (o.mood === 'wow') chLine(ellipsePts(x + ex * 0.5, y + s * 0.45, s * 0.14, s * 0.18, 0, 16), { closed: true, w: w * 0.75, key: key + 'mw', fibres: 2 });
  else if (o.mood === 'talk' && B % 2) chLine(ellipsePts(x + ex * 0.5, y + s * 0.45, s * 0.2, s * 0.1, 0, 16), { closed: true, w: w * 0.75, key: key + 'mt', fibres: 2 });
  else chLine(arcPts(x + ex * 0.5, y + s * 0.2, s * 0.38, 0.35, Math.PI - 0.35, 12), { w: w * 0.75, key: key + 'ms', fibres: 2 });
  // the body: a neck to the hip, two legs, two arms
  const sh = [x + s * 0.02, y + s * 1.55], hip = [x + s * 0.06, y + s * 2.75];
  L([[x, y + s * 0.98], sh, hip], 'body');
  if (o.sit) for (const sd of [-1, 1]) L([hip, [hip[0] + sd * s * 0.35 + s * 0.5, hip[1] + s * 0.15], [hip[0] + sd * s * 0.3 + s * 0.65, hip[1] + s * 1.15], [hip[0] + sd * s * 0.3 + s * 0.95, hip[1] + s * 1.15]], 'leg' + sd);
  else for (const sd of [-1, 1]) L([hip, [hip[0] + sd * s * 0.5, hip[1] + s * 1.45], [hip[0] + sd * s * 0.88, hip[1] + s * 1.45]], 'leg' + sd);
  const side = o.point ? Math.sign(o.point[0] - x) || -1 : 1;
  if (o.point) {   // the pointing arm, straight to the target, with a finger
    const dx = o.point[0] - sh[0], dy = o.point[1] - sh[1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
    const el = [sh[0] + ux * s * 1.0 - uy * s * 0.12 * side, sh[1] + uy * s * 1.0 + ux * s * 0.12 * side], hd = [sh[0] + ux * s * 1.95, sh[1] + uy * s * 1.95];
    L([sh, el, hd], 'arm1');
    L([hd, [hd[0] + ux * s * 0.42, hd[1] + uy * s * 0.42]], 'fing', { w: w * 0.8 });
    L([hd, [hd[0] - uy * s * 0.18 * side + ux * s * 0.1, hd[1] + ux * s * 0.18 * side + uy * s * 0.1]], 'thmb', { w: w * 0.8 });
  } else if (o.wave) {
    const a = -1.2 + Math.sin(TT * TAU * 1.6) * 0.35, el = [sh[0] + s * 0.8 * side, sh[1] - s * 0.15];
    L([sh, el, [el[0] + Math.cos(a) * s * 0.9 * side, el[1] + Math.sin(a) * s * 0.9]], 'arm1');
  } else L([sh, [sh[0] + s * 0.7 * side, sh[1] + s * 0.6], [sh[0] + s * 0.85 * side, sh[1] + s * 1.3]], 'arm1');
  L([sh, [sh[0] - s * 0.72 * side, sh[1] + s * 0.55], [sh[0] - s * 0.12 * side, hip[1] - s * 0.1]], 'arm2');   // the other hand on the hip
  return head;
}

// ---------------------------------------------------------------------
//  tags and captions (DEFER: drawn after the camera, at screen size). Written on in chalk; erased (right to left)
//  as a morph bridge starts closing the era.
// ---------------------------------------------------------------------
function chBridgeFade() {
  if (typeof BRIDGES === 'undefined') return 1;
  let a = 1;
  for (const b of BRIDGES) { const d = b.d ?? 0.6; if (TT < b.tc + 0.01 && TT > b.tc - d - 0.5) a = Math.min(a, 1 - seg(TT, b.tc - d - 0.35, b.tc - d + 0.05)); }
  return a;
}
const chCapY = () => (PORTRAIT ? Math.min(1200, H - SAFE.bottom - 300) : H - SAFE.bottom - 40 * UNIT);
// the topic tag: yellow chalk, top left, with a teal underline
function chTag(str, o = {}) {
  const f = () => {
    const fr = ev(E0 + (o.at ?? 0.1), 0.45) * chBridgeFade(); if (fr <= 0) return;
    const x = o.x ?? (PORTRAIT ? 132 : 72 * UNIT), y = o.y ?? (PORTRAIT ? 380 : SAFE.top + 74 * UNIT);
    const size = chFit(str, (o.size ?? 66) * UNIT, o.maxW ?? (PORTRAIT ? 640 : W * 0.5));
    chalk(() => {
      const r = chText(str, x, y, size, { c: o.c ?? CHP.yellow, key: 'tag' + str, frac: fr });
      chLine([[x - 6 * UNIT, y + size * 0.3], [x + r.w + 12 * UNIT, y + size * 0.24]], { c: CHP.teal, w: CH_W * 0.8, key: 'tagu' + str, frac: seg(fr, 0.4, 1), fibres: 3 });
    });
  };
  if (DEFER) DEFER.push(f); else f();
}
// the caption: white chalk on a strip the eraser just cleaned, written left to right
function chCaption(str, o = {}) {
  const f = () => {
    const fr = ev(E0 + (o.at ?? 0.45), o.dur ?? 0.6) * chBridgeFade(); if (fr <= 0) return;
    const x = o.x ?? CX, y = o.y ?? chCapY();
    const size = chFit(str, (o.size ?? 62) * UNIT, o.maxW ?? (PORTRAIT ? 2 * Math.min(770 - x, x - 130) : W - 2 * 90 * UNIT)), w = chTextW(str, size);
    chWiped(x, y - size * 0.3, w + size * 1.2, size * 1.5, 'cap' + str, clamp(fr * 4));
    chalk(() => { chText(str, x, y, size, { align: 'center', frac: fr, key: 'cap' + str, c: o.c }); });
  };
  if (DEFER) DEFER.push(f); else f();
}

// ---------------------------------------------------------------------
//  the morph's window: the eraser wipes the board clean around the shape, leaving a smear of dust at its edge
// ---------------------------------------------------------------------
function chEraseRim(P, key, al = 1) {
  const bb = bbox(P), cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2;
  const ring = (d) => P.map(([x, y]) => { const dx = x - cx, dy = y - cy, l = Math.hypot(dx, dy) || 1; return [x + dx / l * d, y + dy / l * d]; });
  const R = RNG('cher', key);
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = CHP.dust;
  for (let i = 0; i < 4; i++) { ctx.globalAlpha = (0.075 - i * 0.014) * al; ctx.lineWidth = (16 + i * 18) * UNIT; trace(ring((8 + i * 15) * UNIT), true); ctx.stroke(); }
  for (let i = 0; i < 10; i++) {   // the felt's drag marks
    ctx.globalAlpha = R.r(0.08, 0.22) * al; ctx.lineWidth = R.r(1, 2.4) * UNIT;
    ctx.setLineDash([R.r(20, 90), R.r(8, 40), R.r(30, 140), R.r(10, 30)].map((v) => v * UNIT)); ctx.lineDashOffset = R.r(0, 300) + B * 3;
    trace(ring(R.r(3, 52) * UNIT), true); ctx.stroke();
  }
  ctx.setLineDash([]); ctx.globalAlpha = 0.28 * al; ctx.lineWidth = 2.4 * UNIT; ctx.strokeStyle = CHP.white; trace(P, true); ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------
//  dust in the air: a few motes drifting down over everything (screen space, on 2s)
// ---------------------------------------------------------------------
function chMotes(n = 26) {
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = CHP.dust;
  for (let i = 0; i < n; i++) {
    const R = RNG('chmote', i), v = R.r(14, 40) * UNIT, x = R.r(0, W) + Math.sin(TT * R.r(0.6, 1.4) + i) * 14 * UNIT, y = mod(R.r(0, H) + TT * v, H), s = R.r(1.4, 3.2) * UNIT;
    ctx.globalAlpha = R.r(0.12, 0.3) * (0.75 + 0.25 * Math.sin(TT * 3 + i)); ctx.fillRect(x, y, s, s);
  }
  ctx.restore();
}

// =====================================================================
//  STYLE — the renderer's hooks (see the skill's styles/README.md)
// =====================================================================
const STYLE = {
  name: 'chalkboard',
  paper: CHP.board,
  // the blank sheet is the same board, wiped: its colour, its texture, its frame
  backdrop(c) { chBoard(c, 'wiped'); chFrame(typeof CH_FRAMEOPT !== 'undefined' ? CH_FRAMEOPT : {}); },
  // the old / new world seen through a hole the eraser left: dusty smears around a clean edge
  window(P, key, src, o = {}) {
    ctx.save(); trace(P, true); ctx.clip(); ctx.drawImage(src, 0, 0); ctx.restore();
    chEraseRim(P, key, o.phase === 'grow' ? 1 - 0.6 * (o.u ?? 0) : 1);
  },
  // the morphing shape: a chalk-filled scribble with its outline
  blob(P, c, key) { chalk(() => { chScribble(P, { c, key: key + 's', gap: 12 * UNIT, w: CH_W * 0.85, press: 0.6, a: -0.65 }); chLine(P, { c, closed: true, key: key + 'o', w: CH_W * 1.1 }); }); },
  hero(x, y, r, o = {}) { chHero(x, y, r * 0.5, { key: o.key ?? 'mhero', mood: o.mood ?? 'wow' }); },
  heroColor: CHP.coral,
  heroPts(x, y, r, n = 96) { return ellipsePts(x, y, r * 0.5, r * 0.5, 0, n); },
  post() { chMotes(); },
  ones: false,
};
