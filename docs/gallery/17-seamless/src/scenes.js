// =====================================================================
//  SCENES — one take: AI engineer, today. World 1080x1080; time TT on 2s; ev / popS for events.
//  The screen is the doorway: on the desk it already shows the engine running (era 1 drawn live into it),
//  so when the camera pushes through, nothing is replaced, the window just opens.
// =====================================================================
const OT_C = [540, 560];                       // the screen's centre: the push's still point
const OT_SCR = [352, 452, 376, 216];           // the laptop screen (x, y, w, h): the carried object
const OT_LID = [326, 424, 428, 274];           // the lid around it
const OT_DECK = [326, 708, 428, 204];          // the keyboard deck below the hinge
const OT_INZ = 1.3;                            // the inside camera's zoom while it is seen through the screen
const OT_INK = '#3a2417';
const otShadow = (P, key, al = 0.35) => paint(P, { fill: `rgba(30,20,12,${al})`, line: false, key: key + 'sh', tex: [{ k: 'hatch', a: 0.8, gap: 4, al: 0.5 }] });
function otCap(str, x, y, size, t, rot) {   // a caption card, popped in and written on at t (drawn after the camera)
  if (TT < t) return;
  const f = () => inkCard(str, x, y, size, { rot, s: popS(t), frac: ev(t + 0.1, 0.5) });
  if (DEFER) DEFER.push(f); else f();
}

