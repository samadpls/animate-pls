# Styles

A style is a plug-in: the story, formats, timing, sound, renderer and tools stay the same, and the style supplies the look. A piece picks one with `"style": "<name>"` in its `piece.json`, and `tools/build.mjs` puts that style's `kit.js` into the built file.

Build the gallery of every style's sample: `node tools/gallery.mjs styles.png [<project>/styles]`.

| style | the look | motion | proven on |
|---|---|---|---|
| [cutout](cutout/STYLE.md) | cut paper: torn paper, drop shadows, crayon, patterns, characters with faces | on 2s | a 60s history (15 worlds, 13 morphs) |
| [crosshatch](crosshatch/STYLE.md) | sketchy ink that boils, hatch / pencil shading, warm paper and navy "inside the machine" | on 2s | several short explainers |
| [riso](riso/STYLE.md) | a three-ink risograph print: halftone screens, overprints, misregistration | on 2s | a 6s frame-matched study |
| [sketchbook](sketchbook/STYLE.md) | graphite and one accent colour on a sketchbook page, hand lettering | on 2s | a 15s explainer |
| [math](math/STYLE.md) | a manim-style math explainer: black stage, axes and graphs, colour-coded variables, smooth easing | on 1s | two short math explainers |
| [isometric](isometric/STYLE.md) | isometric product line art: constant hairlines, white faces, rounded slabs, one dark accent; light or dark ground | on 1s, spring settles | this demo (the first style made with new-style.md) |
| [pixel](pixel/STYLE.md) | low-resolution eras: draw at the true resolution, upscale nearest-neighbour | on 1s or 2s | a fixed-stage history of AI video |
| [kinetic](kinetic/STYLE.md) | kinetic typography for reels and launch posts: huge condensed caps on a flat ground (warm black, paper or signal yellow), one pop colour only for the keyword's box, die-cut stickers, an asterisk hero | on 1s, slams and snappy springs | this demo and a gallery tile |
| [flat](flat/STYLE.md) | a flat-vector science explainer in warm mid-century colours: no outlines, flat fills on an ink-teal night, 45° long shadows, rim light, tight glows on lights only, round big-eyed creatures | on 1s, eases and springs | this demo and a gallery tile |
| [clay](clay/STYLE.md) | plasticine stop motion: soft lit clay pieces with speckle, tool marks and fingerprints, cast and contact shadows, a boiling hero, rolled-clay lettering on a felt and clay-table set | on 2s | this demo and a gallery tile |
| [comic](comic/STYLE.md) | a printed comic page: tapered brush-ink outlines, flat process inks with Ben-Day dots on newsprint, panels, balloons, sound effects, speed lines | on 2s | this demo and a gallery tile |
| [chalkboard](chalkboard/STYLE.md) | a classroom slate: grainy chalk written stroke by stroke over the ghosts of old lessons, falling dust, white chalk with yellow, coral and teal | on 2s | this demo and a gallery tile |
| [linocut](linocut/STYLE.md) | a hand-carved relief print: warm black and one vermilion block on cream paper, gouge cuts that follow the form, the red slightly off register | on 2s | this demo and a gallery tile |
| [watercolor](watercolor/STYLE.md) | loose watercolour on cold-press paper: glazed washes with pooled edges, granulation, white paper for highlights, a sepia pen line | on 2s | this demo and a gallery tile |
| [terminal](terminal/STYLE.md) | a warm developer terminal: cream and amber monospace on warm black, typed commands, block-character bars, ASCII boxes, a light CRT finish | on 1s | this demo and a gallery tile |
| [poster](poster/STYLE.md) | a 1970s screenprint: flat spot inks off register, sunbursts and rainbow bands, heavy round type with echo outlines | on 2s | this demo and a gallery tile |
| custom | any other look: show it a video, stills or a web page and it measures the style, matches frames with you and saves `styles/<name>/` ([new-style.md](../new-style.md)) | either | woodblock prints, neon signs (test runs) |

A new look gets made from the user's references with [new-style.md](../new-style.md), then saved as a style beside the project's pieces (`<project>/styles/<name>/`), where `build.mjs` finds it.

## What a style folder holds

```
styles/<name>/
  STYLE.md     the look's rules: what it is, palette, line and texture, motion habits, its frame checklist, do/don't, proven on
  kit.js       the drawing code, built on kit/core.js, ending in `const STYLE = { ... }`
  sample.jpg   its thumbnail in the intake gallery, 540x540: the style's README tile (docs/gallery/build.mjs writes it);
               a style made in a project can use sample.png instead, one frame of its demo at 540x960
  demo/        a 4–8s piece in the style (piece.json + src/) that builds, tiles deterministic and morphs once
```

## The STYLE hooks (what kit/morph.js calls)

The renderer draws nothing itself. Every `kit.js` ends with:

