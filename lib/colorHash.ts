// Shared deterministic string -> color-bucket hash. Used anywhere the UI
// wants a stable, visually distinct color per distinct label — without
// hardcoding the actual label strings anywhere — so a new label (a news
// category the daily-news task invents, a meal type someone starts using
// in the weekly plan, ...) just lands in whichever bucket its name hashes
// to instead of needing a code change. Same djb2-ish hash originally
// written for lib/newsItem.ts's avatarColor, pulled out here so more than
// one feature can share the same 8-color palette (category-color-0..7 in
// globals.css's Neobrutal section) and read as one consistent design
// language instead of each area inventing its own colors.
const CATEGORY_COLOR_COUNT = 8;

export function categoryColorClass(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return `category-color-${h % CATEGORY_COLOR_COUNT}`;
}
