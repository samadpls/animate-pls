// =====================================================================
//  SCENES — gallery tile 11 (kinetic). World = screen (no camera), time TT on 1s.
//  The motto as a center-built stack, left-aligned on one edge: every row is fit to the column with kinFit,
//  each new row grows into its slot and pushes the stack up, so the frame is never empty and nothing overlaps.
//  Right column: the hero beside BUILD IT, a tick beside TEST IT, an arrow from LEAVE IT down into the box.
// =====================================================================
const cu = TIMELINE.cues;
const TX = 100, TX1 = 1080 - 72;      // the text column: rows start at TX; the keyword box hangs into the margin
function tileRows() {
  const mw = TX1 - TX;
  const rows = [
    { s: 'BUILD IT,', t: cu.build, kind: 'fill', wf: 0.64 },
    { s: 'TEST IT,', t: cu.test, kind: 'outline', wf: 0.64, sw: 9 },
    { s: 'LEAVE IT', t: cu.leave, kind: 'fill', wf: 0.64 },
    { swap: [[cu.asis, 'AS IS.'], [cu.flip, 'BETTER.']], fit: ['AS IS.', 'BETTER.'], t: cu.asis, kind: 'key', box: cu.box, rot: -0.035, wf: 0.9 },
  ];
  rows.forEach((r) => { r.size = kinFit(r.fit ?? r.s, mw * r.wf); });
  const gap = 0.15 * kinCapK() * rows[0].size;
  return { rows, gap, cy: 548 };
}
// draw fn() rotated with a keyword row's box (about the box centre)
function withBox(b, rot, fn) {
  const R = b.box, cx = R.x + R.w / 2, cy = R.y + R.h / 2;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); ctx.translate(-cx, -cy); fn(R); ctx.restore();
}
function sceneTile() {
  kinGround();
  const { rows, gap, cy } = tileRows();
  const out = kinBuild(rows, { x: TX, cy, gap, align: 'left' });
  const [b0, b1, b2, b3] = out;
  // AS IS. is struck out (a bar drawn across it) just before it flips to BETTER.
  if (b3 && TT >= cu.strike && TT < cu.flip - 0.08) withBox(b3, rows[3].rot, () => kinUnderline(b3.x0 - 14, b3.y - b3.cap * 0.56, b3.w + 28, (TT - cu.strike) / 0.22, { h: 30, color: kinFg() }));
  // the tick: TEST IT, passed
  if (b1) kinTick(b1.x1 + 92, b1.y - b1.cap * 0.5, 64, { frac: ev(cu.tick, 0.18), color: kinFg() });
  // the arrow: from beside LEAVE IT down into the box
  if (b2 && b3 && b3.boxed) kinArrow(b2.x1 + 70, b2.y - b2.cap * 0.62, b3.box.x + b3.box.w - 120, b3.box.y + 2, { frac: ev(cu.arrow, 0.28), bend: -0.42, w: 15, color: kinFg() });
  // emphasis marks off the box's far corner once it has landed
  if (b3 && b3.boxed) withBox(b3, rows[3].rot, (R) => kinMarks(R.x + R.w + 6, R.y + R.h + 4, 54, Math.PI * 0.22, cu.marks, { color: kinFg() }));
  // BETTER shines: two paper sparkles that pop in after the box and twinkle through the hold
  if (b3 && b3.boxed) [[b3.box.x + 44, b3.box.y + b3.box.h + 58, 0, 30], [TX + 6, b0.top - 62, 1.7, 24]].forEach(([x, y, ph, r], i) => {
    const k = kinBack((TT - cu.marks - 0.1 * i) / 0.25) * (0.75 + 0.25 * Math.cos(TT * TAU * 0.9 + ph));
    if (TT > cu.marks + 0.1 * i) star4(x, y, r * k, kinFg());
  });
  // the hero: beside BUILD IT, watching each new row; it hops when BETTER is boxed
  if (b0) {
    const hr = 92, hx = TX1 - hr - 10, q = (TT - cu.hop) / 0.34, hop = q > 0 && q < 1 ? 4 * q * (1 - q) * 70 : 0;
    const newest = out.length - 1, look = newest === 0 ? [-1, 0] : [-0.85, Math.min(1, 0.35 * newest)];
    kinHero(hx, b0.y - b0.cap * 0.48 - hop, hr, { key: 'hero', land: TT > cu.hop + 0.34 ? cu.hop + 0.34 : null, look, spin: 0.35, blink: 60 });   // blinks at frames 2 and 64 (in the closing hold), not on the thumbnail
  }
}
