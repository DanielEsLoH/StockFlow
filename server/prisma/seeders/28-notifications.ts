import { PrismaClient } from '@prisma/client';
import { SeedContext } from './types';
import { daysAgo, daysFromNow, randomInt, pickRandom } from './helpers';

export async function seedNotifications(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<void> {
  // ============================================================================
  // Notifications (77+ total — ALL 16 types, ALL 4 priorities)
  // ============================================================================
  console.log('🔔 Creating Notifications...');

  const notificationTypes = [
    'LOW_STOCK', 'OUT_OF_STOCK', 'NEW_INVOICE', 'INVOICE_PAID', 'INVOICE_OVERDUE',
    'PAYMENT_RECEIVED', 'PAYMENT_FAILED', 'NEW_CUSTOMER', 'REPORT_READY', 'SYSTEM',
    'INFO', 'USER_VERIFIED_EMAIL', 'USER_APPROVED', 'SUBSCRIPTION_EXPIRING',
    'SUBSCRIPTION_EXPIRED', 'SUBSCRIPTION_ACTIVATED',
  ];
  const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

  const notifTemplates: Record<string, { title: string; message: string }> = {
    LOW_STOCK: { title: 'Stock bajo', message: 'El producto tiene stock por debajo del mínimo' },
    OUT_OF_STOCK: { title: 'Sin stock', message: 'Producto agotado en bodega principal' },
    NEW_INVOICE: { title: 'Nueva factura', message: 'Se ha creado una nueva factura' },
    INVOICE_PAID: { title: 'Factura pagada', message: 'Se registró un pago completo' },
    INVOICE_OVERDUE: { title: 'Factura vencida', message: 'La factura ha superado su fecha de vencimiento' },
    PAYMENT_RECEIVED: { title: 'Pago recibido', message: 'Se recibió un nuevo pago' },
    PAYMENT_FAILED: { title: 'Pago fallido', message: 'El intento de pago no fue procesado' },
    NEW_CUSTOMER: { title: 'Nuevo cliente', message: 'Se registró un nuevo cliente' },
    REPORT_READY: { title: 'Reporte listo', message: 'El reporte solicitado está disponible' },
    SYSTEM: { title: 'Mantenimiento programado', message: 'Mantenimiento del sistema este fin de semana' },
    INFO: { title: 'Información', message: 'Actualización de funcionalidades disponible' },
    USER_VERIFIED_EMAIL: { title: 'Email verificado', message: 'El usuario ha verificado su correo' },
    USER_APPROVED: { title: 'Usuario aprobado', message: 'Se ha aprobado el acceso del nuevo usuario' },
    SUBSCRIPTION_EXPIRING: { title: 'Suscripción por vencer', message: 'Su suscripción vence en 5 días' },
    SUBSCRIPTION_EXPIRED: { title: 'Suscripción expirada', message: 'Su suscripción ha expirado' },
    SUBSCRIPTION_ACTIVATED: { title: 'Suscripción activada', message: 'Su plan ha sido activado exitosamente' },
  };

  let notifCount = 0;

  async function createNotifications(tenantId: string, userId: string, count: number) {
    for (let i = 0; i < count; i++) {
      const type = notificationTypes[i % notificationTypes.length];
      const priority = priorities[i % priorities.length];
      const tmpl = notifTemplates[type];
      await prisma.notification.create({
        data: {
          tenantId, userId, type: type as any, priority: priority as any,
          title: tmpl.title, message: tmpl.message,
          read: i < count / 2, createdAt: daysAgo(randomInt(0, 30)),
        },
      });
      notifCount++;
    }
  }

  await createNotifications(ctx.tenants.demo.id, ctx.users.demo.admin.id, 45);
  await createNotifications(ctx.tenants.distribuidora.id, ctx.users.distribuidora.admin.id, 15);
  await createNotifications(ctx.tenants.nuevo.id, ctx.users.nuevo.admin.id, 5);
  await createNotifications(ctx.tenants.papeleria.id, ctx.users.papeleria.admin.id, 12);

  console.log(`   ✅ ${notifCount} Notifications created (16 types, 4 priorities)`);

  // ============================================================================
  // Audit Logs (52 total)
  // ============================================================================
  console.log('📋 Creating Audit Logs...');

  const auditActions = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'IMPORT'];
  const auditEntities = ['Product', 'Invoice', 'Customer', 'User', 'Warehouse', 'Payment'];
  let auditCount = 0;

  async function createAuditLogs(tenantId: string, users: { id: string }[], count: number) {
    for (let i = 0; i < count; i++) {
      const action = auditActions[i % auditActions.length];
      const entity = auditEntities[i % auditEntities.length];
      await prisma.auditLog.create({
        data: {
          tenantId, userId: pickRandom(users).id, action: action as any,
          entityType: entity, entityId: `entity-${randomInt(1000, 9999)}`,
          newValues: action === 'IMPORT'
            ? { fileName: 'productos_bulk.csv', totalRows: 150, imported: 148, failed: 2 } as any
            : { description: `${action} en ${entity}` } as any,
          ipAddress: `192.168.1.${randomInt(1, 254)}`,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0',
          createdAt: daysAgo(randomInt(0, 60)),
        },
      });
      auditCount++;
    }
  }

  await createAuditLogs(ctx.tenants.demo.id, ctx.users.demo.allActive.map(u => ({ id: u.id })), 25);
  await createAuditLogs(ctx.tenants.distribuidora.id, [
    { id: ctx.users.distribuidora.admin.id },
    { id: ctx.users.distribuidora.manager.id },
    ...ctx.users.distribuidora.employees.map(u => ({ id: u.id })),
  ], 12);
  await createAuditLogs(ctx.tenants.nuevo.id, [{ id: ctx.users.nuevo.admin.id }], 5);
  await createAuditLogs(ctx.tenants.papeleria.id, [
    { id: ctx.users.papeleria.admin.id },
    { id: ctx.users.papeleria.manager.id },
    ...ctx.users.papeleria.employees.map(u => ({ id: u.id })),
  ], 10);

  console.log(`   ✅ ${auditCount} Audit Logs created`);

  // ============================================================================
  // System Admin Audit Logs (15)
  // ============================================================================
  console.log('🛡️ Creating System Admin Audit Logs...');

  const superAdmin = await prisma.systemAdmin.findFirst({ where: { role: 'SUPER_ADMIN' } });
  const supportAdmin = await prisma.systemAdmin.findFirst({ where: { role: 'SUPPORT' } });
  const billingAdmin = await prisma.systemAdmin.findFirst({ where: { role: 'BILLING' } });

  if (superAdmin && supportAdmin && billingAdmin) {
    const sysAdminActions = [
      { adminId: superAdmin.id, action: 'CREATE_TENANT', entity: 'Tenant', details: { tenantName: 'Tienda Demo' } },
      { adminId: superAdmin.id, action: 'CREATE_TENANT', entity: 'Tenant', details: { tenantName: 'Distribuidora Nacional' } },
      { adminId: superAdmin.id, action: 'CREATE_TENANT', entity: 'Tenant', details: { tenantName: 'Nuevo Negocio' } },
      { adminId: superAdmin.id, action: 'CREATE_TENANT', entity: 'Tenant', details: { tenantName: 'Papelería Central' } },
      { adminId: superAdmin.id, action: 'UPDATE_PLAN', entity: 'Tenant', details: { tenant: 'Tienda Demo', from: 'PYME', to: 'PRO' } },
      { adminId: superAdmin.id, action: 'UPDATE_PLAN', entity: 'Tenant', details: { tenant: 'Distribuidora Nacional', from: 'PRO', to: 'PLUS' } },
      { adminId: supportAdmin.id, action: 'VIEW_TENANT', entity: 'Tenant', details: { tenant: 'Nuevo Negocio', reason: 'Soporte técnico' } },
      { adminId: supportAdmin.id, action: 'VIEW_TENANT', entity: 'Tenant', details: { tenant: 'Tienda Demo', reason: 'Revisión de facturación' } },
      { adminId: supportAdmin.id, action: 'RESET_PASSWORD', entity: 'User', details: { userEmail: 'admin@tienda-demo.com' } },
      { adminId: billingAdmin.id, action: 'VIEW_SUBSCRIPTION', entity: 'Subscription', details: { tenant: 'Tienda Demo' } },
      { adminId: billingAdmin.id, action: 'VIEW_SUBSCRIPTION', entity: 'Subscription', details: { tenant: 'Distribuidora Nacional' } },
      { adminId: billingAdmin.id, action: 'PROCESS_PAYMENT', entity: 'Subscription', details: { tenant: 'Papelería Central', amount: 299000 } },
      { adminId: superAdmin.id, action: 'SUSPEND_TENANT', entity: 'Tenant', details: { tenant: 'Test Tenant', reason: 'Impago' } },
      { adminId: superAdmin.id, action: 'REACTIVATE_TENANT', entity: 'Tenant', details: { tenant: 'Test Tenant' } },
      { adminId: superAdmin.id, action: 'SYSTEM_CONFIG', entity: 'System', details: { setting: 'maintenance_mode', value: false } },
    ];

    for (const a of sysAdminActions) {
      await prisma.systemAdminAuditLog.create({
        data: {
          adminId: a.adminId, action: a.action, entityType: a.entity,
          entityId: `sys-${randomInt(1000, 9999)}`,
          details: a.details as any,
          createdAt: daysAgo(randomInt(0, 90)),
        },
      });
    }

    console.log(`   ✅ ${sysAdminActions.length} System Admin Audit Logs created`);
  }

  // ============================================================================
  // Invitations (15 total — ALL 4 statuses covered)
  // ============================================================================
  console.log('📨 Creating Invitations...');

  const invitationsData = [
    // Demo (7)
    { tenantId: ctx.tenants.demo.id, email: 'nuevo.empleado1@email.com', role: 'EMPLOYEE', status: 'PENDING', invitedById: ctx.users.demo.admin.id },
    { tenantId: ctx.tenants.demo.id, email: 'nuevo.empleado2@email.com', role: 'EMPLOYEE', status: 'PENDING', invitedById: ctx.users.demo.admin.id },
    { tenantId: ctx.tenants.demo.id, email: 'gerente.nuevo@email.com', role: 'MANAGER', status: 'PENDING', invitedById: ctx.users.demo.admin.id },
    { tenantId: ctx.tenants.demo.id, email: 'aceptado1@email.com', role: 'EMPLOYEE', status: 'ACCEPTED', invitedById: ctx.users.demo.admin.id },
    { tenantId: ctx.tenants.demo.id, email: 'aceptado2@email.com', role: 'EMPLOYEE', status: 'ACCEPTED', invitedById: ctx.users.demo.managers[0].id },
    { tenantId: ctx.tenants.demo.id, email: 'expirado@email.com', role: 'EMPLOYEE', status: 'EXPIRED', invitedById: ctx.users.demo.admin.id },
    { tenantId: ctx.tenants.demo.id, email: 'cancelado@email.com', role: 'MANAGER', status: 'CANCELLED', invitedById: ctx.users.demo.admin.id },
    // DN (4)
    { tenantId: ctx.tenants.distribuidora.id, email: 'nuevo.dn1@email.com', role: 'EMPLOYEE', status: 'PENDING', invitedById: ctx.users.distribuidora.admin.id },
    { tenantId: ctx.tenants.distribuidora.id, email: 'aceptado.dn@email.com', role: 'EMPLOYEE', status: 'ACCEPTED', invitedById: ctx.users.distribuidora.admin.id },
    { tenantId: ctx.tenants.distribuidora.id, email: 'expirado.dn@email.com', role: 'MANAGER', status: 'EXPIRED', invitedById: ctx.users.distribuidora.admin.id },
    { tenantId: ctx.tenants.distribuidora.id, email: 'contador.rechazado.dn@email.com', role: 'CONTADOR', status: 'CANCELLED', invitedById: ctx.users.distribuidora.admin.id },
    // NN (2)
    { tenantId: ctx.tenants.nuevo.id, email: 'invitado.nn@email.com', role: 'EMPLOYEE', status: 'PENDING', invitedById: ctx.users.nuevo.admin.id },
    { tenantId: ctx.tenants.nuevo.id, email: 'contador.nn@email.com', role: 'CONTADOR', status: 'PENDING', invitedById: ctx.users.nuevo.admin.id },
    // PC (2)
    { tenantId: ctx.tenants.papeleria.id, email: 'nuevo.pc@email.com', role: 'EMPLOYEE', status: 'PENDING', invitedById: ctx.users.papeleria.admin.id },
    { tenantId: ctx.tenants.papeleria.id, email: 'aceptado.pc@email.com', role: 'EMPLOYEE', status: 'ACCEPTED', invitedById: ctx.users.papeleria.admin.id },
  ];

  for (const inv of invitationsData) {
    const expiresAt = inv.status === 'EXPIRED' ? daysAgo(5) : daysFromNow(7);
    await prisma.invitation.create({
      data: {
        tenantId: inv.tenantId, email: inv.email, role: inv.role as any,
        status: inv.status as any, invitedById: inv.invitedById,
        token: `inv-token-${randomInt(100000, 999999)}`,
        expiresAt, createdAt: daysAgo(randomInt(1, 30)),
      },
    });
  }

  console.log(`   ✅ ${invitationsData.length} Invitations created`);
}
