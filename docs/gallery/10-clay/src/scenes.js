// =====================================================================
//  SCENES — "Four years of showing up" tile (clay). World 1080x1080; time TT on 2s (stop motion).
//  A felt wall and a butter-clay table. Left to right: a plant, the laptop (its first program on the screen, a
//  ctrl+c note stuck to the lid), the coral hero typing, and the year-blocks 1-2-3, onto which 4 drops.
//  Coral is the hero's alone. Background life: the clock's second hand, steam, the snail, the plant, the cursor.
// =====================================================================
const T13 = { table: 700, depth: 300, back: 836, hero: [768, 722, 132], blk: { x: 958, s: 84, step: 86 } };
const T13_BLK = [CLAY.mustard, CLAY.teal, CLAY.rose, CLAY.blue];

// the screen: hello, world typed one key at a time, then a blinking cursor
function t13Screen(x, y, w, h) {
  const cu = TIMELINE.cues, size = 64, y1 = y + h * 0.4, y2 = y1 + 86;
  ctx.font = `700 ${size}px ${MONO}`; ctx.textBaseline = 'alphabetic';
  const n1 = clamp(Math.floor((TT - cu.type1) / 0.08) + 1, 0, 6), n2 = clamp(Math.floor((TT - cu.type2) / 0.08) + 1, 0, 5);
  const l1 = 'hello,'.slice(0, n1), l2 = 'world'.slice(0, n2), cw = ctx.measureText('M').width;
  ctx.fillStyle = CLAY.glow;
  if (l1) ctx.fillText(l1, x + 36, y1);
  if (l2) ctx.fillText(l2, x + 36, y2);
  // the cursor: a block on the line being typed, blinking once the line is done
  const typing = TT < cu.type2 + 0.45, row = n1 < 6 ? 0 : 1, col = row ? n2 : n1;
  if (typing || Math.floor(TT * 2.4) % 2 === 0) { ctx.fillStyle = 'rgba(159,227,201,0.9)'; ctx.fillRect(x + 36 + col * cw + 4, (row ? y2 : y1) - size * 0.68, cw * 0.55, size * 0.78); }
}

// the year-blocks: 1-2-3 stacked from the first frame; 4 drops at cu.drop and lands (squash) at cu.land
function t13Blocks() {
  const cu = TIMELINE.cues, { x, s, step } = T13.blk, y0 = T13.back;
  for (let i = 0; i < 3; i++) {
    const land = TT >= cu.land && TT < cu.land + 0.09 ? 1 - 0.03 * (3 - i) / 3 : 1;   // the stack gives a little on impact
    ctx.save(); ctx.translate(x, y0); ctx.scale(1, land); ctx.translate(-x, -y0);
    clayBlock(x, y0 - i * step * land, s, String(i + 1), T13_BLK[i], { contact: i === 0 });
    ctx.restore();
  }
  if (TT < cu.drop) return;
  const rest = y0 - 3 * step, u = EZ.i2(seg(TT, cu.drop, cu.land)), y = lerp(rest - 420, rest, u);
  // its shadow on block 3 sharpens as it comes down
  clayContact(x + 4, rest - s - 2, s * 0.55 * (0.6 + 0.4 * u), s * 0.08, 0.15 + 0.3 * u);
  const dt = TT - cu.land, [sx, sy] = dt < 0 ? [0.94, 1.1] : dt < 0.08 ? [1.16, 0.8] : dt < 0.16 ? [0.96, 1.06] : [1, 1];
  ctx.save(); ctx.translate(x, y); ctx.scale(sx, sy); ctx.rotate(dt < 0 ? -0.05 * (1 - u) : 0); ctx.translate(-x, -y);
  clayBlock(x, y, s, '4', T13_BLK[3], { contact: false });
  ctx.restore();
  // a puff of clay crumbs at the landing
  if (dt >= 0 && dt < 0.3) {
    const k = dt / 0.3, R = RNG('crumbs');
    for (let i = 0; i < 7; i++) {
      const side = i % 2 ? 1 : -1, vx = R.r(40, 110) * side, vy = R.r(-70, -20), px = x + side * s * 0.5 + vx * k, py = rest - 4 + vy * k + 260 * k * k;
      ctx.save(); ctx.translate(px, py);
      clayPiece('crumb' + i, clayBean(0, 0, R.r(8, 13), R.r(6, 10), 'cr' + i, 1), T13_BLK[3], { bevel: 2, shine: 0.6, shadow: false, speckle: 0, prints: 0, marks: 0 });
      ctx.restore();
    }
  }
}

// the hero: types with its left arm (on 2s the hand jumps between keys), looks up as the block drops,
// a wow on the landing, cheers with its right arm, then settles to a smile and a blink
function t13Hero() {
  const cu = TIMELINE.cues, [x, y, r] = T13.hero;
  const typing = TT >= cu.type1 && TT < cu.drop + 0.08, tap = typing ? (B % 2 ? 0.09 : -0.05) : 0;
  let look = [-1, 0.45], mood = 'focus';
  if (TT >= cu.drop) { look = [0.9, -0.95]; mood = 'focus'; }
  if (TT >= cu.land) { look = [1, -0.35]; mood = 'wow'; }
  if (TT >= cu.land + 0.25) { look = [0.7, -0.25]; mood = 'smile'; }
  if (TT >= cu.blink && TT < cu.blink + 0.09) mood = 'blink';
  const up = TT >= cu.cheer && TT < cu.down;
  const arms = [
    { side: -1, a: 0.78 + tap, len: 98, front: true },
    { side: 1, a: up ? -1.38 + (B % 2 ? 0.1 : -0.04) : 1.25, len: up ? 128 : 66, front: false },
  ];
  const hop = TT >= cu.land && TT < cu.land + 0.17 ? 10 : 0, sq = TT >= cu.land + 0.17 && TT < cu.land + 0.25 ? 0.25 : 0;
  clayHero(x, y, r, { key: 'hero', look, mood, arms, hop, squash: sq });
}

function sceneTile() {
  const cu = TIMELINE.cues;
  clayFelt(CLAY.felt);
  clayClock(822, 196, 86, { at: 17, h: 8, m: 40 });
  clayTable(T13.table, T13.depth, CLAY.butter);
  // the title: rolled clay letters, popped one by one
  clayLetters('four years', 70, 192, 124, CLAY.cocoa, { pop: cu.title, by: 'letter', gap: 0.045 });
  clayLetters('of showing up', 74, 307, 88, CLAY.cocoa, { pop: cu.title2, by: 'letter', gap: 0.045 });
  clayPlant(130, T13.back, 190);
  clayLaptop(452, T13.back, 470, { screen: t13Screen });
  clayNote(662, 470, 222, 176, ['ctrl+c', '= copy'], { size: 52, font: HAND, rot: 0.08 });
  t13Blocks();
  t13Hero();
  clayMug(240, 975, 48, CLAY.teal);
  claySnail(500 + TT * 14, 978, 84, {});
}
