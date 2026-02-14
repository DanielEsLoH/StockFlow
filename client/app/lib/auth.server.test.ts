import { describe, it, expect } from "vitest";
import {
  hasAuthToken,
  getRedirectTo,
  requireAuth,
  requireGuest,
} from "./auth.server";

// Helper to create a mock Request
function createMockRequest(url: string, cookies?: string): Request {
  const headers = new Headers();
  if (cookies) {
    headers.set("Cookie", cookies);
  }
  return new Request(url, { headers });
}

describe("auth.server", () => {
  describe("hasAuthToken", () => {
    it("should return false when no cookies are present", () => {
      const request = createMockRequest("http://localhost/");
      expect(hasAuthToken(request)).toBe(false);
    });

    it("should return false when refreshToken cookie is not present", () => {
      const request = createMockRequest("http://localhost/", "other=value");
      expect(hasAuthToken(request)).toBe(false);
    });

    it("should return true when refreshToken cookie is present", () => {
      const request = createMockRequest(
        "http://localhost/",
        "refreshToken=true",
      );
      expect(hasAuthToken(request)).toBe(true);
    });

    it("should handle multiple cookies", () => {
      const request = createMockRequest(
        "http://localhost/",
        "theme=dark; refreshToken=true; other=value",
      );
      expect(hasAuthToken(request)).toBe(true);
    });

    it("should skip empty cookie segments gracefully", () => {
      // Cookie header with a leading semicolon creates an empty-name segment after trim+split
      const request = createMockRequest(
        "http://localhost/",
        "; refreshToken=true",
      );
      expect(hasAuthToken(request)).toBe(true);
    });

    it("should skip cookies with empty name from malformed header", () => {
      // A segment like "=somevalue" results in an empty name
      const request = createMockRequest(
        "http://localhost/",
        "=somevalue; other=val",
      );
      expect(hasAuthToken(request)).toBe(false);
    });
  });

  describe("getRedirectTo", () => {
    it("should return default path when no redirectTo param", () => {
      const request = createMockRequest("http://localhost/login");
      expect(getRedirectTo(request)).toBe("/dashboard");
    });

    it("should return redirectTo param when valid", () => {
      const request = createMockRequest(
        "http://localhost/login?redirectTo=/products",
      );
      expect(getRedirectTo(request)).toBe("/products");
    });

    it("should return default when redirectTo is absolute URL (security)", () => {
      const request = createMockRequest(
        "http://localhost/login?redirectTo=https://evil.com",
      );
      expect(getRedirectTo(request)).toBe("/dashboard");
    });

    it("should return default when redirectTo starts with // (security)", () => {
      const request = createMockRequest(
        "http://localhost/login?redirectTo=//evil.com",
      );
      expect(getRedirectTo(request)).toBe("/dashboard");
    });

    it("should accept custom default path", () => {
      const request = createMockRequest("http://localhost/login");
      expect(getRedirectTo(request, "/home")).toBe("/home");
    });
  });

  describe("requireAuth", () => {
    it("should throw redirect when not authenticated", () => {
      const request = createMockRequest("http://localhost/dashboard");
      expect(() => requireAuth(request)).toThrow();
    });

    it("should not throw when authenticated", () => {
      const request = createMockRequest(
        "http://localhost/dashboard",
        "refreshToken=true",
      );
      expect(() => requireAuth(request)).not.toThrow();
    });

    it("should include current path in redirect URL", () => {
      const request = createMockRequest("http://localhost/products");
      try {
        requireAuth(request);
      } catch (response) {
        expect(response).toBeDefined();
        // React Router redirect throws a Response object
        if (response instanceof Response) {
          const location = response.headers.get("Location");
          expect(location).toContain("redirectTo=%2Fproducts");
        }
      }
    });
  });

  describe("requireGuest", () => {
    it("should not throw when not authenticated", () => {
      const request = createMockRequest("http://localhost/login");
      expect(() => requireGuest(request)).not.toThrow();
    });

    it("should throw redirect when authenticated", () => {
      const request = createMockRequest(
        "http://localhost/login",
        "refreshToken=true",
      );
      expect(() => requireGuest(request)).toThrow();
    });

    it("should redirect to custom path", () => {
      const request = createMockRequest(
        "http://localhost/login",
        "refreshToken=true",
      );
      try {
        requireGuest(request, "/custom");
      } catch (response) {
        expect(response).toBeDefined();
        if (response instanceof Response) {
          const location = response.headers.get("Location");
          expect(location).toBe("/custom");
        }
      }
    });
  });
});
