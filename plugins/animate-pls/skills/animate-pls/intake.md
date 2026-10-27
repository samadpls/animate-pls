# Intake

Ask only what you can't infer from the request. In Claude Code, AskUserQuestion takes up to 4 questions per call: ask 1–4 first, then 5–8 in a second call. In other agents ask the same questions as short numbered lists, 1–4 then 5–8. Skip the ones the request already answers. Recommended option first. If the user said "just make it", use every default and say which you picked.

## The questions

1. **What's it about, and what's the one true thing it should get across?**
   Free text. Also: anything that must be in it, anything to avoid. Read back your understanding in one sentence before going further — a wrong subject is the most expensive mistake ("history of AI" vs "history of AI video").

2. **Where will it go, and how long?** (multi-select for the formats — the first one picked is the main one)
   - 9:16 — Shorts / Reels / TikTok *(recommended for a history or explainer)*
   - 16:9 — YouTube / b-roll / a talk
   - 1:1 — a feed post *(recommended for LinkedIn: it fills the feed on phone and desktop)*
   - 4:5 — an Instagram / LinkedIn feed post

   Length: 20–30s for a quick social piece, 45–60s for a history or explainer, 15–35s for a reel (8–15s for a looper).
   When 9:16 is picked, ask which platforms it is for (TikTok / Reels / Shorts / LinkedIn, default all) and write `"review": { "platforms": [...] }` in piece.json: captions then stay clear of those apps' buttons. For LinkedIn suggest 4:5 or 1:1 as the main format and 15–30s. **Several formats** come from one piece: list them in `piece.json` `"formats"` and lay the scenes out with `LX` / `LY` / `UNIT` (SKILL.md → Formats). Each extra format costs a little layout work, not a new piece.

3. **Voice?** You write the script either way; the picture is timed to the words (SKILL.md → Voice-over).
   - **Your own voice, cloned free with VoxCPM2:** drop 15–30s of yourself talking naturally (any recording, a phone voice memo is fine) and it speaks every line in your voice and your accent, locally *(recommended for an explainer over ~30s)*
   - **A designed voice with VoxCPM2:** no recording, described in a few words (tone, age, pace)
   - **ElevenLabs:** you get the script as paste-ready text for the ElevenLabs site (the free plan works), you send back the MP3, and it's cut into lines (or the ElevenLabs connector, if your agent has it)
   - **You read the script** in one take, and it's cut into lines
   - Music only; the year/caption tags carry it *(recommended for a short social piece)*
   - On-screen handwritten narration

   With a VoxCPM2 voice, check the voice env first (`node tools/voice-setup.mjs --check`; run it without `--check` to install, ~5 GB once).

4. **The look?** *(skip the gallery when the request already names a style or brings references — go to new-style.md or the named style)* Build the gallery (`node tools/gallery.mjs <out.png> [<project>/styles]`), show it, then ask:
   - One of these, by its one-word name: cutout / crosshatch / riso / sketchbook / math / pixel / isometric / kinetic / flat / clay / comic / chalkboard / linocut / watercolor / terminal / poster *(recommend the one that fits the subject: cutout for histories and stories, crosshatch for tool and code explainers, math for equations and graphs, pixel for computing history, isometric for products and infrastructure, kinetic for reels and launch posts, flat for science and process explainers, clay for warm personal stories, comic for a funny explainer, chalkboard for a lesson or a diagram, linocut for a quote or a bold statement, watercolor for places and gentle stories, terminal for developer tools, poster for an announcement, riso or sketchbook for a softer editorial feel)*
   - A style they've made before (any `styles/<name>/` in their project)
   - custom: my own references (the gallery's last tile) — links or files (videos, stills, a web page): follow [new-style.md](new-style.md); keep the media local and uncommitted
   - Surprise me

5. **A hero?** *(ask only if the format wants one)*
   - The style's hero (cutout: the spark, a small orange character that grows with the story; crosshatch: an ink dot with eyes; …) *(recommended)*. **For a new style from references,** propose a hero native to the medium (a red seal for woodblock prints, a cursor for terminals, a pawn for a board game) as the recommended option.
   - An existing character (describe it)
   - No hero — the subject itself is the constant

6. **Music: do you have your own track?**
   - No — compose the score in code, cut to a 120 BPM grid *(recommended unless they have one)*
   - Yes — a file (WAV / MP3 / M4A) they own or licensed. Ask for its path, the part to use (start time) and the BPM if they know it. Then SKILL.md → Music: `tools/beats.mjs` maps its beats, the cuts follow the song, and export uses the track (the score adds sound effects only). Never fetch music from a site the user didn't point to.

7. **Is it about a product, app or site — should the video show the real thing?** *(ask only when the subject is a product)*
   - Yes — real screenshots and the logo: ask for the URL (`tools/capture.mjs` screenshots it) and any logo / brand files. SKILL.md → Assets. *(recommended for a product reel)*
   - No — draw everything in the style (product screens drawn from imagination must not pretend to be the real UI)

8. **Brand rules?** *(ask only with 7 = yes)* Colours, fonts, the one accent colour, words to avoid. Defaults: sample them from the screenshots.

## Defaults when unanswered
9:16, 1080×1920, 24fps, 120 BPM (an 8th = 6 frames exactly), 30–60s, music only (composed in code), no assets, the design that fits the subject (cutout if unsure), the style's own hero, format chosen from FORMATS.md by the plot engine.

## Pick the format yourself
Don't ask the user to choose a story format — it's grammar, not taste. A history or a process over time → chronology joined by shape morphs (F2). Someone wants something and a helper solves it → mission, cut on the beat (F4). One carried thing through many places → fixed-hero journey (F5). A question answered by a list → catalogue (F3). A product or feature film, or "make it feel like one continuous shot, not slides" → seamless (F9, new). A short vertical post with a hook and captions → reel (F10, new). The user's own footage or app → edit (edit.md). State the choice at the story check so they can veto it. When two formats fit (a process can be a chronology or a machine), prefer the **proven** one (see FORMATS.md status lines) and say so.
