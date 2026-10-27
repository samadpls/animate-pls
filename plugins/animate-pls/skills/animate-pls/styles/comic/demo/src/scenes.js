// =====================================================================
//  SCENES — comic demo. World = screen in every format (placed with LX / LY / UNIT, PORTRAIT / WIDE); TT on 2s.
//  Era 1: a kitchen at 7:00 A.M., the clock rings and the hero jolts awake. Era 2: the clock is the sun over the
//  rooftops and the hero skates off. Each era is one panel on the page; the morph bursts between them.
// =====================================================================
const CDM = 40 * UNIT;   // the page margin around the panel
const CD = (() => {
  const clock = PORTRAIT ? [LX(0.66), LY(0.42), 150 * UNIT] : WIDE ? [LX(0.7), LY(0.44), 150 * UNIT] : [LX(0.7), LY(0.44), 140 * UNIT];
  const table = clock[1] + clock[2] + 30 * UNIT;
  return {
    clock, table,
    sun: PORTRAIT ? [LX(0.64), LY(0.33), 170 * UNIT] : [LX(0.7), LY(0.3), 150 * UNIT],
    win: PORTRAIT ? [LX(0.12), LY(0.2), LX(0.42), LY(0.13)] : WIDE ? [LX(0.08), LY(0.14), LX(0.3), LY(0.34)] : [LX(0.1), LY(0.18), LX(0.42), LY(0.22)],
    hero: [PORTRAIT ? LX(0.3) : WIDE ? LX(0.38) : LX(0.3), table - 66 * UNIT, 92 * UNIT],
    roof: PORTRAIT ? LY(0.58) : LY(0.72),
  };
})();

function cdClock(x, y, r, o = {}) {
  const ring = !!o.ring, J = RNG('shake', B), dx = ring ? J.n(7) * UNIT : 0, rot = ring ? (B % 2 ? 0.06 : -0.06) : 0;
  ctx.save(); ctx.translate(x + dx, y); ctx.rotate(rot);
  for (const s of [-1, 1]) {   // legs and bells
    cmLine([[s * r * 0.5, r * 0.75], [s * r * 0.72, r * 1.12]], 12 * UNIT, 'leg' + s, { taper: 0.1, amt: 0.4 });
    cmShape(ellipsePts(s * r * 0.62, -r * 0.8, r * 0.34, r * 0.26, s * 0.55, 28), { fill: CM.yellow, shade: CM.yellowD, w: 5 * UNIT, key: 'bell' + s, amt: 0.4 });
  }
  cmLine([[-r * 0.25, -r * 1.12], [r * 0.25, -r * 1.12]], 12 * UNIT, 'hand', { taper: 0.15, amt: 0.3 });
  cmShape(ellipsePts(0, 0, r, r, 0, 48), { fill: CM.green, shade: CM.greenD, w: 7 * UNIT, key: 'clockB', amt: 0.6 });
  cmShape(ellipsePts(0, 0, r * 0.78, r * 0.78, 0, 44), { fill: CM.paperL, shade: CM.paperD, sr: 2.2, depth: 0.12, w: 4.5 * UNIT, key: 'clockF', amt: 0.5 });
  ctx.fillStyle = CM.ink;
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, k = i % 3 ? 0.035 : 0.06; ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.64, Math.sin(a) * r * 0.64, r * k, 0, TAU); ctx.fill(); }
  cmLine([[0, 0], [Math.cos(120 * DEG) * r * 0.36, Math.sin(120 * DEG) * r * 0.36]], 11 * UNIT, 'hh', { taper: 0.3, amt: 0.2 });
  cmLine([[0, 0], [0, -r * 0.56]], 7 * UNIT, 'mh', { taper: 0.3, amt: 0.2 });
  ctx.fillStyle = CM.red; ctx.beginPath(); ctx.arc(0, 0, r * 0.06, 0, TAU); ctx.fill();
  ctx.restore();
}

