import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTheme } from "./useTheme";

// Mock the theme module
vi.mock("~/lib/theme", () => ({
  getStoredTheme: vi.fn(() => "system"),
  setStoredTheme: vi.fn(),
  applyTheme: vi.fn(),
  getSystemTheme: vi.fn(() => "light"),
}));

import {
  getStoredTheme,
  setStoredTheme,
  applyTheme,
  getSystemTheme,
} from "~/lib/theme";

describe("useTheme", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getStoredTheme).mockReturnValue("system");
    vi.mocked(getSystemTheme).mockReturnValue("light");
  });

  describe("initialization", () => {
    it("initializes with system theme by default", () => {
      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe("system");
      expect(result.current.resolvedTheme).toBe("light");
      expect(result.current.isDark).toBe(false);
    });

    it("loads stored dark theme on mount", () => {
      vi.mocked(getStoredTheme).mockReturnValue("dark");
      vi.mocked(getSystemTheme).mockReturnValue("dark");

      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe("dark");
      expect(result.current.resolvedTheme).toBe("dark");
      expect(result.current.isDark).toBe(true);
    });

    it("loads stored light theme on mount", () => {
      vi.mocked(getStoredTheme).mockReturnValue("light");

      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe("light");
      expect(result.current.resolvedTheme).toBe("light");
      expect(result.current.isDark).toBe(false);
    });

    it("resolves system theme to dark when system prefers dark", () => {
      vi.mocked(getStoredTheme).mockReturnValue("system");
      vi.mocked(getSystemTheme).mockReturnValue("dark");

      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe("system");
      expect(result.current.resolvedTheme).toBe("dark");
      expect(result.current.isDark).toBe(true);
    });
  });

  describe("setTheme", () => {
    it("updates theme to dark correctly", () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme("dark");
      });

      expect(result.current.theme).toBe("dark");
      expect(setStoredTheme).toHaveBeenCalledWith("dark");
      expect(applyTheme).toHaveBeenCalledWith("dark");
    });

    it("updates theme to light correctly", () => {
      vi.mocked(getStoredTheme).mockReturnValue("dark");
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme("light");
      });

      expect(result.current.theme).toBe("light");
      expect(setStoredTheme).toHaveBeenCalledWith("light");
      expect(applyTheme).toHaveBeenCalledWith("light");
    });

    it("updates theme to system correctly", () => {
      vi.mocked(getStoredTheme).mockReturnValue("dark");
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme("system");
      });

      expect(result.current.theme).toBe("system");
      expect(setStoredTheme).toHaveBeenCalledWith("system");
      expect(applyTheme).toHaveBeenCalledWith("system");
    });

    it("resolves system theme correctly when setting to system", () => {
      vi.mocked(getSystemTheme).mockReturnValue("dark");
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme("system");
      });

      expect(result.current.resolvedTheme).toBe("dark");
      expect(result.current.isDark).toBe(true);
    });
  });

  describe("toggleTheme", () => {
    it("cycles from light to dark", () => {
      vi.mocked(getStoredTheme).mockReturnValue("light");
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.theme).toBe("dark");
    });

    it("cycles from dark to system", () => {
      vi.mocked(getStoredTheme).mockReturnValue("dark");
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.theme).toBe("system");
    });

    it("cycles from system to light", () => {
      vi.mocked(getStoredTheme).mockReturnValue("system");
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.theme).toBe("light");
    });

    it("completes full cycle: light -> dark -> system -> light", () => {
      vi.mocked(getStoredTheme).mockReturnValue("light");
      const { result } = renderHook(() => useTheme());

      // light -> dark
      act(() => {
        result.current.toggleTheme();
      });
      expect(result.current.theme).toBe("dark");

      // dark -> system
      act(() => {
        result.current.toggleTheme();
      });
      expect(result.current.theme).toBe("system");

      // system -> light
      act(() => {
        result.current.toggleTheme();
      });
      expect(result.current.theme).toBe("light");
    });
  });

  describe("isDark", () => {
    it("returns true when resolved theme is dark", () => {
      vi.mocked(getStoredTheme).mockReturnValue("dark");
      vi.mocked(getSystemTheme).mockReturnValue("dark");

      const { result } = renderHook(() => useTheme());

      expect(result.current.isDark).toBe(true);
    });

    it("returns false when resolved theme is light", () => {
      vi.mocked(getStoredTheme).mockReturnValue("light");

      const { result } = renderHook(() => useTheme());

      expect(result.current.isDark).toBe(false);
    });

    it("returns true when system theme resolves to dark", () => {
      vi.mocked(getStoredTheme).mockReturnValue("system");
      vi.mocked(getSystemTheme).mockReturnValue("dark");

      const { result } = renderHook(() => useTheme());

      expect(result.current.isDark).toBe(true);
    });
  });
});
