import { Injectable, Logger } from '@nestjs/common';
import { PaymentMethod } from '@prisma/client';
import { JournalEntriesService } from './journal-entries.service';
import { AccountingConfigService } from './accounting-config.service';
import { JournalEntrySource } from '@prisma/client';

/**
 * AccountingBridgeService generates automatic journal entries from business events.
 *
 * Design principles:
 * - NEVER blocks the calling operation: all errors are caught and logged
 * - Only generates entries when `autoGenerateEntries` is enabled in AccountingConfig
 * - Auto entries are created as POSTED (not DRAFT)
 * - Uses AccountingConfig account mappings for proper PUC codes
 *
 * Triggers:
 * 1. onInvoiceCreated  → Sale entry (DR Clientes/Caja, CR Ingresos, CR IVA, DR COGS, CR Inventario)
 * 2. onInvoiceCancelled → Reverse of original sale entry
 * 3. onPaymentCreated  → Payment entry (DR Caja/Bancos, CR Clientes)
 * 4. onPurchaseReceived → Purchase entry (DR Inventario, DR IVA descontable, CR Proveedores, ±ReteFuente)
 * 5. onStockAdjustment → Adjustment entry (DR/CR Inventario vs Gastos/Ingresos diversos)
 */
@Injectable()
export class AccountingBridgeService {
  private readonly logger = new Logger(AccountingBridgeService.name);

  /** ReteFuente V1: 2.5% on purchases above $523,740 COP */
  private readonly RETE_FUENTE_RATE = 0.025;
  private readonly RETE_FUENTE_MIN_BASE = 523740;

  constructor(
    private readonly journalEntriesService: JournalEntriesService,
    private readonly configService: AccountingConfigService,
  ) {}

