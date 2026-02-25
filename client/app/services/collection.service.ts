import { api } from "~/lib/api";
import type {
  CollectionReminder,
  CollectionDashboard,
  CreateReminderData,
} from "~/types/collection";

interface CollectionParams {
  status?: string;
  type?: string;
  invoiceId?: string;
  customerId?: string;
  page?: number;
  limit?: number;
}

export const collectionService = {
  getReminders: (params?: CollectionParams | Record<string, unknown>) =>
    api
      .get<{ data: CollectionReminder[]; total: number }>(
        "/collection-reminders",
        { params },
      )
      .then((r) => r.data),

  getReminder: (id: string) =>
    api
      .get<CollectionReminder>(`/collection-reminders/${id}`)
      .then((r) => r.data),

  getStats: () =>
    api
      .get<Record<string, number>>("/collection-reminders/stats")
      .then((r) => r.data),

  getDashboard: () =>
    api
      .get<CollectionDashboard>("/collection-reminders/dashboard")
      .then((r) => r.data),

  getOverdueInvoices: () =>
    api
      .get<any[]>("/collection-reminders/overdue-invoices")
      .then((r) => r.data),

  createReminder: (data: CreateReminderData | Record<string, unknown>) =>
    api
      .post<CollectionReminder>("/collection-reminders", data)
      .then((r) => r.data),

  generateAutoReminders: () =>
    api
      .post<{ generated: number }>("/collection-reminders/generate")
      .then((r) => r.data),

  cancelReminder: (id: string) =>
    api
      .patch(`/collection-reminders/${id}/cancel`)
      .then((r) => r.data),

  markReminderSent: (id: string) =>
    api
      .patch(`/collection-reminders/${id}/mark-sent`)
      .then((r) => r.data),

  markReminderFailed: (id: string, notes?: string) =>
    api
      .patch(`/collection-reminders/${id}/mark-failed`, { notes })
      .then((r) => r.data),
};
