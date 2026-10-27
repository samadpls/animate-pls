// =====================================================================
//  SCENES — terminal demo. World = screen (no camera). Time TT on 1s. Laid out per format from tmArea():
//  9:16 keeps every line left of the action rail (x < 780 below y 840); 1:1 and 16:9 centre the pane / the diagram.
// =====================================================================
const cu = TIMELINE.cues;
const DM_CMD = 'make film';

// ---- era 1 layout: a pane of 22 columns, rows 0-6 of output and a status line on row 8 ---------------------------
function dmL() {
  const A = tmArea(), u = UNIT, cols = 22, right = A.rail ? A.xr - 12 * u : A.x1;
  const tagH = 112 * u, capH = 132 * u, aw = right - A.x0;
  const size = Math.min(50 * u, tmFit(cols + 2.8, 9.95, Math.min(aw, 900 * u), A.h - tagH - capH, { lh: 1.4 }));
  const cw = tmCW(size), lh = size * 1.4, tw = cols * cw, pw = tw + 2.8 * cw, ph = 9.95 * lh;
  const px = A.x0 + (aw - pw) / 2, py = A.y0 + tagH + Math.max(0, (A.h - tagH - capH - ph) / 2);
  return { A, G: tmGrid(px + 1.4 * cw, py + 1.2 * lh, size, 1.4), pane: { x: px, y: py, w: pw, h: ph }, cols };
}
function dmDoneRect() {   // the solid film.mp4 block (rows 5-6): the bridge object
  const { G, cols } = dmL();
  return [G.X(0) - 0.6 * G.cw, G.Y(5) - G.top - 0.1 * G.size, (cols + 1.2) * G.cw, G.Y(6) - G.Y(5) + tmCellH(G.size) + 0.2 * G.size, 10 * UNIT];
}

function sceneBuild() {
  const { G, pane, cols } = dmL(), u = UNIT, open = seg(TT, cu.open, cu.open + 0.45);
  tmTag('01 build');
  tmPane(pane.x, pane.y, pane.w, pane.h, { open, title: '~/film', titleSize: G.size * 0.92, right: '80x24', inner: () => {
    // row 0: the critter is the prompt; it watches the output, then cheers the block
    const watch = TT >= cu.enter ? clamp((TT - cu.enter) / 0.2) : 0, glad = TT >= cu.done + 0.1;
    tmPrompt(G, 0, DM_CMD, cu.type, { cps: 12, key: 'dmcmd', enter: cu.enter, heroK: 1.12,
      heroO: { look: glad ? 0.4 : watch * 0.7, lookY: watch, mood: glad ? 'happy' : 'idle', squash: glad ? Math.exp(-(TT - cu.done - 0.1) * 9) : undefined } });
    const tick = (r, t) => { if (TT >= t) tmLine(G, r, [[cols - 1, '✓', TM.sage, { wt: 700, pop: t }]]); };
    // rows 1-4: the build prints line by line
    tmLine(G, 1, [[0, '▸', TM.amber, { wt: 700 }], [2, 'scenes', TM.cream, { wt: 700 }], [12, '4', TM.text]], cu.l1); tick(1, cu.l1 + 0.1);
    tmLine(G, 2, [[0, '▸', TM.amber, { wt: 700 }], [2, 'score', TM.cream, { wt: 700 }], [12, '120 bpm', TM.text]], cu.l2); tick(2, cu.l2 + 0.1);
    if (tmLine(G, 3, [[0, '▸', TM.amber, { wt: 700 }], [2, 'frames', TM.cream, { wt: 700 }]], cu.l3)) {
      const f = EZ.io(seg(TT, cu.l3, cu.full));
      tmBar(G.X(10), G.Y(3), G.size, 9, f);
      if (TT < cu.full) tmSpin(G.X(cols - 1), G.Y(3), G.size, TM.amber, { t0: cu.l3 }); else tick(3, cu.full);
      tmText(`${String(Math.round(144 * f)).padStart(3)}/144 · 24 fps`, G.X(2), G.Y(4), G.size, TM.dim);
    }
    // rows 5-6: the film lands as a solid block of characters
    if (TT >= cu.done - 1e-6) {
      const [x, y, w, h, r] = dmDoneRect(), k = 1 + 0.12 * (1 - EZ.o3(seg(TT, cu.done, cu.done + 0.18)));
      ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(k, k); ctx.translate(-x - w / 2, -y - h / 2);
      tmBox(x, y, w, h, { fill: TM.amber, line: false, r: r / UNIT, shadow: 10 * u });
      tmText('■', G.X(0), G.Y(5), G.size, TM.ground);
      tmText('film.mp4', G.X(2), G.Y(5), G.size, TM.ground, { wt: 700 });
      tmText('6.0s · 144 frames', G.X(2), G.Y(6), G.size, TM.ground);
      ctx.restore();
    }
    // row 8: the status line (a clock that runs from enter to done)
    const run = TT >= cu.enter, done = TT >= cu.done, el = run ? Math.min(TT, cu.done) - cu.enter : 0;
    tmStatus(G.X(0) - 0.8 * G.cw, G.Y(8), (cols + 1.6) * G.cw, G.size * 0.72, [
      done ? { s: 'DONE', c: TM.ground, bg: TM.sage, wt: 700 } : run ? { s: 'RUN ', c: TM.ground, bg: TM.amber, wt: 700 } : { s: 'IDLE', c: TM.dim, bg: TM.faint, wt: 700 },
      { s: 'film', c: TM.text }, { s: 'main', c: TM.dim },
    ], { right: [{ s: `${el.toFixed(1)}s`, c: TM.text }] });
  } });
  tmCaption('type the command');
}

