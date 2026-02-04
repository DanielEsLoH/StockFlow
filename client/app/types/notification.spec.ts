import { describe, it, expect } from "vitest";
import {
  NotificationTypeLabels,
  NotificationPriorityLabels,
  NotificationTypeToCategory,
  defaultNotificationPreferences,
  getNotificationCategory,
  isHighPriorityNotification,
  type NotificationType,
  type NotificationPriority,
  type NotificationCategory,
} from "./notification";

describe("Notification Types", () => {
  describe("NotificationTypeLabels", () => {
    it("should have a label for LOW_STOCK", () => {
      expect(NotificationTypeLabels.LOW_STOCK).toBe("Stock bajo");
    });

    it("should have a label for OUT_OF_STOCK", () => {
      expect(NotificationTypeLabels.OUT_OF_STOCK).toBe("Agotado");
    });

    it("should have a label for NEW_INVOICE", () => {
      expect(NotificationTypeLabels.NEW_INVOICE).toBe("Nueva factura");
    });

    it("should have a label for INVOICE_PAID", () => {
      expect(NotificationTypeLabels.INVOICE_PAID).toBe("Factura pagada");
    });

    it("should have a label for INVOICE_OVERDUE", () => {
      expect(NotificationTypeLabels.INVOICE_OVERDUE).toBe("Factura vencida");
    });

    it("should have a label for PAYMENT_RECEIVED", () => {
      expect(NotificationTypeLabels.PAYMENT_RECEIVED).toBe("Pago recibido");
    });

    it("should have a label for PAYMENT_FAILED", () => {
      expect(NotificationTypeLabels.PAYMENT_FAILED).toBe("Pago fallido");
    });

    it("should have a label for NEW_CUSTOMER", () => {
      expect(NotificationTypeLabels.NEW_CUSTOMER).toBe("Nuevo cliente");
    });

    it("should have a label for REPORT_READY", () => {
      expect(NotificationTypeLabels.REPORT_READY).toBe("Reporte listo");
    });

    it("should have a label for SYSTEM", () => {
      expect(NotificationTypeLabels.SYSTEM).toBe("Sistema");
    });

    it("should have a label for INFO", () => {
      expect(NotificationTypeLabels.INFO).toBe("Informacion");
    });

    it("should have a label for WARNING", () => {
      expect(NotificationTypeLabels.WARNING).toBe("Advertencia");
    });

    it("should have a label for SUCCESS", () => {
      expect(NotificationTypeLabels.SUCCESS).toBe("Exito");
    });

    it("should have a label for ERROR", () => {
      expect(NotificationTypeLabels.ERROR).toBe("Error");
    });

    it("should have exactly 14 notification type labels", () => {
      expect(Object.keys(NotificationTypeLabels)).toHaveLength(14);
    });

    it("should have all labels as non-empty strings", () => {
      Object.values(NotificationTypeLabels).forEach((label) => {
        expect(typeof label).toBe("string");
        expect(label.length).toBeGreaterThan(0);
      });
    });
  });

  describe("NotificationPriorityLabels", () => {
    it("should have a label for LOW priority", () => {
      expect(NotificationPriorityLabels.LOW).toBe("Baja");
    });

    it("should have a label for MEDIUM priority", () => {
      expect(NotificationPriorityLabels.MEDIUM).toBe("Media");
    });

    it("should have a label for HIGH priority", () => {
      expect(NotificationPriorityLabels.HIGH).toBe("Alta");
    });

    it("should have a label for URGENT priority", () => {
      expect(NotificationPriorityLabels.URGENT).toBe("Urgente");
    });

    it("should have exactly 4 priority labels", () => {
      expect(Object.keys(NotificationPriorityLabels)).toHaveLength(4);
    });

    it("should have all labels as non-empty strings", () => {
      Object.values(NotificationPriorityLabels).forEach((label) => {
        expect(typeof label).toBe("string");
        expect(label.length).toBeGreaterThan(0);
      });
    });
  });

  describe("NotificationTypeToCategory", () => {
    it("should map LOW_STOCK to warning category", () => {
      expect(NotificationTypeToCategory.LOW_STOCK).toBe("warning");
    });

    it("should map OUT_OF_STOCK to error category", () => {
      expect(NotificationTypeToCategory.OUT_OF_STOCK).toBe("error");
    });

    it("should map NEW_INVOICE to info category", () => {
      expect(NotificationTypeToCategory.NEW_INVOICE).toBe("info");
    });

    it("should map INVOICE_PAID to success category", () => {
      expect(NotificationTypeToCategory.INVOICE_PAID).toBe("success");
    });

    it("should map INVOICE_OVERDUE to warning category", () => {
      expect(NotificationTypeToCategory.INVOICE_OVERDUE).toBe("warning");
    });

    it("should map PAYMENT_RECEIVED to success category", () => {
      expect(NotificationTypeToCategory.PAYMENT_RECEIVED).toBe("success");
    });

    it("should map PAYMENT_FAILED to error category", () => {
      expect(NotificationTypeToCategory.PAYMENT_FAILED).toBe("error");
    });

    it("should map NEW_CUSTOMER to info category", () => {
      expect(NotificationTypeToCategory.NEW_CUSTOMER).toBe("info");
    });

    it("should map REPORT_READY to success category", () => {
      expect(NotificationTypeToCategory.REPORT_READY).toBe("success");
    });

    it("should map SYSTEM to info category", () => {
      expect(NotificationTypeToCategory.SYSTEM).toBe("info");
    });

    it("should map INFO to info category", () => {
      expect(NotificationTypeToCategory.INFO).toBe("info");
    });

    it("should map WARNING to warning category", () => {
      expect(NotificationTypeToCategory.WARNING).toBe("warning");
    });

    it("should map SUCCESS to success category", () => {
      expect(NotificationTypeToCategory.SUCCESS).toBe("success");
    });

    it("should map ERROR to error category", () => {
      expect(NotificationTypeToCategory.ERROR).toBe("error");
    });

    it("should have exactly 14 type-to-category mappings", () => {
      expect(Object.keys(NotificationTypeToCategory)).toHaveLength(14);
    });

    it("should only map to valid categories (info, success, warning, error)", () => {
      const validCategories: NotificationCategory[] = [
        "info",
        "success",
        "warning",
        "error",
      ];
      Object.values(NotificationTypeToCategory).forEach((category) => {
        expect(validCategories).toContain(category);
      });
    });
  });

  describe("defaultNotificationPreferences", () => {
    it("should have emailNotifications enabled by default", () => {
      expect(defaultNotificationPreferences.emailNotifications).toBe(true);
    });

    it("should have pushNotifications enabled by default", () => {
      expect(defaultNotificationPreferences.pushNotifications).toBe(true);
    });

    it("should have lowStockAlerts enabled by default", () => {
      expect(defaultNotificationPreferences.lowStockAlerts).toBe(true);
    });

    it("should have paymentAlerts enabled by default", () => {
      expect(defaultNotificationPreferences.paymentAlerts).toBe(true);
    });

    it("should have invoiceUpdates enabled by default", () => {
      expect(defaultNotificationPreferences.invoiceUpdates).toBe(true);
    });

    it("should have weeklyReports disabled by default", () => {
      expect(defaultNotificationPreferences.weeklyReports).toBe(false);
    });

    it("should have exactly 6 preference settings", () => {
      expect(Object.keys(defaultNotificationPreferences)).toHaveLength(6);
    });

    it("should have all values as booleans", () => {
      Object.values(defaultNotificationPreferences).forEach((value) => {
        expect(typeof value).toBe("boolean");
      });
    });
  });

  describe("getNotificationCategory", () => {
    it("should return warning for LOW_STOCK notification", () => {
      const notification = { type: "LOW_STOCK" as NotificationType };
      expect(getNotificationCategory(notification)).toBe("warning");
    });

    it("should return error for OUT_OF_STOCK notification", () => {
      const notification = { type: "OUT_OF_STOCK" as NotificationType };
      expect(getNotificationCategory(notification)).toBe("error");
    });

    it("should return info for NEW_INVOICE notification", () => {
      const notification = { type: "NEW_INVOICE" as NotificationType };
      expect(getNotificationCategory(notification)).toBe("info");
    });

    it("should return success for INVOICE_PAID notification", () => {
      const notification = { type: "INVOICE_PAID" as NotificationType };
      expect(getNotificationCategory(notification)).toBe("success");
    });

    it("should return warning for INVOICE_OVERDUE notification", () => {
      const notification = { type: "INVOICE_OVERDUE" as NotificationType };
      expect(getNotificationCategory(notification)).toBe("warning");
    });

    it("should return success for PAYMENT_RECEIVED notification", () => {
      const notification = { type: "PAYMENT_RECEIVED" as NotificationType };
      expect(getNotificationCategory(notification)).toBe("success");
    });

    it("should return error for PAYMENT_FAILED notification", () => {
      const notification = { type: "PAYMENT_FAILED" as NotificationType };
      expect(getNotificationCategory(notification)).toBe("error");
    });

    it("should return info for NEW_CUSTOMER notification", () => {
      const notification = { type: "NEW_CUSTOMER" as NotificationType };
      expect(getNotificationCategory(notification)).toBe("info");
    });

    it("should return success for REPORT_READY notification", () => {
      const notification = { type: "REPORT_READY" as NotificationType };
      expect(getNotificationCategory(notification)).toBe("success");
    });

    it("should return info for SYSTEM notification", () => {
      const notification = { type: "SYSTEM" as NotificationType };
      expect(getNotificationCategory(notification)).toBe("info");
    });

    it("should return info for INFO notification", () => {
      const notification = { type: "INFO" as NotificationType };
      expect(getNotificationCategory(notification)).toBe("info");
    });

    it("should return warning for WARNING notification", () => {
      const notification = { type: "WARNING" as NotificationType };
      expect(getNotificationCategory(notification)).toBe("warning");
    });

    it("should return success for SUCCESS notification", () => {
      const notification = { type: "SUCCESS" as NotificationType };
      expect(getNotificationCategory(notification)).toBe("success");
    });

    it("should return error for ERROR notification", () => {
      const notification = { type: "ERROR" as NotificationType };
      expect(getNotificationCategory(notification)).toBe("error");
    });

    it("should return info as fallback for unknown notification type", () => {
      // Using type assertion to test the fallback behavior with an invalid type
      const notification = { type: "UNKNOWN_TYPE" as NotificationType };
      expect(getNotificationCategory(notification)).toBe("info");
    });

    it("should return info as fallback for empty string type", () => {
      // Using type assertion to test the fallback behavior
      const notification = { type: "" as NotificationType };
      expect(getNotificationCategory(notification)).toBe("info");
    });

    it("should handle notification objects with additional properties", () => {
      const notification = {
        type: "LOW_STOCK" as NotificationType,
        title: "Test notification",
        message: "Test message",
        id: "123",
      };
      expect(getNotificationCategory(notification)).toBe("warning");
    });
  });

  describe("isHighPriorityNotification", () => {
    it("should return true for HIGH priority notification", () => {
      const notification = { priority: "HIGH" as NotificationPriority };
      expect(isHighPriorityNotification(notification)).toBe(true);
    });

    it("should return true for URGENT priority notification", () => {
      const notification = { priority: "URGENT" as NotificationPriority };
      expect(isHighPriorityNotification(notification)).toBe(true);
    });

    it("should return false for LOW priority notification", () => {
      const notification = { priority: "LOW" as NotificationPriority };
      expect(isHighPriorityNotification(notification)).toBe(false);
    });

    it("should return false for MEDIUM priority notification", () => {
      const notification = { priority: "MEDIUM" as NotificationPriority };
      expect(isHighPriorityNotification(notification)).toBe(false);
    });

    it("should return false for unknown priority", () => {
      // Using type assertion to test behavior with invalid priority
      const notification = { priority: "UNKNOWN" as NotificationPriority };
      expect(isHighPriorityNotification(notification)).toBe(false);
    });

    it("should return false for empty string priority", () => {
      // Using type assertion to test behavior with empty string
      const notification = { priority: "" as NotificationPriority };
      expect(isHighPriorityNotification(notification)).toBe(false);
    });

    it("should handle notification objects with additional properties", () => {
      const notification = {
        priority: "URGENT" as NotificationPriority,
        type: "LOW_STOCK" as NotificationType,
        title: "Test notification",
        message: "Test message",
        id: "123",
      };
      expect(isHighPriorityNotification(notification)).toBe(true);
    });

    it("should correctly identify all priority levels", () => {
      const priorities: {
        priority: NotificationPriority;
        expected: boolean;
      }[] = [
        { priority: "LOW", expected: false },
        { priority: "MEDIUM", expected: false },
        { priority: "HIGH", expected: true },
        { priority: "URGENT", expected: true },
      ];

      priorities.forEach(({ priority, expected }) => {
        expect(isHighPriorityNotification({ priority })).toBe(expected);
      });
    });
  });

  describe("Type Consistency", () => {
    it("should have consistent keys between NotificationTypeLabels and NotificationTypeToCategory", () => {
      const labelKeys = Object.keys(NotificationTypeLabels).sort();
      const categoryKeys = Object.keys(NotificationTypeToCategory).sort();
      expect(labelKeys).toEqual(categoryKeys);
    });

    it("should have all NotificationPriority values covered in NotificationPriorityLabels", () => {
      const expectedPriorities: NotificationPriority[] = [
        "LOW",
        "MEDIUM",
        "HIGH",
        "URGENT",
      ];
      const labelKeys = Object.keys(NotificationPriorityLabels);
      expectedPriorities.forEach((priority) => {
        expect(labelKeys).toContain(priority);
      });
    });

    it("should have all NotificationType values covered in NotificationTypeLabels", () => {
      const expectedTypes: NotificationType[] = [
        "LOW_STOCK",
        "OUT_OF_STOCK",
        "NEW_INVOICE",
        "INVOICE_PAID",
        "INVOICE_OVERDUE",
        "PAYMENT_RECEIVED",
        "PAYMENT_FAILED",
        "NEW_CUSTOMER",
        "REPORT_READY",
        "SYSTEM",
        "INFO",
        "WARNING",
        "SUCCESS",
        "ERROR",
      ];
      const labelKeys = Object.keys(NotificationTypeLabels);
      expectedTypes.forEach((type) => {
        expect(labelKeys).toContain(type);
      });
    });
  });
});
