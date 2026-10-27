  // SCORE BODY — gallery tile 21 (inside buildScore(); see kit/score-head.js). Gentle (the montage brings its own
  // music): a warm low pad, a soft press thud under each digit of the 100, a quick pluck run as the headline stamps,
  // a low chime when "on a slow day" lands, and a slow falling blip for the sun's yawn under the calm hold.
  const T = TIMELINE, cu = T.cues;
  to = 'm';
  pad(0.0, 3.05, ['F3', 'C4', 'A4'], 0.017, { type: 'triangle', cut: 900, att: 0.5, rel: 0.4, send: 0.5 });
  pad(cu.ribbon, 3.05, ['F2', 'C4', 'E4', 'A4'], 0.02, { cut: 800, att: 0.2, rel: 0.4, send: 0.5 });
  [['F4', 0], ['A4', E16], ['C5', E8], ['F5', E8 + E16]].forEach(([n, dt], i) => pluck(cu.head + dt, nz(n), 0.05, -0.3 + i * 0.2, 0.4, 2200, 0.35));
  to = 's';
  cu.digits.forEach((t, i) => { noiseHit(t + 0.06, 0.08, 'lowpass', 520, 1.1, 0.05 + i * 0.01, (i - 1) * 0.2); sub(t + 0.06, 0.03 + i * 0.008); });
  chime(cu.slow + 0.06, [nz('C5'), nz('F5'), nz('A5')], 0.016, 0.1);
  blip(cu.yawn, 620, 300, 0.45, 0.012, 0.2);
