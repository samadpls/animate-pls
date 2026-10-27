# Brief: Reel: three cache failures

A template for F10 (grammar/FORMATS.md): replace the story, keep the shape. Write your own brief over this one.

## The idea in one sentence

Three Redis failures set the same database on fire for three different reasons; on the third, TTL jitter puts it out.

## Format and spec

- Format: F10 reel, cut on the beat underneath (the four acts of a catalogue: hook, three failures, the fix), because a reel has to land its claim by 1.0s and carry word captions to be watched with the sound off
- Size: 1080x1920 (main), 1080x1080 and 1080x1350 from the same scenes (LX / LY / UNIT through one fitted stage), 24fps, 120 BPM, 15.0s = 360 frames with no voice; with a voice the length follows the lines
- Style: crosshatch, the "inside the machine" navy; hero: the database, a cream drum with a face; colour rules: red = load on the database, cyan = a key the cache can serve, magenta = the hot key, green = the fix, yellow = the word being said (captions only)
- Captions: kit/captions.js, word by word, in the crosshatch hand with a yellow marker swipe, inside the TikTok + Reels + Shorts safe box (x 120–888, y 288–1248, left of x 780 below y 840)

## Beats (no voice; with a voice every cut sits on the 8th nearest the pause between two lines)

| # | t (s) | what happens | into the next | sound |
|---|---|---|---|---|
| 1 | 0.0–2.0 | hook: every key cold, a storm of requests, the database on fire under a big "3 Redis failures" (whole on frame 0) | cut on the 8th | a hit on frame 0, an alarm pulse |
| 2 | 2.0–4.0 | penetration: "?" keys fall through the cache into the database, which warms up | cut in on the database | a bass per beat, a blip per miss |
| 3 | 4.0–5.5 | close: the "?" keep landing; it sweats | cut to the cache | |
| 4 | 5.5–7.5 | stampede: the hot key's TTL bar runs out on "expires" | cut wide | a clock, a chime when it goes |
| 5 | 7.5–9.0 | everyone asks for it at once: a column of misses, the database panics | cut on the 8th | a rush of 16ths |
| 6 | 9.0–10.75 | avalanche: every TTL bar the same length, running out together; on "expire" every key goes cold | cut in on the flood | plucks, a riser into a dry crash |
| 7 | 10.75–11.5 | the flood lands; cut to its face | | the flood on 16ths, stopping dead |
| 8 | 11.5–12.0 | the hush: the picture freezes | | silence (−120 dB) |
| 9 | 12.0–15.0 | the fix: "TTL jitter" stamps on; keys come back one at a time with different TTLs; the fire goes out, it smiles; 1.15s end hold | end (no loop) | the loudest stab, a warm chord that steps down |

## Sound plan

Quiet hook pulse, a groove per failure, a riser and a dry crash for the avalanche, half a second of silence, the loudest hit on the fix (a chord stab with partials above 400 Hz so a phone speaker carries it, plus the sub), a flat chord under the hold.

## Claims and sources

- Penetration (requests for keys that don't exist), stampede (one hot key expires under concurrent load), avalanche (many keys expire together; fixed by TTL jitter) - samadpls.com, "Three Redis failures that look similar until production" (2026-08-12), which cites the Redis docs on the cache-aside pattern
