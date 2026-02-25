export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "LOGOUT"
  | "EXPORT"
  | "IMPORT";

export const AuditActionLabels: Record<AuditAction, string> = {
  CREATE: "Creacion",
  UPDATE: "Actualizacion",
  DELETE: "Eliminacion",
  LOGIN: "Inicio Sesion",
  LOGOUT: "Cierre Sesion",
  EXPORT: "Exportacion",
  IMPORT: "Importacion",
};

export interface AuditLog {
  id: string;
  tenantId: string;
  userId: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
}

export interface AuditLogFilters {
  action?: AuditAction;
  entityType?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface AuditLogsResponse {
  data: AuditLog[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AuditStats {
  totalLogs: number;
  actionBreakdown: Record<AuditAction, number>;
  entityTypeBreakdown: Record<string, number>;
  topUsers: Array<{
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    count: number;
  }>;
  recentActivity: Array<{
    date: string;
    count: number;
  }>;
}
