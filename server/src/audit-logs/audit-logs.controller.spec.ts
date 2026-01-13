import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuditAction, UserRole } from '@prisma/client';
import { AuditLogsController } from './audit-logs.controller';
import {
  AuditLogsService,
  PaginatedAuditLogsResponse,
  AuditStatsResponse,
} from './audit-logs.service';
import { QueryAuditLogsDto } from './dto';
import { RequestUser } from '../auth/types';

describe('AuditLogsController', () => {
  let controller: AuditLogsController;
  let auditLogsService: jest.Mocked<AuditLogsService>;

  // Test data
  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-456';

  const mockUser: RequestUser = {
    userId: mockUserId,
    email: 'admin@example.com',
    role: UserRole.ADMIN,
    tenantId: mockTenantId,
  };

  const mockAuditLogResponse = {
    id: 'audit-log-123',
    tenantId: mockTenantId,
    userId: mockUserId,
    action: AuditAction.CREATE,
    entityType: 'Product',
    entityId: 'product-789',
    oldValues: null,
    newValues: { name: 'Test Product' },
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    metadata: { method: 'POST' },
    createdAt: new Date('2024-01-15'),
    user: {
      id: mockUserId,
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'User',
    },
  };

  const mockPaginatedResponse: PaginatedAuditLogsResponse = {
    data: [mockAuditLogResponse],
    meta: {
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    },
  };

  const mockStatsResponse: AuditStatsResponse = {
    totalLogs: 100,
    actionBreakdown: {
      [AuditAction.CREATE]: 40,
      [AuditAction.UPDATE]: 35,
      [AuditAction.DELETE]: 20,
      [AuditAction.LOGIN]: 3,
      [AuditAction.LOGOUT]: 2,
      [AuditAction.EXPORT]: 0,
      [AuditAction.IMPORT]: 0,
    },
    entityTypeBreakdown: {
      Product: 50,
      User: 30,
      Invoice: 20,
    },
    topUsers: [
      {
        userId: 'user-1',
        email: 'user1@test.com',
        firstName: 'User',
        lastName: 'One',
        count: 30,
      },
    ],
    recentActivity: [
      { date: '2024-01-15', count: 10 },
      { date: '2024-01-14', count: 8 },
    ],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockAuditLogsService = {
      findAll: jest.fn().mockResolvedValue(mockPaginatedResponse),
      findByEntity: jest.fn().mockResolvedValue(mockPaginatedResponse),
      findByUser: jest.fn().mockResolvedValue(mockPaginatedResponse),
      getStats: jest.fn().mockResolvedValue(mockStatsResponse),
      cleanup: jest.fn().mockResolvedValue(50),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditLogsController],
      providers: [
        { provide: AuditLogsService, useValue: mockAuditLogsService },
        { provide: Reflector, useValue: new Reflector() },
      ],
    }).compile();

    controller = module.get<AuditLogsController>(AuditLogsController);
    auditLogsService = module.get(AuditLogsService);

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('should return paginated audit logs', async () => {
      const query: QueryAuditLogsDto = { page: 1, limit: 20 };

      const result = await controller.findAll(mockUser, query);

      expect(result).toEqual(mockPaginatedResponse);
      expect(auditLogsService.findAll).toHaveBeenCalledWith(
        mockTenantId,
        query,
      );
    });

    it('should pass user tenantId to service', async () => {
      const query: QueryAuditLogsDto = {};

      await controller.findAll(mockUser, query);

      expect(auditLogsService.findAll).toHaveBeenCalledWith(
        mockTenantId,
        expect.anything(),
      );
    });

    it('should pass query filters to service', async () => {
      const query: QueryAuditLogsDto = {
        action: AuditAction.CREATE,
        entityType: 'Product',
        page: 2,
        limit: 10,
      };

      await controller.findAll(mockUser, query);

      expect(auditLogsService.findAll).toHaveBeenCalledWith(
        mockTenantId,
        query,
      );
    });

    it('should use default pagination when not specified', async () => {
      const query: QueryAuditLogsDto = {};

      await controller.findAll(mockUser, query);

      expect(auditLogsService.findAll).toHaveBeenCalledWith(
        mockTenantId,
        query,
      );
    });

    it('should log the request', async () => {
      const query: QueryAuditLogsDto = { page: 1, limit: 20 };

      await controller.findAll(mockUser, query);

      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('Listing audit logs'),
      );
    });

    it('should pass all filter parameters', async () => {
      const query: QueryAuditLogsDto = {
        action: AuditAction.UPDATE,
        entityType: 'Invoice',
        entityId: 'invoice-123',
        userId: 'user-456',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        page: 1,
        limit: 50,
      };

      await controller.findAll(mockUser, query);

      expect(auditLogsService.findAll).toHaveBeenCalledWith(
        mockTenantId,
        query,
      );
    });
  });

  describe('getStats', () => {
    it('should return audit statistics', async () => {
      const result = await controller.getStats(mockUser);

      expect(result).toEqual(mockStatsResponse);
      expect(auditLogsService.getStats).toHaveBeenCalledWith(mockTenantId, {
        startDate: undefined,
        endDate: undefined,
      });
    });

    it('should pass date range filter to service', async () => {
      await controller.getStats(mockUser, '2024-01-01', '2024-01-31');

      expect(auditLogsService.getStats).toHaveBeenCalledWith(mockTenantId, {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });
    });

    it('should pass only startDate when endDate not provided', async () => {
      await controller.getStats(mockUser, '2024-01-01');

      expect(auditLogsService.getStats).toHaveBeenCalledWith(mockTenantId, {
        startDate: '2024-01-01',
        endDate: undefined,
      });
    });

    it('should pass only endDate when startDate not provided', async () => {
      await controller.getStats(mockUser, undefined, '2024-01-31');

      expect(auditLogsService.getStats).toHaveBeenCalledWith(mockTenantId, {
        startDate: undefined,
        endDate: '2024-01-31',
      });
    });

    it('should log the request', async () => {
      await controller.getStats(mockUser);

      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('Getting audit stats'),
      );
    });
  });

  describe('findByEntity', () => {
    it('should return entity history', async () => {
      const result = await controller.findByEntity(
        mockUser,
        'Product',
        'product-789',
      );

      expect(result).toEqual(mockPaginatedResponse);
      expect(auditLogsService.findByEntity).toHaveBeenCalledWith(
        mockTenantId,
        'Product',
        'product-789',
        1,
        20,
      );
    });

    it('should parse page and limit from query strings', async () => {
      await controller.findByEntity(
        mockUser,
        'Product',
        'product-789',
        '2',
        '10',
      );

      expect(auditLogsService.findByEntity).toHaveBeenCalledWith(
        mockTenantId,
        'Product',
        'product-789',
        2,
        10,
      );
    });

    it('should handle invalid page number', async () => {
      await controller.findByEntity(
        mockUser,
        'Product',
        'product-789',
        'invalid',
        '20',
      );

      expect(auditLogsService.findByEntity).toHaveBeenCalledWith(
        mockTenantId,
        'Product',
        'product-789',
        1, // Should default to 1
        20,
      );
    });

    it('should handle negative page number', async () => {
      await controller.findByEntity(
        mockUser,
        'Product',
        'product-789',
        '-5',
        '20',
      );

      expect(auditLogsService.findByEntity).toHaveBeenCalledWith(
        mockTenantId,
        'Product',
        'product-789',
        1, // Should default to 1
        20,
      );
    });

    it('should enforce max limit of 100', async () => {
      await controller.findByEntity(
        mockUser,
        'Product',
        'product-789',
        '1',
        '200',
      );

      expect(auditLogsService.findByEntity).toHaveBeenCalledWith(
        mockTenantId,
        'Product',
        'product-789',
        1,
        100, // Should be capped at 100
      );
    });

    it('should enforce min limit of 1', async () => {
      await controller.findByEntity(
        mockUser,
        'Product',
        'product-789',
        '1',
        '0',
      );

      expect(auditLogsService.findByEntity).toHaveBeenCalledWith(
        mockTenantId,
        'Product',
        'product-789',
        1,
        1, // Should be at least 1
      );
    });

    it('should log the request', async () => {
      await controller.findByEntity(mockUser, 'Product', 'product-789');

      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining(
          'Getting audit history for Product product-789',
        ),
      );
    });

    it('should handle different entity types', async () => {
      await controller.findByEntity(mockUser, 'Invoice', 'invoice-123');

      expect(auditLogsService.findByEntity).toHaveBeenCalledWith(
        mockTenantId,
        'Invoice',
        'invoice-123',
        1,
        20,
      );
    });
  });

  describe('findByUser', () => {
    it('should return user activity', async () => {
      const result = await controller.findByUser(mockUser, 'target-user-id');

      expect(result).toEqual(mockPaginatedResponse);
      expect(auditLogsService.findByUser).toHaveBeenCalledWith(
        mockTenantId,
        'target-user-id',
        1,
        20,
      );
    });

    it('should parse page and limit from query strings', async () => {
      await controller.findByUser(mockUser, 'target-user-id', '3', '15');

      expect(auditLogsService.findByUser).toHaveBeenCalledWith(
        mockTenantId,
        'target-user-id',
        3,
        15,
      );
    });

    it('should handle invalid page number', async () => {
      await controller.findByUser(mockUser, 'target-user-id', 'invalid', '20');

      expect(auditLogsService.findByUser).toHaveBeenCalledWith(
        mockTenantId,
        'target-user-id',
        1,
        20,
      );
    });

    it('should enforce max limit of 100', async () => {
      await controller.findByUser(mockUser, 'target-user-id', '1', '500');

      expect(auditLogsService.findByUser).toHaveBeenCalledWith(
        mockTenantId,
        'target-user-id',
        1,
        100,
      );
    });

    it('should log the request', async () => {
      await controller.findByUser(mockUser, 'target-user-id');

      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('Getting audit logs for user target-user-id'),
      );
    });
  });

  describe('cleanup', () => {
    it('should cleanup old audit logs', async () => {
      const result = await controller.cleanup(mockUser, '90');

      expect(result).toEqual({ deleted: 50 });
      expect(auditLogsService.cleanup).toHaveBeenCalled();
    });

    it('should use default 90 days when not specified', async () => {
      await controller.cleanup(mockUser);

      const calls = (auditLogsService.cleanup as jest.Mock).mock
        .calls as unknown[][];
      const callArg = calls[0][1] as Date;
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - 90);

      // Check the date is approximately 90 days ago
      expect(callArg.getDate()).toBe(expectedDate.getDate());
    });

    it('should calculate correct date from days parameter', async () => {
      await controller.cleanup(mockUser, '30');

      const calls = (auditLogsService.cleanup as jest.Mock).mock
        .calls as unknown[][];
      const callArg = calls[0][1] as Date;
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - 30);

      expect(callArg.getDate()).toBe(expectedDate.getDate());
    });

    it('should pass tenantId to service', async () => {
      await controller.cleanup(mockUser, '90');

      expect(auditLogsService.cleanup).toHaveBeenCalledWith(
        mockTenantId,
        expect.any(Date),
      );
    });

    it('should throw BadRequestException for invalid days', async () => {
      await expect(controller.cleanup(mockUser, 'invalid')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for zero days', async () => {
      await expect(controller.cleanup(mockUser, '0')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for negative days', async () => {
      await expect(controller.cleanup(mockUser, '-10')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should include helpful message in BadRequestException', async () => {
      try {
        await controller.cleanup(mockUser, 'invalid');
      } catch (error) {
        expect((error as BadRequestException).message).toContain(
          'Days must be a positive integer',
        );
      }
    });

    it('should log the request', async () => {
      await controller.cleanup(mockUser, '90');

      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('Cleaning up audit logs'),
      );
    });

    it('should return the count of deleted records', async () => {
      (auditLogsService.cleanup as jest.Mock).mockResolvedValue(100);

      const result = await controller.cleanup(mockUser, '90');

      expect(result.deleted).toBe(100);
    });

    it('should handle zero deleted records', async () => {
      (auditLogsService.cleanup as jest.Mock).mockResolvedValue(0);

      const result = await controller.cleanup(mockUser, '90');

      expect(result.deleted).toBe(0);
    });
  });

  describe('tenant isolation', () => {
    it('should use user tenantId for findAll', async () => {
      const differentTenantUser: RequestUser = {
        ...mockUser,
        tenantId: 'different-tenant',
      };

      await controller.findAll(differentTenantUser, {});

      expect(auditLogsService.findAll).toHaveBeenCalledWith(
        'different-tenant',
        expect.anything(),
      );
    });

    it('should use user tenantId for getStats', async () => {
      const differentTenantUser: RequestUser = {
        ...mockUser,
        tenantId: 'different-tenant',
      };

      await controller.getStats(differentTenantUser);

      expect(auditLogsService.getStats).toHaveBeenCalledWith(
        'different-tenant',
        expect.anything(),
      );
    });

    it('should use user tenantId for findByEntity', async () => {
      const differentTenantUser: RequestUser = {
        ...mockUser,
        tenantId: 'different-tenant',
      };

      await controller.findByEntity(
        differentTenantUser,
        'Product',
        'product-123',
      );

      expect(auditLogsService.findByEntity).toHaveBeenCalledWith(
        'different-tenant',
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    });

    it('should use user tenantId for findByUser', async () => {
      const differentTenantUser: RequestUser = {
        ...mockUser,
        tenantId: 'different-tenant',
      };

      await controller.findByUser(differentTenantUser, 'user-123');

      expect(auditLogsService.findByUser).toHaveBeenCalledWith(
        'different-tenant',
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    });

    it('should use user tenantId for cleanup', async () => {
      const differentTenantUser: RequestUser = {
        ...mockUser,
        tenantId: 'different-tenant',
      };

      await controller.cleanup(differentTenantUser, '90');

      expect(auditLogsService.cleanup).toHaveBeenCalledWith(
        'different-tenant',
        expect.anything(),
      );
    });
  });

  describe('response format', () => {
    it('should return data array in findAll response', async () => {
      const result = await controller.findAll(mockUser, {});

      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should return meta object in findAll response', async () => {
      const result = await controller.findAll(mockUser, {});

      expect(result.meta).toHaveProperty('total');
      expect(result.meta).toHaveProperty('page');
      expect(result.meta).toHaveProperty('limit');
      expect(result.meta).toHaveProperty('totalPages');
    });

    it('should return stats structure in getStats response', async () => {
      const result = await controller.getStats(mockUser);

      expect(result).toHaveProperty('totalLogs');
      expect(result).toHaveProperty('actionBreakdown');
      expect(result).toHaveProperty('entityTypeBreakdown');
      expect(result).toHaveProperty('topUsers');
      expect(result).toHaveProperty('recentActivity');
    });

    it('should return deleted count in cleanup response', async () => {
      const result = await controller.cleanup(mockUser, '90');

      expect(result).toHaveProperty('deleted');
      expect(typeof result.deleted).toBe('number');
    });
  });
});
