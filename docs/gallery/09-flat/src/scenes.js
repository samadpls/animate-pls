// =====================================================================
//  SCENES — gallery tile 12 (flat, 1:1). A switchyard floating in space, seen from above like a map, its tracks
//  casting long shadows on the starfield. Left: the generator (three lamps for its three model passes, a turning
//  gear, speech-bubble puffs) rolls conversations out as speech-bubble wagons. Middle: the junction, its signal and
//  the lever the hero throws. Right: one station per policy. Draw order is back to front (a long shadow falls on what
//  was drawn before it): sky, tracks, stations, wagons, generator, lever, hero, labels.
// =====================================================================
const t12C = TIMELINE.cues;
const T12 = { door: [238, 570], S: [470, 570], end: 750, st: 970, pill: 730, rest: 666 };
const T12ROUTES = [
  { label: 'travel', c: FLP.teal, y: 380, icon: 'plane' },
  { label: 'banking', c: FLP.mustard, y: 570, icon: 'coins' },
  { label: 'kitchen', c: FLP.coral, y: 760, icon: 'cup' },
];
function t12Bez(p0, p1, p2, p3, n = 28) {
  const P = [];
  for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; P.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]); }
  return P;
}
// each route: the branch from the junction (for the track) and the whole way from the door (for the wagons)
for (const R of T12ROUTES) {
  const [sx, sy] = T12.S, B = R.y === sy ? [[sx, sy], [T12.end, sy]] : t12Bez([sx, sy], [sx + 84, sy], [sx + 112, R.y], [sx + 190, R.y]).concat([[T12.end, R.y]]);
  R.branch = resample(B, false, 5);
  R.way = resample([T12.door].concat(B), false, 4);
  R.cum = [0]; for (let i = 1; i < R.way.length; i++) R.cum.push(R.cum[i - 1] + dist(R.way[i - 1], R.way[i]));
  R.sRest = R.cum[R.cum.length - 1] - (T12.end - T12.rest);   // where its wagon comes to rest, level, before the station
}
const T12MAIN = resample([[T12.door[0] - 10, T12.door[1]], T12.S], false, 5);
// a point and heading s px along a route from the door (s < 0 runs back into the generator)
function t12Walk(R, s) {
  const P = R.way, C = R.cum;
  if (s <= 0) return { x: P[0][0] + s, y: P[0][1], a: 0 };
  let i = 1; while (i < C.length - 1 && C[i] < s) i++;
  const k = clamp((s - C[i - 1]) / (C[i] - C[i - 1] || 1)), a = Math.atan2(P[i][1] - P[i - 1][1], P[i][0] - P[i - 1][0]);
  return { x: lerp(P[i - 1][0], P[i][0], k), y: lerp(P[i - 1][1], P[i][1], k), a };
}
const t12SAtS = T12.S[0] - T12.door[0];   // the junction's distance from the door

// ---- the tracks, in passes so the junction reads as one piece: shadows, beds, sleepers, rails
function t12Offset(P, d) {
  return P.map((p, i) => { const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], l = dist(a, b) || 1; return [p[0] - (b[1] - a[1]) / l * d, p[1] + (b[0] - a[0]) / l * d]; });
}
function t12Stroke(P, w, c, dx = 0, dy = 0) {
  ctx.beginPath(); P.forEach(([x, y], i) => (i ? ctx.lineTo(x + dx, y + dy) : ctx.moveTo(x + dx, y + dy)));
  ctx.strokeStyle = c; ctx.lineWidth = w; ctx.stroke();
}
function t12Tracks(sw) {
  const all = [T12MAIN].concat(T12ROUTES.map((R) => R.branch));
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const P of all) for (const [k, a] of [[34, 0.16], [22, 0.22], [12, 0.3]]) t12Stroke(P, 58, flA(FLP.shadow, a), FLSD[0] * k, FLSD[1] * k);
  for (const P of all) t12Stroke(P, 56, '#1d4649');
  ctx.fillStyle = '#2a5a5b';
  for (const P of all) for (let i = 4; i < P.length - 3; i += 6) {
    const a = P[i - 1], b = P[i + 1], l = dist(a, b) || 1, nx = -(b[1] - a[1]) / l, ny = (b[0] - a[0]) / l;
    flPath(flCapsuleAB([P[i][0] - nx * 24, P[i][1] - ny * 24], [P[i][0] + nx * 24, P[i][1] + ny * 24], 10)); ctx.fill();
  }
  for (const P of all) for (const d of [-13, 13]) t12Stroke(t12Offset(P, d), 5, '#e3d6b8');
  // the switch: the first stretch of the set route lights up in its colour (sw: 0 = straight on, 1 = up to travel)
  for (const [R, k] of [[T12ROUTES[1], 1 - sw], [T12ROUTES[0], sw]]) {
    if (k < 0.02) continue;
    const P = R.branch.slice(0, 36);
    ctx.save(); ctx.globalAlpha = k; ctx.globalCompositeOperation = 'lighter';
    t12Stroke(P, 26, flA(R.c, 0.16)); ctx.restore();
    ctx.save(); ctx.globalAlpha = k; for (const d of [-13, 13]) t12Stroke(t12Offset(P, d), 6, flLight(R.c, 1.2)); ctx.restore();
  }
  ctx.restore();
}

