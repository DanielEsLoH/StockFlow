import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SystemAdmin } from "~/services/system-admin.service";

interface SystemAdminState {
  admin: SystemAdmin | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setAdmin: (admin: SystemAdmin | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useSystemAdminStore = create<SystemAdminState>()(
  persist(
    (set) => ({
      admin: null,
      isAuthenticated: false,
      isLoading: true,

      setAdmin: (admin) =>
        set({
          admin,
          isAuthenticated: !!admin,
          isLoading: false,
        }),

      setLoading: (isLoading) => set({ isLoading }),

      logout: () =>
        set({
          admin: null,
          isAuthenticated: false,
          isLoading: false,
        }),
    }),
    {
      name: "system-admin-storage",
      partialize: (state) => ({
        admin: state.admin,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
