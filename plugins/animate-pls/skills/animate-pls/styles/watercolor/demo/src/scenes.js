// =====================================================================
//  SCENES — watercolor demo. Screen = world (no camera); time TT on 2s; one layout per format (WD).
//  Era 1, the harbour at first light: a graded sky, the sun blooming in, drifting clouds, a headland, the sea with
//  paper left white under the sun, two boats bobbing, gulls, the sparrow on a mooring post.
//  Era 2, the sill at breakfast: the sun is an orange on the window sill, the sparrow hops along to it, chai steams on
//  the table below, the curtain stirs. Terracotta is the sparrow's alone.
// =====================================================================
const WD = PORTRAIT ? {
  hz: 1060, sun: [720, 830, 150], streaks: [[300, 610, 520, 1], [820, 470, 380, 0.8], [180, 800, 300, 0.7]], post: [290, 1360, 74], bird: 140,
  boats: [[650, 1108, 0.9], [915, 1086, 0.62]], gulls: [[420, 700, 34], [560, 640, 26]], head: [[-60, 860], [420, 1060]],
  win: [430, 330, 520, 600], sill: 930, orange: [760, 862, 108], orange2: [920, 892, 70], hop: [470, 530, 575, 600],
  table: 1190, chai: [300, 1350, 1], jar: [860, 1290, 1], curtain: 980,
} : WIDE ? {
  hz: 640, sun: [1260, 455, 120], streaks: [[480, 260, 520, 0.9], [1580, 200, 400, 0.75], [880, 380, 300, 0.6]], post: [430, 860, 64], bird: 112,
  boats: [[880, 712, 0.85], [1620, 690, 0.65]], gulls: [[760, 330, 30], [900, 290, 24]], head: [[-60, 500], [520, 640]],
  win: [930, 110, 600, 470], sill: 580, orange: [1300, 528, 88], orange2: [1440, 556, 56], hop: [1000, 1070, 1130, 1160],
  table: 760, chai: [560, 900, 0.85], jar: [1720, 880, 0.85], curtain: 1530,
} : {
  hz: 640, sun: [700, 455, 120], streaks: [[260, 300, 420, 0.85], [860, 200, 320, 0.7]], post: [210, 860, 62], bird: 112,
  boats: [[560, 712, 0.8], [880, 690, 0.6]], gulls: [[390, 330, 28], [500, 290, 22]], head: [[-60, 500], [340, 640]],
  win: [400, 110, 480, 470], sill: 580, orange: [735, 528, 88], orange2: [850, 556, 52], hop: [440, 500, 545, 575],
  table: 760, chai: [230, 900, 0.85], jar: [900, 880, 0.8], curtain: 880,
};

