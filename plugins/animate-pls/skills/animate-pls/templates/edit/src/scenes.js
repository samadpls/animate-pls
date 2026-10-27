// =====================================================================
//  SCENES — edit template, crosshatch. One continuous shot on a wooden desk, no cuts:
//    title    a paper note with the product's name, hand-lettered, the hero dot on its corner, a mug, a pencil
//    footage  the recording slides up onto the desk in an inked card (kit/footage.js: the card is framed by the
//             style's own window, the camera zooms on the recorder's events, the cursor, the click rings); the name
//             becomes a tag above it; one hand-lettered caption at a time under it; the hero watches from the side
//    end      the card slides away; the note is back with the call to action
//  Drawn things move on 2s (the style); the footage and the card move on every frame (ftNow), so the video stays smooth.
//  Layout per format from the card's rect and UNIT: 16:9 keeps the props in the side margins, 9:16 stacks.
// =====================================================================
const cu = TIMELINE.cues;
const edBox = { pad: 14, aspect: 1.5 };   // the recording has its own window bar, so no chrome here
const ED = (() => {
  const L = ftLayout('card', { name: 'app', ...edBox, top: (WIDE ? 75 : 150) * UNIT, bottom: (WIDE ? 85 : 250) * UNIT, margin: WIDE ? 230 : 60 });
  const c = L.card;
  // tall frames: the tag, the card and the caption as one group, centred in the band the platforms leave clear
  // (y 288-1248 on 9:16, with the button rail at x >= 780 below y 840: captions stay left of it)
  const band = PORTRAIT ? [288 * UNIT, 1248 * UNIT] : [SAFE.top, H - SAFE.bottom];
  if (!WIDE) { const above = 130 * UNIT, below = 150 * UNIT; c.y = band[0] + (band[1] - band[0] - (above + c.h + below)) / 2 + above; }
  return {
    card: c,
    cap: WIDE ? { x: CX, y: c.y + c.h + 40 * UNIT, size: 54 * UNIT } : { x: PORTRAIT ? 450 * UNIT : CX, y: c.y + c.h + 100 * UNIT, size: 56 * UNIT },
    tag: WIDE ? { x: c.x - 18 * UNIT, y: c.y - 34 * UNIT, size: 58 * UNIT } : { x: Math.max(c.x, 128 * UNIT), y: c.y - 62 * UNIT, size: 64 * UNIT },
    // the note sits under the card, a little smaller, so the card covers it completely on the way up
    note: PORTRAIT ? { x: 450 * UNIT, y: 640 * UNIT, w: 700 * UNIT, h: 470 * UNIT, rot: -0.025 }
      : { x: c.x + c.w / 2, y: c.y + c.h / 2, w: Math.min(900 * UNIT, c.w - 90 * UNIT), h: Math.min(470 * UNIT, c.h - 80 * UNIT), rot: -0.025 },
    hero: WIDE ? { x: c.x + c.w + 70 * UNIT, y: c.y + c.h - 70 * UNIT, r: 66 * UNIT } : { x: c.x + c.w - 40 * UNIT, y: c.y + c.h + 40 * UNIT, r: 62 * UNIT },
    mug: WIDE ? { x: W - 150 * UNIT, y: 190 * UNIT, r: 92 * UNIT } : { x: W - 120 * UNIT, y: SAFE.top + 40 * UNIT, r: 96 * UNIT },
    pencil: WIDE ? { x: 120 * UNIT, y: H - 230 * UNIT, a: -0.5 } : { x: 70 * UNIT, y: H - SAFE.bottom + 10 * UNIT, a: -0.35 },
  };
})();
// a spring on every frame (the card) and a pop on the style's 2s (drawn things)
const edCard = (t0, k = 70, d = 15) => springEase(ftNow() - t0, k, d);
const edPop = (t0, d = 0.3) => (TT < t0 ? 0 : EZ.back(clamp((TT - t0) / d)));

