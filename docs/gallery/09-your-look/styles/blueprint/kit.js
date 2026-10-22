// =====================================================================
//  styles/blueprint/kit.js — an architect's blueprint. A deep blueprint-blue sheet with a faint fine grid
//  and a stronger grid every 5 cells; everything drawn as white / pale-cyan technical line work at constant
//  weights (thick object lines; thin dimension, extension, centre and hidden lines); crossed corners;
//  dimension lines with filled arrowheads and figures; condensed technical lettering in capitals; a sheet
//  border and a title block in the bottom-right corner. One reserved brass colour for the hero (a drafting
//  compass with two dot eyes) and for what it draws. Motion on 1s: lines plot on along their length, the
//  hero settles on springs, then everything holds. The print pass (post) adds a soft vignette and mottle.
//  Built on kit/core.js (RNG, EZ, subPath, dist, ellipsePts, rrectPts, arcPts, TT / ev / DEFER / E0 / SPARK_AT).
//  Needs from the piece head: W, H, CX.
// =====================================================================

// ---- palette: ground, line roles, the hero's brass
const BP = {
  ground: '#123a7a',                         // the sheet (also STYLE.paper)
  line: '#eef6ff',                           // object lines, lettering
  thin: '#a9d3ff',                           // dimension, extension, centre and hidden lines
  gridFine: 'rgba(168,210,255,0.085)',       // every cell
  gridMajor: 'rgba(168,210,255,0.20)',       // every 5th cell
  accent: '#ffc857',                         // the hero and its marks only
};
const BPW = { thick: 3.6, med: 2.6, thin: 1.7 };   // px at 1080 wide, constant at any camera zoom
const BP_CELL = 24, BP_MAJOR = 5;                  // grid: 24px cells, a strong line every 5 (120px)
const BP_DASH = { hidden: [12, 7], center: [30, 7, 5, 7], phantom: [30, 6, 5, 6, 5, 6] };
const BP_FONT = '"Bahnschrift SemiCondensed", "Bahnschrift", "Avenir Next Condensed", "DejaVu Sans Condensed", "Roboto Condensed", "Arial Narrow", Arial, sans-serif';   // Windows, macOS, Linux
const BP_SLANT = 8 * DEG;                          // technical lettering leans a little

// a closed-form damped spring 0 -> 1 from t0 (k stiffness, damp 0.3 bouncy .. 0.9 calm); no state, any frame alone
function bpSpring(t, t0, o = {}) {
  if (t <= t0) return 0;
  const w0 = Math.sqrt(o.k ?? 170), z = Math.min(0.98, o.damp ?? 0.5), wd = w0 * Math.sqrt(1 - z * z), s = t - t0;
  return 1 - Math.exp(-z * w0 * s) * (Math.cos(wd * s) + (z * w0 / wd) * Math.sin(wd * s));
}
const bpPlot = (t0, d = 0.5) => EZ.io(ev(t0, d));   // 0..1 plot-on progress of a line starting at t0

