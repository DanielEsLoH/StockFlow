import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import {
  NotificationsService,
  LowStockProduct,
} from './notifications.service';
import { TenantContextService } from '../common';
import { SendMailResult } from './mail/mail.service';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let notificationsService: jest.Mocked<NotificationsService>;
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

    const mockTenantContextService = {
      getTenantId: jest.fn().mockReturnValue(mockTenantId),
      requireTenantId: jest.fn().mockReturnValue(mockTenantId),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: TenantContextService, useValue: mockTenantContextService },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
    notificationsService = module.get(NotificationsService);
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
      expect(result.message).toContain('welcome, low-stock, invoice-sent, overdue, payment');
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

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('payment'),
      );
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

    it('should return configured status when MAIL_HOST is set', () => {
      process.env.MAIL_HOST = 'smtp.example.com';

      const result = controller.getStatus();

      expect(result.mailConfigured).toBe(true);
      expect(result.message).toContain('enabled');
    });

    it('should return not configured status when MAIL_HOST is not set', () => {
      delete process.env.MAIL_HOST;

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
      delete process.env.MAIL_HOST;

      const result = controller.getStatus();

      expect(result.message).toContain('MAIL_HOST');
      expect(result.message).toContain('MAIL_PORT');
      expect(result.message).toContain('MAIL_USER');
      expect(result.message).toContain('MAIL_PASSWORD');
    });

    it('should return enabled message when configured', () => {
      process.env.MAIL_HOST = 'smtp.example.com';

      const result = controller.getStatus();

      expect(result.message).toContain('scheduled jobs are active');
    });

    it('should handle empty MAIL_HOST', () => {
      process.env.MAIL_HOST = '';

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
});