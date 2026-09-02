"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { THEMES, applyTheme, getStoredTheme, type ThemeId } from "@/lib/themePrefs";

// Small static swatch previews so each option is recognizable before it's
// selected — hand-picked to match the palettes defined in globals.css.
const SWATCHES: Record<ThemeId, { bg: string; card: string; accent: string; accent2: string; radius: string }> = {
  classic: {
    bg: "#f8fafc",
    card: "#ffffff",
    accent: "#2563eb",
    accent2: "#7c3aed",
    radius: "0.5rem",
  },
  haven: {
    bg: "#faf8f3",
    card: "#ffffff",
    accent: "#1f9c8a",
    accent2: "#8b6cc9",
    radius: "1.125rem",
  },
};

export function ThemePicker() {
  const [theme, setThemeState] = useState<ThemeId>("classic");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setThemeState(getStoredTheme());
    setReady(true);
  }, []);

  function choose(id: ThemeId) {
    setThemeState(id);
    applyTheme(id);
  }

  return (
    <div className={`grid gap-4 sm:grid-cols-2 ${ready ? "" : "opacity-0"}`}>
      {THEMES.map((option) => {
        const swatch = SWATCHES[option.id];
        const selected = theme === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => choose(option.id)}
            className={`group relative overflow-hidden rounded-xl border-2 p-4 text-left transition-colors ${
              selected
                ? "border-blue-600 bg-blue-50/40"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            {selected && (
              <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white">
                <Check className="h-4 w-4" />
              </span>
            )}

            {/* Mini preview card rendered with the theme's own literal hex
                values (not live CSS vars) so both options are visible
                side-by-side regardless of which theme is currently active. */}
            <div
              className="mb-3 flex h-20 items-center gap-2 border border-slate-200 p-3"
              style={{ background: swatch.bg, borderRadius: swatch.radius }}
            >
              <div
                className="h-10 w-10 shrink-0"
                style={{ background: swatch.accent, borderRadius: swatch.radius }}
              />
              <div className="flex flex-1 flex-col gap-1.5">
                <div
                  className="h-3 w-3/4"
                  style={{ background: swatch.card, borderRadius: "999px" }}
                />
                <div
                  className="h-3 w-1/2"
                  style={{ background: swatch.accent2, opacity: 0.5, borderRadius: "999px" }}
                />
              </div>
            </div>

            <p className="font-semibold text-slate-900">{option.label}</p>
            <p className="mt-1 text-sm text-slate-500">{option.description}</p>
          </button>
        );
      })}
    </div>
  );
}
