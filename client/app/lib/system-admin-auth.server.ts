import { redirect } from "react-router";

const SYSTEM_ADMIN_REFRESH_TOKEN_KEY = "system_admin_refresh_token";

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
 * Checks if system admin has a refresh token cookie (indicates they might be authenticated).
 * For SSR, we check the cookie header since localStorage is not available.
 */
export function hasSystemAdminAuthToken(request: Request): boolean {
  const cookieHeader = request.headers.get("Cookie");
  const cookies = parseCookies(cookieHeader);

  return !!cookies[SYSTEM_ADMIN_REFRESH_TOKEN_KEY];
}

/**
 * Gets the redirect URL from search params, with validation
 */
export function getSystemAdminRedirectTo(
  request: Request,
  defaultPath = "/system-admin/dashboard",
): string {
  const url = new URL(request.url);
  const redirectTo = url.searchParams.get("redirectTo");

  // Only allow relative paths that start with /system-admin to prevent open redirect vulnerabilities
  if (
    redirectTo &&
    redirectTo.startsWith("/system-admin") &&
    !redirectTo.startsWith("//")
  ) {
    return redirectTo;
  }

  return defaultPath;
}

/**
 * Requires system admin authentication - redirects to login if not authenticated.
 * Use this in loaders for protected system admin routes.
 */
export function requireSystemAdminAuth(
  request: Request,
  redirectTo = "/system-admin/login",
): void {
  if (!hasSystemAdminAuthToken(request)) {
    const url = new URL(request.url);
    const searchParams = new URLSearchParams();
    searchParams.set("redirectTo", url.pathname);
    throw redirect(`${redirectTo}?${searchParams.toString()}`);
  }
}

/**
 * Requires guest (not authenticated) - redirects to dashboard if authenticated.
 * Use this in loaders for public system admin routes like login.
 */
export function requireSystemAdminGuest(
  request: Request,
  redirectTo = "/system-admin/dashboard",
): void {
  if (hasSystemAdminAuthToken(request)) {
    throw redirect(redirectTo);
  }
}
