import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getSystemTheme,
  getStoredTheme,
  setStoredTheme,
  applyTheme,
  initializeTheme,
} from "./theme";

describe("theme utilities", () => {
  beforeEach(() => {
    // Reset DOM
    document.documentElement.classList.remove("light", "dark");
    // Reset localStorage mock
    vi.mocked(localStorage.getItem).mockClear();
    vi.mocked(localStorage.setItem).mockClear();
    vi.mocked(localStorage.clear).mockClear();
  });

  describe("SSR environment (window undefined)", () => {
    it('getSystemTheme returns "light" when window is undefined', async () => {
      vi.resetModules();
      vi.stubGlobal("window", undefined);

      const { getSystemTheme } = await import("./theme");
      expect(getSystemTheme()).toBe("light");

      vi.unstubAllGlobals();
    });

    it('getStoredTheme returns "system" when window is undefined', async () => {
      vi.resetModules();
      vi.stubGlobal("window", undefined);

      const { getStoredTheme } = await import("./theme");
      expect(getStoredTheme()).toBe("system");

      vi.unstubAllGlobals();
    });
  });

  describe("getSystemTheme", () => {
    it('returns "dark" when system prefers dark mode', () => {
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
          matches: query === "(prefers-color-scheme: dark)",
          media: query,
          onchange: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      expect(getSystemTheme()).toBe("dark");
    });

    it('returns "light" when system prefers light mode', () => {
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: vi.fn().mockImplementation(() => ({
          matches: false,
          media: "",
          onchange: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      expect(getSystemTheme()).toBe("light");
    });
  });

  describe("getStoredTheme", () => {
    it("returns stored theme from localStorage", () => {
      vi.mocked(localStorage.getItem).mockReturnValue("dark");
      expect(getStoredTheme()).toBe("dark");
      expect(localStorage.getItem).toHaveBeenCalledWith("theme");
    });

    it('returns "system" when no theme is stored', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(null);
      expect(getStoredTheme()).toBe("system");
    });

    it("returns stored light theme", () => {
      vi.mocked(localStorage.getItem).mockReturnValue("light");
      expect(getStoredTheme()).toBe("light");
    });

    it("returns stored system theme", () => {
      vi.mocked(localStorage.getItem).mockReturnValue("system");
      expect(getStoredTheme()).toBe("system");
    });
  });

  describe("setStoredTheme", () => {
    it("stores dark theme in localStorage", () => {
      setStoredTheme("dark");
      expect(localStorage.setItem).toHaveBeenCalledWith("theme", "dark");
    });

    it("stores light theme in localStorage", () => {
      setStoredTheme("light");
      expect(localStorage.setItem).toHaveBeenCalledWith("theme", "light");
    });

    it("stores system theme in localStorage", () => {
      setStoredTheme("system");
      expect(localStorage.setItem).toHaveBeenCalledWith("theme", "system");
    });
  });

  describe("applyTheme", () => {
    it('adds "dark" class for dark theme', () => {
      applyTheme("dark");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
      expect(document.documentElement.classList.contains("light")).toBe(false);
    });

    it('adds "light" class for light theme', () => {
      applyTheme("light");
      expect(document.documentElement.classList.contains("light")).toBe(true);
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    it("applies system theme based on dark preference", () => {
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
          matches: query === "(prefers-color-scheme: dark)",
          media: query,
          onchange: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      applyTheme("system");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("applies system theme based on light preference", () => {
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: vi.fn().mockImplementation(() => ({
          matches: false,
          media: "",
          onchange: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      applyTheme("system");
      expect(document.documentElement.classList.contains("light")).toBe(true);
    });

    it("removes existing theme class before applying new one", () => {
      document.documentElement.classList.add("dark");
      applyTheme("light");
      expect(document.documentElement.classList.contains("dark")).toBe(false);
      expect(document.documentElement.classList.contains("light")).toBe(true);
    });

    it("handles switching between themes", () => {
      applyTheme("dark");
      expect(document.documentElement.classList.contains("dark")).toBe(true);

      applyTheme("light");
      expect(document.documentElement.classList.contains("light")).toBe(true);
      expect(document.documentElement.classList.contains("dark")).toBe(false);

      applyTheme("dark");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
      expect(document.documentElement.classList.contains("light")).toBe(false);
    });
  });

  describe("initializeTheme", () => {
    it("applies stored dark theme on initialization", () => {
      vi.mocked(localStorage.getItem).mockReturnValue("dark");
      initializeTheme();
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("applies stored light theme on initialization", () => {
      vi.mocked(localStorage.getItem).mockReturnValue("light");
      initializeTheme();
      expect(document.documentElement.classList.contains("light")).toBe(true);
    });

    it('applies system theme when stored theme is "system"', () => {
      vi.mocked(localStorage.getItem).mockReturnValue("system");
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: vi.fn().mockImplementation(() => ({
          matches: false,
          media: "",
          onchange: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      initializeTheme();
      expect(document.documentElement.classList.contains("light")).toBe(true);
    });

    it('sets up listener for system theme changes when theme is "system"', () => {
      const addEventListenerMock = vi.fn();
      vi.mocked(localStorage.getItem).mockReturnValue("system");
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: vi.fn().mockImplementation(() => ({
          matches: false,
          media: "",
          onchange: null,
          addEventListener: addEventListenerMock,
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      initializeTheme();
      expect(addEventListenerMock).toHaveBeenCalledWith(
        "change",
        expect.any(Function),
      );
    });

    it('does not set up listener when theme is not "system"', () => {
      const addEventListenerMock = vi.fn();
      vi.mocked(localStorage.getItem).mockReturnValue("dark");
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: vi.fn().mockImplementation(() => ({
          matches: false,
          media: "",
          onchange: null,
          addEventListener: addEventListenerMock,
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      initializeTheme();
      expect(addEventListenerMock).not.toHaveBeenCalled();
    });

    it("reapplies system theme when system preference changes", () => {
      let changeCallback: (() => void) | null = null;
      const addEventListenerMock = vi.fn(
        (event: string, callback: () => void) => {
          if (event === "change") {
            changeCallback = callback;
          }
        },
      );

      vi.mocked(localStorage.getItem).mockReturnValue("system");
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: vi.fn().mockImplementation(() => ({
          matches: false,
          media: "",
          onchange: null,
          addEventListener: addEventListenerMock,
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      initializeTheme();
      expect(document.documentElement.classList.contains("light")).toBe(true);

      // Simulate system theme change to dark
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
          matches: query === "(prefers-color-scheme: dark)",
          media: query,
          onchange: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      // Invoke the change callback (line 34)
      expect(changeCallback).not.toBeNull();
      changeCallback!();

      expect(document.documentElement.classList.contains("dark")).toBe(true);
      expect(document.documentElement.classList.contains("light")).toBe(false);
    });
  });
});
