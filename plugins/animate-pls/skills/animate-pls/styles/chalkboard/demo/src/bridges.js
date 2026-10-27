// =====================================================================
//  ERAS, CAMERAS, BRIDGES — chalkboard demo (read by kit/morph.js)
// =====================================================================
const ERA_BG = [CHP.board, CHP.board];
function pieceCam(era, t) {   // a slow push on the landed apple (it keeps its screen spot, so the bridge finds it in frame)
  const p = [NW.apple[0], nwRest()];
  return era === 0 ? push(t, TIMELINE.cues.push, 2.7, { z: 1.12, p, to: p }) : null;
}
const BRIDGES = [
  { tc: M1, A: () => ({ P: ellipsePts(NW.apple[0], nwRest(), NW.apple[2], NW.apple[2] * 0.94, 0, 72), c: CHP.yellow }),
    B: () => ({ P: ellipsePts(...nwMoonAt(M1), NW.moon, NW.moon, 0, 72), c: CHP.yellow }) },   // the apple -> the moon
];
