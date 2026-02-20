import { api } from "~/lib/api";
import type {
  BankAccount,
  CreateBankAccountData,
  UpdateBankAccountData,
  BankStatement,
  ReconciliationResult,
} from "~/types/bank";

export const bankService = {
  // Bank Accounts
  async getBankAccounts(activeOnly?: boolean): Promise<BankAccount[]> {
    const params = new URLSearchParams();
    if (activeOnly !== undefined) {
      params.append("activeOnly", String(activeOnly));
    }
    const { data } = await api.get<BankAccount[]>(
      `/bank-accounts?${params.toString()}`,
    );
    return data;
  },

  async getBankAccount(id: string): Promise<BankAccount> {
    const { data } = await api.get<BankAccount>(`/bank-accounts/${id}`);
    return data;
  },

  async createBankAccount(
    accountData: CreateBankAccountData,
  ): Promise<BankAccount> {
    const { data } = await api.post<BankAccount>(
      "/bank-accounts",
      accountData,
    );
    return data;
  },

  async updateBankAccount(
    id: string,
    accountData: UpdateBankAccountData,
  ): Promise<BankAccount> {
    const { data } = await api.patch<BankAccount>(
      `/bank-accounts/${id}`,
      accountData,
    );
    return data;
  },

  // Bank Statements
  async getStatements(bankAccountId: string): Promise<BankStatement[]> {
    const { data } = await api.get<BankStatement[]>(
      `/bank-statements/by-account/${bankAccountId}`,
    );
    return data;
  },

  async getStatement(id: string): Promise<BankStatement> {
    const { data } = await api.get<BankStatement>(`/bank-statements/${id}`);
    return data;
  },

  async importStatement(formData: FormData): Promise<BankStatement> {
    const { data } = await api.post<BankStatement>(
      "/bank-statements/import",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
  },

  async deleteStatement(id: string): Promise<void> {
    await api.delete(`/bank-statements/${id}`);
  },

  // Reconciliation
  async autoMatch(statementId: string): Promise<ReconciliationResult> {
    const { data } = await api.post<ReconciliationResult>(
      `/bank-reconciliation/${statementId}/auto-match`,
    );
    return data;
  },

  async manualMatch(
    lineId: string,
    journalEntryId: string,
  ): Promise<void> {
    await api.post("/bank-reconciliation/manual-match", {
      lineId,
      journalEntryId,
    });
  },

  async unmatch(lineId: string): Promise<void> {
    await api.post(`/bank-reconciliation/unmatch/${lineId}`);
  },

  async finalize(statementId: string): Promise<void> {
    await api.post(`/bank-reconciliation/${statementId}/finalize`);
  },
};
