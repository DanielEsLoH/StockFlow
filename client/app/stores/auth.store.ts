import { create } from "zustand";
import { persist } from "zustand/middleware";
import { clearAllAuthData } from "~/lib/api";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "EMPLOYEE";
  status: "ACTIVE" | "PENDING" | "SUSPENDED";
  tenantId: string;
  avatarUrl?: string;
  /** Effective permissions loaded from server (role defaults + overrides) */
  permissions?: string[];
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: "FREE" | "BASIC" | "PRO" | "ENTERPRISE";
  status: "ACTIVE" | "SUSPENDED";
  logoUrl?: string;
}

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** True after AuthInitializer has completed (success or failure) */
  isInitialized: boolean;
  /** True after Zustand has rehydrated from localStorage */
  _hasHydrated: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setTenant: (tenant: Tenant | null) => void;
  setUserPermissions: (permissions: string[]) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  setHasHydrated: (hydrated: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tenant: null,
      isAuthenticated: false,
      isLoading: false, // Start as false - AuthInitializer will set loading state if needed
      isInitialized: false, // Start as false - set to true after AuthInitializer completes
      _hasHydrated: false, // Track Zustand rehydration from localStorage

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false,
        }),

      setTenant: (tenant) => set({ tenant }),

      setUserPermissions: (permissions) =>
        set((state) => ({
          user: state.user ? { ...state.user, permissions } : null,
        })),

      setLoading: (isLoading) => set({ isLoading }),

      setInitialized: (isInitialized) => set({ isInitialized }),

      setHasHydrated: (_hasHydrated) => set({ _hasHydrated }),

      logout: () => {
        // Clear ALL auth data (tokens, localStorage, sessionStorage, cookies)
        clearAllAuthData();

        // Reset Zustand state
        set({
          user: null,
          tenant: null,
          isAuthenticated: false,
          isLoading: false,
          isInitialized: false,
        });
      },
    }),
    {
      name: "auth-storage",
      // Persist isInitialized so queries work after client-side navigation
      // isLoading should reset on page load
      partialize: (state) => ({
        user: state.user,
        tenant: state.tenant,
        isAuthenticated: state.isAuthenticated,
        isInitialized: state.isInitialized,
      }),
      onRehydrateStorage: () => (state) => {
        // Called when Zustand finishes rehydrating from localStorage
        state?.setHasHydrated(true);
      },
    },
  ),
);
