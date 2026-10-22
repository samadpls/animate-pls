// =====================================================================
//  SCENES — 05-math gallery tile (1080x1080, one era, no camera moves; TT on 1s).
//  One colour per quantity, everywhere: dense red, sparse green, late interaction pink, hybrid score s yellow.
//  The math style's layout rules are written for 9:16; everything here is re-placed for the square by the
//  t5* wrappers below (title top left, formula under it, the ranked bars in the middle, pi low right, caption low).
// =====================================================================
const T5D = MC.red, T5S = MC.green, T5L = MC.pink, T5H = MC.yellow;
// the chart: score 0..1 runs right from T5_O; one row per document, ranked by the hybrid score
const T5_O = [200, 810], T5_U = 560, T5_ROW = 134, T5_BAR = 80;
const T5_ROWY = (i) => T5_O[1] - T5_ROW * (2.62 - i);   // row centres: d1 on top
// each document's weighted parts w·s (dense, sparse, late); the bar is their sum, so the total shown is exact at 2 places
const T5_DOCS = [
  { k: '1', parts: [0.30, 0.22, 0.27] },
  { k: '2', parts: [0.34, 0.08, 0.20] },   // the best dense match, but not the best hybrid one
  { k: '3', parts: [0.12, 0.25, 0.07] },
];
const T5_COLS = [T5D, T5S, T5L];
const t5Sum = (P) => Math.round(P.reduce((a, b) => a + b, 0) * 100) / 100;
// the formula: s(q, d) = w_d s_dense + w_s s_sparse + w_l s_late (an illustration of hybrid fusion)
const T5_EQ = [
  mv('s', T5H, { id: 's' }), mn('('), mv('q', MC.white, { id: 'q' }), mn(','), { sp: 0.12 }, mv('d', MC.white, { id: 'd' }), mn(')'), '=',
  mv('w', T5D, { sub: 'd', id: 'wd' }), { sp: 0.1 }, mv('s', T5D, { sub: 'dense', id: 'sd' }), '+',
  mv('w', T5S, { sub: 's', id: 'ws' }), { sp: 0.1 }, mv('s', T5S, { sub: 'sparse', id: 'ss' }), '+',
  mv('w', T5L, { sub: 'ℓ', id: 'wl' }), { sp: 0.1 }, mv('s', T5L, { sub: 'late', id: 'sl' }),
];

// ---- t5 wrappers: the style's overlays, re-placed for 1080x1080
// the main tag: upright serif, Written on, with a grey underline that draws on under it
const t5Tag = (str, x, y, size) => {
  const f = () => {
    const p = runS(E0 + TIMELINE.cues.tag, 0.8), w = textW(str, size);
    writeText(str, x, y, size, p, { align: 'left', color: MC.white, lag: 1.0 });
    segLine(x, y + size * 0.24, x + w, y + size * 0.24, MC.greyD, 3, smoothM(p * 1.3 - 0.3));
  };
  if (DEFER) DEFER.push(f); else f();
};
// the caption: the style's BackgroundRectangle card, at the bottom of the square
const t5Caption = (segs, y, size) => { const f = () => mathCard(segs, CX, y, size, runS(E0 + 0.45, 0.9)); if (DEFER) DEFER.push(f); else f(); };
// axes for a 0..1 score: the x-axis with ticks every 0.25 and labels at 0, 0.5, 1; a plain y-axis the rows stand on
function t5Axes(p) {
  const [ox, oy] = T5_O, x1 = ox + T5_U * 1.07, ytop = T5_ROWY(0) - T5_BAR / 2 - 26;
  const ex = lagged(p, 0, 2, 0.4), ey = lagged(p, 1, 2, 0.4);
  segLine(ox, oy, x1, oy, MC.grey, 3, smoothM(ex));
  if (ex > 0.98) mArrow(x1 - 1, oy, x1 + 14, oy, MC.grey, 3);
  segLine(ox, oy, ox, ytop, MC.grey, 3, smoothM(ey));
  const ta = smoothM((p - 0.5) * 2); if (ta <= 0) return;
  for (let k = 1; k <= 4; k++) { const x = ox + T5_U * k / 4; segLine(x, oy - 9, x, oy + 9, MC.grey, 2.5, 1, ta); }
  [[0, '0'], [0.5, '0.5'], [1, '1']].forEach(([v, s]) => mText(s, ox + T5_U * v, oy + 46, 32, { color: MC.greyC, alpha: ta }));
}
// manim NumberPlane, vertical lines only: faint BLUE_D every 0.1, a little stronger every 0.5
function t5Plane(p) {
  const ytop = T5_ROWY(0) - T5_BAR / 2 - 26;
  for (let k = 1; k <= 10; k++) {
    const major = k % 5 === 0, a = (major ? 0.36 : 0.13) * smoothM(p * 2 - k / 14);
    if (a > 0) segLine(T5_O[0] + T5_U * k / 10, T5_O[1], T5_O[0] + T5_U * k / 10, ytop, MC.blueD, major ? 2 : 1.2, 1, a);
  }
}
// one stacked bar segment: grows from its left edge (the score accumulates), stroke over a translucent fill
function t5Seg(x, y, w, h, c, g) {
  if (g <= 0 || w <= 0) return;
  const ww = w * g;
  ctx.save(); ctx.globalAlpha = 0.62; ctx.fillStyle = c; ctx.fillRect(x, y - h / 2, ww, h);
  ctx.globalAlpha = 1; ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.lineJoin = 'miter'; ctx.strokeRect(x + 1.5, y - h / 2 + 1.5, Math.max(0, ww - 3), h - 3); ctx.restore();
}
// the vector arrow over q (q is the query vector)
function t5VecArrow(box, c, p) {
  if (!box || p <= 0) return;
  const y = box.y0 - 4, x0 = box.x0 + 3, x1 = box.x1 + 3;
  mArrow(x0, y, x1, y, c, 2, p);
}

