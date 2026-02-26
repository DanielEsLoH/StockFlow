import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import {
  getExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
  approveExpense,
  payExpense,
  cancelExpense,
  getExpenseStats,
} from '~/services/expenses.service';
import { useIsQueryEnabled } from './useIsQueryEnabled';
import type {
  ExpenseFilters,
  CreateExpenseData,
  UpdateExpenseData,
  PayExpenseData,
} from '~/types/expense';

const expenseKeys = {
  all: ['expenses'] as const,
  lists: () => [...expenseKeys.all, 'list'] as const,
  list: (filters: ExpenseFilters) => [...expenseKeys.lists(), filters] as const,
  details: () => [...expenseKeys.all, 'detail'] as const,
  detail: (id: string) => [...expenseKeys.details(), id] as const,
  stats: () => [...expenseKeys.all, 'stats'] as const,
};

export function useExpenses(filters: ExpenseFilters = {}) {
  const enabled = useIsQueryEnabled();
  return useQuery({
    queryKey: expenseKeys.list(filters),
    queryFn: () => getExpenses(filters),
    enabled,
  });
}

export function useExpense(id: string) {
  const enabled = useIsQueryEnabled();
  return useQuery({
    queryKey: expenseKeys.detail(id),
    queryFn: () => getExpense(id),
    enabled: enabled && !!id,
  });
}

export function useExpenseStats() {
  const enabled = useIsQueryEnabled();
  return useQuery({
    queryKey: expenseKeys.stats(),
    queryFn: getExpenseStats,
    enabled,
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: CreateExpenseData) => createExpense(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      toast.success('Gasto creado exitosamente');
      navigate(`/expenses/${result.id}`);
    },
    onError: (error: Error) => {
      toast.error(`Error al crear gasto: ${error.message}`);
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateExpenseData }) =>
      updateExpense(id, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      toast.success('Gasto actualizado');
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar gasto: ${error.message}`);
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      toast.success('Gasto eliminado');
      navigate('/expenses');
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar gasto: ${error.message}`);
    },
  });
}

export function useApproveExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => approveExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      toast.success('Gasto aprobado');
    },
    onError: (error: Error) => {
      toast.error(`Error al aprobar gasto: ${error.message}`);
    },
  });
}

export function usePayExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: PayExpenseData }) =>
      payExpense(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      toast.success('Pago registrado exitosamente');
    },
    onError: (error: Error) => {
      toast.error(`Error al registrar pago: ${error.message}`);
    },
  });
}

export function useCancelExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cancelExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      toast.success('Gasto cancelado');
    },
    onError: (error: Error) => {
      toast.error(`Error al cancelar gasto: ${error.message}`);
    },
  });
}
