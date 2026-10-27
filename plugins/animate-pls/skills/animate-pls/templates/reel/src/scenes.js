// =====================================================================
//  SCENES — reel template. One stage in every shot (rcStage): requests fall from the clients into the cache; the
//  cache serves them (they turn back with a tick) or misses (they slide to the chute and drop into the database).
//  The database has a face and a temperature: it sweats, then burns. Stage drawing is in stage units under rcFit()
//  (the clients at y -110, the cache at 230, the database 560–840, the server floor from 980: only 9:16 shows the
//  clients and much of the floor). Title cards are screen space (DEFER); kit/captions.js letters the words.
// =====================================================================
const RC = {
  cache: { x: 130, y: 230, w: 740, h: 236 },
  chute: { x: 462, y: 440, w: 76, h: 140 },
  db: { x: 500, top: 600, bot: 800, rx: 178, ry: 40 },
  red: C.red, hot: C.mag, warm: C.cyan, fix: C.glow,
};
const rcSlot = (i) => [RC.cache.x + 46 + (i % 5) * 134, RC.cache.y + 86 + Math.floor(i /5) * 74, 108, 42];   // x, y, w, h
const rcShadow = (P, key) => paint(P, { fill: 'rgba(0,0,0,0.38)', line: false, key: key + 'sh', tex: [{ k: 'hatch', a: 0.8, gap: 4, c: '#000000', al: 0.5 }] });
function rcFit(f) { ctx.save(); ctx.translate(SX(0), SY(0)); ctx.scale(SK, SK); f(); ctx.restore(); }
// the camera of the shot being drawn ('drift', 'wide', 'db', 'cache', 'face', 'pull'): close shots drop small labels
const rcShot = () => (SHOT_LIST.find((s) => Math.abs(s[2] - E0) < 1e-6) || SHOT_LIST[0])[3];

// ---- the world: inside the machine. Navy, dust and stars, a hex floor, the clients up top, server racks below
function rcWorld(key) {
  darkWorld(key);
  hexGrid({ x0: -60, y0: SY(850), x1: W + 60, y1: H + 60 }, 54 * SK, { key: key + 'hx', c: 'rgba(150,164,230,0.16)' });
  for (let i = 0; i < 18; i++) { const R = RNG('rcst', i); star4(R.r(30, W - 30), R.r(30, H * 0.9), R.r(3, 8) * (0.7 + 0.3 * ((B + i) % 2)), 'rgba(244,246,255,0.75)'); }
  rcFit(() => { rcClients(); rcRacks(); });
}
const RC_CLIENT_X = [170, 335, 500, 665, 830];
function rcClients() {   // phones and laptops, each with a cable down to the cache
  RC_CLIENT_X.forEach((x, i) => {
    const y = -112;
    ink([[x, y + 52], [lerp(x, 500, 0.25) + (i - 2) * 8, 60], [lerp(x, 500, 0.12), RC.cache.y + 4]], { w: 3, color: 'rgba(124,134,196,0.6)', key: 'cab' + i, amt: 2 });
    if (i % 2) {   // a laptop
      paint(rrectPts(x - 60, y - 40, 120, 76, 8), { fill: '#2b2d4a', key: 'lt' + i, line: C.peri, w: 3, amt: 0.8 });
      paint(rrectPts(x - 50, y - 31, 100, 56, 4), { fill: '#090a17', key: 'ls' + i, line: false, amt: 0.5 });
      ink([[x - 36, y - 12], [x + 6 + 20 * ((B + i) % 3) / 2, y - 12]], { w: 4, color: C.cyan, key: 'll' + i, amt: 0.4 });
      paint([[x - 74, y + 38], [x + 74, y + 38], [x + 62, y + 52], [x - 62, y + 52]], { fill: '#3a3d63', key: 'lb' + i, line: C.peri, w: 2.6, amt: 0.6 });
    } else {       // a phone
      paint(rrectPts(x - 30, y - 48, 60, 100, 12), { fill: '#2b2d4a', key: 'ph' + i, line: C.peri, w: 3, amt: 0.8 });
      paint(rrectPts(x - 22, y - 36, 44, 74, 5), { fill: '#090a17', key: 'ps' + i, line: false, amt: 0.5 });
      ink([[x - 12, y - 14], [x + 12, y - 14]], { w: 4, color: C.cyan, key: 'pl' + i, amt: 0.4 });
      ink([[x - 12, y], [x + 4 + 6 * ((B + i) % 2), y]], { w: 4, color: C.periD, key: 'pm' + i, amt: 0.4 });
    }
  });
}
function rcRacks() {   // the server floor under the database: dim racks with blinking lights (decoration)
  for (let i = 0; i < 5; i++) {
    const x = -40 + i * 230, y = 990 + (i % 2) * 30, w = 190, h = 420;
    paint(rrectPts(x, y, w, h, 10), { fill: '#11132b', key: 'rk' + i, line: 'rgba(124,134,196,0.55)', w: 2.6, tex: [{ k: 'hatch', a: 0.8, gap: 6, c: '#05060f', al: 0.6 }] });
    for (let r = 0; r < 6; r++) {
      ink([[x + 16, y + 34 + r * 46], [x + w - 16, y + 34 + r * 46]], { w: 2, color: 'rgba(124,134,196,0.35)', key: 'rkl' + i + r, amt: 0.5 });
      const on = (B + i * 5 + r * 3) % 9 < 5;
      ctx.fillStyle = on ? (r % 3 ? C.glow : C.cyan) : '#1d2a3a'; ctx.beginPath(); ctx.arc(x + w - 30, y + 20 + r * 46, 5, 0, TAU); ctx.fill();
    }
  }
}

