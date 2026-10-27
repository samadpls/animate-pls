// =====================================================================
//  SCENES — linocut demo. Screen = world (no camera); time TT on 2s; one print pulled per frame; one layout per
//  format (LD). Era 1, the sea by day: a red sun over a paper sky, a wave rising out of the scalloped sea, the
//  swallow skimming it. Era 2, night: the sun is the moon cut out of a black sky; a cottage on a moonlit hill, its
//  window lights red, smoke rises, stars twinkle, the swallow comes home to the roof. Red: the sun, the window, the
//  swallow's throat (the warm light the swallow follows).
// =====================================================================
const LD = PORTRAIT ? {
  hz: 1150, sun: [780, 760, 170], wave: [[170, 1760], [480, 1060], 190, 540], bird: [[150, 1010], [880, 880], 118], cap1: [CX, 520], tagX: 130,
  ground: 1130, moon: [340, 640, 190], house: [700, 1150, 300], cap2: [300, 1236], perch: [700, 905],
} : WIDE ? {
  hz: 640, sun: [1450, 330, 140], wave: [[520, 1120], [760, 690], 130, 360], bird: [[300, 560], [1500, 520], 100], cap1: [900, 300], tagX: 70,
  ground: 720, moon: [1450, 330, 160], house: [700, 730, 250], cap2: [1300, 900], perch: [700, 525],
} : {
  hz: 640, sun: [850, 370, 120], wave: [[230, 1120], [420, 690], 120, 330], bird: [[120, 560], [880, 500], 92], cap1: [400, 290], tagX: 70,
  ground: 700, moon: [810, 330, 150], house: [330, 712, 240], cap2: [770, 900], perch: [330, 517],
};

// ---- era 1: the sea by day
function ldSun() {
  const [x, y, r] = LD.sun, P = ellipsePts(x, y, r, r, 0, 64);
  linoRed(() => { linoBlock(P); linoEcho(P, { n: 3, gap: r * 0.16, w: r * 0.05, key: 'sun' }); });
  const list = [];   // short black rays, cut in the sky block and turning slowly
  for (let i = 0; i < 16; i++) { const a = i / 16 * TAU + TT * 0.15, r0 = r * 1.18, r1 = r * (i % 2 ? 1.42 : 1.6); list.push([[x + Math.cos(a) * r0, y + Math.sin(a) * r0], [x + Math.cos(a) * r1, y + Math.sin(a) * r1]]); }
  linoCuts(list, { ink: true, w: 9 * UNIT, kind: 'v', key: 'rays' });
}
function ldClouds() {   // long tapered black strokes drifting across the paper sky
  const S = RNG('ldcloud'), list = [];
  for (let i = 0; i < 7; i++) {
    const y = LY(S.r(0.08, 0.27)) + (PORTRAIT ? 260 : 0), x = mod(S.r(0, W) + TT * 18 * UNIT * (1 + i % 3), W + 400) - 200, L = S.r(160, 360) * UNIT;
    list.push([[x, y], [x + L * 0.5, y - 6], [x + L, y + 2]]);
  }
  linoCuts(list, { ink: true, w: 8 * UNIT, kind: 'v', key: 'cl' });
}
function sceneSea() {
  linoPaper();
  linoPrint(() => {
    ldClouds();
    ldSun();
    const sea = resample([[-20, LD.hz], [W + 20, LD.hz], [W + 20, H + 20], [-20, H + 20]], true, 30);
    linoBlock(sea, { wob: 1.5, key: 'sea' });
    linoScallops(-20, W + 20, LD.hz + 18, H, { size: 60 * UNIT, gap: 27 * UNIT, grow: 1.8, w: 9 * UNIT, shift: -TT * 20, key: 'sea', clip: sea });
    const [base, curl, r, w] = LD.wave, rise = EZ.o3(seg(TT, TIMELINE.cues.rise, TIMELINE.cues.crest));
    const wv = linoWave({ base, curl, r, w, rise: 0.4 + 0.6 * rise, turn: lerp(0.6, 1.05, rise), n: 10, cw: 10 * UNIT, foam: 28 * UNIT, halo: 9, key: 'dw' });
    const S = RNG('ldspray'), tip = wv.crest[Math.floor(wv.crest.length * 0.35)] || wv.tip, drops = [];
    for (let i = 0; i < 18; i++) { const age = mod(TT * 0.9 + S.f(), 1), a = -1.2 + S.n(0.5), d = (30 + age * S.r(100, 220)) * UNIT; drops.push([tip[0] + Math.cos(a) * d, tip[1] + Math.sin(a) * d, S.r(3, 7) * UNIT, a]); }
    linoDots(drops, { ink: true });
    const [[ax, ay], [bx, by], s] = LD.bird, u = EZ.io(seg(TT, 0.2, 2.6));
    linoBird(lerp(ax, bx, u), lerp(ay, by, u) + Math.sin(TT * 4) * 8 * UNIT, s * UNIT, { tilt: -0.12, halo: 8, key: 'hero' });
  });
  linoTag('at sea', { x: LD.tagX });
  linoCaption('carve the wave', { x: LD.cap1[0], y: LD.cap1[1], t: 0.6 });
}

