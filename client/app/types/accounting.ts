// Accounting Types

// ============================
// Account (PUC - Plan Unico de Cuentas)
// ============================

export type AccountType =
  | "ASSET"
  | "LIABILITY"
  | "EQUITY"
  | "REVENUE"
  | "EXPENSE"
  | "COGS";

export const AccountTypeLabels: Record<AccountType, string> = {
  ASSET: "Activo",
  LIABILITY: "Pasivo",
  EQUITY: "Patrimonio",
  REVENUE: "Ingreso",
  EXPENSE: "Gasto",
  COGS: "Costo de Ventas",
};

export type AccountNature = "DEBIT" | "CREDIT";

export const AccountNatureLabels: Record<AccountNature, string> = {
  DEBIT: "Debito",
  CREDIT: "Credito",
};

export interface Account {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description: string | null;
  type: AccountType;
  nature: AccountNature;
  parentId: string | null;
  level: number;
  isActive: boolean;
  isSystemAccount: boolean;
  isBankAccount: boolean;
  children?: Account[];
  createdAt: string;
  updatedAt: string;
}

export interface AccountTreeResponse {
  data: Account[];
  total: number;
}

export interface AccountFilters {
  search?: string;
  type?: AccountType;
  activeOnly?: boolean;
}

// Alias for tree view (Account already has children?: Account[])
export type AccountTree = Account;

export interface CreateAccountData {
  code: string;
  name: string;
  description?: string;
  type: AccountType;
  nature: AccountNature;
  parentId?: string;
  isBankAccount?: boolean;
}

export interface UpdateAccountData {
  name?: string;
  description?: string;
  isActive?: boolean;
}

// ============================
// Journal Entry
// ============================

export type JournalEntryStatus = "DRAFT" | "POSTED" | "VOIDED";

export const JournalEntryStatusLabels: Record<JournalEntryStatus, string> = {
  DRAFT: "Borrador",
  POSTED: "Contabilizado",
  VOIDED: "Anulado",
};

export type JournalEntrySource =
  | "MANUAL"
  | "INVOICE_SALE"
  | "INVOICE_CANCEL"
  | "PAYMENT_RECEIVED"
  | "PURCHASE_RECEIVED"
  | "STOCK_ADJUSTMENT"
  | "PERIOD_CLOSE";

export const JournalEntrySourceLabels: Record<JournalEntrySource, string> = {
  MANUAL: "Manual",
  INVOICE_SALE: "Venta (Factura)",
  INVOICE_CANCEL: "Anulacion de Factura",
  PAYMENT_RECEIVED: "Pago Recibido",
  PURCHASE_RECEIVED: "Compra Recibida",
  STOCK_ADJUSTMENT: "Ajuste de Inventario",
  PERIOD_CLOSE: "Cierre de Periodo",
};

export interface JournalEntryLine {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  costCenterId: string | null;
  costCenterCode: string | null;
  costCenterName: string | null;
  description: string | null;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  tenantId: string;
  periodId: string | null;
  entryNumber: string;
  date: string;
  description: string;
  source: JournalEntrySource;
  status: JournalEntryStatus;
  invoiceId: string | null;
  paymentId: string | null;
  purchaseOrderId: string | null;
  stockMovementId: string | null;
  totalDebit: number;
  totalCredit: number;
  createdById: string | null;
  postedAt: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  lines: JournalEntryLine[];
  createdAt: string;
  updatedAt: string;
}

