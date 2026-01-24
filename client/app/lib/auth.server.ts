import { redirect } from "react-router";

const REFRESH_TOKEN_KEY = "refreshToken";

/**
 * Parses cookies from a request's Cookie header
 */
function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};

  return cookieHeader.split(";").reduce(
    (cookies, cookie) => {
      const [name, ...valueParts] = cookie.trim().split("=");
      if (name) {
        cookies[name] = valueParts.join("=");
      }
      return cookies;
    },
    {} as Record<string, string>,
  );
}

/**
 * Checks if user has a refresh token cookie (indicates they might be authenticated).
 * For SSR, we check the cookie header since localStorage is not available.
 *
 * Note: This is a lightweight check. The actual token validation happens
 * when the client makes API calls and the interceptor handles refresh.
 */
export function hasAuthToken(request: Request): boolean {
  const cookieHeader = request.headers.get("Cookie");
  const cookies = parseCookies(cookieHeader);

  // Check for refresh token in cookies
  // The actual validation happens client-side when API calls are made
  return !!cookies[REFRESH_TOKEN_KEY];
}

/**
 * Gets the redirect URL from search params, with validation
 */
export function getRedirectTo(
  request: Request,
  defaultPath = "/dashboard",
): string {
  const url = new URL(request.url);
  const redirectTo = url.searchParams.get("redirectTo");

  // Only allow relative paths to prevent open redirect vulnerabilities
  if (
    redirectTo &&
    redirectTo.startsWith("/") &&
    !redirectTo.startsWith("//")
  ) {
    return redirectTo;
  }

  return defaultPath;
}

/**
 * Requires authentication - redirects to login if not authenticated.
 * Use this in loaders for protected routes.
 *
 * Note: Since auth tokens are stored in localStorage (client-side only),
 * this check uses cookies which need to be synced with localStorage.
 */
export function requireAuth(request: Request, redirectTo = "/login"): void {
  if (!hasAuthToken(request)) {
    const url = new URL(request.url);
    const searchParams = new URLSearchParams();
    searchParams.set("redirectTo", url.pathname);
    throw redirect(`${redirectTo}?${searchParams.toString()}`);
  }
}

/**
 * Requires guest (not authenticated) - redirects to dashboard if authenticated.
 * Use this in loaders for public routes like login/register.
 */
export function requireGuest(
  request: Request,
  redirectTo = "/dashboard",
): void {
  if (hasAuthToken(request)) {
    throw redirect(redirectTo);
  }
}