// pi raises an arm toward the result: drawn before piHero so the bar covers the shoulder (feet at x, y; s = 1)
function t5PiArm(x, y, to, p) {
  if (p <= 0) return;
  const sx = x - 52, sy = y - 104, a = Math.atan2(to[1] - sy, to[0] - sx), L = 62 * smoothM(p);
  const ex = sx + Math.cos(a) * L, ey = sy + Math.sin(a) * L;
  ctx.save(); ctx.lineCap = 'round';
  ctx.strokeStyle = MC.piD; ctx.lineWidth = 22; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
  ctx.strokeStyle = MC.pi; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
  ctx.restore();
}

function sceneTile() {
  const cu = TIMELINE.cues;
  fillAll(MC.bg);
  t5Tag('BestRAG', 66, 160, 112);
  // the formula, Written; the vector arrow lands on q once q is written
  const lay = writeTex(T5_EQ, CX, 322, 60, runS(cu.eq, 1.0));
  t5VecArrow(texBox(lay, 'q'), MC.white, runS(cu.eq + 0.35, 0.4));
  // the stage: plane, axes, the document labels
  t5Plane(runS(cu.axes, 0.9));
  t5Axes(runS(cu.axes, 0.8));
  const bp = runS(cu.bars, 0.75);
  T5_DOCS.forEach((d, i) => {
    const y = T5_ROWY(i);
    writeTex([mv('d', MC.white, { sub: d.k })], T5_O[0] - 28, y + 18, 54, runS(cu.axes + 0.2 + i * 0.1, 0.6), { align: 'right' });
    // the bar: dense, then sparse, then late interaction, each appended to the last (rows lagged)
    let x = T5_O[0];
    const rp = lagged(bp, i, 3, 0.45);
    d.parts.forEach((v, j) => { t5Seg(x, y, v * T5_U, T5_BAR, T5_COLS[j], smoothM(lagged(rp, j, 3, 0.8))); x += v * T5_U; });
    // the hybrid score, read off the same parts
    const tot = t5Sum(d.parts);
    writeTex([mn(tot.toFixed(2), T5H, { id: 'tot' })], T5_O[0] + tot * T5_U + 22, y + 17, 50, runS(cu.totals + i * 0.08, 0.5), { align: 'left' });
  });
  // the top result: a SurroundingRectangle in the score's yellow, then a Flash on it
  const top = t5Sum(T5_DOCS[0].parts), y1 = T5_ROWY(0), bx0 = T5_O[0] - 12, bx1 = T5_O[0] + top * T5_U + 22 + textW('0.00', 50) + 14;
  const box = [[bx0, y1 - T5_BAR / 2 - 12], [bx1, y1 - T5_BAR / 2 - 12], [bx1, y1 + T5_BAR / 2 + 12], [bx0, y1 + T5_BAR / 2 + 12]];
  showCreation(box, runS(cu.box, 0.6), { c: T5H, w: 4, closed: true });
  flashAt(bx1 + 4, y1, (TT - cu.flash) / 0.45, MC.yellowP, 30, 4);
  // the hero watches the formula, then the bars, then the winner
  const look = TT < cu.bars ? [CX, 300] : TT < cu.box ? [T5_O[0] + 0.5 * T5_U, T5_ROWY(1)] : [bx1 - 40, y1];
  const hop = (TT - cu.flash) / 0.5, px = 918, py = T5_O[1];
  t5PiArm(px, py - 34 * thereBack(clamp(hop)), [bx1 - 60, y1], runS(cu.box, 0.5));
  piHero(px, py, 1.0, { key: 'pi', look, mood: TT >= cu.flash ? 'happy' : 'calm', hop });
  t5Caption([{ s: 'dense', c: T5D }, { s: ' + ' }, { s: 'sparse', c: T5S }, { s: ' + ' }, { s: 'late interaction', c: T5L }], 978, 48);
}
