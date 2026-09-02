// Pure text helpers for rendering a news item's body — no Node imports, so
// this is safe to use directly in the client NewsFeed component. A raw
// item body looks like:
//   "**Headline text** ([Zeit](url1), [Times](url2)): Rest of the story…"
// We split that into the source links (for the byline row) and the
// remaining excerpt text (for the card body), since item.headline is
// already extracted separately by lib/news.ts's parser.

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

// Splits a bullet body into its headline and everything after it (source
// links + excerpt). Bullets are supposed to bold the headline
// ("**Headline** (...)"), but a few terse "headline only" mentions skip
// the bold marker entirely, e.g. "VW: Warnung vor Werksschließungen
// ([Zeit](url)) — nur Schlagzeile: ...". For those, cut right before the
// "([" that starts the sources group instead of blindly truncating —
// truncating at a fixed length risks cutting mid-markdown-link, which both
// garbles the headline and leaves parseNewsItemBody below unable to find
// the source-links group at all (shows "Source not linked").
export function splitHeadline(body: string): SplitHeadline {
  const bold = body.match(/^\*\*(.+?)\*\*\s*(.*)$/);
  if (bold) {
    return { headline: bold[1], rest: bold[2] };
  }
  const plain = body.match(/^(.+?)\s*(\(\[.*)$/);
  if (plain) {
    return { headline: plain[1].trim(), rest: plain[2] };
  }
  return { headline: body.slice(0, 80), rest: "" };
}

export function parseNewsItemBody(markdown: string): ParsedNewsBody {
  const withoutHeadline = splitHeadline(markdown).rest.trim();

  // The sources are usually a parenthetical group of markdown links right
  // after the headline. Allow one level of nested parens, since each
  // [text](url) link contributes its own paren pair inside the outer one.
  const groupMatch = withoutHeadline.match(/^\(((?:[^()]|\([^()]*\))*)\)/);
  if (!groupMatch) {
    return { sources: [], excerpt: withoutHeadline };
  }

  const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g;
  const sources: NewsSource[] = [];
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(groupMatch[1])) !== null) {
    sources.push({ name: m[1], url: m[2] });
  }

  const excerpt = withoutHeadline.slice(groupMatch[0].length).replace(/^:\s*/, "").trim();
  return { sources, excerpt };
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
