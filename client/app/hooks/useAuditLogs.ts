import { useQuery } from "@tanstack/react-query";
import { auditLogsService } from "~/services/audit-logs.service";
import { queryKeys } from "~/lib/query-client";
import { useIsQueryEnabled } from "./useIsQueryEnabled";
import type { AuditLogFilters, AuditLogsResponse, AuditStats } from "~/types/audit-log";

export function useAuditLogs(filters: AuditLogFilters = {}) {
  const enabled = useIsQueryEnabled();
  return useQuery<AuditLogsResponse>({
    queryKey: queryKeys.auditLogs.list(filters as Record<string, unknown>),
    queryFn: () => auditLogsService.getAuditLogs(filters),
    staleTime: 1000 * 30,
    enabled,
  });
}

export function useAuditStats(startDate?: string, endDate?: string) {
  const enabled = useIsQueryEnabled();
  return useQuery<AuditStats>({
    queryKey: queryKeys.auditLogs.stats({ startDate, endDate }),
    queryFn: () => auditLogsService.getStats(startDate, endDate),
    staleTime: 1000 * 60,
    enabled,
  });
}
