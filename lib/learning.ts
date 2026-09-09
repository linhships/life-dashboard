import fs from "fs";
import path from "path";
import { hashId } from "./hash";
import { fetchResourceMetadata, getResources } from "./resources";
import { dataPath, writeDataPath } from "./dataDir";

// Same "saved directly in the app, personal data" pattern as
// lib/resources.ts (see the comment there) — a learning resource is really
// the same shape as a saved URL resource (URL + fetched preview metadata),
// just organized by "topic" instead of "category" and kept in its own
// file/page so it doesn't get mixed in with general bookmarks. Reuses
// fetchResourceMetadata from lib/resources.ts rather than duplicating the
// OG-scraping logic — it's generic (title/description/image from any URL),
// nothing resources-specific about it.

export interface LearningResource {
  id: string;
  url: string;
  title: string;
  description: string;
  image: string | null;
  topic: string;
  addedAt: string;
  notes?: string;
  // Present only on entries derived live from a Resources entry with its
  // "Show on Learning page" checkbox on (see lib/resources.ts's `forLearn`
  // field) — these are NOT stored in learning.json, so there's no copy
  // that can drift out of sync. Editing/untagging happens on the Resources
  // page (or via the resources API); the Learning UI treats an entry with
  // this set as read-only / "from Resources" rather than an independent
  // resource.
  fromResourceId?: string;
}

export { fetchResourceMetadata };

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

// Live view of every Resources entry flagged "Show on Learning page" —
// computed fresh from resources.json on every call, never persisted here.
// resource.category becomes the Learning "topic" bucket it's grouped
// under. A "file" kind resource has no external url of its own, so its
// url here points at the same /api/resources/file route the Resources
// page uses to open/download it — the Learning card's "Visit"/hostname
// display just shows that internal path for those.
export function getLinkedLearningResources(): LearningResource[] {
  return getResources()
    .filter((r) => r.forLearn)
    .map((r) => ({
      id: `resource-${r.id}`,
      url: r.kind === "file" ? `/api/resources/file?id=${r.id}` : r.url,
      title: r.title,
      description: r.description,
      image: r.image,
      topic: r.category,
      addedAt: r.addedAt,
      notes: r.notes,
      fromResourceId: r.id,
    }));
}

// What the Learning page actually renders: its own independently-managed
// resources (learning.json) plus the live-derived entries from flagged
// Resources. Kept separate from getLearningResources() so callers that
// only care about the JSON-backed CRUD data (e.g. the add/update/delete
// functions above) aren't surprised by resource-derived entries mixed in.
export function getAllLearningResources(): LearningResource[] {
  return [...getLearningResources(), ...getLinkedLearningResources()];
}
