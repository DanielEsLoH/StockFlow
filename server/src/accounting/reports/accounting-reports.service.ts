import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma';
import { TenantContextService } from '../../common';
import {
  AccountType,
  AccountNature,
  JournalEntryStatus,
  JournalEntrySource,
  PaymentStatus,
  InvoiceStatus,
  PurchaseOrderStatus,
  PaymentTerms,
  TaxCategory,
} from '@prisma/client';
import { RETE_FUENTE_RATE, RETE_FUENTE_MIN_BASE } from '../tax-constants';

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

/** Aging totals bucket */
export interface AgingTotals {
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  days90plus: number;
  totalOverdue: number;
  totalBalance: number;
}

/** AR Aging row per customer */
export interface ARAgingRow extends AgingTotals {
  customerId: string;
  customerName: string;
  customerDocument: string;
}

export interface ARAgingReport {
  asOfDate: string;
  rows: ARAgingRow[];
  totals: AgingTotals;
}

/** AP Aging row per supplier */
export interface APAgingRow extends AgingTotals {
  supplierId: string;
  supplierName: string;
  supplierDocument: string;
}

export interface APAgingReport {
  asOfDate: string;
  rows: APAgingRow[];
  totals: AgingTotals;
}

// ============================================================================
// TAX REPORTS
// ============================================================================

/** IVA breakdown by tax rate */
export interface IvaRateBreakdown {
  taxRate: number;
  taxableBase: number;
  taxAmount: number;
  invoiceCount: number;
}

/** Exempt/excluded summary */
export interface IvaExemptSummary {
  category: 'EXENTO' | 'EXCLUIDO';
  taxableBase: number;
  invoiceCount: number;
}

/** IVA Declaration report (bimonthly) */
export interface IvaDeclarationReport {
  year: number;
  bimonthlyPeriod: number;
  periodLabel: string;
  fromDate: string;
  toDate: string;
  salesByRate: IvaRateBreakdown[];
  salesExempt: IvaExemptSummary[];
  totalSalesBase: number;
  totalIvaGenerado: number;
  purchasesByRate: IvaRateBreakdown[];
  purchasesExempt: IvaExemptSummary[];
  totalPurchasesBase: number;
  totalIvaDescontable: number;
  netIvaPayable: number;
}

/** ReteFuente row per supplier */
export interface ReteFuenteSupplierRow {
  supplierId: string;
  supplierName: string;
  supplierNit: string;
  totalBase: number;
  totalWithheld: number;
  withholdingRate: number;
  purchaseCount: number;
  certificateId: string | null;
  certificateNumber: string | null;
}

/** ReteFuente Summary report (monthly) */
export interface ReteFuenteSummaryReport {
  year: number;
  month: number;
  monthLabel: string;
  fromDate: string;
  toDate: string;
  rows: ReteFuenteSupplierRow[];
  totalBase: number;
  totalWithheld: number;
}

/** Year-to-date tax summary */
export interface YtdTaxSummary {
  year: number;
  ivaGeneradoYtd: number;
  ivaDescontableYtd: number;
  netIvaYtd: number;
  reteFuenteBaseYtd: number;
  reteFuenteWithheldYtd: number;
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

