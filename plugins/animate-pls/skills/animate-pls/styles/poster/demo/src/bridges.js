// =====================================================================
//  ERAS, CAMERAS, BRIDGES — poster demo (read by kit/morph.js): the sun's disc becomes the yolk (circle to circle)
// =====================================================================
const ERA_BG = ['#dfa22e', '#e7c690'];
function pieceCam(era, t) { return null; }
const BRIDGES = [
  { tc: M1, A: () => { const [x, y, r] = PD.sun; return { P: ellipsePts(x, y, r, r, 0, 64), c: '#f4bf3e' }; }, B: () => { const [x, y, r] = PD.yolk; return { P: ellipsePts(x, y, r, r, 0, 64), c: '#f4bf3e' }; } },
];
