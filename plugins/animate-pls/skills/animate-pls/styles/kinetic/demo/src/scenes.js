// =====================================================================
//  SCENES — kinetic demo. World = screen (no camera). Time TT on 1s. Laid out per format from kinArea():
//  9:16 sets the type in x 120-780 (left of the phone UI), 1:1 and 16:9 in the left ~2/3 with the hero beside it.
//  Every row is fit to the column with kinFit, then the whole stack is scaled to the height it has.
// =====================================================================
const cu = TIMELINE.cues;

// the type column, the stack's centre, the space beside it (for the hero and stickers)
function demoCol() {
  const A = kinArea(), tag = 120 * UNIT, cap = 175 * UNIT;   // room for the tag above and the caption below
  const mx0 = A.x0 + (WIDE ? 40 * UNIT : 0), mx1 = PORTRAIT ? A.x1 : WIDE ? LX(0.7) : LX(0.74);
  const y0 = A.y0 + tag, y1 = A.y1 - cap;
  return { A, mx0, mx1, mw: mx1 - mx0, y0, y1, cy: (y0 + y1) / 2, side: PORTRAIT ? (A.x1 + A.xr) / 2 : (mx1 + A.xr) / 2 };
}
// fit each row to the column (r.wf = the share of the column it may take), then scale the stack to the height
function demoFit(rows, mw, hav, gapK = 0.14) {
  rows.forEach((r) => { r.size = kinFit(r.fit ?? r.s, mw * (r.wf ?? 1), { max: r.max }); });
  const hs = () => rows.reduce((a, r) => a + kinSlot(r).reduce((x, y) => x + y, 0), 0), gap = () => gapK * kinCapK() * rows.reduce((a, r) => a + r.size, 0) / rows.length;
  const k = Math.min(1, hav / (hs() + gap() * (rows.length - 1)));
  rows.forEach((r) => { r.size *= k; });
  return gap();
}
// a rotated rectangle as dense points (a bridge shape)
function demoRectPts(R, rot = 0) {
  const cx = R.x + R.w / 2, cy = R.y + R.h / 2, c = Math.cos(rot), s = Math.sin(rot);
  return resample([[R.x, R.y], [R.x + R.w, R.y], [R.x + R.w, R.y + R.h], [R.x, R.y + R.h]], true, 8)
    .map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]);
}
const demoMeter = (L, col) => kinMeter(L.mx1 - 4 * 34 * UNIT * 1.5 + 17 * UNIT, L.A.y0 + 20 * UNIT, 4, 34 * UNIT, { color: col });

// ---- night: TYPE / THAT / MOVES -> POPS. on the warm black -------------------------------------------------
function nightRows() {
  const L = demoCol();
  const rows = WIDE ? [
    { s: 'TYPE THAT', t: cu.type - 0.12, kind: 'fill', wf: 0.9 },
    { swap: [[cu.moves, 'MOVES'], [cu.pops, 'POPS.']], fit: ['MOVES', 'POPS.'], t: cu.moves, kind: 'key', box: cu.box, rot: -0.035, wf: 0.62 },
  ] : [
    { s: 'TYPE', t: cu.type - 0.12, kind: 'fill', wf: 0.8 },
    { s: 'THAT', t: cu.that, kind: 'outline', wf: 0.8 },
    { swap: [[cu.moves, 'MOVES'], [cu.pops, 'POPS.']], fit: ['MOVES', 'POPS.'], t: cu.moves, kind: 'key', box: cu.box, rot: -0.035, wf: 0.78 },
  ];
  const gap = demoFit(rows, L.mw, L.y1 - L.y0);
  return { L, rows, gap, x: (L.mx0 + L.mx1) / 2 };
}
function popsBox() {   // the POPS. box once the stack has settled: the bridge object
  const N = nightRows(), k = N.rows.length - 1, r = N.rows[k], yb = kinBuildAt(N.rows, { cy: N.L.cy, gap: N.gap })[k], cap = kinCapK() * r.size, w = kinW('POPS.', r.size);
  return { R: kinBoxRect(N.x - w / 2, w, yb, cap), rot: r.rot };
}
function sceneNight() {
  const { L, rows, gap, x } = nightRows(), u = UNIT;
  kinGround('ink');
  if (PORTRAIT) kinAsterisk(LX(0.84), LY(0.885), 330 * UNIT, { outline: 12, w: 0.15, n: 240, rot: TT * 0.25, color: KIN.paper });   // big, slow, under the phone UI
  // background life: a spinning paper asterisk low on the left, the beat meter, the hero
  kinAsterisk(L.mx0 + 26 * u, L.y1 + 70 * u, 30 * u, { fill: KIN.paper, rot: TT * 0.9, b: 0, sh: 0 });
  demoMeter(L, KIN.paper);
  const out = kinBuild(rows, { x, cy: L.cy, gap, align: 'center' });
  // the hero: waits beside the middle row, then hops onto the corner of the POPS box and stamps it
  const hr = 72 * u, ys = kinBuildAt(rows, { cy: L.cy, gap }), sx = L.side + 6 * u, sy = ys[0] + kinCapK() * rows[0].size * (WIDE ? -0.5 : 0.3);
  const pb = popsBox(), last = rows.length - 1, bx = pb.R.x + pb.R.w + 4 * u, by = pb.R.y + pb.R.h * 0.3 + Math.sin(pb.rot) * pb.R.w / 2;
  const e = clamp((TT - cu.box) / (cu.land - cu.box)), hx = lerp(sx, bx, EZ.io(e)), hy = lerp(sy, by, EZ.io(e)) - Math.sin(Math.PI * e) * 150 * u;
  if (out[last] && out[last].boxed) kinMarks(pb.R.x - 4 * u, pb.R.y + 10 * u, 44 * u, Math.PI * 1.2, cu.land);
  kinHero(hx, hy, hr, { key: 'hero', at: 0.25, land: cu.land, look: TT < cu.box ? [-0.9, 0.5] : [-0.6, 0.5] });
  kinTag('01 type');
  kinCaption(['type', 'on', 'the', 'beat'], cu.cap1, { step: 0.25 });
}

