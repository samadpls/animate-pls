  // SCORE BODY — clay demo (inside buildScore(); see kit/score-head.js). Thin early (a pad and soft clay pats on the
  // beat), a hush while the ball becomes the moon, then the payoff: a chord stab with a sub as the night opens, and a
  // flat night pad under the window chimes.
  const T = TIMELINE, cu = T.cues, HIT = M1 + 0.25;
  to = 'm';
  pad(0.0, 2.45, ['F3', 'C4', 'A4'], 0.022, { type: 'triangle', cut: 1000, att: 0.2, rel: 0.15 });
  ['D4', 'A4', 'F5', 'C6'].forEach((n, i) => pluck(HIT + i * 0.012, nz(n), 0.13, -0.3 + i * 0.2, 0.45, 3400, 0.35));
  sub(HIT, 0.12);
  pad(HIT, 6.05, ['D3', 'A3', 'F4', 'C5'], 0.03, { cut: 800, att: 0.15, rel: 0.3, send: 0.5 });
  to = 's';
  cu.pat.forEach((t, i) => { noiseHit(t, 0.06, 'lowpass', 520 + i * 40, 1.1, 0.03, -0.2); sub(t, 0.012); });
  chime(HIT + 0.1, [nz('A5'), nz('E6')], 0.02, 0.2);
  cu.lights.forEach((t, i) => blip(t, nz(['C6', 'D6', 'F6', 'A6'][i]), nz(['C6', 'D6', 'F6', 'A6'][i]) * 1.01, 0.08, 0.015, -0.4 + i * 0.25));