// ---- a station at a route's end: a disc in the policy's colour with its icon; it pulses when its wagon arrives
function t12Icon(kind, x, y, s) {
  ctx.save(); ctx.fillStyle = FLP.cream; ctx.strokeStyle = FLP.cream; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (kind === 'plane') {
    const parts = [flCapsuleAB([-0.5, 0], [0.56, 0], 0.17), [[-0.06, -0.06], [0.16, -0.06], [-0.12, -0.56], [-0.27, -0.56]], [[-0.06, 0.06], [0.16, 0.06], [-0.12, 0.56], [-0.27, 0.56]],
      [[-0.36, -0.04], [-0.44, -0.24], [-0.53, -0.24], [-0.5, -0.02]], [[-0.36, 0.04], [-0.44, 0.24], [-0.53, 0.24], [-0.5, 0.02]]];
    ctx.lineWidth = s * 0.05; for (const P of parts) { flPath(xform(P, x, y, -0.7, s, s)); ctx.fill(); ctx.stroke(); }
  } else if (kind === 'coins') {
    for (let i = 0; i < 3; i++) { flPath(flCapsule(x - s * 0.42 + (i % 2) * s * 0.06, y + s * 0.22 - i * s * 0.25, s * 0.84, s * 0.22)); ctx.fill(); }
    ctx.fillStyle = flShade(FLP.mustard, 0.9); for (let i = 0; i < 3; i++) { flPath(flCapsule(x - s * 0.3 + (i % 2) * s * 0.06, y + s * 0.3 - i * s * 0.25, s * 0.6, s * 0.05)); ctx.fill(); }
  } else {
    flPath(flRRect(x - s * 0.36, y - s * 0.12, s * 0.6, s * 0.5, s * 0.12)); ctx.fill();
    ctx.lineWidth = s * 0.08; ctx.beginPath(); ctx.arc(x + s * 0.27, y + s * 0.12, s * 0.13, -1.3, 1.3); ctx.stroke();
    ctx.lineWidth = s * 0.07; for (let i = 0; i < 2; i++) { const ph = TT * 3 + i * 1.8; ctx.beginPath(); ctx.moveTo(x - s * 0.14 + i * s * 0.18, y - s * 0.2); ctx.quadraticCurveTo(x - s * 0.04 + i * s * 0.18 + Math.sin(ph) * s * 0.08, y - s * 0.34, x - s * 0.14 + i * s * 0.18, y - s * 0.48); ctx.stroke(); }
  }
  ctx.restore();
}
function t12Station(R, tArr) {   // a pill the track runs into: the policy's name, then its icon on a disc
  const k = springEase(TT - tArr, 260, 12), on = TT >= tArr, x0 = T12.pill, y = R.y, h = 100, w = 1020 - x0;
  const pulse = on ? 0.14 * Math.sin(clamp((TT - tArr) * 1.6) * Math.PI) : 0, r = 40 * (1 + pulse);
  flSolid(flRRect(x0, y - h / 2, w, h, h / 2), flShade(R.c, 1.05), { shadow: 150, shade: 0, rim: 3.5, ra: 0.4 });
  flSolid(flCircle(T12.st, y, r, 48), R.c, { shadow: 50, shade: 0.18, rim: 3 });
  t12Icon(R.icon, T12.st, y, r * 1.1);
  flFitText(R.label, x0 + 28, y + 3, 38, T12.st - 40 - 14 - (x0 + 28));   // fitted: display faces differ in width per OS
}

