// =====================================================================
//  styles/flat/kit.js — flat-vector science explainer: no outlines, warm mid-century flat colours on a deep ink-teal night,
//  one light from the top-left, so every object casts a long shadow down-right at 45 deg (the hull of the shape and
//  the shape moved along the shadow, filled with a fade), carries a shade crescent on its far side and a thin cream
//  rim light on its lit side; small tight glows on light sources only; round creatures with big eyes; stars and
//  motes drifting in parallax. Motion on 1s with eased moves and springs. Built on kit/core.js (RNG, EZ, SPRING,
//  springEase, ellipsePts, rrectPts, xform, bbox, subPath, pointAt, star4, toScreen, TT / F / E0 / DEFER / SPARK_AT,
//  LX / LY / UNIT / PORTRAIT). Studied from the flat-vector explainer genre (ideas only, no studio's characters).
//  Needs from the piece head: W, H, FPS, CX (caption centre x), SAFE. Optional: `const FL_NOGRAIN = true` (no grain).
//  Draw back to front: an object's long shadow falls on whatever was drawn before it.
// =====================================================================

// ---- palette: a flat night ground, warm mid-century poster colours; the hero's amber is reserved for the hero.
//  The ground is ink-teal, not black or blue-purple: cool enough that every warm colour (cream, amber, terracotta,
//  mustard) sits forward of it, light enough (L ~15%) that a long shadow reads as a darker band across it.
const FLP = {
  paper: '#0f2a2e',                  // the ground: a deep ink-teal night (flGround adds a barely-there second tone)
  ink: '#21180f',                    // eyes, mouths, type on cream plates: a warm near-black
  shadow: '#030b0c',                 // long shadows: alpha .5 at the object -> 0
  cream: '#f4e7cc',                  // rim light, captions, stars, the sun, neutral things
  amber: '#f29a35',                  // the hero (reserved)
  coral: '#dd6a4c',                  // terracotta
  teal: '#3f9c8e',
  sage: '#9cb48a',
  mustard: '#c9a640',                // muted, more yellow and less saturated than the hero's amber
  plate: '#1c4549',                  // caption plates: one step up from the ground
  star: '#f4e7cc',
};
// a geometric display face per OS: Futura (macOS), Century Gothic (Windows with Office) or Bahnschrift (Windows 10+),
// URW Gothic (Linux, the ghostscript fonts); every plate measures its text and fits it to a width
const FLFONT = '"Futura", "Century Gothic", "URW Gothic", "URW Gothic L", "Avant Garde", "Bahnschrift", "Trebuchet MS", sans-serif';
const FLSD = [Math.SQRT1_2, Math.SQRT1_2];   // the shadow direction: light from the top-left, shadows fall down-right

