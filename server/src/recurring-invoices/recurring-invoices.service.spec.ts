/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { RecurringInterval } from '@prisma/client';
import { RecurringInvoicesService } from './recurring-invoices.service';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';

describe('RecurringInvoicesService', () => {
  let service: RecurringInvoicesService;
  let prismaService: jest.Mocked<PrismaService>;
  let tenantContextService: jest.Mocked<TenantContextService>;

  const mockTenantId = 'tenant-123';
  const mockCustomerId = 'customer-123';

  const mockCustomer = {
    id: mockCustomerId,
    tenantId: mockTenantId,
    name: 'Cliente Test',
    email: 'cliente@test.com',
  };

  const mockItems = [
    {
      productId: 'product-1',
      quantity: 2,
      unitPrice: 100,
      taxRate: 19,
      discount: 0,
    },
  ];

  const mockRecurring = {
    id: 'rec-123',
    tenantId: mockTenantId,
    customerId: mockCustomerId,
    warehouseId: null,
    notes: null,
    items: mockItems,
    interval: RecurringInterval.MONTHLY,
    nextIssueDate: new Date('2026-03-01'),
    endDate: null,
    lastIssuedAt: null,
    autoSend: false,
    autoEmail: false,
    isActive: true,
    createdAt: new Date('2026-02-01'),
    updatedAt: new Date('2026-02-01'),
    customer: mockCustomer,
  };

  const mockPrisma = {
    customer: { findFirst: jest.fn() },
    recurringInvoice: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockTenantContext = {
    requireTenantId: jest.fn().mockReturnValue(mockTenantId),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecurringInvoicesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TenantContextService, useValue: mockTenantContext },
      ],
    }).compile();

    module.useLogger(false);

    service = module.get<RecurringInvoicesService>(RecurringInvoicesService);
    prismaService = module.get(PrismaService);
    tenantContextService = module.get(TenantContextService);

    jest.clearAllMocks();
    mockTenantContext.requireTenantId.mockReturnValue(mockTenantId);
  });

  describe('create', () => {
    const createDto = {
      customerId: mockCustomerId,
      items: mockItems,
      interval: RecurringInterval.MONTHLY,
      nextIssueDate: '2026-03-01',
    };

    it('should create a recurring invoice', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrisma.recurringInvoice.create.mockResolvedValue(mockRecurring);

      const result = await service.create(createDto);

      expect(result).toEqual(mockRecurring);
      expect(mockPrisma.customer.findFirst).toHaveBeenCalledWith({
        where: { id: mockCustomerId, tenantId: mockTenantId },
      });
      expect(mockPrisma.recurringInvoice.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: mockTenantId,
          customerId: mockCustomerId,
          interval: RecurringInterval.MONTHLY,
        }),
        include: { customer: true },
      });
    });

    it('should throw BadRequestException when customer not found', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should set autoSend and autoEmail defaults to false', async () => {
      mockPrisma.customer.findFirst.mockResolvedValue(mockCustomer);
      mockPrisma.recurringInvoice.create.mockResolvedValue(mockRecurring);

      await service.create(createDto);

      expect(mockPrisma.recurringInvoice.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          autoSend: false,
          autoEmail: false,
        }),
        include: { customer: true },
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated recurring invoices', async () => {
      mockPrisma.recurringInvoice.findMany.mockResolvedValue([mockRecurring]);
      mockPrisma.recurringInvoice.count.mockResolvedValue(1);

      const result = await service.findAll(1, 20);

      expect(result.data).toEqual([mockRecurring]);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should apply pagination correctly', async () => {
      mockPrisma.recurringInvoice.findMany.mockResolvedValue([]);
      mockPrisma.recurringInvoice.count.mockResolvedValue(25);

      const result = await service.findAll(2, 10);

      expect(mockPrisma.recurringInvoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
      expect(result.meta.totalPages).toBe(3);
    });

    it('should return 0 totalPages when no records', async () => {
      mockPrisma.recurringInvoice.findMany.mockResolvedValue([]);
      mockPrisma.recurringInvoice.count.mockResolvedValue(0);

      const result = await service.findAll(1, 20);
      expect(result.meta.totalPages).toBe(0);
    });
  });

  describe('findOne', () => {
    it('should return a recurring invoice with recent invoices', async () => {
      mockPrisma.recurringInvoice.findFirst.mockResolvedValue({
        ...mockRecurring,
        invoices: [],
      });

      const result = await service.findOne('rec-123');
      expect(result.id).toBe('rec-123');
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.recurringInvoice.findFirst.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a recurring invoice', async () => {
      const updated = { ...mockRecurring, notes: 'Updated notes' };
      mockPrisma.recurringInvoice.findFirst.mockResolvedValue(mockRecurring);
      mockPrisma.recurringInvoice.update.mockResolvedValue(updated);

      const result = await service.update('rec-123', { notes: 'Updated notes' });
      expect(result.notes).toBe('Updated notes');
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.recurringInvoice.findFirst.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { notes: 'test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update interval', async () => {
      mockPrisma.recurringInvoice.findFirst.mockResolvedValue(mockRecurring);
      mockPrisma.recurringInvoice.update.mockResolvedValue({
        ...mockRecurring,
        interval: RecurringInterval.WEEKLY,
      });

      await service.update('rec-123', {
        interval: RecurringInterval.WEEKLY,
      });

      expect(mockPrisma.recurringInvoice.update).toHaveBeenCalledWith({
        where: { id: 'rec-123' },
        data: expect.objectContaining({
          interval: RecurringInterval.WEEKLY,
        }),
        include: { customer: true },
      });
    });
  });

  describe('toggle', () => {
    it('should toggle isActive from true to false', async () => {
      mockPrisma.recurringInvoice.findFirst.mockResolvedValue(mockRecurring);
      mockPrisma.recurringInvoice.update.mockResolvedValue({
        ...mockRecurring,
        isActive: false,
      });

      const result = await service.toggle('rec-123');
      expect(result.isActive).toBe(false);
      expect(mockPrisma.recurringInvoice.update).toHaveBeenCalledWith({
        where: { id: 'rec-123' },
        data: { isActive: false },
        include: { customer: true },
      });
    });

    it('should toggle isActive from false to true', async () => {
      mockPrisma.recurringInvoice.findFirst.mockResolvedValue({
        ...mockRecurring,
        isActive: false,
      });
      mockPrisma.recurringInvoice.update.mockResolvedValue({
        ...mockRecurring,
        isActive: true,
      });

      const result = await service.toggle('rec-123');
      expect(result.isActive).toBe(true);
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.recurringInvoice.findFirst.mockResolvedValue(null);

      await expect(service.toggle('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should soft-delete by setting isActive to false', async () => {
      mockPrisma.recurringInvoice.findFirst.mockResolvedValue(mockRecurring);
      mockPrisma.recurringInvoice.update.mockResolvedValue({
        ...mockRecurring,
        isActive: false,
      });

      const result = await service.remove('rec-123');
      expect(result.message).toBe('Factura recurrente desactivada');
      expect(mockPrisma.recurringInvoice.update).toHaveBeenCalledWith({
        where: { id: 'rec-123' },
        data: { isActive: false },
      });
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.recurringInvoice.findFirst.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
