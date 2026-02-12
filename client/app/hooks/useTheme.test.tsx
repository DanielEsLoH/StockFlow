import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTheme } from "./useTheme";

// Mock the theme module
vi.mock("~/lib/theme", () => ({
  applyTheme: vi.fn(),
  getSystemTheme: vi.fn(() => "light"),
  getSessionTheme: vi.fn(() => null),
  setSessionTheme: vi.fn(),
}));

import {
  applyTheme,
  getSystemTheme,
  getSessionTheme,
  setSessionTheme,
} from "~/lib/theme";

describe("useTheme", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSystemTheme).mockReturnValue("light");
    vi.mocked(getSessionTheme).mockReturnValue(null);
  });

  describe("initialization", () => {
    it("initializes from system theme when no session theme", () => {
      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe("light");
      expect(result.current.isDark).toBe(false);
    });

    it("initializes from session theme when available", () => {
      vi.mocked(getSessionTheme).mockReturnValue("dark");

      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe("dark");
      expect(result.current.isDark).toBe(true);
    });

    it("prefers session theme over system theme", () => {
      vi.mocked(getSessionTheme).mockReturnValue("light");
      vi.mocked(getSystemTheme).mockReturnValue("dark");

      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe("light");
      expect(result.current.isDark).toBe(false);
    });
  });

  describe("setTheme", () => {
    it("updates theme and saves to session", () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme("dark");
      });

      expect(result.current.theme).toBe("dark");
      expect(result.current.isDark).toBe(true);
      expect(setSessionTheme).toHaveBeenCalledWith("dark");
      expect(applyTheme).toHaveBeenCalledWith("dark");
    });

    it("updates theme to light and saves to session", () => {
      vi.mocked(getSessionTheme).mockReturnValue("dark");
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme("light");
      });

      expect(result.current.theme).toBe("light");
      expect(result.current.isDark).toBe(false);
      expect(setSessionTheme).toHaveBeenCalledWith("light");
      expect(applyTheme).toHaveBeenCalledWith("light");
    });
  });

  describe("toggleTheme", () => {
    it("toggles from light to dark", () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.theme).toBe("dark");
      expect(setSessionTheme).toHaveBeenCalledWith("dark");
    });

    it("toggles from dark to light", () => {
      vi.mocked(getSessionTheme).mockReturnValue("dark");
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.theme).toBe("light");
      expect(setSessionTheme).toHaveBeenCalledWith("light");
    });

    it("alternates correctly on multiple toggles", () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.toggleTheme();
      });
      expect(result.current.theme).toBe("dark");

      act(() => {
        result.current.toggleTheme();
      });
      expect(result.current.theme).toBe("light");

      act(() => {
        result.current.toggleTheme();
      });
      expect(result.current.theme).toBe("dark");
    });
  });

  describe("isDark", () => {
    it("returns true when theme is dark", () => {
      vi.mocked(getSessionTheme).mockReturnValue("dark");
      const { result } = renderHook(() => useTheme());

      expect(result.current.isDark).toBe(true);
    });

    it("returns false when theme is light", () => {
      const { result } = renderHook(() => useTheme());

      expect(result.current.isDark).toBe(false);
    });
  });
});
