import fs from "fs";
import path from "path";
import { hashId } from "./hash";
import { fetchLinkMetadata } from "./links";

// Same "saved directly in the app, personal data" pattern as lib/links.ts
// (see the comment there) — a learning resource is really the same shape
// as a saved link (URL + fetched preview metadata), just organized by
// "topic" instead of "category" and kept in its own file/page so it
// doesn't get mixed in with general bookmarks. Reuses fetchLinkMetadata
// from lib/links.ts rather than duplicating the OG-scraping logic — it's
// generic (title/description/image from any URL), nothing links-specific
// about it.
const DATA_DIR = path.join(process.cwd(), "data");
const LEARNING_FILE = path.join(DATA_DIR, "learning.json");

export interface LearningResource {
  id: string;
  url: string;
  title: string;
  description: string;
  image: string | null;
  topic: string;
  addedAt: string;
  notes?: string;
}

export { fetchLinkMetadata };

export function getLearningResources(): LearningResource[] {
  if (!fs.existsSync(LEARNING_FILE)) return [];
  try {
    const raw = fs.readFileSync(LEARNING_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLearningResources(resources: LearningResource[]): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(LEARNING_FILE, JSON.stringify(resources, null, 2) + "\n", "utf-8");
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
