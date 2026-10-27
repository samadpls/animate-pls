// =====================================================================
//  styles/watercolor/kit.js — loose watercolour on cold-press paper: translucent washes glazed over each other
//  (multiply), each built from many low-alpha deformed polygons, with darker pigment pooled at the wet edges,
//  backruns, granulation, white paper left for highlights, a fine dip-pen (sepia) or pencil underdrawing in places,
//  and the paper's tooth over everything. Washes are baked once into keyed sprites and only blitted, so frames stay
//  fast; they bloom in from a point and drift by transform. Pen lines boil a little on 2s. Built on kit/core.js
//  (RNG, EZ, clamp, lerp, resample, wobble, trace, subPath, ellipsePts, bbox, toScreen, screen, TT / B / ev /
//  DEFER / E0 / SPARK_AT, LX / LY / UNIT / PORTRAIT). Needs from the piece head: W, H, FPS, CX, SAFE.
//
//  The wash is our own code after the technique Tyler Hobbs describes in "A Guide to Simulating Watercolor Paint
//  with Generative Art" (2017): a polygon deformed recursively (each segment's midpoint moved by a Gaussian scaled
//  by the segment's own variance, inherited and damped by its children), then 30-ish layers, each deformed again
//  from that base, drawn at a few percent opacity through masks of random circles. No code was copied.
// =====================================================================

// ---- palette: warm earth pigments on a warm sheet. Terracotta is the hero's alone. No hue between 220 and 330.
const WC = {
  paper: '#f3ebdb', sepia: '#4a301f', sepiaW: '#7d5a3c', graphite: '#6e665e',
  ochre: '#c98f35', ochreL: '#e7c47e', naples: '#f0d9a6', sand: '#d8b57c',
  terra: '#c0573a',
  sap: '#6e8a3a', sapD: '#4e6a2b', teal: '#2e7a74', tealL: '#8dbcb2',
  sky: '#86afc8', skyD: '#3d6f8c', night: '#23404f', stone: '#9a8e7e', white: '#fffaf0',
};
const WC_SERIF = '"Palatino Linotype", Palatino, "Book Antiqua", "URW Palladio L", P052, Georgia, "DejaVu Serif", serif';
const WC_RES = [0.35, 0.5, 0.7, 1, 1.4, 2, 2.8];   // sprite resolution steps (the current scale rounds up)

