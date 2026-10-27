  // SCORE BODY — comic demo (inside buildScore(); see kit/score-head.js): a light pad, a bell trill while the clock
  // rings, a jolt as the hero wakes, a riser into the morph and a bright pad with a whoosh on the rooftops.
  const T = TIMELINE, cu = T.cues;
  to = 'm';
  pad(0.0, 3.1, ['D3', 'A3', 'E4'], 0.03, { type: 'triangle', cut: 1100, att: 0.3, rel: 0.3, send: 0.4 });
  pluck(cu.wake, nz('D5'), 0.12, 0, 0.4, 2800, 0.3);
  pad(M1, 6.05, ['D2', 'A2', 'Fs3', 'A4'], 0.04, { cut: 1000, att: 0.2, rel: 0.4, send: 0.5 });
  chime(M1, [nz('D5'), nz('A5'), nz('Fs6')], 0.08, 0);
  to = 's';
  for (let i = 0; i < 12; i++) blip(cu.ring + i * E16 / 2, 2400 + (i % 2) * 300, 2300, 0.02, 0.03, 0.3);
  sub(cu.wake, 0.12);
  sweep(2.5, 3.0, 0.012, 500, 3000, 0);
  noiseHit(cu.whoosh, 0.5, 'bandpass', 900, 1.2, 0.06, -0.2, 0.2, 2600);
