// =====================================================================
//  styles/poster/kit.js — a 1970s screenprinted poster. Flat spot inks (mustard, burnt orange, brick, brown, olive,
//  teal, cream) pulled one screen at a time onto warm cream stock: every ink sits a few px off register and shifts a
//  hair with each pull (on 2s), ink edges carry a darker rim, and a print pass scatters pinholes and paper tooth over
//  every frame. Sunbursts, rainbow bands and stripes, big heavy display type with echo outlines (the lettering repeated
//  in offset bands), halftone dots for any fade. No gradients, no glows, no black: the darkest ink is a warm brown.
//  Built on kit/core.js (RNG, clamp, lerp, seg, EZ, ellipsePts, arcPts, bbox, subPath, toScreen, screen, TT / B / E0 /
//  DEFER / SPARK_AT, popS, LX / LY / UNIT / PORTRAIT / WIDE). Needs from the piece head: W, H, FPS, CX (caption centre
//  x), SAFE. Optional before the kit: `const POSTERF = '<font stack>'` (the display face), `const PST_MIS = 1.5`
//  (more or less misregistration).
//  Echo bands drawn as stacked strokes from the outside in, the alternating sunburst wedges and the wavy outline are
//  adapted from the 70s-poster kit in illodev/drawn-by-code (MIT); see STYLE.md for the credit.
// =====================================================================

// ---- the inks. A poster has five or six; each prints flat. Brown is the key (outlines, faces, the darkest thing).
//  The hero's gold (`sun`) is reserved for the hero; `tan` is the quiet ink for background rays.
const PST = {
  paper: '#f1e3c4',    // the stock: warm cream (a knockout shows it)
  cream: '#f8eed6',    // cream ink printed over colour (type, highlights)
  brown: '#3a2216',    // the key ink
  cocoa: '#6e3b22',
  brick: '#b4402d',
  orange: '#d9682a',
  mustard: '#dfa22e',
  sun: '#f4bf3e',      // the hero
  olive: '#87803a',
  teal: '#2f7a70',
  tan: '#e7c690',
};
// each screen's offset from the key (px at 1080 on the short side): the misregistration a hand pull leaves
const PST_REG = { brown: [0, 0], cocoa: [1, 1.5], brick: [3.5, -2.5], orange: [-3, 2.5], mustard: [2.5, 3], sun: [-2.5, -2], olive: [3, 2.5], teal: [-3, -2.5], tan: [2, -2], cream: [-1.5, 1.5], paper: [0, 0] };
// the display face: a heavy, round-shouldered serif per OS (Cooper Black where Office is installed, Superclarendon on
// macOS, Bookman on Linux), then Georgia; `pstType` fattens it with a round-joined stroke so every face reads soft
const PSTF = typeof POSTERF !== 'undefined' ? POSTERF : '"Cooper Black", "Cooper Std", Superclarendon, "Bookman Old Style", "URW Bookman", "URW Bookman L", "TeX Gyre Bonum", "Rockwell Extra Bold", Rockwell, Georgia, serif';

