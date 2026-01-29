/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService, LowStockProduct } from './notifications.service';
import { InAppNotificationsService } from './in-app-notifications.service';
import { TenantContextService } from '../common';
import { SendMailResult } from './mail/brevo.service';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let notificationsService: jest.Mocked<NotificationsService>;
  let inAppNotificationsService: jest.Mocked<InAppNotificationsService>;
  let tenantContextService: jest.Mocked<TenantContextService>;

  // Test data
  const mockTenantId = 'tenant-123';

  const mockLowStockProducts: LowStockProduct[] = [
    {
      id: 'product-123',
      sku: 'SKU-001',
      name: 'Test Product 1',
      stock: 5,
      minStock: 10,
    },
    {
      id: 'product-456',
      sku: 'SKU-002',
      name: 'Test Product 2',
      stock: 2,
      minStock: 8,
    },
  ];

  const mockSendMailResult: SendMailResult = {
    success: true,
    messageId: 'msg-123',
  };

  const mockFailedMailResult: SendMailResult = {
    success: false,
    error: 'SMTP connection failed',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockNotificationsService = {
      getLowStockProducts: jest.fn(),
      triggerLowStockAlert: jest.fn(),
      triggerOverdueReminders: jest.fn(),
    };

    const mockInAppNotificationsService = {
      findAll: jest.fn(),
      findRecent: jest.fn(),
      getUnreadCount: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      markAsRead: jest.fn(),
      markAsUnread: jest.fn(),
      markManyAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      clearRead: jest.fn(),
    };

    const mockTenantContextService = {
      getTenantId: jest.fn().mockReturnValue(mockTenantId),
      requireTenantId: jest.fn().mockReturnValue(mockTenantId),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: InAppNotificationsService, useValue: mockInAppNotificationsService },
        { provide: TenantContextService, useValue: mockTenantContextService },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
    notificationsService = module.get(NotificationsService);
    inAppNotificationsService = module.get(InAppNotificationsService);
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
      expect(controller).toBeDefined();
    });
  });

  describe('previewLowStock', () => {
    it('should return low stock products', async () => {
      notificationsService.getLowStockProducts.mockResolvedValue(
        mockLowStockProducts,
      );

      const result = await controller.previewLowStock();

      expect(result.products).toEqual(mockLowStockProducts);
      expect(result.count).toBe(2);
    });

    it('should require tenant context', async () => {
      notificationsService.getLowStockProducts.mockResolvedValue([]);

      await controller.previewLowStock();

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should pass tenantId to service', async () => {
      notificationsService.getLowStockProducts.mockResolvedValue([]);

      await controller.previewLowStock();

      expect(notificationsService.getLowStockProducts).toHaveBeenCalledWith(
        mockTenantId,
      );
    });

    it('should return empty array when no low stock products', async () => {
      notificationsService.getLowStockProducts.mockResolvedValue([]);

      const result = await controller.previewLowStock();

      expect(result.products).toEqual([]);
      expect(result.count).toBe(0);
    });

    it('should log debug message', async () => {
      const debugSpy = jest.spyOn(Logger.prototype, 'debug');
      notificationsService.getLowStockProducts.mockResolvedValue([]);

      await controller.previewLowStock();

      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Previewing low stock products'),
      );
    });

    it('should propagate service errors', async () => {
      const error = new Error('Database error');
      notificationsService.getLowStockProducts.mockRejectedValue(error);

      await expect(controller.previewLowStock()).rejects.toThrow(error);
    });
  });

  describe('triggerLowStockAlert', () => {
    it('should return success when alert is sent', async () => {
      notificationsService.getLowStockProducts.mockResolvedValue(
        mockLowStockProducts,
      );
      notificationsService.triggerLowStockAlert.mockResolvedValue(
        mockSendMailResult,
      );

      const result = await controller.triggerLowStockAlert();

      expect(result.success).toBe(true);
      expect(result.message).toContain('sent successfully');
      expect(result.details?.emailsSent).toBe(1);
    });

    it('should require tenant context', async () => {
      notificationsService.getLowStockProducts.mockResolvedValue([]);

      await controller.triggerLowStockAlert();

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should return success with no email when no low stock products', async () => {
      notificationsService.getLowStockProducts.mockResolvedValue([]);

      const result = await controller.triggerLowStockAlert();

      expect(result.success).toBe(true);
      expect(result.message).toContain('No low stock products found');
      expect(result.details?.emailsSent).toBe(0);
      expect(result.details?.products).toEqual([]);
    });

    it('should return failure when no admin users found', async () => {
      notificationsService.getLowStockProducts.mockResolvedValue(
        mockLowStockProducts,
      );
      notificationsService.triggerLowStockAlert.mockResolvedValue(null);

      const result = await controller.triggerLowStockAlert();

      expect(result.success).toBe(false);
      expect(result.message).toContain('No admin users found');
      expect(result.details?.emailsSent).toBe(0);
      expect(result.details?.products).toEqual(mockLowStockProducts);
    });

    it('should return failure when mail sending fails', async () => {
      notificationsService.getLowStockProducts.mockResolvedValue(
        mockLowStockProducts,
      );
      notificationsService.triggerLowStockAlert.mockResolvedValue(
        mockFailedMailResult,
      );

      const result = await controller.triggerLowStockAlert();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to send low stock alert');
      expect(result.message).toContain('SMTP connection failed');
      expect(result.details?.emailsFailed).toBe(1);
    });

    it('should include product count in success message', async () => {
      notificationsService.getLowStockProducts.mockResolvedValue(
        mockLowStockProducts,
      );
      notificationsService.triggerLowStockAlert.mockResolvedValue(
        mockSendMailResult,
      );

      const result = await controller.triggerLowStockAlert();

      expect(result.message).toContain('2 product(s)');
    });

    it('should include products in response details', async () => {
      notificationsService.getLowStockProducts.mockResolvedValue(
        mockLowStockProducts,
      );
      notificationsService.triggerLowStockAlert.mockResolvedValue(
        mockSendMailResult,
      );

      const result = await controller.triggerLowStockAlert();

      expect(result.details?.products).toEqual(mockLowStockProducts);
    });

    it('should log when manually triggered', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      notificationsService.getLowStockProducts.mockResolvedValue([]);

      await controller.triggerLowStockAlert();

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Manual low stock alert triggered'),
      );
    });

    it('should propagate service errors', async () => {
      const error = new Error('Service error');
      notificationsService.getLowStockProducts.mockRejectedValue(error);

      await expect(controller.triggerLowStockAlert()).rejects.toThrow(error);
    });
  });

  describe('triggerOverdueReminders', () => {
    it('should return success with counts', async () => {
      notificationsService.triggerOverdueReminders.mockResolvedValue([
        mockSendMailResult,
        mockSendMailResult,
      ]);

      const result = await controller.triggerOverdueReminders();

      expect(result.success).toBe(true);
      expect(result.message).toContain('Processed 2 overdue invoice(s)');
      expect(result.message).toContain('Sent: 2');
      expect(result.details?.emailsSent).toBe(2);
    });

    it('should require tenant context', async () => {
      notificationsService.triggerOverdueReminders.mockResolvedValue([]);

      await controller.triggerOverdueReminders();

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should pass tenantId to service', async () => {
      notificationsService.triggerOverdueReminders.mockResolvedValue([]);

      await controller.triggerOverdueReminders();

      expect(notificationsService.triggerOverdueReminders).toHaveBeenCalledWith(
        mockTenantId,
      );
    });

    it('should count failed emails correctly', async () => {
      notificationsService.triggerOverdueReminders.mockResolvedValue([
        mockSendMailResult,
        mockFailedMailResult,
      ]);

      const result = await controller.triggerOverdueReminders();

      expect(result.message).toContain('Sent: 1');
      expect(result.message).toContain('Failed: 1');
      expect(result.details?.emailsSent).toBe(1);
      expect(result.details?.emailsFailed).toBe(1);
    });

    it('should count skipped (null) results correctly', async () => {
      notificationsService.triggerOverdueReminders.mockResolvedValue([
        mockSendMailResult,
        null,
        null,
      ]);

      const result = await controller.triggerOverdueReminders();

      expect(result.message).toContain('Sent: 1');
      expect(result.message).toContain('Skipped: 2');
    });

    it('should handle empty results array', async () => {
      notificationsService.triggerOverdueReminders.mockResolvedValue([]);

      const result = await controller.triggerOverdueReminders();

      expect(result.success).toBe(true);
      expect(result.message).toContain('Processed 0 overdue invoice(s)');
      expect(result.details?.emailsSent).toBe(0);
    });

    it('should handle mixed results', async () => {
      notificationsService.triggerOverdueReminders.mockResolvedValue([
        mockSendMailResult,
        mockFailedMailResult,
        null,
        mockSendMailResult,
      ]);

      const result = await controller.triggerOverdueReminders();

      expect(result.message).toContain('Processed 4');
      expect(result.message).toContain('Sent: 2');
      expect(result.message).toContain('Failed: 1');
      expect(result.message).toContain('Skipped: 1');
    });

    it('should log when manually triggered', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');
      notificationsService.triggerOverdueReminders.mockResolvedValue([]);

      await controller.triggerOverdueReminders();

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Manual overdue invoice reminders triggered'),
      );
    });

    it('should propagate service errors', async () => {
      const error = new Error('Service error');
      notificationsService.triggerOverdueReminders.mockRejectedValue(error);

      await expect(controller.triggerOverdueReminders()).rejects.toThrow(error);
    });
  });

  describe('sendTestEmail', () => {
    it('should return success for valid email type: welcome', () => {
      const result = controller.sendTestEmail('welcome');

      expect(result.success).toBe(true);
      expect(result.message).toContain("type 'welcome'");
    });

    it('should return success for valid email type: low-stock', () => {
      const result = controller.sendTestEmail('low-stock');

      expect(result.success).toBe(true);
      expect(result.message).toContain("type 'low-stock'");
    });

    it('should return success for valid email type: invoice-sent', () => {
      const result = controller.sendTestEmail('invoice-sent');

      expect(result.success).toBe(true);
      expect(result.message).toContain("type 'invoice-sent'");
    });

    it('should return success for valid email type: overdue', () => {
      const result = controller.sendTestEmail('overdue');

      expect(result.success).toBe(true);
      expect(result.message).toContain("type 'overdue'");
    });

    it('should return success for valid email type: payment', () => {
      const result = controller.sendTestEmail('payment');

      expect(result.success).toBe(true);
      expect(result.message).toContain("type 'payment'");
    });

    it('should return failure for invalid email type', () => {
      const result = controller.sendTestEmail('invalid-type');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid test email type');
      expect(result.message).toContain('invalid-type');
      expect(result.message).toContain(
        'welcome, low-stock, invoice-sent, overdue, payment',
      );
    });

    it('should require tenant context', () => {
      controller.sendTestEmail('welcome');

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should log test email request', () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      controller.sendTestEmail('welcome');

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Test email requested'),
      );
    });

    it('should include type in log message', () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      controller.sendTestEmail('payment');

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('payment'));
    });
  });

  describe('getStatus', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should return configured status when BREVO_API_KEY is set', () => {
      process.env.BREVO_API_KEY = 'xkeysib-123456789';

      const result = controller.getStatus();

      expect(result.mailConfigured).toBe(true);
      expect(result.message).toContain('enabled');
    });

    it('should return not configured status when BREVO_API_KEY is not set', () => {
      delete process.env.BREVO_API_KEY;

      const result = controller.getStatus();

      expect(result.mailConfigured).toBe(false);
      expect(result.message).toContain('disabled');
    });

    it('should return scheduled jobs list', () => {
      const result = controller.getStatus();

      expect(result.scheduledJobs).toContain('daily-low-stock-alert (9:00 AM)');
      expect(result.scheduledJobs).toContain(
        'daily-overdue-invoice-reminder (10:00 AM)',
      );
    });

    it('should include environment variable hint when not configured', () => {
      delete process.env.BREVO_API_KEY;

      const result = controller.getStatus();

      expect(result.message).toContain('BREVO_API_KEY');
    });

    it('should return enabled message when configured', () => {
      process.env.BREVO_API_KEY = 'xkeysib-123456789';

      const result = controller.getStatus();

      expect(result.message).toContain('scheduled jobs are active');
    });

    it('should handle empty BREVO_API_KEY', () => {
      process.env.BREVO_API_KEY = '';

      const result = controller.getStatus();

      expect(result.mailConfigured).toBe(false);
    });
  });

  describe('guard application', () => {
    it('should have JwtAuthGuard and RolesGuard at controller level', () => {
      // This tests that guards are properly applied via decorators
      // In NestJS, guards are metadata attached to the controller class
      const guards = Reflect.getMetadata('__guards__', NotificationsController);

      expect(guards).toBeDefined();
      expect(guards.length).toBe(2);
    });
  });

  describe('HTTP methods and decorators', () => {
    it('controller methods should exist', () => {
      expect(controller.previewLowStock).toBeDefined();
      expect(controller.triggerLowStockAlert).toBeDefined();
      expect(controller.triggerOverdueReminders).toBeDefined();
      expect(controller.sendTestEmail).toBeDefined();
      expect(controller.getStatus).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle very large product list', async () => {
      const manyProducts: LowStockProduct[] = Array.from(
        { length: 1000 },
        (_, i) => ({
          id: `product-${i}`,
          sku: `SKU-${i}`,
          name: `Product ${i}`,
          stock: 1,
          minStock: 10,
        }),
      );
      notificationsService.getLowStockProducts.mockResolvedValue(manyProducts);

      const result = await controller.previewLowStock();

      expect(result.count).toBe(1000);
    });

    it('should handle special characters in tenant id', async () => {
      tenantContextService.requireTenantId.mockReturnValue(
        'tenant-with-special-chars-123!@#',
      );
      notificationsService.getLowStockProducts.mockResolvedValue([]);

      await controller.previewLowStock();

      expect(notificationsService.getLowStockProducts).toHaveBeenCalledWith(
        'tenant-with-special-chars-123!@#',
      );
    });

    it('should handle all null results in trigger overdue', async () => {
      notificationsService.triggerOverdueReminders.mockResolvedValue([
        null,
        null,
        null,
      ]);

      const result = await controller.triggerOverdueReminders();

      expect(result.details?.emailsSent).toBe(0);
      expect(result.message).toContain('Skipped: 3');
    });

    it('should handle all failed results in trigger overdue', async () => {
      notificationsService.triggerOverdueReminders.mockResolvedValue([
        mockFailedMailResult,
        mockFailedMailResult,
      ]);

      const result = await controller.triggerOverdueReminders();

      expect(result.details?.emailsSent).toBe(0);
      expect(result.details?.emailsFailed).toBe(2);
    });
  });

  describe('response format', () => {
    it('previewLowStock should return products and count', async () => {
      notificationsService.getLowStockProducts.mockResolvedValue(
        mockLowStockProducts,
      );

      const result = await controller.previewLowStock();

      expect(result).toHaveProperty('products');
      expect(result).toHaveProperty('count');
      expect(Array.isArray(result.products)).toBe(true);
      expect(typeof result.count).toBe('number');
    });

    it('triggerLowStockAlert should return TriggerResponse format', async () => {
      notificationsService.getLowStockProducts.mockResolvedValue([]);

      const result = await controller.triggerLowStockAlert();

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('details');
    });

    it('triggerOverdueReminders should return TriggerResponse format', async () => {
      notificationsService.triggerOverdueReminders.mockResolvedValue([]);

      const result = await controller.triggerOverdueReminders();

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('details');
    });

    it('sendTestEmail should return TriggerResponse format', () => {
      const result = controller.sendTestEmail('welcome');

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
    });

    it('getStatus should return status format', () => {
      const result = controller.getStatus();

      expect(result).toHaveProperty('mailConfigured');
      expect(result).toHaveProperty('scheduledJobs');
      expect(result).toHaveProperty('message');
      expect(Array.isArray(result.scheduledJobs)).toBe(true);
    });
  });

  // ============================================================================
  // IN-APP NOTIFICATION ENDPOINT TESTS
  // ============================================================================

  describe('In-App Notification Endpoints', () => {
    const mockNotification = {
      id: 'notif-123',
      tenantId: mockTenantId,
      userId: 'user-123',
      type: 'SYSTEM' as const,
      priority: 'MEDIUM' as const,
      title: 'Test Notification',
      message: 'This is a test notification',
      read: false,
      readAt: null,
      link: null,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockPaginatedResponse = {
      data: [mockNotification],
      meta: {
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        unreadCount: 1,
      },
    };

    const mockUnreadCountResponse = {
      count: 5,
      byType: { SYSTEM: 2, LOW_STOCK: 3 },
      byPriority: { HIGH: 1, MEDIUM: 2, LOW: 2 },
    };

    const mockBulkOperationResult = {
      count: 3,
      message: 'Operation completed successfully',
    };

    describe('findAll', () => {
      it('should return paginated notifications', async () => {
        inAppNotificationsService.findAll.mockResolvedValue(mockPaginatedResponse);

        const filters = { page: 1, limit: 10 };
        const result = await controller.findAll(filters);

        expect(result).toEqual(mockPaginatedResponse);
        expect(inAppNotificationsService.findAll).toHaveBeenCalledWith(filters);
      });

      it('should pass filters to service', async () => {
        inAppNotificationsService.findAll.mockResolvedValue(mockPaginatedResponse);

        const filters = { page: 2, limit: 20, type: 'SYSTEM' as const, isRead: false };
        await controller.findAll(filters);

        expect(inAppNotificationsService.findAll).toHaveBeenCalledWith(filters);
      });

      it('should log the operation', async () => {
        const logSpy = jest.spyOn(Logger.prototype, 'log');
        inAppNotificationsService.findAll.mockResolvedValue(mockPaginatedResponse);

        await controller.findAll({ page: 1, limit: 10 });

        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('Listing notifications'),
        );
      });

      it('should use default pagination values in log', async () => {
        const logSpy = jest.spyOn(Logger.prototype, 'log');
        inAppNotificationsService.findAll.mockResolvedValue(mockPaginatedResponse);

        await controller.findAll({});

        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('page: 1'),
        );
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('limit: 10'),
        );
      });
    });

    describe('findRecent', () => {
      it('should return recent notifications with default limit', async () => {
        inAppNotificationsService.findRecent.mockResolvedValue([mockNotification]);

        const result = await controller.findRecent();

        expect(result).toEqual([mockNotification]);
        expect(inAppNotificationsService.findRecent).toHaveBeenCalledWith(5);
      });

      it('should parse limit parameter', async () => {
        inAppNotificationsService.findRecent.mockResolvedValue([mockNotification]);

        await controller.findRecent('10');

        expect(inAppNotificationsService.findRecent).toHaveBeenCalledWith(10);
      });

      it('should cap limit at 20', async () => {
        inAppNotificationsService.findRecent.mockResolvedValue([mockNotification]);

        await controller.findRecent('50');

        expect(inAppNotificationsService.findRecent).toHaveBeenCalledWith(20);
      });

      it('should use default of 5 when limit is 0 (falsy)', async () => {
        inAppNotificationsService.findRecent.mockResolvedValue([mockNotification]);

        // When limit is '0', parseInt returns 0 which is falsy, so || 5 kicks in
        await controller.findRecent('0');

        expect(inAppNotificationsService.findRecent).toHaveBeenCalledWith(5);
      });

      it('should enforce minimum of 1 with Math.max', async () => {
        inAppNotificationsService.findRecent.mockResolvedValue([mockNotification]);

        // Negative values would get clamped to 1 by Math.max, but || 5 catches them first
        await controller.findRecent('-5');

        // -5 parses to -5, || 5 doesn't apply since -5 is truthy
        // Math.max(1, -5) = 1, Math.min(20, 1) = 1
        expect(inAppNotificationsService.findRecent).toHaveBeenCalledWith(1);
      });

      it('should handle invalid limit values', async () => {
        inAppNotificationsService.findRecent.mockResolvedValue([mockNotification]);

        await controller.findRecent('invalid');

        expect(inAppNotificationsService.findRecent).toHaveBeenCalledWith(5);
      });

      it('should log the operation', async () => {
        const logSpy = jest.spyOn(Logger.prototype, 'log');
        inAppNotificationsService.findRecent.mockResolvedValue([mockNotification]);

        await controller.findRecent('10');

        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('Getting 10 recent notifications'),
        );
      });
    });

    describe('getUnreadCount', () => {
      it('should return unread count', async () => {
        inAppNotificationsService.getUnreadCount.mockResolvedValue(mockUnreadCountResponse);

        const result = await controller.getUnreadCount();

        expect(result).toEqual(mockUnreadCountResponse);
        expect(inAppNotificationsService.getUnreadCount).toHaveBeenCalled();
      });

      it('should log the operation', async () => {
        const logSpy = jest.spyOn(Logger.prototype, 'log');
        inAppNotificationsService.getUnreadCount.mockResolvedValue(mockUnreadCountResponse);

        await controller.getUnreadCount();

        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('Getting unread notification count'),
        );
      });
    });

    describe('findOne', () => {
      it('should return notification by id', async () => {
        inAppNotificationsService.findOne.mockResolvedValue(mockNotification);

        const result = await controller.findOne('notif-123');

        expect(result).toEqual(mockNotification);
        expect(inAppNotificationsService.findOne).toHaveBeenCalledWith('notif-123');
      });

      it('should log the operation', async () => {
        const logSpy = jest.spyOn(Logger.prototype, 'log');
        inAppNotificationsService.findOne.mockResolvedValue(mockNotification);

        await controller.findOne('notif-123');

        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('Getting notification: notif-123'),
        );
      });

      it('should propagate service errors', async () => {
        const error = new Error('Notification not found');
        inAppNotificationsService.findOne.mockRejectedValue(error);

        await expect(controller.findOne('invalid-id')).rejects.toThrow(error);
      });
    });

    describe('create', () => {
      const createDto = {
        type: 'SYSTEM' as const,
        priority: 'MEDIUM' as const,
        title: 'New Notification',
        message: 'This is a new notification',
      };

      it('should create notification', async () => {
        inAppNotificationsService.create.mockResolvedValue(mockNotification);

        const result = await controller.create(createDto);

        expect(result).toEqual(mockNotification);
        expect(inAppNotificationsService.create).toHaveBeenCalledWith(createDto);
      });

      it('should log the operation', async () => {
        const logSpy = jest.spyOn(Logger.prototype, 'log');
        inAppNotificationsService.create.mockResolvedValue(mockNotification);

        await controller.create(createDto);

        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('Creating notification: New Notification'),
        );
      });

      it('should propagate service errors', async () => {
        const error = new Error('Validation failed');
        inAppNotificationsService.create.mockRejectedValue(error);

        await expect(controller.create(createDto)).rejects.toThrow(error);
      });
    });

    describe('markManyAsRead', () => {
      const bulkDto = { ids: ['notif-1', 'notif-2', 'notif-3'] };

      it('should mark multiple notifications as read', async () => {
        inAppNotificationsService.markManyAsRead.mockResolvedValue(mockBulkOperationResult);

        const result = await controller.markManyAsRead(bulkDto);

        expect(result).toEqual(mockBulkOperationResult);
        expect(inAppNotificationsService.markManyAsRead).toHaveBeenCalledWith(bulkDto);
      });

      it('should log the operation', async () => {
        const logSpy = jest.spyOn(Logger.prototype, 'log');
        inAppNotificationsService.markManyAsRead.mockResolvedValue(mockBulkOperationResult);

        await controller.markManyAsRead(bulkDto);

        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('Marking 3 notifications as read'),
        );
      });
    });

    describe('markAllAsRead', () => {
      it('should mark all notifications as read', async () => {
        inAppNotificationsService.markAllAsRead.mockResolvedValue(mockBulkOperationResult);

        const result = await controller.markAllAsRead();

        expect(result).toEqual(mockBulkOperationResult);
        expect(inAppNotificationsService.markAllAsRead).toHaveBeenCalled();
      });

      it('should log the operation', async () => {
        const logSpy = jest.spyOn(Logger.prototype, 'log');
        inAppNotificationsService.markAllAsRead.mockResolvedValue(mockBulkOperationResult);

        await controller.markAllAsRead();

        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('Marking all notifications as read'),
        );
      });
    });

    describe('markAsRead', () => {
      it('should mark single notification as read', async () => {
        const readNotification = { ...mockNotification, read: true, readAt: new Date() };
        inAppNotificationsService.markAsRead.mockResolvedValue(readNotification);

        const result = await controller.markAsRead('notif-123');

        expect(result).toEqual(readNotification);
        expect(inAppNotificationsService.markAsRead).toHaveBeenCalledWith('notif-123');
      });

      it('should log the operation', async () => {
        const logSpy = jest.spyOn(Logger.prototype, 'log');
        inAppNotificationsService.markAsRead.mockResolvedValue(mockNotification);

        await controller.markAsRead('notif-123');

        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('Marking notification notif-123 as read'),
        );
      });

      it('should propagate service errors', async () => {
        const error = new Error('Notification not found');
        inAppNotificationsService.markAsRead.mockRejectedValue(error);

        await expect(controller.markAsRead('invalid-id')).rejects.toThrow(error);
      });
    });

    describe('markAsUnread', () => {
      it('should mark single notification as unread', async () => {
        const unreadNotification = { ...mockNotification, read: false, readAt: null };
        inAppNotificationsService.markAsUnread.mockResolvedValue(unreadNotification);

        const result = await controller.markAsUnread('notif-123');

        expect(result).toEqual(unreadNotification);
        expect(inAppNotificationsService.markAsUnread).toHaveBeenCalledWith('notif-123');
      });

      it('should log the operation', async () => {
        const logSpy = jest.spyOn(Logger.prototype, 'log');
        inAppNotificationsService.markAsUnread.mockResolvedValue(mockNotification);

        await controller.markAsUnread('notif-123');

        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('Marking notification notif-123 as unread'),
        );
      });

      it('should propagate service errors', async () => {
        const error = new Error('Notification not found');
        inAppNotificationsService.markAsUnread.mockRejectedValue(error);

        await expect(controller.markAsUnread('invalid-id')).rejects.toThrow(error);
      });
    });

    describe('clearRead', () => {
      it('should clear read notifications', async () => {
        inAppNotificationsService.clearRead.mockResolvedValue(mockBulkOperationResult);

        const result = await controller.clearRead();

        expect(result).toEqual(mockBulkOperationResult);
        expect(inAppNotificationsService.clearRead).toHaveBeenCalled();
      });

      it('should log the operation', async () => {
        const logSpy = jest.spyOn(Logger.prototype, 'log');
        inAppNotificationsService.clearRead.mockResolvedValue(mockBulkOperationResult);

        await controller.clearRead();

        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('Clearing read notifications'),
        );
      });
    });

    describe('deleteMany', () => {
      const bulkDto = { ids: ['notif-1', 'notif-2', 'notif-3'] };

      it('should delete multiple notifications', async () => {
        inAppNotificationsService.deleteMany.mockResolvedValue(mockBulkOperationResult);

        const result = await controller.deleteMany(bulkDto);

        expect(result).toEqual(mockBulkOperationResult);
        expect(inAppNotificationsService.deleteMany).toHaveBeenCalledWith(bulkDto);
      });

      it('should log the operation', async () => {
        const logSpy = jest.spyOn(Logger.prototype, 'log');
        inAppNotificationsService.deleteMany.mockResolvedValue(mockBulkOperationResult);

        await controller.deleteMany(bulkDto);

        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('Deleting 3 notifications'),
        );
      });
    });

    describe('delete', () => {
      it('should delete single notification', async () => {
        inAppNotificationsService.delete.mockResolvedValue(undefined);

        await controller.delete('notif-123');

        expect(inAppNotificationsService.delete).toHaveBeenCalledWith('notif-123');
      });

      it('should log the operation', async () => {
        const logSpy = jest.spyOn(Logger.prototype, 'log');
        inAppNotificationsService.delete.mockResolvedValue(undefined);

        await controller.delete('notif-123');

        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('Deleting notification: notif-123'),
        );
      });

      it('should propagate service errors', async () => {
        const error = new Error('Notification not found');
        inAppNotificationsService.delete.mockRejectedValue(error);

        await expect(controller.delete('invalid-id')).rejects.toThrow(error);
      });

      it('should return void', async () => {
        inAppNotificationsService.delete.mockResolvedValue(undefined);

        const result = await controller.delete('notif-123');

        expect(result).toBeUndefined();
      });
    });
  });
});