// ---- era 2: night
function ldGroundY(x) { return LD.ground + Math.sin(x * 0.004 + 0.6) * 26 * UNIT - Math.exp(-(((x - LD.house[0]) / (260 * UNIT)) ** 2)) * 30 * UNIT; }
function ldHouse() {
  const [x, y, s] = LD.house, w = s * 0.78, h = s * 0.56, top = y - h, ridge = top - s * 0.42;
  const body = resample([[x - w / 2, top], [x + w / 2, top], [x + w / 2, y], [x - w / 2, y]], true, 14);
  linoBlock(body, { wob: 1.2, key: 'house' });
  linoHatch(body, { a: Math.PI / 2, gap: s * 0.07, w: s * 0.03, len: [20, 60], skip: [6, 20], key: 'boards', tone: () => 0.8 });
  const roof = resample([[x - w * 0.62, top + 4], [x, ridge], [x + w * 0.62, top + 4]], true, 12);
  linoBlock(roof, { wob: 1.5, key: 'roof', halo: 5 });
  linoScallops(x - w * 0.6, x + w * 0.6, ridge + s * 0.12, top, { size: s * 0.13, gap: s * 0.07, w: s * 0.02, key: 'shingle', clip: roof });
  ctx.fillRect(x + w * 0.2, ridge + s * 0.1, s * 0.09, s * 0.22);   // the chimney
  const lit = TT >= TIMELINE.cues.lamp, win = rrectPts(x - s * 0.24, top + h * 0.28, s * 0.2, s * 0.2, 4, 2);
  linoCarve(() => { trace(win, true); ctx.fill(); });
  if (lit) linoRed(() => { trace(win, true); ctx.fill(); });
  else { ctx.save(); trace(win, true); ctx.clip(); linoChatter(x - s * 0.24, top + h * 0.28, x - s * 0.04, top + h * 0.28 + s * 0.2, { n: 6, al: 0.8, key: 'win' }); ctx.restore(); }
  ctx.fillRect(x - s * 0.15, top + h * 0.28, s * 0.018, s * 0.2); ctx.fillRect(x - s * 0.24, top + h * 0.28 + s * 0.09, s * 0.2, s * 0.018);   // the window's cross
  const door = rrectPts(x + s * 0.06, top + h * 0.38, s * 0.15, h * 0.62, s * 0.07, 3);
  linoCarve(() => { trace(door, true); ctx.lineWidth = 4 * UNIT; ctx.stroke(); });
  const S = RNG('smoke'), puffs = [];   // smoke: black puffs rising from the chimney
  for (let i = 0; i < 6; i++) { const age = mod(TT * 0.5 + i / 6, 1); puffs.push([x + w * 0.24 + Math.sin(age * 5 + i) * 12 * UNIT + age * 40 * UNIT, ridge + s * 0.06 - age * s * 0.9, (6 + age * 16) * UNIT, 0]); }
  linoDots(puffs, { ink: true, flat: 0.8 });
}
function sceneNight() {
  linoPaper();
  linoPrint(() => {
    const G = []; for (let x = -20; x <= W + 20; x += 24) G.push([x, ldGroundY(x)]);
    const sky = resample([[-20, -20], [W + 20, -20], ...G.slice().reverse()], true, 24);   // dense, so trace() keeps the corners
    linoBlock(sky, { key: 'night' });
    linoHatch(sky, { a: 0.04, gap: 22 * UNIT, w: 8 * UNIT, len: [60, 200], skip: [40, 160], key: 'nwind', tone: (x, y) => clamp((y - LD.ground * 0.45) / (LD.ground * 0.6)) * 0.9 });
    const [mx, my, mr] = LD.moon, moon = ellipsePts(mx, my, mr, mr, 0, 64);
    linoCarve(() => { trace(moon, true); ctx.fill(); });
    linoEcho(moon.map(([x, y]) => [mx + (x - mx) * 1.22, my + (y - my) * 1.22]), { n: 2, gap: 16 * UNIT, w: 6 * UNIT, key: 'halo' });
    linoDots([[mx - mr * 0.3, my - mr * 0.2, mr * 0.12], [mx + mr * 0.25, my + mr * 0.3, mr * 0.08], [mx + mr * 0.35, my - mr * 0.35, mr * 0.06]], { ink: true, flat: 0.85 });
    const S = RNG('ldstars', FORMAT), stars = [];
    for (let i = 0; i < 30; i++) { const x = S.r(0, W), y = S.r(LY(0.03), LD.ground - 120 * UNIT); if (Math.hypot(x - mx, y - my) < mr * 1.6) continue; stars.push([x, y, [4, 7, 5][(B + i) % 3] * UNIT, 0]); }
    linoDots(stars, { flat: 1 });
    const hill = []; for (let x = -20; x <= W + 20; x += 30) hill.push([x, ldGroundY(x) + 30 * UNIT]);   // moonlit ground: black furrows on paper
    const rows = []; for (let k = 0; k < 6; k++) rows.push(hill.map(([x, y]) => [x, y + k * k * 9 * UNIT + k * 18 * UNIT]));
    linoCuts(rows, { ink: true, w: 7 * UNIT, kind: 'v', step: 0, key: 'furrow' });
    ldHouse();
    const land = TIMELINE.cues.land, u = EZ.o3(seg(TT, M1 + 0.2, land)), [px, py] = LD.perch, s = LD.bird[2] * UNIT * 0.8;
    linoBird(lerp(-120, px, u), lerp(LD.moon[1], py - s * 0.2, u), s, { tilt: TT < land ? 0.1 : -0.05, flap: TT < land ? undefined : 0.75, halo: 7, key: 'hero' });
  });
  linoTag('at home', { x: LD.tagX });
  linoCaption('print it', { x: LD.cap2[0], y: LD.cap2[1], t: 0.8 });
}
