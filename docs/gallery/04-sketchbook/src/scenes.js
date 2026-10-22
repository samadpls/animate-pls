// =====================================================================
//  SCENES — gallery tile 04 (sketchbook). World = screen, 1080x1080; time TT on 2s; ev / seg for events.
//  The path of a first contribution: fork -> branch -> commit -> pull request -> a big circled "merged",
//  ticked in green; the doodle hero cheers beside it. All drawn on by 2.2s; the thumbnail is t = 2.5.
// =====================================================================
const T4 = {
  tag: { x: 100, y: 190, size: 86 },
  cap: { y: 960, size: 70 },
  lab: 50,                                            // step label size (>= 32px)
  merged: { x: 464, y: 690, rx: 196, ry: 128, size: 90 },
  hero: { x: 158, y: 702, r: 68 },
  ground: 800,
};
// the steps, in order; each card is pencilled, inked, then lettered (t0 = when its pencil starts)
const T4_STEPS = [
  { lines: ['fork'], x: 178, y: 372, t0: 0.15, rot: -0.03 },
  { lines: ['branch'], x: 522, y: 372, t0: 0.42, rot: 0.018 },
  { lines: ['commit'], x: 874, y: 372, t0: 0.69, rot: -0.02 },
  { lines: ['pull', 'request'], x: 874, y: 636, t0: 0.96, rot: 0.025 },
];
const T4_DUR = { card: 0.2, arrow: 0.08 };