// ---------------------------------------------------------------------
//  colour: '#rrggbb' or 'rgb(r,g,b)' (the renderer's mid-morph blends) -> tones
// ---------------------------------------------------------------------
const FLRGB = new Map();
function flRGB(c) {
  let v = FLRGB.get(c); if (v) return v;
  v = c[0] === '#' ? [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) : (String(c).match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map(Number);
  if (FLRGB.size < 4000) FLRGB.set(c, v);
  return v;
}
const flMix = (a, b, u) => { const x = flRGB(a), y = flRGB(b); return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], clamp(u)))).join(',')})`; };
const flA = (c, a) => { const v = flRGB(c); return `rgba(${v[0]},${v[1]},${v[2]},${a})`; };
const flLight = (c, k = 1) => flMix(c, '#fffaf0', 0.2 * k);    // the lit tone (about +12% L)
const flShade = (c, k = 1) => flMix(c, '#10302f', 0.28 * k);   // the shade tone: toward the ink-teal night, never grey
const flLum = (c) => { const v = flRGB(c); return (0.299 * v[0] + 0.587 * v[1] + 0.114 * v[2]) / 255; };

// ---------------------------------------------------------------------
//  geometry: outlines are point lists (world coords); primitives return them
// ---------------------------------------------------------------------
function flPath(P, dx = 0, dy = 0, fresh = true) {
  if (fresh) ctx.beginPath();
  ctx.moveTo(P[0][0] + dx, P[0][1] + dy); for (let i = 1; i < P.length; i++) ctx.lineTo(P[i][0] + dx, P[i][1] + dy);
  ctx.closePath();
}
function flHull(P) {   // convex hull (monotone chain)
  const S = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of S) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = S.length - 1; i >= 0; i--) { const p = S[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
const flCircle = (x, y, r, n = 56) => ellipsePts(x, y, r, r, 0, n);
const flRRect = (x, y, w, h, r) => rrectPts(x, y, w, h, r ?? Math.min(w, h) * 0.25, 5);   // generous radii by default
const flCapsule = (x, y, w, h) => rrectPts(x, y, w, h, Math.min(w, h) / 2, 7);
function flCapsuleAB(a, b, w) {   // a stadium from point a to point b, w wide (arms, rays, levers)
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]), r = w / 2, P = [];
  for (let i = 0; i <= 8; i++) { const t = ang - Math.PI / 2 + Math.PI * i / 8; P.push([b[0] + Math.cos(t) * r, b[1] + Math.sin(t) * r]); }
  for (let i = 0; i <= 8; i++) { const t = ang + Math.PI / 2 + Math.PI * i / 8; P.push([a[0] + Math.cos(t) * r, a[1] + Math.sin(t) * r]); }
  return P;
}
function flBubblePts(x, y, w, h, o = {}) {   // a speech bubble: a rounded box with a tail under it (o.tail 'left' | 'right' | 'none')
  const n = 5, r = o.r ?? Math.min(w, h) * 0.32, P = rrectPts(x, y, w, h, r, n);
  if (o.tail === 'none') return P;
  const right = o.tail === 'right', th = o.th ?? h * 0.34;
  const a = right ? x + w * 0.76 : x + w * 0.44, b = right ? x + w * 0.56 : x + w * 0.24, tip = right ? [x + w * 0.86, y + h + th] : [x + w * 0.14, y + h + th];
  P.splice(2 * (n + 1), 0, [a, y + h], tip, [b, y + h]);   // the bottom edge runs right to left between the 2nd and 3rd corner
  return P;
}
function flGearPts(x, y, r, n = 8, rot = 0) {
  const P = [], ri = r * 0.78, h = TAU / n;
  for (let i = 0; i < n; i++) for (const [rr, da] of [[ri, -0.5], [ri, -0.27], [r, -0.17], [r, 0], [r, 0.17], [ri, 0.27]]) {
    const a = rot + (i + da) * h; P.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
  }
  return P;
}
function flArrowPts(x, y, s, ang = 0) {   // a fat arrow glyph centred on (x, y), s long, pointing along ang
  const P = [[-0.5, -0.14], [0.06, -0.14], [0.06, -0.38], [0.5, 0], [0.06, 0.38], [0.06, 0.14], [-0.5, 0.14]];
  return xform(P.map(([u, v]) => [u * s, v * s]), x, y, ang);
}
function flCloudPts(x, y, w, h, key = 'cl') {   // a flat cloud: bumps on top (a union of circles) over a capsule base
  const R = RNG('flcloud', key), C3 = [], rb = h * 0.25, yb = y + h * 0.75, P = [], Q = [];
  for (let i = 0; i < 4; i++) { const u = (i + 0.5) / 4, r = h * R.r(0.42, 0.62) * (1 - Math.abs(u - 0.5) * 0.7); C3.push([x + rb + u * (w - 2 * rb), y + h * 0.62 - r * 0.45, r]); }
  for (let k = 0; k <= 48; k++) {
    const px = x + w * k / 48, e = Math.max(0, rb - Math.min(px - x, x + w - px)), half = Math.sqrt(Math.max(0, rb * rb - e * e));
    let top = yb - half;
    for (const [cx, cy, r] of C3) { const d = px - cx; if (Math.abs(d) < r) top = Math.min(top, cy - Math.sqrt(r * r - d * d)); }
    P.push([px, top]); Q.push([px, yb + half]);
  }
  return P.concat(Q.reverse());
}

// ---------------------------------------------------------------------
//  the medium: long shadow, glow, the flat solid (fill, shade crescent, rim light)
// ---------------------------------------------------------------------
// the long shadow: hull of P and P moved len along the shadow direction, fading from alpha a at the shape to 0
function flLongShadow(P, len, o = {}) {
  if (!(len > 0) || P.length < 2) return;
  const L0 = FLSD[0] * len, L1 = FLSD[1] * len, Hl = flHull(P.concat(P.map(([x, y]) => [x + L0, y + L1])));
  let far = -1e9, cx = 0, cy = 0;
  for (const p of P) { const d = p[0] * FLSD[0] + p[1] * FLSD[1]; if (d > far) far = d; cx += p[0] / P.length; cy += p[1] / P.length; }
  const near = far - (cx * FLSD[0] + cy * FLSD[1]), tot = near + len, a = o.a ?? 0.45, sc = o.c ?? FLP.shadow;
  const g = ctx.createLinearGradient(cx, cy, cx + FLSD[0] * tot, cy + FLSD[1] * tot);
  g.addColorStop(0, flA(sc, a)); g.addColorStop(clamp(near / tot, 0, 0.98), flA(sc, a * 0.85)); g.addColorStop(1, flA(sc, 0));
  ctx.fillStyle = g; flPath(Hl); ctx.fill();
}
// a small tight glow around a light source (a bulb, a photon, a lamp, the sun): a radial gradient added with 'lighter'.
// Keep r within ~1.5x the source; never a big bloom over the scene, never shadowBlur
function flGlow(x, y, r, c, a = 0.35) {
  if (!(r > 0) || a <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, flA(c, a)); g.addColorStop(0.3, flA(c, a * 0.4)); g.addColorStop(0.65, flA(c, a * 0.08)); g.addColorStop(1, flA(c, 0));
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r); ctx.restore();
}
// THE primitive. P outline, c fill. o: { shadow: length (default 2.2x the half size; false = none), sa (its alpha),
//   glow: true | k (radius in half sizes), glowC, ga, shade: 0..0.5 (crescent depth, default .16), shadeC,
//   rim: px (default 4.5% of the half size), rimC, ra (its alpha), inner(): drawn inside the clip before shade and rim }
function flSolid(P, c, o = {}) {
  const bb = bbox(P), s = Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0) / 2, x = (bb.x0 + bb.x1) / 2, y = (bb.y0 + bb.y1) / 2;
  if (o.shadow !== false && o.shadow !== 0) flLongShadow(P, o.shadow ?? s * 2.2, { a: o.sa });
  if (o.glow) flGlow(x, y, s * (o.glow === true ? 1.45 : o.glow), o.glowC ?? c, o.ga ?? 0.3);
  ctx.fillStyle = c; flPath(P); ctx.fill();
  const sh = o.shade ?? 0.16, rim = o.rim ?? Math.max(2.5, s * 0.045);
  if (sh > 0 || rim > 0 || o.inner) {
    ctx.save(); flPath(P); ctx.clip();
    if (o.inner) o.inner(x, y, s);
    if (sh > 0) { const d = s * 2 * sh; ctx.fillStyle = o.shadeC ?? flShade(c); flPath(P); flPath(P, -FLSD[0] * d, -FLSD[1] * d, false); ctx.fill('evenodd'); }
    if (rim > 0) { ctx.fillStyle = flA(o.rimC ?? FLP.cream, o.ra ?? 0.55); flPath(P); flPath(P, FLSD[0] * rim, FLSD[1] * rim, false); ctx.fill('evenodd'); }
    ctx.restore();
  }
  return { x, y, s };
}
// a flat band along a polyline (a road, a beam, a pipe) with a short hard shadow; o: { w, c, shadow, cap }
function flBand(P, o = {}) {
  const w = o.w ?? 24, sh = o.shadow ?? w * 0.45;
  ctx.save(); ctx.lineCap = o.cap ?? 'round'; ctx.lineJoin = 'round';
  if (sh > 0) { ctx.beginPath(); P.forEach(([x, y], i) => (i ? ctx.lineTo(x + FLSD[0] * sh, y + FLSD[1] * sh) : ctx.moveTo(x + FLSD[0] * sh, y + FLSD[1] * sh))); ctx.strokeStyle = flA(FLP.shadow, o.sa ?? 0.38); ctx.lineWidth = w; ctx.stroke(); }
  ctx.beginPath(); P.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.strokeStyle = o.c ?? FLP.plate; ctx.lineWidth = w; ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------
//  the world: ground, stars, motes, hills, clouds, a sun, a planet, a comet
// ---------------------------------------------------------------------
// the ground: flat, with a barely-there second tone toward the bottom (screen space, so a camera move never shows its edge)
function flGround(c = FLP.paper) {
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, flMix(c, '#000000', 0.06)); g.addColorStop(1, flMix(c, '#ffffff', 0.025));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}
// twinkling stars that drift left in parallax (nearer = bigger = faster). o: { n, x0, y0, x1, y1, drift, c }
function flStars(key, o = {}) {
  const R = RNG('flstars', key), n = o.n ?? 90, x0 = o.x0 ?? 0, y0 = o.y0 ?? 0, x1 = o.x1 ?? W, y1 = o.y1 ?? H, drift = o.drift ?? 8;
  ctx.save();
  for (let i = 0; i < n; i++) {
    const x = R.r(x0, x1), y = R.r(y0, y1), s = R.r(1.3, 3.6) * UNIT, ph = R.r(0, TAU), sp = R.r(0.5, 1.6), big = R.f() < 0.1;
    const xx = x0 + mod(x - x0 - TT * drift * s / 3.6, x1 - x0), a = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(TT * TAU * sp * 0.5 + ph));
    ctx.globalAlpha = a;
    if (big) { flGlow(xx, y, s * 3.6, o.c ?? FLP.star, 0.3 * a); star4(xx, y, s * 3.4, o.c ?? FLP.star); }
    else { ctx.fillStyle = o.c ?? FLP.star; ctx.beginPath(); ctx.arc(xx, y, s * 0.7, 0, TAU); ctx.fill(); }
  }
  ctx.restore();
}
// soft motes (dust, bubbles, pollen) rising and swaying. o: { n, x0, y0, x1, y1, rise, c, size }
function flMotes(key, o = {}) {
  const R = RNG('flmotes', key), n = o.n ?? 24, x0 = o.x0 ?? 0, y0 = o.y0 ?? 0, x1 = o.x1 ?? W, y1 = o.y1 ?? H, rise = o.rise ?? 16;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const x = R.r(x0, x1), y = R.r(y0, y1), s = R.r(2, 6) * (o.size ?? 1) * UNIT, sp = R.r(0.5, 1.5), ph = R.r(0, TAU);
    const yy = y0 + mod(y - y0 - TT * rise * sp, y1 - y0), xx = x + Math.sin(TT * sp + ph) * 10 * UNIT;
    ctx.fillStyle = flA(o.c ?? FLP.cream, 0.12 + 0.1 * (0.5 + 0.5 * Math.sin(TT * 2 * sp + ph)));
    ctx.beginPath(); ctx.arc(xx, yy, s, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
// a band of rolling hills from base y0 down to y1 (a parallax layer: give each layer its own drift)
function flHills(y0, c, o = {}) {
  const amp = o.amp ?? 60, wl = o.wl ?? 560, dx = (o.drift ?? 0) * TT + (o.ph ?? 0), P = [];
  for (let x = -80; x <= W + 80; x += 16) { const u = (x + dx) / wl * TAU; P.push([x, y0 - amp * (0.5 + 0.32 * Math.sin(u) + 0.18 * Math.sin(u * 2.3 + 1.7))]); }
  P.push([W + 80, o.y1 ?? H + 80], [-80, o.y1 ?? H + 80]);
  flSolid(P, c, { shadow: false, shade: 0, rim: o.rim ?? 4 * UNIT, ra: o.ra ?? 0.16 });
}
const flCloud = (x, y, w, h, c, o = {}) => flSolid(flCloudPts(x, y, w, h, o.key), c, { shadow: o.shadow ?? h * 1.4, sa: o.sa ?? 0.3, shade: o.shade ?? 0.12, rim: o.rim ?? 3 * UNIT, ra: o.ra ?? 0.4 });
// a star / sun: the light source (no shadow of its own), turning rounded rays, a tight warm glow
function flSun(x, y, r, o = {}) {
  const c = o.c ?? FLP.cream, n = o.rays ?? 12, rot = TT * (o.spin ?? 0.12);
  flGlow(x, y, r * 1.6, o.glowC ?? '#f7c873', o.ga ?? 0.4);
  ctx.save(); ctx.fillStyle = flA(c, 0.42);
  for (let i = 0; i < n; i++) {
    const a = rot + i / n * TAU, r0 = r * 1.24, L = r * (i % 2 ? 0.3 : 0.52) * (1 + 0.08 * Math.sin(TT * 3 + i));
    flPath(flCapsuleAB([x + Math.cos(a) * r0, y + Math.sin(a) * r0], [x + Math.cos(a) * (r0 + L), y + Math.sin(a) * (r0 + L)], r * 0.17)); ctx.fill();
  }
  ctx.restore();
  flSolid(flCircle(x, y, r, 64), c, { shadow: false, shade: 0.12, shadeC: '#efcf8c', rim: r * 0.05, rimC: '#fffaf0', ra: 0.8 });
}
// a banded planet: bands slide inside it (idle life), an optional tilted ring in front and behind. o: { ring, tilt, bands, spin }
function flPlanet(x, y, r, c, o = {}) {
  const P = flCircle(x, y, r, 72), tilt = o.tilt ?? -0.32, ring = o.ring, rc = o.ringC ?? flLight(c, 1.6);
  const RO = ring ? ellipsePts(x, y, r * 1.8, r * 0.44, tilt, 72) : null, RI = ring ? ellipsePts(x, y, r * 1.36, r * 0.27, tilt, 72) : null;
  const half = (front) => {   // the ring's front or back half: clip to one side of its long axis
    const ca = Math.cos(tilt), sa = Math.sin(tilt), k = front ? 1 : -1, L = r * 3;
    ctx.save(); ctx.beginPath(); ctx.moveTo(x - ca * L, y - sa * L); ctx.lineTo(x + ca * L, y + sa * L);
    ctx.lineTo(x + ca * L - sa * L * k, y + sa * L + ca * L * k); ctx.lineTo(x - ca * L - sa * L * k, y - sa * L + ca * L * k); ctx.closePath(); ctx.clip();
    ctx.fillStyle = front ? rc : flShade(rc, 0.7); flPath(RO); flPath(RI.slice().reverse(), 0, 0, false); ctx.fill('evenodd'); ctx.restore();
  };
  if (o.shadow !== false) flLongShadow(ring ? P.concat(RO) : P, o.shadowLen ?? r * 2.4);
  if (ring) half(false);
  const nb = o.bands ?? 3, spin = o.spin ?? 14;
  flSolid(P, c, { shadow: false, shade: 0.2, rim: r * 0.045, inner: () => {
    for (let i = 0; i < nb; i++) {   // bands: capsules sliding across, wrapping
      const by = y - r * 0.55 + i * r * 0.5, bh = r * (0.13 + 0.05 * (i % 2)), Lb = r * (1.1 + 0.4 * (i % 2)), xo = mod(TT * spin * (1 + i * 0.4) + i * r * 0.9, r * 3.4) - r * 1.7;
      ctx.fillStyle = i % 2 ? flShade(c, 0.55) : flLight(c, 0.9);
      for (const k of [-1, 0, 1]) { flPath(flCapsule(x + xo + k * r * 3.4 - Lb / 2, by - bh / 2, Lb, bh)); ctx.fill(); }
    }
  } });
  if (ring) half(true);
}
// a comet: a glowing head and a tapered tail behind it (ang = its direction of travel)
function flComet(x, y, ang, len, c = FLP.cream) {
  const dx = Math.cos(ang), dy = Math.sin(ang), r = len * 0.05;
  const g = ctx.createLinearGradient(x, y, x - dx * len, y - dy * len); g.addColorStop(0, flA(c, 0.75)); g.addColorStop(1, flA(c, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - dy * r, y + dx * r); ctx.lineTo(x - dx * len, y - dy * len); ctx.lineTo(x + dy * r, y - dx * r); ctx.closePath(); ctx.fill();
  flGlow(x, y, r * 3, c, 0.45); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}

// ---------------------------------------------------------------------
//  icons: gear, document, arrow sign, arrow path, speech bubble
// ---------------------------------------------------------------------
function flGear(x, y, r, n, rot, c, o = {}) {
  const P = flGearPts(x, y, r, n, rot);
  flSolid(P, c, { shadow: o.shadow ?? r * 1.6, sa: o.sa, shade: o.shade ?? 0.14, rim: o.rim ?? r * 0.05 });
  flSolid(flCircle(x, y, r * 0.36, 32), o.hub ?? flShade(c, 1.4), { shadow: false, shade: 0, rim: 0 });
  flSolid(flCircle(x, y, r * 0.14, 20), flLight(c, 1.5), { shadow: false, shade: 0, rim: 0 });
}
// a page with a folded corner and text lines (o.lines, o.frac 0..1 how many are written, o.title, o.titleC)
function flDoc(x, y, w, h, c, o = {}) {
  const f = o.fold ?? w * 0.26, r = o.r ?? w * 0.08;
  const P = rrectPts(x, y, w, h, r, 4).filter(([px, py]) => !(px > x + w - f - 0.01 && py < y + f + 0.01));
  P.push([x + w - f, y], [x + w, y + f]);
  flSolid(P, c, { shadow: o.shadow, sa: o.sa, shade: o.shade ?? 0.1, rim: o.rim });
  ctx.fillStyle = flShade(c, 0.6); flPath([[x + w - f, y], [x + w, y + f], [x + w - f, y + f]]); ctx.fill();
  ctx.fillStyle = flLight(c, 1.4); flPath([[x + w - f, y], [x + w - f * 0.12, y + f * 0.88], [x + w - f, y + f]]); ctx.fill();
  const R = RNG('fldoc', o.key ?? 'doc'), n = o.lines ?? 4, top = o.title ? y + h * 0.42 : y + h * 0.3, lh = (y + h * 0.88 - top) / Math.max(1, n);
  if (o.title) { ctx.font = `700 ${o.titleSize ?? w * 0.15}px ${FLFONT}`; ctx.fillStyle = o.titleC ?? FLP.ink; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; ctx.fillText(o.title, x + w * 0.12, y + h * 0.27); }
  for (let i = 0; i < n; i++) {
    const L = w * 0.76 * (i === n - 1 ? 0.55 : R.r(0.7, 1)) * clamp((o.frac ?? 1) * n - i);
    if (L > 2) { ctx.fillStyle = flShade(c, 0.75); flPath(flCapsule(x + w * 0.12, top + i * lh, L, Math.min(lh * 0.42, w * 0.07))); ctx.fill(); }
  }
}
// a round sign with an arrow on it (a signal, a direction): ang = where the arrow points
function flSign(x, y, r, ang, c, o = {}) {
  flSolid(flCircle(x, y, r, 48), c, { shadow: o.shadow ?? r * 1.8, glow: o.glow ? 1.5 : 0, ga: o.ga ?? 0.4, shade: 0.16 });
  const A = flArrowPts(x, y, r * 1.15, ang);
  ctx.save(); ctx.fillStyle = o.arrowC ?? FLP.cream; ctx.strokeStyle = o.arrowC ?? FLP.cream; ctx.lineWidth = r * 0.12; ctx.lineJoin = 'round';
  flPath(A); ctx.fill(); ctx.stroke(); ctx.restore();
}
// an arrow path: a flat band with lighter dashes flowing along it and a rounded arrowhead at the end.
// o: { w, c, frac (draw-on 0..1), speed (dash flow px/s), head: false }
function flArrowPath(P, o = {}) {
  const w = o.w ?? 22 * UNIT, c = o.c ?? FLP.cream, S = o.frac != null ? subPath(P, o.frac) : P;
  if (S.length < 2 || pathLen(S) < 2) return;
  flBand(S, { w, c: flShade(c, 0.9), shadow: o.shadow ?? w * 0.5 });
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.setLineDash([w * 0.7, w * 1.1]); ctx.lineDashOffset = -TT * (o.speed ?? 90);
  ctx.beginPath(); S.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.strokeStyle = flLight(c, 1.2); ctx.lineWidth = w * 0.38; ctx.stroke();
  ctx.restore();
  if (o.head !== false) {
    const a = S[S.length - 1], b = S[Math.max(0, S.length - 4)], ang = Math.atan2(a[1] - b[1], a[0] - b[0]);
    const T3 = xform([[w * 0.9, 0], [-w * 0.6, -w * 1.05], [-w * 0.6, w * 1.05]], a[0], a[1], ang);
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineWidth = w * 0.35;
    ctx.fillStyle = flA(FLP.shadow, 0.38); ctx.strokeStyle = ctx.fillStyle; flPath(T3, FLSD[0] * w * 0.5, FLSD[1] * w * 0.5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = c; ctx.strokeStyle = c; flPath(T3); ctx.fill(); ctx.stroke(); ctx.restore();
  }
}
// a speech bubble with three dots (o.dots) or text lines (o.lines); returns its outline
function flBubble(x, y, w, h, c, o = {}) {
  const P = flBubblePts(x, y, w, h, o);
  flSolid(P, c, { shadow: o.shadow, sa: o.sa, shade: o.shade ?? 0.14, rim: o.rim, glow: o.glow, ga: o.ga });
  const ic = o.dotC ?? (flLum(c) > 0.7 ? flShade(c, 1.6) : FLP.cream);
  ctx.fillStyle = ic;
  if (o.lines) for (let i = 0; i < o.lines; i++) { flPath(flCapsule(x + w * 0.16, y + h * (0.26 + i * 0.26), w * (i === o.lines - 1 ? 0.42 : 0.68), h * 0.13)); ctx.fill(); }
  else for (let i = 0; i < 3; i++) { const k = o.wave ? 1 + 0.25 * Math.sin(TT * 7 - i * 0.9) : 1; ctx.beginPath(); ctx.arc(x + w * (0.3 + i * 0.2), y + h * 0.5, h * 0.09 * k, 0, TAU); ctx.fill(); }
  return P;
}

// ---------------------------------------------------------------------
//  the hero: a round amber creature with big eyes, a glowing antenna bulb, stubby feet and arms.
//  flHero(x, y, r, { mood: 'happy' | 'wow' | 'focus' | 'wink' | 'sleepy', look: [-1..1, -1..1], hands: [[x, y], ...],
//    squash: -1..1, key, glow (off: the hero is not a light source; its antenna bulb is), shadow }). r = the body's radius. Sets SPARK_AT.
// ---------------------------------------------------------------------
function flHero(x, y, r, o = {}) {
  const key = o.key ?? 'hero', ph = (hash(key) % 997) / 997 * TAU, c = o.c ?? FLP.amber, mood = o.mood ?? 'happy';
  const by = y + (o.bob === false ? 0 : Math.sin(TT * TAU * 0.6 + ph) * r * 0.05), sq = clamp(o.squash ?? 0, -1, 1);
  const rx = r * (1 + sq * 0.12), ry = r * (1 - sq * 0.12), body = ellipsePts(x, by, rx, ry, 0, 56);
  const feet = o.feet === false ? [] : [-1, 1].map((s) => flCapsule(x + s * r * 0.38 - r * 0.18, y + ry * 0.8, r * 0.36, r * 0.26));
  const sway = Math.sin(TT * TAU * 0.45 + ph) * r * 0.08, stalk0 = [x + r * 0.12, by - ry * 0.9], tip = [x + r * 0.3 + sway, by - ry * 1.42];
  if (o.shadow !== false) flLongShadow(body.concat(...feet, flCircle(tip[0], tip[1], r * 0.14, 12)), o.shadowLen ?? r * 2.4);
  if (o.glow) flGlow(x, by, r * 1.4, c, 0.25);
  for (const P of feet) { ctx.fillStyle = flShade(c, 1.2); flPath(P); ctx.fill(); }
  ctx.fillStyle = flShade(c, 0.8); flPath(flCapsuleAB(stalk0, tip, r * 0.09)); ctx.fill();
  flGlow(tip[0], tip[1], r * 0.42, FLP.cream, 0.5 + 0.15 * Math.sin(TT * 5 + ph));
  ctx.fillStyle = FLP.cream; ctx.beginPath(); ctx.arc(tip[0], tip[1], r * 0.13, 0, TAU); ctx.fill();
  flSolid(body, c, { shadow: false, shade: 0.17, rim: r * 0.06, ra: 0.6 });
  // arms: stubby capsules from the nearer shoulder to each hand, a round hand on the end
  for (const hp of o.hands ?? []) {
    const s = hp[0] >= x ? 1 : -1, sh = [x + s * rx * 0.72, by + ry * 0.18];
    ctx.fillStyle = flShade(c, 0.35); flPath(flCapsuleAB(sh, hp, r * 0.2)); ctx.fill();
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(hp[0], hp[1], r * 0.14, 0, TAU); ctx.fill();
  }
  // the face
  const lx = clamp(o.look?.[0] ?? 0, -1, 1), ly = clamp(o.look?.[1] ?? 0, -1, 1), er = r * 0.25, ey = by - r * 0.12 + ly * r * 0.04;
  const blink = o.blink || mod(F + (hash(key) % 61), 76) < 3;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const s of [-1, 1]) {
    const ex = x + s * r * 0.34 + lx * r * 0.07;
    const closed = blink || mood === 'sleepy' || (mood === 'wink' && s === 1);
    if (closed) {   // a closed eye: a happy arc (wink, sleepy) or a flat line (blink)
      ctx.strokeStyle = FLP.ink; ctx.lineWidth = r * 0.07; ctx.beginPath();
      if (mood === 'wink' || mood === 'sleepy') ctx.arc(ex, ey + er * 0.3, er * 0.62, Math.PI * 1.15, Math.PI * 1.85); else { ctx.moveTo(ex - er * 0.7, ey); ctx.lineTo(ex + er * 0.7, ey); }
      ctx.stroke(); continue;
    }
    ctx.fillStyle = '#fffaf0'; ctx.beginPath(); ctx.ellipse(ex, ey, er, er * 1.1, 0, 0, TAU); ctx.fill();
    const pr = er * (mood === 'wow' ? 0.44 : 0.56), px = ex + lx * er * 0.36, py = ey + ly * er * 0.36 + (mood === 'focus' ? er * 0.12 : 0);
    ctx.fillStyle = FLP.ink; ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fffaf0'; ctx.beginPath(); ctx.arc(px - pr * 0.36, py - pr * 0.4, pr * 0.32, 0, TAU); ctx.fill();
    if (mood === 'focus') {   // brows tilted in: concentrating; and the upper lid lowered
      ctx.fillStyle = c; ctx.fillRect(ex - er * 1.2, ey - er * 1.25, er * 2.4, er * 0.62);
      ctx.fillStyle = flShade(c, 1.5); flPath(flCapsuleAB([ex - s * er * 0.75, ey - er * 0.78], [ex + s * er * 0.95, ey - er * 1.12], r * 0.075)); ctx.fill();
    }
  }
  ctx.fillStyle = flA(FLP.coral, 0.5);   // cheeks
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + s * r * 0.6 + lx * r * 0.05, by + r * 0.2, r * 0.12, r * 0.075, 0, 0, TAU); ctx.fill(); }
  const mx = x + lx * r * 0.08, my = by + r * 0.3;
  ctx.fillStyle = FLP.ink; ctx.strokeStyle = FLP.ink; ctx.lineWidth = r * 0.065;
  if (mood === 'wow') { ctx.beginPath(); ctx.ellipse(mx, my + r * 0.03, r * 0.1, r * 0.13, 0, 0, TAU); ctx.fill(); }
  else if (mood === 'focus') { flPath(flCapsule(mx - r * 0.11, my, r * 0.22, r * 0.065)); ctx.fill(); }
  else if (mood === 'sleepy') { ctx.beginPath(); ctx.arc(mx, my - r * 0.04, r * 0.1, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke(); }
  else {   // happy / wink: an open smile with a coral tongue
    const mw = r * (mood === 'wink' ? 0.16 : 0.2);
    ctx.beginPath(); ctx.ellipse(mx, my - r * 0.03, mw, mw * 0.95, 0, 0, Math.PI); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.clip(); ctx.fillStyle = FLP.coral; ctx.beginPath(); ctx.ellipse(mx, my + mw * 0.85, mw * 0.62, mw * 0.45, 0, 0, TAU); ctx.fill(); ctx.restore();
  }
  ctx.restore();
  SPARK_AT = toScreen(x, by);
  return { x, y: by, r, tip };
}

// ---------------------------------------------------------------------
//  text: a soft label plate (a pill with its own long shadow), tags and captions through DEFER
// ---------------------------------------------------------------------
// a plate centred on (x, y) (align 'left' puts its left edge at x). o: { k (pop scale), fill, color, dot, weight, align, shadow,
//   maxW: the plate's widest (the type shrinks to fit: display faces differ in width from OS to OS) }
function flPlateNow(str, x, y, size, o = {}) {
  ctx.save();
  ctx.font = `${o.weight ?? 700} ${size}px ${FLFONT}`;
  let tw = ctx.measureText(str).width;
  if (o.maxW) { const full = tw + size * 1.2 + (o.dot ? size * 0.78 : 0); if (full > o.maxW) { size *= o.maxW / full; ctx.font = `${o.weight ?? 700} ${size}px ${FLFONT}`; tw = ctx.measureText(str).width; } }
  const pad = size * 0.6, dw = o.dot ? size * 0.78 : 0, h = (o.h ?? size * 1.6), w = tw + pad * 2 + dw;
  const al = o.align ?? 'center', x0 = al === 'center' ? x - w / 2 : al === 'right' ? x - w : x, k = o.k ?? 1;
  ctx.translate(x0 + w / 2, y); ctx.scale(k, k); ctx.translate(-(x0 + w / 2), -y);
  flSolid(flRRect(x0, y - h / 2, w, h, h / 2), o.fill ?? FLP.plate, { shadow: o.shadow ?? h * 1.1, sa: 0.45, shade: o.shade ?? 0, rim: 3 * UNIT, ra: 0.3 });
  if (o.dot) flSolid(flCircle(x0 + pad * 0.8 + size * 0.2, y, size * 0.22, 24), o.dot, { shadow: false, shade: 0.18, rim: 2 });
  ctx.fillStyle = o.color ?? FLP.cream; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(str, x0 + pad + dw, y + size * 0.06);
  ctx.restore();
  return { x0, y0: y - h / 2, w, h, size };
}
// a label set in the display face and shrunk to fit maxW; returns the size used
function flFitText(str, x, y, size, maxW, o = {}) {
  ctx.save(); ctx.font = `${o.weight ?? 700} ${size}px ${FLFONT}`;
  const w = ctx.measureText(str).width; if (w > maxW) { size *= maxW / w; ctx.font = `${o.weight ?? 700} ${size}px ${FLFONT}`; }
  ctx.fillStyle = o.color ?? FLP.cream; ctx.textAlign = o.align ?? 'left'; ctx.textBaseline = o.baseline ?? 'middle';
  ctx.fillText(str, x, y); ctx.restore(); return size;
}
// captions fade out as a morph bridge starts closing the era (the renderer keeps DEFER text at screen size)
function flBridgeFade() {
  if (typeof BRIDGES === 'undefined') return 1;
  let a = 1;
  for (const b of BRIDGES) { const d = b.d ?? 0.6; if (TT < b.tc + 0.01 && TT > b.tc - d - 0.4) a = Math.min(a, 1 - seg(TT, b.tc - d - 0.2, b.tc - d + 0.12)); }
  return a;
}
const flCapY = () => (PORTRAIT ? Math.min(1180, H - SAFE.bottom - 300) : H - SAFE.bottom - 66 * UNIT);
function flCaption(str, o = {}) {
  const f = () => {
    const t0 = E0 + (o.at ?? 0.45), k = springEase(TT - t0, SPRING.playful.k, 18), a = clamp((TT - t0) / 0.15) * flBridgeFade();
    if (k <= 0.001 || a <= 0.01) return;
    ctx.save(); ctx.globalAlpha = a;
    flPlateNow(str, o.x ?? CX, o.y ?? flCapY(), o.size ?? 50 * UNIT, { k: 0.8 + 0.2 * k, fill: o.fill, color: o.color, dot: o.dot, weight: o.weight, shadow: o.shadow, maxW: o.maxW ?? (PORTRAIT ? 2 * (780 - (o.x ?? CX)) : W - 2 * 70 * UNIT) });
    ctx.restore();
  };
  if (DEFER) DEFER.push(f); else f();
}
// the tag: a cream pill with ink type and a hue dot, top left, sliding in on a spring
function flTag(str, o = {}) {
  const f = () => {
    const t0 = E0 + (o.at ?? 0.12), k = springEase(TT - t0, 260, 20), a = clamp((TT - t0) / 0.12) * flBridgeFade();
    if (a <= 0.01) return;
    const x = o.x ?? (PORTRAIT ? 130 : 64 * UNIT), y = o.y ?? (PORTRAIT ? 340 : SAFE.top + 56 * UNIT);
    ctx.save(); ctx.globalAlpha = a;
    flPlateNow(str, x - (1 - k) * 60 * UNIT, y, o.size ?? 44 * UNIT, { align: 'left', fill: o.fill ?? FLP.cream, color: o.color ?? FLP.ink, dot: o.dot ?? FLP.teal, weight: 700, shadow: o.shadow, maxW: o.maxW ?? (PORTRAIT ? 750 : W * 0.6) });
    ctx.restore();
  };
  if (DEFER) DEFER.push(f); else f();
}

// ---------------------------------------------------------------------
//  grain: a faint static speckle over the frame (a cached, seeded tile; FL_NOGRAIN turns it off)
// ---------------------------------------------------------------------
let FL_GRAIN_CV = null;
function flGrain() {
  if (typeof FL_NOGRAIN !== 'undefined' && FL_NOGRAIN) return;
  if (!FL_GRAIN_CV) {
    const c = document.createElement('canvas'); c.width = c.height = 160; const g = c.getContext('2d'), R = RNG('flgrain');
    for (let i = 0; i < 1500; i++) { g.fillStyle = R.f() < 0.5 ? 'rgba(255,248,232,0.06)' : 'rgba(8,6,2,0.10)'; g.fillRect(Math.floor(R.r(0, 160)), Math.floor(R.r(0, 160)), R.f() < 0.3 ? 2 : 1, 1); }
    FL_GRAIN_CV = c;
  }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = ctx.createPattern(FL_GRAIN_CV, 'repeat'); ctx.fillRect(0, 0, W, H); ctx.restore();
}

// =====================================================================
//  STYLE — the renderer's hooks (see the skill's styles/README.md)
// =====================================================================
const STYLE = {
  name: 'flat',
  paper: FLP.paper,
  backdrop(c) { flGround(c); flStars('paper', { n: 70 }); },
  // the old / new world seen through a clean round porthole: a flat rim lit on its top-left, an inner shadow, a long shadow
  window(P, key, src, o = {}) {
    const bb = bbox(P), s = Math.max(8, Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0) / 2), cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2;
    const rw = 14 * UNIT, k = 1 + rw / s, Q = P.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]), rc = o.c ? flLight(o.c, 1.5) : FLP.cream;
    if (s < 1600) flLongShadow(Q, s * 0.9, { a: 0.42 });
    ctx.save(); flPath(P); ctx.clip(); ctx.drawImage(src, 0, 0);
    ctx.fillStyle = flA(FLP.shadow, 0.4); flPath(P); flPath(P, FLSD[0] * rw * 1.4, FLSD[1] * rw * 1.4, false); ctx.fill('evenodd');
    ctx.restore();
    ctx.save(); flPath(Q); flPath(P, 0, 0, false); ctx.clip('evenodd');
    ctx.fillStyle = rc; ctx.fillRect(bb.x0 - rw * 2, bb.y0 - rw * 2, bb.x1 - bb.x0 + rw * 4, bb.y1 - bb.y0 + rw * 4);
    ctx.fillStyle = flShade(rc, 0.8); flPath(Q); flPath(Q, -FLSD[0] * rw * 0.6, -FLSD[1] * rw * 0.6, false); ctx.fill('evenodd');
    ctx.fillStyle = flA('#fffaf0', 0.7); flPath(Q); flPath(Q, FLSD[0] * 3 * UNIT, FLSD[1] * 3 * UNIT, false); ctx.fill('evenodd');
    ctx.restore();
  },
  // the morphing shape: a flat solid with its long shadow
  blob(P, c) { flSolid(P, c, { shade: 0.18 }); },
  hero(x, y, r, o = {}) { flHero(x, y, r * 0.7, { mood: o.mood ?? 'wow', key: o.key ?? 'morphhero' }); },
  heroColor: FLP.amber,
  heroPts(x, y, r, n = 96) { return ellipsePts(x, y, r * 0.7, r * 0.7, 0, n); },
  post() { flGrain(); },
  ones: true,
};
