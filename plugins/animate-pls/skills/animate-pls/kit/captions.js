// =====================================================================
//  kit/captions.js — word-by-word captions for reels (grammar/FORMATS.md F10). Opt-in: list "kit/captions.js" right
//  after "style" in piece.json "build". Our own code; every top-level name starts with `cap`.
//
//  Words: VOICE.lines[].words ({ w, t0, t1 }, injected by tools/build.mjs from voice.json) when there is a voice-over;
//  otherwise the piece's CAPTION_SCRIPT (define it in src/head.html, before the kit):
//    const CAPTION_SCRIPT = [{ t: 0.2, t1: 1.9, text: 'Three cache failures look the same.' }, ...];
//    each line's words are spread over [t, t1) by letter count (t1 defaults to the next line's start, or ~2.7 words/s).
//  Chunks: at most 3 words (CAPTION_OPTS.maxWords, up to 5 for calm pieces); a new chunk at . , ? ! ; : and dashes,
//  at a pause of 150 ms or more, or when a chunk would span more than 1.2 s. A run between breaks is split into the
//  fewest chunks that obey those limits, as even in length as possible, so no chunk is one lonely word (the
//  phrase-balancing idea of balancePhrases in explainroo by Vincent Schmalbach, MIT; re-written here for word
//  counts and time spans).
//  Fit: measured with ctx.measureText, stroke included, into the platform-safe box: on 9:16 the union of the
//  TikTok, Reels and Shorts UI leaves x 120–888, y 288–1248, and below y 840 text must stay left of x 780 (TikTok's
//  button rail); other shapes use SAFE (or TIMELINE.safe). 96 px first on one line down to 80% of that, then two
//  balanced lines (never one short word alone) down to 64 px, then one line down to 64 px, then down to 50 px as a
//  last resort (marked fit: 'tight').
//  Look: bold condensed caps (the first installed of Impact, Haettenschweiler, Arial Narrow, Liberation Sans Narrow,
//  DejaVu Sans Condensed), a warm-black edge drawn under a paper fill, the active word in the accent colour, on an
//  accent box (mode 'box') or on a hand-drawn marker swipe (mode 'marker'), a 0.8 -> 1 pop on each new chunk, a small
//  lift on the active word, and (boil: true) a hand-set jitter that changes with the boil. A piece sets its own
//  face with CAPTION_OPTS.font (e.g. HAND for a hand-lettered style); a style that defines
//  STYLE.caption(words, activeIndex, x, y, size, o) letters every line itself (see capFrame).
//  Drawing: by default after every frame, in screen space, through STYLE.post (so a caption never blinks during a
//  morph or carry, where era overlays are skipped). CAPTION_OPTS.auto = false instead: call capDraw() at the end of
//  every scene; it goes through DEFER like any caption. Either way it is fillText/strokeText, so tools/textcheck.mjs
//  sees every word.
//  Review: TIMELINE.captions lists every chunk { t0, t1, text, words, line, size, lines, box: [x0, y0, x1, y1], fit }
//  and TIMELINE.captionSafe the box they must stay in (tools/reel-check.mjs reads both).
//
//  CAPTION_OPTS (optional, in the head): { maxWords 3, maxSpan 1.2, gap 0.15, size 96, minSize 64, floor 50,
//    font, weight, upper true, fill, stroke, accent, mode 'color' | 'box' | 'marker', boil false, x, y (the centre of
//    a one-line chunk), rect { x0, y0, x1, y1, railX, railY }, start 0.12 (no caption before it: one at 0 s looks
//    pre-existing), hold 0.35 (after a chunk's last word when nothing follows), source 'voice' | 'script', auto true }
// =====================================================================
const capFaces = [['Impact', 400], ['Haettenschweiler', 400], ['Arial Narrow', 700], ['Liberation Sans Narrow', 700], ['DejaVu Sans Condensed', 700], ['Nimbus Sans Narrow', 700]];
const capPunct = /[.,!?;:–—]["')’”]*$/;
let capCache = null;      // the chunk list: built once from VOICE / CAPTION_SCRIPT (static, the same on every frame)
let capBusy = false;      // true while captions draw (tools/reel-check.mjs traces caption text by it)
let capMeasureCtx = null, capFace = null;
const capG = () => capMeasureCtx || (capMeasureCtx = document.createElement('canvas').getContext('2d'));

// the default face: the first condensed bold face this machine has (a face that is missing measures like the fallback)
function capPickFace() {
  if (capFace) return capFace;
  const g = capG(), probe = 'WWMM iill 0123 CAPTIONS';
  const w = (f) => { g.font = f; return g.measureText(probe).width; };
  for (const [name, wt] of capFaces) if (Math.abs(w(`${wt} 40px "${name}", monospace`) - w(`${wt} 40px monospace`)) > 0.5) return (capFace = { font: `"${name}", sans-serif`, weight: wt });
  return (capFace = { font: 'sans-serif', weight: 700 });
}
// the piece's options; null while CAPTION_OPTS is declared further down the file and not yet initialised
function capOpts() {
  let user;
  try { user = typeof CAPTION_OPTS !== 'undefined' ? CAPTION_OPTS : {}; } catch (e) { return null; }
  const st = typeof STYLE !== 'undefined' ? STYLE : {}, face = capPickFace();
  return {
    maxWords: 3, maxSpan: 1.2, gap: 0.15, size: 96, minSize: 64, floor: 50, strokeK: 0.15, lineK: 1.04, lift: 1.06,
    font: st.captionFont || face.font, weight: st.captionWeight || face.weight, upper: true,
    fill: '#f4efe4', stroke: '#17110c', accent: '#f0c55a', boxInk: '#17110c', mode: 'color', boil: false,
    start: 0.12, hold: 0.35, bridge: 0.6, auto: true, source: null,
    ...user,
  };
}
function capScript() { try { return typeof CAPTION_SCRIPT !== 'undefined' ? CAPTION_SCRIPT : null; } catch (e) { return undefined; } }
const capEnd = () => (typeof TIMELINE !== 'undefined' && TIMELINE.duration) || (typeof DURATION !== 'undefined' ? DURATION : 1e9);

// ---- words: [{ w, t0, t1, line }]
function capWords(o) {
  const useVoice = o.source !== 'script' && typeof VOICE !== 'undefined' && VOICE.lines && VOICE.lines.some((l) => l.words && l.words.length);
  if (useVoice) {
    const out = [];
    VOICE.lines.forEach((l, li) => {
      const ws = (l.words || []).map((w) => ({ w: String(w.w).trim(), t0: +w.t0, t1: +w.t1, line: li })).filter((w) => w.w);
      // a word the recogniser could not hear comes back with no length (voice.mjs fills it in): give it time from the
      // pause before it, or the first part of the next word, so it still lights up for a moment
      ws.forEach((w, i) => {
        if (w.t1 - w.t0 >= 0.05) return;
        const lo = i ? ws[i - 1].t1 : l.t0, nx = ws[i + 1];
        if (w.t0 - lo >= 0.1) w.t0 = Math.max(lo, w.t0 - 0.22);
        else if (nx && nx.t1 - nx.t0 > 0.12) { w.t1 = nx.t0 + Math.min(0.14, (nx.t1 - nx.t0) / 2); nx.t0 = w.t1; return; }
        w.t1 = Math.max(w.t1, w.t0 + 0.05);
      });
      out.push(...ws);
    });
    return { src: 'voice', words: out, lines: VOICE.lines.map((l) => l.text) };
  }
  const S = capScript();
  if (S === undefined) return null;   // declared later in the file: try again on the first frame
  if (!S || !S.length) return { src: 'none', words: [], lines: [] };
  const out = [];
  S.forEach((L, li) => {
    const ws = String(L.text).split(/\s+/).filter(Boolean), next = S[li + 1];
    const t1 = L.t1 ?? Math.min(next ? next.t - 0.12 : capEnd() - 0.3, L.t + 0.37 * ws.length);
    const wt = ws.map((w) => w.replace(/[^\p{L}\p{N}]/gu, '').length + 2), sum = wt.reduce((a, b) => a + b, 0) || 1;
    let t = L.t;
    ws.forEach((w, i) => { const d = (t1 - L.t) * wt[i] / sum; out.push({ w, t0: +t.toFixed(4), t1: +(t + d).toFixed(4), line: li }); t += d; });
  });
  return { src: 'script', words: out, lines: S.map((L) => L.text) };
}

// ---- chunks: runs between hard breaks, each split into the fewest balanced chunks
function capBalance(run, o) {
  const n = run.length, len = (a, b) => run.slice(a, b).reduce((s, w) => s + w.w.length + 1, -1);
  const ok = (a, b) => b - a === 1 || (b - a <= o.maxWords && run[b - 1].t1 - run[a].t0 <= o.maxSpan + 1e-6);
  const best = [{ parts: 0, cost: 0, from: -1 }];
  for (let b = 1; b <= n; b++) {
    best[b] = null;
    for (let a = b - 1; a >= 0 && b - a <= o.maxWords; a--) {
      if (!ok(a, b) || !best[a]) continue;
      // even lengths: the sum of squared slack against a generous chunk length; a lone short word costs extra
      const lone = b - a === 1 && n > 1 && run[a].w.length < 6 ? 400 : 0;
      const c = { parts: best[a].parts + 1, cost: best[a].cost + (24 - len(a, b)) ** 2 + lone, from: a };
      // ties go to the longer later chunk ("many keys | expire together.", not "many keys expire | together.")
      if (!best[b] || c.parts < best[b].parts || (c.parts === best[b].parts && (c.cost < best[b].cost - 1e-9 || (Math.abs(c.cost - best[b].cost) < 1e-9 && a < best[b].from)))) best[b] = c;
    }
  }
  const out = [];
  for (let b = n; b > 0; b = best[b].from) out.unshift(run.slice(best[b].from, b));
  return out;
}
function capChunk(words, o) {
  const runs = []; let run = [];
  words.forEach((w, i) => {
    const prev = words[i - 1];
    if (run.length && (w.line !== prev.line || w.t0 - prev.t1 >= o.gap - 1e-6)) { runs.push(run); run = []; }
    run.push(w);
    if (capPunct.test(w.w)) { runs.push(run); run = []; }
  });
  if (run.length) runs.push(run);
  const groups = runs.flatMap((r) => capBalance(r, o)), end = capEnd();
  return groups.map((g, i) => {
    const next = groups[i + 1], last = g[g.length - 1].t1;
    let t1 = last + o.hold;
    if (next) t1 = next[0].t0 - last <= o.bridge ? next[0].t0 : Math.min(t1, next[0].t0);
    return { t0: Math.max(g[0].t0, o.start), t1: Math.min(t1, end), words: g.map((w) => ({ w: w.w, t0: w.t0, t1: w.t1 })), line: g[0].line };
  }).filter((c) => c.t1 > c.t0 + 1e-6);
}

// ---- layout: the box captions must stay in, and the fitted size, lines and word positions of one chunk
function capRect(o) {
  if (o.rect) return { railX: null, railY: null, ...o.rect };
  if (H > 1.5 * W) {   // phone-tall (9:16): the union of the TikTok, Reels and Shorts UI (1080x1920 numbers, scaled; tools/safezones.mjs 'all')
    const kx = W / 1080, ky = H / 1920;
    return { x0: 120 * kx, x1: 888 * kx, y0: 288 * ky, y1: 1248 * ky, railX: 780 * kx, railY: 840 * ky };
  }
  const s = (typeof SAFE !== 'undefined' && SAFE) || (typeof TIMELINE !== 'undefined' && TIMELINE.safe) || {};
  return { x0: s.left ?? s.right ?? 60, x1: W - (s.right ?? 60), y0: s.top ?? 60, y1: H - (s.bottom ?? 60), railX: null, railY: null };
}
function capLayout(strs, o, R) {
  const g = capG(), tall = H > 1.5 * W;
  const font = (s) => `${o.weight} ${s}px ${o.font}`;
  const measure = (s) => {
    g.font = font(s);
    const m = strs.map((t) => g.measureText(t)), cap = g.measureText('H').actualBoundingBoxAscent || 0.72 * s;
    // a box or a swipe behind the active word needs room either side: wider spaces in those modes
    return { s, cap, sp: g.measureText(' ').width * 1.15 + (o.mode === 'color' ? 0 : 0.12 * s), w: m.map((x) => x.width), asc: m.map((x) => x.actualBoundingBoxAscent || 0.75 * s), desc: m.map((x) => x.actualBoundingBoxDescent || 0.2 * s) };
  };
  const lineW = (M, a, b) => { let w = 0; for (let i = a; i < b; i++) w += M.w[i] + (i > a ? M.sp : 0); return w; };
  const range = ([a, b]) => Array.from({ length: b - a }, (_, i) => a + i);
  const splits = (n, k) => {   // the ways to set n words on k lines: [[a, b], ...]
    if (k === 1 || n < 2) return [[[0, n]]];
    const out = [];
    for (let c = 1; c < n; c++) out.push([[0, c], [c, n]]);
    return out;
  };
  const pad = (s) => (o.mode === 'box' || o.mode === 'marker' ? 0.14 * s : 0);
  // place a candidate: one-line centre at o.y (default 1180 on 9:16, near the bottom elsewhere); more lines grow upward
  const place = (M, L) => {
    const sw = o.strokeK * M.s, lh = o.lineK * M.s, p = pad(M.s);
    const cy = o.y ?? (tall ? 1180 * H / 1920 : R.y1 - 0.75 * o.size);
    const bl = L.map((_, i) => cy + M.cap / 2 - (L.length - 1 - i) * lh);
    const asc = (i) => Math.max(...range(L[i]).map((k) => M.asc[k])), desc = (i) => Math.max(...range(L[i]).map((k) => M.desc[k]));
    const jit = o.boil ? 3 : 0, ly = (o.lift - 1) * M.s * 0.5;   // the boil's jitter and the active word's lift
    let y0 = bl[0] - asc(0) - sw / 2 - p - jit - ly, y1 = bl[bl.length - 1] + desc(L.length - 1) + sw / 2 + p + jit + ly;
    const shift = y1 > R.y1 ? R.y1 - y1 : y0 < R.y0 ? R.y0 - y0 : 0;
    y0 += shift; y1 += shift; for (let i = 0; i < bl.length; i++) bl[i] += shift;
    const x1 = R.railX != null && y1 > R.railY ? Math.min(R.x1, R.railX) : R.x1;
    const avail = x1 - R.x0, cx = o.x ?? (R.x0 + x1) / 2;
    const widths = L.map(([a, b]) => lineW(M, a, b)), wmax = Math.max(...widths);
    const lift = (o.lift - 1) * Math.max(...M.w);   // the active word grows about its own centre
    return { M, L, bl, y0, y1, cx, avail, need: wmax + sw + 2 * p + lift + 2 * jit, widths, sw, pad: p, lift, jit };
  };
  const n = strs.length, orphan = (L) => n >= 3 && L.some(([a, b]) => b - a === 1 && strs[a].length <= 3);
  let pick = null;
  const tryAt = (s, k, allowOrphan) => {
    const M = measure(s);
    let best = null;
    for (const L of splits(n, k)) {
      if (!allowOrphan && orphan(L)) continue;
      const P = place(M, L);
      if (P.need > P.avail) continue;
      const score = Math.max(...P.widths) + 0.3 * Math.abs(P.widths[0] - P.widths[P.widths.length - 1]);
      if (!best || score < best.score) best = { ...P, score };
    }
    return best;
  };
  // one line down to 80% of the size, then two lines down to minSize, then one line down to minSize: two big lines
  // read better than one small one
  for (let s = o.size; s >= Math.max(o.minSize, o.size * 0.8) - 1e-6 && !pick; s -= 2) pick = tryAt(s, 1, false);
  for (let s = o.size; s >= o.minSize - 1e-6 && !pick; s -= 2) pick = tryAt(s, 2, false) || tryAt(s, 2, true);
  for (let s = o.size; s >= o.minSize - 1e-6 && !pick; s -= 2) pick = tryAt(s, 1, false);
  let fit = 'ok';
  if (!pick) { fit = 'tight'; for (let s = o.minSize - 2; s >= o.floor && !pick; s -= 2) pick = tryAt(s, 2, true) || tryAt(s, 1, true); }
  if (!pick) { fit = 'overflow'; pick = place(measure(o.floor), splits(n, 2)[Math.floor((n - 1) / 2)] || [[0, n]]); }
  // word positions (left x of each word, its line's baseline) and the box, lift, jitter and stroke included
  const { M, L, bl, cx, widths, sw, lift, jit } = pick, p = pick.pad, xs = new Array(n), ys = new Array(n);
  let bx0 = 1e9, bx1 = -1e9;
  L.forEach(([a, b], li) => {
    let x = cx - widths[li] / 2;
    bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x + widths[li]);
    for (let i = a; i < b; i++) { xs[i] = x; ys[i] = bl[li]; x += M.w[i] + M.sp; }
  });
  const box = [bx0 - sw / 2 - p - lift / 2 - jit, pick.y0, bx1 + sw / 2 + p + lift / 2 + jit, pick.y1].map((v) => Math.round(v * 10) / 10);
  return { size: M.s, font: font(M.s), lines: L, widths, xs, ys, w: M.w, box, cx, cy: (pick.y0 + pick.y1) / 2, maxW: pick.avail - sw - 2 * p, lineH: o.lineK * M.s, sw, pad: p, fit };
}

