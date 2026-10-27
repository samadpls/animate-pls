// =====================================================================
//  SCENES — "Aurora · a 5-stage RISC-V pipeline" tile (chalkboard). World 1080x1080; time TT on 2s.
//  Columns are the five stages (the datapath boxes on top); rows are instructions in program order. A row shows the
//  stages its instruction has passed (faint boxes, the dust of the erased token in them) and, in yellow, the stage it
//  is in now. Yellow = an instruction in flight; coral = the hero; teal = registers, the clock, the title's rule.
// =====================================================================
const AU = {
  col: (i) => 64 + 190.4 * i + 95.2,            // stage column centres
  rowY: (r) => 432 + r * 104,                    // instruction row tops
  box: { y: 286, h: 104, w: 156 },
  tok: { w: 152, h: 84 },
  stages: ['IF', 'ID', 'EX', 'MEM', 'WB'],
  ins: ['lw', 'add', 'sw', 'beq', 'sub'],      // generic RV32I mnemonics, no operands
  clk: { x0: 690, y0: 92, y1: 142, per: 64 },
  hero: [950, 758, 48],
};
const auCu = TIMELINE.cues;
const AU_TICKS = [auCu.tick3, auCu.tick4, auCu.tick5];
// the clock cycle at time t (frame 0 is cycle 2: lw has been fetched and is decoding, add is being fetched)
const auCycle = (t) => 2 + AU_TICKS.filter((k) => t >= k).length;
const auTickAt = (c) => (c <= 2 ? -1 : AU_TICKS[c - 3]);   // when cycle c began

