  // SCORE BODY — linocut demo (inside buildScore(); see kit/score-head.js). A low swell and wind by day, a hush
  // through the morph, then a chord with a sub as the night opens, a chime as the window lights, a pluck on landing.
  const T = TIMELINE, cu = T.cues, HIT = M1 + 0.25;
  to = 'm';
  pad(0.0, 2.6, ['D3', 'A3', 'F4'], 0.02, { type: 'triangle', cut: 900, att: 0.4, rel: 0.2 });
  ['D4', 'A4', 'F5'].forEach((n, i) => pluck(HIT + i * 0.012, nz(n), 0.12, -0.3 + i * 0.3, 0.45, 2600, 0.35));
  sub(HIT, 0.1);
  pad(HIT, 6.05, ['D3', 'A3', 'C4', 'F4'], 0.026, { cut: 800, att: 0.2, rel: 0.3, send: 0.5 });
  to = 's';
  noiseHit(0.1, 2.3, 'bandpass', 420, 0.8, 0.016, -0.3);
  sweep(cu.rise, cu.crest, 0.012, 200, 1000, -0.2);
  chime(cu.lamp, [nz('A5'), nz('E6')], 0.018, 0.3);
  pluck(cu.land, nz('D5'), 0.08, 0.2, 0.3, 3000, 0.3);
