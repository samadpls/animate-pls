#!/usr/bin/env node
// One-time setup for the free local voice: a Python env with VoxCPM2 (text to speech, voice cloning) and
// faster-whisper (word timing), in ~/.animate-pls/venv. Works on Windows, macOS and Linux.
//   usage: node tools/voice-setup.mjs [--check] [--download] [--python 3.11]
//   --check     report what is installed and which device VoxCPM2 will use (cuda / mps / cpu); installs nothing
//   --download  also fetch the model weights now (VoxCPM2 ~5 GB, whisper small.en ~0.5 GB) instead of on first use
// With uv (https://docs.astral.sh/uv/) it picks the right PyTorch build for the machine (CUDA on NVIDIA, Metal on
// Apple Silicon, CPU otherwise). Without uv it uses a Python 3.10-3.12 on PATH and pip.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { HOME_DIR, VENV, python, venvPython } from './pyenv.mjs';

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const run = (cmd, args) => { console.log(`$ ${cmd} ${args.join(' ')}`); const r = spawnSync(cmd, args, { stdio: 'inherit' }); if (r.status !== 0) { console.error(`failed: ${cmd} ${args[0]}`); process.exit(1); } };
const has = (cmd) => spawnSync(cmd, ['--version'], { stdio: 'ignore' }).status === 0;

const PROBE = `
import importlib.util as u, json, sys
out = {"python": sys.version.split()[0]}
for m in ("voxcpm", "faster_whisper", "torch"):
    out[m] = u.find_spec(m) is not None
if out["torch"]:
    import torch
    out["torch_version"] = torch.__version__
    out["device"] = "cuda" if torch.cuda.is_available() else "mps" if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available() else "cpu"
print(json.dumps(out))`;

function check() {
  const r = spawnSync(python(), ['-c', PROBE], { encoding: 'utf8' });
  if (r.status !== 0) { console.log(`python: ${python()} (not runnable)`); return null; }
  const s = JSON.parse(r.stdout.trim().split('\n').pop());
  console.log(`python   ${python()} (${s.python})`);
  console.log(`voxcpm   ${s.voxcpm ? 'installed' : 'missing'}`);
  console.log(`whisper  ${s.faster_whisper ? 'installed' : 'missing'}`);
  console.log(`torch    ${s.torch ? `${s.torch_version}, device ${s.device}${s.device === 'cpu' ? ' (works, but ~5-10x slower than a GPU)' : ''}` : 'missing'}`);
  return s;
}

if (argv.includes('--check')) { const s = check(); process.exit(s && s.voxcpm && s.faster_whisper ? 0 : 1); }

fs.mkdirSync(HOME_DIR, { recursive: true });
const PKGS = ['voxcpm', 'faster-whisper'];
if (has('uv')) {
  if (!fs.existsSync(venvPython())) run('uv', ['venv', '--python', opt('--python', '3.11'), VENV]);
  const args = ['pip', 'install', '--python', venvPython(), '--torch-backend=auto', ...PKGS];
  console.log(`$ uv ${args.join(' ')}`);
  // --torch-backend needs a recent uv; an older one installs the default PyTorch build instead
  if (spawnSync('uv', args, { stdio: 'inherit' }).status !== 0) run('uv', args.filter((a) => a !== '--torch-backend=auto'));
} else {
  // no uv: a Python 3.10-3.12 from PATH (VoxCPM2 needs >= 3.10, < 3.13)
  const sys = process.platform === 'win32' ? 'python' : 'python3';
  const v = spawnSync(sys, ['-c', 'import sys; print("%d.%d" % sys.version_info[:2])'], { encoding: 'utf8' });
  const [maj, min] = (v.stdout || '0.0').trim().split('.').map(Number);
  if (v.status !== 0 || maj !== 3 || min < 10 || min > 12) {
    console.error(`need Python 3.10-3.12 (found ${v.stdout?.trim() || 'none'}). Easiest: install uv (https://docs.astral.sh/uv/getting-started/installation/) and run this again.`);
    process.exit(1);
  }
  if (!fs.existsSync(venvPython())) run(sys, ['-m', 'venv', VENV]);
  run(venvPython(), ['-m', 'pip', 'install', '--upgrade', 'pip']);
  if (process.platform === 'win32') console.log('note: on Windows, pip installs the CPU build of PyTorch. For an NVIDIA GPU install uv and rerun, or see https://pytorch.org/get-started/locally/');
  run(venvPython(), ['-m', 'pip', 'install', ...PKGS]);
}

if (argv.includes('--download')) {
  run(venvPython(), ['-c', 'from huggingface_hub import snapshot_download as d; d("openbmb/VoxCPM2"); d("Systran/faster-whisper-small.en"); print("models ready")']);
}
console.log('');
check();
console.log(`\nvoice env ready: ${VENV}\nnext: node tools/vox.mjs pieces/<name> --ref voice/me.m4a   (or --design "(a warm, calm narrator)")`);