  /**
   * Generate journal entry for a sale (invoice created).
   * Called from InvoicesService.create() after the transaction completes.
   *
   * Entry:
   *   DR 1305 Clientes = total
   *   CR 4135 Ingresos = subtotal
   *   CR 2408 IVA por pagar = tax
   *   DR 6135 Costo de ventas = sum(costPrice × quantity)
   *   CR 1435 Inventario = sum(costPrice × quantity)
   */
  async onInvoiceCreated(params: {
    tenantId: string;
    invoiceId: string;
    invoiceNumber: string;
    subtotal: number;
    tax: number;
    total: number;
    items: { productId: string | null; quantity: number; product?: { costPrice: any } | null }[];
    isPosImmediate?: boolean;
    paymentMethod?: string;
  }): Promise<void> {
    try {
      const config = await this.configService.getConfigForTenant(params.tenantId);
      if (!config?.autoGenerateEntries) return;

      const { accountsReceivableId, cashAccountId, revenueAccountId, ivaPorPagarId, cogsAccountId, inventoryAccountId } = config;
      if (!accountsReceivableId || !revenueAccountId || !cogsAccountId || !inventoryAccountId) {
        this.logger.warn(`Accounting config incomplete for tenant ${params.tenantId}, skipping invoice entry`);
        return;
      }

      // Determine debit account: Caja for POS immediate payment, Clientes for credit sales
      const debitAccountId = (params.isPosImmediate && cashAccountId) ? cashAccountId : accountsReceivableId;

      const lines: { accountId: string; description?: string; debit: number; credit: number }[] = [];

      // DR Clientes/Caja = total
      lines.push({
        accountId: debitAccountId,
        description: `Factura ${params.invoiceNumber}`,
        debit: params.total,
        credit: 0,
      });

      // CR Ingresos = subtotal
      lines.push({
        accountId: revenueAccountId,
        description: `Venta ${params.invoiceNumber}`,
        debit: 0,
        credit: params.subtotal,
      });

      // CR IVA por pagar = tax (only if tax > 0)
      if (params.tax > 0 && ivaPorPagarId) {
        lines.push({
          accountId: ivaPorPagarId,
          description: `IVA Factura ${params.invoiceNumber}`,
          debit: 0,
          credit: params.tax,
        });
      }

      // COGS: DR Costo de ventas, CR Inventario
      const totalCogs = params.items.reduce((sum, item) => {
        if (!item.product?.costPrice) return sum;
        return sum + Number(item.product.costPrice) * item.quantity;
      }, 0);

      if (totalCogs > 0) {
        lines.push({
          accountId: cogsAccountId,
          description: `Costo de venta ${params.invoiceNumber}`,
          debit: totalCogs,
          credit: 0,
        });

        lines.push({
          accountId: inventoryAccountId,
          description: `Salida inventario ${params.invoiceNumber}`,
          debit: 0,
          credit: totalCogs,
        });
      }

      await this.journalEntriesService.createAutoEntry({
        tenantId: params.tenantId,
        date: new Date(),
        description: `Venta - Factura ${params.invoiceNumber}`,
        source: JournalEntrySource.INVOICE_SALE,
        invoiceId: params.invoiceId,
        lines,
      });

      this.logger.debug(`Accounting entry generated for invoice ${params.invoiceNumber}`);
    } catch (error) {
      this.logger.error(
        `Failed to generate accounting entry for invoice ${params.invoiceNumber}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }

  /**
   * Generate reverse journal entry for a cancelled invoice.
   * Called from InvoicesService.cancel() after the transaction completes.
   */
  async onInvoiceCancelled(params: {
    tenantId: string;
    invoiceId: string;
    invoiceNumber: string;
    subtotal: number;
    tax: number;
    total: number;
    items: { productId: string | null; quantity: number; product?: { costPrice: any } | null }[];
  }): Promise<void> {
    try {
      const config = await this.configService.getConfigForTenant(params.tenantId);
      if (!config?.autoGenerateEntries) return;

      const { accountsReceivableId, revenueAccountId, ivaPorPagarId, cogsAccountId, inventoryAccountId } = config;
      if (!accountsReceivableId || !revenueAccountId || !cogsAccountId || !inventoryAccountId) return;

      const lines: { accountId: string; description?: string; debit: number; credit: number }[] = [];

      // Reverse: CR Clientes = total
      lines.push({
        accountId: accountsReceivableId,
        description: `Anulacion Factura ${params.invoiceNumber}`,
        debit: 0,
        credit: params.total,
      });

      // Reverse: DR Ingresos = subtotal
      lines.push({
        accountId: revenueAccountId,
        description: `Anulacion venta ${params.invoiceNumber}`,
        debit: params.subtotal,
        credit: 0,
      });

      // Reverse: DR IVA por pagar = tax
      if (params.tax > 0 && ivaPorPagarId) {
        lines.push({
          accountId: ivaPorPagarId,
          description: `Anulacion IVA ${params.invoiceNumber}`,
          debit: params.tax,
          credit: 0,
        });
      }

      // Reverse COGS
      const totalCogs = params.items.reduce((sum, item) => {
        if (!item.product?.costPrice) return sum;
        return sum + Number(item.product.costPrice) * item.quantity;
      }, 0);

      if (totalCogs > 0) {
        lines.push({
          accountId: cogsAccountId,
          description: `Anulacion costo ${params.invoiceNumber}`,
          debit: 0,
          credit: totalCogs,
        });

        lines.push({
          accountId: inventoryAccountId,
          description: `Devolucion inventario ${params.invoiceNumber}`,
          debit: totalCogs,
          credit: 0,
        });
      }

      await this.journalEntriesService.createAutoEntry({
        tenantId: params.tenantId,
        date: new Date(),
        description: `Anulacion - Factura ${params.invoiceNumber}`,
        source: JournalEntrySource.INVOICE_CANCEL,
        invoiceId: params.invoiceId,
        lines,
      });

      this.logger.debug(`Cancellation entry generated for invoice ${params.invoiceNumber}`);
    } catch (error) {
      this.logger.error(
        `Failed to generate cancellation entry for invoice ${params.invoiceNumber}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }

  /**
   * Generate journal entry for a payment received.
   * Called from PaymentsService.create() after the transaction completes.
   *
   * Entry:
   *   DR 1105 Caja / 1110 Bancos = amount
   *   CR 1305 Clientes = amount
   */
  async onPaymentCreated(params: {
    tenantId: string;
    paymentId: string;
    invoiceNumber: string;
    amount: number;
    method: PaymentMethod;
  }): Promise<void> {
    try {
      const config = await this.configService.getConfigForTenant(params.tenantId);
      if (!config?.autoGenerateEntries) return;

      const { cashAccountId, bankAccountId, accountsReceivableId } = config;
      if (!accountsReceivableId) return;

      // Map payment method to account
      const debitAccountId = this.getPaymentAccountId(params.method, cashAccountId, bankAccountId);
      if (!debitAccountId) {
        this.logger.warn(`No account mapped for payment method ${params.method}`);
        return;
      }

      await this.journalEntriesService.createAutoEntry({
        tenantId: params.tenantId,
        date: new Date(),
        description: `Pago recibido - Factura ${params.invoiceNumber} (${params.method})`,
        source: JournalEntrySource.PAYMENT_RECEIVED,
        paymentId: params.paymentId,
        lines: [
          {
            accountId: debitAccountId,
            description: `Cobro ${params.invoiceNumber}`,
            debit: params.amount,
            credit: 0,
          },
          {
            accountId: accountsReceivableId,
            description: `Abono cliente ${params.invoiceNumber}`,
            debit: 0,
            credit: params.amount,
          },
        ],
      });

      this.logger.debug(`Payment entry generated for invoice ${params.invoiceNumber}`);
    } catch (error) {
      this.logger.error(
        `Failed to generate payment entry for invoice ${params.invoiceNumber}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }

  /**
   * Generate journal entry for a purchase order received.
   * Called from PurchaseOrdersService.receive() after the transaction completes.
   *
   * Entry:
   *   DR 1435 Inventario = subtotal
   *   DR 2412 IVA descontable = tax
   *   CR 2205 Proveedores = total (- reteFuente if applicable)
   *   CR 2365 ReteFuente por pagar = reteFuente (if base > $523,740)
   */
  async onPurchaseReceived(params: {
    tenantId: string;
    purchaseOrderId: string;
    purchaseOrderNumber: string;
    subtotal: number;
    tax: number;
    total: number;
  }): Promise<void> {
    try {
      const config = await this.configService.getConfigForTenant(params.tenantId);
      if (!config?.autoGenerateEntries) return;

      const {
        inventoryAccountId,
        ivaDescontableId,
        accountsPayableId,
        reteFuentePayableId,
      } = config;

      if (!inventoryAccountId || !accountsPayableId) return;

      const lines: { accountId: string; description?: string; debit: number; credit: number }[] = [];

      // DR Inventario = subtotal
      lines.push({
        accountId: inventoryAccountId,
        description: `Compra ${params.purchaseOrderNumber}`,
        debit: params.subtotal,
        credit: 0,
      });

      // DR IVA descontable = tax
      if (params.tax > 0 && ivaDescontableId) {
        lines.push({
          accountId: ivaDescontableId,
          description: `IVA compra ${params.purchaseOrderNumber}`,
          debit: params.tax,
          credit: 0,
        });
      }

      // ReteFuente V1: 2.5% on base > $523,740
      let reteFuente = 0;
      if (reteFuentePayableId && params.subtotal > this.RETE_FUENTE_MIN_BASE) {
        reteFuente = Math.round(params.subtotal * this.RETE_FUENTE_RATE);

        lines.push({
          accountId: reteFuentePayableId,
          description: `ReteFuente compra ${params.purchaseOrderNumber} (2.5%)`,
          debit: 0,
          credit: reteFuente,
        });
      }

      // CR Proveedores = total - reteFuente
      lines.push({
        accountId: accountsPayableId,
        description: `Proveedor ${params.purchaseOrderNumber}`,
        debit: 0,
        credit: params.total - reteFuente,
      });

      await this.journalEntriesService.createAutoEntry({
        tenantId: params.tenantId,
        date: new Date(),
        description: `Compra recibida - OC ${params.purchaseOrderNumber}`,
        source: JournalEntrySource.PURCHASE_RECEIVED,
        purchaseOrderId: params.purchaseOrderId,
        lines,
      });

      this.logger.debug(`Purchase entry generated for OC ${params.purchaseOrderNumber}`);
    } catch (error) {
      this.logger.error(
        `Failed to generate purchase entry for OC ${params.purchaseOrderNumber}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }

  /**
   * Generate journal entry for a stock adjustment.
   * Called from StockMovementsService.create() for ADJUSTMENT type movements.
   *
   * Positive (sobrante): DR 1435 Inventario, CR 4295 Ingresos diversos
   * Negative (faltante): DR 5195 Gastos diversos, CR 1435 Inventario
   */
  async onStockAdjustment(params: {
    tenantId: string;
    movementId: string;
    productSku: string;
    quantity: number;
    costPrice: number;
  }): Promise<void> {
    try {
      const config = await this.configService.getConfigForTenant(params.tenantId);
      if (!config?.autoGenerateEntries) return;

      const { inventoryAccountId, inventoryAdjustmentId } = config;
      if (!inventoryAccountId || !inventoryAdjustmentId) return;

      const amount = Math.abs(params.quantity) * params.costPrice;
      if (amount === 0) return;

      const isPositive = params.quantity > 0;
      const description = isPositive
        ? `Ajuste sobrante - ${params.productSku} (${params.quantity} und)`
        : `Ajuste faltante - ${params.productSku} (${Math.abs(params.quantity)} und)`;

      const lines = isPositive
        ? [
            // Sobrante: DR Inventario, CR Ingresos diversos
            { accountId: inventoryAccountId, description: `Sobrante ${params.productSku}`, debit: amount, credit: 0 },
            { accountId: inventoryAdjustmentId, description: `Ajuste ${params.productSku}`, debit: 0, credit: amount },
          ]
        : [
            // Faltante: DR Gastos diversos, CR Inventario
            { accountId: inventoryAdjustmentId, description: `Faltante ${params.productSku}`, debit: amount, credit: 0 },
            { accountId: inventoryAccountId, description: `Ajuste ${params.productSku}`, debit: 0, credit: amount },
          ];

      await this.journalEntriesService.createAutoEntry({
        tenantId: params.tenantId,
        date: new Date(),
        description,
        source: JournalEntrySource.STOCK_ADJUSTMENT,
        stockMovementId: params.movementId,
        lines,
      });

      this.logger.debug(`Adjustment entry generated for ${params.productSku}`);
    } catch (error) {
      this.logger.error(
        `Failed to generate adjustment entry for ${params.productSku}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }

  /**
   * Generate journal entry for approved payroll.
   * Called from PayrollPeriodsService.approvePeriod() after approval.
   *
   * Entry:
   *   DR 5105 Gastos de personal (sueldos + extras + bonificaciones + etc.)
   *   DR 5115 Aportes patronales (salud + pensión + ARL + caja + SENA + ICBF)
   *   DR 5120 Provisiones prestaciones (prima + cesantías + intereses + vacaciones)
   *   CR 2505 Salarios por pagar (neto)
   *   CR 2370 Retenciones por pagar (retención fuente)
   *   CR 2380 Aportes por pagar (salud + pensión empleado + fondo solidaridad)
   *   CR 2380 Aportes patronales por pagar (empleador contributions)
   *   CR 2610 Obligaciones laborales (provisiones)
   */
  async onPayrollApproved(params: {
    tenantId: string;
    periodId: string;
    periodName: string;
    totalDevengados: number;
    totalDeducciones: number;
    totalNeto: number;
    totalSaludEmpleado: number;
    totalPensionEmpleado: number;
    totalFondoSolidaridad: number;
    totalRetencionFuente: number;
    totalSaludEmpleador: number;
    totalPensionEmpleador: number;
    totalArlEmpleador: number;
    totalCajaEmpleador: number;
    totalSenaEmpleador: number;
    totalIcbfEmpleador: number;
    totalProvisionPrima: number;
    totalProvisionCesantias: number;
    totalProvisionIntereses: number;
    totalProvisionVacaciones: number;
  }): Promise<void> {
    try {
      const config = await this.configService.getConfigForTenant(params.tenantId);
      if (!config?.autoGenerateEntries) return;

      const {
        payrollExpenseId,
        payrollPayableId,
        payrollRetentionsId,
        payrollContributionsId,
        payrollProvisionsId,
      } = config;

      if (!payrollExpenseId || !payrollPayableId) {
        this.logger.warn(`Payroll accounting config incomplete for tenant ${params.tenantId}`);
        return;
      }

      const lines: { accountId: string; description?: string; debit: number; credit: number }[] = [];

      // DR Gastos de personal = totalDevengados
      if (params.totalDevengados > 0) {
        lines.push({
          accountId: payrollExpenseId,
          description: `Gastos personal ${params.periodName}`,
          debit: params.totalDevengados,
          credit: 0,
        });
      }

      // DR Aportes patronales
      const totalAportes =
        params.totalSaludEmpleador + params.totalPensionEmpleador +
        params.totalArlEmpleador + params.totalCajaEmpleador +
        params.totalSenaEmpleador + params.totalIcbfEmpleador;

      if (totalAportes > 0 && payrollContributionsId) {
        lines.push({
          accountId: payrollContributionsId,
          description: `Aportes patronales ${params.periodName}`,
          debit: totalAportes,
          credit: 0,
        });
      }

      // DR Provisiones prestaciones
      const totalProvisiones =
        params.totalProvisionPrima + params.totalProvisionCesantias +
        params.totalProvisionIntereses + params.totalProvisionVacaciones;

      if (totalProvisiones > 0 && payrollProvisionsId) {
        lines.push({
          accountId: payrollProvisionsId,
          description: `Provisiones ${params.periodName}`,
          debit: totalProvisiones,
          credit: 0,
        });
      }

      // CR Salarios por pagar = neto
      if (params.totalNeto > 0) {
        lines.push({
          accountId: payrollPayableId,
          description: `Nómina por pagar ${params.periodName}`,
          debit: 0,
          credit: params.totalNeto,
        });
      }

      // CR Retenciones por pagar
      if (params.totalRetencionFuente > 0 && payrollRetentionsId) {
        lines.push({
          accountId: payrollRetentionsId,
          description: `ReteFuente nómina ${params.periodName}`,
          debit: 0,
          credit: params.totalRetencionFuente,
        });
      }

      // CR Aportes empleado por pagar
      const totalAportesEmpleado =
        params.totalSaludEmpleado + params.totalPensionEmpleado + params.totalFondoSolidaridad;

      if (totalAportesEmpleado > 0 && payrollContributionsId) {
        lines.push({
          accountId: payrollContributionsId,
          description: `Aportes empleado ${params.periodName}`,
          debit: 0,
          credit: totalAportesEmpleado,
        });
      }

      // CR Aportes patronales por pagar
      if (totalAportes > 0 && payrollContributionsId) {
        lines.push({
          accountId: payrollContributionsId,
          description: `Aportes patronales por pagar ${params.periodName}`,
          debit: 0,
          credit: totalAportes,
        });
      }

      // CR Obligaciones laborales (provisiones)
      if (totalProvisiones > 0 && payrollProvisionsId) {
        lines.push({
          accountId: payrollProvisionsId,
          description: `Provisiones por pagar ${params.periodName}`,
          debit: 0,
          credit: totalProvisiones,
        });
      }

      if (lines.length === 0) return;

      await this.journalEntriesService.createAutoEntry({
        tenantId: params.tenantId,
        date: new Date(),
        description: `Nómina aprobada - ${params.periodName}`,
        source: JournalEntrySource.PAYROLL_APPROVED,
        lines,
      });

      this.logger.debug(`Payroll entry generated for ${params.periodName}`);
    } catch (error) {
      this.logger.error(
        `Failed to generate payroll entry for ${params.periodName}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }

  /**
   * Generate journal entry for a credit note (nota crédito).
   * Reverses the original sale: CR Clientes, DR Ingresos, DR IVA.
   * If reason is DEVOLUCION_PARCIAL, also reverses COGS.
   */
  async onCreditNoteCreated(params: {
    tenantId: string;
    dianDocumentId: string;
    noteNumber: string;
    invoiceNumber: string;
    subtotal: number;
    tax: number;
    total: number;
    reasonCode: string;
    items?: { productId: string | null; quantity: number; product?: { costPrice: any } | null }[];
  }): Promise<void> {
    try {
      const config = await this.configService.getConfigForTenant(params.tenantId);
      if (!config?.autoGenerateEntries) return;

      const { accountsReceivableId, revenueAccountId, ivaPorPagarId, cogsAccountId, inventoryAccountId } = config;
      if (!accountsReceivableId || !revenueAccountId) return;

      const lines: { accountId: string; description?: string; debit: number; credit: number }[] = [];

      // CR Clientes = total (reduce receivable)
      lines.push({
        accountId: accountsReceivableId,
        description: `Nota credito ${params.noteNumber}`,
        debit: 0,
        credit: params.total,
      });

      // DR Ingresos = subtotal (reverse revenue)
      lines.push({
        accountId: revenueAccountId,
        description: `Devolucion venta ${params.noteNumber}`,
        debit: params.subtotal,
        credit: 0,
      });

      // DR IVA por pagar = tax (reverse tax)
      if (params.tax > 0 && ivaPorPagarId) {
        lines.push({
          accountId: ivaPorPagarId,
          description: `Devolucion IVA ${params.noteNumber}`,
          debit: params.tax,
          credit: 0,
        });
      }

      // COGS reversal for returns (DEVOLUCION_PARCIAL or DEVOLUCION_TOTAL)
      if (
        (params.reasonCode === 'DEVOLUCION_PARCIAL' || params.reasonCode === 'DEVOLUCION_TOTAL') &&
        params.items &&
        cogsAccountId &&
        inventoryAccountId
      ) {
        const totalCogs = params.items.reduce((sum, item) => {
          if (!item.product?.costPrice) return sum;
          return sum + Number(item.product.costPrice) * item.quantity;
        }, 0);

        if (totalCogs > 0) {
          lines.push({
            accountId: cogsAccountId,
            description: `Devolucion costo ${params.noteNumber}`,
            debit: 0,
            credit: totalCogs,
          });

          lines.push({
            accountId: inventoryAccountId,
            description: `Devolucion inventario ${params.noteNumber}`,
            debit: totalCogs,
            credit: 0,
          });
        }
      }

      await this.journalEntriesService.createAutoEntry({
        tenantId: params.tenantId,
        date: new Date(),
        description: `Nota credito - ${params.noteNumber} (Factura ${params.invoiceNumber})`,
        source: JournalEntrySource.CREDIT_NOTE,
        dianDocumentId: params.dianDocumentId,
        lines,
      });

      this.logger.debug(`Accounting entry generated for credit note ${params.noteNumber}`);
    } catch (error) {
      this.logger.error(
        `Failed to generate accounting entry for credit note ${params.noteNumber}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }

  /**
   * Generate journal entry for a debit note (nota débito).
   * Additional charge: DR Clientes, CR Ingresos, CR IVA.
   */
  async onDebitNoteCreated(params: {
    tenantId: string;
    dianDocumentId: string;
    noteNumber: string;
    invoiceNumber: string;
    subtotal: number;
    tax: number;
    total: number;
  }): Promise<void> {
    try {
      const config = await this.configService.getConfigForTenant(params.tenantId);
      if (!config?.autoGenerateEntries) return;

      const { accountsReceivableId, revenueAccountId, ivaPorPagarId } = config;
      if (!accountsReceivableId || !revenueAccountId) return;

      const lines: { accountId: string; description?: string; debit: number; credit: number }[] = [];

      // DR Clientes = total (increase receivable)
      lines.push({
        accountId: accountsReceivableId,
        description: `Nota debito ${params.noteNumber}`,
        debit: params.total,
        credit: 0,
      });

      // CR Ingresos = subtotal
      lines.push({
        accountId: revenueAccountId,
        description: `Cargo adicional ${params.noteNumber}`,
        debit: 0,
        credit: params.subtotal,
      });

      // CR IVA por pagar = tax
      if (params.tax > 0 && ivaPorPagarId) {
        lines.push({
          accountId: ivaPorPagarId,
          description: `IVA nota debito ${params.noteNumber}`,
          debit: 0,
          credit: params.tax,
        });
      }

      await this.journalEntriesService.createAutoEntry({
        tenantId: params.tenantId,
        date: new Date(),
        description: `Nota debito - ${params.noteNumber} (Factura ${params.invoiceNumber})`,
        source: JournalEntrySource.DEBIT_NOTE,
        dianDocumentId: params.dianDocumentId,
        lines,
      });

      this.logger.debug(`Accounting entry generated for debit note ${params.noteNumber}`);
    } catch (error) {
      this.logger.error(
        `Failed to generate accounting entry for debit note ${params.noteNumber}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }

  /**
   * Map payment method to the appropriate PUC account.
   * CASH → Caja (1105), everything else → Bancos (1110)
   */
  private getPaymentAccountId(
    method: PaymentMethod,
    cashAccountId: string | null,
    bankAccountId: string | null,
  ): string | null {
    if (method === PaymentMethod.CASH) {
      return cashAccountId;
    }
    return bankAccountId;
  }
}
