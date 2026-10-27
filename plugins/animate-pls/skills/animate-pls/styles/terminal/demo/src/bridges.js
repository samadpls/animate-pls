// =====================================================================
//  ERAS, CAMERAS, BRIDGES — terminal demo (read by kit/morph.js). No camera: the text moves, the frame doesn't.
//  One bridge: the solid film.mp4 block at the end of the build (a block of characters) becomes the film.mp4 box of
//  the pipeline. Both are wide rounded rects of similar proportions, so the character block reflows without pinching.
// =====================================================================
const ERA_BG = [TM.ground, TM.ground];
function pieceCam(era, t) { return null; }
const BRIDGES = [
  { tc: M1, d: 0.5, A: () => ({ R: dmDoneRect(), c: TM.amber }), B: () => ({ R: dmBoxes().R[2], c: TM.amber }) },
];
