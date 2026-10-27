# Blueprint

An architect's drawing sheet. A deep blueprint-blue ground with a faint fine grid and a stronger grid every 5 cells. Everything is technical line work in white and pale cyan at constant weights. Dimension lines carry filled arrowheads and figures, labels are condensed capitals, and a sheet border frames the drawing with a title block in the bottom-right corner. One reserved brass colour belongs to the hero, a bow compass with two dot eyes, and to the marks it makes. Lines plot on along their length, then everything holds. This look was designed from a brief, not measured from references.

## Palette and meaning (`BP` in kit.js)

| role | value | used for |
|---|---|---|
| ground / `paper` | `#123a7a` | the sheet; `bpKnock` re-lays it (with its grid) to hide lines behind a nearer part |
| line | `#eef6ff` | object lines, lettering, the border, the title block |
| thin | `#a9d3ff` | dimension, extension, centre and hidden lines, arrowheads, minor rules |
| grid | fine `rgba(168,210,255,0.085)` every 24px · major `0.20` every 120px | the paper |
| accent | `#ffc857` (brass) | the hero and what it draws. Nothing else |
| print pass | vignette to `rgba(3,14,44,0.34)`, 9 soft mottle patches, paper specks | `post()`, static and seeded |

## Line, type, geometry

- **Weights are constant on screen** (divided by the camera zoom). `BPW.thick` 3.6px for object outlines, `med` 2.6px for inner details, `thin` 1.7px for dimension, extension, centre and hidden lines. Round caps, no wobble, no boil.
- **Line types:** solid (visible), `hidden` dashes `[12, 7]`, `center` long-short `[30, 7, 5, 7]`, `phantom` `[30, 6, 5, 6, 5, 6]`. Crossed corners (`over`, about 9px) on boxes and title-block joints.
- **Dimensions:** extension lines start 10px off the object and run 12px past the dimension line. The figure sits above the line, aligned with it (vertical dimensions read from the right). Use `textAt` to move it off a centre line. Figures come from the drawing's own lengths at one scale (`px / SCALE`).
- **Lettering:** capitals in a condensed technical face from the local font stack `"Bahnschrift SemiCondensed", Bahnschrift, "Avenir Next Condensed", "DejaVu Sans Condensed", "Roboto Condensed", "Arial Narrow"`. Letter-spacing 0.05-0.07em, an 8° lean, drawn with `fillText` so the text check sees it. Tag 66px with a thick and a thin rule under it; title block 42 / 34px; figures 30px.
- **Views:** flat orthographic elevations (front views) suit the medium. Hide what is behind with `bpKnock` and show it as a hidden line where it helps (the skull's rim under the mortarboard).

## Motion habits

- On 1s (`ones: true`). Every line **plots on** along its length (`frac: bpPlot(t0, d)`). Boxes plot from all four corners at once. A dimension draws its extension lines, grows from its middle out to the arrowheads, then letters its figure.
- Lettering writes on letter by letter. The hero moves on closed-form springs (`bpSpring`): it drops in, then opens its legs. Then the sheet holds, with idle life only: blinking eyes, a blinking cursor, a swaying tassel.

## Frame checklist (on top of grammar/FRAME.md)

1. The grid shows everywhere, including through knocked-out parts. It is the paper.
2. Two weights do the work: thick outlines and thin annotation. Annotation is pale cyan, never white.
3. At least one dimension with arrowheads and a figure, plus one other drafting mark (centre line, hidden line, crossed corners, projection symbol).
4. Brass appears only on the hero and its marks.
5. Text is sheet furniture (tag, title block, figures, a sheet note) set in the technical capitals. Never more than one short note per frame.
6. Nothing touches the border. The title block sits on the border's bottom-right corner and its lines stop on the border.

## Kit API (`kit.js`, on top of `kit/core.js`)

- Sheet: `bpSheet({ c })`, `bpGrid()`, `bpKnock(P)`, `bpBorder(inset, { frac })`.
- Lines: `bpLine(P, { closed, color, w, dash, frac, over, alpha })`, `bpBox(x, y, w, h, o)`, `bpCenter(P)`, `bpHidden(P)`, `bpHatch(P)` (45° section), `bpArrow(tip, dir)`, `bpPen`, `bpPoly`, `bpZoom`.
- Marks: `bpDim(a, b, off, label, { t0, textAt, size })`, `bpProjection(x, y, s)` (the third-angle symbol).
- Type: `bpText(str, x, y, size, { align, weight, track, slant, rot, frac })`, `bpTextW`. Sheet furniture through `DEFER`: `bpTag(str, { at, size, x, y })`, `bpTitleBlock([title, subtitle], { at, sizes, w, h })`, `bpCaption(str)`.
- Motion: `bpSpring(t, t0, { k, damp })`, `bpPlot(t0, d)`.
- Hero: `bpCompass(needleTip, pencilTip, { L, key, look, blink })` is a bow compass whose legs land exactly on two points (measure anything by giving it two points). `bpHero(x, y, r)` is the standing version. Both set `SPARK_AT`.

## STYLE hooks

`paper` is the ground. `backdrop` fills colour c and lays the grid on it. `window` is a detail view: the world inside a heavy outline with a thin phantom boundary just outside. `blob` is a cut section: knocked out, 45° hatching and a heavy outline in the bridge colour. `hero` / `heroColor` / `heroPts` draw the standing compass and give its silhouette for hero bridges. `post` is the print pass. `ones: true`. All of these were smoke-tested with a two-era piece (a shape morph and a hero bridge): it rendered and was deterministic.

## Not matched / open

- No reference was measured. The numbers are design choices.
- No stroke (single-line) lettering font: the type uses local system fonts, so it differs slightly by OS.
- No oblique or isometric projection helpers. Elevations only.

## Proven on

`docs/gallery/09-your-look` (1:1, 3s, 24fps): a front elevation of an open laptop with a mortarboard resting on its lid, two dimensions and the compass straddling the cap. Text check passes; tile deterministic.
