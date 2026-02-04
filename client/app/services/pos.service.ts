import { api } from "~/lib/api";
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
// CASH REGISTERS SERVICE
// ============================================================================

export const cashRegistersService = {
  async getAll(
    filters: CashRegisterFilters = {},
  ): Promise<CashRegistersResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    const { data } = await api.get<CashRegistersResponse>(
      `/cash-registers?${params.toString()}`,
    );
    return data;
  },

  async getById(id: string): Promise<CashRegisterWithWarehouse> {
    const { data } = await api.get<CashRegisterWithWarehouse>(
      `/cash-registers/${id}`,
    );
    return data;
  },

  async create(
    cashRegisterData: CreateCashRegisterData,
  ): Promise<CashRegister> {
    const { data } = await api.post<CashRegister>(
      "/cash-registers",
      cashRegisterData,
    );
    return data;
  },

  async update(
    id: string,
    cashRegisterData: UpdateCashRegisterData,
  ): Promise<CashRegister> {
    const { data } = await api.patch<CashRegister>(
      `/cash-registers/${id}`,
      cashRegisterData,
    );
    return data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/cash-registers/${id}`);
  },
};

// ============================================================================
// POS SESSIONS SERVICE
// ============================================================================

export const posSessionsService = {
  async getAll(filters: POSSessionFilters = {}): Promise<POSSessionsResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    const { data } = await api.get<POSSessionsResponse>(
      `/pos-sessions?${params.toString()}`,
    );
    return data;
  },

  async getById(id: string): Promise<POSSessionWithDetails> {
    const { data } = await api.get<POSSessionWithDetails>(
      `/pos-sessions/${id}`,
    );
    return data;
  },

  async getCurrent(): Promise<POSSessionWithDetails | null> {
    const { data } = await api.get<POSSessionWithDetails | null>(
      "/pos-sessions/current",
    );
    return data;
  },

  async open(sessionData: OpenSessionData): Promise<POSSessionWithDetails> {
    const { data } = await api.post<POSSessionWithDetails>(
      "/pos-sessions/open",
      sessionData,
    );
    return data;
  },

  async close(
    sessionId: string,
    closeData: CloseSessionData,
  ): Promise<POSSessionWithDetails> {
    const { data } = await api.post<POSSessionWithDetails>(
      `/pos-sessions/${sessionId}/close`,
      closeData,
    );
    return data;
  },

  async registerCashMovement(
    sessionId: string,
    movementData: CashMovementData,
  ): Promise<CashMovement> {
    const { data } = await api.post<CashMovement>(
      `/pos-sessions/${sessionId}/cash-movement`,
      movementData,
    );
    return data;
  },

  async getMovements(sessionId: string): Promise<CashMovement[]> {
    const { data } = await api.get<CashMovement[]>(
      `/pos-sessions/${sessionId}/movements`,
    );
    return data;
  },

  async getXReport(sessionId: string): Promise<XZReport> {
    const { data } = await api.get<XZReport>(
      `/pos-sessions/${sessionId}/x-report`,
    );
    return data;
  },

  async getZReport(sessionId: string): Promise<XZReport> {
    const { data } = await api.get<XZReport>(
      `/pos-sessions/${sessionId}/z-report`,
    );
    return data;
  },
};

// ============================================================================
// POS SALES SERVICE
// ============================================================================

export const posSalesService = {
  async getAll(filters: POSSaleFilters = {}): Promise<POSSalesResponse> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    const { data } = await api.get<POSSalesResponse>(
      `/pos-sales?${params.toString()}`,
    );
    return data;
  },

  async getById(id: string): Promise<POSSaleWithDetails> {
    const { data } = await api.get<POSSaleWithDetails>(`/pos-sales/${id}`);
    return data;
  },

  async create(saleData: CreateSaleData): Promise<POSSaleWithDetails> {
    const { data } = await api.post<POSSaleWithDetails>("/pos-sales", saleData);
    return data;
  },

  async void(saleId: string, reason: string): Promise<POSSaleWithDetails> {
    const { data } = await api.post<POSSaleWithDetails>(
      `/pos-sales/${saleId}/void`,
      {
        reason,
      },
    );
    return data;
  },
};
