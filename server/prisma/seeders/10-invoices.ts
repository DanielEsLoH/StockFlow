import { PrismaClient } from '@prisma/client';
import { SeedContext, InvoiceRecord, ProductRecord, CustomerRecord } from './types';
import { daysAgo, randomInt, pickRandom } from './helpers';

// ============================================================================
// LOCAL HELPER — Creates a single tenant invoice with items
// ============================================================================

async function createTenantInvoice(
  prisma: PrismaClient,
  config: {
    tenantId: string;
    products: ProductRecord[];
    customers: CustomerRecord[];
    status: string;
    paymentStatus: string;
    daysAgoIssued: number;
    daysUntilDue?: number;
    userId: string;
    warehouseId: string;
    source?: string;
    invoicePrefix: string;
    counterRef: { value: number };
  },
): Promise<InvoiceRecord> {
  const numItems = randomInt(1, 4);
  const selected: ProductRecord[] = [];
  const used = new Set<number>();
  for (let i = 0; i < numItems && i < config.products.length; i++) {
    let idx: number;
    do {
      idx = randomInt(0, config.products.length - 1);
    } while (used.has(idx));
    used.add(idx);
    selected.push(config.products[idx]);
  }
  const items = selected.map((p) => {
    const quantity = randomInt(1, 5);
    const subtotal = quantity * p.salePrice;
    const tax = Math.round((subtotal * p.taxRate) / 100);
    return {
      productId: p.id,
      quantity,
      unitPrice: p.salePrice,
      taxRate: p.taxRate,
      subtotal,
      tax,
      total: subtotal + tax,
    };
  });
  const invSubtotal = items.reduce((s, i) => s + i.subtotal, 0);
  const invTax = items.reduce((s, i) => s + i.tax, 0);
  const invTotal = invSubtotal + invTax;
  const activeCustomers = config.customers.filter((c) => c.status === 'ACTIVE');
  const customer = pickRandom(
    activeCustomers.length > 0 ? activeCustomers : config.customers,
  );
  const issueDate = daysAgo(config.daysAgoIssued);
  const dueDate =
    config.daysUntilDue !== undefined
      ? new Date(
          issueDate.getTime() + config.daysUntilDue * 24 * 60 * 60 * 1000,
        )
      : new Date(issueDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  config.counterRef.value += 1;
  const invoiceNumber = `${config.invoicePrefix}-${String(config.counterRef.value).padStart(5, '0')}`;
  const invoice = await prisma.invoice.create({
    data: {
      tenantId: config.tenantId,
      customerId: customer.id,
      userId: config.userId,
      invoiceNumber,
      source: (config.source || 'MANUAL') as any,
      subtotal: invSubtotal,
      tax: invTax,
      discount: 0,
      total: invTotal,
      issueDate,
      dueDate,
      status: config.status as any,
      paymentStatus: config.paymentStatus as any,
      warehouseId: config.warehouseId,
      notes:
        config.status === 'VOID'
          ? 'Factura anulada por error en datos'
          : null,
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
  return {
    id: invoice.id,
    invoiceNumber,
    paymentStatus: config.paymentStatus,
    total: invTotal,
    customerId: customer.id,
    items: items.map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      taxRate: i.taxRate,
    })),
  };
}

// ============================================================================
// LOCAL HELPER — Creates payments for a list of invoices
// ============================================================================

const allPaymentMethods = [
  'CASH',
  'CREDIT_CARD',
  'DEBIT_CARD',
  'BANK_TRANSFER',
  'PSE',
  'NEQUI',
  'DAVIPLATA',
  'OTHER',
];

async function createPaymentsForInvoices(
  prisma: PrismaClient,
  tenantId: string,
  invoices: InvoiceRecord[],
  paymentCounter: { value: number },
): Promise<void> {
  for (const inv of invoices) {
    if (inv.paymentStatus === 'PAID') {
      const method =
        allPaymentMethods[paymentCounter.value % allPaymentMethods.length];
      await prisma.payment.create({
        data: {
          tenantId,
          invoiceId: inv.id,
          amount: inv.total,
          method: method as any,
          reference:
            method === 'BANK_TRANSFER'
              ? `TRF-${randomInt(100000, 999999)}`
              : method === 'PSE'
                ? `PSE-${randomInt(100000, 999999)}`
                : null,
          notes: method === 'OTHER' ? 'Pago en especie / trueque' : null,
          paymentDate: daysAgo(randomInt(1, 30)),
        },
      });
      paymentCounter.value++;
    } else if (inv.paymentStatus === 'PARTIALLY_PAID') {
      const partialAmount = Math.round(
        inv.total * (randomInt(30, 70) / 100),
      );
      const method =
        allPaymentMethods[paymentCounter.value % allPaymentMethods.length];
      await prisma.payment.create({
        data: {
          tenantId,
          invoiceId: inv.id,
          amount: partialAmount,
          method: method as any,
          reference: null,
          paymentDate: daysAgo(randomInt(5, 25)),
        },
      });
      paymentCounter.value++;
    }
  }
}

// ============================================================================
// MAIN SEEDER
// ============================================================================

export async function seedInvoices(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<void> {
  console.log('🧾 Creating Invoices...');

  // ── Demo Invoices (~55) ──
  const demoInvCounter = { value: 0 };
  const demoInvoices: InvoiceRecord[] = [];
  const demoInvCfgs: {
    status: string;
    paymentStatus: string;
    count: number;
    daysRange: [number, number];
    source?: string;
  }[] = [
    { status: 'SENT', paymentStatus: 'PAID', count: 18, daysRange: [5, 90] },
    {
      status: 'PENDING',
      paymentStatus: 'UNPAID',
      count: 10,
      daysRange: [1, 15],
    },
    {
      status: 'SENT',
      paymentStatus: 'UNPAID',
      count: 8,
      daysRange: [3, 20],
    },
    {
      status: 'SENT',
      paymentStatus: 'PARTIALLY_PAID',
      count: 5,
      daysRange: [5, 30],
    },
    {
      status: 'OVERDUE',
      paymentStatus: 'UNPAID',
      count: 4,
      daysRange: [35, 60],
    },
    {
      status: 'OVERDUE',
      paymentStatus: 'PARTIALLY_PAID',
      count: 2,
      daysRange: [40, 55],
    },
    {
      status: 'DRAFT',
      paymentStatus: 'UNPAID',
      count: 3,
      daysRange: [0, 3],
    },
    {
      status: 'CANCELLED',
      paymentStatus: 'UNPAID',
      count: 3,
      daysRange: [10, 30],
    },
    {
      status: 'VOID',
      paymentStatus: 'UNPAID',
      count: 2,
      daysRange: [15, 40],
    },
  ];
  for (const cfg of demoInvCfgs) {
    for (let i = 0; i < cfg.count; i++) {
      const inv = await createTenantInvoice(prisma, {
        tenantId: ctx.tenants.demo.id,
        products: ctx.products.demo,
        customers: ctx.customers.demo,
        status: cfg.status,
        paymentStatus: cfg.paymentStatus,
        daysAgoIssued: randomInt(cfg.daysRange[0], cfg.daysRange[1]),
        daysUntilDue: cfg.status === 'OVERDUE' ? -randomInt(1, 15) : 30,
        userId: pickRandom(ctx.users.demo.allActive).id,
        warehouseId: pickRandom(ctx.warehouses.demo.active).id,
        source: cfg.source || 'MANUAL',
        invoicePrefix: 'TD',
        counterRef: demoInvCounter,
      });
      demoInvoices.push(inv);
    }
  }

  // ── DN Invoices (25) ──
  const dnInvCounter = { value: 0 };
  const dnInvoices: InvoiceRecord[] = [];
  const dnInvUsers = [
    ctx.users.distribuidora.admin,
    ctx.users.distribuidora.manager,
    ...ctx.users.distribuidora.employees,
  ];
  const dnInvCfgs = [
    {
      status: 'SENT',
      paymentStatus: 'PAID',
      count: 10,
      daysRange: [5, 60] as [number, number],
    },
    {
      status: 'PENDING',
      paymentStatus: 'UNPAID',
      count: 5,
      daysRange: [1, 10] as [number, number],
    },
    {
      status: 'SENT',
      paymentStatus: 'UNPAID',
      count: 3,
      daysRange: [3, 15] as [number, number],
    },
    {
      status: 'SENT',
      paymentStatus: 'PARTIALLY_PAID',
      count: 2,
      daysRange: [5, 20] as [number, number],
    },
    {
      status: 'OVERDUE',
      paymentStatus: 'UNPAID',
      count: 2,
      daysRange: [35, 50] as [number, number],
    },
    {
      status: 'DRAFT',
      paymentStatus: 'UNPAID',
      count: 2,
      daysRange: [0, 2] as [number, number],
    },
    {
      status: 'CANCELLED',
      paymentStatus: 'UNPAID',
      count: 1,
      daysRange: [10, 20] as [number, number],
    },
  ];
  for (const cfg of dnInvCfgs) {
    for (let i = 0; i < cfg.count; i++) {
      const inv = await createTenantInvoice(prisma, {
        tenantId: ctx.tenants.distribuidora.id,
        products: ctx.products.distribuidora,
        customers: ctx.customers.distribuidora,
        status: cfg.status,
        paymentStatus: cfg.paymentStatus,
        daysAgoIssued: randomInt(cfg.daysRange[0], cfg.daysRange[1]),
        daysUntilDue: cfg.status === 'OVERDUE' ? -randomInt(1, 10) : 30,
        userId: pickRandom(dnInvUsers).id,
        warehouseId: pickRandom(ctx.warehouses.distribuidora.active).id,
        invoicePrefix: 'DN',
        counterRef: dnInvCounter,
      });
      dnInvoices.push(inv);
    }
  }

  // ── NN Invoices (8) ──
  const nnInvCounter = { value: 0 };
  const nnInvoices: InvoiceRecord[] = [];
  const nnInvCfgs = [
    {
      status: 'SENT',
      paymentStatus: 'PAID',
      count: 3,
      daysRange: [3, 20] as [number, number],
    },
    {
      status: 'PENDING',
      paymentStatus: 'UNPAID',
      count: 2,
      daysRange: [0, 5] as [number, number],
    },
    {
      status: 'SENT',
      paymentStatus: 'UNPAID',
      count: 2,
      daysRange: [2, 10] as [number, number],
    },
    {
      status: 'DRAFT',
      paymentStatus: 'UNPAID',
      count: 1,
      daysRange: [0, 1] as [number, number],
    },
  ];
  for (const cfg of nnInvCfgs) {
    for (let i = 0; i < cfg.count; i++) {
      const inv = await createTenantInvoice(prisma, {
        tenantId: ctx.tenants.nuevo.id,
        products: ctx.products.nuevo,
        customers: ctx.customers.nuevo,
        status: cfg.status,
        paymentStatus: cfg.paymentStatus,
        daysAgoIssued: randomInt(cfg.daysRange[0], cfg.daysRange[1]),
        userId: ctx.users.nuevo.admin.id,
        warehouseId: ctx.warehouses.nuevo.main.id,
        invoicePrefix: 'NN',
        counterRef: nnInvCounter,
      });
      nnInvoices.push(inv);
    }
  }

  // ── PC Invoices (20) ──
  const pcInvCounter = { value: 0 };
  const pcInvoices: InvoiceRecord[] = [];
  const pcInvUsers = [
    ctx.users.papeleria.admin,
    ctx.users.papeleria.manager,
    ...ctx.users.papeleria.employees,
  ];
  const pcInvCfgs = [
    {
      status: 'SENT',
      paymentStatus: 'PAID',
      count: 8,
      daysRange: [3, 45] as [number, number],
    },
    {
      status: 'PENDING',
      paymentStatus: 'UNPAID',
      count: 4,
      daysRange: [0, 8] as [number, number],
    },
    {
      status: 'SENT',
      paymentStatus: 'UNPAID',
      count: 3,
      daysRange: [2, 12] as [number, number],
    },
    {
      status: 'SENT',
      paymentStatus: 'PARTIALLY_PAID',
      count: 2,
      daysRange: [5, 15] as [number, number],
    },
    {
      status: 'OVERDUE',
      paymentStatus: 'UNPAID',
      count: 1,
      daysRange: [32, 45] as [number, number],
    },
    {
      status: 'DRAFT',
      paymentStatus: 'UNPAID',
      count: 1,
      daysRange: [0, 1] as [number, number],
    },
    {
      status: 'CANCELLED',
      paymentStatus: 'UNPAID',
      count: 1,
      daysRange: [8, 15] as [number, number],
    },
  ];
  for (const cfg of pcInvCfgs) {
    for (let i = 0; i < cfg.count; i++) {
      const inv = await createTenantInvoice(prisma, {
        tenantId: ctx.tenants.papeleria.id,
        products: ctx.products.papeleria,
        customers: ctx.customers.papeleria,
        status: cfg.status,
        paymentStatus: cfg.paymentStatus,
        daysAgoIssued: randomInt(cfg.daysRange[0], cfg.daysRange[1]),
        daysUntilDue: cfg.status === 'OVERDUE' ? -randomInt(1, 10) : 30,
        userId: pickRandom(pcInvUsers).id,
        warehouseId: pickRandom(ctx.warehouses.papeleria.active).id,
        invoicePrefix: 'PC',
        counterRef: pcInvCounter,
      });
      pcInvoices.push(inv);
    }
  }

  console.log(
    `   ✅ ${demoInvoices.length + dnInvoices.length + nnInvoices.length + pcInvoices.length} Invoices created`,
  );

  // Store in context
  ctx.invoices.demo = demoInvoices;
  ctx.invoices.distribuidora = dnInvoices;
  ctx.invoices.nuevo = nnInvoices;
  ctx.invoices.papeleria = pcInvoices;

  // ── Payments ──
  console.log('💰 Creating Payments...');

  const paymentCounter = { value: 0 };

  await createPaymentsForInvoices(
    prisma,
    ctx.tenants.demo.id,
    demoInvoices,
    paymentCounter,
  );
  await createPaymentsForInvoices(
    prisma,
    ctx.tenants.distribuidora.id,
    dnInvoices,
    paymentCounter,
  );
  await createPaymentsForInvoices(
    prisma,
    ctx.tenants.nuevo.id,
    nnInvoices,
    paymentCounter,
  );
  await createPaymentsForInvoices(
    prisma,
    ctx.tenants.papeleria.id,
    pcInvoices,
    paymentCounter,
  );

  console.log(
    `   ✅ ${paymentCounter.value} Payments created (all PaymentMethods covered)`,
  );
}
