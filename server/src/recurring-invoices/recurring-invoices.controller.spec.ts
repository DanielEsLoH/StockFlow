/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await */
import { Test, TestingModule } from '@nestjs/testing';
import { RecurringInterval } from '@prisma/client';
import { RecurringInvoicesController } from './recurring-invoices.controller';
import { RecurringInvoicesService } from './recurring-invoices.service';

describe('RecurringInvoicesController', () => {
  let controller: RecurringInvoicesController;
  let service: jest.Mocked<RecurringInvoicesService>;

  const mockRecurring = {
    id: 'rec-123',
    tenantId: 'tenant-123',
    customerId: 'customer-123',
    warehouseId: null,
    notes: null,
    items: [{ productId: 'p-1', quantity: 1, unitPrice: 100, taxRate: 19 }],
    interval: RecurringInterval.MONTHLY,
    nextIssueDate: new Date('2026-03-01'),
    endDate: null,
    lastIssuedAt: null,
    autoSend: false,
    autoEmail: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    customer: { id: 'customer-123', name: 'Test', email: 'test@test.com' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecurringInvoicesController],
      providers: [
        {
          provide: RecurringInvoicesService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockRecurring),
            findAll: jest.fn().mockResolvedValue({
              data: [mockRecurring],
              meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
            }),
            findOne: jest.fn().mockResolvedValue(mockRecurring),
            update: jest.fn().mockResolvedValue(mockRecurring),
            toggle: jest
              .fn()
              .mockResolvedValue({ ...mockRecurring, isActive: false }),
            remove: jest
              .fn()
              .mockResolvedValue({ message: 'Factura recurrente desactivada' }),
          },
        },
      ],
    }).compile();

    controller = module.get<RecurringInvoicesController>(
      RecurringInvoicesController,
    );
    service = module.get(RecurringInvoicesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a recurring invoice', async () => {
      const dto = {
        customerId: 'customer-123',
        items: [{ productId: 'p-1', quantity: 1, unitPrice: 100, taxRate: 19 }],
        interval: RecurringInterval.MONTHLY,
        nextIssueDate: '2026-03-01',
      };

      const result = await controller.create(dto);
      expect(result).toEqual(mockRecurring);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return paginated results', async () => {
      const result = await controller.findAll(1, 20);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(service.findAll).toHaveBeenCalledWith(1, 20);
    });
  });

  describe('findOne', () => {
    it('should return a single recurring invoice', async () => {
      const result = await controller.findOne('rec-123');
      expect(result.id).toBe('rec-123');
      expect(service.findOne).toHaveBeenCalledWith('rec-123');
    });
  });

  describe('update', () => {
    it('should update a recurring invoice', async () => {
      const dto = { notes: 'Updated' };
      const result = await controller.update('rec-123', dto);
      expect(result).toEqual(mockRecurring);
      expect(service.update).toHaveBeenCalledWith('rec-123', dto);
    });
  });

  describe('toggle', () => {
    it('should toggle active state', async () => {
      const result = await controller.toggle('rec-123');
      expect(result.isActive).toBe(false);
      expect(service.toggle).toHaveBeenCalledWith('rec-123');
    });
  });

  describe('remove', () => {
    it('should deactivate a recurring invoice', async () => {
      const result = await controller.remove('rec-123');
      expect(result.message).toBe('Factura recurrente desactivada');
      expect(service.remove).toHaveBeenCalledWith('rec-123');
    });
  });
});
