# Edit mode: a product video from the user's own footage

Read this when the user brings footage (a screen recording or product demo, MP4 / MOV / WEBM) or wants their own web app recorded. The result is a product video in one of the styles: the footage in a card framed by the style itself (an inked rim on a desk, a torn-paper window, a hairline slab), eased zooms that land on the real action, a clean cursor and click rings, hand-lettered captions, a title and an end card, dead air cut, sound under it. Everything runs locally: ffmpeg, Playwright, Node (and the voice env's faster-whisper if you want word times).

Start from [templates/edit/](templates/edit/): a 13.5s crosshatch piece, 16:9 and 9:16, made from a recording of animate-pls itself (`sample/studio.html` + `sample/steps.json`). Gallery tile `docs/gallery/15-edit/` is a 3.5s 1:1 cutout version of the same recording.

## Rules

1. **Only footage the user owns or may use.** Record only pages or sites the user owns (the same rule as `tools/capture.mjs`). Ask if unsure.
2. **Redact personal data on screen**: names, emails, tokens, customer data. For an import, `TIMELINE.redact = [{ clip, t0, t1, x, y, w, h, mode: 'blur' | 'pixelate' }]` (source seconds, source pixels). For a recording, the steps file's `"blur": ["#email"]` blurs those elements in every frame, and `"secret": true` on a `type` step keeps its text out of footage.json. Look at every frame where the data shows.
3. **Cuts** (the rules of browser-use/video-use, MIT): never cut inside a word; pad every cut 30-200 ms (`--cut auto` keeps 0.3s of stillness on each side); a 30 ms audio fade at every join (footage.mjs and `--mix` do it); captions last, on the output timeline; **verify every cut by looking at frames around it** (`node tools/still.mjs <piece> <t-1>,<t-0.5>,<t>,<t+0.5>,<t+1> cut.png --scale 0.3` for each join in `footage/<clip>/map.json`).
4. **Clicks and keys can't be recovered from pixels.** footage.mjs's suggestions on an imported video are heuristics (pixel activity): check each one on the sheet. A recording made with record.mjs logs the real events, so zooms, the cursor and the click rings come from them.
5. **Footage is a build product.** `<piece>/footage/` and `footage.json` are never committed (`.gitignore`). List each clip in piece.json `"footage"`, so `node tools/footage.mjs <piece> --ensure` remakes it on a fresh clone. A piece without its footage still builds: the card shows a labelled placeholder in the style.
6. **Deterministic, per machine.** The same frames give the same pixels (the tile check passes), and the recorder gives the same frames every run. JPEG decoders differ a little across OSes, so pixel identity holds on one machine.

## The flow

### 0. Intake (only what you can't infer; ask with options)
- **The footage**: a file (which, and what part matters), or the user's web app (a local page or a site they own) and what to show in it, step by step.
- **The goal and the audience**: a launch post, a feature demo, onboarding, a changelog.
- **Length and formats**: 15-45s; `16:9` for the site and YouTube, `9:16` for reels, `1:1` for feeds.
- **Sound**: the recording's own audio (its narration or UI sounds), a voice-over (see SKILL.md, Voice-over), the user's track (SKILL.md, Music) or the composed score.
- **Captions**: what each one says (short: 2-5 words, one idea per action).
- **Style**: show the gallery. For product films crosshatch (a card on the desk), cutout (a torn-paper window) or isometric (a hairline slab) work well.
- **Title and end card**: the product's name, its promise, the call to action.

### 1. Import
- **A video**: `node tools/footage.mjs pieces/<name> <clip> <file> [--cut auto] [--keep 0-4.2,6-12.5] [--max 2560]`. It probes the file (fps, size, rotation, HDR: an HLG/PQ phone video without zscale stops and asks for an SDR export) and makes the frame rate constant at the piece's fps. It writes `footage/<clip>/f00000.jpg ...`, `footage/<clip>.wav`, `footage/<clip>/map.json` (output time to source time) and the sheet `footage/<clip>-sheet.jpg`, then merges the entry into `footage.json`. `--cut auto` removes dead air: silent (-35 dB, >= 0.5s) **and** still on screen (a pixel-activity pass, not freezedetect, which takes a moving cursor for a freeze), at least 1.2s long. `--max 2560` keeps a 1440p screen sharp under a 2x zoom.
- **The user's web app**: write a steps file (format in the header of `tools/record.mjs`: `goto`, `click`, `hover`, `type`, `press`, `scroll`, `wait`, `pause`, `mark`) and run `node tools/record.mjs pieces/<name> <clip> steps.json`. Playwright drives the page on a fake clock and takes one screenshot per frame. It never records the screen in real time, and CSS animations are stepped on the same clock. The pointer isn't in the screenshots: its eased path and every click, typed field and `mark` (with element boxes, in frame pixels) go to footage.json. Use `"scale": 2` (the default) so a 2x zoom stays sharp, and a 3:2 viewport (`[1200, 800]`) to serve 16:9, 1:1 and 9:16 from one take. About 75-90 ms a frame.
- **Several clips** (a montage, a launch video): import each under its own name. Any number of clips can share a piece, and windows can overlap.
- Add each clip to piece.json: `"footage": { "<clip>": { "record": "steps.json" } }` or `{ "import": "media/demo.mp4", "cut": "auto" }`.

### 2. Look
Read the sheet: thumbnails with timecodes and frame numbers, the suggested zooms (orange, numbered, in source pixels), the recorded events (blue), the activity strip with the cut joins (red). Read `footage.json`: `events`, `suggestions`, `cuts.map`. Choose the ranges to keep, two or three zooms (one per action that matters), callouts, the captions and their moments.

### 3. The edit plan (one check-in)
Copy `piece.json` and `src/` from `templates/edit/` into the piece. Set the edit in `src/head.html`:
- `TIMELINE.clips = [{ name, t0, t1, src0, speed }]`: **output** seconds `[t0, t1]` play the footage from **source** second `src0` (a jump cut is two windows of one clip; `speed: 1.5` for a slow stretch). The frames hold at both ends.
- `TIMELINE.zooms`: in **source** seconds, so they stay on the action whatever the clip windows do. Give an event (`{ clip, event: 'click:#approve' }`), several (`events: [...]`, their union box), or a box (`{ clip, t0, t1, x, y, w, h }`). Optional: `scale`, `hold`, `in`, `land`, `out`, `pad`.
- `TIMELINE.callouts = [{ clip, t0, t1, x, y, text, dx, dy }]`: pinned to source pixels, so they follow the zoom.
- `TIMELINE.redact`, `CAPTIONS` (each cued on an event: `{ text, at: 'click:#approve', dt }`), `PRODUCT` (title and end card text).

Build, then render the key frames (the title, two zoomed moments with their captions, the end card) side by side: `node tools/still.mjs pieces/<name> 1.0,3.6,7.6,13.2 plan.png --scale 0.35`. Show them with the plan as one table: kept ranges, each zoom (what, when, how close), captions, cards, sound. Ask: **approve / change the cut / change the zooms or words**.

### 4. Build, export, review
1. `node tools/build.mjs pieces/<name>` (injects footage.json as `FOOTAGE`).
2. `node tools/tile.mjs pieces/<name> tile.png <frames>` must print `deterministic: true`. Look at it.
3. Sound: for the recording's own audio, `node tools/footage.mjs pieces/<name> --mix` (every clip's audio on the output timeline, 30 ms fades), then piece.json `"voice": { "file": "footage/mix.wav", "music": -16 }` (the score under it, ducked) or `"music": { "file": "footage/mix.wav" }` (the recording's sound replaces the score). Without audio, the template's score cues its sounds on the recorder's events (a tick per key, the click, a chime on the answer).
4. `node tools/export.mjs pieces/<name> --formats 16:9,9:16 --share`, then `node tools/review.mjs pieces/<name>` (and `--format 9:16`). Text must be inside the safe zones: on 9:16 the captions stay left of the platform buttons (x < 780 below y 840).
5. Verify every cut (rule 3) and every redaction by eye.

### 5. Deliver
As in SKILL.md: the share file, the numbers, what the review caught, the weakest moment, and what you didn't verify (you can't hear the mix; zoom suggestions on an imported video are guesses).

