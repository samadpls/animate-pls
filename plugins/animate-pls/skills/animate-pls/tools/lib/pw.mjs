// Playwright for the tools: one loader, and the page set-up every tool that renders a piece shares
// (export, tile, still, storyboard, textcheck, framehash, compare, review).
//   chromium                          Playwright's Chromium: a local install, else the global one (npm root -g)
//   pieceURL(file, format)            the piece's file:// URL with ?export=1 (and &format=)
//   feed(page, dir)                   the frame feed below; call it before the page loads
//   openPiece(page, file, { format }) feed + load + wait until TIMELINE and renderFrame exist
//
// THE FRAME FEED, for pieces that draw footage (a screen recording, a product demo). Such a piece defines
//     window.prepareFrame = async (t) => { ... }
// which fetches what frame t needs (say one extracted video frame, decoded into an ImageBitmap it keeps) through
//     await window.__pieceFile('footage/f00042.jpg')   -> the file's bytes, base64
// that reads files inside the piece's own folder only (a relative path; absolute paths and '..' are refused).
// The page never holds a URL or a data: URI, so build.mjs's rule stands, and renderFrame stays synchronous.
// In the page every tool renders through
//     await window.__frame(t, ...args)   -> prepareFrame(t) if the piece has one, then renderFrame(t, ...args)
//     await window.__prepare(t)          -> prepareFrame(t) only (motion blur: once per output frame, then its sub-frames)
// A piece without prepareFrame renders exactly as before (__frame is renderFrame). In a plain browser preview there
// is no __pieceFile and nobody calls prepareFrame: the piece must still draw (a poster or a labelled placeholder).
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
function load() {
  try { return require('playwright'); } catch { return require(path.join(execSync('npm root -g').toString().trim(), 'playwright')); }
}
export const { chromium } = load();

export const pieceURL = (file, format) => pathToFileURL(path.resolve(file)).href + '?export=1' + (format ? `&format=${encodeURIComponent(format)}` : '');

export async function feed(page, dir) {
  const root = fs.realpathSync(path.resolve(dir));
  await page.exposeFunction('__pieceFile', (rel) => {
    rel = String(rel);
    const bad = !rel || rel.includes('\0') || path.isAbsolute(rel) || /^[a-zA-Z]:/.test(rel) || rel.split(/[\\/]+/).includes('..');
    const f = bad ? null : path.join(root, rel), real = f && fs.existsSync(f) ? fs.realpathSync(f) : null;   // a link must not lead out either
    if (bad || !real || path.relative(root, real).startsWith('..') || path.isAbsolute(path.relative(root, real))) throw new Error(`__pieceFile: "${rel}" is not a file inside the piece`);
    return fs.readFileSync(real).toString('base64');
  });
  await page.addInitScript(() => {
    window.__prepare = async (t) => { if (window.prepareFrame) await window.prepareFrame(t); };
    window.__frame = async (t, ...a) => { if (window.prepareFrame) await window.prepareFrame(t); return window.renderFrame(t, ...a); };
  });
}

export async function openPiece(page, file, o = {}) {
  await feed(page, path.dirname(path.resolve(file)));
  await page.goto(pieceURL(file, o.format));
  await page.waitForFunction(() => window.TIMELINE && typeof window.renderFrame === 'function', null, { timeout: o.timeout ?? 30000 });
  return page;
}
