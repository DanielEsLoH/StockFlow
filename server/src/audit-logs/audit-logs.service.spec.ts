import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { AuditLogsService, CreateAuditLogData } from './audit-logs.service';
import { PrismaService } from '../prisma';
import { QueryAuditLogsDto } from './dto';

describe('AuditLogsService', () => {
  let service: AuditLogsService;
  let prismaService: jest.Mocked<PrismaService>;

  // Test data
  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-456';

  const mockAuditLog = {
    id: 'audit-log-123',
    tenantId: mockTenantId,
    userId: mockUserId,
    action: AuditAction.CREATE,
    entityType: 'Product',
    entityId: 'product-789',
    oldValues: null,
    newValues: { name: 'Test Product', sku: 'SKU-001' },
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    metadata: { method: 'POST', path: '/products' },
    createdAt: new Date('2024-01-15T10:00:00Z'),
  };

  const mockUser = {
    id: mockUserId,
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
  };

  const mockAuditLogWithUser = {
    ...mockAuditLog,
    user: mockUser,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Create mock implementations
    const mockPrismaService = {
      auditLog: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
        deleteMany: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AuditLogsService>(AuditLogsService);
    prismaService = module.get(PrismaService);

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('create', () => {
    const createData: CreateAuditLogData = {
      tenantId: mockTenantId,
      userId: mockUserId,
      action: AuditAction.CREATE,
      entityType: 'Product',
      entityId: 'product-789',
      newValues: { name: 'Test Product' },
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    };

    it('should create an audit log entry', async () => {
      (prismaService.auditLog.create as jest.Mock).mockResolvedValue(
        mockAuditLog,
      );

      const result = await service.create(createData);

      expect(result).toEqual(mockAuditLog);
      expect(prismaService.auditLog.create).toHaveBeenCalledWith({
        data: {
          tenantId: mockTenantId,
          userId: mockUserId,
          action: AuditAction.CREATE,
          entityType: 'Product',
          entityId: 'product-789',
          oldValues: undefined,
          newValues: { name: 'Test Product' },
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          metadata: undefined,
        },
      });
    });

    it('should handle null userId', async () => {
      const dataWithNullUser = { ...createData, userId: null };
      (prismaService.auditLog.create as jest.Mock).mockResolvedValue({
        ...mockAuditLog,
        userId: null,
      });

      const result = await service.create(dataWithNullUser);

      expect(result).toBeDefined();
      expect(prismaService.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: null }),
        }),
      );
    });

    it('should handle undefined optional fields', async () => {
      const minimalData: CreateAuditLogData = {
        tenantId: mockTenantId,
        action: AuditAction.DELETE,
        entityType: 'Product',
        entityId: 'product-789',
      };
      (prismaService.auditLog.create as jest.Mock).mockResolvedValue({
        ...mockAuditLog,
        userId: null,
        oldValues: null,
        newValues: null,
        ipAddress: null,
        userAgent: null,
        metadata: null,
      });

      await service.create(minimalData);

      expect(prismaService.auditLog.create).toHaveBeenCalledWith({
        data: {
          tenantId: mockTenantId,
          userId: undefined,
          action: AuditAction.DELETE,
          entityType: 'Product',
          entityId: 'product-789',
          oldValues: undefined,
          newValues: undefined,
          ipAddress: undefined,
          userAgent: undefined,
          metadata: undefined,
        },
      });
    });

    it('should include metadata when provided', async () => {
      const dataWithMetadata = {
        ...createData,
        metadata: { method: 'POST', path: '/products' },
      };
      (prismaService.auditLog.create as jest.Mock).mockResolvedValue(
        mockAuditLog,
      );

      await service.create(dataWithMetadata);

      expect(prismaService.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: { method: 'POST', path: '/products' },
          }),
        }),
      );
    });

    it('should return null and log error on database failure', async () => {
      const dbError = new Error('Database connection failed');
      (prismaService.auditLog.create as jest.Mock).mockRejectedValue(dbError);

      const result = await service.create(createData);

      expect(result).toBeNull();
      expect(Logger.prototype.error).toHaveBeenCalled();
    });

    it('should not throw on database failure', async () => {
      (prismaService.auditLog.create as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.create(createData)).resolves.not.toThrow();
    });

    it('should log debug message on create', async () => {
      (prismaService.auditLog.create as jest.Mock).mockResolvedValue(
        mockAuditLog,
      );

      await service.create(createData);

      expect(Logger.prototype.debug).toHaveBeenCalledWith(
        expect.stringContaining('Creating audit log'),
      );
    });

    it('should log success message after create', async () => {
      (prismaService.auditLog.create as jest.Mock).mockResolvedValue(
        mockAuditLog,
      );

      await service.create(createData);

      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('Audit log created'),
      );
    });
  });

  describe('findAll', () => {
    beforeEach(() => {
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([
        mockAuditLogWithUser,
      ]);
      (prismaService.auditLog.count as jest.Mock).mockResolvedValue(1);
    });

    it('should return paginated audit logs', async () => {
      const query: QueryAuditLogsDto = { page: 1, limit: 20 };

      const result = await service.findAll(mockTenantId, query);

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should filter by tenantId', async () => {
      await service.findAll(mockTenantId);

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: mockTenantId }),
        }),
      );
    });

    it('should filter by action', async () => {
      const query: QueryAuditLogsDto = { action: AuditAction.CREATE };

      await service.findAll(mockTenantId, query);

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ action: AuditAction.CREATE }),
        }),
      );
    });

    it('should filter by entityType', async () => {
      const query: QueryAuditLogsDto = { entityType: 'Product' };

      await service.findAll(mockTenantId, query);

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ entityType: 'Product' }),
        }),
      );
    });

    it('should filter by entityId', async () => {
      const query: QueryAuditLogsDto = { entityId: 'product-789' };

      await service.findAll(mockTenantId, query);

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ entityId: 'product-789' }),
        }),
      );
    });

    it('should filter by userId', async () => {
      const query: QueryAuditLogsDto = { userId: mockUserId };

      await service.findAll(mockTenantId, query);

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: mockUserId }),
        }),
      );
    });

    it('should filter by date range', async () => {
      const query: QueryAuditLogsDto = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      await service.findAll(mockTenantId, query);

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: new Date('2024-01-01'),
              lte: new Date('2024-01-31'),
            },
          }),
        }),
      );
    });

    it('should filter by startDate only', async () => {
      const query: QueryAuditLogsDto = { startDate: '2024-01-01' };

      await service.findAll(mockTenantId, query);

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { gte: new Date('2024-01-01') },
          }),
        }),
      );
    });

    it('should filter by endDate only', async () => {
      const query: QueryAuditLogsDto = { endDate: '2024-01-31' };

      await service.findAll(mockTenantId, query);

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { lte: new Date('2024-01-31') },
          }),
        }),
      );
    });

    it('should use default pagination values', async () => {
      await service.findAll(mockTenantId);

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
    });

    it('should calculate correct skip for page 2', async () => {
      const query: QueryAuditLogsDto = { page: 2, limit: 10 };

      await service.findAll(mockTenantId, query);

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('should order by createdAt descending', async () => {
      await service.findAll(mockTenantId);

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
    });

    it('should include user information', async () => {
      await service.findAll(mockTenantId);

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        }),
      );
    });

    it('should calculate totalPages correctly', async () => {
      (prismaService.auditLog.count as jest.Mock).mockResolvedValue(45);
      const query: QueryAuditLogsDto = { page: 1, limit: 20 };

      const result = await service.findAll(mockTenantId, query);

      expect(result.meta.totalPages).toBe(3);
    });

    it('should return 0 totalPages for empty result', async () => {
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.auditLog.count as jest.Mock).mockResolvedValue(0);

      const result = await service.findAll(mockTenantId);

      expect(result.meta.totalPages).toBe(0);
    });

    it('should combine multiple filters', async () => {
      const query: QueryAuditLogsDto = {
        action: AuditAction.UPDATE,
        entityType: 'Product',
        userId: mockUserId,
        startDate: '2024-01-01',
      };

      await service.findAll(mockTenantId, query);

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: mockTenantId,
            action: AuditAction.UPDATE,
            entityType: 'Product',
            userId: mockUserId,
            createdAt: { gte: new Date('2024-01-01') },
          },
        }),
      );
    });
  });

  describe('findByEntity', () => {
    beforeEach(() => {
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([
        mockAuditLogWithUser,
      ]);
      (prismaService.auditLog.count as jest.Mock).mockResolvedValue(1);
    });

    it('should return entity history', async () => {
      const result = await service.findByEntity(
        mockTenantId,
        'Product',
        'product-789',
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].entityType).toBe('Product');
    });

    it('should filter by tenantId, entityType, and entityId', async () => {
      await service.findByEntity(mockTenantId, 'Product', 'product-789');

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: mockTenantId,
            entityType: 'Product',
            entityId: 'product-789',
          },
        }),
      );
    });

    it('should use default pagination', async () => {
      await service.findByEntity(mockTenantId, 'Product', 'product-789');

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
    });

    it('should respect custom pagination', async () => {
      await service.findByEntity(mockTenantId, 'Product', 'product-789', 3, 10);

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });

    it('should order by createdAt descending', async () => {
      await service.findByEntity(mockTenantId, 'Product', 'product-789');

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
    });
  });

  describe('findByUser', () => {
    beforeEach(() => {
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([
        mockAuditLogWithUser,
      ]);
      (prismaService.auditLog.count as jest.Mock).mockResolvedValue(1);
    });

    it('should return user activity', async () => {
      const result = await service.findByUser(mockTenantId, mockUserId);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].userId).toBe(mockUserId);
    });

    it('should filter by tenantId and userId', async () => {
      await service.findByUser(mockTenantId, mockUserId);

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: mockTenantId,
            userId: mockUserId,
          },
        }),
      );
    });

    it('should use default pagination', async () => {
      await service.findByUser(mockTenantId, mockUserId);

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
    });

    it('should respect custom pagination', async () => {
      await service.findByUser(mockTenantId, mockUserId, 2, 15);

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 15, take: 15 }),
      );
    });
  });

  describe('getStats', () => {
    beforeEach(() => {
      (prismaService.auditLog.count as jest.Mock).mockResolvedValue(100);
      (prismaService.auditLog.groupBy as jest.Mock).mockImplementation(
        (args: { by: string[] }) => {
          if (args.by.includes('action')) {
            return Promise.resolve([
              { action: AuditAction.CREATE, _count: { action: 40 } },
              { action: AuditAction.UPDATE, _count: { action: 35 } },
              { action: AuditAction.DELETE, _count: { action: 25 } },
            ]);
          }
          if (args.by.includes('entityType')) {
            return Promise.resolve([
              { entityType: 'Product', _count: { entityType: 50 } },
              { entityType: 'User', _count: { entityType: 30 } },
              { entityType: 'Invoice', _count: { entityType: 20 } },
            ]);
          }
          if (args.by.includes('userId')) {
            return Promise.resolve([
              { userId: 'user-1', _count: { userId: 30 } },
              { userId: 'user-2', _count: { userId: 25 } },
            ]);
          }
          return Promise.resolve([]);
        },
      );
      (prismaService.user.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'user-1',
          email: 'user1@test.com',
          firstName: 'User',
          lastName: 'One',
        },
        {
          id: 'user-2',
          email: 'user2@test.com',
          firstName: 'User',
          lastName: 'Two',
        },
      ]);
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([
        { createdAt: new Date('2024-01-15') },
        { createdAt: new Date('2024-01-15') },
        { createdAt: new Date('2024-01-14') },
      ]);
    });

    it('should return audit statistics', async () => {
      const result = await service.getStats(mockTenantId);

      expect(result.totalLogs).toBe(100);
      expect(result.actionBreakdown).toBeDefined();
      expect(result.entityTypeBreakdown).toBeDefined();
      expect(result.topUsers).toBeDefined();
      expect(result.recentActivity).toBeDefined();
    });

    it('should include action breakdown', async () => {
      const result = await service.getStats(mockTenantId);

      expect(result.actionBreakdown[AuditAction.CREATE]).toBe(40);
      expect(result.actionBreakdown[AuditAction.UPDATE]).toBe(35);
      expect(result.actionBreakdown[AuditAction.DELETE]).toBe(25);
    });

    it('should include all action types in breakdown even if zero', async () => {
      const result = await service.getStats(mockTenantId);

      Object.values(AuditAction).forEach((action) => {
        expect(result.actionBreakdown).toHaveProperty(action);
      });
    });

    it('should include entity type breakdown', async () => {
      const result = await service.getStats(mockTenantId);

      expect(result.entityTypeBreakdown['Product']).toBe(50);
      expect(result.entityTypeBreakdown['User']).toBe(30);
      expect(result.entityTypeBreakdown['Invoice']).toBe(20);
    });

    it('should include top users with details', async () => {
      const result = await service.getStats(mockTenantId);

      expect(result.topUsers).toHaveLength(2);
      expect(result.topUsers[0]).toEqual({
        userId: 'user-1',
        email: 'user1@test.com',
        firstName: 'User',
        lastName: 'One',
        count: 30,
      });
    });

    it('should include recent activity grouped by date', async () => {
      const result = await service.getStats(mockTenantId);

      expect(result.recentActivity.length).toBeGreaterThan(0);
      expect(result.recentActivity[0]).toHaveProperty('date');
      expect(result.recentActivity[0]).toHaveProperty('count');
    });

    it('should filter by date range', async () => {
      const dateRange = { startDate: '2024-01-01', endDate: '2024-01-31' };

      await service.getStats(mockTenantId, dateRange);

      expect(prismaService.auditLog.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: new Date('2024-01-01'),
              lte: new Date('2024-01-31'),
            },
          }),
        }),
      );
    });

    it('should handle empty results', async () => {
      (prismaService.auditLog.count as jest.Mock).mockResolvedValue(0);
      (prismaService.auditLog.groupBy as jest.Mock).mockResolvedValue([]);
      (prismaService.user.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getStats(mockTenantId);

      expect(result.totalLogs).toBe(0);
      expect(result.topUsers).toEqual([]);
      expect(result.recentActivity).toEqual([]);
    });
  });

  describe('cleanup', () => {
    it('should delete old audit logs', async () => {
      const olderThan = new Date('2024-01-01');
      (prismaService.auditLog.deleteMany as jest.Mock).mockResolvedValue({
        count: 50,
      });

      const result = await service.cleanup(mockTenantId, olderThan);

      expect(result).toBe(50);
      expect(prismaService.auditLog.deleteMany).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          createdAt: { lt: olderThan },
        },
      });
    });

    it('should scope deletion to tenant', async () => {
      const olderThan = new Date();
      (prismaService.auditLog.deleteMany as jest.Mock).mockResolvedValue({
        count: 0,
      });

      await service.cleanup(mockTenantId, olderThan);

      expect(prismaService.auditLog.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: mockTenantId }),
        }),
      );
    });

    it('should log cleanup operation', async () => {
      const olderThan = new Date();
      (prismaService.auditLog.deleteMany as jest.Mock).mockResolvedValue({
        count: 25,
      });

      await service.cleanup(mockTenantId, olderThan);

      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('Cleaning up audit logs'),
      );
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('Deleted 25 audit logs'),
      );
    });

    it('should return 0 when no logs match', async () => {
      (prismaService.auditLog.deleteMany as jest.Mock).mockResolvedValue({
        count: 0,
      });

      const result = await service.cleanup(mockTenantId, new Date());

      expect(result).toBe(0);
    });
  });

  describe('response mapping', () => {
    it('should map audit log to response format', async () => {
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([
        mockAuditLogWithUser,
      ]);
      (prismaService.auditLog.count as jest.Mock).mockResolvedValue(1);

      const result = await service.findAll(mockTenantId);

      const log = result.data[0];
      expect(log).toHaveProperty('id');
      expect(log).toHaveProperty('tenantId');
      expect(log).toHaveProperty('userId');
      expect(log).toHaveProperty('action');
      expect(log).toHaveProperty('entityType');
      expect(log).toHaveProperty('entityId');
      expect(log).toHaveProperty('oldValues');
      expect(log).toHaveProperty('newValues');
      expect(log).toHaveProperty('ipAddress');
      expect(log).toHaveProperty('userAgent');
      expect(log).toHaveProperty('metadata');
      expect(log).toHaveProperty('createdAt');
      expect(log).toHaveProperty('user');
    });

    it('should include user details in response', async () => {
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([
        mockAuditLogWithUser,
      ]);
      (prismaService.auditLog.count as jest.Mock).mockResolvedValue(1);

      const result = await service.findAll(mockTenantId);

      expect(result.data[0].user).toEqual(mockUser);
    });

    it('should handle null user', async () => {
      const logWithoutUser = { ...mockAuditLog, user: null };
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([
        logWithoutUser,
      ]);
      (prismaService.auditLog.count as jest.Mock).mockResolvedValue(1);

      const result = await service.findAll(mockTenantId);

      expect(result.data[0].user).toBeNull();
    });
  });

  describe('tenant isolation', () => {
    it('should scope findAll to tenant', async () => {
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.auditLog.count as jest.Mock).mockResolvedValue(0);

      await service.findAll('other-tenant-id');

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'other-tenant-id' }),
        }),
      );
    });

    it('should scope findByEntity to tenant', async () => {
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.auditLog.count as jest.Mock).mockResolvedValue(0);

      await service.findByEntity('other-tenant-id', 'Product', 'product-123');

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'other-tenant-id' }),
        }),
      );
    });

    it('should scope findByUser to tenant', async () => {
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.auditLog.count as jest.Mock).mockResolvedValue(0);

      await service.findByUser('other-tenant-id', 'user-123');

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'other-tenant-id' }),
        }),
      );
    });

    it('should scope getStats to tenant', async () => {
      (prismaService.auditLog.count as jest.Mock).mockResolvedValue(0);
      (prismaService.auditLog.groupBy as jest.Mock).mockResolvedValue([]);
      (prismaService.user.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.auditLog.findMany as jest.Mock).mockResolvedValue([]);

      await service.getStats('other-tenant-id');

      expect(prismaService.auditLog.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'other-tenant-id' }),
        }),
      );
    });

    it('should scope cleanup to tenant', async () => {
      (prismaService.auditLog.deleteMany as jest.Mock).mockResolvedValue({
        count: 0,
      });

      await service.cleanup('other-tenant-id', new Date());

      expect(prismaService.auditLog.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'other-tenant-id' }),
        }),
      );
    });
  });
});
