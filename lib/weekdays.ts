// Pure date helper — no Node imports, safe to use from client components
// (unlike lib/mealplan.ts, which pulls in fs).
const DAY_OFFSETS: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

// weekStart is "YYYY-MM-DD" (a Monday); day is "Mon".."Sun". Returns the
// actual calendar date for that day as "YYYY-MM-DD", or null if day isn't
// recognized.
export function dateForDay(weekStart: string, day: string): string | null {
  const offset = DAY_OFFSETS[day];
  if (offset === undefined) return null;
  const [y, m, d] = weekStart.split("-").map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d + offset);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
