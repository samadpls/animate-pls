// =====================================================================
//  kit/footage.js — the user's own footage in a piece (edit mode, see edit.md): screen recordings, product demos
//  and scripted captures, imported by tools/footage.mjs or tools/record.mjs into <piece>/footage/<name>/ as frames.
//  Opt-in: piece.json "build" lists "kit/footage.js" right after "style". Every top-level name starts with `ft`.
//
//  Needs from the head: FPS, W, H, NFRAMES, TIMELINE.clips; from kit/core.js: clamp, lerp, ctx, F, TT, asset.
//  FOOTAGE (injected by tools/build.mjs from <piece>/footage.json) holds each clip's metadata: fps, w, h, n,
//  frames (the file pattern), events, cursor, activity, suggestions. Pixels never enter the page as files or URLs:
//  the tools expose window.__pieceFile(rel) and call window.prepareFrame(t) before each renderFrame(t), and this
//  file fetches the one frame each visible clip needs into a small ImageBitmap cache. Without the binding (a plain
//  browser preview) a clip draws its poster (assets/<name>-poster.jpg) or a labelled placeholder, with the zooms,
//  cursor and callouts still moving, so a piece can be laid out before any footage exists.
//
//  The declarative edit, in the head:
//    TIMELINE.clips   = [{ name, t0, t1, src0 = 0, speed = 1, id = name, show = [t0 - 0.5, t1 + 0.5] }]
//                       output window [t0, t1] plays the footage from source time src0; outside it the first / last
//                       frame holds. Several clips (or several windows of one footage: a jump cut) are fine.
//    TIMELINE.zooms   = [{ clip, t0, t1, x, y, w, h, scale } | { clip, event: 2 | '#sel' | 'click:#sel', scale }
//                       | { clip, events: ['type:#a', 'click:#b'] } (their union box, first to last) ]; + hold, in, out,
//                       land, pad (room around a box, default 0.25 of its size per side), dt (shift the event's time)
//                       SOURCE time and SOURCE pixels of the footage, so they stay on the action when the clip moves.
//                       The camera starts 1.1 s before t0, lands 0.3 s before it, holds >= 1.0 s after t1, eases out
//                       over ~1.0 s; zooms closer than 2.0 s become one pan. Default scale 1.8 (typing 2.2,
//                       scroll 1.3), fitted to the box with 25% room and at most 2.5 (an explicit scale up to 2.8),
//                       never past the frame's edge on either axis.
//    TIMELINE.callouts = [{ clip, t0, t1, x, y, text, dx, dy }]   pinned to source pixels: they follow the zoom
//    TIMELINE.redact   = [{ clip, t0, t1, x, y, w, h, mode: 'blur' | 'pixelate' }]   personal data off screen
//  Drawing (in the scene, under any camera):
//    ftCard(id, x, y, w, h, o)   the footage in a padded card with rounded corners, made in the active style (its
//                                STYLE.backdrop fills the card, STYLE.window frames it: an inked rim and hatched shadow,
//                                a torn edge, a hairline slab), with the zoom camera, cursor, click rings, callouts and
//                                redactions. o: { radius, pad, fill, chrome: 'dots' (+ dots, label, labelFont, bar),
//                                inner (the footage's edge colour | false), lift, key, zoom, cursor, clicks, callouts,
//                                ring: { ring, fill }, frame fn(geo) drawn on top, look: 'plain' (+ shadow, stroke,
//                                alpha) for a neutral card }. Returns the geometry (also kept for ftToCard).
//    ftClip(id, x, y, w, h, o)   just the frame (no card), same camera; o.view = 'cover' | 'contain'
//    ftToCard(id, sx, sy)        a source pixel -> canvas point, as last drawn (pin anything to the UI)
//    ftLayout(kind, o)           'card' | 'follow' | 'stack' rects for the current format (9:16 and others)
//    ftSrc(id, t), ftIndex(id, t) source time / frame index of a clip at output time t; ftOut(id, s) the reverse
//    ftEvent(name, ref), ftEvents(name, type)   the recorder's events (click, type, press, hover, scroll, mark)
//  Determinism: the camera, cursor and rings are closed-form in time; frames come from files, so the same frames in
//  give the same pixels out (per machine). Never Math.random() or the clock.
// =====================================================================
const ftState = { lru: new Map(), max: 8, cards: {}, got: {}, warned: false };
const ftMeta = (name) => (typeof FOOTAGE !== 'undefined' && FOOTAGE ? FOOTAGE[name] : null) || null;
const ftOnline = () => typeof window.__pieceFile === 'function';
// the time the footage, camera and cursor run on: every frame (not the style's 2s), with blur sub-frames on 1s styles
const ftNow = () => (typeof STYLE !== 'undefined' && STYLE.ones ? TT : F / FPS);

