// Bank Types

// Bank Account Type
export type BankAccountType = "CHECKING" | "SAVINGS";

// Bank Statement Status
export type BankStatementStatus = "IMPORTED" | "PARTIALLY_RECONCILED" | "RECONCILED";

// Reconciliation Status
export type ReconciliationStatus = "MATCHED" | "UNMATCHED" | "MANUALLY_MATCHED";

// Bank account type display labels in Spanish
export const BankAccountTypeLabels: Record<BankAccountType, string> = {
  CHECKING: "Corriente",
  SAVINGS: "Ahorros",
};

// Bank statement status display labels in Spanish
export const BankStatementStatusLabels: Record<BankStatementStatus, string> = {
  IMPORTED: "Importado",
  PARTIALLY_RECONCILED: "Parcialmente conciliado",
  RECONCILED: "Conciliado",
};

// Reconciliation status display labels in Spanish
export const ReconciliationStatusLabels: Record<ReconciliationStatus, string> = {
  MATCHED: "Conciliado",
  UNMATCHED: "Sin conciliar",
  MANUALLY_MATCHED: "Conciliado manualmente",
};

// Main BankAccount entity
export interface BankAccount {
  id: string;
  name: string;
  bankName: string;
  accountNumber: string;
  accountType: BankAccountType;
  currency: string;
  initialBalance: number;
  currentBalance: number;
  isActive: boolean;
  accountId: string;
  accountCode: string;
  accountName: string;
  statementCount: number;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

// Bank Statement Line
export interface BankStatementLine {
  id: string;
  lineDate: string;
  description: string;
  reference: string | null;
  debit: number;
  credit: number;
  balance: number | null;
  status: ReconciliationStatus;
  matchedJournalEntryId: string | null;
  matchedPaymentId: string | null;
  matchedAt: string | null;
}

// Bank Statement
export interface BankStatement {
  id: string;
  bankAccountId: string;
  bankAccountName: string;
  fileName: string;
  periodStart: string;
  periodEnd: string;
  status: BankStatementStatus;
  totalLines: number;
  matchedLines: number;
  matchPercentage: number;
  importedAt: string;
  importedById: string | null;
  reconciledAt: string | null;
  lines: BankStatementLine[] | null;
  tenantId: string;
  createdAt: string;
}

// Reconciliation Result
export interface ReconciliationResult {
  statementId: string;
  totalLines: number;
  matchedLines: number;
  matchPercentage: number;
  newMatches: number;
}

// Filters for bank account list
export interface BankAccountFilters {
  search?: string;
  accountType?: BankAccountType;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// Filters for bank statement list
export interface BankStatementFilters {
  search?: string;
  bankAccountId?: string;
  status?: BankStatementStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// Paginated response for bank accounts
export interface BankAccountsResponse {
  data: BankAccount[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Paginated response for bank statements
export interface BankStatementsResponse {
  data: BankStatement[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Create bank account data
export interface CreateBankAccountData {
  name: string;
  bankName: string;
  accountNumber: string;
  accountType: BankAccountType;
  currency?: string;
  initialBalance?: number;
}

// Update bank account data
export interface UpdateBankAccountData {
  name?: string;
  bankName?: string;
  currency?: string;
}

// Import statement data
export interface ImportStatementData {
  bankAccountId: string;
  periodStart: string;
  periodEnd: string;
  dateColumn?: string;
  descriptionColumn?: string;
  debitColumn?: string;
  creditColumn?: string;
  referenceColumn?: string;
  balanceColumn?: string;
  headerRow?: number;
}
