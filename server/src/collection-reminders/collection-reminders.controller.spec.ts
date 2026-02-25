import { Test, TestingModule } from '@nestjs/testing';
import { Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  CollectionReminderType,
  ReminderChannel,
  ReminderStatus,
  InvoiceStatus,
  PaymentStatus,
} from '@prisma/client';
import { CollectionRemindersController } from './collection-reminders.controller';
import { CollectionRemindersService } from './collection-reminders.service';
import type {
  CollectionReminderResponse,
  PaginatedRemindersResponse,
  ReminderStats,
  CollectionDashboard,
  OverdueInvoiceInfo,
} from './collection-reminders.service';
import type { CreateCollectionReminderDto, FilterCollectionRemindersDto } from './dto';

describe('CollectionRemindersController', () => {
  let controller: CollectionRemindersController;
  let service: jest.Mocked<CollectionRemindersService>;

  // Test data
  const mockReminder: CollectionReminderResponse = {
    id: 'reminder-123',
    tenantId: 'tenant-123',
    invoiceId: 'invoice-123',
    customerId: 'customer-123',
    type: CollectionReminderType.MANUAL,
    channel: ReminderChannel.EMAIL,
    scheduledAt: new Date('2024-12-01T09:00:00Z'),
    sentAt: null,
    status: ReminderStatus.PENDING,
    message: 'Recordatorio de pago',
    notes: null,
    createdAt: new Date('2024-11-28'),
    invoice: {
      id: 'invoice-123',
      invoiceNumber: 'INV-00001',
      total: 500000,
      dueDate: new Date('2024-11-01'),
      status: InvoiceStatus.SENT,
      paymentStatus: PaymentStatus.UNPAID,
    },
    customer: {
      id: 'customer-123',
      name: 'Juan Perez',
      email: 'juan@example.com',
      phone: '+573001234567',
    },
  };

  const mockPaginatedResponse: PaginatedRemindersResponse = {
    data: [mockReminder],
    meta: {
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CollectionRemindersController],
      providers: [
        {
          provide: CollectionRemindersService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            cancel: jest.fn(),
            markSent: jest.fn(),
            markFailed: jest.fn(),
            getOverdueInvoices: jest.fn(),
            generateAutoReminders: jest.fn(),
            getStats: jest.fn(),
            getDashboard: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CollectionRemindersController>(
      CollectionRemindersController,
    );
    service = module.get(CollectionRemindersService);

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated reminders', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResponse);

      const filters: FilterCollectionRemindersDto = { page: 1, limit: 10 };
      const result = await controller.findAll(filters);

      expect(result).toEqual(mockPaginatedResponse);
      expect(service.findAll).toHaveBeenCalledWith(filters);
    });

    it('should pass filters to service', async () => {
      service.findAll.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });

      const filters: FilterCollectionRemindersDto = {
        status: ReminderStatus.PENDING,
        type: CollectionReminderType.AFTER_DUE,
        invoiceId: 'invoice-123',
      };
      await controller.findAll(filters);

      expect(service.findAll).toHaveBeenCalledWith(filters);
    });
  });

  describe('getStats', () => {
    it('should return reminder statistics', async () => {
      const mockStats: ReminderStats = {
        byStatus: {
          [ReminderStatus.PENDING]: 5,
          [ReminderStatus.SENT]: 10,
          [ReminderStatus.FAILED]: 2,
          [ReminderStatus.CANCELLED]: 1,
        },
        byType: {
          [CollectionReminderType.BEFORE_DUE]: 3,
          [CollectionReminderType.ON_DUE]: 4,
          [CollectionReminderType.AFTER_DUE]: 8,
          [CollectionReminderType.MANUAL]: 3,
        },
        total: 18,
      };
      service.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats();

      expect(result).toEqual(mockStats);
      expect(service.getStats).toHaveBeenCalled();
    });
  });

  describe('getDashboard', () => {
    it('should return collection dashboard', async () => {
      const mockDashboard: CollectionDashboard = {
        totalOverdueAmount: 1500000,
        overdueInvoicesCount: 5,
        pendingRemindersCount: 8,
        sentRemindersCount: 20,
        failedRemindersCount: 3,
      };
      service.getDashboard.mockResolvedValue(mockDashboard);

      const result = await controller.getDashboard();

      expect(result).toEqual(mockDashboard);
      expect(service.getDashboard).toHaveBeenCalled();
    });
  });

  describe('getOverdueInvoices', () => {
    it('should return overdue invoices list', async () => {
      const mockOverdue: OverdueInvoiceInfo[] = [
        {
          id: 'invoice-overdue',
          invoiceNumber: 'INV-00005',
          total: 300000,
          dueDate: new Date('2024-11-01'),
          status: InvoiceStatus.OVERDUE,
          paymentStatus: PaymentStatus.UNPAID,
          daysOverdue: 28,
          customerId: 'customer-123',
          customer: {
            id: 'customer-123',
            name: 'Juan Perez',
            email: 'juan@example.com',
            phone: null,
          },
          lastReminderAt: new Date('2024-11-20'),
        },
      ];
      service.getOverdueInvoices.mockResolvedValue(mockOverdue);

      const result = await controller.getOverdueInvoices();

      expect(result).toEqual(mockOverdue);
      expect(service.getOverdueInvoices).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single reminder', async () => {
      service.findOne.mockResolvedValue(mockReminder);

      const result = await controller.findOne('reminder-123');

      expect(result).toEqual(mockReminder);
      expect(service.findOne).toHaveBeenCalledWith('reminder-123');
    });

    it('should propagate NotFoundException from service', async () => {
      service.findOne.mockRejectedValue(
        new NotFoundException('Recordatorio no encontrado'),
      );

      await expect(controller.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a manual reminder', async () => {
      service.create.mockResolvedValue(mockReminder);

      const dto: CreateCollectionReminderDto = {
        invoiceId: 'invoice-123',
        scheduledAt: new Date('2024-12-01T09:00:00Z'),
        channel: ReminderChannel.EMAIL,
        message: 'Recordatorio de pago',
      };

      const result = await controller.create(dto);

      expect(result).toEqual(mockReminder);
      expect(service.create).toHaveBeenCalledWith(dto);
    });

    it('should propagate NotFoundException when invoice not found', async () => {
      service.create.mockRejectedValue(
        new NotFoundException('Factura no encontrada'),
      );

      const dto: CreateCollectionReminderDto = {
        invoiceId: 'nonexistent',
        scheduledAt: new Date(),
      };

      await expect(controller.create(dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('generate', () => {
    it('should generate auto reminders and return count', async () => {
      service.generateAutoReminders.mockResolvedValue({ generated: 15 });

      const result = await controller.generate();

      expect(result).toEqual({ generated: 15 });
      expect(service.generateAutoReminders).toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('should cancel a pending reminder', async () => {
      const cancelledReminder = {
        ...mockReminder,
        status: ReminderStatus.CANCELLED,
      };
      service.cancel.mockResolvedValue(cancelledReminder);

      const result = await controller.cancel('reminder-123');

      expect(result.status).toBe(ReminderStatus.CANCELLED);
      expect(service.cancel).toHaveBeenCalledWith('reminder-123');
    });

    it('should propagate BadRequestException for non-pending reminder', async () => {
      service.cancel.mockRejectedValue(
        new BadRequestException(
          'Solo se pueden cancelar recordatorios pendientes',
        ),
      );

      await expect(controller.cancel('reminder-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('markSent', () => {
    it('should mark a reminder as sent', async () => {
      const sentReminder = {
        ...mockReminder,
        status: ReminderStatus.SENT,
        sentAt: new Date(),
      };
      service.markSent.mockResolvedValue(sentReminder);

      const result = await controller.markSent('reminder-123');

      expect(result.status).toBe(ReminderStatus.SENT);
      expect(result.sentAt).toBeDefined();
      expect(service.markSent).toHaveBeenCalledWith('reminder-123');
    });
  });

  describe('markFailed', () => {
    it('should mark a reminder as failed with notes', async () => {
      const failedReminder = {
        ...mockReminder,
        status: ReminderStatus.FAILED,
        notes: 'Email rebotado',
      };
      service.markFailed.mockResolvedValue(failedReminder);

      const result = await controller.markFailed('reminder-123', {
        notes: 'Email rebotado',
      });

      expect(result.status).toBe(ReminderStatus.FAILED);
      expect(result.notes).toBe('Email rebotado');
      expect(service.markFailed).toHaveBeenCalledWith(
        'reminder-123',
        'Email rebotado',
      );
    });

    it('should mark as failed without notes', async () => {
      const failedReminder = {
        ...mockReminder,
        status: ReminderStatus.FAILED,
      };
      service.markFailed.mockResolvedValue(failedReminder);

      const result = await controller.markFailed('reminder-123', {});

      expect(result.status).toBe(ReminderStatus.FAILED);
      expect(service.markFailed).toHaveBeenCalledWith(
        'reminder-123',
        undefined,
      );
    });
  });
});
