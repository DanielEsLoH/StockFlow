import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Connection quality levels for the network status.
 *
 * - 'good': stable connection, low latency
 * - 'slow': high latency (>3s) or slow effective type (2g/slow-2g)
 * - 'offline': no internet connection
 */
export type ConnectionQuality = "good" | "slow" | "offline";

interface NetworkState {
  isOnline: boolean;
  connectionQuality: ConnectionQuality;
  lastSyncAt: number | null;
  pendingSyncCount: number;
  setOnline: (online: boolean) => void;
  setConnectionQuality: (quality: ConnectionQuality) => void;
  setLastSyncAt: (timestamp: number) => void;
  setPendingSyncCount: (count: number) => void;
  incrementPendingSync: () => void;
  decrementPendingSync: () => void;
}

export const useNetworkStore = create<NetworkState>()(
  persist(
    (set) => ({
      isOnline: true,
      connectionQuality: "good",
      lastSyncAt: null,
      pendingSyncCount: 0,
      setOnline: (online) =>
        set({
          isOnline: online,
          connectionQuality: online ? "good" : "offline",
        }),
      setConnectionQuality: (quality) => set({ connectionQuality: quality }),
      setLastSyncAt: (timestamp) => set({ lastSyncAt: timestamp }),
      setPendingSyncCount: (count) => set({ pendingSyncCount: count }),
      incrementPendingSync: () =>
        set((state) => ({ pendingSyncCount: state.pendingSyncCount + 1 })),
      decrementPendingSync: () =>
        set((state) => ({
          pendingSyncCount: Math.max(0, state.pendingSyncCount - 1),
        })),
    }),
    {
      name: "network-storage",
      partialize: (state) => ({
        lastSyncAt: state.lastSyncAt,
        pendingSyncCount: state.pendingSyncCount,
      }),
    },
  ),
);
