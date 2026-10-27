// =====================================================================
//  styles/comic/kit.js — a printed comic page: bold brush-ink outlines that swell and taper (heavier on the side
//  away from the light), flat process colours on aged newsprint, Ben-Day dots for tints and shading, the colour
//  plate printed a hair off the ink (misregistration), panels with paper gutters, speech balloons with tails and
//  lettered caps, SFX with an extruded drop shadow, speed lines and action bursts. Limited animation on 2s.
//  Built on kit/core.js (RNG, wobble, resample, ellipsePts, rrectPts, arcPts, subPath, toScreen, TT / ev / popS /
//  DEFER / E0 / SPARK_AT, LX / LY / UNIT / PORTRAIT / WIDE). Everything here is prefixed `cm`.
//  Needs from the piece head: W, H, FPS, SAFE, CX. Optional before the kit: `const CM_REG = [dx, dy]` (the colour
//  plate's offset in px at 1080; default [2.6, -1.8]).
//  Fonts are local: SFX in Impact (Windows, macOS), else a condensed bold (Linux: DejaVu Sans Condensed); balloon
//  lettering in Trebuchet MS bold (Windows, macOS), else DejaVu Sans bold. Text is drawn with fillText, so the
//  text check sees every word. Ben-Day dots are cached pattern tiles; nothing else is kept between frames.
// =====================================================================

// ---- palette: three process inks and a warm black on newsprint (no hue between 220 and 330 degrees)
const CM = {
  paper: '#efe2bf', paperL: '#f8efd6', paperD: '#dccb9f',
  ink: '#1e1814',
  yellow: '#f5c531', yellowL: '#f9df8a', yellowD: '#d9a21c',
  red: '#d8372a', redD: '#9e2219', redL: '#ef8a6f',
  cyan: '#2a9fd0', cyanD: '#17739a', cyanL: '#a3d8ec',
  orange: '#ec7b2c', green: '#5ca349', greenD: '#3c7a32',
  skin: '#f6d2a3', mouth: '#4a1a12', tongue: '#ef7d6b', grey: '#8a8178',
};
const CM_SFX = 'Bangers, Impact, Haettenschweiler, "Arial Narrow Bold", "DejaVu Sans Condensed", "Liberation Sans Narrow", sans-serif';
const CM_LETTER = '"Trebuchet MS", "DejaVu Sans", "Liberation Sans", Verdana, sans-serif';
const CM_REGX = typeof CM_REG !== 'undefined' ? CM_REG : [2.6, -1.8];
const cmMis = () => { const J = RNG('reg', B); return [(CM_REGX[0] + J.n(0.5)) * UNIT, (CM_REGX[1] + J.n(0.5)) * UNIT]; };
const CM_CACHE = new Map();
function cmCanvas(key, w, h, draw) {   // a static offscreen canvas, drawn once and kept (keyed and seeded: allowed)
  let c = CM_CACHE.get(key);
  if (!c) { c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); draw(c.getContext('2d'), c); CM_CACHE.set(key, c); }
  return c;
}
function cmPath(P, closed = true) {   // straight segments (keeps the corners of panels and bursts)
  ctx.beginPath(); if (!P.length) return;
  ctx.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) ctx.lineTo(P[i][0], P[i][1]);
  if (closed) ctx.closePath();
}