function sceneRoom() {
  cmPage();
  const [cx, cy, cr] = CD.clock, tY = CD.table, ring = TT >= TIMELINE.cues.ring && TT < M1 - 0.35, woke = TT >= TIMELINE.cues.wake;
  cmPanel(CDM, CDM, W - 2 * CDM, H - 2 * CDM, { bg: CM.paperL, key: 'room', fn: () => {
    cmDotField('wall' + FORMAT, 0, 0, W, tY, CM.yellow, 13, 30, (u, v) => 0.3 + 0.5 * v);
    const [wx, wy, ww, wh] = CD.win, drift = TT * 18 * UNIT;   // a window with a cloud drifting past
    cmShape(cmBox(wx, wy, ww, wh), { raw: true, fill: CM.cyanL, w: 7 * UNIT, key: 'win' });
    ctx.save(); cmPath(cmBox(wx, wy, ww, wh)); ctx.clip(); cmCloud(wx + ww * 0.3 + drift, wy + wh * 0.45, ww * 0.22, wh * 0.16, { key: 'wc', w: 3.5 }); ctx.restore();
    cmLine([[wx + ww / 2, wy], [wx + ww / 2, wy + wh]], 6 * UNIT, 'wbar', { taper: 0.05, amt: 0.3 });
    for (const s of [0, 1]) {   // curtains, swaying a little
      const x0 = s ? wx + ww : wx, sw = Math.sin(TT * 2.4 + s) * 8 * UNIT, dir = s ? -1 : 1;
      cmShape([[x0 - dir * 30 * UNIT, wy - 24 * UNIT], [x0 + dir * ww * 0.2, wy - 24 * UNIT], [x0 + dir * ww * 0.08 + sw, wy + wh * 0.55], [x0 + dir * ww * 0.16 + sw, wy + wh + 30 * UNIT], [x0 - dir * 30 * UNIT, wy + wh + 30 * UNIT]], { fill: CM.red, shade: CM.redD, w: 5 * UNIT, key: 'cur' + s });
    }
    cmShape(cmBox(-20, tY, W + 40, H), { raw: true, fill: CM.orange, shade: CM.redD, depth: 0.04, w: 8 * UNIT, key: 'table' });
    if (ring) { cmSpeed(cx, cy, cr * 1.25, cr * 2.1, 22, { key: 'ringL', w: 7 }); cmEmanata(cx, cy, cr * 1.15, 3, { key: 'r1', a0: -2.6, span: 0.7 }); cmEmanata(cx, cy, cr * 1.15, 3, { key: 'r2', a0: -0.95, span: 0.7 }); }
    cdClock(cx, cy, cr, { ring });
    // a mug with steam (life)
    const mx = PORTRAIT ? LX(0.12) : LX(0.08), my = tY + 70 * UNIT;
    for (let i = 0; i < 2; i++) { const P = []; for (let k = 0; k <= 8; k++) P.push([mx + 30 * UNIT + i * 34 * UNIT + Math.sin(k * 0.9 + TT * 4 + i) * 9 * UNIT, my - 90 * UNIT - k * 15 * UNIT]); cmLine(P, 5 * UNIT, 'steam' + i, { c: CM.paperL, amt: 0.6 }); }
    cmShape(rrectPts(mx, my - 80 * UNIT, 96 * UNIT, 96 * UNIT, 12 * UNIT, 3), { fill: CM.cyan, shade: CM.cyanD, w: 5 * UNIT, key: 'mug' });
    // the hero: asleep on the table, then jolted awake
    const [hx, hy, hr] = CD.hero, y = hy - (woke ? 70 * UNIT * Math.exp(-(TT - TIMELINE.cues.wake) * 3) + 18 * UNIT : 0);
    cmHero(hx, y, hr, { key: 'hero', closed: !woke, mood: woke ? 'wow' : 'smile', look: [0.9, -0.2], feet: false, squash: woke ? -0.12 * Math.exp(-(TT - TIMELINE.cues.wake) * 4) : 0.14 });
    if (!woke) { ctx.font = `400 ${56 * UNIT}px ${CM_SFX}`; ctx.fillStyle = CM.ink; [0, 1, 2].forEach((i) => { const k = mod(TT * 0.8 + i / 3, 1); ctx.fillText('Z', hx + hr * 0.7 + k * 60 * UNIT, y - hr - k * 110 * UNIT); }); }
    else if (TT < TIMELINE.cues.wake + 0.8) cmEmanata(hx, y, hr * 1.15, 5, { key: 'wakeE' });
  } });
  if (ring) cmSfx('RRRING!', cx - (PORTRAIT ? 70 : 40) * UNIT, cy - cr * 1.7, 110 * UNIT, { pop: popS(TIMELINE.cues.ring), rot: -0.12, fill: CM.yellow, dots: CM.red });
  cmTag('7:00 A.M.');
  cmCaption('RISE AND SHINE!', { t: TIMELINE.cues.wake });
}

