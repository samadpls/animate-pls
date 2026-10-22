// =====================================================================
//  SCENE — tile 03, riso. World coordinates 1080x1080; time TT on 2s; ev / popS for events.
//  Every colour is plate tones { teal, pink, yellow }. Two layers: a coarse field (red stage curtains, the two
//  light cones printed in lighter ink, brightest where they cross) and one world layer (screen, lamps, stage,
//  podium, hero, mic, seats). Ink-blue (teal + pink) belongs to the hero alone.
// =====================================================================
const t3q = (a, c, b, n = 14) => Array.from({ length: n + 1 }, (_, i) => { const u = i / n, v = 1 - u; return [v * v * a[0] + 2 * v * u * c[0] + u * u * b[0], v * v * a[1] + 2 * v * u * c[1] + u * u * b[1]]; });
const t3cat = (...S) => S.reduce((A, P) => A.concat(A.length ? P.slice(1) : P), []);

// ---- the layout (1080x1080; everything that matters inside the 60px margin)
const T3 = {
  scr: { x: 72, y: 240, w: 470, h: 288 },                  // the big screen (bezel outer box)
  hero: { x: 776, y: 556, r: 146 },
  pod: { x0: 650, x1: 910, top: 694, bot: 836 },           // the podium's front panel
  floor: { y0: 748, lip: 846 },
  lamps: [{ x: 742, cue: 'lampA' }, { x: 952, cue: 'lampB' }],
  aim: [796, 792],                                          // where both beams land (the podium)
  seatY: 974,
};
const t3on = (L) => TT >= TIMELINE.cues[L.cue] - 1e-6;
function t3lampHead(L) {   // the can hangs from the batten, aimed at the podium
  const c = [L.x, 128], d = [T3.aim[0] - c[0], T3.aim[1] - c[1]], l = Math.hypot(d[0], d[1]), u = [d[0] / l, d[1] / l];
  return { c, d: u, ang: Math.atan2(u[1], u[0]), lens: [c[0] + u[0] * 54, c[1] + u[1] * 54] };
}
function t3cone(L) {       // the light cone from the lens to the boards
  const h = t3lampHead(L), [lx, ly] = h.lens, nx = -h.d[1], ny = h.d[0], fy = T3.aim[1] + 14, sp = 190;
  return [[lx + nx * 34, ly + ny * 34], [T3.aim[0] + sp, fy], [T3.aim[0] - sp, fy], [lx - nx * 34, ly - ny * 34]];
}

// ---- the far field: red pleated curtains, screened coarse; the lit cones knock in lighter ink
function t3field() {
  // each pleat: a wide lit fold (coral, nearly solid) and a narrow dark crease (teal shades it to maroon)
  const N = 7, P = W / N, pk = [], tl = [], ye = [], e = 0.2 / N;
  for (let k = 0; k <= N; k++) {
    const c = k / N;
    if (k > 0) { pk.push([c - e, 0.86]); tl.push([c - e, 0]); ye.push([c - e, 0.86]); }
    pk.push([c, 1]); tl.push([c, 0.5]); ye.push([c, 0.7]);
    if (k < N) { pk.push([c + e, 0.86]); tl.push([c + e, 0]); ye.push([c + e, 0.86]); pk.push([c + 0.5 / N, 0.8]); tl.push([c + 0.5 / N, 0]); ye.push([c + 0.5 / N, 0.9]); }
  }
  const g = (st, k = 1) => lin(0, 0, W, 0, st.map(([p, v]) => [p, v * k]));
  fill(rect(-80, -80, W + 160, T3.floor.y0 + 100), { pink: g(pk), teal: g(tl), yellow: g(ye) });
  for (let k = 0; k <= N; k++) line([[k * P + 2, -20], [k * P - 4, T3.floor.y0 + 4]], { teal: 0.7, pink: 1, yellow: 0.85 }, { w: 6, amt: 1.2, key: 'pleat' + k });
  // the lit cones: the same pleats, a lighter ink mix (less pink, no teal), brightest where both beams cross
  const lit = T3.lamps.filter(t3on), cone = (L) => poly(t3cone(L));
  const litTones = (k) => ({ pink: lin(0, 140, 0, T3.aim[1], [[0, 0.16 * k], [1, 0.42 * k]]), yellow: 1, teal: g(tl, 0.16) });
  for (const L of lit) { clipTo(cone(L)); fill(rect(-80, -80, W + 160, T3.floor.y0 + 100), litTones(1)); unclip(); }
  if (lit.length === 2) { clipTo(cone(lit[0])); clipTo(cone(lit[1])); fill(rect(-80, -80, W + 160, T3.floor.y0 + 100), litTones(0.35)); unclip(); unclip(); }
}

