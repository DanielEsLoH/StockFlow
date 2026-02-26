import { api } from '~/lib/api';
import type {
  Expense,
  ExpenseFilters,
  ExpensesResponse,
  CreateExpenseData,
  UpdateExpenseData,
  PayExpenseData,
  ExpenseStats,
} from '~/types/expense';

const BASE_URL = '/expenses';

export async function getExpenses(filters: ExpenseFilters = {}): Promise<ExpensesResponse> {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.category) params.set('category', filters.category);
  if (filters.supplierId) params.set('supplierId', filters.supplierId);
  if (filters.fromDate) params.set('fromDate', filters.fromDate);
  if (filters.toDate) params.set('toDate', filters.toDate);
  if (filters.search) params.set('search', filters.search);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));

  const { data } = await api.get<ExpensesResponse>(`${BASE_URL}?${params}`);
  return data;
}

export async function getExpense(id: string): Promise<Expense> {
  const { data } = await api.get<Expense>(`${BASE_URL}/${id}`);
  return data;
}

export async function createExpense(payload: CreateExpenseData): Promise<Expense> {
  const { data } = await api.post<Expense>(BASE_URL, payload);
  return data;
}

export async function updateExpense(id: string, payload: UpdateExpenseData): Promise<Expense> {
  const { data } = await api.patch<Expense>(`${BASE_URL}/${id}`, payload);
  return data;
}

export async function deleteExpense(id: string): Promise<void> {
  await api.delete(`${BASE_URL}/${id}`);
}

export async function approveExpense(id: string): Promise<Expense> {
  const { data } = await api.patch<Expense>(`${BASE_URL}/${id}/approve`);
  return data;
}

export async function payExpense(id: string, payload: PayExpenseData): Promise<Expense> {
  const { data } = await api.post<Expense>(`${BASE_URL}/${id}/pay`, payload);
  return data;
}

export async function cancelExpense(id: string): Promise<Expense> {
  const { data } = await api.patch<Expense>(`${BASE_URL}/${id}/cancel`);
  return data;
}

export async function getExpenseStats(): Promise<ExpenseStats> {
  const { data } = await api.get<ExpenseStats>(`${BASE_URL}/stats`);
  return data;
}
