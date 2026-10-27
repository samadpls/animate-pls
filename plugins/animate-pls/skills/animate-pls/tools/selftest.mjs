#!/usr/bin/env node
// Run the whole test suite on this machine and print one PASS/FAIL line per step (Windows, macOS, Linux).
//   usage: node tools/selftest.mjs [--quick] [--voice]
//   --quick  skip the exports and reviews (builds and determinism only, about a minute)
//   --voice  also check the optional voice environment
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SKILL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const quick = process.argv.includes('--quick'), voice = process.argv.includes('--voice');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'animate-pls-selftest-'));
const results = [];

const run = (cmd, args, timeout = 900000) => {
  const r = spawnSync(cmd, args, { cwd: SKILL, encoding: 'utf8', timeout, maxBuffer: 1 << 26 });
  return { ok: r.status === 0, out: `${r.stdout || ''}${r.stderr || ''}`, error: r.error };
};
const tool = (name, ...args) => run(process.execPath, [path.join('tools', name), ...args]);
const step = (name, fn) => {
  const t0 = process.hrtime.bigint();
  let ok = false, note = '';
  try { [ok, note] = fn(); } catch (e) { note = e.message; }
  const s = Number(process.hrtime.bigint() - t0) / 1e9;
  results.push({ name, ok, note, s });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(42)} ${s.toFixed(1).padStart(6)}s  ${note}`);
};
const last = (out, re) => (out.match(re) || [])[0] || out.trim().split('\n').pop()?.slice(0, 120) || '';

// the machine
const ff = run('ffmpeg', ['-hide_banner', '-version']);
const filters = run('ffmpeg', ['-hide_banner', '-filters']).out;
const has = (f) => new RegExp(`\\s${f}\\s`).test(filters);
console.log(`os       ${os.type()} ${os.release()} ${os.arch()}`);
console.log(`node     ${process.version}`);
console.log(`ffmpeg   ${ff.ok ? ff.out.split('\n')[0].replace('ffmpeg version ', '') : 'not found'}`);
console.log(`filters  drawtext ${has('drawtext') ? 'yes' : 'no'}, subtitles ${has('subtitles') ? 'yes' : 'no'}, loudnorm ${has('loudnorm') ? 'yes' : 'no'}`);
console.log('');

step('node 18 or newer', () => [Number(process.versions.node.split('.')[0]) >= 18, process.version]);
step('ffmpeg on PATH', () => [ff.ok, ff.ok ? 'found' : 'install ffmpeg and put it on PATH']);
step('playwright chromium', () => {
  const r = run(process.execPath, ['--input-type=module', '-e', "import { chromium } from './tools/lib/pw.mjs'; const b = await chromium.launch(); console.log(b.version()); await b.close();"], 120000);
  return [r.ok, r.ok ? `chromium ${r.out.trim()}` : 'npm i -g playwright && npx playwright install chromium'];
});
step('plugin manifests agree', () => { const r = tool('check-manifests.mjs'); return [r.ok, last(r.out, /manifests: \S+ \([^)]*\)/)]; });

// every piece builds
const demos = fs.readdirSync(path.join(SKILL, 'styles')).filter((s) => fs.existsSync(path.join(SKILL, 'styles', s, 'demo', 'piece.json'))).map((s) => `styles/${s}/demo`);
const pieces = ['templates/one-take', 'templates/beat-cut', 'templates/piece', 'templates/reel', 'templates/edit', 'examples/history-of-ai', ...demos, 'styles/isometric/demo-dark'];
step('edit template footage (record.mjs)', () => { const r = tool('footage.mjs', 'templates/edit', '--ensure'); return [r.ok, last(r.out, /\S+: (present|recorded|made)[^\n]*/)]; });
for (const p of pieces) step(`build ${p}`, () => { const r = tool('build.mjs', p); return [r.ok, r.ok ? '' : last(r.out, /.*/)]; });

// the same frame twice is the same picture
for (const [p, frames] of [['templates/one-take', ['60', '140', '236']], ['templates/reel', ['0', '120', '300']], ['templates/edit', ['48', '160']], ...demos.map((d) => [d, ['24', '72']])]) {
  step(`deterministic ${p}`, () => {
    const r = tool('tile.mjs', p, path.join(TMP, `${p.replace(/[\\/]/g, '-')}.png`), ...frames);
    return [r.ok && /deterministic: true/.test(r.out), last(r.out, /ms\/frame[^\n]*/)];
  });
}

if (!quick) {
  step('export templates/one-take', () => { const r = tool('export.mjs', 'templates/one-take'); return [r.ok, last(r.out, /video encoder: \S+/)]; });
  step('review templates/one-take (F9)', () => { const r = tool('review.mjs', 'templates/one-take'); return [r.ok && /format F9: PASS/.test(r.out) && /^text: PASS/m.test(r.out), last(r.out, /format F9: \S+ \([^)]*\)/)]; });
  step('export templates/reel', () => { const r = tool('export.mjs', 'templates/reel'); return [r.ok, last(r.out, /video encoder: \S+/)]; });
  step('review templates/reel (F10)', () => { const r = tool('review.mjs', 'templates/reel'); return [r.ok && /reel: PASS/.test(r.out) && /^text: PASS/m.test(r.out), last(r.out, /reel: \S+ \([^)]*\)/)]; });
  step('export templates/edit', () => { const r = tool('export.mjs', 'templates/edit'); return [r.ok, last(r.out, /video encoder: \S+/)]; });
}
if (voice) step('voice environment', () => { const r = tool('voice-setup.mjs', '--check'); return [r.ok, last(r.out, /torch[^\n]*/)]; });

fs.rmSync(TMP, { recursive: true, force: true });
const failed = results.filter((r) => !r.ok);
console.log(`\nselftest: ${failed.length ? 'FAIL' : 'PASS'} (${results.length - failed.length}/${results.length})${failed.length ? '  failed: ' + failed.map((r) => r.name).join(', ') : ''}`);
process.exit(failed.length ? 1 : 0);
