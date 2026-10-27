  // SCORE BODY — terminal demo (inside buildScore(); see kit/score-head.js). Build: a low pad, key clicks on the very
  // times the command is typed, a soft tap per printed line, light ticks while the bar fills, a swish into the morph.
  // Ship: almost silent while the critter hops (two blips), then the loudest hit as it lands on film.mp4 (a stab, a
  // sub and a chime) and a flat warm chord to the end.
  const cu = TIMELINE.cues;
  to = 'm';
  pad(0.0, 2.9, ['D3', 'A3', 'E4'], 0.018, { type: 'triangle', cut: 900, att: 0.4, rel: 0.3, send: 0.4 });
  [cu.l1, cu.l2, cu.l3].forEach((t, i) => pluck(t, nz(['D4', 'E4', 'A4'][i]), 0.06, -0.2 + i * 0.2, 0.35, 1800, 0.3));
  ['D4', 'Fs4', 'A4', 'D5'].forEach((n, i) => pluck(cu.land, nz(n), 0.26, -0.24 + i * 0.16, 0.5, 3200, 0.35));   // the stab
  chime(cu.land + 0.02, [nz('D5'), nz('A5'), nz('Fs6')], 0.08, 0.1);
  pad(cu.land, 6.05, ['D3', 'A3', 'Fs4'], 0.024, { cut: 1300, att: 0.06, rel: 0.4, send: 0.45 });
  to = 's';
  tmTypeTimes('make film', cu.type, 12, 'dmcmd').forEach((t, i) => noiseHit(t, 0.025, 'bandpass', 3000 + (i % 3) * 500, 2.5, 0.05, -0.2 + (i % 4) * 0.1));
  noiseHit(cu.enter, 0.05, 'bandpass', 1800, 2, 0.07);
  for (let t = cu.l3 + 0.1; t < cu.full; t += E8 / 2) blip(t, 1500, 1600, 0.02, 0.012, 0.2);
  noiseHit(cu.done, 0.06, 'lowpass', 900, 1, 0.08);
  sweep(2.5, 2.9, 0.006, 700, 3600, 0);
  [cu.hop1, cu.hop2].forEach((t, i) => blip(t, 500 + i * 150, 900 + i * 150, 0.07, 0.03, -0.15 + i * 0.3));
  sub(cu.land, 0.55); noiseHit(cu.land, 0.08, 'lowpass', 1400, 1, 0.1);
