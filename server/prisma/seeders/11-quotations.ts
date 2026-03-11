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
// QUOTATION SEEDER
// ============================================================================

type QuotationStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED';
type TaxCategory = 'GRAVADO_19' | 'GRAVADO_5' | 'EXENTO' | 'EXCLUIDO';

interface QuotationSpec {
  status: QuotationStatus;
  daysBack: number;
  itemCount: number;
  convertedInvoiceIndex?: number; // index into ctx.invoices for CONVERTED
  notes?: string;
}

function taxCategoryFromRate(rate: number): TaxCategory {
  if (rate === 19) return 'GRAVADO_19';
  if (rate === 5) return 'GRAVADO_5';
  if (rate === 0) return 'EXENTO';
  return 'EXCLUIDO';
}

function buildQuotationItems(
  products: SeedContext['products']['demo'],
  itemCount: number,
) {
  const selected = pickRandomN(products, itemCount);
  return selected.map((p) => {
    const quantity = randomInt(1, 5);
    const amounts = computeLineAmounts(quantity, p.salePrice, p.taxRate);
    return {
      productId: p.id,
      quantity,
      unitPrice: p.salePrice,
      taxRate: p.taxRate,
      taxCategory: taxCategoryFromRate(p.taxRate),
      discount: 0,
      subtotal: amounts.subtotal,
      tax: amounts.tax,
      total: amounts.total,
    };
  });
}

async function createQuotationsForTenant(
  prisma: PrismaClient,
  ctx: SeedContext,
  tenantKey: 'demo' | 'distribuidora' | 'nuevo' | 'papeleria',
  specs: QuotationSpec[],
) {
  const tenant = ctx.tenants[tenantKey];
  const prefix = `COT-${TENANT_PREFIX[tenant.slug]}`;
  const products = ctx.products[tenantKey];
  const customers = ctx.customers[tenantKey];
  const counters = ctx.counters[tenantKey];

  // Pick a user for the quotations
  const userId =
    tenantKey === 'demo'
      ? pickRandom(ctx.users.demo.allActive).id
      : tenantKey === 'distribuidora'
        ? ctx.users.distribuidora.admin.id
        : tenantKey === 'nuevo'
          ? ctx.users.nuevo.admin.id
          : ctx.users.papeleria.admin.id;

  for (const spec of specs) {
    counters.quotation++;
    const quotationNumber = `${prefix}-${padNumber(counters.quotation)}`;
    const issueDate = daysAgo(spec.daysBack);

    // validUntil = issueDate + 30 days, but for EXPIRED move it to the past
    const validUntil = new Date(issueDate);
    if (spec.status === 'EXPIRED') {
      validUntil.setDate(validUntil.getDate() + 15); // already past since daysBack > 15
    } else {
      validUntil.setDate(validUntil.getDate() + 30);
    }

    const customer = pickRandom(customers);
    const items = buildQuotationItems(products, spec.itemCount);
    const totals = sumDocumentTotals(items);

    // Converted quotations link to an invoice
    let convertedToInvoiceId: string | undefined;
    let convertedAt: Date | undefined;
    if (spec.status === 'CONVERTED' && spec.convertedInvoiceIndex !== undefined) {
      const invoices = ctx.invoices[tenantKey];
      if (invoices[spec.convertedInvoiceIndex]) {
        convertedToInvoiceId = invoices[spec.convertedInvoiceIndex].id;
        convertedAt = daysAgo(Math.max(0, spec.daysBack - 5));
      }
    }

    await prisma.quotation.create({
      data: {
        tenantId: tenant.id,
        customerId: customer.id,
        userId,
        quotationNumber,
        subtotal: totals.subtotal,
        tax: totals.tax,
        discount: 0,
        total: totals.total,
        totalInBaseCurrency: totals.total,
        issueDate,
        validUntil,
        status: spec.status,
        notes: spec.notes ?? null,
        convertedToInvoiceId: convertedToInvoiceId ?? null,
        convertedAt: convertedAt ?? null,
        items: {
          create: items,
        },
      },
    });
  }
}

