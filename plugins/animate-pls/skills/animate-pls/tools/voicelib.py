"""Shared helpers for the voice tools (vox.py, split_take.py): the script file, finding and decoding audio."""
import json
import re
import subprocess
import sys
from pathlib import Path


def load_script(piece):
    root = Path(piece).resolve()
    vdir = root / 'voice'
    path = vdir / 'script.json'
    if not path.exists():
        sys.exit(f'no script: {path} (write the voice-over script first, SKILL.md -> Voice-over)')
    s = json.loads(path.read_text(encoding='utf-8'))
    for i, L in enumerate(s['lines']):
        L.setdefault('id', f'l{i + 1}')
    return root, vdir, path, s


def save_script(path, s):
    """one line per script line, like the templates"""
    body = ',\n'.join('    ' + json.dumps(L, ensure_ascii=False) for L in s['lines'])
    head = ''.join(f'  {json.dumps(k)}: {json.dumps(v)},\n' for k, v in s.items() if k != 'lines')
    Path(path).write_text('{\n' + head + '  "lines": [\n' + body + '\n  ]\n}\n', encoding='utf-8')


def find_audio(vdir, root, p):
    for c in (vdir / p, root / p, Path(p)):
        if c.exists():
            return c.resolve()
    sys.exit(f'audio not found: {p} (looked in {vdir}, {root} and the current folder)')


def to_wav(src, dst, sr, trim=True, max_s=None, start=None, end=None):
    """decode any audio ffmpeg reads to mono s16 WAV; trim = drop the silence at both ends"""
    cmd = ['ffmpeg', '-v', 'error', '-y']
    if start is not None:
        cmd += ['-ss', f'{start:.3f}']
    if end is not None:
        cmd += ['-to', f'{end:.3f}']
    cmd += ['-i', str(src)]
    if trim:
        t = 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05'
        cmd += ['-af', f'{t},areverse,{t},areverse']
    if max_s:
        cmd += ['-t', str(max_s)]
    cmd += ['-ac', '1', '-ar', str(sr), '-c:a', 'pcm_s16le', str(dst)]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        sys.exit(f'could not decode {src}: {r.stderr.strip()}')


def duration(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(path)],
                         capture_output=True, text=True).stdout.strip()
    return float(out or 0)


def silences(path, db=-40, min_s=0.12):
    """[(start, end), ...] of the quiet stretches in a recording (ffmpeg silencedetect)"""
    r = subprocess.run(['ffmpeg', '-v', 'info', '-i', str(path), '-af', f'silencedetect=n={db}dB:d={min_s}', '-f', 'null', '-'],
                       capture_output=True, text=True)
    starts = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', r.stderr)]
    ends = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', r.stderr)]
    return list(zip(starts, ends + [duration(path)] * (len(starts) - len(ends))))


norm = lambda w: re.sub(r'[^a-z0-9]', '', w.lower())