// ---------------------------------------------------------------------
//  pens and lines (widths are screen px whatever the zoom)
// ---------------------------------------------------------------------
function bpZoom() { const m = ctx.getTransform(); return Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1; }
function bpPen(color = BP.line, w = BPW.thick, dash = null) {
  const z = bpZoom();
  ctx.strokeStyle = color; ctx.lineWidth = w / z; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.setLineDash(dash ? dash.map((d) => d / z) : []);
}
function bpPoly(P, closed) {
  ctx.beginPath(); if (!P.length) return;
  ctx.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) ctx.lineTo(P[i][0], P[i][1]);
  if (closed) ctx.closePath();
}
// extend an open polyline's two ends by d px (the draughtsman's crossed corners)
function bpExtend(P, d) {
  const n = P.length; if (n < 2 || !d) return P;
  const ex = (p, q) => { const L = dist(p, q) || 1; return [p[0] + (p[0] - q[0]) / L * d, p[1] + (p[1] - q[1]) / L * d]; };
  return [ex(P[0], P[1]), ...P.slice(1, n - 1), ex(P[n - 1], P[n - 2])];
}
// a line in the medium. o: { closed, color, w, dash ('hidden' | 'center' | 'phantom' | [..]), frac (plot-on 0..1),
//   over (crossed-corner overshoot in px, open lines), alpha }
function bpLine(P, o = {}) {
  const frac = o.frac ?? 1; if (frac <= 0 || P.length < 2) return;
  let Q = o.over && !o.closed ? bpExtend(P, o.over) : P, closed = !!o.closed;
  if (frac < 1) { Q = subPath(closed ? [...Q, Q[0]] : Q, frac); closed = false; }
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
  bpPen(o.color ?? BP.line, o.w ?? BPW.thick, typeof o.dash === 'string' ? BP_DASH[o.dash] : o.dash);
  bpPoly(Q, closed); ctx.stroke(); ctx.restore();
}
// a rectangle with crossed corners: four edges plotted at once, each overshooting its corners
function bpBox(x, y, w, h, o = {}) {
  const c = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  for (let i = 0; i < 4; i++) bpLine([c[i], c[(i + 1) % 4]], { over: 9, ...o });
}
// a filled arrowhead with its tip at tip, pointing along unit dir (constant size on screen)
function bpArrow(tip, dir, color = BP.thin, len = 20, hw = 5.5) {
  const z = bpZoom(); len /= z; hw /= z;
  const bx = tip[0] - dir[0] * len, by = tip[1] - dir[1] * len;
  ctx.save(); ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(tip[0], tip[1]);
  ctx.lineTo(bx - dir[1] * hw, by + dir[0] * hw); ctx.lineTo(bx + dir[1] * hw, by - dir[0] * hw); ctx.closePath();
  ctx.fillStyle = color; ctx.fill(); ctx.restore();
}

// ---------------------------------------------------------------------
//  the sheet: ground + grid. bpSheet() fills the frame; bpKnock(P) re-lays the sheet inside outline P,
//  so a nearer part hides the lines behind it while the grid still shows through (it is the paper).
// ---------------------------------------------------------------------
function bpGrid(alpha = 1) {
  const m = ctx.getTransform(), z = bpZoom();
  const x0 = -m.e / m.a, y0 = -m.f / m.d, x1 = (W - m.e) / m.a, y1 = (H - m.f) / m.d;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.setLineDash([]);
  for (const [step, col, w] of [[BP_CELL, BP.gridFine, 1.0], [BP_CELL * BP_MAJOR, BP.gridMajor, 1.3]]) {
    ctx.beginPath();
    for (let x = Math.floor(x0 / step) * step; x <= x1; x += step) { ctx.moveTo(x, y0); ctx.lineTo(x, y1); }
    for (let y = Math.floor(y0 / step) * step; y <= y1; y += step) { ctx.moveTo(x0, y); ctx.lineTo(x1, y); }
    ctx.strokeStyle = col; ctx.lineWidth = w / z; ctx.stroke();
  }
  ctx.restore();
}
function bpSheet(o = {}) { fillAll(o.c ?? BP.ground); bpGrid(o.grid ?? 1); }
function bpKnock(P, o = {}) {
  ctx.save(); bpPoly(P, true); ctx.clip(); bpSheet(o); ctx.restore();
}
// the sheet border (screen space, inset m), plotted from the corners
function bpBorder(m = 72, o = {}) {
  ctx.save(); screen();
  bpBox(m, m, W - 2 * m, H - 2 * m, { w: BPW.thick, frac: o.frac ?? 1, over: 0 });
  ctx.restore();
}