// ---- the key slots: warm (cyan, a key inside), cold (dark, dashed), with a TTL bar under each
function rcKeyGlyph(x, y, s, c, key) {   // a little key: a ring, a shaft, two teeth
  ink(ellipsePts(x - 16 * s, y, 9 * s, 9 * s, 0, 16), { closed: true, w: 3.4 * s, color: c, key: key + 'r', amt: 0.6 });
  ink([[x - 7 * s, y], [x + 20 * s, y]], { w: 3.4 * s, color: c, key: key + 's', amt: 0.5 });
  ink([[x + 12 * s, y], [x + 12 * s, y + 8 * s]], { w: 3 * s, color: c, key: key + 't1', amt: 0.4 });
  ink([[x + 19 * s, y], [x + 19 * s, y + 6 * s]], { w: 3 * s, color: c, key: key + 't2', amt: 0.4 });
}
// k = { warm: 0 | 1, ttl: 0..1, hot, flash: a hit lighting it up, gone: 0..1 over the moment it expires }
function rcSlotDraw(i, k) {
  const [x, y, w, h] = rcSlot(i), key = 'slot' + i;
  if (k.warm > 0.5) {
    if (k.flash) ink(rrectPts(x - 8, y - 8, w + 16, h + 16, 20), { closed: true, w: 6, color: 'rgba(82,214,196,0.45)', key: key + 'gl' });
    paint(rrectPts(x, y, w, h, 14), { fill: k.flash ? '#c9f6ee' : RC.warm, key, w: 3, line: k.hot ? RC.hot : C.ink, tex: [{ k: 'hatch', a: 0.8, gap: 6, c: '#2a9d8f', al: 0.45 }] });
    rcKeyGlyph(x + w / 2, y + h / 2, 0.95, k.hot ? RC.hot : C.ink, key + 'g');
    if (k.hot) ink(rrectPts(x - 6, y - 6, w + 12, h + 12, 18), { closed: true, w: 4, color: RC.hot, key: key + 'hot' });
  } else {
    ctx.save(); ctx.setLineDash([9, 8]);
    ink(rrectPts(x, y, w, h, 14), { closed: true, w: 2.6, color: k.hot ? RC.hot : C.periD, key: key + 'c' });
    ctx.restore();
    rcKeyGlyph(x + w / 2, y + h / 2, 0.95, 'rgba(124,134,196,0.45)', key + 'gc');
  }
  if (k.gone > 0 && k.gone < 1) burst(x + w / 2, y + h / 2, 34 + 20 * k.gone, 62 + 40 * k.gone, { c: k.hot ? RC.hot : C.peri, n: 9, w: 3, key: key + 'b' });
  const by = y + h + 9;   // the TTL bar
  paint(rrectPts(x + 2, by, w - 4, 12, 5), { fill: '#05060f', line: C.periD, w: 1.6, key: key + 'tt', amt: 0.6 });
  if (k.ttl > 0.02) paint(rrectPts(x + 4, by + 2, (w - 8) * clamp(k.ttl), 8, 3), { fill: k.hot ? RC.hot : C.peri, line: false, key: key + 'tf', amt: 0.3 });
}

