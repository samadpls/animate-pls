// =====================================================================
//  ERAS, RESOLUTION, SCREEN FX — 06-pixel (one era, no bridges). Drawn at 180x180: 6 px per pixel on 1080x1080.
// =====================================================================
const ERA_BG = ['#232a4e'];
const ERA_RES = [[180, 180]];
const ERA_POST = [{ pal: PAL16, scan: 0.14 }];   // the 16-colour palette, faint scanlines
function pieceCam() { return null; }   // pixel art moves things, not the camera
const BRIDGES = [];
