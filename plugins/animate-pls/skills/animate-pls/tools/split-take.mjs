#!/usr/bin/env node
// Cut one long take (an ElevenLabs download of the whole script, or the user reading it) into one file per line.
//   usage: node tools/split-take.mjs pieces/<name> [voice/take.mp3] [--model small.en] [--lang en]
// All options are in tools/split_take.py. Needs the voice env once: node tools/voice-setup.mjs
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runPy } from './pyenv.mjs';

const r = runPy(path.join(path.dirname(fileURLToPath(import.meta.url)), 'split_take.py'), process.argv.slice(2));
process.exit(r.status ?? 1);
