import { describe, it, expect, vi, beforeEach } from "vitest";
import { reportsService } from "./reports.service";

// Mock the api module
vi.mock("~/lib/api", () => ({
  api: {
    get: vi.fn(),
  },
}));

import { api } from "~/lib/api";

const mockApi = vi.mocked(api, true);

describe("reportsService", () => {
  const mockBlob = new Blob(["test"], { type: "application/pdf" });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateSalesReport", () => {
    it("should call API with correct params and return blob + fileName", async () => {
      mockApi.get.mockResolvedValue({ data: mockBlob });

      const result = await reportsService.generateSalesReport({
        format: "pdf",
        fromDate: "2024-01-01",
        toDate: "2024-01-31",
      });

      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining("/reports/sales?"),
        { responseType: "blob" },
      );
      const url = (mockApi.get.mock.calls[0] as string[])[0];
      expect(url).toContain("format=pdf");
      expect(url).toContain("fromDate=2024-01-01");
      expect(url).toContain("toDate=2024-01-31");
      expect(result.blob).toBe(mockBlob);
      expect(result.fileName).toMatch(/^reporte-ventas-\d{4}-\d{2}-\d{2}\.pdf$/);
    });

    it("should include categoryId when provided", async () => {
      mockApi.get.mockResolvedValue({ data: mockBlob });

      await reportsService.generateSalesReport({
        format: "excel",
        fromDate: "2024-01-01",
        toDate: "2024-01-31",
        categoryId: "cat-1",
      });

      const url = (mockApi.get.mock.calls[0] as string[])[0];
      expect(url).toContain("categoryId=cat-1");
      expect(url).toContain("format=excel");
    });

    it("should return .xlsx extension for Excel format", async () => {
      mockApi.get.mockResolvedValue({ data: mockBlob });

      const result = await reportsService.generateSalesReport({
        format: "excel",
        fromDate: "2024-01-01",
        toDate: "2024-01-31",
      });

      expect(result.fileName).toMatch(/\.xlsx$/);
    });
  });

  describe("generateInventoryReport", () => {
    it("should call API with correct params", async () => {
      mockApi.get.mockResolvedValue({ data: mockBlob });

      const result = await reportsService.generateInventoryReport({
        format: "pdf",
      });

      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining("/reports/inventory?"),
        { responseType: "blob" },
      );
      expect(result.fileName).toMatch(/^reporte-inventario-.*\.pdf$/);
    });

    it("should include categoryId when provided", async () => {
      mockApi.get.mockResolvedValue({ data: mockBlob });

      await reportsService.generateInventoryReport({
        format: "pdf",
        categoryId: "cat-456",
      });

      const url = (mockApi.get.mock.calls[0] as string[])[0];
      expect(url).toContain("categoryId=cat-456");
    });
  });

  describe("generateCustomersReport", () => {
    it("should call API with correct params", async () => {
      mockApi.get.mockResolvedValue({ data: mockBlob });

      const result = await reportsService.generateCustomersReport({
        format: "excel",
      });

      expect(mockApi.get).toHaveBeenCalledWith(
        expect.stringContaining("/reports/customers?"),
        { responseType: "blob" },
      );
      expect(result.fileName).toMatch(/^reporte-clientes-.*\.xlsx$/);
    });
  });

  describe("downloadInvoicePdf", () => {
    it("should call API with invoice ID and return correct fileName", async () => {
      mockApi.get.mockResolvedValue({ data: mockBlob });

      const result = await reportsService.downloadInvoicePdf("inv-123");

      expect(mockApi.get).toHaveBeenCalledWith("/invoices/inv-123/pdf", {
        responseType: "blob",
      });
      expect(result.blob).toBe(mockBlob);
      expect(result.fileName).toBe("factura-inv-123.pdf");
    });
  });

  describe("downloadReport", () => {
    it("should create and click download link, then clean up", () => {
      const mockUrl = "blob:http://localhost/test";
      const mockLink = {
        href: "",
        download: "",
        click: vi.fn(),
      };

      const createObjectURL = vi
        .spyOn(window.URL, "createObjectURL")
        .mockReturnValue(mockUrl);
      const revokeObjectURL = vi
        .spyOn(window.URL, "revokeObjectURL")
        .mockImplementation(() => {});
      vi.spyOn(document, "createElement").mockReturnValue(
        mockLink as unknown as HTMLElement,
      );
      const appendChild = vi
        .spyOn(document.body, "appendChild")
        .mockImplementation((node) => node);
      const removeChild = vi
        .spyOn(document.body, "removeChild")
        .mockImplementation((node) => node);

      reportsService.downloadReport(mockBlob, "test.pdf");

      expect(createObjectURL).toHaveBeenCalledWith(mockBlob);
      expect(mockLink.href).toBe(mockUrl);
      expect(mockLink.download).toBe("test.pdf");
      expect(appendChild).toHaveBeenCalled();
      expect(mockLink.click).toHaveBeenCalled();
      expect(removeChild).toHaveBeenCalled();
      expect(revokeObjectURL).toHaveBeenCalledWith(mockUrl);
    });
  });

  describe("getRecentReports", () => {
    it("should return empty array (no backend endpoint yet)", async () => {
      const result = await reportsService.getRecentReports();
      expect(result).toEqual([]);
    });
  });
});
