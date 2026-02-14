import { describe, it, expect } from "vitest";
import { tableRowVariants } from "./animations";

describe("animations", () => {
  describe("tableRowVariants", () => {
    it("should have a hidden variant with opacity 0 and y offset", () => {
      expect(tableRowVariants.hidden).toEqual({ opacity: 0, y: 8 });
    });

    it("should have a visible variant function that returns animation config based on index", () => {
      const visibleFn = tableRowVariants.visible as (i: number) => Record<string, unknown>;

      const result = visibleFn(0);
      expect(result).toEqual({
        opacity: 1,
        y: 0,
        transition: {
          delay: 0,
          duration: 0.3,
          ease: [0.16, 1, 0.3, 1],
        },
      });
    });

    it("should calculate delay based on the index parameter", () => {
      const visibleFn = tableRowVariants.visible as (i: number) => Record<string, unknown>;

      const result = visibleFn(5);
      expect(result).toEqual({
        opacity: 1,
        y: 0,
        transition: {
          delay: 5 * 0.03,
          duration: 0.3,
          ease: [0.16, 1, 0.3, 1],
        },
      });
    });
  });
});