// ---- the desk ------------------------------------------------------------------------------------------
// a sticky note, hand-lettered, stuck along the lid's top edge; pops on at t
function otNote(str, cx, cy, w, h, rot, fill, shade, key, t, size = 34) {
  const s = popS(t); if (s <= 0.01) return;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(s, s);
  otShadow(box(-w / 2 + 7, -h / 2 + 10, w, h), key, 0.3);
  paint(box(-w / 2, -h / 2, w, h), { fill, key, w: 2.6, tex: [
    { k: 'pencil', c: shade, al: 0.55, per: 70 },
    { k: 'hatch', a: 0.8, gap: 5, al: 0.2, dens: (x, y) => clamp((x / w + y / h) * 0.9 + 0.15) }] });
  paint(box(-w / 2, -h / 2, w, h * 0.2), { fill: shade, fillAl: 0.3, line: false, key: key + 'ad', tex: [{ k: 'hatch', a: 0.2, gap: 4, c: shade, al: 0.5 }] });
  const cl = h * 0.22;   // the bottom-right corner, peeling up a little
  paint([[w / 2 - cl, h / 2], [w / 2, h / 2 - cl], [w / 2 - cl * 0.9, h / 2 - cl * 0.9]], { fill: shade, key: key + 'cu', w: 2, tex: [{ k: 'hatch', a: 0.8, gap: 3, al: 0.35 }] });
  const tw = handW(str, size);
  handText(str, -tw / 2, size * 0.42 + 4, size, OT_INK, { key: key + 't' });
  ctx.restore();
}
// era 0's screen shows the inside world live, framed exactly as the carry will open it (no pop at the carry)
function otScreenLive() {
  const PA = camPts(rrectPts(...OT_SCR, 10), camAt(0, TT)), [x0, y0, x1, y1] = bboxOf(PA);
  const cc = PA.reduce((a, p) => [a[0] + p[0] / PA.length, a[1] + p[1] / PA.length], [0, 0]);
  const s0 = Math.min(1, Math.max((x1 - x0) / W, (y1 - y0) / H)), q = [(cc[0] - s0 * W / 2) / (1 - s0), (cc[1] - s0 * H / 2) / (1 - s0)];
  const keepD = DEFER, keepS = SPARK_AT;
  renderEra(1, layer(2), { k: s0, c: q });
  DEFER = keepD; SPARK_AT = keepS;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); trace(PA, true); ctx.clip(); ctx.drawImage(layer(2), 0, 0); ctx.restore();
}
function otLaptop() {
  const [lx, ly, lw, lh] = OT_LID, [dx, dy, dw, dh] = OT_DECK;
  const SILVER = '#d5d0c8', SILVER_L = '#f1eee8';
  otShadow(rrectPts(lx + 14, ly + 18, lw, dy + dh - ly, 26), 'lap', 0.38);
  // the deck: keys and a trackpad
  paint(rrectPts(dx, dy, dw, dh, 26), { fill: SILVER, key: 'deck', w: 3.4, tex: [
    { k: 'pencil', c: SILVER_L, al: 0.55, per: 90 },
    { k: 'hatch', a: 0.8, gap: 6, al: 0.22, dens: (x, y) => clamp(((x - dx) / dw + (y - dy) / dh) * 0.8 - 0.25) }] });
  const KW = 28, KH = 24, KG = 5, kx0 = dx + (dw - (12 * KW + 11 * KG)) / 2, ky0 = dy + 14;
  const key = (x, y, w, id) => paint(rrectPts(x, y, w, KH, 5), { fill: '#c3beb5', key: 'k' + id, w: 1.4, line: 'rgba(58,36,23,0.45)', amt: 0.7, tex: [{ k: 'hatch', a: 0.8, gap: 4, al: 0.18, dens: (px, py) => clamp((px - x) / w + (py - y) / KH - 0.9) }] });
  for (let r = 0; r < 4; r++) for (let i = 0; i < 12; i++) key(kx0 + i * (KW + KG) + (r === 2 ? 6 : 0) * 0, ky0 + r * (KH + KG), KW, r + '_' + i);
  const ry = ky0 + 4 * (KH + KG);
  key(kx0, ry, KW * 2 + KG, 'a'); key(kx0 + 2 * (KW + KG), ry, KW, 'b'); key(kx0 + 3 * (KW + KG), ry, KW * 6 + KG * 5, 'sp');
  key(kx0 + 9 * (KW + KG), ry, KW, 'c'); key(kx0 + 10 * (KW + KG), ry, KW * 2 + KG, 'd');
  paint(rrectPts(dx + dw / 2 - 74, ry + KH + 10, 148, dy + dh - (ry + KH + 10) - 10, 9), { fill: '#cbc6be', key: 'pad', w: 2.2, tex: [{ k: 'hatch', a: 0.8, gap: 5, al: 0.2 }] });
  // the hinge and the lid
  paint(box(lx + 22, ly + lh - 4, lw - 44, 14), { fill: '#8f8a82', key: 'hinge', w: 2.4, tex: [{ k: 'hatch', a: Math.PI / 2, gap: 5, al: 0.4 }] });
  paint(rrectPts(lx, ly, lw, lh, 22), { fill: SILVER, key: 'lid', w: 3.6, tex: [
    { k: 'pencil', c: SILVER_L, al: 0.55, per: 90 },
    { k: 'hatch', a: 0.8, gap: 6, al: 0.22, dens: (x, y) => clamp(((x - lx) / lw + (y - ly) / lh) * 0.8 - 0.3) }] });
  paint(rrectPts(lx + 8, ly + 8, lw - 16, lh - 16, 12), { fill: '#24232a', key: 'bezel', w: 2.2, tex: [{ k: 'hatch', a: 0.8, gap: 5, c: '#000000', al: 0.35 }] });
  ctx.fillStyle = '#5a5862'; ctx.beginPath(); ctx.arc(lx + lw / 2, ly + 15, 3.5, 0, TAU); ctx.fill();
  if (!carrying('screen')) otScreenLive();
  ink(rrectPts(...OT_SCR, 10), { closed: true, w: 2.4, key: 'scrrim', color: '#0d0d14' });
}

