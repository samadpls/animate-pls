// =====================================================================
//  SCENES — your own look (style: blueprint). One sheet: a front elevation of an open laptop, a mortarboard
//  resting on its lid, dimensions, the compass hero measuring the cap, the tag and the title block.
//  World = screen (no camera). Everything plots on by 2.2s and holds; the thumbnail is t = 2.5s.
// =====================================================================
const cu = TIMELINE.cues;
const LAP = { cx: 548, w: 460, top: 500, h: 262, r: 18, bez: 18, bezB: 30, baseTop: 492, baseBot: 540, baseH: 24 };
const CAP = { dx: 88, bw: 166, bh: 52, t: 11, skT: 84, skB: 76, skH: 86, sag: 12, tilt: 9 * DEG };
const SCALE = 1.6;   // px per mm: the dimension figures are the drawing's own lengths at this scale
const plot = bpPlot;

// cap-local coordinates (board centre at 0,0; the skull's lowest point at (0, skH + sag)) -> sheet
function capXf() {
  const ax = LAP.cx + CAP.dx, ay = LAP.top, c = Math.cos(CAP.tilt), s = Math.sin(CAP.tilt), oy = CAP.skH + CAP.sag;
  return (p) => { const x = p[0], y = p[1] - oy; return [ax + x * c - y * s, ay + x * s + y * c]; };
}

function sceneTile() {
  bpSheet();
  bpBorder(72, { frac: plot(cu.border, 0.55) });
  drawLaptop();
  drawCap();
  drawDims();
  drawCompass();
  bpTag('your own look', { at: cu.tag, size: 66, x: 108, y: 164 });
  bpTitleBlock(['NED University', 'Software Engineering'], { at: cu.title, sizes: [42, 34] });
}

// ---- the laptop, front elevation
function drawLaptop() {
  const L = LAP, x0 = L.cx - L.w / 2, y0 = L.top, y1 = L.top + L.h, t = cu.laptop;
  bpLine(rrectPts(x0, y0, L.w, L.h, L.r, 6), { closed: true, frac: plot(t, 0.6) });                                   // lid
  bpLine(rrectPts(x0 + L.bez, y0 + L.bez, L.w - 2 * L.bez, L.h - L.bez - L.bezB, 5, 3), { closed: true, w: BPW.med, frac: plot(t + 0.2, 0.6) });   // screen
  bpLine(ellipsePts(L.cx, y0 + L.bez / 2, 3.2, 3.2, 0, 14), { closed: true, w: BPW.thin, frac: plot(t + 0.5, 0.2) });  // camera
  // hinge band and the base: a shallow trapezoid with a thumb notch and two feet
  const hy = y1 + 8, by = hy + L.baseH, bt = L.baseTop / 2, bb = L.baseBot / 2, nw = 38, nd = 6;
  bpBox(x0 + 22, y1, L.w - 44, 8, { w: BPW.med, frac: plot(t + 0.35, 0.4), over: 0 });
  const base = [[L.cx - bt, hy], [L.cx + bt, hy], [L.cx + bb, by - 6], ...arcPts(L.cx + bb - 6, by - 6, 6, 0, Math.PI / 2, 4),
    [L.cx + nw, by], [L.cx + nw * 0.7, by - nd], [L.cx - nw * 0.7, by - nd], [L.cx - nw, by],
    ...arcPts(L.cx - bb + 6, by - 6, 6, Math.PI / 2, Math.PI, 4), [L.cx - bb, by - 6]];
  bpLine(base, { closed: true, frac: plot(t + 0.3, 0.6) });
  bpLine([[L.cx - bt + 16, hy + 7], [L.cx + bt - 16, hy + 7]], { w: BPW.thin, color: BP.thin, frac: plot(t + 0.6, 0.3) });   // deck edge
  for (const s of [-1, 1]) bpBox(L.cx + s * (bb - 46) - 17, by, 34, 6, { w: BPW.med, frac: plot(t + 0.7, 0.25), over: 0 });   // feet
  bpCenter([[L.cx, y1 - L.bezB + 6], [L.cx, by + 34]], { frac: plot(t + 0.5, 0.4) });                                 // centre line, below the screen
  drawCode(x0 + L.bez, y0 + L.bez);
}

