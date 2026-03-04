import { create } from "zustand";

interface UIState {
  // Sidebar
  sidebarOpen: boolean; // Desktop sidebar visibility (legacy, kept for compatibility)
  sidebarCollapsed: boolean; // Desktop sidebar collapsed state
  mobileSidebarOpen: boolean; // Mobile sidebar overlay state
  expandedSidebarSection: string | null; // Accordion: only one section expanded at a time

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
  toggleSidebarSection: (label: string) => void;
  setExpandedSidebarSection: (label: string | null) => void;
  openModal: (modalId: string, data?: unknown) => void;
  closeModal: () => void;
  setGlobalLoading: (loading: boolean, message?: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Initial state
  sidebarOpen: true,
  sidebarCollapsed: false,
  mobileSidebarOpen: false, // Mobile sidebar hidden by default
  expandedSidebarSection: null, // No section expanded by default (auto-expand via active route)
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

  toggleSidebarSection: (label) =>
    set((state) => ({
      expandedSidebarSection:
        state.expandedSidebarSection === label ? null : label,
    })),

  setExpandedSidebarSection: (expandedSidebarSection) =>
    set({ expandedSidebarSection }),

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
