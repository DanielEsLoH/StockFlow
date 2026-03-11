import type { PrismaClient } from '@prisma/client';
import type { SeedContext } from './types';
import {
  daysAgo,
  pickRandom,
  pickRandomN,
  randomInt,
  computeLineAmounts,
  sumDocumentTotals,
  padNumber,
  TENANT_PREFIX,
} from './helpers';

// ============================================================================
// PURCHASE ORDER SEEDER
// ============================================================================

type POStatus = 'DRAFT' | 'SENT' | 'CONFIRMED' | 'RECEIVED' | 'CANCELLED';
type PaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
type PaymentMethod = 'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_TRANSFER' | 'PSE' | 'NEQUI' | 'DAVIPLATA' | 'OTHER';
type TaxCategory = 'GRAVADO_19' | 'GRAVADO_5' | 'EXENTO' | 'EXCLUIDO';

interface POSpec {
  status: POStatus;
  paymentStatus: PaymentStatus;
  daysBack: number;
  itemCount: number;
  notes?: string;
  payments?: PaymentSpec[];
}

interface PaymentSpec {
  fraction: number; // fraction of total (1 = full, 0.5 = half, etc.)
  method: PaymentMethod;
  reference?: string;
  notes?: string;
  daysBack: number;
}

function taxCategoryFromRate(rate: number): TaxCategory {
  if (rate === 19) return 'GRAVADO_19';
  if (rate === 5) return 'GRAVADO_5';
  if (rate === 0) return 'EXENTO';
  return 'EXCLUIDO';
}

function buildPOItems(
  products: SeedContext['products']['demo'],
  itemCount: number,
) {
  const selected = pickRandomN(products, itemCount);
  return selected.map((p) => {
    const quantity = randomInt(2, 8);
    const amounts = computeLineAmounts(quantity, p.costPrice, p.taxRate);
    return {
      productId: p.id,
      quantity,
      unitPrice: p.costPrice,
      taxRate: p.taxRate,
      taxCategory: taxCategoryFromRate(p.taxRate),
      discount: 0,
      subtotal: amounts.subtotal,
      tax: amounts.tax,
      total: amounts.total,
    };
  });
}

async function createPurchasesForTenant(
  prisma: PrismaClient,
  ctx: SeedContext,
  tenantKey: 'demo' | 'distribuidora' | 'nuevo' | 'papeleria',
  specs: POSpec[],
) {
  const tenant = ctx.tenants[tenantKey];
  const prefix = `OC-${TENANT_PREFIX[tenant.slug]}`;
  const products = ctx.products[tenantKey];
  const suppliers = ctx.suppliers[tenantKey];
  const counters = ctx.counters[tenantKey];

  const userId =
    tenantKey === 'demo'
      ? pickRandom(ctx.users.demo.allActive).id
      : tenantKey === 'distribuidora'
        ? ctx.users.distribuidora.admin.id
        : tenantKey === 'nuevo'
          ? ctx.users.nuevo.admin.id
          : ctx.users.papeleria.admin.id;

  const warehouseId =
    tenantKey === 'demo'
      ? ctx.warehouses.demo.main.id
      : tenantKey === 'distribuidora'
        ? ctx.warehouses.distribuidora.main.id
        : tenantKey === 'nuevo'
          ? ctx.warehouses.nuevo.main.id
          : ctx.warehouses.papeleria.main.id;

  for (const spec of specs) {
    counters.purchase++;
    const purchaseOrderNumber = `${prefix}-${padNumber(counters.purchase)}`;
    const issueDate = daysAgo(spec.daysBack);
    const expectedDeliveryDate = new Date(issueDate);
    expectedDeliveryDate.setDate(expectedDeliveryDate.getDate() + randomInt(7, 21));

    const supplier = pickRandom(suppliers);
    const items = buildPOItems(products, spec.itemCount);
    const totals = sumDocumentTotals(items);

    const receivedDate =
      spec.status === 'RECEIVED'
        ? new Date(issueDate.getTime() + randomInt(5, 15) * 86400000)
        : null;

    const po = await prisma.purchaseOrder.create({
      data: {
        tenantId: tenant.id,
        purchaseOrderNumber,
        supplierId: supplier.id,
        userId,
        warehouseId,
        status: spec.status,
        paymentStatus: spec.paymentStatus,
        subtotal: totals.subtotal,
        tax: totals.tax,
        discount: 0,
        total: totals.total,
        totalInBaseCurrency: totals.total,
        issueDate,
        expectedDeliveryDate,
        receivedDate,
        notes: spec.notes ?? null,
        items: {
          create: items,
        },
      },
    });

    // Create payments if specified
    if (spec.payments && spec.payments.length > 0) {
      for (const payment of spec.payments) {
        const paymentAmount = Math.round(totals.total * payment.fraction);
        await prisma.purchasePayment.create({
          data: {
            tenantId: tenant.id,
            purchaseOrderId: po.id,
            amount: paymentAmount,
            method: payment.method,
            reference: payment.reference ?? null,
            notes: payment.notes ?? null,
            paymentDate: daysAgo(payment.daysBack),
          },
        });
      }
    }
  }
}

