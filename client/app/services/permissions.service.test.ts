import { describe, it, expect, vi, beforeEach } from "vitest";
import { permissionsService } from "./permissions.service";
import { api } from "~/lib/api";

// Mock the api module
vi.mock("~/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("permissionsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getMyPermissions", () => {
    it("should fetch current user permissions", async () => {
      const mockResponse = {
        data: {
          permissions: ["pos:sell", "inventory:view"],
          role: "EMPLOYEE",
        },
      };
      vi.mocked(api.get).mockResolvedValue(mockResponse);

      const result = await permissionsService.getMyPermissions();

      expect(api.get).toHaveBeenCalledWith("/users/me/permissions");
      expect(result).toEqual(mockResponse.data);
    });

    it("should propagate errors", async () => {
      const error = new Error("Network error");
      vi.mocked(api.get).mockRejectedValue(error);

      await expect(permissionsService.getMyPermissions()).rejects.toThrow(
        "Network error"
      );
    });
  });

  describe("getUserPermissions", () => {
    it("should fetch specific user permissions", async () => {
      const mockResponse = {
        data: {
          permissions: ["pos:sell", "pos:refund"],
          role: "MANAGER",
        },
      };
      vi.mocked(api.get).mockResolvedValue(mockResponse);

      const result = await permissionsService.getUserPermissions("user-123");

      expect(api.get).toHaveBeenCalledWith("/users/user-123/permissions");
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe("grantPermission", () => {
    it("should grant permission without reason", async () => {
      const mockResponse = {
        data: {
          id: "override-1",
          userId: "user-123",
          permission: "pos:refund",
          granted: true,
          grantedBy: "admin-1",
          reason: null,
          createdAt: "2024-01-15T10:00:00Z",
        },
      };
      vi.mocked(api.post).mockResolvedValue(mockResponse);

      const result = await permissionsService.grantPermission("user-123", {
        permission: "pos:refund",
      });

      expect(api.post).toHaveBeenCalledWith(
        "/users/user-123/permissions/grant",
        { permission: "pos:refund" }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it("should grant permission with reason", async () => {
      const mockResponse = {
        data: {
          id: "override-1",
          userId: "user-123",
          permission: "pos:refund",
          granted: true,
          grantedBy: "admin-1",
          reason: "Promoted to senior cashier",
          createdAt: "2024-01-15T10:00:00Z",
        },
      };
      vi.mocked(api.post).mockResolvedValue(mockResponse);

      const result = await permissionsService.grantPermission("user-123", {
        permission: "pos:refund",
        reason: "Promoted to senior cashier",
      });

      expect(api.post).toHaveBeenCalledWith(
        "/users/user-123/permissions/grant",
        {
          permission: "pos:refund",
          reason: "Promoted to senior cashier",
        }
      );
      expect(result.reason).toBe("Promoted to senior cashier");
    });
  });

  describe("revokePermission", () => {
    it("should revoke permission without reason", async () => {
      const mockResponse = {
        data: {
          id: "override-2",
          userId: "user-123",
          permission: "pos:discount",
          granted: false,
          grantedBy: "admin-1",
          reason: null,
          createdAt: "2024-01-15T10:00:00Z",
        },
      };
      vi.mocked(api.post).mockResolvedValue(mockResponse);

      const result = await permissionsService.revokePermission("user-123", {
        permission: "pos:discount",
      });

      expect(api.post).toHaveBeenCalledWith(
        "/users/user-123/permissions/revoke",
        { permission: "pos:discount" }
      );
      expect(result.granted).toBe(false);
    });

    it("should revoke permission with reason", async () => {
      const mockResponse = {
        data: {
          id: "override-2",
          userId: "user-123",
          permission: "pos:discount",
          granted: false,
          grantedBy: "admin-1",
          reason: "Abuse of discount",
          createdAt: "2024-01-15T10:00:00Z",
        },
      };
      vi.mocked(api.post).mockResolvedValue(mockResponse);

      const result = await permissionsService.revokePermission("user-123", {
        permission: "pos:discount",
        reason: "Abuse of discount",
      });

      expect(result.reason).toBe("Abuse of discount");
    });
  });

  describe("removeOverride", () => {
    it("should remove permission override", async () => {
      const mockResponse = {
        data: { message: "Permission override removed" },
      };
      vi.mocked(api.delete).mockResolvedValue(mockResponse);

      const result = await permissionsService.removeOverride(
        "user-123",
        "pos:refund"
      );

      expect(api.delete).toHaveBeenCalledWith(
        "/users/user-123/permissions/pos%3Arefund"
      );
      expect(result.message).toBe("Permission override removed");
    });

    it("should properly encode permission with special characters", async () => {
      const mockResponse = {
        data: { message: "Permission override removed" },
      };
      vi.mocked(api.delete).mockResolvedValue(mockResponse);

      await permissionsService.removeOverride("user-123", "inventory:view");

      expect(api.delete).toHaveBeenCalledWith(
        "/users/user-123/permissions/inventory%3Aview"
      );
    });
  });

  describe("removeAllOverrides", () => {
    it("should remove all permission overrides for user", async () => {
      const mockResponse = {
        data: { message: "All permission overrides removed" },
      };
      vi.mocked(api.delete).mockResolvedValue(mockResponse);

      const result = await permissionsService.removeAllOverrides("user-123");

      expect(api.delete).toHaveBeenCalledWith("/users/user-123/permissions");
      expect(result.message).toBe("All permission overrides removed");
    });

    it("should propagate errors", async () => {
      const error = new Error("Forbidden");
      vi.mocked(api.delete).mockRejectedValue(error);

      await expect(
        permissionsService.removeAllOverrides("user-123")
      ).rejects.toThrow("Forbidden");
    });
  });
});