export interface JournalEntryFilters {
  search?: string;
  status?: JournalEntryStatus;
  source?: JournalEntrySource;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface JournalEntriesResponse {
  data: JournalEntry[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Create journal entry line data
export interface JournalEntryLineData {
  accountId: string;
  costCenterId?: string;
  description?: string;
  debit: number;
  credit: number;
}

// Create journal entry data
export interface CreateJournalEntryData {
  date: string;
  description: string;
  periodId?: string;
  lines: JournalEntryLineData[];
}

// ============================
// Accounting Period
// ============================

export type AccountingPeriodStatus = "OPEN" | "CLOSING" | "CLOSED";

export const AccountingPeriodStatusLabels: Record<AccountingPeriodStatus, string> = {
  OPEN: "Abierto",
  CLOSING: "En Cierre",
  CLOSED: "Cerrado",
};

export interface AccountingPeriod {
  id: string;
  tenantId: string;
  name: string;
  startDate: string;
  endDate: string;
  status: AccountingPeriodStatus;
  closedAt: string | null;
  closedById: string | null;
  notes: string | null;
  entryCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccountingPeriodData {
  name: string;
  startDate: string;
  endDate: string;
}

// ============================
// Accounting Config
// ============================

export interface AccountingConfig {
  id: string;
  tenantId: string;
  cashAccountId: string | null;
  bankAccountId: string | null;
  accountsReceivableId: string | null;
  inventoryAccountId: string | null;
  accountsPayableId: string | null;
  ivaPorPagarId: string | null;
  ivaDescontableId: string | null;
  revenueAccountId: string | null;
  cogsAccountId: string | null;
  inventoryAdjustmentId: string | null;
  reteFuenteReceivedId: string | null;
  reteFuentePayableId: string | null;
  autoGenerateEntries: boolean;
  isConfigured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateAccountingConfigData {
  cashAccountId?: string;
  bankAccountId?: string;
  accountsReceivableId?: string;
  inventoryAccountId?: string;
  accountsPayableId?: string;
  ivaPorPagarId?: string;
  ivaDescontableId?: string;
  revenueAccountId?: string;
  cogsAccountId?: string;
  inventoryAdjustmentId?: string;
  reteFuenteReceivedId?: string;
  reteFuentePayableId?: string;
  autoGenerateEntries?: boolean;
}

// ============================
// Reports
// ============================

// Shared account balance row used across reports
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

// Balance sheet / income statement section
export interface ReportSection {
  title: string;
  accounts: AccountBalance[];
  total: number;
}

// 1. Balance de Prueba
export interface TrialBalanceReport {
  asOfDate: string;
  accounts: AccountBalance[];
  totalDebit: number;
  totalCredit: number;
}

// 2. Libro Diario
export interface GeneralJournalRow {
  entryId: string;
  entryNumber: string;
  date: string;
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

// 3. Libro Mayor
export interface LedgerMovement {
  entryId: string;
  entryNumber: string;
  date: string;
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

// 4. Balance General
export interface BalanceSheetReport {
  asOfDate: string;
  assets: ReportSection;
  liabilities: ReportSection;
  equity: ReportSection;
  totalAssets: number;
  totalLiabilitiesAndEquity: number;
}

// 5. Estado de Resultados
export interface IncomeStatementReport {
  fromDate: string;
  toDate: string;
  revenue: ReportSection;
  cogs: ReportSection;
  grossProfit: number;
  expenses: ReportSection;
  netIncome: number;
}

// 6. Flujo de Efectivo
export interface CashFlowMovement {
  date: string;
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

// ============================
// AR/AP Aging Reports
// ============================

export interface AgingTotals {
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  days90plus: number;
  totalOverdue: number;
  totalBalance: number;
}

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

// ============================
// Tax Reports (Informes Tributarios)
// ============================

export interface IvaRateBreakdown {
  taxRate: number;
  taxableBase: number;
  taxAmount: number;
  invoiceCount: number;
}

export interface IvaExemptSummary {
  category: "EXENTO" | "EXCLUIDO";
  taxableBase: number;
  invoiceCount: number;
}

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

export interface YtdTaxSummary {
  year: number;
  ivaGeneradoYtd: number;
  ivaDescontableYtd: number;
  netIvaYtd: number;
  reteFuenteBaseYtd: number;
  reteFuenteWithheldYtd: number;
}