// ---- colour: '#rrggbb' or 'rgb(r,g,b)' (the renderer's mid-morph blends)
const PST_RGB = new Map();
function pstRGB(c) {
  let v = PST_RGB.get(c); if (v) return v;
  v = c[0] === '#' ? [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) : (String(c).match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map(Number);
  if (PST_RGB.size < 4000) PST_RGB.set(c, v);
  return v;
}
const pstMix = (a, b, u) => { const x = pstRGB(a), y = pstRGB(b); return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], clamp(u)))).join(',')})`; };
const pstA = (c, a) => { const v = pstRGB(c); return `rgba(${v[0]},${v[1]},${v[2]},${a})`; };
// an ink by name ('orange') or any colour -> [css colour, dx, dy]: its screen's offset plus this pull's wobble (on 2s)
function pstInk(ink) {
  const c = PST[ink] ?? ink, base = PST_REG[ink] ?? [2, -2], k = (typeof PST_MIS !== 'undefined' ? PST_MIS : 1) * UNIT;
  if (ink === 'paper' || ink === 'brown') return [c, 0, 0];
  const J = RNG('pst-reg', PST[ink] ? ink : 'any', B);
  return [c, (base[0] + J.n(0.8)) * k, (base[1] + J.n(0.8)) * k];
}
const pstEdgeC = (c) => pstMix(c, PST.brown, 0.24);   // where ink builds up against the stencil

// ---------------------------------------------------------------------
//  THE SHEET and THE PULL. Both are static textures, made once per frame size and kept (a cache of static things).
//  pstPaper(c) fills the frame with the stock (or any colour) and lays the paper's mottle, fibres and specks over it.
//  pstPrint() (STYLE.post) lays pinholes (paper showing where the ink skipped the mesh) and tooth over the whole frame,
//  shifted each pull, so held frames still shimmer like a stack of prints flipped on 2s.
// ---------------------------------------------------------------------
const PST_CACHE = {};
function pstCanvas(key, w, h, draw) {
  const k = key + ':' + w + 'x' + h;
  if (!PST_CACHE[k]) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); PST_CACHE[k] = c; }
  return PST_CACHE[k];
}
function pstPaperTex() {
  return pstCanvas('paper', W, H, (g, w, h) => {
    const R = RNG('pst-paper'), k = (w * h) / (1080 * 1920);
    // mottle: a coarse noise grid scaled up smoothly (about one level either way, never a visible gradient)
    const s = document.createElement('canvas'); s.width = Math.ceil(w / 14); s.height = Math.ceil(h / 14);
    const sg = s.getContext('2d');
    for (let y = 0; y < s.height; y++) for (let x = 0; x < s.width; x++) {
      sg.fillStyle = R.f() < 0.5 ? `rgba(255,251,238,${R.r(0, 0.16).toFixed(3)})` : `rgba(160,118,62,${R.r(0, 0.07).toFixed(3)})`; sg.fillRect(x, y, 1, 1);
    }
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(s, 0, 0, w, h);
    g.lineCap = 'round';
    for (let i = 0; i < 520 * k; i++) {   // fibres: short curly hairs a shade darker than the stock
      let x = R.r(0, w), y = R.r(0, h), a = R.r(0, TAU); const L = R.r(8, 26), bend = R.n(0.4);
      g.strokeStyle = `rgba(120,84,46,${R.r(0.08, 0.2).toFixed(3)})`; g.lineWidth = R.r(0.7, 1.3);
      g.beginPath(); g.moveTo(x, y);
      for (let j = 0; j < 6; j++) { a += bend; x += Math.cos(a) * L / 6; y += Math.sin(a) * L / 6; g.lineTo(x, y); }
      g.stroke();
    }
    for (let i = 0; i < 900 * k; i++) { g.fillStyle = `rgba(90,60,35,${R.r(0.08, 0.3).toFixed(3)})`; g.fillRect(R.r(0, w), R.r(0, h), R.r(0.8, 2), R.r(0.8, 2)); }
  });
}
function pstPaper(c = PST.paper) { ctx.save(); screen(); ctx.fillStyle = c; ctx.fillRect(0, 0, W, H); ctx.drawImage(pstPaperTex(), 0, 0); ctx.restore(); }
const PST_PULL = 96;
function pstPullTex() {
  return pstCanvas('pull', W + PST_PULL, H + PST_PULL, (g, w, h) => {
    const R = RNG('pst-pull'), k = (w * h) / (1080 * 1920), P = pstRGB(PST.paper);
    // pinholes: clusters of tiny paper-coloured specks; over the stock they vanish, over ink they read as skips
    for (let c = 0; c < 1500 * k; c++) {
      const cx = R.r(0, w), cy = R.r(0, h), n = R.i(2, 16), sp = R.r(2, 11);
      for (let i = 0; i < n; i++) {
        g.fillStyle = `rgba(${P[0]},${P[1]},${P[2]},${R.r(0.35, 0.9).toFixed(3)})`;
        const s = R.r(0.9, 2.6); g.fillRect(cx + R.n(sp), cy + R.n(sp), s, s * R.r(0.6, 1.4));
      }
    }
    // a few dry drags of the squeegee: short broken light streaks along the pull
    for (let i = 0; i < 70 * k; i++) {
      const x = R.r(0, w), y = R.r(0, h), L = R.r(30, 120);
      g.fillStyle = `rgba(${P[0]},${P[1]},${P[2]},${R.r(0.12, 0.3).toFixed(3)})`;
      for (let u = 0; u < L; u += R.r(2, 6)) g.fillRect(x + u, y + R.n(0.8), R.r(1, 4), R.r(0.8, 1.6));
    }
    // tooth: fine dark grain
    for (let i = 0; i < 9000 * k; i++) { g.fillStyle = `rgba(58,34,22,${R.r(0.05, 0.16).toFixed(3)})`; g.fillRect(R.r(0, w), R.r(0, h), 1.4, 1.4); }
  });
}
function pstPrint() {
  const J = RNG('pst-pull-at', B);
  ctx.save(); screen(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(pstPullTex(), -Math.floor(J.r(0, PST_PULL)), -Math.floor(J.r(0, PST_PULL)));
  ctx.restore();
}

// ---------------------------------------------------------------------
//  geometry: outlines are point lists (world coords)
// ---------------------------------------------------------------------
function pstPath(P, dx = 0, dy = 0, fresh = true, closed = true) {
  if (fresh) ctx.beginPath();
  ctx.moveTo(P[0][0] + dx, P[0][1] + dy); for (let i = 1; i < P.length; i++) ctx.lineTo(P[i][0] + dx, P[i][1] + dy);
  if (closed) ctx.closePath();
}
const pstCentre = (P) => P.reduce((a, p) => [a[0] + p[0] / P.length, a[1] + p[1] / P.length], [0, 0]);
// a closed outline pushed along its normal by a wave: the shape breathes (a smooth sine of the phase, never noise)
function pstWavy(P, amp, freq, phase) {
  const n = P.length;
  return P.map((p, i) => {
    const a = P[(i - 1 + n) % n], b = P[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
    const o = Math.sin((i / n) * TAU * freq + phase) * amp;
    return [p[0] + (dy / d) * o, p[1] - (dx / d) * o];
  });
}
// a polyline moved sideways by d (positive = to the right of travel): stripes, bands, hills
function pstOffset(P, d, closed = false) {
  const n = P.length;
  return P.map((p, i) => {
    const a = P[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = P[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    return [p[0] - (dy / l) * d, p[1] + (dx / l) * d];
  });
}
// a puffy rounded blob (clouds, egg whites): an ellipse whose rim swells in n lobes
function pstPuff(x, y, rx, ry, n = 7, k = 0.16, m = 120, ph = 0) {
  const P = [];
  for (let i = 0; i < m; i++) { const a = i / m * TAU, s = 1 + k * Math.abs(Math.sin(a * n / 2 + ph)) - k * 0.5; P.push([x + Math.cos(a) * rx * s, y + Math.sin(a) * ry * s]); }
  return P;
}

// ---------------------------------------------------------------------
//  PRINTING. Every primitive prints one ink (by name, so it lands on that ink's screen and its registration).
//  Order is the print order: what prints later covers what printed before (opaque inks), unless o.over (a
//  transparent overprint: the two inks multiply into a third, as in a gingham or a shadow band).
// ---------------------------------------------------------------------
function pstFill(P, ink, o = {}) {
  const [c, dx, dy] = pstInk(ink);
  ctx.save(); if (o.over) ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = c; pstPath(P, dx, dy); ctx.fill(o.rule ?? 'nonzero');
  if (o.edge !== false && !o.over) { ctx.strokeStyle = pstEdgeC(c); ctx.lineWidth = (o.ew ?? 2.4) * UNIT; ctx.globalAlpha = 0.55; ctx.lineJoin = 'round'; ctx.stroke(); }
  ctx.restore();
}
// rings: [[ink, width], ...] from the shape outward, drawn as stacked strokes outside in ('paper' = a knocked-out gap).
// The key line (brown, o.kw) sits on the outline itself and prints on the key screen, so the fill shows off register.
function pstRings(trace, rings, start, o = {}) {
  let ext = start; const ex = rings.map(([, w]) => (ext += w * UNIT));
  const n = o.grow == null ? rings.length : Math.min(rings.length, Math.floor(o.grow * rings.length + 1e-6));
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = o.cap ?? 'round';
  for (let k = n - 1; k >= 0; k--) { const [c, dx, dy] = pstInk(rings[k][0]); ctx.strokeStyle = c; ctx.lineWidth = 2 * ex[k]; trace(dx, dy); ctx.stroke(); }
  ctx.restore();
  return ext;
}
function pstShape(P, ink, o = {}) {
  const kw = o.key === false ? 0 : (o.kw ?? 5) * UNIT;
  if (o.rings && o.rings.length) pstRings((dx, dy) => pstPath(P, dx, dy), o.rings, kw / 2, o);
  pstFill(P, ink, o);
  if (o.inner) { ctx.save(); pstPath(P); ctx.clip(); o.inner(); ctx.restore(); }
  if (kw) { ctx.save(); ctx.strokeStyle = PST.brown; ctx.lineWidth = kw; ctx.lineJoin = 'round'; pstPath(P); ctx.stroke(); ctx.restore(); }
}
// a thick printed stroke (arms, mouths, steam, birds): round caps, one ink. o.frac writes it on.
function pstLine(P, ink, w, o = {}) {
  let Q = P; if (o.frac != null) { if (o.frac <= 0) return; if (o.frac < 1) Q = subPath(P, o.frac); }
  const [c, dx, dy] = pstInk(ink);
  ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = w * UNIT; ctx.lineCap = o.cap ?? 'round'; ctx.lineJoin = 'round';
  pstPath(Q, dx, dy, true, false); ctx.stroke(); ctx.restore();
}
// rainbow stripes side by side along a path (a swoosh, a hill line, a band across the sheet): inks left to right of
// travel, each w wide, gap between them (paper). o.frac (0..1) writes them on, o.stagger delays each stripe.
function pstStripes(P, inks, w, o = {}) {
  const gap = o.gap ?? 0, n = inks.length, step = w + gap;
  for (let k = 0; k < n; k++) {
    const f = o.frac == null ? 1 : clamp(o.frac * (1 + (o.stagger ?? 0) * (n - 1)) - (o.stagger ?? 0) * k);
    if (f <= 0) continue;
    pstLine(pstOffset(P, ((k - (n - 1) / 2) * step + (o.shift ?? 0)) * UNIT, o.closed), inks[k], w, { cap: o.cap ?? 'butt', frac: f });
  }
}
// rainbow arcs about (cx, cy): inks from the inside out, from angle a0 to a1 (clockwise, canvas angles).
// o.sweep (0..1) slides them in, the inner band first (o.stagger); o.cap 'round' rounds the ends.
function pstRainbow(cx, cy, r, inks, w, a0, a1, o = {}) {
  const gap = (o.gap ?? 0) * UNIT, ww = w * UNIT, n = inks.length, st = o.stagger ?? 0.15;
  for (let k = 0; k < n; k++) {
    const f = o.sweep == null ? 1 : EZ.o3(clamp(o.sweep * (1 + st * (n - 1)) - st * k));
    if (f <= 0) continue;
    const [c, dx, dy] = pstInk(inks[k]), rk = r + ww / 2 + k * (ww + gap);
    ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = ww; ctx.lineCap = o.cap ?? 'butt';
    ctx.beginPath(); if (o.dir === -1) ctx.arc(cx + dx, cy + dy, rk, a1 - (a1 - a0) * f, a1); else ctx.arc(cx + dx, cy + dy, rk, a0, a0 + (a1 - a0) * f);
    ctx.stroke(); ctx.restore();
  }
}
// a sunburst from (cx, cy): n rays of inks[0] over a disc of inks[1] (o.base === false: rays only), turned by rot.
// o.r0 leaves a hole at the centre, o.r1 the reach (default: past any frame), o.duty the ray's share of its slice,
// o.swirl bends the rays into a pinwheel (radians gained from centre to reach).
function pstSunburst(cx, cy, n, rot, inks, o = {}) {
  const R = o.r1 ?? 3400 * UNIT, r0 = o.r0 ?? 0, sw = o.swirl ?? 0, duty = o.duty ?? 0.5, m = sw ? 14 : 1;
  if (o.base !== false && inks[1]) { const [c, dx, dy] = pstInk(inks[1]); ctx.save(); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(cx + dx, cy + dy, R, 0, TAU); if (r0 > 0) ctx.arc(cx + dx, cy + dy, r0, 0, TAU, true); ctx.fill('evenodd'); ctx.restore(); }
  const [c, dx, dy] = pstInk(inks[0]);
  ctx.save(); ctx.fillStyle = c; ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a0 = rot + (i / n) * TAU, a1 = a0 + duty * TAU / n;
    for (let j = 0; j <= m; j++) { const r = lerp(r0, R, j / m), a = a0 + sw * (r / R); (j ? ctx.lineTo : ctx.moveTo).call(ctx, cx + dx + Math.cos(a) * r, cy + dy + Math.sin(a) * r); }
    for (let j = m; j >= 0; j--) { const r = lerp(r0, R, j / m), a = a1 + sw * (r / R); ctx.lineTo(cx + dx + Math.cos(a) * r, cy + dy + Math.sin(a) * r); }
    ctx.closePath();
  }
  ctx.fill(); ctx.restore();
}
// halftone: a dot screen of one ink clipped to P (or o.box = bbox), dot area = tone(x, y) in 0..1. The only way this
// style fades anything: a sky into the stock, a shadow under a hill. o.pitch (px at 1080), o.angle (45 deg default).
function pstHalftone(P, ink, tone, o = {}) {
  const pitch = (o.pitch ?? 14) * UNIT, a = o.angle ?? Math.PI / 4, ca = Math.cos(a), sa = Math.sin(a);
  const bb = P ? bbox(P) : o.box, [c, dx, dy] = pstInk(ink);
  const cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2, rad = Math.hypot(bb.x1 - bb.x0, bb.y1 - bb.y0) / 2 + pitch;
  ctx.save(); if (P) { pstPath(P); ctx.clip(); }
  if (o.over) ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = c; ctx.beginPath();
  for (let v = -rad; v <= rad; v += pitch) for (let u = -rad; u <= rad; u += pitch) {
    const x = cx + u * ca - v * sa, y = cy + u * sa + v * ca;
    if (x < bb.x0 - pitch || x > bb.x1 + pitch || y < bb.y0 - pitch || y > bb.y1 + pitch) continue;
    const t = tone(x, y); if (t <= 0.02) continue;
    const r = pitch * Math.sqrt(Math.min(1.3, t) / Math.PI);
    ctx.moveTo(x + dx + r, y + dy); ctx.arc(x + dx, y + dy, r, 0, TAU);
  }
  ctx.fill(); ctx.restore();
}

// ---------------------------------------------------------------------
//  TYPE: heavy display lettering with echo outlines. One call prints, from the outside in: each ring (an ink and a
//  width, 'paper' for a knocked-out gap), then the letters fattened by a round-joined stroke (o.fat, a share of the
//  size) so any heavy face reads soft and round, then an optional split fill (o.split = [ink, share]: the lower
//  part of every letter in a second ink, the 70s two-tone). o.grow (0..1) shows the rings from the inside out
//  (the echoes ripple out after a stamp); o.s scales about (x, y); o.runs places glyphs one by one (arched type).
//  Sizes are px; rings' widths are px at 1080 (times UNIT). Returns the set width.
// ---------------------------------------------------------------------
function pstFont(size, o = {}) { return `${o.italic ? 'italic ' : ''}${o.weight ?? 900} ${size}px ${o.font ?? PSTF}`; }
function pstTextW(str, size, o = {}) { ctx.save(); ctx.font = pstFont(size, o); const w = ctx.measureText(str).width; ctx.restore(); return w; }
// the largest size (<= size) at which str fits in width w
function pstFit(str, size, w, o = {}) { const tw = pstTextW(str, size, o); return tw > w ? size * w / tw : size; }
function pstType(str, x, y, size, o = {}) {
  const s = o.s ?? 1; if (s <= 0.01) return 0;
  const rings = o.rings ?? [['brown', size * 0.045 / UNIT]], fat = (o.fat ?? 0.03) * size;
  ctx.save(); ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot); if (s !== 1 || o.sx) ctx.scale(s * (o.sx ?? 1), s * (o.sy ?? 1));
  ctx.font = pstFont(size, o); ctx.textAlign = o.align ?? 'center'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round'; ctx.miterLimit = 2;
  const runs = o.runs ?? [[str, 0, 0, 0]], pv = o.pivot ?? 0;   // pivot: px above the baseline that a run scales about
  // a run is [text, x, y, rotation, scale]: a glyph or word placed on its own (arched type, digits stamped one by one)
  const each = (fn, dx, dy) => {
    for (const [t, rx, ry, rr, rs] of runs) {
      if (rs != null && rs <= 0.01) continue;
      if (!rr && (rs == null || rs === 1)) fn(t, rx + dx, ry + dy);
      else { ctx.save(); ctx.translate(rx + dx, ry + dy - pv); if (rr) ctx.rotate(rr); if (rs != null) ctx.scale(rs, rs); fn(t, 0, pv); ctx.restore(); }
    }
  };
  let ext = fat; const ex = rings.map(([, w]) => (ext += w * UNIT));
  const n = o.grow == null ? rings.length : Math.min(rings.length, Math.floor(o.grow * rings.length + 1e-6));
  for (let k = n - 1; k >= 0; k--) { const [c, dx, dy] = pstInk(rings[k][0]); ctx.strokeStyle = c; ctx.lineWidth = 2 * ex[k]; each((t, a, b) => ctx.strokeText(t, a, b), dx, dy); }
  const [c, dx, dy] = pstInk(o.fill ?? 'cream');
  ctx.fillStyle = c; ctx.strokeStyle = c; ctx.lineWidth = 2 * fat;
  each((t, a, b) => { if (fat > 0) ctx.strokeText(t, a, b); ctx.fillText(t, a, b); }, dx, dy);
  if (o.split) {   // the lower part of each letter in a second ink (clipped per glyph run, in the run's own frame)
    const [c2, dx2, dy2] = pstInk(o.split[0]), cut = -size * (o.split[1] ?? 0.36);
    ctx.fillStyle = c2; ctx.strokeStyle = c2;
    for (const [t, rx, ry, rr, rs] of runs) {
      if (rs != null && rs <= 0.01) continue;
      ctx.save(); ctx.translate(rx + dx2, ry + dy2 - pv); if (rr) ctx.rotate(rr); if (rs != null) ctx.scale(rs, rs); ctx.translate(0, pv);
      ctx.beginPath(); ctx.rect(-4000, cut, 8000, size); ctx.clip();
      if (fat > 0) ctx.strokeText(t, 0, 0); ctx.fillText(t, 0, 0); ctx.restore();
    }
  }
  const w = ctx.measureText(str).width;
  ctx.restore();
  return w;
}
// arched type: str set along the top of a circle (cx, cy, r), reading left to right, letters standing on the arc.
// o.track adds space between letters (a share of the size). Same rings as pstType; o.s scales about the circle's top.
function pstArcType(str, cx, cy, r, size, o = {}) {
  ctx.save(); ctx.font = pstFont(size, o);
  const tr = (o.track ?? 0.04) * size, ws = [...str].map((ch) => ctx.measureText(ch).width + tr);
  ctx.restore();
  const L = ws.reduce((a, b) => a + b, 0) - tr, runs = []; let acc = 0;
  const a0 = -Math.PI / 2 - L / (2 * r) + (o.turn ?? 0);
  [...str].forEach((ch, i) => {
    const a = a0 + (acc + (ws[i] - tr) / 2) / r; acc += ws[i];
    if (ch !== ' ') runs.push([ch, Math.cos(a) * r, r + Math.sin(a) * r, a + Math.PI / 2]);   // relative to the arc's top
  });
  return pstType(str, cx, cy - r, size, { ...o, runs, align: 'center' });   // scaled (o.s) about the arc's top
}
// a stamp landing at t0, on 2s: in big and light, slammed a size under, then settled; the echoes ripple out after
function pstStamp(t0, o = {}) {
  if (TT < t0 - 1e-6) return { s: 0, grow: 0, hit: 0 };
  const u = TT - t0, big = o.big ?? 1.32;
  const s = u < 0.06 ? big : u < 0.14 ? 0.95 : u < 0.22 ? 1.015 : 1;
  return { s, grow: clamp((u - 0.06) / (o.ripple ?? 0.3)), hit: u >= 0.06 && u < 0.3 ? 1 - (u - 0.06) / 0.24 : 0 };
}
// impact ticks around a landing stamp (o.hit 1 -> 0): short brown dashes radiating from the box
function pstHitTicks(x, y, rx, ry, hit, o = {}) {
  if (hit <= 0) return;
  const R = RNG('pst-hit', o.key ?? 'h'), n = o.n ?? 10, k = 1 + (1 - hit) * 0.25;
  ctx.save(); ctx.strokeStyle = PST[o.ink ?? 'brown']; ctx.lineWidth = (o.w ?? 7) * UNIT; ctx.lineCap = 'round'; ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + R.n(0.12), c = Math.cos(a), s = Math.sin(a), L = (o.len ?? 34) * UNIT * hit;
    const x0 = x + c * rx * k, y0 = y + s * ry * k; ctx.moveTo(x0, y0); ctx.lineTo(x0 + c * L, y0 + s * L);
  }
  ctx.stroke(); ctx.restore();
}

// ---------------------------------------------------------------------
//  THE HERO: a round sun with a 70s face. A gold disc (the reserved ink) inside a knocked-out ring and an orange
//  band, a crown of rays (long and short, turning slowly), brown eyes, brick cheeks printed off register, a grin.
//  r is the disc's radius; the rays reach ~1.6 r. o.mood: 'smile' | 'happy' (eyes shut in a grin) | 'sleepy'
//  (heavy lids; o.lid 0..1 opens them, o.yawn 0..1 opens the mouth) | 'wow'. o.look = [x, y] moves the pupils,
//  o.rays = 0 drops the crown (a yolk, a coin, a face in a window), o.spin turns it. Sets SPARK_AT.
// ---------------------------------------------------------------------
function pstSunRays(x, y, r, n, spin, o = {}) {
  const P = [], m = n * 2;
  for (let i = 0; i < m; i++) {
    const a = spin + (i / m) * TAU, long = i % 2 === 0, tip = r * (long ? (o.long ?? 1.62) : (o.short ?? 1.36)), hw = (TAU / m) * 0.42;
    P.push([x + Math.cos(a - hw) * r * 1.02, y + Math.sin(a - hw) * r * 1.02]);
    for (let j = -2; j <= 2; j++) { const aa = a + j * hw * 0.16, rr = tip - Math.abs(j) * r * 0.035; P.push([x + Math.cos(aa) * rr, y + Math.sin(aa) * rr]); }   // a rounded tip
    P.push([x + Math.cos(a + hw) * r * 1.02, y + Math.sin(a + hw) * r * 1.02]);
  }
  pstShape(P, o.ink ?? 'orange', { kw: o.kw ?? Math.max(3, r * 0.035), edge: true });
}
function pstEye(x, y, rx, ry, o = {}) {
  const lid = clamp(o.lid ?? 1), [lx, ly] = o.look ?? [0, 0];
  if (lid < 0.14) {   // shut: a soft curve sagging down, three lashes
    const w = Math.max(4, rx * 0.5) / UNIT, cy = y - ry * 0.45;
    pstLine(arcPts(x, cy, rx * 1.2, Math.PI * 0.1, Math.PI * 0.9, 10), 'brown', w);
    if (o.lashes !== false) for (const a of [0.3, 0.5, 0.7]) { const c = Math.cos(a * Math.PI), s = Math.sin(a * Math.PI); pstLine([[x + c * rx * 1.2, cy + s * rx * 1.2], [x + c * rx * 1.75, cy + s * rx * 1.75]], 'brown', w * 0.6); }
    return;
  }
  const h = ry * lid, cy = y + ry - h;   // the lid comes down from the top; the lower rim stays
  ctx.save(); ctx.fillStyle = PST.brown; ctx.beginPath(); ctx.ellipse(x + lx * rx * 0.25, cy + ly * h * 0.2, rx, h, 0, 0, TAU); ctx.fill();
  if (lid > 0.55) { const [c, dx, dy] = pstInk('cream'); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + lx * rx * 0.25 - rx * 0.32 + dx * 0.3, cy - h * 0.38 + dy * 0.3, rx * 0.3, 0, TAU); ctx.fill(); }
  ctx.restore();
  if (lid < 0.92) pstLine([[x - rx * 1.3, cy - h * 0.7], [x, cy - h * 1.0], [x + rx * 1.3, cy - h * 0.7]], 'brown', Math.max(4, rx * 0.42) / UNIT);   // the heavy lid
}
function pstSun(x, y, r, o = {}) {
  const key = o.key ?? 'sun', mood = o.mood ?? 'smile', nr = o.rays ?? 12;
  y += Math.sin(TT * TAU * 0.5 + key.length) * r * 0.025;   // a slow idle bob
  SPARK_AT = toScreen(x, y);
  if (nr) pstSunRays(x, y, r * 1.12, nr, o.spin ?? TT * 0.3 + key.length, { ink: o.rayInk });
  const kw = Math.max(3, r * 0.035) / UNIT;
  pstShape(ellipsePts(x, y, r, r, 0, 90), o.ink ?? 'sun', { kw, rings: o.band === false ? [] : [['paper', r * 0.05 / UNIT], [o.bandInk ?? 'orange', r * 0.075 / UNIT]] });
  // the face
  const blink = !o.noBlink && (B + key.length * 5) % 37 < 1, ex = r * 0.34, ey = y - r * 0.06, erx = r * 0.11, ery = r * 0.15;
  for (const s of [-1, 1]) {   // brick cheeks, off register
    const [c, dx, dy] = pstInk('brick'); ctx.save(); ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x + s * r * 0.56 + dx, y + r * 0.2 + dy, r * 0.14, r * 0.095, 0, 0, TAU); ctx.fill(); ctx.restore();
  }
  const lid = mood === 'sleepy' ? (o.lid ?? 0.35) : mood === 'happy' || blink ? 0 : 1;
  for (const s of [-1, 1]) {
    const lidS = o.lids ? o.lids[s < 0 ? 0 : 1] : lid;   // o.lids = [left, right]: one eye can peek
    if (mood === 'happy' && !blink) pstLine(arcPts(x + s * ex, ey + ery * 0.4, erx * 1.2, Math.PI * 1.1, Math.PI * 1.9, 10), 'brown', Math.max(4, erx * 0.55) / UNIT);
    else pstEye(x + s * ex, ey, erx * (mood === 'wow' ? 1.2 : 1), ery * (mood === 'wow' ? 1.25 : 1), { lid: lidS, look: o.look });
  }
  const my = y + r * 0.26;
  if (mood === 'wow' || (mood === 'sleepy' && (o.yawn ?? 0) > 0.05)) {   // an O (a yawn opens it slowly)
    const k = mood === 'wow' ? 0.7 : o.yawn;
    ctx.save(); ctx.fillStyle = PST.brown; ctx.beginPath(); ctx.ellipse(x, my + r * 0.04, r * (0.1 + 0.05 * k), r * (0.06 + 0.13 * k), 0, 0, TAU); ctx.fill();
    const [c, dx, dy] = pstInk('brick'); ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x + dx * 0.4, my + r * (0.07 + 0.08 * k) + dy * 0.4, r * (0.06 + 0.03 * k), r * (0.03 + 0.05 * k), 0, 0, TAU); ctx.fill(); ctx.restore();
  } else if (mood === 'sleepy') {
    pstLine(arcPts(x, my - r * 0.1, r * 0.17, Math.PI * 0.2, Math.PI * 0.8, 8), 'brown', Math.max(4, r * 0.05) / UNIT);
  } else {   // the grin: a half moon with a brick tongue
    const mw = r * 0.3, P = [...arcPts(x, my - r * 0.04, mw, 0, Math.PI, 16)];
    pstFill(P, 'brown', { edge: false });
    ctx.save(); pstPath(P); ctx.clip(); const [c, dx, dy] = pstInk('brick'); ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x + dx, my + mw * 0.78 + dy, mw * 0.55, mw * 0.4, 0, 0, TAU); ctx.fill(); ctx.restore();
  }
}

// ---------------------------------------------------------------------
//  BACKGROUND LIFE: printed props that move on 2s
// ---------------------------------------------------------------------
// a gull of two arcs, flapping each pull
function pstBird(x, y, s, o = {}) {
  const up = ((B + (o.phase ?? 0)) % 4) < 2, k = up ? 0.55 : -0.05;
  pstLine([[x - s, y - s * k], [x - s * 0.5, y - s * (k + 0.38)], [x, y]], o.ink ?? 'brown', Math.max(4, s * 0.16) / UNIT);
  pstLine([[x, y], [x + s * 0.5, y - s * (k + 0.38)], [x + s, y - s * k]], o.ink ?? 'brown', Math.max(4, s * 0.16) / UNIT);
}
// a puffy cloud with a knocked-out ring and a band (echoes), drifting with the caller's x
function pstCloud(x, y, s, o = {}) {
  // the outline of a row of puffs on a flat base: per angle, the farthest point of the union (a cloud is star-shaped)
  const C = [[-0.95, 0.1, 0.5], [-0.35, -0.25, 0.68], [0.35, -0.12, 0.6], [0.95, 0.12, 0.45]], P = [], m = 120;
  for (let i = 0; i < m; i++) {
    const a = (i / m) * TAU, ca = Math.cos(a), sa = Math.sin(a); let best = 0;
    for (const [cx, cy, r] of C) { const b = cx * ca + cy * sa, c = cx * cx + cy * cy - r * r, d = b * b - c; if (d >= 0) best = Math.max(best, b + Math.sqrt(d)); }
    if (sa > 0) best = Math.min(best, 0.42 / sa);   // the flat base
    P.push([x + ca * best * s, y + sa * best * s]);
  }
  pstShape(P, o.ink ?? 'cream', { kw: Math.max(3, s * 0.05) / UNIT, rings: o.rings ?? [['paper', s * 0.07 / UNIT], [o.band ?? 'orange', s * 0.08 / UNIT]] });
}
// a four-point twinkle that pulses on 2s
function pstTwinkle(x, y, s, ink = 'cream', ph = 0) {
  const k = 0.65 + 0.35 * (((B + ph) % 3) / 2), [c, dx, dy] = pstInk(ink);
  star4(x + dx, y + dy, s * k, c);
}
// a 70s daisy: rounded petals with a key line, a button centre; sways about its stem
function pstDaisy(x, y, r, o = {}) {
  const sway = Math.sin(TT * TAU * 0.4 + (o.ph ?? 0)) * 0.08, n = o.petals ?? 8;
  if (o.stem !== false) pstLine([[x, y], [x + Math.sin(sway) * r * 1.4, y + r * 0.7], [x, y + r * (o.stem ?? 2.4)]], 'olive', Math.max(5, r * 0.16) / UNIT);
  ctx.save(); ctx.translate(x, y); ctx.rotate(sway + (o.rot ?? 0));
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU; pstShape(ellipsePts(Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62, r * 0.42, r * 0.22, a, 24), o.petal ?? 'cream', { kw: Math.max(3, r * 0.06) / UNIT, edge: false }); }
  pstShape(ellipsePts(0, 0, r * 0.34, r * 0.34, 0, 30), o.centre ?? 'orange', { kw: Math.max(3, r * 0.06) / UNIT });
  ctx.restore();
}

// ---------------------------------------------------------------------
//  CAPTIONS AND TAGS (through DEFER: drawn after the camera, at screen size). A caption is a printed ticket: a cream
//  pill with a key line and an orange echo band, brown display type. The tag is a brick ticket with cream type.
//  Both hide while a morph bridge is closing or opening the era. Places come from the head's SAFE; on 9:16 the
//  caption stays inside the platform-safe union (x 120-780 below y 840).
// ---------------------------------------------------------------------
function pstBridgeK() {
  if (typeof BRIDGES === 'undefined') return 1;
  let k = 1; for (const b of BRIDGES) { const d = b.d ?? 0.6; k = Math.min(k, clamp((Math.abs(TT - b.tc) - d * 0.75) / (d * 0.25))); }
  return k;
}
function pstTicket(str, x, y, size, o = {}) {
  const s = (o.s ?? 1) * pstBridgeK(); if (s <= 0.01) return;
  const fit = o.maxW ? pstFit(str, size, o.maxW - size * 1.1) : size, w = pstTextW(str, fit) + fit * 1.1, h = fit * 1.5;
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? -0.02); ctx.scale(s, s);
  pstShape(rrectPts(-w / 2, -h / 2, w, h, h / 2, 8), o.bg ?? 'cream', { kw: 5, rings: [['paper', 7], [o.band ?? 'orange', 11]] });
  pstType(str, 0, fit * 0.34, fit, { fill: o.fg ?? 'brown', rings: [], fat: 0.012 });
  ctx.restore();
}
const pstSafeL = () => (typeof SAFE !== 'undefined' && SAFE.left != null ? SAFE.left : PORTRAIT ? 120 : 60 * UNIT);
function pstCaption(str, o = {}) {
  const f = () => {
    const size = (o.size ?? 54) * UNIT, maxW = PORTRAIT ? 640 : W - pstSafeL() - SAFE.right - 40 * UNIT;
    const x = o.x ?? (PORTRAIT ? 450 : CX), y = o.y ?? (PORTRAIT ? 1160 : H - SAFE.bottom - size * 0.95);
    pstTicket(str, x, y, size, { s: popS(o.t ?? E0 + 0.35), maxW, rot: o.rot ?? 0.012 });
  };
  if (DEFER) DEFER.push(f); else f();
}
function pstTag(str, o = {}) {
  const f = () => {
    const size = (o.size ?? 50) * UNIT, w = pstTextW(str, size) + size * 1.1;
    const x = o.x ?? pstSafeL() + 16 * UNIT + w / 2, y = o.y ?? SAFE.top + size * 1.05;
    pstTicket(str, x, y, size, { s: popS(o.t ?? E0 + 0.15), bg: 'brick', fg: 'cream', band: 'mustard', rot: -0.04 });
  };
  if (DEFER) DEFER.push(f); else f();
}

// ---------------------------------------------------------------------
//  BRIDGE PARTS: the window is a round opening framed in rainbow bands; the blob is a sunburst disc
// ---------------------------------------------------------------------
const PST_WIN = [['brown', 6], ['paper', 8], ['orange', 16], ['paper', 6], ['mustard', 16], ['paper', 6], ['brick', 12]];
function pstSunDisc(P, c, u, o = {}) {
  const ce = pstCentre(P), R = Math.max(...P.map((p) => Math.hypot(p[0] - ce[0], p[1] - ce[1])));
  pstShape(P, c, {
    kw: 6, rings: [['paper', 8], ['orange', 14], ['paper', 6], ['brick', 10]],
    inner: () => pstSunburst(ce[0], ce[1], 16, (u ?? 0) * 1.4 + TT * 0.3, [pstMix(c, PST.cream, 0.4)], { base: false, r0: R * 0.28, r1: R * 1.2 }),
  });
  pstShape(ellipsePts(ce[0], ce[1], R * 0.3, R * 0.3, 0, 40), c, { kw: 5 });
}

// =====================================================================
//  STYLE: the renderer's hooks (see styles/README.md for the contract)
// =====================================================================
const STYLE = {
  name: 'poster',
  paper: PST.paper,
  backdrop(c) { pstPaper(c); },
  // the old / new world seen through an opening framed in rainbow bands (outermost first), with the key line on top
  window(P, key, src) {
    pstRings((dx, dy) => pstPath(P, dx, dy), PST_WIN, 0);
    ctx.save(); pstPath(P); ctx.clip(); ctx.drawImage(src, 0, 0); ctx.restore();
    ctx.save(); ctx.strokeStyle = PST.brown; ctx.lineWidth = 6 * UNIT; ctx.lineJoin = 'round'; pstPath(P); ctx.stroke(); ctx.restore();
  },
  // the morphing shape: a sunburst disc in the bridge colour, turning as it changes
  blob(P, c, key, u) { pstSunDisc(P, c, u); },
  hero(x, y, r, o = {}) { pstSun(x, y, r * 0.62, { mood: o.mood ?? 'wow', key: o.key ?? 'morphsun' }); },
  heroColor: PST.sun,
  heroPts: (x, y, r, n = 96) => ellipsePts(x, y, r * 0.62, r * 0.62, 0, n),
  post() { pstPrint(); },
  ones: false,
};
