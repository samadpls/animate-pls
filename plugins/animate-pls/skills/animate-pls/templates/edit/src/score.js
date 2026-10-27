  // SCORE BODY — edit template (inside buildScore(); see kit/score-head.js). A calm bed under the recording; the
  // sounds come from the recorder's events (each key, the click, the app's answer), so a new take re-times them.
  // With the user's own audio (a voice-over, the recording's sound): tools/footage.mjs <piece> --mix, then
  // piece.json "voice": { "file": "footage/mix.wav", "music": -16 } puts this bed under it, ducked (see edit.md).
  const T = TIMELINE, q = T.cues;
  const at = (ref) => { const e = ftEvent('app', ref); return e ? { e, t: ftOut('app', e.t0 ?? e.t) } : null; };
  to = 'm';
  pad(0.0, 4.2, ['D3', 'A3', 'E4'], 0.026, { type: 'triangle', cut: 1500, att: 0.5, rel: 0.6, send: 0.5 });
  pad(4.0, 8.2, ['B2', 'Fs3', 'D4'], 0.024, { type: 'triangle', cut: 1300, att: 0.6, rel: 0.6, send: 0.5 });
  pad(8.0, q.end + 0.4, ['G2', 'D3', 'B3'], 0.024, { type: 'triangle', cut: 1300, att: 0.6, rel: 0.4, send: 0.5 });
  pad(q.end + 0.2, LOOP_T + 0.3, ['D3', 'A3', 'Fs4'], 0.026, { type: 'triangle', cut: 1600, att: 0.4, rel: 0.8, send: 0.6 });
  pluck(q.hop2, nz('D5'), 0.11, 0.1, 0.7, 2200, 0.4);
  pluck(q.hop2 + E8, nz('A4'), 0.08, -0.1, 0.7, 2200, 0.4);
  const done = at('mark:#stage');
  if (done) chime(done.t - 0.25, [nz('D5'), nz('Fs5'), nz('A5')], 0.09, 0.1);
  to = 's';
  for (let i = 0; i < 9; i++) noiseHit(q.note + i * 0.07, 0.05, 'bandpass', 3800, 2, 0.03, -0.2);   // the name, pencilled
  sweep(q.card - 0.05, q.card + 0.4, 0.006, 500, 2000, 0);                                        // the card rises
  sweep(q.end - 0.05, q.end + 0.35, 0.005, 1800, 500, 0);                                         // and sinks away
  for (const e of ftEvents('app')) {
    const t = ftOut('app', e.t0 ?? e.t); if (t == null) continue;
    if (e.type === 'click') { noiseHit(t, 0.025, 'highpass', 2600, 0.8, 0.05, 0.15); blip(t, 1500, 900, 0.03, 0.03, 0.15); }
    if (e.type === 'type') {   // one soft tick per key, spread over the typed span
      const n = (e.text || '').length || e.chars || 8, d = (e.t1 - e.t0) / n;
      for (let i = 0; i < n; i++) blip(t + i * d, 2800 + (i % 3) * 180, 2300, 0.01, 0.016, i % 2 ? 0.15 : -0.05);
    }
  }
