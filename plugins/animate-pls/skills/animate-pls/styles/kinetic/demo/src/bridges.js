// =====================================================================
//  ERAS, CAMERAS, BRIDGES — kinetic demo (read by kit/morph.js). No camera: the type moves, the frame doesn't.
//  One bridge: the pop box behind POPS. (night) becomes the pop box behind the count-up (day). Both are boxes of
//  similar proportions, so the solid pop block slides and reshapes without pinching.
// =====================================================================
const ERA_BG = [KIN.ink, KIN.paper];
function pieceCam(era, t) { return null; }
const BRIDGES = [
  { tc: TIMELINE.morphs[0], d: 0.5,
    A: () => { const b = popsBox(); return { P: demoRectPts(b.R, b.rot), c: kinHex(KIN.pop) }; },
    B: () => { const b = countBox(); return { P: demoRectPts(b.R, b.rot), c: kinHex(KIN.pop) }; } },
];
