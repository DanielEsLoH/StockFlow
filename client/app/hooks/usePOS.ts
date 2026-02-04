import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import {
  cashRegistersService,
  posSessionsService,
  posSalesService,
} from "~/services/pos.service";
import { queryKeys } from "~/lib/query-client";
import { toast } from "~/components/ui/Toast";
import type {
  CashRegister,
  CashRegisterWithWarehouse,
  CashRegistersResponse,
  CashRegisterFilters,
  CreateCashRegisterData,
  UpdateCashRegisterData,
  POSSessionWithDetails,
  POSSessionsResponse,
  POSSessionFilters,
  OpenSessionData,
  CloseSessionData,
  CashMovementData,
  CashMovement,
  XZReport,
  POSSaleWithDetails,
  POSSalesResponse,
  POSSaleFilters,
  CreateSaleData,
} from "~/types/pos";

// ============================================================================
// CASH REGISTERS HOOKS
// ============================================================================

// Cash registers list with filters (paginated)
export function useCashRegisters(filters: CashRegisterFilters = {}) {
  return useQuery<CashRegistersResponse>({
    queryKey: queryKeys.cashRegisters.list(filters as Record<string, unknown>),
    queryFn: () => cashRegistersService.getAll(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
    placeholderData: (previousData) => previousData,
  });
}

// Single cash register
export function useCashRegister(id: string) {
  return useQuery<CashRegisterWithWarehouse>({
    queryKey: queryKeys.cashRegisters.detail(id),
    queryFn: () => cashRegistersService.getById(id),
    staleTime: 1000 * 60 * 5,
    enabled: !!id,
  });
}

// Create cash register mutation
export function useCreateCashRegister() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCashRegisterData) =>
      cashRegistersService.create(data),
    onSuccess: (cashRegister) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.cashRegisters.all,
      });
      toast.success(`Caja "${cashRegister.name}" creada exitosamente`);
      navigate("/pos/settings/cash-registers");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al crear la caja");
    },
  });
}

// Update cash register mutation
export function useUpdateCashRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCashRegisterData }) =>
      cashRegistersService.update(id, data),
    onSuccess: (cashRegister) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.cashRegisters.all,
      });
      queryClient.setQueryData(
        queryKeys.cashRegisters.detail(cashRegister.id),
        cashRegister,
      );
      toast.success(`Caja "${cashRegister.name}" actualizada exitosamente`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al actualizar la caja");
    },
  });
}

// Delete cash register mutation
export function useDeleteCashRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cashRegistersService.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.cashRegisters.all,
      });
      toast.success("Caja eliminada exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar la caja");
    },
  });
}

// ============================================================================
// POS SESSIONS HOOKS
// ============================================================================

// Sessions list with filters (paginated)
export function usePOSSessions(filters: POSSessionFilters = {}) {
  return useQuery<POSSessionsResponse>({
    queryKey: queryKeys.posSessions.list(filters as Record<string, unknown>),
    queryFn: () => posSessionsService.getAll(filters),
    staleTime: 1000 * 60 * 2, // 2 minutes
    placeholderData: (previousData) => previousData,
  });
}

// Single session
export function usePOSSession(id: string) {
  return useQuery<POSSessionWithDetails>({
    queryKey: queryKeys.posSessions.detail(id),
    queryFn: () => posSessionsService.getById(id),
    staleTime: 1000 * 60 * 2,
    enabled: !!id,
  });
}

// Current active session
export function useCurrentSession() {
  return useQuery<POSSessionWithDetails | null>({
    queryKey: queryKeys.posSessions.current(),
    queryFn: () => posSessionsService.getCurrent(),
    staleTime: 1000 * 30, // 30 seconds - check frequently
    refetchInterval: 1000 * 60, // Refetch every minute
  });
}

// Session movements
export function useSessionMovements(sessionId: string) {
  return useQuery<CashMovement[]>({
    queryKey: queryKeys.posSessions.movements(sessionId),
    queryFn: () => posSessionsService.getMovements(sessionId),
    staleTime: 1000 * 60,
    enabled: !!sessionId,
  });
}