// ---- a few lines of code on the screen, in line work: a tag, two indented lines, a closing tag, a cursor
function drawCode(sx, sy) {
  const x = sx + 30, rows = [sy + 40, sy + 76, sy + 112, sy + 148], c0 = cu.code, k = 12;
  const chev = (cx, cy, dir, f) => bpLine([[cx + dir * k * 0.6, cy - k], [cx - dir * k * 0.6, cy], [cx + dir * k * 0.6, cy + k]], { w: BPW.med, frac: f });
  const pill = (px, py, len, f) => { if (f > 0) bpLine(rrectPts(px, py - 6, Math.max(12, len * f), 12, 6, 3), { closed: true, w: BPW.med }); };
  chev(x, rows[0], 1, plot(c0, 0.15)); pill(x + 22, rows[0], 92, plot(c0 + 0.08, 0.3)); chev(x + 134, rows[0], -1, plot(c0 + 0.3, 0.15));
  pill(x + 40, rows[1], 64, plot(c0 + 0.38, 0.25)); pill(x + 118, rows[1], 120, plot(c0 + 0.5, 0.3));
  pill(x + 40, rows[2], 150, plot(c0 + 0.66, 0.3)); pill(x + 204, rows[2], 54, plot(c0 + 0.8, 0.2));
  chev(x, rows[3], 1, plot(c0 + 0.9, 0.15));
  bpLine([[x + 24, rows[3] + k], [x + 34, rows[3] - k]], { w: BPW.med, frac: plot(c0 + 0.95, 0.12) });
  pill(x + 46, rows[3], 92, plot(c0 + 1.0, 0.25)); chev(x + 158, rows[3], -1, plot(c0 + 1.15, 0.12));
  if (TT > c0 + 1.25 && mod(TT, 0.8) < 0.5) { ctx.save(); ctx.fillStyle = BP.line; ctx.fillRect(x + 184, rows[3] - 13, 13, 26); ctx.restore(); }   // the cursor
}