export async function seedQuotations(prisma: PrismaClient, ctx: SeedContext): Promise<void> {
  console.log('   Seeding quotations...');

  // ── Demo: 12 quotations covering all 6 statuses (2 each) ──
  await createQuotationsForTenant(prisma, ctx, 'demo', [
    // DRAFT (2)
    { status: 'DRAFT', daysBack: 2, itemCount: 2, notes: 'Borrador - pendiente revisión de precios' },
    { status: 'DRAFT', daysBack: 1, itemCount: 1, notes: 'Borrador - cliente solicitó cotización por teléfono' },
    // SENT (2)
    { status: 'SENT', daysBack: 10, itemCount: 3, notes: 'Enviada al cliente por correo electrónico' },
    { status: 'SENT', daysBack: 7, itemCount: 2, notes: 'Enviada - esperando respuesta del cliente' },
    // ACCEPTED (2)
    { status: 'ACCEPTED', daysBack: 20, itemCount: 2, notes: 'Aceptada - proceder con facturación' },
    { status: 'ACCEPTED', daysBack: 15, itemCount: 3, notes: 'Aceptada por el cliente el 2026-02-25' },
    // REJECTED (2)
    { status: 'REJECTED', daysBack: 25, itemCount: 1, notes: 'Rechazada - cliente encontró mejor precio' },
    { status: 'REJECTED', daysBack: 18, itemCount: 2, notes: 'Rechazada - presupuesto insuficiente del cliente' },
    // EXPIRED (2)
    { status: 'EXPIRED', daysBack: 60, itemCount: 2, notes: 'Expirada - sin respuesta del cliente' },
    { status: 'EXPIRED', daysBack: 50, itemCount: 1, notes: 'Expirada - cliente no se comunicó nuevamente' },
    // CONVERTED (2) - linked to first 2 demo invoices
    { status: 'CONVERTED', daysBack: 30, itemCount: 3, convertedInvoiceIndex: 0, notes: 'Convertida a factura' },
    { status: 'CONVERTED', daysBack: 22, itemCount: 2, convertedInvoiceIndex: 1, notes: 'Convertida a factura exitosamente' },
  ]);

  // ── Distribuidora: 8 quotations ──
  await createQuotationsForTenant(prisma, ctx, 'distribuidora', [
    { status: 'DRAFT', daysBack: 3, itemCount: 2 },
    { status: 'SENT', daysBack: 12, itemCount: 3 },
    { status: 'SENT', daysBack: 8, itemCount: 2 },
    { status: 'ACCEPTED', daysBack: 18, itemCount: 2 },
    { status: 'REJECTED', daysBack: 22, itemCount: 1 },
    { status: 'EXPIRED', daysBack: 55, itemCount: 2 },
    { status: 'CONVERTED', daysBack: 28, itemCount: 3, convertedInvoiceIndex: 0 },
    { status: 'CONVERTED', daysBack: 20, itemCount: 2, convertedInvoiceIndex: 1 },
  ]);

  // ── Nuevo: 3 quotations ──
  await createQuotationsForTenant(prisma, ctx, 'nuevo', [
    { status: 'DRAFT', daysBack: 5, itemCount: 1 },
    { status: 'SENT', daysBack: 10, itemCount: 2 },
    { status: 'ACCEPTED', daysBack: 14, itemCount: 1 },
  ]);

  // ── Papeleria: 6 quotations ──
  await createQuotationsForTenant(prisma, ctx, 'papeleria', [
    { status: 'DRAFT', daysBack: 4, itemCount: 2 },
    { status: 'SENT', daysBack: 9, itemCount: 1 },
    { status: 'ACCEPTED', daysBack: 16, itemCount: 2 },
    { status: 'REJECTED', daysBack: 24, itemCount: 1 },
    { status: 'EXPIRED', daysBack: 52, itemCount: 2 },
    { status: 'CONVERTED', daysBack: 26, itemCount: 3, convertedInvoiceIndex: 0 },
  ]);

  console.log('   Quotations seeded (29 total)');
}
