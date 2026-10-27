// =====================================================================
//  SCENE — gallery tile 16 (comic). One page, two panels. World = screen (1080x1080); TT on 2s.
//  Panel A: both characters edit the line COMMITT FI! at once: the cyan one pulls out the T at 5 (DELETE @5), the
//  red hero brings an X for the gap at 10 (INSERT X @10). The ops fly down across the gutter as balloons.
//  Panel B (the server): the delete lands first, the tiles close up, the insert's 10 is struck to 9, the X snaps in.
// =====================================================================
const OG = {
  A: [60, 60, 960, 522], B: [60, 604, 960, 416],   // panels: x, y, w, h (a 22px gutter between them)
  tw: 76, th: 84, tg: 6, tx0: 92,                    // letter tiles: width, height, gap, x of slot 0
  ay: 482, by: 912,                                  // tile tops in panel A and in panel B
  word: 'COMMITT FI!',
  partner: [446, 418, 64], hero: [968, 414, 64],     // x, y, r
};
const ogSlot = (i) => OG.tx0 + i * (OG.tw + OG.tg);
const ogCu = TIMELINE.cues;

// a letter tile: a printed cream block with a hard ink edge, the letter, and its position number in the corner
function ogTile(ch, idx, x, y, o = {}) {
  const w = OG.tw, h = OG.th, key = o.key ?? 'tl' + idx + ch;
  ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(o.rot ?? 0); ctx.scale(o.s ?? 1, o.s ?? 1); ctx.translate(-w / 2, -h / 2);
  cmPath(rrectPts(5, 7, w, h, 10, 3)); ctx.fillStyle = CM.ink; ctx.fill();
  cmShape(rrectPts(0, 0, w, h, 10, 3), { raw: true, fill: o.fill ?? CM.paperL, tint: o.tint, tr: 2.3, tgap: 8, w: 3.6, key, lit: 0.8, heavy: 1.2 });
  if (ch !== ' ') { ctx.font = `700 56px ${CM_LETTER}`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = o.c ?? CM.ink; ctx.fillText(ch, w / 2 - 2, 58); }
  if (idx != null) { ctx.font = `700 19px ${CM_LETTER}`; ctx.textAlign = 'right'; ctx.fillStyle = o.ic ?? CM.grey; ctx.fillText(String(idx), w - 7, h - 7); }
  ctx.restore();
}

// ---- panel A: the clients (both edit at the same moment)
function ogPanelA() {
  const [px, py, pw, ph] = OG.A;
  cmDotField('a-ramp', px, py, pw, ph, CM.yellow, 13, 30, (u, v) => 0.42 + 0.5 * v);
  cmSpeed(700, 430, 150, 900, 46, { key: 'focusA', w: 5, al: 0.9, hold: 1 });
  const lift = EZ.o3(seg(TT, ogCu.lift, ogCu.lift + 0.25));
  // the line both are editing: slot 5's T is out (the partner holds it), slot 10 has a gap marker for the X
  for (let i = 0; i < 11; i++) if (!(i === 5 && lift > 0)) ogTile(OG.word[i], i, ogSlot(i), OG.ay, { tint: i === 5 ? CM.cyanL : null });
  if (lift > 0) {   // the empty slot 5, outlined in cyan dashes
    ctx.save(); ctx.setLineDash([10, 8]); ctx.lineWidth = 4; ctx.strokeStyle = CM.cyanD; ctx.strokeRect(ogSlot(5) + 4, OG.ay + 4, OG.tw - 8, OG.th - 8); ctx.restore();
  }
  // the hero's insertion caret between slots 9 and 10 (a proofreader's red wedge)
  const gx = ogSlot(10) - OG.tg / 2, cy = OG.ay - 6;
  cmShape([[gx - 22, cy - 2], [gx, cy - 40], [gx + 22, cy - 2], [gx, cy - 18]], { raw: true, fill: CM.red, w: 3.5, key: 'caret', mis: false });
  // the partner (cyan) lifts the T out; the hero (red) holds up the X
  const [ax, ay, ar] = OG.partner, [hx, hy, hr] = OG.hero, shouting = TT >= ogCu.shout && TT < ogCu.snap, after = TT >= ogCu.snap;
  const tT = [lerp(ogSlot(5) + OG.tw / 2, 586, lift), lerp(OG.ay + OG.th / 2, 340, lift)], tX = [lerp(hx - 40, 846, EZ.o3(seg(TT, ogCu.lift, ogCu.lift + 0.25))), lerp(hy + 30, 372, EZ.o3(seg(TT, ogCu.lift, ogCu.lift + 0.25)))];
  const look = after ? [0.35, 0.9] : [0.7, -0.3];
  cmHero(ax, ay, ar, { key: 'partner', fill: CM.cyan, shade: CM.cyanD, mood: after ? 'happy' : shouting ? 'shout' : 'grit', look, feet: false, spark: false,
    arms: lift > 0 ? [[tT[0] - 40, tT[1] + 10], [tT[0] - 6, tT[1] + 44]] : [[ax + 50, ay + 50]], squash: TT < ogCu.lift ? 0.12 : -0.04 });
  if (lift > 0) ogTile('T', 5, tT[0] - OG.tw / 2, tT[1] - OG.th / 2, { rot: 0.22 * lift, tint: CM.cyanL, key: 'liftT' });
  cmHero(hx, hy, hr, { key: 'hero', mood: after ? 'happy' : shouting ? 'shout' : 'grit', look: after ? [-0.3, 0.9] : [-0.8, -0.2], feet: false,
    arms: [[tX[0] + 42, tX[1] + 8], [tX[0] + 10, tX[1] + 44]], squash: TT < ogCu.lift ? 0.12 : -0.04 });
  ogTile('X', null, tX[0] - OG.tw / 2, tX[1] - OG.th / 2, { rot: -0.16, c: CM.red, tint: CM.redL, key: 'holdX' });
  if (TT >= ogCu.shout && TT < ogCu.shout + 0.6) { cmEmanata(ax, ay, ar * 1.15, 4, { key: 'emA', a0: -2.6, span: 1.0 }); cmEmanata(hx, hy, hr * 1.15, 4, { key: 'emH', a0: -2.2, span: 1.1 }); }
}

