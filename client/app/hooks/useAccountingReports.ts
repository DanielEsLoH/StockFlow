import { useQuery } from "@tanstack/react-query";
import { accountingService } from "~/services/accounting.service";
import { queryKeys } from "~/lib/query-client";
import { useIsQueryEnabled } from "./useIsQueryEnabled";
import type {
  TrialBalanceReport,
  GeneralJournalReport,
  GeneralLedgerReport,
  BalanceSheetReport,
  IncomeStatementReport,
  CashFlowReport,
} from "~/types/accounting";

// ============================================================================
// REPORT QUERIES
// ============================================================================

export function useTrialBalance(asOfDate?: string) {
  const enabled = useIsQueryEnabled();
  return useQuery<TrialBalanceReport>({
    queryKey: queryKeys.accounting.trialBalance({ asOfDate }),
    queryFn: () => accountingService.getTrialBalance(asOfDate),
    staleTime: 1000 * 60 * 1,
    enabled,
  });
}

export function useGeneralJournal(fromDate?: string, toDate?: string) {
  const enabled = useIsQueryEnabled();
  return useQuery<GeneralJournalReport>({
    queryKey: queryKeys.accounting.generalJournal({ fromDate, toDate }),
    queryFn: () => accountingService.getGeneralJournal(fromDate!, toDate!),
    staleTime: 1000 * 60 * 1,
    enabled: enabled && !!fromDate && !!toDate,
  });
}

export function useGeneralLedger(
  fromDate?: string,
  toDate?: string,
  accountId?: string,
) {
  const enabled = useIsQueryEnabled();
  return useQuery<GeneralLedgerReport>({
    queryKey: queryKeys.accounting.generalLedger({
      fromDate,
      toDate,
      accountId,
    }),
    queryFn: () =>
      accountingService.getGeneralLedger(fromDate!, toDate!, accountId),
    staleTime: 1000 * 60 * 1,
    enabled: enabled && !!fromDate && !!toDate,
  });
}

export function useBalanceSheet(asOfDate?: string) {
  const enabled = useIsQueryEnabled();
  return useQuery<BalanceSheetReport>({
    queryKey: queryKeys.accounting.balanceSheet({ asOfDate }),
    queryFn: () => accountingService.getBalanceSheet(asOfDate),
    staleTime: 1000 * 60 * 1,
    enabled,
  });
}

export function useIncomeStatement(fromDate?: string, toDate?: string) {
  const enabled = useIsQueryEnabled();
  return useQuery<IncomeStatementReport>({
    queryKey: queryKeys.accounting.incomeStatement({ fromDate, toDate }),
    queryFn: () => accountingService.getIncomeStatement(fromDate!, toDate!),
    staleTime: 1000 * 60 * 1,
    enabled: enabled && !!fromDate && !!toDate,
  });
}

export function useCashFlow(fromDate?: string, toDate?: string) {
  const enabled = useIsQueryEnabled();
  return useQuery<CashFlowReport>({
    queryKey: queryKeys.accounting.cashFlow({ fromDate, toDate }),
    queryFn: () => accountingService.getCashFlow(fromDate!, toDate!),
    staleTime: 1000 * 60 * 1,
    enabled: enabled && !!fromDate && !!toDate,
  });
}
