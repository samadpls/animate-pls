// =====================================================================
//  SCENES — gallery tile 07 (isometric, 1:1). Two islands on the white ground: a laptop on a stacked pad
//  (left, its screen facing +x, toward the middle) and a tall two-frame z/OS mainframe on its own pad
//  (right, its front facing +y, toward the middle). An L-shaped data lane on the ground joins their fronts;
//  the cube-bot walks it carrying the one dark accent, a packet. Painter's order: lane, mainframe island
//  (back right), laptop island (left), bot (front). World units ~ px / T7ISO.u.
//  Everything settles by 2.2s; the thumbnail is the frame at t = 2.5.
// =====================================================================
const T7ISO = { ox: 534, oy: 704, u: 0.89 };
const cu = TIMELINE.cues;

// ---- layout (world units)
const T7PADS = [{ h: 14, r: 30 }, { h: 16, gap: 5, inset: 8, r: 24 }];   // each island's two plates
const T7PZ = 14 + 5 + 16;                                                 // pad top
const T7MF = { x: 25, y: -216, w: 240, d: 136, h: 320, foot: 12 };      // mainframe cabinet, two frames (front at y + d)
const T7LP = { x: -214, y: 25, w: 160, d: 236, h: 14, lid: 160, t: 9 }; // laptop base (depth along x, width along y)
const T7MP = { x: T7MF.x - 22, y: T7MF.y - 22, w: T7MF.w + 44, d: T7MF.d + 42 };   // mainframe pad footprint
const T7LPP = { x: T7LP.x - 20, y: T7LP.y - 18, w: T7LP.w + 38, d: T7LP.d + 36 };  // laptop pad footprint
const T7LN = { R: 46, o: 20 };                                            // the data lane: corner radius, half width
T7LN.yc = T7LP.y + T7LP.d / 2;                                            // first leg: from the laptop's front, along +x
T7LN.xc = T7MF.x + T7MF.w / 2;                                            // second leg: along -y, into the mainframe's front
T7LN.xa = T7LPP.x + T7LPP.w + 4;                                          // lane start (the laptop pad's front edge)
T7LN.yb = T7MP.y + T7MP.d + 4;                                            // lane end (the mainframe pad's front edge)
const T7BOT = { s: 90, d0: 40 };

// ---- the lane: the centre line (k = 0) or a side (k = +-1) as world points on the ground
function t7LanePts(k, z) {
  const L = T7LN, o = k * L.o, P = [];
  P.push([L.xa, L.yc + o, z]);
  const cx = L.xc - L.R, cy = L.yc - L.R;   // the corner arc's centre (turning from +x to -y)
  for (let i = 0; i <= 12; i++) { const a = (90 - i * 7.5) * DEG; P.push([cx + Math.cos(a) * (L.R + o), cy + Math.sin(a) * (L.R + o), z]); }
  P.push([L.xc + o, L.yb, z]);
  return P;
}
// dashes along a 3D polyline, revealed up to frac of its length
function t7Dashes(P3, dash, gap, frac, color = PAL.edge) {
  const S = resample(P3.map((p) => [p[0], p[1]]), false, 2), z = P3[0][2];
  let s = 0; const total = pathLen(S) * frac;
  for (let i = 1; i < S.length; i++) {
    const d = dist(S[i - 1], S[i]);
    if (s + d > total) break;
    if (mod(s, dash + gap) < dash) line3([[S[i - 1][0], S[i - 1][1], z], [S[i][0], S[i][1], z]], color);
    s += d;
  }
}
// a point a distance along the lane's centre line, and the lane's length to the corner's midpoint
function t7LaneAt(dd) {
  const S = resample(t7LanePts(0, 0).map((p) => [p[0], p[1]]), false, 2);
  let s = 0;
  for (let i = 1; i < S.length; i++) { const d = dist(S[i - 1], S[i]); if (s + d >= dd) { const q = (dd - s) / d; return [lerp(S[i - 1][0], S[i][0], q), lerp(S[i - 1][1], S[i][1], q)]; } s += d; }
  return S[S.length - 1];
}
const t7Corner = () => (T7LN.xc - T7LN.R - T7LN.xa) + Math.PI / 4 * T7LN.R;

// an island: two stacked plates that drop in on springs
function t7Pad(P, t0) {
  if (TT <= t0) return;
  const dz = (i) => (1 - spring(TT, t0 + i * 0.08, { k: 160, damp: 0.6 })) * 160;
  isoPlates(P.x, P.y, 0, P.w, P.d, T7PADS.map((L, i) => ({ ...L, dz: i ? dz(i) - dz(i - 1) : dz(0) })));
}

