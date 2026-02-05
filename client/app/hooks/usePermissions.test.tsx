import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePermissions } from "./usePermissions";
import { useAuthStore } from "~/stores/auth.store";
import { Permission, DEFAULT_ROLE_PERMISSIONS } from "~/types/permissions";

// Mock the auth store
vi.mock("~/stores/auth.store", () => ({
  useAuthStore: vi.fn(),
}));

describe("usePermissions", () => {
  const mockEmployee = {
    id: "user-1",
    email: "employee@test.com",
    firstName: "John",
    lastName: "Doe",
    role: "EMPLOYEE" as const,
    permissions: null as string[] | null,
  };

  const mockManager = {
    ...mockEmployee,
    id: "user-2",
    email: "manager@test.com",
    role: "MANAGER" as const,
  };

  const mockAdmin = {
    ...mockEmployee,
    id: "user-3",
    email: "admin@test.com",
    role: "ADMIN" as const,
  };

  const mockSuperAdmin = {
    ...mockEmployee,
    id: "user-4",
    email: "superadmin@test.com",
    role: "SUPER_ADMIN" as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockAuthStore(user: typeof mockEmployee | null) {
    vi.mocked(useAuthStore).mockReturnValue({ user });
  }

  describe("when user is not authenticated", () => {
    it("should return empty permissions", () => {
      mockAuthStore(null);

      const { result } = renderHook(() => usePermissions());

      expect(result.current.permissions.size).toBe(0);
      expect(result.current.isAuthenticated).toBe(false);
    });

    it("should return false for hasPermission", () => {
      mockAuthStore(null);

      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasPermission(Permission.POS_SELL)).toBe(false);
    });

    it("should return false for hasAnyPermission", () => {
      mockAuthStore(null);

      const { result } = renderHook(() => usePermissions());

      expect(
        result.current.hasAnyPermission(Permission.POS_SELL, Permission.POS_REFUND)
      ).toBe(false);
    });

    it("should return false for hasAllPermissions", () => {
      mockAuthStore(null);

      const { result } = renderHook(() => usePermissions());

      expect(
        result.current.hasAllPermissions(Permission.POS_SELL, Permission.POS_REFUND)
      ).toBe(false);
    });
  });

  describe("when user is SUPER_ADMIN", () => {
    it("should have all permissions", () => {
      mockAuthStore(mockSuperAdmin);

      const { result } = renderHook(() => usePermissions());

      expect(result.current.permissions.size).toBe(Object.values(Permission).length);
    });

    it("should return true for any hasPermission check", () => {
      mockAuthStore(mockSuperAdmin);

      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasPermission(Permission.POS_SELL)).toBe(true);
      expect(result.current.hasPermission(Permission.USERS_MANAGE)).toBe(true);
      expect(result.current.hasPermission(Permission.SETTINGS_MANAGE)).toBe(true);
    });

    it("should return true for hasAnyPermission", () => {
      mockAuthStore(mockSuperAdmin);

      const { result } = renderHook(() => usePermissions());

      expect(
        result.current.hasAnyPermission(Permission.POS_SELL, Permission.USERS_MANAGE)
      ).toBe(true);
    });

    it("should return true for hasAllPermissions", () => {
      mockAuthStore(mockSuperAdmin);

      const { result } = renderHook(() => usePermissions());

      expect(
        result.current.hasAllPermissions(
          Permission.POS_SELL,
          Permission.USERS_MANAGE,
          Permission.SETTINGS_MANAGE
        )
      ).toBe(true);
    });
  });

  describe("when user is EMPLOYEE (using role defaults)", () => {
    it("should have only EMPLOYEE default permissions", () => {
      mockAuthStore(mockEmployee);

      const { result } = renderHook(() => usePermissions());

      const expectedPerms = DEFAULT_ROLE_PERMISSIONS.EMPLOYEE;
      expect(result.current.permissions.size).toBe(expectedPerms.length);
    });

    it("should have POS_SELL permission", () => {
      mockAuthStore(mockEmployee);

      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasPermission(Permission.POS_SELL)).toBe(true);
      expect(result.current.canSell).toBe(true);
    });

    it("should NOT have POS_REFUND permission", () => {
      mockAuthStore(mockEmployee);

      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasPermission(Permission.POS_REFUND)).toBe(false);
      expect(result.current.canRefund).toBe(false);
    });

    it("should NOT have USERS_MANAGE permission", () => {
      mockAuthStore(mockEmployee);

      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasPermission(Permission.USERS_MANAGE)).toBe(false);
      expect(result.current.canManageUsers).toBe(false);
    });
  });

  describe("when user is MANAGER (using role defaults)", () => {
    it("should have MANAGER default permissions", () => {
      mockAuthStore(mockManager);

      const { result } = renderHook(() => usePermissions());

      const expectedPerms = DEFAULT_ROLE_PERMISSIONS.MANAGER;
      expect(result.current.permissions.size).toBe(expectedPerms.length);
    });

    it("should have POS_REFUND permission", () => {
      mockAuthStore(mockManager);

      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasPermission(Permission.POS_REFUND)).toBe(true);
      expect(result.current.canRefund).toBe(true);
    });

    it("should have USERS_VIEW permission", () => {
      mockAuthStore(mockManager);

      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasPermission(Permission.USERS_VIEW)).toBe(true);
      expect(result.current.canViewUsers).toBe(true);
    });

    it("should NOT have USERS_MANAGE permission", () => {
      mockAuthStore(mockManager);

      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasPermission(Permission.USERS_MANAGE)).toBe(false);
      expect(result.current.canManageUsers).toBe(false);
    });
  });

  describe("when user is ADMIN (using role defaults)", () => {
    it("should have ADMIN default permissions", () => {
      mockAuthStore(mockAdmin);

      const { result } = renderHook(() => usePermissions());

      const expectedPerms = DEFAULT_ROLE_PERMISSIONS.ADMIN;
      expect(result.current.permissions.size).toBe(expectedPerms.length);
    });

    it("should have USERS_MANAGE permission", () => {
      mockAuthStore(mockAdmin);

      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasPermission(Permission.USERS_MANAGE)).toBe(true);
      expect(result.current.canManageUsers).toBe(true);
    });

    it("should have SETTINGS_MANAGE permission", () => {
      mockAuthStore(mockAdmin);

      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasPermission(Permission.SETTINGS_MANAGE)).toBe(true);
      expect(result.current.canManageSettings).toBe(true);
    });
  });

  describe("when user has server-loaded permissions", () => {
    it("should use server permissions instead of role defaults", () => {
      const userWithPerms = {
        ...mockEmployee,
        permissions: [Permission.POS_SELL, Permission.POS_REFUND], // EMPLOYEE doesn't normally have REFUND
      };
      mockAuthStore(userWithPerms);

      const { result } = renderHook(() => usePermissions());

      expect(result.current.permissions.size).toBe(2);
      expect(result.current.hasPermission(Permission.POS_REFUND)).toBe(true);
    });

    it("should respect revoked permissions", () => {
      const userWithPerms = {
        ...mockEmployee,
        permissions: [Permission.INVENTORY_VIEW], // Only inventory, no POS
      };
      mockAuthStore(userWithPerms);

      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasPermission(Permission.POS_SELL)).toBe(false);
      expect(result.current.canSell).toBe(false);
    });
  });

  describe("hasAnyPermission", () => {
    it("should return true if user has at least one permission", () => {
      mockAuthStore(mockEmployee);

      const { result } = renderHook(() => usePermissions());

      // EMPLOYEE has POS_SELL but not POS_REFUND
      expect(
        result.current.hasAnyPermission(Permission.POS_SELL, Permission.POS_REFUND)
      ).toBe(true);
    });

    it("should return false if user has none of the permissions", () => {
      mockAuthStore(mockEmployee);

      const { result } = renderHook(() => usePermissions());

      // EMPLOYEE has neither USERS_MANAGE nor SETTINGS_MANAGE
      expect(
        result.current.hasAnyPermission(
          Permission.USERS_MANAGE,
          Permission.SETTINGS_MANAGE
        )
      ).toBe(false);
    });
  });

  describe("hasAllPermissions", () => {
    it("should return true if user has all permissions", () => {
      mockAuthStore(mockAdmin);

      const { result } = renderHook(() => usePermissions());

      // ADMIN has both USERS_VIEW and USERS_MANAGE
      expect(
        result.current.hasAllPermissions(
          Permission.USERS_VIEW,
          Permission.USERS_MANAGE
        )
      ).toBe(true);
    });

    it("should return false if user is missing any permission", () => {
      mockAuthStore(mockManager);

      const { result } = renderHook(() => usePermissions());

      // MANAGER has USERS_VIEW but not USERS_MANAGE
      expect(
        result.current.hasAllPermissions(
          Permission.USERS_VIEW,
          Permission.USERS_MANAGE
        )
      ).toBe(false);
    });
  });

  describe("convenience checks", () => {
    it("should have correct values for EMPLOYEE", () => {
      mockAuthStore(mockEmployee);

      const { result } = renderHook(() => usePermissions());

      expect(result.current.canSell).toBe(true);
      expect(result.current.canRefund).toBe(false);
      expect(result.current.canDiscount).toBe(false);
      expect(result.current.canViewInventory).toBe(true);
      expect(result.current.canAdjustInventory).toBe(false);
      expect(result.current.canViewProducts).toBe(true);
      expect(result.current.canCreateProducts).toBe(false);
      expect(result.current.canManageUsers).toBe(false);
    });

    it("should have correct values for MANAGER", () => {
      mockAuthStore(mockManager);

      const { result } = renderHook(() => usePermissions());

      expect(result.current.canSell).toBe(true);
      expect(result.current.canRefund).toBe(true);
      expect(result.current.canDiscount).toBe(true);
      expect(result.current.canAdjustInventory).toBe(true);
      expect(result.current.canCreateProducts).toBe(true);
      expect(result.current.canViewUsers).toBe(true);
      expect(result.current.canManageUsers).toBe(false);
    });

    it("should have correct values for ADMIN", () => {
      mockAuthStore(mockAdmin);

      const { result } = renderHook(() => usePermissions());

      expect(result.current.canManageUsers).toBe(true);
      expect(result.current.canInviteUsers).toBe(true);
      expect(result.current.canManageSettings).toBe(true);
      expect(result.current.canExportReports).toBe(true);
      expect(result.current.canCancelInvoices).toBe(true);
    });
  });

  describe("role and isAuthenticated", () => {
    it("should return correct role for authenticated user", () => {
      mockAuthStore(mockManager);

      const { result } = renderHook(() => usePermissions());

      expect(result.current.role).toBe("MANAGER");
      expect(result.current.isAuthenticated).toBe(true);
    });

    it("should return undefined role for unauthenticated user", () => {
      mockAuthStore(null);

      const { result } = renderHook(() => usePermissions());

      expect(result.current.role).toBeUndefined();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });
});
