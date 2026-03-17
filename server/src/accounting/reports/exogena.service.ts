import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma';
import { TenantContextService } from '../../common';
import {
  ExpenseCategory,
  ExpenseStatus,
  InvoiceStatus,
  PaymentStatus,
  PurchaseOrderStatus,
} from '@prisma/client';

// ─── Interfaces ──────────────────────────────────────────────

export interface ExogenaThirdPartyRow {
  conceptCode: string;
  documentType: string;
  documentNumber: string;
  dv: string;
  businessName: string;
  address: string;
  city: string;
  amount: number;
  taxAmount: number;
}

export interface ExogenaFormatoData {
  formatNumber: string;
  name: string;
  rows: ExogenaThirdPartyRow[];
  totalAmount: number;
  totalTaxAmount: number;
}

export interface ExogenaReport {
  year: number;
  tenantNit: string;
  tenantName: string;
  generatedAt: string;
  formatos: ExogenaFormatoData[];
}

// ─── Service ─────────────────────────────────────────────────

@Injectable()
export class ExogenaService {
  private readonly logger = new Logger(ExogenaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  /**
   * Generate the full Información Exógena (Medios Magnéticos) report for a given tax year.
   * Produces all required DIAN formatos (1001, 1005, 1006, 1007, 1008, 1009).
   */
  async generateExogena(year: number): Promise<ExogenaReport> {
    const tenantId = this.tenantContext.requireTenantId();

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { dianConfig: true },
    });

    const tenantNit = tenant?.dianConfig?.nit ?? '';
    const tenantName = tenant?.dianConfig?.businessName ?? tenant?.name ?? '';

    const from = new Date(year, 0, 1);
    const to = new Date(year, 11, 31, 23, 59, 59, 999);

    this.logger.log(`Generating Exogena report for year=${year}, tenant=${tenantId}`);

    const [f1001, f1005, f1006, f1007, f1008, f1009] = await Promise.all([
      this.getFormato1001(tenantId, from, to),
      this.getFormato1005(tenantId, from, to),
      this.getFormato1006(tenantId, from, to),
      this.getFormato1007(tenantId, from, to),
      this.getFormato1008(tenantId, to),
      this.getFormato1009(tenantId, to),
    ]);

