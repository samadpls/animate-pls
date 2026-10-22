// =====================================================================
//  ERAS, CAMERAS, CARRIES — one take (read by kit/morph.js). No hard cuts and no blank paper: the camera pushes
//  through the sketched card into the machine, then the build bar morphs into the phone's screen on the desk.
//  The camera never parks: a drift in, a drift along the bar, a long pull back from the phone to the whole desk.
// =====================================================================
const ERA_BG = ['#d6a466', '#0c0d1c', '#d6a466'];
function pieceCam(era, t) {
  if (era === 0) return push(t, 0.2, 3.0, { z: 1.08, p: [540, 500], to: [540, 500] });
  if (era === 1) return camOf({ z: 1 + 0.05 * EZ.io(seg(t, 3.0, 6.0)), p: [540, 752], to: [540, 752] });
  const u = EZ.io(seg(t, 6.0, 9.6));
  return camOf({ z: lerp(1.3, 1.0, u), p: [lerp(760, 540, u), lerp(490, 540, u)], to: [540, 540] });
}
const BRIDGES = [
  { tc: 3.0, d: 1.0, kind: 'through', id: 'card', A: () => ({ R: [...OT_CARD, 22], c: C.paper }) },            // the card opens into the machine
  { tc: 6.0, d: 0.6, kind: 'match', id: 'screen',                                                              // the build bar becomes the screen
    A: () => ({ R: [...OT_BAR, 14], c: C.cyan }), B: () => ({ R: [...OT_SCREEN, 20], c: C.cream }) },
];