// ---------------------------------------------------------------------
//  clips: windows of footage on the output timeline
// ---------------------------------------------------------------------
function ftClips() {
  if (TIMELINE.clips) return TIMELINE.clips;
  // no clips listed: every imported footage plays once from t = 0
  const all = typeof FOOTAGE !== 'undefined' && FOOTAGE ? Object.keys(FOOTAGE) : [];
  return all.map((name) => ({ name, t0: 0, t1: FOOTAGE[name].duration }));
}
const ftShow = (c) => c.show || [c.t0 - 0.5, c.t1 + 0.5];
// the clip entry for an id (or a footage name) at output time t: the window holding t, else the nearest one
function ftClipAt(id, t) {
  const L = ftClips().filter((c) => (c.id ?? c.name) === id || c.name === id);
  if (!L.length) return null;
  let best = L[0], bd = 1e9;
  for (const c of L) { const d = t < c.t0 ? c.t0 - t : t > c.t1 ? t - c.t1 : -1; if (d < bd) { bd = d; best = c; } }
  return best;
}
// source time of a clip at output time t (held at the window's ends)
function ftSrcOf(c, t) {
  const m = ftMeta(c.name), sp = c.speed ?? 1, s0 = c.src0 ?? 0;
  const s = s0 + (clamp(t, c.t0, c.t1) - c.t0) * sp;
  return m ? clamp(s, 0, Math.max(0, (m.n - 1) / m.fps)) : s;
}
function ftIdxOf(c, t) { const m = ftMeta(c.name); return m ? clamp(Math.round(ftSrcOf(c, t) * m.fps + 1e-6), 0, m.n - 1) : 0; }
const ftSrc = (id, t = ftNow()) => { const c = ftClipAt(id, t); return c ? ftSrcOf(c, t) : 0; };
// the output time at which clip `id` shows source time s (the first window that holds it): cue captions and sound on events
function ftOut(id, s) {
  for (const c of ftClips()) if ((c.id ?? c.name) === id || c.name === id) { const sp = c.speed ?? 1, o = c.t0 + (s - (c.src0 ?? 0)) / sp; if (o >= c.t0 - 1e-6 && o <= c.t1 + 1e-6) return o; }
  return null;
}
const ftIndex = (id, t = ftNow()) => { const c = ftClipAt(id, t); return c ? ftIdxOf(c, t) : 0; };
const ftEvents = (name, type) => ((ftMeta(name) || {}).events || []).filter((e) => !type || e.type === type);
// an event by index, '#selector' or 'type:#selector'
function ftEvent(name, ref) {
  const E = (ftMeta(name) || {}).events || [];
  if (typeof ref === 'number') return E[ref] || null;
  const m = /^(\w+):(.+)$/.exec(String(ref)), type = m ? m[1] : null, sel = m ? m[2] : String(ref);
  return E.find((e) => e.sel === sel && (!type || e.type === type)) || null;
}

// ---------------------------------------------------------------------
//  the frame feed: window.prepareFrame(t) fetches what renderFrame(t) will draw (tools call it before each frame)
// ---------------------------------------------------------------------
function ftFile(name, i) {
  const m = ftMeta(name), pat = (m && m.frames) || `footage/${name}/f%05d.jpg`;
  return pat.replace(/%0(\d)d/, (_, k) => String(i).padStart(Number(k), '0'));
}
function ftBytes(b64) {
  if (typeof Uint8Array.fromBase64 === 'function') return Uint8Array.fromBase64(b64);
  const s = atob(b64), u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
  return u;
}
async function ftLoad(name, i) {
  const key = name + ':' + i, L = ftState.lru;
  if (L.has(key)) { const b = L.get(key); L.delete(key); L.set(key, b); return b; }
  const rel = ftFile(name, i);
  let b64 = null;
  try { b64 = await window.__pieceFile(rel); } catch { b64 = null; }   // the tools refuse a missing file: draw the placeholder
  if (!b64) { if (!ftState.warned) { console.warn(`footage: no file ${rel} (run tools/footage.mjs <piece> --ensure)`); ftState.warned = true; } return null; }
  const bmp = await createImageBitmap(new Blob([ftBytes(b64)], { type: /\.png$/i.test(rel) ? 'image/png' : 'image/jpeg' }));
  L.set(key, bmp);
  while (L.size > ftState.max) { const [k, old] = L.entries().next().value; L.delete(k); if (old && old.close) old.close(); }
  return bmp;
}
window.prepareFrame = async (t) => {
  if (!ftOnline()) return;
  const f = ((Math.round(t * FPS) % NFRAMES) + NFRAMES) % NFRAMES, tt = f / FPS, want = [];
  for (const c of ftClips()) { const [a, b] = ftShow(c); if (ftMeta(c.name) && tt >= a - 1e-6 && tt <= b + 1e-6) want.push([c.name, ftIdxOf(c, tt)]); }
  ftState.max = Math.max(8, want.length * 2);
  for (const [n, i] of want) { const bmp = await ftLoad(n, i); if (bmp) ftState.got[n] = i; }
};
// the bitmap for clip `name` frame i: exact, else the frame prepared for this output frame (blur sub-frames), else null
function ftBitmap(name, i) {
  const L = ftState.lru;
  return L.get(name + ':' + i) || L.get(name + ':' + ftState.got[name]) || null;
}

