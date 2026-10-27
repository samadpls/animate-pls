  // SCORE BODY — gallery tile 16 (inside buildScore(); see kit/score-head.js). Gentle (the montage brings its own
  // music): a soft pad; two plucks together on the shout (two edits at once), a little pop as the T comes out,
  // a strike, then a snap with a small chime as the X lands and a warmer pad under the calm hold.
  const T = TIMELINE, cu = T.cues;
  to = 'm';
  pad(0.0, 2.05, ['D3', 'A3', 'E4'], 0.016, { type: 'triangle', cut: 1000, att: 0.3, rel: 0.3, send: 0.5 });
  pluck(cu.shout, nz('A4'), 0.07, -0.4, 0.4, 2600, 0.3);
  pluck(cu.shout, nz('D5'), 0.07, 0.4, 0.4, 2600, 0.3);
  pluck(cu.ins + 0.12, nz('Fs4'), 0.05, 0.2, 0.35, 2200, 0.3);
  pad(cu.snap, 3.05, ['D2', 'A3', 'Fs4', 'A4'], 0.02, { cut: 900, att: 0.1, rel: 0.4, send: 0.5 });
  to = 's';
  blip(cu.pop, 900, 420, 0.06, 0.03, -0.3);
  noiseHit(cu.strike, 0.07, 'bandpass', 3200, 2, 0.03, 0.2);
  noiseHit(cu.snap, 0.05, 'highpass', 2600, 1, 0.05, 0.3);
  sub(cu.snap, 0.05);
  chime(cu.snap + 0.06, [nz('D5'), nz('A5'), nz('Fs6')], 0.016, 0.3);
