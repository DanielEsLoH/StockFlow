import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  ReconciliationStatus,
  BankStatementStatus,
  JournalEntryStatus,
} from '@prisma/client';
import { BankReconciliationService } from './bank-reconciliation.service';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';

describe('BankReconciliationService', () => {
  let service: BankReconciliationService;
  let prismaService: jest.Mocked<PrismaService>;
  let tenantContextService: jest.Mocked<TenantContextService>;

  const mockTenantId = 'tenant-123';

  const mockUnmatchedLine = {
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
    matchedById: null,
    statement: { tenantId: mockTenantId, id: 'statement-1', totalLines: 5 },
  };

  const mockDebitLine = {
    ...mockUnmatchedLine,
    id: 'line-2',
    description: 'Pago proveedor',
    debit: 500000,
    credit: 0,
  };

  const mockMatchedLine = {
    ...mockUnmatchedLine,
    id: 'line-matched',
    status: ReconciliationStatus.MATCHED,
    matchedJournalEntryId: 'je-1',
    matchedAt: new Date('2024-02-01'),
    statement: { tenantId: mockTenantId, id: 'statement-1' },
  };

  const mockManuallyMatchedLine = {
    ...mockUnmatchedLine,
    id: 'line-manual',
    status: ReconciliationStatus.MANUALLY_MATCHED,
    matchedJournalEntryId: 'je-2',
    matchedAt: new Date('2024-02-02'),
    matchedById: 'user-1',
    statement: { tenantId: mockTenantId, id: 'statement-1' },
  };

  const mockStatement = {
    id: 'statement-1',
    tenantId: mockTenantId,
    bankAccountId: 'bank-account-1',
    bankAccount: { accountId: 'puc-account-111001' },
    fileName: 'extracto-enero-2024.xlsx',
    status: BankStatementStatus.IMPORTED,
    totalLines: 5,
    matchedLines: 0,
    lines: [mockUnmatchedLine, mockDebitLine],
  };

  const mockReconciledStatement = {
    ...mockStatement,
    id: 'statement-reconciled',
    status: BankStatementStatus.RECONCILED,
    matchedLines: 5,
    reconciledAt: new Date('2024-02-15'),
  };

  const mockJournalEntry = {
    id: 'je-1',
    tenantId: mockTenantId,
    status: JournalEntryStatus.POSTED,
    date: new Date('2024-01-14'),
    description: 'Transferencia bancaria',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockPrismaService = {
      bankStatement: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      bankStatementLine: {
        findFirst: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      journalEntry: {
        findFirst: jest.fn(),
      },
    };

    const mockTenantContextService = {
      getTenantId: jest.fn().mockReturnValue(mockTenantId),
      requireTenantId: jest.fn().mockReturnValue(mockTenantId),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BankReconciliationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TenantContextService, useValue: mockTenantContextService },
      ],
    }).compile();

    service = module.get<BankReconciliationService>(BankReconciliationService);
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

  describe('autoMatch', () => {
    beforeEach(() => {
      (prismaService.bankStatement.findFirst as jest.Mock).mockResolvedValue(
        mockStatement,
      );
      (prismaService.journalEntry.findFirst as jest.Mock).mockResolvedValue(
        null,
      );
      (prismaService.bankStatementLine.count as jest.Mock).mockResolvedValue(0);
      (prismaService.bankStatement.update as jest.Mock).mockResolvedValue(
        mockStatement,
      );
      (prismaService.bankStatementLine.update as jest.Mock).mockResolvedValue(
        {},
      );
    });

    it('should return ReconciliationResult', async () => {
      const result = await service.autoMatch('statement-1');

      expect(result).toEqual(
        expect.objectContaining({
          statementId: 'statement-1',
          totalLines: 5,
          matchedLines: 0,
          matchPercentage: 0,
          newMatches: 0,
        }),
      );
    });

    it('should throw NotFoundException when statement not found', async () => {
      (prismaService.bankStatement.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(service.autoMatch('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException with correct message', async () => {
      (prismaService.bankStatement.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(service.autoMatch('nonexistent')).rejects.toThrow(
        'Extracto con ID nonexistent no encontrado',
      );
    });

    it('should throw BadRequestException when statement is already RECONCILED', async () => {
      (prismaService.bankStatement.findFirst as jest.Mock).mockResolvedValue(
        mockReconciledStatement,
      );

      await expect(
        service.autoMatch('statement-reconciled'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException with correct message for reconciled statement', async () => {
      (prismaService.bankStatement.findFirst as jest.Mock).mockResolvedValue(
        mockReconciledStatement,
      );

      await expect(
        service.autoMatch('statement-reconciled'),
      ).rejects.toThrow('Este extracto ya esta conciliado');
    });

    it('should only fetch UNMATCHED lines from statement', async () => {
      await service.autoMatch('statement-1');

      expect(prismaService.bankStatement.findFirst).toHaveBeenCalledWith({
        where: { id: 'statement-1', tenantId: mockTenantId },
        include: {
          bankAccount: { select: { accountId: true } },
          lines: {
            where: { status: ReconciliationStatus.UNMATCHED },
          },
        },
      });
    });

    it('should match a credit line with a journal entry debit', async () => {
      (prismaService.journalEntry.findFirst as jest.Mock).mockResolvedValue(
        mockJournalEntry,
      );
      (prismaService.bankStatementLine.count as jest.Mock).mockResolvedValue(2);

      const result = await service.autoMatch('statement-1');

      expect(result.newMatches).toBe(2);
      expect(prismaService.bankStatementLine.update).toHaveBeenCalledTimes(2);
    });

    it('should update matched line with MATCHED status and journal entry id', async () => {
      const statementWithOneLine = {
        ...mockStatement,
        lines: [mockUnmatchedLine],
      };
      (prismaService.bankStatement.findFirst as jest.Mock).mockResolvedValue(
        statementWithOneLine,
      );
      (prismaService.journalEntry.findFirst as jest.Mock).mockResolvedValue(
        mockJournalEntry,
      );
      (prismaService.bankStatementLine.count as jest.Mock).mockResolvedValue(1);

      await service.autoMatch('statement-1');

      expect(prismaService.bankStatementLine.update).toHaveBeenCalledWith({
        where: { id: 'line-1' },
        data: {
          status: ReconciliationStatus.MATCHED,
          matchedJournalEntryId: 'je-1',
          matchedAt: expect.any(Date),
        },
      });
    });

    it('should search journal entries within +-3 days date range', async () => {
      const statementWithOneLine = {
        ...mockStatement,
        lines: [mockUnmatchedLine],
      };
      (prismaService.bankStatement.findFirst as jest.Mock).mockResolvedValue(
        statementWithOneLine,
      );

      await service.autoMatch('statement-1');

      expect(prismaService.journalEntry.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: mockTenantId,
            status: JournalEntryStatus.POSTED,
            date: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          }),
        }),
      );

      const callArgs = (prismaService.journalEntry.findFirst as jest.Mock).mock
        .calls[0][0];
      const dateMin = callArgs.where.date.gte;
      const dateMax = callArgs.where.date.lte;
      const lineDate = new Date('2024-01-15');
      const expectedMin = new Date('2024-01-12');
      const expectedMax = new Date('2024-01-18');

      expect(dateMin.toISOString().slice(0, 10)).toBe(
        expectedMin.toISOString().slice(0, 10),
      );
      expect(dateMax.toISOString().slice(0, 10)).toBe(
        expectedMax.toISOString().slice(0, 10),
      );
    });

    it('should update statement counters after matching', async () => {
      (prismaService.bankStatementLine.count as jest.Mock).mockResolvedValue(3);

      await service.autoMatch('statement-1');

      expect(prismaService.bankStatement.update).toHaveBeenCalledWith({
        where: { id: 'statement-1' },
        data: expect.objectContaining({
          matchedLines: 3,
        }),
      });
    });

    it('should set status to PARTIALLY_RECONCILED when some lines matched', async () => {
      (prismaService.bankStatementLine.count as jest.Mock).mockResolvedValue(3);

      await service.autoMatch('statement-1');

      expect(prismaService.bankStatement.update).toHaveBeenCalledWith({
        where: { id: 'statement-1' },
        data: expect.objectContaining({
          status: BankStatementStatus.PARTIALLY_RECONCILED,
        }),
      });
    });

    it('should set status to RECONCILED when all lines matched', async () => {
      (prismaService.bankStatementLine.count as jest.Mock).mockResolvedValue(5);

      await service.autoMatch('statement-1');

      expect(prismaService.bankStatement.update).toHaveBeenCalledWith({
        where: { id: 'statement-1' },
        data: expect.objectContaining({
          status: BankStatementStatus.RECONCILED,
        }),
      });
    });

    it('should keep status as IMPORTED when no lines matched', async () => {
      (prismaService.bankStatementLine.count as jest.Mock).mockResolvedValue(0);

      await service.autoMatch('statement-1');

      expect(prismaService.bankStatement.update).toHaveBeenCalledWith({
        where: { id: 'statement-1' },
        data: expect.objectContaining({
          status: BankStatementStatus.IMPORTED,
        }),
      });
    });

    it('should require tenant context', async () => {
      await service.autoMatch('statement-1');

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });
  });

  describe('manualMatch', () => {
    beforeEach(() => {
      (prismaService.bankStatementLine.findFirst as jest.Mock).mockResolvedValue(
        mockUnmatchedLine,
      );
      (prismaService.journalEntry.findFirst as jest.Mock).mockResolvedValue(
        mockJournalEntry,
      );
      (prismaService.bankStatementLine.update as jest.Mock).mockResolvedValue(
        {},
      );
      (prismaService.bankStatementLine.count as jest.Mock).mockResolvedValue(1);
      (prismaService.bankStatement.findUnique as jest.Mock).mockResolvedValue({
        ...mockStatement,
        totalLines: 5,
      });
      (prismaService.bankStatement.update as jest.Mock).mockResolvedValue(
        mockStatement,
      );
    });

    it('should manually match a line to a journal entry', async () => {
      await service.manualMatch('line-1', 'je-1', 'user-1');

      expect(prismaService.bankStatementLine.update).toHaveBeenCalledWith({
        where: { id: 'line-1' },
        data: {
          status: ReconciliationStatus.MANUALLY_MATCHED,
          matchedJournalEntryId: 'je-1',
          matchedAt: expect.any(Date),
          matchedById: 'user-1',
        },
      });
    });

    it('should throw NotFoundException when line not found', async () => {
      (prismaService.bankStatementLine.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.manualMatch('nonexistent', 'je-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException with correct message for missing line', async () => {
      (prismaService.bankStatementLine.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.manualMatch('nonexistent', 'je-1', 'user-1'),
      ).rejects.toThrow('Linea de extracto no encontrada');
    });

    it('should throw NotFoundException when line belongs to different tenant', async () => {
      const otherTenantLine = {
        ...mockUnmatchedLine,
        statement: { tenantId: 'other-tenant', id: 'statement-1', totalLines: 5 },
      };
      (prismaService.bankStatementLine.findFirst as jest.Mock).mockResolvedValue(
        otherTenantLine,
      );

      await expect(
        service.manualMatch('line-1', 'je-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when line is not UNMATCHED', async () => {
      (prismaService.bankStatementLine.findFirst as jest.Mock).mockResolvedValue(
        mockMatchedLine,
      );

      await expect(
        service.manualMatch('line-matched', 'je-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException with correct message for already matched line', async () => {
      (prismaService.bankStatementLine.findFirst as jest.Mock).mockResolvedValue(
        mockMatchedLine,
      );

      await expect(
        service.manualMatch('line-matched', 'je-1', 'user-1'),
      ).rejects.toThrow('Esta linea ya esta conciliada');
    });

    it('should throw NotFoundException when journal entry not found', async () => {
      (prismaService.journalEntry.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.manualMatch('line-1', 'je-nonexistent', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException with correct message for missing journal entry', async () => {
      (prismaService.journalEntry.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(
        service.manualMatch('line-1', 'je-nonexistent', 'user-1'),
      ).rejects.toThrow('Asiento contable no encontrado o no esta publicado');
    });

    it('should verify journal entry is POSTED and belongs to tenant', async () => {
      await service.manualMatch('line-1', 'je-1', 'user-1');

      expect(prismaService.journalEntry.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'je-1',
          tenantId: mockTenantId,
          status: JournalEntryStatus.POSTED,
        },
      });
    });

    it('should require tenant context', async () => {
      await service.manualMatch('line-1', 'je-1', 'user-1');

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });
  });

  describe('unmatch', () => {
    beforeEach(() => {
      (prismaService.bankStatementLine.findFirst as jest.Mock).mockResolvedValue(
        mockMatchedLine,
      );
      (prismaService.bankStatementLine.update as jest.Mock).mockResolvedValue(
        {},
      );
      (prismaService.bankStatementLine.count as jest.Mock).mockResolvedValue(0);
      (prismaService.bankStatement.findUnique as jest.Mock).mockResolvedValue({
        ...mockStatement,
        totalLines: 5,
      });
      (prismaService.bankStatement.update as jest.Mock).mockResolvedValue(
        mockStatement,
      );
    });

    it('should reset a matched line to UNMATCHED', async () => {
      await service.unmatch('line-matched');

      expect(prismaService.bankStatementLine.update).toHaveBeenCalledWith({
        where: { id: 'line-matched' },
        data: {
          status: ReconciliationStatus.UNMATCHED,
          matchedJournalEntryId: null,
          matchedPaymentId: null,
          matchedAt: null,
          matchedById: null,
        },
      });
    });

    it('should unmatch a MANUALLY_MATCHED line', async () => {
      (prismaService.bankStatementLine.findFirst as jest.Mock).mockResolvedValue(
        mockManuallyMatchedLine,
      );

      await service.unmatch('line-manual');

      expect(prismaService.bankStatementLine.update).toHaveBeenCalledWith({
        where: { id: 'line-manual' },
        data: expect.objectContaining({
          status: ReconciliationStatus.UNMATCHED,
        }),
      });
    });

    it('should throw NotFoundException when line not found', async () => {
      (prismaService.bankStatementLine.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(service.unmatch('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException with correct message', async () => {
      (prismaService.bankStatementLine.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(service.unmatch('nonexistent')).rejects.toThrow(
        'Linea de extracto no encontrada',
      );
    });

    it('should throw NotFoundException when line belongs to different tenant', async () => {
      const otherTenantLine = {
        ...mockMatchedLine,
        statement: { tenantId: 'other-tenant', id: 'statement-1' },
      };
      (prismaService.bankStatementLine.findFirst as jest.Mock).mockResolvedValue(
        otherTenantLine,
      );

      await expect(service.unmatch('line-matched')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when line is already UNMATCHED', async () => {
      (prismaService.bankStatementLine.findFirst as jest.Mock).mockResolvedValue(
        mockUnmatchedLine,
      );

      await expect(service.unmatch('line-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException with correct message for unmatched line', async () => {
      (prismaService.bankStatementLine.findFirst as jest.Mock).mockResolvedValue(
        mockUnmatchedLine,
      );

      await expect(service.unmatch('line-1')).rejects.toThrow(
        'Esta linea no esta conciliada',
      );
    });

    it('should require tenant context', async () => {
      await service.unmatch('line-matched');

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });
  });

  describe('finalize', () => {
    beforeEach(() => {
      (prismaService.bankStatement.findFirst as jest.Mock).mockResolvedValue(
        mockStatement,
      );
      (prismaService.bankStatement.update as jest.Mock).mockResolvedValue({
        ...mockStatement,
        status: BankStatementStatus.RECONCILED,
      });
    });

    it('should set statement status to RECONCILED', async () => {
      await service.finalize('statement-1');

      expect(prismaService.bankStatement.update).toHaveBeenCalledWith({
        where: { id: 'statement-1' },
        data: {
          status: BankStatementStatus.RECONCILED,
          reconciledAt: expect.any(Date),
        },
      });
    });

    it('should throw NotFoundException when statement not found', async () => {
      (prismaService.bankStatement.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(service.finalize('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException with correct message', async () => {
      (prismaService.bankStatement.findFirst as jest.Mock).mockResolvedValue(
        null,
      );

      await expect(service.finalize('nonexistent')).rejects.toThrow(
        'Extracto con ID nonexistent no encontrado',
      );
    });

    it('should throw BadRequestException when statement is already RECONCILED', async () => {
      (prismaService.bankStatement.findFirst as jest.Mock).mockResolvedValue(
        mockReconciledStatement,
      );

      await expect(
        service.finalize('statement-reconciled'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException with correct message for reconciled statement', async () => {
      (prismaService.bankStatement.findFirst as jest.Mock).mockResolvedValue(
        mockReconciledStatement,
      );

      await expect(
        service.finalize('statement-reconciled'),
      ).rejects.toThrow('Este extracto ya esta conciliado');
    });

    it('should scope lookup to tenant', async () => {
      await service.finalize('statement-1');

      expect(prismaService.bankStatement.findFirst).toHaveBeenCalledWith({
        where: { id: 'statement-1', tenantId: mockTenantId },
      });
    });

    it('should require tenant context', async () => {
      await service.finalize('statement-1');

      expect(tenantContextService.requireTenantId).toHaveBeenCalled();
    });
  });
});
