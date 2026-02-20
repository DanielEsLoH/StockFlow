import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma';
import { TenantContextService } from '../../common';
import {
  AccountType,
  AccountNature,
  JournalEntryStatus,
  JournalEntrySource,
} from '@prisma/client';

/** Balance row for a single account */
export interface AccountBalance {
  accountId: string;
  code: string;
  name: string;
  type: AccountType;
  nature: AccountNature;
  level: number;
  totalDebit: number;
  totalCredit: number;
  balance: number;
}

/** Trial balance report */
export interface TrialBalanceReport {
  asOfDate: string;
  accounts: AccountBalance[];
  totalDebit: number;
  totalCredit: number;
}

/** General journal entry row */
export interface GeneralJournalRow {
  entryId: string;
  entryNumber: string;
  date: Date;
  description: string;
  source: JournalEntrySource;
  lines: {
    accountCode: string;
    accountName: string;
    description: string | null;
    debit: number;
    credit: number;
  }[];
  totalDebit: number;
  totalCredit: number;
}

export interface GeneralJournalReport {
  fromDate: string;
  toDate: string;
  entries: GeneralJournalRow[];
  totalDebit: number;
  totalCredit: number;
}

/** General ledger — movements for a specific account or all accounts */
export interface LedgerMovement {
  entryId: string;
  entryNumber: string;
  date: Date;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

export interface LedgerAccountSection {
  accountId: string;
  code: string;
  name: string;
  type: AccountType;
  nature: AccountNature;
  openingBalance: number;
  movements: LedgerMovement[];
  closingBalance: number;
}

export interface GeneralLedgerReport {
  fromDate: string;
  toDate: string;
  accounts: LedgerAccountSection[];
}

/** Balance sheet section */
export interface BalanceSheetSection {
  title: string;
  accounts: AccountBalance[];
  total: number;
}

export interface BalanceSheetReport {
  asOfDate: string;
  assets: BalanceSheetSection;
  liabilities: BalanceSheetSection;
  equity: BalanceSheetSection;
  totalAssets: number;
  totalLiabilitiesAndEquity: number;
}

/** Income statement section */
export interface IncomeStatementReport {
  fromDate: string;
  toDate: string;
  revenue: BalanceSheetSection;
  cogs: BalanceSheetSection;
  grossProfit: number;
  expenses: BalanceSheetSection;
  netIncome: number;
}

/** Cash flow section */
export interface CashFlowMovement {
  date: Date;
  description: string;
  entryNumber: string;
  inflow: number;
  outflow: number;
}

export interface CashFlowReport {
  fromDate: string;
  toDate: string;
  openingBalance: number;
  movements: CashFlowMovement[];
  totalInflows: number;
  totalOutflows: number;
  netChange: number;
  closingBalance: number;
}

@Injectable()
export class AccountingReportsService {
  private readonly logger = new Logger(AccountingReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  /**
   * Calculate account balances from posted journal entries up to a date.
   * Uses raw SQL for performance — aggregates all debits and credits per account.
   */
  private async calculateBalances(
    tenantId: string,
    asOfDate: Date,
    fromDate?: Date,
  ): Promise<AccountBalance[]> {
    const accounts = await this.prisma.account.findMany({
      where: { tenantId, isActive: true },
      orderBy: { code: 'asc' },
    });

    const dateFilter = fromDate
      ? { gte: fromDate, lte: asOfDate }
      : { lte: asOfDate };

    const aggregations = await this.prisma.journalEntryLine.groupBy({
      by: ['accountId'],
      where: {
        journalEntry: {
          tenantId,
          status: JournalEntryStatus.POSTED,
          date: dateFilter,
        },
      },
      _sum: {
        debit: true,
        credit: true,
      },
    });

    const balanceMap = new Map(
      aggregations.map((agg) => [
        agg.accountId,
        {
          totalDebit: Number(agg._sum.debit ?? 0),
          totalCredit: Number(agg._sum.credit ?? 0),
        },
      ]),
    );

    return accounts
      .map((account) => {
        const agg = balanceMap.get(account.id) ?? {
          totalDebit: 0,
          totalCredit: 0,
        };
        const balance =
          account.nature === AccountNature.DEBIT
            ? agg.totalDebit - agg.totalCredit
            : agg.totalCredit - agg.totalDebit;

        return {
          accountId: account.id,
          code: account.code,
          name: account.name,
          type: account.type,
          nature: account.nature,
          level: account.level,
          totalDebit: agg.totalDebit,
          totalCredit: agg.totalCredit,
          balance,
        };
      })
      .filter((b) => b.totalDebit !== 0 || b.totalCredit !== 0);
  }

  /**
   * 1. Balance de Prueba — Trial Balance as of a date.
   */
  async getTrialBalance(asOfDate: Date): Promise<TrialBalanceReport> {
    const tenantId = this.tenantContext.requireTenantId();
    const accounts = await this.calculateBalances(tenantId, asOfDate);

    return {
      asOfDate: asOfDate.toISOString().split('T')[0],
      accounts,
      totalDebit: accounts.reduce((s, a) => s + a.totalDebit, 0),
      totalCredit: accounts.reduce((s, a) => s + a.totalCredit, 0),
    };
  }

  /**
   * 2. Libro Diario — General Journal (all entries in a date range).
   */
  async getGeneralJournal(
    fromDate: Date,
    toDate: Date,
  ): Promise<GeneralJournalReport> {
    const tenantId = this.tenantContext.requireTenantId();

    const entries = await this.prisma.journalEntry.findMany({
      where: {
        tenantId,
        status: JournalEntryStatus.POSTED,
        date: { gte: fromDate, lte: toDate },
      },
      include: {
        lines: {
          include: {
            account: { select: { code: true, name: true } },
          },
          orderBy: [{ debit: 'desc' }],
        },
      },
      orderBy: { date: 'asc' },
    });

    const rows: GeneralJournalRow[] = entries.map((entry) => ({
      entryId: entry.id,
      entryNumber: entry.entryNumber,
      date: entry.date,
      description: entry.description,
      source: entry.source,
      lines: entry.lines.map((line) => ({
        accountCode: line.account.code,
        accountName: line.account.name,
        description: line.description,
        debit: Number(line.debit),
        credit: Number(line.credit),
      })),
      totalDebit: Number(entry.totalDebit),
      totalCredit: Number(entry.totalCredit),
    }));

    return {
      fromDate: fromDate.toISOString().split('T')[0],
      toDate: toDate.toISOString().split('T')[0],
      entries: rows,
      totalDebit: rows.reduce((s, r) => s + r.totalDebit, 0),
      totalCredit: rows.reduce((s, r) => s + r.totalCredit, 0),
    };
  }

  /**
   * 3. Libro Mayor — General Ledger (movements per account in a date range).
   */
  async getGeneralLedger(
    fromDate: Date,
    toDate: Date,
    accountId?: string,
  ): Promise<GeneralLedgerReport> {
    const tenantId = this.tenantContext.requireTenantId();

    // Get accounts to report on
    const accountFilter: any = { tenantId, isActive: true };
    if (accountId) accountFilter.id = accountId;

    const accounts = await this.prisma.account.findMany({
      where: accountFilter,
      orderBy: { code: 'asc' },
    });

    // Calculate opening balances (before fromDate)
    const openingBalances = await this.calculateBalances(
      tenantId,
      new Date(fromDate.getTime() - 86400000), // day before fromDate
    );
    const openingMap = new Map(
      openingBalances.map((b) => [b.accountId, b.balance]),
    );

    // Get all movements in the date range
    const lines = await this.prisma.journalEntryLine.findMany({
      where: {
        accountId: accountId ? accountId : undefined,
        journalEntry: {
          tenantId,
          status: JournalEntryStatus.POSTED,
          date: { gte: fromDate, lte: toDate },
        },
      },
      include: {
        journalEntry: {
          select: {
            id: true,
            entryNumber: true,
            date: true,
            description: true,
          },
        },
      },
      orderBy: { journalEntry: { date: 'asc' } },
    });

    // Group movements by account
    const movementsByAccount = new Map<string, typeof lines>();
    for (const line of lines) {
      const key = line.accountId;
      if (!movementsByAccount.has(key)) movementsByAccount.set(key, []);
      movementsByAccount.get(key)!.push(line);
    }

    const sections: LedgerAccountSection[] = accounts
      .map((account) => {
        const movements = movementsByAccount.get(account.id) ?? [];
        if (movements.length === 0 && !accountId) return null;

        const opening = openingMap.get(account.id) ?? 0;
        let running = opening;

        const mappedMovements: LedgerMovement[] = movements.map((m) => {
          const d = Number(m.debit);
          const c = Number(m.credit);
          running +=
            account.nature === AccountNature.DEBIT ? d - c : c - d;
          return {
            entryId: m.journalEntry.id,
            entryNumber: m.journalEntry.entryNumber,
            date: m.journalEntry.date,
            description: m.description ?? m.journalEntry.description,
            debit: d,
            credit: c,
            runningBalance: running,
          };
        });

        return {
          accountId: account.id,
          code: account.code,
          name: account.name,
          type: account.type,
          nature: account.nature,
          openingBalance: opening,
          movements: mappedMovements,
          closingBalance: running,
        };
      })
      .filter(Boolean) as LedgerAccountSection[];

    return {
      fromDate: fromDate.toISOString().split('T')[0],
      toDate: toDate.toISOString().split('T')[0],
      accounts: sections,
    };
  }

  /**
   * 4. Balance General — Balance Sheet as of a date.
   * Activos = Pasivos + Patrimonio
   */
  async getBalanceSheet(asOfDate: Date): Promise<BalanceSheetReport> {
    const tenantId = this.tenantContext.requireTenantId();
    const balances = await this.calculateBalances(tenantId, asOfDate);

    const assets = balances.filter((b) => b.type === AccountType.ASSET);
    const liabilities = balances.filter(
      (b) => b.type === AccountType.LIABILITY,
    );
    const equity = balances.filter((b) => b.type === AccountType.EQUITY);

    // Net income = Revenue - COGS - Expenses (for current period)
    const revenue = balances.filter((b) => b.type === AccountType.REVENUE);
    const cogs = balances.filter((b) => b.type === AccountType.COGS);
    const expenses = balances.filter((b) => b.type === AccountType.EXPENSE);
    const netIncome =
      revenue.reduce((s, b) => s + b.balance, 0) -
      cogs.reduce((s, b) => s + b.balance, 0) -
      expenses.reduce((s, b) => s + b.balance, 0);

    const totalAssets = assets.reduce((s, b) => s + b.balance, 0);
    const totalLiabilities = liabilities.reduce((s, b) => s + b.balance, 0);
    const totalEquity = equity.reduce((s, b) => s + b.balance, 0) + netIncome;

    return {
      asOfDate: asOfDate.toISOString().split('T')[0],
      assets: {
        title: 'Activos',
        accounts: assets,
        total: totalAssets,
      },
      liabilities: {
        title: 'Pasivos',
        accounts: liabilities,
        total: totalLiabilities,
      },
      equity: {
        title: 'Patrimonio',
        accounts: [
          ...equity,
          {
            accountId: '',
            code: '',
            name: 'Utilidad del ejercicio',
            type: AccountType.EQUITY,
            nature: AccountNature.CREDIT,
            level: 4,
            totalDebit: 0,
            totalCredit: 0,
            balance: netIncome,
          },
        ],
        total: totalEquity,
      },
      totalAssets,
      totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
    };
  }

  /**
   * 5. Estado de Resultados — Income Statement for a date range.
   * Ingresos - Costos - Gastos = Utilidad Neta
   */
  async getIncomeStatement(
    fromDate: Date,
    toDate: Date,
  ): Promise<IncomeStatementReport> {
    const tenantId = this.tenantContext.requireTenantId();
    const balances = await this.calculateBalances(
      tenantId,
      toDate,
      fromDate,
    );

    const revenue = balances.filter((b) => b.type === AccountType.REVENUE);
    const cogs = balances.filter((b) => b.type === AccountType.COGS);
    const expenses = balances.filter((b) => b.type === AccountType.EXPENSE);

    const totalRevenue = revenue.reduce((s, b) => s + b.balance, 0);
    const totalCogs = cogs.reduce((s, b) => s + b.balance, 0);
    const totalExpenses = expenses.reduce((s, b) => s + b.balance, 0);
    const grossProfit = totalRevenue - totalCogs;
    const netIncome = grossProfit - totalExpenses;

    return {
      fromDate: fromDate.toISOString().split('T')[0],
      toDate: toDate.toISOString().split('T')[0],
      revenue: {
        title: 'Ingresos',
        accounts: revenue,
        total: totalRevenue,
      },
      cogs: {
        title: 'Costo de Ventas',
        accounts: cogs,
        total: totalCogs,
      },
      grossProfit,
      expenses: {
        title: 'Gastos',
        accounts: expenses,
        total: totalExpenses,
      },
      netIncome,
    };
  }

  /**
   * 6. Flujo de Efectivo — Cash Flow Statement.
   * Movements in cash and bank accounts.
   */
  async getCashFlow(
    fromDate: Date,
    toDate: Date,
  ): Promise<CashFlowReport> {
    const tenantId = this.tenantContext.requireTenantId();

    // Find all cash/bank accounts (class 11)
    const cashBankAccounts = await this.prisma.account.findMany({
      where: {
        tenantId,
        isActive: true,
        code: { startsWith: '11' },
      },
    });

    const accountIds = cashBankAccounts.map((a) => a.id);
    if (accountIds.length === 0) {
      return {
        fromDate: fromDate.toISOString().split('T')[0],
        toDate: toDate.toISOString().split('T')[0],
        openingBalance: 0,
        movements: [],
        totalInflows: 0,
        totalOutflows: 0,
        netChange: 0,
        closingBalance: 0,
      };
    }

    // Opening balance (before fromDate)
    const openingAgg = await this.prisma.journalEntryLine.aggregate({
      where: {
        accountId: { in: accountIds },
        journalEntry: {
          tenantId,
          status: JournalEntryStatus.POSTED,
          date: { lt: fromDate },
        },
      },
      _sum: { debit: true, credit: true },
    });
    const openingBalance =
      Number(openingAgg._sum.debit ?? 0) -
      Number(openingAgg._sum.credit ?? 0);

    // Movements in period
    const lines = await this.prisma.journalEntryLine.findMany({
      where: {
        accountId: { in: accountIds },
        journalEntry: {
          tenantId,
          status: JournalEntryStatus.POSTED,
          date: { gte: fromDate, lte: toDate },
        },
      },
      include: {
        journalEntry: {
          select: { date: true, description: true, entryNumber: true },
        },
      },
      orderBy: { journalEntry: { date: 'asc' } },
    });

    const movements: CashFlowMovement[] = lines.map((line) => ({
      date: line.journalEntry.date,
      description: line.journalEntry.description,
      entryNumber: line.journalEntry.entryNumber,
      inflow: Number(line.debit),
      outflow: Number(line.credit),
    }));

    const totalInflows = movements.reduce((s, m) => s + m.inflow, 0);
    const totalOutflows = movements.reduce((s, m) => s + m.outflow, 0);
    const netChange = totalInflows - totalOutflows;

    return {
      fromDate: fromDate.toISOString().split('T')[0],
      toDate: toDate.toISOString().split('T')[0],
      openingBalance,
      movements,
      totalInflows,
      totalOutflows,
      netChange,
      closingBalance: openingBalance + netChange,
    };
  }
}
