import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InvoiceStatus, PaymentStatus, CustomerStatus } from '@prisma/client';
import PdfPrinter from 'pdfmake';
import * as XLSX from 'xlsx';
import { PrismaService } from '../prisma';
import { TenantContextService } from '../common';
import {
  createInvoiceTemplate,
  createSalesReportTemplate,
  createInventoryReportTemplate,
  createCustomersReportTemplate,
  type InvoiceTemplateData,
  type SalesReportTemplateData,
  type InventoryReportTemplateData,
  type CustomersReportTemplateData,
} from './templates';

/**
 * Font configuration for PDFMake
 * Using Roboto fonts that are commonly available
 */
const fonts = {
  Roboto: {
    normal: 'node_modules/pdfmake/build/vfs_fonts.js',
    bold: 'node_modules/pdfmake/build/vfs_fonts.js',
    italics: 'node_modules/pdfmake/build/vfs_fonts.js',
    bolditalics: 'node_modules/pdfmake/build/vfs_fonts.js',
  },
};

/**
 * ReportsService handles all report generation operations including
 * PDF and Excel exports for invoices, sales, inventory, and customers.
 *
 * All reports are scoped to the current tenant for data isolation.
 */
@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);
  private readonly pdfPrinter: PdfPrinter;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {
    // Initialize PDFMake printer with fonts
    this.pdfPrinter = new PdfPrinter(fonts);
  }

  // ============================================================================
  // INVOICE PDF
  // ============================================================================

  /**
   * Generates a PDF for a single invoice.
   *
   * @param invoiceId - The invoice ID to generate PDF for
   * @returns PDF buffer
   * @throws NotFoundException if invoice not found
   */
  async generateInvoicePdf(invoiceId: string): Promise<Buffer> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(
      `Generating invoice PDF for invoice ${invoiceId} in tenant ${tenantId}`,
    );

    // Fetch invoice with all relations
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: {
        customer: true,
        user: true,
        items: {
          include: {
            product: true,
          },
        },
        tenant: {
          include: {
            dianConfig: true,
          },
        },
      },
    });

    if (!invoice) {
      this.logger.warn(`Invoice not found: ${invoiceId}`);
      throw new NotFoundException('Factura no encontrada');
    }

    const dian = invoice.tenant.dianConfig;

    // Build template data
    const templateData: InvoiceTemplateData = {
      tenant: {
        name: invoice.tenant.name,
        email: invoice.tenant.email,
        phone: invoice.tenant.phone,
        businessName: dian?.businessName ?? null,
        nit: dian?.nit ?? null,
        dv: dian?.dv ?? null,
        address: dian?.address ?? null,
        city: dian?.city ?? null,
        resolutionNumber: dian?.resolutionNumber ?? null,
        resolutionPrefix: dian?.resolutionPrefix ?? null,
        resolutionRangeFrom: dian?.resolutionRangeFrom ?? null,
        resolutionRangeTo: dian?.resolutionRangeTo ?? null,
        resolutionDate: dian?.resolutionDate ?? null,
      },
      invoice: {
        invoiceNumber: invoice.invoiceNumber,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        status: invoice.status,
        paymentStatus: invoice.paymentStatus,
        notes: invoice.notes,
        dianCufe: invoice.dianCufe,
      },
      customer: invoice.customer
        ? {
            name: invoice.customer.name,
            email: invoice.customer.email,
            phone: invoice.customer.phone,
            documentType: invoice.customer.documentType,
            documentNumber: invoice.customer.documentNumber,
            address: invoice.customer.address,
            city: invoice.customer.city,
          }
        : null,
      items: invoice.items.map((item) => ({
        productName: item.product?.name || 'Producto eliminado',
        productSku: item.product?.sku || 'N/A',
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        taxRate: Number(item.taxRate),
        discount: Number(item.discount),
        subtotal: Number(item.subtotal),
        tax: Number(item.tax),
        total: Number(item.total),
      })),
      totals: {
        subtotal: Number(invoice.subtotal),
        tax: Number(invoice.tax),
        discount: Number(invoice.discount),
        total: Number(invoice.total),
      },
    };

    // Generate PDF
    const docDefinition = createInvoiceTemplate(templateData);
    const pdfBuffer = await this.generatePdfBuffer(docDefinition);

    this.logger.log(`Invoice PDF generated for ${invoice.invoiceNumber}`);

    return pdfBuffer;
  }

  // ============================================================================
  // SALES REPORT
  // ============================================================================

  /**
   * Generates a sales report for the specified date range.
   *
   * @param fromDate - Start date (inclusive)
   * @param toDate - End date (inclusive)
   * @param format - Output format ('pdf' or 'excel')
   * @param categoryId - Optional category filter
   * @returns Buffer containing the report
   */
  async generateSalesReport(
    fromDate: Date,
    toDate: Date,
    format: 'pdf' | 'excel',
    categoryId?: string,
  ): Promise<Buffer> {
    const tenantId = this.tenantContext.requireTenantId();
    const tenant = await this.tenantContext.getTenant();

    this.logger.debug(
      `Generating sales report for tenant ${tenantId} from ${fromDate.toISOString()} to ${toDate.toISOString()}`,
    );

    // Build base invoice filter
    const invoiceWhere = {
      tenantId,
      issueDate: {
        gte: fromDate,
        lte: toDate,
      },
      status: {
        notIn: [InvoiceStatus.CANCELLED, InvoiceStatus.VOID],
      },
    };

    // Fetch invoices with items
    const invoices = await this.prisma.invoice.findMany({
      where: invoiceWhere,
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    // Calculate summary
    const totalSales = invoices.reduce(
      (sum, inv) => sum + Number(inv.total),
      0,
    );
    const invoiceCount = invoices.length;
    const averageInvoice = invoiceCount > 0 ? totalSales / invoiceCount : 0;
    const paidInvoices = invoices.filter(
      (inv) => inv.paymentStatus === PaymentStatus.PAID,
    ).length;
    const unpaidInvoices = invoiceCount - paidInvoices;

    // Calculate sales by category
    const categoryMap = new Map<
      string,
      { totalSales: number; invoiceCount: number }
    >();

    for (const invoice of invoices) {
      for (const item of invoice.items) {
        // Apply category filter if specified
        if (categoryId && item.product?.categoryId !== categoryId) {
          continue;
        }

        const categoryName = item.product?.category?.name || 'Sin categoria';
        const existing = categoryMap.get(categoryName) || {
          totalSales: 0,
          invoiceCount: 0,
        };
        existing.totalSales += Number(item.total);
        categoryMap.set(categoryName, existing);
      }
    }

    // Track invoice counts per category
    const invoiceCategorySet = new Map<string, Set<string>>();
    for (const invoice of invoices) {
      for (const item of invoice.items) {
        if (categoryId && item.product?.categoryId !== categoryId) {
          continue;
        }
        const categoryName = item.product?.category?.name || 'Sin categoria';
        const set = invoiceCategorySet.get(categoryName) || new Set();
        set.add(invoice.id);
        invoiceCategorySet.set(categoryName, set);
      }
    }

    const categoryBreakdown = Array.from(categoryMap.entries())
      .map(([categoryName, data]) => ({
        categoryName,
        totalSales: data.totalSales,
        invoiceCount: invoiceCategorySet.get(categoryName)?.size || 0,
        percentage: totalSales > 0 ? (data.totalSales / totalSales) * 100 : 0,
      }))
      .sort((a, b) => b.totalSales - a.totalSales);

    // Calculate top selling products
    const productMap = new Map<
      string,
      {
        productName: string;
        productSku: string;
        quantitySold: number;
        totalRevenue: number;
      }
    >();

    for (const invoice of invoices) {
      for (const item of invoice.items) {
        if (categoryId && item.product?.categoryId !== categoryId) {
          continue;
        }
        if (!item.product) continue;

        const existing = productMap.get(item.productId || '') || {
          productName: item.product.name,
          productSku: item.product.sku,
          quantitySold: 0,
          totalRevenue: 0,
        };
        existing.quantitySold += item.quantity;
        existing.totalRevenue += Number(item.total);
        productMap.set(item.productId || '', existing);
      }
    }

    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);

    const reportData: SalesReportTemplateData = {
      tenant: { name: tenant.name },
      period: { fromDate, toDate },
      summary: {
        totalSales,
        invoiceCount,
        averageInvoice,
        paidInvoices,
        unpaidInvoices,
      },
      categoryBreakdown,
      topProducts,
      generatedAt: new Date(),
    };

    if (format === 'pdf') {
      return this.generateSalesReportPdf(reportData);
    } else {
      return this.generateSalesReportExcel(reportData);
    }
  }

  private async generateSalesReportPdf(
    data: SalesReportTemplateData,
  ): Promise<Buffer> {
    const docDefinition = createSalesReportTemplate(data);
    return this.generatePdfBuffer(docDefinition);
  }

  private generateSalesReportExcel(data: SalesReportTemplateData): Buffer {
    const workbook = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ['Reporte de Ventas'],
      ['Empresa:', data.tenant.name],
      [
        'Periodo:',
        `${this.formatDate(data.period.fromDate)} - ${this.formatDate(data.period.toDate)}`,
      ],
      [''],
      ['RESUMEN'],
      ['Total Ventas:', data.summary.totalSales],
      ['Facturas Emitidas:', data.summary.invoiceCount],
      ['Promedio por Factura:', data.summary.averageInvoice],
      ['Facturas Pagadas:', data.summary.paidInvoices],
      ['Facturas Pendientes:', data.summary.unpaidInvoices],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');

    // Category breakdown sheet
    const categoryData = [
      ['Categoria', 'Total Ventas', 'Facturas', '% del Total'],
      ...data.categoryBreakdown.map((c) => [
        c.categoryName,
        c.totalSales,
        c.invoiceCount,
        `${c.percentage.toFixed(1)}%`,
      ]),
    ];
    const categorySheet = XLSX.utils.aoa_to_sheet(categoryData);
    XLSX.utils.book_append_sheet(workbook, categorySheet, 'Por Categoria');

    // Top products sheet
    const productsData = [
      ['#', 'Producto', 'SKU', 'Cantidad Vendida', 'Ingresos'],
      ...data.topProducts.map((p, i) => [
        i + 1,
        p.productName,
        p.productSku,
        p.quantitySold,
        p.totalRevenue,
      ]),
    ];
    const productsSheet = XLSX.utils.aoa_to_sheet(productsData);
    XLSX.utils.book_append_sheet(workbook, productsSheet, 'Top Productos');

    // Generate buffer
    const xlsxBuffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    }) as Buffer;
    return xlsxBuffer;
  }

  // ============================================================================
  // INVENTORY REPORT
  // ============================================================================

  /**
   * Generates an inventory report.
   *
   * @param format - Output format ('pdf' or 'excel')
   * @param categoryId - Optional category filter
   * @returns Buffer containing the report
   */
  async generateInventoryReport(
    format: 'pdf' | 'excel',
    categoryId?: string,
  ): Promise<Buffer> {
    const tenantId = this.tenantContext.requireTenantId();
    const tenant = await this.tenantContext.getTenant();

    this.logger.debug(`Generating inventory report for tenant ${tenantId}`);

    // Build product filter
    const productWhere: { tenantId: string; categoryId?: string } = {
      tenantId,
    };
    if (categoryId) {
      productWhere.categoryId = categoryId;
    }

    // Fetch all products with category
    const products = await this.prisma.product.findMany({
      where: productWhere,
      include: {
        category: true,
      },
      orderBy: { name: 'asc' },
    });

    // Calculate summary
    let totalStockValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let activeProducts = 0;

    const productData: InventoryReportTemplateData['products'] = [];
    const lowStockProducts: InventoryReportTemplateData['lowStockProducts'] =
      [];
    const outOfStockProducts: InventoryReportTemplateData['outOfStockProducts'] =
      [];

    for (const product of products) {
      const stockValue = product.stock * Number(product.costPrice);
      totalStockValue += stockValue;

      const isLowStock = product.stock > 0 && product.stock < product.minStock;
      const isOutOfStock = product.stock === 0;

      if (product.status === 'ACTIVE') {
        activeProducts++;
      }

      if (isLowStock) {
        lowStockCount++;
        lowStockProducts.push({
          name: product.name,
          sku: product.sku,
          stock: product.stock,
          minStock: product.minStock,
        });
      }

      if (isOutOfStock) {
        outOfStockCount++;
        outOfStockProducts.push({
          name: product.name,
          sku: product.sku,
          minStock: product.minStock,
        });
      }

      productData.push({
        name: product.name,
        sku: product.sku,
        categoryName: product.category?.name || null,
        stock: product.stock,
        minStock: product.minStock,
        costPrice: Number(product.costPrice),
        salePrice: Number(product.salePrice),
        stockValue,
        status: product.status,
        isLowStock,
        isOutOfStock,
      });
    }

    const reportData: InventoryReportTemplateData = {
      tenant: { name: tenant.name },
      summary: {
        totalProducts: products.length,
        totalStockValue,
        lowStockCount,
        outOfStockCount,
        activeProducts,
      },
      products: productData,
      lowStockProducts,
      outOfStockProducts,
      generatedAt: new Date(),
    };

    if (format === 'pdf') {
      return this.generateInventoryReportPdf(reportData);
    } else {
      return this.generateInventoryReportExcel(reportData);
    }
  }

  private async generateInventoryReportPdf(
    data: InventoryReportTemplateData,
  ): Promise<Buffer> {
    const docDefinition = createInventoryReportTemplate(data);
    return this.generatePdfBuffer(docDefinition);
  }

  private generateInventoryReportExcel(
    data: InventoryReportTemplateData,
  ): Buffer {
    const workbook = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ['Reporte de Inventario'],
      ['Empresa:', data.tenant.name],
      ['Generado:', this.formatDate(data.generatedAt)],
      [''],
      ['RESUMEN'],
      ['Total Productos:', data.summary.totalProducts],
      ['Valor del Inventario:', data.summary.totalStockValue],
      ['Productos Activos:', data.summary.activeProducts],
      ['Con Stock Bajo:', data.summary.lowStockCount],
      ['Sin Stock:', data.summary.outOfStockCount],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');

    // Full inventory sheet
    const inventoryData = [
      [
        'Producto',
        'SKU',
        'Categoria',
        'Stock',
        'Stock Minimo',
        'Costo',
        'Precio Venta',
        'Valor Stock',
        'Estado',
      ],
      ...data.products.map((p) => [
        p.name,
        p.sku,
        p.categoryName || 'Sin categoria',
        p.stock,
        p.minStock,
        p.costPrice,
        p.salePrice,
        p.stockValue,
        p.status,
      ]),
    ];
    const inventorySheet = XLSX.utils.aoa_to_sheet(inventoryData);
    XLSX.utils.book_append_sheet(workbook, inventorySheet, 'Inventario');

    // Low stock alerts sheet
    if (data.lowStockProducts.length > 0) {
      const lowStockData = [
        ['Producto', 'SKU', 'Stock Actual', 'Stock Minimo', 'Diferencia'],
        ...data.lowStockProducts.map((p) => [
          p.name,
          p.sku,
          p.stock,
          p.minStock,
          p.minStock - p.stock,
        ]),
      ];
      const lowStockSheet = XLSX.utils.aoa_to_sheet(lowStockData);
      XLSX.utils.book_append_sheet(workbook, lowStockSheet, 'Stock Bajo');
    }

    // Out of stock sheet
    if (data.outOfStockProducts.length > 0) {
      const outOfStockData = [
        ['Producto', 'SKU', 'Stock Minimo Recomendado'],
        ...data.outOfStockProducts.map((p) => [p.name, p.sku, p.minStock]),
      ];
      const outOfStockSheet = XLSX.utils.aoa_to_sheet(outOfStockData);
      XLSX.utils.book_append_sheet(workbook, outOfStockSheet, 'Sin Stock');
    }

    // Generate buffer
    const xlsxBuffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    }) as Buffer;
    return xlsxBuffer;
  }

  // ============================================================================
  // CUSTOMERS REPORT
  // ============================================================================

  /**
   * Generates a customers report.
   *
   * @param format - Output format ('pdf' or 'excel')
   * @returns Buffer containing the report
   */
  async generateCustomersReport(format: 'pdf' | 'excel'): Promise<Buffer> {
    const tenantId = this.tenantContext.requireTenantId();
    const tenant = await this.tenantContext.getTenant();

    this.logger.debug(`Generating customers report for tenant ${tenantId}`);

    // Fetch all customers with their invoices
    const customers = await this.prisma.customer.findMany({
      where: { tenantId },
      include: {
        invoices: {
          where: {
            status: {
              notIn: [InvoiceStatus.CANCELLED, InvoiceStatus.VOID],
            },
          },
          select: {
            id: true,
            total: true,
            issueDate: true,
          },
          orderBy: { issueDate: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Calculate summary
    const totalCustomers = customers.length;
    const activeCustomers = customers.filter(
      (c) => c.status === CustomerStatus.ACTIVE,
    ).length;
    const customersWithPurchases = customers.filter(
      (c) => c.invoices.length > 0,
    ).length;
    const totalRevenue = customers.reduce(
      (sum, c) =>
        sum + c.invoices.reduce((iSum, i) => iSum + Number(i.total), 0),
      0,
    );

    // Build customer data
    const customerData: CustomersReportTemplateData['customers'] =
      customers.map((customer) => {
        const totalPurchases = customer.invoices.reduce(
          (sum, i) => sum + Number(i.total),
          0,
        );
        const lastPurchaseDate =
          customer.invoices.length > 0 ? customer.invoices[0].issueDate : null;

        return {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          documentType: customer.documentType,
          documentNumber: customer.documentNumber,
          city: customer.city,
          status: customer.status,
          totalPurchases,
          invoiceCount: customer.invoices.length,
          lastPurchaseDate,
        };
      });

    // Top customers by purchase amount
    const topCustomersSorted = [...customerData]
      .filter((c) => c.totalPurchases > 0)
      .sort((a, b) => b.totalPurchases - a.totalPurchases)
      .slice(0, 10);

    const topCustomers = topCustomersSorted.map((c) => ({
      name: c.name,
      documentNumber: c.documentNumber,
      totalPurchases: c.totalPurchases,
      invoiceCount: c.invoiceCount,
    }));

    const reportData: CustomersReportTemplateData = {
      tenant: { name: tenant.name },
      summary: {
        totalCustomers,
        activeCustomers,
        customersWithPurchases,
        totalRevenue,
      },
      customers: customerData,
      topCustomers,
      generatedAt: new Date(),
    };

    if (format === 'pdf') {
      return this.generateCustomersReportPdf(reportData);
    } else {
      return this.generateCustomersReportExcel(reportData);
    }
  }

  private async generateCustomersReportPdf(
    data: CustomersReportTemplateData,
  ): Promise<Buffer> {
    const docDefinition = createCustomersReportTemplate(data);
    return this.generatePdfBuffer(docDefinition);
  }

  private generateCustomersReportExcel(
    data: CustomersReportTemplateData,
  ): Buffer {
    const workbook = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ['Reporte de Clientes'],
      ['Empresa:', data.tenant.name],
      ['Generado:', this.formatDate(data.generatedAt)],
      [''],
      ['RESUMEN'],
      ['Total Clientes:', data.summary.totalCustomers],
      ['Clientes Activos:', data.summary.activeCustomers],
      ['Con Compras:', data.summary.customersWithPurchases],
      ['Ingresos Totales:', data.summary.totalRevenue],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');

    // Top customers sheet
    const topCustomersData = [
      ['#', 'Cliente', 'Documento', 'Facturas', 'Total Compras'],
      ...data.topCustomers.map((c, i) => [
        i + 1,
        c.name,
        c.documentNumber,
        c.invoiceCount,
        c.totalPurchases,
      ]),
    ];
    const topCustomersSheet = XLSX.utils.aoa_to_sheet(topCustomersData);
    XLSX.utils.book_append_sheet(workbook, topCustomersSheet, 'Top Clientes');

    // Full customer list sheet
    const customersData = [
      [
        'Cliente',
        'Tipo Doc',
        'Documento',
        'Email',
        'Telefono',
        'Ciudad',
        'Facturas',
        'Total Compras',
        'Ultima Compra',
        'Estado',
      ],
      ...data.customers.map((c) => [
        c.name,
        c.documentType,
        c.documentNumber,
        c.email || 'N/A',
        c.phone || 'N/A',
        c.city || 'N/A',
        c.invoiceCount,
        c.totalPurchases,
        c.lastPurchaseDate ? this.formatDate(c.lastPurchaseDate) : 'N/A',
        c.status,
      ]),
    ];
    const customersSheet = XLSX.utils.aoa_to_sheet(customersData);
    XLSX.utils.book_append_sheet(workbook, customersSheet, 'Clientes');

    // Generate buffer
    const xlsxBuffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    }) as Buffer;
    return xlsxBuffer;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Generates a PDF buffer from a document definition.
   */
  private generatePdfBuffer(docDefinition: object): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const pdfDoc = this.pdfPrinter.createPdfKitDocument(
          docDefinition as Parameters<
            typeof this.pdfPrinter.createPdfKitDocument
          >[0],
        );
        const chunks: Buffer[] = [];

        pdfDoc.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        pdfDoc.on('end', () => {
          const result = Buffer.concat(chunks);
          resolve(result);
        });

        pdfDoc.on('error', (error: Error) => {
          reject(error);
        });

        pdfDoc.end();
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  /**
   * Formats a date in short format
   */
  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(date));
  }
}