// ---------------------------------------------------------------------
//  the brush: a filled ribbon whose width swells and tapers. Closed outlines are heavier on the side away from the
//  light (the light is top-left); open strokes taper to points at both ends. o: { closed, w, key, amt, raw, step,
//  frac (write-on), lit (width factor on the lit side), heavy (on the shadow side), taper (end fraction), c }
// ---------------------------------------------------------------------
function cmRibbon(P, o = {}) {
  const key = o.key ?? 'rib', w = o.w ?? 6, step = o.step ?? 5;
  let closed = !!o.closed;
  let Q = o.raw ? resample(P, closed, step) : wobble(P, closed, o.amt ?? 1.1, key, step);
  if (o.frac != null && o.frac < 1) { if (o.frac <= 0) return Q; Q = subPath(closed ? [...Q, Q[0]] : Q, o.frac); closed = false; }
  const n = Q.length; if (n < 2) return Q;
  let A = 0; if (closed) for (let i = 0; i < n; i++) { const p = Q[i], q = Q[(i + 1) % n]; A += p[0] * q[1] - q[0] * p[1]; }
  const sg = A >= 0 ? 1 : -1, S = RNG('ribS', key), f1 = S.r(0.01, 0.022), f2 = S.r(0.035, 0.06), p1 = S.r(0, TAU), p2 = S.r(0, TAU);
  const jp = RNG('ribJ', key, B).r(0, TAU), lit = o.lit ?? 0.6, heavy = o.heavy ?? 1.45, tp = o.taper ?? 0.22;
  const L = [0]; for (let i = 1; i < n; i++) L.push(L[i - 1] + dist(Q[i - 1], Q[i]));
  const tot = L[n - 1] || 1, left = [], right = [];
  for (let i = 0; i < n; i++) {
    const a = Q[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = Q[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    const tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1, nx = ty / l * sg, ny = -tx / l * sg;
    let k = 1 + 0.16 * Math.sin(L[i] * f1 + p1) + 0.08 * Math.sin(L[i] * f2 + p2) + 0.05 * Math.sin(L[i] * 0.05 + jp);
    if (closed) k *= lerp(lit, heavy, clamp(0.5 + 0.62 * (nx * 0.6 + ny * 0.8)));
    else { const e = Math.min(L[i] / tot, 1 - L[i] / tot) / tp; k *= o.taper === 0 ? 1 : 0.12 + 0.88 * Math.sin(Math.PI / 2 * clamp(e)); }
    const hw = w * k / 2;
    left.push([Q[i][0] + nx * hw, Q[i][1] + ny * hw]); right.push([Q[i][0] - nx * hw, Q[i][1] - ny * hw]);
  }
  ctx.save(); ctx.fillStyle = o.c ?? CM.ink; ctx.globalAlpha = o.al ?? 1; ctx.beginPath();
  if (closed) {
    ctx.moveTo(left[0][0], left[0][1]); for (let i = 1; i < n; i++) ctx.lineTo(left[i][0], left[i][1]); ctx.closePath();
    ctx.moveTo(right[n - 1][0], right[n - 1][1]); for (let i = n - 2; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]); ctx.closePath();
    ctx.fill('evenodd');
  } else {
    ctx.moveTo(left[0][0], left[0][1]); for (let i = 1; i < n; i++) ctx.lineTo(left[i][0], left[i][1]);
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  return Q;
}
// a brush line between points (open, tapered): cmLine([[x, y], ...], w, key, o)
const cmLine = (P, w, key, o = {}) => cmRibbon(P, { ...o, w, key });

// ---------------------------------------------------------------------
//  Ben-Day dots: a cached tile per (colour, dot radius, pitch, angle), used as a pattern fill. The pattern lives in
//  the current (world) transform, so a camera push enlarges the dots like a printed page under a lens.
// ---------------------------------------------------------------------
const CM_PAT = new Map();
function cmDots(color, r = 2.4, gap = 11, ang = 45) {
  const s = Math.max(3, Math.round(gap * UNIT)), rr = Math.min(s / 2, r * UNIT), k = `${color}|${rr.toFixed(2)}|${s}|${ang}`;
  let p = CM_PAT.get(k);
  if (!p) {
    const c = document.createElement('canvas'); c.width = c.height = s; const g = c.getContext('2d'); g.fillStyle = color;
    for (const [x, y] of [[0, 0], [s, 0], [0, s], [s, s], [s / 2, s / 2]]) { g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill(); }
    p = g.createPattern(c, 'repeat'); p.setTransform(new DOMMatrix().rotateSelf(ang)); CM_PAT.set(k, p);
  }
  return p;
}
// fill outline P (or the current path when P is null) with dots
function cmTint(P, color, r, gap, ang, o = {}) {
  ctx.save(); if (P) cmPath(P, true); ctx.fillStyle = cmDots(color, r, gap, ang); ctx.globalAlpha = o.al ?? 1; ctx.fill(o.rule ?? 'nonzero'); ctx.restore();
}
// a field of dots whose size follows rFn(u, v) (u, v = 0..1 across the box): the printed gradient. Cached per key.
function cmDotField(key, x, y, w, h, color, gap, ang, rFn) {
  const s = Math.max(4, gap * UNIT);
  const c = cmCanvas(`field|${key}|${Math.round(w)}x${Math.round(h)}|${color}|${s}`, w, h, (g) => {
    g.fillStyle = color; g.beginPath();
    const ca = Math.cos(ang * DEG), sa = Math.sin(ang * DEG), R = Math.hypot(w, h) / 2 + s, cx = w / 2, cy = h / 2;
    for (let j = -R; j <= R; j += s) for (let i = -R; i <= R; i += s) {
      for (const [ii, jj] of [[i, j], [i + s / 2, j + s / 2]]) {
        const px = cx + ii * ca - jj * sa, py = cy + ii * sa + jj * ca;
        if (px < -s || py < -s || px > w + s || py > h + s) continue;
        const r = rFn(clamp(px / w), clamp(py / h)) * s * 0.62;
        if (r > 0.35) { g.moveTo(px + r, py); g.arc(px, py, r, 0, TAU); }
      }
    }
    g.fill();
  });
  ctx.drawImage(c, x, y, w, h);
}

// ---------------------------------------------------------------------
//  a printed shape: the colour plate (offset a hair: misregistration), Ben-Day shading on the side away from the
//  light, then the brush outline on register. o: { fill, shade (dot colour), sr (dot radius), sgap, sang, depth
//  (how far the lit copy is pulled toward the light, 0..1 of the size), tint (a dot fill over the whole shape),
//  w (outline), line (false = none), key, amt, raw, lit, heavy, mis (false = on register) }
// ---------------------------------------------------------------------
function cmShape(P, o = {}) {
  const key = o.key ?? 'shape', Q = o.raw ? P : wobble(P, true, o.amt ?? 1.0, key + 'f', 6);
  const bb = bbox(Q), sz = Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0), [mx, my] = o.mis === false ? [0, 0] : cmMis();
  ctx.save(); ctx.translate(mx, my);
  if (o.fill) { cmPath(Q, true); ctx.fillStyle = o.fill; ctx.fill(); }
  if (o.tint) cmTint(Q, o.tint, o.tr ?? 1.6, o.tgap ?? 9, o.tang ?? 15);
  if (o.shade) {   // dots where the shape is not covered by a copy of itself pulled toward the light
    const d = (o.depth ?? 0.22) * sz, ox = -0.6 * d, oy = -0.8 * d;
    ctx.save(); cmPath(Q, true); ctx.clip();
    ctx.beginPath(); ctx.rect(bb.x0 - 50, bb.y0 - 50, bb.x1 - bb.x0 + 100, bb.y1 - bb.y0 + 100);
    ctx.moveTo(Q[0][0] + ox, Q[0][1] + oy); for (let i = 1; i < Q.length; i++) ctx.lineTo(Q[i][0] + ox, Q[i][1] + oy); ctx.closePath();
    ctx.fillStyle = cmDots(o.shade, o.sr ?? 2.6, o.sgap ?? 10, o.sang ?? 45); ctx.fill('evenodd');
    ctx.restore();
  }
  ctx.restore();
  if (o.line !== false) cmRibbon(o.raw ? P : Q, { closed: true, w: o.w ?? 5 * UNIT, key: key + 'o', raw: true, lit: o.lit, heavy: o.heavy, c: o.line });
  return Q;
}
const cmBox = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];

