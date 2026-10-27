// Phone UI safe zones: where TikTok, Instagram Reels and YouTube Shorts draw their buttons, captions and progress bar
// over a 9:16 video (each platform's own templates, measured at 1080x1920; other portrait sizes scale with the frame).
// Text under one of them is hidden on that platform. Used by textcheck (and review), tile and still.
//   tiktok  top 240, bottom 660, left 120, right 120, and the action rail: x >= 780 below y 840
//   reels   top 269, bottom 672, left 65, right 65
//   shorts  top 288, bottom 672, left 48, right 192
//   all     the union: clear in x 120-888, y 288-1248, and only x < 780 below y 840 (the default)
// Only phone-tall frames (h > 1.5 w: 9:16) get platform profiles; 4:5 (h = 1.25 w), 1:1 and 16:9 keep the piece's own SAFE.
// Which zone a check uses: piece.json "review": { "safe": {...} } (the main format only) > the profile of
// "review": { "platforms": "tiktok,reels" } (default 'all') > TIMELINE.safe.
//   a zone: { top, bottom, left, right, rail: { x0, y0 } | null, from, platforms: { tiktok: zone, ... } | null }
export const PLATFORMS = {
  tiktok: { top: 240, bottom: 660, left: 120, right: 120, rail: { x0: 780, y0: 840 } },
  reels: { top: 269, bottom: 672, left: 65, right: 65 },
  shorts: { top: 288, bottom: 672, left: 48, right: 192 },
};
export const NAMES = { tiktok: 'TikTok', reels: 'Reels', shorts: 'Shorts' };
export const isPortrait = (w, h) => h > 1.5 * w;

// the union of the named platforms' zones, scaled to a w x h portrait frame (null for other shapes)
export function profile(names = 'all', w = 1080, h = 1920) {
  if (!isPortrait(w, h)) return null;
  const list = names === 'all' ? Object.keys(PLATFORMS) : (Array.isArray(names) ? names : String(names).split(',')).map((n) => n.trim().toLowerCase()).filter(Boolean);
  const bad = list.filter((n) => !PLATFORMS[n]);
  if (bad.length || !list.length) throw new Error(`unknown platform "${bad.join(', ')}": use ${Object.keys(PLATFORMS).join(', ')} or all`);
  const sx = w / 1080, sy = h / 1920, parts = {};
  for (const n of list) {
    const p = PLATFORMS[n];
    parts[n] = { top: Math.round(p.top * sy), bottom: Math.round(p.bottom * sy), left: Math.round(p.left * sx), right: Math.round(p.right * sx), rail: p.rail ? { x0: Math.round(p.rail.x0 * sx), y0: Math.round(p.rail.y0 * sy) } : null };
  }
  const P = Object.values(parts), max = (k) => Math.max(...P.map((p) => p[k])), rails = P.filter((p) => p.rail).map((p) => p.rail);
  return { top: max('top'), bottom: max('bottom'), left: max('left'), right: max('right'), rail: rails.length ? { x0: Math.min(...rails.map((r) => r.x0)), y0: Math.min(...rails.map((r) => r.y0)) } : null,
    from: `platforms ${list.join(', ')}`, platforms: parts };
}

// the zone a check uses for this piece and format (T = TIMELINE; o.platforms from a --platforms flag beats review.safe)
export function safeZone(T, piece = {}, o = {}) {
  const W = T.width || 1080, H = T.height || 1080, rv = piece.review || {};
  const main = !o.format || !piece.formats || o.format === piece.formats[0];
  const norm = (s, from) => ({ top: 0, bottom: 0, left: 0, right: 0, rail: null, platforms: null, ...s, from });
  if (rv.safe && main && !o.platforms) return norm(rv.safe, 'piece.json review.safe');
  return profile(o.platforms || rv.platforms || 'all', W, H) || (T.safe ? norm(T.safe, 'TIMELINE.safe') : null);
}

// the hidden area as rectangles [x, y, w, h] in frame pixels, for drawing (they don't overlap)
export function bands(z, W, H) {
  if (!z) return [];
  const mid = H - z.top - z.bottom, r = [[0, 0, W, z.top], [0, H - z.bottom, W, z.bottom], [0, z.top, z.left, mid], [W - z.right, z.top, z.right, mid]];
  if (z.rail && z.rail.x0 < W - z.right && z.rail.y0 < H - z.bottom) r.push([z.rail.x0, Math.max(z.top, z.rail.y0), W - z.right - z.rail.x0, H - z.bottom - Math.max(z.top, z.rail.y0)]);
  return r.filter(([, , w, h]) => w > 0 && h > 0);
}

// which bands a text box {x0, y0, x1, y1} reaches into (2px slack), and, for a platform profile, which platforms hide it
export function hidden(b, z, W, H) {
  const where = (p) => [b.y0 < p.top - 2 && 'top', b.y1 > H - p.bottom + 2 && 'bottom', p.left > 0 && b.x0 < p.left - 2 && 'left',
    p.right > 0 && b.x1 > W - p.right + 2 && 'right', p.rail && b.x1 > p.rail.x0 + 2 && b.y1 > p.rail.y0 + 2 && 'rail'].filter(Boolean);
  const bandsHit = where(z);
  if (!bandsHit.length) return null;
  return { bands: bandsHit, platforms: z.platforms ? Object.keys(z.platforms).filter((n) => where(z.platforms[n]).length) : null };
}
