// =====================================================================
//  SCENES — chalkboard demo. Positions come from NW (one table per shape of frame: 9:16, 1:1, 16:9); sizes in px at
//  1080 on the short side (UNIT = 1 for all three). Time TT on 2s. Yellow = the falling body (apple, then moon),
//  coral = the hero, teal = the measures (g, the orbit's pull). All chalk goes through chalk(); the frame goes last.
// =====================================================================
const NW = PORTRAIT ? {
  ground: 1080, trunk: [330, 1080], canopy: [360, 700, 250, 175], apple: [560, 770, 64], hero: [810, 905, 40], gl: [652, 760, 46],
  earth: [540, 980, 165], orbit: [380, 320], moon: 66,
} : WIDE ? {
  ground: 850, trunk: [560, 850], canopy: [590, 470, 260, 165], apple: [800, 540, 58], hero: [1130, 690, 37], gl: [870, 500, 44],
  earth: [960, 640, 140], orbit: [470, 250], moon: 58,
} : {
  ground: 850, trunk: [240, 850], canopy: [270, 480, 210, 150], apple: [450, 545, 56], hero: [780, 690, 37], gl: [520, 500, 44],
  earth: [540, 640, 140], orbit: [330, 250], moon: 58,
};
const nwCu = TIMELINE.cues;
// the apple's fall: from its branch at drop to the ground at land, accelerating (y = y0 + g t^2 / 2)
const nwRest = () => NW.ground - NW.apple[2] - 4;
const nwG = () => 2 * (nwRest() - NW.apple[1]) / (nwCu.land - nwCu.drop) ** 2;
function nwAppleY(t) { const s = clamp(t - nwCu.drop, 0, nwCu.land - nwCu.drop); return NW.apple[1] + 0.5 * nwG() * s * s; }
function nwApple(x, y, r, key, o = {}) {   // a chalk apple: a yellow scribble, its outline, a stalk and a leaf
  const P = ellipsePts(x, y, r, r * 0.94, 0, 36);
  if (!o.ghost) chScribble(P, { c: CHP.yellow, key: key + 'f', gap: r * 0.22, w: CH_W * 0.8, press: 0.5, a: -0.7, inset: r * 0.1 });
  chLine(arcPts(x, y, r, -1.4, -1.4 + TAU * 1.04, 36), { c: o.ghost ? CHP.white : CHP.yellow, key: key + 'o', press: o.ghost ? 0.3 : 1, w: o.ghost ? CH_W * 0.6 : CH_W, fibres: o.ghost ? 2 : 4 });
  if (o.ghost) return P;
  chLine([[x, y - r * 0.9], [x + r * 0.08, y - r * 1.3]], { c: CHP.white, key: key + 'st', w: CH_W * 0.7, fibres: 2 });
  chLine([[x + r * 0.08, y - r * 1.15], [x + r * 0.45, y - r * 1.4], [x + r * 0.62, y - r * 1.2], [x + r * 0.08, y - r * 1.15]], { c: CHP.teal, key: key + 'lf', w: CH_W * 0.6, fibres: 2 });
  return P;
}
function nwTree() {
  const [tx, ty] = NW.trunk, [cx, cy, rx, ry] = NW.canopy;
  chLine([[tx - 26, ty], [tx - 18, cy + ry * 0.5], [tx - 50, cy + ry * 0.2]], { key: 'tr1', w: CH_W * 1.1 });
  chLine([[tx + 26, ty], [tx + 18, cy + ry * 0.55], [tx + 70, cy + ry * 0.3]], { key: 'tr2', w: CH_W * 1.1 });
  chLine([[tx - 8, cy + ry * 0.6], [tx + 20, cy + ry * 0.15]], { key: 'tr3', w: CH_W * 0.8, press: 0.8 });
  // the canopy: a bumpy cloud of leaves, lightly scribbled in
  const P = []; for (let i = 0; i < 90; i++) { const a = i / 90 * TAU, k = 1 + 0.09 * Math.sin(a * 7 + 1); P.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
  chScribble(P, { c: CHP.teal, key: 'canf', gap: 22, w: CH_W * 0.7, press: 0.28, a: -0.9 });
  chLine(P, { closed: true, key: 'can', w: CH_W });
}
// leaves drifting down (background life): seeded, stateless
function nwLeaves() {
  const [cx, cy, rx, ry] = NW.canopy;
  for (let i = 0; i < 3; i++) {
    const R = RNG('nwleaf', i), per = R.r(2.2, 3.2), t = mod(TT + R.r(0, per), per) / per;
    const x = cx + R.n(rx * 0.8) + Math.sin(t * TAU * 1.5 + i) * 30, y = cy + ry * 0.4 + t * (NW.ground - cy - ry * 0.4 - 10), a = Math.sin(t * TAU * 2 + i) * 0.6;
    const L = 22 * UNIT, P = [[x - Math.cos(a) * L, y - Math.sin(a) * L], [x, y - 8], [x + Math.cos(a) * L, y + Math.sin(a) * L], [x, y + 8]];
    chLine(P, { closed: true, c: CHP.teal, key: 'lf' + i, w: CH_W * 0.55, fibres: 2, press: 0.8 });
  }
}
function sceneApple() {
  chBoard(CHP.board, 'lesson');
  const [ax, , ar] = NW.apple, ay = nwAppleY(TT), [gx, gy, gs] = NW.gl;
  chalk(() => {
    chLine([[60 * UNIT, NW.ground + 6], [W - 60 * UNIT, NW.ground - 4]], { key: 'ground', w: CH_W * 0.9 });
    nwTree();
    nwLeaves();
    // ghosts of the apple at equal times (every 0.15s): the gaps grow as it speeds up
    for (let k = 1; k <= 4; k++) { const tk = nwCu.drop + k * 0.15; if (TT >= tk) nwApple(ax, nwAppleY(tk), ar, 'gh' + k, { ghost: true }); }
    if (TT >= nwCu.drop) { chLine([[ax, NW.apple[1] + ar + 10], [ax, ay - ar - 8]], { key: 'trail', w: CH_W * 0.5, press: 0.45, fibres: 2 }); }
    nwApple(ax, ay, ar, 'apple');
    if (TT >= nwCu.land && TT < nwCu.land + 0.5) chDust([ax, NW.ground - 6], nwCu.land, 0.12, { key: 'thud', n: 22, life: 0.6, g: 300 });
    // the measure: g, an arrow down beside the path, and its value
    const fa = ev(nwCu.g, 0.3), fv = ev(nwCu.g + 0.25, 0.4);
    chArrow([[gx + 24, gy + 30], [gx + 24, gy + 200]], { c: CHP.teal, key: 'garr', frac: fa, w: CH_W * 0.8 });
    const t = chText('9.8 m/s²', gx, gy, gs, { c: CHP.teal, key: 'gval', frac: fv, maxW: PORTRAIT ? 190 : 300 });
    if (fv > 0 && fv < 1) chDust(t.tip, nwCu.g + 0.25, 0.4, { key: 'gd', n: 10 });
    const [hx, hy, hs] = NW.hero;
    chHero(hx, hy, hs, { key: 'hero', point: [ax, ay], mood: TT >= nwCu.drop && TT < nwCu.land + 0.4 ? 'wow' : 'smile' });
  });
  chFrame();
  chTag('gravity');
  chCaption('an apple falls', { at: 0.6 });
}

// ---- era 2: the moon falls around the Earth
const nwMoonA = (t) => -Math.PI / 2 + (t - M1) * 0.42;
const nwMoonAt = (t) => { const [ex, ey] = NW.earth, [rx, ry] = NW.orbit, a = nwMoonA(t); return [ex + Math.cos(a) * rx, ey + Math.sin(a) * ry]; };
function nwMoon(x, y, r, key, o = {}) {
  const P = ellipsePts(x, y, r, r, 0, 40);
  if (!o.ghost) chScribble(P, { c: CHP.yellow, key: key + 'f', gap: r * 0.24, w: CH_W * 0.8, press: 0.45, a: -0.7, inset: r * 0.1 });
  chLine(arcPts(x, y, r, -1.2, -1.2 + TAU * 1.04, 40), { c: o.ghost ? CHP.white : CHP.yellow, key: key + 'o', press: o.ghost ? 0.3 : 1, w: o.ghost ? CH_W * 0.6 : CH_W, fibres: o.ghost ? 2 : 4 });
  if (!o.ghost) for (const [dx, dy, rr] of [[-0.3, -0.2, 0.18], [0.25, 0.25, 0.13], [0.3, -0.35, 0.09]]) chLine(ellipsePts(x + dx * r, y + dy * r, rr * r, rr * r, 0, 14), { closed: true, c: CHP.white, key: key + 'cr' + dx, w: CH_W * 0.5, fibres: 2, press: 0.7 });
}
function sceneMoon() {
  chBoard(CHP.board, 'orbit');
  const [ex, ey, er] = NW.earth, [rx, ry] = NW.orbit, [mx, my] = nwMoonAt(TT), mr = NW.moon;
  chalk(() => {
    for (let i = 0; i < 16; i++) { const R = RNG('nwstar', i); chStar(R.r(80, W - 80), R.r(SAFE.top + 140 * UNIT, H - SAFE.bottom - 120 * UNIT), R.r(7, 13) * UNIT, { key: 'sr' + i, ph: i, press: 0.7 }); }
    // the orbit, written on as a dashed loop
    const fo = ev(nwCu.orbit, 0.8), O = ellipsePts(ex, ey, rx, ry, 0, 120), Q = O.slice(30).concat(O.slice(0, 31));
    ctx.save(); ctx.setLineDash([22 * UNIT, 16 * UNIT]); chLine(Q, { key: 'orb', frac: fo, w: CH_W * 0.7, press: 0.6, fibres: 0 }); ctx.restore();
    if (fo > 0 && fo < 1) chDust(Q, nwCu.orbit, 0.8, { key: 'orbd', n: 22 });
    // the Earth: a white loop, teal land scribbled in
    chLine(arcPts(ex, ey, er, -2.2, -2.2 + TAU * 1.04, 60), { key: 'earth', w: CH_W * 1.1 });
    for (const [dx, dy, s] of [[-0.35, -0.2, 0.4], [0.3, 0.25, 0.35], [0.1, -0.5, 0.22]]) {
      const P = []; for (let i = 0; i < 24; i++) { const a = i / 24 * TAU, k = 1 + 0.25 * Math.sin(a * 3 + dx * 9); P.push([ex + dx * er + Math.cos(a) * s * er * k, ey + dy * er + Math.sin(a) * s * er * 0.7 * k]); }
      chScribble(P, { c: CHP.teal, key: 'land' + dx, gap: 11, w: CH_W * 0.6, press: 0.55, a: 0.6 });
    }
    // ghosts of the moon at equal times behind it, then the moon with its two arrows: where it goes, what pulls it
    for (let k = 1; k <= 3; k++) { const tk = TT - k * 0.45; if (tk >= M1 + 0.2) nwMoon(...nwMoonAt(tk), mr, 'mg' + k, { ghost: true }); }
    nwMoon(mx, my, mr, 'moon');
    const a = nwMoonA(TT), tx = -Math.sin(a) * rx, ty = Math.cos(a) * ry, tl = Math.hypot(tx, ty), fa = ev(nwCu.arrows, 0.3);
    chArrow([[mx + tx / tl * (mr + 10), my + ty / tl * (mr + 10)], [mx + tx / tl * (mr + 130 * UNIT), my + ty / tl * (mr + 130 * UNIT)]], { key: 'va', frac: fa, w: CH_W * 0.8 });
    const dx = ex - mx, dy = ey - my, dl = Math.hypot(dx, dy);
    chArrow([[mx + dx / dl * (mr + 10), my + dy / dl * (mr + 10)], [mx + dx / dl * (mr + 110 * UNIT), my + dy / dl * (mr + 110 * UNIT)]], { c: CHP.teal, key: 'ga', frac: ev(nwCu.arrows + 0.25, 0.3), w: CH_W * 0.8 });
    // the hero, sitting on the Earth's shoulder, pointing at the moon
    const ha = -2.35, hs = NW.hero[2] * 0.85, hx = ex + Math.cos(ha) * er, hy = ey + Math.sin(ha) * er;
    chHero(hx - hs * 0.1, hy - hs * 2.75, hs, { key: 'hero', sit: true, point: [mx, my], mood: 'smile' });
  });
  chFrame();
  chTag('orbits');
  chCaption('so does the moon', { at: 0.75 });
}
