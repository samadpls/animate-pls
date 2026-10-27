// =====================================================================
//  SCENES — "Become the storm" tile (linocut). World 1080x1080; time TT on 2s; one print pulled per frame.
//  The block: a black storm sky with the storm's eye turning top right and wind cut across it, a red glow at the
//  horizon (the second block shows through the widening cuts), the sea in U-gouge scallops, and a wave rising out
//  of it with a swallow riding its back. The first line is cut into the sky from frame 0; "become the" rolls in,
//  then the red block rolls STORM in. A paper strip at the foot carries Allama Iqbal and (with a Nastaliq face) the
//  Urdu line. Red is the storm's light: the glow, STORM, the swallow's throat.
// =====================================================================
const T18 = { x0: 30, y0: 30, x1: 1050, y1: 1050, sea: 712, strip: 930, glow: [470, 724], eye: [868, 186] };
const T18_URDU = 'نغمۂ موج ہے، ہنگامۂ طوفاں ہو جا';

function t18Sky() {
  const { x0, y0, x1, sea, glow, eye } = T18;
  const sky = resample([[x0, y0], [x1, y0], [x1, sea + 10], [x0, sea + 10]], true, 24);
  linoRed(() => { ctx.fillRect(x0, glow[0], x1 - x0, glow[1] - glow[0]); });
  linoBlock(sky, { wob: 1.5, key: 'sky' });
  // wind: horizontal cuts that widen toward the horizon, so the black opens onto the red glow
  linoHatch(sky, { a: -0.03, gap: 15, w: 13, len: [90, 300], skip: [12, 60], key: 'wind', wave: [3, 0.012],
    tone: (x, y) => clamp((y - 330) / 360) ** 1.4 * 1.15 + (Math.hypot(x - eye[0], y - eye[1]) < 300 ? 0 : 0.06 * clamp((y - 230) / 200)) });
  // the storm's eye: spiral arms cut around it, turning slowly
  linoSpiral(eye[0], eye[1], 26, 330, { arms: 9, turns: 0.85, w: 15, rot: -TT * 0.22, key: 'eye', clip: sky });
  linoDots([[eye[0], eye[1], 15, 0]], { flat: 1 });
}
// rain: long diagonal V-cuts falling across the sky (after the storm arrives)
function t18Rain(on) {
  if (on <= 0) return;
  const S = RNG('t18rain'), list = [];
  for (let i = 0; i < 46 * on; i++) {
    const x = S.r(40, 1150), y0 = S.r(-200, 700), sp = S.r(500, 760), y = ((y0 + TT * sp) % 760) + 20, L = S.r(40, 90);
    if (y > T18.sea - 30) continue;
    list.push([[x - y * 0.32, y], [x - (y + L) * 0.32, y + L]]);
  }
  linoCuts(list, { w: 4, kind: 'v', key: 'rain', step: 8, clip: resample([[30, 30], [1050, 30], [1050, T18.sea], [30, T18.sea]], true, 40) });
}
function t18Sea() {
  const { x0, x1, sea, strip } = T18;
  const P = resample([[x0, sea], [x1, sea], [x1, strip], [x0, strip]], true, 24);
  linoBlock(P, { wob: 1.2, key: 'sea' });
  linoScallops(x0, x1, sea + 18, strip - 8, { size: 64, gap: 28, grow: 1.7, w: 9, lift: 0.3, shift: -TT * 18, key: 'sea', clip: P });
}
function t18Wave() {
  const rise = EZ.o3(seg(TT, 0, 1.35)), turn = lerp(0.62, 1.05, EZ.io(seg(TT, 0.2, 1.5)));
  ctx.save(); ctx.beginPath(); ctx.rect(T18.x0, 0, T18.x1 - T18.x0, T18.strip - 4); ctx.clip();   // the wave stands in the sea, never in the strip
  const wv = linoWave({ base: [200, 960], curl: [600, 640], r: 150, w: 330, rise: 0.45 + 0.55 * rise, turn, n: 12, cw: 11, foam: 30, halo: 9, key: 'wave' });
  ctx.restore();
  // spray off the crest, carried up toward the storm (white stabs on black, black drops on the glow)
  const S = RNG('t18spray'), tip = wv.crest[Math.floor(wv.crest.length * 0.35)] || wv.tip, drops = [];
  for (let i = 0; i < 26; i++) {
    const age = mod(TT * 0.9 + S.f(), 1), a = -1.1 + S.n(0.45), d = 30 + age * S.r(140, 300);
    drops.push([tip[0] + Math.cos(a) * d + age * 60, tip[1] + Math.sin(a) * d - age * age * 40, S.r(3, 7) * (1 - age * 0.5), a]);
  }
  linoDots(drops, { ink: true, flat: 0.7 });
  return wv;
}
function t18Bird() {
  const u = EZ.io(seg(TT, 0.1, 1.7)), x = lerp(500, 856, u), y = lerp(800, 592, u) + Math.sin(TT * 5) * 6;
  linoBird(x, y, 112, { tilt: lerp(-0.5, -0.2, u), halo: 8, key: 'hero' });
}
function t18Words() {
  const cu = TIMELINE.cues;
  // the first line, cut into the sky from frame 0 (a solid margin is left around the letters)
  const line = (str, x, y, size, o = {}) => {
    ctx.save(); ctx.font = `${o.weight ?? 900} ${size}px ${LINO_FONT}`; ctx.lineWidth = size * 0.34; ctx.lineJoin = 'round';
    for (let i = 0, dx = 0; i < str.length; i++) { const ch = str[i]; if (ch !== ' ') { const R = RNG('ltx', str, i); ctx.save(); const w = ctx.measureText(ch).width; ctx.translate(x + ctx.measureText(str.slice(0, i)).width + w / 2, y); ctx.rotate(R.n(0.03)); ctx.strokeText(ch, -w / 2, 0); ctx.restore(); } }
    ctx.restore();
    linoText(str, x, y, size, { carve: true, weight: o.weight ?? 900, key: str });
  };
  line('you are the song', 72, 118, 64);
  line('of the wave —', 72, 190, 64);
  linoRoll(ev(cu.become, 0.4), [60, 210, 760, 310], () => line('become the', 72, 284, 76), { key: 'become' });
  // STORM: rolled in by the red block (cut from the black, inked red)
  const u = ev(cu.roll, cu.rolled - cu.roll), size = 208;
  linoRoll(u, [50, 300, 1040, 480], () => {
    ctx.save(); ctx.font = `900 ${size}px ${LINO_FONT}`; ctx.lineWidth = size * 0.16; ctx.lineJoin = 'round'; ctx.strokeText('STORM', 64, 470); ctx.restore();
    linoText('STORM', 64, 470, size, { carve: true, key: 'STORM', tilt: 0.02 });
    linoRed(() => linoText('STORM', 64, 470, size, { key: 'STORM', tilt: 0.02 }));
  }, { key: 'storm', band: 120 });
}
function t18Strip() {
  const { x0, x1, strip, y1 } = T18;
  const a = linoText('Allama Iqbal', 74, 1000, 60, { weight: 700, key: 'iqbal' }), f = linoUrduFont();
  if (f) {   // the Urdu line, as large as the room right of the name allows (<= 42px: about 66px tall in Nastaliq)
    ctx.save(); ctx.font = `42px "${f}"`; const w42 = ctx.measureText(T18_URDU).width; ctx.restore();
    linoUrdu(T18_URDU, 1006, 994, Math.min(42, 42 * (1006 - a.x1 - 34) / w42));
  }   // no Nastaliq face (most Windows and Linux machines): the strip carries the English attribution only
}
function sceneTile() {
  linoPaper();
  linoPrint(() => {
    t18Sky();
    t18Words();
    t18Rain(seg(TT, 1.4, 2.0));
    t18Sea();
    t18Wave();
    t18Bird();
    t18Strip();
    // the block's own edge: a thin cut border around the picture and the strip
    const { x0, y0, x1, y1 } = T18;
    ctx.save(); trace(linoWob(resample([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], true, 30), 1.2, 'edge'), true); ctx.lineWidth = 8; ctx.stroke(); ctx.restore();
  });
}
