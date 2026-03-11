import { PrismaClient } from '@prisma/client';
import { SeedContext } from './types';
import { daysAgo, nextDocNumber, TENANT_PREFIX } from './helpers';

export async function seedRemissions(
  prisma: PrismaClient,
  ctx: SeedContext,
): Promise<void> {
  console.log('📦 Seeding remissions...');

  // ── Demo Tenant (6 remissions) ─────────────────────────────────────
  const demoTenantId = ctx.tenants.demo.id;
  const demoSlug = ctx.tenants.demo.slug;
  const prefix = `REM-${TENANT_PREFIX[demoSlug]}`;
  const demoProducts = ctx.products.demo;
  const demoCustomers = ctx.customers.demo;
  const demoWarehouse = ctx.warehouses.demo.main;
  const demoAdmin = ctx.users.demo.admin;
  const demoManagers = ctx.users.demo.managers;

  console.log('  → Demo tenant remissions...');

  // 1. DRAFT — recent, no deliveryDate
  await prisma.remission.create({
    data: {
      tenantId: demoTenantId,
      customerId: demoCustomers[0]?.id,
      userId: demoAdmin.id,
      warehouseId: demoWarehouse.id,
      remissionNumber: nextDocNumber(prefix, ctx.counters.demo, 'remission'),
      status: 'DRAFT',
      issueDate: daysAgo(2),
      deliveryAddress: 'Cra 15 # 88-64, Bogotá',
      notes: 'Pendiente confirmación de dirección de entrega por el cliente',
      items: {
        create: [
          { productId: demoProducts[0]?.id, description: demoProducts[0]?.name ?? 'Producto 1', quantity: 5, unit: 'unit' },
          { productId: demoProducts[1]?.id, description: demoProducts[1]?.name ?? 'Producto 2', quantity: 3, unit: 'unit' },
          { productId: demoProducts[2]?.id, description: demoProducts[2]?.name ?? 'Producto 3', quantity: 2, unit: 'unit' },
        ],
      },
    },
  });

  // 2. DISPATCHED — with Servientrega transport
  await prisma.remission.create({
    data: {
      tenantId: demoTenantId,
      customerId: demoCustomers[1]?.id,
      userId: demoManagers[0]?.id ?? demoAdmin.id,
      warehouseId: demoWarehouse.id,
      invoiceId: ctx.invoices.demo[0]?.id,
      remissionNumber: nextDocNumber(prefix, ctx.counters.demo, 'remission'),
      status: 'DISPATCHED',
      issueDate: daysAgo(5),
      deliveryAddress: 'Calle 100 # 19-61, Piso 8, Bogotá',
      transportInfo: 'Servientrega guía #SER-2025-004521',
      notes: 'Despacho urgente solicitado por el cliente',
      items: {
        create: [
          { productId: demoProducts[3]?.id, description: demoProducts[3]?.name ?? 'Producto 4', quantity: 10, unit: 'unit' },
          { productId: demoProducts[4]?.id, description: demoProducts[4]?.name ?? 'Producto 5', quantity: 4, unit: 'unit' },
        ],
      },
    },
  });

  // 3. DISPATCHED — with Coordinadora transport
  await prisma.remission.create({
    data: {
      tenantId: demoTenantId,
      customerId: demoCustomers[2]?.id,
      userId: demoManagers[0]?.id ?? demoAdmin.id,
      warehouseId: ctx.warehouses.demo.store?.id ?? demoWarehouse.id,
      invoiceId: ctx.invoices.demo[1]?.id,
      remissionNumber: nextDocNumber(prefix, ctx.counters.demo, 'remission'),
      status: 'DISPATCHED',
      issueDate: daysAgo(4),
      deliveryAddress: 'Av. Cra 68 # 75A-50, Bogotá',
      transportInfo: 'Coordinadora guía #CRD-2025-087234',
      items: {
        create: [
          { productId: demoProducts[5]?.id, description: demoProducts[5]?.name ?? 'Producto 6', quantity: 8, unit: 'unit' },
          { productId: demoProducts[0]?.id, description: demoProducts[0]?.name ?? 'Producto 1', quantity: 6, unit: 'unit' },
          { productId: demoProducts[2]?.id, description: demoProducts[2]?.name ?? 'Producto 3', quantity: 3, unit: 'unit' },
          { productId: demoProducts[1]?.id, description: demoProducts[1]?.name ?? 'Producto 2', quantity: 1, unit: 'unit' },
        ],
      },
    },
  });

  // 4. DELIVERED — completed with deliveryDate
  await prisma.remission.create({
    data: {
      tenantId: demoTenantId,
      customerId: demoCustomers[3]?.id ?? demoCustomers[0]?.id,
      userId: demoAdmin.id,
      warehouseId: demoWarehouse.id,
      invoiceId: ctx.invoices.demo[2]?.id,
      remissionNumber: nextDocNumber(prefix, ctx.counters.demo, 'remission'),
      status: 'DELIVERED',
      issueDate: daysAgo(15),
      deliveryDate: daysAgo(12),
      deliveryAddress: 'Calle 72 # 10-07, Of. 301, Bogotá',
      transportInfo: 'Servientrega guía #SER-2025-003188',
      notes: 'Entrega recibida a satisfacción. Firmó: Andrea Martínez',
      items: {
        create: [
          { productId: demoProducts[1]?.id, description: demoProducts[1]?.name ?? 'Producto 2', quantity: 12, unit: 'unit' },
          { productId: demoProducts[3]?.id, description: demoProducts[3]?.name ?? 'Producto 4', quantity: 5, unit: 'unit' },
        ],
      },
    },
  });

  // 5. DELIVERED — another completed
  await prisma.remission.create({
    data: {
      tenantId: demoTenantId,
      customerId: demoCustomers[4]?.id ?? demoCustomers[1]?.id,
      userId: demoManagers[0]?.id ?? demoAdmin.id,
      warehouseId: demoWarehouse.id,
      remissionNumber: nextDocNumber(prefix, ctx.counters.demo, 'remission'),
      status: 'DELIVERED',
      issueDate: daysAgo(22),
      deliveryDate: daysAgo(20),
      deliveryAddress: 'Cra 7 # 32-16, Local 204, Bogotá',
      transportInfo: 'Coordinadora guía #CRD-2025-076543',
      notes: 'Entregado sin novedad',
      items: {
        create: [
          { productId: demoProducts[4]?.id, description: demoProducts[4]?.name ?? 'Producto 5', quantity: 20, unit: 'unit' },
          { productId: demoProducts[5]?.id, description: demoProducts[5]?.name ?? 'Producto 6', quantity: 15, unit: 'unit' },
          { productId: demoProducts[0]?.id, description: demoProducts[0]?.name ?? 'Producto 1', quantity: 7, unit: 'unit' },
        ],
      },
    },
  });

  // 6. CANCELLED — with cancellation notes
  await prisma.remission.create({
    data: {
      tenantId: demoTenantId,
      customerId: demoCustomers[2]?.id,
      userId: demoAdmin.id,
      warehouseId: demoWarehouse.id,
      remissionNumber: nextDocNumber(prefix, ctx.counters.demo, 'remission'),
      status: 'CANCELLED',
      issueDate: daysAgo(10),
      deliveryAddress: 'Av. Cra 68 # 75A-50, Bogotá',
      notes: 'Cancelada por solicitud del cliente. Pedido duplicado con remisión REM-TD-00003. Mercancía reintegrada a bodega.',
      items: {
        create: [
          { productId: demoProducts[2]?.id, description: demoProducts[2]?.name ?? 'Producto 3', quantity: 4, unit: 'unit' },
          { productId: demoProducts[3]?.id, description: demoProducts[3]?.name ?? 'Producto 4', quantity: 2, unit: 'unit' },
        ],
      },
    },
  });

  console.log('    ✓ 6 demo remissions created');

  // ── Distribuidora Tenant (4 remissions) ────────────────────────────
  const distTenantId = ctx.tenants.distribuidora.id;
  const distSlug = ctx.tenants.distribuidora.slug;
  const distPrefix = `REM-${TENANT_PREFIX[distSlug]}`;
  const distProducts = ctx.products.distribuidora;
  const distCustomers = ctx.customers.distribuidora;
  const distWarehouse = ctx.warehouses.distribuidora.main;
  const distAdmin = ctx.users.distribuidora.admin;

  console.log('  → Distribuidora tenant remissions...');

  // DRAFT
  await prisma.remission.create({
    data: {
      tenantId: distTenantId,
      customerId: distCustomers[0]?.id,
      userId: distAdmin.id,
      warehouseId: distWarehouse.id,
      remissionNumber: nextDocNumber(distPrefix, ctx.counters.distribuidora, 'remission'),
      status: 'DRAFT',
      issueDate: daysAgo(1),
      deliveryAddress: 'Cra 50 # 10-20, Medellín',
      notes: 'Preparando despacho para ruta sur',
      items: {
        create: [
          { productId: distProducts[0]?.id, description: distProducts[0]?.name ?? 'Producto Dist 1', quantity: 24, unit: 'unit' },
          { productId: distProducts[1]?.id, description: distProducts[1]?.name ?? 'Producto Dist 2', quantity: 48, unit: 'unit' },
          { productId: distProducts[2]?.id, description: distProducts[2]?.name ?? 'Producto Dist 3', quantity: 12, unit: 'unit' },
        ],
      },
    },
  });

  // DISPATCHED
  await prisma.remission.create({
    data: {
      tenantId: distTenantId,
      customerId: distCustomers[1]?.id,
      userId: ctx.users.distribuidora.manager?.id ?? distAdmin.id,
      warehouseId: distWarehouse.id,
      invoiceId: ctx.invoices.distribuidora[0]?.id,
      remissionNumber: nextDocNumber(distPrefix, ctx.counters.distribuidora, 'remission'),
      status: 'DISPATCHED',
      issueDate: daysAgo(3),
      deliveryAddress: 'Calle 30 # 65-12, Barranquilla',
      transportInfo: 'Servientrega guía #SER-2025-012789',
      items: {
        create: [
          { productId: distProducts[3]?.id, description: distProducts[3]?.name ?? 'Producto Dist 4', quantity: 36, unit: 'unit' },
          { productId: distProducts[4]?.id, description: distProducts[4]?.name ?? 'Producto Dist 5', quantity: 60, unit: 'unit' },
        ],
      },
    },
  });

  // DELIVERED
  await prisma.remission.create({
    data: {
      tenantId: distTenantId,
      customerId: distCustomers[2]?.id ?? distCustomers[0]?.id,
      userId: distAdmin.id,
      warehouseId: distWarehouse.id,
      remissionNumber: nextDocNumber(distPrefix, ctx.counters.distribuidora, 'remission'),
      status: 'DELIVERED',
      issueDate: daysAgo(18),
      deliveryDate: daysAgo(15),
      deliveryAddress: 'Cra 15 # 45-30, Cali',
      transportInfo: 'TCC guía #TCC-2025-045678',
      notes: 'Recibido conforme. Firmó: Carlos Peña - Bodeguero',
      items: {
        create: [
          { productId: distProducts[0]?.id, description: distProducts[0]?.name ?? 'Producto Dist 1', quantity: 100, unit: 'unit' },
          { productId: distProducts[5]?.id, description: distProducts[5]?.name ?? 'Producto Dist 6', quantity: 50, unit: 'unit' },
          { productId: distProducts[2]?.id, description: distProducts[2]?.name ?? 'Producto Dist 3', quantity: 30, unit: 'unit' },
        ],
      },
    },
  });

  // CANCELLED
  await prisma.remission.create({
    data: {
      tenantId: distTenantId,
      customerId: distCustomers[3]?.id ?? distCustomers[0]?.id,
      userId: distAdmin.id,
      warehouseId: distWarehouse.id,
      remissionNumber: nextDocNumber(distPrefix, ctx.counters.distribuidora, 'remission'),
      status: 'CANCELLED',
      issueDate: daysAgo(8),
      notes: 'Cancelada: cliente reportó cierre temporal del local. Se reprogramará entrega.',
      items: {
        create: [
          { productId: distProducts[1]?.id, description: distProducts[1]?.name ?? 'Producto Dist 2', quantity: 72, unit: 'unit' },
        ],
      },
    },
  });

  console.log('    ✓ 4 distribuidora remissions created');

  // ── Nuevo Negocio Tenant (1 remission) ─────────────────────────────
  const nuevoTenantId = ctx.tenants.nuevo.id;
  const nuevoSlug = ctx.tenants.nuevo.slug;
  const nuevoPrefix = `REM-${TENANT_PREFIX[nuevoSlug]}`;
  const nuevoProducts = ctx.products.nuevo;
  const nuevoCustomers = ctx.customers.nuevo;
  const nuevoWarehouse = ctx.warehouses.nuevo.main;
  const nuevoAdmin = ctx.users.nuevo.admin;

  console.log('  → Nuevo Negocio tenant remissions...');

  await prisma.remission.create({
    data: {
      tenantId: nuevoTenantId,
      customerId: nuevoCustomers[0]?.id,
      userId: nuevoAdmin.id,
      warehouseId: nuevoWarehouse.id,
      remissionNumber: nextDocNumber(nuevoPrefix, ctx.counters.nuevo, 'remission'),
      status: 'DISPATCHED',
      issueDate: daysAgo(3),
      deliveryAddress: 'Calle 19 # 4-88, Bogotá',
      transportInfo: 'Envío propio - Motorizado Juan Camilo',
      notes: 'Primer despacho del negocio',
      items: {
        create: [
          { productId: nuevoProducts[0]?.id, description: nuevoProducts[0]?.name ?? 'Producto Nuevo 1', quantity: 2, unit: 'unit' },
          { productId: nuevoProducts[1]?.id, description: nuevoProducts[1]?.name ?? 'Producto Nuevo 2', quantity: 1, unit: 'unit' },
        ],
      },
    },
  });

  console.log('    ✓ 1 nuevo negocio remission created');

  // ── Papelería Tenant (3 remissions) ────────────────────────────────
  const papTenantId = ctx.tenants.papeleria.id;
  const papSlug = ctx.tenants.papeleria.slug;
  const papPrefix = `REM-${TENANT_PREFIX[papSlug]}`;
  const papProducts = ctx.products.papeleria;
  const papCustomers = ctx.customers.papeleria;
  const papWarehouse = ctx.warehouses.papeleria.main;
  const papAdmin = ctx.users.papeleria.admin;

  console.log('  → Papelería tenant remissions...');

  // DRAFT
  await prisma.remission.create({
    data: {
      tenantId: papTenantId,
      customerId: papCustomers[0]?.id,
      userId: papAdmin.id,
      warehouseId: papWarehouse.id,
      remissionNumber: nextDocNumber(papPrefix, ctx.counters.papeleria, 'remission'),
      status: 'DRAFT',
      issueDate: daysAgo(1),
      deliveryAddress: 'Colegio San José, Calle 45 # 22-10, Bogotá',
      notes: 'Pedido institucional para inicio de año escolar',
      items: {
        create: [
          { productId: papProducts[0]?.id, description: papProducts[0]?.name ?? 'Cuadernos', quantity: 50, unit: 'unit' },
          { productId: papProducts[1]?.id, description: papProducts[1]?.name ?? 'Lápices', quantity: 100, unit: 'unit' },
          { productId: papProducts[2]?.id, description: papProducts[2]?.name ?? 'Borradores', quantity: 50, unit: 'unit' },
        ],
      },
    },
  });

  // DISPATCHED
  await prisma.remission.create({
    data: {
      tenantId: papTenantId,
      customerId: papCustomers[1]?.id ?? papCustomers[0]?.id,
      userId: ctx.users.papeleria.manager?.id ?? papAdmin.id,
      warehouseId: papWarehouse.id,
      invoiceId: ctx.invoices.papeleria[0]?.id,
      remissionNumber: nextDocNumber(papPrefix, ctx.counters.papeleria, 'remission'),
      status: 'DISPATCHED',
      issueDate: daysAgo(4),
      deliveryAddress: 'Oficina Contable JR, Cra 13 # 60-42, Of. 501, Bogotá',
      transportInfo: 'Envío propio - Mensajero Carlos',
      items: {
        create: [
          { productId: papProducts[3]?.id, description: papProducts[3]?.name ?? 'Resmas papel', quantity: 20, unit: 'unit' },
          { productId: papProducts[4]?.id, description: papProducts[4]?.name ?? 'Carpetas', quantity: 30, unit: 'unit' },
        ],
      },
    },
  });

  // DELIVERED
  await prisma.remission.create({
    data: {
      tenantId: papTenantId,
      customerId: papCustomers[2]?.id ?? papCustomers[0]?.id,
      userId: papAdmin.id,
      warehouseId: papWarehouse.id,
      remissionNumber: nextDocNumber(papPrefix, ctx.counters.papeleria, 'remission'),
      status: 'DELIVERED',
      issueDate: daysAgo(12),
      deliveryDate: daysAgo(10),
      deliveryAddress: 'Universidad Nacional, Edificio Aulas, Bogotá',
      transportInfo: 'Servientrega guía #SER-2025-009876',
      notes: 'Entregado en portería. Recibió: Vigilante turno mañana',
      items: {
        create: [
          { productId: papProducts[0]?.id, description: papProducts[0]?.name ?? 'Cuadernos', quantity: 200, unit: 'unit' },
          { productId: papProducts[1]?.id, description: papProducts[1]?.name ?? 'Lápices', quantity: 500, unit: 'unit' },
          { productId: papProducts[2]?.id, description: papProducts[2]?.name ?? 'Borradores', quantity: 200, unit: 'unit' },
          { productId: papProducts[3]?.id, description: papProducts[3]?.name ?? 'Resmas papel', quantity: 50, unit: 'unit' },
        ],
      },
    },
  });

  console.log('    ✓ 3 papelería remissions created');

  console.log('✅ Remissions seeded: 14 total');
}
