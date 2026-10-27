// =====================================================================
//  ERAS, CAMERAS, CARRIES — one take (read by kit/morph.js). One carry, no cuts: the camera pushes through the
//  laptop's screen and the inside world is already there in its outline (era 0 shows it live on the screen).
//  The camera never parks: a slow drift in on the desk, then inside, a slow pull back from the engine.
// =====================================================================
const ERA_BG = ['#d6a466', '#0c0d1c'];
function pieceCam(era, t) {
  if (era === 0) return camOf({ z: 1 + 0.035 * EZ.io(seg(t, 0, 2)), p: OT_C, to: OT_C });
  return camOf({ z: lerp(OT_INZ, 1.02, EZ.io(seg(t, 2.0, 3.9))), p: [540, 545], to: [540, 545] });
}
const BRIDGES = [
  { tc: 2.0, d: 1.0, kind: 'through', id: 'screen', A: () => ({ R: [...OT_SCR, 10], c: C.navy }) },   // the screen opens into the engine
];