// ---- a stage lamp on the batten: a yoke, an olive-black can, a paper lens once it snaps on
function t3lamp(L, key) {
  const on = t3on(L), h = t3lampHead(L), { c, d } = h, n = [-d[1], d[0]];
  const at = (u, v) => [c[0] + d[0] * u + n[0] * v, c[1] + d[1] * u + n[1] * v];
  fill(rect(L.x - 12, 36, 24, 26), MIX.dark);                                                     // the clamp
  line([[L.x, 58], [L.x, 84]], MIX.dark, { w: 9, amt: 0.3, key: key + 'stem', knock: true });
  line([at(-10, -50), [L.x - 50, 84], [L.x + 50, 84], at(-10, 50)], MIX.dark, { w: 8, amt: 0.4, key: key + 'yoke', knock: true });
  fill(hand([at(-62, -30), at(40, -40), at(40, 40), at(-62, 30)], key + 'can', 0.8, 8), MIX.dark);   // the can
  specks(c[0] - 40, c[1] - 30, c[0] + 30, c[1] + 30, 14, key);
  fill(hand([at(40, -46), at(52, -46), at(52, 46), at(40, 46)], key + 'ring', 0.6, 8), { teal: 0.9, pink: 0.85, yellow: 0.9 });
  fill(ell(h.lens[0], h.lens[1], 12, 40, h.ang), on ? {} : { teal: 0.55, pink: 0.45, yellow: 0.45 });   // the lens: paper when lit
  line([at(-48, -18), at(18, -24)], {}, { w: 5, taper: 0.4, amt: 0.4, key: key + 'hl', knock: true });     // a paper glint on the can
}

// ---- the big screen: an olive-black bezel, a paper slide, a git graph between braces (drawn, not typed)
function t3screen() {
  const { x, y, w, h } = T3.scr, cu = TIMELINE.cues;
  for (const u of [x + 70, x + w - 70]) line([[u, 48], [u + 1, y + 4]], MIX.dark, { w: 4, amt: 0.4, key: 'cab' + u, knock: true });
  fill(hand(boxPts(x, y, w, h), 'bezel', 0.7), MIX.dark);
  specks(x, y, x + w, y + 16, 18, 'bezelT'); specks(x, y + h - 16, x + w, y + h, 18, 'bezelB');
  fill(rect(x + 16, y + 16, w - 32, h - 32), {});
  // braces
  const by0 = y + 52, by1 = y + h - 52, bm = (by0 + by1) / 2, bl = x + 52, br = x + w - 52;
  const brace = (s, x0) => t3cat(t3q([x0 + s * 20, by0], [x0, by0], [x0, by0 + 26]), [[x0, bm - 26]], t3q([x0, bm - 26], [x0, bm], [x0 - s * 20, bm]),
    t3q([x0 - s * 20, bm], [x0, bm], [x0, bm + 26]), [[x0, by1 - 26]], t3q([x0, by1 - 26], [x0, by1], [x0 + s * 20, by1]));
  line(brace(1, bl), MIX.dark, { w: 13, amt: 0.5, key: 'braceL', knock: true });
  line(brace(-1, br), MIX.dark, { w: 13, amt: 0.5, key: 'braceR', knock: true });
  // the graph: main (teal) and a branch (pink) that forks, takes two commits and merges back (coral)
  const gy = y + 196, by = y + 98;
  const C0 = [x + 104, gy], C1 = [x + 172, gy], B0 = [x + 228, by], B1 = [x + 290, by], MG = [x + 346, gy];
  const BR = t3cat(t3q(C1, [C1[0] + 20, by], B0), [B1], t3q(B1, [MG[0] - 20, by], MG));
  const fm = ev(cu.main, 0.5), fb = ev(cu.branch, 0.62);
  line([[x + 88, gy], [x + w - 86, gy]], MIX.teal, { w: 15, amt: 0.4, key: 'gmain', knock: true, frac: fm });
  line(BR, MIX.pink, { w: 15, amt: 0.4, key: 'gbr', knock: true, frac: fb });
  const commit = (p, r, tones, t) => { const s = popS(t); if (s <= 0) return; fill(circ(p[0], p[1], r * s), tones); fill(circ(p[0], p[1], r * 0.4 * s), {}); };
  commit(C0, 22, MIX.teal, cu.main);
  commit(C1, 22, MIX.teal, cu.main + E8);
  commit(B0, 22, MIX.pink, cu.branch + E8);
  commit(B1, 22, MIX.pink, cu.branch + BEAT);
  commit(MG, 30, MIX.coral, cu.merge);
}