// ---- the mortarboard: a board (a slab seen from a little above), the skull below it, a button and a tassel
function capGeom() {
  const X = capXf(), C = CAP;
  return {
    X,
    board: [[-C.bw, 0], [0, -C.bh], [C.bw, 0], [0, C.bh]].map(X),
    front: [[-C.bw, 0], [-C.bw, C.t], [0, C.bh + C.t], [C.bw, C.t], [C.bw, 0]].map(X),
    hull: [[-C.bw, 0], [0, -C.bh], [C.bw, 0], [C.bw, C.t], [0, C.bh + C.t], [-C.bw, C.t]].map(X),
    L: X([-C.bw, 0]), R: X([C.bw, 0]),
  };
}
function drawCap() {
  const G = capGeom(), X = G.X, C = CAP, t = cu.cap, yTop = C.bh * 0.5;
  // the skull: sides down from under the board, a sagging bottom edge
  const bottom = []; for (let i = 0; i <= 20; i++) { const q = i / 20; bottom.push([lerp(-C.skB, C.skB, q), C.skH + C.sag * (1 - (2 * q - 1) ** 2)]); }
  const sk = [[-C.skT, yTop], ...bottom, [C.skT, yTop]].map(X);
  bpKnock(sk);
  bpLine(sk, { frac: plot(t + 0.15, 0.5) });
  bpLine([[-C.skB + 4, C.skH - 14], [C.skB - 4, C.skH - 14]].map(X), { w: BPW.thin, color: BP.thin, frac: plot(t + 0.45, 0.3) });   // the band's seam
  // the board slab over it; the skull's rim beneath the board shows as a hidden (dashed) line
  bpKnock(G.hull);
  bpLine(G.front, { frac: plot(t, 0.5) });
  bpLine(G.board, { closed: true, frac: plot(t, 0.55) });
  bpHidden(ellipsePts(0, yTop - 4, C.skT, C.bh * 0.34, 0, 36).map(X), { closed: true, frac: plot(t + 0.5, 0.4) });
  // the button, and the tassel: its cord runs across the board, over the front-right edge, and hangs; it sways
  const btn = X([0, 0]);
  if (plot(t + 0.4, 0.2) > 0.5) { bpKnock(ellipsePts(btn[0], btn[1], 10, 10, 0, 16)); bpLine(ellipsePts(btn[0], btn[1], 7, 7, 0, 16), { closed: true, w: BPW.med }); }
  const hang = [C.bw * 0.52, C.bh * 0.48 + C.t * 0.6], sw = Math.sin(TT * TAU * 0.45) * 3 * DEG * clamp((TT - 1.0) / 0.5);
  const fc = plot(t + 0.55, 0.45);
  bpLine([[6, 3], [C.bw * 0.28, C.bh * 0.2], hang].map(X), { w: BPW.med, frac: fc });
  if (fc > 0.6) {
    const hp = X(hang), dn = [Math.sin(-sw + CAP.tilt * 0), Math.cos(sw)], at = (s, k) => [hp[0] + dn[0] * s + dn[1] * k, hp[1] + dn[1] * s - dn[0] * k];
    bpLine([at(0, 0), at(58, 0)], { w: BPW.med });
    const tas = [at(56, -5), at(62, -8), at(100, -13), at(104, -13), at(104, 13), at(100, 13), at(62, 8), at(56, 5)];
    bpKnock(tas); bpLine(tas, { closed: true, w: BPW.med });
    for (const k of [-6, 0, 6]) bpLine([at(68, k * 0.7), at(100, k)], { w: BPW.thin, color: BP.thin });
  }
}

// ---- dimensions (thin pale-cyan lines, filled arrowheads, figures)
function drawDims() {
  const L = LAP, x0 = L.cx - L.w / 2, y1 = L.top + L.h, by = y1 + 8 + L.baseH;
  const mm = (px) => String(Math.round(px / SCALE));
  bpDim([L.cx - L.baseBot / 2, by], [L.cx + L.baseBot / 2, by], 46, mm(L.baseBot), { t0: cu.dims, textAt: 0.36 });
  bpDim([x0, L.top], [x0, y1], 58, mm(L.h), { t0: cu.dims + 0.15 });
}

// ---- the hero: the compass drops in with its legs closed, spreads them across the cap, then swings an arc
function drawCompass() {
  const G = capGeom(), t = cu.compass;
  if (TT < t) return;
  const drop = (1 - bpSpring(TT, t, { k: 120, damp: 0.6 })) * -420, open = clamp(bpSpring(TT, cu.open, { k: 140, damp: 0.55 }), -0.2, 1.3);
  const M = [(G.L[0] + G.R[0]) / 2, (G.L[1] + G.R[1]) / 2], sp = lerp(0.28, 1, open);
  const N = [lerp(M[0], G.L[0], sp), lerp(M[1], G.L[1], sp) + drop], Q = [lerp(M[0], G.R[0], sp), lerp(M[1], G.R[1], sp) + drop];
  bpCompass(N, Q, { L: 236, key: 'hero', look: TT > cu.swing ? [0.5, 0.6] : [0, 0.8] });
  // the swing: a short brass arc struck from the needle through the pencil's point
  const s = plot(cu.swing, 0.35);
  if (s > 0) {
    const r = dist(G.L, G.R), a = Math.atan2(G.R[1] - G.L[1], G.R[0] - G.L[0]), da = 0.2;
    bpLine(arcPts(G.L[0], G.L[1], r, a - da, a - da + 2 * da * s, 24), { color: BP.accent, w: BPW.thin + 0.4, dash: [14, 6] });
  }
}