// ---------------------------------------------------------------------
//  easing (cubic-bezier, solved by bisection: deterministic) and the zoom camera
// ---------------------------------------------------------------------
function ftBezier(x1, y1, x2, y2) {
  const bz = (a, b, t) => 3 * a * t * (1 - t) * (1 - t) + 3 * b * t * t * (1 - t) + t * t * t;
  return (u) => {
    u = clamp(u); if (u <= 0 || u >= 1) return u;
    let lo = 0, hi = 1;
    for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (bz(x1, x2, m) < u) lo = m; else hi = m; }
    return bz(y1, y2, (lo + hi) / 2);
  };
}
const ftEase = {
  in: ftBezier(0.45, 0, 0.15, 1),     // the push in: from rest, quick, then a long settle. (0.16, 1, 0.3, 1), the usual
                                      // screen-recorder curve, starts at full speed: a third of the move in one frame at 24 fps
  out: ftBezier(0.6, 0, 0.3, 1),      // the pull back: unhurried
  pan: ftBezier(0.45, 0, 0.2, 1),     // one target to the next
  ring: ftBezier(0.1, 0.7, 0.3, 1),   // a click ring bursts out, then slows
};
// default depth by event kind; an automatic zoom is fitted to its box and kept <= max, an explicit scale <= cap
const ftZ = { scale: 1.8, type: 2.2, click: 1.8, hover: 1.6, scroll: 1.3, max: 2.5, cap: 2.8, in: 0.8, land: 0.3, hold: 1.0, out: 1.0, merge: 2.0, pad: 0.25 };
// resolve a zoom entry to { a, b, cx, cy, z } in source time / source pixels (z relative to the full frame)
function ftZoomOf(zm, m) {
  // one event, or several (events: [...]): the box is their union, the action runs from the first to the last
  const evs = (zm.events || (zm.event != null ? [zm.event] : [])).map((r) => ftEvent(zm.clip, r)).filter(Boolean), ev = evs[0] || null;
  if ((zm.event != null || zm.events) && !evs.length && zm.t0 == null) return null;   // its event isn't recorded (yet): no zoom
  let ub = null;
  for (const e of evs) if (e.box) { const [x, y, w, h] = e.box; ub = ub ? [Math.min(ub[0], x), Math.min(ub[1], y), Math.max(ub[0] + ub[2], x + w) - Math.min(ub[0], x), Math.max(ub[1] + ub[3], y + h) - Math.min(ub[1], y)] : [x, y, w, h]; }
  const box = zm.w != null ? [zm.x, zm.y, zm.w, zm.h] : ub;
  const a = zm.t0 ?? (ev ? ev.t0 ?? ev.t : 0) + (zm.dt ?? 0), last = evs[evs.length - 1], b = Math.max(a, zm.t1 ?? (last ? last.t1 ?? last.t : a) + (zm.dt ?? 0));
  const kind = zm.kind ?? (ev ? ev.type : 'click');
  let z = zm.scale ?? ftZ[kind] ?? ftZ.scale;   // (a big box can fit below 1.5x: it stays whole rather than cropped)
  let cx = zm.cx ?? (box ? box[0] + box[2] / 2 : zm.x ?? m.w / 2), cy = zm.cy ?? (box ? box[1] + box[3] / 2 : zm.y ?? m.h / 2);
  const pd = zm.pad ?? ftZ.pad;   // the room around the box, as a fraction of its size on each side
  if (box && zm.scale == null) z = Math.min(z, Math.min(m.w / (box[2] * (1 + 2 * pd)), m.h / (box[3] * (1 + 2 * pd))));
  z = clamp(z, 1, zm.scale != null ? ftZ.cap : ftZ.max);
  return { a, b, cx, cy, z, hold: Math.max(ftZ.hold, zm.hold ?? ftZ.hold), dIn: zm.in ?? ftZ.in, land: zm.land ?? ftZ.land, dOut: zm.out ?? ftZ.out };
}
// keyframes of the camera over source time: [{ s, cx, cy, z, ease }]; cached per footage name
const ftKeyCache = {};
function ftKeys(name) {
  if (ftKeyCache[name]) return ftKeyCache[name];
  const m = ftMeta(name) || { w: 1920, h: 1080 }, base = { cx: m.w / 2, cy: m.h / 2, z: 1 };
  const Z = (TIMELINE.zooms || []).filter((zm) => zm.clip === name).map((zm) => ftZoomOf(zm, m)).filter(Boolean).sort((p, q) => p.a - q.a);
  const K = [], add = (k) => { const last = K[K.length - 1]; K.push({ ...k, s: last ? Math.max(k.s, last.s + 0.01) : k.s }); };
  let chained = false;   // true when the previous zoom panned straight into this one (no pull back in between)
  Z.forEach((zm, i) => {
    const land = zm.a - zm.land, start = land - zm.dIn, holdEnd = zm.b + zm.hold, next = Z[i + 1], at = { cx: zm.cx, cy: zm.cy, z: zm.z };
    if (!chained) { add({ s: start, ...base, ease: null }); add({ s: land, ...at, ease: ftEase.in }); }
    chained = !!next && next.a - next.land - next.dIn - holdEnd < ftZ.merge;
    if (chained) {
      // close enough to the next one: hold, then pan (at least 0.45 s, landing where the next would land)
      const nl = next.a - next.land, p0 = Math.max(land + 0.05, Math.min(Math.max(holdEnd, nl - 1.0), nl - 0.45));
      add({ s: p0, ...at, ease: null });
      add({ s: Math.max(nl, p0 + 0.45), cx: next.cx, cy: next.cy, z: next.z, ease: ftEase.pan });
    } else {
      add({ s: holdEnd, ...at, ease: null });
      add({ s: holdEnd + zm.dOut, ...base, base: true, ease: ftEase.out });
    }
  });
  K.forEach((k) => { if (k.z === 1 && k.cx === base.cx && k.cy === base.cy) k.base = true; });
  return (ftKeyCache[name] = K);
}
// a view rect { x, y, w, h } in source pixels, of aspect `asp` (w / h), for keyframe state k; kept inside the frame
function ftRect(m, asp, k) {
  const bw = Math.min(m.w, m.h * asp), bh = bw / asp, w = bw / k.z, h = bh / k.z;
  return { x: clamp(k.cx - w / 2, 0, m.w - w), y: clamp(k.cy - h / 2, 0, m.h - h), w, h };
}
// interpolate two view rects: log-space size about the fixed point the two rects share (a true zoom into the target)
function ftMix(A, B, e) {
  const ax = (a0, aw, b0, bw) => {
    const w = Math.exp(lerp(Math.log(aw), Math.log(bw), e));
    if (Math.abs(aw - bw) > aw * 1e-3) { const f = (b0 - a0) / (aw - bw); if (f > -0.5 && f < 1.5) return [a0 + f * aw - f * w, w]; return [lerp(a0, b0, (w - aw) / (bw - aw)), w]; }
    return [lerp(a0, b0, e), w];
  };
  const [x, w] = ax(A.x, A.w, B.x, B.w), [y, h] = ax(A.y, A.h, B.y, B.h);
  return { x, y, w, h };
}
// the camera's view of footage `name` at source time s, for a content rect of aspect asp
function ftView(name, s, asp, o = {}) {
  const m = ftMeta(name) || { w: 1920, h: 1080 };
  if (o.view) return o.view;
  const K = o.zoom === false ? [] : ftKeys(name), base = { cx: o.follow ? ftFollow(name, s, m) : m.w / 2, cy: m.h / 2, z: 1 };
  if (o.follow) base.cy = ftFollowY(name, s, m);
  const st = (k) => (k.base ? base : k);
  if (!K.length || s <= K[0].s) return ftRect(m, asp, base);
  for (let i = 0; i < K.length - 1; i++) {
    const p = K[i], q = K[i + 1];
    if (s < q.s) {
      const A = ftRect(m, asp, st(p)), Bv = ftRect(m, asp, st(q));
      if (!q.ease) return A;
      const R = ftMix(A, Bv, q.ease((s - p.s) / (q.s - p.s)));
      return { x: clamp(R.x, 0, m.w - R.w), y: clamp(R.y, 0, m.h - R.h), w: R.w, h: R.h };
    }
  }
  return ftRect(m, asp, st(K[K.length - 1]));
}
// 'follow' layouts: the crop follows the cursor (smoothed over +-0.5 s, a dead zone of 6% of the width), else the centre
function ftCursorAt(name, s) {
  const P = (ftMeta(name) || {}).cursor;
  if (!P || !P.length) return null;
  if (s <= P[0][0]) return [P[0][1], P[0][2]];
  let lo = 0, hi = P.length - 1;
  if (s >= P[hi][0]) return [P[hi][1], P[hi][2]];
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (P[mid][0] <= s) lo = mid; else hi = mid; }
  const a = P[lo], b = P[hi], u = (s - a[0]) / ((b[0] - a[0]) || 1);
  return [lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
}
function ftFollowPt(name, s, m) {
  let sx = 0, sy = 0, n = 0;
  for (let k = -6; k <= 6; k++) { const p = ftCursorAt(name, s + k * 0.08); if (p) { const w = 7 - Math.abs(k); sx += p[0] * w; sy += p[1] * w; n += w; } }
  return n ? [sx / n, sy / n] : [m.w / 2, m.h / 2];
}
const ftFollow = (name, s, m) => { const p = ftFollowPt(name, s, m); return Math.round(p[0] / (m.w * 0.06)) * m.w * 0.06 * 0.35 + p[0] * 0.65; };
const ftFollowY = (name, s, m) => ftFollowPt(name, s, m)[1];

