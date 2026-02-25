export type CollectionReminderType = 'BEFORE_DUE' | 'ON_DUE' | 'AFTER_DUE' | 'MANUAL';
export type ReminderChannel = 'EMAIL' | 'SMS' | 'WHATSAPP';
export type ReminderStatus = 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED';

export interface CollectionReminder {
  id: string;
  tenantId: string;
  invoiceId: string;
  customerId: string | null;
  type: CollectionReminderType;
  channel: ReminderChannel;
  scheduledAt: string;
  sentAt: string | null;
  status: ReminderStatus;
  message: string | null;
  notes: string | null;
  createdAt: string;
  invoice?: { id: string; invoiceNumber: string; total: number; dueDate: string | null; paymentStatus: string } | null;
  customer?: { id: string; name: string; email: string | null; phone: string | null } | null;
}

export interface CollectionDashboard {
  totalOverdue: number;
  overdueCount: number;
  pendingReminders: number;
  sentToday: number;
}

export interface CreateReminderData {
  invoiceId: string;
  type: CollectionReminderType;
  channel?: ReminderChannel;
  scheduledAt: string;
  message?: string;
}

export const reminderTypeLabels: Record<CollectionReminderType, string> = {
  BEFORE_DUE: 'Antes del vencimiento',
  ON_DUE: 'Día de vencimiento',
  AFTER_DUE: 'Después del vencimiento',
  MANUAL: 'Manual',
};

export const reminderStatusLabels: Record<ReminderStatus, string> = {
  PENDING: 'Pendiente',
  SENT: 'Enviado',
  FAILED: 'Fallido',
  CANCELLED: 'Cancelado',
};

export const reminderStatusVariants: Record<ReminderStatus, string> = {
  PENDING: 'warning',
  SENT: 'success',
  FAILED: 'destructive',
  CANCELLED: 'secondary',
};

export const channelLabels: Record<ReminderChannel, string> = {
  EMAIL: 'Email',
  SMS: 'SMS',
  WHATSAPP: 'WhatsApp',
};
