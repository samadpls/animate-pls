// =====================================================================
//  SCENE — gallery tile 15, cutout. A teal paper wall; animate-pls itself, recorded, in a torn-paper window
//  (kit/footage.js frames the card with the style's own STYLE.window and fills it with STYLE.backdrop); the camera
//  pushes in on the beats as "approve" is clicked, then pans to the finished video and holds. Two torn tags carry
//  the line, the second lands as the video appears; the spark watches from the corner. Helpers prefixed t15.
// =====================================================================
const t15 = { card: { x: 92, y: 196, w: 896, h: 0 } };
t15.card.h = ftFit('app', t15.card.w, 700, { pad: 12, aspect: 1.5 }).h;
const t15Src = () => ftSrc('app', ftNow());
function t15Wall() {
  cut(rect(-30, -30, W + 60, H + 60, 0), PAL.teal, { key: 'wall', shadow: false, tear: 0, grain: 0.9, shade: false, pat: pat.dots('rgba(255,255,255,0.08)', 5, 46) });
  // a strip of mustard paper along the floor, and two paper sparkles on the wall
  cut(rect(-30, H - 150, W + 60, 200, 0), PAL.mustard, { key: 'floor', sy: -4, sb: 10, tear: 1.4, pat: pat.lines('rgba(120,70,20,0.16)', 26, 12) });
  sparkle(1012, 120, 20 + Math.sin(TT * 5) * 2); sparkle(48, 600, 13, '#fff1c9');
}
function sceneTile() {
  t15Wall();
  const c = t15.card;
  ftCard('app', c.x, c.y, c.w, c.h, { pad: 12, radius: 14, key: 'card' });
  // the spark peeks over the card's corner: wide-eyed at the click, happy once the video plays
  const s = t15Src(), mood = s >= 9.0 ? 'happy' : s >= 6.4 && s < 7.1 ? 'wow' : 'smile';
  spark(c.x + 34, c.y + c.h + 6, 74, { key: 'spk', mood, rays: 9 });
  tag('one brief in,', c.x + 230, c.y - 18, 66, { rot: -0.04 });
  tag('repeatable video out', c.x + c.w - 300, c.y + c.h + 70, 66, { rot: 0.022, s: popS(TIMELINE.cues.tag2), frac: ev(TIMELINE.cues.tag2 + 0.08, 0.45) });
}
