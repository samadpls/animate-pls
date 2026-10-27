# Credits

animate-pls is built on other people's open-source work.

## Code we started from or adapted

- **[animate](https://github.com/cth9191/animate)** by cth9191 (MIT) is the base: the first seven styles, the kit, the story grammar and the tools. The [licence](../LICENSE) keeps cth9191's copyright notice alongside samadpls'.
- **[drawn-by-code](https://github.com/illodev/drawn-by-code)** by illodev (MIT). The clay style's shading and sprite cache, and the poster style's echo-band lettering, sunburst wedges and wavy outline, are adapted from its clay and 70s-poster kits (commit 3c9c949), rewritten to use our seeded randomness and system fonts.
- **[explainroo](https://github.com/vincentsch/explainroo)** by Vincent Schmalbach (MIT). The way `kit/captions.js` splits a line into even caption chunks follows its `balancePhrases`.

## Tools animate-pls runs

- **[VoxCPM2](https://github.com/OpenBMB/VoxCPM)** by OpenBMB (Apache-2.0) is the voice.
- **[faster-whisper](https://github.com/SYSTRAN/faster-whisper)** (MIT) times the words.
- **[Playwright](https://github.com/microsoft/playwright)** (Apache-2.0) and **[ffmpeg](https://ffmpeg.org)** render and encode.

## Ideas only (no code or text copied)

- **[onetake](https://github.com/feitangyuan/onetake)** by feitangyuan: the idea behind the seamless (one-take) format.
- **[video-use](https://github.com/browser-use/video-use)** (MIT): the cutting rules in edit mode (never cut inside a word, short fades at every join, captions last).
- **[screenstudio-alt](https://github.com/connerkward/screenstudio-alt-skill)** (MIT), **[OpenScreen](https://github.com/siddharthvaddem/openscreen)** (MIT), **[Screenize](https://github.com/syi0808/screenize)** (Apache-2.0) and **[scriptreel](https://github.com/99proteam/scriptreel)** (MIT): zoom timings and levels, and the fake-clock recorder.
- **[auto-editor](https://github.com/WyattBlue/auto-editor)** (Unlicense): cutting dead air by loudness and motion.
- **[HyperFrames](https://github.com/heygen-com/hyperframes)** by HeyGen (Apache-2.0): brand tokens for the kinetic style, and reel caption timing.
- **[pycaps](https://github.com/francozanardi/pycaps)** (MIT): the caption pop.
- **[chalkboard](https://github.com/0xmmo/chalkboard)** by Mohamed Moustafa: chalk drawn with dust holes punched out of it.
- **[cool-retro-term](https://github.com/Swordfish90/cool-retro-term)** (GPL): the terminal style's scanlines and phosphor.
- **Tyler Hobbs**, [A Guide to Simulating Watercolor Paint with Generative Art](https://tylerxhobbs.com/essays/2017/a-generative-approach-to-simulating-watercolor-paints): the watercolour washes.
- Platform safe zones come from the published guides of TikTok, Meta (Instagram Reels) and Google (YouTube Shorts).

More video skills for coding agents: **[awesome-claude-video-skills](https://github.com/zhuyansen/awesome-claude-video-skills)**. The resources this release learned from are listed in [RESOURCES.md](RESOURCES.md).
