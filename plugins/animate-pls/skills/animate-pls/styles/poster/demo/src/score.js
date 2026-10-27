  // SCORE BODY — poster demo (inside buildScore(); see kit/score-head.js): a warm pad, a rising pluck as the sun comes
  // up, a press thud as each headline stamps, a soft sweep into the morph, a sizzle and a fuller pad for breakfast.
  const T = TIMELINE, cu = T.cues;
  to = 'm';
  pad(0.0, M1 + 0.05, ['F3', 'C4', 'A4'], 0.022, { type: 'triangle', cut: 900, att: 0.4, rel: 0.25, send: 0.4 });
  [['F4', 0], ['A4', E8], ['C5', BEAT], ['F5', BEAT + E8]].forEach(([n, dt], i) => pluck(cu.rise + dt, nz(n), 0.04, -0.3 + i * 0.2, 0.5, 2400, 0.35));
  pad(M1, 6.05, ['Bb2', 'F3', 'D4', 'A4'], 0.045, { cut: 800, att: 0.3, rel: 0.3, send: 0.45 });
  to = 's';
  sub(cu.head + 0.06, 0.035); noiseHit(cu.head + 0.06, 0.08, 'lowpass', 520, 1.1, 0.04);
  sub(cu.head2 + 0.06, 0.09); noiseHit(cu.head2 + 0.06, 0.1, 'lowpass', 520, 1.1, 0.08);   // the payoff: the loudest press
  sweep(M1 - 0.5, M1 - 0.02, 0.01, 500, 2400, 0);
  for (let i = 0; i < 14; i++) noiseHit(cu.fry + i * E16 + (i % 3) * 0.01, 0.05, 'highpass', 5200, 0.8, 0.012, (i % 2 ? 0.3 : -0.3));
  chime(cu.head2 + 0.3, [nz('D5'), nz('F5'), nz('A5')], 0.018, 0.1);