// ---- the list (built once): TIMELINE.captions for review, TIMELINE.captionSafe for the box
function capList() {
  if (capCache) return capCache;
  const o = capOpts(); if (!o) return null;
  const src = capWords(o); if (!src) return null;
  const R = capRect(o);
  const chunks = capChunk(src.words, o).map((c) => {
    const strs = c.words.map((w) => (o.upper ? w.w.toUpperCase() : w.w));
    return { ...c, strs, text: strs.join(' '), L: capLayout(strs, o, R) };
  });
  capCache = { o, R, src: src.src, chunks, lines: src.lines };
  if (typeof TIMELINE !== 'undefined') {
    TIMELINE.captions = chunks.map((c) => ({ t0: +c.t0.toFixed(3), t1: +c.t1.toFixed(3), text: c.text, words: c.words, line: c.line, size: c.L.size, lines: c.L.lines.map(([a, b]) => c.strs.slice(a, b).join(' ')), box: c.L.box, fit: c.L.fit }));
    TIMELINE.captionSafe = { ...R, source: src.src, lines: src.lines, maxWords: o.maxWords };
  }
  return capCache;
}
// the chunk on screen at time t and its active word (-1 before the first word starts)
function capAt(t) {
  const K = capList(); if (!K) return null;
  const i = K.chunks.findIndex((c) => t >= c.t0 - 1e-6 && t < c.t1 - 1e-6); if (i < 0) return null;
  const c = K.chunks[i]; let a = -1;
  c.words.forEach((w, k) => { if (t >= w.t0 - 1e-6) a = k; });
  return { i, c, active: a };
}