// ---- panel B: the server applies them in order and transforms the later one
function ogPanelB() {
  const [px, py, pw, ph] = OG.B;
  cmDotField('b-ramp', px, py, pw, ph, 'rgba(60,46,36,0.5)', 12, 15, (u, v) => 0.18 + 0.42 * v * v);
  // tiles: T(5) pops out; 6..10 close up by one slot; '!' steps right and the X drops into 9
  const close = EZ.o3(seg(TT, ogCu.close, ogCu.close + 0.25)), open = EZ.o3(seg(TT, ogCu.drop, ogCu.drop + 0.17));
  for (let i = 0; i < 11; i++) {
    if (i === 5) continue;
    let s = i > 5 ? i - close : i;
    if (i === 10) s += open;
    ogTile(OG.word[i], Math.round(s), ogSlot(s), OG.by, { key: 'bt' + i });
  }
  if (TT < ogCu.pop) ogTile('T', 5, ogSlot(5), OG.by, { key: 'bt5', tint: TT >= ogCu.del + 0.3 ? CM.cyanL : null });
  else if (TT < ogCu.pop + 0.5) {   // the deleted T spins off up and to the left
    const u = (TT - ogCu.pop) / 0.5;
    ogTile('T', null, ogSlot(5) - 260 * u, OG.by - 150 * u - 380 * u * (1 - u) * 1.2, { rot: -2.6 * u, tint: CM.cyanL, key: 'flyT', s: 1 - 0.3 * u });
  }
  // a puff where the T came out, drifting up through the calm
  if (TT >= ogCu.pop) {
    const u = TT - ogCu.pop, k = 1 - 0.35 * clamp(u / 2);
    cmCloud(ogSlot(5) + 30 - u * 12, OG.by - 30 - u * 34, 42 * k, 26 * k, { key: 'puff', n: 7, shade: CM.cyanL, w: 3.4 });
  }
  // the X lands in slot 9
  if (TT >= ogCu.drop) {
    const u = EZ.i2(seg(TT, ogCu.drop, ogCu.snap)), land = TT >= ogCu.snap, sq = land ? Math.exp(-(TT - ogCu.snap) * 9) * 0.25 : 0;
    ogTile('X', 9, ogSlot(9), lerp(820, OG.by, u), { c: CM.red, tint: CM.redL, key: 'landX', ic: CM.redD, s: 1 + sq });
    if (land) { const R = RNG('tw', Math.floor(B / 2)); for (let i = 0; i < 4; i++) cmSpark(ogSlot(9) + OG.tw / 2 + Math.cos(i * 1.6 + 0.4) * 72, OG.by + 30 + Math.sin(i * 1.6 + 0.4) * 62, (9 + 6 * R.f()) * (TT < ogCu.snap + 0.3 ? 1.6 : 1)); }
  }
}

