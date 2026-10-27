# Flat vector

![sample](sample.jpg)

A flat-vector science explainer in warm mid-century poster colours: no outlines anywhere, flat fills (cream, amber, terracotta, teal, sage, muted mustard) on a flat deep ink-teal night, and one light from the top-left. Every object casts a long shadow down-right at 45° that fades to nothing, carries a darker crescent on its far side and a thin cream rim light on its lit side; only light sources (a star, a bulb, a photon, a lamp) get a small tight glow. Round geometric creatures with big eyes, stars that twinkle and drift, motes, parallax layers, a geometric display face. Motion on 1s, eased and sprung. Studied from the flat-vector explainer genre as a genre: ideas only, no studio's characters, layouts or trade dress.

## Palette and meaning (`FLP` in kit.js)

| colour | hex | meaning |
|---|---|---|
| ground | `#0f2a2e` | the deep ink-teal night: flat, with a barely-there second tone toward the bottom (`flGround(c)`: 6% darker at the top, 2.5% lighter at the bottom). Also `paper`, the blank sheet a morph happens on |
| ink | `#21180f` | eyes, mouths, type on cream plates: a warm near-black |
| shadow | `#030b0c` | long shadows: alpha .45-.5 at the object, 0 at the end |
| cream | `#f4e7cc` | rim light, stars, the sun, captions' type, neutral things (a wagon before it is routed, a sugar cube) |
| amber | `#f29a35` | **the hero only** (reserved) |
| terracotta | `#dd6a4c` (`FLP.coral`) | a hue for one meaning per piece (a planet, kitchen, heat) |
| teal | `#3f9c8e` | a hue (travel, chloroplasts) |
| sage | `#9cb48a` | a hue (the leaf cell, a machine) |
| mustard | `#c9a640` | a hue: muted, more yellow and much less saturated than the hero's amber (banking, a gear, a ring) |
| plate | `#1c4549` | caption plates: one step up from the ground |

