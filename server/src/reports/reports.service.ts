import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  InvoiceStatus,
  PaymentStatus,
  CustomerStatus,
  MovementType,
  JournalEntryStatus,
} from '@prisma/client';
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
 * Represents a single movement entry in the Kardex report.
 */
export interface KardexMovement {
  id: string;
  date: Date;
  type: MovementType;
  description: string;
  entries: number;
  exits: number;
  balance: number;
  reference?: string;
  warehouseName?: string;
}

/**
 * Full Kardex (inventory card) report for a specific product.
 * Shows opening balance, detailed movements, and closing balance.
 */
export interface KardexReport {
  product: {
    id: string;
    sku: string;
    name: string;
    currentStock: number;
    costPrice: number;
  };
  warehouse?: { id: string; name: string };
  fromDate: string;
  toDate: string;
  openingBalance: number;
  movements: KardexMovement[];
  closingBalance: number;
}

/**
 * Data structure for the cost center balance report.
 */
interface CostCenterBalanceData {
  costCenterId: string;
  costCenterCode: string;
  costCenterName: string;
  accounts: {
    accountId: string;
    accountCode: string;
    accountName: string;
    totalDebit: number;
    totalCredit: number;
    balance: number;
  }[];
  totalDebit: number;
  totalCredit: number;
}

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
  // KARDEX (INVENTORY CARD) REPORT
  // ============================================================================

  /**
   * Generates a Kardex (inventory card) report for a specific product.
   *
   * The Kardex shows all entries, exits, and running balance for a product,
   * which is a requirement by DIAN (Colombian tax authority).
   *
   * @param productId - Product ID to generate the Kardex for
   * @param warehouseId - Optional warehouse filter
   * @param fromDate - Optional start date (defaults to 30 days ago)
   * @param toDate - Optional end date (defaults to now)
   * @returns KardexReport with opening balance, movements, and closing balance
   * @throws NotFoundException if product not found
   */
  async getKardexReport(
    productId: string,
    warehouseId?: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<KardexReport> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(
      `Generating Kardex report for product ${productId} in tenant ${tenantId}`,
    );

    // Default date range: last 30 days if not specified
    const effectiveToDate = toDate ?? new Date();
    const effectiveFromDate =
      fromDate ??
      new Date(effectiveToDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Fetch product
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
      select: {
        id: true,
        sku: true,
        name: true,
        stock: true,
        costPrice: true,
      },
    });

    if (!product) {
      this.logger.warn(`Product not found: ${productId}`);
      throw new NotFoundException('Producto no encontrado');
    }

    // Fetch warehouse if filtered
    let warehouse: { id: string; name: string } | undefined;
    if (warehouseId) {
      const warehouseRecord = await this.prisma.warehouse.findFirst({
        where: { id: warehouseId, tenantId },
        select: { id: true, name: true },
      });

      if (!warehouseRecord) {
        this.logger.warn(`Warehouse not found: ${warehouseId}`);
        throw new NotFoundException('Bodega no encontrada');
      }
      warehouse = warehouseRecord;
    }

    // Build the base where clause for movements
    const movementWhere: {
      tenantId: string;
      productId: string;
      warehouseId?: string;
    } = { tenantId, productId };

    if (warehouseId) {
      movementWhere.warehouseId = warehouseId;
    }

    // Calculate opening balance: sum of all movements BEFORE fromDate
    const movementsBeforeRange = await this.prisma.stockMovement.findMany({
      where: {
        ...movementWhere,
        createdAt: { lt: effectiveFromDate },
      },
      select: { type: true, quantity: true },
    });

    let openingBalance = 0;
    for (const movement of movementsBeforeRange) {
      const { entries, exits } = this.classifyMovement(
        movement.type,
        movement.quantity,
      );
      openingBalance += entries - exits;
    }

    // Fetch movements within date range, ordered by date ASC
    const movementsInRange = await this.prisma.stockMovement.findMany({
      where: {
        ...movementWhere,
        createdAt: {
          gte: effectiveFromDate,
          lte: effectiveToDate,
        },
      },
      include: {
        warehouse: { select: { name: true } },
        purchaseOrder: {
          select: { purchaseOrderNumber: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // For movements with invoiceId, batch-fetch invoice numbers
    const invoiceIds = movementsInRange
      .filter((m) => m.invoiceId)
      .map((m) => m.invoiceId as string);

    const invoiceMap = new Map<string, string>();
    if (invoiceIds.length > 0) {
      const invoices = await this.prisma.invoice.findMany({
        where: { id: { in: invoiceIds }, tenantId },
        select: { id: true, invoiceNumber: true },
      });
      for (const inv of invoices) {
        invoiceMap.set(inv.id, inv.invoiceNumber);
      }
    }

    // Build Kardex movements with running balance
    let runningBalance = openingBalance;
    const kardexMovements: KardexMovement[] = movementsInRange.map(
      (movement) => {
        const { entries, exits } = this.classifyMovement(
          movement.type,
          movement.quantity,
        );
        runningBalance += entries - exits;

        const reference = this.buildMovementReference(
          movement.invoiceId ? invoiceMap.get(movement.invoiceId) : undefined,
          movement.purchaseOrder?.purchaseOrderNumber,
        );

        return {
          id: movement.id,
          date: movement.createdAt,
          type: movement.type,
          description: this.buildMovementDescription(
            movement.type,
            movement.reason ?? undefined,
            movement.invoiceId ? invoiceMap.get(movement.invoiceId) : undefined,
            movement.purchaseOrder?.purchaseOrderNumber,
          ),
          entries,
          exits,
          balance: runningBalance,
          reference,
          warehouseName: movement.warehouse?.name,
        };
      },
    );

    return {
      product: {
        id: product.id,
        sku: product.sku,
        name: product.name,
        currentStock: product.stock,
        costPrice: Number(product.costPrice),
      },
      warehouse,
      fromDate: effectiveFromDate.toISOString(),
      toDate: effectiveToDate.toISOString(),
      openingBalance,
      movements: kardexMovements,
      closingBalance: runningBalance,
    };
  }

  /**
   * Classifies a stock movement into entries (IN) and exits (OUT).
   *
   * Type mapping:
   * - PURCHASE -> entries (IN)
   * - SALE -> exits (OUT)
   * - RETURN -> entries (IN)
   * - ADJUSTMENT -> entries if quantity > 0, exits if quantity < 0
   * - TRANSFER -> exits (OUT) from source warehouse
   * - DAMAGED -> exits (OUT)
   */
  private classifyMovement(
    type: MovementType,
    quantity: number,
  ): { entries: number; exits: number } {
    const absQuantity = Math.abs(quantity);

    switch (type) {
      case MovementType.PURCHASE:
      case MovementType.RETURN:
        return { entries: absQuantity, exits: 0 };

      case MovementType.SALE:
      case MovementType.DAMAGED:
      case MovementType.TRANSFER:
        return { entries: 0, exits: absQuantity };

      case MovementType.ADJUSTMENT:
        if (quantity > 0) {
          return { entries: absQuantity, exits: 0 };
        }
        return { entries: 0, exits: absQuantity };

      default:
        return { entries: 0, exits: absQuantity };
    }
  }

  /**
   * Builds a human-readable description for a Kardex movement.
   */
  private buildMovementDescription(
    type: MovementType,
    reason?: string,
    invoiceNumber?: string,
    purchaseOrderNumber?: string,
  ): string {
    const typeLabels: Record<MovementType, string> = {
      [MovementType.PURCHASE]: 'Compra',
      [MovementType.SALE]: 'Venta',
      [MovementType.RETURN]: 'Devolucion',
      [MovementType.ADJUSTMENT]: 'Ajuste',
      [MovementType.TRANSFER]: 'Transferencia',
      [MovementType.DAMAGED]: 'Dano',
    };

    const label = typeLabels[type] || type;

    if (invoiceNumber) {
      return `${label} - Factura #${invoiceNumber}`;
    }

    if (purchaseOrderNumber) {
      return `${label} - OC #${purchaseOrderNumber}`;
    }

    if (reason) {
      return `${label} - ${reason}`;
    }

    return label;
  }

  /**
   * Builds the reference string for a Kardex movement (invoice or PO number).
   */
  private buildMovementReference(
    invoiceNumber?: string,
    purchaseOrderNumber?: string,
  ): string | undefined {
    if (invoiceNumber) return invoiceNumber;
    if (purchaseOrderNumber) return purchaseOrderNumber;
    return undefined;
  }

  // ============================================================================
  // COST CENTER BALANCE REPORT
  // ============================================================================

  /**
   * Generates a cost center balance report for the specified date range.
   * Groups journal entry lines by cost center and account, showing
   * total debits, credits, and balance for each.
   */
  async generateCostCenterBalanceReport(
    fromDate: Date,
    toDate: Date,
    format: 'pdf' | 'excel',
    costCenterId?: string,
  ): Promise<Buffer> {
    const tenantId = this.tenantContext.requireTenantId();

    this.logger.debug(
      `Generating cost center balance report for tenant ${tenantId} from ${fromDate.toISOString()} to ${toDate.toISOString()}`,
    );

    // Query journal entry lines with cost center, filtered by date range and posted status
    const whereClause: any = {
      costCenterId: costCenterId ? costCenterId : { not: null },
      journalEntry: {
        tenantId,
        status: JournalEntryStatus.POSTED,
        date: {
          gte: fromDate,
          lte: toDate,
        },
      },
    };

    const lines = await this.prisma.journalEntryLine.findMany({
      where: whereClause,
      include: {
        account: { select: { id: true, code: true, name: true } },
        costCenter: { select: { id: true, code: true, name: true } },
      },
    });

    // Group by cost center → account
    const ccMap = new Map<
      string,
      {
        costCenterId: string;
        costCenterCode: string;
        costCenterName: string;
        accounts: Map<string, { accountId: string; accountCode: string; accountName: string; totalDebit: number; totalCredit: number }>;
      }
    >();

    for (const line of lines) {
      if (!line.costCenter) continue;

      const ccId = line.costCenter.id;
      if (!ccMap.has(ccId)) {
        ccMap.set(ccId, {
          costCenterId: ccId,
          costCenterCode: line.costCenter.code,
          costCenterName: line.costCenter.name,
          accounts: new Map(),
        });
      }

      const cc = ccMap.get(ccId)!;
      const accId = line.account.id;
      if (!cc.accounts.has(accId)) {
        cc.accounts.set(accId, {
          accountId: accId,
          accountCode: line.account.code,
          accountName: line.account.name,
          totalDebit: 0,
          totalCredit: 0,
        });
      }

      const acc = cc.accounts.get(accId)!;
      acc.totalDebit += Number(line.debit);
      acc.totalCredit += Number(line.credit);
    }

    // Build sorted result
    const costCenterBalances = Array.from(ccMap.values())
      .map((cc) => {
        const accounts = Array.from(cc.accounts.values())
          .map((a) => ({
            ...a,
            balance: a.totalDebit - a.totalCredit,
          }))
          .sort((a, b) => a.accountCode.localeCompare(b.accountCode));

        return {
          costCenterId: cc.costCenterId,
          costCenterCode: cc.costCenterCode,
          costCenterName: cc.costCenterName,
          accounts,
          totalDebit: accounts.reduce((sum, a) => sum + a.totalDebit, 0),
          totalCredit: accounts.reduce((sum, a) => sum + a.totalCredit, 0),
        };
      })
      .sort((a, b) => a.costCenterCode.localeCompare(b.costCenterCode));

    if (format === 'excel') {
      return this.generateCostCenterBalanceExcel(costCenterBalances, fromDate, toDate);
    }
    return this.generateCostCenterBalancePdf(costCenterBalances, fromDate, toDate);
  }

  private async generateCostCenterBalancePdf(
    data: CostCenterBalanceData[],
    fromDate: Date,
    toDate: Date,
  ): Promise<Buffer> {
    const tenant = await this.tenantContext.getTenant();

    const body: any[][] = [
      [
        { text: 'Cuenta', style: 'tableHeader' },
        { text: 'Nombre', style: 'tableHeader' },
        { text: 'Debitos', style: 'tableHeader', alignment: 'right' },
        { text: 'Creditos', style: 'tableHeader', alignment: 'right' },
        { text: 'Saldo', style: 'tableHeader', alignment: 'right' },
      ],
    ];

    for (const cc of data) {
      // Cost center header row
      body.push([
        { text: `${cc.costCenterCode} - ${cc.costCenterName}`, colSpan: 5, style: 'subheader' },
        {}, {}, {}, {},
      ]);

      for (const acc of cc.accounts) {
        body.push([
          acc.accountCode,
          acc.accountName,
          { text: this.formatNumber(acc.totalDebit), alignment: 'right' },
          { text: this.formatNumber(acc.totalCredit), alignment: 'right' },
          { text: this.formatNumber(acc.balance), alignment: 'right' },
        ]);
      }

      // Subtotal row
      body.push([
        { text: 'Subtotal', colSpan: 2, style: 'tableTotal' },
        {},
        { text: this.formatNumber(cc.totalDebit), alignment: 'right', style: 'tableTotal' },
        { text: this.formatNumber(cc.totalCredit), alignment: 'right', style: 'tableTotal' },
        { text: this.formatNumber(cc.totalDebit - cc.totalCredit), alignment: 'right', style: 'tableTotal' },
      ]);
    }

    const docDefinition = {
      content: [
        { text: tenant.name, style: 'companyName' },
        { text: 'Balance por Centro de Costo', style: 'header' },
        {
          text: `Periodo: ${this.formatDate(fromDate)} - ${this.formatDate(toDate)}`,
          style: 'period',
        },
        { text: '', margin: [0, 10, 0, 0] },
        {
          table: {
            headerRows: 1,
            widths: [60, '*', 80, 80, 80],
            body,
          },
          layout: 'lightHorizontalLines',
        },
      ],
      styles: {
        companyName: { fontSize: 14, bold: true, margin: [0, 0, 0, 2] },
        header: { fontSize: 12, margin: [0, 0, 0, 4] },
        period: { fontSize: 9, color: '#666', margin: [0, 0, 0, 10] },
        subheader: { fontSize: 10, bold: true, fillColor: '#f0f0f0', margin: [0, 4, 0, 4] },
        tableHeader: { fontSize: 9, bold: true, fillColor: '#333', color: '#fff' },
        tableTotal: { fontSize: 9, bold: true },
      },
      defaultStyle: { fontSize: 8 },
    };

    return this.generatePdfBuffer(docDefinition);
  }

  private generateCostCenterBalanceExcel(
    data: CostCenterBalanceData[],
    fromDate: Date,
    toDate: Date,
  ): Buffer {
    const workbook = XLSX.utils.book_new();

    // Summary sheet with all cost centers
    const summaryRows: any[][] = [
      ['Balance por Centro de Costo'],
      [`Periodo: ${this.formatDate(fromDate)} - ${this.formatDate(toDate)}`],
      [],
      ['Centro de Costo', 'Codigo CC', 'Cuenta', 'Nombre Cuenta', 'Debitos', 'Creditos', 'Saldo'],
    ];

    for (const cc of data) {
      for (const acc of cc.accounts) {
        summaryRows.push([
          cc.costCenterName,
          cc.costCenterCode,
          acc.accountCode,
          acc.accountName,
          acc.totalDebit,
          acc.totalCredit,
          acc.balance,
        ]);
      }
      summaryRows.push([
        `Subtotal ${cc.costCenterName}`,
        '',
        '',
        '',
        cc.totalDebit,
        cc.totalCredit,
        cc.totalDebit - cc.totalCredit,
      ]);
      summaryRows.push([]);
    }

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Balance CC');

    // Individual sheets per cost center (max 10 to avoid huge workbooks)
    for (const cc of data.slice(0, 10)) {
      const sheetName = cc.costCenterCode.substring(0, 31); // Excel sheet name limit
      const rows: any[][] = [
        [`${cc.costCenterCode} - ${cc.costCenterName}`],
        [],
        ['Cuenta', 'Nombre', 'Debitos', 'Creditos', 'Saldo'],
        ...cc.accounts.map((a) => [
          a.accountCode,
          a.accountName,
          a.totalDebit,
          a.totalCredit,
          a.balance,
        ]),
        [],
        ['TOTAL', '', cc.totalDebit, cc.totalCredit, cc.totalDebit - cc.totalCredit],
      ];

      const sheet = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
    }

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  private formatNumber(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
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
