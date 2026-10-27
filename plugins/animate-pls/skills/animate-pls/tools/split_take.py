#!/usr/bin/env python3
"""Cut one long take into one file per script line: an ElevenLabs download of the whole script, or the user reading it.
Run it through tools/split-take.mjs (it finds the voice env).

usage: split_take.py <piece> [take] [--model small.en] [--lang en]
  take   the recording (default voice/take.mp3; searched in <piece>/voice/, then <piece>/, then as given)
Hears every word with faster-whisper, matches the words to the script's lines, and cuts in the silence between lines.
Writes voice/<id>.wav per line and sets each line's "file" in voice/script.json.
Next: node tools/voice.mjs <piece> (it trims each take and puts the script's own pauses back).
"""
import argparse
import sys

from voicelib import duration, find_audio, load_script, norm, samples16k, save_script, silences, to_wav

ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument('piece')
ap.add_argument('take', nargs='?', default='take.mp3')
ap.add_argument('--model', default='small.en')
ap.add_argument('--lang', default='en')
a = ap.parse_args()

ROOT, VDIR, SCRIPT, S = load_script(a.piece)
src = find_audio(VDIR, ROOT, a.take)
total = duration(src)

from faster_whisper import WhisperModel
segs, _ = WhisperModel(a.model, device='cpu', compute_type='int8').transcribe(samples16k(src), word_timestamps=True, beam_size=5, language=a.lang)
heard = [(norm(w.word), w.start, w.end) for s in segs for w in (s.words or []) if norm(w.word)]
if not heard:
    sys.exit(f'no speech heard in {src}')

# the script's words, each tagged with its line
words = [(norm(w), i) for i, L in enumerate(S['lines']) for w in L['text'].split() if norm(w)]
n, m = len(words), len(heard)
D = [[0] * (m + 1) for _ in range(n + 1)]
for i in range(n + 1):
    D[i][0] = i
for j in range(m + 1):
    D[0][j] = j
for i in range(1, n + 1):
    for j in range(1, m + 1):
        D[i][j] = min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + (words[i - 1][0] != heard[j - 1][0]))
match = {}   # script word index -> heard word index
i, j = n, m
while i > 0 and j > 0:
    if D[i][j] == D[i - 1][j - 1] + (words[i - 1][0] != heard[j - 1][0]):
        if words[i - 1][0] == heard[j - 1][0]:
            match[i - 1] = j - 1
        i, j = i - 1, j - 1
    elif D[i][j] == D[i - 1][j] + 1:
        i -= 1
    else:
        j -= 1

# each line's first and last heard word
span = []
for li, L in enumerate(S['lines']):
    hits = sorted(match[k] for k, (_, wl) in enumerate(words) if wl == li and k in match)
    count = sum(1 for _, wl in words if wl == li)
    if not hits:
        sys.exit(f'line "{L["id"]}" was not heard in the take ("{L["text"]}"). Was it skipped or reworded? Re-record it, '
                 f'or give it its own file and leave it out of the script for this split.')
    span.append((heard[hits[0]][1], heard[hits[-1]][2], len(hits), count))

# cut in the middle of the longest real silence between two lines (word times from the recogniser drift by a few
# hundred ms, a silence doesn't); halfway between the words when there is none. The take's own pauses are trimmed off
# by voice.mjs, which puts the script's "after" pauses back.
quiet = silences(src)
bounds = [0.0]
for k in range(len(span) - 1):
    lo, hi = span[k][1] - 0.4, span[k + 1][0] + 0.4   # end of one line's last word .. start of the next line's first
    gaps = [(min(e, hi) - max(s, lo), (max(s, lo) + min(e, hi)) / 2) for s, e in quiet if min(e, hi) > max(s, lo)]
    bounds.append(max(gaps)[1] if gaps else (span[k][1] + span[k + 1][0]) / 2)
bounds.append(total)
cuts = list(zip(bounds, bounds[1:]))
print(f'{src.name}: {total:.1f}s, {m} words heard, {len(match)}/{n} matched to the script')
for k, L in enumerate(S['lines']):
    f = VDIR / f'{L["id"]}.wav'
    to_wav(src, f, 48000, trim=True, start=cuts[k][0], end=cuts[k][1])
    L['file'] = f.name
    hit, cnt = span[k][2], span[k][3]
    flag = '' if hit >= 0.6 * cnt else '  <-- few words matched: listen to this one'
    print(f'  {L["id"]:<10} {cuts[k][0]:6.2f}-{cuts[k][1]:6.2f}s  {hit}/{cnt} words  "{L["text"]}"{flag}')
save_script(SCRIPT, S)
print(f'wrote {len(span)} takes to voice/ and set their "file" in voice/script.json\nnext: node tools/voice.mjs {a.piece}')
