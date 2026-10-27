// =====================================================================
//  CAMERAS AND (NO) BRIDGES — reel template (read by kit/morph.js). BRIDGES = []: every shot boundary is a hard cut
//  on the 8th grid. Each shot's framing is a camera on the one stage: rcFrame(z, y) puts stage height y (stage units)
//  at the middle of the format's band at zoom z, so every format frames the same thing.
// =====================================================================
const ERA_BG = SHOT_LIST.map(() => '#0c0d1c');
const rcFrame = (z, y, dy = 0) => camOf({ z, p: [SX(500), SY(y)], to: [BAND[2], (BAND[0] + BAND[1]) / 2 + dy * SK] });
const RC_CAM = {
  wide: null,
  db: () => rcFrame(1.45, 640),       // the chute and the database's face
  cache: () => rcFrame(Math.min(1.25, 1.36 / SK), 380, { '1:1': -150, '4:5': -120 }[FORMAT] ?? -200),   // the hot key, high enough that the face clears the captions
  face: () => rcFrame(2.2, 690, 20),
};
function pieceCam(era, t) {
  const kind = SHOT_LIST[era][3];
  if (kind === 'drift') return rcFrame(lerp(1.3, 1.38, EZ.io(seg(t, 0, CUT.pen))), 650, 30);   // the hook: a slow push on the fire
  if (kind === 'pull') { const u = EZ.io(seg(t, CUT.fix, CUT.fix + 1.6)); return camMix(rcFrame(1.16, 560), CAM0, u); }   // the payoff pulls back to the whole stage
  const c = RC_CAM[kind]; return c ? c() : null;
}
const BRIDGES = [];
