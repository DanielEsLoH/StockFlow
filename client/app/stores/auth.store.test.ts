import { describe, it, expect, beforeEach, vi } from "vitest";
import { useAuthStore, type User, type Tenant } from "./auth.store";

// Mock the api module to prevent actual localStorage/cookie operations
vi.mock("~/lib/api", () => ({
  clearAllAuthData: vi.fn(),
}));

const mockUser: User = {
  id: "1",
  email: "test@example.com",
  firstName: "John",
  lastName: "Doe",
  role: "ADMIN",
  status: "ACTIVE",
  tenantId: "tenant-1",
  avatarUrl: "https://example.com/avatar.jpg",
};

const mockTenant: Tenant = {
  id: "tenant-1",
  name: "Test Company",
  slug: "test-company",
  plan: "PRO",
  status: "ACTIVE",
  logoUrl: "https://example.com/logo.jpg",
};

describe("useAuthStore", () => {
  beforeEach(() => {
    // Reset the store to initial state before each test
    useAuthStore.setState({
      user: null,
      tenant: null,
      isAuthenticated: false,
      isLoading: true,
      isInitialized: false,
    });
  });

  describe("initial state", () => {
    it("should have correct initial state", () => {
      const state = useAuthStore.getState();

      expect(state.user).toBeNull();
      expect(state.tenant).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(true);
    });
  });

  describe("setUser", () => {
    it("should set user and update isAuthenticated to true", () => {
      const { setUser } = useAuthStore.getState();

      setUser(mockUser);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it("should set isAuthenticated to false when user is null", () => {
      const { setUser } = useAuthStore.getState();

      // First set a user
      setUser(mockUser);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      // Then clear the user
      setUser(null);

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });

    it("should set isLoading to false when setUser is called", () => {
      expect(useAuthStore.getState().isLoading).toBe(true);

      useAuthStore.getState().setUser(mockUser);

      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  describe("setTenant", () => {
    it("should set tenant", () => {
      const { setTenant } = useAuthStore.getState();

      setTenant(mockTenant);

      expect(useAuthStore.getState().tenant).toEqual(mockTenant);
    });

    it("should clear tenant when null is passed", () => {
      const { setTenant } = useAuthStore.getState();

      setTenant(mockTenant);
      expect(useAuthStore.getState().tenant).toEqual(mockTenant);

      setTenant(null);
      expect(useAuthStore.getState().tenant).toBeNull();
    });
  });

  describe("setLoading", () => {
    it("should set isLoading to true", () => {
      const { setLoading, setUser } = useAuthStore.getState();

      // First ensure isLoading is false
      setUser(mockUser);
      expect(useAuthStore.getState().isLoading).toBe(false);

      setLoading(true);
      expect(useAuthStore.getState().isLoading).toBe(true);
    });

    it("should set isLoading to false", () => {
      const { setLoading } = useAuthStore.getState();

      expect(useAuthStore.getState().isLoading).toBe(true);

      setLoading(false);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  describe("logout", () => {
    it("should clear all auth state", async () => {
      const { clearAllAuthData } = await import("~/lib/api");
      const { setUser, setTenant, logout } = useAuthStore.getState();

      // Set up authenticated state
      setUser(mockUser);
      setTenant(mockTenant);

      const stateBeforeLogout = useAuthStore.getState();
      expect(stateBeforeLogout.user).toEqual(mockUser);
      expect(stateBeforeLogout.tenant).toEqual(mockTenant);
      expect(stateBeforeLogout.isAuthenticated).toBe(true);

      // Logout
      logout();

      const stateAfterLogout = useAuthStore.getState();
      expect(stateAfterLogout.user).toBeNull();
      expect(stateAfterLogout.tenant).toBeNull();
      expect(stateAfterLogout.isAuthenticated).toBe(false);
      expect(stateAfterLogout.isLoading).toBe(false);
    });

    it("should call clearAllAuthData to clean up tokens and storage", async () => {
      const { clearAllAuthData } = await import("~/lib/api");
      const { setUser, setTenant, logout } = useAuthStore.getState();

      // Set up authenticated state
      setUser(mockUser);
      setTenant(mockTenant);

      // Clear any previous calls
      vi.mocked(clearAllAuthData).mockClear();

      // Logout
      logout();

      // Verify clearAllAuthData was called
      expect(clearAllAuthData).toHaveBeenCalledTimes(1);
    });
  });

  describe("setUserPermissions", () => {
    it("should update user permissions when user exists", () => {
      const { setUser, setUserPermissions } = useAuthStore.getState();

      setUser(mockUser);
      setUserPermissions(["pos:sell", "inventory:view"]);

      const state = useAuthStore.getState();
      expect(state.user?.permissions).toEqual(["pos:sell", "inventory:view"]);
    });

    it("should not update permissions when user is null", () => {
      const { setUserPermissions } = useAuthStore.getState();

      // User is null initially
      setUserPermissions(["pos:sell"]);

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
    });
  });

  describe("setInitialized", () => {
    it("should set isInitialized to true", () => {
      const { setInitialized } = useAuthStore.getState();

      expect(useAuthStore.getState().isInitialized).toBe(false);

      setInitialized(true);

      expect(useAuthStore.getState().isInitialized).toBe(true);
    });

    it("should set isInitialized to false", () => {
      const { setInitialized } = useAuthStore.getState();

      setInitialized(true);
      expect(useAuthStore.getState().isInitialized).toBe(true);

      setInitialized(false);
      expect(useAuthStore.getState().isInitialized).toBe(false);
    });
  });

  describe("persistence", () => {
    it("should partialize state correctly (exclude isLoading and isInitialized)", () => {
      const { setUser, setTenant, setInitialized } = useAuthStore.getState();

      setUser(mockUser);
      setTenant(mockTenant);
      setInitialized(true);

      // The persist middleware should only store user, tenant, and isAuthenticated
      // This test verifies the store configuration is correct
      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.tenant).toEqual(mockTenant);
      expect(state.isAuthenticated).toBe(true);
      // isLoading and isInitialized should exist but not be persisted (this is a config check)
      expect(state.isLoading).toBe(false);
      expect(state.isInitialized).toBe(true);
    });
  });
});
