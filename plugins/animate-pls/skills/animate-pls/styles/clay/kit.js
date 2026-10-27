// =====================================================================
//  styles/clay/kit.js — plasticine stop motion: soft rounded pieces lit from the top left (a lit top, a shaded
//  underside), speckle, tool marks and faint fingerprints, a waxy sheen, a soft cast shadow and a contact shadow
//  under everything that rests on the set; lumpy edges that boil on 2s (keyed on B) for whatever the animator
//  touches, a still set (felt wall, clay table), warm studio light. Built on kit/core.js (RNG, EZ, clamp, lerp,
//  resample, ellipsePts, rrectPts, toScreen, screen, TT / B / ev / popS / DEFER / E0 / SPARK_AT, LX / LY / UNIT).
//  Needs from the piece head: W, H, FPS, CX (caption centre x), SAFE.
//
//  Clay shading adapted from illodev/drawn-by-code (MIT): every piece is a flat silhouette turned into clay once
//  (base colour -> speckle, tool marks, fingerprints -> a volume gradient -> a bevel from the blurred inverse
//  silhouette -> a sheen -> trimmed to the silhouette) and kept as a sprite. Changes here: our RNG, system fonts,
//  pieces sized for a 1080 frame, and a capped LRU sprite cache keyed by the outline itself (a hash of its
//  points), the colour and the options, so a morphing blob never draws a stale sprite and memory stays bounded.
// =====================================================================

// ---- palette: soft modelling-clay colours; coral is the hero's alone
const CLAY = {
  felt: '#9cc2ad', feltD: '#86ad98', night: '#1f3550', nightD: '#172a40',
  butter: '#f1d79a', butterD: '#ddb873', card: '#d4bd9b', walnut: '#a8714a', tan: '#dca06a', cream: '#f7ecd2', moon: '#f6e3b0',
  hero: '#ee7a45', stone: '#8c8279', stoneD: '#5e564f', cocoa: '#3a2d27', ink: '#2a2422',
  mustard: '#e8b440', teal: '#3f9d8f', rose: '#e58ea2', blue: '#4b8fc6', leaf: '#5d9e58', leafD: '#3f7a44',
  pot: '#4f8fa8', screen: '#1b2420', glow: '#9fe3c9', white: '#fffaf0',
};
const CLAY_FONT = '"Arial Rounded MT Bold", "Arial Rounded MT", "Cooper Black", "Arial Black", "DejaVu Sans", sans-serif';   // rounded and heavy; stroked round below so any fallback rolls
const CLAY_U = 1.2;                    // upstream set units -> px on a 1080 short side (texture sizes)
const CLAY_LIGHT = [-0.6, -0.8];       // one warm key light from the top left, for every piece
const CLAY_RES = [0.35, 0.5, 0.7, 1, 1.4, 2, 2.8];   // sprite resolution steps (the current scale rounds up)
const clayV = (n = 3) => B % n;        // the boil drawing for this step: characters cycle n drawings on 2s

