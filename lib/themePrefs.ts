export type ThemeId = "classic" | "haven";

export const THEME_STORAGE_KEY = "life-dashboard-theme";

export const THEMES: { id: ThemeId; label: string; description: string }[] = [
  {
    id: "classic",
    label: "Classic",
    description: "The current look — cool slate and blue, square corners.",
  },
  {
    id: "haven",
    label: "Haven",
    description: "A warmer palette — cream, teal and lavender, rounder corners.",
  },
];

/**
 * Inline script source, inlined into <head> in app/layout.tsx so the saved
 * theme is applied before first paint (no flash of the wrong theme). Kept
 * as a plain string (not JSX) since it has to run before React hydrates.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY
)});if(t==="haven")document.documentElement.setAttribute("data-theme","haven");}catch(e){}})();`;

export function getStoredTheme(): ThemeId {
  if (typeof window === "undefined") return "classic";
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "haven" ? "haven" : "classic";
  } catch {
    return "classic";
  }
}

export function applyTheme(id: ThemeId) {
  if (typeof window === "undefined") return;
  if (id === "haven") {
    document.documentElement.setAttribute("data-theme", "haven");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, id);
  } catch {
    // localStorage unavailable (private browsing etc.) — theme just won't persist.
  }
}