// ---- era 2 layout: three boxes, a column on tall and square frames, a row on wide ones -------------------------------
function dmBoxes() {
  const A = tmArea(), u = UNIT, right = A.rail ? A.xr : A.x1, top = A.y0 + 120 * u, bot = A.y1 - 140 * u;
  let R;
  if (WIDE) {
    const gap = 140 * u, bw = Math.min(470 * u, (right - A.x0 - 2 * gap) / 3), bh = bw * 0.4, x0 = (A.x0 + right) / 2 - (3 * bw + 2 * gap) / 2, y = (top + bot) / 2 - bh / 2;
    R = [0, 1, 2].map((i) => [x0 + i * (bw + gap), y, bw, bh, 12 * u]);
  } else {
    const gap = 110 * u, bw = Math.min(560 * u, right - A.x0 - 60 * u), bh = Math.min(170 * u, (bot - top - 2 * gap) / 3), x = (A.x0 + right) / 2 - bw / 2, y0 = (top + bot) / 2 - (3 * bh + 2 * gap) / 2;
    R = [0, 1, 2].map((i) => [x, y0 + i * (bh + gap), bw, bh, 12 * u]);
  }
  const size = Math.min(64 * u, R[0][2] / (12 * TM_M.cw));
  return { R, size };
}
// where the critter sits on box i (feet on its top edge, right of centre)
const dmSeat = (R, s) => [R[0] + R[2] * 0.76, R[1] - s / 2];

function scenePipe() {
  const { R, size } = dmBoxes(), u = UNIT, s = size * 1.15, landed = TT >= cu.land;
  tmTag('02 ship');
  // the arrows between the boxes, dashes flowing toward film.mp4
  for (let i = 0; i < 2; i++) {
    const a = R[i], b = R[i + 1];
    if (WIDE) tmArrow(a[0] + a[2] + 14 * u, a[1] + a[3] / 2, b[0] - 14 * u, b[1] + b[3] / 2, { flow: 46 * u, c: TM.edge, headC: TM.amber });
    else tmArrow(a[0] + a[2] / 2, a[1] + a[3] + 14 * u, b[0] + b[2] / 2, b[1] - 14 * u, { flow: 46 * u, c: TM.edge, headC: TM.amber });
  }
  // the boxes: brief.md, frames (a spinner until the critter passes), film.mp4 (amber, sage once it passes)
  const cw = tmCW(size), mid = (r) => r[1] + r[3] / 2 + TM_M.cap * size / 2, lx = (r) => r[0] + cw * 1.2;
  tmBox(...R[0].slice(0, 4), { r: 12, title: 'in', titleSize: size * 0.62, titleC: TM.dim, shadow: 10 * u, fill: TM.pane });
  tmText('brief.md', lx(R[0]), mid(R[0]), size, TM.cream, { wt: 700 });
  tmBox(...R[1].slice(0, 4), { r: 12, title: 'make', titleSize: size * 0.62, titleC: TM.dim, shadow: 10 * u, fill: TM.pane });
  tmText('frames', lx(R[1]), mid(R[1]), size, TM.cream, { wt: 700 });
  if (TT < cu.hop2) tmSpin(R[1][0] + R[1][2] - cw * 2.2, mid(R[1]), size, TM.amber);
  else tmLine({ size, X: () => R[1][0] + R[1][2] - cw * 2.2, Y: () => mid(R[1]) }, 0, [[0, '✓', TM.sage, { wt: 700, pop: cu.hop2 }]]);
  const k = 1 + 0.1 * (1 - EZ.o3(seg(TT, cu.land, cu.land + 0.2))), b = R[2];
  ctx.save(); ctx.translate(b[0] + b[2] / 2, b[1] + b[3] / 2); ctx.scale(k, k); ctx.translate(-b[0] - b[2] / 2, -b[1] - b[3] / 2);
  tmBox(...b.slice(0, 4), { r: 12, fill: landed ? TM.sage : TM.amber, line: false, shadow: 10 * u });
  tmText(landed ? '✓' : '■', lx(b), mid(b), size, TM.ground, { wt: 700 });
  tmText('film.mp4', lx(b) + 2 * cw, mid(b), size, TM.ground, { wt: 700 });
  ctx.restore();
  // the critter: on brief.md, hops to frames, then to film.mp4 and cheers
  const seat = R.map((r) => dmSeat(r, s)), h1 = seg(TT, cu.hop1, cu.hop1 + 0.3), h2 = seg(TT, cu.hop2, cu.hop2 + 0.3);
  let p = seat[0], hop = 0;
  if (TT >= cu.hop2) { p = [lerp(seat[1][0], seat[2][0], EZ.io(h2)), lerp(seat[1][1], seat[2][1], EZ.io(h2))]; hop = h2; }
  else if (TT >= cu.hop1) { p = [lerp(seat[0][0], seat[1][0], EZ.io(h1)), lerp(seat[0][1], seat[1][1], EZ.io(h1))]; hop = h1; }
  const sq = Math.max(TT >= cu.hop1 + 0.3 ? Math.exp(-(TT - cu.hop1 - 0.3) * 10) : 0, TT >= cu.land ? Math.exp(-(TT - cu.land) * 9) : 0);
  tmCritter(p[0], p[1], s, { key: 'dmcmd', hop: hop < 1 ? hop : 0, hopH: 1.1, squash: sq, mood: landed && TT < cu.land + 0.9 ? 'happy' : hop > 0 && hop < 1 ? 'wow' : 'idle', look: WIDE ? 0.6 : 0, lookY: WIDE ? 0 : 0.8 });
  tmCaption('brief in, film out');
}