// ---- the stage: wooden boards, a pool of light, the lip and the dark stage front
function t3stage() {
  const { y0, lip } = T3.floor;
  fill(rect(-80, y0, W + 160, lip - y0 + 4), { yellow: 0.9, pink: 0.36, teal: 0.04 });
  fill(rect(-80, y0 - 6, W + 160, 12), { teal: 0.6, pink: 1, yellow: 0.9 });                         // where the curtain meets the boards
  if (T3.lamps.some(t3on)) fill(hand(ellipsePts(T3.aim[0], 800, 260, 34, 0, 40), 'pool', 1.2), { yellow: 1, pink: 0.08 });
  const ym = (y0 + lip) / 2 + 6;   // two long boards, their joints staggered
  line([[-40, ym], [W + 40, ym + 2]], MIX.coral, { w: 3, amt: 0.8, key: 'board' });
  for (let x = 30, i = 0; x < W + 40; x += 260, i++) line([[x, y0 + 8], [x + 1, ym - 2]], MIX.coral, { w: 2.5, amt: 0.6, key: 'bjt' + i });
  for (let x = 160, i = 0; x < W + 40; x += 260, i++) line([[x, ym + 4], [x + 1, lip - 4]], MIX.coral, { w: 2.5, amt: 0.6, key: 'bjb' + i });
  fill(rect(-80, lip, W + 160, 16), MIX.dark);
  specks(0, lip, W, lip + 16, 50, 'lip');
  fill(rect(-80, lip + 16, W + 160, H), { teal: 0.62, pink: 0.95, yellow: 0.9 });
  specks(0, lip + 20, W, H, 60, 'front');
}
// ---- one row of empty seats in the foreground, seen from behind (no audience faces)
function t3seats() {
  const n = 6, w = 146, gap = 14, x0 = CX - (n * w + (n - 1) * gap) / 2;   // the row fits inside the margin
  for (let i = 0, x = x0; i < n; i++, x += w + gap) {
    fill(hand(rrectPts(x, T3.seatY, w, 240, 52, 8), 'seat' + i, 0.8, 8), { teal: 0.92, yellow: 0.42, pink: 0.08 });
    fill(hand(rrectPts(x + 14, T3.seatY + 14, w - 28, 240, 40, 8), 'seatin' + i, 0.6, 8), { teal: 1, yellow: 0.62, pink: 0.22 });
    line(arcPts(x + 52, T3.seatY + 52, 36, Math.PI * 1.06, Math.PI * 1.44, 8), {}, { w: 6, taper: 0.4, amt: 0.3, key: 'seath' + i, knock: true });
  }
}
// ---- the podium (in front of the hero) and its gooseneck microphone
function t3podium() {
  const { x0, x1, top, bot } = T3.pod, ins = 16;
  fill(hand([[x0, top], [x1, top], [x1 - ins, bot], [x0 + ins, bot]], 'podF', 0.8, 8), { teal: 0.82, yellow: 0.5 });
  fill(hand([[x1 - 50, top], [x1, top], [x1 - ins, bot], [x1 - ins - 44, bot]], 'podS', 0.6, 8), { teal: 1, yellow: 0.72, pink: 0.18 });
  fill(rect(x0 + 6, top + 34, x1 - x0 - 12, 22), { yellow: 1, pink: 0.1 });                        // a yellow band
  line([[x0 + 14, top + 12], [x0 + ins + 8, bot - 14]], {}, { w: 5, taper: 0.3, amt: 0.4, key: 'podhl', knock: true });
  fill(hand([[x0 - 16, top - 26], [x1 + 16, top - 26], [x1 + 24, top + 6], [x0 - 24, top + 6]], 'desk', 0.6, 8), MIX.dark);
  specks(x0, top - 24, x1, top + 4, 24, 'desk');
  fill(hand(boxPts(x0 + ins - 8, bot - 4, x1 - x0 - 2 * ins + 16, 20), 'plinth', 0.6), MIX.dark);
}
function t3mic() {
  const hr = T3.hero, base = [hr.x + 74, T3.pod.top - 24], head = [hr.x + 70, hr.y + 64];
  line(t3q(base, [hr.x + 98, hr.y + 108], head, 12), MIX.dark, { w: 8, amt: 0.3, key: 'neck', knock: true });
  const ang = Math.atan2(hr.y + 18 - head[1], hr.x - head[0]), ca = Math.cos(ang), sa = Math.sin(ang);
  fill(ell(head[0], head[1], 28, 20, ang), {});                                                     // a paper halo so the head reads on the hero
  fill(ell(head[0], head[1], 23, 15, ang), MIX.dark);
  for (const u of [-9, 1, 11]) line([[head[0] + u * ca + 12 * sa, head[1] + u * sa - 12 * ca], [head[0] + u * ca - 12 * sa, head[1] + u * sa + 12 * ca]], {}, { w: 2.5, amt: 0.2, key: 'grille' + u, knock: true });
}
// ---- a potted plant at the stage's left (life: the leaves sway)
function t3plant() {
  const px = 176, py = 836, sw = Math.sin(TT * 3) * 0.06;
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.3 + sw * (1 + Math.abs(i - 3) * 0.3), L = 170 - Math.abs(i - 3) * 22;
    fill(ell(px + Math.cos(a) * L * 0.5, py - 96 + Math.sin(a) * L * 0.5, L * 0.5, 22, a), i % 2 ? MIX.green : { teal: 0.75, yellow: 0.85 });
    line([[px + Math.cos(a) * 18, py - 96 + Math.sin(a) * 18], [px + Math.cos(a) * L * 0.8, py - 96 + Math.sin(a) * L * 0.8]], {}, { w: 3, taper: 0.4, amt: 0.3, key: 'vein' + i, knock: true });
  }
  fill(hand([[px - 64, py - 100], [px + 64, py - 100], [px + 48, py], [px - 48, py]], 'pot', 1), { teal: 0.92, yellow: 0.2, pink: 0.06 });
  line([[px - 64, py - 78], [px + 64, py - 78]], {}, { w: 5, amt: 0.6, key: 'potrim', knock: true });
}
// ---- dust motes drifting in the light (life)
function t3motes() {
  if (!T3.lamps.some(t3on)) return;
  for (let i = 0; i < 10; i++) {
    const R = RNG('mote', i), u = (R.f() + TT * 0.06 * (0.5 + R.f())) % 1, y = lerp(250, 700, u), x = lerp(850, 790, u) + R.r(-1, 1) * lerp(40, 150, u) + Math.sin(TT * 2 + i) * 8;
    fill(circ(x, y, R.r(2.5, 4.5)), {});
  }
}

