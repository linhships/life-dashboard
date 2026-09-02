// Pure text helpers for rendering a news item's body — no Node imports, so
// this is safe to use directly in the client NewsFeed component. As of
// 2026-09-02 a raw item body looks like:
//   "**Headline text** Plain-prose summary, written as its own fresh
//    sentence rather than a clause continuing on from the headline with
//    a comma. Source: [Zeit](url1), [Times](url2). *(medium)*"
// We split that into the source links (for the byline row) and the
// remaining excerpt text (for the card body), since item.headline is
// already extracted separately by lib/news.ts's parser. The trailing
// interest-tier note ("(medium)", "(low — headline)", ...) after the
// sources is intentionally dropped here — not parsed or displayed,
// per Linh's "leave this away for now" — so it just falls out of both
// `sources` and `excerpt` on its own without any special-casing.
//
// The older pre-2026-09-02 shape, sources as a parenthetical group
// immediately after the headline ("**Headline** ([Zeit](url1)): Rest
// of the story…"), is still recognized as a fallback below, in case a
// run ever slips back to it.

export interface NewsSource {
  name: string;
  url: string;
}

export interface ParsedNewsBody {
  sources: NewsSource[];
  excerpt: string;
}

export interface SplitHeadline {
  headline: string;
  rest: string;
}

// Extracts every markdown [name](url) link from a fragment of text, in
// order — shared by parseNewsItemBody's "Source: ..." parsing below and
// its older parenthetical-group fallback.
function extractLinks(text: string): NewsSource[] {
  const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g;
  const sources: NewsSource[] = [];
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(text)) !== null) {
    sources.push({ name: m[1], url: m[2] });
  }
  return sources;
}

// Splits a bullet body into its headline and everything after it (excerpt
// + sources). Bullets are supposed to bold the headline ("**Headline**
// ..."), but a few terse "headline only" mentions skip the bold marker
// entirely, e.g. "VW: Warnung vor Werksschließungen. Source: [Zeit](url)
// — nur Schlagzeile.". For those, cut right before the "Source:" label
// instead of blindly truncating — truncating at a fixed length risks
// cutting mid-sentence, which garbles the headline. Older-format lines
// (sources as "([Zeit](url))" right after the headline, no bold marker)
// still cut right before the "([" instead, as a second fallback.
export function splitHeadline(body: string): SplitHeadline {
  const bold = body.match(/^\*\*(.+?)\*\*\s*(.*)$/);
  if (bold) {
    return { headline: bold[1], rest: bold[2] };
  }
  const sourceLabel = body.match(/^(.+?)\s*(?=\bSource:)/i);
  if (sourceLabel && sourceLabel[1]) {
    return { headline: sourceLabel[1].trim(), rest: body.slice(sourceLabel[1].length).trim() };
  }
  const plain = body.match(/^(.+?)\s*(\(\[.*)$/);
  if (plain) {
    return { headline: plain[1].trim(), rest: plain[2] };
  }
  return { headline: body.slice(0, 80), rest: "" };
}

export function parseNewsItemBody(markdown: string): ParsedNewsBody {
  const withoutHeadline = splitHeadline(markdown).rest.trim();

  // Current format: a labeled "Source: [Name](url), [Name](url)."
  // sentence, usually the last thing in the bullet, optionally followed
  // by an interest-tier note in italics ("*(medium)*") — which is never
  // captured into either `sources` or `excerpt` below, so it's dropped
  // automatically rather than needing to be specifically ignored.
  // Everything before the label is the excerpt.
  const sourceLabel = withoutHeadline.match(/\bSource:\s*/i);
  if (sourceLabel && sourceLabel.index !== undefined) {
    const excerpt = withoutHeadline.slice(0, sourceLabel.index).trim();
    const afterLabel = withoutHeadline.slice(sourceLabel.index + sourceLabel[0].length);
    return { sources: extractLinks(afterLabel), excerpt };
  }

  // Older format: sources as a parenthetical group of markdown links
  // right after the headline. Allow one level of nested parens, since
  // each [text](url) link contributes its own paren pair inside the
  // outer one.
  const groupMatch = withoutHeadline.match(/^\(((?:[^()]|\([^()]*\))*)\)/);
  if (!groupMatch) {
    return { sources: [], excerpt: withoutHeadline };
  }
  const excerpt = withoutHeadline.slice(groupMatch[0].length).replace(/^:\s*/, "").trim();
  return { sources: extractLinks(groupMatch[1]), excerpt };
}

export interface SourceTally {
  name: string;
  count: number;
}

// Ranks sources by how many distinct stories cite them, across a full set
// of items — used for the "Top sources" sidebar panel.
export function rankSources(items: { markdown: string }[], limit = 5): SourceTally[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const { sources } = parseNewsItemBody(item.markdown);
    const seen = new Set<string>();
    for (const s of sources) {
      if (seen.has(s.name)) continue;
      seen.add(s.name);
      counts.set(s.name, (counts.get(s.name) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const AVATAR_PALETTE = [
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
  "bg-indigo-100 text-indigo-700",
];

export function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

// Deterministic per-category accent color (section-header/category-pill
// boxes) — moved into lib/colorHash.ts so the meal-plan grid can share
// the exact same hash + 8-color palette for its own meal-type boxes.
// Re-exported here so existing `from "@/lib/newsItem"` imports keep
// working unchanged.
export { categoryColorClass } from "./colorHash";
