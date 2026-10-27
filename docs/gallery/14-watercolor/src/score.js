  // SCORE BODY — gallery tile 19 (inside buildScore(); see kit/score-head.js). Gentle (the montage brings its own
  // music): an airy pad and the sea, a soft chime as each clock face blooms (three hours, three notes), three tiny hops,
  // then a warm chord when the sparrow lands by the Karachi clock, held under the calm.
  const T = TIMELINE, cu = T.cues, LAND = cu.hop[2] + 0.34;
  to = 'm';
  pad(0.0, 3.05, ['D3', 'A3', 'Fs4'], 0.016, { type: 'triangle', cut: 900, att: 0.5, rel: 0.4, send: 0.5 });
  pad(LAND, 3.05, ['D3', 'A3', 'E4', 'Fs4', 'B4'], 0.02, { type: 'triangle', cut: 1000, att: 0.12, rel: 0.4, send: 0.5 });
  to = 's';
  sweep(0.0, 1.2, 0.004, 300, 900, -0.3);   // the sea
  cu.faces.forEach((t, i) => chime(t, [nz(['A5', 'Fs5', 'D5'][i]), nz(['E6', 'Cs5', 'A5'][i])], 0.016, -0.4 + i * 0.4));
  cu.hop.forEach((t, i) => blip(t + 0.34, 1600 + i * 120, 1200, 0.03, 0.006, -0.1 + i * 0.1));
  chime(LAND + 0.05, [nz('D5'), nz('Fs5'), nz('A5')], 0.014, 0);