    return {
      year,
      tenantNit,
      tenantName,
      generatedAt: new Date().toISOString(),
      formatos: [f1001, f1005, f1006, f1007, f1008, f1009],
    };
  }

  // ─── Formato 1001: Pagos a terceros ─────────────────────────

  private async getFormato1001(
    tenantId: string,
    from: Date,
    to: Date,
  ): Promise<ExogenaFormatoData> {
    const orders = await this.prisma.purchaseOrder.findMany({
      where: {
        tenantId,
        status: PurchaseOrderStatus.RECEIVED,
        issueDate: { gte: from, lte: to },
      },
      include: {
        supplier: {
          select: {
            id: true,
            documentType: true,
            documentNumber: true,
            dv: true,
            name: true,
            businessName: true,
            address: true,
            city: true,
          },
        },
      },
    });

    const supplierMap = new Map<
      string,
      { supplier: (typeof orders)[0]['supplier']; subtotal: number; tax: number }
    >();

    for (const order of orders) {
      const key = order.supplier.id;
      if (!supplierMap.has(key)) {
        supplierMap.set(key, { supplier: order.supplier, subtotal: 0, tax: 0 });
      }
      const entry = supplierMap.get(key)!;
      entry.subtotal += Number(order.subtotal);
      entry.tax += Number(order.tax);
    }

    // Purchase orders = compras de bienes (concepto 5001)
    const rows: ExogenaThirdPartyRow[] = Array.from(supplierMap.values()).map(
      ({ supplier, subtotal, tax }) => ({
        conceptCode: '5001',
        documentType: supplier.documentType,
        documentNumber: supplier.documentNumber,
        dv: supplier.dv ?? '',
        businessName: supplier.businessName ?? supplier.name,
        address: supplier.address ?? '',
        city: supplier.city ?? '',
        amount: subtotal,
        taxAmount: tax,
      }),
    );

    // Expenses = servicios/arriendo/honorarios (conceptos 5002/5004/5005)
    const expenses = await this.prisma.expense.findMany({
      where: {
        tenantId,
        status: { in: [ExpenseStatus.APPROVED, ExpenseStatus.PAID] },
        issueDate: { gte: from, lte: to },
      },
      include: {
        supplier: {
          select: {
            id: true,
            documentType: true,
            documentNumber: true,
            dv: true,
            name: true,
            businessName: true,
            address: true,
            city: true,
          },
        },
      },
    });

    const expenseSupplierMap = new Map<
      string,
      { supplier: (typeof expenses)[0]['supplier']; subtotal: number; tax: number; conceptCode: string }
    >();

    for (const expense of expenses) {
      if (!expense.supplier) continue;
      const conceptCode = this.mapExpenseCategoryToConcepto(expense.category);
      const key = `${expense.supplier.id}-${conceptCode}`;
      if (!expenseSupplierMap.has(key)) {
        expenseSupplierMap.set(key, {
          supplier: expense.supplier,
          subtotal: 0,
          tax: 0,
          conceptCode,
        });
      }
      const entry = expenseSupplierMap.get(key)!;
      entry.subtotal += Number(expense.subtotal);
      entry.tax += Number(expense.tax);
    }

    for (const { supplier, subtotal, tax, conceptCode } of expenseSupplierMap.values()) {
      if (!supplier) continue;
      rows.push({
        conceptCode,
        documentType: supplier.documentType,
        documentNumber: supplier.documentNumber,
        dv: supplier.dv ?? '',
        businessName: supplier.businessName ?? supplier.name,
        address: supplier.address ?? '',
        city: supplier.city ?? '',
        amount: subtotal,
        taxAmount: tax,
      });
    }

    const totalAmount = rows.reduce((sum, r) => sum + r.amount, 0);
    const totalTaxAmount = rows.reduce((sum, r) => sum + r.taxAmount, 0);

    return {
      formatNumber: '1001',
      name: 'Pagos a terceros',
      rows,
      totalAmount,
      totalTaxAmount,
    };
  }

  // ─── Formato 1005: IVA descontable ──────────────────────────

  private async getFormato1005(
    tenantId: string,
    from: Date,
    to: Date,
  ): Promise<ExogenaFormatoData> {
    const orders = await this.prisma.purchaseOrder.findMany({
      where: {
        tenantId,
        status: PurchaseOrderStatus.RECEIVED,
        issueDate: { gte: from, lte: to },
      },
      include: {
        items: { select: { taxRate: true, subtotal: true, tax: true } },
        supplier: {
          select: {
            id: true,
            documentType: true,
            documentNumber: true,
            dv: true,
            name: true,
            businessName: true,
            address: true,
            city: true,
          },
        },
      },
    });

    const supplierMap = new Map<
      string,
      { supplier: (typeof orders)[0]['supplier']; taxableBase: number; tax: number }
    >();

    for (const order of orders) {
      for (const item of order.items) {
        const rate = Number(item.taxRate);
        if (rate <= 0) continue;

        const key = order.supplier.id;
        if (!supplierMap.has(key)) {
          supplierMap.set(key, { supplier: order.supplier, taxableBase: 0, tax: 0 });
        }
        const entry = supplierMap.get(key)!;
        entry.taxableBase += Number(item.subtotal);
        entry.tax += Number(item.tax);
      }
    }

    const rows: ExogenaThirdPartyRow[] = Array.from(supplierMap.values()).map(
      ({ supplier, taxableBase, tax }) => ({
        conceptCode: '5005',
        documentType: supplier.documentType,
        documentNumber: supplier.documentNumber,
        dv: supplier.dv ?? '',
        businessName: supplier.businessName ?? supplier.name,
        address: supplier.address ?? '',
        city: supplier.city ?? '',
        amount: taxableBase,
        taxAmount: tax,
      }),
    );

    const totalAmount = rows.reduce((sum, r) => sum + r.amount, 0);
    const totalTaxAmount = rows.reduce((sum, r) => sum + r.taxAmount, 0);

    return {
      formatNumber: '1005',
      name: 'IVA descontable',
      rows,
      totalAmount,
      totalTaxAmount,
    };
  }

  // ─── Formato 1006: IVA generado ─────────────────────────────

  private async getFormato1006(
    tenantId: string,
    from: Date,
    to: Date,
  ): Promise<ExogenaFormatoData> {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        status: {
          notIn: [InvoiceStatus.CANCELLED, InvoiceStatus.VOID, InvoiceStatus.DRAFT],
        },
        issueDate: { gte: from, lte: to },
      },
      include: {
        items: { select: { taxRate: true, subtotal: true, tax: true } },
        customer: {
          select: {
            id: true,
            documentType: true,
            documentNumber: true,
            dv: true,
            name: true,
            businessName: true,
            address: true,
            city: true,
          },
        },
      },
    });

    const customerMap = new Map<
      string,
      {
        customer: (typeof invoices)[0]['customer'];
        taxableBase: number;
        tax: number;
      }
    >();

    for (const invoice of invoices) {
      for (const item of invoice.items) {
        const rate = Number(item.taxRate);
        if (rate <= 0) continue;

        const key = invoice.customerId ?? 'unknown';
        if (!customerMap.has(key)) {
          customerMap.set(key, {
            customer: invoice.customer,
            taxableBase: 0,
            tax: 0,
          });
        }
        const entry = customerMap.get(key)!;
        entry.taxableBase += Number(item.subtotal);
        entry.tax += Number(item.tax);
      }
    }

    const rows: ExogenaThirdPartyRow[] = Array.from(customerMap.values()).map(
      ({ customer, taxableBase, tax }) => ({
        conceptCode: '5006',
        documentType: customer?.documentType ?? '',
        documentNumber: customer?.documentNumber ?? '',
        dv: customer?.dv ?? '',
        businessName: customer?.businessName ?? customer?.name ?? 'Sin cliente',
        address: customer?.address ?? '',
        city: customer?.city ?? '',
        amount: taxableBase,
        taxAmount: tax,
      }),
    );

    const totalAmount = rows.reduce((sum, r) => sum + r.amount, 0);
    const totalTaxAmount = rows.reduce((sum, r) => sum + r.taxAmount, 0);

    return {
      formatNumber: '1006',
      name: 'IVA generado',
      rows,
      totalAmount,
      totalTaxAmount,
    };
  }

  // ─── Formato 1007: Ingresos recibidos de terceros ───────────

  private async getFormato1007(
    tenantId: string,
    from: Date,
    to: Date,
  ): Promise<ExogenaFormatoData> {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        status: {
          notIn: [InvoiceStatus.CANCELLED, InvoiceStatus.VOID, InvoiceStatus.DRAFT],
        },
        issueDate: { gte: from, lte: to },
      },
      include: {
        customer: {
          select: {
            id: true,
            documentType: true,
            documentNumber: true,
            dv: true,
            name: true,
            businessName: true,
            address: true,
            city: true,
          },
        },
      },
    });

    const customerMap = new Map<
      string,
      { customer: (typeof invoices)[0]['customer']; total: number }
    >();

    for (const invoice of invoices) {
      const key = invoice.customerId ?? 'unknown';
      if (!customerMap.has(key)) {
        customerMap.set(key, { customer: invoice.customer, total: 0 });
      }
      customerMap.get(key)!.total += Number(invoice.total);
    }

    const rows: ExogenaThirdPartyRow[] = Array.from(customerMap.values()).map(
      ({ customer, total }) => ({
        conceptCode: '5007',
        documentType: customer?.documentType ?? '',
        documentNumber: customer?.documentNumber ?? '',
        dv: customer?.dv ?? '',
        businessName: customer?.businessName ?? customer?.name ?? 'Sin cliente',
        address: customer?.address ?? '',
        city: customer?.city ?? '',
        amount: total,
        taxAmount: 0,
      }),
    );

    const totalAmount = rows.reduce((sum, r) => sum + r.amount, 0);

    return {
      formatNumber: '1007',
      name: 'Ingresos recibidos',
      rows,
      totalAmount,
      totalTaxAmount: 0,
    };
  }

  // ─── Formato 1008: Cuentas por cobrar al cierre ─────────────

  private async getFormato1008(
    tenantId: string,
    asOf: Date,
  ): Promise<ExogenaFormatoData> {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        paymentStatus: { not: PaymentStatus.PAID },
        status: {
          notIn: [InvoiceStatus.CANCELLED, InvoiceStatus.VOID],
        },
        issueDate: { lte: asOf },
      },
      include: {
        customer: {
          select: {
            id: true,
            documentType: true,
            documentNumber: true,
            dv: true,
            name: true,
            businessName: true,
            address: true,
            city: true,
          },
        },
        payments: { select: { amount: true } },
      },
    });

    const customerMap = new Map<
      string,
      { customer: (typeof invoices)[0]['customer']; balance: number }
    >();

    for (const invoice of invoices) {
      const paidAmount = invoice.payments.reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      );
      const balance = Number(invoice.total) - paidAmount;
      if (balance <= 0) continue;

      const key = invoice.customerId ?? 'unknown';
      if (!customerMap.has(key)) {
        customerMap.set(key, { customer: invoice.customer, balance: 0 });
      }
      customerMap.get(key)!.balance += balance;
    }

    const rows: ExogenaThirdPartyRow[] = Array.from(customerMap.values()).map(
      ({ customer, balance }) => ({
        conceptCode: '5008',
        documentType: customer?.documentType ?? '',
        documentNumber: customer?.documentNumber ?? '',
        dv: customer?.dv ?? '',
        businessName: customer?.businessName ?? customer?.name ?? 'Sin cliente',
        address: customer?.address ?? '',
        city: customer?.city ?? '',
        amount: balance,
        taxAmount: 0,
      }),
    );

    const totalAmount = rows.reduce((sum, r) => sum + r.amount, 0);

    return {
      formatNumber: '1008',
      name: 'Cuentas por cobrar',
      rows,
      totalAmount,
      totalTaxAmount: 0,
    };
  }

  // ─── Formato 1009: Cuentas por pagar al cierre ──────────────

  private async getFormato1009(
    tenantId: string,
    asOf: Date,
  ): Promise<ExogenaFormatoData> {
    const orders = await this.prisma.purchaseOrder.findMany({
      where: {
        tenantId,
        paymentStatus: { not: PaymentStatus.PAID },
        status: PurchaseOrderStatus.RECEIVED,
        issueDate: { lte: asOf },
      },
      include: {
        supplier: {
          select: {
            id: true,
            documentType: true,
            documentNumber: true,
            dv: true,
            name: true,
            businessName: true,
            address: true,
            city: true,
          },
        },
        purchasePayments: { select: { amount: true } },
      },
    });

    const supplierMap = new Map<
      string,
      { supplier: (typeof orders)[0]['supplier']; balance: number }
    >();

    for (const order of orders) {
      const paidAmount = order.purchasePayments.reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      );
      const balance = Number(order.total) - paidAmount;
      if (balance <= 0) continue;

      const key = order.supplier.id;
      if (!supplierMap.has(key)) {
        supplierMap.set(key, { supplier: order.supplier, balance: 0 });
      }
      supplierMap.get(key)!.balance += balance;
    }

    const rows: ExogenaThirdPartyRow[] = Array.from(supplierMap.values()).map(
      ({ supplier, balance }) => ({
        conceptCode: '5009',
        documentType: supplier.documentType,
        documentNumber: supplier.documentNumber,
        dv: supplier.dv ?? '',
        businessName: supplier.businessName ?? supplier.name,
        address: supplier.address ?? '',
        city: supplier.city ?? '',
        amount: balance,
        taxAmount: 0,
      }),
    );

    const totalAmount = rows.reduce((sum, r) => sum + r.amount, 0);

    return {
      formatNumber: '1009',
      name: 'Cuentas por pagar',
      rows,
      totalAmount,
      totalTaxAmount: 0,
    };
  }

  /**
   * Map expense category to DIAN Exógena concepto code (Formato 1001).
   * 5001 = Compras de bienes, 5002 = Servicios, 5004 = Arrendamientos, 5005 = Honorarios
   */
  private mapExpenseCategoryToConcepto(category: ExpenseCategory): string {
    switch (category) {
      case ExpenseCategory.ARRIENDO:
        return '5004';
      case ExpenseCategory.HONORARIOS:
        return '5005';
      default:
        return '5002'; // Servicios (default for expenses)
    }
  }
}
