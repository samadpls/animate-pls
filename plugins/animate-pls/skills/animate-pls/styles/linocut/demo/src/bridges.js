// =====================================================================
//  ERAS, CAMERAS, BRIDGES — linocut demo (read by kit/morph.js). The red sun becomes the moon.
// =====================================================================
const ERA_BG = ['#efe6d0', '#1e1813'];
function pieceCam(era, t) { return null; }
const BRIDGES = [
  { tc: M1, A: () => ({ P: ellipsePts(LD.sun[0], LD.sun[1], LD.sun[2], LD.sun[2], 0, 64), c: '#d8432b' }),
            B: () => ({ P: ellipsePts(LD.moon[0], LD.moon[1], LD.moon[2], LD.moon[2], 0, 64), c: '#efe6d0' }) },
];
