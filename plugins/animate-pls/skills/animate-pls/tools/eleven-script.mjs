#!/usr/bin/env node
// The ElevenLabs way, by hand (no API key, the free plan works): the script as paste-ready text for the ElevenLabs
// website, one paragraph per line, with an optional Eleven v3 audio tag in front of a line ("tag": "[curious]").
//   usage: node tools/eleven-script.mjs pieces/<name>
// writes <piece>/voice/elevenlabs.txt and prints it with the steps. The user pastes it into ElevenLabs
// (Text to Speech, model Eleven v3), downloads the MP3, saves it as <piece>/voice/take.mp3, and then
//   node tools/split-take.mjs pieces/<name>     cuts it into one take per line
//   node tools/voice.mjs pieces/<name>          times every word (the script's own pauses replace ElevenLabs' pauses)
import fs from 'node:fs';
import path from 'node:path';

const piece = process.argv[2];
if (!piece) { console.error('usage: node tools/eleven-script.mjs pieces/<name>'); process.exit(2); }
const VDIR = path.join(path.resolve(piece), 'voice');
const S = JSON.parse(fs.readFileSync(path.join(VDIR, 'script.json'), 'utf8'));
// tags are delivery hints ElevenLabs acts on but doesn't speak; keep them to emotions and delivery, e.g.
// [curious] [excited] [serious] [warmly] [whispers] [sighs] [laughs]
const text = S.lines.map((L) => `${L.tag ? L.tag.trim() + ' ' : ''}${L.text}`).join('\n\n') + '\n';
const out = path.join(VDIR, 'elevenlabs.txt');
fs.writeFileSync(out, text);
const chars = S.lines.reduce((n, L) => n + L.text.length, 0);
console.log(`--- paste this into ElevenLabs (${chars} characters, about ${chars} credits) ---\n\n${text}\n---`);
console.log(`saved to ${path.relative(process.cwd(), out)}
1. elevenlabs.io -> Text to Speech -> choose your voice (or clone your own there) -> model "Eleven v3"
2. paste the text above, generate, listen, download the MP3
3. save it as ${path.relative(process.cwd(), path.join(VDIR, 'take.mp3'))}
4. node tools/split-take.mjs ${piece}   then   node tools/voice.mjs ${piece}`);
