// =====================================================================
//  SCENES — poster demo. World = the frame (W x H of the format); places by LX / LY, sizes by UNIT; TT on 2s.
//  Era 0, sunrise: mustard rays on tan, rainbow bands sliding in, striped hills with daisies, the sun rising and
//  waking, "good morning" stamped along an arch; life: rays turn, gulls flap, a cloud drifts, daisies sway, twinkles.
//  Era 1, breakfast: a gingham cloth (two orange screens overprinted), a pan, the egg white with echo bands, the yolk
//  is the hero; "sunny side up"; life: sizzle ticks, steam stripes from a mug, the yolk blinks, a twinkle on the pan.
// =====================================================================
const PD = PORTRAIT ? { sun: [540, 1010, 150], yolk: [540, 1010, 112], hill: 1170 }
  : WIDE ? { sun: [1330, 610, 150], yolk: [1330, 600, 112], hill: 800 }
  : { sun: [540, 650, 128], yolk: [540, 640, 100], hill: 790 };

function pdHills(y0) {
  const L = [], R = [];
  for (let i = 0; i <= 50; i++) { const x = -60 + i * (W + 120) / 50; L.push([x, y0 + 40 * Math.sin(x / W * Math.PI * 1.4 + 0.4)]); R.push([x, y0 + 110 * UNIT + 30 * Math.sin(x / W * Math.PI * 2 + 2)]); }
  pstFill([...L, [W + 60, H + 60], [-60, H + 60]], 'olive');
  pstStripes(L.map(([x, y]) => [x, y + 28 * UNIT]), ['mustard', 'olive', 'mustard'], 9, { gap: 9 });
  pstFill([...R, [W + 60, H + 60], [-60, H + 60]], 'teal');
  pstStripes(R.map(([x, y]) => [x, y + 26 * UNIT]), ['cream', 'teal', 'cream'], 8, { gap: 9 });
}

function sceneSunrise() {
  const cu = TIMELINE.cues, [sx, sy, sr] = PD.sun;
  pstPaper();
  const y = springMove(cu.rise, sy + sr * 2.2, sy, SPRING.heavy), mood = TT < cu.wake ? 'sleepy' : 'smile';
  pstSunburst(sx, y, 30, -Math.PI / 2 + TT * 0.07, ['mustard', 'tan'], { r0: sr * 1.75 });   // the rays come up with the sun
  pstCloud(LX(PORTRAIT ? 0.72 : 0.78) - TT * 10, LY(PORTRAIT ? 0.22 : 0.17), 64 * UNIT);
  pstBird(LX(0.16) + TT * 22, LY(PORTRAIT ? 0.2 : 0.16), 40 * UNIT, { phase: 0 }); pstBird(LX(0.25) + TT * 22, LY(PORTRAIT ? 0.225 : 0.21), 28 * UNIT, { phase: 1 });
  pstRainbow(sx, sy + sr * 0.2, sr * 1.75, ['brick', 'orange', 'cream', 'teal'], 44, Math.PI, TAU, { gap: 10, sweep: ev(cu.bands, 0.75), stagger: 0.18 });
  // the sun rises out of the hills on a heavy spring and wakes up
  pstSun(sx, y, sr, { key: 'sun', mood, lid: 0, look: [0, -0.2] });
  pdHills(PD.hill);
  [[0.1, 0.62], [0.24, 0.66], [0.82, 0.64], [0.93, 0.6]].forEach(([fx, fy], i) => pstDaisy(LX(fx), PD.hill + (fy - 0.6) * 300 * UNIT + 30 * UNIT, 34 * UNIT, { ph: i * 1.7, stem: 3 }));
  [[0.12, 0.4, 0], [0.9, 0.42, 1], [0.84, 0.3, 2]].forEach(([fx, fy, p]) => pstTwinkle(LX(fx), LY(fy), 22 * UNIT, 'cream', p));
  // the headline: arched over the sun (portrait, square), set straight beside it (wide)
  const hs = pstStamp(cu.head, { big: 1.06 }), ring = [['paper', 8], ['orange', 12]];
  if (WIDE) {
    pstType('good', LX(0.29), LY(0.42), 156, { s: hs.s, grow: hs.grow, fill: 'cream', split: ['mustard', 0.3], rings: [['brown', 8], ...ring] });
    pstType('morning', LX(0.29), LY(0.62), 156, { s: hs.s, grow: hs.grow, fill: 'cream', split: ['mustard', 0.3], rings: [['brown', 8], ...ring] });
  } else {
    const size = PORTRAIT ? 80 : 104, ar = PORTRAIT ? sr * 3.6 : sr * 3.1;
    pstArcType('good morning', sx, sy + sr * 0.2, ar, size, { s: hs.s, grow: hs.grow, fill: 'cream', split: ['mustard', 0.3], rings: [['brown', 8], ...ring], track: 0.01, turn: PORTRAIT ? -0.06 : 0 });
  }
  pstTag('6 am');
  pstCaption('the sun gets up slow');
}

