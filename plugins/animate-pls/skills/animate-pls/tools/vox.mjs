#!/usr/bin/env node
// The free local voice: VoxCPM2 makes one take per script line, cloned from the user's recording or designed.
//   usage: node tools/vox.mjs pieces/<name> --ref voice/me.m4a [--cfg 1.6] [--mode clone|timbre] [--audition] [--only id,id]
//          node tools/vox.mjs pieces/<name> --design "(a warm, calm narrator)"
// All options are in tools/vox.py. Needs the voice env once: node tools/voice-setup.mjs
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runPy } from './pyenv.mjs';

const r = runPy(path.join(path.dirname(fileURLToPath(import.meta.url)), 'vox.py'), process.argv.slice(2));
process.exit(r.status ?? 1);
