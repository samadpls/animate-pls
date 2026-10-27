// =====================================================================
//  SCENES — clay demo. Screen = world (no camera); time TT on 2s (stop motion); one layout per format (CD).
//  Era 1, the table: the coral hero pats a cream lump on the beat until it is a ball (each pat re-shapes it, and the
//  lumps shrink). Era 2, the night: the ball is the moon, hung on a thread over a clay village; windows light one by
//  one, stars twinkle, a cloud drifts, the hero waves from the hill. Coral is the hero's alone.
// =====================================================================
const CD = PORTRAIT ? {
  clock: [800, 560, 110], cap1: [CX, 860], table: [1080, 420], back: 1300, front: 1440, window: [150, 470, 330, 280],
  ball: [330, 1150, 150], hero: [725, 1150, 175], plant: [95, 1300, 150], mug: [830, 1440, 52], snail: [360, 1452, 84],
  tag2: 92, moon: [790, 760, 140], cap2: [CX, 940], cloud: [230, 640, 1],
  hills: [[250, 1560, 760, 420, '#4f8a4f'], [870, 1700, 720, 420, '#6aa860']], houses: [[0, 170, 'rose'], [0, 400, 'cream'], [1, 945, 'mustard']], heroX: 600, heroR: 150,
  stars: { x0: 60, x1: 1020, y0: 470, y1: 1080 },
} : WIDE ? {
  clock: [1720, 200, 90], cap1: [930, 330], table: [600, 300], back: 760, front: 885, window: [1220, 250, 300, 220],
  ball: [790, 630, 130], hero: [1140, 622, 160], plant: [330, 760, 150], mug: [1480, 760, 48], snail: [880, 885, 70], plant2: [1700, 760, 130],
  tag2: 92, moon: [1500, 360, 120], cap2: [930, 580], cloud: [470, 420, 1],
  hills: [[500, 1060, 900, 310, '#4f8a4f'], [1400, 1140, 800, 300, '#6aa860']], houses: [[0, 300, 'rose'], [0, 560, 'cream'], [1, 1620, 'mustard'], [1, 1810, 'rose']], heroX: 1150, heroR: 110,
  stars: { x0: 60, x1: 1860, y0: 200, y1: 720 },
} : {
  clock: [900, 190, 80], cap1: [CX, 330], table: [600, 300], back: 760, front: 885,
  ball: [340, 650, 110], hero: [660, 644, 135], plant: [110, 760, 140], mug: [880, 880, 44], snail: [400, 885, 70],
  tag2: 92, moon: [860, 380, 115], cap2: [CX, 545], cloud: [230, 400, 0.85],
  hills: [[250, 1060, 650, 310, '#4f8a4f'], [800, 1140, 620, 300, '#6aa860']], houses: [[0, 190, 'rose'], [0, 410, 'cream'], [1, 950, 'mustard']], heroX: 640, heroR: 110,
  stars: { x0: 60, x1: 1020, y0: 230, y1: 700 },
};
const cdHillY = (h, x) => { const [cx, cy, rx, ry] = CD.hills[h], u = clamp((x - cx) / rx, -0.99, 0.99); return cy - ry * Math.sqrt(1 - u * u); };

