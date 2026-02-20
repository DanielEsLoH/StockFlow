import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { BankStatementStatus, ReconciliationStatus } from '@prisma/client';
import { BankStatementsService } from './bank-statements.service';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';

describe('BankStatementsService', () => {
  let service: BankStatementsService;
  let prismaService: jest.Mocked<PrismaService>;
  let tenantContextService: jest.Mocked<TenantContextService>;

  const mockTenantId = 'tenant-123';

  const mockBankAccount = {
    id: 'bank-account-1',
    tenantId: mockTenantId,
    name: 'Bancolombia Corriente',
  };

  const mockStatementLines = [
    {
      id: 'line-1',
      lineDate: new Date('2024-01-15'),
      description: 'Transferencia recibida',
      reference: 'REF-001',
      debit: 0,
      credit: 1500000,
      balance: 6500000,
      status: ReconciliationStatus.UNMATCHED,
      matchedJournalEntryId: null,
      matchedPaymentId: null,
      matchedAt: null,
    },
    {
      id: 'line-2',
      lineDate: new Date('2024-01-16'),
      description: 'Pago proveedor',
      reference: 'REF-002',
      debit: 500000,
      credit: 0,
      balance: 6000000,
      status: ReconciliationStatus.UNMATCHED,
      matchedJournalEntryId: null,
      matchedPaymentId: null,
      matchedAt: null,
    },
  ];

  const mockStatement = {
    id: 'statement-1',
    tenantId: mockTenantId,
    bankAccountId: 'bank-account-1',
    bankAccount: { name: 'Bancolombia Corriente' },
    fileName: 'extracto-enero-2024.xlsx',
    periodStart: new Date('2024-01-01'),
    periodEnd: new Date('2024-01-31'),
    status: BankStatementStatus.IMPORTED,
    totalLines: 2,
    matchedLines: 0,
    importedAt: new Date('2024-02-01'),
    importedById: 'user-1',
    reconciledAt: null,
    lines: mockStatementLines,
    createdAt: new Date('2024-02-01'),
  };

  const mockStatement2 = {
    ...mockStatement,
    id: 'statement-2',
    fileName: 'extracto-febrero-2024.xlsx',
    periodStart: new Date('2024-02-01'),
    periodEnd: new Date('2024-02-29'),
    lines: undefined,
  };

  const mockReconciledStatement = {
    ...mockStatement,
    id: 'statement-reconciled',
    status: BankStatementStatus.RECONCILED,
    matchedLines: 2,
    reconciledAt: new Date('2024-02-15'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockPrismaService = {
      bankStatement: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      bankAccount: {
        findFirst: jest.fn(),
      },
      bankStatementLine: {
        count: jest.fn(),
      },
    };

    const mockTenantContextService = {
      getTenantId: jest.fn().mockReturnValue(mockTenantId),
      requireTenantId: jest.fn().mockReturnValue(mockTenantId),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BankStatementsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TenantContextService, useValue: mockTenantContextService },
      ],
    }).compile();

    service = module.get<BankStatementsService>(BankStatementsService);
    prismaService = module.get(PrismaService);
    tenantContextService = module.get(TenantContextService);

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

  describe('findByBankAccount', () => {
    beforeEach(() => {
      (prismaService.bankStatement.findMany as jest.Mock).mockResolvedValue([
        mockStatement,
        mockStatement2,
      ]);
    });

    it('should return statements for a bank account', async () => {
      const result = await service.findByBankAccount('bank-account-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('statement-1');
    });

    it('should scope query to tenant and bank account', async () => {
      await service.findByBankAccount('bank-account-1');

      expect(prismaService.bankStatement.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId, bankAccountId: 'bank-account-1' },
        include: {
          bankAccount: { select: { name: true } },
        },
        orderBy: { periodStart: 'desc' },
      });
    });

    it('should order by periodStart descending', async () => {
      await service.findByBankAccount('bank-account-1');

      expect(prismaService.bankStatement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { periodStart: 'desc' },
        }),
      );
    });

    it('should map response with bankAccountName', async () => {
      const result = await service.findByBankAccount('bank-account-1');

      expect(result[0].bankAccountName).toBe('Bancolombia Corriente');
    });

    it('should calculate matchPercentage correctly', async () => {
      const partiallyMatched = {
        ...mockStatement,
        totalLines: 10,
        matchedLines: 3,
      };
      (prismaService.bankStatement.findMany as jest.Mock).mockResolvedValue([
        partiallyMatched,
      ]);

      const result = await service.findByBankAccount('bank-account-1');

      expect(result[0].matchPercentage).toBe(30);
    });

    it('should return 0 matchPercentage when totalLines is 0', async () => {
      const emptyStatement = {
        ...mockStatement,
        totalLines: 0,
        matchedLines: 0,
      };
      (prismaService.bankStatement.findMany as jest.Mock).mockResolvedValue([
        emptyStatement,
      ]);

      const result = await service.findByBankAccount('bank-account-1');

      expect(result[0].matchPercentage).toBe(0);
    });

    it('should require tenant context', async () => {
      await service.findByBankAccount('bank-account-1');

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a statement with lines', async () => {
      (prismaService.bankStatement.findFirst as jest.Mock).mockResolvedValue(
        mockStatement,
      );

      const result = await service.findOne('statement-1');

      expect(result.id).toBe('statement-1');
      expect(result.lines).toHaveLength(2);
    });

    it('should include lines ordered by lineDate ascending', async () => {
      (prismaService.bankStatement.findFirst as jest.Mock).mockResolvedValue(
        mockStatement,
      );

      await service.findOne('statement-1');

      expect(prismaService.bankStatement.findFirst).toHaveBeenCalledWith({
        where: { id: 'statement-1', tenantId: mockTenantId },
        include: {
          bankAccount: { select: { name: true } },
          lines: {
            orderBy: { lineDate: 'asc' },
          },
        },
      });
    });

    it('should map line debit and credit to numbers', async () => {
      (prismaService.bankStatement.findFirst as jest.Mock).mockResolvedValue(
        mockStatement,
      );

      const result = await service.findOne('statement-1');

      expect(typeof result.lines![0].credit).toBe('number');
      expect(typeof result.lines![1].debit).toBe('number');
    });

    it('should throw NotFoundException when not found', async () => {
      (prismaService.bankStatement.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException with correct message', async () => {
      (prismaService.bankStatement.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        'Extracto bancario con ID nonexistent no encontrado',
      );
    });

    it('should require tenant context', async () => {
      (prismaService.bankStatement.findFirst as jest.Mock).mockResolvedValue(
        mockStatement,
      );

      await service.findOne('statement-1');

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });
  });

  describe('importLines', () => {
    const importLines = [
      {
        lineDate: new Date('2024-01-15'),
        description: 'Transferencia recibida',
        reference: 'REF-001',
        debit: 0,
        credit: 1500000,
        balance: 6500000,
      },
      {
        lineDate: new Date('2024-01-16'),
        description: 'Pago proveedor',
        reference: 'REF-002',
        debit: 500000,
        credit: 0,
        balance: 6000000,
      },
    ];

    beforeEach(() => {
      (prismaService.bankAccount.findFirst as jest.Mock).mockResolvedValue(
        mockBankAccount,
      );
      (prismaService.bankStatement.create as jest.Mock).mockResolvedValue(
        mockStatement,
      );
    });

    it('should import statement with lines', async () => {
      const result = await service.importLines(
        'bank-account-1',
        'extracto-enero-2024.xlsx',
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        importLines,
        'user-1',
      );

      expect(result.id).toBe('statement-1');
      expect(result.fileName).toBe('extracto-enero-2024.xlsx');
    });

    it('should verify bank account exists', async () => {
      await service.importLines(
        'bank-account-1',
        'extracto.xlsx',
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        importLines,
      );

      expect(prismaService.bankAccount.findFirst).toHaveBeenCalledWith({
        where: { id: 'bank-account-1', tenantId: mockTenantId },
      });
    });

    it('should throw NotFoundException when bank account not found', async () => {
      (prismaService.bankAccount.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.importLines(
          'nonexistent',
          'extracto.xlsx',
          new Date('2024-01-01'),
          new Date('2024-01-31'),
          importLines,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException with correct message for missing bank account', async () => {
      (prismaService.bankAccount.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.importLines(
          'nonexistent',
          'extracto.xlsx',
          new Date('2024-01-01'),
          new Date('2024-01-31'),
          importLines,
        ),
      ).rejects.toThrow('Cuenta bancaria con ID nonexistent no encontrada');
    });

    it('should throw BadRequestException when lines array is empty', async () => {
      await expect(
        service.importLines(
          'bank-account-1',
          'extracto.xlsx',
          new Date('2024-01-01'),
          new Date('2024-01-31'),
          [],
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException with correct message for empty lines', async () => {
      await expect(
        service.importLines(
          'bank-account-1',
          'extracto.xlsx',
          new Date('2024-01-01'),
          new Date('2024-01-31'),
          [],
        ),
      ).rejects.toThrow('El archivo no contiene lineas para importar');
    });

    it('should create statement with all lines set to UNMATCHED', async () => {
      await service.importLines(
        'bank-account-1',
        'extracto.xlsx',
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        importLines,
        'user-1',
      );

      expect(prismaService.bankStatement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: mockTenantId,
            bankAccountId: 'bank-account-1',
            fileName: 'extracto.xlsx',
            totalLines: 2,
            matchedLines: 0,
            importedById: 'user-1',
            lines: {
              create: expect.arrayContaining([
                expect.objectContaining({
                  status: ReconciliationStatus.UNMATCHED,
                  description: 'Transferencia recibida',
                }),
                expect.objectContaining({
                  status: ReconciliationStatus.UNMATCHED,
                  description: 'Pago proveedor',
                }),
              ]),
            },
          }),
        }),
      );
    });

    it('should set totalLines to the number of imported lines', async () => {
      await service.importLines(
        'bank-account-1',
        'extracto.xlsx',
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        importLines,
      );

      expect(prismaService.bankStatement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalLines: 2,
          }),
        }),
      );
    });

    it('should accept optional userId', async () => {
      await service.importLines(
        'bank-account-1',
        'extracto.xlsx',
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        importLines,
      );

      expect(prismaService.bankStatement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            importedById: undefined,
          }),
        }),
      );
    });

    it('should require tenant context', async () => {
      await service.importLines(
        'bank-account-1',
        'extracto.xlsx',
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        importLines,
      );

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    beforeEach(() => {
      (prismaService.bankStatement.findFirst as jest.Mock).mockResolvedValue(
        mockStatement,
      );
      (prismaService.bankStatement.delete as jest.Mock).mockResolvedValue(
        mockStatement,
      );
    });

    it('should delete a statement', async () => {
      await service.delete('statement-1');

      expect(prismaService.bankStatement.delete).toHaveBeenCalledWith({
        where: { id: 'statement-1' },
      });
    });

    it('should throw NotFoundException when statement not found', async () => {
      (prismaService.bankStatement.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(service.delete('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException with correct message', async () => {
      (prismaService.bankStatement.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(service.delete('nonexistent')).rejects.toThrow(
        'Extracto bancario con ID nonexistent no encontrado',
      );
    });

    it('should throw BadRequestException when statement is RECONCILED', async () => {
      (prismaService.bankStatement.findFirst as jest.Mock).mockResolvedValue(
        mockReconciledStatement,
      );

      await expect(service.delete('statement-reconciled')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException with correct message for reconciled statement', async () => {
      (prismaService.bankStatement.findFirst as jest.Mock).mockResolvedValue(
        mockReconciledStatement,
      );

      await expect(service.delete('statement-reconciled')).rejects.toThrow(
        'No se puede eliminar un extracto ya conciliado',
      );
    });

    it('should scope lookup to tenant', async () => {
      await service.delete('statement-1');

      expect(prismaService.bankStatement.findFirst).toHaveBeenCalledWith({
        where: { id: 'statement-1', tenantId: mockTenantId },
      });
    });

    it('should require tenant context', async () => {
      await service.delete('statement-1');

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });
  });
});