// ---- colours: '#hex' or 'rgb(r,g,b)' (the renderer blends bridge colours as rgb() mid-morph)
function wcRGB(c) {
  if (c[0] === '#') { const n = parseInt(c.slice(1, 7), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  const m = c.match(/[\d.]+/g) || [0, 0, 0]; return [+m[0], +m[1], +m[2]];
}
const wcRgba = (c, a) => { const [r, g, b] = wcRGB(c); return `rgba(${r},${g},${b},${a})`; };
function wcShade(c, amt) {   // lighter (+) or darker (-) by amt percent; returns #hex
  const f = amt / 100;
  return '#' + wcRGB(c).map((v) => Math.round(clamp(f >= 0 ? v + (255 - v) * f : v * (1 + f), 0, 255)).toString(16).padStart(2, '0')).join('');
}
const wcGauss = (R) => Math.sqrt(-2 * Math.log(Math.max(1e-9, R.f()))) * Math.cos(TAU * R.f());

// ---- outlines (local coordinates)
const wcEll = (cx, cy, rx, ry, n = 16, rot = 0) => ellipsePts(cx, cy, rx, ry, rot, n);
const wcRect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
// a brush stroke along a polyline: a ribbon of half-width w0 -> w1 (a swash, a wave, a reed), ends tapered
function wcStroke(line, w0, w1 = w0) {
  const Q = resample(line, false, Math.max(4, pathLen(line) / 24)), n = Q.length, L = [], Rr = [];
  Q.forEach((p, i) => {
    const a = Q[Math.max(0, i - 1)], b = Q[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    const u = i / (n - 1), w = lerp(w0, w1, u) * Math.min(1, Math.sin(Math.PI * clamp(u * 0.9 + 0.05)) * 1.6);
    L.push([p[0] - dy / l * w, p[1] + dx / l * w]); Rr.push([p[0] + dy / l * w, p[1] - dx / l * w]);
  });
  return L.concat(Rr.reverse());
}
function wcInside(P, x, y) {   // point in polygon (even-odd)
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c;
  return c;
}
function wcHashPts(P) {   // the outline itself, to 1/4 px: a changed outline is a different sprite
  let h = 2166136261 >>> 0;
  for (const p of P) { h = Math.imul(h ^ Math.round(p[0] * 4), 16777619); h = Math.imul(h ^ Math.round(p[1] * 4), 16777619); }
  return (h >>> 0).toString(36);
}

// ---------------------------------------------------------------------
//  the deformation: every segment carries its own variance; its midpoint moves by a Gaussian of (length x variance)
//  along the normal (and a little along the segment); both halves inherit the variance, damped by `decay` and jittered.
//  High-variance runs fray into soft edges, low-variance runs stay crisp.
// ---------------------------------------------------------------------
function wcDeform(P, V, depth, R, decay = 0.7) {
  for (let d = 0; d < depth; d++) {
    const n = P.length, Q = new Array(n * 2), U = new Array(n * 2);
    for (let i = 0; i < n; i++) {
      const a = P[i], b = P[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], v = V[i];
      const g1 = wcGauss(R) * v, g2 = wcGauss(R) * v * 0.3;
      Q[2 * i] = a; Q[2 * i + 1] = [(a[0] + b[0]) / 2 - dy * g1 + dx * g2, (a[1] + b[1]) / 2 + dx * g1 + dy * g2];
      U[2 * i] = v * decay * R.r(0.8, 1.2); U[2 * i + 1] = v * decay * R.r(0.8, 1.2);
    }
    P = Q; V = U;
  }
  return [P, V];
}
// the base shape of a wash: the outline resampled to ~segs segments, each with its own variance, deformed twice
function wcBase(P, o, R) {
  const per = pathLen(P.concat([P[0]])), Q = resample(P, true, o.step ?? Math.max(6, per / (o.segs ?? 12)));
  return wcDeform(Q, Q.map(() => (o.rough ?? 0.28) * (R.f() < 0.45 ? R.r(0.05, 0.45) : R.r(0.9, 2.1))), o.depth ?? 3, R, 0.72).concat([per / Q.length]);   // crisp runs and frayed runs
}

// ---------------------------------------------------------------------
//  the sprite cache: a capped LRU (a Map in use order) of baked washes. A sprite is a pure function of its id (key,
//  colour, a hash of the outline, the options, the resolution step), so a cold page and a warm one draw the same pixels.
// ---------------------------------------------------------------------
const WC_CACHE = new Map(), WC_CAP = 500, WC_BUDGET = 40e6;   // sprites, pixels (~160 MB) per page
let WC_PIX = 0, WC_SCR = null, WC_FULL = null;
function wcCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function wcSprite(id, res, make) {   // make() -> { box: {x, y, w, h}, draw(g) }; returns { c, box }
  if (id) { const s = WC_CACHE.get(id); if (s) { WC_CACHE.delete(id); WC_CACHE.set(id, s); return s; } }
  const m = make(), c = wcCanvas(Math.max(1, Math.ceil(m.box.w * res)), Math.max(1, Math.ceil(m.box.h * res)));
  const g = c.getContext('2d'); g.setTransform(res, 0, 0, res, -m.box.x * res, -m.box.y * res); m.draw(g);
  const s = { c, box: m.box };
  if (!id) return s;
  WC_CACHE.set(id, s); WC_PIX += c.width * c.height;
  while ((WC_CACHE.size > WC_CAP || WC_PIX > WC_BUDGET) && WC_CACHE.size > 1) {
    const [k0, s0] = WC_CACHE.entries().next().value;
    WC_CACHE.delete(k0); WC_PIX -= s0.c.width * s0.c.height; s0.c.width = s0.c.height = 0;
  }
  return s;
}
function wcScratch(w, h) {   // one reusable scratch canvas, resized (and so cleared) when the size changes
  if (!WC_SCR) WC_SCR = wcCanvas(w, h);
  if (WC_SCR.width !== w || WC_SCR.height !== h) { WC_SCR.width = w; WC_SCR.height = h; }
  return WC_SCR;
}
function wcResNow(o = {}) { if (o.res) return o.res; const m = ctx.getTransform(), px = Math.hypot(m.a, m.b) * (o.resK ?? 1); return WC_RES.find((v) => v >= px - 1e-6) ?? WC_RES[WC_RES.length - 1]; }

// ---------------------------------------------------------------------
//  baking one wash into g (local coords): layers of the base deformed again, filled at a few percent and their
//  outlines stroked (pigment pools where the outlines crowd: low-variance edges get a dark rim, frayed ones none),
//  every few layers seen through a mask of random circles (the mottle); then pigment blotches, a graded fade,
//  lifts (white paper), backruns and granulation.
//  o: layers, al (layer alpha), spread (per-layer variance), edge (rim strength), mask, vary, grade [x0,y0,x1,y1,a0,a1],
//     lift [{ P, a }], backruns, gran, rimW
// ---------------------------------------------------------------------
function wcBake(g, base, V, col, o, seed, box) {
  const R = RNG('wcbake', seed), [r, gg, b] = wcRGB(col), dk = wcRGB(wcShade(col, -32)).join(',');
  const layers = o.layers ?? 30, al = o.al ?? 0.06, edge = o.edge ?? 1, grp = o.mask === false ? layers : 4;
  const T = g.getTransform(), SW = g.canvas.width, SH = g.canvas.height, S = wcScratch(SW, SH), sx = S.getContext('2d');
  const size = Math.sqrt(box.w * box.h), cr = clamp(size / (o.mottle ?? 24), 2, 40), VL = V.map((v) => v * (o.spread ?? 2));
  for (let i0 = 0; i0 < layers; i0 += grp) {
    sx.setTransform(1, 0, 0, 1, 0, 0); sx.globalCompositeOperation = 'source-over'; sx.clearRect(0, 0, SW, SH); sx.setTransform(T);
    sx.lineJoin = 'round'; sx.lineWidth = o.rimW ?? 1.5; sx.fillStyle = `rgba(${r},${gg},${b},${al})`; sx.strokeStyle = `rgba(${dk},${al * 0.9 * edge})`;
    for (let i = i0; i < Math.min(layers, i0 + grp); i++) {
      const [L] = wcDeform(base, VL, o.depth2 ?? 3, R, 0.62), p = new Path2D();
      L.forEach(([x, y], j) => (j ? p.lineTo(x, y) : p.moveTo(x, y))); p.closePath();
      sx.fill(p); if (edge > 0) sx.stroke(p);
    }
    if (o.mask !== false) {   // the group shows only through ~70% of the sheet: a mask of random circles
      const mp = new Path2D(), n = Math.round(box.w * box.h / (Math.PI * cr * cr * 1.3) * 1.25);
      for (let j = 0; j < n; j++) { const x = box.x + R.f() * box.w, y = box.y + R.f() * box.h, rr = cr * R.r(0.3, 1.7); mp.moveTo(x + rr, y); mp.arc(x, y, rr, 0, TAU); }
      sx.globalCompositeOperation = 'destination-in'; sx.fillStyle = '#000'; sx.fill(mp);
    }
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(S, 0, 0); g.restore();
  }
  const blot = (mode, c, n, k0, k1) => {   // soft pigment blotches (darker where it pooled, lighter where it ran thin)
    g.globalCompositeOperation = mode;
    for (let j = 0; j < n; j++) {
      const x = box.x + R.f() * box.w, y = box.y + R.f() * box.h, rr = size * R.r(k0, k1), gr = g.createRadialGradient(x, y, 0, x, y, rr);
      gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    }
  };
  const vary = o.vary ?? 1;
  if (vary > 0) { blot('source-atop', `rgba(${dk},${0.16 * vary})`, 4, 0.08, 0.3); blot('destination-out', `rgba(0,0,0,${0.24 * vary})`, 4, 0.08, 0.32); }
  if (o.grade) {   // a graded wash: alpha a0 at (x0, y0) to a1 at (x1, y1)
    const [x0, y0, x1, y1, a0, a1] = o.grade, lg = g.createLinearGradient(x0, y0, x1, y1);
    lg.addColorStop(0, `rgba(0,0,0,${1 - a0})`); lg.addColorStop(1, `rgba(0,0,0,${1 - a1})`);
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = lg; g.fillRect(box.x, box.y, box.w, box.h);
  }
  for (const l of o.lift ?? []) {   // paper left (or lifted) white: a frayed hole through the wash
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = `rgba(0,0,0,${(l.a ?? 0.85) / 2})`;
    const Q = resample(l.P, true, Math.max(3, pathLen(l.P.concat([l.P[0]])) / 20));
    for (let k = 0; k < 2; k++) { const [L] = wcDeform(Q, Q.map(() => l.rough ?? 0.12), 2, R); g.beginPath(); L.forEach(([x, y], j) => (j ? g.lineTo(x, y) : g.moveTo(x, y))); g.fill(); }
  }
  for (let j = 0; j < (o.backruns ?? 0); j++) {   // a backrun: water run back into a drying wash, a pale cauliflower with a dark rim
    let x = 0, y = 0;
    for (let k = 0; k < 20; k++) { x = box.x + box.w * R.r(0.15, 0.85); y = box.y + box.h * R.r(0.15, 0.85); if (wcInside(base, x, y)) break; }
    const rr = size * R.r(0.07, 0.15), ph = R.r(0, TAU), lob = R.i(5, 8), P = [];
    for (let k = 0; k < 40; k++) { const a = k / 40 * TAU; P.push([x + Math.cos(a) * rr * (1 + 0.16 * Math.sin(lob * a + ph) + R.n(0.07)), y + Math.sin(a) * rr * (1 + 0.16 * Math.sin(lob * a + ph) + R.n(0.07))]); }
    const p = new Path2D(); P.forEach(([px, py], i) => (i ? p.lineTo(px, py) : p.moveTo(px, py))); p.closePath();
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = 'rgba(0,0,0,0.42)'; g.fill(p);
    g.globalCompositeOperation = 'source-atop'; g.lineJoin = 'round';
    g.strokeStyle = `rgba(${dk},0.32)`; g.lineWidth = Math.max(1.2, rr * 0.05); g.stroke(p);
    g.strokeStyle = `rgba(${dk},0.12)`; g.lineWidth = Math.max(2.5, rr * 0.14); g.stroke(p);
  }
  const gran = o.gran ?? 1;
  if (gran > 0) {   // granulation: pigment settling in the paper's tooth (dark specks) and specks of paper between
    const n = Math.round(box.w * box.h / 70 * gran), dP = new Path2D(), lP = new Path2D();
    for (let j = 0; j < n; j++) { const p = R.f() < 0.6 ? dP : lP, x = box.x + R.f() * box.w, y = box.y + R.f() * box.h, s = R.r(0.5, 1.5); p.rect(x, y, s, s); }
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = `rgba(${dk},0.35)`; g.fill(dP);
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = 'rgba(0,0,0,0.35)'; g.fill(lP);
  }
  g.globalCompositeOperation = 'source-over';
}
const wcSig = (o) => [o.mottle, o.rough, o.spread, o.segs, o.step, o.depth, o.depth2, o.layers, o.al, o.edge, o.rimW, o.mask, o.vary, o.backruns, o.gran, o.v,
  o.grade ? o.grade.join(' ') : '', o.lift ? o.lift.map((l) => wcHashPts(l.P) + ':' + (l.a ?? '')).join(';') : ''].join(',');

// ---------------------------------------------------------------------
//  wcWash(key, P, colour, o): a wash over outline P (local coords), glazed onto the frame (multiply).
//  o (look): see wcBake, plus rough (edge fray), segs, resK (sprite resolution factor: 0.5 for big soft skies), v (variant)
//  o (time): t (it blooms in at t: a wet front spreads from o.from, the default the outline's centre), dur (0.5 s),
//            dry (the wet sheen fades over 0.8 s after), mode ('multiply' | 'source-over'), alpha
//  Build P in local coords and move it with ctx.translate / rotate / scale: a moved wash keeps its cached sprite.
// ---------------------------------------------------------------------
function wcWash(key, P, col, o = {}) {
  let rv = 1;
  if (o.t != null) { rv = clamp((TT - o.t) / (o.dur ?? 0.5)); if (rv <= 0) return null; }
  const res = wcResNow(o), id = o.cache === false ? null : ['w', key, col, wcHashPts(P), res, wcSig(o)].join('|');
  const s = wcSprite(id, res, () => {
    const seed = key + '|' + (o.v ?? 0), [base, V, seg] = wcBase(P, o, RNG('wcbase', seed)), pad = 6 + seg * (o.rough ?? 0.28) * (o.spread ?? 2) * 1.3, bb = bbox(base, pad);
    const box = { x: bb.x0, y: bb.y0, w: bb.x1 - bb.x0, h: bb.y1 - bb.y0 };
    return { box, draw: (g) => wcBake(g, base, V, col, o, seed, box) };
  });
  const { c, box } = s;
  ctx.save(); ctx.globalCompositeOperation = o.mode ?? 'multiply'; ctx.globalAlpha *= o.alpha ?? 1;
  if (rv < 1) {   // the wet front, spreading on 2s
    const f = o.from ?? [box.x + box.w / 2, box.y + box.h / 2], far = Math.max(...[[box.x, box.y], [box.x + box.w, box.y], [box.x, box.y + box.h], [box.x + box.w, box.y + box.h]].map((q) => dist(q, f)));
    const rr = far * EZ.o2(rv) + 1;
    trace(wobble(ellipsePts(f[0], f[1], rr, rr, 0, 36), true, rr * 0.07, key + 'front', Math.max(6, rr / 20)), true); ctx.clip();
  }
  ctx.drawImage(c, box.x, box.y, box.w, box.h);
  const wet = o.t != null ? 1 - clamp((TT - o.t - (o.dur ?? 0.5)) / (o.dry ?? 0.8)) : 0;
  if (wet > 0) { ctx.globalAlpha *= 0.32 * wet; ctx.drawImage(c, box.x, box.y, box.w, box.h); }   // wet paint reads darker, then dries
  ctx.restore();
  return s;
}
// a quick wash drawn fresh (no cache): for outlines that change every frame (the morph blob). Boils on 2s.
function wcWashLive(P, col, key, o = {}) {
  const Q = resample(P, true, Math.max(6, pathLen(P.concat([P[0]])) / 40)), R = RNG('wclive', key, B);
  const [base, V] = wcDeform(Q, Q.map(() => (o.rough ?? 0.14) * R.r(0.3, 1.7)), 1, R, 0.7), dk = wcRgba(wcShade(col, -35), 0.16);
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.lineJoin = 'round';
  ctx.fillStyle = wcRgba(col, o.al ?? 0.11); ctx.strokeStyle = dk; ctx.lineWidth = 1.6;
  for (let i = 0; i < (o.layers ?? 12); i++) { const [L] = wcDeform(base, V, 2, R, 0.6); trace(L, true); ctx.fill(); ctx.stroke(); }
  ctx.strokeStyle = wcRgba(wcShade(col, -40), 0.35); ctx.lineWidth = 2.2; trace(wobble(Q, true, 1.5, key + 'rim', 8), true); ctx.stroke();   // the pooled edge
  const bb = bbox(Q), gP = new Path2D(), Rg = RNG('wclg', key);   // granulation, static
  for (let j = 0; j < 260; j++) { const x = lerp(bb.x0, bb.x1, Rg.f()), y = lerp(bb.y0, bb.y1, Rg.f()); if (wcInside(Q, x, y)) gP.rect(x, y, 1.4, 1.4); }
  ctx.fillStyle = wcRgba(wcShade(col, -45), 0.35); ctx.fill(gP);
  ctx.restore();
}

// ---------------------------------------------------------------------
//  lines: a dip pen (sepia, swelling and thinning with pressure, tapered ends, a skip of the nib here and there,
//  boiling a little on 2s) and a pencil underdrawing (thin graphite, doubled, running past the ends)
// ---------------------------------------------------------------------
function wcPen(P, o = {}) {
  const closed = !!o.closed, key = o.key ?? 'pen', w = o.w ?? 2.4;
  let Q = wobble(P, closed, o.amt ?? 0.7, key, o.step ?? 4);
  if (closed) Q = Q.concat([Q[0]]);
  if (o.frac != null) { if (o.frac <= 0) return; Q = subPath(Q, o.frac); }
  const n = Q.length; if (n < 2) return;
  const S = RNG('pens', key), f1 = S.r(0.01, 0.025), f2 = S.r(0.04, 0.09), p1 = S.r(0, TAU), p2 = S.r(0, TAU);
  const sA = [0]; for (let i = 1; i < n; i++) sA.push(sA[i - 1] + dist(Q[i - 1], Q[i]));
  const Ln = sA[n - 1], gaps = [];
  for (let s = S.r(30, 110); s < Ln - 15; s += S.r(40, 150)) if (S.f() < (o.lift ?? 0.35)) gaps.push([s, s + S.r(2.5, 7) * (w / 2.4)]);
  const path = new Path2D(); let run = [];
  const flush = () => {
    if (run.length > 1) {
      const L = [], Rr = [];
      run.forEach(([i, hw]) => { const a = Q[Math.max(0, i - 1)], b = Q[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; L.push([Q[i][0] - dy / l * hw, Q[i][1] + dx / l * hw]); Rr.push([Q[i][0] + dy / l * hw, Q[i][1] - dx / l * hw]); });
      const ring = L.concat(Rr.reverse()); ring.forEach(([x, y], j) => (j ? path.lineTo(x, y) : path.moveTo(x, y))); path.closePath();
    }
    run = [];
  };
  for (let i = 0; i < n; i++) {
    const s = sA[i];
    if (gaps.some(([a, b]) => s > a && s < b)) { flush(); continue; }
    const press = (0.62 + 0.38 * Math.sin(s * f1 + p1)) * (0.85 + 0.15 * Math.sin(s * f2 + p2));
    const taper = closed && o.frac == null ? 1 : Math.min(1, (s + 1) / (w * 5), (Ln - s + 1) / (w * 5)) ** 0.7;
    run.push([i, Math.max(0.25, w / 2 * press * taper)]);
  }
  flush();
  ctx.save(); ctx.fillStyle = o.color ?? WC.sepia; ctx.globalAlpha *= o.al ?? 0.92; ctx.fill(path); ctx.restore();
}
function wcPencil(P, o = {}) {
  const key = o.key ?? 'pc', over = o.over ?? 9, closed = !!o.closed;
  let Q = P.map((p) => p.slice());
  if (!closed && Q.length > 1) {   // the line runs on past both ends, as a quick construction line does
    const ext = (a, b) => { const l = dist(a, b) || 1; return [a[0] + (a[0] - b[0]) / l * over, a[1] + (a[1] - b[1]) / l * over]; };
    Q = [ext(Q[0], Q[1]), ...Q, ext(Q[Q.length - 1], Q[Q.length - 2])];
  }
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = o.color ?? WC.graphite;
  for (let k = 0; k < 2; k++) {
    ctx.globalAlpha = (o.al ?? 0.32) * (k ? 0.55 : 1); ctx.lineWidth = (o.w ?? 1.3) * (k ? 0.8 : 1);
    trace(wobble(Q, closed, o.amt ?? 1.0, key + k, 10), closed); ctx.stroke();
  }
  ctx.restore();
}
// a few drops of spattered pigment (static, seeded), glazed on
function wcSpatter(key, x, y, r, col, n = 10, o = {}) {
  const R = RNG('spat', key);
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = wcRgba(col, o.al ?? 0.5); ctx.beginPath();
  for (let i = 0; i < n; i++) { const a = R.r(0, TAU), d = r * Math.sqrt(R.f()), s = R.r(1, o.s ?? 5) * (R.f() < 0.15 ? 1.8 : 1); ctx.moveTo(x + Math.cos(a) * d + s, y + Math.sin(a) * d); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, s, 0, TAU); }
  ctx.fill(); ctx.restore();
}

// ---------------------------------------------------------------------
//  the paper: cold-press tooth (a periodic embossed noise tile, laid with mirror flips) plus a faint uneven tone,
//  one full-frame canvas made once per frame size; the post pass lays it over everything (ink and paint sit in it)
// ---------------------------------------------------------------------
function wcToothTile() {
  const N = 512, c = wcCanvas(N, N), g = c.getContext('2d'), img = g.createImageData(N, N), d = img.data, R = RNG('wctooth');
  const oct = [[128, 0.14], [64, 0.42], [32, 0.3], [8, 0.14]].map(([n, wt]) => ({ n, wt, v: Float32Array.from({ length: n * n }, () => R.f()) }));
  const h = new Float32Array(N * N), sm = (t) => t * t * (3 - 2 * t);
  for (const { n, wt, v } of oct) {
    const cs = N / n;
    for (let y = 0; y < N; y++) {
      const fy = y / cs, iy = Math.floor(fy), ty = sm(fy - iy), y0 = (iy % n) * n, y1 = ((iy + 1) % n) * n;
      for (let x = 0; x < N; x++) {
        const fx = x / cs, ix = Math.floor(fx), tx = sm(fx - ix), x0 = ix % n, x1 = (ix + 1) % n;
        h[y * N + x] += wt * lerp(lerp(v[y0 + x0], v[y0 + x1], tx), lerp(v[y1 + x0], v[y1 + x1], tx), ty);
      }
    }
  }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x, e = (h[i] - h[((y + 2) % N) * N + (x + 2) % N]) * 4, val = 0.5 - h[i], j = i * 4;   // lit from the top left
    if (e < 0) { d[j] = 74; d[j + 1] = 52; d[j + 2] = 32; d[j + 3] = Math.round(255 * clamp(-e * 0.3 + Math.max(0, val) * 0.05, 0, 0.085)); }
    else { d[j] = 255; d[j + 1] = 252; d[j + 2] = 242; d[j + 3] = Math.round(255 * clamp(e * 0.35, 0, 0.1)); }
  }
  g.putImageData(img, 0, 0);
  return c;
}
function wcToothFrame() {
  if (WC_FULL && WC_FULL.width === W && WC_FULL.height === H) return WC_FULL;
  const tile = wcToothTile(), c = wcCanvas(W, H), g = c.getContext('2d'), N = tile.width, R = RNG('wcpaper', W, H);
  const ox = -Math.floor(R.r(0, N)), oy = -Math.floor(R.r(0, N));   // the tile is periodic: no seams
  for (let y = oy; y < H; y += N) for (let x = ox; x < W; x += N) g.drawImage(tile, x, y);
  for (let i = 0; i < 26; i++) {   // the sheet's own unevenness: faint, broad, warm
    const x = R.r(0, W), y = R.r(0, H), r = R.r(120, 380), gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, R.f() < 0.5 ? 'rgba(150,110,60,0.035)' : 'rgba(255,252,240,0.05)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  WC_FULL = c; return c;
}
function wcTooth() { ctx.save(); screen(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(wcToothFrame(), 0, 0); ctx.restore(); }

// ---------------------------------------------------------------------
//  small things a seaside or a kitchen needs: a cloud (paper on top, a grey-blue belly), a gull (two pen arcs that
//  flap on 2s), a wave line (a pen squiggle with a gap of white paper under it)
// ---------------------------------------------------------------------
function wcCloud(key, x, y, w, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(w / 300, w / 300);
  wcWash(key + 'b', [[-150, 10], [-120, -20], [-60, -40], [0, -62], [60, -46], [120, -30], [155, 6], [110, 24], [-100, 24]], o.c ?? '#b9b3a8', { rough: 0.3, al: 0.05, layers: 20, edge: 0.6, grade: [0, -60, 0, 24, 0.35, 1], resK: 0.7 });
  wcWash(key + 'u', [[-120, 14], [-40, 4], [60, 8], [130, 16], [80, 32], [-90, 30]], o.c2 ?? WC.skyD, { rough: 0.25, al: 0.05, layers: 16, edge: 0.8, resK: 0.7 });
  ctx.restore();
}
function wcGull(x, y, s, o = {}) {
  const up = (B + (o.ph ?? 0)) % 4 < 2, k = up ? -0.55 : 0.15;
  wcPen([[x - s, y + s * k], [x - s * 0.5, y - s * 0.25 * (up ? 1.4 : 0.5)], [x, y]], { w: Math.max(1.4, s * 0.09), key: (o.key ?? 'gull') + 'l', amt: 0.3, lift: 0 });
  wcPen([[x, y], [x + s * 0.5, y - s * 0.25 * (up ? 1.4 : 0.5)], [x + s, y + s * k]], { w: Math.max(1.4, s * 0.09), key: (o.key ?? 'gull') + 'r', amt: 0.3, lift: 0 });
}
function wcWaveLine(x0, x1, y, o = {}) {
  const P = [], amp = o.amp ?? 4, len = o.len ?? 34, ph = (o.ph ?? 0) + TT * (o.speed ?? 1.2);
  for (let x = x0; x <= x1; x += 6) P.push([x, y + Math.sin(x / len * TAU * 0.5 + ph) * amp]);
  wcPen(P, { w: o.w ?? 1.6, key: o.key ?? 'wave' + y, amt: 0.5, lift: 0.6, color: o.color ?? WC.sepiaW, al: o.al ?? 0.7 });
}

// ---------------------------------------------------------------------
//  the hero: a small ink-and-wash sparrow. A terracotta wash body with paper left on the breast, a sepia cap,
//  wing and tail, an ochre beak, a dot eye with a paper glint, broken pen lines that boil on 2s. Washes are cached
//  in its own coords (it moves by transform). It bobs, breathes, blinks, twitches its head in steps, flicks its tail,
//  hops (o.hop: one time or a list) and flaps while airborne (o.fly). (x, y) is where its feet rest; s its size
//  (about its body length). o: key, dir (1 faces right, -1 left), look ('up' | 'down'), mood ('wow' widens the eye)
// ---------------------------------------------------------------------
function wcBird(x, y, s, o = {}) {
  const key = o.key ?? 'bird', t = TT, dir = o.dir ?? 1;
  let lift = 0, sq = 0, air = !!o.fly;
  for (const hp of [].concat(o.hop ?? [])) {
    const u = (t - hp) / 0.34;
    if (u > 0 && u < 1) { lift += 4 * u * (1 - u) * s * 0.45; air = true; }
    if (u >= 1 && u < 1.4) sq += 0.12;   // the landing squash, held for a drawing or two
    if (u > -0.25 && u <= 0) sq += 0.07; // the crouch before the hop
  }
  const bob = air ? 0 : Math.sin(t * TAU * 0.7 + key.length) * s * 0.012, breath = 1 + 0.018 * Math.sin(t * TAU * 1.1);
  ctx.save(); ctx.translate(x, y - lift + bob); ctx.scale(dir * s / 100, s / 100); ctx.scale(1 + sq * 0.5, (1 - sq) * breath);
  ctx.translate(0, -46);   // local coords: feet at y = 46, body centred near the origin
  if (!air) for (const lx of [-8, 6]) wcPen([[lx, 26], [lx - 3, 46], [lx + 7, 47]], { w: 2.2, key: key + 'leg' + lx, amt: 0.3, lift: 0 });
  else for (const lx of [-8, 6]) wcPen([[lx, 26], [lx - 10, 38]], { w: 2.2, key: key + 'legf' + lx, amt: 0.3, lift: 0 });
  // tail: flicks up now and then
  const flick = (Math.floor(t * 1.5 + key.length) % 5 === 0 ? -0.25 : 0) + (air ? -0.15 : 0);
  ctx.save(); ctx.translate(-34, 2); ctx.rotate(flick);
  wcWash(key + 'tail', [[2, -6], [-40, -20], [-44, -8], [0, 10]], WC.sepiaW, { rough: 0.12, al: 0.09, layers: 18, segs: 14 });
  wcPen([[0, -6], [-40, -19], [-43, -8], [-2, 9]], { w: 1.8, key: key + 'tailp', amt: 0.4 });
  ctx.restore();
  // body: terracotta, paper left on the breast
  wcWash(key + 'body', wcEll(-4, 6, 40, 28, 18, -0.12), WC.terra, { rough: 0.16, al: 0.075, layers: 26, edge: 1.2, lift: [{ P: wcEll(8, 16, 17, 9, 12, -0.2), a: 0.75, rough: 0.2 }], backruns: 1 });
  // head, twitching between a few angles in steps (as birds do)
  const tilt = [0, 0.12, -0.06, 0.16, 0.04][Math.floor(t * 1.6 + key.length * 3) % 5] * (o.look === 'down' ? -1 : 1) + (o.look === 'up' ? -0.25 : o.look === 'down' ? 0.3 : 0);
  ctx.save(); ctx.translate(16, -6); ctx.rotate(tilt); ctx.translate(-16, 6);
  wcWash(key + 'head', wcEll(24, -18, 19, 18, 14), WC.terra, { rough: 0.14, al: 0.075, layers: 22, edge: 1.2 });
  wcWash(key + 'cap', [[8, -26], [16, -35], [30, -37], [41, -27], [30, -27], [18, -22]], WC.sepiaW, { rough: 0.12, al: 0.1, layers: 16, segs: 14 });
  wcWash(key + 'beak', [[40, -22], [55, -17], [40, -12]], WC.ochre, { rough: 0.05, al: 0.14, layers: 12, segs: 9, gran: 0 });
  wcPen([[40, -22], [55, -17], [40, -12]], { w: 1.5, key: key + 'beakp', amt: 0.2, lift: 0 });
  const blink = (B + key.length * 7) % 37 < 2, er = o.mood === 'wow' ? 4.6 : 3.6;
  ctx.fillStyle = WC.sepia;
  if (blink) { ctx.fillRect(26, -20, 9, 2); }
  else { ctx.beginPath(); ctx.arc(30, -20, er, 0, TAU); ctx.fill(); ctx.fillStyle = WC.paper; ctx.beginPath(); ctx.arc(28.8, -21.4, er * 0.32, 0, TAU); ctx.fill(); }
  wcPen(arcPts(24, -18, 19, -2.6, 0.4, 14), { w: 1.9, key: key + 'headp', amt: 0.35 });
  ctx.restore();
  // wing: a darker almond on the side; flaps (on 2s) while airborne
  const flap = air ? ((B % 2) ? -0.9 : 0.35) : 0;
  ctx.save(); ctx.translate(8, -4); ctx.rotate(flap); ctx.translate(-8, 4);
  const WING = [[16, -2], [4, -12], [-14, -14], [-34, -9], [-48, -2], [-30, 7], [-8, 8], [8, 5]];
  wcWash(key + 'wing', WING, WC.sepiaW, { rough: 0.12, al: 0.1, layers: 20, edge: 1.4, segs: 16 });
  wcPen(WING.slice(1, 6), { w: 1.8, key: key + 'wingp', amt: 0.4 });
  wcPen([[-30, 1], [-12, 2], [2, -1]], { w: 1.2, key: key + 'wingf', amt: 0.3, al: 0.6 });
  ctx.restore();
  wcPen(arcPts(-4, 6, 40, 0.35, 2.5, 18).map(([px, py]) => [px, py * 0.7 + 1.8]), { w: 2, key: key + 'bellyp', amt: 0.4 });   // the belly line
  ctx.restore();
  SPARK_AT = toScreen(x, y - lift - s * 0.46);
}

// ---------------------------------------------------------------------
//  type: an old-style italic serif in sepia ink (never a UI sans), written on left to right, on a loose wash swash.
//  Text is a real fillText on the frame (tools/textcheck.mjs sees it); the swash is a cached wash.
// ---------------------------------------------------------------------
function wcText(str, x, y, size, o = {}) {
  ctx.save(); ctx.font = `${o.italic === false ? '' : 'italic '}${o.weight ?? 400} ${size}px ${o.font ?? WC_SERIF}`;
  ctx.textAlign = o.align ?? 'left'; ctx.textBaseline = 'alphabetic';
  const w = ctx.measureText(str).width, x0 = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x, frac = clamp(o.frac ?? 1);
  if (frac <= 0) { ctx.restore(); return w; }
  if (frac < 1) { ctx.beginPath(); ctx.rect(x0 - size, y - size * 1.3, (w + size * 0.2) * frac + size, size * 1.9); ctx.clip(); }
  ctx.fillStyle = o.color ?? WC.sepia; ctx.globalAlpha *= o.al ?? 1; ctx.fillText(str, x, y);
  ctx.restore();
  return w;
}
const wcTextW = (str, size, o = {}) => { ctx.save(); ctx.font = `${o.italic === false ? '' : 'italic '}${o.weight ?? 400} ${size}px ${o.font ?? WC_SERIF}`; const w = ctx.measureText(str).width; ctx.restore(); return w; };
// a loose brush swash, x0..x1 along y, h thick (local coords; it blooms in from the left at o.t)
function wcSwash(key, x0, x1, y, h, col, o = {}) {
  const R = RNG('swash', key), mid = (x0 + x1) / 2;
  const line = [[x0, y + R.n(h * 0.1)], [mid, y + R.n(h * 0.12)], [x1, y + R.n(h * 0.15)]];
  ctx.save(); ctx.translate(mid, y);
  wcWash(key, wcStroke(line.map(([px, py]) => [px - mid, py - y]), h * 0.42, h * 0.55), col, { rough: 0.2, al: 0.08, layers: 20, edge: 1.3, backruns: 0, t: o.t, dur: o.dur ?? 0.4, from: [x0 - mid, 0], ...o.look });
  ctx.restore();
}
// the era's tag (top left) and the caption (low centre), drawn after the camera through DEFER, placed from SAFE
function wcTag(str, o = {}) {
  const f = () => {
    const size = (o.size ?? 88) * UNIT, x = o.x ?? (PORTRAIT ? 140 : 90 * UNIT), y = o.y ?? (PORTRAIT ? 300 + size * 0.85 : SAFE.top + size * 0.95), w = wcTextW(str, size);
    wcSwash('tag' + str, x - size * 0.25, x + w + size * 0.3, y - size * 0.3, size * 0.95, o.swash ?? WC.ochreL, { t: o.t ?? E0 + 0.05 });
    wcText(str, x, y, size, { frac: ev(o.t2 ?? E0 + 0.25, 0.45), color: o.color });
  };
  if (DEFER) DEFER.push(f); else f();
}
function wcCaption(str, o = {}) {
  const f = () => {
    const size = (o.size ?? 58) * UNIT, x = o.x ?? CX, y = o.y ?? (PORTRAIT ? 1180 : H - SAFE.bottom - size * 0.55), w = wcTextW(str, size);
    wcSwash('cap' + str, x - w / 2 - size * 0.5, x + w / 2 + size * 0.5, y - size * 0.3, size * 1.05, o.swash ?? WC.tealL, { t: o.t ?? E0 + 0.4 });
    wcText(str, x, y, size, { align: 'center', frac: ev((o.t ?? E0 + 0.4) + 0.2, 0.5), color: o.color });
  };
  if (DEFER) DEFER.push(f); else f();
}

// =====================================================================
//  STYLE — the renderer's hooks (see styles/README.md)
// =====================================================================
let WC_WIN = null;   // the window's mask canvas (cleared on every use)
const STYLE = {
  name: 'watercolor',
  paper: WC.paper,
  backdrop(c) { ctx.save(); screen(); ctx.fillStyle = c; ctx.fillRect(0, 0, W, H); ctx.restore(); },
  window(P, key, src, o = {}) {   // the world seen through a soft, frayed opening in a wash, a pooled rim in the bridge colour
    if (!WC_WIN || WC_WIN.width !== W || WC_WIN.height !== H) WC_WIN = wcCanvas(W, H);
    const g = WC_WIN.getContext('2d'), R = RNG('wcwin', key, B), Q = resample(P, true, Math.max(6, pathLen(P.concat([P[0]])) / 48));
    const [base, V] = wcDeform(Q, Q.map(() => 0.18 * R.r(0.3, 1.7)), 1, R, 0.7);
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W, H);
    g.fillStyle = '#000';
    const fillPts = (L, a) => { g.globalAlpha = a; g.beginPath(); L.forEach(([x, y], j) => (j ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); };
    fillPts(Q, 1);
    for (let i = 0; i < 6; i++) fillPts(wcDeform(base, V, 2, R, 0.6)[0], 0.22);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-in'; g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(WC_WIN, 0, 0);
    const c = o.c ?? WC.sepiaW;
    ctx.globalCompositeOperation = 'multiply'; ctx.lineJoin = 'round';
    for (let i = 0; i < 3; i++) { ctx.strokeStyle = wcRgba(c, [0.32, 0.18, 0.12][i]); ctx.lineWidth = [2.2, 4.5, 8][i]; trace(wcDeform(base, V, 2, R, 0.6)[0], true); ctx.stroke(); }
    ctx.restore();
  },
  blob(P, c, key) { wcWashLive(P, c, key); },
  hero(x, y, r, o = {}) { wcBird(x, y + r * 0.55, r * 1.45, { ...o, key: o.key ?? 'hero' }); },
  heroColor: WC.terra,
  heroPts: (x, y, r) => ellipsePts(x, y, r * 0.75, r * 0.58, -0.12, 96),
  post() { wcTooth(); },
  ones: false,   // on 2s: washes bloom and drift in steps, the pen boils every two frames
};