// ---------------------------------------------------------------------
//  newsprint: the page itself (a warm sheet with fibres, specks and the odd ink dropout), and panels on it
// ---------------------------------------------------------------------
function cmNewsprintTex() {   // a static full-frame texture: drawn once, laid over every frame by STYLE.post
  return cmCanvas(`news|${W}x${H}`, W, H, (g) => {
    const R = RNG('news', W, H);
    g.fillStyle = 'rgba(120,92,48,0.10)';
    for (let i = 0; i < 26; i++) { g.beginPath(); g.ellipse(R.r(0, W), R.r(0, H), R.r(60, 260), R.r(30, 140), R.r(0, TAU), 0, TAU); g.globalAlpha = R.r(0.08, 0.22); g.fill(); }
    g.globalAlpha = 1; g.fillStyle = 'rgba(70,50,30,0.22)'; g.beginPath();
    for (let i = 0; i < W * H / 260; i++) { const s = R.r(0.8, 2.2); g.rect(R.r(0, W), R.r(0, H), s, s); }
    g.fill();
    g.fillStyle = 'rgba(255,248,228,0.30)'; g.beginPath();
    for (let i = 0; i < W * H / 420; i++) { const s = R.r(0.8, 2.4); g.rect(R.r(0, W), R.r(0, H), s, s * R.r(0.6, 1.6)); }
    g.fill();
    g.strokeStyle = 'rgba(90,64,34,0.13)'; g.lineWidth = 1; g.beginPath();
    for (let i = 0; i < W * H / 5200; i++) { const x = R.r(0, W), y = R.r(0, H), a = R.r(0, TAU), l = R.r(5, 24); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 0.5) * l * 0.5, y + Math.sin(a + 0.5) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); }
    g.stroke();
  });
}
// the page ground: paper colour plus a faint dot screen (the newsprint's own tone)
function cmPage(o = {}) {
  ctx.save(); screen();
  ctx.fillStyle = o.c ?? CM.paper; ctx.fillRect(0, 0, W, H);
  if (o.dots !== false) { ctx.fillStyle = cmDots(o.dotC ?? 'rgba(150,110,50,0.16)', 1.5, 9, 30); ctx.fillRect(0, 0, W, H); }
  ctx.restore();
}
// a panel: fill, contents clipped inside (fn), a brush-ink rule around it. o: { bg, fn, w, key, gutter (paper ring), r }
function cmPanel(x, y, w, h, o = {}) {
  const key = o.key ?? `pnl${Math.round(x)}_${Math.round(y)}`, P = o.P ?? cmBox(x, y, w, h);
  if (o.gutter) { ctx.save(); cmPath(P); ctx.lineJoin = 'miter'; ctx.lineWidth = o.gutter * 2; ctx.strokeStyle = CM.paperL; ctx.stroke(); ctx.restore(); }
  ctx.save(); cmPath(P); ctx.clip();
  if (o.bg) { ctx.fillStyle = o.bg; ctx.fill(); }
  if (o.fn) o.fn();
  ctx.restore();
  cmRibbon(P, { closed: true, raw: true, w: (o.w ?? 8) * UNIT, key: key + 'rule', lit: 0.8, heavy: 1.25, step: 8 });
}

