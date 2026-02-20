import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JournalEntriesService } from './journal-entries.service';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';
import {
  JournalEntryStatus,
  JournalEntrySource,
  AccountingPeriodStatus,
} from '@prisma/client';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';

describe('JournalEntriesService', () => {
  let service: JournalEntriesService;
  let prismaService: jest.Mocked<PrismaService>;
  let tenantContextService: jest.Mocked<TenantContextService>;

  // Test data
  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-456';

  const mockLine1 = {
    id: 'line-1',
    accountId: 'acc-1',
    description: 'Debit line',
    debit: 100000,
    credit: 0,
    account: { code: '1105', name: 'Caja' },
  };

  const mockLine2 = {
    id: 'line-2',
    accountId: 'acc-2',
    description: 'Credit line',
    debit: 0,
    credit: 100000,
    account: { code: '4135', name: 'Ingresos' },
  };

  const mockEntry = {
    id: 'entry-1',
    tenantId: mockTenantId,
    entryNumber: 'CE-00001',
    date: new Date('2025-01-15'),
    description: 'Venta de mercancia',
    source: JournalEntrySource.MANUAL,
    status: JournalEntryStatus.DRAFT,
    periodId: 'period-1',
    invoiceId: null,
    paymentId: null,
    purchaseOrderId: null,
    stockMovementId: null,
    totalDebit: 100000,
    totalCredit: 100000,
    createdById: mockUserId,
    postedAt: null,
    voidedAt: null,
    voidReason: null,
    lines: [mockLine1, mockLine2],
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-15'),
  };

  const mockPostedEntry = {
    ...mockEntry,
    id: 'entry-2',
    entryNumber: 'CE-00002',
    status: JournalEntryStatus.POSTED,
    postedAt: new Date('2025-01-16'),
  };

  const mockVoidedEntry = {
    ...mockEntry,
    id: 'entry-3',
    entryNumber: 'CE-00003',
    status: JournalEntryStatus.VOIDED,
    voidedAt: new Date('2025-01-17'),
    voidReason: 'Error en registro',
  };

  const mockPeriod = {
    id: 'period-1',
    tenantId: mockTenantId,
    name: 'Enero 2025',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-01-31'),
    status: AccountingPeriodStatus.OPEN,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockPrismaService = {
      journalEntry: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      journalEntryLine: {
        groupBy: jest.fn(),
      },
      accountingPeriod: {
        findFirst: jest.fn(),
      },
      account: {
        findMany: jest.fn(),
      },
    };

    const mockTenantContextService = {
      getTenantId: jest.fn().mockReturnValue(mockTenantId),
      requireTenantId: jest.fn().mockReturnValue(mockTenantId),
      enforceLimit: jest.fn().mockResolvedValue(undefined),
      checkLimit: jest.fn().mockResolvedValue(true),
      getTenant: jest.fn().mockResolvedValue({
        id: mockTenantId,
        name: 'Test Tenant',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JournalEntriesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TenantContextService, useValue: mockTenantContextService },
      ],
    }).compile();

    service = module.get<JournalEntriesService>(JournalEntriesService);
    prismaService = module.get(PrismaService);
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
      expect(service).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // findAll
  // ---------------------------------------------------------------------------
  describe('findAll', () => {
    it('should return paginated journal entries with default params', async () => {
      (prismaService.journalEntry.findMany as jest.Mock).mockResolvedValue([mockEntry]);
      (prismaService.journalEntry.count as jest.Mock).mockResolvedValue(1);

      const result = await service.findAll();

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should calculate correct skip for page 2', async () => {
      (prismaService.journalEntry.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.journalEntry.count as jest.Mock).mockResolvedValue(25);

      const result = await service.findAll(2, 10);

      expect(prismaService.journalEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
      expect(result.meta.page).toBe(2);
      expect(result.meta.totalPages).toBe(3);
    });

    it('should return empty data when no entries exist', async () => {
      (prismaService.journalEntry.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.journalEntry.count as jest.Mock).mockResolvedValue(0);

      const result = await service.findAll();

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });

    it('should filter by source when provided', async () => {
      (prismaService.journalEntry.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.journalEntry.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(1, 20, JournalEntrySource.MANUAL);

      expect(prismaService.journalEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: mockTenantId,
            source: JournalEntrySource.MANUAL,
          }),
        }),
      );
    });

    it('should filter by status when provided', async () => {
      (prismaService.journalEntry.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.journalEntry.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(1, 20, undefined, JournalEntryStatus.POSTED);

      expect(prismaService.journalEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: mockTenantId,
            status: JournalEntryStatus.POSTED,
          }),
        }),
      );
    });

    it('should filter by fromDate when provided', async () => {
      (prismaService.journalEntry.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.journalEntry.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(1, 20, undefined, undefined, '2025-01-01');

      expect(prismaService.journalEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: { gte: new Date('2025-01-01') },
          }),
        }),
      );
    });

    it('should filter by toDate when provided', async () => {
      (prismaService.journalEntry.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.journalEntry.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(1, 20, undefined, undefined, undefined, '2025-01-31');

      expect(prismaService.journalEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: { lte: new Date('2025-01-31') },
          }),
        }),
      );
    });

    it('should filter by both fromDate and toDate when both provided', async () => {
      (prismaService.journalEntry.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.journalEntry.count as jest.Mock).mockResolvedValue(0);

      await service.findAll(1, 20, undefined, undefined, '2025-01-01', '2025-01-31');

      expect(prismaService.journalEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: {
              gte: new Date('2025-01-01'),
              lte: new Date('2025-01-31'),
            },
          }),
        }),
      );
    });

    it('should order entries by date descending', async () => {
      (prismaService.journalEntry.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.journalEntry.count as jest.Mock).mockResolvedValue(0);

      await service.findAll();

      expect(prismaService.journalEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { date: 'desc' } }),
      );
    });

    it('should require tenant context', async () => {
      (prismaService.journalEntry.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.journalEntry.count as jest.Mock).mockResolvedValue(0);

      await service.findAll();

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should map entries through mapToResponse with correct numeric conversions', async () => {
      (prismaService.journalEntry.findMany as jest.Mock).mockResolvedValue([mockEntry]);
      (prismaService.journalEntry.count as jest.Mock).mockResolvedValue(1);

      const result = await service.findAll();
      const entry = result.data[0];

      expect(entry.totalDebit).toBe(100000);
      expect(entry.totalCredit).toBe(100000);
      expect(entry.lines[0].debit).toBe(100000);
      expect(entry.lines[0].credit).toBe(0);
      expect(entry.lines[0].accountCode).toBe('1105');
      expect(entry.lines[0].accountName).toBe('Caja');
    });
  });

  // ---------------------------------------------------------------------------
  // findOne
  // ---------------------------------------------------------------------------
  describe('findOne', () => {
    it('should return a journal entry by id with lines', async () => {
      (prismaService.journalEntry.findFirst as jest.Mock).mockResolvedValue(mockEntry);

      const result = await service.findOne('entry-1');

      expect(result.id).toBe('entry-1');
      expect(result.entryNumber).toBe('CE-00001');
      expect(result.lines).toHaveLength(2);
      expect(prismaService.journalEntry.findFirst).toHaveBeenCalledWith({
        where: { id: 'entry-1', tenantId: mockTenantId },
        include: {
          lines: {
            include: {
              account: { select: { code: true, name: true } },
            },
          },
        },
      });
    });

    it('should throw NotFoundException when entry not found', async () => {
      (prismaService.journalEntry.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException with correct message', async () => {
      (prismaService.journalEntry.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        'Asiento contable con ID nonexistent no encontrado',
      );
    });

    it('should require tenant context', async () => {
      (prismaService.journalEntry.findFirst as jest.Mock).mockResolvedValue(mockEntry);

      await service.findOne('entry-1');

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should include all expected response fields', async () => {
      (prismaService.journalEntry.findFirst as jest.Mock).mockResolvedValue(mockEntry);

      const result = await service.findOne('entry-1');

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('entryNumber');
      expect(result).toHaveProperty('date');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('source');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('periodId');
      expect(result).toHaveProperty('invoiceId');
      expect(result).toHaveProperty('paymentId');
      expect(result).toHaveProperty('purchaseOrderId');
      expect(result).toHaveProperty('stockMovementId');
      expect(result).toHaveProperty('totalDebit');
      expect(result).toHaveProperty('totalCredit');
      expect(result).toHaveProperty('createdById');
      expect(result).toHaveProperty('postedAt');
      expect(result).toHaveProperty('voidedAt');
      expect(result).toHaveProperty('voidReason');
      expect(result).toHaveProperty('lines');
      expect(result).toHaveProperty('tenantId');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
    });
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  describe('create', () => {
    const validDto: CreateJournalEntryDto = {
      date: '2025-01-15',
      description: 'Venta de mercancia',
      periodId: 'period-1',
      lines: [
        { accountId: 'acc-1', description: 'Debit', debit: 100000, credit: 0 },
        { accountId: 'acc-2', description: 'Credit', debit: 0, credit: 100000 },
      ],
    };

    beforeEach(() => {
      // Default happy-path mocks
      (prismaService.accountingPeriod.findFirst as jest.Mock).mockResolvedValue(mockPeriod);
      (prismaService.account.findMany as jest.Mock).mockResolvedValue([
        { id: 'acc-1', tenantId: mockTenantId, isActive: true },
        { id: 'acc-2', tenantId: mockTenantId, isActive: true },
      ]);
      // generateEntryNumber: no existing entries
      (prismaService.journalEntry.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.journalEntry.create as jest.Mock).mockResolvedValue(mockEntry);
    });

    it('should create a manual journal entry as DRAFT', async () => {
      const result = await service.create(validDto, mockUserId);

      expect(result.id).toBe('entry-1');
      expect(result.status).toBe(JournalEntryStatus.DRAFT);
      expect(prismaService.journalEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: mockTenantId,
            source: JournalEntrySource.MANUAL,
            status: JournalEntryStatus.DRAFT,
            createdById: mockUserId,
          }),
        }),
      );
    });

    it('should auto-generate entry number CE-00001 when no entries exist', async () => {
      await service.create(validDto, mockUserId);

      expect(prismaService.journalEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            entryNumber: 'CE-00001',
          }),
        }),
      );
    });

    it('should increment entry number based on last existing entry', async () => {
      (prismaService.journalEntry.findFirst as jest.Mock).mockResolvedValue({
        entryNumber: 'CE-00042',
      });

      await service.create(validDto, mockUserId);

      expect(prismaService.journalEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            entryNumber: 'CE-00043',
          }),
        }),
      );
    });

    it('should create entry without userId when not provided', async () => {
      await service.create(validDto);

      expect(prismaService.journalEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            createdById: undefined,
          }),
        }),
      );
    });

    it('should throw BadRequestException when debits and credits are not balanced', async () => {
      const unbalancedDto: CreateJournalEntryDto = {
        ...validDto,
        lines: [
          { accountId: 'acc-1', debit: 100000, credit: 0 },
          { accountId: 'acc-2', debit: 0, credit: 50000 },
        ],
      };

      await expect(service.create(unbalancedDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException with unbalanced message including amounts', async () => {
      const unbalancedDto: CreateJournalEntryDto = {
        ...validDto,
        lines: [
          { accountId: 'acc-1', debit: 100000, credit: 0 },
          { accountId: 'acc-2', debit: 0, credit: 50000 },
        ],
      };

      await expect(service.create(unbalancedDto)).rejects.toThrow(
        'Los debitos ($100000.00) y creditos ($50000.00) no estan balanceados',
      );
    });

    it('should allow small rounding difference within 0.01 tolerance', async () => {
      const nearBalancedDto: CreateJournalEntryDto = {
        ...validDto,
        lines: [
          { accountId: 'acc-1', debit: 100000.005, credit: 0 },
          { accountId: 'acc-2', debit: 0, credit: 100000 },
        ],
      };

      await expect(service.create(nearBalancedDto)).resolves.toBeDefined();
    });

    it('should throw BadRequestException when a line has both debit and credit > 0', async () => {
      const bothValuesDto: CreateJournalEntryDto = {
        ...validDto,
        lines: [
          { accountId: 'acc-1', debit: 100000, credit: 100000 },
          { accountId: 'acc-2', debit: 0, credit: 0 },
        ],
      };

      await expect(service.create(bothValuesDto)).rejects.toThrow(
        'Cada linea debe tener debito o credito, no ambos',
      );
    });

    it('should throw BadRequestException when a line has both debit and credit equal to 0', async () => {
      const zeroLineDto: CreateJournalEntryDto = {
        ...validDto,
        lines: [
          { accountId: 'acc-1', debit: 100000, credit: 0 },
          { accountId: 'acc-2', debit: 0, credit: 100000 },
          { accountId: 'acc-3', debit: 0, credit: 0 },
        ],
      };

      await expect(service.create(zeroLineDto)).rejects.toThrow(
        'Cada linea debe tener un valor de debito o credito mayor a 0',
      );
    });

    it('should throw NotFoundException when period does not exist', async () => {
      (prismaService.accountingPeriod.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.create(validDto)).rejects.toThrow(NotFoundException);
      await expect(service.create(validDto)).rejects.toThrow(
        'Periodo contable no encontrado',
      );
    });

    it('should throw BadRequestException when period is CLOSED', async () => {
      (prismaService.accountingPeriod.findFirst as jest.Mock).mockResolvedValue({
        ...mockPeriod,
        status: AccountingPeriodStatus.CLOSED,
      });

      await expect(service.create(validDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(validDto)).rejects.toThrow(
        'No se pueden crear asientos en un periodo cerrado',
      );
    });

    it('should skip period validation when periodId is not provided', async () => {
      const dtoNoPeriod: CreateJournalEntryDto = {
        date: '2025-01-15',
        description: 'Sin periodo',
        lines: [
          { accountId: 'acc-1', debit: 100000, credit: 0 },
          { accountId: 'acc-2', debit: 0, credit: 100000 },
        ],
      };

      await service.create(dtoNoPeriod);

      expect(prismaService.accountingPeriod.findFirst).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when one or more accounts do not exist', async () => {
      (prismaService.account.findMany as jest.Mock).mockResolvedValue([
        { id: 'acc-1', tenantId: mockTenantId, isActive: true },
        // acc-2 is missing
      ]);

      await expect(service.create(validDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(validDto)).rejects.toThrow(
        'Una o mas cuentas no existen o estan inactivas',
      );
    });

    it('should deduplicate account IDs before validation', async () => {
      const duplicateAccountDto: CreateJournalEntryDto = {
        ...validDto,
        lines: [
          { accountId: 'acc-1', debit: 50000, credit: 0 },
          { accountId: 'acc-1', debit: 50000, credit: 0 },
          { accountId: 'acc-2', debit: 0, credit: 100000 },
        ],
      };
      (prismaService.account.findMany as jest.Mock).mockResolvedValue([
        { id: 'acc-1', tenantId: mockTenantId, isActive: true },
        { id: 'acc-2', tenantId: mockTenantId, isActive: true },
      ]);

      await service.create(duplicateAccountDto);

      expect(prismaService.account.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['acc-1', 'acc-2'] },
          tenantId: mockTenantId,
          isActive: true,
        },
      });
    });

    it('should create entry lines with correct data', async () => {
      await service.create(validDto, mockUserId);

      expect(prismaService.journalEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lines: {
              create: [
                { accountId: 'acc-1', description: 'Debit', debit: 100000, credit: 0 },
                { accountId: 'acc-2', description: 'Credit', debit: 0, credit: 100000 },
              ],
            },
          }),
        }),
      );
    });

    it('should log after successful creation', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await service.create(validDto, mockUserId);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Manual journal entry created'),
      );
    });

    it('should require tenant context', async () => {
      await service.create(validDto);

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // createAutoEntry
  // ---------------------------------------------------------------------------
  describe('createAutoEntry', () => {
    const autoParams = {
      tenantId: mockTenantId,
      date: new Date('2025-01-15'),
      description: 'Venta automatica',
      source: JournalEntrySource.INVOICE_SALE,
      invoiceId: 'inv-1',
      lines: [
        { accountId: 'acc-1', description: 'Debit', debit: 200000, credit: 0 },
        { accountId: 'acc-2', description: 'Credit', debit: 0, credit: 200000 },
      ],
    };

    const mockAutoEntry = {
      ...mockEntry,
      id: 'auto-entry-1',
      entryNumber: 'CE-00001',
      source: JournalEntrySource.INVOICE_SALE,
      status: JournalEntryStatus.POSTED,
      invoiceId: 'inv-1',
      totalDebit: 200000,
      totalCredit: 200000,
      postedAt: new Date(),
    };

    beforeEach(() => {
      (prismaService.accountingPeriod.findFirst as jest.Mock).mockResolvedValue(mockPeriod);
      (prismaService.journalEntry.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.journalEntry.create as jest.Mock).mockResolvedValue(mockAutoEntry);
    });

    it('should create an auto entry with POSTED status', async () => {
      const result = await service.createAutoEntry(autoParams);

      expect(result.status).toBe(JournalEntryStatus.POSTED);
      expect(prismaService.journalEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: JournalEntryStatus.POSTED,
            source: JournalEntrySource.INVOICE_SALE,
            postedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should find open period for the entry date', async () => {
      await service.createAutoEntry(autoParams);

      expect(prismaService.accountingPeriod.findFirst).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          status: AccountingPeriodStatus.OPEN,
          startDate: { lte: autoParams.date },
          endDate: { gte: autoParams.date },
        },
      });
    });

    it('should create entry without period when no open period found', async () => {
      (prismaService.accountingPeriod.findFirst as jest.Mock).mockResolvedValue(null);

      await service.createAutoEntry(autoParams);

      expect(prismaService.journalEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            periodId: undefined,
          }),
        }),
      );
    });

    it('should set period ID from found open period', async () => {
      await service.createAutoEntry(autoParams);

      expect(prismaService.journalEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            periodId: 'period-1',
          }),
        }),
      );
    });

    it('should throw BadRequestException when auto entry is unbalanced', async () => {
      const unbalanced = {
        ...autoParams,
        lines: [
          { accountId: 'acc-1', debit: 200000, credit: 0 },
          { accountId: 'acc-2', debit: 0, credit: 100000 },
        ],
      };

      await expect(service.createAutoEntry(unbalanced)).rejects.toThrow(BadRequestException);
      await expect(service.createAutoEntry(unbalanced)).rejects.toThrow(
        'Asiento automatico desbalanceado',
      );
    });

    it('should pass optional reference IDs (invoiceId, paymentId, etc.)', async () => {
      const paramsWithRefs = {
        ...autoParams,
        paymentId: 'pay-1',
        purchaseOrderId: 'po-1',
        stockMovementId: 'sm-1',
      };

      await service.createAutoEntry(paramsWithRefs);

      expect(prismaService.journalEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            invoiceId: 'inv-1',
            paymentId: 'pay-1',
            purchaseOrderId: 'po-1',
            stockMovementId: 'sm-1',
          }),
        }),
      );
    });

    it('should log after successful auto entry creation', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await service.createAutoEntry(autoParams);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Auto journal entry created'),
      );
    });

    it('should use tenantId from params (not from context) for auto entries', async () => {
      const paramsWithDifferentTenant = {
        ...autoParams,
        tenantId: 'other-tenant-999',
      };

      await service.createAutoEntry(paramsWithDifferentTenant);

      expect(prismaService.journalEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'other-tenant-999',
          }),
        }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // postEntry
  // ---------------------------------------------------------------------------
  describe('postEntry', () => {
    beforeEach(() => {
      (prismaService.journalEntry.findFirst as jest.Mock).mockResolvedValue(mockEntry);
      (prismaService.journalEntry.update as jest.Mock).mockResolvedValue({
        ...mockEntry,
        status: JournalEntryStatus.POSTED,
        postedAt: new Date(),
      });
    });

    it('should post a DRAFT entry successfully', async () => {
      const result = await service.postEntry('entry-1');

      expect(result.status).toBe(JournalEntryStatus.POSTED);
      expect(prismaService.journalEntry.update).toHaveBeenCalledWith({
        where: { id: 'entry-1' },
        data: {
          status: JournalEntryStatus.POSTED,
          postedAt: expect.any(Date),
        },
        include: {
          lines: {
            include: {
              account: { select: { code: true, name: true } },
            },
          },
        },
      });
    });

    it('should throw NotFoundException when entry not found', async () => {
      (prismaService.journalEntry.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.postEntry('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.postEntry('nonexistent')).rejects.toThrow(
        'Asiento contable con ID nonexistent no encontrado',
      );
    });

    it('should throw BadRequestException when entry is already POSTED', async () => {
      (prismaService.journalEntry.findFirst as jest.Mock).mockResolvedValue(mockPostedEntry);

      await expect(service.postEntry('entry-2')).rejects.toThrow(BadRequestException);
      await expect(service.postEntry('entry-2')).rejects.toThrow(
        'Solo se pueden publicar asientos en estado borrador',
      );
    });

    it('should throw BadRequestException when entry is VOIDED', async () => {
      (prismaService.journalEntry.findFirst as jest.Mock).mockResolvedValue(mockVoidedEntry);

      await expect(service.postEntry('entry-3')).rejects.toThrow(BadRequestException);
    });

    it('should require tenant context', async () => {
      await service.postEntry('entry-1');

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should log after successful posting', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await service.postEntry('entry-1');

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Journal entry posted'),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // voidEntry
  // ---------------------------------------------------------------------------
  describe('voidEntry', () => {
    const voidReason = 'Registrado por error';

    beforeEach(() => {
      (prismaService.journalEntry.findFirst as jest.Mock).mockResolvedValue(mockPostedEntry);
      (prismaService.journalEntry.update as jest.Mock).mockResolvedValue({
        ...mockPostedEntry,
        status: JournalEntryStatus.VOIDED,
        voidedAt: new Date(),
        voidReason,
      });
    });

    it('should void a POSTED entry successfully', async () => {
      const result = await service.voidEntry('entry-2', voidReason);

      expect(result.status).toBe(JournalEntryStatus.VOIDED);
      expect(result.voidReason).toBe(voidReason);
      expect(prismaService.journalEntry.update).toHaveBeenCalledWith({
        where: { id: 'entry-2' },
        data: {
          status: JournalEntryStatus.VOIDED,
          voidedAt: expect.any(Date),
          voidReason,
        },
        include: {
          lines: {
            include: {
              account: { select: { code: true, name: true } },
            },
          },
        },
      });
    });

    it('should void a DRAFT entry successfully', async () => {
      (prismaService.journalEntry.findFirst as jest.Mock).mockResolvedValue(mockEntry);
      (prismaService.journalEntry.update as jest.Mock).mockResolvedValue({
        ...mockEntry,
        status: JournalEntryStatus.VOIDED,
        voidedAt: new Date(),
        voidReason,
      });

      const result = await service.voidEntry('entry-1', voidReason);

      expect(result.status).toBe(JournalEntryStatus.VOIDED);
    });

    it('should throw NotFoundException when entry not found', async () => {
      (prismaService.journalEntry.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.voidEntry('nonexistent', voidReason)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.voidEntry('nonexistent', voidReason)).rejects.toThrow(
        'Asiento contable con ID nonexistent no encontrado',
      );
    });

    it('should throw BadRequestException when entry is already VOIDED', async () => {
      (prismaService.journalEntry.findFirst as jest.Mock).mockResolvedValue(mockVoidedEntry);

      await expect(service.voidEntry('entry-3', voidReason)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.voidEntry('entry-3', voidReason)).rejects.toThrow(
        'Este asiento ya esta anulado',
      );
    });

    it('should require tenant context', async () => {
      await service.voidEntry('entry-2', voidReason);

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });

    it('should log after successful voiding', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      await service.voidEntry('entry-2', voidReason);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Journal entry voided'),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // mapToResponse (tested indirectly through public methods)
  // ---------------------------------------------------------------------------
  describe('mapToResponse', () => {
    it('should convert Decimal-like totalDebit/totalCredit to numbers', async () => {
      const entryWithDecimals = {
        ...mockEntry,
        totalDebit: { toNumber: () => 100000 } as any,
        totalCredit: { toNumber: () => 100000 } as any,
      };
      (prismaService.journalEntry.findFirst as jest.Mock).mockResolvedValue(entryWithDecimals);

      const result = await service.findOne('entry-1');

      expect(typeof result.totalDebit).toBe('number');
      expect(typeof result.totalCredit).toBe('number');
    });

    it('should handle entry with no lines gracefully', async () => {
      const entryNoLines = { ...mockEntry, lines: undefined };
      (prismaService.journalEntry.findFirst as jest.Mock).mockResolvedValue(entryNoLines);

      const result = await service.findOne('entry-1');

      expect(result.lines).toEqual([]);
    });

    it('should handle line with missing account gracefully', async () => {
      const lineNoAccount = {
        id: 'line-x',
        accountId: 'acc-x',
        description: null,
        debit: 50000,
        credit: 0,
        account: null,
      };
      const entryMissingAccount = {
        ...mockEntry,
        lines: [lineNoAccount, mockLine2],
      };
      (prismaService.journalEntry.findFirst as jest.Mock).mockResolvedValue(entryMissingAccount);

      const result = await service.findOne('entry-1');

      expect(result.lines[0].accountCode).toBe('');
      expect(result.lines[0].accountName).toBe('');
    });
  });

  // ---------------------------------------------------------------------------
  // tenant isolation
  // ---------------------------------------------------------------------------
  describe('tenant isolation', () => {
    it('should scope findAll queries to tenant', async () => {
      (prismaService.journalEntry.findMany as jest.Mock).mockResolvedValue([]);
      (prismaService.journalEntry.count as jest.Mock).mockResolvedValue(0);

      await service.findAll();

      expect(prismaService.journalEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: mockTenantId }),
        }),
      );
      expect(prismaService.journalEntry.count).toHaveBeenCalledWith({
        where: expect.objectContaining({ tenantId: mockTenantId }),
      });
    });

    it('should scope findOne to tenant', async () => {
      (prismaService.journalEntry.findFirst as jest.Mock).mockResolvedValue(mockEntry);

      await service.findOne('entry-1');

      expect(prismaService.journalEntry.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'entry-1', tenantId: mockTenantId },
        }),
      );
    });

    it('should scope postEntry lookup to tenant', async () => {
      (prismaService.journalEntry.findFirst as jest.Mock).mockResolvedValue(mockEntry);
      (prismaService.journalEntry.update as jest.Mock).mockResolvedValue({
        ...mockEntry,
        status: JournalEntryStatus.POSTED,
      });

      await service.postEntry('entry-1');

      expect(prismaService.journalEntry.findFirst).toHaveBeenCalledWith({
        where: { id: 'entry-1', tenantId: mockTenantId },
      });
    });

    it('should scope voidEntry lookup to tenant', async () => {
      (prismaService.journalEntry.findFirst as jest.Mock).mockResolvedValue(mockPostedEntry);
      (prismaService.journalEntry.update as jest.Mock).mockResolvedValue({
        ...mockPostedEntry,
        status: JournalEntryStatus.VOIDED,
      });

      await service.voidEntry('entry-2', 'reason');

      expect(prismaService.journalEntry.findFirst).toHaveBeenCalledWith({
        where: { id: 'entry-2', tenantId: mockTenantId },
      });
    });

    it('should scope account validation to tenant in create', async () => {
      const dto: CreateJournalEntryDto = {
        date: '2025-01-15',
        description: 'Test',
        lines: [
          { accountId: 'acc-1', debit: 100000, credit: 0 },
          { accountId: 'acc-2', debit: 0, credit: 100000 },
        ],
      };
      (prismaService.account.findMany as jest.Mock).mockResolvedValue([
        { id: 'acc-1' },
        { id: 'acc-2' },
      ]);
      (prismaService.journalEntry.findFirst as jest.Mock).mockResolvedValue(null);
      (prismaService.journalEntry.create as jest.Mock).mockResolvedValue(mockEntry);

      await service.create(dto);

      expect(prismaService.account.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['acc-1', 'acc-2'] },
          tenantId: mockTenantId,
          isActive: true,
        },
      });
    });
  });
});
