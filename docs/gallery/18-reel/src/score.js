  // SCORE BODY — reel tile (inside buildScore(); see kit/score-head.js). Gentle: a soft pad, a pluck per served hit,
  // a soft chime as every key expires, a low rumble under the flood, the pad left alone for the hold.
  const T = TIMELINE, cu = T.cues;
  to = 'm';
  pad(0, LOOP_T - 0.05, ['D3', 'A3', 'F4'], 0.03, { type: 'triangle', cut: 900, att: 0.06, rel: 0.4, send: 0.3 });
  [0.15, 0.4, 0.62].forEach((t, i) => pluck(t, nz(['D4', 'F4', 'A4'][i]), 0.09, -0.2 + i * 0.2, 0.3, 2600, 0.25));
  chime(cu.expA, [nz('A4'), nz('D5'), nz('F5')], 0.12); bass(cu.expA, nz('D2'), 0.16);
  pad(cu.expA + 0.05, cu.hold, ['D2', 'A2', 'D3'], 0.03, { cut: 500, att: 0.4, rel: 0.3, send: 0.2 });
  to = 's';
  noiseHit(cu.expA + 0.5, 1.1, 'lowpass', 900, 0.7, 0.06, 0, 0.2, 260);
