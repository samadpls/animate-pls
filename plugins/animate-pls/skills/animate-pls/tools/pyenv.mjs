// The Python that runs the voice tools (VoxCPM2, faster-whisper), the same on Windows, macOS and Linux.
//   ANIMATE_PY=<python>        use this interpreter
//   ~/.animate-pls/venv        made by tools/voice-setup.mjs (the default)
//   python3 / python on PATH   the fallback
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const HOME_DIR = process.env.ANIMATE_PLS_HOME || path.join(os.homedir(), '.animate-pls');
export const VENV = path.join(HOME_DIR, 'venv');
export const venvPython = (venv = VENV) => path.join(venv, process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');

export function python() {
  if (process.env.ANIMATE_PY) return process.env.ANIMATE_PY;
  if (fs.existsSync(venvPython())) return venvPython();
  return process.platform === 'win32' ? 'python' : 'python3';
}

// run a script in tools/ with that Python, passing stdout/stderr through; exits with its status
export function runPy(script, args, opts = {}) {
  const r = spawnSync(python(), [script, ...args], { stdio: opts.capture ? 'pipe' : 'inherit', maxBuffer: 1 << 26, env: { ...process.env, PYTHONUTF8: '1' } });
  if (r.error) { console.error(`could not start Python (${python()}): ${r.error.message}\nrun: node tools/voice-setup.mjs`); process.exit(1); }
  return r;
}
