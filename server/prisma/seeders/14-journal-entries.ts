import type { PrismaClient } from '@prisma/client';
import type { SeedContext } from './types';
import {
  daysAgo,
  padNumber,
  TENANT_PREFIX,
} from './helpers';

// ============================================================================
// JOURNAL ENTRY SEEDER
// ============================================================================

type JournalEntrySource =
  | 'MANUAL' | 'INVOICE_SALE' | 'PAYMENT_RECEIVED' | 'PURCHASE_RECEIVED'
  | 'STOCK_ADJUSTMENT' | 'PERIOD_CLOSE' | 'EXPENSE_PAID' | 'INVOICE_CANCEL'
  | 'PURCHASE_PAYMENT' | 'PAYROLL_APPROVED' | 'PAYROLL_ADJUSTMENT'
  | 'CREDIT_NOTE' | 'DEBIT_NOTE';

type JournalEntryStatus = 'DRAFT' | 'POSTED' | 'VOIDED';

interface JournalLine {
  accountCode: string;
  costCenterCode?: string;
  description: string;
  debit: number;
  credit: number;
}

interface JournalEntrySpec {
  source: JournalEntrySource;
  status: JournalEntryStatus;
  description: string;
  daysBack: number;
  amount: number;        // total balanced amount
  lines: JournalLine[];
  voidReason?: string;
}

/**
 * Resolve account ID from ctx.accounts map.
 * Returns the ID or throws if the account doesn't exist for this tenant.
 */
function resolveAccount(ctx: SeedContext, tenantId: string, code: string): string {
  const id = ctx.accounts.get(`${tenantId}:${code}`);
  if (!id) {
    throw new Error(`Account ${code} not found for tenant ${tenantId}`);
  }
  return id;
}

function resolveCostCenter(ctx: SeedContext, tenantId: string, code: string): string | undefined {
  return ctx.costCenters.get(`${tenantId}:${code}`) ?? undefined;
}

async function createJournalEntriesForTenant(
  prisma: PrismaClient,
  ctx: SeedContext,
  tenantKey: 'demo' | 'distribuidora' | 'papeleria',
  specs: JournalEntrySpec[],
) {
  const tenant = ctx.tenants[tenantKey];
  const prefix = `CE-${TENANT_PREFIX[tenant.slug]}`;
  const counters = ctx.counters[tenantKey];

  const createdById =
    tenantKey === 'demo'
      ? ctx.users.demo.contador.id
      : tenantKey === 'distribuidora'
        ? ctx.users.distribuidora.contador.id
        : ctx.users.papeleria.contador.id;

  for (const spec of specs) {
    counters.journalEntry++;
    const entryNumber = `${prefix}-${padNumber(counters.journalEntry)}`;
    const date = daysAgo(spec.daysBack);

    // Validate balance
    const totalDebit = spec.lines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = spec.lines.reduce((sum, l) => sum + l.credit, 0);
    if (totalDebit !== totalCredit) {
      throw new Error(
        `Unbalanced journal entry "${spec.description}": debit=${totalDebit}, credit=${totalCredit}`,
      );
    }

    const postedAt = spec.status === 'POSTED' ? date : null;
    const voidedAt = spec.status === 'VOIDED' ? daysAgo(Math.max(0, spec.daysBack - 2)) : null;

    await prisma.$transaction(async (tx) => {
      await tx.journalEntry.create({
        data: {
          tenantId: tenant.id,
          entryNumber,
          date,
          description: spec.description,
          source: spec.source,
          status: spec.status,
          totalDebit,
          totalCredit,
          createdById,
          postedAt,
          voidedAt,
          voidReason: spec.voidReason ?? null,
          lines: {
            create: spec.lines.map((line) => ({
              accountId: resolveAccount(ctx, tenant.id, line.accountCode),
              costCenterId: line.costCenterCode
                ? resolveCostCenter(ctx, tenant.id, line.costCenterCode) ?? null
                : null,
              description: line.description,
              debit: line.debit,
              credit: line.credit,
            })),
          },
        },
      });
    });
  }
}