// ---- era 1: the table
function cdLump() {   // the lump: re-shaped by each pat (stepped), lumps shrinking until it is a ball at cues.round
  const [x, y, r] = CD.ball, pats = TIMELINE.cues.pat, n = pats.filter((t) => TT >= t).length, round = TT >= TIMELINE.cues.round;
  const amt = round ? r * 0.025 : r * (0.2 - n * 0.04), dt = n ? TT - pats[n - 1] : 9, squash = dt < 0.09 ? 0.22 : dt < 0.17 ? -0.06 : 0;
  const flat = round ? 1 : 0.78 + n * 0.05, sx = (1 + squash * 0.5) / Math.sqrt(flat), sy = flat * (1 - squash);
  const base = y + r;
  clayContact(x + 8, base - 2, r * 1.05 * sx, r * 0.18, 0.42);
  ctx.save(); ctx.translate(x, base); ctx.scale(sx, sy); ctx.translate(0, -r);
  clayPiece('lump', clayLumpy(clayEll(0, 0, r, r, 14), 'lump' + n + (round ? 'r' : '') + clayV(3), amt), CLAY.cream, { variant: clayV(3), bevel: r * 0.12, shine: 0.7 });
  ctx.restore();
}
function cdHeroPat() {
  const [x, y, r] = CD.hero, pats = TIMELINE.cues.pat, round = TT >= TIMELINE.cues.round;
  const n = pats.filter((t) => TT >= t).length, dt = n ? TT - pats[n - 1] : 9, down = !round && dt < 0.17;
  const reach = Math.atan2(CD.ball[1] - (y + r * 0.22), x - r * 0.78 - CD.ball[0]);   // toward the lump
  const arms = [round ? { side: -1, a: 1.25, len: r * 0.45 } : { side: -1, a: down ? reach + 0.35 : reach - 0.15, len: Math.max(r * 0.75, x - r * 0.78 - CD.ball[0] - CD.ball[2] * 0.6), front: true }, { side: 1, a: round ? -1.2 + (B % 2 ? 0.1 : 0) : 1.4, len: r * (round ? 0.85 : 0.42) }];
  clayHero(x, y, r, { key: 'hero', look: round ? [0.2, -0.2] : [-1, 0.5], mood: round ? 'smile' : 'focus', arms, squash: down ? 0.08 : 0 });
}
function sceneTable() {
  clayFelt(CLAY.felt);
  clayClock(...CD.clock, { at: 23, h: 10, m: 10 });
  if (CD.window) clayWindow(...CD.window);
  clayTable(CD.table[0], CD.table[1], CLAY.walnut);
  clayPlant(CD.plant[0], CD.back, CD.plant[2]);
  if (CD.plant2) clayPlant(CD.plant2[0], CD.back, CD.plant2[2], { key: 'plant2', pot: CLAY.mustard });
  cdLump();
  cdHeroPat();
  clayMug(CD.mug[0], CD.mug[1], CD.mug[2], CLAY.teal);
  claySnail(CD.snail[0] + TT * 12, CD.snail[1], CD.snail[2]);
  clayTag('roll a ball', { t: 0.15 });
  clayCaption('made by hand', { x: CD.cap1[0], y: CD.cap1[1], t: 0.7 });
}

