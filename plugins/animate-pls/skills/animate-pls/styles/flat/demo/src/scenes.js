// =====================================================================
//  SCENES — flat demo. Positions come from DM (one table per shape of frame: 9:16, 1:1, 16:9), sizes in px at
//  1080 on the short side (UNIT = 1 for all three). Time TT on 1s; springs and eases from kit/core.js.
//  Draw order is back to front: every long shadow falls on what was drawn before it.
// =====================================================================
const DM = PORTRAIT ? {
  star: [270, 540, 108], planet: [740, 1000, 165], hero: [300, 1040, 76], far: [905, 410, 40], horizon: 1480,
  cell: [670, 840, 230], hero2: [330, 1040, 78], comet: [380, 1120, 300],
} : WIDE ? {
  star: [330, 370, 100], planet: [1320, 580, 165], hero: [700, 720, 74], far: [1700, 200, 40], horizon: 975,
  cell: [1220, 470, 215], hero2: [660, 730, 74], comet: [180, 760, 170],
} : {
  star: [200, 340, 84], planet: [740, 590, 145], hero: [260, 730, 68], far: [945, 150, 32], horizon: 985,
  cell: [700, 450, 200], hero2: [280, 730, 68], comet: [160, 560, 130],
};
const dmCu = TIMELINE.cues;

// the light's road: a gentle arc from the star's edge to the planet's edge
function dmBeam() {
  const [sx, sy, sr] = DM.star, [px, py, pr] = DM.planet, d = Math.hypot(px - sx, py - sy), ux = (px - sx) / d, uy = (py - sy) / d;
  const a = [sx + ux * sr * 1.4, sy + uy * sr * 1.4], b = [px - ux * pr * 1.18, py - uy * pr * 1.18], c = [(a[0] + b[0]) / 2 + uy * d * 0.1, (a[1] + b[1]) / 2 - ux * d * 0.1];
  const P = []; for (let i = 0; i <= 32; i++) { const t = i / 32; P.push([lerp(lerp(a[0], c[0], t), lerp(c[0], b[0], t), t), lerp(lerp(a[1], c[1], t), lerp(c[1], b[1], t), t)]); }
  return P;
}
// the foreground: the curve of a giant moon at the bottom, its craters turning slowly past (a near parallax layer)
function dmHorizon() {
  const R0 = Math.max(W, H) * 1.05, cx = W * 0.42, cy = DM.horizon + R0, c = '#1f4f50';
  flSolid(ellipsePts(cx, cy, R0, R0, 0, 220), c, { shadow: false, shade: 0.02, rim: 7 * UNIT, ra: 0.42, inner: () => {
    for (let i = 0; i < 9; i++) {
      const R = RNG('dmcr', i), a = -Math.PI / 2 + R.r(-0.5, 0.5) - TT * 0.012, d = R0 - R.r(40, 380) * UNIT, r = R.r(22, 70) * UNIT;
      const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
      ctx.fillStyle = flShade(c, 0.6); ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.55, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = flLight(c, 0.5); ctx.beginPath(); ctx.ellipse(x + r * 0.12, y + r * 0.1, r * 0.8, r * 0.4, 0, 0, TAU); ctx.fill();
    }
  } });
}
// neighbouring cells of the leaf, dim and drifting: a far parallax layer behind the hero's cell
function dmTissue() {
  const s = 300 * UNIT, h = s * 0.866, dx = TT * 9 * UNIT, c = '#273722';
  for (let j = -1; j * h < H + h; j++) for (let i = -1; i * s < W + s; i++) {
    const R = RNG('dmts', i, j), x = i * s + (j % 2 ? s / 2 : 0) + R.n(24) - mod(dx, s) + s / 2, y = j * h + R.n(24), r = s * R.r(0.34, 0.42);
    flSolid(ellipsePts(x, y, r, r * R.r(0.86, 1), R.r(0, 3), 40), c, { shadow: r * 0.45, sa: 0.22, shade: 0.1, rim: 3 * UNIT, ra: 0.12, inner: () => {
      ctx.fillStyle = flLight(c, 0.22); ctx.beginPath(); ctx.arc(x + R.n(r * 0.3), y + R.n(r * 0.3), r * 0.24, 0, TAU); ctx.fill();
    } });
  }
}