// ---- the cache: a navy panel with the keys, a header and blinking lights; the chute leaves through its floor
function rcCache(keys) {
  const { x, y, w, h } = RC.cache;
  rcShadow(rrectPts(x + 14, y + 18, w, h, 24), 'cache');
  paint(rrectPts(x, y, w, h, 24), { fill: C.navy2, key: 'cache', line: C.ink, w: 5, tex: [
    { k: 'stipple', c: 'rgba(150,160,220,0.35)', n: 700, s: 2 },
    { k: 'hatch', a: 0.8, gap: 6, c: '#05060f', al: 0.5, dens: (px, py) => clamp((px - x + py - y - (w + h) * 0.55) / ((w + h) * 0.45)) },
  ] });
  ink(rrectPts(x + 10, y + 10, w - 20, h - 20, 18), { closed: true, w: 2.4, color: C.peri, key: 'crim' });
  if (['wide', 'pull'].includes(rcShot())) monoText('redis', x + 48, y + 54, 44, C.peri, { key: 'redis' });   // wide shots only: close ones push it under the phone UI
  ink([[x + 24, y + 72], [x + w - 24, y + 72]], { w: 2, color: C.periD, key: 'chr' });
  for (let i = 0; i < 3; i++) {
    const on = (B + i * 3) % 7 < 4;
    paint(ellipsePts(x + w - 110 + i * 30, y + 38, 9, 9, 0, 14), { fill: on ? C.glow : '#1d3a2a', line: C.peri, w: 2, key: 'led' + i, amt: 0.4 });
  }
  keys.forEach((k, i) => rcSlotDraw(i, k));
}
function rcChute() {
  const { x, y, w, h } = RC.chute;
  rcShadow(rrectPts(x + 8, y + 10, w, h, 14), 'chute');
  paint(rrectPts(x, y, w, h, 14), { fill: '#090a17', key: 'chute', line: C.peri, w: 3, tex: [{ k: 'hatch', a: 0.8, gap: 5, c: C.periD, al: 0.35 }] });
}

