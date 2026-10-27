  // SCORE BODY — gallery tile 20 (inside buildScore(); see kit/score-head.js). Gentle: a low warm pad, soft key
  // clicks on the very times the command is typed, a muted tap per printed tier, a light tick per check, a small
  // chime when CI passes and a blip as the critter lands.
  const cu = TIMELINE.cues;
  to = 'm';
  pad(0.0, 3.05, ['D3', 'A3', 'E4'], 0.02, { type: 'triangle', cut: 1000, att: 0.3, rel: 0.4, send: 0.4 });
  [cu.gate, cu.judge, cu.media].forEach((t, i) => pluck(t, nz(['D4', 'A3', 'A3'][i]), 0.05, -0.2 + i * 0.2, 0.4, 1800, 0.3));
  chime(cu.pass, [nz('D5'), nz('A5'), nz('Fs6')], 0.06, 0.1);
  to = 's';
  tmTypeTimes('run evals', cu.type, 15, 'evcmd').forEach((t, i) => noiseHit(t, 0.025, 'bandpass', 3200 + (i % 3) * 500, 2.5, 0.05, -0.2 + (i % 4) * 0.1));
  noiseHit(cu.enter, 0.05, 'bandpass', 1800, 2, 0.07);
  [cu.c1, cu.c2, cu.c3].forEach((t, i) => blip(t + 0.08, 1300 + i * 180, 1700 + i * 180, 0.04, 0.025, 0.1));
  blip(cu.land, 520, 900, 0.07, 0.03, -0.1);
