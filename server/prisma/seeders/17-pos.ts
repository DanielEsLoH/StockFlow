import { PrismaClient } from '@prisma/client';
import { SeedContext, ProductRecord } from './types';
import { daysAgo, pickRandom, randomInt } from './helpers';

// ============================================================================
// POS (POINT OF SALE) SEEDER
// ============================================================================

export async function seedPOS(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<void> {
  console.log('🏪 Seeding POS data...');

  // ── Cash Registers ───────────────────────────────────────────────
  console.log('  → Creating cash registers...');

  // Demo: 2 registers
  const demoCaja1 = await prisma.cashRegister.create({
    data: {
      tenantId: ctx.tenants.demo.id,
      warehouseId: ctx.warehouses.demo.main.id,
      name: 'Caja Principal',
      code: 'CAJA-01',
      status: 'OPEN',
    },
  });

  const demoCaja2 = await prisma.cashRegister.create({
    data: {
      tenantId: ctx.tenants.demo.id,
      warehouseId: ctx.warehouses.demo.store.id,
      name: 'Caja Tienda',
      code: 'CAJA-02',
      status: 'CLOSED',
    },
  });

  // Distribuidora: 1 register
  const distCaja1 = await prisma.cashRegister.create({
    data: {
      tenantId: ctx.tenants.distribuidora.id,
      warehouseId: ctx.warehouses.distribuidora.main.id,
      name: 'Caja Bodega Central',
      code: 'CAJA-01',
      status: 'CLOSED',
    },
  });

  console.log('    ✓ 3 cash registers created (2 demo, 1 distribuidora)');

  // ── POS Sessions ─────────────────────────────────────────────────
  console.log('  → Creating POS sessions...');

  let posSaleCounter = 0;

  // Demo Session 1: CLOSED — yesterday, Caja Principal
  const demoSession1 = await prisma.pOSSession.create({
    data: {
      tenantId: ctx.tenants.demo.id,
      cashRegisterId: demoCaja1.id,
      userId: ctx.users.demo.employees[0]?.id ?? ctx.users.demo.admin.id,
      status: 'CLOSED',
      openingAmount: 200000,
      closingAmount: 1850000,
      expectedAmount: 1870000,
      difference: -20000,
      openedAt: daysAgo(1),
      closedAt: new Date(daysAgo(1).getTime() + 10 * 60 * 60 * 1000), // 10 hours later
      notes: 'Turno mañana. Diferencia de $20.000 por error en vueltas.',
    },
  });

  // Demo Session 2: ACTIVE — today, Caja Principal (current open session)
  const demoSession2 = await prisma.pOSSession.create({
    data: {
      tenantId: ctx.tenants.demo.id,
      cashRegisterId: demoCaja1.id,
      userId: ctx.users.demo.employees[1]?.id ?? ctx.users.demo.admin.id,
      status: 'ACTIVE',
      openingAmount: 200000,
      openedAt: new Date(),
      notes: 'Turno tarde.',
    },
  });

  // Demo Session 3: CLOSED — 3 days ago, Caja Tienda
  const demoSession3 = await prisma.pOSSession.create({
    data: {
      tenantId: ctx.tenants.demo.id,
      cashRegisterId: demoCaja2.id,
      userId: ctx.users.demo.managers[0]?.id ?? ctx.users.demo.admin.id,
      status: 'CLOSED',
      openingAmount: 150000,
      closingAmount: 980000,
      expectedAmount: 980000,
      difference: 0,
      openedAt: daysAgo(3),
      closedAt: new Date(daysAgo(3).getTime() + 8 * 60 * 60 * 1000),
      notes: 'Cierre cuadrado sin diferencia.',
    },
  });

  // Distribuidora Session 1: CLOSED — 2 days ago
  const distSession1 = await prisma.pOSSession.create({
    data: {
      tenantId: ctx.tenants.distribuidora.id,
      cashRegisterId: distCaja1.id,
      userId: ctx.users.distribuidora.employees[0]?.id ?? ctx.users.distribuidora.admin.id,
      status: 'CLOSED',
      openingAmount: 300000,
      closingAmount: 2450000,
      expectedAmount: 2480000,
      difference: -30000,
      openedAt: daysAgo(2),
      closedAt: new Date(daysAgo(2).getTime() + 9 * 60 * 60 * 1000),
      notes: 'Venta mayorista. Diferencia por redondeo en vueltas.',
    },
  });

  console.log('    ✓ 4 POS sessions created (3 demo, 1 distribuidora)');

  // ── Helper: Create POS Sale with its own invoice ─────────────────

  async function createPOSSale(config: {
    tenantId: string;
    sessionId: string;
    products: ProductRecord[];
    userId: string;
    warehouseId: string;
    customerId?: string;
    paymentMethod: 'CASH' | 'CARD' | 'MIXED';
    salePrefix: string;
    createdAt: Date;
  }) {
    posSaleCounter++;
    const saleNumber = `POS-${config.salePrefix}-${String(posSaleCounter).padStart(5, '0')}`;

    // Pick 1-3 random products for the sale
    const numItems = randomInt(1, 3);
    const selectedProducts: ProductRecord[] = [];
    const usedIdx = new Set<number>();
    for (let i = 0; i < numItems && i < config.products.length; i++) {
      let idx: number;
      do {
        idx = randomInt(0, config.products.length - 1);
      } while (usedIdx.has(idx));
      usedIdx.add(idx);
      selectedProducts.push(config.products[idx]);
    }

    const items = selectedProducts.map((p) => {
      const quantity = randomInt(1, 5);
      const subtotal = quantity * p.salePrice;
      const tax = Math.round((subtotal * p.taxRate) / 100);
      return { productId: p.id, quantity, unitPrice: p.salePrice, taxRate: p.taxRate, subtotal, tax, total: subtotal + tax };
    });

    const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
    const taxTotal = items.reduce((s, i) => s + i.tax, 0);
    const total = subtotal + taxTotal;

    // Create the backing invoice (source: POS)
    const invoice = await prisma.invoice.create({
      data: {
        tenantId: config.tenantId,
        customerId: config.customerId ?? null,
        userId: config.userId,
        invoiceNumber: saleNumber,
        source: 'POS',
        subtotal,
        tax: taxTotal,
        discount: 0,
        total,
        issueDate: config.createdAt,
        dueDate: config.createdAt,
        status: 'SENT',
        paymentStatus: 'PAID',
        warehouseId: config.warehouseId,
        items: {
          create: items.map((it) => ({
            productId: it.productId,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            taxRate: it.taxRate,
            discount: 0,
            subtotal: it.subtotal,
            tax: it.tax,
            total: it.total,
          })),
        },
      },
    });

    // Create the POS sale
    const posSale = await prisma.pOSSale.create({
      data: {
        tenantId: config.tenantId,
        sessionId: config.sessionId,
        invoiceId: invoice.id,
        saleNumber,
        subtotal,
        tax: taxTotal,
        discount: 0,
        total,
        createdAt: config.createdAt,
      },
    });

    // Create sale payments
    if (config.paymentMethod === 'CASH') {
      await prisma.salePayment.create({
        data: {
          saleId: posSale.id,
          method: 'CASH',
          amount: total,
          reference: null,
        },
      });
    } else if (config.paymentMethod === 'CARD') {
      const method = pickRandom(['CREDIT_CARD', 'DEBIT_CARD'] as const);
      await prisma.salePayment.create({
        data: {
          saleId: posSale.id,
          method,
          amount: total,
          reference: `AUTH-${randomInt(100000, 999999)}`,
          cardLastFour: String(randomInt(1000, 9999)),
        },
      });
    } else {
      // MIXED — split between cash and card
      const cashPortion = Math.round(total * 0.6);
      const cardPortion = total - cashPortion;
      await prisma.salePayment.create({
        data: {
          saleId: posSale.id,
          method: 'CASH',
          amount: cashPortion,
        },
      });
      await prisma.salePayment.create({
        data: {
          saleId: posSale.id,
          method: 'DEBIT_CARD',
          amount: cardPortion,
          reference: `AUTH-${randomInt(100000, 999999)}`,
          cardLastFour: String(randomInt(1000, 9999)),
        },
      });
    }

    return posSale;
  }

  // ── POS Sales ────────────────────────────────────────────────────
  console.log('  → Creating POS sales...');

  const paymentTypes: ('CASH' | 'CARD' | 'MIXED')[] = ['CASH', 'CARD', 'MIXED'];
  const demoActiveCustomers = ctx.customers.demo.filter((c) => c.status === 'ACTIVE');

  // Session 1 (closed, yesterday): 6 sales
  for (let i = 0; i < 6; i++) {
    const hourOffset = (i + 1) * 1.5 * 60 * 60 * 1000; // spread across the day
    await createPOSSale({
      tenantId: ctx.tenants.demo.id,
      sessionId: demoSession1.id,
      products: ctx.products.demo,
      userId: ctx.users.demo.employees[0]?.id ?? ctx.users.demo.admin.id,
      warehouseId: ctx.warehouses.demo.main.id,
      customerId: i % 3 === 0 ? pickRandom(demoActiveCustomers)?.id : undefined, // some with customer
      paymentMethod: paymentTypes[i % 3],
      salePrefix: 'TD',
      createdAt: new Date(daysAgo(1).getTime() + hourOffset),
    });
  }

  // Session 2 (active, today): 3 sales so far
  for (let i = 0; i < 3; i++) {
    const hourOffset = (i + 1) * 2 * 60 * 60 * 1000;
    await createPOSSale({
      tenantId: ctx.tenants.demo.id,
      sessionId: demoSession2.id,
      products: ctx.products.demo,
      userId: ctx.users.demo.employees[1]?.id ?? ctx.users.demo.admin.id,
      warehouseId: ctx.warehouses.demo.main.id,
      customerId: i === 0 ? pickRandom(demoActiveCustomers)?.id : undefined,
      paymentMethod: paymentTypes[i % 3],
      salePrefix: 'TD',
      createdAt: new Date(new Date().getTime() - (3 - i) * 60 * 60 * 1000),
    });
  }

  // Session 3 (closed, 3 days ago): 4 sales
  for (let i = 0; i < 4; i++) {
    const hourOffset = (i + 1) * 2 * 60 * 60 * 1000;
    await createPOSSale({
      tenantId: ctx.tenants.demo.id,
      sessionId: demoSession3.id,
      products: ctx.products.demo,
      userId: ctx.users.demo.managers[0]?.id ?? ctx.users.demo.admin.id,
      warehouseId: ctx.warehouses.demo.store.id,
      paymentMethod: paymentTypes[i % 3],
      salePrefix: 'TD',
      createdAt: new Date(daysAgo(3).getTime() + hourOffset),
    });
  }

  // Distribuidora Session 1 (closed, 2 days ago): 5 sales
  const distActiveCustomers = ctx.customers.distribuidora.filter((c) => c.status === 'ACTIVE');
  for (let i = 0; i < 5; i++) {
    const hourOffset = (i + 1) * 1.5 * 60 * 60 * 1000;
    await createPOSSale({
      tenantId: ctx.tenants.distribuidora.id,
      sessionId: distSession1.id,
      products: ctx.products.distribuidora,
      userId: ctx.users.distribuidora.employees[0]?.id ?? ctx.users.distribuidora.admin.id,
      warehouseId: ctx.warehouses.distribuidora.main.id,
      customerId: i % 2 === 0 ? pickRandom(distActiveCustomers)?.id : undefined,
      paymentMethod: paymentTypes[i % 3],
      salePrefix: 'DN',
      createdAt: new Date(daysAgo(2).getTime() + hourOffset),
    });
  }

  console.log('    ✓ 18 POS sales created (13 demo, 5 distribuidora)');

  // ── Cash Register Movements ────────────────────────────────────
  console.log('  → Creating cash register movements...');

  // Session 1 (closed): OPENING + CASH_IN + CASH_OUT + CLOSING
  await prisma.cashRegisterMovement.createMany({
    data: [
      {
        tenantId: ctx.tenants.demo.id,
        sessionId: demoSession1.id,
        type: 'OPENING',
        amount: 200000,
        method: 'CASH',
        notes: 'Apertura de caja — base inicial turno mañana',
        createdAt: demoSession1.openedAt,
      },
      {
        tenantId: ctx.tenants.demo.id,
        sessionId: demoSession1.id,
        type: 'CASH_IN',
        amount: 100000,
        method: 'CASH',
        notes: 'Ingreso adicional para sencillo',
        createdAt: new Date(demoSession1.openedAt.getTime() + 3 * 60 * 60 * 1000),
      },
      {
        tenantId: ctx.tenants.demo.id,
        sessionId: demoSession1.id,
        type: 'CASH_OUT',
        amount: 500000,
        method: 'CASH',
        notes: 'Retiro parcial de efectivo — consignación bancaria',
        createdAt: new Date(demoSession1.openedAt.getTime() + 6 * 60 * 60 * 1000),
      },
      {
        tenantId: ctx.tenants.demo.id,
        sessionId: demoSession1.id,
        type: 'CLOSING',
        amount: 1850000,
        method: 'CASH',
        notes: 'Cierre de caja — diferencia de $20.000',
        createdAt: new Date(demoSession1.openedAt.getTime() + 10 * 60 * 60 * 1000),
      },
    ] as any,
  });

  // Session 2 (active): OPENING only
  await prisma.cashRegisterMovement.createMany({
    data: [
      {
        tenantId: ctx.tenants.demo.id,
        sessionId: demoSession2.id,
        type: 'OPENING',
        amount: 200000,
        method: 'CASH',
        notes: 'Apertura de caja — turno tarde',
        createdAt: demoSession2.openedAt,
      },
    ] as any,
  });

  // Session 3 (closed): OPENING + REFUND + CLOSING
  await prisma.cashRegisterMovement.createMany({
    data: [
      {
        tenantId: ctx.tenants.demo.id,
        sessionId: demoSession3.id,
        type: 'OPENING',
        amount: 150000,
        method: 'CASH',
        notes: 'Apertura de caja tienda',
        createdAt: demoSession3.openedAt,
      },
      {
        tenantId: ctx.tenants.demo.id,
        sessionId: demoSession3.id,
        type: 'REFUND',
        amount: 45000,
        method: 'CASH',
        notes: 'Devolución producto defectuoso — cliente #12',
        createdAt: new Date(demoSession3.openedAt.getTime() + 4 * 60 * 60 * 1000),
      },
      {
        tenantId: ctx.tenants.demo.id,
        sessionId: demoSession3.id,
        type: 'CLOSING',
        amount: 980000,
        method: 'CASH',
        notes: 'Cierre sin diferencia',
        createdAt: new Date(demoSession3.openedAt.getTime() + 8 * 60 * 60 * 1000),
      },
    ] as any,
  });

  // Distribuidora Session (closed): OPENING + CASH_OUT + CLOSING
  await prisma.cashRegisterMovement.createMany({
    data: [
      {
        tenantId: ctx.tenants.distribuidora.id,
        sessionId: distSession1.id,
        type: 'OPENING',
        amount: 300000,
        method: 'CASH',
        notes: 'Apertura de caja distribuidora',
        createdAt: distSession1.openedAt,
      },
      {
        tenantId: ctx.tenants.distribuidora.id,
        sessionId: distSession1.id,
        type: 'CASH_OUT',
        amount: 800000,
        method: 'CASH',
        notes: 'Retiro para pago a proveedor en efectivo',
        createdAt: new Date(distSession1.openedAt.getTime() + 5 * 60 * 60 * 1000),
      },
      {
        tenantId: ctx.tenants.distribuidora.id,
        sessionId: distSession1.id,
        type: 'CLOSING',
        amount: 2450000,
        method: 'CASH',
        notes: 'Cierre — diferencia $30.000 por redondeo',
        createdAt: new Date(distSession1.openedAt.getTime() + 9 * 60 * 60 * 1000),
      },
    ] as any,
  });

  console.log('    ✓ 12 cash register movements created');

  console.log('✅ POS seeded: 3 registers, 4 sessions, 18 sales, 12 movements');
}