// ---------------------------------------------------------------------
//  action: speed lines, streaks, bursts, emanata, puffs. Speed lines are re-drawn every boil step (limited animation).
// ---------------------------------------------------------------------
// radial speed lines: n tapered wedges from radius r0 out to r1 around (cx, cy). o: { w, c, al, a0, span, key, hold }
function cmSpeed(cx, cy, r0, r1, n, o = {}) {
  const R = RNG('spd', o.key ?? 's', Math.floor(B / (o.hold ?? 1))), span = o.span ?? TAU, a0 = o.a0 ?? 0;
  ctx.save(); ctx.fillStyle = o.c ?? CM.ink; ctx.globalAlpha = o.al ?? 1; ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = a0 + span * (span >= TAU - 1e-6 ? (i + R.r(-0.45, 0.45)) / n : R.f()), ca = Math.cos(a), sa = Math.sin(a);
    const ra = r0 * R.r(0.92, 1.4), rb = r1 * R.r(0.8, 1.05), hw = (o.w ?? 7) * UNIT * R.r(0.35, 1.2);
    ctx.moveTo(cx + ca * ra, cy + sa * ra); ctx.lineTo(cx + ca * rb - sa * hw, cy + sa * rb + ca * hw); ctx.lineTo(cx + ca * rb + sa * hw, cy + sa * rb - ca * hw); ctx.closePath();
  }
  ctx.fill(); ctx.restore();
}
// parallel streaks behind something moving: from (x, y) back along angle ang (the direction it came from), n lines
// spread across width `spread`, each tapering to nothing at its far end. o: { len, w, c, al, key }
function cmStreaks(x, y, ang, n, spread, o = {}) {
  const R = RNG('stk', o.key ?? 'st', B), ca = Math.cos(ang), sa = Math.sin(ang), len = o.len ?? 260;
  ctx.save(); ctx.fillStyle = o.c ?? CM.ink; ctx.globalAlpha = o.al ?? 1; ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const off = (n > 1 ? i / (n - 1) - 0.5 : 0) * spread + R.n(spread * 0.06), st = R.r(0, 0.3) * len, l = len * R.r(0.5, 1), hw = (o.w ?? 5) * UNIT * R.r(0.5, 1.1);
    const bx = x - sa * off + ca * st, by = y + ca * off + sa * st;
    ctx.moveTo(bx - sa * hw, by + ca * hw); ctx.lineTo(bx + ca * l, by + sa * l); ctx.lineTo(bx + sa * hw, by - ca * hw); ctx.closePath();
  }
  ctx.fill(); ctx.restore();
}
// a jagged action burst outline: n spikes, irregular (seeded by key), a little jitter per boil step
function cmBurstPts(cx, cy, rx, ry, n = 14, o = {}) {
  const S = RNG('bst', o.key ?? 'b'), J = RNG('bstj', o.key ?? 'b', B), inner = o.inner ?? 0.7, rot = o.rot ?? 0, P = [];
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i + S.n(0.28)) / (n * 2) * TAU;
    const k = (i % 2 === 0 ? S.r(0.94, 1.14) : inner * S.r(0.88, 1.08)) + J.n(o.jit ?? 0.015);
    P.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return P;
}
// a printed burst: colour plate, dots, brush outline. o: cmShape options + { n, inner, rot }
function cmBurst(cx, cy, rx, ry, o = {}) {
  const P = cmBurstPts(cx, cy, rx, ry, o.n ?? 14, o);
  return cmShape(P, { raw: true, fill: o.fill ?? CM.yellow, shade: o.shade, depth: o.depth ?? 0.3, tint: o.tint, w: o.w ?? 5 * UNIT, key: o.key ?? 'burst', lit: 0.8, heavy: 1.3 });
}
// surprise ticks around a point (emanata): n short tapered strokes on an arc from a0 over span
function cmEmanata(x, y, r, n = 5, o = {}) {
  const R = RNG('ema', o.key ?? 'e', B), a0 = o.a0 ?? -Math.PI * 0.85, span = o.span ?? Math.PI * 0.7, L = o.len ?? r * 0.5;
  for (let i = 0; i < n; i++) {
    const a = a0 + span * (n > 1 ? i / (n - 1) : 0.5) + R.n(0.05), r0 = r * R.r(1.0, 1.08);
    cmLine([[x + Math.cos(a) * r0, y + Math.sin(a) * r0], [x + Math.cos(a) * (r0 + L), y + Math.sin(a) * (r0 + L)]], (o.w ?? 7) * UNIT, (o.key ?? 'e') + i, { amt: 0.4, taper: 0.5 });
  }
}
// a puffy comic cloud / dust puff outline (scalloped)
function cmCloudPts(cx, cy, rx, ry, n = 9, key = 'cl') {
  const S = RNG('cld', key), P = [];
  const base = ellipsePts(cx, cy, rx, ry, 0, n), rr = Math.PI * Math.hypot(rx, ry) / n * 0.62;
  for (let i = 0; i < n; i++) {
    const [px, py] = base[i], a = Math.atan2(py - cy, px - cx), r = rr * S.r(0.8, 1.2);
    for (let k = 0; k <= 6; k++) { const b = a - Math.PI / 2 + Math.PI * k / 6; P.push([px + Math.cos(b) * r * 0.9, py + Math.sin(b) * r * 0.9]); }
  }
  return P;
}
function cmCloud(cx, cy, rx, ry, o = {}) {
  return cmShape(cmCloudPts(cx, cy, rx, ry, o.n ?? 9, o.key ?? 'cloud'), { raw: true, fill: o.fill ?? CM.paperL, shade: o.shade ?? CM.cyanL, sr: 2.2, depth: 0.16, w: (o.w ?? 4.5) * UNIT, key: o.key ?? 'cloud', mis: o.mis });
}
// a little four-point sparkle in ink (the "ding" of something landing)
function cmSpark(x, y, s, o = {}) {
  ctx.save(); ctx.fillStyle = o.c ?? CM.ink; ctx.beginPath();
  ctx.moveTo(x, y - s); ctx.quadraticCurveTo(x + s * 0.12, y - s * 0.12, x + s, y); ctx.quadraticCurveTo(x + s * 0.12, y + s * 0.12, x, y + s);
  ctx.quadraticCurveTo(x - s * 0.12, y + s * 0.12, x - s, y); ctx.quadraticCurveTo(x - s * 0.12, y - s * 0.12, x, y - s); ctx.fill(); ctx.restore();
}

