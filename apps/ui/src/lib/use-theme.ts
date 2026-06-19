import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

/** localStorage key holding the user's explicit theme choice. */
export const THEME_STORAGE_KEY = "banalize-theme";

/** Apply (or remove) the `dark` class that Tailwind keys dark styles off of. */
function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

/**
 * Resolve the initial theme: an explicit saved choice wins, otherwise fall back
 * to the OS preference. Mirrors the inline anti-flash script in index.html.
 */
export function getInitialTheme(): Theme {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/** Theme state hook: keeps the `dark` class and localStorage in sync. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return { theme, toggle };
}
