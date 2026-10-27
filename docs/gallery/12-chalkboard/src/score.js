  // SCORE BODY — gallery tile 17 (inside buildScore(); see kit/score-head.js). Gentle: a soft pad; on every clock
  // edge a chalk tap and a pluck that climbs; the scratch of chalk as things are written; one chime as the loop closes.
  const cu = TIMELINE.cues;
  to = 'm';
  pad(0.0, 3.05, ['D3', 'A3', 'E4'], 0.024, { type: 'triangle', cut: 1100, att: 0.3, rel: 0.45, send: 0.5 });
  [['D4', cu.tick3], ['Fs4', cu.tick4], ['A4', cu.tick5]].forEach(([n, t], i) => pluck(t, nz(n), 0.085 + i * 0.01, -0.2 + i * 0.2, 0.45, 2300, 0.35));
  chime(cu.loop + 0.42, [nz('D5'), nz('A5'), nz('E6')], 0.05, 0.2);
  to = 's';
  for (const t of [cu.tick3, cu.tick4, cu.tick5]) {
    noiseHit(t, 0.035, 'bandpass', 2200, 5, 0.06, 0.1);                            // the tap of the stick on the slate
    for (let i = 0; i < 3; i++) noiseHit(t + 0.03 + i * 0.06, 0.05, 'bandpass', 3600 + i * 300, 2.5, 0.022, -0.2 + i * 0.2);   // the scratch
  }
  for (let i = 0; i < 6; i++) noiseHit(cu.loop + i * 0.07, 0.06, 'bandpass', 3200, 2, 0.018, 0.3 - i * 0.1);   // the loop
  for (let i = 0; i < 5; i++) noiseHit(cu.note + i * 0.08, 0.05, 'bandpass', 3800, 2.2, 0.018, 0.2);     // the note