// ---------------------------------------------------------------------
//  drawing
// ---------------------------------------------------------------------
function ftRR(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2))); }
// the soft shadow: three stacked layers (wide and faint, mid, tight), scaled by intensity k
function ftShadow(x, y, w, h, r, k = 1, fill = '#ffffff') {
  ctx.save();
  for (const [blur, a, dy] of [[48, 0.7, 12], [16, 0.5, 4], [8, 0.3, 2]]) {
    ctx.shadowColor = `rgba(16,18,28,${(a * k * 0.5).toFixed(3)})`; ctx.shadowBlur = blur * UNIT; ctx.shadowOffsetY = dy * UNIT; ctx.shadowOffsetX = 0;
    ftRR(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill();
  }
  ctx.restore();
}
// source pixel -> canvas point for the last drawn card of a clip
function ftToCard(id, sx, sy) {
  const g = ftState.cards[id]; if (!g) return null;
  return [g.cx + (sx - g.view.x) * g.k, g.cy + (sy - g.view.y) * g.k];
}
// the placeholder when no frame is available: a calm panel with a source-space grid (so zooms show in a preview)
function ftPlaceholder(name, g, idx) {
  const m = ftMeta(name) || { w: 1920, h: 1080, n: 0, fps: FPS, duration: 0 };
  ctx.fillStyle = (typeof STYLE !== 'undefined' && STYLE.paper) || '#efe9dc'; ctx.fillRect(g.cx, g.cy, g.cw, g.ch);
  ctx.save(); ctx.strokeStyle = ftInk(0.16); ctx.lineWidth = Math.max(1, UNIT);
  ctx.beginPath();
  for (let i = 1; i < 8; i++) { const X = g.cx + (m.w * i / 8 - g.view.x) * g.k, Y = g.cy + (m.h * i / 8 - g.view.y) * g.k; ctx.moveTo(X, g.cy); ctx.lineTo(X, g.cy + g.ch); ctx.moveTo(g.cx, Y); ctx.lineTo(g.cx + g.cw, Y); }
  ctx.stroke();
  const fs = Math.max(14, Math.min(g.cw, g.ch) * 0.05);
  ctx.fillStyle = ftInk(0.7); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `700 ${fs}px ${MONO}`; ctx.fillText(`footage: ${name}`, g.cx + g.cw / 2, g.cy + g.ch / 2 - fs * 0.7);
  ctx.font = `400 ${fs * 0.62}px ${MONO}`;
  ctx.fillText(m.n ? `${m.w}x${m.h} · ${m.duration.toFixed(1)}s · frame ${idx}` : 'not imported yet', g.cx + g.cw / 2, g.cy + g.ch / 2 + fs * 0.55);
  ctx.restore();
}
function ftRedactAll(name, s, g, bmp) {
  for (const r of TIMELINE.redact || []) {
    if (r.clip !== name || s < (r.t0 ?? -1e9) || s > (r.t1 ?? 1e9)) continue;
    const X = g.cx + (r.x - g.view.x) * g.k, Y = g.cy + (r.y - g.view.y) * g.k, Wd = r.w * g.k, Hd = r.h * g.k;
    ctx.save(); ctx.beginPath(); ctx.rect(X, Y, Wd, Hd); ctx.clip();
    if (bmp && r.mode !== 'fill') {
      if (r.mode === 'pixelate') {
        const n = Math.max(2, Math.round(r.w / (r.block ?? 24))), mh = Math.max(2, Math.round(n * r.h / r.w));
        const c = ftScratch(n, mh), g2 = c.getContext('2d'); g2.imageSmoothingQuality = 'high'; g2.drawImage(bmp, r.x, r.y, r.w, r.h, 0, 0, n, mh);
        ctx.imageSmoothingEnabled = false; ctx.drawImage(c, 0, 0, n, mh, X, Y, Wd, Hd);
      } else { ctx.filter = `blur(${Math.max(4, (r.blur ?? 14) * g.k)}px)`; ctx.drawImage(bmp, g.view.x, g.view.y, g.view.w, g.view.h, g.cx, g.cy, g.cw, g.ch); ctx.filter = 'none'; }
    } else { ctx.fillStyle = r.fill ?? '#c8ccd6'; ctx.fillRect(X, Y, Wd, Hd); }
    ctx.restore();
  }
}
let ftScratchC = null;
function ftScratch(w, h) { if (!ftScratchC) ftScratchC = document.createElement('canvas'); ftScratchC.width = w; ftScratchC.height = h; return ftScratchC; }

// the cursor: a clean arrow drawn in code (hotspot at the tip), size in the recording's own pixels
function ftArrow(x, y, s, o = {}) {
  const P = [[0, 0], [0, 17.2], [4.3, 13.3], [7.1, 19.8], [9.9, 18.6], [7.2, 12.3], [12.6, 12.3]];
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.beginPath(); P.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath();
  ctx.shadowColor = 'rgba(0,0,0,0.28)'; ctx.shadowBlur = 3 * s; ctx.shadowOffsetY = 1.2 * s;
  ctx.fillStyle = o.fill ?? '#ffffff'; ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.lineJoin = 'round'; ctx.lineWidth = 1.35; ctx.strokeStyle = o.line ?? '#14161c'; ctx.stroke();
  ctx.restore();
}
// clicks: an expanding ring and a soft press disc, over 0.5 s from each click event's time
function ftClicksAt(name, s, g, o = {}) {
  const m = ftMeta(name); if (!m) return 0;
  const dpr = m.scale ?? 1; let press = 0;
  for (const e of m.events || []) {
    if (e.type !== 'click' || e.x == null) continue;
    const u = (s - e.t) / 0.5;
    if (u < -0.25 || u > 1) continue;
    press = Math.max(press, u < 0 ? 1 - Math.abs(u) / 0.25 : u < 0.25 ? 1 - u / 0.25 : 0);
    if (u < 0) continue;
    const X = g.cx + (e.x - g.view.x) * g.k, Y = g.cy + (e.y - g.view.y) * g.k, R = (8 + 30 * ftEase.ring(u)) * Math.max(dpr * g.k, 1.05 * UNIT);
    ctx.save();
    ctx.globalAlpha = (1 - u) * (o.alpha ?? 1);
    ctx.beginPath(); ctx.arc(X, Y, R * 0.55, 0, TAU); ctx.fillStyle = o.fill ?? 'rgba(255,250,240,0.4)'; ctx.fill();
    ctx.beginPath(); ctx.arc(X, Y, R, 0, TAU); ctx.lineWidth = Math.max(2 * UNIT, (4 - 2.5 * u) * dpr * g.k * 0.6); ctx.strokeStyle = o.ring ?? ((typeof STYLE !== 'undefined' && STYLE.heroColor) || '#d97757'); ctx.stroke();
    ctx.restore();
  }
  return press;
}
function ftCursorDraw(name, s, g, press, o = {}) {
  const m = ftMeta(name), p = ftCursorAt(name, s); if (!m || !p) return;
  const X = g.cx + (p[0] - g.view.x) * g.k, Y = g.cy + (p[1] - g.view.y) * g.k, dpr = m.scale ?? 1;
  // the recording's own pointer size (about 25 px), never smaller than ~26 px on screen (small cards, tall formats)
  ftArrow(X, Y, Math.max((o.size ?? 1.25) * dpr * g.k, (o.min ?? 1.3) * UNIT) * (1 - 0.14 * press), o);
}
// a callout pinned to a source pixel: a dot on the UI, a leader and a label; fades with its window
function ftCalloutDraw(c, s, g) {
  const fade = Math.min(clamp((s - c.t0) / 0.3), clamp((c.t1 - s) / 0.3));
  if (fade <= 0) return;
  const X = g.cx + (c.x - g.view.x) * g.k, Y = g.cy + (c.y - g.view.y) * g.k;
  if (X < g.cx - 2 || X > g.cx + g.cw + 2 || Y < g.cy - 2 || Y > g.cy + g.ch + 2) return;
  if (c.draw) { c.draw(X, Y, c, fade); return; }
  const fs = (c.size ?? 34) * UNIT, dx = (c.dx ?? 60) * UNIT, dy = (c.dy ?? -60) * UNIT, ink = c.color ?? ftInk();
  const font = c.font ?? (typeof HAND !== 'undefined' ? HAND : MONO);
  ctx.save(); ctx.globalAlpha = fade;
  ctx.strokeStyle = ink; ctx.lineWidth = 2.5 * UNIT; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X + dx, Y + dy); ctx.stroke();
  ctx.beginPath(); ctx.arc(X, Y, 6 * UNIT, 0, TAU); ctx.fillStyle = ink; ctx.fill();
  ctx.font = `400 ${fs}px ${font}`; const tw = ctx.measureText(c.text).width, ph = fs * 1.5, pw = tw + fs * 1.0;
  const px = dx >= 0 ? X + dx : X + dx - pw, py = Y + dy - ph / 2;
  ftRR(px, py, pw, ph, fs * 0.3); ctx.fillStyle = c.bg ?? ((typeof STYLE !== 'undefined' && STYLE.paper) || '#f4ecd9'); ctx.fill();
  ctx.lineWidth = 2.5 * UNIT; ctx.strokeStyle = ink; ctx.stroke();
  ctx.fillStyle = c.fg ?? ink; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillText(c.text, px + fs * 0.5, py + ph / 2 + fs * 0.04);
  ctx.restore();
}
// just the footage, framed by the camera, into the rect (x, y, w, h). Returns the geometry.
function ftClip(id, x, y, w, h, o = {}) {
  const t = ftNow(), c = ftClipAt(id, t);
  if (!c) return null;
  const name = c.name, m = ftMeta(name), s = ftSrcOf(c, t), idx = ftIdxOf(c, t);
  const view = ftView(name, s, w / h, o), k = w / view.w;
  const g = { id, name, s, idx, cx: x, cy: y, cw: w, ch: h, view, k };
  const bmp = ftOnline() ? ftBitmap(name, idx) : null;
  ctx.save(); if (o.r) { ftRR(x, y, w, h, o.r); ctx.clip(); }
  if (bmp) { ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(bmp, view.x, view.y, view.w, view.h, x, y, w, h); }
  else {
    const poster = asset(name + '-poster.jpg') || asset(name + '-poster.png');
    if (poster && m) { const pk = poster.naturalWidth / m.w; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(poster, view.x * pk, view.y * pk, view.w * pk, view.h * pk, x, y, w, h); }
    else ftPlaceholder(name, g, idx);
  }
  ftRedactAll(name, s, g, bmp);
  if (o.clicks !== false) g.press = ftClicksAt(name, s, g, o.ring || {});
  for (const co of TIMELINE.callouts || []) if (co.clip === name && o.callouts !== false) ftCalloutDraw(co, s, g);
  if (o.cursor !== false) ftCursorDraw(name, s, g, g.press || 0, o.cursorStyle || {});
  ctx.restore();
  ftState.cards[id] = g; if (id !== name) ftState.cards[name] = g;
  return g;
}
// the footage in a card. By default the card is made in the active style's own medium: the card is filled with
// STYLE.backdrop (textured paper, a print, a flat ground), the window dots are STYLE.blob shapes, and the whole card is
// handed to STYLE.window, which frames it the way the style frames any opening (an inked rim with a hatched shadow, a
// torn-paper edge, a hairline slab). o.look = 'plain' draws a neutral card instead (o.fill, o.shadow, o.stroke).
// The footage itself stays crisp and moves on every frame; the frame around it boils with the style.
function ftCard(id, x, y, w, h, o = {}) {
  const styled = (o.look ?? 'style') === 'style' && typeof STYLE !== 'undefined' && typeof STYLE.window === 'function';
  const r = (o.radius ?? 22) * UNIT, pad = (o.pad ?? 12) * UNIT, bar = o.chrome === 'dots' ? (o.bar ?? 36) * UNIT : 0;
  const fill = o.fill ?? (typeof STYLE !== 'undefined' ? STYLE.paper : '#ffffff');
  let m = ctx.getTransform();
  if (o.lift) { const k = 1 + o.lift, cx = x + w / 2, cy = y + h / 2; m = m.translate(cx, cy).scale(k, k).translate(-cx, -cy); }
  const saved = ctx;
  let L = null;
  if (styled) {   // draw the card's inside into a layer at its screen position, then let the style frame it
    L = ftLayer(); ctx = L.getContext('2d');
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.clearRect(0, 0, W, H);
    if (STYLE.backdrop) STYLE.backdrop(fill, { phase: 'card' }); else { ctx.fillStyle = fill; ctx.fillRect(0, 0, W, H); }
    ctx.setTransform(m);
  } else {
    ctx.save(); ctx.setTransform(m);
    if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    if (typeof o.shadow === 'function') o.shadow(x, y, w, h, r);
    else if (o.shadow !== false) ftShadow(x, y, w, h, r, o.shadow === true || o.shadow == null ? 1 : o.shadow, fill);
    ftRR(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill();
  }
  if (bar) {   // a window bar: three dots (in the medium) and an optional label
    const dr = bar * 0.17, cols = o.dots ?? ['#d4382c', '#f0c55a', '#5f9c5c'];
    for (let i = 0; i < 3; i++) {
      const P = ellipsePts(x + pad + bar * 0.5 + i * dr * 3.3, y + pad + bar * 0.45, dr, dr, 0, 20), cc = Array.isArray(cols) ? cols[i] : cols;
      if (styled && STYLE.blob && o.dotLine == null) STYLE.blob(P, cc, `ftdot${i}`, 1, { phase: 'card' });
      else { trace(P, true); if (o.dotLine) { ctx.lineWidth = 2 * UNIT; ctx.strokeStyle = o.dotLine; ctx.stroke(); } else { ctx.fillStyle = cc; ctx.fill(); } }
    }
    if (o.label) { ctx.font = o.labelFont ?? `400 ${bar * 0.42}px ${MONO}`; ctx.fillStyle = o.labelColor ?? ftInk(0.55); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(o.label, x + w / 2, y + pad + bar * 0.45); }
  }
  const ri = Math.max(2 * UNIT, o.innerRadius != null ? o.innerRadius * UNIT : r - pad);
  const g = ftClip(id, x + pad, y + pad + bar, w - 2 * pad, h - 2 * pad - bar, { ...o, r: ri });
  if (g) g.card = { x, y, w, h, r };
  if (o.inner !== false && g) { ftRR(g.cx, g.cy, g.cw, g.ch, ri); ctx.lineWidth = (o.innerW ?? 1.5) * UNIT; ctx.strokeStyle = o.inner ?? ftInk(0.45); ctx.stroke(); }
  ctx.restore();
  ctx = saved;
  if (styled) {
    const P = rrectPts(x, y, w, h, r, 8).map(([px, py]) => { const q = m.transformPoint(new DOMPoint(px, py)); return [q.x, q.y]; });
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    STYLE.window(P, o.key ?? `ft-${id}`, L, { c: fill, u: 1, phase: 'card' });
    ctx.restore();
  }
  if (o.frame) { ctx.save(); ctx.setTransform(m); o.frame(g || { card: { x, y, w, h, r } }); ctx.restore(); }
  else if (!styled && o.stroke) { ctx.save(); ctx.setTransform(m); ftRR(x, y, w, h, r); ctx.lineWidth = (o.strokeW ?? 1.5) * UNIT; ctx.strokeStyle = o.stroke; ctx.stroke(); ctx.restore(); }
  return g;
}
let ftLayerC = null;
function ftLayer() { if (!ftLayerC || ftLayerC.width !== W || ftLayerC.height !== H) { ftLayerC = document.createElement('canvas'); ftLayerC.width = W; ftLayerC.height = H; } return ftLayerC; }
// the style's ink (STYLE.ink if the style names one, else the warm ink of kit/core.js), at an alpha
function ftInk(a = 1) {
  const c = (typeof STYLE !== 'undefined' && STYLE.ink) || (typeof C !== 'undefined' && C.ink) || '#2a2420';
  if (a >= 1 || c[0] !== '#' || c.length !== 7) return c;
  return `rgba(${[1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)).join(',')},${a})`;
}
// a card's outer size for a footage that fits (maxW, maxH), padding and chrome included (o.aspect before it is imported)
function ftFit(name, maxW, maxH, o = {}) {
  const m = ftMeta(name), pad = (o.pad ?? 12) * UNIT, bar = o.chrome === 'dots' ? (o.bar ?? 36) * UNIT : 0, asp = m ? m.w / m.h : o.aspect ?? 16 / 9;
  let cw = maxW - 2 * pad, ch = cw / asp;
  if (ch + 2 * pad + bar > maxH) { ch = maxH - 2 * pad - bar; cw = ch * asp; }
  return { w: cw + 2 * pad, h: ch + 2 * pad + bar };
}
// layouts for the current format. kind:
//   'card'   (default) the recording as a card: centred in the frame above a caption band (9:16: in the middle third)
//   'follow' the full frame, cropped from the source and following the action (only for sources >= 1440 px tall)
//   'stack'  9:16: two cards, the recording on top and a second clip (o.second: a face cam) below, captions between
//  o: { name, pad, chrome, top (px kept free above), bottom (px kept free below), margin }
function ftLayout(kind = 'card', o = {}) {
  const S = typeof SAFE !== 'undefined' ? SAFE : { top: 60, bottom: 110, right: 60 };
  const mx = (o.margin ?? (WIDE ? 150 : 60)) * UNIT, top = S.top + (o.top ?? (PORTRAIT ? 180 : 40) * UNIT), bot = S.bottom + (o.bottom ?? (PORTRAIT ? 220 : 120) * UNIT);
  if (kind === 'follow') {
    const m = ftMeta(o.name); if (m && m.h < 1440) console.warn(`footage ${o.name}: 'follow' crops a ${m.h}p source and blows it up; use 'card' below 1440p`);
    return { card: { x: 0, y: 0, w: W, h: H }, caption: { x: CX, y: H - S.bottom - 90 * UNIT, w: W - 2 * mx }, follow: true };
  }
  if (kind === 'stack') {
    const gap = 150 * UNIT, avail = H - top - bot - gap, a = ftFit(o.name, W - 2 * mx, avail * 0.55, o);
    const b = o.second ? ftFit(o.second, W - 2 * mx, avail - a.h, o) : { w: a.w, h: avail - a.h };
    const y0 = top + (avail - a.h - b.h) / 2;
    return { card: { x: (W - a.w) / 2, y: y0, w: a.w, h: a.h }, card2: { x: (W - b.w) / 2, y: y0 + a.h + gap, w: b.w, h: b.h }, caption: { x: CX, y: y0 + a.h + gap / 2, w: W - 2 * mx } };
  }
  const f = ftFit(o.name, W - 2 * mx - (S.right - 60 * UNIT), H - top - bot, o);
  const x = (W - S.right + 60 * UNIT - f.w) / 2, y = top + (H - top - bot - f.h) / 2;
  return { card: { x, y, w: f.w, h: f.h }, caption: { x: CX, y: Math.min(H - S.bottom - 30 * UNIT, y + f.h + (PORTRAIT ? 150 : 95) * UNIT), w: W - 2 * mx } };
}
