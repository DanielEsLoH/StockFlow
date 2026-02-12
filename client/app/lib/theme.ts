export type Theme = "light" | "dark";

const SESSION_KEY = "theme";

export function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function getSessionTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  const stored = sessionStorage.getItem(SESSION_KEY);
  return stored === "light" || stored === "dark" ? stored : null;
}

export function setSessionTheme(theme: Theme): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SESSION_KEY, theme);
}

export function clearSessionTheme(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SESSION_KEY);
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme);
}

export function initializeTheme(): void {
  applyTheme(getSessionTheme() ?? getSystemTheme());
}
