// =====================================================================
//  CAMERA — reel tile: one shot, a slow push toward the database that stops for the hold (eased, so it settles). No bridges.
// =====================================================================
const ERA_BG = ['#0c0d1c'];
function pieceCam(era, t) {
  const u = EZ.io(seg(t, 0, CUT.hold));
  return camOf({ z: lerp(1, 1.12, u), p: [SX(500), SY(560)], to: [SX(500), SY(560) + 24 * u] });
}
const BRIDGES = [];