// ---- the mainframe: a foot plate, a tall rounded cabinet that rises, a top cap; nameplate and two frames of rack slabs
function t7Mainframe() {
  const M = T7MF;
  if (TT <= cu.frame) return;
  const rise = spring(TT, cu.frame, { k: 90, damp: 0.78 }), hh = Math.max(4, M.h * rise);
  const z0 = T7PZ, zb = z0 + M.foot, zt = zb + hh;
  isoBox(M.x - 6, M.y - 6, z0, M.w + 12, M.d + 12, M.foot, { r: 14 });
  isoBox(M.x, M.y, zb, M.w, M.d, hh, { r: 12, seg: 4 });
  isoBox(M.x - 6, M.y - 6, zt, M.w + 12, M.d + 12, 14, { r: 14 });
  const fits = (v) => v < hh - 8;   // parts measured down from the top show only once the cabinet is tall enough
  // the side (+x) face: two vent grids, light
  const side = faceOf([M.x + M.w, M.y + M.d, zt], [0, -1, 0], [0, 0, -1]);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) if (fits(30 + r * 16 + 6)) faceRR(side, 26 + c * 32, 30 + r * 16, 22, 6, 3, { seg: 2 });
  if (rise > 0.97) for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) faceRR(side, 26 + c * 32, hh - 90 + r * 16, 22, 6, 3, { seg: 2 });
  // the front (+y) face: a nameplate across the top, then two frames of rack slabs that slide out in a wave
  const fp = faceOf([M.x, M.y + M.d, zt], [1, 0, 0], [0, 0, -1]);
  if (!fits(60)) return;
  faceRR(fp, 14, 14, M.w - 28, 46, 8);
  isoText(fp, 'z/OS', 28, 48, 30, { color: PAL.text });
  for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) faceRR(fp, M.w - 112 + c * 30, 28 + r * 10, 22, 6, 3, { seg: 2 });   // a grille
  if (fits(80)) faceLine(fp, [[M.w / 2, 72], [M.w / 2, hh - 12]], PAL.inner);   // the seam between the two frames
  const n = 6, pitch = 40, v0 = 74, fw = M.w / 2 - 24;
  for (let i = n - 1; i >= 0; i--) for (let f = 0; f < 2; f++) {
    const u0 = f ? M.w / 2 + 8 : 16, v = v0 + i * pitch;
    if (!fits(v + 30)) continue;
    const sl = spring(TT, cu.racks + (i + f) * 0.06, { k: 120, damp: 0.6 });
    if (sl <= 0.02) { faceRR(fp, u0, v, fw, 30, 6); continue; }
    faceSlab(fp, u0, v, fw, 30, 8 * sl, { r: 6, seg: 3, creaseC: PAL.inner });
    const sf = (u, w) => vadd(fp(u0 + u, v + w), [0, 8 * sl, 0]);
    lamp(sf, 14, 15, 4, blinkOn(TT, 1.0, i * 0.29 + f * 0.53));
    for (let k = 0; k < 4; k++) for (let r = 0; r < 2; r++) faceRR(sf, 34 + k * 16, 8 + r * 9, 10, 5, 2.5, { seg: 2 });
  }
}

