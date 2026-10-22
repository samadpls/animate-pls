// =====================================================================
//  SCENES — 06-pixel (GraphNeT). One era, drawn inside lowres(ERA_RES[0]) in low-res PIXELS (180x180), PAL16, TT on 2s.
//  Layout for 1:1 (the style's own tag/caption positions are for 9:16): everything that matters sits inside
//  pixels 10..170 on both axes (60 screen px).
// =====================================================================
const P6 = PAL16;
const t6Beat = () => Math.floor(TT / BEAT + 1e-6);
const T6_GY = 62;                                         // the snow surface (top row of the snow)
const T6_STR = [18, 42, 66, 90, 114, 138, 162];           // string x: 24 apart, so graph edges step cleanly (1:3, flat, upright)
const T6_DOM = [86, 94, 102, 110, 118, 126, 134, 142, 150];   // sensor y on every string, 8 apart
const T6_TR = { y0: 66, x1: 184, t0: 0.5, t1: 1.3 };      // the track: in at the left edge (y 66), out past the right edge, slope 1:2
const t6TrackY = (x) => T6_TR.y0 + x / 2;
const T6_WARM = [P6.red, P6.orange, P6.yellow, P6.white];    // hit time, early -> late
const T6_HALO = [P6.purple, P6.red, P6.orange, P6.yellow];   // each core's dimmer halo
const T6_HERO = { x: 150, r: 10 };

// the hits: every sensor within ~9.5 px of the track, with its closeness q (0..1), its time along the track u,
// its colour band k and the moment it lights (th)
const T6_HITS = (() => {
  const out = [];
  T6_STR.forEach((sx, i) => T6_DOM.forEach((sy, j) => {
    const d = Math.abs(sy - t6TrackY(sx)) * 2 / Math.sqrt(5);
    if (d > 11) return;
    const u = clamp((2 * sx + sy - T6_TR.y0) * 2 / 5 / T6_TR.x1);
    out.push({ x: sx, y: sy, i, j, d, q: 1 - d / 11, u, k: Math.min(3, Math.floor(u * 4)), th: T6_TR.t0 + (T6_TR.t1 - T6_TR.t0) * u + d * 0.006 });
  }));
  return out;
})();
// the graph: neighbours on the same string, and each hit to its nearest hit on the next string;
// drawn in the order the hits came
const T6_EDGES = (() => {
  const E = new Map(), add = (a, b) => E.set(Math.min(a, b) + '-' + Math.max(a, b), [Math.min(a, b), Math.max(a, b)]);
  T6_HITS.forEach((a, ia) => {
    T6_HITS.forEach((b, ib) => { if (a.i === b.i && b.j === a.j + 1) add(ia, ib); });
    let best = -1, bd = 1e9;
    T6_HITS.forEach((b, ib) => { if (b.i === a.i + 1 && Math.abs(b.y - a.y) <= 8 && Math.abs(b.y - a.y) < bd) { bd = Math.abs(b.y - a.y); best = ib; } });
    if (best >= 0) add(ia, best);
  });
  const L = [...E.values()];
  const tOf = (e) => Math.max(T6_HITS[e[0]].th, T6_HITS[e[1]].th);
  return L.sort((p, q) => tOf(p) - tOf(q));
})();

