import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  cn,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatRelativeTime,
  formatCompactNumber,
  getInitials,
  truncate,
  debounce,
  sleep,
  safeJsonParse,
  generateId,
  isEmpty,
  capitalize,
  pluralize,
  formatFileSize,
} from "./utils";

describe("utils", () => {
  describe("cn", () => {
    it("merges class names correctly", () => {
      expect(cn("foo", "bar")).toBe("foo bar");
    });

    it("handles conditional classes", () => {
      const showHidden = false;
      const showVisible = true;
      expect(cn("base", showHidden && "hidden", showVisible && "visible")).toBe(
        "base visible",
      );
    });

    it("merges Tailwind classes correctly", () => {
      expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
    });

    it("handles undefined and null values", () => {
      expect(cn("foo", undefined, null, "bar")).toBe("foo bar");
    });

    it("handles arrays", () => {
      expect(cn(["foo", "bar"])).toBe("foo bar");
    });

    it("handles objects", () => {
      expect(cn({ foo: true, bar: false, baz: true })).toBe("foo baz");
    });

    it("handles mixed inputs", () => {
      expect(cn(["base"], { active: true }, "extra")).toBe("base active extra");
    });
  });

  describe("formatCurrency", () => {
    it("formats currency with default COP", () => {
      const result = formatCurrency(1000000);
      expect(result).toContain("1.000.000");
    });

    it("formats zero correctly", () => {
      const result = formatCurrency(0);
      expect(result).toContain("0");
    });

    it("formats negative numbers", () => {
      const result = formatCurrency(-5000);
      expect(result).toContain("5.000");
    });

    it("formats with custom currency", () => {
      const result = formatCurrency(1000, "USD");
      expect(result).toBeDefined();
    });

    it("formats small amounts", () => {
      const result = formatCurrency(50);
      expect(result).toContain("50");
    });
  });

  describe("formatDate", () => {
    it("formats Date object", () => {
      const date = new Date("2024-01-15");
      const result = formatDate(date);
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
    });

    it("formats date string", () => {
      const result = formatDate("2024-01-15");
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
    });

    it("accepts custom options", () => {
      const date = new Date("2024-01-15");
      const result = formatDate(date, { dateStyle: "long" });
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(5);
    });
  });

  describe("formatDateTime", () => {
    it("formats a string date", () => {
      const result = formatDateTime("2024-01-15T10:30:00");
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
    });

    it("formats a Date object", () => {
      const date = new Date("2024-01-15T10:30:00");
      const result = formatDateTime(date);
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
    });

    it("accepts custom options", () => {
      const date = new Date("2024-01-15T10:30:00");
      const result = formatDateTime(date, { dateStyle: "long", timeStyle: "long" });
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(5);
    });

    it("returns consistent results for string and Date input of the same date", () => {
      const dateStr = "2024-06-15T14:30:00";
      const dateObj = new Date(dateStr);
      expect(formatDateTime(dateStr)).toBe(formatDateTime(dateObj));
    });
  });

  describe("formatRelativeTime", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-01-15T12:00:00"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns "Just now" for very recent times', () => {
      const date = new Date("2024-01-15T11:59:45");
      expect(formatRelativeTime(date)).toBe("Just now");
    });

    it("returns minutes ago for times under an hour", () => {
      const date = new Date("2024-01-15T11:30:00");
      expect(formatRelativeTime(date)).toBe("30 min ago");
    });

    it("returns hours ago for times under a day", () => {
      const date = new Date("2024-01-15T09:00:00");
      expect(formatRelativeTime(date)).toBe("3 h ago");
    });

    it("returns days ago for times under a week", () => {
      const date = new Date("2024-01-13T12:00:00");
      expect(formatRelativeTime(date)).toBe("2 days ago");
    });

    it("returns formatted date for older times", () => {
      const date = new Date("2024-01-01T12:00:00");
      const result = formatRelativeTime(date);
      expect(result).not.toContain("ago");
    });

    it("handles string dates", () => {
      const result = formatRelativeTime("2024-01-15T11:30:00");
      expect(result).toBe("30 min ago");
    });

    it("handles 1 minute ago", () => {
      const date = new Date("2024-01-15T11:59:00");
      expect(formatRelativeTime(date)).toBe("1 min ago");
    });

    it("handles 1 hour ago", () => {
      const date = new Date("2024-01-15T11:00:00");
      expect(formatRelativeTime(date)).toBe("1 h ago");
    });

    it("handles 1 day ago", () => {
      const date = new Date("2024-01-14T12:00:00");
      expect(formatRelativeTime(date)).toBe("1 days ago");
    });
  });

  describe("formatCompactNumber", () => {
    it("returns number as string for small numbers", () => {
      expect(formatCompactNumber(500)).toBe("500");
      expect(formatCompactNumber(0)).toBe("0");
      expect(formatCompactNumber(999)).toBe("999");
    });

    it("formats thousands with K suffix", () => {
      expect(formatCompactNumber(1000)).toBe("1.0K");
      expect(formatCompactNumber(1500)).toBe("1.5K");
      expect(formatCompactNumber(999999)).toBe("1000.0K");
    });

    it("formats millions with M suffix", () => {
      expect(formatCompactNumber(1000000)).toBe("1.0M");
      expect(formatCompactNumber(2500000)).toBe("2.5M");
      expect(formatCompactNumber(10500000)).toBe("10.5M");
    });
  });

  describe("getInitials", () => {
    it("returns initials from full name", () => {
      expect(getInitials("John Doe")).toBe("JD");
    });

    it("returns single initial for single name", () => {
      expect(getInitials("John")).toBe("J");
    });

    it("limits to 2 characters", () => {
      expect(getInitials("John Michael Doe")).toBe("JM");
    });

    it("handles lowercase names", () => {
      expect(getInitials("john doe")).toBe("JD");
    });

    it("handles names with extra spaces", () => {
      expect(getInitials("John  Doe")).toBe("JD");
    });
  });

  describe("truncate", () => {
    it("returns original string if shorter than length", () => {
      expect(truncate("Hello", 10)).toBe("Hello");
    });

    it("truncates and adds ellipsis if longer", () => {
      expect(truncate("Hello World", 5)).toBe("Hello...");
    });

    it("handles exact length", () => {
      expect(truncate("Hello", 5)).toBe("Hello");
    });

    it("handles empty string", () => {
      expect(truncate("", 5)).toBe("");
    });

    it("handles length of 0", () => {
      expect(truncate("Hello", 0)).toBe("...");
    });
  });

  describe("debounce", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("delays function execution", () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("resets timer on subsequent calls", () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      vi.advanceTimersByTime(50);
      debouncedFn();
      vi.advanceTimersByTime(50);
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("passes arguments to debounced function", () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn("arg1", "arg2");
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledWith("arg1", "arg2");
    });

    it("only calls with last arguments", () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn("first");
      debouncedFn("second");
      debouncedFn("third");
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith("third");
    });
  });

  describe("sleep", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("resolves after specified time", async () => {
      const promise = sleep(100);
      vi.advanceTimersByTime(100);
      await expect(promise).resolves.toBeUndefined();
    });

    it("does not resolve before time", async () => {
      let resolved = false;
      sleep(100).then(() => {
        resolved = true;
      });

      vi.advanceTimersByTime(50);
      expect(resolved).toBe(false);
    });
  });

  describe("safeJsonParse", () => {
    it("parses valid JSON", () => {
      expect(safeJsonParse('{"foo": "bar"}', {})).toEqual({ foo: "bar" });
    });

    it("returns fallback for invalid JSON", () => {
      expect(safeJsonParse("invalid", { default: true })).toEqual({
        default: true,
      });
    });

    it("returns fallback for empty string", () => {
      expect(safeJsonParse("", [])).toEqual([]);
    });

    it("parses arrays", () => {
      expect(safeJsonParse("[1,2,3]", [])).toEqual([1, 2, 3]);
    });

    it("parses numbers", () => {
      expect(safeJsonParse("42", 0)).toBe(42);
    });

    it("parses strings", () => {
      expect(safeJsonParse('"hello"', "")).toBe("hello");
    });

    it("parses booleans", () => {
      expect(safeJsonParse("true", false)).toBe(true);
    });

    it("parses null", () => {
      expect(safeJsonParse("null", "fallback")).toBeNull();
    });
  });

  describe("generateId", () => {
    it("generates a string id", () => {
      const id = generateId();
      expect(typeof id).toBe("string");
    });

    it("generates unique ids", () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateId());
      }
      expect(ids.size).toBe(100);
    });

    it("generates id with correct length", () => {
      const id = generateId();
      expect(id.length).toBe(7);
    });

    it("generates alphanumeric ids", () => {
      const id = generateId();
      expect(id).toMatch(/^[a-z0-9]+$/);
    });
  });

  describe("isEmpty", () => {
    it("returns true for null", () => {
      expect(isEmpty(null)).toBe(true);
    });

    it("returns true for undefined", () => {
      expect(isEmpty(undefined)).toBe(true);
    });

    it("returns true for empty string", () => {
      expect(isEmpty("")).toBe(true);
    });

    it("returns true for whitespace string", () => {
      expect(isEmpty("   ")).toBe(true);
      expect(isEmpty("\t\n")).toBe(true);
    });

    it("returns true for empty array", () => {
      expect(isEmpty([])).toBe(true);
    });

    it("returns true for empty object", () => {
      expect(isEmpty({})).toBe(true);
    });

    it("returns false for non-empty string", () => {
      expect(isEmpty("hello")).toBe(false);
    });

    it("returns false for non-empty array", () => {
      expect(isEmpty([1, 2])).toBe(false);
    });

    it("returns false for non-empty object", () => {
      expect(isEmpty({ foo: "bar" })).toBe(false);
    });

    it("returns false for number 0", () => {
      expect(isEmpty(0)).toBe(false);
    });

    it("returns false for boolean false", () => {
      expect(isEmpty(false)).toBe(false);
    });
  });

  describe("capitalize", () => {
    it("capitalizes first letter", () => {
      expect(capitalize("hello")).toBe("Hello");
    });

    it("handles uppercase strings", () => {
      expect(capitalize("HELLO")).toBe("Hello");
    });

    it("handles single character", () => {
      expect(capitalize("h")).toBe("H");
    });

    it("handles empty string", () => {
      expect(capitalize("")).toBe("");
    });

    it("handles mixed case", () => {
      expect(capitalize("hELLo WoRLD")).toBe("Hello world");
    });
  });

  describe("pluralize", () => {
    it("returns singular for count of 1", () => {
      expect(pluralize(1, "item")).toBe("item");
    });

    it("returns plural with s for count > 1", () => {
      expect(pluralize(2, "item")).toBe("items");
      expect(pluralize(100, "item")).toBe("items");
    });

    it("returns plural for count of 0", () => {
      expect(pluralize(0, "item")).toBe("items");
    });

    it("uses custom plural form", () => {
      expect(pluralize(2, "person", "people")).toBe("people");
      expect(pluralize(1, "person", "people")).toBe("person");
    });

    it("handles negative counts as plural", () => {
      expect(pluralize(-1, "item")).toBe("items");
    });
  });

  describe("formatFileSize", () => {
    it('returns "0 B" for zero bytes', () => {
      expect(formatFileSize(0)).toBe("0 B");
    });

    it("formats bytes correctly", () => {
      expect(formatFileSize(1)).toBe("1 B");
      expect(formatFileSize(500)).toBe("500 B");
      expect(formatFileSize(1023)).toBe("1023 B");
    });

    it("formats kilobytes correctly", () => {
      expect(formatFileSize(1024)).toBe("1 KB");
      expect(formatFileSize(1536)).toBe("1.5 KB");
      expect(formatFileSize(10240)).toBe("10 KB");
    });

    it("formats megabytes correctly", () => {
      expect(formatFileSize(1048576)).toBe("1 MB");
      expect(formatFileSize(1572864)).toBe("1.5 MB");
      expect(formatFileSize(10485760)).toBe("10 MB");
    });

    it("formats gigabytes correctly", () => {
      expect(formatFileSize(1073741824)).toBe("1 GB");
      expect(formatFileSize(1610612736)).toBe("1.5 GB");
    });

    it("formats terabytes correctly", () => {
      expect(formatFileSize(1099511627776)).toBe("1 TB");
      expect(formatFileSize(1649267441664)).toBe("1.5 TB");
    });
  });
});
