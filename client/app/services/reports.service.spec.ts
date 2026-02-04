import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { reportsService } from "./reports.service";
import type {
  SalesReportParams,
  InventoryReportParams,
  CustomersReportParams,
  RecentReport,
  ReportFormat,
} from "~/types/report";

// Note: The reports service currently uses mock data internally
// These tests verify the service's report generation and download logic

describe("reportsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.useRealTimers();
  });

  describe("generateSalesReport", () => {
    it("should generate sales report with PDF format", async () => {
      const params: SalesReportParams = {
        format: "pdf",
        fromDate: "2024-01-01",
        toDate: "2024-01-31",
      };

      const promise = reportsService.generateSalesReport(params);
      vi.advanceTimersByTime(2000);
      const result = await promise;

      expect(result).toHaveProperty("blob");
      expect(result).toHaveProperty("fileName");
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.blob.type).toBe("application/pdf");
      expect(result.fileName).toMatch(
        /^reporte-ventas-\d{4}-\d{2}-\d{2}\.pdf$/,
      );
    });

    it("should generate sales report with Excel format", async () => {
      const params: SalesReportParams = {
        format: "excel",
        fromDate: "2024-01-01",
        toDate: "2024-01-31",
      };

      const promise = reportsService.generateSalesReport(params);
      vi.advanceTimersByTime(2000);
      const result = await promise;

      expect(result).toHaveProperty("blob");
      expect(result).toHaveProperty("fileName");
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.blob.type).toBe(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      expect(result.fileName).toMatch(
        /^reporte-ventas-\d{4}-\d{2}-\d{2}\.xlsx$/,
      );
    });

    it("should generate sales report with different date ranges", async () => {
      const params: SalesReportParams = {
        format: "pdf",
        fromDate: "2023-06-15",
        toDate: "2023-12-31",
      };

      const promise = reportsService.generateSalesReport(params);
      vi.advanceTimersByTime(2000);
      const result = await promise;

      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.fileName).toContain("reporte-ventas");
    });

    it("should generate sales report with categoryId filter", async () => {
      const params: SalesReportParams = {
        format: "pdf",
        fromDate: "2024-01-01",
        toDate: "2024-01-31",
        categoryId: "cat-123",
      };

      const promise = reportsService.generateSalesReport(params);
      vi.advanceTimersByTime(2000);
      const result = await promise;

      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.fileName).toMatch(
        /^reporte-ventas-\d{4}-\d{2}-\d{2}\.pdf$/,
      );
    });

    it("should generate sales report without categoryId filter", async () => {
      const params: SalesReportParams = {
        format: "excel",
        fromDate: "2024-01-01",
        toDate: "2024-01-31",
      };

      const promise = reportsService.generateSalesReport(params);
      vi.advanceTimersByTime(2000);
      const result = await promise;

      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.fileName).toMatch(
        /^reporte-ventas-\d{4}-\d{2}-\d{2}\.xlsx$/,
      );
    });

    it("should return blob with correct PDF MIME type", async () => {
      const params: SalesReportParams = {
        format: "pdf",
        fromDate: "2024-01-01",
        toDate: "2024-01-31",
      };

      const promise = reportsService.generateSalesReport(params);
      vi.advanceTimersByTime(2000);
      const result = await promise;

      expect(result.blob.type).toBe("application/pdf");
    });

    it("should return blob with correct Excel MIME type", async () => {
      const params: SalesReportParams = {
        format: "excel",
        fromDate: "2024-01-01",
        toDate: "2024-01-31",
      };

      const promise = reportsService.generateSalesReport(params);
      vi.advanceTimersByTime(2000);
      const result = await promise;

      expect(result.blob.type).toBe(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
    });

    it("should return filename with .pdf extension for PDF format", async () => {
      const params: SalesReportParams = {
        format: "pdf",
        fromDate: "2024-01-01",
        toDate: "2024-01-31",
      };

      const promise = reportsService.generateSalesReport(params);
      vi.advanceTimersByTime(2000);
      const result = await promise;

      expect(result.fileName).toMatch(/\.pdf$/);
    });

    it("should return filename with .xlsx extension for Excel format", async () => {
      const params: SalesReportParams = {
        format: "excel",
        fromDate: "2024-01-01",
        toDate: "2024-01-31",
      };

      const promise = reportsService.generateSalesReport(params);
      vi.advanceTimersByTime(2000);
      const result = await promise;

      expect(result.fileName).toMatch(/\.xlsx$/);
    });

    it("should include current date in filename", async () => {
      const params: SalesReportParams = {
        format: "pdf",
        fromDate: "2024-01-01",
        toDate: "2024-01-31",
      };

      const promise = reportsService.generateSalesReport(params);
      vi.advanceTimersByTime(2000);
      const result = await promise;

      // The filename should contain a date in YYYY-MM-DD format
      const datePattern = /\d{4}-\d{2}-\d{2}/;
      expect(result.fileName).toMatch(datePattern);
    });

    it("should return non-empty blob", async () => {
      const params: SalesReportParams = {
        format: "pdf",
        fromDate: "2024-01-01",
        toDate: "2024-01-31",
      };

      const promise = reportsService.generateSalesReport(params);
      vi.advanceTimersByTime(2000);
      const result = await promise;

      expect(result.blob.size).toBeGreaterThan(0);
    });
  });

  describe("generateInventoryReport", () => {
    it("should generate inventory report with PDF format", async () => {
      const params: InventoryReportParams = {
        format: "pdf",
      };

      const promise = reportsService.generateInventoryReport(params);
      vi.advanceTimersByTime(2000);
      const result = await promise;

      expect(result).toHaveProperty("blob");
      expect(result).toHaveProperty("fileName");
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.blob.type).toBe("application/pdf");
      expect(result.fileName).toMatch(
        /^reporte-inventario-\d{4}-\d{2}-\d{2}\.pdf$/,
      );
    });

    it("should generate inventory report with Excel format", async () => {
      const params: InventoryReportParams = {
        format: "excel",
      };

      const promise = reportsService.generateInventoryReport(params);
      vi.advanceTimersByTime(2000);
      const result = await promise;

      expect(result).toHaveProperty("blob");
      expect(result).toHaveProperty("fileName");
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.blob.type).toBe(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      expect(result.fileName).toMatch(
        /^reporte-inventario-\d{4}-\d{2}-\d{2}\.xlsx$/,
      );
    });

    it("should generate inventory report with categoryId filter", async () => {
      const params: InventoryReportParams = {
        format: "pdf",
        categoryId: "cat-456",
      };

      const promise = reportsService.generateInventoryReport(params);
      vi.advanceTimersByTime(2000);
      const result = await promise;

      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.fileName).toMatch(
        /^reporte-inventario-\d{4}-\d{2}-\d{2}\.pdf$/,
      );
    });

    it("should generate inventory report without categoryId filter", async () => {
      const params: InventoryReportParams = {
        format: "excel",
      };

      const promise = reportsService.generateInventoryReport(params);
      vi.advanceTimersByTime(2000);
      const result = await promise;

      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.fileName).toMatch(
        /^reporte-inventario-\d{4}-\d{2}-\d{2}\.xlsx$/,
      );
    });

    it("should return blob with correct PDF MIME type", async () => {
      const params: InventoryReportParams = {
        format: "pdf",
      };

      const promise = reportsService.generateInventoryReport(params);
      vi.advanceTimersByTime(2000);
      const result = await promise;

      expect(result.blob.type).toBe("application/pdf");
    });

    it("should return blob with correct Excel MIME type", async () => {
      const params: InventoryReportParams = {
        format: "excel",
      };

      const promise = reportsService.generateInventoryReport(params);
      vi.advanceTimersByTime(2000);
      const result = await promise;

      expect(result.blob.type).toBe(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
    });

    it("should return filename with .pdf extension for PDF format", async () => {
      const params: InventoryReportParams = {
        format: "pdf",
      };

      const promise = reportsService.generateInventoryReport(params);
      vi.advanceTimersByTime(2000);
      const result = await promise;

      expect(result.fileName).toMatch(/\.pdf$/);
    });

    it("should return filename with .xlsx extension for Excel format", async () => {
      const params: InventoryReportParams = {
        format: "excel",
      };

      const promise = reportsService.generateInventoryReport(params);
      vi.advanceTimersByTime(2000);
      const result = await promise;

      expect(result.fileName).toMatch(/\.xlsx$/);
    });

    it("should return non-empty blob", async () => {
      const params: InventoryReportParams = {
        format: "pdf",
      };

      const promise = reportsService.generateInventoryReport(params);
      vi.advanceTimersByTime(2000);
      const result = await promise;

      expect(result.blob.size).toBeGreaterThan(0);
    });
  });

  describe("generateCustomersReport", () => {
    it("should generate customers report with PDF format", async () => {
      const params: CustomersReportParams = {
        format: "pdf",
      };

      const promise = reportsService.generateCustomersReport(params);
      vi.advanceTimersByTime(2000);
      const result = await promise;

      expect(result).toHaveProperty("blob");
      expect(result).toHaveProperty("fileName");
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.blob.type).toBe("application/pdf");
      expect(result.fileName).toMatch(
        /^reporte-clientes-\d{4}-\d{2}-\d{2}\.pdf$/,
      );
    });

    it("should generate customers report with Excel format", async () => {
      const params: CustomersReportParams = {
        format: "excel",
      };

      const promise = reportsService.generateCustomersReport(params);
      vi.advanceTimersByTime(2000);
      const result = await promise;

      expect(result).toHaveProperty("blob");
      expect(result).toHaveProperty("fileName");
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.blob.type).toBe(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      expect(result.fileName).toMatch(
        /^reporte-clientes-\d{4}-\d{2}-\d{2}\.xlsx$/,
      );
    });

    it("should return blob with correct PDF MIME type", async () => {
      const params: CustomersReportParams = {
        format: "pdf",
      };

      const promise = reportsService.generateCustomersReport(params);
      vi.advanceTimersByTime(2000);
      const result = await promise;

      expect(result.blob.type).toBe("application/pdf");
    });

    it("should return blob with correct Excel MIME type", async () => {
      const params: CustomersReportParams = {
        format: "excel",
      };

      const promise = reportsService.generateCustomersReport(params);
      vi.advanceTimersByTime(2000);
      const result = await promise;

      expect(result.blob.type).toBe(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
    });

    it("should return filename with .pdf extension for PDF format", async () => {
      const params: CustomersReportParams = {
        format: "pdf",
      };

      const promise = reportsService.generateCustomersReport(params);
      vi.advanceTimersByTime(2000);
      const result = await promise;

      expect(result.fileName).toMatch(/\.pdf$/);
    });

    it("should return filename with .xlsx extension for Excel format", async () => {
      const params: CustomersReportParams = {
        format: "excel",
      };

      const promise = reportsService.generateCustomersReport(params);
      vi.advanceTimersByTime(2000);
      const result = await promise;

      expect(result.fileName).toMatch(/\.xlsx$/);
    });

    it("should return non-empty blob", async () => {
      const params: CustomersReportParams = {
        format: "pdf",
      };

      const promise = reportsService.generateCustomersReport(params);
      vi.advanceTimersByTime(2000);
      const result = await promise;

      expect(result.blob.size).toBeGreaterThan(0);
    });

    it("should include current date in filename", async () => {
      const params: CustomersReportParams = {
        format: "excel",
      };

      const promise = reportsService.generateCustomersReport(params);
      vi.advanceTimersByTime(2000);
      const result = await promise;

      const datePattern = /\d{4}-\d{2}-\d{2}/;
      expect(result.fileName).toMatch(datePattern);
    });
  });

  describe("downloadInvoicePdf", () => {
    it("should download invoice PDF with valid invoice ID", async () => {
      const invoiceId = "INV-001";

      const promise = reportsService.downloadInvoicePdf(invoiceId);
      vi.advanceTimersByTime(1000);
      const result = await promise;

      expect(result).toHaveProperty("blob");
      expect(result).toHaveProperty("fileName");
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.blob.type).toBe("application/pdf");
    });

    it("should return filename with invoice ID", async () => {
      const invoiceId = "INV-001";

      const promise = reportsService.downloadInvoicePdf(invoiceId);
      vi.advanceTimersByTime(1000);
      const result = await promise;

      expect(result.fileName).toBe(`factura-${invoiceId}.pdf`);
    });

    it("should return filename with correct format", async () => {
      const invoiceId = "FAC-2024-0001";

      const promise = reportsService.downloadInvoicePdf(invoiceId);
      vi.advanceTimersByTime(1000);
      const result = await promise;

      expect(result.fileName).toMatch(/^factura-.+\.pdf$/);
      expect(result.fileName).toContain(invoiceId);
    });

    it("should return blob with PDF MIME type", async () => {
      const invoiceId = "INV-123";

      const promise = reportsService.downloadInvoicePdf(invoiceId);
      vi.advanceTimersByTime(1000);
      const result = await promise;

      expect(result.blob.type).toBe("application/pdf");
    });

    it("should return non-empty blob", async () => {
      const invoiceId = "INV-456";

      const promise = reportsService.downloadInvoicePdf(invoiceId);
      vi.advanceTimersByTime(1000);
      const result = await promise;

      expect(result.blob.size).toBeGreaterThan(0);
    });

    it("should handle numeric invoice ID", async () => {
      const invoiceId = "12345";

      const promise = reportsService.downloadInvoicePdf(invoiceId);
      vi.advanceTimersByTime(1000);
      const result = await promise;

      expect(result.fileName).toBe("factura-12345.pdf");
      expect(result.blob).toBeInstanceOf(Blob);
    });

    it("should handle invoice ID with special characters", async () => {
      const invoiceId = "FAC-2024/001-A";

      const promise = reportsService.downloadInvoicePdf(invoiceId);
      vi.advanceTimersByTime(1000);
      const result = await promise;

      expect(result.fileName).toBe(`factura-${invoiceId}.pdf`);
      expect(result.blob).toBeInstanceOf(Blob);
    });
  });

  describe("downloadReport", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockCreateObjectURL: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockRevokeObjectURL: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockAppendChild: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockRemoveChild: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockClick: any;
    let createdAnchor: HTMLAnchorElement;

    beforeEach(() => {
      mockCreateObjectURL = vi.fn().mockReturnValue("blob:mock-url");
      mockRevokeObjectURL = vi.fn();
      mockAppendChild = vi.fn();
      mockRemoveChild = vi.fn();
      mockClick = vi.fn();

      // Mock window.URL
      Object.defineProperty(window, "URL", {
        value: {
          createObjectURL: mockCreateObjectURL,
          revokeObjectURL: mockRevokeObjectURL,
        },
        writable: true,
      });

      // Mock document.createElement
      vi.spyOn(document, "createElement").mockImplementation(
        (tagName: string) => {
          if (tagName === "a") {
            createdAnchor = {
              href: "",
              download: "",
              click: mockClick,
            } as unknown as HTMLAnchorElement;
            return createdAnchor;
          }
          return document.createElement(tagName);
        },
      );

      // Mock document.body.appendChild and removeChild
      vi.spyOn(document.body, "appendChild").mockImplementation(
        <T extends Node>(node: T): T => {
          mockAppendChild(node);
          return node;
        },
      );
      vi.spyOn(document.body, "removeChild").mockImplementation(
        <T extends Node>(child: T): T => {
          mockRemoveChild(child);
          return child;
        },
      );
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should create object URL for blob", () => {
      const blob = new Blob(["test content"], { type: "application/pdf" });
      const fileName = "test-report.pdf";

      reportsService.downloadReport(blob, fileName);

      expect(mockCreateObjectURL).toHaveBeenCalledWith(blob);
    });

    it("should create anchor element", () => {
      const blob = new Blob(["test content"], { type: "application/pdf" });
      const fileName = "test-report.pdf";

      reportsService.downloadReport(blob, fileName);

      expect(document.createElement).toHaveBeenCalledWith("a");
    });

    it("should set correct href attribute on anchor", () => {
      const blob = new Blob(["test content"], { type: "application/pdf" });
      const fileName = "test-report.pdf";

      reportsService.downloadReport(blob, fileName);

      expect(createdAnchor.href).toBe("blob:mock-url");
    });

    it("should set correct download attribute on anchor", () => {
      const blob = new Blob(["test content"], { type: "application/pdf" });
      const fileName = "test-report.pdf";

      reportsService.downloadReport(blob, fileName);

      expect(createdAnchor.download).toBe(fileName);
    });

    it("should append anchor to document body", () => {
      const blob = new Blob(["test content"], { type: "application/pdf" });
      const fileName = "test-report.pdf";

      reportsService.downloadReport(blob, fileName);

      expect(mockAppendChild).toHaveBeenCalledWith(createdAnchor);
    });

    it("should trigger click on anchor", () => {
      const blob = new Blob(["test content"], { type: "application/pdf" });
      const fileName = "test-report.pdf";

      reportsService.downloadReport(blob, fileName);

      expect(mockClick).toHaveBeenCalled();
    });

    it("should remove anchor from document body after click", () => {
      const blob = new Blob(["test content"], { type: "application/pdf" });
      const fileName = "test-report.pdf";

      reportsService.downloadReport(blob, fileName);

      expect(mockRemoveChild).toHaveBeenCalledWith(createdAnchor);
    });

    it("should revoke object URL to free memory", () => {
      const blob = new Blob(["test content"], { type: "application/pdf" });
      const fileName = "test-report.pdf";

      reportsService.downloadReport(blob, fileName);

      expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
    });

    it("should handle Excel blob correctly", () => {
      const blob = new Blob(["excel content"], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const fileName = "test-report.xlsx";

      reportsService.downloadReport(blob, fileName);

      expect(mockCreateObjectURL).toHaveBeenCalledWith(blob);
      expect(createdAnchor.download).toBe(fileName);
      expect(mockClick).toHaveBeenCalled();
    });

    it("should handle PDF blob correctly", () => {
      const blob = new Blob(["pdf content"], { type: "application/pdf" });
      const fileName = "invoice.pdf";

      reportsService.downloadReport(blob, fileName);

      expect(mockCreateObjectURL).toHaveBeenCalledWith(blob);
      expect(createdAnchor.download).toBe("invoice.pdf");
      expect(mockClick).toHaveBeenCalled();
    });

    it("should execute operations in correct order", () => {
      const callOrder: string[] = [];
      mockCreateObjectURL.mockImplementation(() => {
        callOrder.push("createObjectURL");
        return "blob:mock-url";
      });
      mockAppendChild.mockImplementation(() => {
        callOrder.push("appendChild");
      });
      mockClick.mockImplementation(() => {
        callOrder.push("click");
      });
      mockRemoveChild.mockImplementation(() => {
        callOrder.push("removeChild");
      });
      mockRevokeObjectURL.mockImplementation(() => {
        callOrder.push("revokeObjectURL");
      });

      const blob = new Blob(["test"], { type: "application/pdf" });
      reportsService.downloadReport(blob, "test.pdf");

      expect(callOrder).toEqual([
        "createObjectURL",
        "appendChild",
        "click",
        "removeChild",
        "revokeObjectURL",
      ]);
    });
  });

  describe("getRecentReports", () => {
    it("should return array of reports", async () => {
      const promise = reportsService.getRecentReports();
      vi.advanceTimersByTime(400);
      const result = await promise;

      expect(Array.isArray(result)).toBe(true);
    });

    it("should return reports with correct structure", async () => {
      const promise = reportsService.getRecentReports();
      vi.advanceTimersByTime(400);
      const result = await promise;

      result.forEach((report: RecentReport) => {
        expect(report).toHaveProperty("id");
        expect(report).toHaveProperty("type");
        expect(report).toHaveProperty("format");
        expect(report).toHaveProperty("generatedAt");
        expect(report).toHaveProperty("params");
        expect(report).toHaveProperty("fileName");
      });
    });

    it("should return reports with valid id", async () => {
      const promise = reportsService.getRecentReports();
      vi.advanceTimersByTime(400);
      const result = await promise;

      result.forEach((report: RecentReport) => {
        expect(typeof report.id).toBe("string");
        expect(report.id.length).toBeGreaterThan(0);
      });
    });

    it("should return reports with valid type", async () => {
      const promise = reportsService.getRecentReports();
      vi.advanceTimersByTime(400);
      const result = await promise;

      const validTypes = ["sales", "inventory", "customers"];
      result.forEach((report: RecentReport) => {
        expect(validTypes).toContain(report.type);
      });
    });

    it("should return reports with valid format", async () => {
      const promise = reportsService.getRecentReports();
      vi.advanceTimersByTime(400);
      const result = await promise;

      const validFormats = ["pdf", "excel"];
      result.forEach((report: RecentReport) => {
        expect(validFormats).toContain(report.format);
      });
    });

    it("should return reports with valid generatedAt timestamp", async () => {
      const promise = reportsService.getRecentReports();
      vi.advanceTimersByTime(400);
      const result = await promise;

      result.forEach((report: RecentReport) => {
        expect(typeof report.generatedAt).toBe("string");
        const date = new Date(report.generatedAt);
        expect(date.toString()).not.toBe("Invalid Date");
      });
    });

    it("should return reports with valid params object", async () => {
      const promise = reportsService.getRecentReports();
      vi.advanceTimersByTime(400);
      const result = await promise;

      result.forEach((report: RecentReport) => {
        expect(typeof report.params).toBe("object");
        expect(report.params).toHaveProperty("format");
      });
    });

    it("should return reports with valid fileName", async () => {
      const promise = reportsService.getRecentReports();
      vi.advanceTimersByTime(400);
      const result = await promise;

      result.forEach((report: RecentReport) => {
        expect(typeof report.fileName).toBe("string");
        expect(report.fileName.length).toBeGreaterThan(0);
        // Filename should end with .pdf or .xlsx
        expect(report.fileName).toMatch(/\.(pdf|xlsx)$/);
      });
    });

    it("should return reports with optional fileSize as number if present", async () => {
      const promise = reportsService.getRecentReports();
      vi.advanceTimersByTime(400);
      const result = await promise;

      result.forEach((report: RecentReport) => {
        if (report.fileSize !== undefined) {
          expect(typeof report.fileSize).toBe("number");
          expect(report.fileSize).toBeGreaterThanOrEqual(0);
        }
      });
    });

    it("should return multiple reports", async () => {
      const promise = reportsService.getRecentReports();
      vi.advanceTimersByTime(400);
      const result = await promise;

      expect(result.length).toBeGreaterThan(0);
    });

    it("should return reports with sales type having date params", async () => {
      const promise = reportsService.getRecentReports();
      vi.advanceTimersByTime(400);
      const result = await promise;

      const salesReports = result.filter(
        (r: RecentReport) => r.type === "sales",
      );
      salesReports.forEach((report: RecentReport) => {
        const params = report.params as SalesReportParams;
        expect(params).toHaveProperty("format");
        if (params.fromDate) {
          expect(typeof params.fromDate).toBe("string");
        }
        if (params.toDate) {
          expect(typeof params.toDate).toBe("string");
        }
      });
    });

    it("should return reports with inventory type having correct params", async () => {
      const promise = reportsService.getRecentReports();
      vi.advanceTimersByTime(400);
      const result = await promise;

      const inventoryReports = result.filter(
        (r: RecentReport) => r.type === "inventory",
      );
      inventoryReports.forEach((report: RecentReport) => {
        const params = report.params as InventoryReportParams;
        expect(params).toHaveProperty("format");
      });
    });

    it("should return reports with customers type having correct params", async () => {
      const promise = reportsService.getRecentReports();
      vi.advanceTimersByTime(400);
      const result = await promise;

      const customersReports = result.filter(
        (r: RecentReport) => r.type === "customers",
      );
      customersReports.forEach((report: RecentReport) => {
        const params = report.params as CustomersReportParams;
        expect(params).toHaveProperty("format");
      });
    });

    it("should return consistent results on multiple calls", async () => {
      const promise1 = reportsService.getRecentReports();
      vi.advanceTimersByTime(400);
      const result1 = await promise1;

      const promise2 = reportsService.getRecentReports();
      vi.advanceTimersByTime(400);
      const result2 = await promise2;

      expect(result1.length).toBe(result2.length);
      expect(result1[0].id).toBe(result2[0].id);
    });
  });

  describe("edge cases", () => {
    it("should handle sales report with same fromDate and toDate", async () => {
      const params: SalesReportParams = {
        format: "pdf",
        fromDate: "2024-01-15",
        toDate: "2024-01-15",
      };

      const promise = reportsService.generateSalesReport(params);
      vi.advanceTimersByTime(2000);
      const result = await promise;

      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.fileName).toContain("reporte-ventas");
    });

    it("should handle empty category ID as undefined", async () => {
      const params: InventoryReportParams = {
        format: "pdf",
        categoryId: undefined,
      };

      const promise = reportsService.generateInventoryReport(params);
      vi.advanceTimersByTime(2000);
      const result = await promise;

      expect(result.blob).toBeInstanceOf(Blob);
    });

    it("should generate reports with both format options consistently", async () => {
      const formats: ReportFormat[] = ["pdf", "excel"];

      for (const format of formats) {
        const params: CustomersReportParams = { format };
        const promise = reportsService.generateCustomersReport(params);
        vi.advanceTimersByTime(2000);
        const result = await promise;

        expect(result.blob).toBeInstanceOf(Blob);
        if (format === "pdf") {
          expect(result.fileName).toMatch(/\.pdf$/);
          expect(result.blob.type).toBe("application/pdf");
        } else {
          expect(result.fileName).toMatch(/\.xlsx$/);
          expect(result.blob.type).toBe(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          );
        }
      }
    });

    it("should handle long date ranges for sales report", async () => {
      const params: SalesReportParams = {
        format: "excel",
        fromDate: "2020-01-01",
        toDate: "2024-12-31",
      };

      const promise = reportsService.generateSalesReport(params);
      vi.advanceTimersByTime(2000);
      const result = await promise;

      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.fileName).toContain("reporte-ventas");
    });

    it("should handle invoice ID with leading zeros", async () => {
      const invoiceId = "000123";

      const promise = reportsService.downloadInvoicePdf(invoiceId);
      vi.advanceTimersByTime(1000);
      const result = await promise;

      expect(result.fileName).toBe("factura-000123.pdf");
    });

    it("should handle very long invoice ID", async () => {
      const invoiceId = "FAC-2024-0001-SUPPLEMENT-A-REVISION-2-CORRECTED";

      const promise = reportsService.downloadInvoicePdf(invoiceId);
      vi.advanceTimersByTime(1000);
      const result = await promise;

      expect(result.fileName).toContain(invoiceId);
      expect(result.blob).toBeInstanceOf(Blob);
    });
  });

  describe("report timing", () => {
    it("should complete sales report generation within timeout", async () => {
      const params: SalesReportParams = {
        format: "pdf",
        fromDate: "2024-01-01",
        toDate: "2024-01-31",
      };

      const promise = reportsService.generateSalesReport(params);

      // Advance time to ensure the mock delay completes
      vi.advanceTimersByTime(2000);

      const result = await promise;
      expect(result).toBeDefined();
    });

    it("should complete inventory report generation within timeout", async () => {
      const params: InventoryReportParams = {
        format: "excel",
      };

      const promise = reportsService.generateInventoryReport(params);
      vi.advanceTimersByTime(2000);

      const result = await promise;
      expect(result).toBeDefined();
    });

    it("should complete customers report generation within timeout", async () => {
      const params: CustomersReportParams = {
        format: "pdf",
      };

      const promise = reportsService.generateCustomersReport(params);
      vi.advanceTimersByTime(2000);

      const result = await promise;
      expect(result).toBeDefined();
    });

    it("should complete invoice PDF download within timeout", async () => {
      const promise = reportsService.downloadInvoicePdf("INV-001");
      vi.advanceTimersByTime(1000);

      const result = await promise;
      expect(result).toBeDefined();
    });

    it("should complete getRecentReports within timeout", async () => {
      const promise = reportsService.getRecentReports();
      vi.advanceTimersByTime(400);

      const result = await promise;
      expect(result).toBeDefined();
    });
  });
});
