  // SCORE BODY — one take (inside buildScore(); see kit/score-head.js)
  // soft and dry on the desk, a darker pad in the machine, a whoosh into each carry, a hard stop for the hush,
  // the loudest hit on the stamp, a warm pad for the pull back
  const T = TIMELINE, cu = T.cues;
  to = 'm';
  pad(0.0, 3.1, ['D3', 'A3', 'Fs4'], 0.035, { type: 'triangle', cut: 900, att: 0.05, rel: 0.2 });
  pad(3.0, 6.1, ['D2', 'A2', 'F3', 'C4'], 0.04, { cut: 700, att: 0.25, rel: 0.2, send: 0.4 });
  pad(6.0, cu.hush, ['D3', 'Fs3', 'A3'], 0.03, { cut: 900, att: 0.1, rel: 0.05 });
  [0, 1, 2, 3].forEach((i) => pluck(cu.fill + i * 0.35, nz(['D4', 'Fs4', 'A4', 'D5'][i]), 0.1, -0.3 + i * 0.2, 0.4, 2800, 0.3));   // the bar fills
  chime(cu.stamp, [nz('D4'), nz('Fs4'), nz('A4'), nz('D5')], 0.3); sub(cu.stamp, 0.9);                                         // shipped
  pad(cu.stamp + 0.1, 8.8, ['D3', 'A3', 'D4', 'Fs4'], 0.03, { cut: 1300, att: 0.3, rel: 0.4, send: 0.5 });
  pad(8.6, LOOP_T + 0.4, ['D3', 'A3', 'Fs4'], 0.011, { cut: 1000, att: 0.3, rel: 0.6, send: 0.5 });      // the pull back fades
  to = 's';
  for (let i = 0; i < 10; i++) noiseHit(cu.sketch + i * E8 * 0.75, 0.05, 'bandpass', 3800, 2, 0.04, -0.2);   // pencil scratches
  sweep(2.3, 3.0, 0.012, 400, 2800, 0);                                                                     // the push through the card
  for (let i = 0; i < 14; i++) blip(cu.type + i * E16, 1300 + (i % 3) * 300, 1100, 0.03, 0.04);           // typing
  sweep(5.4, 6.05, 0.011, 2600, 700, 0.2);                                                                  // the bar becomes the screen
