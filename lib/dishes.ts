// Pure text helper — a day's "Dish" cell sometimes combines multiple
// dishes in one row (e.g. "**Quinoa Salad + Tofu with tomato sauce +
// Rice** *(fresh cook)*"). Splits that into individual dish names so each
// can get its own per-kid rating. No Node imports, safe for client use.

function cleanDishText(text: string): string {
  return text
    .replace(/\*+/g, "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim();
}

// A trailing "+ Rice"/"+ Bread" etc. after a main is a side, not a dish of
// its own — merge it back into the dish it's served with rather than
// giving it its own rating row. Only merges on an exact match (so e.g.
// "...Quinoa Salad" is untouched — it's not literally just "Salad").
const ACCOMPANIMENTS = new Set([
  "rice",
  "bread",
  "naan",
  "chips",
  "fries",
  "potatoes",
  "salad",
]);

export function splitDishes(raw: string): string[] {
  const boldMatch = raw.match(/\*\*(.+?)\*\*/);
  const source = boldMatch ? boldMatch[1] : raw;
  const cleaned = cleanDishText(source);
  if (!cleaned) return [raw.trim()];

  const parts = cleaned
    .split(/\s*\+\s*/)
    .map((s) => s.trim())
    .filter(Boolean);

  const merged: string[] = [];
  for (const part of parts) {
    if (merged.length > 0 && ACCOMPANIMENTS.has(part.toLowerCase())) {
      merged[merged.length - 1] = `${merged[merged.length - 1]} + ${part}`;
    } else {
      merged.push(part);
    }
  }
  return merged;
}
