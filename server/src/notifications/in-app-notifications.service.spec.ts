import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { NotificationType, NotificationPriority } from '@prisma/client';
import { InAppNotificationsService } from './in-app-notifications.service';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common/services';
import {
  CreateNotificationDto,
  BulkNotificationIdsDto,
} from './dto';

describe('InAppNotificationsService', () => {
  let service: InAppNotificationsService;
  let prismaService: jest.Mocked<PrismaService>;
  let tenantContextService: jest.Mocked<TenantContextService>;

  // Test data
  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-123';

  const mockNotification = {
    id: 'notif-123',
    tenantId: mockTenantId,
    userId: mockUserId,
    type: NotificationType.LOW_STOCK,
    title: 'Low Stock Alert',
    message: 'Product SKU-001 is running low on stock.',
    priority: NotificationPriority.HIGH,
    read: false,
    readAt: null,
    link: '/products/product-123',
    metadata: { productId: 'product-123', currentStock: 5 },
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
  };

  const mockNotification2 = {
    ...mockNotification,
    id: 'notif-456',
    type: NotificationType.NEW_INVOICE,
    title: 'New Invoice Created',
    message: 'Invoice INV-001 has been created.',
    priority: NotificationPriority.MEDIUM,
    read: true,
    readAt: new Date('2024-01-15T12:00:00Z'),
    link: '/invoices/invoice-123',
    metadata: { invoiceId: 'invoice-123' },
  };

  const mockUser = {
    id: mockUserId,
    tenantId: mockTenantId,
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Create mock implementations
    const mockPrismaService = {
      notification: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
      },
      user: {
        findFirst: jest.fn(),
      },
    };

    const mockTenantContextService = {
      getTenantId: jest.fn().mockReturnValue(mockTenantId),
      requireTenantId: jest.fn().mockReturnValue(mockTenantId),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InAppNotificationsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TenantContextService, useValue: mockTenantContextService },
      ],
    }).compile();

    service = module.get<InAppNotificationsService>(InAppNotificationsService);
    prismaService = module.get(PrismaService);
    tenantContextService = module.get(TenantContextService);

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

  // ============================================================================
  // findAll
  // ============================================================================

  describe('findAll', () => {
    beforeEach(() => {
      (prismaService.notification.findMany as jest.Mock).mockResolvedValue([
        mockNotification,
        mockNotification2,
      ]);
      (prismaService.notification.count as jest.Mock)
        .mockResolvedValueOnce(2) // total count
        .mockResolvedValueOnce(1); // unread count
    });

    it('should return paginated notifications with unread count', async () => {
      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.meta).toEqual({
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
        unreadCount: 1,
      });
    });

    it('should apply pagination correctly', async () => {
      await service.findAll({ page: 2, limit: 10 });

      expect(prismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('should filter by type', async () => {
      await service.findAll({ type: NotificationType.LOW_STOCK });

      expect(prismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: NotificationType.LOW_STOCK }),
        }),
      );
    });

    it('should filter by priority', async () => {
      await service.findAll({ priority: NotificationPriority.HIGH });

      expect(prismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ priority: NotificationPriority.HIGH }),
        }),
      );
    });

    it('should filter by read status', async () => {
      await service.findAll({ read: false });

      expect(prismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ read: false }),
        }),
      );
    });

    it('should filter by search term', async () => {
      await service.findAll({ search: 'low stock' });

      expect(prismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                title: { contains: 'low stock', mode: 'insensitive' },
              }),
              expect.objectContaining({
                message: { contains: 'low stock', mode: 'insensitive' },
              }),
            ]),
          }),
        }),
      );
    });

    it('should order by createdAt descending', async () => {
      await service.findAll();

      expect(prismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
    });

    it('should require tenant context', async () => {
      await service.findAll();

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should return empty array when no notifications exist', async () => {
      (prismaService.notification.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.notification.count as jest.Mock).mockReset();
      (prismaService.notification.count as jest.Mock)
        .mockResolvedValueOnce(0) // total count
        .mockResolvedValueOnce(0); // unread count

      const result = await service.findAll();

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });

    it('should use default pagination values', async () => {
      await service.findAll();

      expect(prismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 }),
      );
    });
  });

  // ============================================================================
  // findRecent
  // ============================================================================

  describe('findRecent', () => {
    beforeEach(() => {
      (prismaService.notification.findMany as jest.Mock).mockResolvedValue([
        mockNotification,
        mockNotification2,
      ]);
    });

    it('should return recent notifications', async () => {
      const result = await service.findRecent(5);

      expect(result).toHaveLength(2);
      expect(prismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: mockTenantId },
          take: 5,
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should cap limit at 20', async () => {
      await service.findRecent(50);

      expect(prismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 20 }),
      );
    });

    it('should use default limit of 5', async () => {
      await service.findRecent();

      expect(prismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );
    });

    it('should require tenant context', async () => {
      await service.findRecent();

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // getUnreadCount
  // ============================================================================

  describe('getUnreadCount', () => {
    const unreadNotifications = [
      { type: NotificationType.LOW_STOCK, priority: NotificationPriority.HIGH },
      { type: NotificationType.LOW_STOCK, priority: NotificationPriority.HIGH },
      { type: NotificationType.NEW_INVOICE, priority: NotificationPriority.MEDIUM },
    ];

    beforeEach(() => {
      (prismaService.notification.count as jest.Mock).mockResolvedValue(3);
      (prismaService.notification.findMany as jest.Mock).mockResolvedValue(
        unreadNotifications,
      );
    });

    it('should return total unread count', async () => {
      const result = await service.getUnreadCount();

      expect(result.count).toBe(3);
    });

    it('should return breakdown by type', async () => {
      const result = await service.getUnreadCount();

      expect(result.byType).toEqual({
        LOW_STOCK: 2,
        NEW_INVOICE: 1,
      });
    });

    it('should return breakdown by priority', async () => {
      const result = await service.getUnreadCount();

      expect(result.byPriority).toEqual({
        HIGH: 2,
        MEDIUM: 1,
      });
    });

    it('should query only unread notifications', async () => {
      await service.getUnreadCount();

      expect(prismaService.notification.count).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId, read: false },
      });
      expect(prismaService.notification.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId, read: false },
        select: { type: true, priority: true },
      });
    });

    it('should require tenant context', async () => {
      await service.getUnreadCount();

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should return zeros when no unread notifications', async () => {
      (prismaService.notification.count as jest.Mock).mockResolvedValue(0);
      (prismaService.notification.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getUnreadCount();

      expect(result.count).toBe(0);
      expect(result.byType).toEqual({});
      expect(result.byPriority).toEqual({});
    });
  });

  // ============================================================================
  // findOne
  // ============================================================================

  describe('findOne', () => {
    it('should return a notification by id', async () => {
      (prismaService.notification.findFirst as jest.Mock).mockResolvedValue(
        mockNotification,
      );

      const result = await service.findOne('notif-123');

      expect(result.id).toBe('notif-123');
      expect(result.title).toBe('Low Stock Alert');
      expect(prismaService.notification.findFirst).toHaveBeenCalledWith({
        where: { id: 'notif-123', tenantId: mockTenantId },
      });
    });

    it('should throw NotFoundException when notification not found', async () => {
      (prismaService.notification.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException with correct message', async () => {
      (prismaService.notification.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        'Notification with ID nonexistent not found',
      );
    });

    it('should include all expected fields in response', async () => {
      (prismaService.notification.findFirst as jest.Mock).mockResolvedValue(
        mockNotification,
      );

      const result = await service.findOne('notif-123');

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('tenantId');
      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('priority');
      expect(result).toHaveProperty('read');
      expect(result).toHaveProperty('readAt');
      expect(result).toHaveProperty('link');
      expect(result).toHaveProperty('metadata');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
    });

    it('should require tenant context', async () => {
      (prismaService.notification.findFirst as jest.Mock).mockResolvedValue(
        mockNotification,
      );

      await service.findOne('notif-123');

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // create
  // ============================================================================

  describe('create', () => {
    const createDto: CreateNotificationDto = {
      type: NotificationType.LOW_STOCK,
      title: 'Low Stock Alert',
      message: 'Product SKU-001 is running low on stock.',
      priority: NotificationPriority.HIGH,
      link: '/products/product-123',
      metadata: { productId: 'product-123' },
    };

    beforeEach(() => {
      (prismaService.notification.create as jest.Mock).mockResolvedValue(
        mockNotification,
      );
    });

    it('should create a new notification', async () => {
      const result = await service.create(createDto);

      expect(result.title).toBe('Low Stock Alert');
      expect(prismaService.notification.create).toHaveBeenCalled();
    });

    it('should include tenantId in created notification', async () => {
      await service.create(createDto);

      expect(prismaService.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tenantId: mockTenantId }),
        }),
      );
    });

    it('should set default priority to MEDIUM', async () => {
      const dtoWithoutPriority: CreateNotificationDto = {
        type: NotificationType.INFO,
        title: 'Info',
        message: 'Information message',
      };

      await service.create(dtoWithoutPriority);

      expect(prismaService.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ priority: NotificationPriority.MEDIUM }),
        }),
      );
    });

    it('should validate userId exists in tenant', async () => {
      const dtoWithUserId: CreateNotificationDto = {
        ...createDto,
        userId: mockUserId,
      };
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(mockUser);

      await service.create(dtoWithUserId);

      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: { id: mockUserId, tenantId: mockTenantId },
      });
    });

    it('should throw BadRequestException when userId not found', async () => {
      const dtoWithUserId: CreateNotificationDto = {
        ...createDto,
        userId: 'nonexistent-user',
      };
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.create(dtoWithUserId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException with correct message for invalid userId', async () => {
      const dtoWithUserId: CreateNotificationDto = {
        ...createDto,
        userId: 'nonexistent-user',
      };
      (prismaService.user.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.create(dtoWithUserId)).rejects.toThrow(
        'User with ID nonexistent-user not found in this tenant',
      );
    });

    it('should trim title and message', async () => {
      const dtoWithSpaces: CreateNotificationDto = {
        ...createDto,
        title: '  Trimmed Title  ',
        message: '  Trimmed Message  ',
      };

      await service.create(dtoWithSpaces);

      expect(prismaService.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Trimmed Title',
            message: 'Trimmed Message',
          }),
        }),
      );
    });

    it('should require tenant context', async () => {
      await service.create(createDto);

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // markAsRead
  // ============================================================================

  describe('markAsRead', () => {
    beforeEach(() => {
      (prismaService.notification.findFirst as jest.Mock).mockResolvedValue(
        mockNotification,
      );
      (prismaService.notification.update as jest.Mock).mockResolvedValue({
        ...mockNotification,
        read: true,
        readAt: new Date(),
      });
    });

    it('should mark notification as read', async () => {
      const result = await service.markAsRead('notif-123');

      expect(result.read).toBe(true);
      expect(prismaService.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-123' },
        data: {
          read: true,
          readAt: expect.any(Date),
        },
      });
    });

    it('should throw NotFoundException when notification not found', async () => {
      (prismaService.notification.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.markAsRead('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return notification unchanged if already read', async () => {
      const alreadyReadNotification = { ...mockNotification, read: true };
      (prismaService.notification.findFirst as jest.Mock).mockResolvedValue(
        alreadyReadNotification,
      );

      const result = await service.markAsRead('notif-123');

      expect(result.read).toBe(true);
      expect(prismaService.notification.update).not.toHaveBeenCalled();
    });

    it('should require tenant context', async () => {
      await service.markAsRead('notif-123');

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // markAsUnread
  // ============================================================================

  describe('markAsUnread', () => {
    const readNotification = { ...mockNotification, read: true, readAt: new Date() };

    beforeEach(() => {
      (prismaService.notification.findFirst as jest.Mock).mockResolvedValue(
        readNotification,
      );
      (prismaService.notification.update as jest.Mock).mockResolvedValue({
        ...readNotification,
        read: false,
        readAt: null,
      });
    });

    it('should mark notification as unread', async () => {
      const result = await service.markAsUnread('notif-123');

      expect(result.read).toBe(false);
      expect(prismaService.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-123' },
        data: {
          read: false,
          readAt: null,
        },
      });
    });

    it('should throw NotFoundException when notification not found', async () => {
      (prismaService.notification.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.markAsUnread('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return notification unchanged if already unread', async () => {
      (prismaService.notification.findFirst as jest.Mock).mockResolvedValue(
        mockNotification, // Already unread
      );

      const result = await service.markAsUnread('notif-123');

      expect(result.read).toBe(false);
      expect(prismaService.notification.update).not.toHaveBeenCalled();
    });

    it('should require tenant context', async () => {
      await service.markAsUnread('notif-123');

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // markManyAsRead
  // ============================================================================

  describe('markManyAsRead', () => {
    const dto: BulkNotificationIdsDto = {
      ids: ['notif-123', 'notif-456', 'notif-789'],
    };

    beforeEach(() => {
      (prismaService.notification.updateMany as jest.Mock).mockResolvedValue({
        count: 3,
      });
    });

    it('should mark multiple notifications as read', async () => {
      const result = await service.markManyAsRead(dto);

      expect(result.count).toBe(3);
      expect(result.message).toBe('3 notification(s) marked as read');
    });

    it('should update only unread notifications in the tenant', async () => {
      await service.markManyAsRead(dto);

      expect(prismaService.notification.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: dto.ids },
          tenantId: mockTenantId,
          read: false,
        },
        data: {
          read: true,
          readAt: expect.any(Date),
        },
      });
    });

    it('should return zero count when no notifications updated', async () => {
      (prismaService.notification.updateMany as jest.Mock).mockResolvedValue({
        count: 0,
      });

      const result = await service.markManyAsRead(dto);

      expect(result.count).toBe(0);
      expect(result.message).toBe('0 notification(s) marked as read');
    });

    it('should require tenant context', async () => {
      await service.markManyAsRead(dto);

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // markAllAsRead
  // ============================================================================

  describe('markAllAsRead', () => {
    beforeEach(() => {
      (prismaService.notification.updateMany as jest.Mock).mockResolvedValue({
        count: 10,
      });
    });

    it('should mark all notifications as read', async () => {
      const result = await service.markAllAsRead();

      expect(result.count).toBe(10);
      expect(result.message).toBe('10 notification(s) marked as read');
    });

    it('should update all unread notifications in the tenant', async () => {
      await service.markAllAsRead();

      expect(prismaService.notification.updateMany).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          read: false,
        },
        data: {
          read: true,
          readAt: expect.any(Date),
        },
      });
    });

    it('should require tenant context', async () => {
      await service.markAllAsRead();

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // delete
  // ============================================================================

  describe('delete', () => {
    beforeEach(() => {
      (prismaService.notification.findFirst as jest.Mock).mockResolvedValue(
        mockNotification,
      );
      (prismaService.notification.delete as jest.Mock).mockResolvedValue(
        mockNotification,
      );
    });

    it('should delete a notification', async () => {
      await service.delete('notif-123');

      expect(prismaService.notification.delete).toHaveBeenCalledWith({
        where: { id: 'notif-123' },
      });
    });

    it('should throw NotFoundException when notification not found', async () => {
      (prismaService.notification.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.delete('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException with correct message', async () => {
      (prismaService.notification.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.delete('nonexistent')).rejects.toThrow(
        'Notification with ID nonexistent not found',
      );
    });

    it('should require tenant context', async () => {
      await service.delete('notif-123');

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // deleteMany
  // ============================================================================

  describe('deleteMany', () => {
    const dto: BulkNotificationIdsDto = {
      ids: ['notif-123', 'notif-456'],
    };

    beforeEach(() => {
      (prismaService.notification.deleteMany as jest.Mock).mockResolvedValue({
        count: 2,
      });
    });

    it('should delete multiple notifications', async () => {
      const result = await service.deleteMany(dto);

      expect(result.count).toBe(2);
      expect(result.message).toBe('2 notification(s) deleted');
    });

    it('should delete only notifications in the tenant', async () => {
      await service.deleteMany(dto);

      expect(prismaService.notification.deleteMany).toHaveBeenCalledWith({
        where: {
          id: { in: dto.ids },
          tenantId: mockTenantId,
        },
      });
    });

    it('should return zero count when no notifications deleted', async () => {
      (prismaService.notification.deleteMany as jest.Mock).mockResolvedValue({
        count: 0,
      });

      const result = await service.deleteMany(dto);

      expect(result.count).toBe(0);
    });

    it('should require tenant context', async () => {
      await service.deleteMany(dto);

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // clearRead
  // ============================================================================

  describe('clearRead', () => {
    beforeEach(() => {
      (prismaService.notification.deleteMany as jest.Mock).mockResolvedValue({
        count: 5,
      });
    });

    it('should delete all read notifications', async () => {
      const result = await service.clearRead();

      expect(result.count).toBe(5);
      expect(result.message).toBe('5 read notification(s) deleted');
    });

    it('should delete only read notifications in the tenant', async () => {
      await service.clearRead();

      expect(prismaService.notification.deleteMany).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          read: true,
        },
      });
    });

    it('should return zero count when no read notifications', async () => {
      (prismaService.notification.deleteMany as jest.Mock).mockResolvedValue({
        count: 0,
      });

      const result = await service.clearRead();

      expect(result.count).toBe(0);
    });

    it('should require tenant context', async () => {
      await service.clearRead();

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // tenant isolation
  // ============================================================================

  describe('tenant isolation', () => {
    it('should scope findAll to tenant', async () => {
      (prismaService.notification.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.notification.count as jest.Mock).mockResolvedValue(0);

      await service.findAll();

      expect(prismaService.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: mockTenantId }),
        }),
      );
    });

    it('should scope findOne to tenant', async () => {
      (prismaService.notification.findFirst as jest.Mock).mockResolvedValue(
        mockNotification,
      );

      await service.findOne('notif-123');

      expect(prismaService.notification.findFirst).toHaveBeenCalledWith({
        where: { id: 'notif-123', tenantId: mockTenantId },
      });
    });

    it('should scope create to tenant', async () => {
      (prismaService.notification.create as jest.Mock).mockResolvedValue(
        mockNotification,
      );

      await service.create({
        type: NotificationType.INFO,
        title: 'Test',
        message: 'Test message',
      });

      expect(prismaService.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tenantId: mockTenantId }),
        }),
      );
    });

    it('should scope markManyAsRead to tenant', async () => {
      (prismaService.notification.updateMany as jest.Mock).mockResolvedValue({
        count: 1,
      });

      await service.markManyAsRead({ ids: ['notif-123'] });

      expect(prismaService.notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: mockTenantId }),
        }),
      );
    });

    it('should scope deleteMany to tenant', async () => {
      (prismaService.notification.deleteMany as jest.Mock).mockResolvedValue({
        count: 1,
      });

      await service.deleteMany({ ids: ['notif-123'] });

      expect(prismaService.notification.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: mockTenantId }),
        }),
      );
    });

    it('should scope clearRead to tenant', async () => {
      (prismaService.notification.deleteMany as jest.Mock).mockResolvedValue({
        count: 1,
      });

      await service.clearRead();

      expect(prismaService.notification.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: mockTenantId }),
        }),
      );
    });
  });

  // ============================================================================
  // logging
  // ============================================================================

  describe('logging', () => {
    it('should log debug when listing notifications', async () => {
      const debugSpy = jest.spyOn(Logger.prototype, 'debug');
      (prismaService.notification.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.notification.count as jest.Mock).mockResolvedValue(0);

      await service.findAll();

      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Listing notifications for tenant'),
      );
    });

    it('should log when notification is created', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      (prismaService.notification.create as jest.Mock).mockResolvedValue(
        mockNotification,
      );

      await service.create({
        type: NotificationType.INFO,
        title: 'Test',
        message: 'Test message',
      });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Notification created'),
      );
    });

    it('should log when notification is marked as read', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      (prismaService.notification.findFirst as jest.Mock).mockResolvedValue(
        mockNotification,
      );
      (prismaService.notification.update as jest.Mock).mockResolvedValue({
        ...mockNotification,
        read: true,
      });

      await service.markAsRead('notif-123');

      expect(logSpy).toHaveBeenCalledWith('Notification marked as read: notif-123');
    });

    it('should log when notification is deleted', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      (prismaService.notification.findFirst as jest.Mock).mockResolvedValue(
        mockNotification,
      );
      (prismaService.notification.delete as jest.Mock).mockResolvedValue(
        mockNotification,
      );

      await service.delete('notif-123');

      expect(logSpy).toHaveBeenCalledWith('Notification deleted: notif-123');
    });

    it('should log warning when notification not found', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');
      (prismaService.notification.findFirst as jest.Mock).mockResolvedValue(null);

      try {
        await service.findOne('nonexistent');
      } catch {
        // Expected
      }

      expect(warnSpy).toHaveBeenCalledWith('Notification not found: nonexistent');
    });
  });
});
