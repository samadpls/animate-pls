#!/usr/bin/env python3
"""VoxCPM2 voice-over, free and local: one take per script line, in a voice cloned from a recording of the speaker
or designed from a short description. Run it through tools/vox.mjs (it finds the voice env).

usage: vox.py <piece> [--ref voice/me.m4a] [--ref-text "what the recording says"] [--mode clone|timbre]
              [--design "(a warm, calm narrator)"] [--style "(slightly slower)"] [--cfg 2.0] [--steps 10] [--seed 42]
              [--only id,id] [--audition] [--device auto|cuda|mps|cpu] [--lora path]

  --ref       a recording of the speaker, 10-30s of natural speech, any format ffmpeg reads (searched in <piece>/voice/,
              then <piece>/, then as given). Only the user's own voice, or one they have the owner's consent to clone.
  --ref-text  what the recording says. Without it, faster-whisper writes it to voice/ref.txt; fix that file if it misheard,
              then rerun (an exact transcript keeps the accent and rhythm closest).
  --mode      clone (default): continues from the recording, so timbre, accent and rhythm carry over.
              timbre: copies the voice's tone only and lets the model deliver the line (takes a --style hint).
  --design    no recording: a voice described in parentheses. Describe tone, age and pace; don't ask for an accent
              by nationality (it comes out as a caricature). The speaker's own recording is how an accent comes through.
  --cfg       guidance: lower (1.3-1.6) leans on the recording, higher (2.0+) on clean, even pronunciation.
  --tempo     speed every take by this factor, pitch kept (0.92 = 8% slower; review wants <= 3.5 words/s).
  --audition  makes the first line (or --only) in several settings under voice/audition/ to choose from by ear;
              writes nothing else.
writes voice/<id>.wav per line, sets each line's "file" in voice/script.json, and records the settings in voice/vox.json.
Next: node tools/voice.mjs <piece> (times every word and joins the lines into voice/voice.wav).
"""
import argparse
import hashlib
import json
import subprocess
import sys
import time

from voicelib import duration, find_audio, load_script, save_script, to_wav

ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument('piece')
ap.add_argument('--ref')
ap.add_argument('--ref-text')
ap.add_argument('--mode', choices=['clone', 'timbre'], default='clone')
ap.add_argument('--design', default='')
ap.add_argument('--style', default='')
ap.add_argument('--cfg', type=float, default=2.0)
ap.add_argument('--steps', type=int, default=10)
ap.add_argument('--tempo', type=float, default=1.0)
ap.add_argument('--seed', type=int, default=42)
ap.add_argument('--only', default='')
ap.add_argument('--audition', action='store_true')
ap.add_argument('--device', default='auto')
ap.add_argument('--lora')
ap.add_argument('--asr-model', default='small.en')
a = ap.parse_args()

ROOT, VDIR, SCRIPT, S = load_script(a.piece)
only = [x for x in a.only.split(',') if x]
todo = [L for L in S['lines'] if not only or L['id'] in only]
if only and len(todo) != len(only):
    sys.exit(f'--only: no line with id {sorted(set(only) - {L["id"] for L in todo})}')
if a.audition:
    todo = todo[:1]

# ---- the reference: 16 kHz mono, the silence around it trimmed, at most 30s
ref = ref_text = None
if a.ref:
    src = find_audio(VDIR, ROOT, a.ref)
    ref = VDIR / 'ref16k.wav'
    to_wav(src, ref, 16000, max_s=30)
    digest = hashlib.sha1(ref.read_bytes()).hexdigest()[:12]
    cached, meta = VDIR / 'ref.txt', VDIR / 'ref.json'
    if a.ref_text:
        ref_text = a.ref_text.strip()
    elif cached.exists() and meta.exists() and json.loads(meta.read_text()).get('sha1') == digest:
        ref_text = cached.read_text(encoding='utf-8').strip()   # the user may have corrected it
    elif a.mode == 'clone':
        from faster_whisper import WhisperModel
        segs, _ = WhisperModel(a.asr_model, device='cpu', compute_type='int8').transcribe(str(ref), beam_size=5)
        ref_text = ' '.join(s.text.strip() for s in segs).strip()
        print(f'heard in the recording (saved to voice/ref.txt; fix it there if it is wrong, then rerun):\n  "{ref_text}"')
    if ref_text:
        cached.write_text(ref_text + '\n', encoding='utf-8')
        meta.write_text(json.dumps({'sha1': digest, 'source': src.name}) + '\n')
    if duration(ref) < 8:
        print(f'note: the recording is {duration(ref):.1f}s; 15-30s of natural speech clones noticeably better')