// ---- the laptop: base with a key grid and trackpad, a lid on its hinge at the back (x = LP.x) facing +x
const t7LapDrop = (t) => (1 - spring(t, cu.laptop, { k: 150, damp: 0.62 })) * 260;
function t7LidGeom(t) {
  const th = (90 + 14) * DEG * spring(t, cu.open, { k: 80, damp: 0.6 }), z = T7PZ + T7LP.h + t7LapDrop(t);
  return { o: [T7LP.x + 4, T7LP.y, z], a: [0, 1, 0], b: [Math.cos(th), 0, Math.sin(th)], n: [-Math.sin(th), 0, Math.cos(th)] };
}
// the screen (s = 0 cap), u to the right on screen (toward -y), v down from the lid's top edge
const t7LidFace = (g) => (u, v) => vadd(vadd(g.o, vsc(g.a, T7LP.d - u)), vsc(g.b, T7LP.lid - v));
function t7Laptop() {
  const L = T7LP;
  if (TT <= cu.laptop) return;
  const zb = T7PZ + t7LapDrop(TT);
  isoBox(L.x, L.y, zb, L.w, L.d, L.h, { r: 18 });
  const top = faceOf([L.x, L.y, zb + L.h], [1, 0, 0], [0, 1, 0]);
  const kp = 19, kx = 18, ky = 4.5 + (L.d - 12 * kp) / 2;
  isoGrid(4, 12, (i, j) => {
    const s = spring(TT, cu.keys + (i + j) * 0.026, { k: 220, damp: 0.5 });
    if (s <= 0.01) { faceRR(top, kx + i * kp, ky + j * kp, 15.5, 15.5, 3.5); return; }
    isoBox(L.x + kx + i * kp, L.y + ky + j * kp, zb + L.h, 15.5, 15.5, 4.5 * s, { r: 3.5, seg: 3, creaseC: PAL.inner });
  });
  faceRR(top, 104, L.d / 2 - 46, 42, 92, 8);   // trackpad
  // the lid, opening on a spring; the screen shows Python once it faces us
  const g = t7LidGeom(TT), S = isoSlab(g.o, g.a, g.b, g.n, L.d, L.lid, L.t, { r: 18 });
  if (S.front === 0) t7Screen(t7LidFace(g));
}
function t7Screen(fp) {
  const L = T7LP;
  faceRR(fp, 12, 12, L.d - 24, L.lid - 24, 10);
  for (let i = 0; i < 3; i++) faceEll(fp, 28 + i * 13, 28, 4, 4, { stroke: PAL.inner });
  const typed = (s, t0, cps = 32) => Math.floor(clamp((TT - t0) * cps, 0, s.length));
  const l1 = '>>> import zowe', l2 = '>>> ';
  isoText(fp, l1, 24, 72, 21, { color: PAL.text, count: typed(l1, cu.type) });
  if (TT > cu.type + 0.65) {
    const w = isoText(fp, l2, 24, 104, 21, { color: PAL.textD });
    if (blinkOn(TT, 1.0, 0.75)) faceSlab(fp, 24 + w, 88, 12, 20, 3, { r: 2, fill: PAL.edge, edge: PAL.edge, creaseC: PAL.edge });
  }
}

// ---- the lane on the ground, drawn on from the laptop to the mainframe
function t7Lane() {
  const f = EZ.io(seg(TT, cu.path, cu.path + 0.7));
  if (f <= 0) return;
  for (const k of [-1, 1]) { const P = t7LanePts(k, 0); line3(P.slice(0, Math.max(2, Math.ceil(P.length * f))), PAL.inner); }
  t7Dashes(t7LanePts(0, 0), 10, 9, f, PAL.edge);
}

// ---- the hero: drops in at the lane start, catches the packet, then two hops to the lane's corner
function t7Hero() {
  if (TT <= cu.bot) return;
  const B0 = T7BOT, hz = (1 - spring(TT, cu.bot, { k: 170, damp: 0.5 })) * 240;
  const d0 = B0.d0, d2 = t7Corner(), d1 = (d0 + d2) / 2;
  const step = (hp) => EZ.io(seg(TT, hp, hp + 0.34));
  const dd = d0 + (d1 - d0) * step(cu.hop) + (d2 - d1) * step(cu.hop2);
  const [x, y] = t7LaneAt(dd);
  const bot = cubeBot(x, y, hz, B0.s, { key: 'hero', hop: [cu.hop, cu.hop2], faceX: true, look: -0.7 });
  // the packet: the one dark accent, dropped onto the bot's head once the import is typed
  const pk = 38, pz = bot.top + (1 - spring(TT, cu.packet, { k: 220, damp: 0.55 })) * 150;
  if (TT > cu.packet) isoBox(x - pk / 2, y - pk / 2, pz, pk, pk, pk * 0.82, { r: 5, seg: 3, fill: PAL.accent, edge: PAL.accent, creaseC: PAL.textD });
}

// ---- type, set at screen size after the camera (DEFER)
function t7TagNow(str) {
  const a = clamp(spring(TT, E0 + 0.15, { k: 140, damp: 0.85 }));
  if (a <= 0.001) return;
  ctx.save(); ctx.globalAlpha = a;
  ctx.font = `400 70px ${ISOMONO}`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = PAL.text; ctx.fillText(str, 64, 126);
  ctx.restore();
}
const t7Tag = (str) => { const f = () => t7TagNow(str); if (DEFER) DEFER.push(f); else f(); };

function sceneTile() {
  setIso(T7ISO);
  t7Lane();
  t7Pad(T7MP, cu.plates);
  t7Mainframe();
  t7Pad(T7LPP, cu.plates + 0.1);
  t7Laptop();
  t7Hero();
  t7Tag('LFX 2023 · Zowe');
  isoCaption('Python, meet the mainframe', { y: 998, size: 46 });
}