function sceneRoofs() {
  cmPage();
  const [sx, sy, sr] = CD.sun, rY = CD.roof, cu = TIMELINE.cues;
  cmPanel(CDM, CDM, W - 2 * CDM, H - 2 * CDM, { bg: CM.paperL, key: 'roofs', fn: () => {
    cmDotField('sky' + FORMAT, 0, 0, W, rY, CM.cyan, 14, 15, (u, v) => 0.75 - 0.55 * v);
    cmBurst(sx, sy, sr * 1.75, sr * 1.75, { key: 'rays', n: 16, inner: 0.62, fill: CM.yellowL, rot: TT * 0.05, w: 4 * UNIT });
    cmShape(ellipsePts(sx, sy, sr, sr, 0, 56), { fill: CM.yellow, shade: CM.orange, depth: 0.22, w: 7 * UNIT, key: 'sun' });
    for (let i = 0; i < 3; i++) { const R = RNG('cl', i); cmCloud(mod(R.r(0, W) + TT * (14 + i * 6) * UNIT, W + 300 * UNIT) - 150 * UNIT, R.r(0.1, 0.4) * rY, R.r(90, 140) * UNIT, R.r(40, 60) * UNIT, { key: 'cl' + i }); }
    for (let i = 0; i < 3; i++) {   // birds, flapping on 2s
      const bx = LX(0.18 + i * 0.09) + TT * 30 * UNIT, by = rY * (0.42 + 0.05 * (i % 2)), f = (B + i) % 2 ? 14 : -8;
      cmLine([[bx - 24 * UNIT, by - f * UNIT], [bx, by], [bx + 24 * UNIT, by - f * UNIT]], 5 * UNIT, 'bird' + i, { taper: 0.3, amt: 0.3 });
    }
    const cols = [CM.orange, CM.green, CM.paperD, CM.cyanD, CM.yellowD], R = RNG('bld');
    for (let x = -20, i = 0; x < W; i++) {   // rooftops: printed blocks with windows
      const bw = R.r(170, 280) * UNIT, bh = R.r(0, 90) * UNIT, top = rY + bh - (i % 2 ? 40 : 0) * UNIT;
      cmShape(cmBox(x, top, bw, H - top + 40), { raw: true, fill: cols[i % cols.length], shade: CM.ink, sr: 1.8, depth: 0.03, w: 6 * UNIT, key: 'b' + i });
      for (let wy = top + 40 * UNIT; wy < H - 60; wy += 90 * UNIT) for (let wx = x + 30 * UNIT; wx < x + bw - 60 * UNIT; wx += 70 * UNIT) cmShape(cmBox(wx, wy, 34 * UNIT, 46 * UNIT), { raw: true, fill: (wx + wy) % 3 < 1 ? CM.yellowL : CM.paperL, w: 3 * UNIT, key: 'w' + i + wx + wy, mis: false });
      x += bw;
    }
    // the hero skates in along the roofs
    const hr = 80 * UNIT, hx = springMove(cu.skate, LX(0.12), PORTRAIT ? LX(0.42) : LX(0.36), SPRING.heavy), hy = rY - hr - 30 * UNIT;
    if (TT >= cu.skate && TT < cu.whoosh + 0.9) cmStreaks(hx - hr * 1.1, hy, Math.PI, 6, hr * 1.8, { len: 300 * UNIT, key: 'sk' });
    cmLine([[hx - hr * 1.1, hy + hr * 1.12], [hx + hr * 1.1, hy + hr * 1.12]], 18 * UNIT, 'board', { taper: 0.08, amt: 0.4 });
    for (const s of [-1, 1]) cmShape(ellipsePts(hx + s * hr * 0.7, hy + hr * 1.3, 13 * UNIT, 13 * UNIT, 0, 14), { fill: CM.yellow, w: 4 * UNIT, key: 'wh' + s, amt: 0.3 });
    cmHero(hx, hy, hr, { key: 'hero', mood: 'happy', look: [0.8, 0], feet: false, squash: TT < cu.whoosh ? -0.06 : 0.02 });
  } });
  if (TT >= cu.whoosh) cmSfx('WHOOSH!', PORTRAIT ? LX(0.42) : LX(0.38), CD.roof - (PORTRAIT ? 330 : 270) * UNIT, 100 * UNIT, { pop: popS(cu.whoosh), rot: -0.08, fill: CM.paperL, dots: CM.cyan, shadow: CM.red });
  cmTag('LATER...');
  cmCaption('OFF TO WORK!');
}
