import fs from "fs";
import path from "path";
import { hashId } from "./hash";
import { dataPath, writeDataPath } from "./dataDir";

// Unlike news/meals, saved resources are created directly in this app (no
// external scheduled task writing files) — so they live in this repo's own
// data/ folder (see lib/dataDir.ts for how that's kept structurally
// separate from sample-data/, the fictional demo tree).
//
// A "resource" is either a bookmarked URL (the original /links feature) or
// an uploaded file attachment (PDF, image, doc, etc. — anything worth
// keeping alongside your links but that doesn't have its own stable URL to
// bookmark). `kind` tells the two apart; entries written before this field
// existed have no `kind` at all, so getResources() below treats a missing
// `kind` as "url" — every pre-existing saved link keeps working exactly as
// it did.

export type ResourceKind = "url" | "file";

export interface ResourceEntry {
  id: string;
  kind: ResourceKind;
  // "url" entries: the bookmarked URL. "file" entries: always "" — open
  // via /api/resources/file?id=<id> instead (see attachment fields below).
  url: string;
  title: string;
  description: string;
  image: string | null;
  category: string;
  addedAt: string;
  notes?: string;
  // What shows on the Learning page is decided per *category* now, not
  // per resource: a category marked as a "Learning topic" (see
  // getLearningTopics below) sends all of its resources to the Learning
  // page, and this flag opts an individual resource back out of that.
  // Meaningless (ignored) for a resource in a non-learning category.
  excludeFromLearning?: boolean;
  // Legacy per-resource "Show on Learning page" flag from before learning
  // topics were per-category. Only read once, by migrateLearningFlags(),
  // to seed the category list + exclusions; never written any more.
  forLearn?: boolean;
  // "file" entries only:
  attachmentStoredName?: string; // filename on disk under data/resource-files/
  attachmentFilename?: string; // original filename, used for display + download
  attachmentMime?: string;
  attachmentSize?: number; // bytes
}

export interface ResourceMetadata {
  title: string | null;
  description: string | null;
  image: string | null;
}

const ATTACHMENT_SUBDIR = "resource-files";

function attachmentsDir(): string {
  return writeDataPath(ATTACHMENT_SUBDIR);
}

const MIME_BY_EXT: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".txt": "text/plain",
  ".csv": "text/csv",
  ".zip": "application/zip",
};

export function mimeForFilename(filename: string): string {
  return MIME_BY_EXT[path.extname(filename).toLowerCase()] || "application/octet-stream";
}

export function getResources(): ResourceEntry[] {
  const file = dataPath("resources.json");
  if (!fs.existsSync(file)) return [];
  try {
    const raw = fs.readFileSync(file, "utf-8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Back-compat: entries saved before `kind` existed are all bookmarked
    // URLs.
    return parsed.map((entry) => ({ kind: "url", ...entry }) as ResourceEntry);
  } catch {
    return [];
  }
}

function saveResources(resources: ResourceEntry[]): void {
  const file = writeDataPath("resources.json");
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(resources, null, 2) + "\n", "utf-8");
}

export function addResource(entry: Omit<ResourceEntry, "id" | "addedAt">): ResourceEntry {
  const resources = getResources();
  const full: ResourceEntry = {
    ...entry,
    id: hashId(`${entry.url}|${entry.attachmentStoredName ?? ""}|${Date.now()}|${Math.random()}`),
    addedAt: new Date().toISOString(),
  };
  resources.push(full);
  saveResources(resources);
  return full;
}

export function updateResource(
  id: string,
  updates: Partial<
    Pick<
      ResourceEntry,
      "title" | "description" | "image" | "category" | "notes" | "excludeFromLearning"
    >
  >
): ResourceEntry | null {
  const resources = getResources();
  const idx = resources.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  resources[idx] = { ...resources[idx], ...updates };
  saveResources(resources);
  return resources[idx];
}

// ---------------------------------------------------------------------------
// Learning topics (per-category)
//
// Categories aren't stored anywhere on their own — a category exists purely
// as the set of resources tagged with it. The one piece of per-category
// state, "is this category a Learning topic?", lives in
// data/resource-categories.json as a plain list of category names.

