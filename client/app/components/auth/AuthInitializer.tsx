import { useEffect, useRef, type ReactNode } from "react";
import axios from "axios";
import {
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
  clearAllAuthData,
  getAccessToken,
  completeAuthInit,
  isAuthInitializing,
  startAuthInit,
} from "~/lib/api";
import { useAuthStore } from "~/stores/auth.store";
import { permissionsService } from "~/services/permissions.service";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

interface AuthInitializerProps {
  children: ReactNode;
}

/**
 * AuthInitializer proactively refreshes the access token on app load.
 *
 * This component solves the race condition where:
 * 1. User has a valid refresh token in localStorage
 * 2. But the access token in memory is null (lost on page reload)
 * 3. API calls fail with 401, triggering axios interceptor to refresh
 * 4. React Query receives the error before the retry completes
 *
 * The api.ts module auto-starts the auth init (startAuthInit) if there's a
 * refresh token in localStorage but no access token. This component completes
 * the initialization by either refreshing the token or clearing the block.
 *
 * IMPORTANT: This component always renders children to preserve SSR hydration.
 * It only triggers token refresh as a side effect.
 */
export function AuthInitializer({ children }: AuthInitializerProps) {
  const setUser = useAuthStore((state) => state.setUser);
  const setTenant = useAuthStore((state) => state.setTenant);
  const setUserPermissions = useAuthStore((state) => state.setUserPermissions);
  const setLoading = useAuthStore((state) => state.setLoading);
  const setInitialized = useAuthStore((state) => state.setInitialized);
  const initRef = useRef(false);

  useEffect(() => {
    // Skip on server
    if (typeof window === "undefined") return;

    // Prevent double initialization in React strict mode
    if (initRef.current) return;
    initRef.current = true;

    async function initializeAuth() {
      // Check for refresh token
      let refreshToken: string | null = null;
      try {
        refreshToken = getRefreshToken();
      } catch {
        // localStorage might not be available in some edge cases
        completeAuthInit();
        setLoading(false);
        setInitialized(true);
        return;
      }

      // If we have a refresh token but no access token, we need to refresh
      // Set loading to true to prevent queries from firing prematurely
      if (refreshToken && !getAccessToken()) {
        setLoading(true);
      }

      // Ensure auth init is started if we have a refresh token but no access token
      // This handles the case where the module-level startAuthInit didn't run (e.g., SSR hydration)
      if (refreshToken && !getAccessToken() && !isAuthInitializing()) {
        startAuthInit();
      }

      // Check if auth init was started (by api.ts module load or above)
      const needsCompletion = isAuthInitializing();

      // If we already have an access token, just complete the init
      if (getAccessToken()) {
        if (needsCompletion) {
          completeAuthInit();
        }
        setLoading(false);
        setInitialized(true);
        return;
      }

      if (!refreshToken) {
        // No refresh token = not authenticated
        if (needsCompletion) {
          completeAuthInit();
        }
        setLoading(false);
        setInitialized(true);
        return;
      }

      // We have a refresh token but no access token - need to refresh
      // Note: startAuthInit was already called by api.ts module
      try {
        // Proactively refresh the token before any other API calls
        const response = await axios.post(
          `${API_URL}/auth/refresh`,
          { refreshToken },
          { withCredentials: true },
        );

        const {
          accessToken,
          refreshToken: newRefreshToken,
          user,
          tenant,
        } = response.data;

        // Store the new tokens
        setAccessToken(accessToken);
        if (newRefreshToken) {
          setRefreshToken(newRefreshToken);
        }

        // Update auth store with user data if available
        if (user) {
          setUser(user);
        }
        if (tenant) {
          setTenant(tenant);
        }

        // Unblock the api request interceptor BEFORE loading permissions,
        // since permissionsService uses the api instance which awaits authInitPromise.
        completeAuthInit();
        setLoading(false);
        setInitialized(true);

        // Load user permissions after unblocking requests
        try {
          const { permissions } = await permissionsService.getMyPermissions();
          setUserPermissions(permissions);
        } catch {
          // Permissions will fall back to role defaults
          console.warn('[AuthInitializer] Failed to load permissions, using defaults');
        }
      } catch (error) {
        // Refresh failed - clear all auth data
        // This prevents stale tokens from causing issues
        console.warn(
          "[AuthInitializer] Token refresh failed, clearing auth data",
        );
        clearAllAuthData();
        completeAuthInit();
        setLoading(false);
        setInitialized(true);
      }
    }

    initializeAuth();
  }, [setUser, setTenant, setUserPermissions, setLoading, setInitialized]);

  // Always render children to preserve SSR hydration
  // Auth initialization happens as a side effect
  return <>{children}</>;
}