elif not a.design:
    sys.exit('give --ref <recording of the speaker> or --design "(a description of the voice)"')

# ---- the model (weights download once, ~5 GB, to the Hugging Face cache)
import numpy as np
import soundfile as sf
import torch
from voxcpm import VoxCPM

t = time.time()
device = None if a.device == 'auto' else a.device
on_cuda = (device or ('cuda' if torch.cuda.is_available() else '')).startswith('cuda')
model = VoxCPM.from_pretrained('openbmb/VoxCPM2', load_denoiser=False, optimize=on_cuda, device=device,
                               **({'lora_weights_path': a.lora} if a.lora else {}))
SR = model.tts_model.sample_rate
print(f'VoxCPM2 loaded in {time.time() - t:.0f}s (the first line is slower: warm-up)')


def say(text, mode, cfg):
    kw = dict(cfg_value=cfg, inference_timesteps=a.steps)
    if ref and mode == 'clone':
        kw.update(prompt_wav_path=str(ref), prompt_text=ref_text, reference_wav_path=str(ref))
    elif ref:
        kw.update(reference_wav_path=str(ref))
        text = a.style + text
    else:
        text = a.design + text
    torch.manual_seed(a.seed)
    return np.asarray(model.generate(text=text, **kw), dtype=np.float32)


def write(f, wav):
    sf.write(f, wav, SR)
    if a.tempo != 1.0:   # ffmpeg's atempo keeps the pitch
        tmp = f.with_suffix('.tmp.wav')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(f), '-filter:a', f'atempo={a.tempo}', str(tmp)], check=True)
        tmp.replace(f)
    return duration(f)


if a.audition:
    L = todo[0]
    out = VDIR / 'audition'
    out.mkdir(exist_ok=True)
    print(f'audition of "{L["text"]}":')
    for mode in (['clone', 'timbre'] if ref else ['design']):
        for cfg in (1.3, 1.6, 2.0):
            f = out / f'{L["id"]}-{mode}-cfg{cfg}.wav'
            sec = write(f, say(L['text'], mode, cfg))
            print(f'  {f.relative_to(ROOT)}  ({len(L["text"].split()) / sec:.1f} words/s)', flush=True)
    pick = f'--ref {a.ref} --mode <clone|timbre>' if ref else f'--design "{a.design}"'
    print(f'listen, pick one, then: node tools/vox.mjs {a.piece} {pick} --cfg <value>')
    sys.exit(0)

stats = {}
for L in todo:
    t = time.time()
    f = VDIR / f'{L["id"]}.wav'
    sec = write(f, say(L['text'], a.mode, a.cfg))
    L['file'] = f.name
    gen, wps = time.time() - t, len(L['text'].split()) / sec
    stats[L['id']] = {'seconds': round(sec, 2), 'took': round(gen, 1)}
    fast = '  <-- fast: try --tempo 0.92' if wps > 3.5 else ''
    print(f'  {L["id"]:<10} {sec:5.2f}s of audio in {gen:5.1f}s  {wps:.1f} words/s  "{L["text"]}"{fast}', flush=True)

save_script(SCRIPT, S)
(VDIR / 'vox.json').write_text(json.dumps({
    'model': 'openbmb/VoxCPM2', 'mode': a.mode if ref else 'design', 'cfg': a.cfg, 'steps': a.steps, 'seed': a.seed, 'tempo': a.tempo,
    'ref': a.ref, 'ref_text': ref_text, 'design': a.design, 'style': a.style, 'lora': a.lora, 'lines': stats,
}, indent=1) + '\n')
print(f'wrote {len(todo)} takes to voice/ and set their "file" in voice/script.json\nnext: node tools/voice.mjs {a.piece}')