export async function seedJournalEntries(prisma: PrismaClient, ctx: SeedContext): Promise<void> {
  console.log('   Seeding journal entries...');

  // ── Demo: 12 entries, various sources ──
  await createJournalEntriesForTenant(prisma, ctx, 'demo', [
    // 1. MANUAL (POSTED) - Ajuste apertura
    {
      source: 'MANUAL', status: 'POSTED', daysBack: 60,
      description: 'Ajuste de apertura - saldos iniciales cuentas bancarias',
      amount: 50000000,
      lines: [
        { accountCode: '111005', description: 'Saldo inicial Banco Colombia', debit: 50000000, credit: 0, costCenterCode: 'ADM' },
        { accountCode: '311505', description: 'Capital suscrito y pagado', debit: 0, credit: 50000000 },
      ],
    },
    // 2. MANUAL (POSTED) - Reclasificación
    {
      source: 'MANUAL', status: 'POSTED', daysBack: 45,
      description: 'Reclasificación caja menor a bancos',
      amount: 2000000,
      lines: [
        { accountCode: '111005', description: 'Traslado a bancos', debit: 2000000, credit: 0 },
        { accountCode: '110505', description: 'Salida de caja general', debit: 0, credit: 2000000 },
      ],
    },
    // 3. INVOICE_SALE (POSTED) - Venta con IVA
    {
      source: 'INVOICE_SALE', status: 'POSTED', daysBack: 35,
      description: 'Registro venta factura FE-TD-00001 - cliente mayorista',
      amount: 5950000,
      lines: [
        { accountCode: '130505', description: 'CxC cliente mayorista', debit: 5950000, credit: 0, costCenterCode: 'VEN' },
        { accountCode: '413505', description: 'Ingreso por venta mercancía', debit: 0, credit: 5000000 },
        { accountCode: '240805', description: 'IVA generado 19%', debit: 0, credit: 950000 },
      ],
    },
    // 4. INVOICE_SALE (POSTED) - Otra venta
    {
      source: 'INVOICE_SALE', status: 'POSTED', daysBack: 28,
      description: 'Registro venta factura FE-TD-00002 - cliente minorista',
      amount: 3570000,
      lines: [
        { accountCode: '130505', description: 'CxC cliente minorista', debit: 3570000, credit: 0, costCenterCode: 'VEN' },
        { accountCode: '413505', description: 'Ingreso por venta mercancía', debit: 0, credit: 3000000 },
        { accountCode: '240805', description: 'IVA generado 19%', debit: 0, credit: 570000 },
      ],
    },
    // 5. PAYMENT_RECEIVED (POSTED) - Recaudo en efectivo
    {
      source: 'PAYMENT_RECEIVED', status: 'POSTED', daysBack: 30,
      description: 'Recaudo pago cliente - efectivo en caja',
      amount: 5950000,
      lines: [
        { accountCode: '110505', description: 'Ingreso a caja general', debit: 5950000, credit: 0, costCenterCode: 'VEN' },
        { accountCode: '130505', description: 'Abono CxC cliente', debit: 0, credit: 5950000 },
      ],
    },
    // 6. PAYMENT_RECEIVED (POSTED) - Recaudo bancario
    {
      source: 'PAYMENT_RECEIVED', status: 'POSTED', daysBack: 22,
      description: 'Recaudo pago cliente - consignación bancaria',
      amount: 3570000,
      lines: [
        { accountCode: '111005', description: 'Consignación Banco Colombia', debit: 3570000, credit: 0 },
        { accountCode: '130505', description: 'Abono CxC cliente', debit: 0, credit: 3570000 },
      ],
    },
    // 7. PURCHASE_RECEIVED (POSTED) - Compra con IVA descontable
    {
      source: 'PURCHASE_RECEIVED', status: 'POSTED', daysBack: 25,
      description: 'Registro compra OC-TD-00007 - inventario recibido',
      amount: 8330000,
      lines: [
        { accountCode: '143505', description: 'Inventario mercancía recibida', debit: 7000000, credit: 0, costCenterCode: 'OPE' },
        { accountCode: '240810', description: 'IVA descontable compra', debit: 1330000, credit: 0 },
        { accountCode: '220505', description: 'CxP proveedor nacional', debit: 0, credit: 8330000 },
      ],
    },
    // 8. EXPENSE_PAID (POSTED) - Gasto operacional
    {
      source: 'EXPENSE_PAID', status: 'POSTED', daysBack: 15,
      description: 'Pago arriendo local comercial marzo 2026',
      amount: 4500000,
      lines: [
        { accountCode: '512010', description: 'Gasto arriendo', debit: 4500000, credit: 0, costCenterCode: 'ADM' },
        { accountCode: '111005', description: 'Pago desde banco', debit: 0, credit: 4500000 },
      ],
    },
    // 9. STOCK_ADJUSTMENT (POSTED) - Ajuste inventario
    {
      source: 'STOCK_ADJUSTMENT', status: 'POSTED', daysBack: 20,
      description: 'Ajuste inventario por conteo físico - faltantes detectados',
      amount: 850000,
      lines: [
        { accountCode: '529010', description: 'Pérdida por ajuste inventario', debit: 850000, credit: 0, costCenterCode: 'OPE' },
        { accountCode: '143505', description: 'Reducción inventario mercancía', debit: 0, credit: 850000 },
      ],
    },
    // 10. PERIOD_CLOSE (POSTED) - Cierre periodo
    {
      source: 'PERIOD_CLOSE', status: 'POSTED', daysBack: 32,
      description: 'Cierre contable periodo enero 2026',
      amount: 8000000,
      lines: [
        { accountCode: '413505', description: 'Cierre ingresos del periodo', debit: 8000000, credit: 0 },
        { accountCode: '590505', description: 'Ganancias y pérdidas', debit: 0, credit: 8000000 },
      ],
    },
    // 11. DRAFT - Pendiente
    {
      source: 'MANUAL', status: 'DRAFT', daysBack: 3,
      description: 'Borrador - provisión cesantías febrero 2026',
      amount: 1200000,
      lines: [
        { accountCode: '510536', description: 'Gasto provisión cesantías', debit: 1200000, credit: 0, costCenterCode: 'ADM' },
        { accountCode: '261005', description: 'Provisión cesantías por pagar', debit: 0, credit: 1200000 },
      ],
    },
    // 12. VOIDED
    {
      source: 'MANUAL', status: 'VOIDED', daysBack: 40,
      description: 'Registro duplicado venta - ANULADO',
      amount: 2380000,
      voidReason: 'Asiento duplicado por error de digitación. Se mantiene el CE-TD-00003.',
      lines: [
        { accountCode: '130505', description: 'CxC duplicada (anulada)', debit: 2380000, credit: 0 },
        { accountCode: '413505', description: 'Ingreso duplicado (anulado)', debit: 0, credit: 2000000 },
        { accountCode: '240805', description: 'IVA duplicado (anulado)', debit: 0, credit: 380000 },
      ],
    },
  ]);

  // ── Distribuidora: 8 entries ──
  await createJournalEntriesForTenant(prisma, ctx, 'distribuidora', [
    // 1. MANUAL - Apertura
    {
      source: 'MANUAL', status: 'POSTED', daysBack: 55,
      description: 'Saldos iniciales - apertura contable 2026',
      amount: 80000000,
      lines: [
        { accountCode: '111005', description: 'Saldo inicial bancos', debit: 80000000, credit: 0 },
        { accountCode: '311505', description: 'Capital suscrito', debit: 0, credit: 80000000 },
      ],
    },
    // 2. INVOICE_SALE
    {
      source: 'INVOICE_SALE', status: 'POSTED', daysBack: 30,
      description: 'Venta distribución nacional - factura FE-DN-00001',
      amount: 11900000,
      lines: [
        { accountCode: '130505', description: 'CxC cliente distribución', debit: 11900000, credit: 0, costCenterCode: 'VEN' },
        { accountCode: '413505', description: 'Ingreso venta mercancía', debit: 0, credit: 10000000 },
        { accountCode: '240805', description: 'IVA generado 19%', debit: 0, credit: 1900000 },
      ],
    },
    // 3. PAYMENT_RECEIVED
    {
      source: 'PAYMENT_RECEIVED', status: 'POSTED', daysBack: 25,
      description: 'Recaudo consignación bancaria cliente',
      amount: 11900000,
      lines: [
        { accountCode: '111005', description: 'Consignación banco', debit: 11900000, credit: 0 },
        { accountCode: '130505', description: 'Abono CxC', debit: 0, credit: 11900000 },
      ],
    },
    // 4. PURCHASE_RECEIVED
    {
      source: 'PURCHASE_RECEIVED', status: 'POSTED', daysBack: 22,
      description: 'Recepción mercancía OC-DN-00006',
      amount: 14280000,
      lines: [
        { accountCode: '143505', description: 'Inventario mercancía', debit: 12000000, credit: 0, costCenterCode: 'OPE' },
        { accountCode: '240810', description: 'IVA descontable', debit: 2280000, credit: 0 },
        { accountCode: '220505', description: 'CxP proveedor', debit: 0, credit: 14280000 },
      ],
    },
    // 5. EXPENSE_PAID
    {
      source: 'EXPENSE_PAID', status: 'POSTED', daysBack: 14,
      description: 'Pago arriendo bodega principal',
      amount: 6500000,
      lines: [
        { accountCode: '512010', description: 'Gasto arriendo bodega', debit: 6500000, credit: 0, costCenterCode: 'ADM' },
        { accountCode: '111005', description: 'Pago banco', debit: 0, credit: 6500000 },
      ],
    },
    // 6. PURCHASE_PAYMENT
    {
      source: 'PURCHASE_PAYMENT', status: 'POSTED', daysBack: 18,
      description: 'Pago a proveedor OC-DN-00006',
      amount: 14280000,
      lines: [
        { accountCode: '220505', description: 'Abono CxP proveedor', debit: 14280000, credit: 0 },
        { accountCode: '111005', description: 'Desembolso bancario', debit: 0, credit: 14280000 },
      ],
    },
    // 7. STOCK_ADJUSTMENT
    {
      source: 'STOCK_ADJUSTMENT', status: 'POSTED', daysBack: 10,
      description: 'Ajuste inventario por merma en bodega refrigerada',
      amount: 1500000,
      lines: [
        { accountCode: '529010', description: 'Pérdida mercancía dañada', debit: 1500000, credit: 0, costCenterCode: 'OPE' },
        { accountCode: '143505', description: 'Baja inventario', debit: 0, credit: 1500000 },
      ],
    },
    // 8. DRAFT
    {
      source: 'MANUAL', status: 'DRAFT', daysBack: 2,
      description: 'Borrador - provisión impuesto renta febrero',
      amount: 3200000,
      lines: [
        { accountCode: '540505', description: 'Gasto impuesto renta', debit: 3200000, credit: 0 },
        { accountCode: '240405', description: 'Provisión impuesto renta', debit: 0, credit: 3200000 },
      ],
    },
  ]);

  // ── Nuevo: SKIP (EMPRENDEDOR plan - no accounting module) ──

  // ── Papeleria: 6 entries ──
  await createJournalEntriesForTenant(prisma, ctx, 'papeleria', [
    // 1. MANUAL - Apertura
    {
      source: 'MANUAL', status: 'POSTED', daysBack: 50,
      description: 'Saldos iniciales apertura 2026',
      amount: 25000000,
      lines: [
        { accountCode: '111005', description: 'Saldo bancos apertura', debit: 15000000, credit: 0 },
        { accountCode: '110505', description: 'Saldo caja apertura', debit: 5000000, credit: 0 },
        { accountCode: '143505', description: 'Inventario inicial', debit: 5000000, credit: 0, costCenterCode: 'OPE' },
        { accountCode: '311505', description: 'Capital suscrito', debit: 0, credit: 25000000 },
      ],
    },
    // 2. INVOICE_SALE
    {
      source: 'INVOICE_SALE', status: 'POSTED', daysBack: 20,
      description: 'Venta papelería escolar - FE-PC-00001',
      amount: 2380000,
      lines: [
        { accountCode: '130505', description: 'CxC cliente', debit: 2380000, credit: 0, costCenterCode: 'VEN' },
        { accountCode: '413505', description: 'Ingreso venta', debit: 0, credit: 2000000 },
        { accountCode: '240805', description: 'IVA 19%', debit: 0, credit: 380000 },
      ],
    },
    // 3. PAYMENT_RECEIVED
    {
      source: 'PAYMENT_RECEIVED', status: 'POSTED', daysBack: 18,
      description: 'Recaudo venta FE-PC-00001 en efectivo',
      amount: 2380000,
      lines: [
        { accountCode: '110505', description: 'Ingreso caja', debit: 2380000, credit: 0 },
        { accountCode: '130505', description: 'Abono CxC', debit: 0, credit: 2380000 },
      ],
    },
    // 4. EXPENSE_PAID
    {
      source: 'EXPENSE_PAID', status: 'POSTED', daysBack: 13,
      description: 'Pago servicios públicos local - energía febrero',
      amount: 420000,
      lines: [
        { accountCode: '513505', description: 'Gasto energía eléctrica', debit: 420000, credit: 0, costCenterCode: 'ADM' },
        { accountCode: '110505', description: 'Pago desde caja', debit: 0, credit: 420000 },
      ],
    },
    // 5. PURCHASE_RECEIVED
    {
      source: 'PURCHASE_RECEIVED', status: 'POSTED', daysBack: 15,
      description: 'Compra mercancía papelería - cuadernos y útiles',
      amount: 4760000,
      lines: [
        { accountCode: '143505', description: 'Inventario mercancía', debit: 4000000, credit: 0, costCenterCode: 'OPE' },
        { accountCode: '240810', description: 'IVA descontable', debit: 760000, credit: 0 },
        { accountCode: '220505', description: 'CxP proveedor', debit: 0, credit: 4760000 },
      ],
    },
    // 6. VOIDED
    {
      source: 'MANUAL', status: 'VOIDED', daysBack: 35,
      description: 'Asiento erróneo - ANULADO',
      amount: 500000,
      voidReason: 'Error en clasificación de cuenta. Se creó asiento correcto posteriormente.',
      lines: [
        { accountCode: '519530', description: 'Gasto papelería (error)', debit: 500000, credit: 0 },
        { accountCode: '110505', description: 'Pago caja (error)', debit: 0, credit: 500000 },
      ],
    },
  ]);

  console.log('   Journal entries seeded (26 total)');
}
