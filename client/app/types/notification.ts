// Notification Types

// Notification Type (category of notification)
export type NotificationType =
  | "LOW_STOCK"
  | "OUT_OF_STOCK"
  | "NEW_INVOICE"
  | "INVOICE_PAID"
  | "INVOICE_OVERDUE"
  | "PAYMENT_RECEIVED"
  | "PAYMENT_FAILED"
  | "NEW_CUSTOMER"
  | "REPORT_READY"
  | "SYSTEM"
  | "INFO"
  | "WARNING"
  | "SUCCESS"
  | "ERROR"
  | "USER_VERIFIED_EMAIL"
  | "USER_APPROVED"
  | "SUBSCRIPTION_EXPIRING"
  | "SUBSCRIPTION_EXPIRED"
  | "SUBSCRIPTION_ACTIVATED";

// Notification Priority
export type NotificationPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

// Display category for styling
export type NotificationCategory = "info" | "success" | "warning" | "error";

// Notification type labels in Spanish
export const NotificationTypeLabels: Record<NotificationType, string> = {
  LOW_STOCK: "Stock bajo",
  OUT_OF_STOCK: "Agotado",
  NEW_INVOICE: "Nueva factura",
  INVOICE_PAID: "Factura pagada",
  INVOICE_OVERDUE: "Factura vencida",
  PAYMENT_RECEIVED: "Pago recibido",
  PAYMENT_FAILED: "Pago fallido",
  NEW_CUSTOMER: "Nuevo cliente",
  REPORT_READY: "Reporte listo",
  SYSTEM: "Sistema",
  INFO: "Informacion",
  WARNING: "Advertencia",
  SUCCESS: "Exito",
  ERROR: "Error",
  USER_VERIFIED_EMAIL: "Email verificado",
  USER_APPROVED: "Usuario aprobado",
  SUBSCRIPTION_EXPIRING: "Suscripción por vencer",
  SUBSCRIPTION_EXPIRED: "Suscripción vencida",
  SUBSCRIPTION_ACTIVATED: "Suscripción activada",
};

// Priority labels in Spanish
export const NotificationPriorityLabels: Record<NotificationPriority, string> =
  {
    LOW: "Baja",
    MEDIUM: "Media",
    HIGH: "Alta",
    URGENT: "Urgente",
  };

// Map notification types to categories for styling
export const NotificationTypeToCategory: Record<
  NotificationType,
  NotificationCategory
> = {
  LOW_STOCK: "warning",
  OUT_OF_STOCK: "error",
  NEW_INVOICE: "info",
  INVOICE_PAID: "success",
  INVOICE_OVERDUE: "warning",
  PAYMENT_RECEIVED: "success",
  PAYMENT_FAILED: "error",
  NEW_CUSTOMER: "info",
  REPORT_READY: "success",
  SYSTEM: "info",
  INFO: "info",
  WARNING: "warning",
  SUCCESS: "success",
  ERROR: "error",
  USER_VERIFIED_EMAIL: "success",
  USER_APPROVED: "success",
  SUBSCRIPTION_EXPIRING: "warning",
  SUBSCRIPTION_EXPIRED: "error",
  SUBSCRIPTION_ACTIVATED: "success",
};

// Main Notification entity
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  read: boolean;
  readAt?: string;
  link?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// Lightweight notification type for lists
export interface NotificationSummary {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  read: boolean;
  link?: string;
  createdAt: string;
}

// Filters for notification list
export interface NotificationFilters {
  search?: string;
  type?: NotificationType;
  priority?: NotificationPriority;
  read?: boolean;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// Paginated response for notifications
export interface NotificationsResponse {
  data: NotificationSummary[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    unreadCount: number;
  };
}

// Unread count response
export interface UnreadCountResponse {
  count: number;
  byType: Partial<Record<NotificationType, number>>;
  byPriority: Partial<Record<NotificationPriority, number>>;
}

// Create notification data (for system/admin use)
export interface CreateNotificationData {
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  link?: string;
  metadata?: Record<string, unknown>;
}

// Mark as read response
export interface MarkAsReadResponse {
  success: boolean;
  updatedCount: number;
}

// Notification preferences (already defined in settings.ts, re-exported here)
export interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  lowStockAlerts: boolean;
  paymentAlerts: boolean;
  invoiceUpdates: boolean;
  weeklyReports: boolean;
}

// Default notification preferences
export const defaultNotificationPreferences: NotificationPreferences = {
  emailNotifications: true,
  pushNotifications: true,
  lowStockAlerts: true,
  paymentAlerts: true,
  invoiceUpdates: true,
  weeklyReports: false,
};

// Helper function to get category from notification
export function getNotificationCategory(notification: {
  type: NotificationType;
}): NotificationCategory {
  return NotificationTypeToCategory[notification.type] || "info";
}

// Helper function to check if notification is high priority
export function isHighPriorityNotification(notification: {
  priority: NotificationPriority;
}): boolean {
  return notification.priority === "HIGH" || notification.priority === "URGENT";
}
