import { PrismaClient } from '@prisma/client';
import { SeedContext } from './types';
import { daysAgo, daysFromNow } from './helpers';

export async function seedBilling(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<void> {
  // ── Subscriptions (4 — one per tenant) ──
  console.log('💳 Creating Subscriptions...');

  const subDemo = await prisma.subscription.create({
    data: { tenantId: ctx.tenants.demo.id, plan: 'PRO', status: 'ACTIVE', periodType: 'ANNUAL', startDate: daysAgo(180), endDate: daysFromNow(185) },
  });
  const subDist = await prisma.subscription.create({
    data: { tenantId: ctx.tenants.distribuidora.id, plan: 'PLUS', status: 'ACTIVE', periodType: 'MONTHLY', startDate: daysAgo(25), endDate: daysFromNow(5) },
  });
  const subNuevo = await prisma.subscription.create({
    data: { tenantId: ctx.tenants.nuevo.id, plan: 'EMPRENDEDOR', status: 'ACTIVE', periodType: 'MONTHLY', startDate: daysAgo(25), endDate: daysFromNow(5) },
  });
  const subPap = await prisma.subscription.create({
    data: { tenantId: ctx.tenants.papeleria.id, plan: 'PYME', status: 'ACTIVE', periodType: 'QUARTERLY', startDate: daysAgo(60), endDate: daysFromNow(30) },
  });

  ctx.subscriptions.demo = { id: subDemo.id, tenantId: ctx.tenants.demo.id };
  ctx.subscriptions.distribuidora = { id: subDist.id, tenantId: ctx.tenants.distribuidora.id };
  ctx.subscriptions.nuevo = { id: subNuevo.id, tenantId: ctx.tenants.nuevo.id };
  ctx.subscriptions.papeleria = { id: subPap.id, tenantId: ctx.tenants.papeleria.id };

  console.log('   ✅ 4 Subscriptions created');

  // ── Billing Transactions ──
  console.log('🧾 Creating Billing Transactions...');

  // --- DEMO (4 transactions) — PRO plan ---
  const demoTransactions = [
    {
      tenantId: ctx.tenants.demo.id,
      subscriptionId: subDemo.id,
      wompiTransactionId: 'wompi-txn-demo-001',
      wompiReference: 'SF-DEMO-202501-001',
      plan: 'PRO',
      period: 'MONTHLY',
      amountInCents: 14900000,
      currency: 'COP',
      status: 'APPROVED',
      paymentMethodType: 'CARD',
      failureReason: null,
      isRecurring: true,
      createdAt: new Date('2025-01-15T10:00:00Z'),
    },
    {
      tenantId: ctx.tenants.demo.id,
      subscriptionId: subDemo.id,
      wompiTransactionId: 'wompi-txn-demo-002',
      wompiReference: 'SF-DEMO-202502-002',
      plan: 'PRO',
      period: 'MONTHLY',
      amountInCents: 14900000,
      currency: 'COP',
      status: 'APPROVED',
      paymentMethodType: 'CARD',
      failureReason: null,
      isRecurring: true,
      createdAt: new Date('2025-02-15T10:00:00Z'),
    },
    {
      tenantId: ctx.tenants.demo.id,
      subscriptionId: subDemo.id,
      wompiTransactionId: 'wompi-txn-demo-003',
      wompiReference: 'SF-DEMO-202503-003',
      plan: 'PRO',
      period: 'MONTHLY',
      amountInCents: 14900000,
      currency: 'COP',
      status: 'APPROVED',
      paymentMethodType: 'CARD',
      failureReason: null,
      isRecurring: true,
      createdAt: new Date('2025-03-15T10:00:00Z'),
    },
    {
      tenantId: ctx.tenants.demo.id,
      subscriptionId: subDemo.id,
      wompiReference: 'SF-DEMO-202504-004',
      plan: 'PRO',
      period: 'MONTHLY',
      amountInCents: 14900000,
      currency: 'COP',
      status: 'PENDING',
      paymentMethodType: null,
      failureReason: null,
      isRecurring: true,
      createdAt: new Date('2025-04-01T00:00:00Z'),
    },
  ];

  // --- DISTRIBUIDORA (3 transactions) — PLUS plan ---
  const distTransactions = [
    {
      tenantId: ctx.tenants.distribuidora.id,
      subscriptionId: subDist.id,
      wompiTransactionId: 'wompi-txn-dist-001',
      wompiReference: 'SF-DIST-202501-001',
      plan: 'PLUS',
      period: 'QUARTERLY',
      amountInCents: 59700000,
      currency: 'COP',
      status: 'APPROVED',
      paymentMethodType: 'PSE',
      failureReason: null,
      isRecurring: true,
      createdAt: new Date('2025-01-10T08:00:00Z'),
    },
    {
      tenantId: ctx.tenants.distribuidora.id,
      subscriptionId: subDist.id,
      wompiReference: 'SF-DIST-202504-002',
      plan: 'PLUS',
      period: 'QUARTERLY',
      amountInCents: 59700000,
      currency: 'COP',
      status: 'PENDING',
      paymentMethodType: null,
      failureReason: null,
      isRecurring: true,
      createdAt: new Date('2025-04-10T00:00:00Z'),
    },
    {
      tenantId: ctx.tenants.distribuidora.id,
      subscriptionId: subDist.id,
      wompiTransactionId: 'wompi-txn-dist-003',
      wompiReference: 'SF-DIST-202503-003',
      plan: 'PLUS',
      period: 'QUARTERLY',
      amountInCents: 59700000,
      currency: 'COP',
      status: 'DECLINED',
      paymentMethodType: 'PSE',
      failureReason: 'Fondos insuficientes',
      isRecurring: true,
      createdAt: new Date('2025-03-20T14:30:00Z'),
    },
  ];

  // --- NUEVO (1 transaction) — EMPRENDEDOR (free) ---
  const nuevoTransactions = [
    {
      tenantId: ctx.tenants.nuevo.id,
      subscriptionId: subNuevo.id,
      wompiReference: 'SF-NUEVO-202503-001',
      plan: 'EMPRENDEDOR',
      period: 'MONTHLY',
      amountInCents: 0,
      currency: 'COP',
      status: 'APPROVED',
      paymentMethodType: 'FREE',
      failureReason: null,
      isRecurring: false,
      createdAt: new Date('2025-03-01T00:00:00Z'),
    },
  ];

  // --- PAPELERÍA (2 transactions) — PYME plan ---
  const papTransactions = [
    {
      tenantId: ctx.tenants.papeleria.id,
      subscriptionId: subPap.id,
      wompiTransactionId: 'wompi-txn-pap-001',
      wompiReference: 'SF-PAP-202502-001',
      plan: 'PYME',
      period: 'MONTHLY',
      amountInCents: 7900000,
      currency: 'COP',
      status: 'APPROVED',
      paymentMethodType: 'CARD',
      failureReason: null,
      isRecurring: true,
      createdAt: new Date('2025-02-15T10:00:00Z'),
    },
    {
      tenantId: ctx.tenants.papeleria.id,
      subscriptionId: subPap.id,
      wompiTransactionId: 'wompi-txn-pap-002',
      wompiReference: 'SF-PAP-202503-002',
      plan: 'PYME',
      period: 'MONTHLY',
      amountInCents: 7900000,
      currency: 'COP',
      status: 'APPROVED',
      paymentMethodType: 'CARD',
      failureReason: null,
      isRecurring: true,
      createdAt: new Date('2025-03-15T10:00:00Z'),
    },
  ];

  await prisma.billingTransaction.createMany({
    data: [
      ...demoTransactions,
      ...distTransactions,
      ...nuevoTransactions,
      ...papTransactions,
    ] as any,
  });

  console.log('   ✅ 10 Billing Transactions created');
}