// ---- drawing (screen space)
// the default lettering: an edge under every word, then the active word's box or marker swipe, then the fills
function capLetter(c, a, t, o) {
  const L = c.L;
  ctx.font = L.font; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.miterLimit = 2;
  const lift = (k) => (k === a ? 1 + (o.lift - 1) * springEase(t - c.words[k].t0, 900, 60) : 1);
  const at = (k, f) => {   // word k about its own centre: lifted when active, jittered on the boil when o.boil
    const s = lift(k), mx = L.xs[k] + L.w[k] / 2, my = L.ys[k] - L.size * 0.36;
    ctx.save();
    if (o.boil) { const R = RNG('capb', c.t0, k, B); ctx.translate(R.n(1.6), R.n(1.6)); ctx.translate(mx, my); ctx.rotate(R.n(0.014) + (k % 2 ? 0.008 : -0.008)); ctx.translate(-mx, -my); }
    if (s !== 1) { ctx.translate(mx, my); ctx.scale(s, s); ctx.translate(-mx, -my); }
    f(L.xs[k], L.ys[k]); ctx.restore();
  };
  ctx.globalAlpha = 0.4; ctx.strokeStyle = o.stroke; ctx.lineWidth = L.sw;   // a soft drop shadow
  c.strs.forEach((s, k) => at(k, (x, y) => ctx.strokeText(s, x + L.size * 0.03, y + L.size * 0.07)));
  ctx.globalAlpha = 1;
  c.strs.forEach((s, k) => at(k, (x, y) => ctx.strokeText(s, x, y)));
  if (a >= 0 && o.mode === 'box') at(a, (x, y) => {
    const p = L.pad;
    ctx.fillStyle = o.accent; ctx.beginPath(); ctx.roundRect(x - p, y - L.size * 0.8 - p * 0.3, L.w[a] + 2 * p, L.size * 0.98 + p * 0.6, L.size * 0.16); ctx.fill();
    ctx.strokeStyle = o.stroke; ctx.lineWidth = L.sw * 0.5; ctx.stroke();
  });
  // the fills: the active word in the accent (mode 'color') or ink on its box; under a marker it starts as paper
  c.strs.forEach((s, k) => at(k, (x, y) => { ctx.fillStyle = k === a && o.mode !== 'marker' ? (o.mode === 'color' ? o.accent : o.boxInk) : o.fill; ctx.fillText(s, x, y); }));
  if (a >= 0 && o.mode === 'marker') at(a, (x, y) => {   // a hand-drawn highlighter swipe across the word; the ink shows through it
    const p = L.pad, k = EZ.o2(clamp((t - c.words[a].t0) / 0.14)), top = y - capTop(L), bot = y + L.size * 0.12;
    const x0 = x - p, x1 = x0 + (L.w[a] + 2 * p) * k;
    if (k <= 0.02) return;
    const P = [[x0, top + 4], [x1, top - 2], [x1 + 6, (top + bot) / 2], [x1 - 2, bot + 6], [x0 + 4, bot + 2], [x0 - 6, (top + bot) / 2]];
    const Q = paint(P, { fill: o.accent, key: 'capmk' + c.t0, line: o.stroke, w: Math.max(2, L.sw * 0.35), amt: 2.2, tex: [{ k: 'hatch', a: -0.9, gap: 7, c: 'rgba(23,17,12,0.35)', al: 0.5 }] });
    ctx.save(); trace(Q, true); ctx.clip(); ctx.fillStyle = o.boxInk; ctx.fillText(c.strs[a], x, y); ctx.restore();
  });
}
const capTop = (L) => L.size * 0.86;
// STYLE.caption(words, activeIndex, x, y, size, o) is called once per line: words = that line's strings, x = the
// line's centre, y = its baseline, size in px; o = { maxW (the safe width), since (s since the active word began),
// count, upper, line / lines, t, t0, t1, pop, accent, fill, stroke, font, box, rect }. The chunk's pop is already
// applied to ctx (about the block's centre) unless STYLE.captionPop === false. Letter with fillText / strokeText.
function capFrame(t) {
  const K = capList(); if (!K) return;
  const hit = capAt(t); if (!hit) return;
  const { c, active } = hit, o = K.o, L = c.L;
  const pop = 0.8 + 0.2 * springEase(t - c.t0, 900, 60);   // critically damped: no overshoot past the fitted box
  capBusy = true;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none'; ctx.setLineDash([]);
  const st = typeof STYLE !== 'undefined' ? STYLE : {};
  if (st.captionPop !== false) { ctx.translate(L.cx, L.cy); ctx.scale(pop, pop); ctx.translate(-L.cx, -L.cy); }
  if (typeof st.caption === 'function') {
    L.lines.forEach(([a, b], li) => {
      ctx.save();
      st.caption(c.strs.slice(a, b), active >= a && active < b ? active - a : -1, L.cx, L.ys[a], L.size, {
        maxW: L.maxW, since: active >= 0 ? t - c.words[active].t0 : 1, count: b - a, upper: o.upper, line: li, lines: L.lines.length,
        t, t0: c.t0, t1: c.t1, pop, accent: o.accent, fill: o.fill, stroke: o.stroke, font: L.font, box: L.box, rect: K.R,
      });
      ctx.restore();
    });
  } else capLetter(c, active, t, o);
  ctx.restore();
  capBusy = false;
}
// manual mode (CAPTION_OPTS.auto = false): call at the end of every scene
function capDraw() {
  const t = F / FPS, f = () => capFrame(t);
  if (DEFER) DEFER.push(f); else f();
}
// auto mode: after every frame, through the style's post pass
try {
  const o0 = capOpts();
  if (!o0 || o0.auto !== false) {
    const capPost0 = STYLE.post;
    STYLE.post = function () { if (capPost0) capPost0.apply(this, arguments); capFrame(F / FPS); };
  }
  capList();   // fills TIMELINE.captions now when the words are already known (else on the first frame)
} catch (e) { console.warn('kit/captions.js: put "kit/captions.js" after "style" in piece.json "build" (' + e.message + ')'); }
window.capAt = capAt;
