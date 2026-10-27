// =====================================================================
//  ERAS, CAMERAS, BRIDGES — clay demo (read by kit/morph.js). The ball on the table becomes the moon.
// =====================================================================
const ERA_BG = ['#9cc2ad', '#1f3550'];
function pieceCam(era, t) { return null; }
const BRIDGES = [
  { tc: M1, A: () => ({ P: ellipsePts(CD.ball[0], CD.ball[1], CD.ball[2], CD.ball[2], 0, 64), c: '#f7ecd2' }),
            B: () => ({ P: ellipsePts(CD.moon[0], CD.moon[1], CD.moon[2], CD.moon[2], 0, 64), c: '#f6e3b0' }) },
];