// ---- the database: a cream drum with a face; heat 0..1 = how hard the origin is being hit
function rcDB(heat, mood) {
  const { x, top, bot, rx, ry } = RC.db, key = 'db';
  const wob = heat > 0.55 && mood !== 'dread' ? Math.sin(TT * 37) * 3 * heat : 0;   // it shakes while it burns
  ctx.save(); ctx.translate(wob, 0);
  if (heat > 0.3) for (let i = 0; i < 3; i++) ink(ellipsePts(x, (top + bot) / 2, rx + 26 + i * 18, (bot - top) / 2 + 60 + i * 16, 0, 40), { closed: true, w: 10 - i * 3, color: `rgba(212,56,44,${(0.22 - i * 0.06) * heat})`, key: 'heat' + i, amt: 3 });
  rcShadow(ellipsePts(x + 18, bot + 22, rx + 12, ry + 12, 0, 40), 'dbs');
  const body = [...arcPts(x, bot, rx, 0, Math.PI, 24, ry / rx), ...arcPts(x, top, rx, Math.PI, TAU, 24, ry / rx)];
  paint(body, { fill: heat > 0.7 ? '#f6d9c4' : C.cream, key, w: 4.5, tex: [
    { k: 'pencil', c: '#fffaf0', al: 0.5, per: 70 },
    { k: 'hatch', a: 0.8, gap: 5, al: 0.42, dens: (px) => clamp((px - x + rx * 0.1) / (rx * 0.9)) },
    ...(heat > 0.35 ? [{ k: 'hatch', a: -0.7, gap: 7, c: RC.red, al: 0.5 * heat, dash: [10, 30] }] : []),
  ] });
  ink(arcPts(x, top + 40, rx, 0.05, Math.PI - 0.05, 22, ry / rx), { w: 2.6, key: 'band1', amt: 0.8 });
  ink(arcPts(x, bot - 30, rx, 0.05, Math.PI - 0.05, 22, ry / rx), { w: 2.6, key: 'band2', amt: 0.8 });
  paint(ellipsePts(x, top, rx, ry, 0, 44), { fill: '#fbf4e4', key: 'lid', w: 4, tex: [{ k: 'hatch', a: 0.8, gap: 6, al: 0.25, dens: (px, py) => clamp((py - top) / ry) }] });
  rcFace(x, top + 104, mood, heat);
  ctx.restore();
}
function rcFace(x, y, mood, heat) {
  const blink = ((B + 17) % 37) < 2 && mood !== 'panic' && mood !== 'dread';   // never on frame 0
  const wide = mood === 'panic' || mood === 'dread';
  for (const s of [-1, 1]) {
    const ex = x + s * 50;
    if (blink) { ink([[ex - 14, y], [ex + 14, y]], { w: 4.5, key: 'bl' + s, amt: 0.3 }); continue; }
    if (wide) {
      paint(ellipsePts(ex, y, 22, 25, 0, 18), { fill: '#ffffff', key: 'ew' + s, w: 3.4, amt: 0.6 });
      ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(ex + (mood === 'dread' ? 0 : s * -4), y + 3, mood === 'dread' ? 5 : 8.5, 0, TAU); ctx.fill();
    } else if (mood === 'happy') {
      ink(arcPts(ex, y + 8, 15, Math.PI * 1.1, Math.PI * 1.9, 10), { w: 5, key: 'eh' + s, amt: 0.4 });
    } else { ctx.fillStyle = C.ink; ctx.beginPath(); ctx.ellipse(ex, y, 8, 12, 0, 0, TAU); ctx.fill(); }
    // brows: raised and tilted when it is hit, gone when it is fine
    if (mood !== 'happy' && mood !== 'ok') ink([[ex - 20 * s, y - 40 + (mood === 'dread' ? -4 : 0)], [ex + 14 * s, y - 46]], { w: 4.5, key: 'br' + s, amt: 0.5 });
  }
  const my = y + 52;
  if (mood === 'happy') ink(arcPts(x, my - 14, 30, Math.PI * 0.15, Math.PI * 0.85, 12), { w: 5.5, key: 'mh', amt: 0.4 });
  else if (mood === 'ok') ink(arcPts(x, my - 12, 18, Math.PI * 0.2, Math.PI * 0.8, 10), { w: 5, key: 'mo', amt: 0.4 });
  else if (mood === 'panic') paint(ellipsePts(x, my, 20, 25, 0, 18), { fill: '#3a1410', key: 'mp', w: 3.5, amt: 0.6 });
  else { const P = []; for (let i = 0; i <= 10; i++) P.push([x - 30 + i * 6, my + Math.sin(i * 1.6) * 4.5]); ink(P, { w: 5, key: 'mw', amt: 0.4 }); }
  if (heat > 0.25 && mood !== 'happy') for (let i = 0; i < 2; i++) {   // sweat
    const ph = mod(TT * 0.9 + i * 0.5, 1), sx = x + (i ? 1 : -1) * 124, sy = y - 44 + ph * 80;
    paint([[sx, sy - 18], [sx + 10, sy + 2], [sx, sy + 12], [sx - 10, sy + 2]], { fill: C.skyL, key: 'sw' + i, w: 2.4, amt: 0.6 });
  }
}
// flames on the lid (heat >= 0.58); still = no sway (a held frame), only the ink boils
function rcFlames(heat, still) {
  const { x, top } = RC.db;
  if (heat < 0.58) return;
  const k = 0.4 + 0.6 * clamp((heat - 0.58) / 0.42);
  for (let i = 0; i < 7; i++) {
    const R = RNG('fl', i), J = RNG('fl', i, B), bx = x - 141 + i * 47 + J.n(3);
    const hgt = (62 + R.r(0, 74)) * k * (still ? 1 : 0.85 + 0.15 * Math.sin(TT * 9 + i)), wd = 26 + R.r(0, 8);
    const sway = still ? 0 : J.n(10) + Math.sin(TT * 6 + i * 2) * 8, by = top - 6 + Math.abs(i - 3) * 5;
    const tongue = (s, c, kk, tex) => paint([[bx - wd * s, by], [bx - wd * 0.7 * s + sway * 0.3, by - hgt * 0.45 * s], [bx + sway, by - hgt * s], [bx + wd * 0.6 * s + sway * 0.3, by - hgt * 0.5 * s], [bx + wd * s, by]], { fill: c, key: 'fl' + kk + i, w: s > 0.7 ? 3 : 0, line: s > 0.7 ? C.ink : false, amt: 2.4, tex });
    tongue(1, RC.red, 'o', [{ k: 'hatch', a: 0.9, gap: 5, c: '#7a1a12', al: 0.45, dens: (px, py) => clamp((px - bx) / wd + 0.3) }]);
    tongue(0.58, C.orange, 'i', [{ k: 'pencil', c: C.orangeL, al: 0.6, per: 30 }]);
    tongue(0.26, C.orangeL, 'c');
  }
}
function rcSmoke(k) {
  if (k <= 0 || k >= 1) return;
  const { x, top } = RC.db;
  for (let i = 0; i < 5; i++) {
    const P = []; for (let j = 0; j <= 9; j++) P.push([x - 120 + i * 60 + Math.sin(j * 0.9 + TT * 3 + i) * 12, top - 20 - j * 14 - k * 50]);
    ink(P, { w: 5, color: 'rgba(200,208,240,0.55)', key: 'sm' + i, amt: 1.5, frac: 1 - k });
  }
}

