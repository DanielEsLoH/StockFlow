import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { purchaseOrdersService } from "~/services/purchase-orders.service";
import { queryKeys } from "~/lib/query-client";
import { toast } from "~/components/ui/Toast";
import { useIsQueryEnabled } from "./useIsQueryEnabled";
import type {
  PurchaseOrder,
  PurchaseOrderFilters,
  PurchaseOrdersResponse,
  CreatePurchaseOrderData,
  UpdatePurchaseOrderData,
  PurchaseOrderStats,
  PurchasePayment,
  CreatePurchasePaymentData,
} from "~/types/purchase-order";

// ============================================================================
// QUERIES
// ============================================================================

export function usePurchaseOrders(filters: PurchaseOrderFilters = {}) {
  const enabled = useIsQueryEnabled();
  return useQuery<PurchaseOrdersResponse>({
    queryKey: queryKeys.purchaseOrders.list(
      filters as Record<string, unknown>,
    ),
    queryFn: () => purchaseOrdersService.getPurchaseOrders(filters),
    staleTime: 1000 * 60 * 2,
    placeholderData: (previousData) => previousData,
    enabled,
  });
}

export function usePurchaseOrder(id: string) {
  const enabled = useIsQueryEnabled();
  return useQuery<PurchaseOrder>({
    queryKey: queryKeys.purchaseOrders.detail(id),
    queryFn: () => purchaseOrdersService.getPurchaseOrder(id),
    staleTime: 1000 * 60 * 5,
    enabled: enabled && !!id,
  });
}

export function usePurchaseOrderStats() {
  const enabled = useIsQueryEnabled();
  return useQuery<PurchaseOrderStats>({
    queryKey: queryKeys.purchaseOrders.stats(),
    queryFn: () => purchaseOrdersService.getPurchaseOrderStats(),
    staleTime: 1000 * 60 * 2,
    enabled,
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

export function useCreatePurchaseOrder() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePurchaseOrderData) =>
      purchaseOrdersService.createPurchaseOrder(data),
    onSuccess: (order) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.purchaseOrders.all,
      });
      toast.success(
        `Orden de compra "${order.purchaseOrderNumber}" creada exitosamente`,
      );
      navigate(`/purchases/${order.id}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al crear la orden de compra");
    },
  });
}

export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdatePurchaseOrderData;
    }) => purchaseOrdersService.updatePurchaseOrder(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.purchaseOrders.all,
      });
      toast.success("Orden de compra actualizada exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al actualizar la orden de compra");
    },
  });
}

export function useDeletePurchaseOrder() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      purchaseOrdersService.deletePurchaseOrder(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.purchaseOrders.all,
      });
      toast.success("Orden de compra eliminada exitosamente");
      navigate("/purchases");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar la orden de compra");
    },
  });
}

export function useSendPurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      purchaseOrdersService.sendPurchaseOrder(id),
    onSuccess: (order) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.purchaseOrders.all,
      });
      toast.success(
        `Orden de compra "${order.purchaseOrderNumber}" enviada exitosamente`,
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al enviar la orden de compra");
    },
  });
}

export function useConfirmPurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      purchaseOrdersService.confirmPurchaseOrder(id),
    onSuccess: (order) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.purchaseOrders.all,
      });
      toast.success(
        `Orden de compra "${order.purchaseOrderNumber}" confirmada`,
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al confirmar la orden de compra");
    },
  });
}

export function useReceivePurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      purchaseOrdersService.receivePurchaseOrder(id),
    onSuccess: (order) => {
      // Invalidate purchase orders, products, and stock movements
      void queryClient.invalidateQueries({
        queryKey: queryKeys.purchaseOrders.all,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.products.all,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.stockMovements.all,
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.warehouses.all,
      });
      toast.success(
        `Mercancía de "${order.purchaseOrderNumber}" recibida exitosamente. Inventario actualizado.`,
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al recibir la mercancía");
    },
  });
}

export function useCancelPurchaseOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      purchaseOrdersService.cancelPurchaseOrder(id),
    onSuccess: (order) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.purchaseOrders.all,
      });
      toast.success(
        `Orden de compra "${order.purchaseOrderNumber}" cancelada`,
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al cancelar la orden de compra");
    },
  });
}

// ============================================================================
// PURCHASE PAYMENT QUERIES & MUTATIONS
// ============================================================================

export function usePurchasePayments(poId: string) {
  const enabled = useIsQueryEnabled();
  return useQuery<PurchasePayment[]>({
    queryKey: queryKeys.purchaseOrders.payments(poId),
    queryFn: () => purchaseOrdersService.getPurchasePayments(poId),
    staleTime: 1000 * 60 * 2,
    enabled: enabled && !!poId,
  });
}

export function useCreatePurchasePayment(poId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePurchasePaymentData) =>
      purchaseOrdersService.createPurchasePayment(poId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.purchaseOrders.payments(poId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.purchaseOrders.detail(poId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.purchaseOrders.list(),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.accounting.apAging(),
      });
      toast.success("Pago registrado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al registrar el pago");
    },
  });
}

export function useDeletePurchasePayment(poId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (paymentId: string) =>
      purchaseOrdersService.deletePurchasePayment(poId, paymentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.purchaseOrders.payments(poId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.purchaseOrders.detail(poId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.purchaseOrders.list(),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.accounting.apAging(),
      });
      toast.success("Pago eliminado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar el pago");
    },
  });
}
