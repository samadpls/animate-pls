  // SCORE BODY — gallery tile 18 (inside buildScore(); see kit/score-head.js). Gentle (the montage brings its own
  // music): a low swell and wind as the wave rises, a soft drum and a low chord as the red block rolls STORM in,
  // then a held fifth under the rain.
  const T = TIMELINE, cu = T.cues;
  to = 'm';
  pad(0.0, 1.6, ['D2', 'A2', 'D3'], 0.02, { type: 'triangle', cut: 700, att: 0.6, rel: 0.3, send: 0.4 });
  pad(cu.roll, 3.05, ['D2', 'A2', 'F3', 'A3'], 0.024, { cut: 900, att: 0.15, rel: 0.4, send: 0.5 });
  to = 's';
  noiseHit(0.0, 1.5, 'bandpass', 420, 0.8, 0.018, -0.3);
  sweep(0.2, 1.4, 0.012, 180, 900, -0.2);
  sub(cu.roll, 0.06);
  noiseHit(cu.roll, 0.12, 'lowpass', 300, 1.2, 0.05, 0.1);
  chime(cu.rolled + 0.05, [nz('D5'), nz('A5')], 0.014, 0.1);
  noiseHit(cu.rolled, 0.9, 'highpass', 3500, 0.7, 0.01, 0.4);