**Why ink-teal and not a warm dark:** at L ≈ 12% it is light enough that a long shadow (`#030b0c` at .5) reads as a clearly darker band across it, where a near-black brown (`#1d1a17`) swallows the shadows; and it is cool, so every warm colour (cream, amber, terracotta, mustard) sits forward of it and the amber hero is the warmest thing in the frame. Teal objects stay readable on it because they are four times lighter (L 43% vs 12%). A second era can take another deep, quiet ground of the same weight (the demo's leaf interior is moss `#1e2a1b`). Never a blue-purple, violet or indigo ground or object, never a glowing gradient ground.

Each hue has three tones from the kit, never picked by hand: base, `flLight(c)` (toward warm white) for lit parts and `flShade(c)` (toward the ink-teal night, never grey) for the shade crescent. At most six hues plus the ground in a frame, and each hue means one thing for the whole piece.

## Line and texture

- **No outlines.** Shapes are fills; a mouth, a closed eye or a steam curl may be a round-capped stroke (a feature, not an outline).
- **Generous radii:** circles, capsules, rounded rectangles with r ≥ 20-25% of the short side (`flRRect` defaults to 25%). No spikes; a gear's teeth are short and blunt.
- **One light, top-left.** `flSolid` does the three things every solid gets: the long shadow (`flLongShadow`: the convex hull of the shape and the shape moved along `FLSD`, filled with a fade), the shade crescent (the shape minus itself moved toward the light, about 32% of its half size by default) and the rim (the shape minus itself moved 4-5% away from the light, cream at alpha .55).
- **Glow** only on light sources (the sun, a bulb, a photon, a lamp, a comet's head), small and tight: `flGlow` is a `'lighter'` radial gradient that falls to 8% by two thirds of its radius; keep the radius within ~1.5× the source. Never a soft bloom behind objects or over the scene, never `shadowBlur`. The hero has no body glow; its antenna bulb has one.
- Long shadows are about 2.2× an object's half size, so a standing object's shadow runs at least twice its size; flat things on the ground (tracks, paths, plates) get a short hard offset instead (`flBand`).
- A faint static grain of warm specks over the frame (`flGrain`, a cached seeded tile; `const FL_NOGRAIN = true` turns it off). No boil.
- Type: a geometric display face, bold: `FLFONT` = `"Futura", "Century Gothic", "URW Gothic", "URW Gothic L", "Avant Garde", "Bahnschrift", "Trebuchet MS", sans-serif` (Futura on macOS; Century Gothic on Windows with Office, else Bahnschrift on Windows 10+; URW Gothic, the ghostscript fonts, on Linux). Never a generic UI sans as the display face. Faces differ in width per OS (Futura Bold is ~13% wider than Avenir Next Bold), so every plate and label measures its text and shrinks it to fit (`maxW`, `flFitText`). Captions are cream on a deep teal pill (`flCaption`), tags ink on a cream pill with a hue dot (`flTag`), both with their own long shadow.

## Motion habits

- On 1s (`ones: true`): smooth. `export.mjs --blur 4` is fine.
- Travel on eases (`EZ.io`, `EZ.o3`), pops and characters on springs (`springMove`, `springEase` with `SPRING.playful` for the hero and signs, `SPRING.smooth` for cameras). Things arrive and settle; a held frame is still alive.
- Idle life is part of the look: stars twinkle and drift in parallax (`flStars`, nearer = bigger = faster), motes rise (`flMotes`), planet bands slide inside the planet (`flPlanet`), gears turn, the sun's rays turn, the hero bobs, blinks every ~3s and its antenna bulb pulses.
- Camera: still or a slow push of a few percent (`push` about the subject, so it stays put); pans between stations; morph bridges often (the genre's signature).

## Kit API (`kit.js`, on top of `kit/core.js`)

- Colour: `flRGB`, `flMix(a, b, u)`, `flA(c, alpha)`, `flLight(c, k)`, `flShade(c, k)`, `flLum(c)` (all take `#hex` or the renderer's mid-morph `rgb()`).
- Geometry: `flPath(P, dx, dy, fresh)`, `flHull`, `flCircle`, `flRRect`, `flCapsule`, `flCapsuleAB(a, b, w)`, `flBubblePts(x, y, w, h, { tail })`, `flGearPts`, `flArrowPts`, `flCloudPts`.
- The medium: `flSolid(P, c, { shadow, sa, glow, glowC, ga, shade, shadeC, rim, rimC, ra, inner })` (the primitive; `inner(x, y, s)` draws inside the clip before shade and rim), `flLongShadow(P, len, { a, c })`, `flGlow(x, y, r, c, a)`, `flBand(P, { w, c, shadow })`.
- World: `flGround(c)`, `flStars(key, { n, drift, x0, y0, x1, y1 })`, `flMotes(key, { n, rise, size, c })`, `flHills(y0, c, { amp, wl, drift })`, `flCloud(x, y, w, h, c)`, `flSun(x, y, r)` (the light source: no shadow, a tight glow), `flPlanet(x, y, r, c, { ring, tilt, bands, spin })`, `flComet(x, y, ang, len)`.
- Icons: `flGear(x, y, r, teeth, rot, c)`, `flDoc(x, y, w, h, c, { lines, frac, title })`, `flSign(x, y, r, ang, c, { glow })` (a round sign with an arrow), `flArrowPath(P, { w, c, frac, speed })` (a band with dashes flowing along it and a rounded head), `flBubble(x, y, w, h, c, { tail, lines, wave })`.
- Hero: `flHero(x, y, r, { mood, look, hands, squash, key, glow })`: a round amber creature (no body glow unless asked), `r` = body radius; moods `happy`, `wow`, `focus`, `wink`, `sleepy`; `look: [-1..1, -1..1]` moves the pupils; `hands: [[x, y], ...]` reaches stubby arms to world points (a lever, a cube); sets `SPARK_AT`.
- Text: `FLFONT`; `flPlateNow(str, x, y, size, { align, fill, color, dot, k, maxW, shadow })` (shrinks the type so the plate fits `maxW`), `flFitText(str, x, y, size, maxW, { color, align })`, `flTag(str, { x, y, size, dot, at, maxW, shadow })`, `flCaption(str, { x, y, size, at, maxW, shadow })` (through `DEFER`; both fade out as a morph bridge starts closing the era; captions default to the 9:16 caption width, left of x 780).
- `STYLE`: `backdrop` = the gradient ground plus stars; `window` = the other world through a clean round porthole: a flat rim in the bridge colour's light tone, lit on its top-left, an inner shadow, a long shadow; `blob` = a flat solid with its long shadow; `hero` / `heroPts` = the amber creature and its round body; `heroColor` amber; `post` = the grain; `ones: true`. `paper` is `#0f2a2e`.

## Frame checklist (on top of grammar/FRAME.md)

1. **No outlines.** Every edge is the meeting of two flat fills.
2. **One light.** Every shadow points down-right at the same 45°, every rim light is on the top-left, every shade crescent bottom-right; none is drawn by hand.
3. **Every standing object casts a long shadow** that fades to 0 over at least twice its size, and the draw order is back to front (a shadow falls on what is behind it).
4. **The ground is one deep quiet colour** (ink-teal by default): flat or two barely different tones, never a glowing gradient, never black, never blue-purple.
5. **Only light sources glow**, small and tight (≤ ~1.5× the source): the sun, a bulb, a photon, a lamp. No bloom behind objects or over the scene.
6. **The hero is the warmest value** and the only amber; warm mid-century colours only (cream, amber, terracotta, teal, sage, mustard), at most six plus the ground, each meaning one thing; nothing violet, purple or indigo.
7. **Generous radii**, capsules and circles; no spikes, no hairlines.
8. **At least three pieces of idle life** (twinkle, motes, a turning gear, sliding bands, a blink).
9. **Text is set in the geometric display face** (Futura or its per-OS fallback), bold, cream on a deep teal pill or ink on a cream pill, fitted to its width, ≥ 50px at 1080, inside the safe area.
10. **Bridge shapes of similar proportions** (a planet into a cell, a dot into a coin), drawn as flat solids with their shadows.

## Do / don't

- **Do** build everything from `flSolid`; pass `inner` for bands, craters and features clipped inside a shape.
- **Do** transform points (`xform`) to rotate a solid, not `ctx.rotate`: the shadow direction must stay fixed on screen.
- **Do** reserve amber for the hero; give the sun cream.
- **Don't** use `shadowBlur` or `filter: blur` for glows (60 ms+ on many paths); use `flGlow`, small, on light sources only.
- **Don't** use violet, purple, indigo or blue-purple anywhere, a glowing gradient ground, or a generic UI sans (Segoe UI, Helvetica, Avenir) as the display face.
- **Don't** give flat things on the ground (roads, tracks, paths) a long shadow; give them `flBand`'s short offset.
- **Don't** copy any studio's birds, characters, colour scripts or layouts; the genre is the reference, not a channel.

## Cost

Measured with `tools/tile.mjs` in headless Chromium on an Apple M3 Pro: the demo at 1080x1920 is 14-23 ms a frame in space and 28-30 ms in the cell (about 40 flat solids with shadows), 6 ms on a morph frame; at 1080x1080 12-20 ms; at 1920x1080 16-29 ms; the 1080x1080 gallery tile 12-14 ms (25 on the first, warm-up frame).

## Credits

- The look: the flat-vector science-explainer genre (studied as a genre, ideas only; no studio named, no characters or layouts copied).
- The long-shadow construction (the shape swept along 45°, filled with a fade toward the ground): an idea from ProVideo Coalition, "Long shadows in After Effects", https://www.provideocoalition.com/long-shadows-in-after-effects/ (an article; nothing copied).
- No third-party code is ported; everything is written on `kit/core.js`.

## Proven on

This demo and the gallery tile. `demo/` (6s, 9:16 main, also 1:1 and 16:9, 120 BPM, 24fps): a star sends light along an arrow path to a terracotta planet with a mustard ring while the hero watches; at 3.0s the planet becomes a sage leaf cell on a moss ground, whose gears turn the light into sugar cubes that roll out to the hero. Tile deterministic, review passes (text, morph on the grid, story arc). `docs/gallery/12-flat/` (3s, 1:1): ArchData's switchyard on the ink-teal night, the hero throwing the switch that sends a generated conversation onto its policy's track. No full piece yet.
