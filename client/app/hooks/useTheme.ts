import { useState, useEffect, useCallback } from "react";
import type { Theme } from "~/lib/theme";
import {
  getSystemTheme,
  getSessionTheme,
  setSessionTheme,
  applyTheme,
} from "~/lib/theme";

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    setThemeState(getSessionTheme() ?? getSystemTheme());
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    setSessionTheme(newTheme);
    applyTheme(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light");
  }, [theme, setTheme]);

  return {
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === "dark",
  };
}