function pdGingham() {
  pstPaper(PST.cream);
  const s = 90 * UNIT;
  for (let x = -s; x < W + s; x += s * 2) pstFill([[x, -40], [x + s, -40], [x + s, H + 40], [x, H + 40]], 'orange', { over: true });
  for (let y = -s; y < H + s; y += s * 2) pstFill([[-40, y], [W + 40, y], [W + 40, y + s], [-40, y + s]], 'orange', { over: true });
  pstHalftone(null, 'brick', (x, y) => 0.12, { box: { x0: 0, y0: 0, x1: W, y1: H }, pitch: 16, over: true });
}

function sceneBreakfast() {
  const cu = TIMELINE.cues, [x, y, r] = PD.yolk;
  pdGingham();
  // the pan: a brown disc with a handle, a cocoa rim, a twinkle on the rim
  const pr = r * 3.1, ha = PORTRAIT ? Math.PI * 0.5 : Math.PI * 0.82;
  const hx = x + Math.cos(ha) * pr * 1.7, hy = y + Math.sin(ha) * pr * 1.7;
  pstLine([[x + Math.cos(ha) * pr * 0.9, y + Math.sin(ha) * pr * 0.9], [hx, hy]], 'brown', 70);   // the handle: a key-ink rim, a cocoa grip
  pstLine([[x + Math.cos(ha) * pr * 1.05, y + Math.sin(ha) * pr * 1.05], [hx, hy]], 'cocoa', 56);
  pstShape(ellipsePts(hx - Math.cos(ha) * 34 * UNIT, hy - Math.sin(ha) * 34 * UNIT, 12 * UNIT, 12 * UNIT, 0, 20), 'cream', { kw: 4, edge: false });
  pstShape(ellipsePts(x, y, pr, pr, 0, 90), 'brown', { kw: 5, rings: [['paper', 8], ['teal', 14]] });
  pstShape(ellipsePts(x, y, pr * 0.86, pr * 0.86, 0, 90), 'cocoa', { kw: 0, edge: false });
  pstTwinkle(x - pr * 0.6, y - pr * 0.62, 26 * UNIT, 'cream', 0);
  // the egg white: a puffy blob that breathes as it fries, with a knocked-out ring and a mustard echo
  const white = pstWavy(pstPuff(x + r * 0.15, y + r * 0.15, r * 2.2, r * 1.9, 5, 0.22, 120, 0.4), 6 * UNIT, 7, TT * 3);
  pstShape(white, 'cream', { kw: 5, rings: [['paper', 7], ['mustard', 10]] });
  // sizzle ticks around the white, flickering each pull
  const R = RNG('sizzle', B);
  if (TT >= cu.fry) for (let i = 0; i < 12; i++) { const a = R.r(0, TAU), d = r * R.r(2.4, 2.9); pstLine([[x + Math.cos(a) * d, y + Math.sin(a) * d], [x + Math.cos(a) * (d + 22 * UNIT), y + Math.sin(a) * (d + 22 * UNIT)]], 'cream', 6); }
  // the yolk is the hero
  pstSun(x, y, r, { key: 'yolk', rays: 0, mood: 'smile', look: [0.2, 0.1] });
  // a striped mug with steam
  const mx = PORTRAIT ? LX(0.8) : WIDE ? LX(0.6) : LX(0.84), my = PORTRAIT ? LY(0.73) : WIDE ? LY(0.84) : LY(0.86), mw = 120 * UNIT;
  for (let i = 0; i < 2; i++) pstStripes(Array.from({ length: 14 }, (_, k) => [mx - 20 * UNIT + i * 40 * UNIT + Math.sin(k * 0.7 + TT * 4 + i) * 12 * UNIT, my - mw * 0.8 - k * 16 * UNIT]), ['cream', 'tan'], 9, { gap: 4, frac: ev(cu.steam + i * 0.2, 0.6) });
  pstShape(ellipsePts(mx + mw * 0.6, my, mw * 0.32, mw * 0.32, 0, 30), 'teal', { kw: 5 });
  pstShape(rrectPts(mx - mw / 2, my - mw * 0.6, mw, mw * 1.1, 18 * UNIT), 'teal', { kw: 5 });
  pstStripes([[mx - mw / 2 + 4, my], [mx + mw / 2 - 4, my]], ['mustard', 'cream', 'brick'], 10, { gap: 4 });
  // the headline
  const hs = pstStamp(cu.head2, { big: 1.15 });
  const ty = PORTRAIT ? 560 : WIDE ? LY(0.5) : 252, tx = WIDE ? LX(0.27) : CX, size = pstFit('sunny side up', PORTRAIT ? 120 : 112, PORTRAIT ? 640 : WIDE ? 740 : 720);
  pstType('sunny side up', tx, ty, size, { s: hs.s, grow: hs.grow, fill: 'cream', split: ['mustard', 0.3], rings: [['brown', 8], ['paper', 8], ['brick', 12]], rot: -0.03 });
  pstTag('7 am');
  pstCaption('breakfast is served');
}