// ---- a wagon: a speech bubble (a generated conversation) on a little chassis, tilted with the track
function t12Wagon(R, s, col, key) {
  const { x, y, a } = t12Walk(R, s), tilt = a * 0.5, w = 124, h = 78, sp = s / 12;
  const T = (P) => xform(P, x, y, tilt);
  const bub = T(flBubblePts(-w / 2 + 6, -h - 46, w, h, { tail: 'left', th: 20 })), ch = T(flCapsule(-w * 0.42, -32, w * 0.84, 16));
  const wh = [-1, 1].map((k) => T([[k * w * 0.27, -15]])[0]);
  flLongShadow(bub.concat(ch, ...wh.map(([wx, wy]) => flCircle(wx, wy, 16, 12))), 150, { a: 0.42 });
  ctx.fillStyle = '#0a1c1e'; flPath(ch); ctx.fill();
  for (const [wx, wy] of wh) {
    ctx.fillStyle = FLP.ink; ctx.beginPath(); ctx.arc(wx, wy, 15, 0, TAU); ctx.fill();
    ctx.fillStyle = FLP.sage; ctx.beginPath(); ctx.arc(wx, wy, 6, 0, TAU); ctx.fill();
    ctx.fillStyle = FLP.cream; ctx.beginPath(); ctx.arc(wx + Math.cos(sp) * 9, wy + Math.sin(sp) * 9, 2.6, 0, TAU); ctx.fill();
  }
  flSolid(bub, col, { shadow: false, shade: 0.16, rim: 3.5, ra: 0.6 });
  const light = flLum(col) > 0.75, dc = light ? '#8d7b5a' : FLP.cream;
  ctx.fillStyle = dc;
  for (let i = 0; i < 3; i++) { const [dx, dy] = T([[-w / 2 + 6 + w * (0.3 + i * 0.2), -h / 2 - 46]])[0], kk = 1 + 0.2 * Math.sin(TT * 6 - i * 0.9 + key); ctx.beginPath(); ctx.arc(dx, dy, 8 * kk, 0, TAU); ctx.fill(); }
}

