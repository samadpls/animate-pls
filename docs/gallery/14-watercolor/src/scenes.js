// =====================================================================
//  SCENES — "Karachi · across time zones" tile (watercolor). World 1080x1080; time TT on 2s.
//  A dusk sky over a low generic skyline (windows lighting one by one), the sea with the sun's path, a fishing boat,
//  a camel on the sand. A string of three clocks hangs across the sky: midday (1:30), Karachi at dusk (6:30) and night
//  (10:30); each face blooms in with its own sky while its hands swing from 6:30 to its hour. The sparrow hops along
//  the string to the Karachi clock. Terracotta is the sparrow's alone. Background life: kites, gulls, waves, glitter,
//  the camel's head and tail, the boat bobbing, lit windows.
// =====================================================================
const K19 = { hz: 612, shore: 820, sun: [948, 548, 46], clocks: [[262, 300, 80, 1.5, 'noon'], [540, 336, 96, 6.5, 'dusk'], [818, 300, 80, 10.5, 'night']], hopX: [140, 255, 365, 470] };
const k19Str = (x) => 138 + 118 * Math.sin(Math.PI * clamp((x + 30) / 1140));   // the string's sag
const k19Big = { rough: 0.06, step: 90, layers: 18, al: 0.085, edge: 0.3, resK: 0.5, mottle: 14 };