// ---- helpers (pixel coords)
function t6LinePts(x0, y0, x1, y1) {   // Bresenham, as a list of pixels (so a line can grow pixel by pixel)
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const P = [], dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let e = dx + dy;
  for (let n = 0; n < 4096; n++) {
    P.push([x0, y0]);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * e;
    if (e2 >= dy) { e += dy; x0 += sx; }
    if (e2 <= dx) { e += dx; y0 += sy; }
  }
  return P;
}
function t6Line(x0, y0, x1, y1, c, frac = 1, every = 1, phase = 0) {
  const P = t6LinePts(x0, y0, x1, y1), n = Math.ceil(P.length * clamp(frac) - 1e-9);
  ctx.fillStyle = c;
  for (let k = 0; k < n; k++) if ((k + phase) % every === 0) cellR(P[k][0], P[k][1], 1, 1);
}
// big HUD text straight from FONT5, one colour per glyph row (a two-tone arcade title)
function t6Glyphs(str, x, y, sc, colOf) {
  const s = String(str).toUpperCase();
  for (let k = 0; k < s.length; k++) {
    const gl = FONT5[s[k]] || FONT5[' '];
    for (let r = 0; r < 7; r++) for (let b = 0; b < 5; b++) if (gl[r] & (16 >> b)) prect(x + k * 6 * sc + b * sc, y + r * sc, sc, sc, colOf(r));
  }
}
function t6Title(str, x, y, at) {   // pops in at double size for one boil, then sits at scale 2
  if (TT < at) return;
  const sc = TT < at + 0.08 ? 3 : 2;
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) t6Glyphs(str, x + dx, y + dy, sc, () => P6.ink);   // outline
  for (const o of [1, 2]) t6Glyphs(str, x + o, y + o, sc, () => P6.purple);           // a 2-pixel extrusion down-right
  t6Glyphs(str, x, y, sc, (r) => (r < 1 ? P6.white : r < 4 ? P6.yellow : P6.orange));
}
function t6Caption(str, y0, at, dur) {   // a pixel panel at the bottom that types itself on, centred on the frame
  if (TT < at) return;
  const tw = pixTextW(str), bw = tw + 6, bh = 13, x0 = Math.round(90 - bw / 2);
  pixBox(x0, y0, bw, bh, { bg: P6.ink, edge: P6.white });
  const n = Math.floor(ev(at, dur) * str.length + 1e-6);
  pixText(str, x0 + 3, y0 + 3, P6.white, { count: n, cursor: true });
}
function t6Meter(x, y, n = 16) {   // a HUD bar under the title: the event's clock, filling as the track runs, in the hits' time colours
  pixBox(x, y, n * 6 + 3, 7, { bg: P6.ink, edge: P6.slate });
  for (let k = 0; k < n; k++) {
    const on = TT >= T6_TR.t0 + (T6_TR.t1 - T6_TR.t0) * (k + 0.5) / n;
    prect(x + 2 + k * 6, y + 2, 5, 3, on ? T6_WARM[Math.floor(k * 4 / n)] : P6.night);
  }
}
const t6SnowTop = (x) => (Math.abs(x - T6_HERO.x) < 10 ? T6_GY : T6_GY + Math.round(1.3 * Math.sin(x * 0.13 + 0.6) + 0.9 * Math.sin(x * 0.37 + 2.0)));
function t6Dom(x, y) {   // an unlit sensor: a 5 px ball, ink rim, slate body, one grey glint
  pcircle(x, y, 2, P6.ink);
  prect(x - 1, y - 1, 3, 3, P6.slate);
  pset(x - 1, y - 1, P6.grey);
}

