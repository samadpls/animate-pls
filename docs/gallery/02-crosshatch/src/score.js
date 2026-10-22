  // SCORE BODY — Querypls tile (inside buildScore(); see kit/score-head.js): one soft pad, a few typing blips
  const T = TIMELINE, cu = T.cues;
  to = 'm';
  pad(0.0, 3.05, ['D3', 'A3', 'Fs4'], 0.035, { type: 'triangle', cut: 900, att: 0.3, rel: 0.4, send: 0.4 });
  to = 's';
  for (let i = 0; i < 10; i++) blip(cu.type + i * E16, 1300 + (i % 3) * 300, 1100, 0.025, 0.04);   // the SQL typing
