#!/usr/bin/env node
// Assemble <piece>/index.html from the piece's src/ parts, this skill's kit/ and the piece's style kit, then check it.
//   usage: node tools/build.mjs <piece dir>
// Order comes from <piece>/piece.json "build" (the whole list) or "scenes" (replaces src/scenes.js only), default:
//   head, kit/core, style, scenes, bridges, kit/morph (the renderer), kit/board, kit/score-head, score, kit/score-tail
// Part names:
//   "kit/<file>"            this skill's kit/
//   "style"                 the kit.js of the style named by piece.json "style" (default "cutout")
//   "styles/<name>/<file>"  a file of a named style
//   anything else           relative to the piece dir
// A style is found in a styles/<name>/ folder beside the piece or above it, then in this skill's styles/
// (so a style made for one project, e.g. <project>/styles/my-look/, works for every piece in that project).
// Checks: the script compiles; the style defines STYLE; no data: URIs and no http(s) URLs in the code; the piece's own
// code (src parts, style kit) uses no Math.random / Date.now / new Date( / performance.now and redeclares no top-level name
// of kit/core.js, morph.js, board.js, score-head.js or score-tail.js.
// Generated parts: <piece>/beats.json -> const BEATS (a supplied track's beat map); <piece>/voice.json -> const VOICE (voice-over timing);
// <piece>/footage.json -> const FOOTAGE (footage metadata only: the frames come in through tools/lib/pw.mjs's frame feed);
// <piece>/assets/* -> const ASSETS (the user's own screenshots and logos, embedded; window.renderFrame appears once they're decoded).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const SKILL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT = ['src/head.html', 'kit/core.js', 'style', 'src/scenes.js', 'src/bridges.js', 'kit/morph.js', 'kit/board.js', 'kit/score-head.js', 'src/score.js', 'kit/score-tail.js'];
const dir = process.argv[2];
if (!dir) { console.error('usage: node tools/build.mjs <piece dir>'); process.exit(2); }
const ROOT = path.resolve(dir);
const meta = fs.existsSync(path.join(ROOT, 'piece.json')) ? JSON.parse(fs.readFileSync(path.join(ROOT, 'piece.json'), 'utf8')) : {};
const styleName = meta.style || 'cutout';
// a style's folder: the piece's own tree first (walking up), then the skill
function styleDir(name) {
  for (let d = ROOT; ; d = path.dirname(d)) {
    const c = path.join(d, 'styles', name);
    if (fs.existsSync(path.join(c, 'kit.js'))) return c;
    if (path.dirname(d) === d) break;
  }
  const c = path.join(SKILL, 'styles', name);
  if (fs.existsSync(path.join(c, 'kit.js'))) return c;
  const have = fs.readdirSync(path.join(SKILL, 'styles')).filter((n) => fs.existsSync(path.join(SKILL, 'styles', n, 'kit.js')));
  console.error(`unknown style "${name}" (no styles/${name}/kit.js beside the piece or in the skill). Skill styles: ${have.join(', ')}`);
  process.exit(1);
}
function resolve(p) {
  if (p === 'style') return path.join(styleDir(styleName), 'kit.js');
  if (p.startsWith('kit/')) return path.join(SKILL, 'kit', p.slice(4));
  const m = p.match(/^styles\/([^/]+)\/(.+)$/);
  if (m && !fs.existsSync(path.join(ROOT, p))) return path.join(styleDir(m[1]), m[2]);
  return path.join(ROOT, p);
}
// "scenes": ["src/era-01.js", ...] swaps src/scenes.js for several files in the default order (one per agent / era)
const parts = meta.build || (meta.scenes ? DEFAULT.flatMap((p) => (p === 'src/scenes.js' ? meta.scenes : [p])) : DEFAULT);
const texts = parts.map((p) => {
  const file = resolve(p);
  if (!fs.existsSync(file)) { console.error(`missing part: ${p} (${file})`); process.exit(1); }
  return [p, fs.readFileSync(file, 'utf8').replace(/\s*$/, '\n')];
});
let out = texts.map(([, t]) => t).join('');