// ---- requests: paper slips. kind '?' (a key that doesn't exist), 'key', 'hot'. fate: 'hit' (the cache serves it:
// it turns back with a tick), 'miss' (it drops through the chute into the database: red), 'fetch' (a calm refill
// on the way to the database: no alarm). layer 'top' draws the part above the cache, 'drop' the part in the chute.
const RC_FALL = 0.36, RC_HIT = 0.34, RC_SLIDE = 0.2, RC_DROP = 0.24, RC_TRIP = RC_FALL + RC_SLIDE + RC_DROP;
function rcSlip(x, y, s, kind, key, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? 0); ctx.scale(s, s);
  paint(rrectPts(-36, -24, 72, 48, 9), { fill: C.paper, key: key + 'p', w: 3, line: o.line || C.ink, amt: 0.8 });
  if (kind === '?') {   // a question mark drawn in ink (an icon, not text)
    ink([...arcPts(0, -6, 10, Math.PI * 1.05, Math.PI * 2.35, 12), [2, 6]], { w: 5, color: RC.red, key: key + 'q', amt: 0.5 });
    ctx.fillStyle = RC.red; ctx.beginPath(); ctx.arc(2, 15, 3.6, 0, TAU); ctx.fill();
  }
  else rcKeyGlyph(2, 0, 0.85, kind === 'hot' ? RC.hot : C.ink, key + 'k');
  if (o.check) ink([[-13, 2], [-3, 13], [17, -11]], { w: 5, color: '#2a9d8f', key: key + 'ck', amt: 0.4 });
  ctx.restore();
}
function rcReq(q, layer) {
  const u = TT - q.ts; if (u < 0) return 0;
  const [sx, sy, sw] = rcSlot(q.slot), tx = sx + sw / 2, rot = RNG('rr', q.key).n(0.25), line = q.fate === 'miss' ? RC.red : C.ink;
  if (u < RC_FALL) { if (layer === 'top') { const k = EZ.i2(u / RC_FALL); rcSlip(lerp(q.x0, tx, k), lerp(-60, sy - 6, k), 1, q.kind, q.key, { rot }); } return 0; }
  if (q.fate === 'hit') {
    const k = EZ.o2((u - RC_FALL) / RC_HIT);
    if (k < 1 && layer === 'top') rcSlip(lerp(tx, tx + 80, k), lerp(sy - 6, -40, k), 1 - 0.5 * k, q.kind, q.key, { rot: rot - k * 0.8, check: true, line: '#2a9d8f' });
    return 0;
  }
  const u2 = u - RC_FALL;
  if (u2 < RC_SLIDE) { if (layer === 'top') { const k = EZ.io(u2 / RC_SLIDE); rcSlip(lerp(tx, 500, k), lerp(sy + 10, RC.chute.y + 8, k), 1, q.kind, q.key, { rot: rot * (1 - k), line }); } return 0; }
  const u3 = u2 - RC_SLIDE;
  if (u3 < RC_DROP) { if (layer === 'drop') { const k = EZ.i2(u3 / RC_DROP); rcSlip(500, lerp(RC.chute.y + 8, RC.db.top, k), 1 - 0.3 * k, q.kind, q.key, { line }); } return 0; }
  return q.fate === 'miss' && u3 < RC_DROP + 0.25 ? 1 - (u3 - RC_DROP) / 0.25 : 0;   // the impact glow: 1 -> 0
}
// a stream: n slips from t0, one every dt (jittered); pick(i, R) -> { kind, fate, slot }. Pure: the same list on
// every frame. rcLit lights the slots a hit is touching now; rcLanded counts misses already in the database.
function rcPlan(t0, n, dt, pick, key) {
  const out = [];
  for (let i = 0; i < n; i++) { const R = RNG(key, i), ts = t0 + i * dt + R.r(0, dt * 0.4), x0 = RC_CLIENT_X[R.i(0, 4)] + R.n(20); out.push({ ts, x0, key: key + i, ...pick(i, R) }); }
  return out;
}
function rcLit(plan, keys) {
  for (const q of plan) if (q.fate === 'hit' && TT >= q.ts + RC_FALL - 0.05 && TT < q.ts + RC_FALL + 0.2) keys[q.slot].flash = 1;
  return keys;
}
const rcLanded = (plan) => plan.filter((q) => q.fate === 'miss' && TT >= q.ts + RC_TRIP).length;
function rcImpact(k) {
  if (k <= 0) return;
  burst(RC.db.x, RC.db.top - 6, 34, 80 + 44 * k, { c: RC.red, n: 11, w: 4.5, al: k, key: 'imp' });
}