function k19Sky() {
  const hz = K19.hz;
  wcWash('sky', wcRect(-160, -160, W + 320, hz + 220), WC.skyD, { ...k19Big, al: 0.08, grade: [0, -40, 0, hz * 0.7, 0.95, 0], backruns: 1 });
  wcWash('glow', wcRect(-160, hz - 420, W + 320, 460), WC.ochreL, { ...k19Big, al: 0.1, grade: [0, hz + 10, 0, hz - 420, 1, 0] });
  [[700, 470, 360, 0.8], [230, 520, 300, 0.6]].forEach(([x, y, w, k], i) => {   // dusk cloud streaks, lit ochre below
    ctx.save(); ctx.translate(x + TT * (6 + i * 4), y);
    wcWash('st' + i, wcStroke([[-w / 2, 0], [0, -5 * k], [w / 2, 3]], 20 * k, 10 * k), '#8f9a9c', { rough: 0.35, spread: 2.4, layers: 18, al: 0.07, edge: 0.6 });
    wcWash('stl' + i, wcStroke([[-w * 0.4, 14 * k], [w * 0.35, 16 * k]], 6 * k, 4 * k), WC.ochre, { rough: 0.3, layers: 12, al: 0.1, edge: 0.4 });
    ctx.restore();
  });
  const [sx, sy, sr] = K19.sun;
  wcWash('sun', wcEll(sx, sy, sr, sr, 16), WC.ochre, { rough: 0.08, spread: 1.4, layers: 24, al: 0.11, edge: 1.8, lift: [{ P: wcEll(sx - sr * 0.2, sy - sr * 0.25, sr * 0.4, sr * 0.3, 10), a: 0.55 }] });
}
function k19Skyline() {   // a generic low seafront skyline: blocks, a water tank, a dome and a slim tower; windows light one by one
  const hz = K19.hz, R = RNG('sky19'), B19 = [];
  let x = -20;
  while (x < 640) { const w = R.r(44, 92), h = R.r(38, 130) * (x > 380 ? 0.6 : 1); B19.push([x, hz - h, w, h]); x += w * R.r(0.85, 1.05); }
  B19.forEach(([bx, by, bw, bh], i) => wcWash('bl' + i, wcRect(bx, by, bw, hz - by + 6), i % 3 ? '#8c8273' : '#7d8a86', { rough: 0.03, segs: 8, layers: 14, al: 0.1, edge: 1.5, mask: false, gran: 0.6 }));
  const dx = 300, dy = hz - 92;   // the dome on its drum, and the tower beside it
  wcWash('drum', wcRect(dx - 40, dy, 80, 92), '#8c8273', { rough: 0.03, segs: 8, layers: 14, al: 0.11, edge: 1.5, mask: false });
  wcWash('dome', arcPts(dx, dy, 40, Math.PI, TAU, 14).concat([[dx + 40, dy]]), '#7d8a86', { rough: 0.04, segs: 10, layers: 14, al: 0.12, edge: 1.6, mask: false });
  wcWash('tower', wcRect(dx + 58, hz - 176, 14, 176), '#8c8273', { rough: 0.02, segs: 8, layers: 12, al: 0.12, edge: 1.4, mask: false });
  wcPen([[dx + 56, hz - 176], [dx + 65, hz - 196], [dx + 74, hz - 176]], { w: 1.8, key: 'tw', lift: 0 });
  wcPen(arcPts(dx, dy, 40, Math.PI, TAU, 14), { w: 1.8, key: 'dm', lift: 0.2 });
  wcPen([[-20, hz], [660, hz]], { w: 1.6, key: 'skyl', al: 0.6, lift: 0.3 });
  ctx.save();   // windows: a string of lights coming on one by one, then flickering a little on 2s
  const L = RNG('win19'); let k = 0;
  B19.forEach(([bx, by, bw, bh], i) => {
    for (let wy = by + 12; wy < hz - 14; wy += 20) for (let wx = bx + 9; wx < bx + bw - 12; wx += 16) {
      const on = L.f(), at = TIMELINE.cues.lights[k++ % 6] + L.r(0, 0.3);
      if (on < 0.42 && TT >= at) { ctx.fillStyle = (B + k) % 11 === 0 ? 'rgba(240,205,130,0.7)' : 'rgba(246,214,138,0.95)'; ctx.fillRect(wx, wy, 7, 9); }
    }
  });
  ctx.restore();
}
function k19Sea() {
  const hz = K19.hz, sh = K19.shore, [sx] = K19.sun, R = RNG('glit19'), lifts = [];
  for (let i = 0; i < 16; i++) { const y = hz + 8 + R.r(0, sh - hz), w = R.r(40, 180); lifts.push({ P: wcRect(R.r(-40, W) - w / 2, y, w, R.r(2, 5)), a: 0.8, rough: 0.08 }); }
  wcWash('sea', wcRect(-160, hz - 4, W + 320, sh - hz + 40), WC.sky, { ...k19Big, rough: 0.04, layers: 20, al: 0.11, resK: 0.6, lift: lifts, edge: 0.5 });
  wcWash('deep', wcRect(-160, hz + 40, W + 320, sh - hz - 40), WC.teal, { ...k19Big, al: 0.06, grade: [0, hz + 40, 0, sh, 0, 0.5] });
  for (let i = 0; i < 12; i++) { const y = hz + 10 + i * i * 1.3, w = (8 + i * 5) * R.r(0.5, 1.2), x = sx + R.n(14 + i * 5); wcWash('sp' + i, wcStroke([[x - w, y], [x + w, y + R.n(2)]], 1.6 + i * 0.25), WC.ochre, { rough: 0.25, layers: 10, al: 0.14, edge: 1.2, mask: false, gran: 0.5, segs: 8 }); }
  ctx.save(); ctx.fillStyle = 'rgba(255,250,236,0.92)';
  const G = RNG('fleck19', B % 3);
  for (let i = 0; i < 12; i++) { const y = hz + 6 + G.f() ** 1.5 * 150, x = sx + G.n(30 + (y - hz) * 0.5), w = G.r(6, 18); ctx.fillRect(x - w / 2, y, w, 2.2); }
  ctx.restore();
  for (let i = 0; i < 4; i++) wcWaveLine(-20, W + 20, hz + 50 + i * i * 14, { amp: 2 + i, len: 22 + i * 8, ph: i * 1.7, key: 'wv' + i, w: 1.1 + i * 0.2, al: 0.5 });
}
function k19Boat() {   // a small fishing boat with a lateen sail, bobbing
  const bob = Math.sin(TT * TAU * 0.6), rock = Math.sin(TT * TAU * 0.45) * 0.05;
  ctx.save(); ctx.translate(735, 700 + bob * 3); ctx.rotate(rock); ctx.scale(0.62, 0.62);
  const hull = [[-120, -14], [118, -24], [92, 22], [-88, 22]], sail = [[-70, -30], [70, -200], [60, -36]];
  wcWash('bsail', sail, WC.naples, { rough: 0.08, layers: 18, al: 0.11, edge: 1.4, segs: 9 });
  wcWash('bhull', hull, WC.sepiaW, { rough: 0.05, layers: 20, al: 0.11, edge: 1.6, segs: 10 });
  wcWash('bband', [[-112, -12], [112, -22], [106, -12], [-106, -2]], WC.teal, { rough: 0.04, layers: 10, al: 0.18, mask: false, gran: 0, segs: 10 });
  wcPen(hull.concat([hull[0]]), { w: 2.8, key: 'bhp' });
  wcPen([[4, -16], [4, -150]], { w: 2.6, key: 'bmast', lift: 0 });
  wcPen([[-80, -26], [76, -206]], { w: 2.4, key: 'byard', lift: 0 });
  wcPen([sail[1], sail[2], sail[0]], { w: 2, key: 'bsp', al: 0.8 });
  ctx.restore();
  wcWaveLine(660, 810, 716, { amp: 2, len: 14, key: 'wake19', w: 1.6, al: 0.7 });
}
function k19Beach() {
  const sh = K19.shore;
  wcWash('sand', wcRect(-160, sh - 10, W + 320, H - sh + 200), WC.sand, { ...k19Big, al: 0.1, grade: [0, sh, 0, H, 0.7, 1] });
  wcWash('wet', wcStroke([[-40, sh + 8], [500, sh + 14], [1120, sh + 4]], 12, 9), WC.sepiaW, { rough: 0.3, layers: 12, al: 0.04, edge: 0.5, resK: 0.7 });
  wcWaveLine(-20, W + 20, sh - 4, { amp: 3, len: 30, key: 'foam', w: 2, al: 0.7, speed: 2 });
  const R = RNG('steps19');   // footprints wandering off toward the camel
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = wcRgba(WC.sepiaW, 0.35);
  for (let i = 0; i < 9; i++) { const x = 600 + i * 34 + R.n(4), y = 1010 - i * 14 + (i % 2) * 12; ctx.beginPath(); ctx.ellipse(x, y, 6, 3.5, -0.3, 0, TAU); ctx.fill(); }
  ctx.restore();
  wcSpatter('sp19', 640, 960, 90, WC.sepiaW, 14, { al: 0.35, s: 3 });
}
function k19Camel() {   // a camel with a teal saddle cloth and ochre tassels, standing on the sand; head nods and the tail swishes on 2s
  ctx.save(); ctx.translate(850, 992); ctx.scale(1.3, 1.3);
  wcWash('cshadow', wcEll(4, 2, 78, 7, 12), WC.sepiaW, { rough: 0.2, layers: 12, al: 0.07, edge: 0.3 });
  const legs = [[[-40, -74], [-44, -40], [-42, -4], [-48, 0]], [[-26, -74], [-22, -40], [-26, -4], [-32, 0]], [[34, -74], [40, -40], [38, -4], [32, 0]], [[50, -76], [54, -40], [50, -4], [44, 0]]];
  legs.forEach((L, i) => { wcWash('cleg' + i, wcStroke(L, 4.2, 2.6), i === 1 || i === 3 ? WC.sepiaW : WC.ochre, { rough: 0.05, layers: 10, al: 0.15, mask: false, segs: 8 }); wcPen(L, { w: 1.5, key: 'clp' + i, lift: 0.15 }); });
  const body = [[-54, -96], [-44, -112], [-26, -116], [-10, -146], [8, -158], [26, -150], [38, -124], [56, -112], [66, -96], [60, -80], [36, -72], [-18, -72], [-46, -80]];
  wcWash('cbody', body, WC.ochre, { rough: 0.05, layers: 24, al: 0.09, edge: 1.5, segs: 16, lift: [{ P: [[-4, -146], [10, -152], [22, -144], [4, -138]], a: 0.55 }] });
  wcWash('cbelly', [[-46, -86], [60, -88], [58, -80], [36, -72], [-18, -72], [-44, -78]], WC.sepiaW, { rough: 0.08, layers: 12, al: 0.08, edge: 0.5, segs: 10 });
  const cloth = [[-22, -118], [36, -120], [44, -96], [-26, -94]];
  wcWash('csaddle', cloth, WC.teal, { rough: 0.04, layers: 18, al: 0.12, edge: 1.6, segs: 10 });
  wcPen(cloth.concat([cloth[0]]), { w: 1.6, key: 'csp', lift: 0.2 });
  ctx.save(); ctx.fillStyle = WC.ochre;
  for (let k = 0; k < 7; k++) { const x = -22 + k * 10.5, y = -95 + (B % 2 && k % 2 ? 1.5 : 0); wcPen([[x, y], [x, y + 7]], { w: 1, key: 'ts' + k, lift: 0, amt: 0.2 }); ctx.beginPath(); ctx.arc(x, y + 9, 2.8, 0, TAU); ctx.fill(); }
  ctx.restore();
  wcPen(body.slice(0, 10), { w: 2.2, key: 'cbp', lift: 0.35 });
  wcPen([[60, -80], [36, -72], [-18, -72], [-46, -80]], { w: 1.8, key: 'cbq', lift: 0.4 });
  const swish = [0, 0.22, -0.1, 0.28][Math.floor(TT * 2.2) % 4];
  ctx.save(); ctx.translate(64, -100); ctx.rotate(swish); wcPen([[0, 0], [7, 18], [5, 36]], { w: 1.8, key: 'ctail', lift: 0 }); ctx.restore();
  const nod = [0, 0.05, 0.02, -0.03][Math.floor(TT * 1.6) % 4];
  ctx.save(); ctx.translate(-50, -100); ctx.rotate(nod); ctx.translate(50, 100);
  const neck = [[-48, -100], [-74, -98], [-94, -112], [-104, -140]];
  wcWash('cneck', wcStroke(neck, 12, 8), WC.ochre, { rough: 0.05, layers: 18, al: 0.1, edge: 1.2, segs: 12 });
  const head = [[-98, -150], [-112, -158], [-128, -152], [-140, -140], [-136, -132], [-120, -134], [-104, -136], [-97, -142]];
  wcWash('chead', head, WC.ochre, { rough: 0.05, layers: 18, al: 0.11, edge: 1.4, segs: 10 });
  wcPen(head.concat([head[0]]), { w: 2, key: 'chp', lift: 0.3 });
  wcPen([[-52, -88], [-78, -88], [-98, -104], [-108, -132]], { w: 1.8, key: 'cnp', lift: 0.3 });
  wcPen([[-46, -112], [-70, -110], [-90, -124], [-98, -146]], { w: 1.6, key: 'cnq', lift: 0.4 });
  wcPen([[-104, -155], [-101, -165], [-97, -156]], { w: 1.6, key: 'cear', lift: 0 });
  ctx.fillStyle = WC.sepia; ctx.beginPath(); ctx.arc(-115, -148, 2.6, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.restore();
}
function k19Kite(x, y, s, col, key, ph) {   // a diamond kite with a ribboned tail; its string runs off the frame
  const sw = Math.sin(TT * TAU * 0.5 + ph) * 0.12, dx = Math.sin(TT * TAU * 0.35 + ph) * 8;
  ctx.save(); ctx.translate(x + dx, y); ctx.rotate(sw);
  const P = [[0, -s], [s * 0.72, 0], [0, s * 1.15], [-s * 0.72, 0]];
  wcWash(key, P, col, { rough: 0.05, segs: 8, layers: 16, al: 0.13, edge: 1.6, mask: false });
  wcPen(P.concat([P[0]]), { w: 1.8, key: key + 'p', lift: 0.1 });
  wcPen([[0, -s], [0, s * 1.15]], { w: 1.2, key: key + 'x', al: 0.7, lift: 0 }); wcPen([[-s * 0.72, 0], [s * 0.72, 0]], { w: 1.2, key: key + 'y', al: 0.7, lift: 0 });
  const tail = []; for (let i = 0; i <= 8; i++) tail.push([Math.sin(i * 0.9 + TT * 6 + ph) * 8, s * 1.15 + i * 9]);
  wcPen(tail, { w: 1.4, key: key + 't', lift: 0 });
  ctx.restore();
}
function k19Clock(i) {   // a clock face blooming in with its hour's sky; hands swing from Karachi's 6:30 to its own hour
  const [x, y, r, hr, sky] = K19.clocks[i], cu = TIMELINE.cues, t0 = cu.faces[i];
  const sy = k19Str(x);
  wcPen([[x, sy], [x, y - r]], { w: 1.8, key: 'cord' + i, lift: 0 });
  ctx.save(); ctx.translate(x, y);
  wcWash('rim' + i, wcEll(0, 0, r + 9, r + 9, 18), WC.stone, { rough: 0.04, layers: 16, al: 0.1, edge: 1.5, segs: 14, lift: [{ P: wcEll(0, 0, r - 2, r - 2, 18), a: 1, rough: 0.02 }], mask: false });
  const face = wcEll(0, 0, r - 3, r - 3, 18), fo = { rough: 0.05, spread: 1.2, layers: 22, al: 0.1, edge: 1.2, segs: 12, t: t0, dur: 0.5, from: [0, 0] };
  if (sky === 'noon') { wcWash('f' + i, face, WC.sky, fo); wcWash('fs' + i, wcEll(-r * 0.42, -r * 0.42, r * 0.2, r * 0.2, 10), WC.ochre, { ...fo, layers: 12, al: 0.18 }); }
  else if (sky === 'dusk') { wcWash('f' + i, face, WC.ochreL, { ...fo, grade: [0, -r, 0, r, 0.5, 1] }); wcWash('fd' + i, arcPts(0, 0, r - 8, 0.32, Math.PI - 0.32, 14), WC.tealL, { ...fo, al: 0.11, rough: 0.03 }); wcWash('fu' + i, wcEll(r * 0.36, -r * 0.05, r * 0.16, r * 0.16, 10), WC.ochre, { ...fo, layers: 12, al: 0.2 }); }
  else {
    wcWash('f' + i, face, WC.night, { ...fo, al: 0.14 });
    if (TT >= t0 + 0.3) { ctx.save(); ctx.fillStyle = WC.paper; ctx.beginPath(); ctx.arc(-r * 0.4, -r * 0.4, r * 0.18, 0, TAU); ctx.arc(-r * 0.32, -r * 0.47, r * 0.16, 0, TAU, true); ctx.fill('evenodd');
      const S = RNG('stars19'); for (let k = 0; k < 7; k++) { const a = S.r(0, TAU), d = S.r(0.3, 0.8) * r, s = (B + k) % 3 ? 1.6 : 2.4; ctx.fillRect(Math.cos(a) * d, Math.sin(a) * d, s, s); } ctx.restore(); }
  }
  wcPen(wcEll(0, 0, r, r, 40), { closed: true, w: 2.4, key: 'cr' + i });
  wcPen(wcEll(0, 0, r + 9, r + 9, 44), { closed: true, w: 1.4, key: 'cr2' + i, al: 0.6 });
  const dark = sky === 'night', tick = dark ? 'rgba(243,235,219,0.85)' : WC.sepia;
  ctx.save(); ctx.strokeStyle = tick; ctx.lineCap = 'round';
  for (let k = 0; k < 12; k++) { const a = k / 12 * TAU, q = k % 3 ? 0.84 : 0.76; ctx.lineWidth = k % 3 ? 2 : 3.4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * q, Math.sin(a) * r * q); ctx.lineTo(Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.92); ctx.stroke(); }
  ctx.restore();
  // the hands: everyone starts at 6:30; the outer clocks swing to their own hour (eased, on 2s)
  const u = i === 1 ? 1 : EZ.io(seg(TT, i === 0 ? cu.swing[0] : cu.swing[1], (i === 0 ? cu.swing[0] : cu.swing[1]) + 0.8));
  const h = lerp(6.5, hr, u), ha = h / 12 * TAU - Math.PI / 2, ma = (h % 1) * TAU - Math.PI / 2;
  wcPen([[0, 0], [Math.cos(ha) * r * 0.48, Math.sin(ha) * r * 0.48]], { w: 4.6, key: 'hh' + i, color: dark ? WC.paper : WC.sepia, lift: 0, amt: 0.2 });
  wcPen([[0, 0], [Math.cos(ma) * r * 0.72, Math.sin(ma) * r * 0.72]], { w: 3.2, key: 'mh' + i, color: dark ? WC.paper : WC.sepia, lift: 0, amt: 0.2 });
  ctx.fillStyle = WC.sepia; ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.fill();
  ctx.restore();
}
function k19Bird() {   // the sparrow hops along the string to the Karachi clock
  const hops = TIMELINE.cues.hop, hx = K19.hopX, n = hops.filter((t) => TT >= t + 0.34).length;
  const cur = hops.findIndex((t) => TT >= t && TT < t + 0.34);
  const x = cur >= 0 ? lerp(hx[cur], hx[cur + 1], clamp((TT - hops[cur]) / 0.34)) : hx[n];
  wcBird(x, k19Str(x) + 2, 118, { key: 'hero', dir: 1, hop: hops, look: n >= 3 ? 'down' : undefined, mood: n >= 3 ? 'wow' : undefined });
}
function k19Title() {   // "Karachi" in sepia italic on an ochre swash, "across time zones" under it
  const cu = TIMELINE.cues, x = 86;
  wcSwash('t19', x - 30, x + 450, 864, 104, WC.ochreL, { t: cu.title, dur: 0.5, look: { al: 0.06 } });
  wcText('Karachi', x, 900, 132, { frac: ev(cu.title + 0.15, 0.6) });
  wcText('across time zones', x + 6, 984, 66, { frac: ev(cu.title + 0.55, 0.6), color: WC.sepiaW });
}
function sceneTile() {
  k19Sky();
  k19Kite(104, 452, 30, WC.teal, 'kite1', 0); k19Kite(990, 96, 28, WC.sap, 'kite2', 2);
  wcPen([[104, 487], [60, 600], [-20, 700]], { w: 1, key: 'ks1', al: 0.45, lift: 0.2 }); wcPen([[990, 128], [1040, 420], [1100, 700]], { w: 1, key: 'ks2', al: 0.45, lift: 0.2 });
  k19Skyline();
  k19Sea();
  k19Boat();
  [[600, 520, 16], [660, 495, 12]].forEach(([x, y, s], i) => wcGull(x + TT * 22, y - TT * 4, s, { key: 'gl' + i, ph: i }));
  k19Beach();
  k19Camel();
  const P = []; for (let x = -30; x <= 1110; x += 30) P.push([x, k19Str(x)]);   // the string of clocks
  wcPen(P, { w: 2, key: 'string', lift: 0.1 });
  for (let i = 0; i < 3; i++) k19Clock(i);
  k19Bird();
  k19Title();
}
