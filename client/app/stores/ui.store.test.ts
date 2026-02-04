import { describe, it, expect, beforeEach } from "vitest";
import { useUIStore } from "./ui.store";

describe("useUIStore", () => {
  beforeEach(() => {
    // Reset the store to initial state before each test
    useUIStore.setState({
      sidebarOpen: true,
      sidebarCollapsed: false,
      mobileSidebarOpen: false,
      activeModal: null,
      modalData: null,
      globalLoading: false,
      loadingMessage: "",
    });
  });

  describe("initial state", () => {
    it("should have correct initial state", () => {
      const state = useUIStore.getState();

      expect(state.sidebarOpen).toBe(true);
      expect(state.sidebarCollapsed).toBe(false);
      expect(state.mobileSidebarOpen).toBe(false);
      expect(state.activeModal).toBeNull();
      expect(state.modalData).toBeNull();
      expect(state.globalLoading).toBe(false);
      expect(state.loadingMessage).toBe("");
    });
  });

  describe("toggleSidebar", () => {
    it("should toggle sidebarOpen from true to false", () => {
      expect(useUIStore.getState().sidebarOpen).toBe(true);

      useUIStore.getState().toggleSidebar();

      expect(useUIStore.getState().sidebarOpen).toBe(false);
    });

    it("should toggle sidebarOpen from false to true", () => {
      useUIStore.setState({ sidebarOpen: false });
      expect(useUIStore.getState().sidebarOpen).toBe(false);

      useUIStore.getState().toggleSidebar();

      expect(useUIStore.getState().sidebarOpen).toBe(true);
    });

    it("should toggle multiple times correctly", () => {
      const { toggleSidebar } = useUIStore.getState();

      toggleSidebar(); // true -> false
      expect(useUIStore.getState().sidebarOpen).toBe(false);

      toggleSidebar(); // false -> true
      expect(useUIStore.getState().sidebarOpen).toBe(true);

      toggleSidebar(); // true -> false
      expect(useUIStore.getState().sidebarOpen).toBe(false);
    });
  });

  describe("setSidebarOpen", () => {
    it("should set sidebarOpen to true", () => {
      useUIStore.setState({ sidebarOpen: false });

      useUIStore.getState().setSidebarOpen(true);

      expect(useUIStore.getState().sidebarOpen).toBe(true);
    });

    it("should set sidebarOpen to false", () => {
      expect(useUIStore.getState().sidebarOpen).toBe(true);

      useUIStore.getState().setSidebarOpen(false);

      expect(useUIStore.getState().sidebarOpen).toBe(false);
    });
  });

  describe("toggleSidebarCollapse", () => {
    it("should toggle sidebarCollapsed from false to true", () => {
      expect(useUIStore.getState().sidebarCollapsed).toBe(false);

      useUIStore.getState().toggleSidebarCollapse();

      expect(useUIStore.getState().sidebarCollapsed).toBe(true);
    });

    it("should toggle sidebarCollapsed from true to false", () => {
      useUIStore.setState({ sidebarCollapsed: true });

      useUIStore.getState().toggleSidebarCollapse();

      expect(useUIStore.getState().sidebarCollapsed).toBe(false);
    });
  });

  describe("toggleMobileSidebar", () => {
    it("should toggle mobileSidebarOpen from false to true", () => {
      expect(useUIStore.getState().mobileSidebarOpen).toBe(false);

      useUIStore.getState().toggleMobileSidebar();

      expect(useUIStore.getState().mobileSidebarOpen).toBe(true);
    });

    it("should toggle mobileSidebarOpen from true to false", () => {
      useUIStore.setState({ mobileSidebarOpen: true });

      useUIStore.getState().toggleMobileSidebar();

      expect(useUIStore.getState().mobileSidebarOpen).toBe(false);
    });
  });

  describe("setMobileSidebarOpen", () => {
    it("should set mobileSidebarOpen to true", () => {
      expect(useUIStore.getState().mobileSidebarOpen).toBe(false);

      useUIStore.getState().setMobileSidebarOpen(true);

      expect(useUIStore.getState().mobileSidebarOpen).toBe(true);
    });

    it("should set mobileSidebarOpen to false", () => {
      useUIStore.setState({ mobileSidebarOpen: true });

      useUIStore.getState().setMobileSidebarOpen(false);

      expect(useUIStore.getState().mobileSidebarOpen).toBe(false);
    });
  });

  describe("openModal", () => {
    it("should open modal with just modalId", () => {
      useUIStore.getState().openModal("confirm-delete");

      const state = useUIStore.getState();
      expect(state.activeModal).toBe("confirm-delete");
      expect(state.modalData).toBeNull();
    });

    it("should open modal with modalId and data", () => {
      const modalData = { id: "123", name: "Test Item" };

      useUIStore.getState().openModal("edit-item", modalData);

      const state = useUIStore.getState();
      expect(state.activeModal).toBe("edit-item");
      expect(state.modalData).toEqual(modalData);
    });

    it("should replace previous modal when opening new one", () => {
      useUIStore.getState().openModal("modal-1", { data: 1 });
      expect(useUIStore.getState().activeModal).toBe("modal-1");

      useUIStore.getState().openModal("modal-2", { data: 2 });

      const state = useUIStore.getState();
      expect(state.activeModal).toBe("modal-2");
      expect(state.modalData).toEqual({ data: 2 });
    });
  });

  describe("closeModal", () => {
    it("should close modal and clear modal data", () => {
      // First open a modal
      useUIStore.getState().openModal("test-modal", { some: "data" });
      expect(useUIStore.getState().activeModal).toBe("test-modal");

      // Then close it
      useUIStore.getState().closeModal();

      const state = useUIStore.getState();
      expect(state.activeModal).toBeNull();
      expect(state.modalData).toBeNull();
    });

    it("should be safe to call when no modal is open", () => {
      expect(useUIStore.getState().activeModal).toBeNull();

      // Should not throw
      useUIStore.getState().closeModal();

      expect(useUIStore.getState().activeModal).toBeNull();
      expect(useUIStore.getState().modalData).toBeNull();
    });
  });

  describe("setGlobalLoading", () => {
    it("should set globalLoading to true with default message", () => {
      useUIStore.getState().setGlobalLoading(true);

      const state = useUIStore.getState();
      expect(state.globalLoading).toBe(true);
      expect(state.loadingMessage).toBe("");
    });

    it("should set globalLoading to true with custom message", () => {
      useUIStore.getState().setGlobalLoading(true, "Processing payment...");

      const state = useUIStore.getState();
      expect(state.globalLoading).toBe(true);
      expect(state.loadingMessage).toBe("Processing payment...");
    });

    it("should set globalLoading to false and clear message", () => {
      // First set loading with message
      useUIStore.getState().setGlobalLoading(true, "Loading...");

      // Then turn off loading
      useUIStore.getState().setGlobalLoading(false);

      const state = useUIStore.getState();
      expect(state.globalLoading).toBe(false);
      expect(state.loadingMessage).toBe("");
    });

    it("should update message while loading", () => {
      useUIStore.getState().setGlobalLoading(true, "Step 1...");
      expect(useUIStore.getState().loadingMessage).toBe("Step 1...");

      useUIStore.getState().setGlobalLoading(true, "Step 2...");
      expect(useUIStore.getState().loadingMessage).toBe("Step 2...");
    });
  });

  describe("combined operations", () => {
    it("should allow independent sidebar and modal operations", () => {
      const store = useUIStore.getState();

      store.toggleSidebar();
      store.openModal("test-modal", { id: 1 });

      const state = useUIStore.getState();
      expect(state.sidebarOpen).toBe(false);
      expect(state.activeModal).toBe("test-modal");
    });

    it("should allow loading state while modal is open", () => {
      useUIStore.getState().openModal("form-modal");
      useUIStore.getState().setGlobalLoading(true, "Saving...");

      const state = useUIStore.getState();
      expect(state.activeModal).toBe("form-modal");
      expect(state.globalLoading).toBe(true);
      expect(state.loadingMessage).toBe("Saving...");
    });
  });
});