// one token: the instruction's mnemonic in a yellow chalk box, written on from t0 (box first, then the word)
function auToken(r, c, t0) {
  const x = AU.col(c) - AU.tok.w / 2, y = AU.rowY(r), k = 'tk' + r + '_' + c;
  const fb = t0 < 0 ? 1 : ev(t0, 0.14), ft = t0 < 0 ? 1 : ev(t0 + 0.08, 0.13);
  if (fb > 0.6) chScribble(rrectPts(x + 8, y + 8, AU.tok.w - 16, AU.tok.h - 16, 10, 3), { c: CHP.yellow, key: k + 'f', gap: 15, w: 5.5, press: 0.3 * clamp((fb - 0.6) / 0.4), a: -0.5 });
  const tip = chBox(x, y, AU.tok.w, AU.tok.h, { c: CHP.yellow, key: k + 'b', frac: fb, w: 6.5, over: 9 });
  const r2 = chText(AU.ins[r], x + AU.tok.w / 2, y + 60, 62, { align: 'center', maxW: AU.tok.w - 26, frac: ft, key: k + 't' });
  if (t0 >= 0) { chDust(tip || [x, y], t0, 0.14, { key: k + 'd1', n: 8 }); chDust(r2.tip, t0 + 0.08, 0.13, { key: k + 'd2', n: 10 }); }
}
// a stage the instruction has left: the dust of its erased token, a faint box and the stage's name
function auPassed(r, c, t0) {
  const x = AU.col(c) - 70, y = AU.rowY(r) + 6, al = t0 < 0 ? 1 : ev(t0, 0.12);
  chGhost(x + 6, y + 8, 128, 56, 'gh' + r + c, al * 1.4);
  chBox(x, y, 140, 72, { c: CHP.white, key: 'ps' + r + '_' + c, press: 0.32 * al, w: 4.5, fibres: 2, over: 6 });
  chText(AU.stages[c], x + 70, y + 49, 34, { align: 'center', press: 0.42 * al, key: 'pt' + r + c });
}
// the stage boxes, with the pipeline registers between them (tall teal bars) and the flow arrows into each stage
function auDatapath() {
  const { y, h, w } = AU.box;
  AU.stages.forEach((s, i) => {
    const cx = AU.col(i);
    chBox(cx - w / 2, y, w, h, { key: 'st' + i, w: 7 });
    chText(s, cx, y + 74, 62, { align: 'center', maxW: w - 22, key: 'stt' + i });
    if (i > 0) {
      const xr = 64 + 190.4 * i;
      chScribble(rrectPts(xr - 6, y - 14, 12, h + 28, 3, 2), { c: CHP.teal, key: 'rgf' + i, gap: 7, w: 4, press: 0.55, a: 1.2 });
      chBox(xr - 7, y - 16, 14, h + 32, { c: CHP.teal, key: 'rg' + i, w: 4.2, over: 3, fibres: 2 });
      chArrow([[xr + 6, y + h / 2], [cx - w / 2 - 2, y + h / 2]], { key: 'ar' + i, w: 4, head: 11, fibres: 2 });
    }
  });
  chArrow([[56, AU.box.y + h / 2], [AU.col(0) - w / 2 - 3, AU.box.y + h / 2]], { key: 'ar0', w: 4, head: 11, fibres: 2, press: 0.8 });
}
// the clock: a square wave written one period per cycle, the newest edge on each tick
function auClock() {
  const { x0, y0, y1, per } = AU.clk, cyc = auCycle(TT);
  chText('clk', x0 - 18, y1 - 4, 40, { c: CHP.teal, align: 'right', key: 'clk' });
  for (let k = 1; k <= cyc; k++) {
    const x = x0 + (k - 1) * per, t0 = auTickAt(k), fr = t0 < 0 ? 1 : ev(t0, 0.2);
    const P = [[x, y1], [x, y0], [x + per / 2, y0], [x + per / 2, y1], [x + per, y1]];
    chLine(P, { c: CHP.teal, w: 4.5, key: 'ck' + k, frac: fr, fibres: 2, amt: 0.7 });
    if (t0 >= 0) chDust(P, t0, 0.2, { key: 'ckd' + k, n: 6 });
  }
}
// the loop the teacher draws around the five tokens in flight: the hull of the diagonal, padded, written on
function auLoopPts() {
  const pad = 18, P = [];
  for (let r = 0; r < 5; r++) {
    const x = AU.col(4 - r) - AU.tok.w / 2, y = AU.rowY(r);
    P.push([x - pad, y - pad], [x + AU.tok.w + pad, y - pad], [x + AU.tok.w + pad, y + AU.tok.h + pad], [x - pad, y + AU.tok.h + pad]);
  }
  const H2 = auHull(P), Q = resample(H2, true, 14);
  // start the loop near the top right so it is drawn round like a hand would, overshooting where it closes
  let i0 = 0, best = -1e9; Q.forEach((p, i) => { const v = p[0] - p[1]; if (v > best) { best = v; i0 = i; } });
  const R = Q.slice(i0).concat(Q.slice(0, i0));
  return R.concat(R.slice(0, 6));
}
function auHull(P) {   // convex hull (monotone chain)
  const S = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of S) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = S.length - 1; i >= 0; i--) { const p = S[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}

function sceneAurora() {
  chBoard(CHP.board, 'aurora');
  const cyc = auCycle(TT), fl = ev(auCu.loop, 0.45), fn = ev(auCu.note, 0.4);
  chalk(() => {
    // the title, already on the board; its rule and the subtitle are being written as the clip opens
    chText('Aurora', 74, 172, 114, { key: 'title', maxW: 470 });
    const tw = chTextW('Aurora', chFit('Aurora', 114, 470));
    chLine([[66, 198], [74 + tw + 24, 192]], { c: CHP.teal, w: 6, key: 'tline', frac: ev(-0.1, 0.45) });
    const fs = ev(-0.15, 0.6), sub = chText('five-stage RISC-V pipeline', 76, 262, 60, { key: 'sub', maxW: 940, frac: fs });
    if (fs < 1) chDust(sub.tip, 0, 0.45, { key: 'subd', n: 14 });
    auClock();
    auDatapath();
    // the instructions: row r was fetched in cycle r + 1; in cycle `cyc` it is in stage cyc - r - 1
    for (let r = 0; r < 5; r++) {
      const st = cyc - r - 1; if (st < 0) continue;
      for (let c = 0; c < st; c++) auPassed(r, c, auTickAt(r + c + 2));
      auToken(r, st, auTickAt(cyc));
    }
    // the payoff: the teacher circles the diagonal, five in flight, and writes it down
    if (fl > 0) chLine(auLoopPts(), { c: CHP.yellow, w: 7, key: 'loop', frac: fl, amt: 2.2 });
    if (fl > 0 && fl < 1) chDust(auLoopPts(), auCu.loop, 0.45, { key: 'loopd', n: 18 });
    if (fn > 0) {
      const nt = chText('five at once!', 418, 950, 62, { c: CHP.yellow, key: 'note', maxW: 460, frac: fn, rot: -0.04 });
      chDust(nt.tip, auCu.note, 0.4, { key: 'noted', n: 12 });
      chArrow([[664, 884], [652, 830], [646, 770]], { c: CHP.yellow, w: 5, key: 'nar', frac: ev(auCu.note + 0.3, 0.15), head: 16, fibres: 3 });
    }
    // the hero, standing on the ledge's edge of the board, pointing at what is in flight once five are there
    const [hx, hy, hs] = AU.hero, pointing = TT >= auCu.point;
    chHero(hx, hy, hs, {
      key: 'hero', point: pointing ? [AU.col(2), AU.rowY(2) + 40] : null, look: pointing ? null : [-0.8, -0.4],
      mood: TT < auCu.point ? 'smile' : TT < auCu.note ? 'wow' : TT < auCu.note + 0.4 ? 'talk' : 'smile',
    });
  });
  chFrame({ side: 30, ledge: 66 });
}