// ---- colours: '#hex' or 'rgb(r,g,b)' (the renderer blends bridge colours as rgb() mid-morph)
function clayRGB(c) {
  if (c[0] === '#') { const n = parseInt(c.slice(1, 7), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  const m = c.match(/[\d.]+/g) || [0, 0, 0]; return [+m[0], +m[1], +m[2]];
}
function clayShade(c, amt) {   // lighter (+) or darker (-) by amt percent
  const f = amt / 100;
  return '#' + clayRGB(c).map((v) => Math.round(clamp(f >= 0 ? v + (255 - v) * f : v * (1 + f), 0, 255)).toString(16).padStart(2, '0')).join('');
}
function clayRgba(c, a) { const [r, g, b] = clayRGB(c); return `rgba(${r},${g},${b},${a})`; }

// ---- outlines (local coords). Catmull-Rom through control points; lumps pushed along the normals by a seeded amount
function clayCatmull(pts, n = 8, closed = true) {
  const out = [], L = pts.length, P = (i) => pts[closed ? (i + L) % L : clamp(i, 0, L - 1)];
  for (let i = 0; i < (closed ? L : L - 1); i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  if (!closed) out.push(pts[L - 1]);
  return out;
}
function clayLumpy(pts, key, amt = 2, n = 8) {   // key: a seed (put the boil drawing in it for a character)
  const R = RNG('lump', key), L = pts.length;
  return clayCatmull(pts.map((p, i) => {
    const a = pts[(i - 1 + L) % L], b = pts[(i + 1) % L], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, k = R.n(amt);
    return [p[0] + (dy / l) * k, p[1] - (dx / l) * k];
  }), n);
}
const clayEll = (cx, cy, rx, ry, n = 14) => Array.from({ length: n }, (_, i) => { const a = i / n * TAU; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
function clayRR(x, y, w, h, r, step) {   // a rounded rect; step > 0 subdivides the straight edges (so lumps keep corners)
  r = Math.min(r, w / 2, h / 2);
  const P = [], arc = (cx, cy, a0) => { for (let i = 0; i <= 3; i++) { const a = a0 + i / 3 * Math.PI / 2; P.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
  arc(x + w - r, y + r, -Math.PI / 2); arc(x + w - r, y + h - r, 0); arc(x + r, y + h - r, Math.PI / 2); arc(x + r, y + r, Math.PI);
  return step ? resample(P, true, step) : P;
}
function clayCapsule(line, r) {   // a sausage of radius r (or [r0, r1]) along a polyline, round caps swept outwards
  const [r0, r1] = Array.isArray(r) ? r : [r, r], L = line.length, left = [], right = [];
  line.forEach((p, i) => {
    const a = line[Math.max(0, i - 1)], b = line[Math.min(L - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, rr = r0 + (r1 - r0) * (i / Math.max(1, L - 1));
    left.push([p[0] - (dy / l) * rr, p[1] + (dx / l) * rr]); right.push([p[0] + (dy / l) * rr, p[1] - (dx / l) * rr]);
  });
  const cap = (c, rr, a0) => Array.from({ length: 9 }, (_, i) => { const a = a0 - (i / 8) * Math.PI; return [c[0] + Math.cos(a) * rr, c[1] + Math.sin(a) * rr]; });
  const d0 = Math.atan2(line[1][1] - line[0][1], line[1][0] - line[0][0]), d1 = Math.atan2(line[L - 1][1] - line[L - 2][1], line[L - 1][0] - line[L - 2][0]);
  return [...left, ...cap(line[L - 1], r1, d1 + Math.PI / 2).slice(1, -1), ...right.reverse(), ...cap(line[0], r0, d0 - Math.PI / 2).slice(1, -1)];
}
const clayBean = (cx, cy, w, h, key, amt = 1.5) => clayLumpy(clayEll(cx, cy, w / 2, h / 2, 12), key, amt);
// a smooth hand wobble along the normals, seeded by (key, v): v = clayV() boils it, v = 0 keeps it still
function clayWob(P, closed, amt, key, v = 0, step = 8) {
  const Q = resample(P, closed, step), n = Q.length, R = RNG('cwob', key, v);
  const f1 = R.r(0.01, 0.025), f2 = R.r(0.04, 0.08), p1 = R.r(0, TAU), p2 = R.r(0, TAU), out = new Array(n);
  let s = 0;
  for (let i = 0; i < n; i++) {
    const a = Q[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = Q[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    const nx = a[1] - b[1], ny = b[0] - a[0], l = Math.hypot(nx, ny) || 1;
    if (i) s += Math.hypot(Q[i][0] - Q[i - 1][0], Q[i][1] - Q[i - 1][1]);
    const o = amt * (0.75 * Math.sin(s * f1 + p1) + 0.35 * Math.sin(s * f2 + p2));
    out[i] = [Q[i][0] + nx / l * o, Q[i][1] + ny / l * o];
  }
  return out;
}
const clayBox = (P) => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of P) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; } return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; };
function clayHashPts(P) {   // the outline itself, to 1/4 px: a changed outline is a different sprite
  let h = 2166136261 >>> 0;
  for (const p of P) { h = Math.imul(h ^ Math.round(p[0] * 4), 16777619); h = Math.imul(h ^ Math.round(p[1] * 4), 16777619); }
  return (h >>> 0).toString(36);
}

// ---------------------------------------------------------------------
//  the sprite cache: a capped LRU (a Map in use order) of static, keyed, seeded drawings. Nothing in it depends
//  on the frame, so a cold page and a warm one draw the same pixels; the cap keeps every export worker bounded.
// ---------------------------------------------------------------------
const CLAY_CACHE = new Map(), CLAY_CAP = 600, CLAY_BUDGET = 24e6;   // sprites, pixels (~96 MB) per page: the real bound
let CLAY_PIX = 0;
function clayCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function claySprite(id, box, res, draw) {   // id null = no cache (a morphing outline); returns the canvas
  let c = id ? CLAY_CACHE.get(id) : null;
  if (c) { CLAY_CACHE.delete(id); CLAY_CACHE.set(id, c); return c; }
  c = clayCanvas(Math.max(1, Math.ceil(box.w * res)), Math.max(1, Math.ceil(box.h * res)));
  const g = c.getContext('2d'); g.setTransform(res, 0, 0, res, -box.x * res, -box.y * res); draw(g);
  if (!id) return c;
  CLAY_CACHE.set(id, c); CLAY_PIX += c.width * c.height;
  while ((CLAY_CACHE.size > CLAY_CAP || CLAY_PIX > CLAY_BUDGET) && CLAY_CACHE.size > 1) {
    const [k0, c0] = CLAY_CACHE.entries().next().value;
    CLAY_CACHE.delete(k0); CLAY_PIX -= c0.width * c0.height; c0.width = c0.height = 0;
  }
  return c;
}
const clayBlit = (c, box, res) => ctx.drawImage(c, box.x, box.y, c.width / res, c.height / res);
function clayResNow(o) { const m = ctx.getTransform(), px = Math.hypot(m.a, m.b); return o.res ?? (CLAY_RES.find((v) => v >= px - 1e-6) ?? CLAY_RES[CLAY_RES.length - 1]); }

// ---------------------------------------------------------------------
//  the clay piece. shape: points [[x, y], ...] (a closed outline, local coords) or { box: {x, y, w, h}, fn(g), id }
//  where fn fills the silhouette with g.fillStyle (text, several blobs, evenodd holes) and id names it for the cache.
//  o: bevel (edge size, default 10), soft (bevel blur), shine 0..1, speckle 0..1 (1 = area/300 crumbs), marks,
//     prints (fingerprints), volume, light [x, y], shadow (cast shadow 0..1 or false), shadowBlur, shadowOffset,
//     variant (a boil drawing: new crumbs and prints), base (false: shading only, for text whose colour is fillText),
//     cache (false: draw fresh, for an outline that changes every frame), res (force a sprite resolution)
// ---------------------------------------------------------------------
function clayBake(g, shape, pts, bx, color, o, seed) {
  const T = g.getTransform(), SW = g.canvas.width, SH = g.canvas.height, k = T.a, u = CLAY_U;
  const fill = (x, col) => {
    x.fillStyle = col; x.strokeStyle = col;
    if (pts) { x.beginPath(); pts.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py))); x.closePath(); x.fill(); } else shape.fn(x);
  };
  const M = clayCanvas(SW, SH), mx = M.getContext('2d'); mx.setTransform(T); fill(mx, '#000');
  if (o.base !== false) fill(g, color);
  const R = RNG('claytex', seed), { x: X, y: Y, w: BW, h: BH } = bx, area = BW * BH, big = clamp(Math.sqrt(area) / 150, 1, 2.2);   // prints and marks grow with the piece
  // speckle: tiny darker and lighter crumbs of pigment (two paths, one fill each)
  const pD = new Path2D(), pL = new Path2D(), nSp = Math.round(area / 300 * (o.speckle ?? 1));
  for (let i = 0; i < nSp; i++) {
    const p = R.f() < 0.5 ? pD : pL, x = X + R.f() * BW, y = Y + R.f() * BH, rx = (0.4 + R.f() * 0.9) * u, ry = (0.4 + R.f() * 0.7) * u;
    p.moveTo(x + rx, y); p.ellipse(x, y, rx, ry, R.f() * 3, 0, TAU);
  }
  g.fillStyle = clayRgba(clayShade(color, -25), 0.25); g.fill(pD);
  g.fillStyle = clayRgba(clayShade(color, 25), 0.22); g.fill(pL);
  // tool marks: short curved smears
  const nMk = o.marks ?? Math.round(area / 8000);
  g.lineCap = 'round';
  for (let i = 0; i < nMk; i++) {
    const cx = X + R.f() * BW, cy = Y + R.f() * BH, a = R.f() * Math.PI, l = (6 + R.f() * 16) * u * big;
    g.strokeStyle = clayRgba(clayShade(color, R.f() < 0.6 ? -18 : 18), 0.35); g.lineWidth = (0.8 + R.f() * 1.2) * u * Math.sqrt(big);
    g.beginPath(); g.moveTo(cx - Math.cos(a) * l, cy - Math.sin(a) * l);
    g.quadraticCurveTo(cx + Math.sin(a) * 3 * u, cy - Math.cos(a) * 3 * u, cx + Math.cos(a) * l, cy + Math.sin(a) * l); g.stroke();
  }
  // fingerprints: groups of five concentric arcs, very faint
  const nFp = o.prints ?? Math.round(area / 11000);
  g.strokeStyle = clayRgba(clayShade(color, -24), 0.26); g.lineWidth = 0.7 * u * Math.sqrt(big);
  for (let i = 0; i < nFp; i++) {
    const cx = X + BW * (0.15 + R.f() * 0.7), cy = Y + BH * (0.15 + R.f() * 0.7), a = R.f() * TAU, rr = (5 + R.f() * 6) * u * big;
    g.beginPath();
    for (let j = 0; j < 6; j++) { const q = rr + j * 1.7 * u * Math.sqrt(big); g.moveTo(cx + Math.cos(a) * q * Math.cos(0.3) - Math.sin(a) * q * 0.7 * Math.sin(0.3), cy + Math.sin(a) * q * Math.cos(0.3) + Math.cos(a) * q * 0.7 * Math.sin(0.3)); g.ellipse(cx, cy, q, q * 0.7, a, 0.3, 2.6); }
    g.stroke();
  }
  // volume: a broad gradient from the light
  const [lx, ly] = o.light ?? CLAY_LIGHT, cxm = X + BW / 2, cym = Y + BH / 2, Rr = Math.max(BW, BH) * 0.75, vol = o.volume ?? 1;
  const gr = g.createRadialGradient(cxm + lx * Rr * 0.45, cym + ly * Rr * 0.45, Rr * 0.05, cxm, cym, Rr * 1.05);
  gr.addColorStop(0, `rgba(255,244,224,${0.2 * vol})`); gr.addColorStop(0.55, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(42,20,16,${0.3 * vol})`);
  g.fillStyle = gr; g.fillRect(X - 10, Y - 10, BW + 20, BH + 20);
  // bevel: the inverse silhouette, blurred and offset (dark on the edges away from the light, light on those facing it),
  // never more than 14% of the piece's smaller side or it washes a small piece out
  const bev = Math.min(o.bevel ?? 10, Math.min(BW, BH) * 0.14), soft = Math.min(o.soft ?? bev * 0.9, bev);
  const I = clayCanvas(SW, SH), ix = I.getContext('2d');
  const inv = (col) => { ix.globalCompositeOperation = 'copy'; ix.fillStyle = col; ix.fillRect(0, 0, SW, SH); ix.globalCompositeOperation = 'destination-out'; ix.drawImage(M, 0, 0); };
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.filter = `blur(${Math.max(0.5, soft * k)}px)`;
  inv(`rgba(42,18,8,${0.6 * (o.lo ?? 1)})`); g.drawImage(I, lx * bev * 0.9 * k, ly * bev * 0.9 * k);
  inv(`rgba(255,246,230,${0.55 * (o.hi ?? 1)})`); g.drawImage(I, -lx * bev * 0.6 * k, -ly * bev * 0.6 * k);
  g.restore();
  // sheen: a soft waxy highlight toward the light
  const sh = o.shine ?? 0.5;
  if (sh > 0) {
    g.save(); g.filter = `blur(${Math.max(1, Math.min(BW, BH) * 0.08 * k)}px)`; g.fillStyle = `rgba(255,252,240,${0.35 * sh})`;
    g.beginPath(); g.ellipse(cxm + lx * BW * 0.22, cym + ly * BH * 0.24, BW * 0.18, BH * 0.1, -0.5, 0, TAU); g.fill();
    // and a smaller, sharper glint inside it: plasticine is waxy, not matte
    g.filter = `blur(${Math.max(0.6, Math.min(BW, BH) * 0.022 * k)}px)`; g.fillStyle = `rgba(255,253,246,${0.42 * sh})`;
    g.beginPath(); g.ellipse(cxm + lx * BW * 0.25, cym + ly * BH * 0.29, BW * 0.075, BH * 0.04, -0.55, 0, TAU); g.fill(); g.restore();
  }
  // trim to the silhouette
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'destination-in'; g.drawImage(M, 0, 0); g.restore();
}
function clayPiece(key, shape, color, o = {}) {
  const pts = Array.isArray(shape) ? shape : null, bx = pts ? clayBox(pts) : shape.box;
  const res = clayResNow(o), v = o.variant ?? 0;
  const sig = [o.bevel, o.soft, o.shine, o.speckle, o.marks, o.prints, o.volume, o.light, o.base, o.hi, o.lo].join(',');
  const id = o.cache === false ? null : `${key}|${v}|${res}|${color}|${pts ? clayHashPts(pts) : shape.id ?? ''}|${sig}`;
  if (o.shadow !== false && o.shadow !== 0) {   // the soft shadow the piece casts on what is behind it
    const blur = o.shadowBlur ?? 9 * CLAY_U, pad = blur * 2.5 + 4, sb = { x: bx.x - pad, y: bx.y - pad, w: bx.w + pad * 2, h: bx.h + pad * 2 };
    const [dx, dy] = o.shadowOffset ?? [5 * CLAY_U, 9 * CLAY_U];
    const c = claySprite(id && 'sh|' + id + '|' + blur, sb, res, (g) => {
      g.filter = `blur(${blur * g.getTransform().a}px)`; g.fillStyle = 'rgba(52,26,18,0.42)'; g.strokeStyle = g.fillStyle;
      if (pts) { g.beginPath(); pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py))); g.closePath(); g.fill(); } else shape.fn(g);
    });
    ctx.save(); ctx.globalAlpha *= o.shadow ?? 0.8; ctx.translate(dx, dy); clayBlit(c, sb, res); ctx.restore();
  }
  if (o.onlyShadow) return;
  const pad = 4, box = { x: bx.x - pad, y: bx.y - pad, w: bx.w + pad * 2, h: bx.h + pad * 2 };
  clayBlit(claySprite(id, box, res, (g) => clayBake(g, shape, pts, bx, color, o, key + '|' + v)), box, res);
}
// a soft contact shadow on the set, under a piece resting on it (a squashed radial gradient)
function clayContact(x, y, rx, ry, a = 0.35) {
  const gr = ctx.createRadialGradient(x, y, 0, x, y, rx);
  gr.addColorStop(0, `rgba(52,26,18,${a})`); gr.addColorStop(0.6, `rgba(52,26,18,${a * 0.5})`); gr.addColorStop(1, 'rgba(52,26,18,0)');
  ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx); ctx.translate(-x, -y);
  ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, rx, 0, TAU); ctx.fill(); ctx.restore();
}

// ---- a rolled coil of clay along a path (cheap: layered strokes, no sprite), for rings, cables, steam, borders.
//  r = radius; o: closed, key, v (boil drawing; 0 = still), amt (lumpiness), shadow (false: none), alpha, speck
function clayRope(P, r, color, o = {}) {
  const closed = !!o.closed, Q = o.raw ? P : clayWob(P, closed, o.amt ?? r * 0.18, o.key ?? 'rope', o.v ?? 0, Math.max(4, r * 0.8));
  const [lx, ly] = CLAY_LIGHT, path = new Path2D();
  Q.forEach(([x, y], i) => (i ? path.lineTo(x, y) : path.moveTo(x, y))); if (closed) path.closePath();
  const st = (col, w, dx, dy, al = 1) => { ctx.save(); ctx.translate(dx, dy); ctx.globalAlpha *= al; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke(path); ctx.restore(); };
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.globalAlpha *= o.alpha ?? 1;
  if (o.shadow !== false) { st('rgba(52,26,18,0.16)', r * 2.4, r * 0.42, r * 0.7); st('rgba(52,26,18,0.2)', r * 2, r * 0.3, r * 0.5); }
  st(clayShade(color, -30), r * 2, 0, 0);
  st(color, r * 1.55, lx * r * 0.2, ly * r * 0.2);
  st(clayShade(color, 22), r * 0.8, lx * r * 0.42, ly * r * 0.42, 0.8);
  st('rgba(255,250,236,0.55)', r * 0.26, lx * r * 0.6, ly * r * 0.6);
  if (o.speck !== false) {   // crumbs along the coil, seeded by the path's own key (still unless v changes)
    const R = RNG('ropesp', o.key ?? 'rope', o.v ?? 0), dk = new Path2D(), lt = new Path2D();
    for (let i = 0; i < Q.length; i += 2) {
      const [x, y] = Q[i], p = R.f() < 0.5 ? dk : lt, ox = R.n(r * 0.7), oy = R.n(r * 0.7), s = (0.5 + R.f() * 0.8) * CLAY_U;
      p.moveTo(x + ox + s, y + oy); p.arc(x + ox, y + oy, s, 0, TAU);
    }
    ctx.fillStyle = clayRgba(clayShade(color, -30), 0.3); ctx.fill(dk); ctx.fillStyle = clayRgba(clayShade(color, 30), 0.3); ctx.fill(lt);
  }
  ctx.restore();
}

// ---------------------------------------------------------------------
//  clay letters: rolled clay set from a system font (glyph outlines, filled and stroked round so the ends roll).
//  The colour is a real fillText on the frame (tools/textcheck.mjs sees it); the clay shading and the cast shadow
//  are cached sprites laid over and under it. Pieces (words, or letters with by: 'letter') pop one by one
//  (o.pop: the first one's time, o.gap between; never set = already there).
//  o: align ('left' | 'center' | 'right'), weight, font, roll (stroke as a fraction of size), tilt (radians, seeded per
//  piece, fixed: hand-placed letters sit a little crooked), shadow, variant. Returns { x0, x1, w }.
// ---------------------------------------------------------------------
function clayLetters(str, x, y, size, color, o = {}) {
  const font = `${o.weight ?? 700} ${size}px ${o.font ?? CLAY_FONT}`, lw = size * (o.roll ?? 0.07);
  ctx.save(); ctx.font = font; ctx.fontKerning = 'none';
  const parts = [];   // [text, x offset]
  if ((o.by ?? 'word') === 'letter') { for (let i = 0; i < str.length; i++) if (str[i] !== ' ') parts.push([str[i], ctx.measureText(str.slice(0, i)).width]); }
  else { let at = 0; for (const w of str.split(' ')) { if (w) parts.push([w, ctx.measureText(str.slice(0, at)).width]); at += w.length + 1; } }
  const total = ctx.measureText(str).width, x0 = o.align === 'center' ? x - total / 2 : o.align === 'right' ? x - total : x;
  const out = { x0, x1: x0 + total, w: total };
  parts.forEach(([s, dx], i) => {
    const t0 = (o.pop ?? -9) + i * (o.gap ?? 0.12), sc = TT < t0 ? 0 : clayPop(TT - t0);
    if (sc <= 0.01) return;
    const w = ctx.measureText(s).width, R = RNG('cltilt', str, i), rot = R.n(o.tilt ?? 0.035), lift = R.n(size * 0.03);
    const shape = { id: `${s}|${font}|${lw}`, box: { x: -lw, y: -size * 0.95, w: w + lw * 2, h: size * 1.25 },
      fn: (g) => { g.font = font; g.fontKerning = 'none'; g.lineJoin = 'round'; g.lineWidth = lw; g.textBaseline = 'alphabetic'; g.fillText(s, 0, 0); g.strokeText(s, 0, 0); } };
    ctx.save(); ctx.translate(x0 + dx + w / 2, y + lift); ctx.rotate(rot); ctx.scale(sc, sc); ctx.translate(-w / 2, 0);
    const look = { base: false, bevel: size * 0.07, soft: size * 0.04, shine: 0.7, prints: 0, marks: 0, speckle: 0.5, hi: 0.55, lo: 1.15, variant: o.variant ?? 0 };
    clayPiece('txt', shape, color, { ...look, shadowBlur: size * 0.03, shadowOffset: [size * 0.03, size * 0.05], shadow: o.shadow ?? 0.85, onlyShadow: true });
    ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineJoin = 'round'; ctx.lineWidth = lw; ctx.textBaseline = 'alphabetic';
    ctx.fillText(s, 0, 0); ctx.strokeText(s, 0, 0);
    clayPiece('txt', shape, color, { ...look, shadow: false });
    ctx.restore();
  });
  ctx.restore();
  return out;
}
// the stop-motion pop of a title piece: 0.4 -> 1.18 -> 0.96 -> 1, stepped on 2s by TT
function clayPop(dt) { const k = [[0, 0.4], [0.08, 1.18], [0.17, 0.96], [0.25, 1]]; if (dt >= 0.25) return 1; for (let i = 1; i < k.length; i++) if (dt < k[i][0]) return lerp(k[i - 1][1], k[i][1], (dt - k[i - 1][0]) / (k[i][0] - k[i - 1][0])); return 1; }

// ---------------------------------------------------------------------
//  the set: a felt wall and a clay table. The set never boils (a boiling wall is noise); it is drawn once and cached.
// ---------------------------------------------------------------------
function clayFeltTex() {   // fibres and soft mottling in neutral light/dark, laid over any felt colour
  const box = { x: -40, y: -40, w: W + 80, h: H + 80 };
  return [claySprite(`felt|${W}x${H}`, box, 1, (g) => {
    const R = RNG('felt', W, H);
    for (let i = 0; i < 60; i++) {
      const x = R.r(box.x, box.x + box.w), y = R.r(box.y, box.y + box.h), r = R.r(60, 220), lt = R.f() < 0.5;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, lt ? 'rgba(255,250,240,0.07)' : 'rgba(40,30,20,0.06)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const pD = new Path2D(), pL = new Path2D(), n = Math.round(box.w * box.h / 55);
    for (let i = 0; i < n; i++) {
      const p = R.f() < 0.55 ? pD : pL, x = R.r(box.x, box.x + box.w), y = R.r(box.y, box.y + box.h), a = R.r(0, TAU), l = R.r(3, 10), b = a + R.n(1.2);
      p.moveTo(x, y); p.quadraticCurveTo(x + Math.cos(b) * l * 0.5, y + Math.sin(b) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
    }
    g.lineWidth = 1.1; g.lineCap = 'round';
    g.strokeStyle = 'rgba(40,28,18,0.13)'; g.stroke(pD); g.strokeStyle = 'rgba(255,250,240,0.16)'; g.stroke(pL);
  }), box];
}
function clayFelt(c, o = {}) {   // fill the frame (in the current coords) with felt of colour c
  ctx.save(); ctx.fillStyle = c; ctx.fillRect(-60, -60, W + 120, H + 120);
  const [s, box] = clayFeltTex(); ctx.globalAlpha *= o.tex ?? 1; ctx.drawImage(s, box.x, box.y); ctx.restore();
}
// a clay table across the frame: its top from y0 down `depth` (lit, lumpy), its front face below (in shade)
function clayTable(y0, depth, color, o = {}) {
  const x0 = -50, x1 = W + 50, key = o.key ?? 'table';
  clayPiece(key + 'f', clayLumpy(clayRR(x0, y0 + depth - 30, x1 - x0, H - y0 - depth + 90, 26, 60), key + 'f', 3, 6), clayShade(color, -16), { bevel: 18, shine: 0.15, shadow: false, volume: 0.6 });
  clayPiece(key + 't', clayLumpy(clayRR(x0, y0, x1 - x0, depth, 30, 60), key + 't', 3, 6), color, { bevel: 18, shine: 0.35, shadowOffset: [0, 14], shadowBlur: 14, shadow: 0.9 });
  if (o.trim !== false) clayRope([[x0, y0 + depth - 4], [x1, y0 + depth - 4]], o.trimR ?? 11, o.trim ?? clayShade(color, -8), { key: key + 'trim', amt: 2.5 });
}

// ---------------------------------------------------------------------
//  the hero: a round lump of coral clay with dot eyes, sitting on its flat underside. Boils on 2s (three drawings),
//  breathes, blinks; o: key, mood ('smile' | 'wow' | 'focus'), look [-1..1, -1..1] (where the pupils point),
//  arms [{ side: -1 | 1, a: angle (rad, 0 = straight out), len }], squash (-1..1), hop (px up), shadow
//  (x, y) is the centre of the lump; r its radius. Sets SPARK_AT.
// ---------------------------------------------------------------------
function clayHero(x, y, r, o = {}) {
  const key = o.key ?? 'hero', v = o.boil === false ? 0 : clayV(3), hop = o.hop ?? 0;
  const br = 0.022 * Math.sin(TT * TAU * 0.7 + key.length), sq = (o.squash ?? 0) + br, sx = 1 + sq * 0.35, sy = 1 - sq * 0.35, base = y + r * 0.86;
  if (o.shadow !== false) clayContact(x + r * 0.08, base + 2, r * (0.95 - hop / (r * 6)) * sx, r * 0.2, 0.42 * clamp(1 - hop / (r * 3), 0.3, 1));
  ctx.save(); ctx.translate(x, base - hop); ctx.scale(sx, sy); ctx.translate(0, -r * 0.86);
  const body = clayLumpy(clayEll(0, 0, r, r * 0.96, 14).map(([px, py]) => [px, Math.min(py, r * 0.86)]), key + v, r * 0.035);
  const arms = o.arms ?? [];
  const arm = (A, front) => {
    if (!!A.front !== front) return;
    const len = A.len ?? r * 0.6, a = A.a ?? 0, s = A.side ?? -1;
    ctx.save(); ctx.translate(s * r * 0.78, r * 0.22); ctx.rotate(s < 0 ? Math.PI - a : a);
    clayPiece(key + 'arm', clayCapsule([[0, 0], [len * 0.55, len * 0.04], [len, 0]], [r * 0.15, r * 0.19]), clayShade(CLAY.hero, -4), { variant: v, bevel: r * 0.06, shine: 0.6, shadowOffset: [3, 5], shadowBlur: 5 });
    ctx.restore();
  };
  arms.forEach((A) => arm(A, false));
  clayPiece(key + 'body', body, CLAY.hero, { variant: v, bevel: r * 0.13, shine: 0.75, shadowBlur: r * 0.08, shadowOffset: [r * 0.05, r * 0.07] });
  // cheeks: a soft blush pressed in
  for (const s of [-1, 1]) { const gx = s * r * 0.5, gy = r * 0.2, gr = ctx.createRadialGradient(gx, gy, 0, gx, gy, r * 0.2); gr.addColorStop(0, 'rgba(236,90,96,0.38)'); gr.addColorStop(1, 'rgba(236,90,96,0)'); ctx.fillStyle = gr; ctx.fillRect(gx - r * 0.2, gy - r * 0.2, r * 0.4, r * 0.4); }
  // eyes: two dark pellets with a glint, looking where o.look points; blink with a flat pressed line
  const [lkx, lky] = o.look ?? [0, 0], er = r * 0.1, blink = (B + key.length * 7) % 37 < 2 || o.mood === 'blink';
  for (const s of [-1, 1]) {
    const ex = s * r * 0.3 + lkx * r * 0.07, ey = -r * 0.08 + lky * r * 0.06;
    ctx.save(); ctx.translate(ex, ey);
    if (blink) clayPiece(key + 'lid', clayCapsule([[-er, 0], [er, 0]], er * 0.32), CLAY.ink, { bevel: 2, shine: 0.3, shadow: false, speckle: 0 });
    else {
      const big = o.mood === 'wow' ? 1.2 : 1;
      clayPiece(key + 'eye', clayEll(0, 0, er * big, er * 1.15 * big, 12), CLAY.ink, { bevel: er * 0.3, shine: 1, shadow: 0.5, shadowBlur: 3, shadowOffset: [1.5, 3], speckle: 0, prints: 0, marks: 0 });
      ctx.fillStyle = 'rgba(255,252,240,0.9)'; ctx.beginPath(); ctx.ellipse(-er * 0.35, -er * 0.45, er * 0.28, er * 0.22, -0.5, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  // mouth: a pressed sausage of a smile, a small dark O, or a flat line when it concentrates
  const m = o.mood ?? 'smile';
  ctx.save(); ctx.translate(0, r * 0.26);
  if (m === 'wow') clayPiece(key + 'mo', clayEll(0, 0, r * 0.08, r * 0.1, 12), clayShade(CLAY.hero, -55), { bevel: 3, shine: 0.2, shadow: false, speckle: 0, prints: 0 });
  else if (m === 'focus') clayPiece(key + 'mf', clayCapsule([[-r * 0.1, 0], [r * 0.1, r * 0.01]], r * 0.03), clayShade(CLAY.hero, -45), { bevel: 2, shadow: false, speckle: 0, prints: 0 });
  else clayPiece(key + 'ms', clayCapsule(arcPts(0, -r * 0.1, r * 0.17, Math.PI * 0.2, Math.PI * 0.8, 8), r * 0.035), clayShade(CLAY.hero, -45), { bevel: 2, shadow: false, speckle: 0, prints: 0 });
  ctx.restore();
  arms.forEach((A) => arm(A, true));
  ctx.restore();
  SPARK_AT = toScreen(x, y);
}

// ---------------------------------------------------------------------
//  props (each rests on the set at (x, y) = the middle of its base, with a contact shadow)
// ---------------------------------------------------------------------
// a small clay laptop facing us; o.screen(x, y, w, h) draws the lit screen's content (flat and lit: it is a screen)
function clayLaptop(x, y, w, o = {}) {
  const X0 = x, Y0 = y; ctx.save(); ctx.translate(x, y); x = 0; y = 0;   // local coords: a moved prop keeps its cached sprites
  const key = o.key ?? 'laptop', col = o.color ?? CLAY.stone, bh = w * 0.11, lh = w * 0.64, lw = w * 0.9;
  clayContact(x + w * 0.04, y - 2, w * 0.58, w * 0.07, 0.45);
  // the lid, standing up behind the base
  const lx0 = x - lw / 2, ly0 = y - bh * 0.7 - lh;
  clayPiece(key + 'lid', clayLumpy(clayRR(lx0, ly0, lw, lh, w * 0.05, 30), key + 'lid', 1.2, 4), col, { bevel: 7, shine: 0.6, marks: 2 });
  const sx = lx0 + w * 0.045, sy = ly0 + w * 0.045, sw = lw - w * 0.09, shh = lh - w * 0.075;
  ctx.save(); ctx.beginPath(); ctx.roundRect(sx, sy, sw, shh, w * 0.02); ctx.clip();
  ctx.fillStyle = o.screenColor ?? CLAY.screen; ctx.fillRect(sx, sy, sw, shh);   // flat, like a printed card behind glass
  if (o.screen) o.screen(sx, sy, sw, shh);
  ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + sw * 0.42, sy); ctx.lineTo(sx + sw * 0.12, sy + shh); ctx.lineTo(sx, sy + shh); ctx.fill();   // one hard reflection band
  ctx.restore();
  // the base: a slab seen a little from above, keys as a grid of pressed pellets
  const base = [[x - w / 2, y], [x + w / 2, y], [x + w * 0.45, y - bh], [x - w * 0.45, y - bh]];
  clayPiece(key + 'base', clayLumpy(resample(base, true, w * 0.08), key + 'base', 0.8, 4), clayShade(col, 8), { bevel: 6, shine: 0.5, shadowOffset: [4, 6], shadowBlur: 6 });
  ctx.save(); ctx.fillStyle = clayRgba(clayShade(col, -35), 0.55);
  for (let j = 0; j < 3; j++) for (let i = 0; i < 11; i++) {
    const t = (j + 0.6) / 3.4, kx = lerp(w * 0.43, w * 0.47, t), kw = (2 * kx) / 11;
    ctx.beginPath(); ctx.roundRect(x - kx + i * kw + kw * 0.15, y - bh + bh * 0.12 + j * bh * 0.24, kw * 0.7, bh * 0.16, 2); ctx.fill();
  }
  ctx.restore();
  ctx.restore();
  return { sx: sx + X0, sy: sy + Y0, sw, sh: shh, keys: [X0, Y0 - bh * 0.6] };
}
// a mug of tea with a coil handle and steam
function clayMug(x, y, r, color = CLAY.teal, o = {}) {
  ctx.save(); ctx.translate(x, y); x = 0; y = 0;   // local coords: a moved prop keeps its cached sprites
  const key = o.key ?? 'mug', h = r * 1.7;
  clayContact(x + r * 0.15, y - 2, r * 1.25, r * 0.22, 0.42);
  clayRope(arcPts(x + r * 0.95, y - h * 0.5, r * 0.42, -Math.PI * 0.45, Math.PI * 0.45, 10), r * 0.13, color, { key: key + 'h' });
  clayPiece(key, clayLumpy(clayRR(x - r, y - h, r * 2, h, r * 0.35, 18), key, 1.2, 5), color, { bevel: r * 0.12, shine: 0.6 });
  clayPiece(key + 'tea', clayEll(x, y - h + r * 0.14, r * 0.82, r * 0.16, 16), '#7a4a2c', { bevel: 3, shadow: false, shine: 0.8, speckle: 0.3 });
  if (o.steam !== false) claySteam(x, y - h - r * 0.1, r * 1.6, key);
  ctx.restore();
}
function claySteam(x, y, h, key = 'steam') {   // soft wisps that fade upward, re-drawn on 2s
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let i = 0; i < 3; i++) {
    const P = []; for (let k = 0; k <= 12; k++) P.push([x + (i - 1) * h * 0.16 + Math.sin(k * 0.7 - TT * 5 + i * 2.1) * h * 0.06 * (0.4 + k / 12), y - k / 12 * h * (0.85 + 0.15 * i % 2)]);
    const gr = ctx.createLinearGradient(0, y, 0, y - h); gr.addColorStop(0, 'rgba(255,252,244,0)'); gr.addColorStop(0.15, 'rgba(255,252,244,0.75)'); gr.addColorStop(1, 'rgba(255,252,244,0)');
    ctx.strokeStyle = gr; ctx.globalAlpha = 0.35; ctx.lineWidth = h * 0.13; trace(P, false); ctx.stroke();
    ctx.globalAlpha = 0.85; ctx.lineWidth = h * 0.05; trace(P, false); ctx.stroke();
  }
  ctx.restore();
}
// a wall clock: a cream face in a rolled rim, pellet ticks, capsule hands; the second hand ticks once a second
function clayClock(x, y, r, o = {}) {
  ctx.save(); ctx.translate(x, y); x = 0; y = 0;   // local coords: a moved prop keeps its cached sprites
  const key = o.key ?? 'clock', rim = o.rim ?? CLAY.teal;
  clayPiece(key, clayLumpy(clayEll(x, y, r, r, 16), key, 1.2), CLAY.cream, { bevel: r * 0.06, shine: 0.5, shadowOffset: [6, 10], shadowBlur: 9 });
  clayRope(ellipsePts(x, y, r, r, 0, 48), r * 0.1, rim, { closed: true, key: key + 'rim', shadow: false });
  ctx.fillStyle = clayShade(rim, -10);
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, d = r * 0.74, s = i % 3 ? r * 0.035 : r * 0.06; ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, s, 0, TAU); ctx.fill(); }
  const hand = (a, len, w, col, k) => { ctx.save(); ctx.translate(x, y); ctx.rotate(a - Math.PI / 2); clayPiece(key + k, clayCapsule([[-len * 0.15, 0], [len, 0]], w), col, { bevel: 2, shine: 0.6, speckle: 0.3, prints: 0, marks: 0, shadowOffset: [2, 4], shadowBlur: 3 }); ctx.restore(); };
  const sec = Math.floor(TT + (o.at ?? 0)) % 60, hrs = o.h ?? 8, min = o.m ?? 40;
  hand((hrs + min / 60) / 12 * TAU, r * 0.42, r * 0.06, CLAY.ink, 'h');
  hand(min / 60 * TAU, r * 0.62, r * 0.045, CLAY.ink, 'm');
  hand(sec / 60 * TAU, r * 0.68, r * 0.02, o.sec ?? CLAY.rose, 's');
  clayPiece(key + 'pin', clayEll(x, y, r * 0.07, r * 0.07, 10), o.sec ?? CLAY.rose, { bevel: 2, shine: 0.8, shadow: false, speckle: 0 });
  ctx.restore();
}
// a window in the felt wall: a flat sky, a clay sun (or o.moon) and a cloud drifting past, a rolled frame and a sill
function clayWindow(x, y, w, h, o = {}) {
  ctx.save(); ctx.translate(x, y); x = 0; y = 0;   // local coords: a moved prop keeps its cached sprites
  const key = o.key ?? 'window', r = Math.min(w, h) * 0.12;
  ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.clip();
  ctx.fillStyle = o.sky ?? '#a7d2e8'; ctx.fillRect(x, y, w, h);   // a flat painted card sky
  clayPiece(key + 'sun', clayLumpy(clayEll(x + w * 0.68, y + h * 0.36, h * 0.2, h * 0.2, 14), key + 'sun', h * 0.005), o.moon ? CLAY.moon : CLAY.mustard, { bevel: h * 0.03, shine: 0.7, shadow: 0.4 });
  ctx.save(); ctx.translate(x + ((w * 0.15 + TT * w * 0.06) % (w * 1.3)) - w * 0.1, y + h * 0.62);   // the cloud drifts by transform
  [[-0.1, 0.02, 0.24, 0.13], [0.04, -0.03, 0.28, 0.17], [0.18, 0.02, 0.22, 0.12]].forEach(([dx, dy, bw, bh], i) => clayPiece(key + 'c' + i, clayBean(dx * w, dy * h, bw * w, bh * h, key + 'c' + i, 1.2), CLAY.white, { bevel: 5, shine: 0.4, shadowOffset: [3, 5], shadowBlur: 5 }));
  ctx.restore();
  ctx.lineWidth = 6; ctx.strokeStyle = clayRgba(o.frame ?? CLAY.cream, 0.9); ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h); ctx.moveTo(x, y + h * 0.5); ctx.lineTo(x + w, y + h * 0.5); ctx.stroke();
  ctx.restore();
  clayRope(clayRR(x, y, w, h, r, 0), Math.max(8, w * 0.03), o.frame ?? CLAY.cream, { closed: true, key: key + 'f', amt: 1.5 });
  clayPiece(key + 'sill', clayLumpy(clayRR(x - w * 0.06, y + h - 4, w * 1.12, h * 0.1, h * 0.03, 30), key + 'sill', 1, 4), o.frame ?? CLAY.cream, { bevel: 6, shine: 0.5, shadowOffset: [5, 9] });
  ctx.restore();
}
// a toy block: a front face and a lit top, a numeral or letter pressed into the front in another clay
function clayBlock(x, y, s, label, color, o = {}) {
  ctx.save(); ctx.translate(x, y); x = 0; y = 0;   // local coords: a moved prop keeps its cached sprites
  const key = o.key ?? 'blk' + label, d = s * 0.22;
  if (o.contact !== false) clayContact(x + s * 0.06, y - 2, s * 0.62, s * 0.1, 0.4);
  clayPiece(key + 't', clayLumpy([[x - s / 2, y - s], [x - s / 2 + d, y - s - d * 0.8], [x + s / 2 + d, y - s - d * 0.8], [x + s / 2, y - s]].flatMap((p, i, A) => resample([p, A[(i + 1) % 4]], false, s * 0.2).slice(0, -1)), key + 't', 0.8, 4), clayShade(color, 18), { bevel: 4, shine: 0.6, shadow: false });
  clayPiece(key + 's', clayLumpy([[x + s / 2, y - s], [x + s / 2 + d, y - s - d * 0.8], [x + s / 2 + d, y - d * 0.8], [x + s / 2, y]].flatMap((p, i, A) => resample([p, A[(i + 1) % 4]], false, s * 0.2).slice(0, -1)), key + 's', 0.8, 4), clayShade(color, -22), { bevel: 4, shine: 0.1, shadow: false });
  clayPiece(key, clayLumpy(clayRR(x - s / 2, y - s, s, s, s * 0.12, s * 0.2), key, 1, 4), color, { bevel: s * 0.09, shine: 0.55, shadowOffset: [5, 7], shadowBlur: 7 });
  if (label) {
    const fs = s * 0.66;
    ctx.save(); ctx.font = `700 ${fs}px ${CLAY_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = clayRgba(clayShade(color, -45), 0.55); ctx.fillText(label, x + 2, y - s * 0.27 + 3);
    ctx.fillStyle = o.ink ?? CLAY.cream; ctx.fillText(label, x, y - s * 0.27);
    ctx.restore();
  }
  ctx.restore();
}
// a potted plant whose leaves sway on 2s
function clayPlant(x, y, s, o = {}) {
  ctx.save(); ctx.translate(x, y); x = 0; y = 0;   // local coords: a moved prop keeps its cached sprites
  const key = o.key ?? 'plant';
  clayContact(x + s * 0.05, y - 2, s * 0.42, s * 0.08, 0.4);
  const sw = Math.sin(TT * TAU * 0.5 + key.length) * 0.05;
  [[-0.9, 0.85], [-0.35, 1.05], [0.25, 1.0], [0.8, 0.8]].forEach(([a, l], i) => {
    ctx.save(); ctx.translate(x, y - s * 0.55); ctx.rotate(a * 0.55 + sw * (i % 2 ? 1 : -1));
    clayPiece(key + 'l' + i, clayBean(0, -s * 0.42 * l, s * 0.26, s * 0.75 * l, key + 'l' + i, 1.5), i % 2 ? CLAY.leaf : clayShade(CLAY.leaf, -12), { bevel: 5, shine: 0.5, shadowOffset: [3, 5], shadowBlur: 5 });
    ctx.restore();
  });
  clayPiece(key + 'pot', clayLumpy([[x - s * 0.34, y - s * 0.62], [x + s * 0.34, y - s * 0.62], [x + s * 0.26, y], [x - s * 0.26, y]].flatMap((p, i, A) => resample([p, A[(i + 1) % 4]], false, s * 0.12).slice(0, -1)), key + 'pot', 1.2, 4), o.pot ?? CLAY.pot, { bevel: s * 0.06, shine: 0.5 });
  clayRope([[x - s * 0.36, y - s * 0.6], [x + s * 0.36, y - s * 0.6]], s * 0.06, clayShade(o.pot ?? CLAY.pot, 10), { key: key + 'rim' });
  ctx.restore();
}
// a snail, the slowest thing on the set: it creeps along by itself (x moves with time), shell coiled from a rope
function claySnail(x, y, s, o = {}) {
  const key = o.key ?? 'snail', v = clayV(3), stretch = 1 + 0.06 * Math.sin(TT * TAU * 0.9);
  clayContact(x, y - 1, s * 0.75, s * 0.1, 0.35);
  ctx.save(); ctx.translate(x, y); ctx.scale(o.dir ?? 1, 1);
  for (const [dx, h] of [[0.42, 0.62], [0.58, 0.55]]) clayRope([[s * dx * stretch, -s * 0.22], [s * (dx + 0.06) * stretch, -s * h]], s * 0.035, o.body ?? '#c9c2a8', { key: key + 'st' + dx, v, speck: false, shadow: false });
  clayPiece(key + 'b', clayCapsule([[-s * 0.55, -s * 0.09], [s * 0.1, -s * 0.11], [s * 0.5 * stretch, -s * 0.2]], [s * 0.08, s * 0.13]), o.body ?? '#c9c2a8', { variant: v, bevel: 4, shine: 0.6, shadowOffset: [2, 3], shadowBlur: 3 });
  for (const [dx, h] of [[0.42, 0.62], [0.58, 0.55]]) { ctx.fillStyle = CLAY.ink; ctx.beginPath(); ctx.arc(s * (dx + 0.06) * stretch, -s * h, s * 0.045, 0, TAU); ctx.fill(); }
  clayPiece(key + 'sh', clayLumpy(clayEll(-s * 0.12, -s * 0.42, s * 0.36, s * 0.34, 14), key + 'sh' + v, s * 0.012), o.shell ?? CLAY.mustard, { variant: v, bevel: s * 0.05, shine: 0.7, shadowOffset: [3, 4], shadowBlur: 4 });
  const sp = []; for (let i = 0; i <= 26; i++) { const a = -Math.PI * 0.5 + i / 26 * TAU * 1.6, r = s * 0.28 * (1 - i / 34); sp.push([-s * 0.12 + Math.cos(a) * r, -s * 0.42 + Math.sin(a) * r * 0.95]); }
  clayRope(sp, s * 0.035, clayShade(o.shell ?? CLAY.mustard, -18), { key: key + 'sp', v, shadow: false, speck: false, amt: 0.6 });
  ctx.restore();
}
// a flat clay note held up by a blob of putty; lines of text pressed on it (printed things stay printed)
function clayNote(x, y, w, h, lines, o = {}) {
  const key = o.key ?? 'note', size = o.size ?? 56;
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? 0.05);
  clayPiece(key, clayLumpy(clayRR(-w / 2, -h / 2, w, h, 10, 30), key, 1.2, 4), o.color ?? CLAY.butter, { bevel: 6, shine: 0.4, speckle: 0.6 });
  ctx.fillStyle = o.ink ?? CLAY.cocoa; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.font = `${o.weight ?? 700} ${size}px ${o.font ?? CLAY_FONT}`;
  lines.forEach((s, i) => ctx.fillText(s, -w / 2 + size * 0.4, -h / 2 + size * (1.15 + i * 1.12)));
  clayPiece(key + 'tack', clayBean(0, -h / 2 + 4, w * 0.16, w * 0.1, key + 'tack', 1), CLAY.cream, { bevel: 4, shine: 0.7, shadowOffset: [2, 4], shadowBlur: 4 });
  ctx.restore();
}

// ---------------------------------------------------------------------
//  captions: the tag is clay letters (top left), the caption a short line pressed on a cream clay plaque.
//  Both draw after the camera (DEFER), at screen size; sizes follow UNIT, places follow SAFE.
// ---------------------------------------------------------------------
function clayTag(str, o = {}) {
  const size = (o.size ?? 104) * UNIT, x = o.x ?? (PORTRAIT ? 130 : SAFE.right + 12), y = o.y ?? (PORTRAIT ? 300 + size * 0.9 : 60 + size * 1.0);
  const f = () => clayLetters(str, x, y, size, o.color ?? CLAY.cocoa, { pop: o.t ?? E0 + 0.1, gap: o.gap ?? 0.06, by: o.by ?? 'letter', variant: 0 });
  if (DEFER) DEFER.push(f); else f();
}
function clayCaption(str, o = {}) {
  const t = o.t ?? E0 + 0.45;
  if (TT < t) return;
  const f = () => {
    const size = (o.size ?? 56) * UNIT, y = o.y ?? (PORTRAIT ? 1150 : H - SAFE.bottom - size * 1.2), s = popS(t);
    ctx.save(); ctx.font = `700 ${size}px ${CLAY_FONT}`; const w = ctx.measureText(str).width + size * 1.1, h = size * 1.6;
    ctx.translate(o.x ?? CX, y); ctx.rotate(o.rot ?? -0.015); ctx.scale(s, s);
    clayPiece('cap' + str, clayLumpy(clayRR(-w / 2, -h / 2, w, h, h * 0.4, 30), 'cap' + str, 1.5, 4), o.plaque ?? CLAY.cream, { bevel: 9, shine: 0.5, speckle: 0.6 });
    ctx.fillStyle = o.color ?? CLAY.cocoa; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(str, 0, size * 0.04);
    ctx.restore();
  };
  if (DEFER) DEFER.push(f); else f();
}

// ---- studio light: a warm pool from the top left and a darker falloff at the edges (cached), plus the slight
//  exposure flicker of a stop-motion camera between drawings (keyed on B)
function clayLight() {
  const box = { x: 0, y: 0, w: W, h: H };
  const s = claySprite(`light|${W}x${H}`, box, 0.25, (g) => {
    const R = Math.hypot(W, H) * 0.8, gr = g.createRadialGradient(W * 0.32, H * 0.22, 0, W * 0.32, H * 0.22, R);
    gr.addColorStop(0, 'rgba(255,232,190,0.16)'); gr.addColorStop(0.4, 'rgba(255,232,190,0)'); gr.addColorStop(0.75, 'rgba(60,32,14,0.16)'); gr.addColorStop(1, 'rgba(50,26,10,0.42)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  });
  ctx.save(); screen(); ctx.drawImage(s, 0, 0, W, H);   // a smooth gradient: a plain bilinear upscale is enough (the 'high' filter costs ~35 ms)
  ctx.fillStyle = `rgba(255,240,214,${RNG('flick', B).r(0, 0.022)})`; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// =====================================================================
//  STYLE — the renderer's hooks (see styles/README.md)
// =====================================================================
const STYLE = {
  name: 'clay',
  paper: CLAY.card,
  backdrop(c) { ctx.save(); screen(); clayFelt(c); ctx.restore(); },
  window(P, key, src, o = {}) {   // the world seen through a ring of rolled clay that casts a shadow into the hole
    const path = new Path2D(); P.forEach(([x, y], i) => (i ? path.lineTo(x, y) : path.moveTo(x, y))); path.closePath();
    const r = clamp(Math.sqrt(Math.abs(clayBox(P).w * clayBox(P).h)) * 0.035, 7, 22);
    ctx.save(); ctx.clip(path); ctx.drawImage(src, 0, 0);
    ctx.translate(r * 0.5, r * 0.8); ctx.lineWidth = r * 3; ctx.strokeStyle = 'rgba(52,26,18,0.22)'; ctx.stroke(path); ctx.restore();
    clayRope(P, r, o.c && o.c[0] === '#' ? o.c : CLAY.cream, { closed: true, key: 'win' + key, v: clayV(3), amt: r * 0.25, shadow: false });
  },
  blob(P, c, key, u) {   // a lump of clay squashing from one shape into the next (fresh every frame: the outline moves)
    const Q = clayWob(P, true, 5, key, clayV(3), 10);
    clayPiece(key, Q, c, { cache: false, variant: clayV(3), bevel: 16, shine: 0.6, shadowBlur: 10 });
  },
  hero(x, y, r, o = {}) { clayHero(x, y, r * 0.62, { ...o, mood: o.mood === 'wow' ? 'wow' : 'smile', key: o.key ?? 'hero' }); },
  heroColor: CLAY.hero,
  heroPts: (x, y, r) => ellipsePts(x, y, r * 0.62, r * 0.6, 0, 96),
  post() { clayLight(); },
  ones: false,   // stop motion on 2s: every drawing is held for two frames
};
