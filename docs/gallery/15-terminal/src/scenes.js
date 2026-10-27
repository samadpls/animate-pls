// =====================================================================
//  SCENES — gallery tile 20 (terminal). World = screen (no camera). Time TT on 1s.
//  One pane on the warm black; every line that must read is 60px monospace inside the 60px margin.
//  Rows: 0 the prompt (the critter, `run evals`), 1 the code tier + GATE, 2-4 its three checks, 5 the LLM-judge tier,
//  6 the multimodal tier (both "review", spinners still turning), 7 CI passed, 8 the next prompt. A status line below.
// =====================================================================
const cu = TIMELINE.cues;
const EV_CMD = 'run evals';

function evGrid() { return tmGrid(100, 202, 60, 1.268); }
// a "review" label: dim text in a hairline box (it informs a human; it does not gate)
function evReview(G, r, t) {
  if (TT < t - 1e-6) return;
  const c = 17, x = G.X(c), y = G.Y(r), n = 6;
  ctx.save(); ctx.strokeStyle = TM.edge; ctx.lineWidth = 2.5; ctx.strokeRect(x - G.cw * 0.4, y - G.top - 2, (n + 0.8) * G.cw, tmCellH(G.size) + 4); ctx.restore();
  tmText('review', x, y, G.size, TM.dim);
  tmSpin(G.X(15), y, G.size, TM.amberD ?? TM.amber, { t0: t, rate: 8 });
}
// a check under the code tier: tree line, a spinner for a moment, then the tick
function evCheck(G, r, str, t, last) {
  if (TT < t - 1e-6) return;
  tmText(last ? '└─' : '├─', G.X(2), G.Y(r), G.size, TM.faint);
  if (TT < t + 0.08) tmSpin(G.X(5), G.Y(r), G.size, TM.amber, { t0: t, rate: 24 });
  else tmLine(G, r, [[5, '✓', TM.sage, { wt: 700, pop: t + 0.08 }]]);
  tmText(str, G.X(7), G.Y(r), G.size, TM.text);
}

function sceneEvals() {
  const G = evGrid(), u = UNIT;
  // the pane, already on at frame 0, with the post's title set into its top edge
  tmPane(52, 106, 976, 878, { title: 'evals: three systems', titleSize: 60, titleC: TM.cream, r: 16, shadow: 16 });
  // a faint gutter rule left of the text column and a dashed rule under the prompt (background structure)
  ctx.save(); ctx.strokeStyle = TM.faint; ctx.globalAlpha = 0.5; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(78, 240); ctx.lineTo(78, 700); ctx.stroke(); ctx.restore();

  // row 0: the prompt. The critter is the prompt until it hops down to row 8 (a $ stays behind)
  const hop = seg(TT, cu.hop, cu.land), gone = TT >= cu.hop;
  const watch = TT >= cu.enter ? clamp((TT - cu.enter) / 0.2) : 0;
  tmPrompt(G, 0, EV_CMD, cu.type, { cps: 15, key: 'evcmd', heroK: 1.18, enter: cu.enter, hero: !gone, sym: '$',
    heroO: { look: watch * 0.8, lookY: watch * 0.9, mood: TT >= cu.pass && TT < cu.hop ? 'wow' : 'idle' } });

  // row 1: the code tier, gated
  tmLine(G, 1, [[0, '▸', TM.amber, { wt: 700 }], [2, 'code checks', TM.cream, { wt: 700 }]], cu.gate);
  tmLine(G, 1, [[18, 'GATE', TM.ground, { wt: 700, bg: TM.amber, pop: cu.gate + 0.04 }]], cu.gate + 0.04);
  // rows 2-4: plain code decides; each check ticks
  evCheck(G, 2, 'valid JSON', cu.c1);
  evCheck(G, 3, 'id exists in db', cu.c2);
  evCheck(G, 4, 'total within 2%', cu.c3, true);
  // rows 5-6: the judge and multimodal tiers go to review
  tmLine(G, 5, [[0, '▸', TM.amber, { wt: 700 }], [2, 'LLM judge', TM.cream, { wt: 700 }]], cu.judge);
  evReview(G, 5, cu.judge);
  tmLine(G, 6, [[0, '▸', TM.amber, { wt: 700 }], [2, 'multimodal', TM.cream, { wt: 700 }]], cu.media);
  evReview(G, 6, cu.media);

  // row 7: CI passed, stamped in on a sage chip
  if (TT >= cu.pass - 1e-6) {
    const k = 1 + 0.3 * (1 - EZ.o3(seg(TT, cu.pass, cu.pass + 0.2))), x = G.X(0), y = G.Y(7), w = 11 * G.cw, top = y - G.top;
    ctx.save(); const cx = x + w / 2, cy = top + tmCellH(G.size) / 2; ctx.translate(cx, cy); ctx.scale(k, k); ctx.translate(-cx, -cy);
    ctx.fillStyle = TM.shadow; ctx.fillRect(x - G.cw * 0.5 + 10, top + 10, w + G.cw, tmCellH(G.size));
    ctx.fillStyle = TM.sage; ctx.fillRect(x - G.cw * 0.5, top, w + G.cw, tmCellH(G.size));
    tmText('✓', x, y, G.size, TM.ground, { wt: 700 });
    tmText('CI passed', G.X(2), y, G.size, TM.ground, { wt: 700 });
    ctx.restore();
    tmText('merge ok', G.X(14), y, G.size, TM.dim, { count: (TT - cu.pass - 0.18) * 30 });
  }

  // row 8: the next prompt; the critter lands on it and the caret blinks beside it
  if (gone) {
    const y0 = G.Y(0) - G.top + tmCellH(G.size) * 0.55, y8 = G.Y(8) - G.top + tmCellH(G.size) * 0.55;
    if (hop < 1) {
      const e = EZ.io(hop), x = G.X(0) + G.cw + Math.sin(Math.PI * hop) * 54 * u;
      tmCritter(x, lerp(y0, y8, e), G.size * 1.18, { key: 'evcmd', hop, hopH: 0.9, mood: 'wow', look: 0, lookY: 1 });
    } else {
      tmPrompt(G, 8, '', cu.land, { key: 'evcmd', heroK: 1.18, heroO: { squash: Math.exp(-(TT - cu.land) * 9), mood: TT < cu.land + 0.55 ? 'happy' : 'idle' } });
    }
  }

  // the status line: RUN while it runs, PASS once CI passes; a clock that stops when CI does; the gate count
  const sz = 40, run = TT >= cu.enter, pass = TT >= cu.pass, el = run ? Math.min(TT, cu.pass) - cu.enter : 0;
  const ticks = [cu.c1, cu.c2, cu.c3].filter((t) => TT >= t + 0.08).length;
  tmStatus(76, 940, 928, sz, [
    pass ? { s: 'PASS', c: TM.ground, bg: TM.sage, wt: 700 } : run ? { s: 'RUN ', c: TM.ground, bg: TM.amber, wt: 700 } : { s: 'IDLE', c: TM.dim, bg: TM.faint, wt: 700 },
    { s: 'evals', c: TM.text }, { s: 'main', c: TM.dim },
  ], { right: [{ s: `${el.toFixed(2)}s`, c: TM.text }, { s: `gate ${ticks}/3`, c: pass ? TM.sage : TM.dim }] });
}
