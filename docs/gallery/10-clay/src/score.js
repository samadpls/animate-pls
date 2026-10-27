  // SCORE BODY — gallery tile 13 (inside buildScore(); see kit/score-head.js). Gentle (the montage brings its own
  // music): a soft pad, faint key ticks while it types, then a low clay plop as the fourth block lands, a small chime
  // as it cheers and a warmer second pad layer under the calm hold.
  const T = TIMELINE, cu = T.cues;
  to = 'm';
  pad(0.0, 3.05, ['F3', 'C4', 'A4'], 0.018, { type: 'triangle', cut: 1000, att: 0.4, rel: 0.4, send: 0.5 });
  pad(cu.land, 3.05, ['F2', 'C4', 'E4', 'A4'], 0.022, { cut: 900, att: 0.12, rel: 0.4, send: 0.5 });
  to = 's';
  for (let i = 0; i < 11; i++) blip((i < 6 ? cu.type1 : cu.type2 - 0.48) + i * 0.08 + (i % 3) * 0.01, 1700 + (i % 3) * 180, 1300, 0.02, 0.006, -0.2);
  sub(cu.land, 0.06);
  noiseHit(cu.land, 0.09, 'lowpass', 420, 1.2, 0.05, 0.4);
  chime(cu.cheer + 0.08, [nz('C5'), nz('F5'), nz('A5')], 0.018, 0.3);