// ---- the generator: rolls conversations out of its door; three lamps take turns, a gear turns, bubbles puff out
function t12Generator() {
  const x = 52, y = 392, w = 186, h = 250, c = FLP.sage;
  // chimney and its puffs: little speech bubbles rising and fading
  for (let i = 0; i < 3; i++) {
    const u = mod(TT / 1.5 + i / 3, 1), px = x + 132 + u * 60 + Math.sin(u * 5 + i) * 6, py = y - 96 - u * 104, s = 1.05 * Math.sin(Math.min(1, u * 1.15) * Math.PI) ** 0.6;
    if (s > 0.05) flSolid(flBubblePts(px - 22 * s, py - 15 * s, 44 * s, 30 * s, { tail: 'left' }), [FLP.cream, '#e3ecd5', '#f6d6c8'][i], { shadow: 40 * s, sa: 0.3, shade: 0.05, rim: 0 });
  }
  flSolid(flRRect(x + 108, y - 74, 40, 100, 14), flShade(c, 0.9), { shadow: 120, shade: 0.12 });
  flSolid(flRRect(x + 98, y - 84, 60, 26, 12), flShade(c, 0.6), { shadow: 60, shade: 0.12 });
  flSolid(flRRect(x, y, w, h, 46), c, { shadow: 300, shade: 0.12, rim: 5 });
  // the door the wagons come out of: an opening on the right of the face, at track height
  ctx.fillStyle = flShade(c, 2.2); flPath(flRRect(x + w - 60, T12.door[1] - 126, 60, 132, 22)); ctx.fill();
  ctx.fillStyle = flA(FLP.shadow, 0.35); flPath(flRRect(x + w - 60, T12.door[1] - 126, 18, 132, 9)); ctx.fill();
  flGear(x + 66, y + 84, 46, 9, TT * 1.6, FLP.cream, { shadow: 34, sa: 0.3 });
  for (let i = 0; i < 3; i++) {   // three model passes take turns: policy, conversation, alignment check
    const on = Math.floor(TT * 2.5) % 3 === i, lx = x + 34 + i * 34, ly = y + 176, hc = [FLP.mustard, FLP.teal, FLP.coral][i];
    if (on) flGlow(lx, ly, 20, hc, 0.6);
    ctx.fillStyle = on ? flLight(hc, 1) : flShade(c, 1.2); ctx.beginPath(); ctx.arc(lx, ly, 11, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = flShade(c, 0.9); flPath(flCapsule(x + 24, y + 212, 96, 12)); ctx.fill();
}

// ---- the lever (a ground frame) and the signal at the junction
const t12Throw = () => springMove(t12C.throw, 0, 1, SPRING.playful);
function t12Lever(u) {
  const p0 = [380, 862], th = lerp(-2.2, -1.05, u), tip = [p0[0] + Math.cos(th) * 116, p0[1] + Math.sin(th) * 116];
  flSolid(flCapsuleAB(p0, tip, 15), '#e3d6b8', { shadow: 110, shade: 0.12, rim: 0 });
  flSolid(flRRect(326, 850, 108, 44, 18), flShade(FLP.teal, 0.5), { shadow: 120, shade: 0.16, rim: 4 });
  flSolid(flCircle(tip[0], tip[1], 21, 28), FLP.cream, { shadow: 60, shade: 0.2, rim: 2 });
  return tip;
}
function t12Signal(u) {
  const x = 446, y = 690, k = clamp(u), c = flMix(FLP.mustard, FLP.teal, k);
  flSolid(flCapsule(x - 7, 596, 14, y - 596), '#7a9a8f', { shadow: 110, shade: 0.2, rim: 0 });
  flSign(x, y, 44, lerp(0, -0.72, u), c, { glow: true, ga: 0.42 });
}

function sceneYard() {
  flGround(ERA_BG[0]);
  flStars('yard-far', { n: 120, drift: 4 });
  flStars('yard-near', { n: 26, drift: 12 });
  const cu = ev(0.1, 1.3);
  if (cu > 0 && cu < 1) { const k = EZ.io(cu); flComet(lerp(1140, 520, k), lerp(210, 268, k), Math.atan2(58, -620), 210); }
  flGlow(912, 170, 82, FLP.cream, 0.28);   // the moon: a cream disc with craters (a light, so a tight glow)
  flSolid(flCircle(912, 170, 56, 56), '#efe0bf', { shadow: 120, shade: 0.2, shadeC: '#d6c49c', rim: 3, inner: (x, y, s) => { ctx.fillStyle = '#ddcca6'; for (const [dx, dy, rr] of [[-0.35, -0.15, 0.22], [0.2, 0.32, 0.16], [0.3, -0.35, 0.12]]) { ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, rr * s, 0, TAU); ctx.fill(); } } });
  const u = t12Throw();
  t12Tracks(clamp(u));
  // the wagons: travel (the one being routed), banking and kitchen (already on their way), the next one coming out
  const RA = T12ROUTES[0], RB = T12ROUTES[1], RC = T12ROUTES[2];
  const sW1 = TT < t12C.go ? lerp(48, 136, EZ.o2(seg(TT, 0, t12C.wait))) : lerp(136, RA.sRest, EZ.io(seg(TT, t12C.go, t12C.arrive)));
  const sW2 = lerp(RB.sRest - 150, RB.sRest, EZ.o3(seg(TT, 0, 1.4))), sW3 = lerp(RC.sRest - 112, RC.sRest, EZ.o3(seg(TT, 0, 1.8)));
  const sW4 = lerp(-96, 18, EZ.o3(seg(TT, t12C.next, 2.3)));
  for (const [R, tA] of [[RA, t12C.arrive - 0.1], [RB, 1.2], [RC, 1.6]]) t12Station(R, tA);
  t12Wagon(RC, sW3, RC.c, 2);
  t12Wagon(RB, sW2, RB.c, 1);
  t12Wagon(RA, sW1, flMix(FLP.cream, RA.c, seg(sW1, t12SAtS - 30, t12SAtS + 70)), 0);
  t12Wagon(RA, sW4, FLP.cream, 3);
  t12Generator();
  t12Signal(u);
  const tip = t12Lever(clamp(u, -0.1, 1.15));
  // the hero leans into the lever, watches the wagon go, then beams
  const hx = lerp(222, 270, clamp(u)), hy = 800, mood = TT < t12C.throw + 0.25 ? 'focus' : TT < t12C.arrive ? 'happy' : 'wink';
  const w1 = t12Walk(RA, sW1), lk = [clamp((w1.x - hx) / 300, -1, 1), clamp((w1.y - 40 - hy) / 300, -1, 1)];
  flHero(hx, hy, 76, { key: 'hero', mood, look: lk, hands: [tip], squash: 0.25 * Math.exp(-Math.max(0, TT - t12C.throw) * 5) * Math.sin(Math.max(0, TT - t12C.throw) * 16) });
  flMotes('yard', { n: 16, rise: 10, c: FLP.star });
  flTag('ArchData', { x: 64, y: 132, size: 74, dot: FLP.teal, at: 0.0, shadow: 64 });
  flCaption('routing data, generated', { x: 540, y: 962, size: 60, at: 0.3 });
}
