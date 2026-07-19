export type Theme = "dark" | "light";
export const DEFAULT_THEME: Theme = "light";
const KEY = "theme";

export function getTheme(): Theme {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function setTheme(t: Theme): void {
  try {
    localStorage.setItem(KEY, t);
    document.documentElement.setAttribute("data-theme", t);
  } catch {
    /* storage unavailable — keep in-memory default */
  }
}

export function toggleTheme(): Theme {
  const next: Theme = getTheme() === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
}
