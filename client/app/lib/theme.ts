export type Theme = "light" | "dark" | "system";

export function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  return (localStorage.getItem("theme") as Theme) || "system";
}

export function setStoredTheme(theme: Theme): void {
  localStorage.setItem("theme", theme);
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  const resolvedTheme = theme === "system" ? getSystemTheme() : theme;

  root.classList.remove("light", "dark");
  root.classList.add(resolvedTheme);
}

export function initializeTheme(): void {
  const theme = getStoredTheme();
  applyTheme(theme);

  // Listen for system theme changes
  if (theme === "system") {
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", () => applyTheme("system"));
  }
}
