import { Test, TestingModule } from '@nestjs/testing';
import { Logger, NotFoundException } from '@nestjs/common';
import { ExpenseCategory, ExpenseStatus } from '@prisma/client';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { JwtAuthGuard } from '../auth';
import { PermissionsGuard } from '../common';

describe('ExpensesController', () => {
  let controller: ExpensesController;
  let service: jest.Mocked<ExpensesService>;

  const mockUser = { userId: 'user-123', tenantId: 'tenant-123' } as any;

  const mockExpense = {
    id: 'expense-1',
    tenantId: 'tenant-123',
    expenseNumber: 'GTO-00001',
    category: ExpenseCategory.SERVICIOS_PUBLICOS,
    description: 'Pago energía',
    supplierId: 'supplier-1',
    accountId: 'account-1',
    costCenterId: 'cc-1',
    subtotal: 100000,
    taxRate: 19,
    tax: 19000,
    reteFuente: 0,
    total: 119000,
    status: ExpenseStatus.DRAFT,
    paymentMethod: null,
    paymentReference: null,
    paymentDate: null,
    issueDate: new Date(),
    dueDate: null,
    invoiceNumber: null,
    approvedAt: null,
    approvedById: null,
    createdById: 'user-123',
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPaginatedResponse = {
    data: [mockExpense],
    meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
  };

  const mockStats = {
    countsByStatus: {
      DRAFT: 2,
      APPROVED: 1,
      PAID: 3,
      CANCELLED: 0,
    } as Record<ExpenseStatus, number>,
    totalsByCategory: { SERVICIOS_PUBLICOS: 500000 },
    grandTotal: 500000,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      approve: jest.fn(),
      pay: jest.fn(),
      cancel: jest.fn(),
      remove: jest.fn(),
      getStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExpensesController],
      providers: [{ provide: ExpensesService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ExpensesController>(ExpensesController);
    service = module.get(ExpensesService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated expenses', async () => {
      service.findAll.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll({ page: 1, limit: 10 });

      expect(result).toEqual(mockPaginatedResponse);
      expect(service.findAll).toHaveBeenCalledWith({ page: 1, limit: 10 });
    });
  });

  describe('getStats', () => {
    it('should return expense statistics', async () => {
      service.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats();

      expect(result).toEqual(mockStats);
      expect(service.getStats).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return an expense by id', async () => {
      service.findOne.mockResolvedValue(mockExpense);

      const result = await controller.findOne('expense-1');

      expect(result).toEqual(mockExpense);
      expect(service.findOne).toHaveBeenCalledWith('expense-1');
    });

    it('should propagate NotFoundException', async () => {
      service.findOne.mockRejectedValue(new NotFoundException());

      await expect(controller.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create an expense with userId from CurrentUser', async () => {
      const dto = {
        category: ExpenseCategory.SERVICIOS_PUBLICOS,
        description: 'Test',
        subtotal: 100000,
      };
      service.create.mockResolvedValue(mockExpense);

      const result = await controller.create(dto, mockUser);

      expect(result).toEqual(mockExpense);
      expect(service.create).toHaveBeenCalledWith(dto, 'user-123');
    });
  });

  describe('update', () => {
    it('should update an expense', async () => {
      const dto = { description: 'Updated' };
      service.update.mockResolvedValue({ ...mockExpense, description: 'Updated' });

      const result = await controller.update('expense-1', dto);

      expect(result.description).toBe('Updated');
      expect(service.update).toHaveBeenCalledWith('expense-1', dto);
    });
  });

  describe('approve', () => {
    it('should approve an expense with userId from CurrentUser', async () => {
      service.approve.mockResolvedValue({
        ...mockExpense,
        status: ExpenseStatus.APPROVED,
      });

      const result = await controller.approve('expense-1', mockUser);

      expect(result.status).toBe(ExpenseStatus.APPROVED);
      expect(service.approve).toHaveBeenCalledWith('expense-1', 'user-123');
    });
  });

  describe('pay', () => {
    it('should pay an expense', async () => {
      const dto = { paymentMethod: 'CASH' };
      service.pay.mockResolvedValue({
        ...mockExpense,
        status: ExpenseStatus.PAID,
      });

      const result = await controller.pay('expense-1', dto);

      expect(result.status).toBe(ExpenseStatus.PAID);
      expect(service.pay).toHaveBeenCalledWith('expense-1', dto);
    });
  });

  describe('cancel', () => {
    it('should cancel an expense', async () => {
      service.cancel.mockResolvedValue({
        ...mockExpense,
        status: ExpenseStatus.CANCELLED,
      });

      const result = await controller.cancel('expense-1');

      expect(result.status).toBe(ExpenseStatus.CANCELLED);
      expect(service.cancel).toHaveBeenCalledWith('expense-1');
    });
  });

  describe('remove', () => {
    it('should delete an expense', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove('expense-1');

      expect(service.remove).toHaveBeenCalledWith('expense-1');
    });
  });
});
