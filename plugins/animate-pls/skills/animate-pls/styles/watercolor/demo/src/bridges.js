// =====================================================================
//  ERAS, CAMERAS, BRIDGES — watercolor demo (read by kit/morph.js). The sun over the harbour becomes an orange.
// =====================================================================
const ERA_BG = ['#ead9bd', '#efdcb8'];
function pieceCam(era, t) { return null; }
const BRIDGES = [
  { tc: M1, A: () => ({ P: ellipsePts(WD.sun[0], WD.sun[1], WD.sun[2], WD.sun[2], 0, 64), c: '#d9a03a' }),
            B: () => ({ P: ellipsePts(WD.orange[0], WD.orange[1], WD.orange[2], WD.orange[2] * 0.94, 0, 64), c: '#d9822b' }) },
];
