import { Test, TestingModule } from '@nestjs/testing';
import {
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ExpenseCategory, ExpenseStatus } from '@prisma/client';
import { ExpensesService } from './expenses.service';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';
import { AccountingBridgeService } from '../accounting';

describe('ExpensesService', () => {
  let service: ExpensesService;
  let prisma: jest.Mocked<PrismaService>;
  let tenantContext: jest.Mocked<TenantContextService>;
  let accountingBridge: jest.Mocked<AccountingBridgeService>;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-123';

  const mockExpense = {
    id: 'expense-1',
    tenantId: mockTenantId,
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
    issueDate: new Date('2024-06-01'),
    dueDate: null,
    invoiceNumber: null,
    approvedAt: null,
    approvedById: null,
    createdById: mockUserId,
    notes: null,
    createdAt: new Date('2024-06-01'),
    updatedAt: new Date('2024-06-01'),
    supplier: { id: 'supplier-1', name: 'EPM', documentNumber: '890904996' },
    account: { id: 'account-1', code: '5135', name: 'Servicios' },
    costCenter: { id: 'cc-1', code: 'ADM', name: 'Administración' },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockPrismaService = {
      expense: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      supplier: {
        findFirst: jest.fn(),
      },
      account: {
        findFirst: jest.fn(),
      },
      costCenter: {
        findFirst: jest.fn(),
      },
      $transaction: jest
        .fn()
        .mockImplementation((fn: (tx: any) => any) => fn(mockPrismaService)),
    };

    const mockTenantContextService = {
      requireTenantId: jest.fn().mockReturnValue(mockTenantId),
    };

    const mockAccountingBridgeService = {
      onExpensePaid: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpensesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TenantContextService, useValue: mockTenantContextService },
        {
          provide: AccountingBridgeService,
          useValue: mockAccountingBridgeService,
        },
      ],
    }).compile();

    service = module.get<ExpensesService>(ExpensesService);
    prisma = module.get(PrismaService);
    tenantContext = module.get(TenantContextService);
    accountingBridge = module.get(AccountingBridgeService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('create', () => {
    const createDto = {
      category: ExpenseCategory.SERVICIOS_PUBLICOS,
      description: 'Pago energía',
      subtotal: 100000,
      taxRate: 19,
      supplierId: 'supplier-1',
      accountId: 'account-1',
      costCenterId: 'cc-1',
    };

    it('should create an expense with tax calculation', async () => {
      (prisma.supplier.findFirst as jest.Mock).mockResolvedValue({
        id: 'supplier-1',
      });
      (prisma.account.findFirst as jest.Mock).mockResolvedValue({
        id: 'account-1',
      });
      (prisma.costCenter.findFirst as jest.Mock).mockResolvedValue({
        id: 'cc-1',
      });
      (prisma.expense.findFirst as jest.Mock).mockResolvedValue(null); // no previous expenses
      (prisma.expense.create as jest.Mock).mockResolvedValue(mockExpense);

      const result = await service.create(createDto, mockUserId);

      expect(result.id).toBe('expense-1');
      expect(result.subtotal).toBe(100000);
      expect(result.tax).toBe(19000);
      expect(result.total).toBe(119000);
      expect(prisma.expense.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: mockTenantId,
            expenseNumber: 'GTO-00001',
            subtotal: 100000,
            taxRate: 19,
            tax: 19000,
            reteFuente: 0,
            total: 119000,
            status: ExpenseStatus.DRAFT,
            createdById: mockUserId,
          }),
        }),
      );
    });

    it('should calculate ReteFuente for HONORARIOS above threshold', async () => {
      const honorariosDto = {
        category: ExpenseCategory.HONORARIOS,
        description: 'Consultoría legal',
        subtotal: 600000, // above 523740 threshold
        taxRate: 0,
      };

      (prisma.expense.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.expense.create as jest.Mock).mockResolvedValue({
        ...mockExpense,
        category: ExpenseCategory.HONORARIOS,
        subtotal: 600000,
        tax: 0,
        reteFuente: 15000, // 600000 * 0.025
        total: 585000,
      });

      const result = await service.create(honorariosDto, mockUserId);

      expect(prisma.expense.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reteFuente: 15000,
            total: 585000,
          }),
        }),
      );
    });

    it('should NOT calculate ReteFuente for HONORARIOS below threshold', async () => {
      const honorariosDto = {
        category: ExpenseCategory.HONORARIOS,
        description: 'Consultoría menor',
        subtotal: 400000, // below 523740 threshold
        taxRate: 0,
      };

      (prisma.expense.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.expense.create as jest.Mock).mockResolvedValue({
        ...mockExpense,
        subtotal: 400000,
        tax: 0,
        reteFuente: 0,
        total: 400000,
      });

      await service.create(honorariosDto, mockUserId);

      expect(prisma.expense.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reteFuente: 0,
            total: 400000,
          }),
        }),
      );
    });

    it('should generate sequential expense number', async () => {
      (prisma.expense.findFirst as jest.Mock).mockResolvedValue({
        expenseNumber: 'GTO-00042',
      });
      (prisma.expense.create as jest.Mock).mockResolvedValue({
        ...mockExpense,
        expenseNumber: 'GTO-00043',
      });

      await service.create(
        {
          category: ExpenseCategory.SERVICIOS_PUBLICOS,
          description: 'Test',
          subtotal: 100,
        },
        mockUserId,
      );

      expect(prisma.expense.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            expenseNumber: 'GTO-00043',
          }),
        }),
      );
    });

    it('should throw NotFoundException when supplier not found', async () => {
      (prisma.supplier.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.create(createDto, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when account not found', async () => {
      (prisma.supplier.findFirst as jest.Mock).mockResolvedValue({
        id: 'supplier-1',
      });
      (prisma.account.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.create(createDto, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when cost center not found', async () => {
      (prisma.supplier.findFirst as jest.Mock).mockResolvedValue({
        id: 'supplier-1',
      });
      (prisma.account.findFirst as jest.Mock).mockResolvedValue({
        id: 'account-1',
      });
      (prisma.costCenter.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.create(createDto, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated expenses', async () => {
      (prisma.expense.findMany as jest.Mock).mockResolvedValue([mockExpense]);
      (prisma.expense.count as jest.Mock).mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should apply status filter', async () => {
      (prisma.expense.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.expense.count as jest.Mock).mockResolvedValue(0);

      await service.findAll({ status: ExpenseStatus.DRAFT });

      expect(prisma.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: ExpenseStatus.DRAFT }),
        }),
      );
    });

    it('should apply category filter', async () => {
      (prisma.expense.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.expense.count as jest.Mock).mockResolvedValue(0);

      await service.findAll({ category: ExpenseCategory.HONORARIOS });

      expect(prisma.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: ExpenseCategory.HONORARIOS,
          }),
        }),
      );
    });

    it('should apply search filter', async () => {
      (prisma.expense.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.expense.count as jest.Mock).mockResolvedValue(0);

      await service.findAll({ search: 'energía' });

      expect(prisma.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              {
                expenseNumber: {
                  contains: 'energía',
                  mode: 'insensitive',
                },
              },
              {
                description: { contains: 'energía', mode: 'insensitive' },
              },
            ],
          }),
        }),
      );
    });

    it('should apply date range filter', async () => {
      (prisma.expense.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.expense.count as jest.Mock).mockResolvedValue(0);

      await service.findAll({
        fromDate: '2024-01-01',
        toDate: '2024-12-31',
      });

      expect(prisma.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            issueDate: {
              gte: new Date('2024-01-01'),
              lte: new Date('2024-12-31'),
            },
          }),
        }),
      );
    });

    it('should return empty list with zero totalPages', async () => {
      (prisma.expense.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.expense.count as jest.Mock).mockResolvedValue(0);

      const result = await service.findAll();

      expect(result.data).toEqual([]);
      expect(result.meta.totalPages).toBe(0);
    });
  });

  describe('findOne', () => {
    it('should return an expense by id', async () => {
      (prisma.expense.findFirst as jest.Mock).mockResolvedValue(mockExpense);

      const result = await service.findOne('expense-1');

      expect(result.id).toBe('expense-1');
      expect(result.supplier).toEqual({
        id: 'supplier-1',
        name: 'EPM',
        documentNumber: '890904996',
      });
    });

    it('should throw NotFoundException when not found', async () => {
      (prisma.expense.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a DRAFT expense', async () => {
      (prisma.expense.findFirst as jest.Mock).mockResolvedValue(mockExpense);
      (prisma.expense.update as jest.Mock).mockResolvedValue({
        ...mockExpense,
        description: 'Updated',
      });

      const result = await service.update('expense-1', {
        description: 'Updated',
      });

      expect(result.description).toBe('Updated');
    });

    it('should recalculate amounts when subtotal changes', async () => {
      (prisma.expense.findFirst as jest.Mock).mockResolvedValue(mockExpense);
      (prisma.expense.update as jest.Mock).mockResolvedValue({
        ...mockExpense,
        subtotal: 200000,
        tax: 38000,
        total: 238000,
      });

      await service.update('expense-1', { subtotal: 200000 });

      expect(prisma.expense.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subtotal: 200000,
            tax: 200000 * 0.19,
            total: 200000 + 200000 * 0.19,
          }),
        }),
      );
    });

    it('should throw NotFoundException when not found', async () => {
      (prisma.expense.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update('nonexistent', { description: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException for non-DRAFT expense', async () => {
      (prisma.expense.findFirst as jest.Mock).mockResolvedValue({
        ...mockExpense,
        status: ExpenseStatus.APPROVED,
      });

      await expect(
        service.update('expense-1', { description: 'Test' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should validate supplier when updating supplierId', async () => {
      (prisma.expense.findFirst as jest.Mock).mockResolvedValue(mockExpense);
      (prisma.supplier.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update('expense-1', { supplierId: 'bad-supplier' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('approve', () => {
    it('should approve a DRAFT expense', async () => {
      (prisma.expense.findFirst as jest.Mock).mockResolvedValue(mockExpense);
      (prisma.expense.update as jest.Mock).mockResolvedValue({
        ...mockExpense,
        status: ExpenseStatus.APPROVED,
        approvedById: mockUserId,
      });

      const result = await service.approve('expense-1', mockUserId);

      expect(result.status).toBe(ExpenseStatus.APPROVED);
      expect(prisma.expense.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: ExpenseStatus.APPROVED,
            approvedById: mockUserId,
          }),
        }),
      );
    });

    it('should throw NotFoundException when not found', async () => {
      (prisma.expense.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.approve('nonexistent', mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException for non-DRAFT expense', async () => {
      (prisma.expense.findFirst as jest.Mock).mockResolvedValue({
        ...mockExpense,
        status: ExpenseStatus.APPROVED,
      });

      await expect(
        service.approve('expense-1', mockUserId),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('pay', () => {
    const payDto = {
      paymentMethod: 'BANK_TRANSFER',
      paymentReference: 'REF-001',
    };

    const approvedExpense = {
      ...mockExpense,
      status: ExpenseStatus.APPROVED,
    };

    it('should pay an APPROVED expense', async () => {
      (prisma.expense.findFirst as jest.Mock).mockResolvedValue(
        approvedExpense,
      );
      (prisma.expense.update as jest.Mock).mockResolvedValue({
        ...approvedExpense,
        status: ExpenseStatus.PAID,
        paymentMethod: 'BANK_TRANSFER',
        paymentReference: 'REF-001',
      });

      const result = await service.pay('expense-1', payDto);

      expect(result.status).toBe(ExpenseStatus.PAID);
      expect(prisma.expense.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: ExpenseStatus.PAID,
            paymentMethod: 'BANK_TRANSFER',
            paymentReference: 'REF-001',
          }),
        }),
      );
    });

    it('should call accountingBridge.onExpensePaid', async () => {
      (prisma.expense.findFirst as jest.Mock).mockResolvedValue(
        approvedExpense,
      );
      (prisma.expense.update as jest.Mock).mockResolvedValue({
        ...approvedExpense,
        status: ExpenseStatus.PAID,
      });

      await service.pay('expense-1', payDto);

      expect(accountingBridge.onExpensePaid).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: mockTenantId,
          expenseId: 'expense-1',
        }),
      );
    });

    it('should not throw if accountingBridge fails', async () => {
      (prisma.expense.findFirst as jest.Mock).mockResolvedValue(
        approvedExpense,
      );
      (prisma.expense.update as jest.Mock).mockResolvedValue({
        ...approvedExpense,
        status: ExpenseStatus.PAID,
      });
      (accountingBridge.onExpensePaid as jest.Mock).mockRejectedValue(
        new Error('Accounting error'),
      );

      // Should not throw - accounting errors are non-blocking
      const result = await service.pay('expense-1', payDto);
      expect(result.status).toBe(ExpenseStatus.PAID);
    });

    it('should throw NotFoundException when not found', async () => {
      (prisma.expense.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.pay('nonexistent', payDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException for non-APPROVED expense', async () => {
      (prisma.expense.findFirst as jest.Mock).mockResolvedValue(mockExpense);

      await expect(service.pay('expense-1', payDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('cancel', () => {
    it('should cancel a DRAFT expense', async () => {
      (prisma.expense.findFirst as jest.Mock).mockResolvedValue(mockExpense);
      (prisma.expense.update as jest.Mock).mockResolvedValue({
        ...mockExpense,
        status: ExpenseStatus.CANCELLED,
      });

      const result = await service.cancel('expense-1');

      expect(result.status).toBe(ExpenseStatus.CANCELLED);
    });

    it('should cancel an APPROVED expense', async () => {
      (prisma.expense.findFirst as jest.Mock).mockResolvedValue({
        ...mockExpense,
        status: ExpenseStatus.APPROVED,
      });
      (prisma.expense.update as jest.Mock).mockResolvedValue({
        ...mockExpense,
        status: ExpenseStatus.CANCELLED,
      });

      const result = await service.cancel('expense-1');

      expect(result.status).toBe(ExpenseStatus.CANCELLED);
    });

    it('should throw ConflictException for PAID expense', async () => {
      (prisma.expense.findFirst as jest.Mock).mockResolvedValue({
        ...mockExpense,
        status: ExpenseStatus.PAID,
      });

      await expect(service.cancel('expense-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException for already CANCELLED expense', async () => {
      (prisma.expense.findFirst as jest.Mock).mockResolvedValue({
        ...mockExpense,
        status: ExpenseStatus.CANCELLED,
      });

      await expect(service.cancel('expense-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException when not found', async () => {
      (prisma.expense.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.cancel('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete a DRAFT expense', async () => {
      (prisma.expense.findFirst as jest.Mock).mockResolvedValue(mockExpense);
      (prisma.expense.delete as jest.Mock).mockResolvedValue(mockExpense);

      await service.remove('expense-1');

      expect(prisma.expense.delete).toHaveBeenCalledWith({
        where: { id: 'expense-1' },
      });
    });

    it('should throw NotFoundException when not found', async () => {
      (prisma.expense.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException for non-DRAFT expense', async () => {
      (prisma.expense.findFirst as jest.Mock).mockResolvedValue({
        ...mockExpense,
        status: ExpenseStatus.APPROVED,
      });

      await expect(service.remove('expense-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('getStats', () => {
    it('should return expense statistics', async () => {
      (prisma.expense.findMany as jest.Mock)
        .mockResolvedValueOnce([
          // All expenses for status counts
          { status: ExpenseStatus.DRAFT },
          { status: ExpenseStatus.DRAFT },
          { status: ExpenseStatus.APPROVED },
          { status: ExpenseStatus.PAID },
          { status: ExpenseStatus.CANCELLED },
        ])
        .mockResolvedValueOnce([
          // Current month expenses for category totals
          { category: ExpenseCategory.SERVICIOS_PUBLICOS, total: 119000 },
          { category: ExpenseCategory.SERVICIOS_PUBLICOS, total: 50000 },
          { category: ExpenseCategory.HONORARIOS, total: 500000 },
        ]);

      const result = await service.getStats();

      expect(result.countsByStatus).toEqual({
        DRAFT: 2,
        APPROVED: 1,
        PAID: 1,
        CANCELLED: 1,
      });
      expect(result.totalsByCategory).toEqual({
        SERVICIOS_PUBLICOS: 169000,
        HONORARIOS: 500000,
      });
      expect(result.grandTotal).toBe(669000);
    });
  });
});