// ---- era 2: the night
function cdHouse(x, y, s, col, lit, key) {   // a little clay house sunk into the hill; its window lights at `lit`
  clayPiece(key + 'b', clayLumpy(clayRR(x - s / 2, y - s * 0.8, s, s * 0.85, s * 0.08, s * 0.25), key + 'b', 1.2, 4), col, { bevel: s * 0.07, shine: 0.4 });
  clayPiece(key + 'r', clayLumpy([[x - s * 0.62, y - s * 0.72], [x, y - s * 1.3], [x + s * 0.62, y - s * 0.72]].flatMap((p, i, A) => resample([p, A[(i + 1) % 3]], false, s * 0.2).slice(0, -1)), key + 'r', 1.5, 4), '#c45a48', { bevel: s * 0.06, shine: 0.5 });
  const on = TT >= lit, wx = x - s * 0.17, wy = y - s * 0.55, ws = s * 0.34;
  clayPiece(key + (on ? 'w1' : 'w0'), clayRR(wx, wy, ws, ws, 4), on ? '#ffd27a' : '#2c2a27', { bevel: 3, shine: on ? 0.9 : 0.3, shadow: false, speckle: 0.3, prints: 0 });
}
function cdMoon() {   // the ball, now the moon: craters pressed in, hung on a thread, swaying a little on 2s
  const [x, y, r] = CD.moon, sw = Math.sin(TT * TAU * 0.35) * 0.02;
  ctx.save(); ctx.translate(x, -20); ctx.rotate(sw); ctx.translate(-x, 20);
  ctx.strokeStyle = 'rgba(240,232,214,0.75)'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x, -20); ctx.lineTo(x, y - r + 6); ctx.stroke();
  clayPiece('moon', clayLumpy(clayEll(x, y, r, r, 16), 'moon', r * 0.02), CLAY.moon, { bevel: r * 0.12, shine: 0.6, shadow: 0.5 });
  [[-0.35, -0.2, 0.2], [0.3, 0.25, 0.14], [-0.05, 0.42, 0.1], [0.38, -0.32, 0.09]].forEach(([dx, dy, k], i) =>
    clayPiece('crater' + i, clayEll(x + dx * r, y + dy * r, k * r, k * r * 0.85, 12), clayShade(CLAY.moon, -14), { bevel: k * r * 0.3, light: [0.6, 0.8], shine: 0, shadow: false, speckle: 0.4, prints: 0, marks: 0 }));
  ctx.restore();
}
function cdStars() {
  const { x0, x1, y0, y1 } = CD.stars, R = RNG('cdstars', FORMAT), [mx, my, mr] = CD.moon;
  for (let i = 0; i < 18; i++) {
    const x = R.r(x0, x1), y = R.r(y0, y1), s = R.r(9, 15) * UNIT;
    if (Math.hypot(x - mx, y - my) < mr + 60) continue;
    const tw = [1, 0.7, 0.85][(B + i) % 3];
    ctx.save(); ctx.translate(x, y); ctx.scale(tw, tw);
    clayPiece('star', starPts(0, 0, s * 1.6, 5, -Math.PI / 2, 40), '#ffe9a8', { bevel: 3, shine: 0.8, shadow: false, speckle: 0, prints: 0, marks: 0 });
    ctx.restore();
  }
}
function cdTufts() {   // grass tufts and a few flowers pressed into the front hill (they sway a little on 2s)
  const [cx, cy, rx, ry] = CD.hills[1], R = RNG('tufts', FORMAT), s = (PORTRAIT ? 2.3 : 1.6) * UNIT;
  for (let i = 0; i < 11; i++) {
    const x = cx + R.r(-0.85, 0.85) * rx, top = cdHillY(1, x), y = top + R.r(60, Math.min(ry * 0.75, H - top - 60)), flower = i % 3 === 0;
    if (y > H + 20 || Math.abs(x - CD.heroX) < CD.heroR * 1.2 && y < top + 120) continue;
    const sw = Math.sin(TT * TAU * 0.6 + i) * 0.06;
    clayContact(x, y, 30 * s, 6 * s, 0.25);
    [-0.45, 0, 0.45].forEach((a, k) => { ctx.save(); ctx.translate(x, y); ctx.rotate(a + sw); clayPiece('tuft' + k, clayBean(0, -18 * s, 13 * s, 40 * s, 'tuft' + k, 1), '#3f7a44', { bevel: 3, shine: 0.4, shadow: false }); ctx.restore(); });
    if (flower) {
      clayRope([[x, y - 10 * s], [x + sw * 40, y - 62 * s]], 3.2 * s, '#3f7a44', { key: 'stem' + i, shadow: false, speck: false });
      ctx.save(); ctx.translate(x + sw * 40, y - 66 * s);
      for (let p = 0; p < 5; p++) {
        const a = p / 5 * TAU;
        ctx.save(); ctx.translate(Math.cos(a) * 10 * s, Math.sin(a) * 10 * s);
        clayPiece('petal', clayEll(0, 0, 9 * s, 9 * s, 10), '#f4a0b6', { bevel: 2, shine: 0.6, shadow: false, speckle: 0, prints: 0, marks: 0 });
        ctx.restore();
      }
      clayPiece('pistil', clayEll(0, 0, 7 * s, 7 * s, 10), CLAY.mustard, { bevel: 2, shine: 0.7, shadow: false, speckle: 0, prints: 0, marks: 0 });
      ctx.restore();
    }
  }
}
function sceneNight() {
  clayFelt(CLAY.night);
  cdStars();
  const [cx, cy, ck] = CD.cloud;
  ctx.save(); ctx.translate(cx + (TT - M1) * 22 * UNIT, cy); ctx.scale(ck * UNIT, ck * UNIT);
  [[-70, 10, 120, 80], [0, -20, 140, 110], [75, 12, 120, 80]].forEach(([dx, dy, w, h], i) => clayPiece('cloud' + i, clayBean(dx, dy, w, h, 'cloud' + i, 2), '#ece4d4', { bevel: 9, shine: 0.4, shadowOffset: [5, 8] }));
  ctx.restore();
  cdMoon();
  CD.hills.forEach(([x, y, rx, ry, col], i) => {
    clayPiece('hill' + i, clayLumpy(clayEll(x, y, rx, ry, 18), 'hill' + i, 6, 6), col, { bevel: 18, shine: 0.3, shadowOffset: [10, 6], shadowBlur: 16 });
    if (i === 0) CD.houses.filter((h) => h[0] === 0).forEach(([, hx, c], k) => cdHouse(hx, cdHillY(0, hx) + 14, (PORTRAIT ? 140 : 110) * UNIT, CLAY[c], TIMELINE.cues.lights[k], 'h0' + k));
  });
  CD.houses.filter((h) => h[0] === 1).forEach(([, hx, c], k) => cdHouse(hx, cdHillY(1, hx) + 14, (PORTRAIT ? 150 : 116) * UNIT, CLAY[c], TIMELINE.cues.lights[2 + k], 'h1' + k));
  cdTufts();
  const hx = CD.heroX, r = CD.heroR, waving = TT >= TIMELINE.cues.wave;
  clayHero(hx, cdHillY(1, hx) + 6 - r * 0.86, r, { key: 'hero', look: [0.8, -1], mood: 'smile', arms: [{ side: 1, a: waving ? -1.15 + (B % 2 ? 0.18 : -0.1) : 1.2, len: r * (waving ? 0.85 : 0.5) }, { side: -1, a: 1.2, len: r * 0.5 }] });
  clayTag('hang the moon', { t: M1 + 0.45, size: CD.tag2, color: CLAY.cream });
  clayCaption('goodnight', { x: CD.cap2[0], y: CD.cap2[1], t: M1 + 1.0 });
}
