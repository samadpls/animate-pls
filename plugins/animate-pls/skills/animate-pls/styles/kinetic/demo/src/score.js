  // SCORE BODY — kinetic demo (inside buildScore(); see kit/score-head.js). Night: a soft pad and a light tap under
  // each word, a snap on the flip, a swish into the morph. Day: silence while the box counts up (the held breath),
  // the loudest hit as it lands on 120 (a stab and a sub), then a flat warm chord and quieter taps for the rows.
  const T = TIMELINE, cu = T.cues;
  to = 'm';
  pad(0.0, 2.7, ['E3', 'B3', 'D4'], 0.02, { type: 'triangle', cut: 900, att: 0.05, rel: 0.15 });
  for (let i = 0; i < 5; i++) bass(i * BEAT, nz(i % 2 ? 'B1' : 'E2'), 0.08);
  ['A3', 'Cs4', 'E4', 'A4'].forEach((n, i) => pluck(cu.hit, nz(n), 0.3, -0.2 + i * 0.13, 0.45, 3400, 0.3));   // the stab
  pad(cu.hit, 6.05, ['A2', 'E3', 'Cs4', 'E4'], 0.03, { cut: 1400, att: 0.08, rel: 0.3, send: 0.4 });
  [['A4', 0], ['Cs5', E8], ['E5', BEAT]].forEach(([n, dt], i) => pluck(cu.second + dt, nz(n), 0.08, -0.2 + i * 0.2, 0.5, 3000, 0.35));
  to = 's';
  [cu.type, cu.that, cu.moves].forEach((t) => { sub(Math.max(0, t), 0.12); noiseHit(Math.max(0, t), 0.04, 'highpass', 5000, 0.7, 0.035); });
  noiseHit(cu.pops - 0.04, 0.05, 'bandpass', 2400, 3, 0.05);        // the flip
  sweep(cu.box, cu.box + 0.18, 0.007, 900, 4200, 0.1);              // the swipe
  sub(cu.land, 0.16); noiseHit(cu.land, 0.06, 'lowpass', 900, 1, 0.06);   // the stamp
  sweep(2.5, 2.85, 0.007, 600, 3200, 0);                             // into the morph, done before it lands
  sub(cu.hit, 0.6); noiseHit(cu.hit, 0.1, 'lowpass', 1400, 1, 0.12);   // the payoff
  [cu.beats, cu.frames, cu.second].forEach((t) => sub(t, 0.12));
  [cu.hop, cu.hop + BEAT].forEach((t) => blip(t, 700, 1400, 0.08, 0.03));
