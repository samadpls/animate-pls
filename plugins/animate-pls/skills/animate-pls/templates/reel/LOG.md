# Log: reel

## Run 1 - 2026-10-27

- Built from templates/beat-cut's shape with one fitted stage instead of one era per scene, so 9:16, 1:1 and 4:5 come from the same drawing.
- Numbers (9:16, no voice): 8 cuts, all on the 8th grid; story arc 6/6 (peak 1.2 cuts/s, the gift the loudest at p90 -10.3 dB, 0.5s at -120 dB before it); text PASS on every format; loudness -15.6 LUFS, true peak -1.0 dBTP; reel-check 6/6 (frame 0 luma spread 70, first caption 0.17s, 17/17 chunks inside the union box, captions 90–102 px, end hold 1.13s).
- With a scratch voice (macOS say, `tools/voice.mjs --scratch`): 19.25s, the cuts moved with the lines, narration density and word hits PASS, story arc 7/7, reel-check 7/7 (15 chunk onsets and 31 word highlights within 2 frames; 4 words the recogniser returned with no length were skipped).
- What the review caught: the payoff hit straddled a 100ms window inside the hush (moved the fix onto the beat); the peak act had fewer cuts than the hush (cut to the face inside the peak, froze the picture for the silence instead); question marks drawn as text overlapped the cache label (now drawn in ink); a caption chunk 2 px into the bottom band (the active word's lift now counts in the fit).
- Weakest shot: the stampede close-up on the cache. In 9:16 the database's face sits just above the caption, so a two-line chunk there would cover it; keep chunks in that shot to one line or move the camera.
