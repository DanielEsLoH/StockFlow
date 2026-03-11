import type { PrismaClient } from '@prisma/client';
import type { SeedContext } from './types';
import {
  daysAgo,
  padNumber,
  TENANT_PREFIX,
} from './helpers';

// ============================================================================
// EXPENSE SEEDER
// ============================================================================

type ExpenseCategory =
  | 'SERVICIOS_PUBLICOS' | 'ARRIENDO' | 'HONORARIOS' | 'SEGUROS'
  | 'PAPELERIA' | 'MANTENIMIENTO' | 'TRANSPORTE' | 'PUBLICIDAD'
  | 'IMPUESTOS_TASAS' | 'ASEO_CAFETERIA' | 'OTROS';

type ExpenseStatus = 'DRAFT' | 'APPROVED' | 'PAID' | 'CANCELLED';
type PaymentMethod = 'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'BANK_TRANSFER' | 'PSE' | 'NEQUI' | 'DAVIPLATA' | 'OTHER';

interface ExpenseSpec {
  category: ExpenseCategory;
  description: string;
  subtotal: number;
  taxRate: number;
  reteFuente: number;
  status: ExpenseStatus;
  daysBack: number;
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  invoiceNumber?: string;
  notes?: string;
  useSupplier?: boolean;    // link to a random supplier
  supplierIndex?: number;   // specific supplier index
  accountCode?: string;     // link to account via ctx.accounts
  costCenterCode?: string;  // link to cost center via ctx.costCenters
}

function computeExpenseAmounts(subtotal: number, taxRate: number, reteFuente: number) {
  const tax = Math.round(subtotal * taxRate / 100);
  const total = subtotal + tax - reteFuente;
  return { tax, total };
}

async function createExpensesForTenant(
  prisma: PrismaClient,
  ctx: SeedContext,
  tenantKey: 'demo' | 'distribuidora' | 'nuevo' | 'papeleria',
  specs: ExpenseSpec[],
) {
  const tenant = ctx.tenants[tenantKey];
  const prefix = `GAS-${TENANT_PREFIX[tenant.slug]}`;
  const suppliers = ctx.suppliers[tenantKey];
  const counters = ctx.counters[tenantKey];

  const createdById =
    tenantKey === 'demo'
      ? ctx.users.demo.admin.id
      : tenantKey === 'distribuidora'
        ? ctx.users.distribuidora.admin.id
        : tenantKey === 'nuevo'
          ? ctx.users.nuevo.admin.id
          : ctx.users.papeleria.admin.id;

  // Approver: admin or manager
  const approvedById =
    tenantKey === 'demo'
      ? ctx.users.demo.managers[0]?.id ?? ctx.users.demo.admin.id
      : tenantKey === 'distribuidora'
        ? ctx.users.distribuidora.manager.id
        : tenantKey === 'papeleria'
          ? ctx.users.papeleria.manager.id
          : createdById;

  for (const spec of specs) {
    counters.expense++;
    const expenseNumber = `${prefix}-${padNumber(counters.expense)}`;
    const issueDate = daysAgo(spec.daysBack);
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + 30);

    const { tax, total } = computeExpenseAmounts(spec.subtotal, spec.taxRate, spec.reteFuente);

    // Resolve optional relations
    let supplierId: string | null = null;
    if (spec.useSupplier && suppliers.length > 0) {
      const idx = spec.supplierIndex ?? 0;
      supplierId = suppliers[idx % suppliers.length].id;
    }

    let accountId: string | null = null;
    if (spec.accountCode) {
      accountId = ctx.accounts.get(`${tenant.id}:${spec.accountCode}`) ?? null;
    }

    let costCenterId: string | null = null;
    if (spec.costCenterCode) {
      costCenterId = ctx.costCenters.get(`${tenant.id}:${spec.costCenterCode}`) ?? null;
    }

    // Payment fields
    const isPaid = spec.status === 'PAID';
    const paymentDate = isPaid ? daysAgo(Math.max(0, spec.daysBack - 3)) : null;
    const paymentMethod = isPaid ? (spec.paymentMethod ?? 'BANK_TRANSFER') : null;
    const paymentReference = isPaid ? (spec.paymentReference ?? `PAG-${expenseNumber}`) : null;

    // Approval fields
    const isApprovedOrPaid = spec.status === 'APPROVED' || spec.status === 'PAID';
    const approvedAt = isApprovedOrPaid ? daysAgo(Math.max(0, spec.daysBack - 1)) : null;

    await prisma.expense.create({
      data: {
        tenantId: tenant.id,
        expenseNumber,
        category: spec.category,
        description: spec.description,
        supplierId,
        accountId,
        costCenterId,
        subtotal: spec.subtotal,
        taxRate: spec.taxRate,
        tax,
        reteFuente: spec.reteFuente,
        total,
        status: spec.status,
        paymentMethod,
        paymentReference,
        paymentDate,
        issueDate,
        dueDate,
        invoiceNumber: spec.invoiceNumber ?? null,
        approvedAt,
        approvedById: isApprovedOrPaid ? approvedById : null,
        createdById,
        notes: spec.notes ?? null,
      },
    });
  }
}