// ---- era 1: the harbour
const wdBig = { rough: 0.06, step: 90, layers: 18, al: 0.085, edge: 0.3, resK: 0.5, mottle: 14 };   // full-bleed washes: fray only a little
function wdSky() {
  const hz = WD.hz;
  wcWash('sky', wcRect(-160, -160, W + 320, hz + 200), WC.sky, { ...wdBig, grade: [0, -60, 0, hz * 0.62, 1, 0], backruns: 1 });
  wcWash('glow', wcRect(-160, hz - 520 * UNIT, W + 320, 560 * UNIT), WC.naples, { ...wdBig, al: 0.1, grade: [0, hz + 20, 0, hz - 520 * UNIT, 1, 0] });
  WD.streaks.forEach(([x, y, w, k], i) => {   // dawn clouds: loose horizontal strokes, lit ochre underneath, drifting
    ctx.save(); ctx.translate(x + TT * (8 + i * 5) * UNIT, y); ctx.scale(UNIT, UNIT);
    wcWash('st' + i, wcStroke([[-w / 2, 0], [0, -6 * k], [w / 2, 4]], 26 * k, 14 * k), '#9fa7a6', { rough: 0.35, spread: 2.4, layers: 20, al: 0.07, edge: 0.6 });
    wcWash('stl' + i, wcStroke([[-w * 0.4, 18 * k], [w * 0.35, 20 * k]], 8 * k, 5 * k), WC.ochreL, { rough: 0.3, layers: 12, al: 0.09, edge: 0.4 });
    ctx.restore();
  });
}
function wdSea() {
  const hz = WD.hz, [sx] = WD.sun, lifts = [], R = RNG('glit', FORMAT);
  for (let i = 0; i < 26; i++) { const y = hz + 10 + R.r(0, H - hz), w = R.r(40, 220) * UNIT, x = R.r(-40, W); lifts.push({ P: wcRect(x - w / 2, y, w, R.r(2, 6) * UNIT), a: 0.8, rough: 0.08 }); }
  for (let i = 0; i < 9; i++) { const y = hz + 8 + i * i * 3.2 * UNIT, w = (150 - i * 11) * UNIT * R.r(0.6, 1.1); lifts.push({ P: wcRect(sx + R.n(30 * UNIT) - w / 2, y, w, R.r(4, 8) * UNIT), a: 0.95, rough: 0.06 }); }
  wcWash('sea', wcRect(-160, hz - 4, W + 320, H - hz + 200), WC.sky, { ...wdBig, rough: 0.04, layers: 20, al: 0.1, resK: 0.6, lift: lifts, edge: 0.5 });
  wcWash('deep', wcRect(-160, hz + (H - hz) * 0.25, W + 320, H), WC.teal, { ...wdBig, al: 0.07, grade: [0, hz + (H - hz) * 0.25, 0, H, 0, 0.85] });
  // the sun's path: broken ochre dabs narrowing to the horizon
  for (let i = 0; i < 14; i++) { const y = hz + 16 + i * i * 1.6 * UNIT, w = (10 + i * 5) * UNIT * R.r(0.4, 1.2), x = sx + R.n((20 + i * 6) * UNIT); wcWash('sp' + i, wcStroke([[x - w, y], [x + w, y + R.n(2)]], (1.8 + i * 0.25) * UNIT), WC.ochre, { rough: 0.25, layers: 10, al: 0.13, edge: 1.2, mask: false, gran: 0.5, segs: 8 }); }
  ctx.save(); ctx.fillStyle = 'rgba(255,250,236,0.92)';   // glitter on 2s: flecks of white gouache that come and go
  const G = RNG('fleck', B % 3);
  for (let i = 0; i < 16; i++) { const y = hz + 8 + G.r(0, 1) ** 1.6 * 300 * UNIT, x = sx + G.n((40 + (y - hz) * 0.5) * UNIT), w = G.r(6, 22) * UNIT; ctx.fillRect(x - w / 2, y, w, 2.2 * UNIT); }
  ctx.restore();
  for (let i = 0; i < 6; i++) { const y = hz + 80 * UNIT + i * i * 11 * UNIT + 30 * UNIT; if (y > H) break; wcWaveLine(-20, W + 20, y, { amp: (2.5 + i) * UNIT, len: (26 + i * 9) * UNIT, ph: i * 1.7, key: 'wv' + i, w: (1.1 + i * 0.2) * UNIT, al: 0.5 }); }
}
function wdHeadland() {
  const [[x0, ytop], [x1, yb]] = WD.head, hz = WD.hz, hh = hz - ytop, dx = x1 - x0;
  const P = [[x0 - 40, hz + 8], [x0 - 40, ytop + hh * 0.5], [x0 + dx * 0.18, ytop + hh * 0.18], [x0 + dx * 0.32, ytop], [x0 + dx * 0.5, ytop + hh * 0.3], [x0 + dx * 0.75, ytop + hh * 0.62], [x1, hz - 8], [x1 + 60 * UNIT, hz + 8]];
  wcWash('head', P, '#7e9c94', { rough: 0.12, layers: 22, al: 0.07, edge: 1.4, resK: 0.7, segs: 16 });
  wcWash('head2', P.map(([x, y]) => [x, y + (hz - y) * 0.5]), WC.teal, { rough: 0.14, layers: 18, al: 0.07, edge: 1.2, resK: 0.7, segs: 16, grade: [0, ytop + hh * 0.5, 0, hz, 0.4, 1] });
  const lx = x0 + dx * 0.32, ly = ytop + 16 * UNIT;   // a lighthouse on the point: white paper, an ochre lamp, pen lines
  const lw = 16 * UNIT, lh = 70 * UNIT;
  ctx.save(); ctx.fillStyle = WC.paper; ctx.beginPath(); ctx.moveTo(lx - lw, ly + 4); ctx.lineTo(lx - lw * 0.7, ly - lh); ctx.lineTo(lx + lw * 0.7, ly - lh); ctx.lineTo(lx + lw, ly + 4); ctx.fill(); ctx.restore();
  wcWash('lamp', wcRect(lx - lw * 0.75, ly - lh - 16 * UNIT, lw * 1.5, 16 * UNIT), WC.ochre, { rough: 0.05, segs: 8, layers: 10, al: 0.2, mask: false });
  wcPen([[lx - lw, ly + 4], [lx - lw * 0.7, ly - lh], [lx + lw * 0.7, ly - lh], [lx + lw, ly + 4]], { w: 1.8 * UNIT, key: 'lh', lift: 0.1 });
  wcPen([[lx - lw * 0.8, ly - lh - 16 * UNIT], [lx, ly - lh - 30 * UNIT], [lx + lw * 0.8, ly - lh - 16 * UNIT]], { w: 1.6 * UNIT, key: 'lhr', lift: 0 });
  if (Math.floor(TT * 2) % 2 === 0) wcPen([[lx + lw, ly - lh - 8 * UNIT], [lx + lw * 3.2, ly - lh - 12 * UNIT]], { w: 1.4 * UNIT, key: 'beam', al: 0.6, lift: 0 });   // the lamp blinks
  wcPencil([[x0, hz], [W + 20, hz]], { key: 'hz', al: 0.28 });
}
function wdBoat(x, y, k, key) {   // a small fishing boat with a sail, bobbing on 2s (it moves by transform: the washes stay cached)
  const bob = Math.sin(TT * TAU * 0.6 + key.length * 2), rock = Math.sin(TT * TAU * 0.45 + key.length) * 0.05;
  ctx.save(); ctx.translate(x, y + bob * 4 * UNIT); ctx.rotate(rock); ctx.scale(k * UNIT, k * UNIT);
  const hull = [[-110, -10], [110, -18], [86, 22], [-84, 22]], sail = [[10, -30], [12, -196], [100, -44]];
  wcWash(key + 'sail', sail, WC.ochreL, { rough: 0.08, layers: 18, al: 0.09, edge: 1.4, segs: 9, lift: [{ P: [[22, -60], [24, -150], [70, -60]], a: 0.5 }] });
  wcWash(key + 'hull', hull, WC.teal, { rough: 0.05, layers: 20, al: 0.1, edge: 1.6, segs: 10 });
  wcWash(key + 'band', [[-104, -8], [106, -16], [100, -6], [-98, 2]], WC.ochre, { rough: 0.04, layers: 10, al: 0.16, mask: false, gran: 0, segs: 10 });
  wcPen([[-110, -10], [110, -18], [86, 22], [-84, 22], [-110, -10]], { w: 2.6, key: key + 'hp' });
  wcPen([[4, -12], [4, -210]], { w: 2.4, key: key + 'mast', lift: 0.1 });
  wcPen([sail[1], sail[2], sail[0]], { w: 2, key: key + 'sp', al: 0.8 });
  ctx.restore();
  wcWaveLine(x - 120 * k * UNIT, x + 120 * k * UNIT, y + 28 * k * UNIT, { amp: 2.5 * UNIT, len: 18 * UNIT, key: key + 'wake', w: 1.8 * UNIT, al: 0.7 });
}
function wdPost() {   // a mooring post with a rope, its reflection broken by the swell, and the sparrow on top
  const [x, y, w] = WD.post, bot = H + 60;
  wcWash('postr', wcStroke([[x, y + 200 * UNIT], [x + 8, bot]], w * 0.5, w * 0.7), WC.sepiaW, { rough: 0.3, layers: 14, al: 0.06, edge: 0.4, resK: 0.7 });
  wcWash('post', [[x - w / 2, y + 4], [x - w * 0.1, y - 4], [x + w / 2, y + 2], [x + w / 2 + 3, y + 200 * UNIT], [x - w / 2 - 3, y + 200 * UNIT]], WC.sepiaW, { rough: 0.05, layers: 22, al: 0.1, edge: 1.4, backruns: 1, segs: 10 });
  wcWash('postS', [[x + w * 0.12, y], [x + w / 2, y + 2], [x + w / 2 + 3, y + 200 * UNIT], [x + w * 0.15, y + 200 * UNIT]], WC.sepia, { rough: 0.04, layers: 12, al: 0.08, edge: 0.6, mask: false, segs: 8 });
  wcPen([[x - w / 2, y + 200 * UNIT], [x - w / 2, y + 4], [x - w * 0.1, y - 4], [x + w / 2, y + 2], [x + w / 2 + 3, y + 200 * UNIT]], { w: 2.6 * UNIT, key: 'postp' });
  for (let i = 0; i < 2; i++) wcPen([[x - w * 0.3, y + (50 + i * 60) * UNIT], [x + w * 0.3, y + (54 + i * 60) * UNIT]], { w: 1.4 * UNIT, key: 'postg' + i, al: 0.6 });
  const sag = 40 * UNIT, P = []; for (let i = 0; i <= 12; i++) { const u = i / 12; P.push([lerp(x + w / 2, W + 40, u), lerp(y + 70 * UNIT, y + 30 * UNIT, u) + Math.sin(u * Math.PI) * sag]); }
  wcPen(P, { w: 2.2 * UNIT, key: 'rope', lift: 0.15 });
  wcWaveLine(x - w * 1.4, x + w * 1.6, y + 200 * UNIT, { amp: 3 * UNIT, len: 14 * UNIT, key: 'postw', w: 2 * UNIT, al: 0.8 });
  wcBird(x + 4 * UNIT, y - 3, WD.bird * UNIT, { key: 'hero', dir: 1, look: TT > 1.6 ? 'up' : undefined });
}
function sceneHarbour() {
  wdSky();
  const [sx, sy, sr] = WD.sun;
  wcWash('sun', wcEll(sx, sy, sr, sr, 20), WC.ochreL, { rough: 0.08, spread: 1.4, layers: 26, al: 0.1, edge: 1.8, lift: [{ P: wcEll(sx - sr * 0.22, sy - sr * 0.25, sr * 0.42, sr * 0.34, 12), a: 0.6 }], t: TIMELINE.cues.sun, dur: 0.6 });
  wdHeadland();
  wdSea();
  WD.boats.forEach(([x, y, k], i) => wdBoat(x, y, k, 'boat' + i));
  WD.gulls.forEach(([x, y, s], i) => wcGull(x + TT * 28 * UNIT, y - TT * 6 * UNIT, s * UNIT, { key: 'g' + i, ph: i }));
  wdPost();
  wcTag('6:00 am');
  wcCaption('first light');
}