// the push: streaks rushing outward from the screen across the desk (the laptop and notes cover their inner ends)
function otSpeedLines() {
  const a = ev(TIMELINE.cues.push, 0.25); if (a <= 0) return;
  const R = RNG('speed');
  for (let i = 0; i < 64; i++) {
    const ang = R.r(0, TAU), r0 = R.r(215, 300), L = R.r(110, 260), w = R.r(2, 4), light = R.f() < 0.6;
    const c = Math.cos(ang), s = Math.sin(ang), [x, y] = OT_C;
    ink([[x + c * r0, y + s * r0], [x + c * (r0 + L), y + s * (r0 + L)]], { w, key: 'sp' + i, amt: 0.6, color: light ? `rgba(255,247,226,${0.8 * a})` : `rgba(58,36,23,${0.5 * a})` });
  }
}
// rest-frame props: out of shot by the time the camera is in the screen
function otPlant(x, y, r) {
  otShadow(ellipsePts(x + 12, y + 16, r, r, 0, 30), 'pl');
  paint(ellipsePts(x, y, r, r, 0, 36), { fill: '#e9e2d4', key: 'pot', w: 3, tex: [{ k: 'hatch', a: 0.8, gap: 5, al: 0.3, dens: (px, py) => clamp((px - x + py - y) / r + 0.3) }] });
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * TAU + 0.3, L = r * 1.15, cx = x + Math.cos(a) * L * 0.55, cy = y + Math.sin(a) * L * 0.55;
    paint(ellipsePts(cx, cy, L * 0.55, L * 0.22, a, 22), { fill: i % 2 ? C.green : C.greenL, key: 'leaf' + i, w: 2.4, tex: [{ k: 'hatch', a: a + 0.6, gap: 4, al: 0.35 }] });
  }
}
function otPhone(x, y, w, h) {
  otShadow(rrectPts(x + 10, y + 14, w, h, 20), 'phn');
  paint(rrectPts(x, y, w, h, 20), { fill: '#2b2b33', key: 'phn', w: 3, tex: [{ k: 'hatch', a: 0.8, gap: 5, c: '#000000', al: 0.3 }] });
  paint(ellipsePts(x + 26, y + 28, 12, 12, 0, 18), { fill: '#46464f', key: 'phc', w: 2, line: C.ink });
}

// ---- 1  desk: a warm desk from above; three project notes stick on along the lid, the hero at the keys
function sceneDesk() {
  const cu = TIMELINE.cues;
  woodSurface(-60, -60, W + 60, H + 60, 'desk');
  for (let i = 0; i < 10; i++) { const R = RNG('crumb', i); ctx.fillStyle = C.woodD; ctx.beginPath(); ctx.arc(R.r(40, 1040), R.r(60, 1040), R.r(2, 5), 0, TAU); ctx.fill(); }
  otPlant(128, 330, 60);
  otPhone(884, 250, 108, 206);
  drawPencil(222, 628, Math.PI + 0.95, 260, 0.6, 'pencil');
  otSpeedLines();
  otLaptop();
  otNote('HeyOz', 351, 404, 110, 70, -0.08, C.yellowL, C.yellow, 'n1', cu.notes[0], 25);
  otNote('MetaSensing', 505, 397, 170, 70, 0.02, C.skyL, C.sky, 'n2', cu.notes[1], 25);
  otNote('Canon Europe', 698, 406, 188, 70, 0.06, C.roseL, C.rose, 'n3', cu.notes[2], 25);
  inkMug(905, 860, 46, 'mug');
  const wow = TT >= cu.push, hx = 540, hy = 770, hr = 34;
  dotHero(hx, hy, hr, { key: 'hero', mood: wow ? 'wow' : 'happy' });
  if (wow) { const by = hy + Math.sin(TT * TAU * 0.9 + 4) * hr * 0.04; ctx.fillStyle = C.ink; ctx.beginPath(); ctx.ellipse(hx, by + hr * 0.4, hr * 0.09, hr * 0.12 * (0.6 + 0.4 * ev(cu.push, 0.2)), 0, 0, TAU); ctx.fill(); }   // an 'o' of surprise
  if (wow) for (let i = 0; i < 3; i++) {   // a jolt of surprise as the screen opens
    const a = -Math.PI / 2 + (i - 1) * 0.55, r0 = hr + 12, r1 = hr + 30;
    ink([[hx + Math.cos(a) * r0, hy + Math.sin(a) * r0], [hx + Math.cos(a) * r1, hy + Math.sin(a) * r1]], { w: 3, key: 'jolt' + i, frac: ev(cu.push, 0.15) });
  }
  otCap('AI engineer, today', 540, 120, 72, cu.tag, -0.02);
}

