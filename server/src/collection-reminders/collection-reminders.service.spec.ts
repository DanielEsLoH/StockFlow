/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  CollectionReminderType,
  ReminderChannel,
  ReminderStatus,
  InvoiceStatus,
  PaymentStatus,
} from '@prisma/client';
import { CollectionRemindersService } from './collection-reminders.service';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';
import type { CreateCollectionReminderDto } from './dto';

describe('CollectionRemindersService', () => {
  let service: CollectionRemindersService;
  let prismaService: jest.Mocked<PrismaService>;
  let tenantContextService: jest.Mocked<TenantContextService>;

  // Test data
  const mockTenantId = 'tenant-123';

  const mockInvoice = {
    id: 'invoice-123',
    tenantId: mockTenantId,
    customerId: 'customer-123',
    invoiceNumber: 'INV-00001',
    total: 500000,
    dueDate: new Date('2024-11-01'),
    status: InvoiceStatus.SENT,
    paymentStatus: PaymentStatus.UNPAID,
  };

  const mockCustomer = {
    id: 'customer-123',
    name: 'Juan Perez',
    email: 'juan@example.com',
    phone: '+573001234567',
  };

  const mockReminder = {
    id: 'reminder-123',
    tenantId: mockTenantId,
    invoiceId: mockInvoice.id,
    customerId: mockCustomer.id,
    type: CollectionReminderType.MANUAL,
    channel: ReminderChannel.EMAIL,
    scheduledAt: new Date('2024-12-01T09:00:00Z'),
    sentAt: null,
    status: ReminderStatus.PENDING,
    message: 'Recordatorio de pago',
    notes: null,
    createdAt: new Date('2024-11-28'),
    invoice: {
      id: mockInvoice.id,
      invoiceNumber: mockInvoice.invoiceNumber,
      total: mockInvoice.total,
      dueDate: mockInvoice.dueDate,
      status: mockInvoice.status,
      paymentStatus: mockInvoice.paymentStatus,
    },
    customer: mockCustomer,
  };

  // Prisma mock factory
  const createPrismaMock = () => ({
    collectionReminder: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      createMany: jest.fn(),
      groupBy: jest.fn(),
    },
    invoice: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  });

  beforeEach(async () => {
    const prismaMock = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollectionRemindersService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: TenantContextService,
          useValue: {
            requireTenantId: jest.fn().mockReturnValue(mockTenantId),
            getTenantId: jest.fn().mockReturnValue(mockTenantId),
          },
        },
      ],
    }).compile();

    service = module.get<CollectionRemindersService>(
      CollectionRemindersService,
    );
    prismaService = module.get(PrismaService);
    tenantContextService = module.get(TenantContextService);

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('create', () => {
    const createDto: CreateCollectionReminderDto = {
      invoiceId: 'invoice-123',
      scheduledAt: new Date('2024-12-01T09:00:00Z'),
      channel: ReminderChannel.EMAIL,
      message: 'Recordatorio de pago',
    };

    it('should create a manual reminder successfully', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue(
        mockInvoice,
      );
      (prismaService.collectionReminder.create as jest.Mock).mockResolvedValue(
        mockReminder,
      );

      const result = await service.create(createDto);

      expect(result.id).toBe(mockReminder.id);
      expect(result.type).toBe(CollectionReminderType.MANUAL);
      expect(result.status).toBe(ReminderStatus.PENDING);
      expect(result.invoiceId).toBe(createDto.invoiceId);
      expect(result.invoice?.invoiceNumber).toBe('INV-00001');

      expect(prismaService.collectionReminder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: mockTenantId,
            invoiceId: createDto.invoiceId,
            type: CollectionReminderType.MANUAL,
            channel: ReminderChannel.EMAIL,
          }),
        }),
      );
    });

    it('should infer customerId from invoice when not provided', async () => {
      const dtoWithoutCustomer: CreateCollectionReminderDto = {
        invoiceId: 'invoice-123',
        scheduledAt: new Date('2024-12-01T09:00:00Z'),
      };

      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue(
        mockInvoice,
      );
      (prismaService.collectionReminder.create as jest.Mock).mockResolvedValue(
        mockReminder,
      );

      await service.create(dtoWithoutCustomer);

      expect(prismaService.collectionReminder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customerId: mockInvoice.customerId,
          }),
        }),
      );
    });

    it('should throw NotFoundException when invoice not found', async () => {
      (prismaService.invoice.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated reminders', async () => {
      (prismaService.collectionReminder.findMany as jest.Mock).mockResolvedValue(
        [mockReminder],
      );
      (prismaService.collectionReminder.count as jest.Mock).mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should apply filters correctly', async () => {
      (prismaService.collectionReminder.findMany as jest.Mock).mockResolvedValue(
        [],
      );
      (prismaService.collectionReminder.count as jest.Mock).mockResolvedValue(0);

      await service.findAll({
        status: ReminderStatus.PENDING,
        type: CollectionReminderType.AFTER_DUE,
        invoiceId: 'invoice-123',
        customerId: 'customer-123',
        fromDate: new Date('2024-01-01'),
        toDate: new Date('2024-12-31'),
      });

      expect(prismaService.collectionReminder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: mockTenantId,
            status: ReminderStatus.PENDING,
            type: CollectionReminderType.AFTER_DUE,
            invoiceId: 'invoice-123',
            customerId: 'customer-123',
            scheduledAt: {
              gte: new Date('2024-01-01'),
              lte: new Date('2024-12-31'),
            },
          }),
        }),
      );
    });

    it('should return empty data with zero totalPages when no results', async () => {
      (prismaService.collectionReminder.findMany as jest.Mock).mockResolvedValue(
        [],
      );
      (prismaService.collectionReminder.count as jest.Mock).mockResolvedValue(0);

      const result = await service.findAll({});

      expect(result.data).toHaveLength(0);
      expect(result.meta.totalPages).toBe(0);
    });
  });

  describe('findOne', () => {
    it('should return reminder with relations', async () => {
      (prismaService.collectionReminder.findFirst as jest.Mock).mockResolvedValue(
        mockReminder,
      );

      const result = await service.findOne('reminder-123');

      expect(result.id).toBe('reminder-123');
      expect(result.invoice?.invoiceNumber).toBe('INV-00001');
      expect(result.customer?.name).toBe('Juan Perez');
    });

    it('should throw NotFoundException when reminder not found', async () => {
      (prismaService.collectionReminder.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('cancel', () => {
    it('should cancel a pending reminder', async () => {
      const pendingReminder = { ...mockReminder, status: ReminderStatus.PENDING };
      (prismaService.collectionReminder.findFirst as jest.Mock).mockResolvedValue(
        pendingReminder,
      );
      (prismaService.collectionReminder.update as jest.Mock).mockResolvedValue({
        ...pendingReminder,
        status: ReminderStatus.CANCELLED,
      });

      const result = await service.cancel('reminder-123');

      expect(result.status).toBe(ReminderStatus.CANCELLED);
      expect(prismaService.collectionReminder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'reminder-123' },
          data: { status: ReminderStatus.CANCELLED },
        }),
      );
    });

    it('should throw NotFoundException when reminder not found', async () => {
      (prismaService.collectionReminder.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(service.cancel('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when reminder is not PENDING', async () => {
      (prismaService.collectionReminder.findFirst as jest.Mock).mockResolvedValue({
        ...mockReminder,
        status: ReminderStatus.SENT,
      });

      await expect(service.cancel('reminder-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('markSent', () => {
    it('should mark a pending reminder as sent', async () => {
      const pendingReminder = { ...mockReminder, status: ReminderStatus.PENDING };
      const sentReminder = {
        ...pendingReminder,
        status: ReminderStatus.SENT,
        sentAt: new Date(),
      };

      (prismaService.collectionReminder.findFirst as jest.Mock).mockResolvedValue(
        pendingReminder,
      );
      (prismaService.collectionReminder.update as jest.Mock).mockResolvedValue(
        sentReminder,
      );

      const result = await service.markSent('reminder-123');

      expect(result.status).toBe(ReminderStatus.SENT);
      expect(result.sentAt).toBeDefined();

      expect(prismaService.collectionReminder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: ReminderStatus.SENT,
            sentAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should throw NotFoundException when reminder not found', async () => {
      (prismaService.collectionReminder.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(service.markSent('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when reminder is not PENDING', async () => {
      (prismaService.collectionReminder.findFirst as jest.Mock).mockResolvedValue({
        ...mockReminder,
        status: ReminderStatus.CANCELLED,
      });

      await expect(service.markSent('reminder-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('markFailed', () => {
    it('should mark a pending reminder as failed with notes', async () => {
      const pendingReminder = { ...mockReminder, status: ReminderStatus.PENDING };
      const failedReminder = {
        ...pendingReminder,
        status: ReminderStatus.FAILED,
        notes: 'Email rebotado',
      };

      (prismaService.collectionReminder.findFirst as jest.Mock).mockResolvedValue(
        pendingReminder,
      );
      (prismaService.collectionReminder.update as jest.Mock).mockResolvedValue(
        failedReminder,
      );

      const result = await service.markFailed('reminder-123', 'Email rebotado');

      expect(result.status).toBe(ReminderStatus.FAILED);
      expect(result.notes).toBe('Email rebotado');

      expect(prismaService.collectionReminder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: ReminderStatus.FAILED,
            notes: 'Email rebotado',
          }),
        }),
      );
    });

    it('should mark as failed without notes', async () => {
      const pendingReminder = { ...mockReminder, status: ReminderStatus.PENDING };
      const failedReminder = {
        ...pendingReminder,
        status: ReminderStatus.FAILED,
      };

      (prismaService.collectionReminder.findFirst as jest.Mock).mockResolvedValue(
        pendingReminder,
      );
      (prismaService.collectionReminder.update as jest.Mock).mockResolvedValue(
        failedReminder,
      );

      const result = await service.markFailed('reminder-123');

      expect(result.status).toBe(ReminderStatus.FAILED);
    });

    it('should throw NotFoundException when reminder not found', async () => {
      (prismaService.collectionReminder.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.markFailed('nonexistent', 'some notes'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when reminder is not PENDING', async () => {
      (prismaService.collectionReminder.findFirst as jest.Mock).mockResolvedValue({
        ...mockReminder,
        status: ReminderStatus.SENT,
      });

      await expect(service.markFailed('reminder-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getOverdueInvoices', () => {
    it('should return overdue invoices with days overdue and last reminder', async () => {
      const pastDueDate = new Date();
      pastDueDate.setDate(pastDueDate.getDate() - 10);

      const overdueInvoice = {
        id: 'invoice-overdue',
        invoiceNumber: 'INV-00005',
        total: 300000,
        dueDate: pastDueDate,
        status: InvoiceStatus.OVERDUE,
        paymentStatus: PaymentStatus.UNPAID,
        customerId: 'customer-123',
        customer: mockCustomer,
        collectionReminders: [
          { createdAt: new Date('2024-11-20') },
        ],
      };

      (prismaService.invoice.findMany as jest.Mock).mockResolvedValue([
        overdueInvoice,
      ]);

      const result = await service.getOverdueInvoices();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('invoice-overdue');
      expect(result[0].daysOverdue).toBeGreaterThanOrEqual(10);
      expect(result[0].lastReminderAt).toEqual(new Date('2024-11-20'));
      expect(result[0].customer?.name).toBe('Juan Perez');
    });

    it('should return null for lastReminderAt when no reminders exist', async () => {
      const pastDueDate = new Date();
      pastDueDate.setDate(pastDueDate.getDate() - 5);

      (prismaService.invoice.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'invoice-no-reminder',
          invoiceNumber: 'INV-00006',
          total: 100000,
          dueDate: pastDueDate,
          status: InvoiceStatus.SENT,
          paymentStatus: PaymentStatus.UNPAID,
          customerId: null,
          customer: null,
          collectionReminders: [],
        },
      ]);

      const result = await service.getOverdueInvoices();

      expect(result).toHaveLength(1);
      expect(result[0].lastReminderAt).toBeNull();
      expect(result[0].customer).toBeNull();
    });
  });

  describe('generateAutoReminders', () => {
    it('should generate reminders for eligible invoices', async () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() - 10); // 10 days overdue

      (prismaService.invoice.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'invoice-auto',
          invoiceNumber: 'INV-00010',
          customerId: 'customer-123',
          dueDate,
          collectionReminders: [],
        },
      ]);
      (prismaService.collectionReminder.createMany as jest.Mock).mockResolvedValue(
        { count: 3 },
      );

      const result = await service.generateAutoReminders();

      // With 10 days overdue: BEFORE_DUE (-3), ON_DUE (0), AFTER_DUE (+7) = 3 reminders
      expect(result.generated).toBe(3);
      expect(prismaService.collectionReminder.createMany).toHaveBeenCalled();
    });

    it('should not duplicate existing reminders', async () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() - 10);

      const onDueDate = new Date(dueDate);
      const beforeDueDate = new Date(dueDate);
      beforeDueDate.setDate(beforeDueDate.getDate() - 3);

      (prismaService.invoice.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'invoice-with-existing',
          invoiceNumber: 'INV-00011',
          customerId: 'customer-123',
          dueDate,
          collectionReminders: [
            {
              type: CollectionReminderType.BEFORE_DUE,
              scheduledAt: beforeDueDate,
            },
            {
              type: CollectionReminderType.ON_DUE,
              scheduledAt: onDueDate,
            },
          ],
        },
      ]);
      (prismaService.collectionReminder.createMany as jest.Mock).mockResolvedValue(
        { count: 1 },
      );

      const result = await service.generateAutoReminders();

      // Only AFTER_DUE (+7) should be generated since BEFORE_DUE and ON_DUE already exist
      expect(result.generated).toBe(1);
    });

    it('should return zero when no invoices are eligible', async () => {
      (prismaService.invoice.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.generateAutoReminders();

      expect(result.generated).toBe(0);
      expect(
        prismaService.collectionReminder.createMany,
      ).not.toHaveBeenCalled();
    });

    it('should skip future-scheduled reminders', async () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() - 1); // 1 day overdue

      (prismaService.invoice.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'invoice-recent',
          invoiceNumber: 'INV-00012',
          customerId: 'customer-123',
          dueDate,
          collectionReminders: [],
        },
      ]);
      (prismaService.collectionReminder.createMany as jest.Mock).mockResolvedValue(
        { count: 2 },
      );

      const result = await service.generateAutoReminders();

      // Only BEFORE_DUE (-3) and ON_DUE (0) should be created, +7/+15/+30 are in the future
      expect(result.generated).toBe(2);
    });
  });

  describe('getStats', () => {
    it('should return counts grouped by status and type', async () => {
      (prismaService.collectionReminder.findMany as jest.Mock).mockResolvedValue([
        { status: ReminderStatus.PENDING, type: CollectionReminderType.MANUAL },
        {
          status: ReminderStatus.SENT,
          type: CollectionReminderType.AFTER_DUE,
        },
        {
          status: ReminderStatus.PENDING,
          type: CollectionReminderType.BEFORE_DUE,
        },
        {
          status: ReminderStatus.FAILED,
          type: CollectionReminderType.ON_DUE,
        },
      ]);

      const result = await service.getStats();

      expect(result.total).toBe(4);
      expect(result.byStatus[ReminderStatus.PENDING]).toBe(2);
      expect(result.byStatus[ReminderStatus.SENT]).toBe(1);
      expect(result.byStatus[ReminderStatus.FAILED]).toBe(1);
      expect(result.byStatus[ReminderStatus.CANCELLED]).toBe(0);
      expect(result.byType[CollectionReminderType.MANUAL]).toBe(1);
      expect(result.byType[CollectionReminderType.AFTER_DUE]).toBe(1);
      expect(result.byType[CollectionReminderType.BEFORE_DUE]).toBe(1);
      expect(result.byType[CollectionReminderType.ON_DUE]).toBe(1);
    });

    it('should return all zeros when no reminders exist', async () => {
      (prismaService.collectionReminder.findMany as jest.Mock).mockResolvedValue(
        [],
      );

      const result = await service.getStats();

      expect(result.total).toBe(0);
      expect(result.byStatus[ReminderStatus.PENDING]).toBe(0);
      expect(result.byStatus[ReminderStatus.SENT]).toBe(0);
    });
  });

  describe('getDashboard', () => {
    it('should return dashboard summary', async () => {
      (prismaService.invoice.findMany as jest.Mock).mockResolvedValue([
        { total: 500000 },
        { total: 300000 },
      ]);

      (prismaService.collectionReminder.groupBy as jest.Mock).mockResolvedValue([
        { status: ReminderStatus.PENDING, _count: { id: 5 } },
        { status: ReminderStatus.SENT, _count: { id: 12 } },
        { status: ReminderStatus.FAILED, _count: { id: 2 } },
      ]);

      const result = await service.getDashboard();

      expect(result.totalOverdueAmount).toBe(800000);
      expect(result.overdueInvoicesCount).toBe(2);
      expect(result.pendingRemindersCount).toBe(5);
      expect(result.sentRemindersCount).toBe(12);
      expect(result.failedRemindersCount).toBe(2);
    });

    it('should handle empty dashboard gracefully', async () => {
      (prismaService.invoice.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.collectionReminder.groupBy as jest.Mock).mockResolvedValue(
        [],
      );

      const result = await service.getDashboard();

      expect(result.totalOverdueAmount).toBe(0);
      expect(result.overdueInvoicesCount).toBe(0);
      expect(result.pendingRemindersCount).toBe(0);
      expect(result.sentRemindersCount).toBe(0);
      expect(result.failedRemindersCount).toBe(0);
    });
  });
});
