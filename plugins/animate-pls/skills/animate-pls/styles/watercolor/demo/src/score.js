  // SCORE BODY — watercolor demo (inside buildScore(); see kit/score-head.js). Quiet and airy: a soft pad and water
  // plucks over the harbour, a hush as the sun becomes an orange, then a warm chord as the kitchen opens, three soft
  // hops and a small chime when the sparrow reaches the orange.
  const T = TIMELINE, cu = T.cues, HIT = M1 + 0.25;
  to = 'm';
  pad(0.0, 2.45, ['D3', 'A3', 'Fs4'], 0.02, { type: 'triangle', cut: 1000, att: 0.5, rel: 0.2, send: 0.5 });
  [['A4', 0.5], ['Fs4', 1.0], ['D5', 1.5], ['A4', 2.0]].forEach(([n, t], i) => pluck(t, nz(n), 0.07, -0.3 + i * 0.2, 0.6, 2200, 0.5));
  ['D4', 'Fs4', 'A4', 'E5'].forEach((n, i) => pluck(HIT + i * 0.012, nz(n), 0.12, -0.3 + i * 0.2, 0.45, 3200, 0.35));
  sub(HIT, 0.1);
  pad(HIT, 6.05, ['D3', 'A3', 'E4', 'Fs4'], 0.026, { type: 'triangle', cut: 900, att: 0.2, rel: 0.3, send: 0.5 });
  to = 's';
  sweep(2.5, 2.95, 0.008, 500, 2200, 0);
  cu.hop.forEach((t, i) => { noiseHit(t + 0.34, 0.04, 'bandpass', 2600 + i * 200, 2, 0.025, 0.2); blip(t, 900 + i * 120, 1300 + i * 120, 0.06, 0.012, 0.2); });
  chime(cu.hop[2] + 0.4, [nz('A5'), nz('E6')], 0.02, 0.2);