// X Report (intraday)
export function useXReport(sessionId: string) {
  return useQuery<XZReport>({
    queryKey: queryKeys.posSessions.xReport(sessionId),
    queryFn: () => posSessionsService.getXReport(sessionId),
    staleTime: 1000 * 30, // 30 seconds
    enabled: !!sessionId,
  });
}

// Z Report (closing)
export function useZReport(sessionId: string) {
  return useQuery<XZReport>({
    queryKey: queryKeys.posSessions.zReport(sessionId),
    queryFn: () => posSessionsService.getZReport(sessionId),
    staleTime: 1000 * 30,
    enabled: !!sessionId,
  });
}

// Open session mutation
export function useOpenSession() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: OpenSessionData) => posSessionsService.open(data),
    onSuccess: (session) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.posSessions.all,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.cashRegisters.all,
      });
      queryClient.setQueryData(queryKeys.posSessions.current(), session);
      toast.success("Sesión de caja abierta exitosamente");
      navigate("/pos");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al abrir la sesión");
    },
  });
}

// Close session mutation
export function useCloseSession() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      data,
    }: {
      sessionId: string;
      data: CloseSessionData;
    }) => posSessionsService.close(sessionId, data),
    onSuccess: (session) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.posSessions.all,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.cashRegisters.all,
      });
      queryClient.setQueryData(queryKeys.posSessions.current(), null);
      queryClient.setQueryData(
        queryKeys.posSessions.detail(session.id),
        session,
      );
      toast.success("Sesión de caja cerrada exitosamente");
      navigate("/pos/sessions");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al cerrar la sesión");
    },
  });
}

// Register cash movement mutation
export function useCashMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      data,
    }: {
      sessionId: string;
      data: CashMovementData;
    }) => posSessionsService.registerCashMovement(sessionId, data),
    onSuccess: (movement, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.posSessions.movements(variables.sessionId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.posSessions.detail(variables.sessionId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.posSessions.current(),
      });
      const typeLabels: Record<string, string> = {
        CASH_IN: "Ingreso de efectivo",
        CASH_OUT: "Retiro de efectivo",
      };
      toast.success(
        `${typeLabels[movement.type] || "Movimiento"} registrado exitosamente`,
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al registrar el movimiento");
    },
  });
}

// ============================================================================
// POS SALES HOOKS
// ============================================================================

// Sales list with filters (paginated)
export function usePOSSales(filters: POSSaleFilters = {}) {
  return useQuery<POSSalesResponse>({
    queryKey: queryKeys.posSales.list(filters as Record<string, unknown>),
    queryFn: () => posSalesService.getAll(filters),
    staleTime: 1000 * 60, // 1 minute
    placeholderData: (previousData) => previousData,
  });
}

// Single sale
export function usePOSSale(id: string) {
  return useQuery<POSSaleWithDetails>({
    queryKey: queryKeys.posSales.detail(id),
    queryFn: () => posSalesService.getById(id),
    staleTime: 1000 * 60 * 5,
    enabled: !!id,
  });
}

// Create sale mutation
export function useCreateSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSaleData) => posSalesService.create(data),
    onSuccess: (sale) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.posSales.all,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.posSessions.current(),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.products.all,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.invoices.all,
      });
      toast.success(`Venta #${sale.saleNumber} creada exitosamente`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al crear la venta");
    },
  });
}

// Void sale mutation
export function useVoidSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ saleId, reason }: { saleId: string; reason: string }) =>
      posSalesService.void(saleId, reason),
    onSuccess: (sale) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.posSales.all,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.posSessions.current(),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.products.all,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.invoices.all,
      });
      queryClient.setQueryData(queryKeys.posSales.detail(sale.id), sale);
      toast.success(`Venta #${sale.saleNumber} anulada exitosamente`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al anular la venta");
    },
  });
}
