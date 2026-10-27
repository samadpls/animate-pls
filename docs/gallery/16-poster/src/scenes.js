// =====================================================================
//  SCENES — "The hundredth question" tile (poster). World 1080x1080; time TT on 2s (each pull of the print).
//  Back to front: the stock, a quiet tan sunburst turning about the sun, rainbow bands sliding in around it, striped
//  hills, the sleepy sun, the huge 100 (stamped digit by digit), the arched headline, the ribbon with "on a slow day".
//  The sun's gold is the hero's alone. Background life: the rays turn, gulls flap across, z's drift up from the sun,
//  twinkles pulse, the bands' registration shifts every pull.
// =====================================================================
const T21 = { sun: [540, 872, 118], arc: [540, 900, 610], hill: 952 };

function t21Hills() {
  // two rolling hills in stripes (left olive, right teal), then the near ground in brown
  const L = [], Rr = [];
  for (let i = 0; i <= 40; i++) { const x = -40 + i * 16; L.push([x, T21.hill - 70 + Math.pow((x - 170) / 330, 2) * 70]); }
  for (let i = 0; i <= 40; i++) { const x = 1120 - i * 16; Rr.push([x, T21.hill - 60 + Math.pow((x - 900) / 320, 2) * 60]); }
  pstFill([...L, [600, 1120], [-40, 1120]], 'olive');
  pstStripes(L.map(([x, y]) => [x, y + 34]), ['mustard', 'olive', 'mustard'], 9, { gap: 9 });
  pstFill([...Rr, [480, 1120], [1120, 1120]], 'teal');
  pstStripes(Rr.map(([x, y]) => [x, y + 30]), ['cream', 'teal', 'cream'], 8, { gap: 9 });
}

function t21Ribbon(x, y, w, h, k) {
  // a ribbon unrolling from the centre: brown band with notched ends, an orange echo above and below
  if (k <= 0) return;
  const hw = w / 2 * EZ.o3(k), nh = h * 0.5;
  const band = [[x - hw, y - h / 2], [x + hw, y - h / 2], [x + hw - nh * 0.6, y], [x + hw, y + h / 2], [x - hw, y + h / 2], [x - hw + nh * 0.6, y]];
  pstShape(band, 'brick', { kw: 5, rings: [['paper', 7], ['orange', 10]] });
}

function t21Zs(x, y) {
  // z's drift up and right from the sleeping sun, three at a time, fading by shrinking (no alpha in print)
  for (let i = 0; i < 3; i++) {
    const p = ((TT * 0.42 + i / 3) % 1), s = (58 + 34 * p) * (p < 0.85 ? 1 : 1 - (p - 0.85) / 0.15);
    if (s < 6) continue;
    pstType('z', x + 40 + p * 90 + Math.sin(p * 9) * 8, y - 10 - p * 85, s, { fill: 'cream', rings: [['brown', 5]], rot: -0.25 + p * 0.3, fat: 0.02 });
  }
}

function sceneTile() {
  const cu = TIMELINE.cues, [sx, sy, sr] = T21.sun;
  pstPaper();
  // the sunburst: mustard rays on tan, turning slowly about the sun, with the stock left bare around it
  pstSunburst(sx, sy, 28, -Math.PI / 2 + TT * 0.07, ['mustard', 'tan'], { r0: sr * 1.7 });
  // a cloud and gulls drifting in the top corners
  pstCloud(890 - TT * 9, 150, 70);
  pstBird(140 + TT * 20, 140, 44, { phase: 0 }); pstBird(250 + TT * 20, 184, 32, { phase: 1 });
  // rainbow bands around the sun, sliding in from the left (inner first)
  const [ax, ay] = T21.arc;
  pstRainbow(ax, ay, 252, ['brick', 'orange', 'cream', 'teal'], 40, Math.PI, TAU, { gap: 10, sweep: ev(cu.bands, 0.75), stagger: 0.18 });
  // the sleepy sun behind the hills: dozing, a big yawn, then one heavy-lidded eye peeks out
  const yawn = TT < cu.yawn ? 0 : Math.sin(clamp((TT - cu.yawn) / 0.5) * Math.PI), peek = ev(cu.peek, 0.17);
  pstSun(sx, sy, sr, { key: 'sun', mood: 'sleepy', lids: [0, peek > 0 ? 0.2 + 0.25 * peek : 0], yawn, noBlink: true, look: [-0.5, -0.4] });
  t21Hills();
  t21Zs(sx + sr * 0.55, sy - sr * 0.35);
  // twinkles
  [[118, 330, 0], [972, 330, 1], [930, 610, 2], [150, 640, 1]].forEach(([x, y, p]) => pstTwinkle(x, y, 20, 'cream', p));
  // the huge 100, digit by digit: cream over mustard, a brown key, a knocked-out gap and a brick echo (one merged echo)
  const dsz = 330, digs = ['1', '0', '0'], dw = digs.map((d) => pstTextW(d, dsz)), kern = -6;
  const tot = dw.reduce((a, b) => a + b, 0) + kern * 2, runs = [];
  let x = 540 - tot / 2;
  const st = digs.map((d, i) => pstStamp(cu.digits[i], { big: 1.12 }));
  digs.forEach((d, i) => { runs.push([d, x + dw[i] / 2, 0, 0, st[i].s]); x += dw[i] + kern; });
  pstType('100', 0, 650, dsz, { runs: runs.map(([d, rx, ry, rr, rs]) => [d, rx, ry, rr, rs]), pivot: dsz * 0.36, grow: st[0].grow, fill: 'cream', split: ['mustard', 0.3], rings: [['brown', 8], ['paper', 11], ['brick', 15], ['paper', 7], ['brown', 7]], fat: 0.02 });
  runs.forEach(([, rx], i) => pstHitTicks(rx, 530, dw[i] * 0.62, 180, st[i].hit, { key: 'd' + i, n: 9, len: 30 }));
  // the headline along an arch over the 100
  const hs = pstStamp(cu.head, { big: 1.05, ripple: 0.35 });
  pstArcType('the hundredth question', 540, 1110, 920, 64, { s: hs.s, grow: hs.grow, fill: 'brown', rings: [['paper', 7], ['orange', 10]], track: 0.015, fat: 0.015 });
  // the ribbon: on a slow day
  t21Ribbon(540, 968, 600, 86, ev(cu.ribbon, 0.25));
  const ss = pstStamp(cu.slow, { big: 1.18 });
  pstType('on a slow day', 540, 988, 60, { s: ss.s, grow: ss.grow, fill: 'cream', rings: [['brown', 5]], fat: 0.015, italic: true });
  t21Border();
}
// the sheet's margin: the print stops 30px short of the edge, a brown key rule around it
function t21Border() {
  const m = 30, P = [[-50, -50], [W + 50, -50], [W + 50, H + 50], [-50, H + 50]], Q = [[m, m], [m, H - m], [W - m, H - m], [W - m, m]];
  ctx.save(); ctx.beginPath(); pstPath(P, 0, 0, false); pstPath(Q, 0, 0, false); ctx.fillStyle = PST.paper; ctx.fill('evenodd');
  ctx.strokeStyle = PST.brown; ctx.lineWidth = 5; pstPath(Q); ctx.stroke(); ctx.restore();
}
