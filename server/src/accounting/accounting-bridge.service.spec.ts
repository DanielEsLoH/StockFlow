import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { PaymentMethod, JournalEntrySource } from '@prisma/client';
import { AccountingBridgeService } from './accounting-bridge.service';
import { JournalEntriesService } from './journal-entries.service';
import { AccountingConfigService } from './accounting-config.service';
import { AccountingConfigResponse } from './accounting-config.service';

describe('AccountingBridgeService', () => {
  let service: AccountingBridgeService;
  let mockJournalEntriesService: { createAutoEntry: jest.Mock };
  let mockConfigService: { getConfigForTenant: jest.Mock };

  const mockTenantId = 'tenant-bridge';

  const fullConfig: AccountingConfigResponse = {
    id: 'cfg-1',
    tenantId: mockTenantId,
    cashAccountId: 'acc-cash',
    bankAccountId: 'acc-bank',
    accountsReceivableId: 'acc-ar',
    inventoryAccountId: 'acc-inv',
    accountsPayableId: 'acc-ap',
    ivaPorPagarId: 'acc-iva-pp',
    ivaDescontableId: 'acc-iva-d',
    revenueAccountId: 'acc-rev',
    cogsAccountId: 'acc-cogs',
    inventoryAdjustmentId: 'acc-adj',
    reteFuenteReceivedId: 'acc-rf-r',
    reteFuentePayableId: 'acc-rf-p',
    payrollExpenseId: 'acc-pay-exp',
    payrollPayableId: 'acc-pay-pay',
    payrollRetentionsId: 'acc-pay-ret',
    payrollContributionsId: 'acc-pay-cont',
    payrollProvisionsId: 'acc-pay-prov',
    autoGenerateEntries: true,
    isConfigured: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockJournalEntriesService = {
      createAutoEntry: jest.fn().mockResolvedValue({}),
    };

    mockConfigService = {
      getConfigForTenant: jest.fn().mockResolvedValue(fullConfig),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountingBridgeService,
        { provide: JournalEntriesService, useValue: mockJournalEntriesService },
        { provide: AccountingConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AccountingBridgeService>(AccountingBridgeService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // onInvoiceCreated
  // ---------------------------------------------------------------------------
  describe('onInvoiceCreated', () => {
    const baseParams = {
      tenantId: 'tenant-bridge',
      invoiceId: 'inv-1',
      invoiceNumber: 'FAC-001',
      subtotal: 100_000,
      tax: 19_000,
      total: 119_000,
      items: [
        { productId: 'prod-1', quantity: 2, product: { costPrice: 30_000 } },
      ],
    };

    it('should skip when autoGenerateEntries is false', async () => {
      mockConfigService.getConfigForTenant.mockResolvedValue({
        ...fullConfig,
        autoGenerateEntries: false,
      });

      await service.onInvoiceCreated(baseParams);

      expect(mockJournalEntriesService.createAutoEntry).not.toHaveBeenCalled();
    });

    it('should skip when config is null', async () => {
      mockConfigService.getConfigForTenant.mockResolvedValue(null);

      await service.onInvoiceCreated(baseParams);

      expect(mockJournalEntriesService.createAutoEntry).not.toHaveBeenCalled();
    });

    it('should skip when required account IDs are missing', async () => {
      mockConfigService.getConfigForTenant.mockResolvedValue({
        ...fullConfig,
        revenueAccountId: null,
      });

      await service.onInvoiceCreated(baseParams);

      expect(mockJournalEntriesService.createAutoEntry).not.toHaveBeenCalled();
    });

    it('should debit Clientes (accountsReceivableId) for credit sales', async () => {
      await service.onInvoiceCreated(baseParams);

      const call = mockJournalEntriesService.createAutoEntry.mock.calls[0][0];
      const debitLine = call.lines[0];
      expect(debitLine.accountId).toBe('acc-ar');
      expect(debitLine.debit).toBe(119_000);
    });

    it('should debit Caja (cashAccountId) for POS immediate payments', async () => {
      await service.onInvoiceCreated({ ...baseParams, isPosImmediate: true });

      const call = mockJournalEntriesService.createAutoEntry.mock.calls[0][0];
      const debitLine = call.lines[0];
      expect(debitLine.accountId).toBe('acc-cash');
    });

    it('should create entry with INVOICE_SALE source', async () => {
      await service.onInvoiceCreated(baseParams);

      const call = mockJournalEntriesService.createAutoEntry.mock.calls[0][0];
      expect(call.source).toBe(JournalEntrySource.INVOICE_SALE);
      expect(call.invoiceId).toBe('inv-1');
    });

    it('should include IVA line when tax > 0', async () => {
      await service.onInvoiceCreated(baseParams);

      const call = mockJournalEntriesService.createAutoEntry.mock.calls[0][0];
      const ivaLine = call.lines.find((l: any) => l.accountId === 'acc-iva-pp');
      expect(ivaLine).toBeDefined();
      expect(ivaLine.credit).toBe(19_000);
    });

    it('should omit IVA line when tax is 0', async () => {
      await service.onInvoiceCreated({ ...baseParams, tax: 0, total: 100_000 });

      const call = mockJournalEntriesService.createAutoEntry.mock.calls[0][0];
      const ivaLine = call.lines.find((l: any) => l.accountId === 'acc-iva-pp');
      expect(ivaLine).toBeUndefined();
    });

    it('should include COGS and inventory lines when items have costPrice', async () => {
      await service.onInvoiceCreated(baseParams);

      const call = mockJournalEntriesService.createAutoEntry.mock.calls[0][0];
      const cogsLine = call.lines.find((l: any) => l.accountId === 'acc-cogs');
      const invLine = call.lines.find(
        (l: any) => l.accountId === 'acc-inv' && l.credit > 0,
      );
      // 2 items * 30000 cost
      expect(cogsLine.debit).toBe(60_000);
      expect(invLine.credit).toBe(60_000);
    });

    it('should not throw when createAutoEntry fails', async () => {
      mockJournalEntriesService.createAutoEntry.mockRejectedValue(
        new Error('DB error'),
      );

      await expect(service.onInvoiceCreated(baseParams)).resolves.toBeUndefined();
      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // onInvoiceCancelled
  // ---------------------------------------------------------------------------
  describe('onInvoiceCancelled', () => {
    const cancelParams = {
      tenantId: 'tenant-bridge',
      invoiceId: 'inv-2',
      invoiceNumber: 'FAC-002',
      subtotal: 50_000,
      tax: 9_500,
      total: 59_500,
      items: [
        { productId: 'prod-1', quantity: 1, product: { costPrice: 20_000 } },
      ],
    };

    it('should skip when autoGenerateEntries is false', async () => {
      mockConfigService.getConfigForTenant.mockResolvedValue({
        ...fullConfig,
        autoGenerateEntries: false,
      });

      await service.onInvoiceCancelled(cancelParams);

      expect(mockJournalEntriesService.createAutoEntry).not.toHaveBeenCalled();
    });

    it('should skip when config is incomplete (missing required accounts)', async () => {
      mockConfigService.getConfigForTenant.mockResolvedValue({
        ...fullConfig,
        accountsReceivableId: null,
      });

      await service.onInvoiceCancelled(cancelParams);

      expect(mockJournalEntriesService.createAutoEntry).not.toHaveBeenCalled();
    });

    it('should create a reverse entry with INVOICE_CANCEL source', async () => {
      await service.onInvoiceCancelled(cancelParams);

      const call = mockJournalEntriesService.createAutoEntry.mock.calls[0][0];
      expect(call.source).toBe(JournalEntrySource.INVOICE_CANCEL);
      // Reverse: CR Clientes
      const arLine = call.lines.find((l: any) => l.accountId === 'acc-ar');
      expect(arLine.credit).toBe(59_500);
      // Reverse: DR Ingresos
      const revLine = call.lines.find((l: any) => l.accountId === 'acc-rev');
      expect(revLine.debit).toBe(50_000);
    });

    it('should not throw when createAutoEntry fails', async () => {
      mockJournalEntriesService.createAutoEntry.mockRejectedValue(
        new Error('DB down'),
      );

      await expect(
        service.onInvoiceCancelled(cancelParams),
      ).resolves.toBeUndefined();
      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // onPaymentCreated
  // ---------------------------------------------------------------------------
  describe('onPaymentCreated', () => {
    const paymentParams = {
      tenantId: 'tenant-bridge',
      paymentId: 'pay-1',
      invoiceNumber: 'FAC-003',
      amount: 119_000,
      method: PaymentMethod.CASH,
    };

    it('should debit cashAccountId for CASH payments', async () => {
      await service.onPaymentCreated(paymentParams);

      const call = mockJournalEntriesService.createAutoEntry.mock.calls[0][0];
      const debitLine = call.lines[0];
      expect(debitLine.accountId).toBe('acc-cash');
      expect(debitLine.debit).toBe(119_000);
    });

    it('should debit bankAccountId for non-CASH payments', async () => {
      await service.onPaymentCreated({
        ...paymentParams,
        method: PaymentMethod.BANK_TRANSFER,
      });

      const call = mockJournalEntriesService.createAutoEntry.mock.calls[0][0];
      expect(call.lines[0].accountId).toBe('acc-bank');
    });

    it('should credit Clientes (accountsReceivableId)', async () => {
      await service.onPaymentCreated(paymentParams);

      const call = mockJournalEntriesService.createAutoEntry.mock.calls[0][0];
      const creditLine = call.lines[1];
      expect(creditLine.accountId).toBe('acc-ar');
      expect(creditLine.credit).toBe(119_000);
    });

    it('should skip when accountsReceivableId is missing', async () => {
      mockConfigService.getConfigForTenant.mockResolvedValue({
        ...fullConfig,
        accountsReceivableId: null,
      });

      await service.onPaymentCreated(paymentParams);

      expect(mockJournalEntriesService.createAutoEntry).not.toHaveBeenCalled();
    });

    it('should skip when no account is mapped for the payment method', async () => {
      mockConfigService.getConfigForTenant.mockResolvedValue({
        ...fullConfig,
        cashAccountId: null,
      });

      await service.onPaymentCreated(paymentParams);

      expect(mockJournalEntriesService.createAutoEntry).not.toHaveBeenCalled();
    });

    it('should not throw when createAutoEntry fails', async () => {
      mockJournalEntriesService.createAutoEntry.mockRejectedValue(
        new Error('timeout'),
      );

      await expect(
        service.onPaymentCreated(paymentParams),
      ).resolves.toBeUndefined();
      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // onPurchaseReceived
  // ---------------------------------------------------------------------------
  describe('onPurchaseReceived', () => {
    const purchaseParams = {
      tenantId: 'tenant-bridge',
      purchaseOrderId: 'po-1',
      purchaseOrderNumber: 'OC-001',
      subtotal: 600_000,
      tax: 114_000,
      total: 714_000,
    };

    it('should debit Inventario and credit Proveedores', async () => {
      await service.onPurchaseReceived(purchaseParams);

      const call = mockJournalEntriesService.createAutoEntry.mock.calls[0][0];
      const invLine = call.lines.find(
        (l: any) => l.accountId === 'acc-inv' && l.debit > 0,
      );
      expect(invLine.debit).toBe(600_000);

      const apLine = call.lines.find((l: any) => l.accountId === 'acc-ap');
      expect(apLine).toBeDefined();
      expect(apLine.credit).toBeGreaterThan(0);
    });

    it('should include IVA descontable line when tax > 0', async () => {
      await service.onPurchaseReceived(purchaseParams);

      const call = mockJournalEntriesService.createAutoEntry.mock.calls[0][0];
      const ivaLine = call.lines.find((l: any) => l.accountId === 'acc-iva-d');
      expect(ivaLine.debit).toBe(114_000);
    });

    it('should apply ReteFuente when subtotal > 523740', async () => {
      await service.onPurchaseReceived(purchaseParams);

      const call = mockJournalEntriesService.createAutoEntry.mock.calls[0][0];
      const rfLine = call.lines.find((l: any) => l.accountId === 'acc-rf-p');
      // 600000 * 0.025 = 15000
      expect(rfLine).toBeDefined();
      expect(rfLine.credit).toBe(Math.round(600_000 * 0.025));
    });

    it('should NOT apply ReteFuente when subtotal <= 523740', async () => {
      await service.onPurchaseReceived({
        ...purchaseParams,
        subtotal: 500_000,
        tax: 95_000,
        total: 595_000,
      });

      const call = mockJournalEntriesService.createAutoEntry.mock.calls[0][0];
      const rfLine = call.lines.find((l: any) => l.accountId === 'acc-rf-p');
      expect(rfLine).toBeUndefined();
    });

    it('should reduce Proveedores credit by ReteFuente amount', async () => {
      await service.onPurchaseReceived(purchaseParams);

      const reteFuente = Math.round(600_000 * 0.025);
      const call = mockJournalEntriesService.createAutoEntry.mock.calls[0][0];
      const apLine = call.lines.find((l: any) => l.accountId === 'acc-ap');
      expect(apLine.credit).toBe(714_000 - reteFuente);
    });

    it('should not throw when createAutoEntry fails', async () => {
      mockJournalEntriesService.createAutoEntry.mockRejectedValue(
        new Error('constraint'),
      );

      await expect(
        service.onPurchaseReceived(purchaseParams),
      ).resolves.toBeUndefined();
      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // onStockAdjustment
  // ---------------------------------------------------------------------------
  describe('onStockAdjustment', () => {
    const positiveParams = {
      tenantId: 'tenant-bridge',
      movementId: 'mov-1',
      productSku: 'SKU-001',
      quantity: 5,
      costPrice: 10_000,
    };

    const negativeParams = {
      ...positiveParams,
      movementId: 'mov-2',
      quantity: -3,
    };

    it('should create sobrante entry for positive adjustment (DR Inventario, CR Adjustment)', async () => {
      await service.onStockAdjustment(positiveParams);

      const call = mockJournalEntriesService.createAutoEntry.mock.calls[0][0];
      expect(call.description).toContain('sobrante');
      expect(call.source).toBe(JournalEntrySource.STOCK_ADJUSTMENT);

      const debitLine = call.lines[0];
      expect(debitLine.accountId).toBe('acc-inv');
      expect(debitLine.debit).toBe(50_000); // 5 * 10000

      const creditLine = call.lines[1];
      expect(creditLine.accountId).toBe('acc-adj');
      expect(creditLine.credit).toBe(50_000);
    });

    it('should create faltante entry for negative adjustment (DR Adjustment, CR Inventario)', async () => {
      await service.onStockAdjustment(negativeParams);

      const call = mockJournalEntriesService.createAutoEntry.mock.calls[0][0];
      expect(call.description).toContain('faltante');

      const debitLine = call.lines[0];
      expect(debitLine.accountId).toBe('acc-adj');
      expect(debitLine.debit).toBe(30_000); // 3 * 10000

      const creditLine = call.lines[1];
      expect(creditLine.accountId).toBe('acc-inv');
      expect(creditLine.credit).toBe(30_000);
    });

    it('should skip when amount is 0 (quantity=0)', async () => {
      await service.onStockAdjustment({ ...positiveParams, quantity: 0 });

      expect(mockJournalEntriesService.createAutoEntry).not.toHaveBeenCalled();
    });

    it('should skip when amount is 0 (costPrice=0)', async () => {
      await service.onStockAdjustment({ ...positiveParams, costPrice: 0 });

      expect(mockJournalEntriesService.createAutoEntry).not.toHaveBeenCalled();
    });

    it('should skip when inventoryAdjustmentId is missing', async () => {
      mockConfigService.getConfigForTenant.mockResolvedValue({
        ...fullConfig,
        inventoryAdjustmentId: null,
      });

      await service.onStockAdjustment(positiveParams);

      expect(mockJournalEntriesService.createAutoEntry).not.toHaveBeenCalled();
    });

    it('should not throw when createAutoEntry fails', async () => {
      mockJournalEntriesService.createAutoEntry.mockRejectedValue(
        new Error('unexpected'),
      );

      await expect(
        service.onStockAdjustment(positiveParams),
      ).resolves.toBeUndefined();
      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Error resilience (cross-cutting)
  // ---------------------------------------------------------------------------
  // onCreditNoteCreated
  // ---------------------------------------------------------------------------
  describe('onCreditNoteCreated', () => {
    const creditNoteParams = {
      tenantId: mockTenantId,
      dianDocumentId: 'dian-cn-1',
      noteNumber: 'NC-00000001',
      invoiceNumber: 'FAC-001',
      subtotal: 1000,
      tax: 190,
      total: 1190,
      reasonCode: 'ANULACION',
      items: [],
    };

    it('should CR Clientes and DR Ingresos + IVA', async () => {
      await service.onCreditNoteCreated(creditNoteParams);

      expect(mockJournalEntriesService.createAutoEntry).toHaveBeenCalledTimes(1);
      const call = mockJournalEntriesService.createAutoEntry.mock.calls[0][0];

      expect(call.source).toBe(JournalEntrySource.CREDIT_NOTE);
      expect(call.dianDocumentId).toBe('dian-cn-1');

      const lines = call.lines;
      // CR Clientes = total
      expect(lines[0]).toEqual(expect.objectContaining({ accountId: 'acc-ar', credit: 1190, debit: 0 }));
      // DR Ingresos = subtotal
      expect(lines[1]).toEqual(expect.objectContaining({ accountId: 'acc-rev', debit: 1000, credit: 0 }));
      // DR IVA = tax
      expect(lines[2]).toEqual(expect.objectContaining({ accountId: 'acc-iva-pp', debit: 190, credit: 0 }));
    });

    it('should include COGS reversal for DEVOLUCION_PARCIAL', async () => {
      await service.onCreditNoteCreated({
        ...creditNoteParams,
        reasonCode: 'DEVOLUCION_PARCIAL',
        items: [{ productId: 'p1', quantity: 2, product: { costPrice: 500 } }],
      });

      const call = mockJournalEntriesService.createAutoEntry.mock.calls[0][0];
      const lines = call.lines;

      // Should have 5 lines: CR Clientes, DR Ingresos, DR IVA, CR COGS, DR Inventario
      expect(lines).toHaveLength(5);
      expect(lines[3]).toEqual(expect.objectContaining({ accountId: 'acc-cogs', credit: 1000, debit: 0 }));
      expect(lines[4]).toEqual(expect.objectContaining({ accountId: 'acc-inv', debit: 1000, credit: 0 }));
    });

    it('should skip COGS reversal for ANULACION', async () => {
      await service.onCreditNoteCreated({
        ...creditNoteParams,
        reasonCode: 'ANULACION',
        items: [{ productId: 'p1', quantity: 2, product: { costPrice: 500 } }],
      });

      const call = mockJournalEntriesService.createAutoEntry.mock.calls[0][0];
      expect(call.lines).toHaveLength(3); // No COGS lines
    });

    it('should skip when autoGenerateEntries is false', async () => {
      mockConfigService.getConfigForTenant.mockResolvedValue({ ...fullConfig, autoGenerateEntries: false });
      await service.onCreditNoteCreated(creditNoteParams);
      expect(mockJournalEntriesService.createAutoEntry).not.toHaveBeenCalled();
    });

    it('should not throw when createAutoEntry fails', async () => {
      mockJournalEntriesService.createAutoEntry.mockRejectedValue(new Error('db error'));
      await expect(service.onCreditNoteCreated(creditNoteParams)).resolves.toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // onDebitNoteCreated
  // ---------------------------------------------------------------------------
  describe('onDebitNoteCreated', () => {
    const debitNoteParams = {
      tenantId: mockTenantId,
      dianDocumentId: 'dian-dn-1',
      noteNumber: 'ND-00000001',
      invoiceNumber: 'FAC-001',
      subtotal: 500,
      tax: 95,
      total: 595,
    };

    it('should DR Clientes and CR Ingresos + IVA', async () => {
      await service.onDebitNoteCreated(debitNoteParams);

      expect(mockJournalEntriesService.createAutoEntry).toHaveBeenCalledTimes(1);
      const call = mockJournalEntriesService.createAutoEntry.mock.calls[0][0];

      expect(call.source).toBe(JournalEntrySource.DEBIT_NOTE);
      expect(call.dianDocumentId).toBe('dian-dn-1');

      const lines = call.lines;
      // DR Clientes = total
      expect(lines[0]).toEqual(expect.objectContaining({ accountId: 'acc-ar', debit: 595, credit: 0 }));
      // CR Ingresos = subtotal
      expect(lines[1]).toEqual(expect.objectContaining({ accountId: 'acc-rev', debit: 0, credit: 500 }));
      // CR IVA = tax
      expect(lines[2]).toEqual(expect.objectContaining({ accountId: 'acc-iva-pp', debit: 0, credit: 95 }));
    });

    it('should skip IVA line when tax is 0', async () => {
      await service.onDebitNoteCreated({ ...debitNoteParams, tax: 0, total: 500 });

      const call = mockJournalEntriesService.createAutoEntry.mock.calls[0][0];
      expect(call.lines).toHaveLength(2); // No IVA line
    });

    it('should skip when autoGenerateEntries is false', async () => {
      mockConfigService.getConfigForTenant.mockResolvedValue({ ...fullConfig, autoGenerateEntries: false });
      await service.onDebitNoteCreated(debitNoteParams);
      expect(mockJournalEntriesService.createAutoEntry).not.toHaveBeenCalled();
    });

    it('should not throw when createAutoEntry fails', async () => {
      mockJournalEntriesService.createAutoEntry.mockRejectedValue(new Error('db error'));
      await expect(service.onDebitNoteCreated(debitNoteParams)).resolves.toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  describe('error resilience', () => {
    it('should not propagate errors from getConfigForTenant', async () => {
      mockConfigService.getConfigForTenant.mockRejectedValue(
        new Error('prisma crash'),
      );

      await expect(
        service.onInvoiceCreated({
          tenantId: 'tenant-bridge',
          invoiceId: 'inv-x',
          invoiceNumber: 'FAC-X',
          subtotal: 1000,
          tax: 190,
          total: 1190,
          items: [],
        }),
      ).resolves.toBeUndefined();

      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });
});
