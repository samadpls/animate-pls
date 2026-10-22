// =====================================================================
//  SCENES — one take. World 1080x1080; time TT on 2s; ev / popS for events. The card is the constant:
//  sketched in pencil, opened into the machine, and back on the desk as the phone's screen.
// =====================================================================
const OT_CARD = [360, 250, 360, 500];                         // the sketched card on the notebook (x, y, w, h)
const OT_BAR = [200, 720, 680, 64];                           // the build bar in the machine
const OT_PHONE = { x: 600, y: 170, w: 320, h: 640 };
const OT_SCREEN = [OT_PHONE.x + 16, OT_PHONE.y + 46, OT_PHONE.w - 32, OT_PHONE.h - 84];
const OT_GRAPHITE = 'rgba(70,64,74,0.85)';
const otShadow = (P, key) => paint(P, { fill: 'rgba(30,20,12,0.35)', line: false, key: key + 'sh', tex: [{ k: 'hatch', a: 0.8, gap: 4, al: 0.5 }] });
function otCap(str, t) {   // a caption card at the top, popped in and written on at t (drawn after the camera)
  if (TT < t) return;
  const f = () => inkCard(str, CX, 92, 52, { rot: -0.012, s: popS(t), frac: ev(t + 0.1, 0.5) });
  if (DEFER) DEFER.push(f); else f();
}
// the card as a pencil sketch; t0 = when it starts being drawn (a past t0 draws it whole). text: false leaves the
// words out (the small copy on the pull back slides in past the frame edge, and words cut by the edge fail review)
function otSketch(t0, o = {}) {
  const [x, y, w, h] = OT_CARD, g = (dt, d) => ev(t0 + dt, d), text = o.text !== false;
  const pen = (P, key, frac, closed) => ink(P, { closed, w: 3, color: OT_GRAPHITE, key, frac, amt: 1.6 });
  pen(rrectPts(x, y, w, h, 22), 'sk-out', g(0, 0.6), true);
  if (text) handText('my app', x + 34, y + 62, 40, OT_GRAPHITE, { key: 'sk-t', frac: g(0.6, 0.3) });
  else pen([[x + 34, y + 52], [x + 180, y + 52]], 'sk-tl', g(0.6, 0.3));
  pen([[x + 30, y + 86], [x + w - 30, y + 86]], 'sk-hr', g(0.85, 0.2));
  pen(ellipsePts(x + 64, y + 140, 28, 28, 0, 24), 'sk-av', g(1.0, 0.2), true);
  for (let i = 0; i < 3; i++) pen([[x + 34, y + 210 + i * 58], [x + w - 34 - i * 60, y + 210 + i * 58]], 'sk-r' + i, g(1.15 + i * 0.12, 0.2));
  pen(rrectPts(x + 40, y + 390, w - 80, 72, 16), 'sk-btn', g(1.6, 0.3), true);
  if (text) handText('go', x + w / 2 - 22, y + 438, 40, OT_GRAPHITE, { key: 'sk-go', frac: g(1.9, 0.2) });
}
// the same card, finished, on the phone's screen (al = how much of it is there yet)
function otAppCard(al) {
  if (al <= 0.01) return;
  const [sx, sy, sw] = OT_SCREEN, x = sx + 24, w = sw - 48;
  ctx.save(); ctx.globalAlpha = al;
  handText('my app', x + 6, sy + 64, 42, C.ink, { key: 'ap-t' });
  ink([[x, sy + 86], [x + w, sy + 86]], { w: 2.4, color: 'rgba(58,36,23,0.6)', key: 'ap-hr' });
  paint(ellipsePts(x + 34, sy + 140, 28, 28, 0, 24), { fill: C.terra, key: 'ap-av', w: 2.6, tex: [{ k: 'cross', c: C.orangeD, al: 0.45, gap: 5 }] });
  for (let i = 0; i < 3; i++) ink([[x + 4, sy + 210 + i * 58], [x + w - 4 - i * 50, sy + 210 + i * 58]], { w: 2.6, color: 'rgba(58,36,23,0.6)', key: 'ap-r' + i });
  paint(rrectPts(x + 10, sy + 390, w - 20, 72, 16), { fill: C.terra, key: 'ap-btn', w: 3, tex: [{ k: 'pencil', c: C.orangeL, al: 0.4, per: 60 }] });
  handText('go', x + w / 2 - 22, sy + 438, 40, C.cream, { key: 'ap-go' });
  ctx.restore();
}
function otNotebook(x, y, w, h, key) {
  otShadow(box(x + 10, y + 14, w, h), key);
  paint(box(x, y, w, h), { fill: C.paper, key, w: 3, tex: [{ k: 'pencil', c: '#e8d6b0', al: 0.5, per: 90 }, { k: 'hatch', a: 0.8, gap: 6, al: 0.14, dens: (px, py) => clamp((px + py - x - y - (w + h) * 0.5) / (w + h)) }] });
  for (let i = 0; i < 12; i++) ink([[x + 24, y + 70 + i * 60], [x + w - 24, y + 70 + i * 60]], { w: 1.4, color: 'rgba(120,150,190,0.35)', key: key + 'rl' + i, amt: 0.4 });
}

