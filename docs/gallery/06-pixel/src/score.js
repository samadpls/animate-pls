  // SCORE BODY — 06-pixel (inside buildScore(); see kit/score-head.js). A soft D-major pad under the ice, a
  // rising blip as each sensor lights (pitched by time), a faint noise streak for the track, a chime as the graph closes.
  const T = TIMELINE, cu = T.cues;
  to = 'm';
  pad(0.0, DURATION, ['D3', 'A3', 'Fs4'], 0.022, { cut: 900, att: 0.6, rel: 0.5, type: 'triangle', send: 0.5 });
  to = 's';
  sweep(T6_TR.t0, T6_TR.t1, 0.01, 900, 4200, -0.3);
  const scale = ['D5', 'E5', 'Fs5', 'A5', 'B5', 'D6', 'E6'];
  T6_HITS.forEach((h) => blip(h.th, nz(scale[Math.min(6, Math.floor(h.u * 7))]), nz(scale[Math.min(6, Math.floor(h.u * 7))]) * 1.5, 0.08, 0.02 + 0.02 * h.q, -0.6 + 1.2 * h.u));
  blip(cu.spot, 1200, 1900, 0.06, 0.04, 0.5);   // the '!'
  chime(cu.graph + 0.75, [nz('D5'), nz('A5'), nz('Fs5') * 2], 0.03, 0);
