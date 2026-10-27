  // SCORE BODY — gallery tile 15 (inside buildScore(); see kit/score-head.js). Gentle: a warm pad, the click from
  // the recording's own click event, soft ticks while the frames render, a chime as the video appears.
  const q = TIMELINE.cues;
  to = 'm';
  pad(0.0, LOOP_T + 0.3, ['D3', 'A3', 'Fs4'], 0.024, { type: 'triangle', cut: 1400, att: 0.35, rel: 0.6, send: 0.5 });
  pad(q.done - 0.1, LOOP_T + 0.3, ['A3', 'D4', 'E4'], 0.016, { type: 'triangle', cut: 1800, att: 0.4, rel: 0.6, send: 0.6 });
  chime(q.done, [nz('D5'), nz('Fs5'), nz('A5')], 0.08, 0.1);
  to = 's';
  for (const e of ftEvents('app', 'click')) { const t = ftOut('app', e.t); if (t != null && t > 0) { noiseHit(t, 0.025, 'highpass', 2600, 0.8, 0.05, 0.1); blip(t, 1500, 900, 0.03, 0.03, 0.1); } }
  for (let i = 0; i < 8; i++) blip(1.0 + i * 0.13, 2400 + (i % 3) * 160, 2100, 0.01, 0.012, i % 2 ? 0.15 : -0.1);   // frames rendering
  noiseHit(q.tag2, 0.08, 'bandpass', 2400, 1.4, 0.03, 0.2);                                                    // the tag lands
