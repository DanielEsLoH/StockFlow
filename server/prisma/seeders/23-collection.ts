import { PrismaClient } from '@prisma/client';
import { SeedContext } from './types';
import { daysFromNow, daysAgo } from './helpers';

export async function seedCollectionReminders(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<void> {
  const demoInvoices = ctx.invoices.demo;
  const distInvoices = ctx.invoices.distribuidora;
  const nuevoInvoices = ctx.invoices.nuevo;
  const papInvoices = ctx.invoices.papeleria;

  // Find invoices with UNPAID or PARTIALLY_PAID status for demo
  const demoUnpaid = demoInvoices.filter(
    (inv) =>
      inv.paymentStatus === 'UNPAID' || inv.paymentStatus === 'PARTIALLY_PAID',
  );

  // Use first available invoices if not enough unpaid ones
  const demoTargets = demoUnpaid.length >= 8 ? demoUnpaid : demoInvoices;

  // --- DEMO (8 reminders) ---
  const demoReminders = [
    // 1. BEFORE_DUE + EMAIL: SENT
    {
      tenantId: ctx.tenants.demo.id,
      invoiceId: demoTargets[0].id,
      customerId: demoTargets[0].customerId,
      type: 'BEFORE_DUE',
      channel: 'EMAIL',
      scheduledAt: daysAgo(5),
      sentAt: daysAgo(5),
      status: 'SENT',
      message:
        'Estimado cliente, le recordamos que su factura ' +
        demoTargets[0].invoiceNumber +
        ' vence próximamente. Le agradecemos realizar el pago oportunamente.',
      notes: null,
    },
    // 2. BEFORE_DUE + EMAIL: PENDING
    {
      tenantId: ctx.tenants.demo.id,
      invoiceId: demoTargets[1].id,
      customerId: demoTargets[1].customerId,
      type: 'BEFORE_DUE',
      channel: 'EMAIL',
      scheduledAt: daysFromNow(3),
      sentAt: null,
      status: 'PENDING',
      message:
        'Estimado cliente, le informamos que su factura ' +
        demoTargets[1].invoiceNumber +
        ' está próxima a vencer. Le agradecemos gestionar el pago a tiempo.',
      notes: null,
    },
    // 3. ON_DUE + EMAIL: SENT
    {
      tenantId: ctx.tenants.demo.id,
      invoiceId: demoTargets[2].id,
      customerId: demoTargets[2].customerId,
      type: 'ON_DUE',
      channel: 'EMAIL',
      scheduledAt: daysAgo(1),
      sentAt: daysAgo(1),
      status: 'SENT',
      message:
        'Estimado cliente, hoy vence su factura ' +
        demoTargets[2].invoiceNumber +
        '. Le solicitamos amablemente realizar el pago el día de hoy para evitar recargos.',
      notes: null,
    },
    // 4. AFTER_DUE + SMS: SENT
    {
      tenantId: ctx.tenants.demo.id,
      invoiceId: demoTargets[3].id,
      customerId: demoTargets[3].customerId,
      type: 'AFTER_DUE',
      channel: 'SMS',
      scheduledAt: daysAgo(10),
      sentAt: daysAgo(10),
      status: 'SENT',
      message:
        'Su factura ' +
        demoTargets[3].invoiceNumber +
        ' se encuentra vencida. Por favor comuníquese con nosotros para gestionar el pago.',
      notes: null,
    },
    // 5. AFTER_DUE + SMS: FAILED
    {
      tenantId: ctx.tenants.demo.id,
      invoiceId: demoTargets[4 % demoTargets.length].id,
      customerId: demoTargets[4 % demoTargets.length].customerId,
      type: 'AFTER_DUE',
      channel: 'SMS',
      scheduledAt: daysAgo(7),
      sentAt: null,
      status: 'FAILED',
      message:
        'Su factura ' +
        demoTargets[4 % demoTargets.length].invoiceNumber +
        ' tiene un saldo pendiente. Contáctenos para acordar el pago.',
      notes: 'Número no válido',
    },
    // 6. AFTER_DUE + WHATSAPP: SENT
    {
      tenantId: ctx.tenants.demo.id,
      invoiceId: demoTargets[5 % demoTargets.length].id,
      customerId: demoTargets[5 % demoTargets.length].customerId,
      type: 'AFTER_DUE',
      channel: 'WHATSAPP',
      scheduledAt: daysAgo(3),
      sentAt: daysAgo(3),
      status: 'SENT',
      message:
        'Hola, le escribimos de StockFlow Demo. Su factura ' +
        demoTargets[5 % demoTargets.length].invoiceNumber +
        ' se encuentra vencida. ¿Podemos ayudarle a gestionar el pago?',
      notes: null,
    },
    // 7. MANUAL + EMAIL: PENDING
    {
      tenantId: ctx.tenants.demo.id,
      invoiceId: demoTargets[6 % demoTargets.length].id,
      customerId: demoTargets[6 % demoTargets.length].customerId,
      type: 'MANUAL',
      channel: 'EMAIL',
      scheduledAt: daysFromNow(1),
      sentAt: null,
      status: 'PENDING',
      message:
        'Estimado cliente, nos comunicamos para hacer seguimiento a su factura ' +
        demoTargets[6 % demoTargets.length].invoiceNumber +
        '. Quedamos atentos a su respuesta.',
      notes: null,
    },
    // 8. MANUAL + WHATSAPP: CANCELLED
    {
      tenantId: ctx.tenants.demo.id,
      invoiceId: demoTargets[7 % demoTargets.length].id,
      customerId: demoTargets[7 % demoTargets.length].customerId,
      type: 'MANUAL',
      channel: 'WHATSAPP',
      scheduledAt: daysAgo(2),
      sentAt: null,
      status: 'CANCELLED',
      message:
        'Recordatorio de pago para factura ' +
        demoTargets[7 % demoTargets.length].invoiceNumber +
        '. Este mensaje fue cancelado.',
      notes: 'Cliente realizó el pago antes del envío',
    },
  ];

  // --- DISTRIBUIDORA (5 reminders) ---
  const distTargets = distInvoices;
  const distReminders = [
    {
      tenantId: ctx.tenants.distribuidora.id,
      invoiceId: distTargets[0].id,
      customerId: distTargets[0].customerId,
      type: 'BEFORE_DUE',
      channel: 'EMAIL',
      scheduledAt: daysFromNow(5),
      sentAt: null,
      status: 'PENDING',
      message:
        'Estimado cliente, su factura ' +
        distTargets[0].invoiceNumber +
        ' vence en los próximos días. Le agradecemos su pronto pago.',
      notes: null,
    },
    {
      tenantId: ctx.tenants.distribuidora.id,
      invoiceId: distTargets[1 % distTargets.length].id,
      customerId: distTargets[1 % distTargets.length].customerId,
      type: 'AFTER_DUE',
      channel: 'SMS',
      scheduledAt: daysAgo(8),
      sentAt: daysAgo(8),
      status: 'SENT',
      message:
        'Factura ' +
        distTargets[1 % distTargets.length].invoiceNumber +
        ' vencida. Comuníquese con Distribuidora Nacional.',
      notes: null,
    },
    {
      tenantId: ctx.tenants.distribuidora.id,
      invoiceId: distTargets[2 % distTargets.length].id,
      customerId: distTargets[2 % distTargets.length].customerId,
      type: 'AFTER_DUE',
      channel: 'WHATSAPP',
      scheduledAt: daysAgo(4),
      sentAt: daysAgo(4),
      status: 'SENT',
      message:
        'Hola, le recordamos que su factura ' +
        distTargets[2 % distTargets.length].invoiceNumber +
        ' tiene un saldo pendiente con Distribuidora Nacional.',
      notes: null,
    },
    {
      tenantId: ctx.tenants.distribuidora.id,
      invoiceId: distTargets[3 % distTargets.length].id,
      customerId: distTargets[3 % distTargets.length].customerId,
      type: 'ON_DUE',
      channel: 'EMAIL',
      scheduledAt: daysAgo(1),
      sentAt: daysAgo(1),
      status: 'SENT',
      message:
        'Hoy vence su factura ' +
        distTargets[3 % distTargets.length].invoiceNumber +
        '. Le agradecemos realizar el pago hoy.',
      notes: null,
    },
    {
      tenantId: ctx.tenants.distribuidora.id,
      invoiceId: distTargets[4 % distTargets.length].id,
      customerId: distTargets[4 % distTargets.length].customerId,
      type: 'MANUAL',
      channel: 'EMAIL',
      scheduledAt: daysAgo(6),
      sentAt: null,
      status: 'FAILED',
      message:
        'Seguimiento de cobro para factura ' +
        distTargets[4 % distTargets.length].invoiceNumber +
        '.',
      notes: 'Error al enviar: dirección de correo no encontrada',
    },
  ];

  // --- NUEVO (1 reminder) ---
  const nuevoTargets = nuevoInvoices;
  const nuevoReminders = [
    {
      tenantId: ctx.tenants.nuevo.id,
      invoiceId: nuevoTargets[0].id,
      customerId: nuevoTargets[0].customerId,
      type: 'AFTER_DUE',
      channel: 'EMAIL',
      scheduledAt: daysAgo(2),
      sentAt: null,
      status: 'PENDING',
      message:
        'Estimado cliente, su factura ' +
        nuevoTargets[0].invoiceNumber +
        ' se encuentra vencida. Por favor gestione el pago lo antes posible.',
      notes: null,
    },
  ];

  // --- PAPELERÍA (4 reminders) ---
  const papTargets = papInvoices;
  const papReminders = [
    {
      tenantId: ctx.tenants.papeleria.id,
      invoiceId: papTargets[0].id,
      customerId: papTargets[0].customerId,
      type: 'BEFORE_DUE',
      channel: 'EMAIL',
      scheduledAt: daysFromNow(7),
      sentAt: null,
      status: 'PENDING',
      message:
        'Estimado cliente, su factura ' +
        papTargets[0].invoiceNumber +
        ' vence próximamente. Agradecemos su pago oportuno.',
      notes: null,
    },
    {
      tenantId: ctx.tenants.papeleria.id,
      invoiceId: papTargets[1 % papTargets.length].id,
      customerId: papTargets[1 % papTargets.length].customerId,
      type: 'ON_DUE',
      channel: 'WHATSAPP',
      scheduledAt: daysAgo(1),
      sentAt: daysAgo(1),
      status: 'SENT',
      message:
        'Hola, hoy vence su factura ' +
        papTargets[1 % papTargets.length].invoiceNumber +
        ' de Papelería Central. Le agradecemos el pago.',
      notes: null,
    },
    {
      tenantId: ctx.tenants.papeleria.id,
      invoiceId: papTargets[2 % papTargets.length].id,
      customerId: papTargets[2 % papTargets.length].customerId,
      type: 'AFTER_DUE',
      channel: 'SMS',
      scheduledAt: daysAgo(5),
      sentAt: daysAgo(5),
      status: 'SENT',
      message:
        'Factura ' +
        papTargets[2 % papTargets.length].invoiceNumber +
        ' vencida. Contacte a Papelería Central.',
      notes: null,
    },
    {
      tenantId: ctx.tenants.papeleria.id,
      invoiceId: papTargets[3 % papTargets.length].id,
      customerId: papTargets[3 % papTargets.length].customerId,
      type: 'MANUAL',
      channel: 'EMAIL',
      scheduledAt: daysAgo(3),
      sentAt: null,
      status: 'CANCELLED',
      message:
        'Seguimiento de cobro manual para factura ' +
        papTargets[3 % papTargets.length].invoiceNumber +
        '.',
      notes: 'Cancelado: cliente ya pagó',
    },
  ];

  await prisma.collectionReminder.createMany({
    data: [
      ...demoReminders,
      ...distReminders,
      ...nuevoReminders,
      ...papReminders,
    ] as any,
  });
}