// ---- era 1: space. A star sends light across to a ringed planet; the hero floats and watches.
function sceneSpace() {
  flGround(ERA_BG[0]);
  flStars('space-far', { n: PORTRAIT ? 120 : 110, drift: 5 });
  dmHorizon();
  const [fx, fy, fr] = DM.far; flPlanet(fx, fy, fr, FLP.sage, { bands: 2, spin: 6, shadowLen: fr * 1.6 });
  // a comet crosses the sky once
  const cu = ev(dmCu.comet, 1.2);
  if (cu > 0 && cu < 1) { const [cx0, cy0, len] = DM.comet, k = EZ.io(cu); flComet(lerp(W + 120, cx0, k), lerp(cy0 - 260 * UNIT, cy0, k), Math.atan2(260, -(W + 120 - cx0)), len * UNIT); }
  // the star and its beam: dashes flow, photons ride it to the planet
  const [sx, sy, sr] = DM.star; flSun(sx, sy, sr);
  const P = dmBeam(), bf = EZ.o3(ev(dmCu.beam, 0.6));
  flArrowPath(P, { frac: bf, w: 20 * UNIT, c: FLP.cream, speed: 120 });
  for (let i = 0; i < 6; i++) {
    const t0 = dmCu.beam + 0.15 + i * 0.42, u = (TT - t0) / 0.95;
    if (u > 0 && u < 1) { const [x, y] = pointAt(P, EZ.io(u)); flGlow(x, y, 20 * UNIT, '#f7c873', 0.55); ctx.fillStyle = '#fffaf0'; ctx.beginPath(); ctx.arc(x, y, 9 * UNIT, 0, TAU); ctx.fill(); }
  }
  // the planet (the bridge object) and its moon on a tilted orbit, behind or in front
  const [px, py, pr] = DM.planet, ma = TT * 0.9 + 2.2, tilt = -0.32;
  const mx = px + Math.cos(ma) * pr * 2.05 * Math.cos(tilt) - Math.sin(ma) * pr * 0.5 * Math.sin(tilt), my = py + Math.cos(ma) * pr * 2.05 * Math.sin(tilt) + Math.sin(ma) * pr * 0.5 * Math.cos(tilt);
  const moon = () => flSolid(flCircle(mx, my, pr * 0.2, 36), '#d9cdb0', { shade: 0.22, inner: (x, y, s) => { ctx.fillStyle = '#bfb08f'; for (const [dx, dy, rr] of [[-0.3, -0.2, 0.28], [0.25, 0.3, 0.2]]) { ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, rr * s, 0, TAU); ctx.fill(); } } });
  if (Math.sin(ma) < 0) moon();
  flPlanet(px, py, pr, FLP.coral, { ring: true, ringC: FLP.mustard, tilt, bands: 3, spin: 20 });
  if (Math.sin(ma) >= 0) moon();
  // the hero floats beside the beam, wide-eyed until the light lands, then delighted
  const [hx, hy, hr] = DM.hero, arrived = TT >= dmCu.arrive;
  flHero(hx, hy + Math.sin(TT * 1.6) * 10 * UNIT, hr, { key: 'hero', mood: arrived ? 'happy' : 'wow', look: arrived ? [0.8, -0.5] : [0.2, -0.9], squash: -0.4 * Math.exp(-(TT - dmCu.arrive) * 6) * (arrived ? Math.sin((TT - dmCu.arrive) * 18) : 0) });
  flMotes('space', { n: 18, rise: 6, c: FLP.star });
  flTag('01 · light', { dot: FLP.mustard });
  flCaption('light leaves the star', { at: 0.45 });
}