// ---- day: 120 / BEATS A MINUTE / 24 FRAMES / A SECOND. on paper ------------------------------------------------
function dayRows() {
  const L = demoCol();
  const rows = WIDE ? [
    { count: [cu.count, cu.hit - cu.count, 0, 120], fit: '120', ref: '120', t: -1, kind: 'key', rot: -0.03, wf: 0.36 },
    { s: 'BEATS A MINUTE', t: cu.beats, kind: 'fill', wf: 0.8 },
    { count: [cu.frames, 0.5, 0, 24, { post: ' FRAMES' }], fit: '24 FRAMES', t: cu.frames, kind: 'outline', wf: 0.6 },
    { s: 'A SECOND.', t: cu.second, kind: 'fill', wf: 0.5 },
  ] : [
    { count: [cu.count, cu.hit - cu.count, 0, 120], fit: '120', ref: '120', t: -1, kind: 'key', rot: -0.03, wf: 0.66 },
    { s: 'BEATS A MINUTE', t: cu.beats, kind: 'fill' },
    { count: [cu.frames, 0.5, 0, 24, { post: ' FRAMES' }], fit: '24 FRAMES', t: cu.frames, kind: 'outline', wf: 0.86 },
    { s: 'A SECOND.', t: cu.second, kind: 'fill', wf: 0.72 },
  ];
  const gap = demoFit(rows, L.mw, L.y1 - L.y0, 0.18);
  return { L, rows, gap, x: L.mx0, ys: kinBuildAt(rows, { cy: L.cy, gap }) };
}
function countBox() {   // the 120 box (sized for "120" from the start): the bridge object
  const D = dayRows(), r = D.rows[0], cap = kinCapK() * r.size;
  return { R: kinBoxRect(D.x, kinW('120', r.size), D.ys[0], cap), rot: r.rot };
}
function sceneDay() {
  const { L, rows, x, ys } = dayRows(), u = UNIT;
  kinGround('paper');
  if (PORTRAIT) kinAsterisk(LX(0.84), LY(0.885), 330 * UNIT, { outline: 12, w: 0.15, n: 240, rot: 0.5 - TT * 0.25, color: KIN.ink });
  kinAsterisk(L.mx0 + 26 * u, L.y1 + 70 * u, 30 * u, { fill: KIN.ink, rot: -TT * 0.9, b: 0, sh: 0 });
  demoMeter(L, KIN.ink);
  // rows land in their final slots (the box is there from the morph on); the count-up keeps the box sized for 120
  const out = rows.map((r, i) => (TT < r.t ? null : kinRow(r, x, ys[i], { align: 'left', en: i ? kinPop(r.t, 0.2) : null })));
  // the hero rides the box's top-right corner and hops on the beat; an arrow from it to the frames row
  const cb = countBox(), hr = 66 * u, hx = cb.R.x + cb.R.w + hr * 0.85, hy = cb.R.y + cb.R.h * 0.42 + Math.sin(cb.rot) * cb.R.w / 2;
  const hop = [cu.hop, cu.hop + BEAT].reduce((a, h) => { const q = (TT - h) / 0.3; return a + (q > 0 && q < 1 ? 4 * q * (1 - q) * 70 * u : 0); }, 0);
  if (out[2]) kinArrow(Math.min(L.side, out[1].x1 + 90 * u), out[1].top - 10 * u, out[2].x1 + 34 * u, out[2].top + out[2].cap * 0.5, { frac: ev(cu.frames + 0.25, 0.3), bend: -0.3, w: 13 });
  if (out[3]) kinTick(out[3].x1 + 66 * u, out[3].y - out[3].cap * 0.45, 46 * u, { frac: ev(cu.second + 0.35, 0.2) });
  kinHero(hx, hy - hop, hr, { key: 'hero', land: TT > cu.hop ? cu.hop + 0.3 : null, look: [-0.5, 0.8] });
  kinTag('02 time');
  kinCaption(['count,', 'flip,', 'swipe'], cu.cap2, { step: 0.25 });
}
