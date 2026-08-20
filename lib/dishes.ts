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

export function splitDishes(raw: string): string[] {
  const boldMatch = raw.match(/\*\*(.+?)\*\*/);
  const source = boldMatch ? boldMatch[1] : raw;
  const cleaned = cleanDishText(source);
  if (!cleaned) return [raw.trim()];
  return cleaned
    .split(/\s*\+\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}