// ---------------------------------------------------------------------
//  lettering: condensed capitals, a little tracking and lean. fillText (so the text checks see it).
//  o: { align, color, weight, track (em), slant (rad), rot (rad), frac (letters written 0..1), caps }
// ---------------------------------------------------------------------
function bpTextW(str, size, o = {}) {
  ctx.save(); ctx.font = `${o.weight ?? 500} ${size}px ${BP_FONT}`;
  const tr = (o.track ?? 0.07) * size; if ('letterSpacing' in ctx) ctx.letterSpacing = `${tr}px`;
  const s = o.caps === false ? str : str.toUpperCase(), w = ctx.measureText(s).width - ('letterSpacing' in ctx ? tr : 0);
  ctx.restore(); return w;
}
function bpText(str, x, y, size, o = {}) {
  const s = o.caps === false ? str : str.toUpperCase(), w = bpTextW(str, size, o);
  const n = Math.round(clamp(o.frac ?? 1) * s.length); if (n <= 0) return w;
  ctx.save();
  ctx.font = `${o.weight ?? 500} ${size}px ${BP_FONT}`;
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${(o.track ?? 0.07) * size}px`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = o.color ?? BP.line; ctx.globalAlpha *= o.alpha ?? 1;
  ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot);
  ctx.transform(1, 0, -Math.tan(o.slant ?? BP_SLANT), 1, 0, 0);
  const x0 = o.align === 'center' ? -w / 2 : o.align === 'right' ? -w : 0;
  ctx.fillText(s.slice(0, n), x0, 0);
  ctx.restore(); return w;
}

// ---------------------------------------------------------------------
//  drafting marks
// ---------------------------------------------------------------------
// a linear dimension from a to b, its line set off by `off` px (sign = side), figure `label` above the line
// (o.textAt 0..1 moves the figure along the line, e.g. off a centre line).
// Plots on from o.t0: extension lines, then the dimension line grows out from its middle, arrowheads, the figure.
function bpDim(a, b, off, label, o = {}) {
  const t0 = o.t0 ?? 0, col = o.color ?? BP.thin, w = BPW.thin, size = o.size ?? 30;
  const L = dist(a, b) || 1, ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L, nx = -uy, ny = ux, sg = Math.sign(off) || 1;
  const A = [a[0] + nx * off, a[1] + ny * off], Bq = [b[0] + nx * off, b[1] + ny * off];
  const gap = o.gap ?? 10, over = o.over ?? 12, e = EZ.o2(ev(t0, 0.25));
  for (const [p, q] of [[a, A], [b, Bq]]) bpLine([[p[0] + nx * gap * sg, p[1] + ny * gap * sg], [q[0] + nx * over * sg, q[1] + ny * over * sg]], { color: col, w, frac: e });
  const g = EZ.io(ev(t0 + 0.15, 0.4)), M = [(A[0] + Bq[0]) / 2, (A[1] + Bq[1]) / 2];
  if (g > 0) bpLine([[lerp(M[0], A[0], g), lerp(M[1], A[1], g)], [lerp(M[0], Bq[0], g), lerp(M[1], Bq[1], g)]], { color: col, w });
  if (g >= 0.999) { bpArrow(A, [-ux, -uy], col); bpArrow(Bq, [ux, uy], col); }
  if (label && g >= 0.999) {
    let ang = Math.atan2(uy, ux); if (ang >= Math.PI / 2 - 1e-6) ang -= Math.PI; if (ang < -Math.PI / 2) ang += Math.PI;
    const up = [Math.sin(ang), -Math.cos(ang)], ta = o.textAt ?? 0.5, Tm = [lerp(A[0], Bq[0], ta), lerp(A[1], Bq[1], ta)];   // textAt: the figure's place along the line
    bpText(label, Tm[0] + up[0] * 10, Tm[1] + up[1] * 10, size, { align: 'center', rot: ang, color: o.textColor ?? BP.line, weight: 500, frac: ev(t0 + 0.55, 0.2) });
  }
}
// a centre line (long dash, short dash) through P, overshooting its ends a little
const bpCenter = (P, o = {}) => bpLine(P, { color: BP.thin, w: BPW.thin, dash: 'center', over: 0, ...o });
const bpHidden = (P, o = {}) => bpLine(P, { color: BP.thin, w: BPW.thin, dash: 'hidden', ...o });
// 45-degree section hatching inside outline P
function bpHatch(P, o = {}) {
  const b = bbox(P), gap = o.gap ?? 14, z = bpZoom();
  ctx.save(); bpPoly(P, true); ctx.clip(); ctx.setLineDash([]); ctx.beginPath();
  for (let d = b.x0 - (b.y1 - b.y0); d < b.x1; d += gap) { ctx.moveTo(d, b.y1); ctx.lineTo(d + (b.y1 - b.y0), b.y0); }
  ctx.strokeStyle = o.color ?? BP.thin; ctx.lineWidth = (o.w ?? BPW.thin) / z; ctx.globalAlpha *= o.alpha ?? 0.8; ctx.stroke();
  ctx.restore();
}
// the third-angle projection symbol (a cone's side view and end view), the title block's one drawn mark
function bpProjection(x, y, s, o = {}) {
  const f = o.frac ?? 1, col = o.color ?? BP.line;
  bpLine([[x, y - s * 0.24], [x + s * 0.8, y - s * 0.46], [x + s * 0.8, y + s * 0.46], [x, y + s * 0.24]], { closed: true, w: BPW.med, color: col, frac: f });
  const cx = x + s * 1.55;
  bpLine(ellipsePts(cx, y, s * 0.46, s * 0.46, -Math.PI / 2, 40), { closed: true, w: BPW.med, color: col, frac: f });
  bpLine(ellipsePts(cx, y, s * 0.24, s * 0.24, -Math.PI / 2, 28), { closed: true, w: BPW.med, color: col, frac: f });
  bpCenter([[x - s * 0.14, y], [cx + s * 0.62, y]], { frac: f });
  bpCenter([[cx, y - s * 0.62], [cx, y + s * 0.62]], { frac: f });
}

// ---------------------------------------------------------------------
//  sheet furniture: the tag (top-left) and the title block (bottom-right), at screen size through DEFER
// ---------------------------------------------------------------------
function bpTagNow(str, o = {}) {
  const t0 = E0 + (o.at ?? 0.1), size = o.size ?? 72, x = o.x ?? 108, y = o.y ?? 172;
  const w = bpText(str, x, y, size, { weight: 600, track: 0.06, frac: ev(t0, 0.5) });
  const u = EZ.io(ev(t0 + 0.25, 0.45));
  bpLine([[x - 6, y + 20], [x - 6 + (w + 14) * u, y + 20]], { w: BPW.thick, color: BP.line });
  bpLine([[x - 6, y + 30], [x - 6 + (w + 14) * u, y + 30]], { w: BPW.thin, color: BP.thin });
  return w;
}
const bpTag = (str, o) => { const f = () => { ctx.save(); screen(); bpTagNow(str, o); ctx.restore(); }; if (DEFER) DEFER.push(f); else f(); };
// title block: lines = [row 1, row 2] (row 1 is the title); o: { m (border inset), w, h, at, sizes: [s1, s2] }
function bpTitleBlockNow(lines, o = {}) {
  const m = o.m ?? 72, bw = o.w ?? 500, bh = o.h ?? 112, x1 = W - m, y1 = H - m, x0 = x1 - bw, y0 = y1 - bh;
  const t0 = E0 + (o.at ?? 1.3), sym = o.sym ?? 92, rows = lines.length, rh = bh / rows, sizes = o.sizes ?? [42, 34];
  const f = EZ.io(ev(t0, 0.4));
  bpLine([[x0, y1], [x0, y0 - 9]], { w: BPW.thick, frac: f });   // the block's own corner crosses; its ends stop on the border
  bpLine([[x0 - 9, y0], [x1, y0]], { w: BPW.thick, frac: f });
  bpLine([[x0 + sym, y0], [x0 + sym, y1]], { w: BPW.med, frac: EZ.io(ev(t0 + 0.15, 0.3)) });
  for (let i = 1; i < rows; i++) bpLine([[x0 + sym, y0 + rh * i], [x1, y0 + rh * i]], { w: BPW.thin, color: BP.thin, frac: EZ.io(ev(t0 + 0.2, 0.3)) });
  bpProjection(x0 + 14, y0 + bh / 2, (sym - 28) / 1.6 * 0.95, { frac: EZ.io(ev(t0 + 0.3, 0.4)) });
  lines.forEach((s, i) => {
    const sz = sizes[i] ?? sizes[sizes.length - 1];
    bpText(s, x0 + sym + 18, y0 + rh * i + rh / 2 + sz * 0.36, sz, { weight: i === 0 ? 600 : 500, track: 0.05, frac: ev(t0 + 0.35 + i * 0.15, 0.35) });
  });
}
const bpTitleBlock = (lines, o) => { const f = () => { ctx.save(); screen(); bpTitleBlockNow(lines, o); ctx.restore(); }; if (DEFER) DEFER.push(f); else f(); };
// a caption for other pieces: a sheet note centred at CX, lettered, with a short leader rule above
const bpCaption = (str, o = {}) => {
  const f = () => { ctx.save(); screen(); const y = o.y ?? H - 150, w = bpText(str, CX, y, o.size ?? 52, { align: 'center', frac: ev(E0 + (o.at ?? 0.4), 0.4) });
    bpLine([[CX - w / 2, y + 16], [CX - w / 2 + w * EZ.io(ev(E0 + (o.at ?? 0.4) + 0.2, 0.4)), y + 16]], { w: BPW.thin, color: BP.thin }); ctx.restore(); };
  if (DEFER) DEFER.push(f); else f();
};

// ---------------------------------------------------------------------
//  the hero: a bow compass drawn in brass line work, two dot eyes on its hinge disc. Needle tip N, pencil
//  tip Q; legs of length L meet at the hinge. o: { L, key, look: [dx, dy] gaze, frac (plot-on), blink }
//  Returns the geometry (apex, head centre, radius). Sets SPARK_AT to the head.
// ---------------------------------------------------------------------
function bpCompass(N, Q, o = {}) {
  const d = dist(N, Q) || 1, L = Math.max(o.L ?? d * 0.8, d / 2 + 1), key = o.key ?? 'hero', col = o.color ?? BP.accent;
  const u = [(Q[0] - N[0]) / d, (Q[1] - N[1]) / d], n = [u[1], -u[0]];   // n: the compass's "up"
  const M = [(N[0] + Q[0]) / 2, (N[1] + Q[1]) / 2], h = Math.sqrt(L * L - d * d / 4);
  const A = [M[0] + n[0] * h, M[1] + n[1] * h];
  const at = (P, s, side, wd) => {   // a point s along the leg from A to tip P, offset side * wd/2 across it
    const v = [(P[0] - A[0]) / L, (P[1] - A[1]) / L], p = [-v[1], v[0]];
    return [A[0] + v[0] * s + p[0] * side * wd / 2, A[1] + v[1] * s + p[1] * side * wd / 2];
  };
  const wd = (s) => lerp(0.085, 0.045, s / L) * L, fr = o.frac ?? 1, lw = o.w ?? 3.2;
  const rH = 0.17 * L, Hc = [A[0] + n[0] * rH * 0.3, A[1] + n[1] * rH * 0.3];
  // legs: a tapered body, then a needle (N) or a lead in its chuck (Q)
  const leg = (P, pencil) => {
    const s0 = 0.1 * L, s1 = pencil ? 0.78 * L : 0.84 * L;
    const body = [at(P, s0, -1, wd(s0)), at(P, s1, -1, wd(s1)), at(P, s1, 1, wd(s1)), at(P, s0, 1, wd(s0))];
    bpKnock(body); bpLine(body, { closed: true, color: col, w: lw, frac: fr });
    if (pencil) {
      const c0 = s1, c1 = 0.9 * L, cw = 0.07 * L;
      const chuck = [at(P, c0, -1, cw), at(P, c1, -1, cw), at(P, c1, 1, cw), at(P, c0, 1, cw)];
      bpKnock(chuck); bpLine(chuck, { closed: true, color: col, w: lw, frac: fr });
      bpLine([at(P, c1, -1, 0.032 * L), P, at(P, c1, 1, 0.032 * L)], { color: col, w: lw, frac: fr });
    } else {
      const c1 = 0.89 * L;
      bpLine([at(P, s1, -1, 0.05 * L), at(P, c1, -1, 0.05 * L), at(P, c1, 1, 0.05 * L), at(P, s1, 1, 0.05 * L)], { closed: true, color: col, w: lw, frac: fr });
      bpLine([at(P, c1, 0, 0), P], { color: col, w: BPW.thin + 0.6, frac: fr });
    }
  };
  // the bow: a threaded bar between the legs with a knurled wheel in the middle
  const sb = 0.46 * L, b1 = at(N, sb, 1, wd(sb)), b2 = at(Q, sb, -1, wd(sb));
  const bu = [(b2[0] - b1[0]) / (dist(b1, b2) || 1), (b2[1] - b1[1]) / (dist(b1, b2) || 1)], bn = [-bu[1], bu[0]];
  for (const k of [-1, 1]) bpLine([[b1[0] + bn[0] * k * 3, b1[1] + bn[1] * k * 3], [b2[0] + bn[0] * k * 3, b2[1] + bn[1] * k * 3]], { color: col, w: BPW.thin, frac: fr });
  leg(N, false); leg(Q, true);
  const Bm = [(b1[0] + b2[0]) / 2, (b1[1] + b2[1]) / 2], ww = 0.07 * L, wh = 0.2 * L;
  const wheel = [[Bm[0] - bu[0] * ww / 2 - bn[0] * wh / 2, Bm[1] - bu[1] * ww / 2 - bn[1] * wh / 2], [Bm[0] + bu[0] * ww / 2 - bn[0] * wh / 2, Bm[1] + bu[1] * ww / 2 - bn[1] * wh / 2],
    [Bm[0] + bu[0] * ww / 2 + bn[0] * wh / 2, Bm[1] + bu[1] * ww / 2 + bn[1] * wh / 2], [Bm[0] - bu[0] * ww / 2 + bn[0] * wh / 2, Bm[1] - bu[1] * ww / 2 + bn[1] * wh / 2]];
  bpKnock(wheel); bpLine(wheel, { closed: true, color: col, w: lw, frac: fr });
  for (const k of [-0.25, 0, 0.25]) bpLine([[Bm[0] - bu[0] * ww / 2 + bn[0] * wh * k, Bm[1] - bu[1] * ww / 2 + bn[1] * wh * k], [Bm[0] + bu[0] * ww / 2 + bn[0] * wh * k, Bm[1] + bu[1] * ww / 2 + bn[1] * wh * k]], { color: col, w: BPW.thin, frac: fr });
  // the handle: a knurled grip standing on the head
  const gw = 0.1 * L, g0 = rH * 0.95, g1 = rH + 0.24 * L, Hp = (s, k) => [Hc[0] + n[0] * s + u[0] * k * gw / 2, Hc[1] + n[1] * s + u[1] * k * gw / 2];
  const grip = [Hp(g0, -1), Hp(g1, -1), Hp(g1 + gw * 0.18, -0.6), Hp(g1 + gw * 0.18, 0.6), Hp(g1, 1), Hp(g0, 1)];
  bpKnock(grip); bpLine(grip, { closed: true, color: col, w: lw, frac: fr });
  for (const k of [-0.33, 0, 0.33]) bpLine([Hp(g0 + 0.25 * (g1 - g0), k), Hp(g1 - 0.08 * (g1 - g0), k)], { color: col, w: BPW.thin, frac: fr });
  // the head: a hinge disc, the face
  const disc = ellipsePts(Hc[0], Hc[1], rH, rH, -Math.PI / 2, 48);
  bpKnock(disc); bpLine(disc, { closed: true, color: col, w: lw, frac: fr });
  bpLine(ellipsePts(Hc[0], Hc[1], rH * 0.78, rH * 0.78, -Math.PI / 2, 40), { closed: true, color: col, w: BPW.thin, frac: fr, alpha: 0.55 });
  // eyes: two dots, a slow blink, a gaze
  if (fr >= 1) {
    const blink = o.blink ?? (mod(TT + key.length * 0.37, 2.9) > 2.78);
    const g = o.look ?? [0, 0], ex = rH * 0.36, er = rH * 0.17;
    for (const s of [-1, 1]) {
      const cx = Hc[0] + u[0] * s * ex - n[0] * rH * 0.05 + g[0] * rH * 0.12, cy = Hc[1] + u[1] * s * ex - n[1] * rH * 0.05 + g[1] * rH * 0.12;
      ctx.save(); ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(cx, cy, er, blink ? er * 0.18 : er * 1.15, Math.atan2(u[1], u[0]), 0, TAU); ctx.fill(); ctx.restore();
    }
  }
  SPARK_AT = toScreen(Hc[0], Hc[1]);
  return { A, Hc, rH, L, top: Hp(g1 + gw * 0.18, 0) };
}
// a standing compass inside the box centred (x, y), half-size r (for STYLE.hero and hero bridges)
function bpHero(x, y, r, o = {}) {
  return bpCompass([x - 0.42 * r, y + 0.95 * r], [x + 0.42 * r, y + 0.95 * r], { L: 1.15 * r, key: o.key ?? 'hero', ...o });
}

// ---------------------------------------------------------------------
//  the print pass: a soft vignette, cyanotype mottle and paper specks, laid over every frame (static, seeded)
// ---------------------------------------------------------------------
let BP_PRINT = null;
function bpPrintLayer() {
  if (BP_PRINT && BP_PRINT.width === W && BP_PRINT.height === H) return BP_PRINT;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), R = RNG('bp-print');
  for (let i = 0; i < 9; i++) {   // mottle: large soft patches, a touch lighter or darker
    const x = R.r(0, W), y = R.r(0, H), r = R.r(0.18, 0.4) * Math.max(W, H), light = i % 2 === 0;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, light ? 'rgba(120,170,255,0.045)' : 'rgba(2,12,40,0.07)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  }
  const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.38, W / 2, H / 2, Math.hypot(W, H) * 0.56);
  vg.addColorStop(0, 'rgba(3,14,44,0)'); vg.addColorStop(1, 'rgba(3,14,44,0.34)');
  g.fillStyle = vg; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(205,228,255,0.07)';
  for (let i = 0; i < Math.round(W * H / 900); i++) g.fillRect(R.r(0, W), R.r(0, H), R.r(1, 2.2), R.r(1, 2.2));
  BP_PRINT = c; return c;
}

// =====================================================================
//  STYLE — the renderer's hooks (styles/README.md has the contract)
// =====================================================================
const bpScaled = (P, k) => { const c = P.reduce((a, p) => [a[0] + p[0] / P.length, a[1] + p[1] / P.length], [0, 0]); return P.map(([x, y]) => [c[0] + (x - c[0]) * k, c[1] + (y - c[1]) * k]); };
const STYLE = {
  name: 'blueprint',
  paper: BP.ground,
  backdrop(c) { fillAll(c); ctx.save(); screen(); bpGrid(); ctx.restore(); },   // the sheet in colour c, gridded
  window(P, key, src) {   // a detail view: the world inside a heavy outline, a thin phantom boundary just outside
    ctx.save(); bpPoly(P, true); ctx.clip(); ctx.drawImage(src, 0, 0); ctx.restore();
    bpLine(P, { closed: true, w: BPW.thick });
    bpLine(bpScaled(P, 1.06), { closed: true, w: BPW.thin, color: BP.thin, dash: 'phantom' });
  },
  blob(P, c, key) {        // the morphing shape: a cut section, 45-degree hatching inside a heavy outline in c
    bpKnock(P); bpHatch(P, { color: c, alpha: 0.75 }); bpLine(P, { closed: true, color: c, w: BPW.thick });
  },
  hero(x, y, r, o = {}) { bpHero(x, y, r * 0.9, { key: o.key }); },
  heroColor: BP.accent,
  heroPts(x, y, r, n = 96) {   // the compass's silhouette: tips, hinge, grip
    const rr = r * 0.9, L = 1.15 * rr, N = [x - 0.42 * rr, y + 0.95 * rr], Q = [x + 0.42 * rr, y + 0.95 * rr];
    const h = Math.sqrt(L * L - (0.42 * rr) ** 2), Ay = y + 0.95 * rr - h, rH = 0.17 * L, top = Ay - rH * 0.3 - rH - 0.26 * L;
    return [N, [x - rH, Ay], [x - 0.05 * L, top], [x + 0.05 * L, top], [x + rH, Ay], Q];
  },
  post() { ctx.save(); screen(); ctx.drawImage(bpPrintLayer(), 0, 0); ctx.restore(); },
  ones: true,
};