// ---- one frame of the stage. s = { keys, heat, mood, smoke, still, reqs: [plans] }
function rcStage(s) {
  const reqs = (s.reqs || []).flat(), close = !['wide', 'pull'].includes(rcShot());
  rcFit(() => {
    rcChute();
    rcCache(s.keys);
    for (const q of reqs) rcReq(q, 'drop');
    rcDB(s.heat, s.mood);
    rcFlames(s.heat, s.still);
    rcSmoke(s.smoke ?? 0);
    let imp = 0;
    for (const q of reqs) imp = Math.max(imp, rcReq(q, 'top'));
    rcImpact(imp);
    if (!close) rcDBTag();
  });
}
function rcDBTag() {   // a paper tag on a string: "database"
  const x = 172, y = 748;   // in from the edge: the payoff's pull-back starts at 1.16x
  ink([[x + 150, y - 34], [RC.db.x - RC.db.rx + 10, RC.db.top + 64]], { w: 2.4, color: C.peri, key: 'tagstr' });
  ctx.save(); ctx.translate(x, y); ctx.rotate(-0.06);
  paint(rrectPts(0, -42, 168, 56, 10), { fill: C.paper, key: 'dbtag', w: 3, tex: [{ k: 'pencil', c: '#e8d6b0', al: 0.5, per: 90 }] });
  monoText('database', 14, -4, 28, C.ink, { key: 'dbt' });
  ctx.restore();
}
const rcKeys = (f) => Array.from({ length: 10 }, (_, i) => ({ warm: 1, ttl: 0.8, hot: false, flash: 0, gone: 0, ...f(i) }));

