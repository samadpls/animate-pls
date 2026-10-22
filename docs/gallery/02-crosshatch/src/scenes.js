// =====================================================================
//  SCENES — Querypls tile. World 1080x1080; time TT on 2s; ev / popS / springMove for events.
//  Left: the warm desk, a hand-written question card sliding into the machine's slot.
//  Right: the navy machine; the hero catches the question inside and the SQL comes out above it in cyan
//  (cyan = SQL the machine wrote; periwinkle = the light inside the machine).
// =====================================================================
const T2_M = { x: 506, y: 150, w: 499, h: 650 };            // the machine panel
const T2_CARD = { w: 462, h: 236, x1: 534, cy: 462 };        // the card: its right end sits in the slot at x1
const T2_SQL = ['SELECT name FROM users', 'WHERE signup >=', "  now() - '7 days';"];
const T2_SQL_SIZE = 32;
const T2_HERO = [790, 656, 86];
const t2Shadow = (P, key) => paint(P, { fill: 'rgba(30,20,12,0.35)', line: false, key: key + 'sh', tex: [{ k: 'hatch', a: 0.8, gap: 4, al: 0.5 }] });

// ---- the main tag (top-left) and the caption (bottom centre), re-placed for 1080x1080; drawn after the camera
function t2Tag(str, t) {
  if (TT < t) return;
  const size = 84, w = handW(str, size) + size * 0.9;
  const f = () => inkCard(str, 72 + w / 2, 134, size, { rot: -0.035, s: popS(t) });
  if (DEFER) DEFER.push(f); else f();
}
function t2Caption(str, t) {
  if (TT < t) return;
  const f = () => inkCard(str, CX, 966, 52, { rot: 0.012, s: popS(t), frac: ev(t + 0.1, 0.6) });
  if (DEFER) DEFER.push(f); else f();
}

// ---- the question card, in its own frame (0,0 = its top-left); dx = how far it still has to slide
function t2Card(dx) {
  const { w, h, x1, cy } = T2_CARD, ox = x1 - w + dx, oy = cy - h / 2;
  ctx.save(); ctx.translate(ox, oy); ctx.rotate(-0.01);
  paint(box(0, 0, w, h), { fill: C.paper, key: 'card', w: 3.4, tex: [{ k: 'pencil', c: '#e8d6b0', al: 0.55, per: 80 }, { k: 'hatch', a: 0.8, gap: 5, al: 0.18, dens: (px, py) => clamp((px + py - ox - oy - (w + h) * 0.55) / ((w + h) * 0.5)) }] });
  for (let i = 0; i < 2; i++) ink([[22, 110 + i * 76], [w - 22, 110 + i * 76]], { w: 1.6, color: 'rgba(110,140,185,0.5)', key: 'crl' + i, amt: 0.5 });
  handText('who signed up', 26, 98, 56, C.ink, { key: 'q1' });
  handText('this week?', 26, 174, 56, C.ink, { key: 'q2' });
  // the end going into the slot falls into the machine's shadow
  ctx.save(); trace(box(w - 52, -6, 62, h + 12), true); ctx.clip();
  hatch({ x0: w - 52, y0: -6, x1: w + 10, y1: h + 6 }, { key: 'cardin', a: 0.8, gap: 4, al: 0.5, c: '#1b1530', dens: (px) => clamp((px - (w - 52)) / 40) });
  ctx.restore();
  ctx.restore();
}

// ---- the machine: a navy window into the inside of the computer, with a slot on its left wall
function t2Machine() {
  const { x, y, w, h } = T2_M, P = rrectPts(x, y, w, h, 26);
  t2Shadow(rrectPts(x + 14, y + 18, w, h, 26), 'm');
  const Q = paint(P, { fill: C.navy2, key: 'mach', line: C.ink, w: 5, tex: [
    { k: 'stipple', c: 'rgba(150,160,220,0.35)', n: 900, s: 2 },
    { k: 'hatch', a: 0.8, gap: 6, c: '#05060f', al: 0.5, dens: (px, py) => clamp((px - x + py - y - (w + h) * 0.5) / ((w + h) * 0.5)) },
  ] });
  ctx.save(); trace(Q, true); ctx.clip();
  hexGrid({ x0: x, y0: y + h - 230, x1: x + w, y1: y + h }, 34, { key: 'hex', c: 'rgba(150,164,230,0.2)' });
  for (let i = 0; i < 9; i++) { const R = RNG('st', i); star4(R.r(x + 40, x + w - 40), R.r(y + h - 210, y + h - 30), R.r(4, 8) * (0.7 + 0.3 * ((B + i) % 2)), C.white); }
  ctx.restore();
  ink(rrectPts(x + 12, y + 12, w - 24, h - 24, 18), { closed: true, w: 2.4, color: C.peri, key: 'mrim' });
  // the header: three periwinkle dots and a rule (no traffic-light colours: they would mean nothing here)
  for (let i = 0; i < 3; i++) paint(ellipsePts(x + 46 + i * 34, y + 52, 10, 10, 0, 16), { fill: C.periD, line: C.peri, w: 2, key: 'md' + i });
  ink([[x + 24, y + 90], [x + w - 24, y + 90]], { w: 2, color: C.periD, key: 'mhr' });
}