const CATEGORIES_FILE = "resource-categories.json";

interface CategorySettings {
  learningTopics: string[];
}

function readCategorySettings(): CategorySettings | null {
  const file = dataPath(CATEGORIES_FILE);
  if (!fs.existsSync(file)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
    const topics = Array.isArray(parsed?.learningTopics) ? parsed.learningTopics : [];
    return { learningTopics: topics.filter((t: unknown) => typeof t === "string") };
  } catch {
    return null;
  }
}

function saveCategorySettings(settings: CategorySettings): void {
  const file = writeDataPath(CATEGORIES_FILE);
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(settings, null, 2) + "\n", "utf-8");
}

// One-time migration from the old per-resource `forLearn` checkbox: the
// first time there's no categories file, reconstruct the same Learning
// page contents under the new model — every category that had at least
// one `forLearn` resource becomes a Learning topic, and any resource in
// such a category that *wasn't* flagged gets excludeFromLearning so it
// doesn't suddenly appear. Persists both so it only ever runs once; with
// no legacy flags at all it just writes an empty topic list.
function migrateLearningFlags(): CategorySettings {
  const resources = getResources();
  const topics = new Set<string>();
  for (const r of resources) {
    if (r.forLearn) topics.add(r.category);
  }
  if (topics.size > 0) {
    let changed = false;
    for (const r of resources) {
      if (topics.has(r.category) && !r.forLearn && !r.excludeFromLearning) {
        r.excludeFromLearning = true;
        changed = true;
      }
    }
    if (changed) saveResources(resources);
  }
  const settings = { learningTopics: Array.from(topics).sort() };
  saveCategorySettings(settings);
  return settings;
}

export function getLearningTopics(): string[] {
  return (readCategorySettings() ?? migrateLearningFlags()).learningTopics;
}

export function setCategoryLearning(category: string, isLearning: boolean): string[] {
  const current = new Set(getLearningTopics());
  if (isLearning) current.add(category);
  else current.delete(category);
  const topics = Array.from(current).sort();
  saveCategorySettings({ learningTopics: topics });
  return topics;
}

export function isOnLearningPage(resource: ResourceEntry, learningTopics: Set<string>): boolean {
  return learningTopics.has(resource.category) && !resource.excludeFromLearning;
}

export function deleteResource(id: string): void {
  const resources = getResources();
  const entry = resources.find((r) => r.id === id);
  if (entry?.kind === "file") deleteResourceAttachment(entry.attachmentStoredName);
  saveResources(resources.filter((r) => r.id !== id));
}

// Saves an uploaded file under data/resource-files/, named by a hash of the
// original filename + timestamp so two uploads with the same name never
// collide. Returns what the ResourceEntry needs to reference it later.
export function saveResourceAttachment(
  buffer: Buffer,
  originalFilename: string
): { storedName: string; mime: string; size: number } {
  const dir = attachmentsDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const ext = path.extname(originalFilename).toLowerCase();
  const storedName = `${hashId(`${originalFilename}|${Date.now()}|${Math.random()}`)}${ext}`;
  fs.writeFileSync(path.join(dir, storedName), buffer);
  return { storedName, mime: mimeForFilename(originalFilename), size: buffer.length };
}

// Path-traversal guard: storedName always comes from saveResourceAttachment
// (a hash + extension, never user-controlled), but resolving it through
// path.basename + a containment check means a malformed/tampered id in a
// request can never escape data/resource-files/.
export function resolveResourceAttachment(storedName: string): string | null {
  const dir = attachmentsDir();
  const resolved = path.join(dir, path.basename(storedName));
  if (path.dirname(resolved) !== dir) return null;
  if (!fs.existsSync(resolved)) return null;
  return resolved;
}

function deleteResourceAttachment(storedName: string | undefined): void {
  if (!storedName) return;
  const resolved = resolveResourceAttachment(storedName);
  if (!resolved) return;
  try {
    fs.unlinkSync(resolved);
  } catch {
    // Best-effort — an orphaned file on disk is harmless, just wasted space.
  }
}

function extractMeta(html: string): ResourceMetadata {
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
export async function fetchResourceMetadata(url: string): Promise<ResourceMetadata> {
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