export async function seedPurchases(prisma: PrismaClient, ctx: SeedContext): Promise<void> {
  console.log('   Seeding purchase orders...');

  // ── Demo: 10 POs covering all 5 statuses (2 each) ──
  // Payments: 2 for RECEIVED (full), 1 for CONFIRMED (partial) = ~5 payments
  // Plus 1 more to reach 6 total
  await createPurchasesForTenant(prisma, ctx, 'demo', [
    // DRAFT (2)
    {
      status: 'DRAFT', paymentStatus: 'UNPAID', daysBack: 2, itemCount: 3,
      notes: 'Borrador - pendiente aprobación gerencia',
    },
    {
      status: 'DRAFT', paymentStatus: 'UNPAID', daysBack: 1, itemCount: 2,
      notes: 'Borrador - verificar existencias con proveedor',
    },
    // SENT (2)
    {
      status: 'SENT', paymentStatus: 'UNPAID', daysBack: 10, itemCount: 3,
      notes: 'Enviada al proveedor - esperando confirmación',
    },
    {
      status: 'SENT', paymentStatus: 'UNPAID', daysBack: 7, itemCount: 2,
      notes: 'Enviada - proveedor acusó recibo',
    },
    // CONFIRMED (2) - one with partial payment
    {
      status: 'CONFIRMED', paymentStatus: 'PARTIALLY_PAID', daysBack: 15, itemCount: 4,
      notes: 'Confirmada - anticipo del 50% realizado',
      payments: [
        { fraction: 0.5, method: 'BANK_TRANSFER', reference: 'TRF-2026-0215', notes: 'Anticipo 50%', daysBack: 14 },
      ],
    },
    {
      status: 'CONFIRMED', paymentStatus: 'UNPAID', daysBack: 12, itemCount: 3,
      notes: 'Confirmada - despacho programado para la próxima semana',
    },
    // RECEIVED (2) - fully paid
    {
      status: 'RECEIVED', paymentStatus: 'PAID', daysBack: 30, itemCount: 4,
      notes: 'Recibida y verificada conforme',
      payments: [
        { fraction: 0.5, method: 'BANK_TRANSFER', reference: 'TRF-2026-0180', notes: 'Anticipo 50%', daysBack: 28 },
        { fraction: 0.5, method: 'BANK_TRANSFER', reference: 'TRF-2026-0195', notes: 'Saldo 50% contra entrega', daysBack: 25 },
      ],
    },
    {
      status: 'RECEIVED', paymentStatus: 'PAID', daysBack: 25, itemCount: 3,
      notes: 'Recibida completa - inventario actualizado',
      payments: [
        { fraction: 1, method: 'CASH', reference: 'REC-0025', notes: 'Pago total contra entrega', daysBack: 22 },
      ],
    },
    // CANCELLED (2)
    {
      status: 'CANCELLED', paymentStatus: 'UNPAID', daysBack: 20, itemCount: 2,
      notes: 'Cancelada - proveedor no pudo cumplir fecha de entrega',
    },
    {
      status: 'CANCELLED', paymentStatus: 'UNPAID', daysBack: 18, itemCount: 3,
      notes: 'Cancelada - se encontró mejor oferta con otro proveedor',
    },
  ]);

  // ── Distribuidora: 8 POs ──
  await createPurchasesForTenant(prisma, ctx, 'distribuidora', [
    { status: 'DRAFT', paymentStatus: 'UNPAID', daysBack: 3, itemCount: 3 },
    { status: 'SENT', paymentStatus: 'UNPAID', daysBack: 11, itemCount: 4 },
    { status: 'SENT', paymentStatus: 'UNPAID', daysBack: 8, itemCount: 2 },
    {
      status: 'CONFIRMED', paymentStatus: 'PARTIALLY_PAID', daysBack: 16, itemCount: 3,
      payments: [
        { fraction: 0.3, method: 'PSE', reference: 'PSE-2026-0412', notes: 'Anticipo 30%', daysBack: 15 },
      ],
    },
    {
      status: 'CONFIRMED', paymentStatus: 'UNPAID', daysBack: 13, itemCount: 2,
    },
    {
      status: 'RECEIVED', paymentStatus: 'PAID', daysBack: 28, itemCount: 4,
      payments: [
        { fraction: 1, method: 'BANK_TRANSFER', reference: 'TRF-DN-0088', notes: 'Pago total', daysBack: 24 },
      ],
    },
    {
      status: 'RECEIVED', paymentStatus: 'PAID', daysBack: 22, itemCount: 3,
      payments: [
        { fraction: 0.5, method: 'NEQUI', reference: 'NEQ-2026-1155', notes: 'Primer pago', daysBack: 20 },
        { fraction: 0.5, method: 'NEQUI', reference: 'NEQ-2026-1190', notes: 'Segundo pago', daysBack: 18 },
      ],
    },
    {
      status: 'CANCELLED', paymentStatus: 'UNPAID', daysBack: 19, itemCount: 2,
      notes: 'Cancelada - producto descontinuado por proveedor',
    },
  ]);

  // ── Nuevo: 2 POs ──
  await createPurchasesForTenant(prisma, ctx, 'nuevo', [
    { status: 'SENT', paymentStatus: 'UNPAID', daysBack: 9, itemCount: 2 },
    {
      status: 'RECEIVED', paymentStatus: 'PAID', daysBack: 20, itemCount: 2,
      payments: [
        { fraction: 1, method: 'DAVIPLATA', reference: 'DVP-2026-0033', notes: 'Pago completo', daysBack: 17 },
      ],
    },
  ]);

  // ── Papeleria: 5 POs ──
  await createPurchasesForTenant(prisma, ctx, 'papeleria', [
    { status: 'DRAFT', paymentStatus: 'UNPAID', daysBack: 4, itemCount: 3 },
    { status: 'SENT', paymentStatus: 'UNPAID', daysBack: 10, itemCount: 2 },
    {
      status: 'CONFIRMED', paymentStatus: 'PARTIALLY_PAID', daysBack: 14, itemCount: 3,
      payments: [
        { fraction: 0.4, method: 'BANK_TRANSFER', reference: 'TRF-PC-0055', notes: 'Anticipo 40%', daysBack: 13 },
      ],
    },
    {
      status: 'RECEIVED', paymentStatus: 'PAID', daysBack: 26, itemCount: 4,
      payments: [
        { fraction: 1, method: 'CASH', reference: 'REC-PC-0012', notes: 'Pago contra entrega', daysBack: 23 },
      ],
    },
    {
      status: 'CANCELLED', paymentStatus: 'UNPAID', daysBack: 21, itemCount: 2,
      notes: 'Cancelada - error en cantidades solicitadas',
    },
  ]);

  console.log('   Purchase orders seeded (25 POs, 15 payments)');
}
