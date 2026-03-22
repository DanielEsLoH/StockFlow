import { Test, TestingModule } from '@nestjs/testing';
import { Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { ExpenseCategory, ExpenseStatus, PaymentMethod } from '@prisma/client';
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
        groupBy: jest.fn(),
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
      $queryRaw: jest.fn().mockResolvedValue([]),
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
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([
        { expense_number: 'GTO-00042' },
      ]);
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

      await expect(service.approve('nonexistent', mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException for non-DRAFT expense', async () => {
      (prisma.expense.findFirst as jest.Mock).mockResolvedValue({
        ...mockExpense,
        status: ExpenseStatus.APPROVED,
      });

      await expect(service.approve('expense-1', mockUserId)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('pay', () => {
    const payDto = {
      paymentMethod: PaymentMethod.BANK_TRANSFER,
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
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        paymentReference: 'REF-001',
      });

      const result = await service.pay('expense-1', payDto);

      expect(result.status).toBe(ExpenseStatus.PAID);
      expect(prisma.expense.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: ExpenseStatus.PAID,
            paymentMethod: PaymentMethod.BANK_TRANSFER,
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
          id: 'expense-1',
          tenantId: mockTenantId,
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

  describe('update - additional branches', () => {
    it('should disconnect supplier when supplierId is empty string', async () => {
      (prisma.expense.findFirst as jest.Mock).mockResolvedValue(mockExpense);
      (prisma.expense.update as jest.Mock).mockResolvedValue({
        ...mockExpense,
        supplierId: null,
        supplier: null,
      });

      await service.update('expense-1', { supplierId: '' });

      expect(prisma.expense.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            supplier: { disconnect: true },
          }),
        }),
      );
    });

    it('should disconnect account when accountId is empty string', async () => {
      (prisma.expense.findFirst as jest.Mock).mockResolvedValue(mockExpense);
      (prisma.expense.update as jest.Mock).mockResolvedValue({
        ...mockExpense,
        accountId: null,
        account: null,
      });

      await service.update('expense-1', { accountId: '' });

      expect(prisma.expense.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            account: { disconnect: true },
          }),
        }),
      );
    });

    it('should disconnect cost center when costCenterId is empty string', async () => {
      (prisma.expense.findFirst as jest.Mock).mockResolvedValue(mockExpense);
      (prisma.expense.update as jest.Mock).mockResolvedValue({
        ...mockExpense,
        costCenterId: null,
        costCenter: null,
      });

      await service.update('expense-1', { costCenterId: '' });

      expect(prisma.expense.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            costCenter: { disconnect: true },
          }),
        }),
      );
    });

    it('should validate account when updating accountId', async () => {
      (prisma.expense.findFirst as jest.Mock).mockResolvedValue(mockExpense);
      (prisma.account.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update('expense-1', { accountId: 'bad-account' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should validate cost center when updating costCenterId', async () => {
      (prisma.expense.findFirst as jest.Mock).mockResolvedValue(mockExpense);
      (prisma.costCenter.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.update('expense-1', { costCenterId: 'bad-cc' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should connect valid account when updating accountId', async () => {
      (prisma.expense.findFirst as jest.Mock).mockResolvedValue(mockExpense);
      (prisma.account.findFirst as jest.Mock).mockResolvedValue({
        id: 'acc-2',
      });
      (prisma.expense.update as jest.Mock).mockResolvedValue({
        ...mockExpense,
        accountId: 'acc-2',
      });

      await service.update('expense-1', { accountId: 'acc-2' });

      expect(prisma.expense.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            account: { connect: { id: 'acc-2' } },
          }),
        }),
      );
    });

    it('should connect valid cost center when updating costCenterId', async () => {
      (prisma.expense.findFirst as jest.Mock).mockResolvedValue(mockExpense);
      (prisma.costCenter.findFirst as jest.Mock).mockResolvedValue({
        id: 'cc-2',
      });
      (prisma.expense.update as jest.Mock).mockResolvedValue({
        ...mockExpense,
        costCenterId: 'cc-2',
      });

      await service.update('expense-1', { costCenterId: 'cc-2' });

      expect(prisma.expense.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            costCenter: { connect: { id: 'cc-2' } },
          }),
        }),
      );
    });

    it('should connect valid supplier when updating supplierId', async () => {
      (prisma.expense.findFirst as jest.Mock).mockResolvedValue(mockExpense);
      (prisma.supplier.findFirst as jest.Mock).mockResolvedValue({
        id: 'sup-2',
      });
      (prisma.expense.update as jest.Mock).mockResolvedValue({
        ...mockExpense,
        supplierId: 'sup-2',
      });

      await service.update('expense-1', { supplierId: 'sup-2' });

      expect(prisma.expense.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            supplier: { connect: { id: 'sup-2' } },
          }),
        }),
      );
    });

    it('should update issueDate, dueDate, invoiceNumber, notes', async () => {
      (prisma.expense.findFirst as jest.Mock).mockResolvedValue(mockExpense);
      (prisma.expense.update as jest.Mock).mockResolvedValue({
        ...mockExpense,
        issueDate: new Date('2024-07-01'),
        dueDate: new Date('2024-08-01'),
        invoiceNumber: 'INV-999',
        notes: 'Updated notes',
      });

      await service.update('expense-1', {
        issueDate: new Date('2024-07-01'),
        dueDate: new Date('2024-08-01'),
        invoiceNumber: 'INV-999',
        notes: 'Updated notes',
      });

      expect(prisma.expense.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            issueDate: new Date('2024-07-01'),
            dueDate: new Date('2024-08-01'),
            invoiceNumber: 'INV-999',
            notes: 'Updated notes',
          }),
        }),
      );
    });

    it('should update paymentMethod, paymentReference, paymentDate', async () => {
      (prisma.expense.findFirst as jest.Mock).mockResolvedValue(mockExpense);
      (prisma.expense.update as jest.Mock).mockResolvedValue(mockExpense);

      await service.update('expense-1', {
        paymentMethod: PaymentMethod.CASH,
        paymentReference: 'REF-123',
        paymentDate: new Date('2024-06-15'),
      });

      expect(prisma.expense.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            paymentMethod: PaymentMethod.CASH,
            paymentReference: 'REF-123',
            paymentDate: new Date('2024-06-15'),
          }),
        }),
      );
    });

    it('should recalculate ReteFuente when category changes to HONORARIOS', async () => {
      const highSubtotalExpense = {
        ...mockExpense,
        subtotal: 600000,
        taxRate: 0,
      };
      (prisma.expense.findFirst as jest.Mock).mockResolvedValue(
        highSubtotalExpense,
      );
      (prisma.expense.update as jest.Mock).mockResolvedValue({
        ...highSubtotalExpense,
        category: ExpenseCategory.HONORARIOS,
        reteFuente: 15000,
      });

      await service.update('expense-1', {
        category: ExpenseCategory.HONORARIOS,
      });

      expect(prisma.expense.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reteFuente: 15000,
          }),
        }),
      );
    });

    it('should recalculate when taxRate changes', async () => {
      (prisma.expense.findFirst as jest.Mock).mockResolvedValue(mockExpense);
      (prisma.expense.update as jest.Mock).mockResolvedValue({
        ...mockExpense,
        taxRate: 5,
        tax: 5000,
        total: 105000,
      });

      await service.update('expense-1', { taxRate: 5 });

      expect(prisma.expense.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            taxRate: 5,
            tax: 100000 * 0.05,
            total: 100000 + 100000 * 0.05,
          }),
        }),
      );
    });
  });

  describe('findAll - additional filters', () => {
    it('should filter by supplierId', async () => {
      (prisma.expense.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.expense.count as jest.Mock).mockResolvedValue(0);

      await service.findAll({ supplierId: 'supplier-1' });

      expect(prisma.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ supplierId: 'supplier-1' }),
        }),
      );
    });

    it('should filter by fromDate only', async () => {
      (prisma.expense.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.expense.count as jest.Mock).mockResolvedValue(0);

      await service.findAll({ fromDate: '2024-01-01' });

      expect(prisma.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            issueDate: { gte: new Date('2024-01-01') },
          }),
        }),
      );
    });

    it('should filter by toDate only', async () => {
      (prisma.expense.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.expense.count as jest.Mock).mockResolvedValue(0);

      await service.findAll({ toDate: '2024-12-31' });

      expect(prisma.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            issueDate: { lte: new Date('2024-12-31') },
          }),
        }),
      );
    });
  });

  describe('create - no optional IDs', () => {
    it('should create expense without supplier, account, or costCenter', async () => {
      (prisma.expense.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.expense.create as jest.Mock).mockResolvedValue({
        ...mockExpense,
        supplierId: null,
        accountId: null,
        costCenterId: null,
        supplier: null,
        account: null,
        costCenter: null,
      });

      const result = await service.create(
        {
          category: ExpenseCategory.SERVICIOS_PUBLICOS,
          description: 'Simple expense',
          subtotal: 50000,
        },
        mockUserId,
      );

      expect(result.supplierId).toBeNull();
    });

    it('should create expense with default taxRate of 0', async () => {
      (prisma.expense.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.expense.create as jest.Mock).mockResolvedValue({
        ...mockExpense,
        taxRate: 0,
        tax: 0,
        total: 50000,
      });

      await service.create(
        {
          category: ExpenseCategory.SERVICIOS_PUBLICOS,
          description: 'No tax expense',
          subtotal: 50000,
        },
        mockUserId,
      );

      expect(prisma.expense.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            taxRate: 0,
            tax: 0,
            total: 50000,
          }),
        }),
      );
    });
  });

  describe('pay - additional cases', () => {
    it('should use current date when paymentDate not provided', async () => {
      const approvedExpense = {
        ...mockExpense,
        status: ExpenseStatus.APPROVED,
      };
      (prisma.expense.findFirst as jest.Mock).mockResolvedValue(
        approvedExpense,
      );
      (prisma.expense.update as jest.Mock).mockResolvedValue({
        ...approvedExpense,
        status: ExpenseStatus.PAID,
      });

      await service.pay('expense-1', {
        paymentMethod: PaymentMethod.CASH,
      });

      expect(prisma.expense.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            paymentDate: expect.any(Date),
            paymentReference: null,
          }),
        }),
      );
    });
  });

  describe('getStats', () => {
    it('should return expense statistics', async () => {
      (prisma.expense.groupBy as jest.Mock)
        .mockResolvedValueOnce([
          // Status aggregates
          {
            status: ExpenseStatus.DRAFT,
            _count: { status: 2 },
            _sum: { total: 200000 },
          },
          {
            status: ExpenseStatus.APPROVED,
            _count: { status: 1 },
            _sum: { total: 100000 },
          },
          {
            status: ExpenseStatus.PAID,
            _count: { status: 1 },
            _sum: { total: 300000 },
          },
          {
            status: ExpenseStatus.CANCELLED,
            _count: { status: 1 },
            _sum: { total: 50000 },
          },
        ])
        .mockResolvedValueOnce([
          // Category aggregates (current month)
          {
            category: ExpenseCategory.SERVICIOS_PUBLICOS,
            _sum: { total: 169000 },
          },
          { category: ExpenseCategory.HONORARIOS, _sum: { total: 500000 } },
        ]);

      const result = await service.getStats();

      expect(result.countsByStatus).toEqual({
        DRAFT: 2,
        APPROVED: 1,
        PAID: 1,
        CANCELLED: 1,
      });
      expect(result.totalsByStatus).toEqual({
        DRAFT: 200000,
        APPROVED: 100000,
        PAID: 300000,
        CANCELLED: 50000,
      });
      expect(result.totalsByCategory).toEqual({
        SERVICIOS_PUBLICOS: 169000,
        HONORARIOS: 500000,
      });
      expect(result.grandTotal).toBe(669000);
    });
  });
});
