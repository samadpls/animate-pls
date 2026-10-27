  // SCORE BODY — gallery tile 11 (inside buildScore(); see kit/score-head.js). Gentle: a soft pad, a muted tap
  // under each row that lands, a soft snap on the flip and a small chord when BETTER is boxed.
  const cu = TIMELINE.cues;
  to = 'm';
  pad(0.0, 3.05, ['D3', 'A3', 'E4'], 0.022, { type: 'triangle', cut: 1100, att: 0.3, rel: 0.4, send: 0.4 });
  [['D5', 0], ['Fs5', E16], ['A5', E8]].forEach(([n, dt], i) => pluck(cu.box + dt, nz(n), 0.07, -0.15 + i * 0.15, 0.6, 2600, 0.4));
  to = 's';
  [cu.test, cu.leave, cu.asis].forEach((t) => noiseHit(t, 0.04, 'lowpass', 1400, 0.8, 0.05));
  noiseHit(cu.strike, 0.18, 'bandpass', 3000, 2, 0.02, 0, 0, 5000);
  noiseHit(cu.flip - 0.04, 0.05, 'bandpass', 2200, 3, 0.04);
  blip(cu.hop, 600, 1100, 0.08, 0.03);
