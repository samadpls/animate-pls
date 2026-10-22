  // SCORE BODY — one take: AI engineer, today (inside buildScore(); see kit/score-head.js)
  // a dry warm pad on the desk with a pluck per note, a whoosh into the screen, a darker pad inside, a pluck per new ad
  const T = TIMELINE, cu = T.cues;
  to = 'm';
  pad(0.0, 2.1, ['D3', 'A3', 'Fs4'], 0.035, { type: 'triangle', cut: 900, att: 0.05, rel: 0.2 });
  pad(1.95, LOOP_T + 0.3, ['D2', 'A2', 'F3', 'C4'], 0.04, { cut: 700, att: 0.3, rel: 0.3, send: 0.4 });
  cu.notes.forEach((t, i) => pluck(t, nz(['D4', 'Fs4', 'A4'][i]), 0.1, -0.3 + i * 0.3, 0.4, 2800, 0.3));
  cu.cards.forEach((t, i) => pluck(t + 0.5, nz(['A4', 'D5'][i]), 0.09, 0.3, 0.35, 3400, 0.35));
  to = 's';
  sweep(1.0, 2.0, 0.012, 400, 2800, 0);                                                   // the push through the screen
  sub(2.0, 0.35);                                                                         // inside
  for (let i = 0; i < 8; i++) blip(2.0 + i * E8, 1500 + (i % 3) * 260, 1200, 0.03, 0.03);  // the scan
