  // SCORE BODY — reel template (inside buildScore(); see kit/score-head.js). 120 BPM, D minor-ish.
  // A sound on frame 0 (the hook), a tick per miss, a clock for the hot key, a rush of 16ths, a riser into the crash,
  // a hard stop for the half-second hush, then the loudest hit: a chord stab with partials above 400 Hz (phone
  // speakers drop the sub) plus the sub, and a flat warm chord under the end hold.
  const T = TIMELINE, cu = T.cues;
  to = 'm';
  // the hook: an alarm pulse over a low drone, a hit on frame 0
  noiseHit(0, 0.12, 'bandpass', 1500, 1.2, 0.3, 0, 0.2); bass(0, nz('D2'), 0.5);
  for (let b = 0; b < cu.pen - 1e-6; b += E8) pluck(b, nz(b % BEAT < 1e-6 ? 'A4' : 'D5'), 0.11, b % BEAT < 1e-6 ? -0.2 : 0.2, 0.18, 3600, 0.15);
  drone(0, cu.pen, nz('D2'), 0.05, { att: 0.02, rel: 0.1 });
  // penetration: a soft pad, a bass on every beat, a blip per miss
  pad(cu.pen, cu.stamp, ['D3', 'A3', 'F4'], 0.026, { type: 'triangle', cut: 1000, att: 0.08, rel: 0.12 });
  for (let b = cu.pen; b < cu.stamp - 1e-6; b += BEAT) bass(b, nz(b < cu.penC ? 'D2' : 'F2'), 0.32);
  // stampede: a clock ticking down to "expires", a chime when it goes, then the rush on 16ths
  for (let b = cu.stamp; b < cu.rush - 1e-6; b += E8) noiseHit(b, 0.03, 'highpass', 5200, 1, b % BEAT < 1e-6 ? 0.16 : 0.09, 0.3);
  pad(cu.stamp, cu.rush + 0.05, ['D3', 'G3', 'C4'], 0.024, { type: 'triangle', cut: 900, att: 0.1, rel: 0.1 });
  for (let i = 0; i < 8; i++) noiseHit(cu.rush + i * E16, 0.06, 'bandpass', 1400 + i * 260, 1.5, 0.22 + i * 0.02, i % 2 ? 0.35 : -0.35);
  for (let b = cu.rush; b < cu.aval - 1e-6; b += E8) bass(b, nz('A2'), 0.3);
  // avalanche: a calm pulse while every TTL bar runs down together, a riser into the crash, the rumble, a hard stop
  for (let b = cu.aval; b < cu.hush - 0.5 - 1e-6; b += E8) pluck(b, nz(['D4', 'F4', 'A4', 'C5'][Math.round((b - cu.aval) / E8) % 4]), 0.09, 0, 0.22, 2600, 0);
  pad(cu.aval, cu.hush - 0.02, ['D3', 'A3', 'C4', 'F4'], 0.03, { cut: 1100, att: 0.2, rel: 0.04, swellTo: 0.045, swellAt: cu.hush - 0.3, send: 0 });   // dry: a hard stop into the hush
  for (let b = RC_EXPA; b < cu.hush - 0.2 - 1e-6; b += E16) bass(b, nz('D2'), 0.11);   // the flood, stopping dead before the hush
  // the payoff: the loudest hit on the "TTL jitter" card, then a flat warm chord and one soft blip per refill
  chime(cu.fix, [nz('D5'), nz('Fs5'), nz('A5'), nz('D6')], 0.55); sub(cu.fix, 0.55);
  pad(cu.fix, cu.fix + 0.45, ['D4', 'Fs4', 'A4'], 0.1, { att: 0.008, rel: 0.25, cut: 3200, send: 0.3 });   // the stab: partials above 400 Hz carry on a phone
  pluck(cu.fix, nz('D4'), 0.4, 0, 0.5, 4200, 0.4); pluck(cu.fix, nz('A4'), 0.3, 0.2, 0.5, 4200, 0.4);
  const G = T.acts.find((a) => a.role === 'goodbye').t0;   // the warm chord holds through the payoff, then steps down under the end hold
  pad(cu.fix + 0.08, G + 0.25, ['D3', 'A3', 'D4', 'Fs4'], 0.035, { cut: 1300, att: 0.35, rel: 0.3, send: 0.5 });
  pad(G, LOOP_T - 0.05, ['D3', 'A3', 'D4', 'Fs4'], 0.009, { cut: 1100, att: 0.25, rel: 0.5, send: 0.5 });
  to = 's';
  sweep(cu.pen - 0.4, cu.pen, 0.01, 500, 2600, 0);
  // a dry blip for each "?" that lands in the database during penetration
  for (let i = 0; i < 30; i++) {   // a dry blip for each question mark that lands (the same times as rcPlan in scenePen)
    const t = cu.pen - 0.45 + i * 0.12 + RNG('pn', i).r(0, 0.048) + RC_TRIP;
    if (i % 3 && t < cu.stamp) blip(t, 900, 500, 0.05, 0.045, i % 2 ? 0.3 : -0.3);
  }
  chime(RC_EXP, [nz('A5'), nz('E5')], 0.1);   // the hot key expires
  riser(RC_EXPA - 0.65, RC_EXPA, 0.035);
  noiseHit(RC_EXPA, Math.min(0.8, cu.hush - RC_EXPA - 0.3), 'lowpass', 2600, 0.8, 0.2, 0, 0, 300);   // every key expires: the crash (dry: the hush stays clean)
  RC_REFILL.forEach((r, i) => blip(r, 1500 + (i % 3) * 300, 1200, 0.04, 0.03, (i % 2 ? 0.25 : -0.25)));   // one soft blip per refill
