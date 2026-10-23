export type ThemeId = "classic" | "haven" | "neobrutal";

export const THEME_STORAGE_KEY = "life-dashboard-theme";

export const THEMES: { id: ThemeId; label: string; description: string }[] = [
  {
    // Still stored as "classic" (it's the no-data-theme default) so any
    // saved preference from before the redesign keeps working.
    id: "classic",
    label: "Editorial",
    description: "The default — warm cream, green-charcoal ink, serif headings, soft rounded cards.",
  },
  {
    id: "haven",
    label: "Haven",
    // Describes what this theme actually is: it used to claim "rounder
    // corners", but its radii are smaller than the Editorial default at
    // every step (md 0.625 vs 0.75, lg 0.875 vs 1, xl 1.125 vs 1.25).
    description: "Calmer cream and sage — teal and lavender accents, slightly tighter corners.",
  },
  {
    id: "neobrutal",
    label: "Neobrutal",
    description: "Bold flat color, thick black borders, hard offset shadows, sharp corners.",
  },
];

// Non-default themes — anything else (including "classic") means no
// data-theme attribute at all, which is what keeps today's look as-is.
const NON_DEFAULT_THEMES: ThemeId[] = ["haven", "neobrutal"];

/**
 * Inline script source, inlined into <head> in app/layout.tsx so the saved
 * theme is applied before first paint (no flash of the wrong theme). Kept
 * as a plain string (not JSX) since it has to run before React hydrates.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY
)});if(${JSON.stringify(
  NON_DEFAULT_THEMES
)}.indexOf(t)!==-1)document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;

export function getStoredTheme(): ThemeId {
  if (typeof window === "undefined") return "classic";
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return (NON_DEFAULT_THEMES as string[]).includes(stored ?? "")
      ? (stored as ThemeId)
      : "classic";
  } catch {
    return "classic";
  }
}

export function applyTheme(id: ThemeId) {
  if (typeof window === "undefined") return;
  if (NON_DEFAULT_THEMES.includes(id)) {
    document.documentElement.setAttribute("data-theme", id);
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, id);
  } catch {
    // localStorage unavailable (private browsing etc.) — theme just won't persist.
  }
}
