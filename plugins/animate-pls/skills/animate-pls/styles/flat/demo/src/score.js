  // SCORE BODY — flat demo (inside buildScore(); see kit/score-head.js). Soft and round: a pad, plucks for the photons,
  // a chime on the morph, blips as the sugar cubes land.
  const T = TIMELINE, cu = T.cues;
  to = 'm';
  pad(0.0, 3.1, ['D3', 'A3', 'E4'], 0.032, { type: 'triangle', cut: 1100, att: 0.4, rel: 0.3, send: 0.45 });
  for (let i = 0; i < 6; i++) pluck(cu.beam + 0.15 + i * 0.42 + 0.95, nz(['A4', 'D5', 'E5', 'Fs5', 'A5', 'D6'][i]), 0.13, -0.3 + i * 0.12, 0.5, 2400, 0.4);
  chime(M1, [nz('D5'), nz('A5'), nz('Fs6')], 0.09, 0);
  sub(M1, 0.25);
  pad(M1, 6.05, ['D2', 'A2', 'Fs3', 'Cs5'], 0.04, { cut: 900, att: 0.25, rel: 0.4, send: 0.5 });
  to = 's';
  sweep(2.45, 3.0, 0.012, 600, 3200, 0);
  for (let i = 0; i < 6; i++) blip(cu.cubes + i * 0.38 + 0.7, 880 + i * 110, 1320 + i * 110, 0.05, 0.05, -0.3);
