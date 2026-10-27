// =====================================================================
//  ERAS, CAMERAS, BRIDGES — comic demo (read by kit/morph.js). The clock face becomes the sun.
// =====================================================================
const ERA_BG = ['#f5c531', '#a3d8ec'];
function pieceCam(era, t) { return null; }
const BRIDGES = [
  { tc: M1, A: () => ({ P: ellipsePts(...CD.clock, CD.clock[2], 0, 64), c: '#f8efd6' }), B: () => ({ P: ellipsePts(...CD.sun, CD.sun[2], 0, 64), c: '#f5c531' }) },
];