  /**
   * 7. Cartera CxC — AR Aging Report.
   * Unpaid invoices grouped by customer and days overdue.
   */
  async getARAgingReport(asOfDate: Date): Promise<ARAgingReport> {
    const tenantId = this.tenantContext.requireTenantId();

    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        paymentStatus: { not: PaymentStatus.PAID },
        status: { notIn: [InvoiceStatus.CANCELLED, InvoiceStatus.VOID, InvoiceStatus.DRAFT] },
        issueDate: { lte: asOfDate },
      },
      include: {
        customer: { select: { id: true, name: true, documentNumber: true } },
        payments: { select: { amount: true } },
      },
    });

    // Group by customer
    const customerMap = new Map<string, ARAgingRow>();

    for (const invoice of invoices) {
      const customerId = invoice.customerId ?? 'unknown';
      const paidAmount = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const balance = Number(invoice.total) - paidAmount;
      if (balance <= 0) continue;

      const dueDate = invoice.dueDate ?? invoice.issueDate;
      const daysOverdue = Math.floor(
        (asOfDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (!customerMap.has(customerId)) {
        customerMap.set(customerId, {
          customerId,
          customerName: invoice.customer?.name ?? 'Sin cliente',
          customerDocument: invoice.customer?.documentNumber ?? '',
          current: 0,
          days1to30: 0,
          days31to60: 0,
          days61to90: 0,
          days90plus: 0,
          totalOverdue: 0,
          totalBalance: 0,
        });
      }

      const row = customerMap.get(customerId)!;
      row.totalBalance += balance;

      if (daysOverdue <= 0) {
        row.current += balance;
      } else if (daysOverdue <= 30) {
        row.days1to30 += balance;
        row.totalOverdue += balance;
      } else if (daysOverdue <= 60) {
        row.days31to60 += balance;
        row.totalOverdue += balance;
      } else if (daysOverdue <= 90) {
        row.days61to90 += balance;
        row.totalOverdue += balance;
      } else {
        row.days90plus += balance;
        row.totalOverdue += balance;
      }
    }

    const rows = Array.from(customerMap.values()).sort(
      (a, b) => b.totalBalance - a.totalBalance,
    );

    const totals: AgingTotals = {
      current: rows.reduce((s, r) => s + r.current, 0),
      days1to30: rows.reduce((s, r) => s + r.days1to30, 0),
      days31to60: rows.reduce((s, r) => s + r.days31to60, 0),
      days61to90: rows.reduce((s, r) => s + r.days61to90, 0),
      days90plus: rows.reduce((s, r) => s + r.days90plus, 0),
      totalOverdue: rows.reduce((s, r) => s + r.totalOverdue, 0),
      totalBalance: rows.reduce((s, r) => s + r.totalBalance, 0),
    };

    this.logger.debug(`AR Aging: ${rows.length} customers, total balance ${totals.totalBalance}`);

    return {
      asOfDate: asOfDate.toISOString().split('T')[0],
      rows,
      totals,
    };
  }

  /**
   * 8. Cartera CxP — AP Aging Report.
   * Unpaid received purchase orders grouped by supplier and days overdue.
   */
  async getAPAgingReport(asOfDate: Date): Promise<APAgingReport> {
    const tenantId = this.tenantContext.requireTenantId();

    const orders = await this.prisma.purchaseOrder.findMany({
      where: {
        tenantId,
        paymentStatus: { not: PaymentStatus.PAID },
        status: PurchaseOrderStatus.RECEIVED,
        issueDate: { lte: asOfDate },
      },
      include: {
        supplier: { select: { id: true, name: true, documentNumber: true, paymentTerms: true } },
        purchasePayments: { select: { amount: true } },
      },
    });

    const supplierMap = new Map<string, APAgingRow>();

    for (const order of orders) {
      const supplierId = order.supplierId;
      const paidAmount = order.purchasePayments.reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      );
      const balance = Number(order.total) - paidAmount;
      if (balance <= 0) continue;

      // Calculate due date from payment terms
      const termsDays = this.paymentTermsToDays(order.supplier.paymentTerms);
      const dueDate = new Date(order.issueDate.getTime() + termsDays * 86400000);
      const daysOverdue = Math.floor(
        (asOfDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (!supplierMap.has(supplierId)) {
        supplierMap.set(supplierId, {
          supplierId,
          supplierName: order.supplier.name,
          supplierDocument: order.supplier.documentNumber,
          current: 0,
          days1to30: 0,
          days31to60: 0,
          days61to90: 0,
          days90plus: 0,
          totalOverdue: 0,
          totalBalance: 0,
        });
      }

      const row = supplierMap.get(supplierId)!;
      row.totalBalance += balance;

      if (daysOverdue <= 0) {
        row.current += balance;
      } else if (daysOverdue <= 30) {
        row.days1to30 += balance;
        row.totalOverdue += balance;
      } else if (daysOverdue <= 60) {
        row.days31to60 += balance;
        row.totalOverdue += balance;
      } else if (daysOverdue <= 90) {
        row.days61to90 += balance;
        row.totalOverdue += balance;
      } else {
        row.days90plus += balance;
        row.totalOverdue += balance;
      }
    }

    const rows = Array.from(supplierMap.values()).sort(
      (a, b) => b.totalBalance - a.totalBalance,
    );

    const totals: AgingTotals = {
      current: rows.reduce((s, r) => s + r.current, 0),
      days1to30: rows.reduce((s, r) => s + r.days1to30, 0),
      days31to60: rows.reduce((s, r) => s + r.days31to60, 0),
      days61to90: rows.reduce((s, r) => s + r.days61to90, 0),
      days90plus: rows.reduce((s, r) => s + r.days90plus, 0),
      totalOverdue: rows.reduce((s, r) => s + r.totalOverdue, 0),
      totalBalance: rows.reduce((s, r) => s + r.totalBalance, 0),
    };

    this.logger.debug(`AP Aging: ${rows.length} suppliers, total balance ${totals.totalBalance}`);

    return {
      asOfDate: asOfDate.toISOString().split('T')[0],
      rows,
      totals,
    };
  }

  private paymentTermsToDays(terms: PaymentTerms): number {
    switch (terms) {
      case PaymentTerms.IMMEDIATE: return 0;
      case PaymentTerms.NET_15: return 15;
      case PaymentTerms.NET_30: return 30;
      case PaymentTerms.NET_60: return 60;
      default: return 30;
    }
  }

  // ============================================================================
  // TAX REPORTS
  // ============================================================================

  /**
   * 9. Declaracion de IVA — IVA Declaration (bimonthly).
   * Queries Invoice/InvoiceItem and PurchaseOrder/PurchaseOrderItem directly.
   */
  async getIvaDeclaration(year: number, bimonthlyPeriod: number): Promise<IvaDeclarationReport> {
    const tenantId = this.tenantContext.requireTenantId();

    const { from, to, label } = this.getBimonthlyRange(year, bimonthlyPeriod);

    // --- Sales side (IVA generado) ---
    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        status: { notIn: [InvoiceStatus.CANCELLED, InvoiceStatus.VOID, InvoiceStatus.DRAFT] },
        issueDate: { gte: from, lte: to },
      },
      include: {
        items: { select: { taxRate: true, taxCategory: true, subtotal: true, tax: true } },
      },
    });

    const salesRateMap = new Map<number, IvaRateBreakdown>();
    const salesExemptMap = new Map<string, IvaExemptSummary>();
    const salesInvoiceIds = new Set<string>();

    for (const invoice of invoices) {
      for (const item of invoice.items) {
        const rate = Number(item.taxRate);
        const cat = item.taxCategory as TaxCategory;
        const subtotal = Number(item.subtotal);
        const tax = Number(item.tax);

        if (cat === TaxCategory.EXENTO || cat === TaxCategory.EXCLUIDO) {
          const key = cat as string;
          if (!salesExemptMap.has(key)) {
            salesExemptMap.set(key, { category: cat as 'EXENTO' | 'EXCLUIDO', taxableBase: 0, invoiceCount: 0 });
          }
          const entry = salesExemptMap.get(key)!;
          entry.taxableBase += subtotal;
          if (!salesInvoiceIds.has(`${invoice.id}-${key}`)) {
            entry.invoiceCount++;
            salesInvoiceIds.add(`${invoice.id}-${key}`);
          }
        } else if (rate > 0) {
          if (!salesRateMap.has(rate)) {
            salesRateMap.set(rate, { taxRate: rate, taxableBase: 0, taxAmount: 0, invoiceCount: 0 });
          }
          const entry = salesRateMap.get(rate)!;
          entry.taxableBase += subtotal;
          entry.taxAmount += tax;
          if (!salesInvoiceIds.has(`${invoice.id}-${rate}`)) {
            entry.invoiceCount++;
            salesInvoiceIds.add(`${invoice.id}-${rate}`);
          }
        }
      }
    }

    // --- Purchases side (IVA descontable) ---
    const orders = await this.prisma.purchaseOrder.findMany({
      where: {
        tenantId,
        status: PurchaseOrderStatus.RECEIVED,
        issueDate: { gte: from, lte: to },
      },
      include: {
        items: { select: { taxRate: true, taxCategory: true, subtotal: true, tax: true } },
      },
    });

    const purchasesRateMap = new Map<number, IvaRateBreakdown>();
    const purchasesExemptMap = new Map<string, IvaExemptSummary>();
    const purchasesOrderIds = new Set<string>();

    for (const order of orders) {
      for (const item of order.items) {
        const rate = Number(item.taxRate);
        const cat = item.taxCategory as TaxCategory;
        const subtotal = Number(item.subtotal);
        const tax = Number(item.tax);

        if (cat === TaxCategory.EXENTO || cat === TaxCategory.EXCLUIDO) {
          const key = cat as string;
          if (!purchasesExemptMap.has(key)) {
            purchasesExemptMap.set(key, { category: cat as 'EXENTO' | 'EXCLUIDO', taxableBase: 0, invoiceCount: 0 });
          }
          const entry = purchasesExemptMap.get(key)!;
          entry.taxableBase += subtotal;
          if (!purchasesOrderIds.has(`${order.id}-${key}`)) {
            entry.invoiceCount++;
            purchasesOrderIds.add(`${order.id}-${key}`);
          }
        } else if (rate > 0) {
          if (!purchasesRateMap.has(rate)) {
            purchasesRateMap.set(rate, { taxRate: rate, taxableBase: 0, taxAmount: 0, invoiceCount: 0 });
          }
          const entry = purchasesRateMap.get(rate)!;
          entry.taxableBase += subtotal;
          entry.taxAmount += tax;
          if (!purchasesOrderIds.has(`${order.id}-${rate}`)) {
            entry.invoiceCount++;
            purchasesOrderIds.add(`${order.id}-${rate}`);
          }
        }
      }
    }

    const salesByRate = Array.from(salesRateMap.values()).sort((a, b) => b.taxRate - a.taxRate);
    const salesExempt = Array.from(salesExemptMap.values());
    const purchasesByRate = Array.from(purchasesRateMap.values()).sort((a, b) => b.taxRate - a.taxRate);
    const purchasesExempt = Array.from(purchasesExemptMap.values());

    const totalSalesBase = salesByRate.reduce((s, r) => s + r.taxableBase, 0) + salesExempt.reduce((s, r) => s + r.taxableBase, 0);
    const totalIvaGenerado = salesByRate.reduce((s, r) => s + r.taxAmount, 0);
    const totalPurchasesBase = purchasesByRate.reduce((s, r) => s + r.taxableBase, 0) + purchasesExempt.reduce((s, r) => s + r.taxableBase, 0);
    const totalIvaDescontable = purchasesByRate.reduce((s, r) => s + r.taxAmount, 0);

    this.logger.debug(`IVA Declaration ${year}-${bimonthlyPeriod}: generado=${totalIvaGenerado}, descontable=${totalIvaDescontable}`);

    return {
      year,
      bimonthlyPeriod,
      periodLabel: label,
      fromDate: this.formatLocalDate(from),
      toDate: this.formatLocalDate(to),
      salesByRate,
      salesExempt,
      totalSalesBase,
      totalIvaGenerado,
      purchasesByRate,
      purchasesExempt,
      totalPurchasesBase,
      totalIvaDescontable,
      netIvaPayable: totalIvaGenerado - totalIvaDescontable,
    };
  }

  /**
   * 10. Resumen ReteFuente — Withholding Tax Summary (monthly).
   */
  async getReteFuenteSummary(year: number, month: number): Promise<ReteFuenteSummaryReport> {
    const tenantId = this.tenantContext.requireTenantId();

    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 0, 23, 59, 59, 999);

    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];
    const monthLabel = `${monthNames[month - 1]} ${year}`;

    const orders = await this.prisma.purchaseOrder.findMany({
      where: {
        tenantId,
        status: PurchaseOrderStatus.RECEIVED,
        issueDate: { gte: from, lte: to },
      },
      include: {
        supplier: { select: { id: true, name: true, documentNumber: true } },
      },
    });

    // Group by supplier, only POs where subtotal > min base
    const supplierMap = new Map<string, ReteFuenteSupplierRow>();

    for (const order of orders) {
      const subtotal = Number(order.subtotal);
      if (subtotal <= RETE_FUENTE_MIN_BASE) continue;

      const supplierId = order.supplierId;
      const withheld = Math.round(subtotal * RETE_FUENTE_RATE);

      if (!supplierMap.has(supplierId)) {
        supplierMap.set(supplierId, {
          supplierId,
          supplierName: order.supplier.name,
          supplierNit: order.supplier.documentNumber,
          totalBase: 0,
          totalWithheld: 0,
          withholdingRate: RETE_FUENTE_RATE * 100,
          purchaseCount: 0,
          certificateId: null,
          certificateNumber: null,
        });
      }

      const row = supplierMap.get(supplierId)!;
      row.totalBase += subtotal;
      row.totalWithheld += withheld;
      row.purchaseCount++;
    }

    // Cross-reference with WithholdingCertificate
    const supplierIds = Array.from(supplierMap.keys());
    if (supplierIds.length > 0) {
      const certificates = await this.prisma.withholdingCertificate.findMany({
        where: {
          tenantId,
          year,
          supplierId: { in: supplierIds },
          withholdingType: 'RENTA',
        },
        select: { id: true, supplierId: true, certificateNumber: true },
      });

      for (const cert of certificates) {
        const row = supplierMap.get(cert.supplierId);
        if (row) {
          row.certificateId = cert.id;
          row.certificateNumber = cert.certificateNumber;
        }
      }
    }

    const rows = Array.from(supplierMap.values()).sort((a, b) => b.totalWithheld - a.totalWithheld);

    this.logger.debug(`ReteFuente Summary ${monthLabel}: ${rows.length} suppliers`);

    return {
      year,
      month,
      monthLabel,
      fromDate: this.formatLocalDate(from),
      toDate: this.formatLocalDate(to),
      rows,
      totalBase: rows.reduce((s, r) => s + r.totalBase, 0),
      totalWithheld: rows.reduce((s, r) => s + r.totalWithheld, 0),
    };
  }

  /**
   * 11. Resumen Tributario YTD — Year-to-date tax summary.
   */
  async getYtdTaxSummary(year: number): Promise<YtdTaxSummary> {
    const tenantId = this.tenantContext.requireTenantId();

    const from = new Date(year, 0, 1);
    const to = new Date(year, 11, 31, 23, 59, 59, 999);

    // IVA generado: sum of tax from sales invoice items
    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        status: { notIn: [InvoiceStatus.CANCELLED, InvoiceStatus.VOID, InvoiceStatus.DRAFT] },
        issueDate: { gte: from, lte: to },
      },
      select: { tax: true },
    });

    const ivaGeneradoYtd = invoices.reduce((sum, inv) => sum + Number(inv.tax), 0);

    // IVA descontable: sum of tax from received POs
    const purchaseOrders = await this.prisma.purchaseOrder.findMany({
      where: {
        tenantId,
        status: PurchaseOrderStatus.RECEIVED,
        issueDate: { gte: from, lte: to },
      },
      select: { tax: true, subtotal: true },
    });

    const ivaDescontableYtd = purchaseOrders.reduce((sum, po) => sum + Number(po.tax), 0);

    // ReteFuente: calculated from POs where subtotal > min base
    let reteFuenteBaseYtd = 0;
    let reteFuenteWithheldYtd = 0;
    for (const po of purchaseOrders) {
      const subtotal = Number(po.subtotal);
      if (subtotal > RETE_FUENTE_MIN_BASE) {
        reteFuenteBaseYtd += subtotal;
        reteFuenteWithheldYtd += Math.round(subtotal * RETE_FUENTE_RATE);
      }
    }

    this.logger.debug(`YTD Tax Summary ${year}: IVA generado=${ivaGeneradoYtd}, descontable=${ivaDescontableYtd}, reteFuente=${reteFuenteWithheldYtd}`);

    return {
      year,
      ivaGeneradoYtd,
      ivaDescontableYtd,
      netIvaYtd: ivaGeneradoYtd - ivaDescontableYtd,
      reteFuenteBaseYtd,
      reteFuenteWithheldYtd,
    };
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  /** Format a local date as YYYY-MM-DD without UTC conversion */
  private formatLocalDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private getBimonthlyRange(year: number, period: number): { from: Date; to: Date; label: string } {
    const periodNames = [
      'Enero - Febrero', 'Marzo - Abril', 'Mayo - Junio',
      'Julio - Agosto', 'Septiembre - Octubre', 'Noviembre - Diciembre',
    ];
    const startMonth = (period - 1) * 2;
    const from = new Date(year, startMonth, 1);
    const to = new Date(year, startMonth + 2, 0, 23, 59, 59, 999);
    return { from, to, label: `${periodNames[period - 1]} ${year}` };
  }
}