// ---- the engine ----------------------------------------------------------------------------------------
const OT_SITE = [96, 300, 300, 400];
const OT_GRID = { x: 584, y: 262, w: 126, h: 174, gx: 19, gy: 22 };
const OT_GEN = [-9, -9, -9, -9, -9, -9, 1.0, 2.25, 2.75];   // when each ad starts being generated (0.5s each)
function otProduct(kind, px, py, key) {
  const cream = '#f6efdf', tex = (al = 0.3) => [{ k: 'hatch', a: 0.8, gap: 4, al, dens: (x, y) => clamp((x - px) / 30 + (y - py) / 30 + 0.2) }];
  if (kind === 0) {          // a bottle
    paint(rrectPts(px - 17, py - 16, 34, 50, 9), { fill: cream, key: key + 'b', w: 2.2, tex: tex() });
    paint(box(px - 7, py - 28, 14, 13), { fill: cream, key: key + 'n', w: 2, tex: tex() });
    paint(box(px - 9, py - 38, 18, 10), { fill: C.green, key: key + 'c', w: 2, tex: tex(0.4) });
    paint(box(px - 17, py + 2, 34, 15), { fill: C.green, key: key + 'l', w: 1.8, line: false, tex: tex(0.4) });
  } else if (kind === 1) {   // a jar
    paint(rrectPts(px - 24, py - 12, 48, 42, 13), { fill: cream, key: key + 'b', w: 2.2, tex: tex() });
    paint(rrectPts(px - 27, py - 24, 54, 13, 4), { fill: C.yellow, key: key + 'c', w: 2, tex: tex(0.4) });
    ink([[px - 14, py + 9], [px + 14, py + 9]], { w: 2.4, key: key + 'x', color: OT_INK });
  } else {                   // a gift box
    paint(box(px - 26, py - 16, 52, 44), { fill: cream, key: key + 'b', w: 2.2, tex: tex() });
    paint(box(px - 5, py - 16, 10, 44), { fill: C.green, key: key + 'r', w: 1.6, tex: tex(0.4) });
    for (const s of [-1, 1]) ink(ellipsePts(px + s * 10, py - 22, 10, 6, s * 0.4, 14), { closed: true, w: 2.2, key: key + 'w' + s });
  }
}
function otCardBody(i, x, y) {
  const { w, h } = OT_GRID, kind = i % 3, bc = [C.yellow, C.green, C.yellowL][kind], key = 'ad' + i;
  paint(rrectPts(x, y, w, h, 10), { fill: C.cream, key, line: C.peri, w: 2.6, tex: [
    { k: 'pencil', c: '#e3d4b4', al: 0.5, per: 80 },
    { k: 'hatch', a: 0.8, gap: 5, al: 0.16, dens: (px, py) => clamp((px - x) / w + (py - y) / h - 0.6) }] });
  paint(rrectPts(x + 9, y + 9, w - 18, 98, 7), { fill: bc, key: key + 'bn', w: 2, tex: [{ k: 'hatch', a: 0.8, gap: 5, al: 0.3, dens: (px, py) => clamp((px - x) / w + (py - y) / 110 - 0.3) }] });
  otProduct(kind, x + w / 2, y + 62, key + 'p');
  ink([[x + 12, y + 126], [x + w - 22, y + 126]], { w: 4, key: key + 'h1', color: OT_INK });
  ink([[x + 12, y + 143], [x + w * 0.62, y + 143]], { w: 2.6, key: key + 'h2', color: 'rgba(58,36,23,0.6)' });
  paint(rrectPts(x + 12, y + 152, 48, 14, 7), { fill: kind === 1 ? C.yellow : C.green, key: key + 'cta', w: 1.8, tex: [{ k: 'hatch', a: 0.8, gap: 4, al: 0.35 }] });
}
// an ad card: an empty slot, then printed top-down by a cyan scan line, then done
function otAdCard(i) {
  const g = OT_GRID, x = g.x + (i % 3) * (g.w + g.gx), y = g.y + Math.floor(i / 3) * (g.h + g.gy), p = clamp((TT - OT_GEN[i]) / 0.5);
  if (p < 1) {
    ctx.save(); ctx.setLineDash([10, 9]);
    ink(rrectPts(x, y, g.w, g.h, 10), { closed: true, w: 2.2, key: 'slot' + i, color: p > 0 ? C.cyan : 'rgba(200,208,240,0.45)' });
    ctx.restore();
  }
  if (p <= 0) return;
  const yy = y + g.h * EZ.io(p);
  ctx.save(); ctx.beginPath(); ctx.rect(x - 8, y - 8, g.w + 16, yy - y + 8); ctx.clip(); otCardBody(i, x, y); ctx.restore();
  if (p < 1) {
    ink([[x - 10, yy], [x + g.w + 10, yy]], { w: 14, color: 'rgba(82,214,196,0.25)', key: 'pg' + i });
    ink([[x - 10, yy], [x + g.w + 10, yy]], { w: 3.5, color: '#8ff5e6', key: 'ph' + i });
    for (const s of [-1, 1]) star4(x + g.w / 2 + s * (g.w / 2 + 14), yy, 9, C.white);
  }
}
function otSite() {
  const [x, y, w, h] = OT_SITE;
  paint(rrectPts(x, y, w, h, 14), { fill: C.navy2, key: 'site', line: C.peri, w: 3 });
  [C.rose, C.yellow, C.green].forEach((c, i) => paint(ellipsePts(x + 22 + i * 20, y + 19, 6, 6, 0, 14), { fill: c, key: 'dot' + i, w: 1.4, line: C.peri }));
  ink(rrectPts(x + 86, y + 10, w - 102, 18, 9), { closed: true, w: 1.8, key: 'url', color: C.periD });
  const px = x + 10, py = y + 38, pw = w - 20, ph = h - 48;
  paint(rrectPts(px, py, pw, ph, 8), { fill: C.cream, key: 'page', w: 2, line: C.periD, tex: [{ k: 'pencil', c: '#e3d4b4', al: 0.5, per: 80 }] });
  paint(rrectPts(px + 12, py + 12, pw - 24, 128, 8), { fill: C.yellow, key: 'banner', w: 2.2, tex: [{ k: 'hatch', a: 0.8, gap: 5, al: 0.3, dens: (a, b) => clamp((a - px) / pw + (b - py) / 140 - 0.4) }] });
  otProduct(0, px + pw * 0.72, py + 80, 'sitep');
  ink([[px + 26, py + 52], [px + 120, py + 52]], { w: 5, key: 'st1', color: OT_INK });
  ink([[px + 26, py + 74], [px + 96, py + 74]], { w: 3, key: 'st2', color: 'rgba(58,36,23,0.6)' });
  paint(rrectPts(px + 26, py + 92, 64, 20, 10), { fill: C.green, key: 'scta', w: 1.8, tex: [{ k: 'hatch', a: 0.8, gap: 4, al: 0.35 }] });
  for (let i = 0; i < 4; i++) ink([[px + 16, py + 172 + i * 24], [px + pw - 16 - (i % 2) * 70 - (i === 3 ? 60 : 0), py + 172 + i * 24]], { w: 2.4, key: 'sl' + i, color: 'rgba(58,36,23,0.5)' });
  [C.yellow, C.green, OT_INK].forEach((c, i) => paint(ellipsePts(px + 34 + i * 40, py + ph - 34, 14, 14, 0, 22), { fill: c, key: 'sw' + i, w: 2, tex: [{ k: 'hatch', a: 0.8, gap: 4, al: 0.3 }] }));
  // the scan: a cyan beam sweeping down the page, tinting what it has read
  const k = mod(TT, 1.25) / 1.25, by = py + 6 + (ph - 12) * k;
  ctx.save(); trace(rrectPts(px, py, pw, ph, 8), true); ctx.clip();
  ctx.fillStyle = 'rgba(82,214,196,0.13)'; ctx.fillRect(px, py, pw, by - py);
  hatch({ x0: px, y0: py, x1: px + pw, y1: by }, { key: 'scanh', a: -0.6, gap: 9, c: '#2a9d8f', al: 0.25 });
  ctx.restore();
  ink([[x - 12, by], [x + w + 12, by]], { w: 18, color: 'rgba(82,214,196,0.25)', key: 'beamg' });
  ink([[x - 12, by], [x + w + 12, by]], { w: 4, color: '#8ff5e6', key: 'beam' });
}
// the brand's DNA: two strands in the brand's colours, flowing from the site into the ads
function otHelix(x0, x1, cy, amp) {
  const ph = TT * TAU * 0.8, n = 48, A = [], Bs = [];
  for (let i = 0; i <= n; i++) {
    const x = lerp(x0, x1, i / n), a = (x - x0) / 64 * TAU - ph, e = Math.sin(Math.PI * i / n) ** 0.6;
    A.push([x, cy + Math.sin(a) * amp * e]); Bs.push([x, cy - Math.sin(a) * amp * e]);
  }
  for (let i = 2; i < n - 1; i += 3) ink([A[i], Bs[i]], { w: 2, key: 'rung' + i, color: 'rgba(200,208,240,0.55)', amt: 0.6 });
  for (const [P, c, k] of [[A, C.cyan, 'hA'], [Bs, C.yellow, 'hB']]) {
    ink(P, { w: 12, key: k + 'g', color: c === C.cyan ? 'rgba(82,214,196,0.22)' : 'rgba(240,197,90,0.22)', amt: 0.8 });
    ink(P, { w: 4.5, key: k, color: c, amt: 0.8 });
  }
}

