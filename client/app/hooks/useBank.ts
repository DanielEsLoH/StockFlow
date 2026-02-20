import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { bankService } from "~/services/bank.service";
import { queryKeys } from "~/lib/query-client";
import { toast } from "~/components/ui/Toast";
import { useIsQueryEnabled } from "./useIsQueryEnabled";
import type {
  BankAccount,
  CreateBankAccountData,
  UpdateBankAccountData,
  BankStatement,
  ReconciliationResult,
} from "~/types/bank";

// ============================================================================
// QUERIES
// ============================================================================

export function useBankAccounts(activeOnly?: boolean) {
  const enabled = useIsQueryEnabled();
  return useQuery<BankAccount[]>({
    queryKey: queryKeys.bank.accounts({ activeOnly }),
    queryFn: () => bankService.getBankAccounts(activeOnly),
    staleTime: 1000 * 60 * 2,
    placeholderData: (previousData) => previousData,
    enabled,
  });
}

export function useBankAccount(id: string) {
  const enabled = useIsQueryEnabled();
  return useQuery<BankAccount>({
    queryKey: queryKeys.bank.account(id),
    queryFn: () => bankService.getBankAccount(id),
    staleTime: 1000 * 60 * 5,
    enabled: enabled && !!id,
  });
}

export function useBankStatements(bankAccountId: string) {
  const enabled = useIsQueryEnabled();
  return useQuery<BankStatement[]>({
    queryKey: queryKeys.bank.statements(bankAccountId),
    queryFn: () => bankService.getStatements(bankAccountId),
    staleTime: 1000 * 60 * 2,
    placeholderData: (previousData) => previousData,
    enabled: enabled && !!bankAccountId,
  });
}

export function useBankStatement(id: string) {
  const enabled = useIsQueryEnabled();
  return useQuery<BankStatement>({
    queryKey: queryKeys.bank.statement(id),
    queryFn: () => bankService.getStatement(id),
    staleTime: 1000 * 60 * 5,
    enabled: enabled && !!id,
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

export function useCreateBankAccount() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBankAccountData) =>
      bankService.createBankAccount(data),
    onSuccess: (account) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.bank.all,
      });
      toast.success("Cuenta bancaria creada");
      navigate(`/bank/accounts/${account.id}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al crear la cuenta bancaria");
    },
  });
}

export function useUpdateBankAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBankAccountData }) =>
      bankService.updateBankAccount(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.bank.all,
      });
      toast.success("Cuenta bancaria actualizada");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al actualizar la cuenta bancaria");
    },
  });
}

export function useImportStatement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: FormData) => bankService.importStatement(formData),
    onSuccess: (statement) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.bank.statements(statement.bankAccountId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.bank.account(statement.bankAccountId),
      });
      toast.success("Extracto importado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al importar el extracto");
    },
  });
}

export function useDeleteStatement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      bankAccountId,
    }: {
      id: string;
      bankAccountId: string;
    }) => bankService.deleteStatement(id).then(() => bankAccountId),
    onSuccess: (bankAccountId) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.bank.statements(bankAccountId),
      });
      toast.success("Extracto eliminado");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar el extracto");
    },
  });
}

export function useAutoMatch(statementId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => bankService.autoMatch(statementId),
    onSuccess: (result: ReconciliationResult) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.bank.statement(statementId),
      });
      toast.success(
        `Conciliacion automatica: ${result.newMatches} coincidencias encontradas`,
      );
    },
    onError: (error: Error) => {
      toast.error(
        error.message || "Error al ejecutar la conciliacion automatica",
      );
    },
  });
}

export function useManualMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      lineId,
      journalEntryId,
      statementId,
    }: {
      lineId: string;
      journalEntryId: string;
      statementId: string;
    }) =>
      bankService
        .manualMatch(lineId, journalEntryId)
        .then(() => statementId),
    onSuccess: (statementId) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.bank.statement(statementId),
      });
      toast.success("Linea conciliada");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al conciliar la linea");
    },
  });
}

export function useUnmatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      lineId,
      statementId,
    }: {
      lineId: string;
      statementId: string;
    }) => bankService.unmatch(lineId).then(() => statementId),
    onSuccess: (statementId) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.bank.statement(statementId),
      });
      toast.success("Conciliacion deshecha");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al deshacer la conciliacion");
    },
  });
}

export function useFinalizeReconciliation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (statementId: string) => bankService.finalize(statementId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.bank.all,
      });
      toast.success("Conciliacion finalizada");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al finalizar la conciliacion");
    },
  });
}
