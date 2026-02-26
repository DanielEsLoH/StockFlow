import type { BadgeProps } from '~/components/ui/Badge';

export type ExpenseCategory =
  | 'SERVICIOS_PUBLICOS'
  | 'ARRIENDO'
  | 'HONORARIOS'
  | 'SEGUROS'
  | 'PAPELERIA'
  | 'MANTENIMIENTO'
  | 'TRANSPORTE'
  | 'PUBLICIDAD'
  | 'IMPUESTOS_TASAS'
  | 'ASEO_CAFETERIA'
  | 'OTROS';

export type ExpenseStatus = 'DRAFT' | 'APPROVED' | 'PAID' | 'CANCELLED';

export const ExpenseCategoryLabels: Record<ExpenseCategory, string> = {
  SERVICIOS_PUBLICOS: 'Servicios Publicos',
  ARRIENDO: 'Arriendo',
  HONORARIOS: 'Honorarios',
  SEGUROS: 'Seguros',
  PAPELERIA: 'Papeleria',
  MANTENIMIENTO: 'Mantenimiento',
  TRANSPORTE: 'Transporte',
  PUBLICIDAD: 'Publicidad',
  IMPUESTOS_TASAS: 'Impuestos y Tasas',
  ASEO_CAFETERIA: 'Aseo y Cafeteria',
  OTROS: 'Otros',
};

export const ExpenseStatusLabels: Record<ExpenseStatus, string> = {
  DRAFT: 'Borrador',
  APPROVED: 'Aprobado',
  PAID: 'Pagado',
  CANCELLED: 'Cancelado',
};

export const ExpenseStatusVariants: Record<ExpenseStatus, BadgeProps['variant']> = {
  DRAFT: 'secondary',
  APPROVED: 'warning',
  PAID: 'success',
  CANCELLED: 'error',
};

export const ExpenseCategoryColors: Record<ExpenseCategory, string> = {
  SERVICIOS_PUBLICOS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  ARRIENDO: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  HONORARIOS: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  SEGUROS: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  PAPELERIA: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  MANTENIMIENTO: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  TRANSPORTE: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  PUBLICIDAD: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  IMPUESTOS_TASAS: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  ASEO_CAFETERIA: 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400',
  OTROS: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400',
};

export interface Expense {
  id: string;
  expenseNumber: string;
  category: ExpenseCategory;
  description: string;
  supplierId: string | null;
  accountId: string | null;
  costCenterId: string | null;
  subtotal: number;
  taxRate: number;
  tax: number;
  reteFuente: number;
  total: number;
  status: ExpenseStatus;
  paymentMethod: string | null;
  paymentReference: string | null;
  paymentDate: string | null;
  issueDate: string;
  dueDate: string | null;
  invoiceNumber: string | null;
  approvedAt: string | null;
  approvedById: string | null;
  createdById: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  supplier?: { id: string; name: string; documentNumber: string } | null;
  account?: { id: string; code: string; name: string } | null;
  costCenter?: { id: string; code: string; name: string } | null;
}

export interface ExpenseFilters {
  status?: ExpenseStatus;
  category?: ExpenseCategory;
  supplierId?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateExpenseData {
  category: ExpenseCategory;
  description: string;
  subtotal: number;
  taxRate?: number;
  supplierId?: string;
  accountId?: string;
  costCenterId?: string;
  issueDate?: string;
  dueDate?: string;
  invoiceNumber?: string;
  notes?: string;
}

export interface UpdateExpenseData extends Partial<CreateExpenseData> {
  paymentMethod?: string;
  paymentReference?: string;
  paymentDate?: string;
}

export interface PayExpenseData {
  paymentMethod: string;
  paymentReference?: string;
  paymentDate?: string;
}

export interface ExpenseStats {
  total: number;
  totalAmount: number;
  byStatus: { status: ExpenseStatus; count: number; total: number }[];
  byCategory: { category: ExpenseCategory; count: number; total: number }[];
}

export interface ExpensesResponse {
  data: Expense[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