// ---- the scene
function sceneTile() {
  const cu = TIMELINE.cues, hr = T3.hero;
  beginSheet();
  printed(PITCH.field, { full: true }, t3field);
  printed(PITCH.world, { shapes: true }, () => {
    line([[-40, 46], [W + 40, 49]], MIX.dark, { w: 10, amt: 0.6, key: 'batten', knock: true });
    t3screen();
    T3.lamps.forEach((L, i) => t3lamp(L, 'lamp' + i));
    t3stage();
    t3plant();
    t3motes();
    // the hero: talks to the room, then points across at the screen as the branch merges
    const point = springMove(cu.point, 0.5, 2.05, SPRING.playful);
    const talk = TT < 2.0 && (B % 4) < 2;
    risoHero(hr.x, hr.y, hr.r, {
      key: 'hero', mood: talk ? 'wow' : 'happy', look: TT < cu.point ? [0.1, 0.35] : [-0.7, -0.2],
      arms: [point, 0.5], shadow: false,
    });
    // behind a podium the belly tint would sit just above the desk and read as a second mouth: print it over in body ink
    // (the kit's belly ellipse plus a hair), then reprint the kit's own smile on top of it
    const by = hr.y + Math.sin(TT * TAU * 0.9 + 'hero'.length) * hr.r * 0.035;
    fill(ell(hr.x, by + hr.r * 0.42, hr.r * 0.44 + 3, hr.r * 0.36 + 3), HERO_TONES);
    if (!talk) line(arcPts(hr.x, by + hr.r * 0.08 - hr.r * 0.1, hr.r * 0.16, Math.PI * 0.15, Math.PI * 0.85, 10), {}, { w: hr.r * 0.05, amt: 0.3, key: 'herom', knock: true });
    else { fill(ell(hr.x, by + hr.r * 0.12, hr.r * 0.08, hr.r * 0.1), {}); fill(ell(hr.x, by + hr.r * 0.15, hr.r * 0.05, hr.r * 0.05), { pink: 1 }); }
    t3podium();
    t3mic();
    t3seats();
  });
  endSheet();
  t3Tag('Vienna 2024');
  t3Caption('Open Source Summit Europe');
}

// ---- the tag and the caption, placed for 1080x1080 inside the 60px margin
function t3Tag(str) {
  const size = 76, w = typeW(str, size) + size * 0.9, h = size * 1.5;
  const rot = -0.03, tip = (w / 2) * Math.abs(rot);   // the tilt lifts the right end by tip: keep it inside the margin
  defer(() => printTag(str, 70 + w / 2, 64 + tip + h / 2, size, { s: popS(E0 + 0.2), rot }));
}
function t3Caption(str) {   // a paper card on the stage front, between the lip and the seats
  let size = 50; while (size > 44 && typeW(str, size) + size > W - 2 * 76) size--;
  defer(() => printCard(str, CX, (T3.floor.lip + 16 + T3.seatY) / 2, size, { s: popS(E0 + 0.3), frac: ev(E0 + 0.45, 0.6) }));
}
