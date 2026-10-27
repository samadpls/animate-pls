  // SCORE BODY — chalkboard demo (inside buildScore(); see kit/score-head.js). A soft pad; a chalk tick for each ghost
  // of the falling apple, a low thud as it lands, scratches as things are written; a chime on the morph; a warmer pad.
  const cu = TIMELINE.cues;
  to = 'm';
  pad(0.0, 3.1, ['D3', 'A3', 'E4'], 0.028, { type: 'triangle', cut: 1100, att: 0.3, rel: 0.3, send: 0.45 });
  for (let k = 1; k <= 4; k++) pluck(cu.drop + k * 0.15, nz(['A4', 'Fs4', 'D4', 'A3'][k - 1]), 0.07, -0.2 + k * 0.1, 0.4, 2200, 0.35);
  chime(M1, [nz('D5'), nz('A5'), nz('Fs6')], 0.07, 0);
  pad(M1, 6.05, ['D2', 'A2', 'Fs3', 'E4'], 0.036, { cut: 900, att: 0.3, rel: 0.4, send: 0.5 });
  pluck(cu.arrows, nz('A4'), 0.08, 0.2, 0.5, 2200, 0.4); pluck(cu.arrows + E8, nz('D5'), 0.07, -0.2, 0.5, 2200, 0.4);
  to = 's';
  sub(cu.land, 0.12); noiseHit(cu.land, 0.08, 'lowpass', 500, 1, 0.08, 0);
  for (let i = 0; i < 5; i++) noiseHit(cu.g + i * 0.08, 0.05, 'bandpass', 3600, 2.4, 0.022, 0.2);
  sweep(2.5, 3.0, 0.01, 600, 2600, 0);
  for (let i = 0; i < 8; i++) noiseHit(cu.orbit + i * 0.1, 0.05, 'bandpass', 3400, 2.2, 0.018, -0.3 + i * 0.08);
