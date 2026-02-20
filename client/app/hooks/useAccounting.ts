import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { accountingService } from "~/services/accounting.service";
import { queryKeys } from "~/lib/query-client";
import { toast } from "~/components/ui/Toast";
import { useIsQueryEnabled } from "./useIsQueryEnabled";
import type {
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
  AccountingConfig,
  UpdateAccountingConfigData,
} from "~/types/accounting";

// ============================================================================
// QUERIES
// ============================================================================

export function useAccountingConfig() {
  const enabled = useIsQueryEnabled();
  return useQuery<AccountingConfig>({
    queryKey: queryKeys.accounting.config(),
    queryFn: () => accountingService.getConfig(),
    staleTime: 1000 * 60 * 5,
    enabled,
  });
}

export function useAccounts() {
  const enabled = useIsQueryEnabled();
  return useQuery<Account[]>({
    queryKey: queryKeys.accounting.accounts(),
    queryFn: () => accountingService.getAccounts(),
    staleTime: 1000 * 60 * 2,
    placeholderData: (previousData) => previousData,
    enabled,
  });
}

export function useAccountTree() {
  const enabled = useIsQueryEnabled();
  return useQuery<AccountTree[]>({
    queryKey: queryKeys.accounting.accountTree(),
    queryFn: () => accountingService.getAccountTree(),
    staleTime: 1000 * 60 * 2,
    placeholderData: (previousData) => previousData,
    enabled,
  });
}

export function useAccount(id: string) {
  const enabled = useIsQueryEnabled();
  return useQuery<Account>({
    queryKey: queryKeys.accounting.accountDetail(id),
    queryFn: () => accountingService.getAccount(id),
    staleTime: 1000 * 60 * 5,
    enabled: enabled && !!id,
  });
}

export function useJournalEntries(filters: JournalEntryFilters = {}) {
  const enabled = useIsQueryEnabled();
  return useQuery<JournalEntriesResponse>({
    queryKey: queryKeys.accounting.journalEntries(
      filters as Record<string, unknown>,
    ),
    queryFn: () => accountingService.getJournalEntries(filters),
    staleTime: 1000 * 60 * 2,
    placeholderData: (previousData) => previousData,
    enabled,
  });
}

export function useJournalEntry(id: string) {
  const enabled = useIsQueryEnabled();
  return useQuery<JournalEntry>({
    queryKey: queryKeys.accounting.journalEntry(id),
    queryFn: () => accountingService.getJournalEntry(id),
    staleTime: 1000 * 60 * 5,
    enabled: enabled && !!id,
  });
}

export function useAccountingPeriods() {
  const enabled = useIsQueryEnabled();
  return useQuery<AccountingPeriod[]>({
    queryKey: queryKeys.accounting.periods(),
    queryFn: () => accountingService.getAccountingPeriods(),
    staleTime: 1000 * 60 * 2,
    placeholderData: (previousData) => previousData,
    enabled,
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

export function useSetupAccounting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => accountingService.setup(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.accounting.all,
      });
      toast.success("Contabilidad configurada exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al configurar la contabilidad");
    },
  });
}

export function useUpdateAccountingConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateAccountingConfigData) =>
      accountingService.updateConfig(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.accounting.config(),
      });
      toast.success("Configuracion contable actualizada exitosamente");
    },
    onError: (error: Error) => {
      toast.error(
        error.message || "Error al actualizar la configuracion contable",
      );
    },
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAccountData) =>
      accountingService.createAccount(data),
    onSuccess: (account) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.accounting.accounts(),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.accounting.accountTree(),
      });
      toast.success(`Cuenta "${account.code} - ${account.name}" creada exitosamente`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al crear la cuenta");
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAccountData }) =>
      accountingService.updateAccount(id, data),
    onSuccess: (account) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.accounting.accounts(),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.accounting.accountTree(),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.accounting.accountDetail(account.id),
      });
      toast.success("Cuenta actualizada exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al actualizar la cuenta");
    },
  });
}

export function useCreateJournalEntry() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateJournalEntryData) =>
      accountingService.createJournalEntry(data),
    onSuccess: (entry) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.accounting.journalEntries(),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.accounting.all,
      });
      toast.success(
        `Asiento "${entry.entryNumber}" creado exitosamente`,
      );
      navigate(`/accounting/journal-entries/${entry.id}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al crear el asiento contable");
    },
  });
}

export function usePostJournalEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => accountingService.postJournalEntry(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["accounting", "journal-entries"],
      });
      toast.success("Asiento contabilizado");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al contabilizar el asiento");
    },
  });
}

export function useVoidJournalEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      accountingService.voidJournalEntry(id, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["accounting", "journal-entries"],
      });
      toast.success("Asiento anulado");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al anular el asiento");
    },
  });
}

export function useCreateAccountingPeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAccountingPeriodData) =>
      accountingService.createAccountingPeriod(data),
    onSuccess: (period) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.accounting.periods(),
      });
      toast.success(`Periodo "${period.name}" creado exitosamente`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al crear el periodo contable");
    },
  });
}

export function useCloseAccountingPeriod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      accountingService.closeAccountingPeriod(id, notes),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.accounting.periods(),
      });
      toast.success("Periodo cerrado");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al cerrar el periodo");
    },
  });
}