export async function seedExpenses(prisma: PrismaClient, ctx: SeedContext): Promise<void> {
  console.log('   Seeding expenses...');

  // ── Demo: 15 expenses covering ALL 11 categories and all 4 statuses ──
  await createExpensesForTenant(prisma, ctx, 'demo', [
    // SERVICIOS_PUBLICOS (2) - PAID
    {
      category: 'SERVICIOS_PUBLICOS', description: 'Energía eléctrica febrero 2026',
      subtotal: 850000, taxRate: 0, reteFuente: 0, status: 'PAID', daysBack: 15,
      paymentMethod: 'PSE', paymentReference: 'PSE-ENE-2026-4521',
      invoiceNumber: 'ENEL-2026-02-8844', useSupplier: true, supplierIndex: 0,
      accountCode: '513525', costCenterCode: 'ADM',
      notes: 'Consumo mensual sede principal',
    },
    {
      category: 'SERVICIOS_PUBLICOS', description: 'Acueducto y alcantarillado febrero 2026',
      subtotal: 320000, taxRate: 0, reteFuente: 0, status: 'PAID', daysBack: 14,
      paymentMethod: 'PSE', paymentReference: 'PSE-AGU-2026-1102',
      invoiceNumber: 'AAA-2026-02-5561', useSupplier: true, supplierIndex: 1,
      accountCode: '513530',
      notes: 'Consumo mensual agua',
    },
    // ARRIENDO - PAID
    {
      category: 'ARRIENDO', description: 'Arriendo local comercial marzo 2026',
      subtotal: 4500000, taxRate: 0, reteFuente: 157500, status: 'PAID', daysBack: 5,
      paymentMethod: 'BANK_TRANSFER', paymentReference: 'TRF-ARR-2026-0301',
      invoiceNumber: 'ARR-2026-03', useSupplier: true, supplierIndex: 2,
      accountCode: '512010', costCenterCode: 'ADM',
      notes: 'Canon de arrendamiento mensual - reteFuente 3.5%',
    },
    // HONORARIOS (2) - APPROVED and PAID
    {
      category: 'HONORARIOS', description: 'Asesoría contable mensual febrero 2026',
      subtotal: 2000000, taxRate: 19, reteFuente: 220000, status: 'PAID', daysBack: 12,
      paymentMethod: 'BANK_TRANSFER', paymentReference: 'TRF-HON-2026-0215',
      invoiceNumber: 'CONT-2026-02-001', useSupplier: true, supplierIndex: 0,
      accountCode: '511025', costCenterCode: 'ADM',
      notes: 'Honorarios contador - reteFuente 11%',
    },
    {
      category: 'HONORARIOS', description: 'Asesoría legal revisión contratos',
      subtotal: 3500000, taxRate: 19, reteFuente: 385000, status: 'APPROVED', daysBack: 8,
      useSupplier: true, supplierIndex: 1,
      accountCode: '511020',
      notes: 'Revisión de contratos laborales y comerciales',
    },
    // SEGUROS - APPROVED
    {
      category: 'SEGUROS', description: 'Seguro todo riesgo local comercial 2026',
      subtotal: 2800000, taxRate: 0, reteFuente: 0, status: 'APPROVED', daysBack: 20,
      accountCode: '513005',
      notes: 'Póliza anual todo riesgo - vigencia ene-dic 2026',
    },
    // PAPELERIA - PAID
    {
      category: 'PAPELERIA', description: 'Suministros de oficina - resmas, tóner, carpetas',
      subtotal: 450000, taxRate: 19, reteFuente: 0, status: 'PAID', daysBack: 10,
      paymentMethod: 'CASH', paymentReference: 'REC-PAP-0045',
      accountCode: '519530', costCenterCode: 'OPE',
      notes: 'Compra mensual papelería',
    },
    // MANTENIMIENTO - APPROVED
    {
      category: 'MANTENIMIENTO', description: 'Mantenimiento preventivo equipos de cómputo',
      subtotal: 1200000, taxRate: 19, reteFuente: 48000, status: 'APPROVED', daysBack: 18,
      useSupplier: true, supplierIndex: 2,
      accountCode: '524005', costCenterCode: 'OPE',
      notes: 'Mantenimiento trimestral servidores y equipos - reteFuente 4%',
    },
    // TRANSPORTE - PAID
    {
      category: 'TRANSPORTE', description: 'Flete envío mercancía Bogotá-Medellín',
      subtotal: 680000, taxRate: 19, reteFuente: 6800, status: 'PAID', daysBack: 6,
      paymentMethod: 'NEQUI', paymentReference: 'NEQ-FLT-2026-0304',
      useSupplier: true, supplierIndex: 0,
      accountCode: '524010', costCenterCode: 'OPE',
      notes: 'Flete nacional - reteFuente 1%',
    },
    // PUBLICIDAD - DRAFT
    {
      category: 'PUBLICIDAD', description: 'Campaña Google Ads marzo 2026',
      subtotal: 1500000, taxRate: 19, reteFuente: 0, status: 'DRAFT', daysBack: 2,
      accountCode: '522010',
      notes: 'Presupuesto campaña SEM - pendiente aprobación',
    },
    // IMPUESTOS_TASAS - PAID
    {
      category: 'IMPUESTOS_TASAS', description: 'ICA bimestral enero-febrero 2026',
      subtotal: 980000, taxRate: 0, reteFuente: 0, status: 'PAID', daysBack: 8,
      paymentMethod: 'PSE', paymentReference: 'PSE-ICA-2026-BIM01',
      accountCode: '511505',
      notes: 'Impuesto de industria y comercio - periodo ene-feb',
    },
    // ASEO_CAFETERIA - PAID
    {
      category: 'ASEO_CAFETERIA', description: 'Servicio de aseo y cafetería febrero 2026',
      subtotal: 350000, taxRate: 19, reteFuente: 7000, status: 'PAID', daysBack: 11,
      paymentMethod: 'CASH', paymentReference: 'REC-ASE-0022',
      useSupplier: true, supplierIndex: 1,
      accountCode: '519525', costCenterCode: 'ADM',
      notes: 'Servicio quincenal aseo integral - reteFuente 2%',
    },
    // OTROS - CANCELLED
    {
      category: 'OTROS', description: 'Capacitación equipo ventas - técnicas de negociación',
      subtotal: 5000000, taxRate: 19, reteFuente: 0, status: 'CANCELLED', daysBack: 25,
      accountCode: '519520',
      notes: 'Cancelada - se reprogramó para el próximo trimestre',
    },
    // Extra PAID for variety
    {
      category: 'SERVICIOS_PUBLICOS', description: 'Internet fibra óptica febrero 2026',
      subtotal: 280000, taxRate: 19, reteFuente: 0, status: 'PAID', daysBack: 13,
      paymentMethod: 'DEBIT_CARD', paymentReference: 'DEB-INT-2026-02',
      invoiceNumber: 'ISP-2026-02-3345',
      accountCode: '513535', costCenterCode: 'ADM',
    },
    // Extra DRAFT
    {
      category: 'MANTENIMIENTO', description: 'Reparación sistema aire acondicionado',
      subtotal: 750000, taxRate: 19, reteFuente: 30000, status: 'DRAFT', daysBack: 1,
      useSupplier: true, supplierIndex: 2,
      accountCode: '524005',
      notes: 'Borrador - pendiente cotización adicional',
    },
  ]);

  // ── Distribuidora: 10 expenses covering 8+ categories ──
  await createExpensesForTenant(prisma, ctx, 'distribuidora', [
    {
      category: 'ARRIENDO', description: 'Arriendo bodega principal marzo 2026',
      subtotal: 6500000, taxRate: 0, reteFuente: 227500, status: 'PAID', daysBack: 5,
      paymentMethod: 'BANK_TRANSFER', paymentReference: 'TRF-DN-ARR-0301',
      accountCode: '512010', costCenterCode: 'ADM',
    },
    {
      category: 'SERVICIOS_PUBLICOS', description: 'Energía eléctrica bodega febrero',
      subtotal: 1800000, taxRate: 0, reteFuente: 0, status: 'PAID', daysBack: 14,
      paymentMethod: 'PSE', paymentReference: 'PSE-DN-ENE-0201',
      accountCode: '513525',
    },
    {
      category: 'TRANSPORTE', description: 'Fletes distribución nacional febrero',
      subtotal: 3200000, taxRate: 19, reteFuente: 32000, status: 'PAID', daysBack: 10,
      paymentMethod: 'BANK_TRANSFER', paymentReference: 'TRF-DN-FLT-0210',
      useSupplier: true, supplierIndex: 0,
      accountCode: '524010', costCenterCode: 'OPE',
    },
    {
      category: 'HONORARIOS', description: 'Asesoría tributaria declaración renta',
      subtotal: 4000000, taxRate: 19, reteFuente: 440000, status: 'APPROVED', daysBack: 8,
      useSupplier: true, supplierIndex: 1,
      accountCode: '511025',
    },
    {
      category: 'SEGUROS', description: 'Seguro mercancía en tránsito 2026',
      subtotal: 3500000, taxRate: 0, reteFuente: 0, status: 'PAID', daysBack: 30,
      paymentMethod: 'BANK_TRANSFER', paymentReference: 'TRF-DN-SEG-0115',
      accountCode: '513005',
    },
    {
      category: 'MANTENIMIENTO', description: 'Mantenimiento flota vehículos febrero',
      subtotal: 2100000, taxRate: 19, reteFuente: 84000, status: 'PAID', daysBack: 12,
      paymentMethod: 'CREDIT_CARD', paymentReference: 'TC-DN-MAN-0212',
      useSupplier: true, supplierIndex: 2,
      accountCode: '524005', costCenterCode: 'OPE',
    },
    {
      category: 'PUBLICIDAD', description: 'Material POP y publicidad impresa',
      subtotal: 1200000, taxRate: 19, reteFuente: 0, status: 'APPROVED', daysBack: 6,
      accountCode: '522010',
    },
    {
      category: 'IMPUESTOS_TASAS', description: 'ICA bimestral ene-feb 2026',
      subtotal: 2400000, taxRate: 0, reteFuente: 0, status: 'PAID', daysBack: 9,
      paymentMethod: 'PSE', paymentReference: 'PSE-DN-ICA-BIM01',
      accountCode: '511505',
    },
    {
      category: 'PAPELERIA', description: 'Suministros oficina y empaque',
      subtotal: 680000, taxRate: 19, reteFuente: 0, status: 'PAID', daysBack: 11,
      paymentMethod: 'CASH', paymentReference: 'REC-DN-PAP-008',
      accountCode: '519530',
    },
    {
      category: 'OTROS', description: 'Evento corporativo lanzamiento producto',
      subtotal: 8000000, taxRate: 19, reteFuente: 0, status: 'DRAFT', daysBack: 3,
      notes: 'Pendiente aprobación dirección general',
    },
  ]);

  // ── Nuevo: 3 expenses ──
  await createExpensesForTenant(prisma, ctx, 'nuevo', [
    {
      category: 'ARRIENDO', description: 'Arriendo espacio coworking marzo 2026',
      subtotal: 800000, taxRate: 0, reteFuente: 28000, status: 'PAID', daysBack: 5,
      paymentMethod: 'NEQUI', paymentReference: 'NEQ-NN-ARR-0301',
    },
    {
      category: 'PUBLICIDAD', description: 'Campaña redes sociales Instagram/Facebook',
      subtotal: 350000, taxRate: 19, reteFuente: 0, status: 'DRAFT', daysBack: 2,
      notes: 'Borrador - definir segmentación',
    },
    {
      category: 'OTROS', description: 'Registro marca ante SIC',
      subtotal: 1200000, taxRate: 0, reteFuente: 0, status: 'PAID', daysBack: 20,
      paymentMethod: 'PSE', paymentReference: 'PSE-NN-SIC-2026',
    },
  ]);

  // ── Papeleria: 8 expenses covering 7+ categories ──
  await createExpensesForTenant(prisma, ctx, 'papeleria', [
    {
      category: 'ARRIENDO', description: 'Arriendo local papelería marzo 2026',
      subtotal: 3200000, taxRate: 0, reteFuente: 112000, status: 'PAID', daysBack: 5,
      paymentMethod: 'BANK_TRANSFER', paymentReference: 'TRF-PC-ARR-0301',
      accountCode: '512010', costCenterCode: 'ADM',
    },
    {
      category: 'SERVICIOS_PUBLICOS', description: 'Energía eléctrica febrero 2026',
      subtotal: 420000, taxRate: 0, reteFuente: 0, status: 'PAID', daysBack: 13,
      paymentMethod: 'PSE', paymentReference: 'PSE-PC-ENE-0213',
      accountCode: '513525',
    },
    {
      category: 'HONORARIOS', description: 'Servicio contabilidad mensual',
      subtotal: 1500000, taxRate: 19, reteFuente: 165000, status: 'PAID', daysBack: 10,
      paymentMethod: 'BANK_TRANSFER', paymentReference: 'TRF-PC-HON-0210',
      useSupplier: true, supplierIndex: 0,
      accountCode: '511025',
    },
    {
      category: 'TRANSPORTE', description: 'Envío pedidos a domicilio febrero',
      subtotal: 280000, taxRate: 19, reteFuente: 2800, status: 'PAID', daysBack: 7,
      paymentMethod: 'CASH', paymentReference: 'REC-PC-FLT-015',
      accountCode: '524010', costCenterCode: 'OPE',
    },
    {
      category: 'PUBLICIDAD', description: 'Volantes y pendones promoción escolar',
      subtotal: 650000, taxRate: 19, reteFuente: 0, status: 'APPROVED', daysBack: 4,
      accountCode: '522010',
    },
    {
      category: 'MANTENIMIENTO', description: 'Mantenimiento impresora plotter',
      subtotal: 380000, taxRate: 19, reteFuente: 15200, status: 'PAID', daysBack: 16,
      paymentMethod: 'DAVIPLATA', paymentReference: 'DVP-PC-MAN-0216',
      useSupplier: true, supplierIndex: 1,
      accountCode: '524005',
    },
    {
      category: 'ASEO_CAFETERIA', description: 'Servicio aseo local febrero',
      subtotal: 200000, taxRate: 19, reteFuente: 4000, status: 'PAID', daysBack: 11,
      paymentMethod: 'CASH', paymentReference: 'REC-PC-ASE-006',
      accountCode: '519525',
    },
    {
      category: 'OTROS', description: 'Licencia software punto de venta',
      subtotal: 250000, taxRate: 19, reteFuente: 0, status: 'DRAFT', daysBack: 1,
      notes: 'Pendiente renovación anual',
    },
  ]);

  console.log('   Expenses seeded (36 total)');
}
