  // SCORE BODY — gallery tile 12 (inside buildScore(); see kit/score-head.js). Gentle: a soft pad, the switch's click,
  // a rising pluck as the wagon rolls, one chime as it arrives.
  const cu = TIMELINE.cues;
  to = 'm';
  pad(0.0, 3.05, ['D3', 'A3', 'E4'], 0.026, { type: 'triangle', cut: 1200, att: 0.35, rel: 0.4, send: 0.5 });
  pluck(cu.go, nz('A4'), 0.09, -0.2, 0.5, 2200, 0.4);
  pluck(cu.go + E8, nz('D5'), 0.08, 0.1, 0.5, 2200, 0.4);
  chime(cu.arrive, [nz('D5'), nz('A5'), nz('Fs6')], 0.06, 0.3);
  to = 's';
  noiseHit(cu.throw + 0.2, 0.05, 'bandpass', 2600, 3, 0.05, -0.3);
  blip(cu.throw + 0.25, 700, 1100, 0.05, 0.035, -0.3);
