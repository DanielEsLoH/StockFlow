import { create } from "zustand";

interface UIState {
  // Sidebar
  sidebarOpen: boolean; // Desktop sidebar visibility (legacy, kept for compatibility)
  sidebarCollapsed: boolean; // Desktop sidebar collapsed state
  mobileSidebarOpen: boolean; // Mobile sidebar overlay state

  // Modals
  activeModal: string | null;
  modalData: unknown;

  // Global loading
  globalLoading: boolean;
  loadingMessage: string;

  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapse: () => void;
  toggleMobileSidebar: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
  openModal: (modalId: string, data?: unknown) => void;
  closeModal: () => void;
  setGlobalLoading: (loading: boolean, message?: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Initial state
  sidebarOpen: true,
  sidebarCollapsed: false,
  mobileSidebarOpen: false, // Mobile sidebar hidden by default
  activeModal: null,
  modalData: null,
  globalLoading: false,
  loadingMessage: "",

  // Actions
  toggleSidebar: () =>
    set((state) => ({
      sidebarOpen: !state.sidebarOpen,
    })),

  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),

  toggleSidebarCollapse: () =>
    set((state) => ({
      sidebarCollapsed: !state.sidebarCollapsed,
    })),

  toggleMobileSidebar: () =>
    set((state) => ({
      mobileSidebarOpen: !state.mobileSidebarOpen,
    })),

  setMobileSidebarOpen: (mobileSidebarOpen) => set({ mobileSidebarOpen }),

  openModal: (activeModal, modalData = null) =>
    set({
      activeModal,
      modalData,
    }),

  closeModal: () =>
    set({
      activeModal: null,
      modalData: null,
    }),

  setGlobalLoading: (globalLoading, loadingMessage = "") =>
    set({
      globalLoading,
      loadingMessage,
    }),
}));