// a card's box from its label
function t4CardBox(s) {
  const sz = T4.lab, lw = Math.max(...s.lines.map((l) => letterW(l, sz)));
  const w = Math.max(176, lw + 70), h = s.lines.length * sz * 1.02 + 50;
  return { x: s.x - w / 2, y: s.y - h / 2, w, h };
}
// a box drawn in one go that keeps all four sides: starts on the top edge, goes round, runs a little past its start
function t4Box(x, y, w, h, r = 14, over = 0.06) {
  const P = [[x + r + w * 0.04, y + 0.5]], arc = (cx, cy, a0) => { for (let i = 0; i <= 6; i++) { const a = a0 + (i / 6) * Math.PI / 2; P.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
  arc(x + w - r, y + r, -Math.PI / 2); arc(x + w - r, y + h - r, 0); arc(x + r, y + h - r, Math.PI / 2); arc(x + r, y + r, Math.PI);
  P.push([x + r + w * (0.04 + over), y - 2]);
  return P;
}
const t4Rot = (P, s) => { const c = Math.cos(s.rot || 0), n = Math.sin(s.rot || 0); return P.map(([x, y]) => [s.x + (x - s.x) * c - (y - s.y) * n, s.y + (x - s.x) * n + (y - s.y) * c]); };
function t4CardPts(s) { const b = t4CardBox(s); return t4Rot(t4Box(b.x, b.y, b.w, b.h), s); }
function t4Card(s, i) {
  const b = t4CardBox(s), sz = T4.lab, t0 = s.t0;
  const P = t4Box(b.x, b.y, b.w, b.h);
  const pp = ev(t0 - 0.06, T4_DUR.card), ip = ev(t0, T4_DUR.card), lp = ev(t0 + 0.1, 0.22);
  ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot || 0); ctx.translate(-s.x, -s.y);
  if (ip > 0) gfill(sketchBox(b.x, b.y, b.w, b.h, 14, 0), SK.sheet, { a: clamp(ip * 2.5), off: [6, 5], key: 'cf' + i });
  gpencil(P, { key: 'cp' + i, part: pp, w: 2.4, a: 0.7, amp: 2.8 });
  gline(P, { key: 'ci' + i, part: ip, w: 5 });
  const n = s.lines.length;
  s.lines.forEach((l, k) => handLetter(l, s.x, s.y + (k - (n - 1) / 2) * sz * 1.02 + sz * 0.3, sz, { reveal: seg(lp, k / n, (k + 1) / n), key: 'lab' + i + k }));
  ctx.restore();
  return b;
}
// a hand-drawn ink arrow, written on; the head flicks in last
function t4Arrow(P, part, key, o = {}) {
  const w = o.w ?? 4.5;
  gline(P, { w, key, part: clamp(part / 0.8), amp: 1.4, step: 10, second: false });
  if (part > 0.8) {
    const Q = resample(P, false, 6), e = Q[Q.length - 1], q = Q[Math.max(0, Q.length - 5)], an = Math.atan2(e[1] - q[1], e[0] - q[0]), hk = seg(part, 0.8, 1);
    for (const s of [-1, 1]) gline([e, [e[0] - Math.cos(an + s * 0.48) * 26 * hk, e[1] - Math.sin(an + s * 0.48) * 26 * hk]], { w, key: key + 'h' + s, amp: 0.5, step: 6, second: false });
  }
}
// the arrows between the steps (computed from the cards so they always meet them)
function t4ArrowPts() {
  const B0 = T4_STEPS.map(t4CardBox), M = T4.merged, out = [];
  for (let i = 0; i < 2; i++) {   // across the top row
    const a = B0[i], b = B0[i + 1], y = T4_STEPS[i].y, x0 = a.x + a.w + 16, x1 = b.x - 18;
    out.push([[x0, y + 2], [lerp(x0, x1, 0.5), y - 9], [x1, y]]);
  }
  { const a = B0[2], b = B0[3], x = T4_STEPS[2].x; out.push([[x - 6, a.y + a.h + 14], [x + 14, lerp(a.y + a.h, b.y, 0.5)], [x + 2, b.y - 18]]); }   // down the right side
  { const a = B0[3], y = T4_STEPS[3].y, x0 = a.x - 16, x1 = M.x + M.rx + 22; out.push([[x0, y + 8], [lerp(x0, x1, 0.5), y + 20], [x1, M.y - 4]]); }   // into "merged"
  return out;
}
function t4MergedLoop() { const M = T4.merged; return loopPts(M.x, M.y, M.rx, M.ry, 0.12, -2.5, 64); }
const T4_TICK = () => { const M = T4.merged; return [[M.x + 112, M.y - 118], [M.x + 152, M.y - 74], [M.x + 238, M.y - 192]]; };

// where the pencil is: it follows whatever is being drawn, then leaves the page
function t4PencilTip() {
  const cu = TIMELINE.cues, AR = t4ArrowPts(), D = T4_DUR;
  for (let i = 0; i < T4_STEPS.length; i++) {
    const t0 = T4_STEPS[i].t0;
    if (TT >= t0 && TT < t0 + D.card) return writeEnd(t4CardPts(T4_STEPS[i]), ev(t0, D.card));
    if (TT >= t0 + D.card && TT < t0 + D.card + D.arrow) return writeEnd(AR[i], ev(t0 + D.card, D.arrow));
  }
  if (TT < cu.circle) return AR[3][AR[3].length - 1];
  if (TT < cu.circle + 0.35) return writeEnd(t4MergedLoop(), ev(cu.circle, 0.35));
  if (TT < cu.tick) { const M = T4.merged; return [M.x - 130 + 260 * ev(cu.circle + 0.35, cu.tick - cu.circle - 0.35), M.y + 40 + 10 * Math.sin(B * 2.3)]; }
  if (TT < cu.tick + 0.2) return writeEnd(T4_TICK(), ev(cu.tick, 0.2));
  const k = EZ.i2(ev(cu.tick + 0.2, 0.2)), e = T4_TICK()[2];
  return [lerp(e[0], 1300, k), lerp(e[1], 120, k)];
}

// background life: a paper plane looping a small figure-eight in the top-right margin, its trail behind it
function t4Plane(key) {
  const at = (p) => [850 + 92 * Math.sin(TAU * p), 168 + 30 * Math.sin(2 * TAU * p)];
  const p = TT / 3, trail = [];
  for (let i = 0; i <= 20; i++) trail.push(at(p - 0.3 + 0.3 * i / 20));
  ctx.save(); ctx.setLineDash([10, 12]); gpencil(trail, { key: key + 'tr', w: 2.2, a: 0.55, passes: 1, amp: 1 }); ctx.restore();
  const [x, y] = at(p), [x2, y2] = at(p + 0.01);
  paperPlane(x, y, Math.atan2(y2 - y, x2 - x), 0.95, key);
}

// ---- the tag and the caption, placed for 1080x1080 (the kit's own helpers sit where 9:16 wants them)
function t4TagDraw(str) {
  const { x, y, size } = T4.tag, w = letterW(str, size, 'marker');
  tapeStrip(x + w / 2, y - size * 0.3, w + 64, -0.03, 'tagtape' + str, size * 1.15);
  const [x0, x1] = handLetter(str, x, y, size, { face: 'marker', align: 'left', reveal: ev(E0 + 0.05, 0.35), key: 'tag' + str, jit: 0.7 });
  underline(x0, x1, y + 22, { col: SK.red, w: 6, key: 'tagu' + str, part: ev(E0 + 0.45, 0.2) });
}
function t4CaptionDraw(line, at) {
  const { y, size } = T4.cap;
  handLetter(line, CX, y, size, { reveal: ev(E0 + at, 0.45), key: 'cap' + line });
}
const t4Tag = (str) => { const f = () => t4TagDraw(str); if (DEFER) DEFER.push(f); else f(); };
const t4Caption = (line, at) => { const f = () => t4CaptionDraw(line, at); if (DEFER) DEFER.push(f); else f(); };

// ---- the one scene
function sceneTile() {
  const cu = TIMELINE.cues, M = T4.merged, HR = T4.hero;
  sketchPage({ grid: 'dots' });
  t4Plane('plane');
  // the steps and the arrows between them, drawn in order
  const AR = t4ArrowPts();
  T4_STEPS.forEach((s, i) => {
    t4Card(s, i);
    t4Arrow(AR[i], ev(s.t0 + T4_DUR.card, T4_DUR.arrow + 0.04), 'ar' + i);
  });
  // "merged": a pencil loop, then a heavy ink loop that overshoots; the word, a highlighter swipe, burst marks
  const loop = t4MergedLoop();
  gfill(loopPts(M.x, M.y, M.rx - 4, M.ry - 4, 0, 0, 48), SK.sheet, { a: 0.55 * ev(cu.circle + 0.1, 0.3), off: [6, 5], key: 'mfill' });
  gpencil(loop, { key: 'mp', part: ev(cu.circle - 0.05, 0.3), w: 2.6, a: 0.6, amp: 3 });
  gline(loop, { key: 'mi', part: ev(cu.circle, 0.35), w: 8, amp: 2 });
  const msz = M.size, mw = letterW('merged', msz, 'marker'), mx0 = M.x - mw / 2;
  highlight(mx0, mx0 + mw, M.y + msz * 0.32 - msz * 0.3, msz * 0.56, ev(cu.hilite, 0.25), { key: 'mhi' });
  handLetter('merged', M.x, M.y + msz * 0.32, msz, { face: 'marker', reveal: ev(cu.word, 0.3), key: 'merged', jit: 0.8 });
  const burst = ev(cu.tick + 0.1, 0.2);
  if (burst > 0) [-2.25, -1.95, -1.65].forEach((a, i) => {
    const r0 = 26 + 4 * ((B + i) % 2), r1 = r0 + 40;
    gline([[M.x + Math.cos(a) * (M.rx + r0), M.y + Math.sin(a) * (M.ry + r0)], [M.x + Math.cos(a) * (M.rx + r1), M.y + Math.sin(a) * (M.ry + r1)]], { w: 5, key: 'burst' + i, part: burst, second: false, amp: 0.6, step: 8 });
  });
  // the tick: one green stroke, drawn as a line
  gline(T4_TICK(), { w: 17, col: SK.green, key: 'tick', part: ev(cu.tick, 0.2), amp: 1.4, step: 8 });
  // the hero: watches the pencil, then hops and cheers when the tick lands
  smudge(HR.x + 4, T4.ground - 2, 70, 12, 0.16 * (1 - 0.5 * Math.sin(Math.PI * ev(cu.cheer, 0.16))));
  gpencil([[HR.x - 92, T4.ground + 2], [HR.x, T4.ground - 2], [HR.x + 96, T4.ground + 1]], { key: 'ground', w: 3, a: 0.75 });
  const hop = Math.sin(Math.PI * ev(cu.cheer, 0.16)), sq = Math.sin(Math.PI * ev(cu.cheer + 0.16, 0.1));
  const cheer = TT >= cu.cheer, tip = TT < cu.tick + 0.2 ? t4PencilTip() : [M.x, M.y];
  const lk = [clamp((tip[0] - HR.x) / 300, -1, 1), clamp((tip[1] - HR.y) / 300, -1, 1)];
  doodleHero(HR.x, HR.y - 56 * hop, HR.r, {
    key: 'hero', legs: true, mood: cheer ? 'happy' : 'calm', look: cheer ? [0.6, -0.4] : lk,
    sx: 1 + 0.1 * sq - 0.05 * hop, sy: 1 - 0.1 * sq + 0.08 * hop,
    arms: cheer ? [1.3 + 0.07 * ((B % 2) ? 1 : -1), 1.32 - 0.07 * ((B % 2) ? 1 : -1)] : [-0.9, -0.9],
  });
  if (cheer) for (let i = 0; i < 3; i++) sparkle([HR.x - 52, HR.x + 70, HR.x + 4][i], [HR.y - 128, HR.y - 140, HR.y - 172][i], 22, ((TT - cu.cheer) * 1.6 + [0.56, 0.44, 0.66][i]) % 1, 'spk' + i);
  // the pencil that draws it all, then leaves
  if (TT >= T4_STEPS[0].t0 && TT < cu.tick + 0.4) { const p = t4PencilTip(); pencilTool(p[0], p[1], -0.75 + 0.08 * Math.sin(B * 1.7), 0.9); }
  t4Tag('your first PR');
  t4Caption('an open-source guide', 0.9);
}
