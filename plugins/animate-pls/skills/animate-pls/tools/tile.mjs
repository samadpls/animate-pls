// test tile: render chosen frames into a grid (270x480 cells for 9:16, 360 wide for 1:1 / 4:5 / 16:9) with the safe
// zone drawn in red (tools/safezones.mjs: the TikTok / Reels / Shorts UI on 9:16 unless piece.json review.safe says
// otherwise, TIMELINE.safe on other shapes); print timings +
// determinism (every frame rendered twice, the second pass in reverse order; any difference is listed)
// usage: node tools/tile.mjs <piece dir> out.png f0 f1 f2 ... [--format 1:1] [--platforms tiktok]   (frame numbers at TIMELINE.fps)
//        (the older form PIECE=<piece dir> node tools/tile.mjs out.png f0 ... still works)
import fs from 'node:fs';
import path from 'node:path';
import { chromium, openPiece } from './lib/pw.mjs';
import { safeZone, bands, isPortrait } from './safezones.mjs';
const argv = process.argv.slice(2);
const fmtI = argv.indexOf('--format'), format = fmtI >= 0 ? argv.splice(fmtI, 2)[1] : null;
const plI = argv.indexOf('--platforms'), platforms = plI >= 0 ? argv.splice(plI, 2)[1] : null;
const isPiece = (a) => a && (a.endsWith('.html') || (fs.existsSync(a) && fs.statSync(a).isDirectory()));
const piece = isPiece(argv[0]) ? argv.shift() : process.env.PIECE;
const [out, ...fr] = argv;
if (!piece || !out || !fr.length) { console.error('usage: node tools/tile.mjs <piece dir> out.png f0 f1 ...'); process.exit(2); }
const frames = fr.map(Number);
const FILE = path.resolve(piece.endsWith('.html') ? piece : path.join(piece, 'index.html')), PJ = path.join(path.dirname(FILE), 'piece.json');
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
p.on('pageerror', (e) => console.error('PAGE ERROR:', e.message));
p.on('console', (m) => console.error('console:', m.type(), m.text()));
await openPiece(p, FILE, { format });
{ const fo = await p.evaluate(() => window.FONTS_OK); if (fo !== undefined) console.log('fonts ok:', fo); }
const T = await p.evaluate(() => window.TIMELINE);
const ZONE = bands(safeZone(T, fs.existsSync(PJ) ? JSON.parse(fs.readFileSync(PJ, 'utf8')) : {}, { format, platforms }), T.width, T.height);
const res = await p.evaluate(async ([frames, zone, portrait]) => {
  const src = document.getElementById('c');
  // cells keep the canvas's shape: 270x480 for 9:16, 360 wide for 4:5, square and landscape pieces
  const cw = portrait ? 270 : 360, ch = Math.round(cw * src.height / src.width), s = cw / src.width;
  const cols = Math.min(6, frames.length), rows = Math.ceil(frames.length / cols);
  const g = document.createElement('canvas'); g.width = cols * cw; g.height = rows * ch; const x = g.getContext('2d');
  const ms = [], first = [];
  for (let i = 0; i < frames.length; i++) {
    const t0 = performance.now(); await window.__frame(frames[i] / window.TIMELINE.fps); ms.push(performance.now() - t0);
    const cx = (i % cols) * cw, cy = Math.floor(i / cols) * ch;
    first.push(src.toDataURL()); x.drawImage(src, cx, cy, cw, ch);
    x.fillStyle = 'rgba(255,0,0,0.18)';
    for (const [bx, by, bw, bh] of zone) x.fillRect(cx + bx * s, cy + by * s, bw * s, bh * s);   // the safe zone's hidden bands
    x.fillStyle = '#000'; x.fillRect(cx, cy, 44, 16); x.fillStyle = '#fff'; x.font = '12px monospace'; x.fillText('f' + frames[i], cx + 3, cy + 12);
  }
  // determinism: every frame again, in reverse order (so each follows a different frame), compare pixels
  const bad = [];
  for (let i = frames.length - 1; i >= 0; i--) { await window.__frame(frames[i] / window.TIMELINE.fps); if (src.toDataURL() !== first[i]) bad.push(frames[i]); }
  return { png: g.toDataURL('image/png').split(',')[1], ms, det: bad.length ? `false (frames ${bad.join(', ')} differ on a second render)` : true };
}, [frames, ZONE, isPortrait(T.width, T.height)]);
fs.writeFileSync(out, Buffer.from(res.png, 'base64'));
console.log('ms/frame', res.ms.map((v) => v.toFixed(0)).join(' '), '| deterministic:', res.det);
await b.close();
