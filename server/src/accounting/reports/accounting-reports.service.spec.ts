/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import {
  AccountType,
  AccountNature,
  JournalEntryStatus,
  JournalEntrySource,
  PaymentTerms,
} from '@prisma/client';
import { AccountingReportsService } from './accounting-reports.service';
import { PrismaService } from '../../prisma';
import { TenantContextService } from '../../common';

describe('AccountingReportsService', () => {
  let service: AccountingReportsService;
  let prismaService: jest.Mocked<PrismaService>;
  let tenantContextService: jest.Mocked<TenantContextService>;

  const mockTenantId = 'tenant-123';

  const mockAccounts = [
    { id: 'acc-caja', code: '1105', name: 'Caja', type: AccountType.ASSET, nature: AccountNature.DEBIT, level: 3, isActive: true, tenantId: mockTenantId },
    { id: 'acc-bank', code: '1110', name: 'Bancos', type: AccountType.ASSET, nature: AccountNature.DEBIT, level: 3, isActive: true, tenantId: mockTenantId },
    { id: 'acc-ar', code: '1305', name: 'Clientes', type: AccountType.ASSET, nature: AccountNature.DEBIT, level: 3, isActive: true, tenantId: mockTenantId },
    { id: 'acc-ap', code: '2205', name: 'Proveedores', type: AccountType.LIABILITY, nature: AccountNature.CREDIT, level: 3, isActive: true, tenantId: mockTenantId },
    { id: 'acc-revenue', code: '4135', name: 'Comercio', type: AccountType.REVENUE, nature: AccountNature.CREDIT, level: 3, isActive: true, tenantId: mockTenantId },
    { id: 'acc-cogs', code: '6135', name: 'CMV', type: AccountType.COGS, nature: AccountNature.DEBIT, level: 3, isActive: true, tenantId: mockTenantId },
    { id: 'acc-expense', code: '5105', name: 'Gastos', type: AccountType.EXPENSE, nature: AccountNature.DEBIT, level: 3, isActive: true, tenantId: mockTenantId },
    { id: 'acc-equity', code: '3105', name: 'Capital', type: AccountType.EQUITY, nature: AccountNature.CREDIT, level: 3, isActive: true, tenantId: mockTenantId },
  ];

  const mockPrismaService = {
    account: { findMany: jest.fn() },
    journalEntryLine: { groupBy: jest.fn(), findMany: jest.fn(), aggregate: jest.fn() },
    journalEntry: { findMany: jest.fn() },
    invoice: { findMany: jest.fn() },
    purchaseOrder: { findMany: jest.fn() },
    withholdingCertificate: { findMany: jest.fn() },
  };

  const mockTenantContextService = {
    requireTenantId: jest.fn().mockReturnValue(mockTenantId),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountingReportsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TenantContextService, useValue: mockTenantContextService },
      ],
    }).compile();

    service = module.get<AccountingReportsService>(AccountingReportsService);
    prismaService = module.get(PrismaService);
    tenantContextService = module.get(TenantContextService);

    jest.clearAllMocks();
    mockTenantContextService.requireTenantId.mockReturnValue(mockTenantId);
  });

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /** Shorthand to build a groupBy aggregation row for journalEntryLine.groupBy */
  function makeAggRow(accountId: string, debit: number, credit: number) {
    return { accountId, _sum: { debit, credit } };
  }

  /** Sets up calculateBalances stubs: account.findMany + journalEntryLine.groupBy */
  function stubCalculateBalances(
    accounts: typeof mockAccounts,
    aggregations: ReturnType<typeof makeAggRow>[],
  ) {
    mockPrismaService.account.findMany.mockResolvedValue(accounts);
    mockPrismaService.journalEntryLine.groupBy.mockResolvedValue(aggregations);
  }

  // ---------------------------------------------------------------------------
  // getTrialBalance
  // ---------------------------------------------------------------------------
  describe('getTrialBalance', () => {
    const asOfDate = new Date('2024-12-31');

    it('should return trial balance with correct date format', async () => {
      stubCalculateBalances(mockAccounts, [
        makeAggRow('acc-caja', 5000, 1000),
        makeAggRow('acc-ap', 0, 3000),
      ]);

      const result = await service.getTrialBalance(asOfDate);

      expect(result.asOfDate).toBe('2024-12-31');
    });

    it('should return only accounts with non-zero movement', async () => {
      stubCalculateBalances(mockAccounts, [
        makeAggRow('acc-caja', 5000, 1000),
      ]);

      const result = await service.getTrialBalance(asOfDate);

      expect(result.accounts).toHaveLength(1);
      expect(result.accounts[0].accountId).toBe('acc-caja');
    });

    it('should compute DEBIT nature balance as totalDebit - totalCredit', async () => {
      stubCalculateBalances(mockAccounts, [
        makeAggRow('acc-caja', 5000, 1000),
      ]);

      const result = await service.getTrialBalance(asOfDate);

      expect(result.accounts[0].balance).toBe(4000); // 5000 - 1000
      expect(result.accounts[0].nature).toBe(AccountNature.DEBIT);
    });

    it('should compute CREDIT nature balance as totalCredit - totalDebit', async () => {
      stubCalculateBalances(mockAccounts, [
        makeAggRow('acc-ap', 500, 3000),
      ]);

      const result = await service.getTrialBalance(asOfDate);

      expect(result.accounts[0].balance).toBe(2500); // 3000 - 500
      expect(result.accounts[0].nature).toBe(AccountNature.CREDIT);
    });

    it('should sum totalDebit and totalCredit across all accounts', async () => {
      stubCalculateBalances(mockAccounts, [
        makeAggRow('acc-caja', 5000, 1000),
        makeAggRow('acc-bank', 3000, 500),
        makeAggRow('acc-ap', 200, 4500),
      ]);

      const result = await service.getTrialBalance(asOfDate);

      expect(result.totalDebit).toBe(8200);   // 5000 + 3000 + 200
      expect(result.totalCredit).toBe(6000);   // 1000 + 500 + 4500
    });

    it('should return empty accounts when no movements exist', async () => {
      stubCalculateBalances(mockAccounts, []);

      const result = await service.getTrialBalance(asOfDate);

      expect(result.accounts).toHaveLength(0);
      expect(result.totalDebit).toBe(0);
      expect(result.totalCredit).toBe(0);
    });

    it('should handle null debit/credit in aggregation gracefully', async () => {
      stubCalculateBalances(mockAccounts, [
        { accountId: 'acc-caja', _sum: { debit: null, credit: null } } as any,
      ]);

      const result = await service.getTrialBalance(asOfDate);

      // null coalesced to 0, so 0-0 = 0, account filtered out because totalDebit and totalCredit are both 0
      expect(result.accounts).toHaveLength(0);
    });

    it('should call prisma with correct tenant and date filters', async () => {
      stubCalculateBalances([], []);

      await service.getTrialBalance(asOfDate);

      expect(mockPrismaService.account.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId, isActive: true },
        orderBy: { code: 'asc' },
      });
      expect(mockPrismaService.journalEntryLine.groupBy).toHaveBeenCalledWith({
        by: ['accountId'],
        where: {
          journalEntry: {
            tenantId: mockTenantId,
            status: JournalEntryStatus.POSTED,
            date: { lte: asOfDate },
          },
        },
        _sum: { debit: true, credit: true },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // getGeneralJournal
  // ---------------------------------------------------------------------------
  describe('getGeneralJournal', () => {
    const fromDate = new Date('2024-01-01');
    const toDate = new Date('2024-12-31');

    const mockEntries = [
      {
        id: 'entry-1',
        entryNumber: 'JE-001',
        date: new Date('2024-03-15'),
        description: 'Venta de mercancia',
        source: JournalEntrySource.MANUAL,
        totalDebit: 1000,
        totalCredit: 1000,
        lines: [
          {
            account: { code: '1105', name: 'Caja' },
            description: 'Ingreso por venta',
            debit: 1000,
            credit: 0,
          },
          {
            account: { code: '4135', name: 'Comercio' },
            description: null,
            debit: 0,
            credit: 1000,
          },
        ],
      },
    ];

    it('should return entries within the date range', async () => {
      mockPrismaService.journalEntry.findMany.mockResolvedValue(mockEntries);

      const result = await service.getGeneralJournal(fromDate, toDate);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].entryId).toBe('entry-1');
      expect(result.entries[0].entryNumber).toBe('JE-001');
    });

    it('should format fromDate and toDate as ISO date strings', async () => {
      mockPrismaService.journalEntry.findMany.mockResolvedValue([]);

      const result = await service.getGeneralJournal(fromDate, toDate);

      expect(result.fromDate).toBe('2024-01-01');
      expect(result.toDate).toBe('2024-12-31');
    });

    it('should map lines with account code, name, debit, and credit', async () => {
      mockPrismaService.journalEntry.findMany.mockResolvedValue(mockEntries);

      const result = await service.getGeneralJournal(fromDate, toDate);

      const lines = result.entries[0].lines;
      expect(lines).toHaveLength(2);
      expect(lines[0]).toEqual({
        accountCode: '1105',
        accountName: 'Caja',
        description: 'Ingreso por venta',
        debit: 1000,
        credit: 0,
      });
      expect(lines[1]).toEqual({
        accountCode: '4135',
        accountName: 'Comercio',
        description: null,
        debit: 0,
        credit: 1000,
      });
    });

    it('should accumulate total debits and credits across all entries', async () => {
      const twoEntries = [
        { ...mockEntries[0] },
        {
          id: 'entry-2',
          entryNumber: 'JE-002',
          date: new Date('2024-06-01'),
          description: 'Compra de inventario',
          source: JournalEntrySource.MANUAL,
          totalDebit: 500,
          totalCredit: 500,
          lines: [
            { account: { code: '6135', name: 'CMV' }, description: null, debit: 500, credit: 0 },
            { account: { code: '2205', name: 'Proveedores' }, description: null, debit: 0, credit: 500 },
          ],
        },
      ];
      mockPrismaService.journalEntry.findMany.mockResolvedValue(twoEntries);

      const result = await service.getGeneralJournal(fromDate, toDate);

      expect(result.totalDebit).toBe(1500);  // 1000 + 500
      expect(result.totalCredit).toBe(1500); // 1000 + 500
    });

    it('should return empty entries when no posted entries exist', async () => {
      mockPrismaService.journalEntry.findMany.mockResolvedValue([]);

      const result = await service.getGeneralJournal(fromDate, toDate);

      expect(result.entries).toHaveLength(0);
      expect(result.totalDebit).toBe(0);
      expect(result.totalCredit).toBe(0);
    });

    it('should query only POSTED entries for the correct tenant', async () => {
      mockPrismaService.journalEntry.findMany.mockResolvedValue([]);

      await service.getGeneralJournal(fromDate, toDate);

      expect(mockPrismaService.journalEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: mockTenantId,
            status: JournalEntryStatus.POSTED,
            date: { gte: fromDate, lte: toDate },
          },
        }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // getGeneralLedger
  // ---------------------------------------------------------------------------
  describe('getGeneralLedger', () => {
    const fromDate = new Date('2024-06-01');
    const toDate = new Date('2024-06-30');

    it('should compute opening balance from the day before fromDate', async () => {
      // Opening balances call (calculateBalances)
      mockPrismaService.account.findMany.mockResolvedValue(mockAccounts);
      mockPrismaService.journalEntryLine.groupBy.mockResolvedValue([
        makeAggRow('acc-caja', 10000, 2000),
      ]);
      // Period movements
      mockPrismaService.journalEntryLine.findMany.mockResolvedValue([
        {
          accountId: 'acc-caja',
          debit: 500,
          credit: 0,
          description: 'Deposito',
          journalEntry: { id: 'e1', entryNumber: 'JE-010', date: new Date('2024-06-15'), description: 'Deposito efectivo' },
        },
      ]);

      const result = await service.getGeneralLedger(fromDate, toDate);

      // The opening balance for a DEBIT account: 10000 - 2000 = 8000
      const cajaSection = result.accounts.find((a) => a.accountId === 'acc-caja');
      expect(cajaSection).toBeDefined();
      expect(cajaSection!.openingBalance).toBe(8000);
    });

    it('should compute running balance correctly for DEBIT nature accounts', async () => {
      mockPrismaService.account.findMany.mockResolvedValue(mockAccounts);
      mockPrismaService.journalEntryLine.groupBy.mockResolvedValue([
        makeAggRow('acc-caja', 10000, 2000), // opening: 8000
      ]);
      mockPrismaService.journalEntryLine.findMany.mockResolvedValue([
        {
          accountId: 'acc-caja',
          debit: 500,
          credit: 0,
          description: null,
          journalEntry: { id: 'e1', entryNumber: 'JE-010', date: new Date('2024-06-10'), description: 'Deposito' },
        },
        {
          accountId: 'acc-caja',
          debit: 0,
          credit: 300,
          description: 'Retiro',
          journalEntry: { id: 'e2', entryNumber: 'JE-011', date: new Date('2024-06-20'), description: 'Retiro de efectivo' },
        },
      ]);

      const result = await service.getGeneralLedger(fromDate, toDate);

      const cajaSection = result.accounts.find((a) => a.accountId === 'acc-caja')!;
      // DEBIT nature: running = opening + debit - credit per movement
      expect(cajaSection.movements[0].runningBalance).toBe(8500); // 8000 + 500 - 0
      expect(cajaSection.movements[1].runningBalance).toBe(8200); // 8500 + 0 - 300
      expect(cajaSection.closingBalance).toBe(8200);
    });

    it('should compute running balance correctly for CREDIT nature accounts', async () => {
      mockPrismaService.account.findMany.mockResolvedValue(mockAccounts);
      mockPrismaService.journalEntryLine.groupBy.mockResolvedValue([
        makeAggRow('acc-ap', 1000, 5000), // opening CREDIT: 5000 - 1000 = 4000
      ]);
      mockPrismaService.journalEntryLine.findMany.mockResolvedValue([
        {
          accountId: 'acc-ap',
          debit: 0,
          credit: 2000,
          description: null,
          journalEntry: { id: 'e1', entryNumber: 'JE-010', date: new Date('2024-06-05'), description: 'Compra a credito' },
        },
        {
          accountId: 'acc-ap',
          debit: 800,
          credit: 0,
          description: null,
          journalEntry: { id: 'e2', entryNumber: 'JE-011', date: new Date('2024-06-25'), description: 'Pago a proveedor' },
        },
      ]);

      const result = await service.getGeneralLedger(fromDate, toDate);

      const apSection = result.accounts.find((a) => a.accountId === 'acc-ap')!;
      // CREDIT nature: running = opening + credit - debit per movement
      expect(apSection.openingBalance).toBe(4000);
      expect(apSection.movements[0].runningBalance).toBe(6000); // 4000 + 2000 - 0
      expect(apSection.movements[1].runningBalance).toBe(5200); // 6000 + 0 - 800
      expect(apSection.closingBalance).toBe(5200);
    });

    it('should exclude accounts with no movements when no accountId filter', async () => {
      mockPrismaService.account.findMany.mockResolvedValue(mockAccounts);
      mockPrismaService.journalEntryLine.groupBy.mockResolvedValue([]);
      mockPrismaService.journalEntryLine.findMany.mockResolvedValue([]);

      const result = await service.getGeneralLedger(fromDate, toDate);

      expect(result.accounts).toHaveLength(0);
    });

    it('should include account with no movements when accountId is specified', async () => {
      const singleAccount = [mockAccounts[0]]; // acc-caja
      mockPrismaService.account.findMany.mockResolvedValue(singleAccount);
      mockPrismaService.journalEntryLine.groupBy.mockResolvedValue([]);
      mockPrismaService.journalEntryLine.findMany.mockResolvedValue([]);

      const result = await service.getGeneralLedger(fromDate, toDate, 'acc-caja');

      // When accountId is specified, account is included even with no movements
      expect(result.accounts).toHaveLength(1);
      expect(result.accounts[0].accountId).toBe('acc-caja');
      expect(result.accounts[0].openingBalance).toBe(0);
      expect(result.accounts[0].closingBalance).toBe(0);
      expect(result.accounts[0].movements).toHaveLength(0);
    });

    it('should use line description when available, falling back to entry description', async () => {
      mockPrismaService.account.findMany.mockResolvedValue(mockAccounts);
      mockPrismaService.journalEntryLine.groupBy.mockResolvedValue([]);
      mockPrismaService.journalEntryLine.findMany.mockResolvedValue([
        {
          accountId: 'acc-caja',
          debit: 100,
          credit: 0,
          description: 'Linea especifica',
          journalEntry: { id: 'e1', entryNumber: 'JE-020', date: new Date('2024-06-10'), description: 'Descripcion general' },
        },
        {
          accountId: 'acc-caja',
          debit: 200,
          credit: 0,
          description: null,
          journalEntry: { id: 'e2', entryNumber: 'JE-021', date: new Date('2024-06-11'), description: 'Otra descripcion' },
        },
      ]);

      const result = await service.getGeneralLedger(fromDate, toDate);

      const cajaSection = result.accounts.find((a) => a.accountId === 'acc-caja')!;
      expect(cajaSection.movements[0].description).toBe('Linea especifica');
      expect(cajaSection.movements[1].description).toBe('Otra descripcion');
    });

    it('should filter account.findMany by accountId when provided', async () => {
      mockPrismaService.account.findMany.mockResolvedValue([mockAccounts[0]]);
      mockPrismaService.journalEntryLine.groupBy.mockResolvedValue([]);
      mockPrismaService.journalEntryLine.findMany.mockResolvedValue([]);

      await service.getGeneralLedger(fromDate, toDate, 'acc-caja');

      expect(mockPrismaService.account.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: mockTenantId, isActive: true, id: 'acc-caja' },
        }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // getBalanceSheet
  // ---------------------------------------------------------------------------
  describe('getBalanceSheet', () => {
    const asOfDate = new Date('2024-12-31');

    it('should separate accounts into assets, liabilities, and equity sections', async () => {
      stubCalculateBalances(mockAccounts, [
        makeAggRow('acc-caja', 10000, 0),
        makeAggRow('acc-ap', 0, 3000),
        makeAggRow('acc-equity', 0, 5000),
        makeAggRow('acc-revenue', 0, 4000),
        makeAggRow('acc-cogs', 1000, 0),
        makeAggRow('acc-expense', 500, 0),
      ]);

      const result = await service.getBalanceSheet(asOfDate);

      expect(result.assets.accounts.some((a) => a.accountId === 'acc-caja')).toBe(true);
      expect(result.liabilities.accounts.some((a) => a.accountId === 'acc-ap')).toBe(true);
      // Equity section includes the actual equity accounts plus net income synthetic row
      expect(result.equity.accounts.some((a) => a.accountId === 'acc-equity')).toBe(true);
    });

    it('should calculate netIncome as revenue - cogs - expenses and add to equity', async () => {
      stubCalculateBalances(mockAccounts, [
        makeAggRow('acc-caja', 10000, 0),
        makeAggRow('acc-equity', 0, 5000),
        makeAggRow('acc-revenue', 0, 4000),   // balance = 4000 (CREDIT nature)
        makeAggRow('acc-cogs', 1000, 0),       // balance = 1000 (DEBIT nature)
        makeAggRow('acc-expense', 500, 0),     // balance = 500 (DEBIT nature)
      ]);

      const result = await service.getBalanceSheet(asOfDate);

      // netIncome = 4000 - 1000 - 500 = 2500
      const netIncomeRow = result.equity.accounts.find(
        (a) => a.name === 'Utilidad del ejercicio',
      );
      expect(netIncomeRow).toBeDefined();
      expect(netIncomeRow!.balance).toBe(2500);
    });

    it('should satisfy the accounting equation: Assets = Liabilities + Equity', async () => {
      // Balanced journal entries:
      // Caja debit 10000 (asset +10000)
      // Capital credit 5000 (equity +5000)
      // Revenue credit 8000 (revenue +8000)
      // COGS debit 2000 (cogs +2000)
      // Expenses debit 1000 (expenses +1000)
      // Proveedores credit 3000 (liability +3000)
      // Clientes debit 3000 (asset +3000)
      // netIncome = 8000 - 2000 - 1000 = 5000
      // Assets = 10000 + 3000 = 13000
      // Liabilities + Equity = 3000 + 5000 + 5000 = 13000
      stubCalculateBalances(mockAccounts, [
        makeAggRow('acc-caja', 10000, 0),
        makeAggRow('acc-ar', 3000, 0),
        makeAggRow('acc-ap', 0, 3000),
        makeAggRow('acc-equity', 0, 5000),
        makeAggRow('acc-revenue', 0, 8000),
        makeAggRow('acc-cogs', 2000, 0),
        makeAggRow('acc-expense', 1000, 0),
      ]);

      const result = await service.getBalanceSheet(asOfDate);

      expect(result.totalAssets).toBe(13000);
      expect(result.totalLiabilitiesAndEquity).toBe(13000);
      expect(result.totalAssets).toBe(result.totalLiabilitiesAndEquity);
    });

    it('should use correct section titles in Spanish', async () => {
      stubCalculateBalances(mockAccounts, []);

      const result = await service.getBalanceSheet(asOfDate);

      expect(result.assets.title).toBe('Activos');
      expect(result.liabilities.title).toBe('Pasivos');
      expect(result.equity.title).toBe('Patrimonio');
    });

    it('should return zeros when there are no movements', async () => {
      stubCalculateBalances(mockAccounts, []);

      const result = await service.getBalanceSheet(asOfDate);

      expect(result.totalAssets).toBe(0);
      expect(result.totalLiabilitiesAndEquity).toBe(0);
      expect(result.assets.accounts).toHaveLength(0);
      expect(result.liabilities.accounts).toHaveLength(0);
      // Equity always has the net income synthetic row
      expect(result.equity.accounts).toHaveLength(1);
      expect(result.equity.accounts[0].name).toBe('Utilidad del ejercicio');
      expect(result.equity.accounts[0].balance).toBe(0);
    });

    it('should handle negative net income (loss)', async () => {
      stubCalculateBalances(mockAccounts, [
        makeAggRow('acc-caja', 5000, 0),
        makeAggRow('acc-equity', 0, 7000),
        makeAggRow('acc-revenue', 0, 1000),   // revenue = 1000
        makeAggRow('acc-cogs', 800, 0),        // cogs = 800
        makeAggRow('acc-expense', 1500, 0),    // expenses = 1500
        makeAggRow('acc-ap', 0, 500),
      ]);

      const result = await service.getBalanceSheet(asOfDate);

      // netIncome = 1000 - 800 - 1500 = -1300
      const netIncomeRow = result.equity.accounts.find(
        (a) => a.name === 'Utilidad del ejercicio',
      );
      expect(netIncomeRow!.balance).toBe(-1300);
      // totalEquity = 7000 + (-1300) = 5700
      expect(result.equity.total).toBe(5700);
    });
  });

  // ---------------------------------------------------------------------------
  // getIncomeStatement
  // ---------------------------------------------------------------------------
  describe('getIncomeStatement', () => {
    const fromDate = new Date('2024-01-01');
    const toDate = new Date('2024-12-31');

    it('should separate revenue, COGS, and expense accounts', async () => {
      stubCalculateBalances(mockAccounts, [
        makeAggRow('acc-revenue', 0, 10000),
        makeAggRow('acc-cogs', 3000, 0),
        makeAggRow('acc-expense', 2000, 0),
      ]);

      const result = await service.getIncomeStatement(fromDate, toDate);

      expect(result.revenue.accounts).toHaveLength(1);
      expect(result.revenue.accounts[0].accountId).toBe('acc-revenue');
      expect(result.cogs.accounts).toHaveLength(1);
      expect(result.cogs.accounts[0].accountId).toBe('acc-cogs');
      expect(result.expenses.accounts).toHaveLength(1);
      expect(result.expenses.accounts[0].accountId).toBe('acc-expense');
    });

    it('should calculate grossProfit as revenue - COGS', async () => {
      stubCalculateBalances(mockAccounts, [
        makeAggRow('acc-revenue', 0, 10000),
        makeAggRow('acc-cogs', 3000, 0),
        makeAggRow('acc-expense', 2000, 0),
      ]);

      const result = await service.getIncomeStatement(fromDate, toDate);

      expect(result.revenue.total).toBe(10000);
      expect(result.cogs.total).toBe(3000);
      expect(result.grossProfit).toBe(7000); // 10000 - 3000
    });

    it('should calculate netIncome as grossProfit - expenses', async () => {
      stubCalculateBalances(mockAccounts, [
        makeAggRow('acc-revenue', 0, 10000),
        makeAggRow('acc-cogs', 3000, 0),
        makeAggRow('acc-expense', 2000, 0),
      ]);

      const result = await service.getIncomeStatement(fromDate, toDate);

      expect(result.netIncome).toBe(5000); // 7000 - 2000
    });

    it('should use correct section titles in Spanish', async () => {
      stubCalculateBalances(mockAccounts, []);

      const result = await service.getIncomeStatement(fromDate, toDate);

      expect(result.revenue.title).toBe('Ingresos');
      expect(result.cogs.title).toBe('Costo de Ventas');
      expect(result.expenses.title).toBe('Gastos');
    });

    it('should pass fromDate to calculateBalances for period filtering', async () => {
      stubCalculateBalances(mockAccounts, []);

      await service.getIncomeStatement(fromDate, toDate);

      expect(mockPrismaService.journalEntryLine.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            journalEntry: expect.objectContaining({
              date: { gte: fromDate, lte: toDate },
            }),
          }),
        }),
      );
    });

    it('should return zeros when no income/expense entries exist', async () => {
      stubCalculateBalances(mockAccounts, []);

      const result = await service.getIncomeStatement(fromDate, toDate);

      expect(result.revenue.total).toBe(0);
      expect(result.cogs.total).toBe(0);
      expect(result.grossProfit).toBe(0);
      expect(result.expenses.total).toBe(0);
      expect(result.netIncome).toBe(0);
    });

    it('should handle net loss when expenses exceed revenue', async () => {
      stubCalculateBalances(mockAccounts, [
        makeAggRow('acc-revenue', 0, 2000),
        makeAggRow('acc-cogs', 1500, 0),
        makeAggRow('acc-expense', 3000, 0),
      ]);

      const result = await service.getIncomeStatement(fromDate, toDate);

      expect(result.grossProfit).toBe(500);   // 2000 - 1500
      expect(result.netIncome).toBe(-2500);   // 500 - 3000
    });
  });

  // ---------------------------------------------------------------------------
  // getCashFlow
  // ---------------------------------------------------------------------------
  describe('getCashFlow', () => {
    const fromDate = new Date('2024-06-01');
    const toDate = new Date('2024-06-30');

    it('should return zeros when no cash/bank accounts exist', async () => {
      mockPrismaService.account.findMany.mockResolvedValue([]);

      const result = await service.getCashFlow(fromDate, toDate);

      expect(result.openingBalance).toBe(0);
      expect(result.movements).toHaveLength(0);
      expect(result.totalInflows).toBe(0);
      expect(result.totalOutflows).toBe(0);
      expect(result.netChange).toBe(0);
      expect(result.closingBalance).toBe(0);
    });

    it('should find only accounts with code starting with 11', async () => {
      mockPrismaService.account.findMany.mockResolvedValue([]);

      await service.getCashFlow(fromDate, toDate);

      expect(mockPrismaService.account.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: mockTenantId,
          isActive: true,
          code: { startsWith: '11' },
        },
      });
    });

    it('should calculate opening balance from entries before fromDate', async () => {
      const cashAccounts = mockAccounts.filter((a) => a.code.startsWith('11'));
      mockPrismaService.account.findMany.mockResolvedValue(cashAccounts);
      mockPrismaService.journalEntryLine.aggregate.mockResolvedValue({
        _sum: { debit: 15000, credit: 5000 },
      });
      mockPrismaService.journalEntryLine.findMany.mockResolvedValue([]);

      const result = await service.getCashFlow(fromDate, toDate);

      expect(result.openingBalance).toBe(10000); // 15000 - 5000
      expect(mockPrismaService.journalEntryLine.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            accountId: { in: cashAccounts.map((a) => a.id) },
            journalEntry: expect.objectContaining({
              date: { lt: fromDate },
            }),
          }),
        }),
      );
    });

    it('should map debits as inflows and credits as outflows', async () => {
      const cashAccounts = mockAccounts.filter((a) => a.code.startsWith('11'));
      mockPrismaService.account.findMany.mockResolvedValue(cashAccounts);
      mockPrismaService.journalEntryLine.aggregate.mockResolvedValue({
        _sum: { debit: 0, credit: 0 },
      });
      mockPrismaService.journalEntryLine.findMany.mockResolvedValue([
        {
          accountId: 'acc-caja',
          debit: 5000,
          credit: 0,
          journalEntry: { date: new Date('2024-06-10'), description: 'Cobro cliente', entryNumber: 'JE-050' },
        },
        {
          accountId: 'acc-bank',
          debit: 0,
          credit: 2000,
          journalEntry: { date: new Date('2024-06-15'), description: 'Pago proveedor', entryNumber: 'JE-051' },
        },
      ]);

      const result = await service.getCashFlow(fromDate, toDate);

      expect(result.movements[0].inflow).toBe(5000);
      expect(result.movements[0].outflow).toBe(0);
      expect(result.movements[1].inflow).toBe(0);
      expect(result.movements[1].outflow).toBe(2000);
    });

    it('should calculate totals and closing balance correctly', async () => {
      const cashAccounts = mockAccounts.filter((a) => a.code.startsWith('11'));
      mockPrismaService.account.findMany.mockResolvedValue(cashAccounts);
      mockPrismaService.journalEntryLine.aggregate.mockResolvedValue({
        _sum: { debit: 20000, credit: 8000 },
      });
      mockPrismaService.journalEntryLine.findMany.mockResolvedValue([
        {
          accountId: 'acc-caja',
          debit: 5000,
          credit: 0,
          journalEntry: { date: new Date('2024-06-10'), description: 'Ingreso', entryNumber: 'JE-060' },
        },
        {
          accountId: 'acc-bank',
          debit: 0,
          credit: 3000,
          journalEntry: { date: new Date('2024-06-20'), description: 'Pago', entryNumber: 'JE-061' },
        },
      ]);

      const result = await service.getCashFlow(fromDate, toDate);

      expect(result.openingBalance).toBe(12000);  // 20000 - 8000
      expect(result.totalInflows).toBe(5000);
      expect(result.totalOutflows).toBe(3000);
      expect(result.netChange).toBe(2000);          // 5000 - 3000
      expect(result.closingBalance).toBe(14000);    // 12000 + 2000
    });

    it('should handle null aggregate sums gracefully', async () => {
      const cashAccounts = mockAccounts.filter((a) => a.code.startsWith('11'));
      mockPrismaService.account.findMany.mockResolvedValue(cashAccounts);
      mockPrismaService.journalEntryLine.aggregate.mockResolvedValue({
        _sum: { debit: null, credit: null },
      });
      mockPrismaService.journalEntryLine.findMany.mockResolvedValue([]);

      const result = await service.getCashFlow(fromDate, toDate);

      expect(result.openingBalance).toBe(0);
      expect(result.closingBalance).toBe(0);
    });

    it('should format dates as ISO date strings', async () => {
      mockPrismaService.account.findMany.mockResolvedValue([]);

      const result = await service.getCashFlow(fromDate, toDate);

      expect(result.fromDate).toBe('2024-06-01');
      expect(result.toDate).toBe('2024-06-30');
    });
  });

  // ---------------------------------------------------------------------------
  // getARAgingReport
  // ---------------------------------------------------------------------------
  describe('getARAgingReport', () => {
    const asOfDate = new Date('2024-12-31');

    function makeInvoice(
      id: string,
      customerId: string,
      customerName: string,
      total: number,
      issueDate: Date,
      dueDate: Date | null,
      paidAmounts: number[] = [],
    ) {
      return {
        id,
        customerId,
        total,
        issueDate,
        dueDate,
        customer: { id: customerId, name: customerName, documentNumber: '900111222' },
        payments: paidAmounts.map((a) => ({ amount: a })),
      };
    }

    it('should return empty rows when no unpaid invoices exist', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);

      const result = await service.getARAgingReport(asOfDate);

      expect(result.rows).toHaveLength(0);
      expect(result.totals.totalBalance).toBe(0);
      expect(result.asOfDate).toBe('2024-12-31');
    });

    it('should classify a current (not overdue) invoice correctly', async () => {
      // dueDate is in the future relative to asOfDate
      mockPrismaService.invoice.findMany.mockResolvedValue([
        makeInvoice('inv-1', 'cust-1', 'Acme', 1000, new Date('2024-12-01'), new Date('2025-01-15')),
      ]);

      const result = await service.getARAgingReport(asOfDate);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].current).toBe(1000);
      expect(result.rows[0].totalOverdue).toBe(0);
      expect(result.rows[0].totalBalance).toBe(1000);
    });

    it('should classify invoices into correct aging bands', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([
        // 15 days overdue → 1-30 band
        makeInvoice('inv-1', 'cust-1', 'Acme', 500, new Date('2024-11-01'), new Date('2024-12-16')),
        // 45 days overdue → 31-60 band
        makeInvoice('inv-2', 'cust-1', 'Acme', 300, new Date('2024-10-01'), new Date('2024-11-16')),
        // 75 days overdue → 61-90 band
        makeInvoice('inv-3', 'cust-1', 'Acme', 200, new Date('2024-09-01'), new Date('2024-10-17')),
        // 120 days overdue → 90+ band
        makeInvoice('inv-4', 'cust-1', 'Acme', 100, new Date('2024-07-01'), new Date('2024-09-02')),
      ]);

      const result = await service.getARAgingReport(asOfDate);

      expect(result.rows).toHaveLength(1);
      const row = result.rows[0];
      expect(row.days1to30).toBe(500);
      expect(row.days31to60).toBe(300);
      expect(row.days61to90).toBe(200);
      expect(row.days90plus).toBe(100);
      expect(row.totalOverdue).toBe(1100);
      expect(row.totalBalance).toBe(1100);
    });

    it('should subtract payments from invoice balance', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([
        makeInvoice('inv-1', 'cust-1', 'Acme', 1000, new Date('2024-12-01'), new Date('2025-01-15'), [400, 200]),
      ]);

      const result = await service.getARAgingReport(asOfDate);

      expect(result.rows[0].totalBalance).toBe(400); // 1000 - 400 - 200
    });

    it('should skip invoices fully paid via payments', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([
        makeInvoice('inv-1', 'cust-1', 'Acme', 1000, new Date('2024-12-01'), new Date('2025-01-15'), [1000]),
      ]);

      const result = await service.getARAgingReport(asOfDate);

      expect(result.rows).toHaveLength(0);
    });

    it('should group multiple invoices by customer', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([
        makeInvoice('inv-1', 'cust-1', 'Acme', 500, new Date('2024-12-01'), new Date('2025-01-15')),
        makeInvoice('inv-2', 'cust-1', 'Acme', 300, new Date('2024-11-01'), new Date('2024-12-16')),
        makeInvoice('inv-3', 'cust-2', 'Beta', 800, new Date('2024-12-01'), new Date('2025-01-10')),
      ]);

      const result = await service.getARAgingReport(asOfDate);

      expect(result.rows).toHaveLength(2);
      // Sorted by totalBalance desc: Beta 800, Acme 500+300=800 (same, but order is stable)
      expect(result.totals.totalBalance).toBe(1600);
    });

    it('should use issueDate as fallback when dueDate is null', async () => {
      // dueDate null, issueDate = 2024-12-16 → 15 days overdue → 1-30 band
      mockPrismaService.invoice.findMany.mockResolvedValue([
        makeInvoice('inv-1', 'cust-1', 'Acme', 500, new Date('2024-12-16'), null),
      ]);

      const result = await service.getARAgingReport(asOfDate);

      expect(result.rows[0].days1to30).toBe(500);
    });

    it('should compute totals across all customers', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([
        makeInvoice('inv-1', 'cust-1', 'Acme', 1000, new Date('2024-12-01'), new Date('2025-01-15')),
        makeInvoice('inv-2', 'cust-2', 'Beta', 2000, new Date('2024-11-01'), new Date('2024-12-16')),
      ]);

      const result = await service.getARAgingReport(asOfDate);

      expect(result.totals.current).toBe(1000);
      expect(result.totals.days1to30).toBe(2000);
      expect(result.totals.totalBalance).toBe(3000);
    });
  });

  // ---------------------------------------------------------------------------
  // getAPAgingReport
  // ---------------------------------------------------------------------------
  describe('getAPAgingReport', () => {
    const asOfDate = new Date('2024-12-31');

    function makePO(
      id: string,
      supplierId: string,
      supplierName: string,
      total: number,
      issueDate: Date,
      paymentTerms: PaymentTerms = PaymentTerms.NET_30,
    ) {
      return {
        id,
        supplierId,
        total,
        issueDate,
        supplier: { id: supplierId, name: supplierName, documentNumber: '800333444', paymentTerms },
      };
    }

    it('should return empty rows when no unpaid POs exist', async () => {
      mockPrismaService.purchaseOrder.findMany.mockResolvedValue([]);

      const result = await service.getAPAgingReport(asOfDate);

      expect(result.rows).toHaveLength(0);
      expect(result.totals.totalBalance).toBe(0);
      expect(result.asOfDate).toBe('2024-12-31');
    });

    it('should classify a current PO (not overdue based on payment terms)', async () => {
      // issueDate 2024-12-15 + NET_30 = due 2025-01-14, so current
      mockPrismaService.purchaseOrder.findMany.mockResolvedValue([
        makePO('po-1', 'sup-1', 'Proveedor A', 5000, new Date('2024-12-15'), PaymentTerms.NET_30),
      ]);

      const result = await service.getAPAgingReport(asOfDate);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].current).toBe(5000);
      expect(result.rows[0].totalOverdue).toBe(0);
    });

    it('should classify overdue POs into correct aging bands', async () => {
      mockPrismaService.purchaseOrder.findMany.mockResolvedValue([
        // Due = 2024-12-16 (issueDate + 0 IMMEDIATE), 15 days overdue → 1-30
        makePO('po-1', 'sup-1', 'Proveedor A', 1000, new Date('2024-12-16'), PaymentTerms.IMMEDIATE),
        // Due = 2024-11-01 + 15 = 2024-11-16, 45 days overdue → 31-60
        makePO('po-2', 'sup-1', 'Proveedor A', 2000, new Date('2024-11-01'), PaymentTerms.NET_15),
        // Due = 2024-08-01 + 30 = 2024-08-31, 122 days overdue → 90+
        makePO('po-3', 'sup-1', 'Proveedor A', 3000, new Date('2024-08-01'), PaymentTerms.NET_30),
      ]);

      const result = await service.getAPAgingReport(asOfDate);

      expect(result.rows).toHaveLength(1);
      const row = result.rows[0];
      expect(row.days1to30).toBe(1000);
      expect(row.days31to60).toBe(2000);
      expect(row.days90plus).toBe(3000);
      expect(row.totalOverdue).toBe(6000);
      expect(row.totalBalance).toBe(6000);
    });

    it('should group multiple POs by supplier', async () => {
      mockPrismaService.purchaseOrder.findMany.mockResolvedValue([
        makePO('po-1', 'sup-1', 'Proveedor A', 1000, new Date('2024-12-15'), PaymentTerms.NET_30),
        makePO('po-2', 'sup-1', 'Proveedor A', 2000, new Date('2024-12-15'), PaymentTerms.NET_30),
        makePO('po-3', 'sup-2', 'Proveedor B', 5000, new Date('2024-12-15'), PaymentTerms.NET_30),
      ]);

      const result = await service.getAPAgingReport(asOfDate);

      expect(result.rows).toHaveLength(2);
      // Sorted by totalBalance desc: Proveedor B (5000) first
      expect(result.rows[0].supplierName).toBe('Proveedor B');
      expect(result.rows[0].totalBalance).toBe(5000);
      expect(result.rows[1].totalBalance).toBe(3000);
      expect(result.totals.totalBalance).toBe(8000);
    });

    it('should use correct payment terms days', async () => {
      // NET_60: issueDate 2024-10-15 + 60 = due 2024-12-14, 17 days overdue → 1-30
      mockPrismaService.purchaseOrder.findMany.mockResolvedValue([
        makePO('po-1', 'sup-1', 'Proveedor A', 1000, new Date('2024-10-15'), PaymentTerms.NET_60),
      ]);

      const result = await service.getAPAgingReport(asOfDate);

      expect(result.rows[0].days1to30).toBe(1000);
    });

    it('should skip POs with zero balance', async () => {
      mockPrismaService.purchaseOrder.findMany.mockResolvedValue([
        { ...makePO('po-1', 'sup-1', 'Proveedor A', 0, new Date('2024-12-15'), PaymentTerms.NET_30) },
      ]);

      const result = await service.getAPAgingReport(asOfDate);

      expect(result.rows).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // getIvaDeclaration
  // ---------------------------------------------------------------------------
  describe('getIvaDeclaration', () => {
    function makeInvoiceWithItems(id: string, issueDate: Date, items: { taxRate: number; taxCategory: string; subtotal: number; tax: number }[]) {
      return { id, issueDate, items };
    }

    function makePOWithItems(id: string, issueDate: Date, items: { taxRate: number; taxCategory: string; subtotal: number; tax: number }[]) {
      return { id, issueDate, items };
    }

    it('should return empty data when no invoices or POs exist', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);
      mockPrismaService.purchaseOrder.findMany.mockResolvedValue([]);

      const result = await service.getIvaDeclaration(2026, 1);

      expect(result.year).toBe(2026);
      expect(result.bimonthlyPeriod).toBe(1);
      expect(result.periodLabel).toBe('Enero - Febrero 2026');
      expect(result.salesByRate).toHaveLength(0);
      expect(result.totalIvaGenerado).toBe(0);
      expect(result.totalIvaDescontable).toBe(0);
      expect(result.netIvaPayable).toBe(0);
    });

    it('should aggregate sales IVA by rate', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([
        makeInvoiceWithItems('inv-1', new Date('2026-01-15'), [
          { taxRate: 19, taxCategory: 'GRAVADO_19', subtotal: 1000, tax: 190 },
          { taxRate: 5, taxCategory: 'GRAVADO_5', subtotal: 500, tax: 25 },
        ]),
        makeInvoiceWithItems('inv-2', new Date('2026-02-10'), [
          { taxRate: 19, taxCategory: 'GRAVADO_19', subtotal: 2000, tax: 380 },
        ]),
      ]);
      mockPrismaService.purchaseOrder.findMany.mockResolvedValue([]);

      const result = await service.getIvaDeclaration(2026, 1);

      expect(result.salesByRate).toHaveLength(2);
      const rate19 = result.salesByRate.find(r => r.taxRate === 19)!;
      expect(rate19.taxableBase).toBe(3000);
      expect(rate19.taxAmount).toBe(570);
      const rate5 = result.salesByRate.find(r => r.taxRate === 5)!;
      expect(rate5.taxableBase).toBe(500);
      expect(rate5.taxAmount).toBe(25);
      expect(result.totalIvaGenerado).toBe(595);
    });

    it('should aggregate purchases IVA by rate', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);
      mockPrismaService.purchaseOrder.findMany.mockResolvedValue([
        makePOWithItems('po-1', new Date('2026-01-20'), [
          { taxRate: 19, taxCategory: 'GRAVADO_19', subtotal: 5000, tax: 950 },
        ]),
      ]);

      const result = await service.getIvaDeclaration(2026, 1);

      expect(result.purchasesByRate).toHaveLength(1);
      expect(result.purchasesByRate[0].taxAmount).toBe(950);
      expect(result.totalIvaDescontable).toBe(950);
    });

    it('should calculate net IVA payable correctly', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([
        makeInvoiceWithItems('inv-1', new Date('2026-01-15'), [
          { taxRate: 19, taxCategory: 'GRAVADO_19', subtotal: 10000, tax: 1900 },
        ]),
      ]);
      mockPrismaService.purchaseOrder.findMany.mockResolvedValue([
        makePOWithItems('po-1', new Date('2026-01-20'), [
          { taxRate: 19, taxCategory: 'GRAVADO_19', subtotal: 5000, tax: 950 },
        ]),
      ]);

      const result = await service.getIvaDeclaration(2026, 1);

      expect(result.netIvaPayable).toBe(950); // 1900 - 950
    });

    it('should handle EXENTO and EXCLUIDO items', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([
        makeInvoiceWithItems('inv-1', new Date('2026-01-15'), [
          { taxRate: 0, taxCategory: 'EXENTO', subtotal: 3000, tax: 0 },
          { taxRate: 0, taxCategory: 'EXCLUIDO', subtotal: 2000, tax: 0 },
        ]),
      ]);
      mockPrismaService.purchaseOrder.findMany.mockResolvedValue([]);

      const result = await service.getIvaDeclaration(2026, 1);

      expect(result.salesExempt).toHaveLength(2);
      expect(result.salesExempt.find(e => e.category === 'EXENTO')!.taxableBase).toBe(3000);
      expect(result.salesExempt.find(e => e.category === 'EXCLUIDO')!.taxableBase).toBe(2000);
      expect(result.totalSalesBase).toBe(5000);
      expect(result.totalIvaGenerado).toBe(0);
    });

    it('should compute correct bimonthly date ranges', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);
      mockPrismaService.purchaseOrder.findMany.mockResolvedValue([]);

      const result = await service.getIvaDeclaration(2026, 3);

      expect(result.periodLabel).toBe('Mayo - Junio 2026');
      expect(result.fromDate).toBe('2026-05-01');
      expect(result.toDate).toBe('2026-06-30');
    });
  });

  // ---------------------------------------------------------------------------
  // getReteFuenteSummary
  // ---------------------------------------------------------------------------
  describe('getReteFuenteSummary', () => {
    function makeRetePO(id: string, supplierId: string, supplierName: string, subtotal: number, issueDate: Date) {
      return {
        id,
        supplierId,
        subtotal,
        issueDate,
        supplier: { id: supplierId, name: supplierName, documentNumber: '900111222' },
      };
    }

    it('should return empty rows when no POs exceed min base', async () => {
      mockPrismaService.purchaseOrder.findMany.mockResolvedValue([
        makeRetePO('po-1', 'sup-1', 'Proveedor A', 500000, new Date('2026-02-10')),
      ]);

      const result = await service.getReteFuenteSummary(2026, 2);

      expect(result.rows).toHaveLength(0);
      expect(result.totalWithheld).toBe(0);
    });

    it('should calculate withholding for POs above min base', async () => {
      mockPrismaService.purchaseOrder.findMany.mockResolvedValue([
        makeRetePO('po-1', 'sup-1', 'Proveedor A', 1000000, new Date('2026-02-10')),
      ]);
      mockPrismaService.withholdingCertificate.findMany.mockResolvedValue([]);

      const result = await service.getReteFuenteSummary(2026, 2);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].totalBase).toBe(1000000);
      expect(result.rows[0].totalWithheld).toBe(25000); // 1000000 * 0.025
      expect(result.rows[0].withholdingRate).toBe(2.5);
    });

    it('should group by supplier', async () => {
      mockPrismaService.purchaseOrder.findMany.mockResolvedValue([
        makeRetePO('po-1', 'sup-1', 'Proveedor A', 600000, new Date('2026-02-05')),
        makeRetePO('po-2', 'sup-1', 'Proveedor A', 800000, new Date('2026-02-15')),
        makeRetePO('po-3', 'sup-2', 'Proveedor B', 1000000, new Date('2026-02-20')),
      ]);
      mockPrismaService.withholdingCertificate.findMany.mockResolvedValue([]);

      const result = await service.getReteFuenteSummary(2026, 2);

      expect(result.rows).toHaveLength(2);
      const supA = result.rows.find(r => r.supplierName === 'Proveedor A')!;
      expect(supA.totalBase).toBe(1400000);
      expect(supA.purchaseCount).toBe(2);
      expect(result.totalWithheld).toBe(supA.totalWithheld + result.rows.find(r => r.supplierName === 'Proveedor B')!.totalWithheld);
    });

    it('should cross-reference withholding certificates', async () => {
      mockPrismaService.purchaseOrder.findMany.mockResolvedValue([
        makeRetePO('po-1', 'sup-1', 'Proveedor A', 1000000, new Date('2026-02-10')),
      ]);
      mockPrismaService.withholdingCertificate.findMany.mockResolvedValue([
        { id: 'cert-1', supplierId: 'sup-1', certificateNumber: 'CERT-001' },
      ]);

      const result = await service.getReteFuenteSummary(2026, 2);

      expect(result.rows[0].certificateId).toBe('cert-1');
      expect(result.rows[0].certificateNumber).toBe('CERT-001');
    });

    it('should format month label correctly', async () => {
      mockPrismaService.purchaseOrder.findMany.mockResolvedValue([]);

      const result = await service.getReteFuenteSummary(2026, 2);

      expect(result.monthLabel).toBe('Febrero 2026');
      expect(result.fromDate).toBe('2026-02-01');
      expect(result.toDate).toBe('2026-02-28');
    });
  });

  // ---------------------------------------------------------------------------
  // getYtdTaxSummary
  // ---------------------------------------------------------------------------
  describe('getYtdTaxSummary', () => {
    it('should return zeros when no invoices or POs exist', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);
      mockPrismaService.purchaseOrder.findMany.mockResolvedValue([]);

      const result = await service.getYtdTaxSummary(2026);

      expect(result.year).toBe(2026);
      expect(result.ivaGeneradoYtd).toBe(0);
      expect(result.ivaDescontableYtd).toBe(0);
      expect(result.netIvaYtd).toBe(0);
      expect(result.reteFuenteBaseYtd).toBe(0);
      expect(result.reteFuenteWithheldYtd).toBe(0);
    });

    it('should aggregate IVA and ReteFuente for the full year', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([
        { tax: 1900 },
        { tax: 950 },
      ]);
      mockPrismaService.purchaseOrder.findMany.mockResolvedValue([
        { tax: 380, subtotal: 2000 },       // below min base
        { tax: 1900, subtotal: 1000000 },    // above min base
      ]);

      const result = await service.getYtdTaxSummary(2026);

      expect(result.ivaGeneradoYtd).toBe(2850);
      expect(result.ivaDescontableYtd).toBe(2280);
      expect(result.netIvaYtd).toBe(570);
      expect(result.reteFuenteBaseYtd).toBe(1000000);
      expect(result.reteFuenteWithheldYtd).toBe(25000);
    });
  });
});
