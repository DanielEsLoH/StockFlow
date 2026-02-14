import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsService } from './permissions.service';
import { PrismaService } from '../../prisma';
import { Permission } from './permission.enum';
import { DEFAULT_ROLE_PERMISSIONS } from './role-permissions';
import { UserRole } from '@prisma/client';

describe('PermissionsService', () => {
  let service: PermissionsService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-123';
  const mockAdminId = 'admin-123';

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockPrismaService = {
      userPermissionOverride: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockPrismaService)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PermissionsService>(PermissionsService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    // Clear the cache after each test
    service.clearCache();
  });

  describe('getUserPermissions', () => {
    it('should return all permissions for SUPER_ADMIN', async () => {
      const result = await service.getUserPermissions(
        mockUserId,
        UserRole.SUPER_ADMIN,
        mockTenantId,
      );

      expect(result).toEqual(Object.values(Permission));
      // Should not query database for SUPER_ADMIN
      expect(prismaService.userPermissionOverride.findMany).not.toHaveBeenCalled();
    });

    it('should return default role permissions for EMPLOYEE without overrides', async () => {
      prismaService.userPermissionOverride.findMany = jest.fn().mockResolvedValue([]);

      const result = await service.getUserPermissions(
        mockUserId,
        UserRole.EMPLOYEE,
        mockTenantId,
      );

      expect(result).toEqual(expect.arrayContaining(DEFAULT_ROLE_PERMISSIONS[UserRole.EMPLOYEE]));
      expect(result.length).toBe(DEFAULT_ROLE_PERMISSIONS[UserRole.EMPLOYEE].length);
    });

    it('should include granted permission overrides', async () => {
      prismaService.userPermissionOverride.findMany = jest.fn().mockResolvedValue([
        { permission: Permission.POS_REFUND, granted: true },
      ]);

      const result = await service.getUserPermissions(
        mockUserId,
        UserRole.EMPLOYEE,
        mockTenantId,
      );

      expect(result).toContain(Permission.POS_REFUND);
    });

    it('should exclude revoked permission overrides', async () => {
      prismaService.userPermissionOverride.findMany = jest.fn().mockResolvedValue([
        { permission: Permission.POS_SELL, granted: false },
      ]);

      const result = await service.getUserPermissions(
        mockUserId,
        UserRole.EMPLOYEE,
        mockTenantId,
      );

      // POS_SELL is normally in EMPLOYEE defaults, but should be removed
      expect(result).not.toContain(Permission.POS_SELL);
    });

    it('should cache permissions', async () => {
      prismaService.userPermissionOverride.findMany = jest.fn().mockResolvedValue([]);

      // First call
      await service.getUserPermissions(mockUserId, UserRole.EMPLOYEE, mockTenantId);
      // Second call should use cache
      await service.getUserPermissions(mockUserId, UserRole.EMPLOYEE, mockTenantId);

      // Should only have called the database once
      expect(prismaService.userPermissionOverride.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('hasPermission', () => {
    it('should return true when user has permission from role default', async () => {
      prismaService.userPermissionOverride.findMany = jest.fn().mockResolvedValue([]);

      const result = await service.hasPermission(
        mockUserId,
        UserRole.EMPLOYEE,
        mockTenantId,
        Permission.POS_SELL,
      );

      expect(result).toBe(true);
    });

    it('should return false when user does not have permission', async () => {
      prismaService.userPermissionOverride.findMany = jest.fn().mockResolvedValue([]);

      const result = await service.hasPermission(
        mockUserId,
        UserRole.EMPLOYEE,
        mockTenantId,
        Permission.POS_REFUND, // EMPLOYEE doesn't have this by default
      );

      expect(result).toBe(false);
    });

    it('should return true for SUPER_ADMIN regardless of permission', async () => {
      const result = await service.hasPermission(
        mockUserId,
        UserRole.SUPER_ADMIN,
        mockTenantId,
        Permission.USERS_MANAGE,
      );

      expect(result).toBe(true);
      expect(prismaService.userPermissionOverride.findMany).not.toHaveBeenCalled();
    });

    it('should return true when permission is granted via override', async () => {
      prismaService.userPermissionOverride.findMany = jest.fn().mockResolvedValue([
        { permission: Permission.POS_REFUND, granted: true },
      ]);

      const result = await service.hasPermission(
        mockUserId,
        UserRole.EMPLOYEE,
        mockTenantId,
        Permission.POS_REFUND,
      );

      expect(result).toBe(true);
    });

    it('should return false when permission is revoked via override', async () => {
      prismaService.userPermissionOverride.findMany = jest.fn().mockResolvedValue([
        { permission: Permission.POS_SELL, granted: false },
      ]);

      const result = await service.hasPermission(
        mockUserId,
        UserRole.EMPLOYEE,
        mockTenantId,
        Permission.POS_SELL,
      );

      expect(result).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true when user has all permissions', async () => {
      prismaService.userPermissionOverride.findMany = jest.fn().mockResolvedValue([]);

      const result = await service.hasAllPermissions(
        mockUserId,
        UserRole.MANAGER,
        mockTenantId,
        [Permission.POS_SELL, Permission.INVENTORY_VIEW], // Both in MANAGER defaults
      );

      expect(result).toBe(true);
    });

    it('should return false when user lacks any permission', async () => {
      prismaService.userPermissionOverride.findMany = jest.fn().mockResolvedValue([]);

      const result = await service.hasAllPermissions(
        mockUserId,
        UserRole.EMPLOYEE,
        mockTenantId,
        [Permission.POS_SELL, Permission.POS_REFUND], // EMPLOYEE has SELL but not REFUND
      );

      expect(result).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true when user has at least one permission', async () => {
      prismaService.userPermissionOverride.findMany = jest.fn().mockResolvedValue([]);

      const result = await service.hasAnyPermission(
        mockUserId,
        UserRole.EMPLOYEE,
        mockTenantId,
        [Permission.POS_SELL, Permission.POS_REFUND], // EMPLOYEE has SELL
      );

      expect(result).toBe(true);
    });

    it('should return false when user has none of the permissions', async () => {
      prismaService.userPermissionOverride.findMany = jest.fn().mockResolvedValue([]);

      const result = await service.hasAnyPermission(
        mockUserId,
        UserRole.EMPLOYEE,
        mockTenantId,
        [Permission.POS_REFUND, Permission.USERS_MANAGE], // EMPLOYEE has neither
      );

      expect(result).toBe(false);
    });
  });

  describe('grantPermission', () => {
    it('should create a grant override', async () => {
      prismaService.userPermissionOverride.upsert = jest.fn().mockResolvedValue({});

      await service.grantPermission(
        mockUserId,
        mockTenantId,
        Permission.POS_REFUND,
        mockAdminId,
        'Promotion',
      );

      expect(prismaService.userPermissionOverride.upsert).toHaveBeenCalledWith({
        where: {
          userId_permission: {
            userId: mockUserId,
            permission: Permission.POS_REFUND,
          },
        },
        create: {
          userId: mockUserId,
          tenantId: mockTenantId,
          permission: Permission.POS_REFUND,
          granted: true,
          grantedBy: mockAdminId,
          reason: 'Promotion',
        },
        update: {
          granted: true,
          grantedBy: mockAdminId,
          reason: 'Promotion',
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should clear cache after granting permission', async () => {
      prismaService.userPermissionOverride.findMany = jest.fn().mockResolvedValue([]);
      prismaService.userPermissionOverride.upsert = jest.fn().mockResolvedValue({});

      // Prime the cache
      await service.getUserPermissions(mockUserId, UserRole.EMPLOYEE, mockTenantId);

      // Grant permission (clears cache)
      await service.grantPermission(
        mockUserId,
        mockTenantId,
        Permission.POS_REFUND,
        mockAdminId,
      );

      // Next call should hit the database again
      await service.getUserPermissions(mockUserId, UserRole.EMPLOYEE, mockTenantId);

      expect(prismaService.userPermissionOverride.findMany).toHaveBeenCalledTimes(2);
    });
  });

  describe('revokePermission', () => {
    it('should create a revoke override', async () => {
      prismaService.userPermissionOverride.upsert = jest.fn().mockResolvedValue({});

      await service.revokePermission(
        mockUserId,
        mockTenantId,
        Permission.POS_SELL,
        mockAdminId,
        'Security concern',
      );

      expect(prismaService.userPermissionOverride.upsert).toHaveBeenCalledWith({
        where: {
          userId_permission: {
            userId: mockUserId,
            permission: Permission.POS_SELL,
          },
        },
        create: {
          userId: mockUserId,
          tenantId: mockTenantId,
          permission: Permission.POS_SELL,
          granted: false,
          grantedBy: mockAdminId,
          reason: 'Security concern',
        },
        update: {
          granted: false,
          grantedBy: mockAdminId,
          reason: 'Security concern',
          updatedAt: expect.any(Date),
        },
      });
    });
  });

  describe('removeOverride', () => {
    it('should delete a permission override', async () => {
      prismaService.userPermissionOverride.deleteMany = jest.fn().mockResolvedValue({ count: 1 });

      await service.removeOverride(mockUserId, mockTenantId, Permission.POS_REFUND);

      expect(prismaService.userPermissionOverride.deleteMany).toHaveBeenCalledWith({
        where: { userId: mockUserId, permission: Permission.POS_REFUND },
      });
    });

    it('should clear cache after removing override', async () => {
      prismaService.userPermissionOverride.findMany = jest.fn().mockResolvedValue([]);
      prismaService.userPermissionOverride.deleteMany = jest.fn().mockResolvedValue({ count: 1 });

      // Prime the cache
      await service.getUserPermissions(mockUserId, UserRole.EMPLOYEE, mockTenantId);

      // Remove override (clears cache)
      await service.removeOverride(mockUserId, mockTenantId, Permission.POS_REFUND);

      // Next call should hit the database again
      await service.getUserPermissions(mockUserId, UserRole.EMPLOYEE, mockTenantId);

      expect(prismaService.userPermissionOverride.findMany).toHaveBeenCalledTimes(2);
    });
  });

  describe('removeAllOverrides', () => {
    it('should delete all permission overrides for a user', async () => {
      prismaService.userPermissionOverride.deleteMany = jest.fn().mockResolvedValue({ count: 5 });

      await service.removeAllOverrides(mockUserId, mockTenantId);

      expect(prismaService.userPermissionOverride.deleteMany).toHaveBeenCalledWith({
        where: { userId: mockUserId, tenantId: mockTenantId },
      });
    });
  });

  describe('setPermissionOverrides', () => {
    it('should upsert multiple overrides in a transaction', async () => {
      const overrides = [
        { permission: Permission.POS_REFUND, granted: true, reason: 'Promotion' },
        { permission: Permission.POS_SELL, granted: false, reason: 'Security' },
      ];

      await service.setPermissionOverrides(
        mockUserId,
        mockTenantId,
        overrides,
        mockAdminId,
      );

      expect(prismaService.$transaction).toHaveBeenCalled();
      // The transaction callback receives the mock prisma service and should call upsert for each override
      expect(prismaService.userPermissionOverride.upsert).toHaveBeenCalledTimes(2);

      expect(prismaService.userPermissionOverride.upsert).toHaveBeenCalledWith({
        where: {
          userId_permission: {
            userId: mockUserId,
            permission: Permission.POS_REFUND,
          },
        },
        create: {
          userId: mockUserId,
          tenantId: mockTenantId,
          permission: Permission.POS_REFUND,
          granted: true,
          grantedBy: mockAdminId,
          reason: 'Promotion',
        },
        update: {
          granted: true,
          grantedBy: mockAdminId,
          reason: 'Promotion',
          updatedAt: expect.any(Date),
        },
      });

      expect(prismaService.userPermissionOverride.upsert).toHaveBeenCalledWith({
        where: {
          userId_permission: {
            userId: mockUserId,
            permission: Permission.POS_SELL,
          },
        },
        create: {
          userId: mockUserId,
          tenantId: mockTenantId,
          permission: Permission.POS_SELL,
          granted: false,
          grantedBy: mockAdminId,
          reason: 'Security',
        },
        update: {
          granted: false,
          grantedBy: mockAdminId,
          reason: 'Security',
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should invalidate cache after setting overrides', async () => {
      prismaService.userPermissionOverride.findMany = jest.fn().mockResolvedValue([]);

      // Prime the cache
      await service.getUserPermissions(mockUserId, UserRole.EMPLOYEE, mockTenantId);

      // Set overrides (clears cache)
      await service.setPermissionOverrides(
        mockUserId,
        mockTenantId,
        [{ permission: Permission.POS_REFUND, granted: true }],
        mockAdminId,
      );

      // Next call should hit the database again
      await service.getUserPermissions(mockUserId, UserRole.EMPLOYEE, mockTenantId);

      expect(prismaService.userPermissionOverride.findMany).toHaveBeenCalledTimes(2);
    });

    it('should handle empty overrides array', async () => {
      await service.setPermissionOverrides(
        mockUserId,
        mockTenantId,
        [],
        mockAdminId,
      );

      expect(prismaService.$transaction).toHaveBeenCalled();
      expect(prismaService.userPermissionOverride.upsert).not.toHaveBeenCalled();
    });
  });

  describe('getPermissionOverrides', () => {
    it('should return all permission overrides for a user', async () => {
      const mockOverrides = [
        {
          permission: Permission.POS_REFUND,
          granted: true,
          grantedBy: mockAdminId,
          reason: 'Promotion',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
        {
          permission: Permission.POS_SELL,
          granted: false,
          grantedBy: mockAdminId,
          reason: 'Security concern',
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-02'),
        },
      ];
      prismaService.userPermissionOverride.findMany = jest.fn().mockResolvedValue(mockOverrides);

      const result = await service.getPermissionOverrides(mockUserId, mockTenantId);

      expect(result).toEqual(mockOverrides);
      expect(prismaService.userPermissionOverride.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId, tenantId: mockTenantId },
        select: {
          permission: true,
          granted: true,
          grantedBy: true,
          reason: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it('should return empty array when no overrides exist', async () => {
      prismaService.userPermissionOverride.findMany = jest.fn().mockResolvedValue([]);

      const result = await service.getPermissionOverrides(mockUserId, mockTenantId);

      expect(result).toEqual([]);
    });
  });

  describe('clearCache', () => {
    it('should clear the entire cache', async () => {
      prismaService.userPermissionOverride.findMany = jest.fn().mockResolvedValue([]);

      // Prime the cache for multiple users
      await service.getUserPermissions(mockUserId, UserRole.EMPLOYEE, mockTenantId);
      await service.getUserPermissions(mockAdminId, UserRole.ADMIN, mockTenantId);

      expect(prismaService.userPermissionOverride.findMany).toHaveBeenCalledTimes(2);

      // Clear entire cache
      service.clearCache();

      // Next calls should hit the database again
      await service.getUserPermissions(mockUserId, UserRole.EMPLOYEE, mockTenantId);
      await service.getUserPermissions(mockAdminId, UserRole.ADMIN, mockTenantId);

      expect(prismaService.userPermissionOverride.findMany).toHaveBeenCalledTimes(4);
    });
  });

  describe('getUserPermissionsDetail', () => {
    it('should return detailed permissions info', async () => {
      prismaService.userPermissionOverride.findMany = jest.fn().mockResolvedValue([
        { permission: Permission.POS_REFUND, granted: true },
        { permission: Permission.POS_SELL, granted: false },
      ]);

      const result = await service.getUserPermissionsDetail(
        mockUserId,
        UserRole.EMPLOYEE,
        mockTenantId,
      );

      expect(result.role).toBe(UserRole.EMPLOYEE);
      expect(result.overrides.granted).toContain(Permission.POS_REFUND);
      expect(result.overrides.revoked).toContain(Permission.POS_SELL);
      expect(result.permissions).toContain(Permission.POS_REFUND);
      expect(result.permissions).not.toContain(Permission.POS_SELL);
    });
  });
});
