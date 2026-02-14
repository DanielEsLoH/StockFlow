import { describe, it, expect, vi, beforeEach } from "vitest";
import { billingService } from "./billing.service";

// Mock the api module
vi.mock("~/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import { api } from "~/lib/api";

describe("billingService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getSubscriptionStatus", () => {
    const mockStatus = {
      plan: "PRO",
      status: "ACTIVE",
      period: "MONTHLY",
      startDate: "2024-01-01",
      endDate: "2024-02-01",
      daysRemaining: 15,
      limits: {
        maxProducts: 500,
        maxWarehouses: 5,
        maxUsers: 10,
      },
    };

    it("should call GET /subscriptions/status", async () => {
      vi.mocked(api.get).mockResolvedValue({ data: mockStatus });

      const result = await billingService.getSubscriptionStatus();

      expect(api.get).toHaveBeenCalledWith("/subscriptions/status");
      expect(result).toEqual(mockStatus);
    });

    it("should propagate API errors", async () => {
      vi.mocked(api.get).mockRejectedValue(new Error("Unauthorized"));

      await expect(billingService.getSubscriptionStatus()).rejects.toThrow(
        "Unauthorized",
      );
    });
  });

  describe("getPlans", () => {
    const mockPlans = [
      {
        plan: "EMPRENDEDOR",
        displayName: "Emprendedor",
        priceMonthly: 69900,
        priceQuarterly: 188730,
        priceAnnual: 628860,
        limits: { maxProducts: 100, maxWarehouses: 1, maxUsers: 2 },
      },
      {
        plan: "PRO",
        displayName: "Pro",
        priceMonthly: 219900,
        priceQuarterly: 593730,
        priceAnnual: 1977120,
        limits: { maxProducts: 500, maxWarehouses: 5, maxUsers: 10 },
      },
    ];

    it("should call GET /subscriptions/plans", async () => {
      vi.mocked(api.get).mockResolvedValue({ data: mockPlans });

      const result = await billingService.getPlans();

      expect(api.get).toHaveBeenCalledWith("/subscriptions/plans");
      expect(result).toEqual(mockPlans);
    });

    it("should return array of plans", async () => {
      vi.mocked(api.get).mockResolvedValue({ data: mockPlans });

      const result = await billingService.getPlans();

      expect(result).toHaveLength(2);
      expect(result[0].plan).toBe("EMPRENDEDOR");
      expect(result[1].plan).toBe("PRO");
    });

    it("should propagate API errors", async () => {
      vi.mocked(api.get).mockRejectedValue(new Error("Server error"));

      await expect(billingService.getPlans()).rejects.toThrow("Server error");
    });
  });

  describe("getCheckoutConfig", () => {
    const mockCheckoutConfig = {
      publicKey: "pub_test_abc123",
      currency: "COP",
      amountInCents: 21990000,
      reference: "ref-12345",
      signatureIntegrity: "hash123",
      redirectUrl: "https://stockflow.com.co/billing",
    };

    it("should call POST /subscriptions/checkout-config with request data", async () => {
      vi.mocked(api.post).mockResolvedValue({ data: mockCheckoutConfig });

      const request = { plan: "PRO" as const, period: "MONTHLY" as const };
      const result = await billingService.getCheckoutConfig(request);

      expect(api.post).toHaveBeenCalledWith(
        "/subscriptions/checkout-config",
        request,
      );
      expect(result).toEqual(mockCheckoutConfig);
    });

    it("should handle quarterly period", async () => {
      vi.mocked(api.post).mockResolvedValue({
        data: { ...mockCheckoutConfig, amountInCents: 59373000 },
      });

      const request = { plan: "PRO" as const, period: "QUARTERLY" as const };
      await billingService.getCheckoutConfig(request);

      expect(api.post).toHaveBeenCalledWith(
        "/subscriptions/checkout-config",
        request,
      );
    });

    it("should propagate API errors", async () => {
      vi.mocked(api.post).mockRejectedValue(
        new Error("Plan no disponible"),
      );

      const request = { plan: "PRO" as const, period: "MONTHLY" as const };
      await expect(billingService.getCheckoutConfig(request)).rejects.toThrow(
        "Plan no disponible",
      );
    });
  });

  describe("verifyPayment", () => {
    const mockVerifyResponse = {
      plan: "PRO",
      status: "ACTIVE",
      period: "MONTHLY",
      startDate: "2024-01-15",
      endDate: "2024-02-15",
      daysRemaining: 30,
    };

    it("should call POST /subscriptions/verify-payment with transaction data", async () => {
      vi.mocked(api.post).mockResolvedValue({ data: mockVerifyResponse });

      const request = {
        transactionId: "tx-12345",
        plan: "PRO" as const,
        period: "MONTHLY" as const,
      };
      const result = await billingService.verifyPayment(request);

      expect(api.post).toHaveBeenCalledWith(
        "/subscriptions/verify-payment",
        request,
      );
      expect(result).toEqual(mockVerifyResponse);
    });

    it("should propagate payment verification errors", async () => {
      vi.mocked(api.post).mockRejectedValue(
        new Error("Transacción no encontrada"),
      );

      const request = {
        transactionId: "tx-invalid",
        plan: "PRO" as const,
        period: "MONTHLY" as const,
      };
      await expect(billingService.verifyPayment(request)).rejects.toThrow(
        "Transacción no encontrada",
      );
    });
  });

  describe("createPaymentSource", () => {
    it("should call POST /subscriptions/payment-source with token data", async () => {
      vi.mocked(api.post).mockResolvedValue({
        data: { paymentSourceId: "ps-12345" },
      });

      const request = {
        type: "CARD" as const,
        token: "tok_test_abc123",
        customerEmail: "test@example.com",
        acceptanceToken: "accept_123",
      };
      const result = await billingService.createPaymentSource(request);

      expect(api.post).toHaveBeenCalledWith(
        "/subscriptions/payment-source",
        request,
      );
      expect(result).toEqual({ paymentSourceId: "ps-12345" });
    });

    it("should propagate payment source creation errors", async () => {
      vi.mocked(api.post).mockRejectedValue(
        new Error("Token inválido"),
      );

      const request = {
        type: "CARD" as const,
        token: "tok_invalid",
        customerEmail: "test@example.com",
        acceptanceToken: "accept_123",
      };
      await expect(
        billingService.createPaymentSource(request),
      ).rejects.toThrow("Token inválido");
    });
  });

  describe("getBillingHistory", () => {
    const mockHistory = [
      {
        id: "bt-1",
        plan: "PRO",
        period: "MONTHLY",
        amount: 219900,
        currency: "COP",
        status: "APPROVED",
        createdAt: "2024-01-15T10:00:00Z",
        wompiTransactionId: "tx-12345",
      },
      {
        id: "bt-2",
        plan: "PYME",
        period: "MONTHLY",
        amount: 149900,
        currency: "COP",
        status: "APPROVED",
        createdAt: "2023-12-15T10:00:00Z",
        wompiTransactionId: "tx-12344",
      },
    ];

    it("should call GET /subscriptions/billing-history", async () => {
      vi.mocked(api.get).mockResolvedValue({ data: mockHistory });

      const result = await billingService.getBillingHistory();

      expect(api.get).toHaveBeenCalledWith("/subscriptions/billing-history");
      expect(result).toEqual(mockHistory);
    });

    it("should return empty array when no history", async () => {
      vi.mocked(api.get).mockResolvedValue({ data: [] });

      const result = await billingService.getBillingHistory();

      expect(result).toEqual([]);
    });

    it("should propagate API errors", async () => {
      vi.mocked(api.get).mockRejectedValue(new Error("Forbidden"));

      await expect(billingService.getBillingHistory()).rejects.toThrow(
        "Forbidden",
      );
    });
  });
});