function sceneTile() {
  const cu = TIMELINE.cues, GY = T6_GY;
  lowres(ERA_RES[0], () => {
    // ---- the polar night: dithered sky, blinking stars, falling snow
    pgrad(0, 0, 180, GY + 4, [P6.ink, P6.ink, P6.night, P6.night, P6.purple], { ease: (u) => u ** 1.3 });
    for (let i = 0; i < 40; i++) {
      const R = RNG('t6st', i), x = R.i(2, 177), y = R.i(2, 54);
      if ((x > 7 && x < 112 && y > 6 && y < 39) || (x > 138 && x < 164 && y > 16 && y < 44) || (B + i * 5) % 13 === 0) continue;
      if (i % 7 === 0 && (B + i) % 6 < 3) sprite(SPR.twinkle, { a: P6.sky, b: P6.white }, x - 1, y - 1);
      else pset(x, y, i % 3 ? P6.grey : P6.white);
    }
    for (let i = 0; i < 12; i++) {   // snowflakes: one loop = one fall through the sky band
      const R = RNG('t6fl', i), x0 = R.i(0, 179), y0 = R.i(0, 59);
      const y = mod(y0 + Math.floor(TT / DURATION * 60 + 1e-6), 60), x = mod(x0 + Math.round(1.5 * Math.sin(y * 0.2 + i)), 180);
      if ((x > 7 && x < 112 && y > 6 && y < 39) || y > GY - 3) continue;
      pset(x, y, i % 3 ? P6.white : P6.ice);
    }
    // ---- the ice: firn under the snow, then deep dark ice
    pgrad(0, GY + 2, 180, 14, [P6.ice, P6.sky, P6.blue]);
    pgrad(0, GY + 16, 180, 180 - GY - 16, [P6.blue, P6.night, P6.night, P6.ink, P6.ink], { ease: (u) => u ** 0.7 });
    // ---- the snow: drifts with shaded lee sides, a soft bottom edge, glints that blink
    for (let x = 0; x < 180; x++) {
      const tp = t6SnowTop(x);
      prect(x, tp, 1, GY + 5 - tp, P6.white);
      if (t6SnowTop(x + 1) > tp || t6SnowTop(x - 1) > tp) pset(x, tp + 1, P6.ice);
    }
    pdither(0, GY + 5, 180, 4, null, P6.white, (i, j) => 1 - (j - GY - 5) / 4);
    for (let i = 0; i < 9; i++) {
      const R = RNG('t6gl', i), x = R.i(3, 176);
      if ((B + i * 3) % 7 < 3) pset(x, t6SnowTop(x) + 2 + (i % 2), P6.sky);
    }
    // ---- strings: a cable from the surface down, sensors on the deep part
    for (const sx of T6_STR) { prect(sx, GY + 5, 1, 180 - GY - 5, P6.slate); prect(sx - 1, t6SnowTop(sx) - 1, 3, 1, P6.grey); prect(sx, t6SnowTop(sx) - 2, 1, 1, P6.grey); }
    const lit = T6_HITS.filter((h) => TT >= h.th);
    for (const sx of T6_STR) for (const sy of T6_DOM) if (!lit.some((h) => h.x === sx && h.y === sy)) t6Dom(sx, sy);
    // halos first, so the graph edges and the track draw over them
    for (const h of lit) {
      const flash = TT < h.th + 0.17, rc = h.q > 0.55 ? 3 : 2, r1 = rc + 2 + (h.q > 0.6 ? 0.8 : 0) + ((t6Beat() + h.i + h.j) % 2) * 0.8 + (flash ? 3 : 0);
      pglow(h.x, h.y, rc + 0.5, r1, T6_HALO[h.k], flash ? 0.95 : 0.9);
    }
    // ---- the track: a white core with a blue under-glow, its head a sparkle
    const hx = 2 * Math.round(T6_TR.x1 / 2 * seg(TT, T6_TR.t0, T6_TR.t1)), hy = t6TrackY(hx);
    if (TT >= T6_TR.t0) {
      t6Line(0, T6_TR.y0 - 1, hx, hy - 1, P6.blue, 1, 2);
      t6Line(0, T6_TR.y0 + 2, hx, hy + 2, P6.blue, 1, 2, 1);
      t6Line(0, T6_TR.y0 + 1, hx, hy + 1, P6.ice);
      t6Line(0, T6_TR.y0, hx, hy, P6.white);
    }
    // ---- the graph: thin edges join the lit sensors, one after another
    T6_EDGES.forEach(([ia, ib], n) => {
      const a = T6_HITS[ia], b = T6_HITS[ib], t0 = cu.graph + n * 0.035;
      if (TT < t0) return;
      t6Line(a.x, a.y, b.x, b.y, P6.sky, seg(TT, t0, t0 + 0.12));
    });
    // lit sensor cores on top
    for (const h of lit) {
      const flash = TT < h.th + 0.17, rc = h.q > 0.55 ? 3 : 2;
      pcircle(h.x, h.y, rc, flash ? P6.white : T6_WARM[h.k]);
      if (!flash) { pset(h.x - 1, h.y - 1, P6.white); if (h.k < 3) pset(h.x, h.y - 1, h.k === 2 ? P6.white : T6_WARM[h.k + 1]); }
    }
    if (TT >= T6_TR.t0 && TT < T6_TR.t1) {   // the head, until it leaves the frame
      const big = B % 2 === 0;
      sprite(big ? SPR.spark : SPR.twinkle, { a: P6.white, b: P6.yellow }, hx - (big ? 2 : 1), hy - (big ? 2 : 1));
    }
    // ---- the hero on the snow: looks at the sky, spots the event ('!'), hops, watches it with wide eyes
    const { x: hX, r: hR } = T6_HERO, spotted = TT >= cu.spot;
    const hop = Math.round(3 * Math.sin(Math.PI * seg(TT, cu.spot, cu.spot + 1 / 6)));
    prect(hX - 7 + Math.floor(hop / 2), GY, 15 - hop, 1, P6.ice);   // its shadow on the snow
    const hh = pixHero(hX, GY - hR - 2, hR, { look: spotted ? [-1, 1] : [1, -1], hop, mood: spotted ? 'wow' : 'smile', key: 'hero' });
    if (spotted) pixBubble('!', hX - 1, hh.top - 1, { bg: P6.white, edge: P6.ink, fg: P6.red });
    // ---- HUD and caption (pixel-native, in this era's resolution)
    t6Title('GRAPHNET', 11, 11, cu.tag);
    if (TT >= cu.tag) t6Meter(10, 31);
    t6Caption('NEUTRINOS, FOUND BY A GNN', 156, cu.caption, 0.6);
  }, { fx: { pal: PAL16 } });
}
