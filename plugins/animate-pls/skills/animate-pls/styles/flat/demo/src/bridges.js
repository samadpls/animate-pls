// =====================================================================
//  ERAS, CAMERAS, BRIDGES — flat demo (read by kit/morph.js)
// =====================================================================
const ERA_BG = ['#0f2a2e', '#1e2a1b'];   // the ink-teal night; the moss green inside the leaf
function pieceCam(era, t) {   // a slow push on the planet (it stays put on screen, so the bridge finds it in frame)
  const [px, py] = DM.planet;
  return era === 0 ? push(t, TIMELINE.cues.push, 2.35, { z: 1.06, p: [px, py], to: [px, py] }) : null;
}
const BRIDGES = [
  { tc: M1, A: () => ({ P: flCircle(DM.planet[0], DM.planet[1], DM.planet[2], 72), c: FLP.coral }), B: () => ({ P: flCircle(DM.cell[0], DM.cell[1], DM.cell[2], 72), c: FLP.sage }) },   // the planet -> the leaf cell
];