// ---- title cards (screen space, after the camera)
function rcCard(draw, w, h, y, s, rot, key) {
  const f = () => {
    if (s <= 0.01) return;
    ctx.save(); ctx.translate(CX, y); ctx.rotate(rot); ctx.scale(s, s);
    paint(rrectPts(-w / 2 + 8, -h / 2 + 10, w, h, 14), { fill: 'rgba(0,0,0,0.45)', line: false, key: key + 'sh', tex: [{ k: 'hatch', a: 0.8, gap: 4, c: '#000000', al: 0.5 }] });
    paint(rrectPts(-w / 2, -h / 2, w, h, 14), { fill: C.paper, key, w: 3.4, tex: [{ k: 'pencil', c: '#e8d6b0', al: 0.55, per: 80 }] });
    draw(-w / 2, -h / 2);
    ctx.restore();
  };
  if (DEFER) DEFER.push(f); else f();
}
function rcTag(n, word, s = 1) {   // a red number badge and the beat's name (s: smaller over a close shot)
  const size = 66, w = handW(word, size, 700) + 150, h = 104;
  rcCard((x0, y0) => {
    paint(ellipsePts(x0 + 56, y0 + h / 2, 32, 32, 0, 22), { fill: RC.red, key: 'badge' + n, w: 3, amt: 0.8 });
    handText(String(n), x0 + 44, y0 + h / 2 + 15, 44, C.cream, { key: 'bn' + n, weight: 700 });
    handText(word, x0 + 106, y0 + h / 2 + 22, size, C.ink, { key: 'bw' + n, weight: 700 });
  }, w, h, TAG_Y - (1 - s) * h * 0.5, s, -0.025, 'tag' + n);
}
// the hook card: a big "3" and the claim, whole on frame 0
function rcHookCard() {
  const w = 560, h = 220;
  rcCard((x0, y0) => {
    handText('3', x0 + 34, y0 + 186, 214, RC.red, { key: 'h3', weight: 700 });
    handText('Redis', x0 + 190, y0 + 94, 80, C.ink, { key: 'h1', weight: 700 });
    handText('failures', x0 + 190, y0 + 180, 80, C.ink, { key: 'h2', weight: 700 });
  }, w, h, Math.max(TAG_Y, SAFE.top + 118), 1, -0.03, 'hook');
}
function rcFixCard(t) {
  if (TT < t) return;
  const size = 74, w = handW('TTL jitter', size, 700) + 160, h = 118;
  rcCard((x0, y0) => {
    paint(ellipsePts(x0 + 62, y0 + h / 2, 37, 37, 0, 22), { fill: RC.fix, key: 'fxb', w: 3, amt: 0.8 });
    ink([[x0 + 45, y0 + h / 2 + 2], [x0 + 58, y0 + h / 2 + 16], [x0 + 81, y0 + h / 2 - 15]], { w: 6, key: 'fxck', amt: 0.4 });
    handText('TTL jitter', x0 + 116, y0 + h / 2 + 25, size, C.ink, { key: 'fxw', weight: 700 });
  }, w, h, TAG_Y, popS(t), -0.04, 'fix');
  if (TT < t + 0.6) { const k = ev(t, 0.5), f = () => burst(CX, TAG_Y, 190 + 60 * k, 280 + 80 * k, { c: RC.fix, n: 16, w: 4, al: 1 - k, key: 'fxburst' }); if (DEFER) DEFER.push(f); else f(); }
}

// =====================================================================
//  the beats. Each draws the whole stage on its first frame (slips already in flight), so every cut lands on a
//  finished picture. Event times come from the lines (CUT, LINE in the head), so a voice re-times them.
// =====================================================================
const RC_EXP = CUT.exp, RC_EXPA = CUT.expA;   // the hot key expires (on "expires"); every key expires (on "expire")
const RC_REFILL = Array.from({ length: 10 }, (_, i) => CUT.fix + 0.2 + 1.5 * ((i * 7) % 10) / 10 + RNG('jit', i).r(0, 0.1));   // the fix: refills spread out
const RC_TTL = Array.from({ length: 10 }, (_, i) => 0.3 + 0.62 * ((i * 3) % 10) / 9);                                           // and TTLs spread out