// ---------------------------------------------------------------------
//  lettering: balloons (speech, shout, thought), narrator boxes, SFX. Comic lettering is caps; pass caps.
// ---------------------------------------------------------------------
function cmTextW(str, size, font = CM_LETTER, weight = 700) { ctx.save(); ctx.font = `${weight} ${size}px ${font}`; const w = ctx.measureText(str).width; ctx.restore(); return w; }
// lettered lines, centred on (0, 0) in the current transform. lines: strings, or [str, colour] pairs
function cmLetters(lines, size, o = {}) {
  const lh = size * (o.lead ?? 1.12), n = lines.length;
  ctx.save(); ctx.font = `${o.weight ?? 700} ${size}px ${o.font ?? CM_LETTER}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (o.spacing) ctx.letterSpacing = `${o.spacing * size}px`;
  lines.forEach((ln, i) => {   // a line is a string, [str, colour], or [[str, colour], [str, colour], ...] (segments)
    const segs = Array.isArray(ln) ? (Array.isArray(ln[0]) ? ln : [ln]) : [[ln, o.c ?? CM.ink]], R = RNG('let', i, B);
    const ws = segs.map(([s]) => ctx.measureText(s).width), tot = ws.reduce((a, b) => a + b, 0);
    ctx.save(); ctx.translate(R.n(0.5), (i - (n - 1) / 2) * lh + size * 0.04 + R.n(0.5)); ctx.rotate(R.n(0.006)); ctx.textAlign = 'left';
    let x = -tot / 2; segs.forEach(([s, c], k) => { ctx.fillStyle = c ?? o.c ?? CM.ink; ctx.fillText(s, x, 0); x += ws[k]; });
    ctx.restore();
  });
  ctx.restore();
}
const cmPlain = (l) => (Array.isArray(l) ? (Array.isArray(l[0]) ? l.map((g) => g[0]).join('') : l[0]) : l);
// a superellipse oval (squarer than an ellipse, so a line of caps fits), as points by angle
function cmOvalPts(rx, ry, a0, a1, m = 64, ex = 2.6) {
  const P = [];
  for (let i = 0; i <= m; i++) { const a = a0 + (a1 - a0) * i / m, c = Math.cos(a), s = Math.sin(a); P.push([rx * Math.sign(c) * Math.abs(c) ** (2 / ex), ry * Math.sign(s) * Math.abs(s) ** (2 / ex)]); }
  return P;
}
// a balloon at (x, y) with lettered lines and a tail to (tx, ty) (world coords; the tip stays put while it pops).
// o: { size, kind: 'speech' | 'shout' | 'thought', tail: [tx, ty], pop (0..1 scale), rot, fill, w, key, padX, padY, minW }
function cmBalloon(lines, x, y, o = {}) {
  lines = Array.isArray(lines) ? lines : [lines];
  const s = o.pop ?? 1; if (s <= 0.01) return null;
  const size = o.size ?? 60, key = o.key ?? 'bal' + lines.map(cmPlain).join('|'), kind = o.kind ?? 'speech';
  const tw = Math.max(o.minW ?? 0, ...lines.map((l) => cmTextW(cmPlain(l), size))), th = lines.length * size * 1.12;
  const shout = kind === 'shout', rx = tw / 2 + size * (o.padX ?? (shout ? 0.62 : 0.7)), ry = th / 2 + size * (o.padY ?? (shout ? 0.42 : 0.5));
  const rot = o.rot ?? 0, c = Math.cos(-rot), sn = Math.sin(-rot);
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  let P;
  if (kind === 'thought') P = cmCloudPts(0, 0, rx * 1.02, ry * 1.08, Math.max(8, Math.round(rx / 40)), key);
  else if (shout) {
    const S = RNG('shout', key), J = RNG('shoutj', key, B), m = Math.max(16, Math.round((rx + ry) / 22)) * 2; P = [];
    for (let i = 0; i < m; i++) { const a = i / m * TAU + S.n(0.04), k = (i % 2 ? 1.0 : 1.14 + S.r(0, 0.08)) + J.n(0.012), q = cmOvalPts(rx, ry, a, a, 1, 2.2)[0]; P.push([q[0] * k, q[1] * k]); }
  } else P = cmOvalPts(rx, ry, 0, TAU, 72).slice(0, -1);
  // the tail: a curved wedge from the rim to the tip, merged into the outline
  let tip = null;
  if (o.tail) {
    const dx = (o.tail[0] - x) / s, dy = (o.tail[1] - y) / s; tip = [dx * c - dy * sn, dx * sn + dy * c];
    const at = Math.atan2(tip[1] / ry, tip[0] / rx), rim = cmOvalPts(rx, ry, at, at, 1)[0];
    if (Math.hypot(tip[0], tip[1]) > Math.hypot(rim[0], rim[1]) * 1.08 && kind !== 'thought') {
      const half = clamp(size * (o.tailW ?? 0.42) / Math.hypot(rx, ry), 0.06, 0.5), body = [];
      const lo = at + half, hi = at + TAU - half;
      if (shout) for (const p of P) { let a = Math.atan2(p[1], p[0]); while (a < lo) a += TAU; if (a <= hi) body.push([a, p]); }
      const arc = shout ? body.sort((p, q) => p[0] - q[0]).map((b) => b[1]) : cmOvalPts(rx, ry, lo, hi, 64);
      const a = arc[arc.length - 1], b = arc[0], bend = o.bend ?? 0.18, mid = (p) => [lerp(p[0], tip[0], 0.55) - (tip[1] - p[1]) * bend, lerp(p[1], tip[1], 0.55) + (tip[0] - p[0]) * bend];
      const qa = mid(a), qb = mid(b), side = [];
      for (let k = 1; k <= 8; k++) { const t = k / 8; side.push([(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * qa[0] + t * t * tip[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * qa[1] + t * t * tip[1]]); }
      for (let k = 7; k >= 1; k--) { const t = k / 8; side.push([(1 - t) ** 2 * b[0] + 2 * (1 - t) * t * qb[0] + t * t * tip[0], (1 - t) ** 2 * b[1] + 2 * (1 - t) * t * qb[1] + t * t * tip[1]]); }
      P = arc.concat(side);
    }
  }
  cmPath(P); ctx.fillStyle = o.fill ?? CM.paperL; ctx.fill();
  if (o.tint) cmTint(P, o.tint, 1.6, 8, 15);
  cmRibbon(P, { closed: true, raw: true, w: (o.w ?? Math.max(3, size * 0.075)), key: key + 'o', lit: 0.75, heavy: 1.35, step: 6 });
  if (kind === 'thought' && tip) for (let k = 1; k <= 3; k++) {   // the trail of little bubbles toward the thinker
    const t = 0.55 + k * 0.13, bx = tip[0] * t, by = tip[1] * t, br = size * (0.34 - k * 0.07);
    const Q = ellipsePts(bx, by, br, br * 0.8, 0, 20); cmPath(Q); ctx.fillStyle = o.fill ?? CM.paperL; ctx.fill(); cmRibbon(Q, { closed: true, raw: true, w: size * 0.05, key: key + 'tb' + k });
  }
  cmLetters(lines, size, { c: o.c, font: o.font, weight: o.weight });
  ctx.restore();
  return { x, y, rx: rx * s, ry: ry * s };
}
// a narrator box: a printed rectangle (yellow by default) with lettering; (x, y) = its top-left corner
function cmBox2(str, x, y, size, o = {}) {
  const font = o.font ?? CM_LETTER, w = cmTextW(str, size, font, o.weight ?? 700) + size * (o.pad ?? 0.9), h = size * 1.5, s = o.pop ?? 1;
  if (s <= 0.01) return w;
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? -0.012); ctx.scale(s, s);
  cmShape(cmBox(0, 0, w, h), { raw: true, fill: o.fill ?? CM.yellow, tint: o.tint, w: Math.max(4, size * 0.09), key: 'box' + str, lit: 0.85, heavy: 1.35 });
  ctx.translate(w / 2, h / 2 + size * 0.02); cmLetters([str], size, { c: o.c, font, weight: o.weight, spacing: o.spacing });
  ctx.restore();
  return w;
}
// SFX lettering: condensed caps, thick ink outline, an extruded drop shadow, a dot screen on the lower half.
// o: { fill, shadow, depth (fraction of size), rot, skew, pop, dots (dot colour), ow (outline), spacing }
function cmSfx(str, x, y, size, o = {}) {
  const s = o.pop ?? 1; if (s <= 0.01) return;
  const J = RNG('sfx', str, B);
  ctx.save(); ctx.translate(x + J.n(1.2), y + J.n(1.2)); ctx.rotate((o.rot ?? -0.1) + J.n(0.008)); ctx.scale(s, s); ctx.transform(1, 0, o.skew ?? -0.16, 1, 0, 0);
  ctx.font = `400 ${size}px ${CM_SFX}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.miterLimit = 2;
  if (o.spacing) ctx.letterSpacing = `${o.spacing * size}px`;
  const d = (o.depth ?? 0.08) * size, ow = size * (o.ow ?? 0.13);
  ctx.strokeStyle = CM.ink; ctx.lineWidth = ow; ctx.fillStyle = o.shadow ?? CM.ink;
  for (let k = d; k > 0.5; k -= Math.max(1.5, d / 8)) { ctx.strokeText(str, k, k); ctx.fillText(str, k, k); }
  ctx.strokeText(str, 0, 0);
  const [mx, my] = cmMis();
  ctx.fillStyle = o.fill ?? CM.yellow; ctx.fillText(str, mx * 0.6, my * 0.6);
  if (o.dots !== false) {
    const m = ctx.measureText(str);
    ctx.save(); ctx.beginPath(); ctx.rect(-m.width, size * 0.02, m.width * 2, size); ctx.clip();
    ctx.fillStyle = cmDots(o.dots ?? CM.red, size * 0.035, size * 0.11, 45); ctx.fillText(str, mx * 0.6, my * 0.6); ctx.restore();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------
//  the hero: a small round character in process red with a bold brush outline, Ben-Day shading on its shadow side,
//  a white shine, big eyes that look and blink, brows and a mouth for the mood, stubby feet and optional arms.
//  o: { key, fill, shade, mood: 'smile' | 'happy' | 'wow' | 'shout' | 'grit' | 'worry' | 'smug', look: [dx, dy] (-1..1),
//       closed (eyes shut: asleep), squash (-1..1), arms: [[tx, ty], ...] (world points the mitts reach), feet (false = none), ground (y of the
//       floor: a dot shadow), blink (false = never), spark (false = don't mark the anchor), tilt }
// ---------------------------------------------------------------------
function cmHero(x, y, r, o = {}) {
  const key = o.key ?? 'hero', fill = o.fill ?? CM.red, shade = o.shade ?? CM.redD, mood = o.mood ?? 'smile';
  y += Math.sin(TT * TAU * 0.8 + key.length) * r * 0.035 * (o.bob ?? 1);
  const sq = o.squash ?? 0, rx = r * (1 + sq * 0.22), ry = r * (1 - sq * 0.18), lw = Math.max(3.5, r * 0.085);
  if (o.spark !== false) SPARK_AT = toScreen(x, y);
  if (o.ground != null) cmTint(ellipsePts(x + r * 0.15, o.ground, rx * 0.95, r * 0.16, 0, 28), CM.ink, 2.2, 8, 45);
  if (o.feet !== false) for (const sx of [-1, 1]) cmShape(ellipsePts(x + sx * rx * 0.42, y + ry * 0.93, r * 0.27, r * 0.15, sx * 0.15, 24), { fill: shade, w: lw * 0.75, key: key + 'ft' + sx, amt: 0.5 });
  const arm = (to, i) => {   // a tube in ink with the body colour inside, ending in a round mitt
    const a = Math.atan2(to[1] - y, to[0] - x), p0 = [x + Math.cos(a) * rx * 0.82, y + Math.sin(a) * ry * 0.82];
    const m = [lerp(p0[0], to[0], 0.5), lerp(p0[1], to[1], 0.5) - r * 0.12];
    const A = [p0, m, to];
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = CM.ink; ctx.lineWidth = r * 0.24; trace(A, false); ctx.stroke();
    ctx.strokeStyle = fill; ctx.lineWidth = r * 0.24 - lw * 1.1; trace(A, false); ctx.stroke(); ctx.restore();
    cmShape(ellipsePts(to[0], to[1], r * 0.17, r * 0.16, 0, 20), { fill, shade, sr: 1.8, depth: 0.3, w: lw * 0.8, key: key + 'mitt' + i, amt: 0.4 });
  };
  const arms = o.arms || [], behind = arms.filter((t) => t[1] < y - ry * 0.2), front = arms.filter((t) => t[1] >= y - ry * 0.2);
  behind.forEach(arm);
  const P = ellipsePts(x, y, rx, ry, o.tilt ?? 0, 56);
  cmShape(P, { fill, shade, sr: Math.max(1.6, r * 0.03), sgap: Math.max(7, r * 0.1), depth: 0.2, w: lw, key, amt: 0.6 });
  ctx.save(); ctx.lineCap = 'round'; ctx.strokeStyle = CM.paperL; ctx.lineWidth = r * 0.075;   // the shine
  ctx.beginPath(); ctx.ellipse(x - rx * 0.06, y - ry * 0.06, rx * 0.74, ry * 0.74, 0, Math.PI * 1.1, Math.PI * 1.38); ctx.stroke();
  ctx.fillStyle = CM.paperL; ctx.beginPath(); ctx.arc(x - rx * 0.36, y - ry * 0.74, r * 0.045, 0, TAU); ctx.fill(); ctx.restore();
  // eyes: big whites, pupils that look, a highlight; a blink every few seconds
  const lk = o.look ?? [0, 0], ey = y - ry * 0.13, ex = rx * 0.25, erx = r * 0.21, ery = r * (mood === 'wow' ? 0.31 : 0.27);
  const blink = !!o.closed || (o.blink !== false && (B + key.length * 5) % 31 < 1);
  for (const sx of [-1, 1]) {
    const cx = x + sx * ex;
    if (blink) { cmLine(arcPts(cx, ey + ery * 0.1, erx * 0.8, Math.PI * 0.1, Math.PI * 0.9, 8), lw * 0.8, key + 'bl' + sx, { amt: 0.3 }); continue; }
    const E = ellipsePts(cx, ey, erx, ery, 0, 28);
    cmPath(E); ctx.fillStyle = CM.paperL; ctx.fill();
    cmRibbon(E, { closed: true, raw: true, w: lw * 0.55, key: key + 'eo' + sx, lit: 0.8, heavy: 1.3 });
    const pr = mood === 'wow' ? 0.36 : 0.5, px = cx + lk[0] * erx * 0.42, py = ey + lk[1] * ery * 0.4 + ery * 0.08;
    ctx.fillStyle = CM.ink; ctx.beginPath(); ctx.ellipse(px, py, erx * pr, ery * pr * 1.05, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = CM.paperL; ctx.beginPath(); ctx.arc(px + erx * pr * 0.35, py - ery * pr * 0.4, erx * pr * 0.32, 0, TAU); ctx.fill();
  }
  // brows: the mood's slope
  const bs = { grit: 0.32, shout: 0.26, worry: -0.3, wow: -0.12, happy: -0.08, smug: 0.12, smile: 0 }[mood] ?? 0, by = ey - ery - r * (mood === 'wow' ? 0.16 : 0.1);
  for (const sx of [-1, 1]) {
    const cx = x + sx * ex;   // inner end (toward the nose) lower when cross, higher when worried
    cmLine([[cx - sx * erx * 0.95, by + bs * erx], [cx + sx * erx * 0.95, by - bs * erx]], lw * 1.05, key + 'br' + sx, { amt: 0.3, taper: 0.4 });
  }
  // mouth
  const my = y + ry * 0.36;
  if (mood === 'happy' || mood === 'wow' || mood === 'shout') {
    const M = mood === 'wow' ? ellipsePts(x, my + r * 0.03, r * 0.12, r * 0.15, 0, 24)
      : mood === 'shout' ? [[x - r * 0.28, my - r * 0.1], [x + r * 0.28, my - r * 0.12], ...arcPts(x, my - r * 0.11, r * 0.28, 0.1, Math.PI - 0.1, 14).map(([px, py]) => [px, my - r * 0.11 + (py - my + r * 0.11) * 1.25])]
      : [...arcPts(x, my - r * 0.06, r * 0.3, 0.05, Math.PI - 0.05, 16)];
    cmPath(M); ctx.fillStyle = CM.mouth; ctx.fill();
    ctx.save(); cmPath(M); ctx.clip(); ctx.fillStyle = CM.tongue; ctx.beginPath(); ctx.ellipse(x, my + r * (mood === 'wow' ? 0.16 : 0.24), r * 0.16, r * 0.1, 0, 0, TAU); ctx.fill(); ctx.restore();
    cmRibbon(M, { closed: true, raw: true, w: lw * 0.6, key: key + 'mo', lit: 0.8, heavy: 1.2 });
  } else if (mood === 'grit') {
    const M = rrectPts(x - r * 0.26, my - r * 0.08, r * 0.52, r * 0.18, r * 0.06, 3);
    cmPath(M); ctx.fillStyle = CM.paperL; ctx.fill();
    ctx.save(); ctx.strokeStyle = CM.ink; ctx.lineWidth = lw * 0.4; ctx.beginPath(); ctx.moveTo(x - r * 0.26, my + r * 0.01); ctx.lineTo(x + r * 0.26, my + r * 0.01);
    for (let i = 1; i < 4; i++) { ctx.moveTo(x - r * 0.26 + i * r * 0.13, my - r * 0.08); ctx.lineTo(x - r * 0.26 + i * r * 0.13, my + r * 0.1); } ctx.stroke(); ctx.restore();
    cmRibbon(M, { closed: true, raw: true, w: lw * 0.6, key: key + 'mg' });
  } else if (mood === 'worry') cmLine([[x - r * 0.2, my + r * 0.02], [x - r * 0.07, my - r * 0.04], [x + r * 0.07, my + r * 0.03], [x + r * 0.2, my - r * 0.02]], lw * 0.8, key + 'mw', { amt: 0.3 });
  else if (mood === 'smug') cmLine(arcPts(x + r * 0.08, my - r * 0.1, r * 0.2, 0.2, Math.PI * 0.7, 10), lw * 0.85, key + 'ms', { amt: 0.3 });
  else cmLine(arcPts(x, my - r * 0.12, r * 0.2, 0.25, Math.PI - 0.25, 12), lw * 0.85, key + 'm', { amt: 0.3 });
  front.forEach((t, i) => arm(t, i + 10));
  return P;
}

// ---------------------------------------------------------------------
//  captions: the tag is a narrator box at the top left ("LATER..."), the caption a box low in the frame. Both draw
//  after the camera (DEFER), at screen size; sizes follow UNIT, places follow SAFE and the 9:16 phone-safe area.
// ---------------------------------------------------------------------
function cmTag(str, o = {}) {
  const f = () => {
    const size = (o.size ?? 64) * UNIT, x = o.x ?? (PORTRAIT ? 130 : SAFE.right + 14 * UNIT), y = o.y ?? (PORTRAIT ? 296 : SAFE.top + 14 * UNIT);
    cmBox2(str, x, y, size, { fill: o.fill ?? CM.yellow, pop: o.pop ?? popS(o.t ?? E0 + 0.1), rot: o.rot ?? -0.02, font: o.font, c: o.c });
  };
  if (DEFER) DEFER.push(f); else f();
}
function cmCaption(str, o = {}) {
  const t = o.t ?? E0 + 0.4;
  if (TT < t) return;
  const f = () => {
    const size = (o.size ?? 54) * UNIT, w = cmTextW(str, size) + size * 0.9, cx = o.x ?? (PORTRAIT ? 450 : CX), y = o.y ?? (PORTRAIT ? 1150 : H - SAFE.bottom - size * 1.6);
    cmBox2(str, cx - w / 2, y, size, { fill: o.fill ?? CM.paperL, pop: popS(t), rot: o.rot ?? 0.012, c: o.c });
  };
  if (DEFER) DEFER.push(f); else f();
}

// =====================================================================
//  STYLE — the renderer's hooks (see the skill's styles/README.md)
// =====================================================================
const STYLE = {
  name: 'comic',
  paper: CM.paper,
  backdrop(c) { ctx.save(); screen(); ctx.fillStyle = c; ctx.fillRect(0, 0, W, H); ctx.fillStyle = cmDots('rgba(30,24,20,0.14)', 1.7, 10, 45); ctx.fillRect(0, 0, W, H); ctx.restore(); },
  window(P, key, src, o = {}) {   // an iris drawn as a panel: speed lines rushing out, a paper gutter, the world inside, a brush rule
    const c = P.reduce((a, p) => [a[0] + p[0] / P.length, a[1] + p[1] / P.length], [0, 0]);
    const r = Math.max(...P.map((p) => Math.hypot(p[0] - c[0], p[1] - c[1])));
    if (r < Math.hypot(W, H) * 0.6) cmSpeed(c[0], c[1], r * 1.12, Math.hypot(W, H), 40, { key: key + 'sp', w: 9, al: 0.85 });
    ctx.save(); cmPath(P); ctx.lineJoin = 'round'; ctx.lineWidth = 34 * UNIT; ctx.strokeStyle = CM.paperL; ctx.stroke(); ctx.restore();
    ctx.save(); cmPath(P); ctx.clip(); ctx.drawImage(src, 0, 0); ctx.restore();
    cmRibbon(P, { closed: true, raw: true, w: 10 * UNIT, key: key + 'rule', lit: 0.8, heavy: 1.3, step: 8 });
  },
  blob(P, c, key, u) {   // the morphing shape bursts into a jagged action star at mid-morph, then settles into the new one
    const cx = P.reduce((a, p) => a + p[0], 0) / P.length, cy = P.reduce((a, p) => a + p[1], 0) / P.length;
    const amp = 0.05 + 0.2 * Math.sin(Math.PI * clamp(u)), J = RNG('blobj', key, B);
    const Q = P.map(([x, y], i) => { const k = 1 + amp * ((i % 6 < 3 ? 1 : -0.55) * (1 - Math.abs((i % 6) - 2.5) / 3) + J.n(0.05)); return [cx + (x - cx) * k, cy + (y - cy) * k]; });
    const rr = Math.max(...Q.map((p) => Math.hypot(p[0] - cx, p[1] - cy)));
    cmSpeed(cx, cy, rr * 1.15, rr * 2.4, 26, { key: key + 'bs', w: 8 });
    cmShape(Q, { raw: true, fill: c, shade: CM.ink, sr: 1.7, sgap: 9, depth: 0.25, w: 7 * UNIT, key, lit: 0.8, heavy: 1.35 });
  },
  hero(x, y, r, o = {}) { cmHero(x, y, r * 0.6, { ...o, mood: o.mood === 'wow' ? 'wow' : 'happy', key: o.key ?? 'hero' }); },
  heroColor: CM.red,
  heroPts: (x, y, r) => ellipsePts(x, y, r * 0.6, r * 0.6, 0, 96),
  post() { ctx.save(); screen(); ctx.drawImage(cmNewsprintTex(), 0, 0); ctx.restore(); },
  ones: false,   // limited animation on 2s: every drawing is held for two frames
};
