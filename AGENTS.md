# Working on animate-pls

This repo is an agent skill. The skill itself is `plugins/animate-pls/skills/animate-pls/`; to *use* it, read its `SKILL.md`. This file is for changing it.

## Layout

- `plugins/animate-pls/skills/animate-pls/`: the skill (SKILL.md, intake, grammar, kit, styles, templates, examples, tools)
- The plugin manifests, kept in step by `tools/check-manifests.mjs`: `.claude-plugin/marketplace.json` and `plugins/animate-pls/.claude-plugin/plugin.json` (Claude Code, also read by Codex and Copilot), `plugins/animate-pls/plugin.json` (Agent Plugins 1.0: Codex, Cursor, Copilot, VS Code) and `.cursor-plugin/marketplace.json` (Cursor).
- `docs/gallery/`: the 20 gallery tiles as real pieces, one per design, each telling part of samadpls.com. `node docs/gallery/build.mjs --rebuild` re-renders every `thumb.png`, writes each style's picker thumbnail (`styles/<name>/sample.jpg`, and `styles/custom.jpg`) and lays out `docs/gallery.jpg`; `--clips` also exports every tile as an aligned 1:1 clip into `docs/gallery/clips/` (not committed).

## Rules

- Pieces stay deterministic and self-contained: seeded `RNG`, no `Math.random()` or clock, no URLs or `data:` URIs in a piece, no kit name redeclared (`tools/build.mjs` enforces all of it).
- Nothing built is committed: frames, renders, reviews, storyboards, footage, voices, `index.html` and `thumb.png` are all rebuilt by the tools. Commit source and the few images the README and the picker show.
- Keep text plain and easy to read. No emojis. Comment only what the code cannot say.
- A change to `kit/` or a style must leave existing pieces pixel-identical unless the change is meant to alter them. Check it against the last release with `tools/framehash.mjs old/index.html new/index.html <frames…>`, on `examples/history-of-ai` and every style demo.
- Tools must run on Windows, macOS and Linux: Node's `path`, no shell-only syntax, and Python found through `tools/pyenv.mjs`. ffmpeg builds differ (some have no `drawtext` or `subtitles`), so detect a filter before using it.
- Keep the credits: animate (cth9191, MIT) is the base; the one-take format takes only the idea from onetake (noncommercial licence), so never copy its code or text.

## Test before a PR

```bash
SK=plugins/animate-pls/skills/animate-pls
node $SK/tools/selftest.mjs                    # the machine, every build, determinism, export and review of the templates
node $SK/tools/check-manifests.mjs             # the plugin manifests agree
node docs/gallery/build.mjs --rebuild          # if you touched a style or a tile
node $SK/tools/voice-setup.mjs --check         # the voice env, if you touched the voice tools
```

The repo has no CI on purpose. Run these locally, ideally on each OS you can reach.