// ---- era 2: the sill
function wdWindow() {   // the window: a pale sky with rooftops, a stone frame, a mullion cross in pen
  const [x, y, w, h] = WD.win, R = RNG('roof', FORMAT);
  wcWash('view', wcRect(x, y, w, h), WC.sky, { rough: 0.03, segs: 16, layers: 18, al: 0.08, edge: 0.6, grade: [0, y, 0, y + h, 0.9, 0.15], resK: 0.7 });
  const roofs = []; let rx = x;
  while (rx < x + w) { const rw = R.r(70, 150) * UNIT, rh = R.r(40, 120) * UNIT; roofs.push([rx, y + h - rh, rw, rh]); rx += rw * R.r(0.8, 1); }
  roofs.forEach(([rx, ry, rw, rh], i) => wcWash('rf' + i, wcRect(rx, ry, Math.min(rw, x + w - rx), y + h - ry), i % 2 ? '#9a9f93' : WC.tealL, { rough: 0.04, segs: 8, layers: 12, al: 0.07, edge: 1.4, mask: false, resK: 0.7 }));
  const bw = 26 * UNIT;
  wcWash('frame', [[x - bw, y - bw], [x + w + bw, y - bw], [x + w + bw, y + h], [x + w, y + h], [x + w, y], [x, y], [x, y + h], [x - bw, y + h]], WC.stone, { rough: 0.03, segs: 20, layers: 16, al: 0.09, edge: 1.4 });
  wcPen(wcRect(x, y, w, h).concat([[x, y]]), { w: 2.2 * UNIT, key: 'winp' });
  wcPen(wcRect(x - bw, y - bw, w + bw * 2, h + bw).concat([[x - bw, y - bw]]), { w: 2.4 * UNIT, key: 'winq' });
  wcPen([[x + w / 2, y], [x + w / 2, y + h]], { w: 3 * UNIT, key: 'mul1', lift: 0.1 });
  wcPen([[x, y + h * 0.45], [x + w, y + h * 0.45]], { w: 3 * UNIT, key: 'mul2', lift: 0.1 });
  WD.gulls.slice(0, 1).forEach(([gx, gy, gs]) => wcGull(x + w * 0.3 + (TT - M1) * 30 * UNIT, y + h * 0.25, gs * 0.7 * UNIT, { key: 'g2' }));
}
function wdCurtain() {   // a sap-green curtain beside the window, stirring on 2s
  const [x, y, w, h] = WD.win, cx = WD.curtain, sway = Math.sin(TT * TAU * 0.4) * 0.035;
  ctx.save(); ctx.translate(cx, y - 40 * UNIT); ctx.transform(1, 0, sway, 1, 0, 0);
  const cw = 130 * UNIT, ch = h + 120 * UNIT, P = [[-cw * 0.3, 0], [cw, 0], [cw * 0.9, ch], [cw * 0.1, ch * 0.96], [-cw * 0.1, ch * 0.5]];
  wcWash('curt', P, WC.sap, { rough: 0.1, layers: 22, al: 0.08, edge: 1.3, segs: 14, backruns: 1 });
  for (let i = 0; i < 3; i++) wcPen([[cw * (0.15 + i * 0.25), 10], [cw * (0.2 + i * 0.25), ch * 0.5], [cw * (0.25 + i * 0.22), ch * 0.95]], { w: 1.6 * UNIT, key: 'fold' + i, al: 0.7 });
  wcPen([[-cw * 0.4, 0], [cw * 1.2, 0]], { w: 3 * UNIT, key: 'rod', lift: 0 });
  ctx.restore();
}
function wdOrange(x, y, r, key) {
  ctx.save(); ctx.fillStyle = wcRgba(WC.paper, 0.9); trace(wobble(wcEll(x, y, r * 0.98, r * 0.92, 24), true, 2, key + 'pp', 8), true); ctx.fill(); ctx.restore();   // paper left under it
  wcWash(key, wcEll(x, y, r, r * 0.94, 18), '#d9822b', { rough: 0.08, spread: 1.4, layers: 26, al: 0.1, edge: 1.7, lift: [{ P: wcEll(x - r * 0.35, y - r * 0.32, r * 0.3, r * 0.2, 10), a: 0.6 }] });
  wcWash(key + 'lf', wcStroke([[x + r * 0.05, y - r * 0.9], [x + r * 0.45, y - r * 1.15], [x + r * 0.75, y - r * 1.0]], r * 0.16), WC.sap, { rough: 0.1, layers: 12, al: 0.12, segs: 8 });
  wcPen(arcPts(x, y, r, 0.3, 2.4, 14).map(([px, py]) => [px, y + (py - y) * 0.94]), { w: 2 * UNIT, key: key + 'p' });
}
function wdChai() {   // a glass of chai on a saucer, steam rising on 2s
  const [x, y, k] = WD.chai, u = k * UNIT;
  ctx.save(); ctx.translate(x, y); ctx.scale(u, u);
  wcWash('saucer', wcEll(0, 70, 120, 30, 18), WC.tealL, { rough: 0.06, layers: 16, al: 0.1, edge: 1.6 });
  wcPen(wcEll(0, 70, 120, 30, 30), { closed: true, w: 2.4, key: 'saup' });
  const glass = [[-60, -70], [60, -70], [46, 74], [-46, 74]];
  wcWash('glass', glass, '#cfe0dc', { rough: 0.03, segs: 10, layers: 12, al: 0.1, edge: 1.5 });
  wcWash('tea', [[-56, -40], [56, -40], [46, 72], [-46, 72]], WC.sepiaW, { rough: 0.03, segs: 10, layers: 20, al: 0.1, edge: 1.2, lift: [{ P: [[-40, -30], [-24, -30], [-22, 60], [-34, 60]], a: 0.5 }], grade: [0, -40, 0, 72, 0.6, 1] });
  wcPen(glass.concat([glass[0]]), { w: 2.4, key: 'glp' });
  for (let i = 0; i < 3; i++) {
    const P = []; for (let j = 0; j <= 10; j++) P.push([-30 + i * 30 + Math.sin(j * 0.8 - TT * 4 + i * 2) * 10, -90 - j * 16]);
    wcPen(P, { w: 1.8, key: 'steam' + i, al: 0.45 * ev(TIMELINE.cues.steam + i * 0.15, 0.4), lift: 0.2 });
  }
  ctx.restore();
}
function wdJar() {   // a jar of marigolds that nod on 2s
  const [x, y, k] = WD.jar, u = k * UNIT;
  ctx.save(); ctx.translate(x, y); ctx.scale(u, u);
  for (let i = 0; i < 4; i++) {
    const a = -0.5 + i * 0.33 + Math.sin(TT * TAU * 0.5 + i) * 0.04, tip = [Math.sin(a) * 200, -110 - Math.cos(a) * 140];
    wcPen([[0, -60], [tip[0] * 0.5, tip[1] * 0.6], tip], { w: 1.8, key: 'stem' + i, color: WC.sapD, al: 0.8 });
    ctx.save(); ctx.translate(tip[0], tip[1]); wcWash('fl' + (i % 2), wcEll(0, 0, 30, 26, 12), WC.ochre, { rough: 0.3, layers: 16, al: 0.12, edge: 1.4, backruns: 1 }); ctx.restore();
  }
  const jar = [[-58, -80], [58, -80], [66, 60], [-66, 60]];
  wcWash('jar', jar, WC.tealL, { rough: 0.04, segs: 10, layers: 14, al: 0.09, edge: 1.6, lift: [{ P: [[30, -60], [42, -60], [48, 40], [36, 40]], a: 0.7 }] });
  wcPen(jar.concat([jar[0]]), { w: 2.2, key: 'jarp' });
  ctx.restore();
}
function sceneSill() {
  wcWash('wall', wcRect(-160, -160, W + 320, H + 320), WC.naples, { ...wdBig, al: 0.07 });
  wcWash('wallsh', wcRect(-160, -160, W * 0.4, H + 320), WC.ochreL, { ...wdBig, al: 0.04, grade: [0, 0, W * 0.4 - 160, 0, 1, 0] });
  wdWindow();
  wdCurtain();
  const [x, , w] = WD.win, sy = WD.sill, sd = 44 * UNIT;
  wcWash('sill', wcRect(x - 50 * UNIT, sy, w + 100 * UNIT, sd), WC.stone, { rough: 0.03, segs: 14, layers: 16, al: 0.1, edge: 1.5 });
  wcPen([[x - 50 * UNIT, sy], [x + w + 50 * UNIT, sy], [x + w + 50 * UNIT, sy + sd], [x - 50 * UNIT, sy + sd], [x - 50 * UNIT, sy]], { w: 2.4 * UNIT, key: 'sillp' });
  wdOrange(...WD.orange2, 'orange2');
  wdOrange(...WD.orange, 'orange');
  // the table and its cloth
  wcWash('table', wcRect(-160, WD.table, W + 320, H - WD.table + 200), WC.tealL, { ...wdBig, al: 0.06, grade: [0, WD.table, 0, H, 1, 0.4] });
  for (let i = 0; i < 2; i++) wcWash('cloth' + i, wcRect(-160, WD.table + (40 + i * 34) * UNIT, W + 320, (i ? 8 : 16) * UNIT), WC.teal, { rough: 0.04, step: 60, layers: 12, al: 0.09, edge: 1.2, mask: false, resK: 0.7 });
  wcPencil([[-20, WD.table], [W + 20, WD.table]], { key: 'tbl', al: 0.35 });
  wdJar();
  wdChai();
  // the sparrow hops along the sill toward the orange
  const hops = TIMELINE.cues.hop, n = hops.filter((t) => TT >= t + 0.34).length, hx = WD.hop, cur = TT > hops[0] && n < 3 ? hops.findIndex((t) => TT >= t && TT < t + 0.34) : -1;
  const bx = cur >= 0 ? lerp(hx[cur] * (1), hx[cur + 1], clamp((TT - hops[cur]) / 0.34)) : hx[n];
  wcBird(bx, sy, WD.bird * 1.15 * UNIT, { key: 'hero', dir: 1, hop: hops, mood: n >= 3 ? 'wow' : undefined, look: n >= 3 ? 'down' : undefined });
  wcTag('7:30 am');
  wcCaption('then breakfast');
}