// ---- the note: a paper card on the desk with a hatched shadow; the name hand-lettered, underlined in red pencil
function edNote(line, lineAt) {
  const n = ED.note, k = WIDE ? 1 : 0.82;
  ctx.save(); ctx.translate(n.x, n.y); ctx.rotate(n.rot);
  paint(rrectPts(-n.w / 2 + 12, -n.h / 2 + 16, n.w, n.h, 14), { fill: 'rgba(58,36,23,0.3)', line: false, key: 'notesh', tex: [{ k: 'hatch', a: 0.8, gap: 4, al: 0.5 }] });
  paint(rrectPts(-n.w / 2, -n.h / 2, n.w, n.h, 14), { fill: C.paper, key: 'note', w: 3.2, tex: [{ k: 'pencil', c: '#e8d6b0', al: 0.5, per: 90 }] });
  ctx.save(); ctx.strokeStyle = C.paperLine; ctx.lineWidth = 1.4; ctx.beginPath();
  for (let y = -n.h / 2 + 70 * UNIT; y < n.h / 2 - 20 * UNIT; y += 58 * UNIT) { ctx.moveTo(-n.w / 2 + 16, y); ctx.lineTo(n.w / 2 - 16, y); }
  ctx.stroke(); ctx.restore();
  const ts = 120 * UNIT * k, tw = handW(PRODUCT.name, ts), tx = -tw / 2, ty = -n.h * 0.05;
  handText(PRODUCT.name, tx, ty, ts, C.ink, { key: 'name', frac: ev(0.15, 0.55) });
  planInk([[tx, ty + 26 * UNIT], [tx + tw * 0.45, ty + 30 * UNIT], [tx + tw, ty + 22 * UNIT]], { frac: ev(0.6, 0.35), key: 'under', w: 4 });
  if (line) { const ls = 56 * UNIT * k; handText(line, -handW(line, ls) / 2, ty + ls * 2.0, ls, '#8a5a3a', { key: 'line' + line, frac: ev(lineAt, 0.6) }); }
  ctx.restore();
}
function edProps() {
  const m = ED.mug, p = ED.pencil;
  inkMug(m.x, m.y, m.r, 'mug');
  drawPencil(p.x, p.y, p.a, 330 * UNIT, UNIT, 'pencil');
}
// ---- one hand-lettered caption at a time, each from its event to the next one
function edCaptions(off) {
  const times = CAPTIONS.map((c, i) => {
    const e = ftEvent('app', c.at), o = e ? ftOut('app', e.t0 ?? e.t) : null;
    return o != null ? o + (c.dt ?? 0) : CLIP.t0 + 1.4 + i * 2.6;   // before the footage exists: spread out
  });
  for (let i = 0; i < CAPTIONS.length; i++) {
    const t0 = times[i], t1 = i + 1 < times.length ? times[i + 1] : T_END;
    if (TT < t0 || TT >= t1) continue;
    const c = ED.cap;
    inkCard(CAPTIONS[i].text, c.x, c.y + off, c.size, { rot: i % 2 ? 0.014 : -0.012, s: edPop(t0, 0.25), frac: ev(t0 + 0.12, 0.45) });
  }
}
// ---- the hero watches the card from the side: wide-eyed at each click, happy once the app answers
function edHero(off) {
  const h = ED.hero, s = ftSrc('app', TT), clicks = ftEvents('app', 'click'), done = ftEvent('app', 'mark:#stage');
  const mood = done && s >= done.t + 0.3 ? 'happy' : clicks.some((e) => s >= e.t - 0.1 && s < e.t + 0.7) ? 'wow' : null;
  dotHero(h.x, h.y + off, h.r, { key: 'hero', mood });
}

function sceneEdit() {
  woodSurface(-40, -40, W + 40, H + 40, 'desk');
  const rise = edCard(cu.card), sink = edCard(cu.end, 60, 14);
  const c = ED.card, off = H - c.y + 60 * UNIT, dy = (1 - rise) * off + sink * off;
  const up = TT >= cu.card && c.y + dy < H;
  // the note under the card: the title, then the end note (the card slides over it and away again)
  const heroOnCard = up && rise > 0.6 && sink < 0.2;
  if (!(rise > 0.999 && sink < 0.001)) {
    const end = TT > cu.end;
    edNote(end ? PRODUCT.end : PRODUCT.line, end ? cu.end + 0.5 : 0.55);
    const n = ED.note, hx = n.x + n.w / 2 - 70 * UNIT, hy = n.y + n.h / 2 - 40 * UNIT;
    const hop = end ? Math.max(0, Math.sin(clamp((TT - cu.hop2) / 0.36) * Math.PI)) * 46 * UNIT : 0;
    if (!heroOnCard) dotHero(hx, hy - hop, 64 * UNIT, { key: 'hero', mood: end ? 'happy' : null });
  }
  edProps();
  if (up) {
    ftCard('app', c.x, c.y + dy, c.w, c.h, { ...edBox, radius: 20, key: 'card' });
    if (heroOnCard) edHero(dy);
    // the name, now a tag above the card
    const tg = ED.tag, s = edPop(cu.card + 0.45) * (1 - clamp((TT - cu.end) / 0.2));
    if (s > 0.01) inkCard(PRODUCT.name, tg.x + (handW(PRODUCT.name, tg.size) + tg.size * 0.9) / 2, tg.y + dy, tg.size, { rot: -0.03, s });
    edCaptions(dy);
  }
}
