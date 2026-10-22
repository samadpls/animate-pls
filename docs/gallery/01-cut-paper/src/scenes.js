
// =====================================================================
//  SCENE — one era, drawn in world coordinates (1080x1080), animated with TT / ev / popS / springMove.
//  A night-blue wall: three paper neurons wired into a small loop (A -> B -> C -> A). A spike runs down A's
//  myelinated axon toward B and the spark rides it. Below, on the desk, an EEG-like trace writes itself onto
//  a paper strip labelled hnn-core. Background life: twinkling stars, the moon, a steaming mug, a sleepy neuron.
//  Helpers prefixed t1 are this tile's own (square layout), not the kit's.
// =====================================================================
// ---- paths
function t1Bez(p0, p1, p2, p3, n = 60) {
  const P = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    P.push([a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]);
  }
  return P;
}
function t1Quad(p0, c, p2, n = 10) {
  const P = [];
  for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; P.push([u * u * p0[0] + 2 * u * t * c[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p2[1]]); }
  return P;
}
function t1Cum(P) { const c = [0]; for (let i = 1; i < P.length; i++) c.push(c[i - 1] + dist(P[i - 1], P[i])); return c; }
function t1At(P, c, s) {
  s = clamp(s, 0, c[c.length - 1]); let i = 1;
  while (i < c.length - 1 && c[i] < s) i++;
  const k = (s - c[i - 1]) / ((c[i] - c[i - 1]) || 1);
  return [lerp(P[i - 1][0], P[i][0], k), lerp(P[i - 1][1], P[i][1], k)];
}
// the stretch of path P between arc-length fractions f0 and f1
function t1Seg(P, f0, f1, step = 6) {
  const c = t1Cum(P), L = c[c.length - 1], a = f0 * L, b = f1 * L, n = Math.max(2, Math.ceil((b - a) / step)), out = [];
  for (let i = 0; i <= n; i++) out.push(t1At(P, c, lerp(a, b, i / n)));
  return out;
}
// point, unit tangent and the upward normal at fraction f
function t1Frame(P, f) {
  const c = t1Cum(P), L = c[c.length - 1], p = t1At(P, c, f * L), q = t1At(P, c, Math.min(L, f * L + 4)), o = t1At(P, c, Math.max(0, f * L - 4));
  let tx = q[0] - o[0], ty = q[1] - o[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
  let nx = ty, ny = -tx; if (ny > 0) { nx = -nx; ny = -ny; }
  return { p, t: [tx, ty], n: [nx, ny] };
}
// a strip of paper along polyline P, w0 wide at the start, w1 at the end (trace() rounds the ends)
function t1Ribbon(P, w0, w1 = w0) {
  const n = P.length, L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)];
    let nx = a[1] - b[1], ny = b[0] - a[0]; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    const w = lerp(w0, w1, i / (n - 1)) / 2;
    L.push([P[i][0] + nx * w, P[i][1] + ny * w]); R.push([P[i][0] - nx * w, P[i][1] - ny * w]);
  }
  return [...L, ...R.reverse()];
}
// ---- a neuron: branching dendrites (paper strips), a soma with a face
function t1Tree(x, y, a, len, w, depth, R, out) {
  const bend = R.n(0.3), x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
  const c = [x + Math.cos(a + bend) * len * 0.55, y + Math.sin(a + bend) * len * 0.55];
  out.push({ P: t1Quad([x, y], c, [x2, y2], 8), w0: w, w1: w * (depth ? 0.66 : 0.38) });
  if (depth > 0) {
    const s = R.r(0.42, 0.62);
    t1Tree(x2, y2, a - s, len * R.r(0.58, 0.72), w * 0.64, depth - 1, R, out);
    t1Tree(x2, y2, a + s, len * R.r(0.58, 0.72), w * 0.64, depth - 1, R, out);
  }
}
function t1Dendrites(N) {
  const R = RNG('nrn', N.key), segs = [];
  for (const [deg, len] of N.trunks) { const a = deg * DEG; t1Tree(N.x + Math.cos(a) * N.r * 0.5, N.y + Math.sin(a) * N.r * 0.5, a, len, N.r * 0.44, N.depth ?? 2, R, segs); }
  segs.forEach((s, i) => cut(t1Ribbon(s.P, s.w0, s.w1), N.c, { key: N.key + 'd' + i, crayon: N.d, crAl: 0.35, crPer: 40, sb: 6, sy: 4, tear: 0.6, amt: 0.5, grain: 0.6 }));
}
function t1Soma(N, mood) {
  cut(ellipsePts(N.x, N.y, N.r, N.r * 0.94, 0.3, 36), N.c, { key: N.key + 's', crayon: N.d, crAl: 0.3, crPer: 40, sb: 12, sy: 7 });
  face(N.x, N.y + N.r * 0.02, N.r / 60, mood);
}
// a synaptic knob (bouton) pressed against the target
const t1Knob = (x, y, r, c, d, key) => cut(ellipsePts(x, y, r, r * 0.9, 0, 18), c, { key, crayon: d, crAl: 0.35, crPer: 30, sb: 5, sy: 3, tear: 0.6 });
// ---- the paper strip's chart grid
const t1Grid = (c, gap) => (bb) => {
  ctx.strokeStyle = c; ctx.lineWidth = 1.6; ctx.beginPath();
  for (let y = bb.y0 + gap * 0.6; y < bb.y1; y += gap) { ctx.moveTo(bb.x0, y); ctx.lineTo(bb.x1, y); }
  for (let x = bb.x0 + gap * 0.6; x < bb.x1; x += gap) { ctx.moveTo(x, bb.y0); ctx.lineTo(x, bb.y1); }
  ctx.stroke();
};
// ---- the main tag and the caption, placed for the square tile (drawn after the scene, like yearTag / capStrip)
const t1Tag = (str, size = 84) => { const f = () => tag(str, 72 + (handW(str, size) + size * 0.9) / 2, 152, size, { rot: -0.035, s: popS(E0 + TIMELINE.cues.tag) }); if (DEFER) DEFER.push(f); else f(); };
const t1Cap = (str, size = 54) => { const f = () => tag(str, CX, H - SAFE.bottom - 66, size, { rot: 0.014, tape: false, frac: ev(E0 + 0.45, 0.6) }); if (DEFER) DEFER.push(f); else f(); };
// ---- the circuit (world coords)
const T1N = {
  A: { key: 'nA', x: 250, y: 520, r: 72, c: PAL.pink, d: '#dc7c9e', trunks: [[178, 70], [222, 66], [266, 62], [134, 60]] },
  B: { key: 'nB', x: 850, y: 420, r: 66, c: PAL.mint, d: '#79bca3', trunks: [[2, 56], [-48, 60], [-100, 54], [48, 52]] },
  C: { key: 'nC', x: 568, y: 655, r: 50, c: '#b8acef', d: '#8c7ad8', trunks: [[236, 46], [298, 44], [24, 38], [96, 34]] },
};
const T1AX = {   // axons: A -> B (myelinated, carries the spike), B -> C, C -> A
  AB: t1Bez([314, 494], [420, 390], [610, 352], [728, 408], 80),
  BC: t1Bez([842, 486], [840, 600], [730, 655], [622, 650], 50),
  CA: t1Bez([518, 684], [430, 728], [300, 712], [268, 598], 50),
};
function sceneTile() {
  const cu = TIMELINE.cues, N = T1N;
  // the wall: a night-blue card with a faint dot print, stars that twinkle, the moon
  cut(rect(-30, -30, W + 60, H + 60, 0), PAL.navy, { key: 'wall', shadow: false, tear: 0, shade: false, pat: pat.dots('rgba(255,230,180,0.08)', 3.5, 54) });
  { const R = RNG('stars'); for (let i = 0; i < 30; i++) { const x = R.r(80, 1000), y = R.r(80, 770), s = R.r(4, 9); sparkle(x, y, s * (0.55 + 0.45 * ((B + i) % 3 === 0 ? 1 : 0.6)), '#fff2c8'); } }
  cut(ellipsePts(948, 150, 54, 54, 0, 36), '#f6ecc8', { key: 'moon', crayon: '#e3d29c', crAl: 0.35 });
  [[930, 136, 10], [966, 168, 7], [952, 128, 5]].forEach(([x, y, r], i) => cut(ellipsePts(x, y, r, r, 0, 14), '#e8dcb0', { key: 'crater' + i, shadow: false, grain: 0.4 }));
  // the desk, the strip, the mug
  cut(rect(-30, 800, W + 60, 320, 0), PAL.wood, { key: 'desk', tear: 0, pat: pat.grainWood('rgba(120,60,20,0.18)'), sy: -6 });
  const SY = 860;
  ctx.save(); ctx.translate(467, SY); ctx.rotate(-0.012); ctx.translate(-467, -SY);
  cut(rect(74, SY - 48, 786, 96, 2), PAL.paper, { key: 'strip', tear: 1.6, pat: t1Grid('rgba(236,122,140,0.22)', 20) });
  handText('hnn-core', 98, SY + 12, 40, PAL.navy, { key: 'lbl' });
  {
    const P = []; const g = (x, m, s) => Math.exp(-((x - m) ** 2) / (2 * s * s));
    for (let x = 276; x <= 842; x += 4) P.push([x, SY + 7 * Math.sin(x * 0.075) + 4 * Math.sin(x * 0.19 + 1) - 34 * g(x, 548, 14) + 26 * g(x, 584, 20) - 10 * g(x, 640, 26)]);
    ink(P, { w: 5, color: PAL.navy, amt: 0.6, key: 'eeg', frac: ev(cu.trace, 1.5) });
  }
  ctx.restore();
  mug(950, 816, 0.78, PAL.blue, 'mug');
  // the circuit: dendrites, then axons, then somas (faces), then sheaths, boutons, the spike and the spark
  const u = springMove(cu.spike, 0.02, 0.5, { k: 40, d: 12.6 });   // the spike's place along A's axon (arc-length fraction)
  const S = t1Frame(T1AX.AB, u), [hx, hy] = S.p, on = popS(cu.spike), ang = Math.atan2(S.t[1], S.t[0]);
  if (on > 0) {   // a pool of light behind the spike: two lighter paper ovals on the wall
    cut(ellipsePts(hx - S.t[0] * 24, hy - S.t[1] * 24 - 20, 170 * on, 128 * on, ang, 44), '#323f7a', { key: 'pool1', shadow: false, tear: 2.0, grain: 0.5, shade: false });
    cut(ellipsePts(hx - S.t[0] * 14, hy - S.t[1] * 14 - 14, 112 * on, 84 * on, ang, 36), '#414e8e', { key: 'pool2', shadow: false, tear: 1.6, grain: 0.5, shade: false });
  }
  [N.A, N.B, N.C].forEach(t1Dendrites);
  cut(t1Ribbon(T1AX.BC, 12, 9), N.B.c, { key: 'axBC', crayon: N.B.d, crAl: 0.3, sb: 6, sy: 4, tear: 0.6, amt: 0.5 });
  cut(t1Ribbon(T1AX.CA, 12, 9), N.C.c, { key: 'axCA', crayon: N.C.d, crAl: 0.3, sb: 6, sy: 4, tear: 0.6, amt: 0.5 });
  cut(t1Ribbon(T1AX.AB, 16, 12), N.A.c, { key: 'axAB', crayon: N.A.d, crAl: 0.3, sb: 6, sy: 4, tear: 0.6, amt: 0.5 });
  t1Soma(N.A, TT >= cu.spike ? 'happy' : 'smile');
  t1Soma(N.B, u > 0.3 ? 'wow' : 'smile');
  t1Soma(N.C, 'focus');
  for (let i = 0; i < 5; i++) { const f0 = 0.1 + i * 0.16; cut(t1Ribbon(t1Seg(T1AX.AB, f0, f0 + 0.125), 30, 30), PAL.cream, { key: 'myl' + i, sb: 6, sy: 4, tear: 0.6, amt: 0.4, pat: pat.stripes('rgba(200,170,130,0.22)', 3, 12, 0.2) }); }
  // A's terminals press on B's soma; B's on C; C's on A
  { const e = T1AX.AB[T1AX.AB.length - 1]; [150, 180, 210].forEach((deg, i) => { const a = deg * DEG, tx = N.B.x + Math.cos(a) * (N.B.r + 4), ty = N.B.y + Math.sin(a) * (N.B.r + 4);
    cut(t1Ribbon(t1Quad(e, [lerp(e[0], tx, 0.5), lerp(e[1], ty, 0.5) + (i - 1) * 6], [tx, ty], 8), 9, 7), N.A.c, { key: 'tw' + i, crayon: N.A.d, crAl: 0.3, sb: 4, sy: 3, tear: 0.5, amt: 0.4 });
    t1Knob(tx, ty, 12, N.A.c, N.A.d, 'kAB' + i); }); }
  t1Knob(...T1AX.BC[T1AX.BC.length - 1], 11, N.B.c, N.B.d, 'kBC');
  t1Knob(...T1AX.CA[T1AX.CA.length - 1], 11, N.C.c, N.C.d, 'kCA');
  // the spike: a lit yellow wake along the axon, a bright head peeking out ahead of the rider, sparks; the spark rides it
  if (on > 0) {
    cut(t1Ribbon(t1Seg(T1AX.AB, Math.max(0, u - 0.3), u), 6, 38 * on), PAL.yellow, { key: 'wake', crayon: '#e6b23a', crAl: 0.35, sb: 8, sy: 4, tear: 0.8, amt: 0.6 });
    cut(ellipsePts(hx + S.t[0] * 10, hy + S.t[1] * 10, 38 * on, 25 * on, ang, 24), PAL.yellow, { key: 'head', crayon: '#e6b23a', crAl: 0.3, sb: 8, sy: 4, tear: 0.7 });
    cut(ellipsePts(hx + S.t[0] * 16, hy + S.t[1] * 16, 18 * on, 11 * on, ang, 16), '#fffbe6', { key: 'core', shadow: false, tear: 0.5, grain: 0.4 });
    [[66, -30, 13], [84, 14, 9], [40, 36, 8], [-90, 30, 9]].forEach(([dt, dn, r], i) => sparkle(hx + S.t[0] * dt - S.n[0] * dn, hy + S.t[1] * dt - S.n[1] * dn, r * on * (0.75 + 0.25 * ((B + i) % 2)), '#ffe9a0'));
  }
  // the spark waits on the axon just past A, hops on as the spike reaches it (~0.8s) and rides it
  const ride = clamp((u - 0.16) / 0.1), F2 = t1Frame(T1AX.AB, Math.max(u, 0.18));
  const sr = 78, sx = F2.p[0] + F2.n[0] * 66 - F2.t[0] * 44 * ride, sy = F2.p[1] + F2.n[1] * 66 - F2.t[1] * 44 * ride;
  for (let k = -1; k <= 1; k++) {   // speed lines behind the rider
    const bx = sx - S.t[0] * (sr * 1.15) + S.n[0] * k * sr * 0.42, by = sy - S.t[1] * (sr * 1.15) + S.n[1] * k * sr * 0.42, L = 70 - Math.abs(k) * 20;
    ink([[bx, by], [bx - S.t[0] * L, by - S.t[1] * L]], { w: 6, color: 'rgba(251,246,234,0.85)', amt: 0.5, key: 'spd' + k, frac: ride });
  }
  spark(sx, sy, sr, { rays: 9, mood: ride > 0.3 ? 'happy' : TT >= cu.spike ? 'wow' : 'smile', key: 'hero' });
  t1Tag('GSoC 2024 · INCF');
  t1Cap('simulating neurons');
}