// ---- the piece's own code (src parts and the style kit, not this skill's kit/ and not the injected data):
// deterministic (no Math.random or clock), and no top-level name the shared kit already declares
// (a second `function` silently replaces the kit's, a second `const` is a SyntaxError)
const own = texts.filter(([p]) => !p.startsWith('kit/'));
const CLOCK = /\bMath\.random\b|\bDate\.now\b|\bnew Date\(|\bperformance\.now\b/;
const clock = own.flatMap(([p, t]) => t.split('\n').map((l, i) => [p, i + 1, l.replace(/\/\/.*$/, '')]).filter(([, , l]) => CLOCK.test(l)));
if (clock.length) { console.error('not deterministic (use RNG(...) and TT, never Math.random or the clock):', clock.slice(0, 5).map(([p, n, l]) => `${p}:${n} ${l.match(CLOCK)[0]}`).join(' | ')); process.exit(1); }
// top-level declarations: `function NAME` / `const|let|var A = .., B = ..` at the start of a line
const declared = (t) => t.split('\n').flatMap((l, i) => {
  const f = l.match(/^(?:async\s+)?function\s*\*?\s*([\w$]+)/); if (f) return [[f[1], i + 1]];
  const d = l.match(/^(?:const|let|var)\s+(.*)/); if (!d) return [];
  let s = d[1].replace(/(['"`])(?:\\.|(?!\1).)*\1/g, '0').replace(/\/\/.*$/, ''), k;
  while ((k = s.replace(/\([^()]*\)|\[[^[\]]*\]|\{[^{}]*\}/g, '')) !== s) s = k;   // drop bracketed parts: only the declarators' commas stay
  return s.replace(/[([{].*$/, '').split(',').map((x) => (x.match(/^\s*([\w$]+)\s*=/) || [])[1]).filter(Boolean).map((n) => [n, i + 1]);
});
const KIT = new Map(texts.filter(([p]) => ['kit/core.js', 'kit/morph.js', 'kit/board.js', 'kit/score-head.js', 'kit/score-tail.js', 'kit/captions.js', 'kit/footage.js'].includes(p)).flatMap(([p, t]) => declared(t).map(([n]) => [n, p])));
const inScore = (p) => parts.indexOf(p) > parts.indexOf('kit/score-head.js') && parts.indexOf(p) < parts.indexOf('kit/score-tail.js');   // the score body sits inside buildScore()
const clash = own.filter(([p]) => !inScore(p)).flatMap(([p, t]) => declared(t).filter(([n]) => KIT.has(n)).map(([n, i]) => `${p}:${i} "${n}" (declared by ${KIT.get(n)})`));
if (clash.length) { console.error('redeclares a kit name (give it a prefix, as styles/README.md says):', clash.slice(0, 5).join(' | ')); process.exit(1); }
const m = out.match(/<script>([\s\S]*)<\/script>/);
if (!m) { console.error('no <script> block found'); process.exit(1); }
if (!/\bconst STYLE\s*=/.test(m[1])) { console.error('no STYLE hooks: the style kit must define `const STYLE = { ... }` (see styles/cutout/kit.js)'); process.exit(1); }
// the code itself: no data: URIs, no URLs (the user's own assets are added below, from <piece>/assets/ only)
const bad = out.split('\n').map((l, i) => [i + 1, l]).filter(([, l]) => /data:[a-z]+\/|https?:\/\//i.test(l));
if (bad.length) { console.error('forbidden (data: URI or http URL):', bad.slice(0, 5).map(([n, l]) => `${n}: ${l.trim().slice(0, 80)}`).join(' | ')); process.exit(1); }

// ---- generated parts, injected right after "use strict" (before the head's own code runs)
const inject = [];
// a supplied music track's beat map (tools/beats.mjs -> <piece>/beats.json): the head reads BEATS.bpm / BEATS.offset
const beatsFile = path.join(ROOT, 'beats.json');
if (fs.existsSync(beatsFile)) inject.push(`// ---- beats.json (tools/beats.mjs): the supplied track's tempo, beats, downbeats and hits\nconst BEATS = ${JSON.stringify(JSON.parse(fs.readFileSync(beatsFile, 'utf8')))};`);
// a voice-over's timing (tools/voice.mjs -> <piece>/voice.json): lines and word times the scenes cue on
const voiceFile = path.join(ROOT, 'voice.json');
if (fs.existsSync(voiceFile)) { const V = JSON.parse(fs.readFileSync(voiceFile, 'utf8')); V.lines.forEach((l) => delete l.take); inject.push(`// ---- voice.json (tools/voice.mjs): the voice-over's lines and word times
const VOICE = ${JSON.stringify(V)};`); }
// footage metadata (sizes, fps, frame counts, clip names): the frames themselves are fed by the tools (tools/lib/pw.mjs),
// so the page holds no frame data, no URL and no data: URI
const footageFile = path.join(ROOT, 'footage.json');
if (fs.existsSync(footageFile)) {
  const txt = JSON.stringify(JSON.parse(fs.readFileSync(footageFile, 'utf8')));
  if (/data:[a-z]+\/|https?:\/\//i.test(txt) || txt.length > 1e6) { console.error('footage.json is metadata only: no data: URIs, no URLs, under 1 MB (frames are fed by the tools, read with window.__pieceFile)'); process.exit(1); }
  inject.push(`// ---- footage.json: the footage's metadata (its frames come from the tools' frame feed)\nconst FOOTAGE = ${txt};`);
}
// the user's own assets: screenshots and logos in <piece>/assets/, embedded so the piece stays one file and
// the canvas stays readable (an image loaded from a file:// URL would taint it and break every check)
const ASSET_DIR = path.join(ROOT, 'assets'), MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml' };
const assetFiles = fs.existsSync(ASSET_DIR) ? fs.readdirSync(ASSET_DIR).filter((n) => MIME[n.split('.').pop().toLowerCase()]) : [];
let assetBytes = 0;
if (assetFiles.length) {
  const src = {};
  for (const n of assetFiles) { const b = fs.readFileSync(path.join(ASSET_DIR, n)); assetBytes += b.length; src[n] = `data:${MIME[n.split('.').pop().toLowerCase()]};base64,` + b.toString('base64'); }
  inject.push(`// ---- assets/ (embedded by tools/build.mjs): ${assetFiles.join(', ')}\nconst ASSETS = {};\nwindow.ASSETS_READY = Promise.all(Object.entries(${JSON.stringify(src)}).map(([k, u]) => { const i = new Image(); i.src = u; ASSETS[k] = i; return i.decode(); }));`);
}
if (inject.length) {
  const at = out.indexOf('"use strict";') >= 0 ? out.indexOf('"use strict";') + '"use strict";'.length : out.indexOf('<script>') + '<script>'.length;
  out = out.slice(0, at) + '\n' + inject.join('\n') + out.slice(at);
}
// with assets, tools wait until the images are decoded: window.renderFrame appears only then
if (assetFiles.length) {
  const end = out.lastIndexOf('</script>');
  out = out.slice(0, end) + `// ---- hold renderFrame until the assets are decoded (export, review and tile wait for it)\n{ const rf = window.renderFrame; window.renderFrame = undefined; window.ASSETS_READY.then(() => { window.renderFrame = rf; }); }\n` + out.slice(end);
}
const m2 = out.match(/<script>([\s\S]*)<\/script>/);
try { new vm.Script(m2[1], { filename: 'index.html' }); } catch (e) { console.error('syntax error:', e.message); process.exit(1); }
fs.writeFileSync(path.join(ROOT, 'index.html'), out);
const extras = [fs.existsSync(beatsFile) ? 'beats.json' : null, fs.existsSync(voiceFile) ? 'voice.json' : null, fs.existsSync(footageFile) ? 'footage.json' : null, assetFiles.length ? `${assetFiles.length} asset(s), ${(assetBytes / 1e6).toFixed(1)} MB` : null].filter(Boolean);
if (assetBytes > 12e6) console.warn(`warning: ${(assetBytes / 1e6).toFixed(1)} MB of assets — resize screenshots to the size they're shown at`);
console.log(`built ${path.join(ROOT, 'index.html')}: ${out.split('\n').length} lines from ${parts.length} parts (style: ${styleName})${extras.length ? ' + ' + extras.join(' + ') : ''}; syntax ok; no external assets`);