// 1. the hook: the end of the story first. Every key cold, a storm of requests, the database on fire
function sceneHook() {
  rcWorld('w');
  const storm = rcPlan(-1.3, 46, 0.072, (i, R) => ({ kind: 'key', fate: 'miss', slot: R.i(0, 9) }), 'hk');
  rcStage({ keys: rcKeys(() => ({ warm: 0, ttl: 0 })), heat: 1, mood: 'panic', reqs: [storm] });
  rcHookCard();
}
// 2. penetration: "?" keys the cache can never hold fall straight through; the database warms up
function scenePen() {
  rcWorld('w');
  const plan = rcPlan(CUT.pen - 0.45, 30, 0.12, (i, R) => (i % 3 === 0 ? { kind: 'key', fate: 'hit', slot: R.i(0, 9) } : { kind: '?', fate: 'miss', slot: R.i(0, 9) }), 'pn');
  const heat = clamp(0.12 + rcLanded(plan) * 0.03, 0, 0.68);
  const keys = rcLit(plan, rcKeys((i) => ({ ttl: 0.95 - ((0.07 * i) % 0.4) - 0.03 * (TT - CUT.pen) })));
  rcStage({ keys, heat, mood: heat < 0.3 ? 'ok' : 'worried', reqs: [plan] });
  if (rcShot() === 'wide') rcTag(1, 'penetration');
}
// 3. stampede: the hot key's TTL runs out on "expires"; then everyone asks for it at once
function sceneStamp() {
  rcWorld('w');
  const asks = rcPlan(CUT.stamp - 0.4, 9, 0.3, (i) => ({ kind: 'hot', fate: CUT.stamp - 0.4 + i * 0.3 + RC_FALL < RC_EXP ? 'hit' : 'miss', slot: 2 }), 'sh');
  const gone = seg(TT, RC_EXP, RC_EXP + 0.35);
  const keys = rcLit(asks, rcKeys((i) => (i === 2 ? { hot: true, warm: TT < RC_EXP ? 1 : 0, ttl: lerp(0.5, 0, seg(TT, CUT.stamp, RC_EXP)), gone } : { ttl: 0.85 - 0.07 * (i % 4) })));
  rcStage({ keys, heat: 0.08 + rcLanded(asks) * 0.05, mood: 'ok', reqs: [asks] });
  rcTag(2, 'stampede', 0.8);
}
function sceneRush() {
  rcWorld('w');
  const crowd = rcPlan(CUT.rush - 0.3, 18, 0.045, () => ({ kind: 'hot', fate: 'miss', slot: 2 }), 'cr');
  const n = rcLanded(crowd), heat = clamp(0.15 + n * 0.05, 0, 0.92);
  const keys = rcKeys((i) => (i === 2 ? { hot: true, warm: 0, ttl: 0 } : { ttl: 0.8 - 0.07 * (i % 4) - 0.02 * (TT - CUT.rush) }));
  rcStage({ keys, heat, mood: n ? 'panic' : 'worried', reqs: [crowd] });
  rcTag(2, 'stampede');
}
// 4. avalanche: every TTL bar the same length, running out together; every key goes cold at once, then the flood
function sceneAval() {
  rcWorld('w');
  const calm = rcPlan(CUT.aval - 0.4, 20, 0.2, (i, R) => ({ kind: 'key', fate: 'hit', slot: R.i(0, 9) }), 'ac').filter((q) => q.ts + RC_FALL < RC_EXPA);
  const flood = rcPlan(RC_EXPA - 0.25, 26, 0.05, (i, R) => ({ kind: 'key', fate: 'miss', slot: R.i(0, 9) }), 'af');
  const gone = seg(TT, RC_EXPA, RC_EXPA + 0.35), n = rcLanded(flood);
  const keys = rcLit(calm, rcKeys(() => ({ warm: TT < RC_EXPA ? 1 : 0, ttl: lerp(0.75, 0, seg(TT, CUT.aval, RC_EXPA)), gone })));
  const heat = TT < RC_EXPA ? 0.06 : clamp(0.06 + n * 0.06, 0, 1);
  rcStage({ keys, heat, mood: heat > 0.5 ? 'panic' : heat > 0.2 ? 'worried' : 'ok', reqs: [calm, flood] });
  if (rcShot() === 'wide') rcTag(3, 'avalanche');
}
// 5. the face, then the hush: the flood still landing, then everything freezes; nothing moves but the ink
function sceneHush() {
  rcWorld('w');
  const held = TT >= CUT.hush - 1e-6;
  rcStage({ keys: rcKeys(() => ({ warm: 0, ttl: 0 })), heat: 1, mood: held ? 'dread' : 'panic', still: held });
}
// 6. the fix: TTL jitter. Each key comes back on its own time with its own TTL; the fire goes out
function sceneFix() {
  rcWorld('w');
  const refills = RC_REFILL.map((r, i) => ({ ts: r - RC_TRIP, x0: RC_CLIENT_X[i % 5], kind: 'key', fate: 'fetch', slot: i, key: 'fx' + i }));
  const cool = EZ.o2(seg(TT, CUT.fix, CUT.fix + 0.9));
  const keys = rcKeys((i) => {
    const r = RC_REFILL[i]; if (TT < r) return { warm: 0, ttl: 0 };
    return { warm: 1, ttl: clamp(RC_TTL[i] * Math.min(1, (TT - r) / 0.25) - 0.025 * Math.max(0, TT - r - 0.25)), flash: TT < r + 0.2 ? 1 : 0 };
  });
  const mood = TT < CUT.fix + 0.3 ? 'dread' : TT < CUT.fix + 0.9 ? 'ok' : 'happy';
  rcStage({ keys, heat: 1 - cool, smoke: seg(TT, CUT.fix + 0.2, CUT.fix + 1.8), mood, reqs: [refills] });
  rcFixCard(CUT.fix);
}
