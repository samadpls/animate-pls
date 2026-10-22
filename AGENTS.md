# Working on animate-pls

This repo is an agent skill. The skill itself is `plugins/animate-pls/skills/animate-pls/`; to *use* it, read its `SKILL.md`. This file is for changing it.

## Layout

- `plugins/animate-pls/skills/animate-pls/`: the skill (SKILL.md, intake, grammar, kit, styles, templates, examples, tools)
- `.claude-plugin/marketplace.json` and `plugins/animate-pls/.claude-plugin/plugin.json`: the Claude Code plugin manifests
- `docs/`: the README images

## Rules

- Pieces stay deterministic and self-contained: seeded `RNG`, no `Math.random()`, no URLs or `data:` URIs in a piece (`tools/build.mjs` enforces it).
- A change to `kit/` or a style must leave existing pieces pixel-identical unless the change is meant to alter them. Check it against the last release with `tools/framehash.mjs old/index.html new/index.html <frames…>`, on `examples/history-of-ai` and every style demo.
- Tools must run on Windows, macOS and Linux: Node's `path`, no shell-only syntax, and Python found through `tools/pyenv.mjs`. ffmpeg builds differ (some have no `drawtext` or `subtitles`), so detect a filter before using it.
- Keep the credits: animate (cth9191, MIT) is the base; the one-take format takes only the idea from onetake (noncommercial licence), so never copy its code or text.

## Test before a PR

```bash
SK=plugins/animate-pls/skills/animate-pls
for p in templates/one-take templates/beat-cut templates/piece examples/history-of-ai styles/*/demo; do node $SK/tools/build.mjs $SK/$p || exit 1; done
node $SK/tools/tile.mjs $SK/templates/one-take /tmp/tile.png 60 140 236     # prints "deterministic: true"
node $SK/tools/export.mjs $SK/templates/one-take && node $SK/tools/review.mjs $SK/templates/one-take   # format F9: PASS
node $SK/tools/voice-setup.mjs --check                                         # the voice env, if you touched the voice tools
```

CI (`.github/workflows/check.yml`) runs the builds, the tile determinism check and the one-take export and review on Linux, macOS and Windows.