// ---- era 2: inside a leaf cell. Gears turn the light into sugar cubes that ride a conveyor out to the hero.
const dmGear = () => { const [cx, cy, cr] = DM.cell; return [cx + cr * 0.2, cy - cr * 0.3, cr * 0.3]; };
function dmCubePath() {   // from the big gear, out through the cell's lower left, to the hero's hand
  const [cx, cy, cr] = DM.cell, [hx, hy, hr] = DM.hero2, [gx, gy] = dmGear(), a = [gx - cr * 0.12, gy + cr * 0.2], b = [hx + hr * 1.45, hy - hr * 0.35];
  const c = [cx - cr * 0.55, cy + cr * 0.62], P = [];
  for (let i = 0; i <= 32; i++) { const t = i / 32; P.push([lerp(lerp(a[0], c[0], t), lerp(c[0], b[0], t), t), lerp(lerp(a[1], c[1], t), lerp(c[1], b[1], t), t)]); }
  return P;
}
const dmCube = (x, y, s, rot = 0) => flSolid(xform(rrectPts(-s / 2, -s / 2, s, s, s * 0.24, 4), x, y, rot), FLP.cream, { shadow: s * 1.3, shade: 0.2, rim: 2.5 * UNIT });
function sceneCell() {
  flGround(ERA_BG[1]);
  dmTissue();
  flMotes('cell-far', { n: 34, rise: 22, size: 1.3, c: '#e6efd2' });
  const [cx, cy, cr] = DM.cell;
  // photons keep falling in from the star's side (top left), each with a short glowing trail
  for (let i = 0; i < 7; i++) {
    const R = RNG('dmph', i), u = mod((TT - 3) / 1.4 + i / 7, 1), x0 = cx - cr * 2.2 + R.r(-0.6, 0.6) * cr, y0 = cy - cr * 2.4 + R.r(-0.4, 0.4) * cr;
    const x1 = cx + R.r(-0.5, 0.3) * cr, y1 = cy + R.r(-0.5, 0.1) * cr, k = EZ.i2(u), k0 = EZ.i2(Math.max(0, u - 0.12));
    if (u < 0.9) {
      const g = ctx.createLinearGradient(lerp(x0, x1, k0), lerp(y0, y1, k0), lerp(x0, x1, k), lerp(y0, y1, k)); g.addColorStop(0, flA('#f7c873', 0)); g.addColorStop(1, flA('#f9dfa6', 0.6));
      ctx.strokeStyle = g; ctx.lineWidth = 8 * UNIT; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(lerp(x0, x1, k0), lerp(y0, y1, k0)); ctx.lineTo(lerp(x0, x1, k), lerp(y0, y1, k)); ctx.stroke();
      flGlow(lerp(x0, x1, k), lerp(y0, y1, k), 18 * UNIT, '#f7c873', 0.5); ctx.fillStyle = '#fffaf0'; ctx.beginPath(); ctx.arc(lerp(x0, x1, k), lerp(y0, y1, k), 7 * UNIT, 0, TAU); ctx.fill();
    }
  }
  // the cell (the bridge's counterpart): a membrane glow that breathes, chloroplasts, a nucleus, two gears
  flSolid(flCircle(cx, cy, cr, 80), FLP.sage, { shade: 0.18, rim: 8 * UNIT, inner: () => {
    ctx.fillStyle = flLight(FLP.sage, 0.7); flPath(flCircle(cx - cr * 0.06, cy - cr * 0.06, cr * 0.86, 64)); ctx.fill();
  } });
  for (let i = 0; i < 5; i++) {   // chloroplasts: green capsules drifting round the rim
    const a = i / 5 * TAU + TT * 0.25 + 0.4, rr = cr * 0.68, x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr, w = cr * 0.34, n = [Math.cos(a + Math.PI / 2), Math.sin(a + Math.PI / 2)];
    flSolid(xform(flCapsule(-w / 2, -w * 0.21, w, w * 0.42), x, y, a + Math.PI / 2 + Math.sin(TT * 2 + i) * 0.12), FLP.teal, { shadow: w * 0.5, sa: 0.3, shade: 0.2, rim: 2 * UNIT, inner: (x2, y2, s) => { ctx.fillStyle = flShade(FLP.teal, 0.7); for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.arc(x2 + k * s * 0.36 * n[0], y2 + k * s * 0.36 * n[1], s * 0.13, 0, TAU); ctx.fill(); } } });
  }
  flSolid(flCircle(cx + cr * 0.36, cy + cr * 0.34, cr * 0.19, 40), FLP.coral, { shadow: cr * 0.3, shade: 0.22, inner: (x, y, s) => { ctx.fillStyle = flLight(FLP.coral, 1.3); ctx.beginPath(); ctx.arc(x + s * 0.15, y - s * 0.1, s * 0.35, 0, TAU); ctx.fill(); } });
  const [gx, gy, g1] = dmGear(), g2 = g1 * 0.64, gr = TT * 1.1, ga = -0.5;
  flGear(gx + (g1 + g2) * 0.83 * Math.cos(ga), gy + (g1 + g2) * 0.83 * Math.sin(ga), g2, 7, -gr * 10 / 7 + 0.25, FLP.cream, { shadow: g2 * 1.1 });
  flGear(gx, gy, g1, 10, gr, FLP.mustard, { shadow: g1 * 1.1 });
  // sugar cubes leave the gear along the arrow path and pile up beside the hero
  const P = dmCubePath(), [hx, hy, hr] = DM.hero2, s = 44 * UNIT;
  flArrowPath(P, { frac: EZ.o3(ev(TIMELINE.cues.cubes - 0.4, 0.45)), w: 22 * UNIT, c: FLP.cream, speed: 80 });
  let landed = 0;
  for (let i = 0; i < 6; i++) {
    const t0 = TIMELINE.cues.cubes + i * 0.36, u = (TT - t0) / 0.8;
    if (u >= 1) landed++;
    else if (u > 0) { const [x, y] = pointAt(P, EZ.io(u)); dmCube(x, y - s * 0.55, s * clamp(u * 5), (1 - u) * 1.6); }
  }
  const pile = [[0, 0], [1.06, 0], [2.12, 0], [0.53, -1], [1.59, -1], [1.06, -2]], px0 = hx - hr * 0.35 - s * 2.6, py0 = hy + hr * 0.8;
  for (let i = 0; i < landed; i++) { const k = springEase(TT - (TIMELINE.cues.cubes + i * 0.36 + 0.8), 260, 14); dmCube(px0 + pile[i][0] * s, py0 + pile[i][1] * s * 1.02 - (1 - k) * 60 * UNIT, s); }
  const caught = TT >= TIMELINE.cues.catch;
  flHero(hx, hy, hr, { key: 'hero', mood: TT > 5.3 ? 'wink' : caught ? 'happy' : 'wow', look: caught ? [0.7, -0.2] : [0.9, -0.5], hands: [[hx + hr * 1.3, hy - hr * 0.3 + Math.sin(TT * 5) * 4 * UNIT]] });
  flMotes('cell-near', { n: 12, rise: 40, size: 2.2, c: '#f4e7cc' });
  flTag('02 · life', { dot: FLP.sage });
  flCaption('and becomes sugar', { at: 0.75 });
}
