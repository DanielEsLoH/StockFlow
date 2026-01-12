import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { UserRole, PaymentStatus, InvoiceStatus, TenantStatus } from '@prisma/client';
import {
  NotificationsService,
  WelcomeEmailUser,
  InvoiceEmailData,
  PaymentEmailData,
} from './notifications.service';
import { PrismaService } from '../prisma';
import { BrevoService, SendMailResult } from './mail/brevo.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prismaService: jest.Mocked<PrismaService>;
  let brevoService: jest.Mocked<BrevoService>;

  // Test data
  const mockTenantId = 'tenant-123';

  const mockTenant = {
    id: mockTenantId,
    name: 'Acme Corp',
    status: TenantStatus.ACTIVE,
  };

  const mockUser: WelcomeEmailUser = {
    email: 'user@example.com',
    firstName: 'John',
    lastName: 'Doe',
    tenantId: mockTenantId,
  };

  const mockCustomer = {
    name: 'Jane Customer',
    email: 'customer@example.com',
  };

  const mockInvoice: InvoiceEmailData = {
    id: 'invoice-123',
    invoiceNumber: 'INV-001',
    total: 1500.50,
    dueDate: new Date('2024-02-15'),
    customer: mockCustomer,
  };

  const mockPayment: PaymentEmailData = {
    amount: 500.00,
    method: 'CREDIT_CARD',
  };

  const mockProduct = {
    id: 'product-123',
    sku: 'SKU-001',
    name: 'Test Product',
    stock: 5,
    minStock: 10,
  };

  const mockAdminUser = {
    email: 'admin@example.com',
  };

  const mockSendMailResult: SendMailResult = {
    success: true,
    messageId: 'msg-123',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockPrismaService = {
      tenant: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      product: {
        findMany: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
      },
      invoice: {
        findMany: jest.fn(),
      },
    };

    const mockBrevoService = {
      isConfigured: jest.fn().mockReturnValue(true),
      sendWelcomeEmail: jest.fn().mockResolvedValue(mockSendMailResult),
      sendLowStockAlertEmail: jest.fn().mockResolvedValue(mockSendMailResult),
      sendInvoiceEmail: jest.fn().mockResolvedValue(mockSendMailResult),
      sendOverdueInvoiceEmail: jest.fn().mockResolvedValue(mockSendMailResult),
      sendPaymentReceivedEmail: jest.fn().mockResolvedValue(mockSendMailResult),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: BrevoService, useValue: mockBrevoService },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    prismaService = module.get(PrismaService);
    brevoService = module.get(BrevoService);

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

  describe('sendWelcomeEmail', () => {
    beforeEach(() => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
    });

    it('should send welcome email with user data', async () => {
      const result = await service.sendWelcomeEmail(mockUser);

      expect(result.success).toBe(true);
      expect(brevoService.sendWelcomeEmail).toHaveBeenCalledWith(
        'user@example.com',
        'John Doe',
        'Acme Corp',
      );
    });

    it('should query tenant for name', async () => {
      await service.sendWelcomeEmail(mockUser);

      expect(prismaService.tenant.findUnique).toHaveBeenCalledWith({
        where: { id: mockTenantId },
        select: { name: true },
      });
    });

    it('should use default tenant name when tenant not found', async () => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(null);

      await service.sendWelcomeEmail(mockUser);

      expect(brevoService.sendWelcomeEmail).toHaveBeenCalledWith(
        'user@example.com',
        'John Doe',
        'Your Organization',
      );
    });

    it('should handle user with empty last name', async () => {
      const userWithoutLastName = {
        ...mockUser,
        lastName: '',
      };

      await service.sendWelcomeEmail(userWithoutLastName);

      expect(brevoService.sendWelcomeEmail).toHaveBeenCalledWith(
        'user@example.com',
        'John',
        'Acme Corp',
      );
    });

    it('should log debug message', async () => {
      const debugSpy = jest.spyOn(Logger.prototype, 'debug');

      await service.sendWelcomeEmail(mockUser);

      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Sending welcome email'),
      );
    });
  });

  describe('sendLowStockAlert', () => {
    beforeEach(() => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (prismaService.product.findMany as jest.Mock).mockResolvedValue([mockProduct]);
      (prismaService.user.findMany as jest.Mock).mockResolvedValue([mockAdminUser]);
    });

    it('should send low stock alert when products are below min stock', async () => {
      const result = await service.sendLowStockAlert(mockTenantId);

      expect(result?.success).toBe(true);
      expect(brevoService.sendLowStockAlertEmail).toHaveBeenCalledWith(
        ['admin@example.com'],
        [
          {
            sku: 'SKU-001',
            name: 'Test Product',
            currentStock: 5,
            minStock: 10,
          },
        ],
        'Acme Corp',
      );
    });

    it('should return null when tenant not found', async () => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(null);
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      const result = await service.sendLowStockAlert(mockTenantId);

      expect(result).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Tenant not found'),
      );
    });

    it('should return null when no low stock products found', async () => {
      const productWithSufficientStock = {
        ...mockProduct,
        stock: 15,
        minStock: 10,
      };
      (prismaService.product.findMany as jest.Mock).mockResolvedValue([
        productWithSufficientStock,
      ]);

      const result = await service.sendLowStockAlert(mockTenantId);

      expect(result).toBeNull();
      expect(brevoService.sendLowStockAlertEmail).not.toHaveBeenCalled();
    });

    it('should return null when no admin users found', async () => {
      (prismaService.user.findMany as jest.Mock).mockResolvedValue([]);
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      const result = await service.sendLowStockAlert(mockTenantId);

      expect(result).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No admin users found'),
      );
    });

    it('should filter for active admin users only', async () => {
      await service.sendLowStockAlert(mockTenantId);

      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          role: UserRole.ADMIN,
          status: 'ACTIVE',
        },
        select: { email: true },
      });
    });

    it('should send to multiple admin users', async () => {
      const multipleAdmins = [
        { email: 'admin1@example.com' },
        { email: 'admin2@example.com' },
      ];
      (prismaService.user.findMany as jest.Mock).mockResolvedValue(multipleAdmins);

      await service.sendLowStockAlert(mockTenantId);

      expect(brevoService.sendLowStockAlertEmail).toHaveBeenCalledWith(
        ['admin1@example.com', 'admin2@example.com'],
        expect.any(Array),
        'Acme Corp',
      );
    });

    it('should log number of low stock products found', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await service.sendLowStockAlert(mockTenantId);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Found 1 low stock products'),
      );
    });

    it('should handle multiple low stock products', async () => {
      const multipleProducts = [
        mockProduct,
        { ...mockProduct, id: 'product-456', sku: 'SKU-002', name: 'Product 2' },
      ];
      (prismaService.product.findMany as jest.Mock).mockResolvedValue(multipleProducts);

      await service.sendLowStockAlert(mockTenantId);

      expect(brevoService.sendLowStockAlertEmail).toHaveBeenCalledWith(
        expect.any(Array),
        expect.arrayContaining([
          expect.objectContaining({ sku: 'SKU-001' }),
          expect.objectContaining({ sku: 'SKU-002' }),
        ]),
        'Acme Corp',
      );
    });
  });

  describe('sendInvoiceSentEmail', () => {
    beforeEach(() => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
    });

    it('should send invoice sent email successfully', async () => {
      const result = await service.sendInvoiceSentEmail(mockInvoice, mockTenantId);

      expect(result?.success).toBe(true);
      expect(brevoService.sendInvoiceEmail).toHaveBeenCalledWith(
        'customer@example.com',
        'Jane Customer',
        'INV-001',
        1500.50,
        mockInvoice.dueDate,
        'Acme Corp',
      );
    });

    it('should return null when customer has no email', async () => {
      const invoiceWithoutEmail = {
        ...mockInvoice,
        customer: { name: 'Jane Customer', email: null },
      };

      const result = await service.sendInvoiceSentEmail(invoiceWithoutEmail, mockTenantId);

      expect(result).toBeNull();
      expect(brevoService.sendInvoiceEmail).not.toHaveBeenCalled();
    });

    it('should return null when customer is null', async () => {
      const invoiceWithoutCustomer = {
        ...mockInvoice,
        customer: null,
      };

      const result = await service.sendInvoiceSentEmail(
        invoiceWithoutCustomer,
        mockTenantId,
      );

      expect(result).toBeNull();
    });

    it('should return null when customer is undefined', async () => {
      const invoiceWithoutCustomer = {
        ...mockInvoice,
        customer: undefined,
      };

      const result = await service.sendInvoiceSentEmail(
        invoiceWithoutCustomer,
        mockTenantId,
      );

      expect(result).toBeNull();
    });

    it('should use default tenant name when tenant not found', async () => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(null);

      await service.sendInvoiceSentEmail(mockInvoice, mockTenantId);

      expect(brevoService.sendInvoiceEmail).toHaveBeenCalledWith(
        'customer@example.com',
        'Jane Customer',
        'INV-001',
        1500.50,
        mockInvoice.dueDate,
        'StockFlow',
      );
    });

    it('should log debug message', async () => {
      const debugSpy = jest.spyOn(Logger.prototype, 'debug');

      await service.sendInvoiceSentEmail(mockInvoice, mockTenantId);

      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Sending invoice sent email'),
      );
    });
  });

  describe('sendOverdueInvoiceAlert', () => {
    const overdueInvoice = {
      ...mockInvoice,
      dueDate: new Date('2024-01-01'), // Past date
    };

    beforeEach(() => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      // Mock Date.now to ensure consistent days overdue calculation
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-16'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should send overdue invoice alert successfully', async () => {
      const result = await service.sendOverdueInvoiceAlert(overdueInvoice, mockTenantId);

      expect(result?.success).toBe(true);
      expect(brevoService.sendOverdueInvoiceEmail).toHaveBeenCalledWith(
        'customer@example.com',
        'Jane Customer',
        'INV-001',
        1500.50,
        overdueInvoice.dueDate,
        15,
        'Acme Corp',
      );
    });

    it('should return null when customer has no email', async () => {
      const invoiceWithoutEmail = {
        ...overdueInvoice,
        customer: { name: 'Jane Customer', email: null },
      };

      const result = await service.sendOverdueInvoiceAlert(invoiceWithoutEmail, mockTenantId);

      expect(result).toBeNull();
      expect(brevoService.sendOverdueInvoiceEmail).not.toHaveBeenCalled();
    });

    it('should return null when invoice is not overdue', async () => {
      jest.setSystemTime(new Date('2024-01-01')); // Same day as due date
      const notOverdueInvoice = {
        ...mockInvoice,
        dueDate: new Date('2024-01-01'),
      };

      const result = await service.sendOverdueInvoiceAlert(notOverdueInvoice, mockTenantId);

      expect(result).toBeNull();
    });

    it('should return null when due date is in the future', async () => {
      jest.setSystemTime(new Date('2024-01-01'));
      const futureInvoice = {
        ...mockInvoice,
        dueDate: new Date('2024-02-01'),
      };

      const result = await service.sendOverdueInvoiceAlert(futureInvoice, mockTenantId);

      expect(result).toBeNull();
    });

    it('should use default tenant name when tenant not found', async () => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(null);

      await service.sendOverdueInvoiceAlert(overdueInvoice, mockTenantId);

      expect(brevoService.sendOverdueInvoiceEmail).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(Number),
        expect.any(Date),
        expect.any(Number),
        'StockFlow',
      );
    });

    it('should log debug message', async () => {
      const debugSpy = jest.spyOn(Logger.prototype, 'debug');

      await service.sendOverdueInvoiceAlert(overdueInvoice, mockTenantId);

      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Sending overdue invoice email'),
      );
    });

    it('should calculate days overdue correctly', async () => {
      jest.setSystemTime(new Date('2024-01-31'));
      const invoiceOverdue30Days = {
        ...mockInvoice,
        dueDate: new Date('2024-01-01'),
      };

      await service.sendOverdueInvoiceAlert(invoiceOverdue30Days, mockTenantId);

      expect(brevoService.sendOverdueInvoiceEmail).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(Number),
        expect.any(Date),
        30,
        expect.any(String),
      );
    });
  });

  describe('sendPaymentReceivedEmail', () => {
    const invoiceWithTotalPaid = {
      ...mockInvoice,
      totalPaid: 500,
    };

    beforeEach(() => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
    });

    it('should send payment received email successfully', async () => {
      const result = await service.sendPaymentReceivedEmail(
        mockPayment,
        invoiceWithTotalPaid,
        mockTenantId,
      );

      expect(result?.success).toBe(true);
      expect(brevoService.sendPaymentReceivedEmail).toHaveBeenCalledWith(
        'customer@example.com',
        'Jane Customer',
        'INV-001',
        500.00,
        'CREDIT_CARD',
        500.50, // 1500.50 - (500 + 500)
        'Acme Corp',
      );
    });

    it('should return null when customer has no email', async () => {
      const invoiceWithoutEmail = {
        ...invoiceWithTotalPaid,
        customer: { name: 'Jane Customer', email: null },
      };

      const result = await service.sendPaymentReceivedEmail(
        mockPayment,
        invoiceWithoutEmail,
        mockTenantId,
      );

      expect(result).toBeNull();
      expect(brevoService.sendPaymentReceivedEmail).not.toHaveBeenCalled();
    });

    it('should handle invoice without previous payments (totalPaid undefined)', async () => {
      const invoiceWithoutTotalPaid = {
        ...mockInvoice,
        totalPaid: undefined,
      };

      await service.sendPaymentReceivedEmail(
        mockPayment,
        invoiceWithoutTotalPaid,
        mockTenantId,
      );

      expect(brevoService.sendPaymentReceivedEmail).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        500.00,
        'CREDIT_CARD',
        1000.50, // 1500.50 - 500
        expect.any(String),
      );
    });

    it('should calculate zero remaining balance when fully paid', async () => {
      const fullPayment: PaymentEmailData = {
        amount: 1500.50,
        method: 'BANK_TRANSFER',
      };

      await service.sendPaymentReceivedEmail(
        fullPayment,
        { ...mockInvoice, totalPaid: 0 },
        mockTenantId,
      );

      expect(brevoService.sendPaymentReceivedEmail).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        1500.50,
        'BANK_TRANSFER',
        0,
        expect.any(String),
      );
    });

    it('should handle overpayment (remaining balance capped at 0)', async () => {
      const overpayment: PaymentEmailData = {
        amount: 2000,
        method: 'CASH',
      };

      await service.sendPaymentReceivedEmail(
        overpayment,
        { ...mockInvoice, totalPaid: 0 },
        mockTenantId,
      );

      expect(brevoService.sendPaymentReceivedEmail).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        2000,
        'CASH',
        0, // Max(0, 1500.50 - 2000) = 0
        expect.any(String),
      );
    });

    it('should use default tenant name when tenant not found', async () => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(null);

      await service.sendPaymentReceivedEmail(
        mockPayment,
        invoiceWithTotalPaid,
        mockTenantId,
      );

      expect(brevoService.sendPaymentReceivedEmail).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.any(Number),
        expect.any(String),
        expect.any(Number),
        'StockFlow',
      );
    });

    it('should log debug message', async () => {
      const debugSpy = jest.spyOn(Logger.prototype, 'debug');

      await service.sendPaymentReceivedEmail(
        mockPayment,
        invoiceWithTotalPaid,
        mockTenantId,
      );

      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Sending payment received email'),
      );
    });
  });

  describe('handleDailyLowStockAlert (cron job)', () => {
    beforeEach(() => {
      (prismaService.tenant.findMany as jest.Mock).mockResolvedValue([
        { id: 'tenant-1', name: 'Tenant 1' },
        { id: 'tenant-2', name: 'Tenant 2' },
      ]);
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (prismaService.product.findMany as jest.Mock).mockResolvedValue([mockProduct]);
      (prismaService.user.findMany as jest.Mock).mockResolvedValue([mockAdminUser]);
    });

    it('should process all active tenants', async () => {
      await service.handleDailyLowStockAlert();

      expect(prismaService.tenant.findMany).toHaveBeenCalledWith({
        where: {
          status: { in: ['ACTIVE', 'TRIAL'] },
        },
        select: { id: true, name: true },
      });
    });

    it('should skip when Brevo is not configured', async () => {
      brevoService.isConfigured.mockReturnValue(false);

      await service.handleDailyLowStockAlert();

      expect(prismaService.tenant.findMany).not.toHaveBeenCalled();
    });

    it('should log start message', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await service.handleDailyLowStockAlert();

      expect(logSpy).toHaveBeenCalledWith(
        'Running daily low stock alert cron job',
      );
    });

    it('should log completion message with count', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await service.handleDailyLowStockAlert();

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Alerts sent:'),
      );
    });

    it('should continue processing on individual tenant failure', async () => {
      (prismaService.product.findMany as jest.Mock)
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValueOnce([mockProduct]);

      await service.handleDailyLowStockAlert();

      expect(prismaService.product.findMany).toHaveBeenCalledTimes(2);
    });

    it('should log error when tenant processing fails', async () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      (prismaService.product.findMany as jest.Mock).mockRejectedValue(
        new Error('DB error'),
      );

      await service.handleDailyLowStockAlert();

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send low stock alert'),
        expect.any(String),
      );
    });

    it('should handle outer error gracefully', async () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      (prismaService.tenant.findMany as jest.Mock).mockRejectedValue(
        new Error('DB connection failed'),
      );

      await service.handleDailyLowStockAlert();

      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to run daily low stock alert job',
        expect.any(String),
      );
    });

    it('should handle non-Error thrown values in outer catch', async () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      (prismaService.tenant.findMany as jest.Mock).mockRejectedValue('string error');

      await service.handleDailyLowStockAlert();

      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to run daily low stock alert job',
        undefined,
      );
    });

    it('should handle non-Error thrown values in inner catch', async () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      (prismaService.product.findMany as jest.Mock).mockRejectedValue('string error');

      await service.handleDailyLowStockAlert();

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send low stock alert'),
        undefined,
      );
    });

    it('should count successful alerts', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await service.handleDailyLowStockAlert();

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Alerts sent: 2/2'),
      );
    });

    it('should handle null results from sendLowStockAlert', async () => {
      (prismaService.product.findMany as jest.Mock).mockResolvedValue([]);
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await service.handleDailyLowStockAlert();

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Alerts sent: 0/2'),
      );
    });
  });

  describe('handleDailyOverdueInvoiceReminder (cron job)', () => {
    const mockOverdueInvoice = {
      id: 'invoice-123',
      invoiceNumber: 'INV-001',
      total: 1500.50,
      dueDate: new Date('2024-01-01'),
      tenantId: mockTenantId,
      status: InvoiceStatus.SENT,
      paymentStatus: PaymentStatus.UNPAID,
      customer: mockCustomer,
      tenant: mockTenant,
    };

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-16'));
      (prismaService.invoice.findMany as jest.Mock).mockResolvedValue([
        mockOverdueInvoice,
      ]);
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should process all overdue invoices', async () => {
      await service.handleDailyOverdueInvoiceReminder();

      expect(prismaService.invoice.findMany).toHaveBeenCalledWith({
        where: {
          status: InvoiceStatus.SENT,
          paymentStatus: {
            in: [PaymentStatus.UNPAID, PaymentStatus.PARTIALLY_PAID],
          },
          dueDate: {
            lt: expect.any(Date),
            not: null,
          },
          tenant: {
            status: { in: ['ACTIVE', 'TRIAL'] },
          },
        },
        include: {
          customer: {
            select: {
              name: true,
              email: true,
            },
          },
          tenant: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    });

    it('should skip when Brevo is not configured', async () => {
      brevoService.isConfigured.mockReturnValue(false);

      await service.handleDailyOverdueInvoiceReminder();

      expect(prismaService.invoice.findMany).not.toHaveBeenCalled();
    });

    it('should log start message', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await service.handleDailyOverdueInvoiceReminder();

      expect(logSpy).toHaveBeenCalledWith(
        'Running daily overdue invoice reminder cron job',
      );
    });

    it('should skip invoices without customer email', async () => {
      (prismaService.invoice.findMany as jest.Mock).mockResolvedValue([
        { ...mockOverdueInvoice, customer: { name: 'Test', email: null } },
      ]);

      await service.handleDailyOverdueInvoiceReminder();

      expect(brevoService.sendOverdueInvoiceEmail).not.toHaveBeenCalled();
    });

    it('should skip invoices without due date', async () => {
      (prismaService.invoice.findMany as jest.Mock).mockResolvedValue([
        { ...mockOverdueInvoice, dueDate: null },
      ]);

      await service.handleDailyOverdueInvoiceReminder();

      expect(brevoService.sendOverdueInvoiceEmail).not.toHaveBeenCalled();
    });

    it('should handle invoice processing failure', async () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      brevoService.sendOverdueInvoiceEmail.mockRejectedValue(new Error('Send failed'));

      await service.handleDailyOverdueInvoiceReminder();

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send overdue reminder'),
        expect.any(String),
      );
    });

    it('should handle non-Error in invoice processing catch', async () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      brevoService.sendOverdueInvoiceEmail.mockRejectedValue('string error');

      await service.handleDailyOverdueInvoiceReminder();

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send overdue reminder'),
        undefined,
      );
    });

    it('should handle outer error gracefully', async () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      (prismaService.invoice.findMany as jest.Mock).mockRejectedValue(
        new Error('DB connection failed'),
      );

      await service.handleDailyOverdueInvoiceReminder();

      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to run daily overdue invoice reminder job',
        expect.any(String),
      );
    });

    it('should handle non-Error in outer catch', async () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      (prismaService.invoice.findMany as jest.Mock).mockRejectedValue('string error');

      await service.handleDailyOverdueInvoiceReminder();

      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to run daily overdue invoice reminder job',
        undefined,
      );
    });

    it('should log completion message with counts', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await service.handleDailyOverdueInvoiceReminder();

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Reminders sent:'),
      );
    });

    it('should convert Decimal total to Number', async () => {
      await service.handleDailyOverdueInvoiceReminder();

      expect(brevoService.sendOverdueInvoiceEmail).toHaveBeenCalledWith(
        'customer@example.com',
        'Jane Customer',
        'INV-001',
        1500.50,
        expect.any(Date),
        expect.any(Number),
        expect.any(String),
      );
    });
  });

  describe('triggerLowStockAlert', () => {
    beforeEach(() => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
      (prismaService.product.findMany as jest.Mock).mockResolvedValue([mockProduct]);
      (prismaService.user.findMany as jest.Mock).mockResolvedValue([mockAdminUser]);
    });

    it('should manually trigger low stock alert', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      const result = await service.triggerLowStockAlert(mockTenantId);

      expect(result?.success).toBe(true);
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Manually triggering low stock alert'),
      );
    });

    it('should call sendLowStockAlert internally', async () => {
      await service.triggerLowStockAlert(mockTenantId);

      expect(brevoService.sendLowStockAlertEmail).toHaveBeenCalled();
    });
  });

  describe('triggerOverdueReminders', () => {
    const mockOverdueInvoice = {
      id: 'invoice-123',
      invoiceNumber: 'INV-001',
      total: 1500.50,
      dueDate: new Date('2024-01-01'),
      customer: mockCustomer,
    };

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-16'));
      (prismaService.invoice.findMany as jest.Mock).mockResolvedValue([
        mockOverdueInvoice,
      ]);
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(mockTenant);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should manually trigger overdue reminders', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      const results = await service.triggerOverdueReminders(mockTenantId);

      expect(results).toHaveLength(1);
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Manually triggering overdue reminders'),
      );
    });

    it('should query for tenant-specific overdue invoices', async () => {
      await service.triggerOverdueReminders(mockTenantId);

      expect(prismaService.invoice.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          status: InvoiceStatus.SENT,
          paymentStatus: {
            in: [PaymentStatus.UNPAID, PaymentStatus.PARTIALLY_PAID],
          },
          dueDate: {
            lt: expect.any(Date),
            not: null,
          },
        },
        include: {
          customer: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });
    });

    it('should skip invoices without due date', async () => {
      (prismaService.invoice.findMany as jest.Mock).mockResolvedValue([
        { ...mockOverdueInvoice, dueDate: null },
      ]);

      const results = await service.triggerOverdueReminders(mockTenantId);

      expect(results).toHaveLength(0);
    });

    it('should return array of results', async () => {
      const results = await service.triggerOverdueReminders(mockTenantId);

      expect(Array.isArray(results)).toBe(true);
      expect(results[0]?.success).toBe(true);
    });
  });

  describe('getLowStockProducts', () => {
    it('should return low stock products for tenant', async () => {
      (prismaService.product.findMany as jest.Mock).mockResolvedValue([
        mockProduct,
        { ...mockProduct, id: 'product-2', stock: 15, minStock: 10 },
      ]);

      const result = await service.getLowStockProducts(mockTenantId);

      expect(result).toHaveLength(1);
      expect(result[0].sku).toBe('SKU-001');
    });

    it('should query products with tenant filter', async () => {
      (prismaService.product.findMany as jest.Mock).mockResolvedValue([]);

      await service.getLowStockProducts(mockTenantId);

      expect(prismaService.product.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        select: {
          id: true,
          sku: true,
          name: true,
          stock: true,
          minStock: true,
        },
      });
    });

    it('should return empty array when no low stock products', async () => {
      (prismaService.product.findMany as jest.Mock).mockResolvedValue([
        { ...mockProduct, stock: 15, minStock: 10 },
      ]);

      const result = await service.getLowStockProducts(mockTenantId);

      expect(result).toHaveLength(0);
    });

    it('should filter products where stock < minStock', async () => {
      const products = [
        { id: '1', sku: 'A', name: 'Product A', stock: 5, minStock: 10 }, // Low
        { id: '2', sku: 'B', name: 'Product B', stock: 10, minStock: 10 }, // Equal - not low
        { id: '3', sku: 'C', name: 'Product C', stock: 15, minStock: 10 }, // Above
        { id: '4', sku: 'D', name: 'Product D', stock: 0, minStock: 5 }, // Low
      ];
      (prismaService.product.findMany as jest.Mock).mockResolvedValue(products);

      const result = await service.getLowStockProducts(mockTenantId);

      expect(result).toHaveLength(2);
      expect(result.map((p) => p.sku)).toEqual(['A', 'D']);
    });
  });
});