// ---- 1  sketch: an idea drawn in pencil on the notebook; the camera drifts into the card
function sceneSketch() {
  woodSurface(-40, -40, W + 40, H + 40, 'desk');
  inkMug(950, 170, 64, 'mug');
  otNotebook(230, 150, 620, 790, 'nb');
  otSketch(TIMELINE.cues.sketch);
  const k = ev(TIMELINE.cues.sketch, 2.0), px = lerp(400, 640, k), py = lerp(300, 700, k) + 30 * Math.sin(k * 14);
  drawPencil(px, py, -0.9, 300, 1, 'pencil');
  otCap('an idea', 0.2);
}

// ---- 2  build: inside the card, the machine writes it and the bar fills
function sceneBuild() {
  darkWorld('build');
  hexGrid({ x0: -40, y0: 860, x1: W + 40, y1: H + 40 }, 60, { key: 'hex' });
  for (let i = 0; i < 18; i++) { const R = RNG('st', i); star4(R.r(40, 1040), R.r(150, 700), R.r(4, 9) * (0.7 + 0.3 * ((B + i) % 2)), C.white); }
  paint(rrectPts(150, 190, 780, 440, 18), { fill: C.navy2, key: 'term', line: C.peri, w: 3 });
  const code = ['const card = sketch()', 'card.title = "my app"', 'card.button = "go"', '$ npm run build', '  built in 1.2s'];
  code.forEach((s, i) => monoText(s, 190, 270 + i * 72, 40, i === code.length - 1 ? C.cyan : C.white, { key: 'cl' + i, count: Math.floor(clamp((TT - TIMELINE.cues.type - i * 0.3) / 0.35) * s.length) }));
  const [x, y, w, h] = OT_BAR, k = EZ.io(ev(TIMELINE.cues.fill, TIMELINE.cues.full - TIMELINE.cues.fill));
  monoText('build', x, y - 22, 34, C.peri, { key: 'bl' });
  paint(rrectPts(x, y, w, h, 14), { fill: '#05060f', key: 'track', line: C.peri, w: 3 });
  if (k > 0.01) paint(rrectPts(x + 4, y + 4, (w - 8) * k, h - 8, 11), { fill: C.cyan, key: 'fill', line: false, tex: [{ k: 'hatch', a: 0.8, gap: 6, c: '#2a9d8f', al: 0.5 }] });
  otCap('built in code', 3.15);
}

// ---- 3  shipped: the bar became the phone's screen; a held breath, the stamp, then the pull back to the sketch
function sceneShipped() {
  const cu = TIMELINE.cues;
  woodSurface(-40, -40, W + 40, H + 40, 'desk');
  inkMug(150, 930, 64, 'mug');
  // the notebook, smaller and turned, with the sketch from the start; it gets a tick on the pull back
  ctx.save(); ctx.translate(70, 230); ctx.rotate(-0.05); ctx.scale(0.62, 0.62); ctx.translate(-230, -150);
  otNotebook(230, 150, 620, 790, 'nb2');
  otSketch(-99, { text: false });
  ctx.restore();
  ink([[260, 560], [300, 600], [380, 500]], { w: 9, color: C.ink, key: 'tick', frac: ev(8.8, 0.35), amt: 1.2 });
  // the phone; its screen is the carried bar, so its picture fades in only once the carry has landed
  const P = OT_PHONE;
  otShadow(rrectPts(P.x + 12, P.y + 16, P.w, P.h, 44), 'ph');
  paint(rrectPts(P.x, P.y, P.w, P.h, 44), { fill: '#2b2b33', key: 'ph', line: C.ink, w: 4, tex: [{ k: 'hatch', a: 0.8, gap: 5, c: '#000000', al: 0.3 }] });
  const [sx, sy, sw, sh] = OT_SCREEN;
  paint(rrectPts(sx, sy, sw, sh, 20), { fill: C.cream, key: 'scr', line: C.ink, w: 2.4 });
  otAppCard(carryIn('screen'));
  ink([[P.x + P.w / 2 - 28, P.y + 24], [P.x + P.w / 2 + 28, P.y + 24]], { w: 5, color: '#666670', key: 'spk' });
  if (TT >= cu.stamp) inkCard('shipped', P.x + P.w * 0.62, P.y + P.h * 0.9, 64, { rot: -0.12, s: popS(cu.stamp) });
  if (TT >= cu.stamp) burst(P.x + P.w * 0.62, P.y + P.h * 0.9, 150, 210, { c: C.ink, n: 12, w: 3, al: 1 - ev(cu.stamp + 0.25, 0.4), key: 'sb' });
  otCap('sketch to shipped, one take', 8.7);
}
