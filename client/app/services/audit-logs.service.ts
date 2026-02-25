import { api } from "~/lib/api";
import type {
  AuditLogFilters,
  AuditLogsResponse,
  AuditStats,
} from "~/types/audit-log";

export const auditLogsService = {
  async getAuditLogs(
    filters: AuditLogFilters = {},
  ): Promise<AuditLogsResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.append(key, String(value));
      }
    });
    const { data } = await api.get<AuditLogsResponse>(
      `/audit-logs?${params.toString()}`,
    );
    return data;
  },

  async getStats(
    startDate?: string,
    endDate?: string,
  ): Promise<AuditStats> {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    const { data } = await api.get<AuditStats>(
      `/audit-logs/stats?${params.toString()}`,
    );
    return data;
  },
};