```js
const STYLE = {
  name: '<name>',
  paper: '#hex',                 // the blank sheet a morph happens on
  backdrop(c, o) { ... },        // fill the frame with colour c, in the medium (o: see window; absent outside morphs)
  window(P, key, src, o) { ... }, // draw canvas src seen through outline P (screen coords): a torn hole, an inked iris, a printed circle
                                 //   o = { c: the bridge shape's colour, u: 0..1 progress, phase: 'shrink' | 'morph' | 'grow', eraA, eraB }
  blob(P, c, key, u, o) { ... }, // the morphing shape itself (outline P, colour c, progress u, in the medium)
  hero(x, y, r, o) { ... },      // the style's hero, for hero-to-hero bridges (SP(x, y, r, n) shapes): r = half the hero's size, n may be ignored
  heroColor: '#hex', heroPts(x, y, r, n) { ... },   // the hero's colour and outline for bridges (optional)
  post() { ... },                // after every frame: grain, a print pass, an upscale (optional)
  ones: false,                   // true = motion on 1s (TT = every frame); default on 2s
};
```

Rules every kit keeps:
- **Deterministic:** randomness from `RNG(...)` keys only; anything that changes per boil step keys on `B`; never `Math.random()` or the clock. `tools/tile.mjs` checks it.
- **Nothing carries between frames.** The renderer clears each era's layer; a kit never keeps drawing state across `renderFrame` calls (caches of *static* things, keyed and seeded, are fine).
- **Everything is code.** No images, fonts files, `data:` URIs or URLs. Fonts are local system fonts with fallbacks for Windows, macOS and Linux.
- **Captions and tags go through `DEFER`** (see `yearTag` in cutout) so they draw after the camera, at screen size. Place them from the head's `SAFE` (`SAFE.top + 90`, `H - SAFE.bottom - 60`: y 330 and 1440 on 9:16), never at fixed 9:16 numbers, so 1:1, 4:5 and 16:9 place them too.
- **Kits don't mix.** One style per piece: kits reuse names (`handText`, `STYLE`), so a piece that needs two looks gets a merged kit.

Renderer quirks a kit has to know:
- **Colours given to the renderer are 6-digit hex** (`ERA_BG`, `heroColor`, bridge shapes' `c`): `mixHex` blends them. Mid-morph, `blob` and `backdrop` receive the blend as an `rgb(r,g,b)` string.
- **Eras draw under the camera transform** (`push`, `bump`, `pieceCam`). A look with constant line widths (hairlines, pixels) divides widths by the current zoom (`ctx.getTransform().a`).
- **The morph resamples both outlines by angle around their centroids** — bridge shapes of similar proportions morph cleanly; a dot into a long thin bar pinches.
- **Captions drawn through `DEFER` stay at screen size during a morph:** the old era's tags show over the shrinking window, the new era's over the growing one. Suppress them in a style's caption helper if they fight the morph (e.g. skip when the era layer is being drawn for a window: compare `TT` with the bridge times).

### Names a kit must not reuse

`kit/core.js`, `kit/morph.js` and the piece head already define these at the top level; redeclaring one either fails the build or silently replaces it: `W`, `H`, `FPS`, `ctx`, `F`, `B`, `TT`, `E0`, `DEFER`, `SPARK_AT`, `C`, `MONO`, `RAINBOW`, `TAU`, `DEG`, `RNG`, `hash`, `clamp`, `lerp`, `seg`, `past`, `dist`, `EZ`, `ev`, `popS`, `smooth` (a smoothstep), `mod`, `ellipsePts`, `rrectPts`, `arcPts`, `xform`, `bbox`, `resample`, `pathLen`, `subPath`, `pointAt`, `wobble`, `trace`, `ink`, `paint`, `texture`, `hatch`, `pencil`, `stipple`, `grain`, `construct`, `cline`, `ruler`, `sparkBurst`, `burst`, `star4`, `rainbow`, `hexGrid`, `irisRim`, `irisHole`, `camera`, `screen`, `toScreen`, `fillAll`, `monoText`, `monoW`, `handwrite`, `drawPencil`, `asterisk`, `camOf`, `push`, `bump`, `SP`, `starPts`, `byAngle`, `mixHex`, `maskK`, `layer`, `renderEra`, `renderFrame`, `HAND`, `CX`, `TIMELINE`, `SPRING`, `springEase`, `springMove`, `springTrack`, `LX`, `LY`, `UNIT`, `PORTRAIT`, `WIDE`, `asset`, `drawAsset`, `ASSETS`, `BEATS`, `FORMAT`, `FORMATS`, `GRID0`, `onBeat`. Prefix a kit's own helpers (`iso…`, `pix…`, `riso…`) when in doubt. `tools/build.mjs` checks it: a style kit or src file that redeclares a top-level name of `kit/core.js`, `morph.js`, `board.js`, `score-head.js` or `score-tail.js` fails the build, naming the line.

## Making a style from an existing piece (porting)

1. Extract the look's drawing code into `kit.js` on top of `kit/core.js` (drop what core already has; keep names stable). A brand-new look can start from `templates/style/kit.js`.
2. Write `STYLE` hooks in the medium.
3. Build `demo/` (copy `crosshatch/demo/`): two eras, one shape morph, a hero, a caption, 3+ details of background life.
4. `node tools/build.mjs styles/<name>/demo`, then `node tools/tile.mjs styles/<name>/demo tile.png <frames>` → `deterministic: true`, and look at the tile.
5. `node tools/still.mjs styles/<name>/demo <t> styles/<name>/sample.png --scale 0.5` (a style shipped in this skill gets a README gallery tile instead, and `docs/gallery/build.mjs` writes its `sample.jpg`).
6. Write `STYLE.md` with its frame checklist.
