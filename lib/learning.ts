import fs from "fs";
import path from "path";
import { hashId } from "./hash";
import { fetchLinkMetadata, getLinks } from "./links";
import { dataPath, writeDataPath } from "./dataDir";

// Same "saved directly in the app, personal data" pattern as lib/links.ts
// (see the comment there) — a learning resource is really the same shape
// as a saved link (URL + fetched preview metadata), just organized by
// "topic" instead of "category" and kept in its own file/page so it
// doesn't get mixed in with general bookmarks. Reuses fetchLinkMetadata
// from lib/links.ts rather than duplicating the OG-scraping logic — it's
// generic (title/description/image from any URL), nothing links-specific
// about it.

export interface LearningResource {
  id: string;
  url: string;
  title: string;
  description: string;
  image: string | null;
  topic: string;
  addedAt: string;
  notes?: string;
  // Present only on entries derived live from a Links entry with its
  // "Show on Learning page" checkbox on (see lib/links.ts's `forLearn`
  // field) — these are NOT stored in learning.json, so there's no copy
  // that can drift out of sync. Editing/untagging happens on the Links
  // page (or via the links API); the Learning UI treats an entry with
  // this set as read-only / "from Links" rather than an independent
  // resource.
  fromLinkId?: string;
}

export { fetchLinkMetadata };

export function getLearningResources(): LearningResource[] {
  const file = dataPath("learning.json");
  if (!fs.existsSync(file)) return [];
  try {
    const raw = fs.readFileSync(file, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLearningResources(resources: LearningResource[]): void {
  const file = writeDataPath("learning.json");
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(resources, null, 2) + "\n", "utf-8");
}

export function addLearningResource(
  entry: Omit<LearningResource, "id" | "addedAt">
): LearningResource {
  const resources = getLearningResources();
  const full: LearningResource = {
    ...entry,
    id: hashId(`${entry.url}|${Date.now()}|${Math.random()}`),
    addedAt: new Date().toISOString(),
  };
  resources.push(full);
  saveLearningResources(resources);
  return full;
}

export function updateLearningResource(
  id: string,
  updates: Partial<Pick<LearningResource, "title" | "description" | "image" | "topic" | "notes">>
): LearningResource | null {
  const resources = getLearningResources();
  const idx = resources.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  resources[idx] = { ...resources[idx], ...updates };
  saveLearningResources(resources);
  return resources[idx];
}

export function deleteLearningResource(id: string): void {
  const resources = getLearningResources().filter((r) => r.id !== id);
  saveLearningResources(resources);
}

// Live view of every Links entry flagged "Show on Learning page" —
// computed fresh from links.json on every call, never persisted here.
// link.category becomes the Learning "topic" bucket it's grouped under.
export function getLinkedLearningResources(): LearningResource[] {
  return getLinks()
    .filter((l) => l.forLearn)
    .map((l) => ({
      id: `link-${l.id}`,
      url: l.url,
      title: l.title,
      description: l.description,
      image: l.image,
      topic: l.category,
      addedAt: l.addedAt,
      notes: l.notes,
      fromLinkId: l.id,
    }));
}

// What the Learning page actually renders: its own independently-managed
// resources (learning.json) plus the live-derived entries from flagged
// Links. Kept separate from getLearningResources() so callers that only
// care about the JSON-backed CRUD data (e.g. the add/update/delete
// functions above) aren't surprised by link-derived entries mixed in.
export function getAllLearningResources(): LearningResource[] {
  return [...getLearningResources(), ...getLinkedLearningResources()];
}