// ---- the SQL, typed out in cyan, with a blinking cursor
function t2Sql(t0) {
  const { x, y } = T2_M, cw = monoW(T2_SQL_SIZE), x0 = x + 34, y0 = y + 168, lh = 64;
  let lastEnd = null;
  T2_SQL.forEach((s, i) => {
    const n = Math.floor(clamp((TT - t0 - i * 0.42) / 0.4) * s.length);
    monoText(s, x0, y0 + i * lh, T2_SQL_SIZE, C.cyan, { key: 'sql' + i, count: n });
    if (n > 0) lastEnd = [x0 + n * cw, y0 + i * lh];
  });
  if (lastEnd && (B % 6 < 3 || TT < t0 + 1.4)) { ctx.fillStyle = C.cyan; ctx.fillRect(lastEnd[0] + 4, lastEnd[1] - T2_SQL_SIZE * 0.78, cw * 0.7, T2_SQL_SIZE * 0.95); }
}

// ---- the slot: a dark mouth in the machine's left wall with light leaking out round the card
function t2Slot() {
  const { x } = T2_M, { h, cy } = T2_CARD, y0 = cy - h / 2 - 18, y1 = cy + h / 2 + 18;
  paint(box(x - 12, y0, 30, y1 - y0), { fill: '#05060f', key: 'slot', line: C.ink, w: 3.6 });
}
function t2SlotLip() {
  const { x } = T2_M, { h, cy } = T2_CARD, y0 = cy - h / 2 - 18, y1 = cy + h / 2 + 18;
  ink([[x - 12, y0], [x + 18, y0]], { w: 4, color: C.ink, key: 'lipt' });
  ink([[x - 12, y1], [x + 18, y1]], { w: 4, color: C.ink, key: 'lipb' });
  ink([[x + 18, y0 + 4], [x + 18, y1 - 4]], { w: 4, color: C.peri, key: 'lip' });
  // light from inside spilling out above and below the card
  for (const [s, yy] of [[-1, y0], [1, y1]]) for (let i = 0; i < 3; i++) ink([[x - 18 - i * 4, yy + s * (10 + i * 12)], [x - 40 - i * 10, yy + s * (18 + i * 20)]], { w: 2.6, color: C.ink, key: 'ray' + s + i, amt: 0.6 });
}

// ---- the question's path inside: periwinkle dashes from the slot to the hero
function t2Path(k) {
  const { x } = T2_M, [hx, hy, r] = T2_HERO, P = [];
  for (let i = 0; i <= 24; i++) { const u = i / 24; P.push([lerp(x + 30, hx - r * 0.9, u), lerp(T2_CARD.cy + 20, hy - 6, u) + Math.sin(u * Math.PI) * 46]); }
  ctx.save(); ctx.setLineDash([12, 12]);
  ink(P, { w: 3.4, color: C.peri, key: 'path', frac: k, amt: 1 });
  ctx.restore();
}

function sceneTile() {
  const cu = TIMELINE.cues;
  woodSurface(-40, -40, W + 40, H + 40, 'desk');
  inkMug(222, 820, 60, 'mug');
  t2Machine();
  t2Slot();
  // the card slides in from the left; its right end disappears into the slot
  const dx = springMove(cu.feed, -34, 0, SPRING.heavy);   // starts at the slot's mouth, whole and in frame
  ctx.save(); ctx.beginPath(); ctx.rect(-40, -40, T2_M.x + 6 + 40, H + 80); ctx.clip();
  t2Card(dx);
  ctx.restore();
  t2SlotLip();
  t2Path(ev(0.35, 0.4));
  t2Sql(cu.type);
  const [hx, hy, hr] = T2_HERO;
  dotHero(hx, hy, hr, { key: 'hero', dark: true, mood: TT < cu.type + 0.6 ? 'wow' : 'happy' });
  // the hero beams the SQL up: short cyan ticks over its head while it types, a few kept as idle sparkle
  const beam = ev(cu.type, 0.3);
  if (beam > 0) for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.32, r0 = hr * 1.32, r1 = hr * (1.6 + 0.12 * ((B + i) % 2));
    ink([[hx + Math.cos(a) * r0, hy + Math.sin(a) * r0], [hx + Math.cos(a) * r1, hy + Math.sin(a) * r1]], { w: 4, color: C.cyan, key: 'beam' + i, amt: 0.5, frac: beam });
  }
  t2Tag('Querypls', cu.tag);
  t2Caption('a question becomes SQL', cu.cap);
}
