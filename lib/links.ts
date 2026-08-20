import fs from "fs";
import path from "path";
import { hashId } from "./hash";

// Unlike news/meals, saved links are created directly in this app (no
// external scheduled task writing files) — so they live in this repo's own
// data/ folder, same gitignore-real-data / commit-sample-data pattern as
// everything else.
const DATA_DIR = path.join(process.cwd(), "data");
const LINKS_FILE = path.join(DATA_DIR, "links.json");

export interface LinkEntry {
  id: string;
  url: string;
  title: string;
  description: string;
  image: string | null;
  category: string;
  addedAt: string;
}

export interface LinkMetadata {
  title: string | null;
  description: string | null;
  image: string | null;
}

export function getLinks(): LinkEntry[] {
  if (!fs.existsSync(LINKS_FILE)) return [];
  try {
    const raw = fs.readFileSync(LINKS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLinks(links: LinkEntry[]): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(LINKS_FILE, JSON.stringify(links, null, 2) + "\n", "utf-8");
}

export function addLink(entry: Omit<LinkEntry, "id" | "addedAt">): LinkEntry {
  const links = getLinks();
  const full: LinkEntry = {
    ...entry,
    id: hashId(`${entry.url}|${Date.now()}|${Math.random()}`),
    addedAt: new Date().toISOString(),
  };
  links.push(full);
  saveLinks(links);
  return full;
}

export function updateLink(
  id: string,
  updates: Partial<Pick<LinkEntry, "title" | "description" | "image" | "category">>
): LinkEntry | null {
  const links = getLinks();
  const idx = links.findIndex((l) => l.id === id);
  if (idx === -1) return null;
  links[idx] = { ...links[idx], ...updates };
  saveLinks(links);
  return links[idx];
}

export function deleteLink(id: string): void {
  const links = getLinks().filter((l) => l.id !== id);
  saveLinks(links);
}

function extractMeta(html: string): LinkMetadata {
  const metaTags = html.match(/<meta\s+[^>]*>/gi) || [];
  const props: Record<string, string> = {};
  for (const tag of metaTags) {
    const propMatch = tag.match(/(?:property|name)\s*=\s*["']([^"']+)["']/i);
    const contentMatch = tag.match(/content\s*=\s*["']([^"']*)["']/i);
    if (propMatch && contentMatch) {
      props[propMatch[1].toLowerCase()] = contentMatch[1];
    }
  }
  const titleTagMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = props["og:title"] || props["twitter:title"] || (titleTagMatch ? titleTagMatch[1].trim() : null);
  const description = props["og:description"] || props["twitter:description"] || props["description"] || null;
  const image = props["og:image"] || props["twitter:image"] || null;
  return { title, description, image };
}

// Fallback for pages with no og:image/twitter:image: scan <img> tags for
// the first one that looks like real content rather than a UI/tracking
// asset — skips data URIs, SVGs (almost always icons/logos), filenames
// containing common icon/logo/tracking keywords, and tiny fixed-size
// images (width/height attributes <= 32px).
function firstSensibleImage(html: string, baseUrl: string): string | null {
  const imgTags = html.match(/<img\s+[^>]*>/gi) || [];
  const skipKeywords = /(logo|icon|sprite|pixel|spacer|avatar|badge|tracking)/i;

  for (const tag of imgTags) {
    const srcMatch =
      tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i) ||
      tag.match(/\bdata-src\s*=\s*["']([^"']+)["']/i);
    if (!srcMatch) continue;
    const src = srcMatch[1].trim();
    if (!src || src.startsWith("data:")) continue;
    if (/\.svg(\?|$)/i.test(src)) continue;
    if (skipKeywords.test(src)) continue;

    const widthMatch = tag.match(/\bwidth\s*=\s*["']?(\d+)/i);
    const heightMatch = tag.match(/\bheight\s*=\s*["']?(\d+)/i);
    const w = widthMatch ? parseInt(widthMatch[1], 10) : null;
    const h = heightMatch ? parseInt(heightMatch[1], 10) : null;
    if ((w !== null && w <= 32) || (h !== null && h <= 32)) continue;

    try {
      return new URL(src, baseUrl).toString();
    } catch {
      continue;
    }
  }
  return null;
}

function filenameTitle(url: string): string {
  try {
    const { pathname } = new URL(url);
    const last = pathname.split("/").filter(Boolean).pop() || url;
    return decodeURIComponent(last).replace(/[-_]+/g, " ").replace(/\.\w+$/, "");
  } catch {
    return url;
  }
}

// Best-effort server-side fetch of a page's Open Graph metadata. Many sites
// (including X/Twitter permalinks) serve OG tags to any fetcher regardless
// of JS execution, but this isn't guaranteed — callers should treat a
// mostly-empty result as normal and let the user fill gaps in manually.
export async function fetchLinkMetadata(url: string): Promise<LinkMetadata> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      },
    });
    clearTimeout(timeout);

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      return { title: filenameTitle(url), description: null, image: null };
    }

    const html = await res.text();
    const meta = extractMeta(html);
    if (meta.image) {
      try {
        meta.image = new URL(meta.image, url).toString();
      } catch {
        // leave as-is if it's not resolvable
      }
    }
    if (!meta.image) {
      meta.image = firstSensibleImage(html, url);
    }
    return {
      title: meta.title || filenameTitle(url),
      description: meta.description,
      image: meta.image,
    };
  } catch {
    return { title: filenameTitle(url), description: null, image: null };
  }
}
