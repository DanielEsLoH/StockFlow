import { api } from "~/lib/api";
import type {
  AccountingConfig,
  UpdateAccountingConfigData,
  Account,
  AccountTree,
  CreateAccountData,
  UpdateAccountData,
  JournalEntry,
  JournalEntryFilters,
  JournalEntriesResponse,
  CreateJournalEntryData,
  AccountingPeriod,
  CreateAccountingPeriodData,
  TrialBalanceReport,
  GeneralJournalReport,
  GeneralLedgerReport,
  BalanceSheetReport,
  IncomeStatementReport,
  CashFlowReport,
  ARAgingReport,
  APAgingReport,
} from "~/types/accounting";

export const accountingService = {
  // Setup
  async setup(): Promise<void> {
    await api.post("/accounting/setup");
  },

  // Config
  async getConfig(): Promise<AccountingConfig> {
    const { data } = await api.get<AccountingConfig>("/accounting/config");
    return data;
  },

  async updateConfig(
    configData: UpdateAccountingConfigData,
  ): Promise<AccountingConfig> {
    const { data } = await api.patch<AccountingConfig>(
      "/accounting/config",
      configData,
    );
    return data;
  },

  // Accounts (PUC)
  async getAccounts(): Promise<Account[]> {
    const { data } = await api.get<Account[]>("/accounts");
    return data;
  },

  async getAccountTree(): Promise<AccountTree[]> {
    const { data } = await api.get<AccountTree[]>("/accounts?tree=true");
    return data;
  },

  async getAccount(id: string): Promise<Account> {
    const { data } = await api.get<Account>(`/accounts/${id}`);
    return data;
  },

  async createAccount(accountData: CreateAccountData): Promise<Account> {
    const { data } = await api.post<Account>("/accounts", accountData);
    return data;
  },

  async updateAccount(
    id: string,
    accountData: UpdateAccountData,
  ): Promise<Account> {
    const { data } = await api.patch<Account>(`/accounts/${id}`, accountData);
    return data;
  },

  // Journal Entries
  async getJournalEntries(
    filters: JournalEntryFilters = {},
  ): Promise<JournalEntriesResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    const { data } = await api.get<JournalEntriesResponse>(
      `/journal-entries?${params.toString()}`,
    );
    return data;
  },

  async getJournalEntry(id: string): Promise<JournalEntry> {
    const { data } = await api.get<JournalEntry>(`/journal-entries/${id}`);
    return data;
  },

  async createJournalEntry(
    entryData: CreateJournalEntryData,
  ): Promise<JournalEntry> {
    const { data } = await api.post<JournalEntry>(
      "/journal-entries",
      entryData,
    );
    return data;
  },

  async postJournalEntry(id: string): Promise<JournalEntry> {
    const { data } = await api.patch<JournalEntry>(
      `/journal-entries/${id}/post`,
    );
    return data;
  },

  async voidJournalEntry(id: string, reason: string): Promise<JournalEntry> {
    const { data } = await api.patch<JournalEntry>(
      `/journal-entries/${id}/void`,
      { reason },
    );
    return data;
  },

  // Accounting Periods
  async getAccountingPeriods(): Promise<AccountingPeriod[]> {
    const { data } =
      await api.get<AccountingPeriod[]>("/accounting-periods");
    return data;
  },

  async createAccountingPeriod(
    periodData: CreateAccountingPeriodData,
  ): Promise<AccountingPeriod> {
    const { data } = await api.post<AccountingPeriod>(
      "/accounting-periods",
      periodData,
    );
    return data;
  },

  async closeAccountingPeriod(
    id: string,
    notes?: string,
  ): Promise<AccountingPeriod> {
    const { data } = await api.patch<AccountingPeriod>(
      `/accounting-periods/${id}/close`,
      { notes },
    );
    return data;
  },

  // Reports
  async getTrialBalance(asOfDate?: string): Promise<TrialBalanceReport> {
    const params = new URLSearchParams();
    if (asOfDate) params.append("asOfDate", asOfDate);
    const { data } = await api.get<TrialBalanceReport>(
      `/accounting/reports/trial-balance?${params.toString()}`,
    );
    return data;
  },

  async getGeneralJournal(
    fromDate: string,
    toDate: string,
  ): Promise<GeneralJournalReport> {
    const params = new URLSearchParams();
    params.append("fromDate", fromDate);
    params.append("toDate", toDate);
    const { data } = await api.get<GeneralJournalReport>(
      `/accounting/reports/general-journal?${params.toString()}`,
    );
    return data;
  },

  async getGeneralLedger(
    fromDate: string,
    toDate: string,
    accountId?: string,
  ): Promise<GeneralLedgerReport> {
    const params = new URLSearchParams();
    params.append("fromDate", fromDate);
    params.append("toDate", toDate);
    if (accountId) params.append("accountId", accountId);
    const { data } = await api.get<GeneralLedgerReport>(
      `/accounting/reports/general-ledger?${params.toString()}`,
    );
    return data;
  },

  async getBalanceSheet(asOfDate?: string): Promise<BalanceSheetReport> {
    const params = new URLSearchParams();
    if (asOfDate) params.append("asOfDate", asOfDate);
    const { data } = await api.get<BalanceSheetReport>(
      `/accounting/reports/balance-sheet?${params.toString()}`,
    );
    return data;
  },

  async getIncomeStatement(
    fromDate: string,
    toDate: string,
  ): Promise<IncomeStatementReport> {
    const params = new URLSearchParams();
    params.append("fromDate", fromDate);
    params.append("toDate", toDate);
    const { data } = await api.get<IncomeStatementReport>(
      `/accounting/reports/income-statement?${params.toString()}`,
    );
    return data;
  },

  async getCashFlow(
    fromDate: string,
    toDate: string,
  ): Promise<CashFlowReport> {
    const params = new URLSearchParams();
    params.append("fromDate", fromDate);
    params.append("toDate", toDate);
    const { data } = await api.get<CashFlowReport>(
      `/accounting/reports/cash-flow?${params.toString()}`,
    );
    return data;
  },

  async getARAgingReport(asOfDate?: string): Promise<ARAgingReport> {
    const params = new URLSearchParams();
    if (asOfDate) params.append("asOfDate", asOfDate);
    const { data } = await api.get<ARAgingReport>(
      `/accounting/reports/ar-aging?${params.toString()}`,
    );
    return data;
  },

  async getAPAgingReport(asOfDate?: string): Promise<APAgingReport> {
    const params = new URLSearchParams();
    if (asOfDate) params.append("asOfDate", asOfDate);
    const { data } = await api.get<APAgingReport>(
      `/accounting/reports/ap-aging?${params.toString()}`,
    );
    return data;
  },

  async downloadCostCenterBalanceReport(
    fromDate: string,
    toDate: string,
    format: "pdf" | "excel",
    costCenterId?: string,
  ): Promise<{ blob: Blob; fileName: string }> {
    const params = new URLSearchParams();
    params.append("fromDate", fromDate);
    params.append("toDate", toDate);
    params.append("format", format);
    if (costCenterId) params.append("costCenterId", costCenterId);
    const { data } = await api.get(
      `/reports/cost-center-balance?${params.toString()}`,
      { responseType: "blob" },
    );
    const ext = format === "pdf" ? "pdf" : "xlsx";
    const fileName = `balance-centro-costo-${fromDate}-${toDate}.${ext}`;
    return { blob: data, fileName };
  },
};