// ---- 2  inside: the ad engine. A brand's site is scanned, its DNA flows out, on-brand ads print in a grid
function sceneInside() {
  const cu = TIMELINE.cues;
  darkWorld('inside');
  hexGrid({ x0: -60, y0: 880, x1: W + 60, y1: H + 60 }, 56, { key: 'hex' });
  for (let i = 0; i < 16; i++) { const R = RNG('st', i); star4(R.r(30, 1050), R.r(40, 1000), R.r(4, 9) * (0.7 + 0.3 * ((B + i) % 2)), C.white); }
  otSite();
  otHelix(OT_SITE[0] + OT_SITE[2] + 6, OT_GRID.x - 10, 500, 34);
  for (let i = 0; i < 9; i++) otAdCard(i);
  if (TT >= cu.hero) {
    const s = popS(cu.hero);
    ctx.save(); ctx.translate(480, 790); ctx.scale(s, s); dotHero(0, 0, 50, { key: 'heroIn', dark: true, mood: 'happy' }); ctx.restore();
  }
  if (TT >= 2.6) handText('brand DNA', 488 - handW('brand DNA', 30) / 2, 578, 30, C.peri, { key: 'dna', frac: ev(2.6, 0.4) });
  otCap('HeyOz: the ad engine that knows your brand', 540, 128, 44, cu.cap, 0.012);
}
