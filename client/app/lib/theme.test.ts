import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getSystemTheme,
  getSessionTheme,
  setSessionTheme,
  clearSessionTheme,
  applyTheme,
  initializeTheme,
} from "./theme";

describe("theme utilities", () => {
  beforeEach(() => {
    document.documentElement.classList.remove("light", "dark");
    sessionStorage.clear();
  });

  describe("SSR environment (window undefined)", () => {
    it('getSystemTheme returns "light" when window is undefined', async () => {
      vi.resetModules();
      vi.stubGlobal("window", undefined);

      const { getSystemTheme } = await import("./theme");
      expect(getSystemTheme()).toBe("light");

      vi.unstubAllGlobals();
    });

    it("getSessionTheme returns null when window is undefined", async () => {
      vi.resetModules();
      vi.stubGlobal("window", undefined);

      const { getSessionTheme } = await import("./theme");
      expect(getSessionTheme()).toBeNull();

      vi.unstubAllGlobals();
    });

    it("setSessionTheme returns early when window is undefined", async () => {
      vi.resetModules();
      vi.stubGlobal("window", undefined);

      const { setSessionTheme } = await import("./theme");
      // Should not throw
      expect(() => setSessionTheme("dark")).not.toThrow();

      vi.unstubAllGlobals();
    });

    it("clearSessionTheme returns early when window is undefined", async () => {
      vi.resetModules();
      vi.stubGlobal("window", undefined);

      const { clearSessionTheme } = await import("./theme");
      // Should not throw
      expect(() => clearSessionTheme()).not.toThrow();

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

  describe("session theme", () => {
    it("returns null when no session theme is stored", () => {
      expect(getSessionTheme()).toBeNull();
    });

    it("stores and retrieves theme from sessionStorage", () => {
      setSessionTheme("dark");
      expect(getSessionTheme()).toBe("dark");

      setSessionTheme("light");
      expect(getSessionTheme()).toBe("light");
    });

    it("clears session theme", () => {
      setSessionTheme("dark");
      clearSessionTheme();
      expect(getSessionTheme()).toBeNull();
    });

    it("ignores invalid values in sessionStorage", () => {
      sessionStorage.setItem("theme", "invalid");
      expect(getSessionTheme()).toBeNull();
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

    it("removes existing theme class before applying new one", () => {
      document.documentElement.classList.add("dark");
      applyTheme("light");
      expect(document.documentElement.classList.contains("dark")).toBe(false);
      expect(document.documentElement.classList.contains("light")).toBe(true);
    });
  });

  describe("initializeTheme", () => {
    it("uses session theme when available", () => {
      setSessionTheme("dark");

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
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("falls back to system theme when no session theme", () => {
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

      initializeTheme();
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });
});