// ---- the ops as balloons: they leave panel A, cross the gutter and arrive at the server in order
function ogOps() {
  const [ax, ay] = OG.partner, [hx, hy] = OG.hero;
  const pop = popS(ogCu.shout);
  // the shouts in panel A (they stay: the clients' own view)
  cmBalloon([[['DELETE ', CM.ink], ['@5', CM.cyanD]]], 282, 262, { kind: 'shout', size: 58, tail: [ax - 20, ay - 70], pop, tint: CM.cyanL, key: 'shA' });
  cmBalloon([[['INSERT ', CM.ink], ['X', CM.red], [' @10', CM.red]]], 730, 232, { kind: 'shout', size: 58, tail: [hx - 30, hy - 72], pop: popS(ogCu.shout + 0.04), tint: CM.redL, key: 'shH' });
  // DELETE @5 flies down first and bursts on arrival
  if (TT >= ogCu.del && TT < ogCu.pop) {
    const u = EZ.io(seg(TT, ogCu.del, ogCu.pop - 0.08)), x = lerp(282, 330, u), y = lerp(262, 806, u);
    if (u < 0.95) cmStreaks(x, y - 40, -Math.PI / 2 - 0.1, 5, 160, { len: 150, key: 'dstk', w: 4 });
    cmBalloon([[['DELETE ', CM.ink], ['@5', CM.cyanD]]], x, y, { size: 50, tail: [ogSlot(5) + OG.tw / 2, OG.by - 6], tint: CM.cyanL, key: 'flyD', pop: 0.85 + 0.15 * u });
  }
  if (TT >= ogCu.pop && TT < ogCu.pop + 0.42) { cmBurst(ogSlot(5) + 40, OG.by - 40, 110, 80, { key: 'popB', fill: CM.cyanL, n: 11 }); cmSfx('POP!', ogSlot(5) + 40, OG.by - 38, 74, { fill: CM.paperL, dots: CM.cyan, pop: popS(ogCu.pop), rot: -0.12 }); }
  // INSERT X @10 follows; on the server its 10 is struck to 9 and its tail swings from slot 10 to slot 9
  if (TT >= ogCu.ins) {
    const u = EZ.o3(seg(TT, ogCu.ins, ogCu.ins + 0.375)), x = lerp(730, 430, u), y = lerp(232, 814, u);
    const nine = TT >= ogCu.nine, sw = EZ.back(seg(TT, ogCu.nine, ogCu.nine + 0.25));
    const tip = [lerp(ogSlot(10) + 6, ogSlot(9) + OG.tw / 2, nine ? sw : 0), OG.by - 8];
    if (u < 0.97) cmStreaks(x + 120, y - 50, -Math.PI / 2 + 0.5, 6, 200, { len: 190, key: 'istk', w: 4 });
    const line = nine ? [['INSERT ', CM.ink], ['X', CM.red], [' @9', CM.red]] : [['INSERT ', CM.ink], ['X', CM.red], [' @10', CM.red]];
    const s = nine ? 1 + 0.12 * Math.exp(-(TT - ogCu.nine) * 10) : 0.9 + 0.1 * u;
    const b = cmBalloon([line], x, y, { size: 64, tail: tip, tint: CM.redL, key: 'flyI', pop: s, bend: 0.12 });
    if (TT >= ogCu.strike) {   // the editor's mark: 10 struck through in red, the 9 written in its place
      const w0 = cmTextW('INSERT X @', 64), w1 = cmTextW('INSERT X @10', 64), lx = x - w1 / 2 + w0;
      if (!nine) cmLine([[lx - 6, y + 22], [lx + (w1 - w0) + 8, y - 26]], 9, 'strike', { c: CM.red, frac: ev(ogCu.strike, 0.1) });
      else {
        const mx = x + b.rx - 46, my = y - b.ry - 26;
        ctx.save(); ctx.translate(mx, my); ctx.rotate(-0.08); ctx.font = `700 46px ${CM_LETTER}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = CM.redD; ctx.fillText('10', 0, 0); ctx.restore();
        cmLine([[mx - 34, my + 18], [mx + 34, my - 18]], 7, 'strike2', { c: CM.red });
        cmLine([[mx + 30, my + 10], [mx + 42, my + 34], [mx + 36, my + 48]], 5, 'strike3', { c: CM.red, taper: 0.5 });
      }
    }
  }
  if (TT >= ogCu.snap) cmSfx('SNAP!', 846, 786, 116, { pop: popS(ogCu.snap), rot: -0.13, fill: CM.yellow, dots: CM.red });
}

function sceneOps() {
  cmPage();
  cmPanel(...OG.A, { bg: CM.paperL, fn: ogPanelA, key: 'pA' });
  cmPanel(...OG.B, { bg: CM.paperL, fn: ogPanelB, key: 'pB' });
  ogOps();
  cmBox2('OPERATIONS, NOT STATE', 60, 60, 62, { font: CM_SFX, weight: 400, rot: 0, spacing: 0.02 });
  cmBox2('DELETE FIRST, SO...', 60, 604, 56, { font: CM_SFX, weight: 400, rot: 0, pop: popS(ogCu.pop), spacing: 0.02 });
}