## The camera and layouts (kit/footage.js)

- **Zoom timing**: the push starts 1.1s before the action, settles 0.3s before it, holds at least 1.0s after it, and eases back over 1.0s. Zooms closer than 2.0s become one pan. Default 1.8x, typing 2.2x, scroll 1.3x, fitted to the box with 25% room and at most 2.5x (a big box may fit below 1.5x and stays whole). An explicit `scale` goes up to the 2.8x cap. The view never shows past the frame's edge on either axis. The size is eased in log space about the point the two views share, so a zoom goes *into* its target.
- **Eases**: in `cubic-bezier(0.45, 0, 0.15, 1)`, out `(0.6, 0, 0.3, 1)`, pan `(0.45, 0, 0.2, 1)`. The common `(0.16, 1, 0.3, 1)` starts at full speed: a third of the move lands in one frame at 24 fps, a visible jolt.
- **The card**: `ftCard(id, x, y, w, h, { pad, radius, chrome, label })` draws the card in the active style: `STYLE.backdrop` fills it, `STYLE.window` frames it, `STYLE.blob` draws the window dots. `look: 'plain'` gives a neutral card. The footage, cursor and camera move on every frame; the frame around them boils with the style.
- **The cursor and clicks**: a clean arrow drawn in code, at least ~26 px on screen, eased along the recorded path; an expanding ring in `STYLE.heroColor` at each click, with a small press of the arrow.
- **9:16 layouts** (`ftLayout(kind, { name, aspect })`): `'card'` (default; the landscape recording as a card, captions under it), `'follow'` (a full-bleed crop that follows the cursor; only for sources at least 1440 px tall), `'stack'` (the recording over a second clip, such as a face cam).
- **Helpers**: `ftOut(clip, s)` is the output time of source second s (cue captions and sounds on events), `ftEvent(clip, 'click:#sel')`, `ftEvents(clip, type)`, `ftSrc(clip, t)`, `ftToCard(clip, sx, sy)` (pin anything to the UI), `ftFit`.
- **Cost**: the frame feed adds about 10-20 ms a frame; a crosshatch 1920x1080 frame with a card is about 130 ms to render and encode on one page (export runs 4).

## Credits

Ideas and numbers, our own code: browser-use/video-use (MIT; the cut rules and the check of every cut), connerkward/screenstudio-alt-skill (MIT; idle-cut and zoom parameters, the edge floor), OpenScreen (MIT; zoom depths, timings and shadow layers, numbers only), syi0808/screenize (Apache-2.0; zoom ranges by activity), 99proteam/scriptreel (MIT; a scripted recorder on a virtual clock with element boxes), WyattBlue/auto-editor (Unlicense; thresholds and margins). Cap and Recordly (AGPL) were read for ideas only; nothing was copied.
